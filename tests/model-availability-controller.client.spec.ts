import { describe, expect, it, vi } from 'vitest'
import type { RpcResponse } from '@deepseek-ai/dsh-api-remotes/client'
import { ModelAvailabilityController } from '../src/client/model-availability-controller.ts'

let nextRpc = 0

function ok<T>(value: T): RpcResponse<T> {
  return { rpcId: `model-availability-${nextRpc++}` as never, result: { ok: true, value } }
}

function fail<T>(message: string): RpcResponse<T> {
  return {
    rpcId: `model-availability-${nextRpc++}` as never,
    result: { ok: false, error: { code: 'internal', message, details: {} } },
  }
}

const official = {
  provider: 'deepseek-official',
  displayName: 'DeepSeek',
  settingsNs: 'llm-deepseek',
  settingsPath: [],
  active: true,
}

const officialSettings = {
  ns: 'llm-deepseek',
  schema: {},
  value: { apiKeyEnv: 'DEEPSEEK_API_KEY' },
  applies: 'live' as const,
  secrets: [],
  revision: 0,
}

function connection(options: {
  providers?: ReturnType<typeof vi.fn>
  settings?: ReturnType<typeof vi.fn>
  credentials?: ReturnType<typeof vi.fn>
} = {}) {
  const providers = options.providers ?? vi.fn(() => Promise.resolve(ok({ providers: [official] })))
  const settings = options.settings ?? vi.fn(() => Promise.resolve(ok({
    writable: true,
    hasDocument: true,
    namespaces: [officialSettings],
  })))
  const credentials = options.credentials ?? vi.fn(() => Promise.resolve(ok({
    credentials: { DEEPSEEK_API_KEY: { configured: true, source: 'file', writable: true } },
  })))
  return {
    value: { api: { llm: { providers }, settings: { describe: settings }, credentials: { describe: credentials } } },
    providers,
    settings,
    credentials,
  }
}

describe('Harness model availability controller', () => {
  it('recognizes a configured official DeepSeek provider', async () => {
    const api = connection()
    const controller = new ModelAvailabilityController(api.value as never)

    await controller.load()

    expect(controller.getSnapshot()).toEqual({ status: 'ready', usable: true, error: null })
    expect(api.credentials).toHaveBeenCalledWith({ refs: ['DEEPSEEK_API_KEY'] })
  })

  it('keeps onboarding eligible when every active provider lacks its credential', async () => {
    const api = connection({
      credentials: vi.fn(() => Promise.resolve(ok({
        credentials: { DEEPSEEK_API_KEY: { configured: false, writable: true } },
      }))),
    })
    const controller = new ModelAvailabilityController(api.value as never)

    await controller.load()

    expect(controller.getSnapshot()).toEqual({ status: 'ready', usable: false, error: null })
  })

  it('accepts an active provider that authenticates outside the credential store', async () => {
    const api = connection({
      providers: vi.fn(() => Promise.resolve(ok({
        providers: [{
          provider: 'local-gateway',
          displayName: 'Local gateway',
          settingsNs: '',
          settingsPath: [],
          active: true,
        }],
      }))),
      settings: vi.fn(() => Promise.resolve(ok({ writable: true, hasDocument: true, namespaces: [] }))),
    })
    const controller = new ModelAvailabilityController(api.value as never)

    await controller.load()

    expect(controller.getSnapshot()).toEqual({ status: 'ready', usable: true, error: null })
    expect(api.credentials).not.toHaveBeenCalled()
  })

  it('reports an unavailable check separately from a confirmed absence', async () => {
    const api = connection({
      providers: vi.fn(() => Promise.resolve(fail('provider directory unavailable'))),
    })
    const controller = new ModelAvailabilityController(api.value as never)

    await controller.load()

    expect(controller.getSnapshot()).toEqual({
      status: 'unavailable',
      usable: false,
      error: 'provider directory unavailable',
    })
  })

  it('refreshes a loaded projection after provider or credential invalidation', async () => {
    let configured = false
    const api = connection({
      credentials: vi.fn(() => Promise.resolve(ok({
        credentials: { DEEPSEEK_API_KEY: { configured, writable: true } },
      }))),
    })
    const controller = new ModelAvailabilityController(api.value as never)
    await controller.load()
    expect(controller.getSnapshot().usable).toBe(false)

    configured = true
    controller.refreshIfLoaded()

    await vi.waitFor(() => { expect(controller.getSnapshot().usable).toBe(true) })
  })
})
