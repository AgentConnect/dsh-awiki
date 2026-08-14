// @vitest-environment jsdom
import { Context, Service } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import type { AwikiInjected } from '../src/client/slots.ts'
import { apply, inject } from '../src/client/index.ts'
import type { createAwikiOverlayStore } from '../src/client/store.ts'
import { fakeRemote } from './helpers.client.ts'

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
  ctx.provide('remote.awiki', fake.remote)
  await ctx.plugin(SlotRegistry).await()
  const declareFrame = () => ctx.slots.register({
    name: 'root',
    children: { 'shell.overlay': { kind: 'list', scope: 'root' } },
  } as never, (() => null) as never)
  const disposeFrame = declareFrame()
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  const entry = () => ctx.slots.entries('shell.overlay').find(value => value.options.id === 'awiki')
  return { ctx, fake, fiber, entry, mount, disposeRemote, declareFrame, disposeFrame }
}

describe('ui-awiki browser plugin', () => {
  it('registers one ordered shell overlay with the generated Remote actions', async () => {
    const b = await bench()
    expect(inject).toEqual(['slots', 'remote'])
    expect(b.mount).toHaveBeenCalledOnce()
    expect(b.mount.mock.calls[0]?.[0]).toMatchObject({ package: 'dsh-awiki' })
    expect(b.entry()?.options).toMatchObject({ id: 'awiki', order: 20 })

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
    face.close()
  })

  it('recreates a live controller when the owning frame is redeclared', async () => {
    const b = await bench()
    const firstDeclaration = b.entry()!.store!
    const firstHandle = (typeof firstDeclaration === 'function' ? firstDeclaration() : firstDeclaration) as ReturnType<typeof createAwikiOverlayStore>
    const firstInstance = firstHandle.create()
    const firstFace = b.entry()!.inject!(firstInstance.actions as never) as unknown as AwikiInjected

    b.disposeFrame()
    expect(b.entry()).toBeUndefined()
    await expect(firstFace.open()).resolves.toEqual({ ok: false, error: 'AWiki 插件已卸载' })

    const disposeSecondFrame = b.declareFrame()
    const secondDeclaration = b.entry()!.store!
    const secondHandle = (typeof secondDeclaration === 'function' ? secondDeclaration() : secondDeclaration) as ReturnType<typeof createAwikiOverlayStore>
    const secondInstance = secondHandle.create()
    const secondFace = b.entry()!.inject!(secondInstance.actions as never) as unknown as AwikiInjected
    await expect(secondFace.open()).resolves.toEqual({ ok: true, value: undefined })
    disposeSecondFrame()
  })

  it('rolls back its Remote contribution when slot injection setup fails', async () => {
    const disposeRemote = vi.fn(async () => {})
    const failure = new Error('slot setup failed')
    const ctx = {
      remote: { $mount: vi.fn(async () => disposeRemote) },
      get: vi.fn(() => ({})),
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
