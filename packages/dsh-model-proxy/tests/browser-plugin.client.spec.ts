// @vitest-environment jsdom
import { Context, Service } from '@deepseek-ai/cordis'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { describe, expect, it, vi } from 'vitest'
import {
  AWIKI_MODEL_PROXY_RPC_CHANNEL,
  AWIKI_MODEL_PROXY_RPC_ENDPOINTS,
} from '../../../src/model-proxy-contract.ts'
import type { AwikiView } from '../../../src/client/controller.ts'
import { apply, inject } from '../src/client/index.ts'
import type { ModelProxySettingsInjected } from '../src/client/ModelProxySettingsSection.tsx'
import type { AwikiOnboardingInjected } from '../src/client/AwikiOnboarding.tsx'
import { identity as registeredIdentity } from '../../../tests/helpers.client.ts'

const identityView: AwikiView = {
  status: 'ready', sessionStatus: 'active', identity: registeredIdentity,
  profile: null, conversations: [], conversationsHasMore: false, selectedConversationId: null,
  selectedGroup: null, groupAccess: null, groupMembers: [], groupMembersHasMore: false, groupRecovery: null,
  messages: [], historyHasMore: false, localPending: false, refreshing: false, pending: null, error: null,
  attachmentMaxBytes: 1024, summaries: {}, recoveryOperationId: null, recoveryProgress: null,
}

function fakeIdentityController() {
  return {
    getSnapshot: () => identityView,
    subscribe: vi.fn(() => () => {}),
    loadSession: vi.fn(() => Promise.resolve()),
  }
}

async function bench() {
  const ctx = new Context()
  const rpcCall = vi.fn(async (channel: string, endpoint: string) => {
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
    readonly register = vi.fn(() => () => {})
    readonly bind = vi.fn(() => (key: string) => key === 'nav' ? '快速充值' : key)
  }
  class RemoteService extends Service {
    constructor(serviceCtx: Context) { super(serviceCtx, 'remote') }
    readonly $on = vi.fn(() => () => {})
  }
  const identityController = fakeIdentityController()
  const identityComponent = (() => null) as never
  class AwikiClientService extends Service {
    constructor(serviceCtx: Context) { super(serviceCtx, 'awikiClient') }
    readonly identity = identityController
    readonly IdentityAccess = identityComponent
    readonly clearLocalIdentity = vi.fn(() => Promise.resolve({ ok: true as const, value: undefined }))
  }
  new ConnectionService(ctx)
  new LocaleService(ctx)
  new RemoteService(ctx)
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
  return { ctx, fiber, settingsEntry, onboardingEntry, identity: identityController, IdentityAccess: identityComponent, awikiClient, rpcCall, disposeFrame }
}

describe('Model Proxy browser plugin', () => {
  it('owns Quick Recharge settings, both model tabs, and onboarding for its full lifecycle', async () => {
    const b = await bench()

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
    b.disposeFrame()
  })

  it('does not leave partial settings behind when the AWiki browser bridge is missing', async () => {
    const ctx = {
      get: vi.fn((name: string) => name === 'connection' ? { isLoopback: true } : undefined),
    }

    await expect(apply(ctx as never)).rejects.toThrow('AWiki client bridge is unavailable')
  })
})
