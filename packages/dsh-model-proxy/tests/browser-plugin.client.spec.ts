// @vitest-environment jsdom
import { Context, Service } from '@deepseek-ai/cordis'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AWIKI_MODEL_PROXY_RPC_CHANNEL,
  AWIKI_MODEL_PROXY_RPC_ENDPOINTS,
} from '../../../src/model-proxy-contract.ts'
import type { AwikiView } from '../../../src/client/controller.ts'
import { apply, inject } from '../src/client/index.ts'
import type { ModelProxySettingsInjected } from '../src/client/ModelProxySettingsSection.tsx'
import type { AwikiOnboardingInjected } from '../src/client/AwikiOnboarding.tsx'
import { ModelAvailabilityController } from '../src/client/model-availability-controller.ts'
import { AwikiModelProxyController } from '../src/client/model-proxy-controller.ts'
import { identity as registeredIdentity } from '../../../tests/helpers.client.ts'

afterEach(() => { vi.restoreAllMocks() })

const identityView: AwikiView = {
  status: 'ready', sessionStatus: 'active', identity: registeredIdentity,
  profile: null, conversations: [], conversationsHasMore: false, selectedConversationId: null,
  selectedGroup: null, groupAccess: null, groupMembers: [], groupMembersHasMore: false, groupRecovery: null,
  messages: [], historyHasMore: false, localPending: false, refreshing: false, pending: null, error: null,
  attachmentMaxBytes: 1024, summaries: {}, recoveryOperationId: null, recoveryProgress: null,
}

function fakeIdentityController() {
  const unsubscribe = vi.fn()
  const controller = {
    getSnapshot: () => identityView,
    subscribe: vi.fn(() => unsubscribe),
    loadSession: vi.fn(() => Promise.resolve()),
  }
  return { controller, unsubscribe }
}

async function bench() {
  const ctx = new Context()
  const rpcCall = vi.fn(async (channel: string, endpoint: string, _payload: unknown, _signal: AbortSignal) => {
    if (channel !== AWIKI_MODEL_PROXY_RPC_CHANNEL) throw new Error('unexpected channel')
    if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.capability) {
      return { ok: true as const, value: { available: true, protocol: 1 } }
    }
    throw new Error(`unexpected endpoint: ${endpoint}`)
  })
  class ConnectionService extends Service {
    constructor(serviceCtx: Context) { super(serviceCtx, 'connection') }
    readonly isLoopback = true
    readonly rpc = { call: rpcCall }
    readonly api = {
      llm: { providers: vi.fn() },
      settings: { describe: vi.fn() },
      credentials: { describe: vi.fn() },
    }
  }
  class LocaleService extends Service {
    constructor(serviceCtx: Context) { super(serviceCtx, 'locale') }
    readonly disposers: Array<ReturnType<typeof vi.fn>> = []
    readonly register = vi.fn(() => {
      const dispose = vi.fn()
      this.disposers.push(dispose)
      return dispose
    })
    readonly bind = vi.fn(() => (key: string) => key === 'nav' ? '快速充值' : key)
  }
  class RemoteService extends Service {
    constructor(serviceCtx: Context) { super(serviceCtx, 'remote') }
    readonly disposers: Array<ReturnType<typeof vi.fn>> = []
    readonly $on = vi.fn(() => {
      const dispose = vi.fn()
      this.disposers.push(dispose)
      return dispose
    })
  }
  const identity = fakeIdentityController()
  const identityController = identity.controller
  const identityComponent = (() => null) as never
  class AwikiClientService extends Service {
    constructor(serviceCtx: Context) { super(serviceCtx, 'awikiClient') }
    readonly identity = identityController
    readonly IdentityAccess = identityComponent
    readonly clearLocalIdentity = vi.fn(() => Promise.resolve({ ok: true as const, value: undefined }))
  }
  new ConnectionService(ctx)
  const locale = new LocaleService(ctx)
  const remote = new RemoteService(ctx)
  const awikiClient = new AwikiClientService(ctx)
  await ctx.plugin(SlotRegistry).await()
  const disposeFrame = ctx.slots.register({
    name: 'root',
    children: {
      'settings.section': { kind: 'list', scope: 'root' },
      'settings.onboarding': { kind: 'list', scope: 'root' },
    },
  } as never, (() => null) as never)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  const settingsEntry = () => ctx.slots.entries('settings.section').find(value => value.options.id === 'awiki-model-proxy')
  const onboardingEntry = () => ctx.slots.entries('settings.onboarding').find(value => value.options.id === 'awiki-model-proxy')
  return {
    ctx,
    fiber,
    settingsEntry,
    onboardingEntry,
    identity: identityController,
    identityUnsubscribe: identity.unsubscribe,
    IdentityAccess: identityComponent,
    awikiClient,
    rpcCall,
    localeDisposers: locale.disposers,
    remoteDisposers: remote.disposers,
    disposeFrame,
  }
}

describe('Model Proxy browser plugin', () => {
  it('owns Quick Recharge settings, both model tabs, and onboarding for its full lifecycle', async () => {
    const disposeModels = vi.spyOn(AwikiModelProxyController.prototype, 'dispose')
    const disposeAvailability = vi.spyOn(ModelAvailabilityController.prototype, 'dispose')
    const b = await bench()
    const capabilitySignal = b.rpcCall.mock.calls[0]?.[3]

    expect(inject).toEqual(['slots', 'remote', 'connection', 'locale', 'awikiClient'])
    expect(b.settingsEntry()?.options).toMatchObject({ id: 'awiki-model-proxy', order: 31 })
    expect(b.settingsEntry()?.options.label?.()).toBe('快速充值')
    expect(b.onboardingEntry()?.options).toMatchObject({ id: 'awiki-model-proxy', order: -10 })
    expect(b.rpcCall).toHaveBeenCalledWith(
      AWIKI_MODEL_PROXY_RPC_CHANNEL,
      AWIKI_MODEL_PROXY_RPC_ENDPOINTS.capability,
      {},
      expect.any(AbortSignal),
    )

    const settings = b.settingsEntry()!.inject!({} as never) as unknown as ModelProxySettingsInjected
    expect(settings.hooks.awikiSession).toBe(b.identity)
    expect(settings.hooks.awikiModelProxy).toBe(settings.models)
    expect(settings.models.getSnapshot()).toMatchObject({ capability: 'available', status: 'idle' })

    const onboarding = b.onboardingEntry()!.inject!({} as never) as unknown as AwikiOnboardingInjected
    expect(onboarding.identity).toBe(b.identity)
    expect(onboarding.IdentityAccess).toBeTypeOf('function')
    await onboarding.clearLocalIdentity()
    expect(b.awikiClient.clearLocalIdentity).toHaveBeenCalledOnce()

    await b.fiber.dispose()
    expect(b.settingsEntry()).toBeUndefined()
    expect(b.onboardingEntry()).toBeUndefined()
    expect(disposeModels).toHaveBeenCalledOnce()
    expect(disposeAvailability).toHaveBeenCalledOnce()
    expect(b.identityUnsubscribe).toHaveBeenCalledOnce()
    expect(capabilitySignal?.aborted).toBe(true)
    expect(b.localeDisposers).toHaveLength(2)
    expect(b.localeDisposers.every(dispose => dispose.mock.calls.length === 1)).toBe(true)
    expect(b.remoteDisposers).toHaveLength(3)
    expect(b.remoteDisposers.every(dispose => dispose.mock.calls.length === 1)).toBe(true)
    b.disposeFrame()
  })

  it('rolls back the first slot and both controllers when later Browser setup fails', async () => {
    const disposeModels = vi.spyOn(AwikiModelProxyController.prototype, 'dispose')
    const disposeAvailability = vi.spyOn(ModelAvailabilityController.prototype, 'dispose')
    const identity = fakeIdentityController()
    const rpcCall = vi.fn(async (_channel: string, endpoint: string, _payload: unknown, _signal: AbortSignal) => {
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.capability) {
        return { ok: true as const, value: { available: true, protocol: 1 } }
      }
      throw new Error(`unexpected endpoint: ${endpoint}`)
    })
    const disposeSettings = vi.fn()
    const setupFailure = new Error('onboarding slot setup failed')
    const ctx = {
      get: vi.fn((name: string) => {
        if (name === 'connection') return {
          isLoopback: true,
          rpc: { call: rpcCall },
          api: {
            llm: { providers: vi.fn() },
            settings: { describe: vi.fn() },
            credentials: { describe: vi.fn() },
          },
        }
        if (name === 'awikiClient') {
          return {
            identity: identity.controller,
            IdentityAccess: (() => null),
            clearLocalIdentity: vi.fn(() => Promise.resolve()),
          }
        }
        return undefined
      }),
      locale: { register: vi.fn(() => vi.fn()), bind: vi.fn(() => () => '快速充值') },
      remote: { $on: vi.fn(() => vi.fn()) },
      on: vi.fn(() => vi.fn()),
      effect: vi.fn((register: () => unknown) => { register() }),
      slots: {
        inject: vi.fn()
          .mockReturnValueOnce(disposeSettings)
          .mockImplementationOnce(() => { throw setupFailure }),
      },
    }

    await expect(apply(ctx as never)).rejects.toThrow(setupFailure)

    expect(disposeSettings).toHaveBeenCalledOnce()
    expect(disposeModels).toHaveBeenCalledOnce()
    expect(disposeAvailability).toHaveBeenCalledOnce()
    expect(identity.unsubscribe).toHaveBeenCalledOnce()
    expect(rpcCall.mock.calls[0]?.[3].aborted).toBe(true)
  })

  it('does not leave partial settings behind when the AWiki browser bridge is missing', async () => {
    const ctx = {
      get: vi.fn((name: string) => name === 'connection' ? { isLoopback: true } : undefined),
    }

    await expect(apply(ctx as never)).rejects.toThrow('AWiki client bridge is unavailable')
  })
})
