import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import {
  AWIKI_MODEL_PROXY_RPC_ENDPOINTS,
} from '../src/model-proxy-contract.ts'
import { apply } from '../src/model-proxy.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const account = {
  did: 'did:wba:alice.example', balance_cents: 0, balance: '0.00', currency: 'CNY',
  model_access_available: true, model_access_reason: null,
  billing_mode: 'development_bypass', payments_available: false,
}

function bench(accountValue: Record<string, unknown> = account) {
  let settings = { enabled: false } as {
    enabled: boolean
    previousProvider?: string
    previousModel?: string
    previousReasoningEffort?: string
  }
  let selection: { provider: string; model: string; reasoningEffort?: string } = {
    provider: 'deepseek-official', model: 'deepseek-chat', reasoningEffort: 'medium',
  }
  let handler: ConnectionRpcHandler | undefined
  const disposeAdapter = vi.fn()
  const disposeDirectory = vi.fn()
  const cleanup: Array<() => void> = []
  const eventHandlers = new Map<string, Array<(...args: never[]) => void>>()
  const dispatch = vi.fn(async () => new Response(JSON.stringify({
    access_token: `host-token-${dispatch.mock.calls.length}`,
    expires_in: 3600,
  }), { status: 200, headers: { 'content-type': 'application/json' } }))
  const ctx = {
    awiki: {
      externalHttpAuth: { dispatch },
      getSession: vi.fn(async () => ({
        ok: true as const,
        value: {
          status: 'active' as const,
          identity: { did: 'did:wba:alice.example', handle: 'alice' },
        },
      })),
    },
    llm: {
      registerAdapter: vi.fn(() => disposeAdapter),
      registerConfigurableProviders: vi.fn(() => disposeDirectory),
    },
    settings: {
      register: vi.fn(() => ({ get: () => settings })),
      update: vi.fn(async (_namespace: unknown, value: typeof settings) => { settings = { ...settings, ...value } }),
    },
    agentDefaultModel: {
      currentSelection: vi.fn(() => selection),
      saveSelection: vi.fn(async (next: typeof selection) => { selection = next }),
    },
    connection: { rpc: { handle: vi.fn((_channel: string, value: ConnectionRpcHandler) => { handler = value }) } },
    on: vi.fn((event: string, listener: (...args: never[]) => void) => {
      const listeners = eventHandlers.get(event) ?? []
      listeners.push(listener)
      eventHandlers.set(event, listeners)
      return () => { eventHandlers.set(event, listeners.filter(candidate => candidate !== listener)) }
    }),
    effect: vi.fn((setup: () => (() => void)) => { cleanup.push(setup()) }),
    logger: { warn: vi.fn() },
  }
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    if (request.url.endsWith('/api/account')) {
      return new Response(JSON.stringify({ ...accountValue, access_token: 'never-to-browser' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    }
    if (request.url.endsWith('/api/recharge/orders/pending')) {
      return new Response('null', { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (request.url.endsWith('/api/usage')) return new Response('[]', { status: 200 })
    if (request.url.endsWith('/api/recharge/orders')) {
      return new Response(JSON.stringify({
        out_trade_no: 'mp-test',
        amount_cents: 100,
        status: 'pending',
        provider: 'tongqifu',
        payment_method: 'ALI_QR',
        created_at: '2026-08-18T00:00:00Z',
        payment_action: { type: 'qr_code', data: 'qr-payload' },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error(`unexpected fetch: ${request.url}`)
  })
  vi.stubGlobal('fetch', fetch)
  apply(ctx as never, { baseURL: 'https://model.awiki.info' })
  if (handler === undefined) throw new Error('model-proxy RPC handler was not installed')
  return {
    ctx, handler, fetch, dispatch, disposeAdapter, disposeDirectory, cleanup,
    selection: () => selection,
    emitSession: (value: unknown) => {
      for (const listener of eventHandlers.get('awiki/session') ?? []) listener(value as never)
    },
  }
}

async function call(handler: ConnectionRpcHandler, endpoint: string, payload: unknown = {}) {
  return handler(endpoint, payload, new AbortController().signal)
}

describe('AWiki Host model-proxy plugin', () => {
  it('keeps credentials Host-only and refreshes the token once after a 401', async () => {
    const b = bench()
    b.fetch.mockImplementationOnce(async () => new Response('', { status: 401 }))
    const result = await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status)

    expect(result).toMatchObject({
      ok: true,
      value: { enabled: false, account: { billing_mode: 'development_bypass', payments_available: false } },
    })
    expect(b.dispatch).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(result)).not.toContain('host-token')
    expect(JSON.stringify(result)).not.toContain('never-to-browser')
    expect(b.ctx.llm.registerAdapter).not.toHaveBeenCalled()
  })

  it('registers only after explicit enable and restores the previous model on disable', async () => {
    const b = bench()
    const enabled = await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true })
    expect(enabled).toMatchObject({ ok: true, value: { enabled: true } })
    expect(b.ctx.llm.registerAdapter).toHaveBeenCalledOnce()
    expect(b.ctx.llm.registerAdapter).toHaveBeenCalledWith(['awiki-deepseek'], expect.any(Object))
    expect(b.ctx.llm.registerConfigurableProviders).toHaveBeenCalledWith([
      expect.objectContaining({ provider: 'awiki-deepseek', displayName: 'AWiki-hosted DeepSeek' }),
    ])
    const adapter = b.ctx.llm.registerAdapter.mock.calls[0]?.[1] as { providerInfo: (provider: string) => unknown }
    expect(adapter.providerInfo('awiki-deepseek')).toEqual({ id: 'awiki-deepseek', name: 'AWiki-hosted DeepSeek' })
    expect(b.selection()).toEqual({ provider: 'awiki-deepseek', model: 'deepseek-v4-flash' })

    const disabled = await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: false })
    expect(disabled).toMatchObject({ ok: true, value: { enabled: false } })
    expect(b.disposeAdapter).toHaveBeenCalledOnce()
    expect(b.disposeDirectory).toHaveBeenCalledOnce()
    expect(b.selection()).toEqual({
      provider: 'deepseek-official', model: 'deepseek-chat', reasoningEffort: 'medium',
    })
  })

  it('rejects enable when the strict account is not eligible', async () => {
    const b = bench({
      ...account,
      billing_mode: 'strict',
      model_access_available: false,
      model_access_reason: 'insufficient_balance',
    })
    const result = await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true })
    expect(result).toMatchObject({ ok: false, error: { code: 'model-unavailable' } })
    expect(b.ctx.llm.registerAdapter).not.toHaveBeenCalled()
    expect(b.ctx.agentDefaultModel.saveSelection).not.toHaveBeenCalled()
  })

  it('creates recharge orders with a Host-generated idempotency key', async () => {
    const b = bench()
    const result = await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.createRecharge, { amount_cents: 100 })

    expect(result).toMatchObject({ ok: true, value: { out_trade_no: 'mp-test' } })
    const request = b.fetch.mock.calls
      .map(([input, init]) => input instanceof Request ? input : new Request(input, init))
      .find(item => item.url.endsWith('/api/recharge/orders'))
    expect(request?.headers.get('idempotency-key')).toMatch(/^[0-9a-f-]{36}$/)
    expect(request?.headers.get('authorization')).toMatch(/^Bearer host-token-/)
    expect(JSON.stringify(result)).not.toContain('host-token')
  })

  it('preserves the stable pending-order conflict across the Host boundary', async () => {
    const b = bench()
    b.fetch.mockImplementationOnce(async () => new Response('pending_recharge_order_exists', { status: 409 }))

    const result = await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.createRecharge, { amount_cents: 100 })

    expect(result).toEqual({
      ok: false,
      error: { code: 'internal', message: 'pending_recharge_order_exists', details: {} },
    })
  })

  it('withdraws the adapter and invalidates the cached token on logout, then restores the enabled preference', async () => {
    const b = bench()
    await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true })
    expect(b.ctx.llm.registerAdapter).toHaveBeenCalledOnce()
    expect(b.dispatch).toHaveBeenCalledOnce()

    b.emitSession({ status: 'signed-out' })
    expect(b.disposeAdapter).toHaveBeenCalledOnce()
    expect(b.disposeDirectory).toHaveBeenCalledOnce()

    b.emitSession({
      status: 'active',
      identity: { did: 'did:wba:alice.example', handle: 'alice' },
    })
    expect(b.ctx.llm.registerAdapter).toHaveBeenCalledTimes(2)
    const result = await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status)
    expect(result).toMatchObject({ ok: true, value: { enabled: true } })
    expect(b.dispatch).toHaveBeenCalledTimes(2)
  })
})
