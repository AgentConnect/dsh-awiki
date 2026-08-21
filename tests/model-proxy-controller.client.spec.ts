import { describe, expect, it, vi } from 'vitest'
import {
  AWIKI_MODEL_PROXY_RPC_CHANNEL,
  AWIKI_MODEL_PROXY_RPC_ENDPOINTS,
} from '../src/model-proxy-contract.ts'
import { AwikiModelProxyController } from '../src/client/model-proxy-controller.ts'
import { AWIKI_RECHARGE_DISABLED_ERROR } from '../src/client/recharge-availability.ts'
import type { AwikiView } from '../src/client/controller.ts'
import { identity as registeredIdentity } from './helpers.client.ts'

const status = {
  enabled: false,
  recommended_model: 'deepseek-v4-flash',
  models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  pending_recharge_order: null,
  account: {
    did: 'did:wba:alice.example', balance_cents: 0, balance: '0.00', currency: 'CNY',
    model_access_available: true, model_access_reason: null,
    billing_mode: 'development_bypass', payments_available: false,
    access_token: 'must-not-cross-loopback-contract',
  },
  access_token: 'must-not-cross-loopback-contract',
}

function connection(call: ReturnType<typeof vi.fn>, isLoopback = true) {
  return { isLoopback, rpc: { call } }
}

function identity(initial: AwikiView['sessionStatus'] = 'active') {
  let sessionStatus = initial
  const listeners = new Set<() => void>()
  const view = (): AwikiView => ({
    status: 'ready', sessionStatus,
    identity: sessionStatus === 'active' ? registeredIdentity : null,
    profile: null, conversations: [], conversationsHasMore: false, selectedConversationId: null,
    selectedGroup: null, groupAccess: null, groupMembers: [], groupMembersHasMore: false, groupRecovery: null,
    messages: [], historyHasMore: false, localPending: false, refreshing: false, pending: null, error: null,
    attachmentMaxBytes: 1024, summaries: {}, recoveryOperationId: null, recoveryProgress: null,
  })
  return {
    getSnapshot: view,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    set: (next: AwikiView['sessionStatus']) => {
      sessionStatus = next
      for (const listener of [...listeners]) listener()
    },
  }
}

describe('AWiki-hosted DeepSeek proxy browser controller', () => {
  it('treats an absent optional Host channel as unavailable without rejecting', async () => {
    const call = vi.fn(async () => ({
      ok: false as const,
      error: { code: 'not-found' as const, message: 'model proxy channel is not installed', details: {} },
    }))
    const controller = new AwikiModelProxyController(connection(call) as never, identity() as never)

    await expect(controller.load()).resolves.toBeUndefined()
    expect(controller.getSnapshot()).toMatchObject({
      status: 'unavailable',
      account: null,
      usage: [],
    })
  })

  it('loads only through loopback and strips unknown credential-shaped fields', async () => {
    const call = vi.fn(async () => ({ ok: true as const, value: status }))
    const controller = new AwikiModelProxyController(connection(call) as never, identity() as never)
    await controller.load()

    expect(call).toHaveBeenCalledWith(
      AWIKI_MODEL_PROXY_RPC_CHANNEL,
      AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status,
      {},
      expect.any(AbortSignal),
    )
    expect(controller.getSnapshot()).toMatchObject({ status: 'ready', account: { enabled: false } })
    expect(JSON.stringify(controller.getSnapshot())).not.toContain('access_token')
    expect(JSON.stringify(controller.getSnapshot())).not.toContain('must-not-cross-loopback-contract')
  })

  it('refuses account access over a non-loopback connection', async () => {
    const call = vi.fn()
    const controller = new AwikiModelProxyController(connection(call, false) as never, identity() as never)
    await controller.load()
    expect(call).not.toHaveBeenCalled()
    expect(controller.getSnapshot()).toMatchObject({ status: 'unavailable' })
  })

  it('does not send a recharge RPC while the client release gate is closed', async () => {
    const call = vi.fn()
    const controller = new AwikiModelProxyController(connection(call) as never, identity() as never)

    await expect(controller.createRecharge(100)).rejects.toThrow(AWIKI_RECHARGE_DISABLED_ERROR)
    expect(call).not.toHaveBeenCalled()
    expect(controller.getSnapshot().pending).toBeNull()
  })

  it('changes explicit model state, loads usage, and never enables after recharge', async () => {
    const usage = [{
      id: 1, endpoint: '/v1/chat/completions', model: 'deepseek-v4-flash',
      cache_hit_tokens: 2, cache_miss_tokens: 3, completion_tokens: 5,
      billing_mode: 'development_bypass', calculated_cost_micros: null,
      charged_micros: 0, estimated: false, created_at: '2026-08-18T00:00:00Z',
    }]
    const order = {
      out_trade_no: 'order-1', amount_cents: 100, status: 'pending', provider: 'tongqifu',
      payment_method: 'ALI_QR', created_at: '2026-08-18T00:00:00Z',
      payment_action: { type: 'qr_code', data: 'qr-content' },
    }
    const call = vi.fn(async (_channel: string, endpoint: string, payload: unknown) => {
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status) return { ok: true as const, value: status }
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.usage) return { ok: true as const, value: usage }
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled) {
        expect(payload).toEqual({ enabled: true })
        return { ok: true as const, value: { ...status, enabled: true } }
      }
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.createRecharge) return { ok: true as const, value: order }
      throw new Error('unexpected endpoint')
    })
    const controller = new AwikiModelProxyController(connection(call) as never, identity() as never, true)
    await controller.load()
    await controller.loadUsage()
    expect(controller.getSnapshot().usage).toHaveLength(1)
    await expect(controller.createRecharge(100)).resolves.toMatchObject({ out_trade_no: 'order-1' })
    expect(controller.getSnapshot().account?.enabled).toBe(false)
    expect(controller.getSnapshot().account?.pending_recharge_order?.out_trade_no).toBe('order-1')
    await controller.setEnabled(true)
    expect(controller.getSnapshot().account?.enabled).toBe(true)
  })

  it('restores the pending order after a duplicate create conflict', async () => {
    const pendingOrder = {
      out_trade_no: 'order-existing', amount_cents: 100, status: 'pending', provider: 'tongqifu',
      payment_method: 'ALI_QR', created_at: '2026-08-18T00:00:00Z',
      payment_action: { type: 'qr_code', data: 'qr-content' },
    }
    let statusCalls = 0
    const call = vi.fn(async (_channel: string, endpoint: string) => {
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status) {
        statusCalls += 1
        return {
          ok: true as const,
          value: statusCalls === 1 ? status : { ...status, pending_recharge_order: pendingOrder },
        }
      }
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.createRecharge) {
        return {
          ok: false as const,
          error: { code: 'internal' as const, message: 'pending_recharge_order_exists', details: {} },
        }
      }
      throw new Error('unexpected endpoint')
    })
    const controller = new AwikiModelProxyController(connection(call) as never, identity() as never, true)
    await controller.load()

    await expect(controller.createRecharge(100)).rejects.toThrow('已有一笔待支付订单')
    expect(controller.getSnapshot()).toMatchObject({
      status: 'ready',
      pending: null,
      account: { pending_recharge_order: { out_trade_no: 'order-existing' } },
    })
  })

  it('closes a pending recharge without creating or enabling anything else', async () => {
    const pendingOrder = {
      out_trade_no: 'order-close', amount_cents: 275, status: 'pending', provider: 'tongqifu',
      payment_method: 'ALI_QR', created_at: '2026-08-18T00:00:00Z',
      payment_action: { type: 'qr_code', data: 'qr-content' },
    }
    const call = vi.fn(async (_channel: string, endpoint: string, payload: unknown) => {
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status) {
        return { ok: true as const, value: { ...status, pending_recharge_order: pendingOrder } }
      }
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.closeRecharge) {
        expect(payload).toEqual({ out_trade_no: 'order-close' })
        return { ok: true as const, value: { closed: true } }
      }
      throw new Error('unexpected endpoint')
    })
    const controller = new AwikiModelProxyController(connection(call) as never, identity() as never)
    await controller.load()

    await expect(controller.closeRecharge('order-close')).resolves.toBe('closed')
    expect(controller.getSnapshot()).toMatchObject({
      status: 'ready', pending: null, account: { enabled: false, pending_recharge_order: null },
    })
    expect(call).not.toHaveBeenCalledWith(
      AWIKI_MODEL_PROXY_RPC_CHANNEL,
      AWIKI_MODEL_PROXY_RPC_ENDPOINTS.createRecharge,
      expect.anything(),
      expect.anything(),
    )
    expect(call).not.toHaveBeenCalledWith(
      AWIKI_MODEL_PROXY_RPC_CHANNEL,
      AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled,
      expect.anything(),
      expect.anything(),
    )
  })

  it('reloads the credited account when payment wins the close race', async () => {
    const pendingOrder = {
      out_trade_no: 'order-paid', amount_cents: 100, status: 'pending', provider: 'tongqifu',
      payment_method: 'ALI_QR', created_at: '2026-08-18T00:00:00Z',
    }
    let statusCalls = 0
    const call = vi.fn(async (_channel: string, endpoint: string) => {
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status) {
        statusCalls += 1
        return {
          ok: true as const,
          value: statusCalls === 1
            ? { ...status, pending_recharge_order: pendingOrder }
            : {
                ...status,
                account: { ...status.account, balance_cents: 100, balance: '1.00' },
                pending_recharge_order: null,
              },
        }
      }
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.closeRecharge) {
        return {
          ok: false as const,
          error: { code: 'internal' as const, message: 'recharge_order_already_paid', details: {} },
        }
      }
      throw new Error('unexpected endpoint')
    })
    const controller = new AwikiModelProxyController(connection(call) as never, identity() as never)
    await controller.load()

    await expect(controller.closeRecharge('order-paid')).resolves.toBe('paid')
    expect(statusCalls).toBe(2)
    expect(controller.getSnapshot()).toMatchObject({
      status: 'ready', pending: null,
      account: { account: { balance: '1.00' }, pending_recharge_order: null },
    })
  })

  it('does not let a stale payment poll restore an order after it is closed', async () => {
    const pendingOrder = {
      out_trade_no: 'order-stale', amount_cents: 100, status: 'pending', provider: 'tongqifu',
      payment_method: 'ALI_QR', created_at: '2026-08-18T00:00:00Z',
    }
    let resolvePoll: ((value: { ok: true; value: typeof pendingOrder }) => void) | undefined
    const stalePoll = new Promise<{ ok: true; value: typeof pendingOrder }>((resolve) => { resolvePoll = resolve })
    const call = vi.fn(async (_channel: string, endpoint: string) => {
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status) {
        return { ok: true as const, value: { ...status, pending_recharge_order: pendingOrder } }
      }
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.rechargeStatus) return stalePoll
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.closeRecharge) {
        return { ok: true as const, value: { closed: true } }
      }
      throw new Error('unexpected endpoint')
    })
    const controller = new AwikiModelProxyController(connection(call) as never, identity() as never)
    await controller.load()

    const polling = controller.rechargeStatus('order-stale')
    await expect(controller.closeRecharge('order-stale')).resolves.toBe('closed')
    resolvePoll?.({ ok: true, value: pendingOrder })
    await polling

    expect(controller.getSnapshot().account?.pending_recharge_order).toBeNull()
  })

  it('clears cached account state on sign-out and reloads it only after identity restoration', async () => {
    const call = vi.fn(async () => ({ ok: true as const, value: status }))
    const session = identity()
    const controller = new AwikiModelProxyController(connection(call) as never, session as never)
    await controller.load()
    const firstSignal = call.mock.calls[0]?.[3] as AbortSignal
    expect(controller.getSnapshot().account).not.toBeNull()

    session.set('signed-out')
    expect(firstSignal.aborted).toBe(true)
    expect(controller.getSnapshot()).toMatchObject({ status: 'identity-required', account: null, usage: [] })
    await controller.load()
    expect(call).toHaveBeenCalledOnce()

    session.set('active')
    expect(controller.getSnapshot()).toMatchObject({ status: 'idle', account: null })
    await controller.load()
    expect(call).toHaveBeenCalledTimes(2)
    expect(controller.getSnapshot().status).toBe('ready')
  })
})
