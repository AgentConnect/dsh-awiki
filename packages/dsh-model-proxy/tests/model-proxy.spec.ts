import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import type { DeepSeekConnectionOptions } from '@deepseek-ai/dsh-llm-deepseek'
import {
  AWIKI_MODEL_PROXY_RPC_ENDPOINTS,
} from '@awiki/dsh-plugin/model-proxy-contract'
import { apply } from '../src/index.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const account = {
  did: 'did:wba:alice.example', balance_cents: 0, balance: '0.00', currency: 'CNY',
  model_access_available: true, model_access_reason: null,
  billing_mode: 'development_bypass', payments_available: false,
}

function bench(
  accountValue: Record<string, unknown> = account,
  config: Parameters<typeof apply>[1] = { baseURL: 'https://model.awiki.info' },
  publishedBaseURL?: string,
) {
  let published = publishedBaseURL
  let tenantId = 'official-china'
  let modelProxyRestricted = false
  let settings = { enabled: false } as {
    enabled: boolean
    previousProvider?: string
    previousModel?: string
    previousReasoningEffort?: string
    tenantPreferencesJson?: string
  }
  let selection: { provider: string; model: string; reasoningEffort?: string } = {
    provider: 'deepseek-official', model: 'deepseek-chat', reasoningEffort: 'medium',
  }
  let handler: ConnectionRpcHandler | undefined
  const disposeAdapter = vi.fn()
  const disposeDirectory = vi.fn()
  const cleanup: Array<() => void> = []
  let lifecycle: { prepareSwitch: () => void | Promise<void>; commitSwitch?: () => void | Promise<void>; rollbackSwitch?: () => void | Promise<void> } | undefined
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
      getTenantCapabilities: vi.fn(() => ({ tenantId, generation: 0, online: true, handleRecoveryPhoneEnabled: false, ...published === undefined ? {} : { modelProxyBaseUrl: published } })),
      refreshTenantCapabilities: vi.fn(async () => ({ tenantId, generation: 0, online: true, handleRecoveryPhoneEnabled: false, ...published === undefined ? {} : { modelProxyBaseUrl: published } })),
      refreshUpdatePolicy: vi.fn(async () => ({ modelProxyRestricted })),
      registerTenantLifecycleParticipant: vi.fn((participant) => {
        lifecycle = participant
        return () => { lifecycle = undefined }
      }),
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
  apply(ctx as never, config)
  if (handler === undefined) throw new Error('model-proxy RPC handler was not installed')
  return {
    ctx, handler, fetch, dispatch, disposeAdapter, disposeDirectory, cleanup,
    settings: () => settings,
    lifecycle: () => lifecycle,
    setPublished: (value: string | undefined) => { published = value },
    setTenant: (value: string) => { tenantId = value },
    setModelProxyRestricted: (value: boolean) => { modelProxyRestricted = value },
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
  it('fails clearly when the AWiki Host service is absent', () => {
    expect(() => apply({} as never)).toThrow(
      '@awiki/dsh-model-proxy requires @awiki/dsh-plugin@^0.3.0 in the same DSH profile',
    )
  })

  it('rejects unsafe or invalid configuration before registering Host state', () => {
    expect(() => bench(account, { baseURL: 'http://model.awiki.info' }))
      .toThrow('baseURL must use HTTPS or loopback HTTP')
    expect(() => bench(account, { baseURL: 'https://user:model@model.awiki.info' }))
      .toThrow('baseURL must not contain credentials, query, or fragment')
    expect(() => bench(account, { contextWindow: 0 }))
      .toThrow('contextWindow must be a positive integer')
    expect(() => bench(account, { maxTokens: 1.5 }))
      .toThrow('maxTokens must be a positive integer')
    expect(() => bench(account, { tokenRefreshSkewSeconds: -1 }))
      .toThrow('tokenRefreshSkewSeconds must be a non-negative integer')
  })

  it('advertises its loopback capability without requiring an AWiki session or token', async () => {
    const b = bench()
    b.emitSession({ status: 'signed-out' })

    await expect(call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.capability)).resolves.toEqual({
      ok: true,
      value: { available: true, protocol: 1 },
    })
    expect(b.dispatch).not.toHaveBeenCalled()
    expect(b.fetch).not.toHaveBeenCalled()
  })

  it('has no production fallback when the active tenant does not advertise Model Proxy', async () => {
    const b = bench(account, {})
    await expect(call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.capability)).resolves.toEqual({
      ok: true,
      value: { available: false, protocol: 1 },
    })
    await expect(call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status)).resolves.toMatchObject({
      ok: false, error: { code: 'model-unavailable' },
    })
  })

  it('releases tenant resources before switch and binds only the newly advertised endpoint', async () => {
    const b = bench(account, {}, 'https://model.china.example')
    await vi.waitFor(() => { expect(b.ctx.awiki.refreshUpdatePolicy).toHaveBeenCalled() })
    const lifecycle = b.lifecycle()
    if (lifecycle === undefined) throw new Error('tenant lifecycle was not registered')
    await lifecycle.prepareSwitch()
    b.setPublished('https://model.global.example')
    await lifecycle.commitSwitch?.()
    await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status)
    expect(b.fetch.mock.calls.map(([request, init]) => (
      request instanceof Request ? request : new Request(request, init)
    ).url)).toContain('https://model.global.example/api/account')
  })

  it('persists hosted-model intent and fallback independently for every tenant', async () => {
    const b = bench(account, {}, 'https://model.china.example')
    await vi.waitFor(() => { expect(b.ctx.awiki.refreshUpdatePolicy).toHaveBeenCalled() })
    await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true })
    const lifecycle = b.lifecycle()
    if (lifecycle === undefined) throw new Error('tenant lifecycle was not registered')

    await lifecycle.prepareSwitch()
    b.setTenant('official-global')
    b.setPublished('https://model.global.example')
    await lifecycle.commitSwitch?.()
    expect(b.settings().enabled).toBe(false)
    expect(b.selection()).toEqual({
      provider: 'deepseek-official', model: 'deepseek-chat', reasoningEffort: 'medium',
    })

    await lifecycle.prepareSwitch()
    b.setTenant('official-china')
    b.setPublished('https://model.china.example')
    await lifecycle.commitSwitch?.()
    expect(b.settings().enabled).toBe(true)
    expect(b.selection()).toEqual({ provider: 'awiki-deepseek', model: 'deepseek-v4-flash' })
  })

  it('disables only the hosted model when the active tenant minimum is not met', async () => {
    const b = bench(account, {}, 'https://model.china.example')
    await vi.waitFor(() => { expect(b.ctx.awiki.refreshUpdatePolicy).toHaveBeenCalled() })
    await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true })
    const lifecycle = b.lifecycle()
    if (lifecycle === undefined) throw new Error('tenant lifecycle was not registered')

    await lifecycle.prepareSwitch()
    b.setModelProxyRestricted(true)
    await lifecycle.commitSwitch?.()
    expect(b.selection()).toEqual({
      provider: 'deepseek-official', model: 'deepseek-chat', reasoningEffort: 'medium',
    })
    await expect(call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.capability)).resolves.toEqual({
      ok: true,
      value: { available: false, protocol: 1 },
    })
  })

  it('coalesces concurrent token demand and reuses the cached token across RPC calls', async () => {
    const b = bench()

    await expect(call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status)).resolves.toMatchObject({ ok: true })
    await expect(call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.usage)).resolves.toMatchObject({ ok: true })

    expect(b.dispatch).toHaveBeenCalledOnce()
    const authorization = b.fetch.mock.calls.map(([input, init]) => {
      const request = input instanceof Request ? input : new Request(input, init)
      return request.headers.get('authorization')
    })
    expect(new Set(authorization)).toEqual(new Set(['Bearer host-token-1']))
  })

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

  it('resolves the complete rc.2 DeepSeek request budget contract', async () => {
    const b = bench()

    await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true })
    const adapter = b.ctx.llm.registerAdapter.mock.calls[0]?.[1] as {
      config: { options: () => DeepSeekConnectionOptions }
    }
    const options = adapter.config.options()

    expect(options).toMatchObject({
      baseURL: 'https://model.awiki.info/v1',
      maxRequestFilesBytes: 128 * 1024 * 1024,
      maxInlineRequestImageBytes: 20 * 1024 * 1024,
      maxImagesPerRequest: 600,
      imageOffloadByteQuantum: 64 * 1024 * 1024,
      inlineImageOffloadByteQuantum: 10 * 1024 * 1024,
      imageOffloadCountQuantum: 20,
      filesApiTimeoutMs: 60_000,
      filePolicy: {
        expiresAfterSeconds: 7 * 24 * 60 * 60,
        refreshMarginSeconds: 60 * 60,
        quotaCleanupBatch: 100,
      },
    })
    expect(String(options.apiKeyEnv)).toContain('AWIKI_MODEL_PROXY_TOKEN')
  })

  it('keeps the original fallback model when enable is requested more than once', async () => {
    const b = bench()

    await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true })
    await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true })
    await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: false })

    expect(b.ctx.llm.registerAdapter).toHaveBeenCalledOnce()
    expect(b.selection()).toEqual({
      provider: 'deepseek-official', model: 'deepseek-chat', reasoningEffort: 'medium',
    })
  })

  it('removes the provider directory when adapter registration fails and allows a clean retry', async () => {
    const b = bench()
    b.ctx.llm.registerAdapter.mockImplementationOnce(() => { throw new Error('adapter registration failed') })

    const failed = await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true })

    expect(failed).toMatchObject({ ok: false, error: { code: 'internal' } })
    expect(b.disposeDirectory).toHaveBeenCalledOnce()
    expect(b.disposeAdapter).not.toHaveBeenCalled()
    expect(b.settings().enabled).toBe(false)
    expect(b.selection()).toEqual({
      provider: 'deepseek-official', model: 'deepseek-chat', reasoningEffort: 'medium',
    })

    await expect(call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true }))
      .resolves.toMatchObject({ ok: true, value: { enabled: true } })
    expect(b.ctx.llm.registerConfigurableProviders).toHaveBeenCalledTimes(2)
    expect(b.ctx.llm.registerAdapter).toHaveBeenCalledTimes(2)
    expect(b.selection()).toEqual({ provider: 'awiki-deepseek', model: 'deepseek-v4-flash' })
  })

  it('rolls back settings and registrations when selecting the proxy model fails', async () => {
    const b = bench()
    b.ctx.agentDefaultModel.saveSelection.mockRejectedValueOnce(new Error('selection write failed'))

    const failed = await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true })

    expect(failed).toMatchObject({ ok: false, error: { code: 'internal' } })
    expect(b.settings().enabled).toBe(false)
    expect(b.disposeAdapter).toHaveBeenCalledOnce()
    expect(b.disposeDirectory).toHaveBeenCalledOnce()
    expect(b.selection()).toEqual({
      provider: 'deepseek-official', model: 'deepseek-chat', reasoningEffort: 'medium',
    })

    await expect(call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true }))
      .resolves.toMatchObject({ ok: true, value: { enabled: true } })
    expect(b.ctx.llm.registerAdapter).toHaveBeenCalledTimes(2)
    expect(b.selection()).toEqual({ provider: 'awiki-deepseek', model: 'deepseek-v4-flash' })
  })

  it('restores the proxy selection when disabling settings cannot be persisted', async () => {
    const b = bench()
    await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true })
    b.ctx.settings.update.mockRejectedValueOnce(new Error('settings write failed'))

    const failed = await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: false })

    expect(failed).toMatchObject({ ok: false, error: { code: 'internal' } })
    expect(b.settings().enabled).toBe(true)
    expect(b.disposeAdapter).not.toHaveBeenCalled()
    expect(b.disposeDirectory).not.toHaveBeenCalled()
    expect(b.selection()).toEqual({ provider: 'awiki-deepseek', model: 'deepseek-v4-flash' })

    await expect(call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: false }))
      .resolves.toMatchObject({ ok: true, value: { enabled: false } })
    expect(b.disposeAdapter).toHaveBeenCalledOnce()
    expect(b.disposeDirectory).toHaveBeenCalledOnce()
    expect(b.selection()).toEqual({
      provider: 'deepseek-official', model: 'deepseek-chat', reasoningEffort: 'medium',
    })
  })

  it('does not duplicate the adapter when disabling disposal fails and the transaction rolls back', async () => {
    const b = bench()
    await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true })
    b.disposeAdapter.mockImplementationOnce(() => { throw new Error('adapter disposal failed') })

    const failed = await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: false })

    expect(failed).toMatchObject({ ok: false, error: { code: 'internal' } })
    expect(b.settings().enabled).toBe(true)
    expect(b.ctx.llm.registerAdapter).toHaveBeenCalledOnce()
    expect(b.ctx.llm.registerConfigurableProviders).toHaveBeenCalledTimes(2)
    expect(b.selection()).toEqual({ provider: 'awiki-deepseek', model: 'deepseek-v4-flash' })

    await expect(call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: false }))
      .resolves.toMatchObject({ ok: true, value: { enabled: false } })
    expect(b.ctx.llm.registerAdapter).toHaveBeenCalledOnce()
    expect(b.disposeAdapter).toHaveBeenCalledTimes(2)
    expect(b.disposeDirectory).toHaveBeenCalledTimes(2)
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

  it('closes recharge orders through the authenticated Host without exposing its token', async () => {
    const b = bench()
    b.fetch.mockImplementationOnce(async () => new Response(null, { status: 204 }))
    const result = await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.closeRecharge, {
      out_trade_no: 'mp test/1',
    })

    expect(result).toEqual({ ok: true, value: { closed: true } })
    const request = b.fetch.mock.calls
      .map(([input, init]) => input instanceof Request ? input : new Request(input, init))
      .find(item => item.url.endsWith('/api/recharge/orders/mp%20test%2F1/close'))
    expect(request?.method).toBe('POST')
    expect(request?.headers.get('authorization')).toMatch(/^Bearer host-token-/)
    expect(JSON.stringify(result)).not.toContain('host-token')
  })

  it('preserves a stable recharge-close error across the Host boundary', async () => {
    const b = bench()
    b.fetch.mockImplementationOnce(async () => new Response('payment_order_close_failed', { status: 502 }))

    const result = await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.closeRecharge, {
      out_trade_no: 'mp-test',
    })

    expect(result).toEqual({
      ok: false,
      error: { code: 'internal', message: 'payment_order_close_failed', details: {} },
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

  it('unregisters the adapter and directory exactly once when the plugin unloads', async () => {
    const b = bench()
    await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true })

    expect(b.cleanup).toHaveLength(1)
    for (const dispose of [...b.cleanup].reverse()) dispose()

    expect(b.disposeAdapter).toHaveBeenCalledOnce()
    expect(b.disposeDirectory).toHaveBeenCalledOnce()
  })

  it('releases the directory and retries failed adapter disposal without throwing from unload', async () => {
    const b = bench()
    await call(b.handler, AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled: true })
    b.disposeAdapter.mockImplementationOnce(() => { throw new Error('adapter disposal failed') })

    expect(() => { b.cleanup[0]?.() }).not.toThrow()
    expect(b.disposeAdapter).toHaveBeenCalledOnce()
    expect(b.disposeDirectory).toHaveBeenCalledOnce()
    expect(b.ctx.logger.warn).toHaveBeenCalledWith(
      'awiki-model-proxy: failed to release adapter during unload',
    )

    expect(() => { b.cleanup[0]?.() }).not.toThrow()
    expect(b.disposeAdapter).toHaveBeenCalledTimes(2)
    expect(b.disposeDirectory).toHaveBeenCalledOnce()
  })
})
