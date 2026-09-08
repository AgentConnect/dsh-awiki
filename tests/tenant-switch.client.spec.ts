import { afterEach, describe, expect, it, vi } from 'vitest'
import { AwikiController, type AwikiRemote } from '../src/client/controller.ts'
import { direct, fakeRemote, identity, message, carried, success } from './helpers.client.ts'

afterEach(() => vi.useRealTimers())

function bench() {
  const china = fakeRemote({ conversations: [direct], history: [message] })
  const global = fakeRemote({ identity: null, conversations: [] })
  let active = china
  const controller = new AwikiController(new Proxy({} as AwikiRemote, {
    get: (_target, key) => Reflect.get(active.remote, key),
  }))
  return { controller, china, global, setActive: (value: typeof china) => { active = value } }
}

describe('tenant view continuity', () => {
  it('does not revive polling when closed during the target session reload', async () => {
    vi.useFakeTimers()
    const { controller, global, setActive } = bench()
    let release!: () => void
    global.remote.getSession = () => new Promise(resolve => {
      release = () => resolve({ ok: true, value: success({ status: 'unregistered', identity: null }) })
    })
    try {
      await controller.open()
      const switching = controller.switchTenant(async () => { setActive(global) })
      await vi.waitFor(() => expect(release).toBeTypeOf('function'))
      controller.close()
      release()
      await switching
      expect(vi.getTimerCount()).toBe(0)
    } finally { controller.dispose() }
  })

  it('keeps two registered tenants with different conversations isolated on return', async () => {
    const { controller, china, setActive } = bench()
    const foreignIdentity = { ...identity, did: 'did:wba:awiki.ai:alice' as typeof identity.did }
    const foreignChat = { ...direct, id: 'foreign-chat' as typeof direct.id }
    const foreign = fakeRemote({ identity: foreignIdentity, conversations: [foreignChat] })
    try {
      await controller.open()
      await controller.switchTenant(async () => { setActive(foreign) })
      expect(controller.getSnapshot()).toMatchObject({ identity: foreignIdentity, conversations: [foreignChat], messages: [] })
      await controller.switchTenant(async () => { setActive(china) })
      expect(controller.getSnapshot()).toMatchObject({ identity, conversations: [direct], messages: [] })
    } finally { controller.dispose() }
  })

  it('evicts only the exact cleared owners, including while signed out', async () => {
    const china = fakeRemote({ sessionStatus: 'signed-out' })
    china.remote.clearLocalData = () => carried(success({ cleared: true, clearedIdentityDids: [identity.did] }))
    const cache = { read: vi.fn(async () => undefined), write: vi.fn(async () => {}), clear: vi.fn(async () => {}) }
    const controller = new AwikiController(china.remote, cache)
    try {
      await controller.loadSession()
      await controller.clearLocalData({ confirmation: 'clear-awiki-local-data' })
      expect(cache.clear).toHaveBeenCalledExactlyOnceWith(identity.did)
    } finally { controller.dispose() }
  })
  it('restores identity, conversations, history and polling after China/Global/China without reopening', async () => {
    vi.useFakeTimers()
    const { controller, china, global, setActive } = bench()
    try {
      await controller.open()
      await controller.selectConversation(direct.id)
      expect(controller.getSnapshot().messages).toEqual([message])
      await controller.switchTenant(async () => { setActive(global) })
      expect(controller.getSnapshot()).toMatchObject({ sessionStatus: 'unregistered', conversations: [], messages: [] })
      await controller.switchTenant(async () => { setActive(china) })
      expect(controller.getSnapshot()).toMatchObject({ identity, conversations: [direct] })
      await controller.selectConversation(direct.id)
      expect(controller.getSnapshot().messages).toEqual([message])
      const listCalls = china.calls.filter(call => call.method === 'listConversations').length
      await vi.advanceTimersByTimeAsync(1_000)
      expect(china.calls.filter(call => call.method === 'listConversations').length).toBeGreaterThan(listCalls)
      expect([...china.calls, ...global.calls].some(call => call.method === 'clearLocalData')).toBe(false)
    } finally { controller.dispose() }
  })

  it('restores the previous view and polling when the Host rolls back a failed switch', async () => {
    vi.useFakeTimers()
    const { controller } = bench()
    try {
      await controller.open()
      await expect(controller.switchTenant(async () => { throw new Error('target unavailable') })).rejects.toThrow('target unavailable')
      expect(controller.getSnapshot()).toMatchObject({ identity, conversations: [direct], status: 'ready' })
      expect(vi.getTimerCount()).toBe(1)
    } finally { controller.dispose() }
  })

  it('fences old requests immediately and does not restart polling after the drawer closes', async () => {
    vi.useFakeTimers()
    const { controller, china, global, setActive } = bench()
    let release!: () => void
    try {
      await controller.open()
      const pending = controller.switchTenant(() => new Promise<void>(resolve => { release = () => { setActive(global); resolve() } }))
      expect(controller.getSnapshot()).toMatchObject({ identity: null, conversations: [], status: 'loading' })
      await expect(controller.switchTenant(async () => {})).rejects.toThrow('正在切换')
      controller.close()
      release()
      await pending
      expect(vi.getTimerCount()).toBe(0)
      expect(global.calls.some(call => call.method === 'listConversations')).toBe(false)
      setActive(china)
      await controller.open()
      expect(controller.getSnapshot().conversations).toEqual([direct])
    } finally { controller.dispose() }
  })

  it('does not report success when loading the committed tenant fails', async () => {
    const { controller, global, setActive } = bench()
    global.remote.getSession = () => carried({ ok: false, error: { code: 'remote', message: 'unavailable' } })
    try {
      await expect(controller.switchTenant(async () => { setActive(global) })).rejects.toThrow()
      expect(controller.getSnapshot().status).toBe('error')
      expect(controller.getSnapshot().identity).toBeNull()
    } finally { controller.dispose() }
  })

  it('discards a delayed old-tenant session after the switch starts', async () => {
    const { controller, china, global, setActive } = bench()
    let release!: () => void
    china.remote.getSession = () => new Promise(resolve => {
      release = () => resolve({ ok: true, value: success({ status: 'active', identity }) })
    })
    try {
      const loading = controller.loadSession()
      await vi.waitFor(() => expect(release).toBeTypeOf('function'))
      await controller.switchTenant(async () => { setActive(global) })
      release()
      await loading
      expect(controller.getSnapshot()).toMatchObject({ identity: null, sessionStatus: 'unregistered', conversations: [] })
    } finally { controller.dispose() }
  })
})
