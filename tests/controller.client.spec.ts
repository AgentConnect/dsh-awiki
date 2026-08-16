import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  AwikiConversation, AwikiConversationId, AwikiCursor, AwikiHandle, AwikiMessageId, AwikiPage,
} from 'dsh-awiki/types'
import { AwikiController } from '../src/client/controller.ts'
import { carried, direct, fakeRemote, group, identity, message, success } from './helpers.client.ts'

function deferred<Value>() {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((settle) => { resolve = settle })
  return { promise, resolve }
}

afterEach(() => { vi.useRealTimers() })

describe('AwikiController', () => {
  it('loads config, identity, conversations and polls only while open', async () => {
    vi.useFakeTimers()
    const fake = fakeRemote({ config: { pollIntervalMs: 25, attachmentMaxBytes: 1024 } })
    const controller = new AwikiController(fake.remote)

    expect(await controller.open()).toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot()).toMatchObject({ status: 'ready', identity, conversations: [direct] })
    await vi.advanceTimersByTimeAsync(25)
    expect(fake.calls.filter(call => call.method === 'listConversations')).toHaveLength(2)

    controller.close()
    await vi.advanceTimersByTimeAsync(50)
    expect(fake.calls.filter(call => call.method === 'listConversations')).toHaveLength(2)
  })

  it('publishes stable snapshots only to current subscribers', async () => {
    const controller = new AwikiController(fakeRemote({ identity: null }).remote)
    const listener = vi.fn()
    const unsubscribe = controller.subscribe(listener)
    const cold = controller.getSnapshot()
    expect(controller.getSnapshot()).toBe(cold)

    await controller.open()
    expect(listener).toHaveBeenCalled()
    const calls = listener.mock.calls.length
    unsubscribe()
    await controller.selectConversation(null)
    expect(listener).toHaveBeenCalledTimes(calls)
  })

  it('registers through OTP and then loads conversations', async () => {
    const fake = fakeRemote({ identity: null })
    const controller = new AwikiController(fake.remote)
    await controller.open()

    expect(await controller.sendRegistrationOtp({ handle: 'alice', phone: '13800000000' })).toMatchObject({ ok: true })
    expect(await controller.registerIdentity({ handle: 'alice', phone: '13800000000', otp: '123456' })).toEqual({ ok: true, value: identity })
    expect(controller.getSnapshot().identity).toEqual(identity)
  })

  it('validates and publishes an updated display name', async () => {
    const fake = fakeRemote()
    const controller = new AwikiController(fake.remote)
    await controller.open()

    await expect(controller.updateDisplayName('  新昵称  ')).resolves.toMatchObject({
      ok: true,
      value: { displayName: '新昵称' },
    })
    expect(fake.calls.find(call => call.method === 'updateDisplayName')?.request).toEqual({ displayName: '新昵称' })
    expect(controller.getSnapshot().identity?.displayName).toBe('新昵称')

    await expect(controller.updateDisplayName('   ')).resolves.toEqual({ ok: false, error: '请输入昵称' })
    await expect(controller.updateDisplayName('名'.repeat(51))).resolves.toEqual({ ok: false, error: '昵称不能超过 50 个字符' })
    expect(fake.calls.filter(call => call.method === 'updateDisplayName')).toHaveLength(1)
  })

  it('surfaces registration failures and refuses operations after disposal', async () => {
    const fake = fakeRemote({ identity: null })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    fake.remote.sendRegistrationOtp = () => carried({
      ok: false,
      error: { code: 'rate-limited', message: '稍后重试' },
    })
    await expect(controller.sendRegistrationOtp({ handle: 'alice', phone: '13800000000' })).resolves.toEqual({
      ok: false,
      error: '验证码发送过于频繁，请等待限流解除后再重新获取。',
    })
    fake.remote.registerIdentity = () => carried({
      ok: false,
      error: { code: 'invalid-otp', message: '验证码错误' },
    })
    await expect(controller.registerIdentity({ handle: 'alice', phone: '13800000000', otp: 'bad' })).resolves.toEqual({
      ok: false,
      error: '验证码不正确，请检查后重试。',
    })

    controller.dispose()
    await expect(controller.sendRegistrationOtp({ handle: 'alice', phone: '13800000000' })).resolves.toEqual({
      ok: false,
      error: 'AWiki 插件已卸载',
    })
    await expect(controller.downloadAttachment('m1' as never, 'a1' as never)).resolves.toEqual({
      ok: false,
      error: 'AWiki 插件已卸载',
    })
  })

  it('explains registration conflicts without exposing remote details', async () => {
    const fake = fakeRemote({ identity: null })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    fake.remote.registerIdentity = () => carried({
      ok: false,
      error: { code: 'conflict', message: 'private remote detail: test-access-token' },
    })

    const expected = '注册冲突：服务端可能已收到上次注册请求，或该手机号 / Handle 已绑定其他身份。请保留当前页面并再次提交；若仍失败，请勿清除本机身份数据，联系管理员并提供失败时间。'
    await expect(controller.registerIdentity({
      handle: 'alice',
      phone: '13800000000',
      otp: '123456',
    })).resolves.toEqual({ ok: false, error: expected })
    expect(controller.getSnapshot().error).toBe(expected)
    expect(controller.getSnapshot().error).not.toContain('test-access-token')
  })

  it('turns registration availability and verification failures into next actions', async () => {
    const fake = fakeRemote({ identity: null })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    fake.remote.registerIdentity = () => carried({
      ok: false,
      error: { code: 'forbidden', message: 'The AWiki operation is not permitted.' },
    })

    await expect(controller.registerIdentity({
      handle: 'alice',
      phone: '13800000000',
      otp: '123456',
    })).resolves.toEqual({
      ok: false,
      error: '当前 AWiki 服务未开放公开注册，或该手机号不在注册白名单。请使用已获准的手机号，或联系管理员开通注册权限。',
    })

    fake.remote.registerIdentity = () => carried({
      ok: false,
      error: { code: 'challenge-expired', message: 'The AWiki verification challenge expired.' },
    })
    await expect(controller.registerIdentity({
      handle: 'alice',
      phone: '13800000000',
      otp: '123456',
    })).resolves.toEqual({
      ok: false,
      error: '验证码状态已失效，请重新获取验证码后再注册。',
    })

    fake.remote.registerIdentity = () => carried({
      ok: false,
      error: { code: 'handle-unavailable', message: 'untrusted remote detail' },
    })
    await expect(controller.registerIdentity({
      handle: 'alice',
      phone: '13800000000',
      otp: '123456',
    })).resolves.toEqual({
      ok: false,
      error: '该 Handle 已存在，无法重复注册。请更换一个未使用的 Handle，并重新获取验证码。',
    })
  })

  it('does not publish or start follow-up reads after the drawer closes', async () => {
    const fake = fakeRemote({ identity: null })
    let completeRegistration: ((value: Awaited<ReturnType<typeof fake.remote.registerIdentity>>) => void) | undefined
    fake.remote.registerIdentity = () => new Promise((resolve) => { completeRegistration = resolve })
    const controller = new AwikiController(fake.remote)
    await controller.open()

    const registration = controller.registerIdentity({ handle: 'alice', phone: '13800000000', otp: '123456' })
    controller.close()
    completeRegistration?.({ ok: true, value: { ok: true, value: identity } })
    await expect(registration).resolves.toEqual({ ok: true, value: identity })
    expect(controller.getSnapshot().identity).toBeNull()
    expect(fake.calls.filter(call => call.method === 'listConversations')).toHaveLength(0)
  })

  it('invalidates config, identity, and roster reads closed while opening', async () => {
    const configFake = fakeRemote()
    const config = deferred<Awaited<ReturnType<typeof configFake.remote.getConfig>>>()
    configFake.remote.getConfig = () => config.promise
    const configController = new AwikiController(configFake.remote)
    const configOpen = configController.open()
    configController.close()
    config.resolve({ ok: true, value: success({ pollIntervalMs: 25, attachmentMaxBytes: 1024 }) })
    await expect(configOpen).resolves.toEqual({ ok: true, value: undefined })
    expect(configFake.calls).toHaveLength(0)

    const identityFake = fakeRemote()
    const identityRead = deferred<Awaited<ReturnType<typeof identityFake.remote.getIdentity>>>()
    identityFake.remote.getIdentity = () => identityRead.promise
    const identityController = new AwikiController(identityFake.remote)
    const identityOpen = identityController.open()
    await Promise.resolve()
    identityController.close()
    identityRead.resolve({ ok: true, value: success(identity) })
    await expect(identityOpen).resolves.toEqual({ ok: true, value: undefined })
    expect(identityFake.calls.filter(call => call.method === 'listConversations')).toHaveLength(0)

    const rosterFake = fakeRemote()
    const rosterRead = deferred<Awaited<ReturnType<typeof rosterFake.remote.listConversations>>>()
    rosterFake.remote.listConversations = () => rosterRead.promise
    const rosterController = new AwikiController(rosterFake.remote)
    const rosterOpen = rosterController.open()
    await Promise.resolve()
    await Promise.resolve()
    rosterController.close()
    rosterRead.resolve({ ok: true, value: success({ items: [direct], hasMore: false }) })
    await expect(rosterOpen).resolves.toEqual({ ok: true, value: undefined })
    expect(rosterController.getSnapshot().conversations).toEqual([])

    const timerFake = fakeRemote()
    const timerController = new AwikiController(timerFake.remote)
    const stopBeforeTimer = timerController.subscribe((() => {
      if (timerController.getSnapshot().conversations.length > 0) timerController.close()
    }))
    await expect(timerController.open()).resolves.toEqual({ ok: true, value: undefined })
    stopBeforeTimer()
  })

  it('reports thrown values and roster failures without leaking rejects', async () => {
    const errorFake = fakeRemote()
    errorFake.remote.getConfig = () => Promise.reject(new Error('boom'))
    await expect(new AwikiController(errorFake.remote).open()).resolves.toEqual({
      ok: false,
      error: 'AWiki 调用失败：boom',
    })

    const unknownFake = fakeRemote()
    // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- a wire dependency may reject an unknown value.
    unknownFake.remote.getConfig = () => Promise.reject('boom')
    await expect(new AwikiController(unknownFake.remote).open()).resolves.toEqual({
      ok: false,
      error: 'AWiki 调用失败',
    })

    const rosterFake = fakeRemote()
    rosterFake.remote.listConversations = () => carried({
      ok: false,
      error: { code: 'network', message: '列表不可用' },
    })
    const rosterController = new AwikiController(rosterFake.remote)
    await expect(rosterController.open()).resolves.toEqual({ ok: false, error: 'network：列表不可用' })
  })

  it('paginates conversations with an opaque cursor and removes duplicates', async () => {
    const fake = fakeRemote()
    const pages: AwikiPage<AwikiConversation>[] = [
      { items: [direct], hasMore: true, nextCursor: 'page-2' as AwikiCursor },
      { items: [direct, group], hasMore: true },
    ]
    fake.remote.listConversations = (request) => {
      fake.calls.push({ method: 'listConversations', request })
      return carried(success(pages.shift()!))
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()
    expect(controller.getSnapshot().conversationsHasMore).toBe(true)

    await controller.loadMoreConversations()
    expect(fake.calls.at(-1)?.request).toEqual({ cursor: 'page-2' })
    expect(controller.getSnapshot().conversations).toEqual([direct, group])
    expect(controller.getSnapshot().conversationsHasMore).toBe(false)
  })

  it('handles failed and closed conversation pagination', async () => {
    const fake = fakeRemote()
    const controller = new AwikiController(fake.remote)
    await controller.open()
    fake.remote.listConversations = () => carried({
      ok: false,
      error: { code: 'network', message: '翻页失败' },
    })
    await expect(controller.loadMoreConversations()).resolves.toEqual({ ok: false, error: 'network：翻页失败' })

    const page = deferred<Awaited<ReturnType<typeof fake.remote.listConversations>>>()
    fake.remote.listConversations = () => page.promise
    const loading = controller.loadMoreConversations()
    controller.close()
    page.resolve({ ok: true, value: success({ items: [group], hasMore: false }) })
    await expect(loading).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().conversations).toEqual([direct])
  })

  it('resolves a Handle before opening a new direct chat', async () => {
    const fake = fakeRemote()
    const controller = new AwikiController(fake.remote)
    await controller.open()
    expect(await controller.startDirectChat('  @carol  ')).toEqual({ ok: true, value: undefined })
    expect(fake.calls.find(call => call.method === 'resolvePeer')?.request).toEqual({ peer: 'carol' })
    expect(controller.getSnapshot().selectedConversationId).toBe('c-carol')
    expect(controller.getSnapshot().conversations[0]).toMatchObject({
      kind: 'direct',
      id: 'c-carol',
      peerDid: 'did:wba:carol',
      displayName: 'Carol',
      title: 'Carol',
    })
    expect(await controller.sendText('你好 carol')).toEqual({ ok: true, value: undefined })
    expect(fake.calls.find(call => call.method === 'sendText')?.request).toMatchObject({
      target: { kind: 'direct', peer: 'did:wba:carol' },
      text: '你好 carol',
    })
  })

  it('reuses an existing direct conversation and rejects empty or self Handles', async () => {
    const fake = fakeRemote()
    const controller = new AwikiController(fake.remote)
    await controller.open()
    expect(await controller.startDirectChat('bob')).toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().selectedConversationId).toBe(direct.id)
    expect(await controller.startDirectChat('')).toEqual({ ok: false, error: '请输入 Handle' })
    expect(await controller.startDirectChat('alice')).toEqual({ ok: false, error: '不能向自己发起私聊' })
    expect(await controller.startDirectChat('alice.awiki.info')).toEqual({ ok: false, error: '不能向自己发起私聊' })
    expect(await controller.startDirectChat('missing-user')).toEqual({ ok: false, error: '该 Handle 不存在' })
    expect(await controller.startDirectChat('did:wba:bob')).toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().selectedConversationId).toBe(direct.id)

    const titled = new AwikiController(fakeRemote({
      conversations: [{ kind: 'direct', id: 'c-title' as AwikiConversationId, peerDid: 'did:wba:erin' as never, title: 'erin' }],
    }).remote)
    await titled.open()
    expect(await titled.startDirectChat('erin')).toEqual({ ok: true, value: undefined })
    expect(titled.getSnapshot().selectedConversationId).toBe('c-title')

    const domain = new AwikiController(fakeRemote({
      identity: { ...identity, handle: 'alice.awiki.info' as AwikiHandle },
    }).remote)
    await domain.open()
    expect(await domain.startDirectChat('alice')).toEqual({ ok: false, error: '不能向自己发起私聊' })

    const unregistered = new AwikiController(fakeRemote({ identity: null }).remote)
    await unregistered.open()
    expect(await unregistered.startDirectChat('carol')).toEqual({ ok: false, error: '请先注册 AWiki 身份' })
    unregistered.dispose()
    expect(await unregistered.startDirectChat('carol')).toEqual({ ok: false, error: 'AWiki 插件已卸载' })
  })

  it('opens the resolved conversation when the roster already contains it', async () => {
    const fake = fakeRemote()
    fake.remote.resolvePeer = (request) => {
      fake.calls.push({ method: 'resolvePeer', request })
      return carried(success({
        did: 'did:wba:bob' as never,
        handle: 'bob' as never,
        conversationId: direct.id,
      }))
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()
    expect(await controller.startDirectChat('carol')).toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().selectedConversationId).toBe(direct.id)
  })

  it('rejects a Handle that resolves to the local identity and surfaces other lookup failures', async () => {
    const fake = fakeRemote()
    fake.remote.resolvePeer = (request) => {
      fake.calls.push({ method: 'resolvePeer', request })
      return carried(success({
        did: identity.did,
        handle: identity.handle,
        conversationId: 'c-self' as AwikiConversationId,
      }))
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()
    expect(await controller.startDirectChat('carol')).toEqual({ ok: false, error: '不能向自己发起私聊' })

    fake.remote.resolvePeer = () => carried({
      ok: false,
      error: { code: 'network', message: 'lookup failed' },
    })
    expect(await controller.startDirectChat('erin')).toEqual({ ok: false, error: 'network：lookup failed' })
  })

  it('does not open a chat after the drawer closes during lookup', async () => {
    const fake = fakeRemote()
    const controller = new AwikiController(fake.remote)
    await controller.open()
    const lookup = deferred<Awaited<ReturnType<typeof fake.remote.resolvePeer>>>()
    fake.remote.resolvePeer = () => lookup.promise
    const starting = controller.startDirectChat('carol')
    controller.close()
    lookup.resolve({ ok: true, value: success({
      did: 'did:wba:carol' as never,
      handle: 'carol' as never,
      conversationId: 'c-carol' as AwikiConversationId,
    }) })
    await expect(starting).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().selectedConversationId).toBeNull()
  })

  it('opens a DID-only peer and ignores a lookup that finishes after close during roster refresh', async () => {
    const fake = fakeRemote()
    fake.remote.resolvePeer = (request) => {
      fake.calls.push({ method: 'resolvePeer', request })
      return carried(success({
        did: 'did:wba:erin' as never,
        conversationId: 'c-erin' as AwikiConversationId,
      }))
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()
    expect(await controller.startDirectChat('did:wba:erin')).toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().conversations[0]).toMatchObject({
      id: 'c-erin',
      peerDid: 'did:wba:erin',
      title: 'did:wba:erin',
    })

    const page = deferred<Awaited<ReturnType<typeof fake.remote.listConversations>>>()
    let listed = false
    fake.remote.listConversations = () => {
      listed = true
      return page.promise
    }
    const starting = controller.startDirectChat('frank')
    while (!listed) await Promise.resolve()
    controller.close()
    page.resolve({ ok: true, value: success({ items: [direct], hasMore: false }) })
    await expect(starting).resolves.toEqual({ ok: true, value: undefined })
  })

  it('loads history and sends text and one attachment to the selected target', async () => {
    const unread = { ...direct, unreadCount: 3 }
    const fake = fakeRemote({ conversations: [unread] })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)

    expect(controller.getSnapshot().messages).toHaveLength(1)
    expect(controller.getSnapshot().conversations[0]?.unreadCount).toBe(0)
    expect(fake.calls.find(call => call.method === 'markConversationRead')?.request)
      .toEqual({ conversationId: direct.id })
    expect(await controller.sendText('收到')).toEqual({ ok: true, value: undefined })
    expect(await controller.sendAttachment({ fileName: 'a.txt', mimeType: 'text/plain', bytesBase64: 'YWJj' })).toEqual({ ok: true, value: undefined })
    expect(fake.calls.find(call => call.method === 'sendText')?.request).toMatchObject({
      target: { kind: 'direct', peer: 'did:wba:bob' },
      text: '收到',
    })
    expect(fake.calls.find(call => call.method === 'sendAttachment')?.request).toMatchObject({ fileName: 'a.txt', bytesBase64: 'YWJj' })
  })

  it('refreshes the selected direct peer profile and applies its latest persisted label', async () => {
    vi.useFakeTimers()
    const stale = { ...direct, title: '旧昵称', displayName: '旧昵称' }
    const fake = fakeRemote({
      config: { pollIntervalMs: 10, attachmentMaxBytes: 1024 },
      conversations: [stale],
    })
    fake.remote.resolvePeer = (request) => {
      fake.calls.push({ method: 'resolvePeer', request })
      return carried(success({
        did: direct.peerDid,
        handle: direct.peerHandle as AwikiHandle,
        displayName: '最新昵称',
        conversationId: direct.id,
      }))
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()

    await expect(controller.selectConversation(direct.id)).resolves.toEqual({ ok: true, value: undefined })

    expect(fake.calls.find(call => call.method === 'resolvePeer')?.request).toEqual({ peer: direct.peerDid })
    expect(controller.getSnapshot().conversations[0]).toMatchObject({
      id: direct.id,
      title: '最新昵称',
      displayName: '最新昵称',
      peerHandle: direct.peerHandle,
      unreadCount: 0,
    })

    await vi.advanceTimersByTimeAsync(10)
    expect(controller.getSnapshot().conversations[0]).toMatchObject({
      title: '最新昵称',
      displayName: '最新昵称',
    })
    controller.close()
  })

  it('keeps direct history available when the best-effort profile refresh fails', async () => {
    const fake = fakeRemote()
    fake.remote.resolvePeer = (request) => {
      fake.calls.push({ method: 'resolvePeer', request })
      return carried({ ok: false, error: { code: 'network', message: '资料刷新失败' } })
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()

    await expect(controller.selectConversation(direct.id)).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().messages).toEqual([message])
    expect(controller.getSnapshot().error).toBeNull()
  })

  it('sends group text and captioned attachments through the group DID', async () => {
    const fake = fakeRemote()
    fake.remote.listConversations = () => carried(success({ items: [group], hasMore: false }))
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(group.id)
    await controller.sendText('群消息')
    await controller.sendAttachment({
      fileName: 'a.txt',
      mimeType: 'text/plain',
      bytesBase64: 'YWJj',
      caption: '说明',
    })

    expect(fake.calls.find(call => call.method === 'sendText')?.request).toMatchObject({
      target: { kind: 'group', group: 'did:wba:group' },
    })
    expect(fake.calls.find(call => call.method === 'sendAttachment')?.request).toMatchObject({
      target: { kind: 'group', group: 'did:wba:group' },
      caption: '说明',
    })
  })

  it('keeps failed and closed sends out of the visible history', async () => {
    const fake = fakeRemote()
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)
    const originalMessages = controller.getSnapshot().messages
    fake.remote.sendText = () => carried({
      ok: false,
      error: { code: 'network', message: '发送失败' },
    })
    await expect(controller.sendText('失败')).resolves.toEqual({ ok: false, error: 'network：发送失败' })
    expect(controller.getSnapshot().messages).toBe(originalMessages)

    const text = deferred<Awaited<ReturnType<typeof fake.remote.sendText>>>()
    fake.remote.sendText = () => text.promise
    const sendingText = controller.sendText('稍后')
    controller.close()
    text.resolve({ ok: true, value: success({ ...message, id: 'late-text' as AwikiMessageId }) })
    await expect(sendingText).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().messages).toBe(originalMessages)

    await controller.open()
    await controller.selectConversation(direct.id)
    const attachment = deferred<Awaited<ReturnType<typeof fake.remote.sendAttachment>>>()
    fake.remote.sendAttachment = () => attachment.promise
    const sendingAttachment = controller.sendAttachment({
      fileName: 'a.txt', mimeType: 'text/plain', bytesBase64: 'YWJj',
    })
    controller.close()
    attachment.resolve({ ok: true, value: success({ ...message, id: 'late-file' as AwikiMessageId }) })
    await expect(sendingAttachment).resolves.toEqual({ ok: true, value: undefined })

    await controller.open()
    await controller.selectConversation(direct.id)
    fake.remote.sendAttachment = () => carried({
      ok: false,
      error: { code: 'network', message: '附件失败' },
    })
    await expect(controller.sendAttachment({
      fileName: 'a.txt', mimeType: 'text/plain', bytesBase64: 'YWJj',
    })).resolves.toEqual({ ok: false, error: 'network：附件失败' })

    await controller.selectConversation(null)
    await expect(controller.sendAttachment({
      fileName: 'a.txt', mimeType: 'text/plain', bytesBase64: 'YWJj',
    })).resolves.toEqual({ ok: false, error: '请先选择会话' })
  })

  it('does not append delayed sends after the selected conversation changes', async () => {
    const fake = fakeRemote({ conversations: [direct, group] })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)

    const text = deferred<Awaited<ReturnType<typeof fake.remote.sendText>>>()
    fake.remote.sendText = () => text.promise
    const sendingText = controller.sendText('delayed')
    await controller.selectConversation(group.id)
    text.resolve({ ok: true, value: success({ ...message, id: 'late-text-switch' as AwikiMessageId }) })
    await expect(sendingText).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().selectedConversationId).toBe(group.id)
    expect(controller.getSnapshot().messages.some(value => value.id === 'late-text-switch')).toBe(false)

    const attachment = deferred<Awaited<ReturnType<typeof fake.remote.sendAttachment>>>()
    fake.remote.sendAttachment = () => attachment.promise
    const sendingAttachment = controller.sendAttachment({
      fileName: 'delayed.txt', mimeType: 'text/plain', bytesBase64: 'YWJj',
    })
    await controller.selectConversation(direct.id)
    attachment.resolve({ ok: true, value: success({ ...message, id: 'late-file-switch' as AwikiMessageId }) })
    await expect(sendingAttachment).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().selectedConversationId).toBe(direct.id)
    expect(controller.getSnapshot().messages.some(value => value.id === 'late-file-switch')).toBe(false)
  })

  it('prepends chronological older history and requires a continuation cursor', async () => {
    const fake = fakeRemote()
    let reads = 0
    fake.remote.getHistory = (request) => {
      fake.calls.push({ method: 'getHistory', request })
      reads += 1
      if (reads === 1) {
        return Promise.resolve({
          ok: true,
          value: {
            ok: true,
            value: {
              items: [message],
              hasMore: true,
              nextCursor: 'older-page' as AwikiCursor,
            },
          },
        })
      }
      return Promise.resolve({
        ok: true,
        value: {
          ok: true,
          value: {
            items: [{
              ...message,
            }, {
              ...message,
              id: 'old' as AwikiMessageId,
              sentAt: 1,
              content: { kind: 'text', text: '更早' },
            }],
            hasMore: true,
          },
        },
      })
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)
    expect(controller.getSnapshot().historyHasMore).toBe(true)

    await controller.loadOlderHistory()
    expect(fake.calls.at(-1)?.request).toEqual({ conversationId: direct.id, cursor: 'older-page' })
    expect(controller.getSnapshot().messages.map(value => value.id)).toEqual(['old', message.id])
    expect(controller.getSnapshot().historyHasMore).toBe(false)
  })

  it('handles missing, failed, closed, and superseded history requests', async () => {
    const fake = fakeRemote()
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await expect(controller.loadOlderHistory()).resolves.toEqual({ ok: false, error: '请先选择会话' })

    fake.remote.getHistory = () => carried({
      ok: false,
      error: { code: 'network', message: '历史失败' },
    })
    await expect(controller.selectConversation(direct.id)).resolves.toEqual({ ok: false, error: 'network：历史失败' })

    const closedRead = deferred<Awaited<ReturnType<typeof fake.remote.getHistory>>>()
    fake.remote.getHistory = () => closedRead.promise
    const closed = controller.selectConversation(direct.id)
    controller.close()
    closedRead.resolve({ ok: true, value: success({ items: [message], hasMore: false }) })
    await expect(closed).resolves.toEqual({ ok: true, value: undefined })

    await controller.open()
    const switchedRead = deferred<Awaited<ReturnType<typeof fake.remote.getHistory>>>()
    fake.remote.getHistory = () => switchedRead.promise
    const switched = controller.selectConversation(direct.id)
    await controller.selectConversation(null)
    switchedRead.resolve({ ok: true, value: success({ items: [message], hasMore: false }) })
    await expect(switched).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().messages).toEqual([])
  })

  it('merges the latest chronological page by message identity while polling', async () => {
    vi.useFakeTimers()
    const fake = fakeRemote({ config: { pollIntervalMs: 25, attachmentMaxBytes: 1024 } })
    let reads = 0
    fake.remote.getHistory = (request) => {
      fake.calls.push({ method: 'getHistory', request })
      reads += 1
      const latest = reads === 1
        ? [message]
        : [message, { ...message, id: 'new' as AwikiMessageId, sentAt: 20 }]
      return Promise.resolve({ ok: true, value: { ok: true, value: { items: latest, hasMore: false } } })
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)
    await vi.advanceTimersByTimeAsync(25)

    expect(controller.getSnapshot().messages.map(value => value.id)).toEqual([message.id, 'new'])
    controller.close()
  })

  it('refreshes a group unread badge, preview, and timestamp from conversation polling', async () => {
    vi.useFakeTimers()
    const initialGroup = { ...group, unreadCount: 0 }
    const refreshedGroup = {
      ...group,
      unreadCount: 2,
      lastMessageAt: 30,
      lastMessagePreview: '群聊最新消息',
    }
    const fake = fakeRemote({
      config: { pollIntervalMs: 10, attachmentMaxBytes: 1024 },
      conversations: [initialGroup],
    })
    let reads = 0
    fake.remote.listConversations = (request) => {
      fake.calls.push({ method: 'listConversations', request })
      reads += 1
      return carried(success({ items: [reads === 1 ? initialGroup : refreshedGroup], hasMore: false }))
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()

    expect(controller.getSnapshot().conversations[0]).toMatchObject(initialGroup)
    await vi.advanceTimersByTimeAsync(10)
    expect(controller.getSnapshot().conversations[0]).toMatchObject(refreshedGroup)
    controller.close()
  })

  it('skips polling without identity or selection and serializes slow refreshes', async () => {
    vi.useFakeTimers()
    const anonymous = fakeRemote({ identity: null, config: { pollIntervalMs: 10, attachmentMaxBytes: 1024 } })
    const anonymousController = new AwikiController(anonymous.remote)
    await anonymousController.open()
    await vi.advanceTimersByTimeAsync(20)
    expect(anonymous.calls.filter(call => call.method === 'listConversations')).toHaveLength(0)
    anonymousController.close()

    const fake = fakeRemote({ config: { pollIntervalMs: 10, attachmentMaxBytes: 1024 } })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await vi.advanceTimersByTimeAsync(10)
    expect(fake.calls.filter(call => call.method === 'getHistory')).toHaveLength(0)

    await controller.selectConversation(direct.id)
    const refresh = deferred<Awaited<ReturnType<typeof fake.remote.listConversations>>>()
    fake.remote.listConversations = () => refresh.promise
    await vi.advanceTimersByTimeAsync(20)
    refresh.resolve({ ok: true, value: success({ items: [direct], hasMore: false }) })
    await Promise.resolve()
    expect(fake.calls.filter(call => call.method === 'getHistory')).toHaveLength(1)
    controller.close()
  })

  it('ignores failed or superseded polling history', async () => {
    vi.useFakeTimers()
    const fake = fakeRemote({ config: { pollIntervalMs: 10, attachmentMaxBytes: 1024 } })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)
    fake.remote.getHistory = () => carried({
      ok: false,
      error: { code: 'network', message: '轮询失败' },
    })
    await vi.advanceTimersByTimeAsync(10)
    expect(controller.getSnapshot().error).toBeNull()

    const history = deferred<Awaited<ReturnType<typeof fake.remote.getHistory>>>()
    fake.remote.getHistory = () => history.promise
    await vi.advanceTimersByTimeAsync(10)
    await controller.selectConversation(null)
    history.resolve({ ok: true, value: success({ items: [{ ...message, id: 'ignored' as AwikiMessageId }], hasMore: false }) })
    await Promise.resolve()
    expect(controller.getSnapshot().messages).toEqual([])
    controller.close()
  })

  it('requires a selected conversation and can return to the roster', async () => {
    const controller = new AwikiController(fakeRemote().remote)
    await controller.open()
    expect(await controller.sendText('x')).toEqual({ ok: false, error: '请先选择会话' })
    await controller.selectConversation('missing' as AwikiConversationId)
    expect(await controller.sendText('x')).toEqual({ ok: false, error: '请先选择会话' })
    await controller.selectConversation(null)
    expect(controller.getSnapshot().selectedConversationId).toBeNull()
  })

  it('flattens carrier and business failures into display-safe errors', async () => {
    const carrier = fakeRemote()
    carrier.remote.getConfig = () => Promise.resolve({ ok: false, error: { code: 'offline', message: '断开', details: {} } })
    const first = new AwikiController(carrier.remote)
    expect(await first.open()).toEqual({ ok: false, error: '连接 AWiki Host 失败：断开' })
    expect(first.getSnapshot().status).toBe('error')

    const business = fakeRemote()
    business.remote.getIdentity = () => Promise.resolve({ ok: true, value: { ok: false, error: { code: 'remote', message: '拒绝' } } })
    const second = new AwikiController(business.remote)
    expect(await second.open()).toEqual({ ok: false, error: 'remote：拒绝' })
  })

  it('returns attachment bytes without publishing them and refuses late work after disposal', async () => {
    const fake = fakeRemote()
    const controller = new AwikiController(fake.remote)
    await controller.open()
    const result = await controller.downloadAttachment('m1' as never, 'a1' as never)
    expect(fake.calls.at(-1)?.request).toEqual({ messageId: 'm1', attachmentId: 'a1' })
    expect(result).toMatchObject({ ok: true, value: { bytesBase64: 'YWJj' } })
    if (!result.ok) throw new Error(result.error)
    expect(controller.getSnapshot()).not.toHaveProperty('bytesBase64')

    const download = deferred<Awaited<ReturnType<typeof fake.remote.downloadAttachment>>>()
    fake.remote.downloadAttachment = () => download.promise
    const closingDownload = controller.downloadAttachment('m1' as never, 'a1' as never)
    controller.close()
    download.resolve({ ok: true, value: success(result.value) })
    await expect(closingDownload).resolves.toEqual({ ok: false, error: 'AWiki 已关闭' })

    controller.dispose()
    const snapshot = controller.getSnapshot()
    const calls = fake.calls.length
    expect(await controller.open()).toEqual({ ok: false, error: 'AWiki 插件已卸载' })
    expect(controller.getSnapshot()).toBe(snapshot)
    expect(fake.calls).toHaveLength(calls)
  })
})
