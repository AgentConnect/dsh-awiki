import { lstat, mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent, AgentHandle } from '@deepseek-ai/dsh-agent'
import { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import {
  AwikiAgentListener,
  DshAwikiListenerAgentRuntime,
  finalAssistantText,
  type AwikiListenerAgentRuntime,
  type AwikiListenerAgentSession,
} from '../src/listener.ts'
import { AwikiListenerStateStore } from '../src/listener-state.ts'
import type {
  AwikiSdkListenerClient,
  AwikiSdkListenerConversation,
  AwikiSdkListenerMessage,
  AwikiSdkListenerRealtimeEvent,
  AwikiSdkListenerRealtimeSession,
  AwikiSdkListenerSyncReason,
} from '../src/provider-api.ts'
import type {
  AwikiConversationId,
  AwikiDid,
  AwikiMessage,
  AwikiMessageId,
  AwikiSendTextRequest,
} from '../src/types.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

const conversation: Extract<AwikiSdkListenerConversation, { kind: 'direct' }> = {
  kind: 'direct',
  id: 'conversation-1',
  peerDid: 'did:awiki:bob',
  peerHandle: 'Bob@awiki.example',
  unreadCount: 1,
  lastMessageAt: 1,
}

function incoming(id: string, text: string, sentAt: number): AwikiSdkListenerMessage {
  return {
    id,
    conversationId: conversation.id,
    conversationKind: 'direct',
    senderDid: conversation.peerDid,
    sentAt,
    outgoing: false,
    content: { kind: 'text', text },
  }
}

class FakeRealtime implements AwikiSdkListenerRealtimeSession {
  readonly queued: Array<AwikiSdkListenerRealtimeEvent | null> = []
  stopCalls = 0
  private waiter: ((event: AwikiSdkListenerRealtimeEvent | null) => void) | undefined

  constructor(readonly name: string, private readonly operations: string[]) {}

  nextEvent(): Promise<AwikiSdkListenerRealtimeEvent | null> {
    const event = this.queued.shift()
    if (event !== undefined || this.queued.length > 0) return Promise.resolve(event ?? null)
    return new Promise(resolve => { this.waiter = resolve })
  }

  push(event: AwikiSdkListenerRealtimeEvent | null): void {
    const waiter = this.waiter
    if (waiter === undefined) {
      this.queued.push(event)
      return
    }
    this.waiter = undefined
    waiter(event)
  }

  stop(): Promise<void> {
    this.stopCalls += 1
    this.operations.push(`stop:${this.name}`)
    const waiter = this.waiter
    this.waiter = undefined
    waiter?.(null)
    return Promise.resolve()
  }
}

class FakeAwiki implements AwikiSdkListenerClient {
  readonly sent: AwikiSendTextRequest[] = []
  readonly marked: AwikiConversationId[] = []
  readonly history: AwikiSdkListenerMessage[] = []
  readonly syncReasons: AwikiSdkListenerSyncReason[] = []
  readonly operations: string[] = []
  readonly realtimeQueue: FakeRealtime[] = []
  conversations: AwikiSdkListenerConversation[] = [conversation]
  sendFailures = 0
  syncHook: (() => Promise<void>) | undefined

  syncNow(reason: AwikiSdkListenerSyncReason): Promise<void> {
    this.syncReasons.push(reason)
    this.operations.push(`sync:${reason}`)
    return this.syncHook?.() ?? Promise.resolve()
  }

  startRealtime(): Promise<AwikiSdkListenerRealtimeSession> {
    const realtime = this.realtimeQueue.shift() ?? new FakeRealtime(`realtime-${this.syncReasons.length}`, this.operations)
    this.operations.push(`start:${realtime.name}`)
    return Promise.resolve(realtime)
  }

  listConversations() {
    this.operations.push('list')
    return Promise.resolve({ items: this.conversations, hasMore: false })
  }

  getHistory() {
    this.operations.push('history')
    return Promise.resolve({ items: [...this.history], hasMore: false })
  }

  markConversationRead(conversationId: AwikiConversationId) {
    this.marked.push(conversationId)
    return Promise.resolve(1)
  }

  sendText(request: AwikiSendTextRequest): Promise<AwikiMessage> {
    this.sent.push(request)
    if (this.sendFailures > 0) {
      this.sendFailures -= 1
      return Promise.reject(new Error('injected send failure'))
    }
    return Promise.resolve({
      id: `outgoing-${this.sent.length}` as AwikiMessageId,
      conversationId: conversation.id as AwikiConversationId,
      conversationKind: 'direct',
      senderDid: 'did:awiki:listener' as AwikiDid,
      sentAt: Date.now(),
      outgoing: true,
      content: { kind: 'text', text: request.text },
    })
  }

  append(message: AwikiSdkListenerMessage): void {
    this.history.push(message)
    const unreadCount = this.history.filter(item => !item.outgoing).length
    this.conversations = [{ ...conversation, unreadCount, lastMessageAt: message.sentAt }]
  }
}

class FakeAgents implements AwikiListenerAgentRuntime {
  readonly opened: Array<string | undefined> = []
  readonly prompts: string[] = []
  readonly resets: Array<string | undefined> = []
  disposed = 0
  private next = 1

  open(sessionId?: string): Promise<AwikiListenerAgentSession> {
    this.opened.push(sessionId)
    const resolved = sessionId ?? `session-${this.next++}`
    return Promise.resolve({
      sessionId: resolved,
      prompt: (text) => {
        this.prompts.push(text)
        return Promise.resolve(`回复：${text}`)
      },
    })
  }

  reset(sessionId?: string): Promise<void> {
    this.resets.push(sessionId)
    return Promise.resolve()
  }

  dispose(): Promise<void> {
    this.disposed += 1
    return Promise.resolve()
  }
}

async function fixture(allowedPeers: readonly string[] = ['bob@awiki.example']) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-awiki-listener-'))
  roots.push(root)
  const awiki = new FakeAwiki()
  const agents = new FakeAgents()
  const listener = new AwikiAgentListener(awiki, agents, {
    allowedPeers,
    workspacePath: join(root, 'workspace'),
    stateRoot: root,
  })
  return { root, awiki, agents, listener }
}

async function eventually(assertion: () => void): Promise<void> {
  let error: unknown
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      assertion()
      return
    } catch (caught) {
      error = caught
      await new Promise(resolve => setTimeout(resolve, 2))
    }
  }
  throw error
}

describe('AWiki Agent listener', () => {
  it('creates and then continues one DSH session for an authorized Direct peer', async () => {
    const f = await fixture()
    f.awiki.append(incoming('message-1', '你好', 1))
    await f.listener.synchronizeOnce('websocket_hint')
    await f.listener.whenIdle()

    expect(f.agents.opened).toEqual([undefined])
    expect(f.agents.prompts).toEqual(['你好'])
    expect(f.awiki.sent[0]).toMatchObject({
      target: { kind: 'direct', peer: conversation.peerDid },
      text: '回复：你好',
    })
    expect(f.awiki.sent[0]?.idempotencyKey).toMatch(/^awiki-listener-[a-f0-9]{64}-0$/u)

    f.awiki.append(incoming('message-2', '继续', 2))
    await f.listener.synchronizeOnce('websocket_hint')
    await f.listener.whenIdle()
    expect(f.agents.opened).toEqual([undefined, 'session-1'])
    expect(f.agents.prompts).toEqual(['你好', '继续'])
    expect(f.awiki.marked).toEqual([conversation.id, conversation.id])
    await f.listener.dispose()
  })

  it('resumes the persisted route after restart without replaying the watermark', async () => {
    const f = await fixture()
    f.awiki.append(incoming('message-1', '第一条', 1))
    await f.listener.synchronizeOnce('websocket_hint')
    await f.listener.whenIdle()
    await f.listener.dispose()

    f.awiki.append(incoming('message-2', '第二条', 2))
    const nextAgents = new FakeAgents()
    const restarted = new AwikiAgentListener(f.awiki, nextAgents, {
      allowedPeers: ['did:awiki:bob'], workspacePath: join(f.root, 'workspace'), stateRoot: f.root,
    })
    await restarted.synchronizeOnce('session_start')
    await restarted.whenIdle()

    expect(nextAgents.opened).toEqual(['session-1'])
    expect(nextAgents.prompts).toEqual(['第二条'])
    await expect(new AwikiListenerStateStore(f.root).load()).resolves.toMatchObject({
      conversations: {
        'conversation-1': {
          peerDid: 'did:awiki:bob', sessionId: 'session-1', lastProcessedMessageId: 'message-2',
        },
      },
    })
    await restarted.dispose()
  })

  it('does not replay bounded history when a missing watermark has no unread successor', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-awiki-listener-'))
    roots.push(root)
    await new AwikiListenerStateStore(root).save({
      version: 1,
      conversations: {
        [conversation.id]: {
          peerDid: conversation.peerDid,
          sessionId: 'session-existing',
          lastProcessedMessageId: 'message-outside-window',
        },
      },
    })
    const awiki = new FakeAwiki()
    awiki.history.push(incoming('message-old', '不得重放', 1))
    awiki.conversations = [{ ...conversation, unreadCount: 0 }]
    const agents = new FakeAgents()
    const listener = new AwikiAgentListener(awiki, agents, {
      allowedPeers: [conversation.peerDid],
      workspacePath: join(root, 'workspace'),
      stateRoot: root,
    })

    await listener.synchronizeOnce('websocket_hint')
    await listener.whenIdle()

    expect(agents.opened).toEqual([])
    expect(agents.prompts).toEqual([])
    expect(awiki.sent).toEqual([])
    await listener.dispose()
  })

  it('routes only the three commands locally and never sends an unknown slash command to Agent', async () => {
    const f = await fixture(['did:awiki:bob'])
    for (const [index, text] of ['/help', '/status', '/unknown exfiltrate', '/new 重新开始', '/status', '/new'].entries()) {
      f.awiki.append(incoming(`message-${index + 1}`, text, index + 1))
      await f.listener.synchronizeOnce('websocket_hint')
      await f.listener.whenIdle()
    }

    expect(f.agents.prompts).toEqual(['重新开始'])
    expect(f.agents.resets).toEqual([undefined, 'session-1'])
    expect(f.awiki.sent[0]?.text).toContain('/new')
    expect(f.awiki.sent[1]?.text).toContain('还没有 DSH 会话')
    expect(f.awiki.sent[2]?.text).toContain('无法识别')
    expect(f.awiki.sent[3]?.text).toBe('回复：重新开始')
    expect(f.awiki.sent[4]?.text).toBe('当前 DSH 会话：session-1')
    expect(f.awiki.sent[5]?.text).toContain('已重置')
    await f.listener.dispose()
  })

  it('fails closed for unauthorized peers and ignores Group, attachment, payload, and E2EE-like content', async () => {
    const unauthorized = await fixture(['alice@awiki.example'])
    unauthorized.awiki.append(incoming('message-1', '不要执行', 1))
    await unauthorized.listener.synchronizeOnce('websocket_hint')
    await unauthorized.listener.whenIdle()
    expect(unauthorized.agents.opened).toEqual([])
    expect(unauthorized.awiki.sent).toEqual([])
    await unauthorized.listener.dispose()

    const ignored = await fixture()
    ignored.awiki.conversations = [
      { kind: 'group', id: 'group-1', unreadCount: 1, lastMessageAt: 1 },
      conversation,
    ]
    ignored.awiki.append({ ...incoming('message-2', 'opaque', 2), content: { kind: 'ignored' } })
    await ignored.listener.synchronizeOnce('websocket_hint')
    await ignored.listener.whenIdle()
    expect(ignored.agents.opened).toEqual([])
    expect(ignored.awiki.sent).toEqual([])
    await expect(new AwikiListenerStateStore(ignored.root).load()).resolves.toMatchObject({
      conversations: { 'conversation-1': { lastProcessedMessageId: 'message-2' } },
    })
    await ignored.listener.dispose()
  })

  it('advances only a continuous successful watermark prefix and retries the blocked batch in order', async () => {
    const f = await fixture()
    f.awiki.append(incoming('message-1', '一', 1))
    f.awiki.append(incoming('message-2', '二', 2))
    f.awiki.sendFailures = 1
    await f.listener.synchronizeOnce('websocket_hint')
    await f.listener.whenIdle()

    expect(f.agents.prompts).toEqual(['一'])
    await expect(new AwikiListenerStateStore(f.root).load()).resolves.toMatchObject({
      conversations: { 'conversation-1': { sessionId: 'session-1' } },
    })
    expect((await new AwikiListenerStateStore(f.root).load()).conversations['conversation-1']?.lastProcessedMessageId)
      .toBeUndefined()

    await f.listener.synchronizeOnce('websocket_hint')
    await f.listener.whenIdle()
    expect(f.agents.prompts).toEqual(['一', '一', '二'])
    expect((await new AwikiListenerStateStore(f.root).load()).conversations['conversation-1']?.lastProcessedMessageId)
      .toBe('message-2')
    await f.listener.dispose()
  })

  it('maps realtime causes to canonical sync and recovers null as stop then reconnect-sync then replacement', async () => {
    const f = await fixture()
    const first = new FakeRealtime('first', f.awiki.operations)
    const second = new FakeRealtime('second', f.awiki.operations)
    f.awiki.realtimeQueue.push(first, second)
    await f.listener.start()
    expect(f.awiki.operations.slice(0, 4)).toEqual(['sync:session_start', 'list', 'history', 'start:first'])

    first.push({ kind: 'sync_required', cause: 'connection_ready', dirty: false, gapDetected: false })
    await eventually(() => expect(f.awiki.syncReasons).toHaveLength(2))
    first.push({ kind: 'sync_required', cause: 'message', dirty: true, gapDetected: true })
    await eventually(() => expect(f.awiki.syncReasons).toHaveLength(3))
    first.push({ kind: 'sync_required', cause: 'reconnected', dirty: false, gapDetected: false })
    await eventually(() => expect(f.awiki.syncReasons).toHaveLength(4))
    first.push(null)
    await eventually(() => expect(f.awiki.operations).toContain('start:second'))

    expect(f.awiki.syncReasons).toEqual([
      'session_start', 'websocket_hint', 'websocket_hint', 'websocket_reconnect', 'websocket_reconnect',
    ])
    const recovery = f.awiki.operations.slice(f.awiki.operations.lastIndexOf('stop:first'), f.awiki.operations.indexOf('start:second') + 1)
    expect(recovery).toEqual(['stop:first', 'sync:websocket_reconnect', 'list', 'history', 'start:second'])

    const count = f.awiki.syncReasons.length
    first.push({ kind: 'sync_required', cause: 'message', dirty: true, gapDetected: true })
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(f.awiki.syncReasons).toHaveLength(count)
    await f.listener.dispose()
  })

  it('serializes concurrent sync requests before reading committed history', async () => {
    const f = await fixture()
    let active = 0
    let maximum = 0
    const releases: Array<() => void> = []
    f.awiki.syncHook = () => new Promise<void>((resolve) => {
      active += 1
      maximum = Math.max(maximum, active)
      releases.push(() => { active -= 1; resolve() })
    })
    const first = f.listener.synchronizeOnce('websocket_hint')
    const second = f.listener.synchronizeOnce('websocket_reconnect')
    await eventually(() => expect(releases).toHaveLength(1))
    releases.shift()?.()
    await eventually(() => expect(releases).toHaveLength(1))
    releases.shift()?.()
    await Promise.all([first, second])
    expect(maximum).toBe(1)
    expect(f.awiki.operations).toEqual([
      'sync:websocket_hint', 'list', 'history', 'sync:websocket_reconnect', 'list', 'history',
    ])
    await f.listener.dispose()
  })
})

describe('DSH Workspace-backed Agent runtime', () => {
  it('uses mkdir then resolve/create, canonical Session cwd, and attach for create and resume', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-awiki-workspace-'))
    roots.push(root)
    const workspacePath = join(root, 'nested', '..', 'awiki')
    const calls: string[] = []
    let workspace: Workspace | undefined
    const attachSession = async (id: ReturnType<typeof SessionId>) => { calls.push(`attach:${String(id)}`) }
    const registry = {
      async resolveByPath(path: string) {
        expect((await lstat(path)).isDirectory()).toBe(true)
        calls.push('resolve')
        return workspace
      },
      async create(path: string) {
        calls.push('create')
        workspace = { path: await realpath(path), attachSession } as Workspace
        return workspace
      },
    }
    const agent = { session: { seq: 0, events: [] }, whenIdle: () => Promise.resolve() } as unknown as Agent
    const handle = { agent, dispose: () => Promise.resolve() } as AgentHandle
    const agents = {
      get: () => undefined,
      create: async (options: { readonly meta?: { readonly cwd?: string } }) => {
        calls.push('agent:create')
        expect(options.meta?.cwd).toBe(await realpath(workspacePath))
        return handle
      },
      resume: async () => { calls.push('agent:resume'); return handle },
    }
    const ctx = {
      workspaceRegistry: registry,
      agents,
      get: (name: string) => name === 'agentDefaultModel'
        ? { currentSelection: () => ({ provider: 'provider', model: 'model' }) }
        : undefined,
    } as unknown as Context

    const created = new DshAwikiListenerAgentRuntime(ctx, workspacePath)
    const opened = await created.open()
    expect(calls).toEqual(['resolve', 'create', 'agent:create', `attach:${opened.sessionId}`])
    await created.dispose()

    calls.length = 0
    const resumed = new DshAwikiListenerAgentRuntime(ctx, workspacePath)
    await resumed.open('session-existing')
    expect(calls).toEqual(['resolve', 'agent:resume', 'attach:session-existing'])
    await resumed.dispose()
  })

  it('disposes only the newly opened handle when Workspace attachment fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-awiki-workspace-'))
    roots.push(root)
    const workspacePath = join(root, 'awiki')
    const agent = { session: { seq: 0, events: [] }, whenIdle: () => Promise.resolve() } as unknown as Agent
    let createdDisposals = 0
    const handle = {
      agent,
      dispose: async () => { createdDisposals += 1 },
    } as AgentHandle
    const workspace = {
      path: workspacePath,
      attachSession: async () => { throw new Error('injected attach failure') },
    } as unknown as Workspace
    const context = (existingAgent: Agent | undefined) => ({
      workspaceRegistry: {
        resolveByPath: async () => workspace,
        create: async () => workspace,
      },
      agents: {
        get: () => existingAgent,
        create: async () => handle,
        resume: async () => handle,
      },
      get: (name: string) => name === 'agentDefaultModel'
        ? { currentSelection: () => ({ provider: 'provider', model: 'model' }) }
        : undefined,
    } as unknown as Context)

    const newlyOpened = new DshAwikiListenerAgentRuntime(context(undefined), workspacePath)
    await expect(newlyOpened.open('session-new')).rejects.toThrow('injected attach failure')
    expect(createdDisposals).toBe(1)
    await newlyOpened.dispose()
    expect(createdDisposals).toBe(1)

    const externallyOwned = new DshAwikiListenerAgentRuntime(context(agent), workspacePath)
    await expect(externallyOwned.open('session-live')).rejects.toThrow('injected attach failure')
    await externallyOwned.dispose()
    expect(createdDisposals).toBe(1)
  })
})

describe('DSH Agent response folding', () => {
  it('returns only the final text from the turn that claimed the submitted message', () => {
    const events = [
      { type: 'turn/start', seq: 0, time: 1, data: { turn: 1 } },
      { type: 'user/message', seq: 1, time: 1, data: { id: 'other', role: 'user', source: { kind: 'user' }, content: [] } },
      { type: 'assistant/message', seq: 2, time: 1, data: { turn: 1, step: 1, message: { id: 'a', role: 'assistant', source: { kind: 'model', provider: 'p', model: 'm' }, content: [{ type: 'text', text: '旧回复' }] } } },
      { type: 'turn/end', seq: 3, time: 1, data: { turn: 1, reason: { kind: 'completed' } } },
      { type: 'turn/start', seq: 4, time: 2, data: { turn: 2 } },
      { type: 'user/message', seq: 5, time: 2, data: { id: 'wanted', role: 'user', source: { kind: 'user' }, content: [] } },
      { type: 'assistant/message', seq: 6, time: 2, data: { turn: 2, step: 1, message: { id: 'b', role: 'assistant', source: { kind: 'model', provider: 'p', model: 'm' }, content: [{ type: 'text', text: '中间' }] } } },
      { type: 'assistant/message', seq: 7, time: 2, data: { turn: 2, step: 2, message: { id: 'c', role: 'assistant', source: { kind: 'model', provider: 'p', model: 'm' }, content: [{ type: 'text', text: '最终回复' }] } } },
      { type: 'turn/end', seq: 8, time: 2, data: { turn: 2, reason: { kind: 'completed' } } },
    ] as SessionEvent[]

    expect(finalAssistantText(events, 'wanted')).toBe('最终回复')
    expect(finalAssistantText(events, 'missing')).toBeUndefined()
  })
})
