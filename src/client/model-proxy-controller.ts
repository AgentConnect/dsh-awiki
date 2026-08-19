/** Reactive loopback client for browser-safe AWiki-hosted DeepSeek account operations. */

import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import {
  AWIKI_MODEL_PROXY_RPC_CHANNEL,
  AWIKI_MODEL_PROXY_RPC_ENDPOINTS,
  decodeCloseRechargeResult,
  decodeModelProxyStatus,
  decodeModelProxyUsage,
  decodeRechargeOrder,
  type AwikiModelProxyRechargeOrder,
  type AwikiModelProxyStatus,
  type AwikiModelProxyUsage,
} from '../model-proxy-contract.ts'
import type { AwikiController, AwikiView } from './controller.ts'
import { AWIKI_RECHARGE_DISABLED_ERROR, AWIKI_RECHARGE_ENABLED } from './recharge-availability.ts'

export interface AwikiModelProxyView {
  readonly status: 'idle' | 'identity-required' | 'loading' | 'ready' | 'unavailable'
  readonly account: AwikiModelProxyStatus | null
  readonly usage: readonly AwikiModelProxyUsage[]
  readonly usageLoading: boolean
  readonly pending: 'enable' | 'disable' | 'recharge' | 'close-recharge' | null
  readonly error: string | null
}

const INITIAL: AwikiModelProxyView = Object.freeze({
  status: 'idle', account: null, usage: [], usageLoading: false, pending: null, error: null,
})

export class AwikiModelProxyController implements HostObservable<AwikiModelProxyView> {
  private view = INITIAL
  private readonly listeners = new Set<() => void>()
  private readonly abort = new AbortController()
  private sessionAbort = new AbortController()
  private readonly unsubscribeSession: () => void
  private sessionActive: boolean | undefined
  private disposed = false
  private generation = 0

  constructor(
    private readonly connection: ConnectionHandle,
    private readonly identity: AwikiController,
    private readonly rechargeEnabled = AWIKI_RECHARGE_ENABLED,
  ) {
    this.unsubscribeSession = identity.subscribe(() => { this.syncSession() })
    this.syncSession()
  }

  getSnapshot = (): AwikiModelProxyView => this.view

  subscribe = (listener: () => void): (() => void) => {
    if (this.disposed) return () => {}
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  async load(): Promise<void> {
    if (!this.active()) return
    if (this.disposed || !this.connection.isLoopback) {
      this.publish({ ...this.view, status: 'unavailable', error: 'AWiki 托管模型账户仅能在本机管理。' })
      return
    }
    const generation = ++this.generation
    this.publish({ ...this.view, status: 'loading', error: null })
    try {
      const value = await this.call(AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status, {})
      const account = decodeModelProxyStatus(value)
      if (account === undefined) throw new Error('账户响应格式无效')
      if (generation !== this.generation || this.disposed) return
      this.publish({ ...this.view, status: 'ready', account, error: null })
    } catch (error) {
      if (generation !== this.generation || this.disposed) return
      this.publish({ ...this.view, status: 'unavailable', account: null, error: message(error) })
    }
  }

  async loadUsage(): Promise<void> {
    if (!this.active() || this.disposed || this.view.usageLoading) return
    const generation = this.generation
    this.publish({ ...this.view, usageLoading: true, error: null })
    try {
      const value = await this.call(AWIKI_MODEL_PROXY_RPC_ENDPOINTS.usage, {})
      const usage = decodeModelProxyUsage(value)
      if (usage === undefined) throw new Error('用量响应格式无效')
      if (generation === this.generation && !this.disposed) {
        this.publish({ ...this.view, usage, usageLoading: false })
      }
    } catch (error) {
      if (generation === this.generation && !this.disposed) {
        this.publish({ ...this.view, usageLoading: false, error: message(error) })
      }
    }
  }

  async setEnabled(enabled: boolean): Promise<void> {
    if (!this.active() || this.disposed || this.view.pending !== null) return
    const generation = this.generation
    this.publish({ ...this.view, pending: enabled ? 'enable' : 'disable', error: null })
    try {
      const value = await this.call(AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled })
      const account = decodeModelProxyStatus(value)
      if (account === undefined) throw new Error('模型状态响应格式无效')
      if (generation === this.generation && !this.disposed) {
        this.publish({ ...this.view, status: 'ready', account, pending: null })
      }
    } catch (error) {
      if (generation === this.generation && !this.disposed) {
        this.publish({ ...this.view, pending: null, error: message(error) })
      }
      throw error
    }
  }

  async createRecharge(amountCents: number): Promise<AwikiModelProxyRechargeOrder> {
    if (!this.rechargeEnabled) throw new Error(AWIKI_RECHARGE_DISABLED_ERROR)
    if (!this.active()) throw new Error('请先登录 AWiki 身份')
    if (this.disposed || this.view.pending !== null) throw new Error('已有操作正在进行')
    const generation = this.generation
    this.publish({ ...this.view, pending: 'recharge', error: null })
    try {
      const value = await this.call(AWIKI_MODEL_PROXY_RPC_ENDPOINTS.createRecharge, { amount_cents: amountCents })
      const order = decodeRechargeOrder(value)
      if (order === undefined || order.payment_action === undefined) throw new Error('充值响应格式无效')
      if (generation === this.generation && !this.disposed) {
        this.publish({
          ...this.view,
          account: this.view.account === null
            ? null
            : { ...this.view.account, pending_recharge_order: order },
          pending: null,
        })
      }
      return order
    } catch (error) {
      if (error instanceof Error && error.message === 'pending_recharge_order_exists') {
        await this.load()
        if (!this.disposed) this.publish({ ...this.view, pending: null })
        throw new Error('已有一笔待支付订单，请先完成支付或等待订单关闭。')
      }
      if (generation === this.generation && !this.disposed) {
        this.publish({ ...this.view, pending: null, error: message(error) })
      }
      throw error
    }
  }

  async rechargeStatus(outTradeNo: string): Promise<AwikiModelProxyRechargeOrder> {
    if (!this.active()) throw new Error('请先登录 AWiki 身份')
    const generation = this.generation
    const value = await this.call(AWIKI_MODEL_PROXY_RPC_ENDPOINTS.rechargeStatus, { out_trade_no: outTradeNo })
    const order = decodeRechargeOrder(value)
    if (order === undefined) throw new Error('充值状态响应格式无效')
    const previous = this.view.account?.pending_recharge_order
    const current = order.payment_action === undefined
      && previous?.out_trade_no === order.out_trade_no
      && previous.payment_action !== undefined
      ? { ...order, payment_action: previous.payment_action }
      : order
    if (generation !== this.generation || this.disposed) return current
    if (order.status === 'paid' || order.status === 'closed') {
      await this.load()
    } else if (this.view.account !== null) {
      this.publish({
        ...this.view,
        account: { ...this.view.account, pending_recharge_order: current },
      })
    }
    return current
  }

  async closeRecharge(outTradeNo: string): Promise<'closed' | 'paid'> {
    if (!this.active()) throw new Error('请先登录 AWiki 身份')
    if (this.disposed || this.view.pending !== null) throw new Error('已有操作正在进行')
    const generation = ++this.generation
    this.publish({ ...this.view, pending: 'close-recharge', error: null })
    try {
      const value = await this.call(AWIKI_MODEL_PROXY_RPC_ENDPOINTS.closeRecharge, { out_trade_no: outTradeNo })
      if (decodeCloseRechargeResult(value) === undefined) throw new Error('取消充值响应格式无效')
      if (generation === this.generation && !this.disposed) {
        this.generation += 1
        this.publish({
          ...this.view,
          account: this.view.account === null
            ? null
            : { ...this.view.account, pending_recharge_order: null },
          pending: null,
          error: null,
        })
      }
      return 'closed'
    } catch (error) {
      if (error instanceof Error && error.message === 'recharge_order_already_paid') {
        await this.load()
        if (!this.disposed) this.publish({ ...this.view, pending: null })
        return 'paid'
      }
      if (generation === this.generation && !this.disposed) {
        this.publish({ ...this.view, pending: null, error: message(error) })
      }
      throw error
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.generation += 1
    this.unsubscribeSession()
    this.sessionAbort.abort()
    this.abort.abort()
    this.listeners.clear()
  }

  private async call(endpoint: string, payload: unknown): Promise<unknown> {
    const result = await this.connection.rpc.call(
      AWIKI_MODEL_PROXY_RPC_CHANNEL,
      endpoint,
      payload,
      AbortSignal.any([this.abort.signal, this.sessionAbort.signal]),
    )
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }

  private publish(next: AwikiModelProxyView): void {
    this.view = Object.freeze(next)
    for (const listener of [...this.listeners]) listener()
  }

  private active(): boolean {
    return !this.disposed && this.sessionActive === true
  }

  private syncSession(): void {
    if (this.disposed) return
    const view: AwikiView = this.identity.getSnapshot()
    const active = view.status === 'ready' && view.sessionStatus === 'active' && view.identity !== null
    if (active === this.sessionActive) return
    this.sessionActive = active
    this.generation += 1
    this.sessionAbort.abort()
    this.sessionAbort = new AbortController()
    this.publish(active ? INITIAL : { ...INITIAL, status: 'identity-required' })
  }
}

function message(error: unknown): string {
  return error instanceof Error && error.message !== '' ? error.message : 'AWiki 托管模型服务暂不可用。'
}
