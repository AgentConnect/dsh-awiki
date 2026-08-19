// @vitest-environment jsdom
import { Context, Service } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import type { AwikiInjected } from '../src/client/slots.ts'
import { apply, inject } from '../src/client/index.ts'
import type { createAwikiOverlayStore } from '../src/client/store.ts'
import {
  AWIKI_SETTINGS_RPC_CHANNEL,
  AWIKI_SETTINGS_RPC_ENDPOINTS,
  type AwikiSettingsRpcView,
} from '../src/settings-rpc-contract.ts'
import { fakeRemote, identity } from './helpers.client.ts'

function fakeSettingsTransport() {
  let view: AwikiSettingsRpcView = {
    value: { domain: 'awiki.ai' },
    base: { domain: 'awiki.ai' },
    revision: 0,
    writable: true,
  }
  const call = vi.fn(async (channel: string, endpoint: string, payload: unknown) => {
    if (channel !== AWIKI_SETTINGS_RPC_CHANNEL) throw new Error('unexpected channel')
    if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.describe) return { ok: true as const, value: view }
    const request = payload as { domain?: string; expectedRevision?: number }
    if (request.expectedRevision !== view.revision) {
      return {
        ok: false as const,
        error: {
          code: 'settings-conflict' as const,
          message: 'conflict',
          details: { ns: 'awiki', expected: request.expectedRevision ?? -1, actual: view.revision },
        },
      }
    }
    if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain && typeof request.domain === 'string') {
      view = { ...view, value: { domain: request.domain }, user: { domain: request.domain }, revision: view.revision + 1 }
      return { ok: true as const, value: view }
    }
    if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.resetDomain) {
      view = { ...view, value: { domain: 'awiki.ai' }, user: undefined, revision: view.revision + 1 }
      return { ok: true as const, value: view }
    }
    throw new Error('unexpected endpoint')
  })
  return { call }
}

/** Boot the browser plugin against a real slot registry and fake Remote. */
async function bench() {
  const ctx = new Context()
  const fake = fakeRemote({ config: { pollIntervalMs: 10, attachmentMaxBytes: 1024 } })
  const disposeRemote = vi.fn(async () => {})
  const mount = vi.fn(async (_contribution: unknown) => disposeRemote)
  class RemoteService extends Service {
    constructor(serviceCtx: Context) { super(serviceCtx, 'remote') }

    readonly $mount = mount
  }
  new RemoteService(ctx)
  const settingsTransport = fakeSettingsTransport()
  class ConnectionService extends Service {
    constructor(serviceCtx: Context) { super(serviceCtx, 'connection') }
    readonly isLoopback = true
    readonly hostDescription = { getSnapshot: () => undefined, subscribe: () => () => {} }
    readonly rpc = { call: settingsTransport.call }
  }
  class LocaleService extends Service {
    constructor(serviceCtx: Context) { super(serviceCtx, 'locale') }
    readonly register = vi.fn(() => () => {})
    readonly bind = vi.fn(() => (key: string) => key === 'nav' ? 'AWiki' : key)
  }
  new ConnectionService(ctx)
  new LocaleService(ctx)
  ctx.provide('remote.awiki', fake.remote)
  await ctx.plugin(SlotRegistry).await()
  const declareFrame = () => ctx.slots.register({
    name: 'root',
    children: {
      'shell.overlay': { kind: 'list', scope: 'root' },
      'settings.section': { kind: 'list', scope: 'root' },
      'settings.onboarding': { kind: 'list', scope: 'root' },
    },
  } as never, (() => null) as never)
  const disposeFrame = declareFrame()
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  const entry = () => ctx.slots.entries('shell.overlay').find(value => value.options.id === 'awiki')
  const settingsEntry = () => ctx.slots.entries('settings.section').find(value => value.options.id === 'awiki')
  const onboardingEntry = () => ctx.slots.entries('settings.onboarding').find(value => value.options.id === 'awiki-model-proxy')
  return { ctx, fake, fiber, entry, settingsEntry, onboardingEntry, settingsTransport, mount, disposeRemote, declareFrame, disposeFrame }
}

describe('ui-awiki browser plugin', () => {
  it('registers one ordered shell overlay with the generated Remote actions', async () => {
    const b = await bench()
    expect(inject).toEqual(['slots', 'remote', 'connection', 'locale'])
    expect(b.mount).toHaveBeenCalledOnce()
    expect(b.mount.mock.calls[0]?.[0]).toMatchObject({ package: '@awiki/dsh-plugin' })
    expect(b.entry()?.options).toMatchObject({ id: 'awiki', order: 20 })
    expect(b.settingsEntry()?.options).toMatchObject({ id: 'awiki', order: 30 })
    expect(b.onboardingEntry()?.options).toMatchObject({ id: 'awiki-model-proxy', order: -10 })
    expect(b.settingsEntry()?.options.label?.()).toBe('AWiki')

    const declaration = b.entry()!.store!
    const handle = (typeof declaration === 'function' ? declaration() : declaration) as ReturnType<typeof createAwikiOverlayStore>
    const instance = handle.create()
    const face = b.entry()!.inject!(instance.actions as never) as unknown as AwikiInjected
    instance.actions.open()
    expect(instance.getSnapshot().open).toBe(true)
    expect(face.hooks.awiki.getSnapshot().status).toBe('cold')
    expect(await face.open()).toEqual({ ok: true, value: undefined })
    await expect(face.sendRegistrationOtp({ handle: 'alice', phone: '13800000000' })).resolves.toMatchObject({ ok: true })
    await expect(face.registerIdentity({ handle: 'alice', phone: '13800000000', otp: '123456' })).resolves.toMatchObject({ ok: true })
    await expect(face.updateDisplayName('新昵称')).resolves.toMatchObject({ ok: true, value: { displayName: '新昵称' } })
    await expect(face.loadMoreConversations()).resolves.toEqual({ ok: true, value: undefined })
    await expect(face.startDirectChat('carol')).resolves.toEqual({ ok: true, value: undefined })
    await expect(face.selectConversation('c1' as never)).resolves.toEqual({ ok: true, value: undefined })
    await expect(face.loadOlderHistory()).resolves.toEqual({ ok: true, value: undefined })
    await expect(face.sendText('收到')).resolves.toEqual({ ok: true, value: undefined })
    await expect(face.sendAttachment({
      fileName: 'a.txt', mimeType: 'text/plain', bytesBase64: 'YWJj',
    })).resolves.toEqual({ ok: true, value: undefined })
    await expect(face.downloadAttachment('m1' as never, 'a1' as never)).resolves.toMatchObject({ ok: true })
    await expect(face.logout()).resolves.toMatchObject({ ok: true })
    expect(b.fake.calls.at(-1)).toEqual({
      method: 'logout',
      request: { confirmation: 'logout-awiki-session' },
    })
    expect(face.hooks.awiki.getSnapshot()).toMatchObject({ sessionStatus: 'signed-out', identity: null, conversations: [], messages: [] })
    await expect(face.login()).resolves.toMatchObject({ ok: true, value: { status: 'active', identity: { did: identity.did } } })
    expect(face.hooks.awiki.getSnapshot()).toMatchObject({ sessionStatus: 'active', identity: { did: identity.did } })
    face.close()

    const settingsFace = b.settingsEntry()!.inject!({} as never) as unknown as {
      saveDomain: (domain: string) => Promise<void>
      resetDomain: () => Promise<void>
      clearLocalData: () => Promise<void>
      models: { getSnapshot: () => unknown }
      hooks: { awikiSettings: unknown; awikiModelProxy: unknown }
    }
    expect(settingsFace.hooks.awikiSettings).toMatchObject({ getSnapshot: expect.any(Function) })
    expect(settingsFace.hooks.awikiModelProxy).toBe(settingsFace.models)
    expect(settingsFace.hooks.awikiSettings.getSnapshot()).toMatchObject({
      status: 'ready', mode: 'host', value: { domain: 'awiki.ai' }, writable: true,
    })
    await settingsFace.saveDomain('CUSTOM.EXAMPLE ')
    expect(b.settingsTransport.call).toHaveBeenCalledWith(
      AWIKI_SETTINGS_RPC_CHANNEL,
      AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain,
      { domain: 'custom.example', expectedRevision: 0 },
      expect.any(AbortSignal),
    )
    await settingsFace.resetDomain()
    expect(b.settingsTransport.call).toHaveBeenCalledWith(
      AWIKI_SETTINGS_RPC_CHANNEL,
      AWIKI_SETTINGS_RPC_ENDPOINTS.resetDomain,
      { expectedRevision: 1 },
      expect.any(AbortSignal),
    )
    await settingsFace.clearLocalData()
    expect(b.fake.calls.at(-1)).toEqual({
      method: 'clearLocalData',
      request: { confirmation: 'clear-awiki-local-data' },
    })
    expect(face.hooks.awiki.getSnapshot()).toMatchObject({ identity: null, conversations: [], messages: [] })

    const onboardingFace = b.onboardingEntry()!.inject!({} as never) as unknown as {
      identity: {
        getSnapshot: () => unknown
        registerIdentity: (request: { handle: string; phone: string; otp: string }) => Promise<unknown>
      }
      models: { getSnapshot: () => unknown }
      hooks: { awikiOnboarding: unknown; awikiModelProxy: unknown }
    }
    expect(onboardingFace.hooks.awikiOnboarding).toBe(onboardingFace.identity)
    expect(onboardingFace.identity).toBe(face.hooks.awiki)
    expect(onboardingFace.hooks.awikiModelProxy).toBe(onboardingFace.models)
    await onboardingFace.identity.registerIdentity({ handle: 'alice', phone: '13800000000', otp: '123456' })
    expect(face.hooks.awiki.getSnapshot()).toMatchObject({
      sessionStatus: 'active', identity: { did: identity.did },
    })
  })

  it('keeps the authoritative AWiki state source across frame redeclaration', async () => {
    const b = await bench()
    const firstDeclaration = b.entry()!.store!
    const firstHandle = (typeof firstDeclaration === 'function' ? firstDeclaration() : firstDeclaration) as ReturnType<typeof createAwikiOverlayStore>
    const firstInstance = firstHandle.create()
    const firstFace = b.entry()!.inject!(firstInstance.actions as never) as unknown as AwikiInjected

    b.disposeFrame()
    expect(b.entry()).toBeUndefined()
    await expect(firstFace.open()).resolves.toEqual({ ok: true, value: undefined })

    const disposeSecondFrame = b.declareFrame()
    const secondDeclaration = b.entry()!.store!
    const secondHandle = (typeof secondDeclaration === 'function' ? secondDeclaration() : secondDeclaration) as ReturnType<typeof createAwikiOverlayStore>
    const secondInstance = secondHandle.create()
    const secondFace = b.entry()!.inject!(secondInstance.actions as never) as unknown as AwikiInjected
    expect(secondFace.hooks.awiki).toBe(firstFace.hooks.awiki)
    await expect(secondFace.open()).resolves.toEqual({ ok: true, value: undefined })
    disposeSecondFrame()
    await b.fiber.dispose()
    await expect(firstFace.open()).resolves.toEqual({ ok: false, error: 'AWiki 插件已卸载' })
  })

  it('rolls back its Remote contribution when slot injection setup fails', async () => {
    const disposeRemote = vi.fn(async () => {})
    const failure = new Error('slot setup failed')
    const ctx = {
      remote: { $mount: vi.fn(async () => disposeRemote) },
      get: vi.fn(() => ({})),
      locale: { register: vi.fn(() => () => {}), bind: vi.fn(() => () => 'AWiki') },
      effect: vi.fn((callback: () => unknown) => callback()),
      slots: { inject: vi.fn(() => { throw failure }) },
    }

    await expect(apply(ctx as never)).rejects.toBe(failure)
    expect(disposeRemote).toHaveBeenCalledOnce()
  })

  it('rolls back when its mounted Remote namespace is missing', async () => {
    const disposeRemote = vi.fn(async () => {})
    const ctx = {
      remote: { $mount: vi.fn(async () => disposeRemote) },
      get: vi.fn(() => undefined),
    }

    await expect(apply(ctx as never)).rejects.toThrow('mounted Remote namespace is unavailable')
    expect(disposeRemote).toHaveBeenCalledOnce()
  })

  it('withdraws the entry and stops polling when the plugin fiber unloads', async () => {
    vi.useFakeTimers()
    const b = await bench()
    const declaration = b.entry()!.store!
    const handle = (typeof declaration === 'function' ? declaration() : declaration) as ReturnType<typeof createAwikiOverlayStore>
    const instance = handle.create()
    const face = b.entry()!.inject!(instance.actions as never) as unknown as AwikiInjected
    await face.open()
    await vi.advanceTimersByTimeAsync(10)
    const before = b.fake.calls.length

    await b.fiber.dispose()
    expect(b.entry()).toBeUndefined()
    expect(b.disposeRemote).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(30)
    expect(b.fake.calls).toHaveLength(before)
    vi.useRealTimers()
  })
})
