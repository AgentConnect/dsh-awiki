import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  AwikiConversation, AwikiConversationId, AwikiCursor, AwikiDid, AwikiDownloadedAttachment, AwikiHandle,
  AwikiMessageId, AwikiPage, AwikiRecoveryProgress,
} from '@awiki/dsh-plugin/types'
import { AwikiController } from '../src/client/controller.ts'
import type { AwikiBrowserImageCache } from '../src/client/image-cache.ts'
import { carried, direct, fakeRemote, group, groupSnapshot, identity, message, success, summary } from './helpers.client.ts'

function deferred<Value>() {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((settle) => { resolve = settle })
  return { promise, resolve }
}

function installMemoryLocalStorage(): Storage {
  const values = new Map<string, string>()
  const storage: Storage = {
    get length() { return values.size },
    clear: () => { values.clear() },
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
  vi.stubGlobal('localStorage', storage)
  return storage
}

async function settleConversationRefresh(controller: AwikiController): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    if (!controller.getSnapshot().refreshing) return
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  throw new Error('conversation refresh did not settle')
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('AwikiController', () => {
  it.each(['identity-recovery-required', 'forbidden'] as const)(
    'moves a revoked active session into recovery for conversation-list failure %s',
    async (code) => {
      vi.useFakeTimers()
      const fake = fakeRemote({
        config: { pollIntervalMs: 25, attachmentMaxBytes: 1_024 },
        conversations: [group],
        history: [message],
      })
      const controller = new AwikiController(fake.remote)
      await controller.open()
      await controller.selectConversation(group.id)
      expect(controller.getSnapshot().selectedConversationId).toBe(group.id)

      fake.remote.listConversations = (request) => {
        fake.calls.push({ method: 'listConversations', request })
        return carried({ ok: false, error: { code, message: 'private revoked identity detail' } })
      }
      await expect(controller.open()).resolves.toEqual({ ok: true, value: undefined })

      expect(controller.getSnapshot()).toMatchObject({
        status: 'ready',
        sessionStatus: 'recovery-required',
        identity,
        conversations: [],
        hiddenConversations: [],
        selectedConversationId: null,
        selectedGroup: null,
        groupAccess: null,
        groupMembers: [],
        messages: [],
        pending: null,
        error: null,
        summaries: {},
      })
      const listCalls = fake.calls.filter(call => call.method === 'listConversations').length
      await vi.advanceTimersByTimeAsync(100)
      expect(fake.calls.filter(call => call.method === 'listConversations')).toHaveLength(listCalls)
      expect(JSON.stringify(controller.getSnapshot())).not.toContain('private revoked identity detail')
    },
  )

  it('never summarizes without a click and uses the unread snapshot captured before marking read', async () => {
    const unread = { ...direct, unreadCount: 3 }
    const fake = fakeRemote({ conversations: [unread], summary: {
      ...summary,
      range: { ...summary.range, kind: 'unread', messageCount: 3 },
    } })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    expect(fake.calls.filter(call => call.method === 'summarizeConversation')).toEqual([])
    await controller.selectConversation(unread.id)
    expect(fake.calls.filter(call => call.method === 'summarizeConversation')).toEqual([])

    await expect(controller.summarizeConversation()).resolves.toMatchObject({ ok: true })
    expect(fake.calls.find(call => call.method === 'summarizeConversation')?.request).toEqual({
      conversationId: unread.id,
      unreadCountAtOpen: 3,
    })
    expect(controller.getSnapshot().summaries[unread.id]).toMatchObject({
      status: 'success', collapsed: false, stale: false, result: { range: { kind: 'unread' } },
    })
  })

  it('keeps per-conversation summaries, supports collapse, and marks only new messages stale', async () => {
    const fake = fakeRemote({ conversations: [direct, group] })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)
    await controller.summarizeConversation()
    controller.setSummaryCollapsed(direct.id, true)
    expect(controller.getSnapshot().summaries[direct.id]?.collapsed).toBe(true)

    await controller.selectConversation(group.id)
    expect(controller.getSnapshot().summaries[direct.id]?.result).toEqual(summary)
    await controller.selectConversation(direct.id)
    expect(controller.getSnapshot().summaries[direct.id]?.stale).toBe(false)

    fake.remote.sendText = (request) => carried(success({
      ...message,
      id: 'new-message' as AwikiMessageId,
      sentAt: summary.range.endedAt + 1,
      outgoing: true,
      content: { kind: 'text', text: request.text },
    }))
    await controller.sendText('新消息')
    expect(controller.getSnapshot().summaries[direct.id]).toMatchObject({ status: 'success', stale: true })
    expect(fake.calls.filter(call => call.method === 'summarizeConversation')).toHaveLength(1)
  })

  it('does not mark a summary stale for repeated or older history, only a genuinely newer message', async () => {
    vi.useFakeTimers()
    const repeated = { ...message, sentAt: summary.range.endedAt + 10 }
    const fake = fakeRemote({
      config: { pollIntervalMs: 25, attachmentMaxBytes: 1024 },
      history: [repeated],
      historyHasMore: true,
      historyCursor: 'older-page' as AwikiCursor,
      summary: { ...summary, range: { ...summary.range, endedAt: summary.range.endedAt } },
    })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)
    await controller.summarizeConversation()

    await vi.advanceTimersByTimeAsync(25)
    expect(controller.getSnapshot().summaries[direct.id]?.stale).toBe(false)

    fake.remote.getHistory = request => {
      fake.calls.push({ method: 'getHistory', request })
      return carried(success({
        items: [{ ...message, id: 'older-after-summary' as AwikiMessageId, sentAt: 1 }, repeated],
        hasMore: false,
      }))
    }
    await controller.loadOlderHistory()
    expect(controller.getSnapshot().summaries[direct.id]?.stale).toBe(false)

    fake.remote.getHistory = request => {
      fake.calls.push({ method: 'getHistory', request })
      return carried(success({
        items: [repeated, { ...message, id: 'new-after-summary' as AwikiMessageId, sentAt: repeated.sentAt + 1 }],
        hasMore: false,
      }))
    }
    await vi.advanceTimersByTimeAsync(25)
    expect(controller.getSnapshot().summaries[direct.id]?.stale).toBe(true)
    controller.close()
  })

  it('publishes an actionable summary error without leaking Host details', async () => {
    const fake = fakeRemote()
    fake.remote.summarizeConversation = () => carried({
      ok: false,
      error: { code: 'summary-invalid-output', message: 'private model output' },
    })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)
    await expect(controller.summarizeConversation()).resolves.toEqual({
      ok: false,
      error: '模型没有返回有效的结构化摘要，请重新生成。',
    })
    expect(controller.getSnapshot().summaries[direct.id]).toEqual({
      status: 'error',
      collapsed: false,
      stale: false,
      error: '模型没有返回有效的结构化摘要，请重新生成。',
    })
  })

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
    expect(await controller.registerIdentity({ handle: 'alice', phone: '13800000000', otp: '123456' })).toEqual({ ok: true, value: { status: 'registered', identity } })
    expect(controller.getSnapshot().identity).toEqual(identity)
  })

  it('clears every browser projection after confirmed permanent deletion', async () => {
    const fake = fakeRemote()
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)

    await expect(controller.clearLocalData({ confirmation: 'clear-awiki-local-data' })).resolves.toEqual({
      ok: true,
      value: { cleared: true },
    })
    expect(fake.calls.find(call => call.method === 'clearLocalData')).toEqual({
      method: 'clearLocalData',
      request: { confirmation: 'clear-awiki-local-data' },
    })
    expect(controller.getSnapshot()).toMatchObject({
      status: 'ready',
      identity: null,
      conversations: [],
      selectedConversationId: null,
      messages: [],
    })
  })

  it('signs out without clearing identity data and resumes the same identity', async () => {
    const fake = fakeRemote()
    const controller = new AwikiController(fake.remote)
    await controller.open()
    const before = controller.getSnapshot().identity

    await expect(controller.logout({ confirmation: 'logout-awiki-session' })).resolves.toEqual({
      ok: true,
      value: { status: 'signed-out' },
    })
    expect(controller.getSnapshot()).toMatchObject({
      sessionStatus: 'signed-out',
      identity: null,
      conversations: [],
    })
    expect(fake.calls.filter(call => call.method === 'clearLocalData')).toHaveLength(0)

    await expect(controller.login()).resolves.toMatchObject({
      ok: true,
      value: { status: 'active', identity: before },
    })
    expect(controller.getSnapshot()).toMatchObject({ sessionStatus: 'active', identity: before })
  })

  it('checks durable recovery status first after restart and reloads an applied identity exactly once', async () => {
    const storage = installMemoryLocalStorage()
    storage.setItem('awiki.handle-recovery.operation.v1', 'recovery-restart')
    const applied: AwikiRecoveryProgress = {
      operationId: 'recovery-restart',
      fullHandle: 'alice.awiki.info',
      previousDid: 'did:wba:alice:old' as AwikiDid,
      currentDid: identity.did,
      phase: 'applied',
      retryable: false,
      localOrdinaryDataWillMigrate: true,
      otherDevicesMustRejoin: true,
    }
    const fake = fakeRemote({ identity: null, sessionStatus: 'unregistered' })
    let sessionReads = 0
    fake.remote.getSession = () => {
      fake.calls.push({ method: 'getSession' })
      sessionReads += 1
      return carried(success(sessionReads === 1
        ? { status: 'unregistered' as const }
        : { status: 'active' as const, identity }))
    }
    fake.remote.getRecoveryStatus = (request) => {
      fake.calls.push({ method: 'getRecoveryStatus', request })
      return carried(success(applied))
    }
    const controller = new AwikiController(fake.remote)

    await expect(controller.loadSession()).resolves.toEqual({ ok: true, value: undefined })
    expect(fake.calls.filter(call => call.method === 'getSession')).toHaveLength(2)
    expect(fake.calls.filter(call => call.method === 'getRecoveryStatus')).toEqual([{
      method: 'getRecoveryStatus', request: { operationId: 'recovery-restart' },
    }])
    expect(storage.getItem('awiki.handle-recovery.operation.v1')).toBeNull()
    expect(controller.getSnapshot()).toMatchObject({ sessionStatus: 'active', identity })
    const browserState = JSON.stringify(controller.getSnapshot())
    expect(browserState).not.toContain('13800000000')
    expect(browserState).not.toContain('123456')
  })

  it.each([
    { label: 'Fresh Root', localOrdinaryDataWillMigrate: false, conversations: [] },
    { label: 'Local Data', localOrdinaryDataWillMigrate: true, conversations: [direct] },
  ])('applies $label recovery without clearing or synthesizing conversations', async ({
    localOrdinaryDataWillMigrate,
    conversations,
  }) => {
    const storage = installMemoryLocalStorage()
    const operationId = localOrdinaryDataWillMigrate ? 'recovery-local-data' : 'recovery-fresh-root'
    storage.setItem('awiki.handle-recovery.operation.v1', operationId)
    const progress: AwikiRecoveryProgress = {
      operationId,
      fullHandle: 'alice.awiki.info',
      previousDid: 'did:wba:alice:old' as AwikiDid,
      currentDid: identity.did,
      phase: 'remote_outcome_unknown',
      retryable: true,
      localOrdinaryDataWillMigrate,
      otherDevicesMustRejoin: true,
    }
    const fake = fakeRemote({ identity: null, sessionStatus: 'unregistered', recoveryProgress: progress, conversations })
    const controller = new AwikiController(fake.remote)

    await controller.loadSession()
    await expect(controller.resumeRecovery()).resolves.toMatchObject({ ok: true, value: { phase: 'applied' } })
    expect(controller.getSnapshot()).toMatchObject({
      sessionStatus: 'active',
      identity,
      conversations,
    })
    expect(fake.calls.filter(call => call.method === 'clearLocalData')).toHaveLength(0)
    expect(fake.calls.filter(call => call.method === 'getHistory')).toHaveLength(0)
    expect(storage.getItem('awiki.handle-recovery.operation.v1')).toBeNull()
  })

  it('allows recovery resume only for uncertain phases and blocks activation or discard there', async () => {
    const storage = installMemoryLocalStorage()
    storage.setItem('awiki.handle-recovery.operation.v1', 'recovery-uncertain')
    const uncertain: AwikiRecoveryProgress = {
      operationId: 'recovery-uncertain',
      fullHandle: 'alice.awiki.info',
      previousDid: 'did:wba:alice:old' as AwikiDid,
      currentDid: identity.did,
      phase: 'remote_outcome_unknown',
      retryable: true,
      localOrdinaryDataWillMigrate: true,
      otherDevicesMustRejoin: true,
    }
    const fake = fakeRemote({ identity: null, sessionStatus: 'unregistered', recoveryProgress: uncertain })
    const controller = new AwikiController(fake.remote)
    await controller.loadSession()

    await expect(controller.activateRecovery()).resolves.toEqual({ ok: false, error: '请先完成恢复信息验证' })
    await expect(controller.discardRecovery()).resolves.toEqual({ ok: false, error: '当前恢复状态不能取消' })
    expect(fake.calls.filter(call => call.method === 'activateRecovery')).toHaveLength(0)
    expect(fake.calls.filter(call => call.method === 'discardRecovery')).toHaveLength(0)

    await expect(controller.resumeRecovery()).resolves.toMatchObject({ ok: true, value: { phase: 'applied' } })
    expect(fake.calls.filter(call => call.method === 'resumeRecovery')).toHaveLength(1)
    expect(storage.getItem('awiki.handle-recovery.operation.v1')).toBeNull()
    expect(controller.getSnapshot()).toMatchObject({ sessionStatus: 'active', identity })
  })

  it('keeps a committed recovery failure local to the recovery flow with a safe retry action', async () => {
    const storage = installMemoryLocalStorage()
    storage.setItem('awiki.handle-recovery.operation.v1', 'recovery-local-transition')
    const progress: AwikiRecoveryProgress = {
      operationId: 'recovery-local-transition',
      fullHandle: 'alice.awiki.info',
      previousDid: 'did:wba:alice:old' as AwikiDid,
      currentDid: identity.did,
      phase: 'identity_transition_pending',
      retryable: true,
      localOrdinaryDataWillMigrate: true,
      otherDevicesMustRejoin: true,
    }
    const fake = fakeRemote({ identity: null, sessionStatus: 'unregistered', recoveryProgress: progress })
    fake.remote.resumeRecovery = request => {
      fake.calls.push({ method: 'resumeRecovery', request })
      return carried({
        ok: false,
        error: { code: 'invalid-request', message: 'local registry invariant' },
      })
    }
    const controller = new AwikiController(fake.remote)
    await controller.loadSession()

    await expect(controller.resumeRecovery()).resolves.toEqual({
      ok: false,
      error: '身份已在服务端恢复，但本机切换尚未完成。请保留当前恢复操作，并继续完成本机切换；不要重新获取验证码或创建新身份。',
    })
    expect(controller.getSnapshot()).toMatchObject({
      recoveryOperationId: 'recovery-local-transition',
      recoveryProgress: progress,
      error: null,
    })
    expect(storage.getItem('awiki.handle-recovery.operation.v1')).toBe('recovery-local-transition')
  })

  it('retries an applied recovery reconciliation after restart even when the recovered session is already active', async () => {
    const storage = installMemoryLocalStorage()
    storage.setItem('awiki.handle-recovery.operation.v1', 'recovery-reconciliation')
    const applied: AwikiRecoveryProgress = {
      operationId: 'recovery-reconciliation',
      fullHandle: 'alice.awiki.info',
      previousDid: 'did:wba:alice:old' as AwikiDid,
      currentDid: identity.did,
      phase: 'applied',
      retryable: false,
      localOrdinaryDataWillMigrate: true,
      otherDevicesMustRejoin: true,
    }
    const fake = fakeRemote()
    let attempt = 0
    fake.remote.getRecoveryStatus = (request) => {
      fake.calls.push({ method: 'getRecoveryStatus', request })
      attempt += 1
      return carried(attempt === 1
        ? { ok: false, error: { code: 'remote', message: 'private upstream error' } }
        : success(applied))
    }
    const controller = new AwikiController(fake.remote)

    await expect(controller.loadSession()).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot()).toMatchObject({
      sessionStatus: 'active',
      identity,
      recoveryOperationId: 'recovery-reconciliation',
    })
    expect(storage.getItem('awiki.handle-recovery.operation.v1')).toBe('recovery-reconciliation')

    await expect(controller.loadSession()).resolves.toEqual({ ok: true, value: undefined })
    expect(storage.getItem('awiki.handle-recovery.operation.v1')).toBeNull()
    expect(controller.getSnapshot()).toMatchObject({
      sessionStatus: 'active',
      identity,
      recoveryOperationId: null,
      recoveryProgress: applied,
    })
    expect(fake.calls.filter(call => call.method === 'getRecoveryStatus')).toEqual([
      { method: 'getRecoveryStatus', request: { operationId: 'recovery-reconciliation' } },
      { method: 'getRecoveryStatus', request: { operationId: 'recovery-reconciliation' } },
    ])
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

  it('classifies identity access before OTP without storing phone or verification factors', async () => {
    const fake = fakeRemote({
      identity: null,
      identityAccessInspection: { status: 'existing', fullHandle: 'alice.awiki.info' },
    })
    const controller = new AwikiController(fake.remote)
    await controller.open()

    await expect(controller.inspectIdentityAccess({ handle: 'alice' })).resolves.toEqual({
      ok: true,
      value: { status: 'existing', fullHandle: 'alice.awiki.info' },
    })
    expect(fake.calls.filter(call => call.method === 'inspectIdentityAccess')).toEqual([{
      method: 'inspectIdentityAccess', request: { handle: 'alice' },
    }])
    expect(controller.getSnapshot()).toMatchObject({ sessionStatus: 'unregistered', identity: null })
    expect(JSON.stringify(controller.getSnapshot())).not.toMatch(/13800000000|123456/u)
  })

  it('keeps local roster removal persistent, clears a removed selection, and restores on demand', async () => {
    const fake = fakeRemote({
      conversations: [direct, group],
      conversationPreferences: {
        hiddenConversations: [{ conversation: group, hiddenAt: 20 }],
      },
    })
    const controller = new AwikiController(fake.remote)
    await controller.open()

    expect(controller.getSnapshot()).toMatchObject({
      conversations: [direct],
      hiddenConversations: [group],
    })
    await controller.selectConversation(direct.id)
    expect(controller.getSnapshot().selectedConversationId).toBe(direct.id)

    await expect(controller.hideConversation(direct.id)).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot()).toMatchObject({
      conversations: [],
      selectedConversationId: null,
      selectedGroup: null,
      messages: [],
    })
    expect(controller.getSnapshot().hiddenConversations.map(item => item.id)).toEqual(
      expect.arrayContaining([direct.id, group.id]),
    )
    expect(fake.calls.filter(call => call.method === 'leaveGroup')).toHaveLength(0)

    await expect(controller.restoreConversation(group.id)).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().conversations).toEqual([group])
    expect(controller.getSnapshot().hiddenConversations).toEqual([direct])
  })

  it('automatically restores a hidden conversation only after genuinely newer activity', async () => {
    const unchanged = fakeRemote({
      conversations: [direct],
      conversationPreferences: {
        hiddenConversations: [{ conversation: direct, hiddenAt: 20 }],
      },
    })
    const unchangedController = new AwikiController(unchanged.remote)
    await unchangedController.open()
    expect(unchangedController.getSnapshot()).toMatchObject({ conversations: [], hiddenConversations: [direct] })
    expect(unchanged.calls.filter(call => call.method === 'updateConversationPreference')).toHaveLength(0)
    unchangedController.dispose()

    const newer = { ...direct, lastMessageAt: (direct.lastMessageAt ?? 0) + 1, lastMessagePreview: '新消息' }
    const changed = fakeRemote({
      conversations: [newer],
      conversationPreferences: {
        hiddenConversations: [{ conversation: direct, hiddenAt: 20 }],
      },
    })
    const changedController = new AwikiController(changed.remote)
    await changedController.open()
    expect(changedController.getSnapshot()).toMatchObject({ conversations: [newer], hiddenConversations: [] })
    expect(changed.calls).toContainEqual({
      method: 'updateConversationPreference',
      request: { action: 'restore', conversationId: direct.id },
    })
  })

  it('keeps inaccessible group history visible and restores authority after an explicit recheck', async () => {
    const localMessage = {
      ...message,
      id: 'group-local-message' as AwikiMessageId,
      conversationId: group.id,
      conversationKind: 'group' as const,
      content: { kind: 'text' as const, text: '本机保留的群消息' },
    }
    const fake = fakeRemote({
      conversations: [group],
      localHistory: [localMessage],
    })
    const privateFailure = {
      ok: false as const,
      error: { code: 'group-membership-required' as const, message: 'private previous DID and account detail' },
    }
    fake.remote.getGroup = request => {
      fake.calls.push({ method: 'getGroup', request })
      return carried(privateFailure)
    }
    fake.remote.getHistory = request => {
      fake.calls.push({ method: 'getHistory', request })
      return carried(privateFailure)
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(group.id)
    await settleConversationRefresh(controller)

    expect(controller.getSnapshot()).toMatchObject({
      selectedConversationId: group.id,
      selectedGroup: null,
      groupAccess: { groupDid: group.groupDid, status: 'not-member' },
      messages: [localMessage],
      error: null,
    })
    expect(JSON.stringify(controller.getSnapshot())).not.toMatch(/private previous DID|account detail/u)
    await expect(controller.sendText('不应发送')).resolves.toEqual({
      ok: false,
      error: '当前身份尚未获得这个群聊的发送权限，请先重新检查群成员状态。',
    })
    expect(fake.calls.filter(call => call.method === 'sendText')).toHaveLength(0)

    const getGroup = fakeRemote({ conversations: [group] }).remote.getGroup
    const listGroupMembers = fakeRemote({ conversations: [group] }).remote.listGroupMembers
    fake.remote.getGroup = request => {
      fake.calls.push({ method: 'getGroup', request })
      return getGroup(request)
    }
    fake.remote.listGroupMembers = request => {
      fake.calls.push({ method: 'listGroupMembers', request })
      return listGroupMembers(request)
    }
    const before = fake.calls.length
    await expect(controller.refreshSelectedGroup()).resolves.toEqual({ ok: true, value: undefined })
    expect(fake.calls.slice(before).map(call => call.method)).toEqual([
      'getGroup',
      'listGroupMembers',
    ])
    expect(controller.getSnapshot()).toMatchObject({
      selectedGroup: { groupDid: group.groupDid, title: group.title },
      groupAccess: { groupDid: group.groupDid, status: 'available' },
      messages: [localMessage],
      error: null,
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
      error: '该 Handle 刚刚已被注册。请返回身份入口，再按恢复流程重新获取验证码。',
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

  it('invalidates config, session, and roster reads closed while opening', async () => {
    const configFake = fakeRemote()
    const config = deferred<Awaited<ReturnType<typeof configFake.remote.getConfig>>>()
    configFake.remote.getConfig = () => config.promise
    const configController = new AwikiController(configFake.remote)
    const configOpen = configController.open()
    configController.close()
    config.resolve({ ok: true, value: success({ pollIntervalMs: 25, attachmentMaxBytes: 1024 }) })
    await expect(configOpen).resolves.toEqual({ ok: true, value: undefined })
    expect(configFake.calls).toHaveLength(0)

    const sessionFake = fakeRemote()
    const sessionRead = deferred<Awaited<ReturnType<typeof sessionFake.remote.getSession>>>()
    sessionFake.remote.getSession = () => sessionRead.promise
    const sessionController = new AwikiController(sessionFake.remote)
    const sessionOpen = sessionController.open()
    await Promise.resolve()
    sessionController.close()
    sessionRead.resolve({ ok: true, value: success({ status: 'active', identity }) })
    await expect(sessionOpen).resolves.toEqual({ ok: true, value: undefined })
    expect(sessionFake.calls.filter(call => call.method === 'listConversations')).toHaveLength(0)

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

  it('creates a group, opens it, deduplicates members, and preserves partial-failure feedback', async () => {
    const fake = fakeRemote({ history: [] })
    fake.remote.createGroup = (request) => {
      fake.calls.push({ method: 'createGroup', request })
      return carried(success({
        conversation: {
          kind: 'group', id: 'group:new' as AwikiConversationId,
          groupDid: 'did:wba:new-group' as never, title: request.name, unreadCount: 0,
        },
        addedMembers: [{ did: 'did:wba:bob' as never, handle: 'bob' as never }],
        failedMembers: [{
          member: 'missing',
          error: { code: 'not-found', message: 'private provider detail' },
        }],
      }))
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()

    await expect(controller.createGroup('  Release Crew  ', [' @bob ', 'bob', 'missing'])).resolves.toMatchObject({ ok: true })
    expect(fake.calls.find(call => call.method === 'createGroup')?.request).toEqual({
      name: 'Release Crew',
      members: ['bob', 'missing'],
    })
    expect(controller.getSnapshot()).toMatchObject({
      selectedConversationId: 'group:new',
      error: '群聊已创建，但以下成员未加入：missing',
    })
    expect(controller.getSnapshot().conversations[0]).toMatchObject({
      kind: 'group', id: 'group:new', title: 'Release Crew',
    })
    await expect(controller.createGroup('', ['bob'])).resolves.toEqual({ ok: false, error: '请输入群聊名称' })
    await expect(controller.createGroup('Team', [])).resolves.toMatchObject({ ok: true })
    expect(fake.calls.filter(call => call.method === 'createGroup').at(-1)?.request).toEqual({ name: 'Team', members: [] })
    fake.remote.createGroup = () => carried({
      ok: false,
      error: { code: 'invalid-request' as const, message: 'The AWiki request is invalid.' },
    })
    await expect(controller.createGroup('Team', [])).resolves.toEqual({
      ok: false,
      error: '群聊名称或首批成员格式不正确，请检查后重试。',
    })
    await expect(controller.createGroup('Team', ['alice'])).resolves.toEqual({ ok: false, error: '群成员列表不需要包含自己' })
  })

  it('paginates the authoritative group roster and rejects a page from another group', async () => {
    const fake = fakeRemote({ conversations: [group], history: [] })
    fake.remote.listGroupMembers = (request) => {
      fake.calls.push({ method: 'listGroupMembers', request })
      if (request.cursor === undefined) {
        return carried(success({
          items: [{ did: identity.did, handle: identity.handle, role: 'owner', status: 'active', subjectType: 'human' }],
          nextCursor: 'members-2' as AwikiCursor,
          hasMore: true,
          pageGroup: group.groupDid,
          warnings: [],
        }))
      }
      return carried(success({
        items: [{ did: direct.peerDid, handle: direct.peerHandle, role: 'member', status: 'active', subjectType: 'human' }],
        hasMore: false,
        pageGroup: request.cursor === 'wrong-page' ? 'did:wba:other-group' as AwikiDid : group.groupDid,
        warnings: [],
      }))
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(group.id)
    await expect(controller.refreshSelectedGroup()).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot()).toMatchObject({ groupMembersHasMore: true })

    await expect(controller.loadMoreGroupMembers()).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().groupMembers.map(member => member.did)).toEqual([identity.did, direct.peerDid])
    expect(fake.calls.filter(call => call.method === 'listGroupMembers').at(-1)?.request).toEqual({
      groupDid: group.groupDid, cursor: 'members-2', limit: 50,
    })

    await controller.refreshSelectedGroup()
    fake.remote.listGroupMembers = (request) => {
      fake.calls.push({ method: 'listGroupMembers', request })
      return carried(success(request.cursor === undefined
        ? { items: [], nextCursor: 'wrong-page' as AwikiCursor, hasMore: true, pageGroup: group.groupDid, warnings: [] }
        : { items: [], hasMore: false, pageGroup: 'did:wba:other-group' as AwikiDid, warnings: [] }))
    }
    await controller.refreshSelectedGroup()
    await expect(controller.loadMoreGroupMembers()).resolves.toEqual({
      ok: false,
      error: '群成员分页归属不一致，请刷新后重试',
    })
  })

  it('refreshes group authority after membership changes and clears selection after leaving', async () => {
    const fake = fakeRemote({ conversations: [group], history: [] })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(group.id)
    await controller.refreshSelectedGroup()

    await expect(controller.addSelectedGroupMember('carol')).resolves.toMatchObject({ ok: true })
    expect(controller.getSnapshot().groupMembers).toEqual(expect.arrayContaining([
      expect.objectContaining({ handle: 'carol', status: 'active' }),
    ]))
    const bob = controller.getSnapshot().groupMembers.find(member => member.did === direct.peerDid)!
    await expect(controller.removeSelectedGroupMember(bob)).resolves.toMatchObject({ ok: true })
    expect(controller.getSnapshot().groupMembers.some(member => member.did === direct.peerDid)).toBe(false)
    expect(fake.calls.filter(call => call.method === 'getGroup').length).toBeGreaterThanOrEqual(4)

    await expect(controller.leaveSelectedGroup()).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot()).toMatchObject({
      selectedConversationId: null,
      selectedGroup: null,
      groupMembers: [],
      messages: [],
    })
    expect(fake.calls.filter(call => call.method === 'leaveGroup')).toHaveLength(1)
  })

  it('distinguishes an accepted invitation from a failed authoritative roster refresh', async () => {
    const fake = fakeRemote({ conversations: [group], history: [] })
    const addGroupMember = fake.remote.addGroupMember
    let invited = false
    fake.remote.addGroupMember = async (request) => {
      const result = await addGroupMember(request)
      invited = true
      return result
    }
    const listGroupMembers = fake.remote.listGroupMembers
    fake.remote.listGroupMembers = request => invited
      ? carried({ ok: false, error: { code: 'network', message: 'offline' } })
      : listGroupMembers(request)
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(group.id)
    await controller.refreshSelectedGroup()

    await expect(controller.addSelectedGroupMember('carol')).resolves.toEqual({
      ok: false,
      error: '已提交对 carol 的邀请，但成员列表刷新失败。请点击刷新查看最新状态。',
    })
    expect(fake.calls.filter(call => call.method === 'addGroupMember')).toHaveLength(1)
  })

  it('publishes a selected group access failure instead of leaving details loading forever', async () => {
    const fake = fakeRemote({ conversations: [group], history: [] })
    const failedGroup = deferred<Awaited<ReturnType<typeof fake.remote.getGroup>>>()
    fake.remote.getGroup = () => failedGroup.promise
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(group.id)
    await settleConversationRefresh(controller)

    failedGroup.resolve({ ok: true, value: {
      ok: false,
      error: { code: 'network', message: '群详情暂时不可用' },
    } })
    await vi.waitFor(() => {
      expect(controller.getSnapshot()).toMatchObject({
        groupAccess: { groupDid: group.groupDid, status: 'network-error' },
        error: null,
      })
    })
  })

  it('does not repeatedly retry a definitive missing-group history response', async () => {
    vi.useFakeTimers()
    const created = {
      kind: 'group' as const,
      id: 'group:new' as AwikiConversationId,
      groupDid: 'did:wba:new-group' as never,
      title: 'Release Crew',
      unreadCount: 0,
    }
    const fake = fakeRemote({
      conversations: [],
      localHistory: [],
      config: { pollIntervalMs: 60_000, attachmentMaxBytes: 1_024 },
    })
    fake.remote.createGroup = request => carried(success({
      conversation: { ...created, title: request.name },
      addedMembers: [],
      failedMembers: [],
    }))
    fake.remote.getHistory = request => {
      fake.calls.push({ method: 'getHistory', request })
      return carried({ ok: false, error: { code: 'not-found', message: 'group projection is not ready' } })
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()

    const creating = controller.createGroup('Release Crew', ['bob'])
    await expect(creating).resolves.toMatchObject({ ok: true })
    await vi.advanceTimersByTimeAsync(0)
    expect(fake.calls.filter(call => call.method === 'getHistory')).toHaveLength(1)
    expect(controller.getSnapshot().error).toBeNull()
    await vi.advanceTimersByTimeAsync(250)
    expect(fake.calls.filter(call => call.method === 'getHistory')).toHaveLength(1)
    expect(fake.calls.filter(call => call.method === 'listConversations')).toHaveLength(1)
    expect(controller.getSnapshot()).toMatchObject({
      selectedConversationId: created.id,
      error: null,
      messages: [],
      refreshing: false,
      groupAccess: { groupDid: created.groupDid, status: 'not-member' },
    })
  })

  it('publishes a group network state only after the bounded readiness window expires', async () => {
    vi.useFakeTimers()
    const fake = fakeRemote({
      conversations: [group],
      localHistory: [],
      config: { pollIntervalMs: 60_000, attachmentMaxBytes: 1_024 },
    })
    fake.remote.getHistory = request => {
      fake.calls.push({ method: 'getHistory', request })
      return carried({
        ok: false,
        error: { code: 'remote', message: 'The AWiki service rejected the operation.' },
      })
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()

    const selecting = controller.selectConversation(group.id)
    await expect(selecting).resolves.toEqual({ ok: true, value: undefined })
    await vi.advanceTimersByTimeAsync(4_999)
    expect(controller.getSnapshot().error).toBeNull()
    expect(fake.calls.filter(call => call.method === 'getHistory')).toHaveLength(4)
    await vi.advanceTimersByTimeAsync(1)

    expect(fake.calls.filter(call => call.method === 'getHistory')).toHaveLength(5)
    expect(controller.getSnapshot()).toMatchObject({
      groupAccess: { groupDid: group.groupDid, status: 'network-error' },
      error: null,
      refreshing: false,
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
    expect(controller.getSnapshot().conversations[0]?.unreadCount).toBe(3)
    expect(fake.calls.find(call => call.method === 'markConversationRead')).toBeUndefined()
    await expect(controller.markSelectedConversationRead()).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().conversations[0]?.unreadCount).toBe(0)
    expect(fake.calls.find(call => call.method === 'markConversationRead')?.request).toEqual({ conversationId: direct.id })
    expect(await controller.sendText('收到')).toEqual({ ok: true, value: undefined })
    expect(await controller.sendAttachment({ fileName: 'a.txt', mimeType: 'text/plain', bytesBase64: 'YWJj' })).toEqual({ ok: true, value: undefined })
    expect(fake.calls.find(call => call.method === 'sendText')?.request).toMatchObject({
      target: { kind: 'direct', peer: 'did:wba:bob' },
      text: '收到',
    })
    expect(fake.calls.find(call => call.method === 'sendAttachment')?.request).toMatchObject({ fileName: 'a.txt', bytesBase64: 'YWJj' })
  })

  it('coalesces automatic read attempts, keeps unread state on failure, and allows retry', async () => {
    const unread = { ...direct, unreadCount: 2 }
    const fake = fakeRemote({ conversations: [unread] })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)

    const first = deferred<Awaited<ReturnType<typeof fake.remote.markConversationRead>>>()
    let attempts = 0
    fake.remote.markConversationRead = (request) => {
      fake.calls.push({ method: 'markConversationRead', request })
      attempts += 1
      return first.promise
    }
    const marking = controller.markSelectedConversationRead()
    const duplicate = controller.markSelectedConversationRead()
    expect(attempts).toBe(1)
    first.resolve(await carried({ ok: false, error: { code: 'network', message: 'mark failed' } }))
    await expect(marking).resolves.toEqual({ ok: false, error: 'network：mark failed' })
    await expect(duplicate).resolves.toEqual({ ok: false, error: 'network：mark failed' })
    expect(controller.getSnapshot().conversations[0]?.unreadCount).toBe(2)

    fake.remote.markConversationRead = (request) => {
      fake.calls.push({ method: 'markConversationRead', request })
      attempts += 1
      return carried(success(2))
    }
    await expect(controller.markSelectedConversationRead()).resolves.toEqual({ ok: true, value: undefined })
    expect(attempts).toBe(2)
    expect(controller.getSnapshot().conversations[0]?.unreadCount).toBe(0)
    expect(controller.getSnapshot().error).toBeNull()
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

  it('publishes local messages before delayed remote history and records secret-free phase timings', async () => {
    const fake = fakeRemote({ localHistory: [message] })
    const remote = deferred<Awaited<ReturnType<typeof fake.remote.getHistory>>>()
    fake.remote.getHistory = (request) => {
      fake.calls.push({ method: 'getHistory', request })
      return remote.promise
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()

    await expect(controller.selectConversation(direct.id)).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot()).toMatchObject({
      selectedConversationId: direct.id,
      messages: [message],
      localPending: false,
      refreshing: true,
    })
    expect(performance.getEntriesByName('conversation.select.local_timeline_ms')).toHaveLength(1)
    expect(performance.getEntriesByName('conversation.select.first_paint_ms')).toHaveLength(1)
    expect(performance.getEntriesByName('conversation.select.remote_history_ms')).toHaveLength(0)

    remote.resolve({ ok: true, value: success({ items: [message], hasMore: false }) })
    await settleConversationRefresh(controller)
    const remoteTiming = performance.getEntriesByName('conversation.select.remote_history_ms')
    expect(remoteTiming).toHaveLength(1)
    expect((remoteTiming[0] as PerformanceMeasure).detail).toEqual({ success: true, count: 1 })
  })

  it('keeps local messages visible when remote history never settles or fails', async () => {
    const fake = fakeRemote({ localHistory: [message] })
    fake.remote.getHistory = () => new Promise(() => undefined)
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)
    expect(controller.getSnapshot().messages).toEqual([message])
    expect(controller.getSnapshot().refreshing).toBe(true)

    const failed = fakeRemote({ localHistory: [message] })
    failed.remote.getHistory = () => carried({
      ok: false,
      error: { code: 'network', message: 'offline' },
    })
    const failedController = new AwikiController(failed.remote)
    await failedController.open()
    await failedController.selectConversation(direct.id)
    await settleConversationRefresh(failedController)
    expect(failedController.getSnapshot().messages).toEqual([message])
    expect(failedController.getSnapshot().error).toBe('刷新失败，当前显示本地数据。network：offline')
  })

  it('shows sync state for an empty local page and publishes the committed reread', async () => {
    const fake = fakeRemote({ history: [message], localHistory: [] })
    let localReads = 0
    fake.remote.getLocalHistory = (request) => {
      fake.calls.push({ method: 'getLocalHistory', request })
      localReads += 1
      return carried(success({ items: localReads === 1 ? [] : [message], hasMore: false }))
    }
    const remote = deferred<Awaited<ReturnType<typeof fake.remote.getHistory>>>()
    fake.remote.getHistory = request => {
      fake.calls.push({ method: 'getHistory', request })
      return remote.promise
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)
    expect(controller.getSnapshot()).toMatchObject({ messages: [], localPending: false, refreshing: true })

    remote.resolve({ ok: true, value: success({ items: [message], hasMore: false }) })
    await settleConversationRefresh(controller)
    expect(controller.getSnapshot()).toMatchObject({ messages: [message], refreshing: false, error: null })
    expect(localReads).toBe(2)
  })

  it('does not await a delayed direct profile refresh before local first paint', async () => {
    const fake = fakeRemote({ localHistory: [message] })
    const profile = deferred<Awaited<ReturnType<typeof fake.remote.resolvePeer>>>()
    fake.remote.resolvePeer = request => {
      fake.calls.push({ method: 'resolvePeer', request })
      return profile.promise
    }
    fake.remote.getHistory = () => new Promise(() => undefined)
    const controller = new AwikiController(fake.remote)
    await controller.open()

    await expect(controller.selectConversation(direct.id)).resolves.toEqual({ ok: true, value: undefined })
    expect(controller.getSnapshot().messages).toEqual([message])
    profile.resolve(await carried({ ok: false, error: { code: 'network', message: 'profile offline' } }))
    await Promise.resolve()
    expect(controller.getSnapshot().messages).toEqual([message])
    expect(controller.getSnapshot().error).toBeNull()
  })

  it('fences A-B-A local reads with selection revision instead of selected id alone', async () => {
    const groupMessage = {
      ...message,
      id: 'group-message' as AwikiMessageId,
      conversationId: group.id,
      conversationKind: 'group' as const,
    }
    const latestDirect = { ...message, content: { kind: 'text' as const, text: '第二次 A' } }
    const fake = fakeRemote({ conversations: [direct, group] })
    const firstDirect = deferred<Awaited<ReturnType<typeof fake.remote.getLocalHistory>>>()
    let directReads = 0
    fake.remote.getLocalHistory = (request) => {
      fake.calls.push({ method: 'getLocalHistory', request })
      if (request.conversationId === direct.id && directReads++ === 0) return firstDirect.promise
      return carried(success({
        items: request.conversationId === direct.id ? [latestDirect] : [groupMessage],
        hasMore: false,
      }))
    }
    fake.remote.getHistory = () => new Promise(() => undefined)
    const controller = new AwikiController(fake.remote)
    await controller.open()

    const firstA = controller.selectConversation(direct.id)
    await controller.selectConversation(group.id)
    await controller.selectConversation(direct.id)
    expect(controller.getSnapshot().messages).toEqual([latestDirect])
    firstDirect.resolve(await carried(success({ items: [message], hasMore: false })))
    await firstA
    expect(controller.getSnapshot().messages).toEqual([latestDirect])
  })

  it('uses exact conversation and message identities without fuzzy dedupe or first-wins enrich loss', async () => {
    const duplicateBody = {
      ...message,
      id: 'same-body-2' as AwikiMessageId,
      sentAt: message.sentAt,
    }
    const enriched = { ...message, senderDisplayName: '最新昵称' }
    const fake = fakeRemote({ localHistory: [message, duplicateBody] })
    let localReads = 0
    fake.remote.getLocalHistory = request => {
      fake.calls.push({ method: 'getLocalHistory', request })
      localReads += 1
      return carried(success({
        items: localReads === 1 ? [message, duplicateBody] : [enriched, duplicateBody],
        hasMore: false,
      }))
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)
    expect(controller.getSnapshot().messages.map(item => item.id)).toEqual([message.id, duplicateBody.id])
    await settleConversationRefresh(controller)
    expect(controller.getSnapshot().messages).toHaveLength(2)
    expect(controller.getSnapshot().messages.find(item => item.id === message.id)?.senderDisplayName).toBe('最新昵称')
  })

  it('preserves the authoritative page order when equal timestamps cross group sequence digit widths', async () => {
    const sameTimestamp = [8, 9, 10].map(serverSequence => ({
      ...message,
      id: `${group.groupDid}:${serverSequence}` as AwikiMessageId,
      conversationId: group.id,
      conversationKind: 'group' as const,
      sentAt: 1_000,
      content: { kind: 'text' as const, text: `message ${serverSequence}` },
    }))
    const fake = fakeRemote({ conversations: [group], localHistory: sameTimestamp })
    fake.remote.getHistory = () => new Promise(() => undefined)
    const controller = new AwikiController(fake.remote)
    await controller.open()

    await controller.selectConversation(group.id)

    expect(controller.getSnapshot().messages.map(item => item.id)).toEqual(sameTimestamp.map(item => item.id))
    controller.close()
  })

  it('fails closed when a local page crosses the canonical conversation boundary', async () => {
    const fake = fakeRemote({
      localHistory: [{ ...message, conversationId: group.id, conversationKind: 'group' }],
    })
    const controller = new AwikiController(fake.remote)
    await controller.open()

    await expect(controller.selectConversation(direct.id)).resolves.toEqual({
      ok: false,
      error: 'AWiki 本地消息归属不一致，请重新打开会话。',
    })
    expect(controller.getSnapshot()).toMatchObject({ messages: [], localPending: false, refreshing: false })
    expect(fake.calls.filter(call => call.method === 'getHistory')).toHaveLength(0)
  })

  it('keeps current messages visible during a same-conversation local reread', async () => {
    const fake = fakeRemote({ localHistory: [message] })
    fake.remote.getHistory = () => new Promise(() => undefined)
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)

    const local = deferred<Awaited<ReturnType<typeof fake.remote.getLocalHistory>>>()
    fake.remote.getLocalHistory = () => local.promise
    const reopening = controller.selectConversation(direct.id)
    expect(controller.getSnapshot()).toMatchObject({ messages: [message], localPending: true })
    local.resolve(await carried(success({ items: [message], hasMore: false })))
    await reopening
    expect(controller.getSnapshot().messages).toEqual([message])
  })

  it('sends group text and captioned attachments through the group DID', async () => {
    const fake = fakeRemote()
    fake.remote.listConversations = () => carried(success({ items: [group], hasMore: false }))
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(group.id)
    await vi.waitFor(() => {
      expect(controller.getSnapshot().groupAccess?.status).toBe('available')
    })
    await controller.sendText('群消息', 'msg-12345678-1234-1234-1234-123456789abc' as AwikiMessageId)
    await controller.sendAttachment({
      fileName: 'a.txt',
      mimeType: 'text/plain',
      bytesBase64: 'YWJj',
      caption: '说明',
      clientMessageId: 'msg-abcdefab-cdef-abcd-efab-cdefabcdefab' as AwikiMessageId,
    })

    expect(fake.calls.find(call => call.method === 'sendText')?.request).toMatchObject({
      target: { kind: 'group', group: 'did:wba:group' },
      idempotencyKey: 'msg-12345678-1234-1234-1234-123456789abc',
    })
    expect(fake.calls.find(call => call.method === 'sendAttachment')?.request).toMatchObject({
      target: { kind: 'group', group: 'did:wba:group' },
      caption: '说明',
      idempotencyKey: 'msg-abcdefab-cdef-abcd-efab-cdefabcdefab',
    })
  })

  it('keeps failed and closed sends out of the visible history', async () => {
    const fake = fakeRemote()
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)
    await settleConversationRefresh(controller)
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
              id: 'old' as AwikiMessageId,
              sentAt: 1,
              content: { kind: 'text', text: '更早' },
            }, {
              ...message,
            }],
            hasMore: true,
          },
        },
      })
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()
    await controller.selectConversation(direct.id)
    await settleConversationRefresh(controller)
    expect(controller.getSnapshot().historyHasMore).toBe(true)

    await controller.loadOlderHistory()
    expect(fake.calls.at(-1)?.request).toEqual({ conversationId: direct.id, cursor: 'older-page' })
    expect(controller.getSnapshot().messages.map(value => value.id)).toEqual(['old', message.id])
    expect(controller.getSnapshot().historyHasMore).toBe(false)

    await controller.selectConversation(direct.id)
    expect(controller.getSnapshot().messages.map(value => value.id)).toEqual(['old', message.id])
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
    await expect(controller.selectConversation(direct.id)).resolves.toEqual({ ok: true, value: undefined })
    await settleConversationRefresh(controller)
    expect(controller.getSnapshot().error).toBe('刷新失败，当前显示本地数据。network：历史失败')

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

  it('keeps the last trustworthy group title across sparse polling and manual refresh', async () => {
    vi.useFakeTimers()
    const sparseGroup = { ...group, title: group.groupDid }
    const fake = fakeRemote({
      config: { pollIntervalMs: 10, attachmentMaxBytes: 1024 },
      conversations: [group],
    })
    let reads = 0
    fake.remote.listConversations = (request) => {
      fake.calls.push({ method: 'listConversations', request })
      reads += 1
      return carried(success({ items: [reads === 1 ? group : sparseGroup], hasMore: false }))
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()
    expect(controller.getSnapshot().conversations[0]?.title).toBe(group.title)

    await vi.advanceTimersByTimeAsync(10)
    expect(controller.getSnapshot().conversations[0]?.title).toBe(group.title)

    await controller.open()
    expect(controller.getSnapshot().conversations[0]?.title).toBe(group.title)
    controller.close()
  })

  it('keeps the last trustworthy direct display name across sparse polling and manual refresh', async () => {
    vi.useFakeTimers()
    const profiled = { ...direct, title: '厉飞雨', displayName: '厉飞雨', peerHandle: 'howard.awiki.ai' as AwikiHandle }
    const sparse = { ...profiled, title: 'howard.awiki.ai', displayName: undefined }
    const fake = fakeRemote({
      config: { pollIntervalMs: 10, attachmentMaxBytes: 1024 },
      conversations: [profiled],
    })
    let reads = 0
    fake.remote.listConversations = (request) => {
      fake.calls.push({ method: 'listConversations', request })
      reads += 1
      return carried(success({ items: [reads === 1 ? profiled : sparse], hasMore: false }))
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()
    expect(controller.getSnapshot().conversations[0]).toMatchObject({ title: '厉飞雨', displayName: '厉飞雨' })

    await vi.advanceTimersByTimeAsync(10)
    expect(controller.getSnapshot().conversations[0]).toMatchObject({ title: '厉飞雨', displayName: '厉飞雨' })

    await controller.open()
    expect(controller.getSnapshot().conversations[0]).toMatchObject({ title: '厉飞雨', displayName: '厉飞雨' })
    controller.close()
  })

  it('keeps the usable local roster quiet when background conversation polling is offline', async () => {
    vi.useFakeTimers()
    const fake = fakeRemote({ config: { pollIntervalMs: 10, attachmentMaxBytes: 1024 } })
    const controller = new AwikiController(fake.remote)
    await controller.open()
    fake.remote.listConversations = () => carried({
      ok: false,
      error: { code: 'network', message: 'The AWiki service could not be reached.' },
    })

    await vi.advanceTimersByTimeAsync(10)
    expect(controller.getSnapshot()).toMatchObject({
      status: 'ready',
      conversations: [direct],
      error: null,
    })
    controller.close()
  })

  it('accepts a real group rename and uses it for later sparse roster pages', async () => {
    vi.useFakeTimers()
    const renamed = { ...group, title: '发布协作群（新版）' }
    const sparseGroup = { ...group, title: group.groupDid }
    const fake = fakeRemote({
      config: { pollIntervalMs: 10, attachmentMaxBytes: 1024 },
      conversations: [group],
    })
    const pages = [group, renamed, sparseGroup]
    fake.remote.listConversations = (request) => {
      fake.calls.push({ method: 'listConversations', request })
      return carried(success({ items: [pages.shift() ?? sparseGroup], hasMore: false }))
    }
    const controller = new AwikiController(fake.remote)
    await controller.open()

    await vi.advanceTimersByTimeAsync(10)
    expect(controller.getSnapshot().conversations[0]?.title).toBe(renamed.title)
    await vi.advanceTimersByTimeAsync(10)
    expect(controller.getSnapshot().conversations[0]?.title).toBe(renamed.title)
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
    business.remote.getSession = () => Promise.resolve({ ok: true, value: { ok: false, error: { code: 'remote', message: '拒绝' } } })
    const second = new AwikiController(business.remote)
    expect(await second.open()).toEqual({ ok: false, error: 'remote：拒绝' })
  })

  it('does not expose Typert recovery boundary diagnostics to the user', async () => {
    installMemoryLocalStorage()
    const fake = fakeRemote({ identity: null, sessionStatus: 'unregistered' })
    const controller = new AwikiController(fake.remote)
    await controller.sendRecoveryOtp({ fullHandle: 'alice.awiki.info', phone: '13800000000' })
    fake.remote.prepareRecovery = () => Promise.resolve({
      ok: false,
      error: {
        code: 'invalid-response',
        message: 'typert gateway: awiki/prepareRecovery: business result failed boundary validation',
        details: {},
      },
    })

    await expect(controller.prepareRecovery({ phone: '13800000000', otp: '123456' })).resolves.toEqual({
      ok: false,
      error: '恢复信息已验证，但暂时无法读取恢复状态。请稍后重试。',
    })
    expect(controller.getSnapshot().error).toBeNull()
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

  it('reuses verified image bytes across drawer reopen and drops them on local-data clear', async () => {
    const fake = fakeRemote()
    const controller = new AwikiController(fake.remote)
    const image = {
      attachment: { id: 'image-a1' as never, fileName: 'preview.png', mimeType: 'image/png', size: 3, sha256: 'abc' },
      bytesBase64: 'YWJj',
    }
    let providerDownloads = 0
    fake.remote.downloadAttachment = (request) => {
      fake.calls.push({ method: 'downloadAttachment', request })
      providerDownloads += 1
      return carried(success(image))
    }

    await controller.open()
    await expect(controller.downloadAttachment('image-m1' as never, 'image-a1' as never))
      .resolves.toEqual({ ok: true, value: image })
    controller.close()
    await controller.open()
    await expect(controller.downloadAttachment('image-m1' as never, 'image-a1' as never))
      .resolves.toEqual({ ok: true, value: image })
    expect(providerDownloads).toBe(1)

    await expect(controller.clearLocalData({ confirmation: 'clear-awiki-local-data' }))
      .resolves.toMatchObject({ ok: true })
    await controller.downloadAttachment('image-m1' as never, 'image-a1' as never)
    expect(providerDownloads).toBe(2)
  })

  it('restores a verified image from browser storage after a full controller restart', async () => {
    const fake = fakeRemote()
    const image: AwikiDownloadedAttachment = {
      attachment: { id: 'image-a1' as never, fileName: 'preview.png', mimeType: 'image/png', size: 3, sha256: 'abc' },
      bytesBase64: 'YWJj',
    }
    let stored: AwikiDownloadedAttachment | undefined
    const persistent: AwikiBrowserImageCache = {
      read: vi.fn(() => Promise.resolve(stored)),
      write: vi.fn((_ownerDid, _messageId, value) => {
        stored = value
        return Promise.resolve()
      }),
      clear: vi.fn(() => {
        stored = undefined
        return Promise.resolve()
      }),
    }
    let providerDownloads = 0
    fake.remote.downloadAttachment = (request) => {
      fake.calls.push({ method: 'downloadAttachment', request })
      providerDownloads += 1
      return carried(success(image))
    }

    const first = new AwikiController(fake.remote, persistent)
    await first.open()
    await expect(first.downloadAttachment('image-m1' as never, 'image-a1' as never))
      .resolves.toEqual({ ok: true, value: image })
    await vi.waitFor(() => { expect(persistent.write).toHaveBeenCalledWith(identity.did, 'image-m1', image) })
    first.dispose()

    const second = new AwikiController(fake.remote, persistent)
    await second.open()
    await expect(second.downloadAttachment('image-m1' as never, 'image-a1' as never))
      .resolves.toEqual({ ok: true, value: image })
    expect(providerDownloads).toBe(1)
    expect(persistent.read).toHaveBeenCalledWith(identity.did, 'image-m1', 'image-a1')

    await expect(second.clearLocalData({ confirmation: 'clear-awiki-local-data' }))
      .resolves.toMatchObject({ ok: true })
    expect(persistent.clear).toHaveBeenCalledOnce()
  })
})
