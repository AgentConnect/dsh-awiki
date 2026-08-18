import { describe, expect, it, vi } from 'vitest'
import {
  AWIKI_MODEL_PROXY_RPC_CHANNEL,
  AWIKI_MODEL_PROXY_RPC_ENDPOINTS,
} from '../src/model-proxy-contract.ts'
import { AwikiModelProxyController } from '../src/client/model-proxy-controller.ts'
import type { AwikiView } from '../src/client/controller.ts'
import { identity as registeredIdentity } from './helpers.client.ts'

const status = {
  enabled: false,
  recommended_model: 'deepseek-v4-flash',
  models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  account: {
    did: 'did:wba:alice.example', balance_cents: 0, balance: '0.00', currency: 'CNY',
    model_access_available: true, billing_mode: 'development_bypass', payments_available: false,
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
    conversations: [], conversationsHasMore: false, selectedConversationId: null,
    messages: [], historyHasMore: false, pending: null, error: null,
    attachmentMaxBytes: 1024, summaries: {},
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

  it('changes explicit model state, loads usage, and never enables after recharge', async () => {
    const usage = [{
      id: 1, endpoint: '/v1/chat/completions', model: 'deepseek-v4-flash',
      cache_hit_tokens: 2, cache_miss_tokens: 3, completion_tokens: 5,
      billing_mode: 'development_bypass', calculated_cost_micros: null,
      charged_micros: 0, estimated: false, created_at: '2026-08-18T00:00:00Z',
    }]
    const order = {
      out_trade_no: 'order-1', amount_cents: 100, status: 'pending', provider: 'tongqifu',
      payment_method: 'ALI_QR', payment_action: { type: 'qr_code', data: 'qr-content' },
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
    const controller = new AwikiModelProxyController(connection(call) as never, identity() as never)
    await controller.load()
    await controller.loadUsage()
    expect(controller.getSnapshot().usage).toHaveLength(1)
    await expect(controller.createRecharge(100)).resolves.toMatchObject({ out_trade_no: 'order-1' })
    expect(controller.getSnapshot().account?.enabled).toBe(false)
    await controller.setEnabled(true)
    expect(controller.getSnapshot().account?.enabled).toBe(true)
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
