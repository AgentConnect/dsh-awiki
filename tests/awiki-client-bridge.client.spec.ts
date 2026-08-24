import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AwikiClientBridge } from '../src/client/awiki-client-bridge.ts'
import { AwikiController } from '../src/client/controller.ts'
import { fakeRemote } from './helpers.client.ts'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AwikiClientBridge companion messaging', () => {
  it('opens the bound overlay and starts a direct chat with the requested handle', async () => {
    const fake = fakeRemote()
    const controller = new AwikiController(fake.remote)
    await controller.open()
    const bridge = new AwikiClientBridge(new Context(), controller)
    const show = vi.fn()
    const unbind = bridge.bindOverlayPresenter(show)

    await expect(bridge.openDirectChat('carol')).resolves.toEqual({ ok: true, value: undefined })
    expect(show).toHaveBeenCalledOnce()
    expect(controller.getSnapshot().selectedConversationId).toBe('c-carol')

    unbind()
    await expect(bridge.openDirectChat('carol')).resolves.toEqual({
      ok: false,
      error: 'AWiki 消息界面暂不可用',
    })
  })

  it('still opens the overlay when no identity is registered', async () => {
    const fake = fakeRemote({ identity: null })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    const bridge = new AwikiClientBridge(new Context(), controller)
    const show = vi.fn()
    bridge.bindOverlayPresenter(show)

    await expect(bridge.openDirectChat('cgw.awiki.ai')).resolves.toEqual({ ok: true, value: undefined })
    expect(show).toHaveBeenCalledOnce()
    expect(controller.getSnapshot().selectedConversationId).toBeNull()
    expect(fake.calls.some(call => call.method === 'resolvePeer')).toBe(false)
  })

  it('replaces a previous overlay presenter and ignores stale unbind', async () => {
    const fake = fakeRemote()
    const controller = new AwikiController(fake.remote)
    await controller.open()
    const bridge = new AwikiClientBridge(new Context(), controller)
    const first = vi.fn()
    const second = vi.fn()
    const unbindFirst = bridge.bindOverlayPresenter(first)
    const unbindSecond = bridge.bindOverlayPresenter(second)
    unbindFirst()

    await expect(bridge.openDirectChat('carol')).resolves.toEqual({ ok: true, value: undefined })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
    unbindSecond()
  })
})
