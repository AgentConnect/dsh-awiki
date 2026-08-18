import { createHash, randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import type { Context, Logger } from '@deepseek-ai/cordis'
import { installModelSelection, type Agent, type AgentHandle, type ModelSelection } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type {} from '@deepseek-ai/dsh-workspace'
import type {
  AwikiSdkListenerClient,
  AwikiSdkListenerConversation,
  AwikiSdkListenerMessage,
  AwikiSdkListenerRealtimeSession,
  AwikiSdkListenerSyncReason,
} from './provider-api.ts'
import type {
  AwikiConversationId,
  AwikiDid,
  AwikiMessageId,
} from './types.ts'
import {
  AwikiListenerStateStore,
  type AwikiListenerConversationState,
  type AwikiListenerState,
} from './listener-state.ts'

const HISTORY_PAGE_LIMIT = 100
const MAX_HISTORY_PAGES = 20
const CONVERSATION_PAGE_LIMIT = 100
const MAX_CONVERSATION_PAGES = 20
const MAX_REPLY_CHARACTERS = 4_000
const LISTENER_SOURCE = '@awiki/dsh-plugin/listener'

const HELP_TEXT = [
  '可用命令：',
  '/new - 结束当前映射，下一条消息创建新的 DSH 会话',
  '/new <消息> - 在新的 DSH 会话中立即发送消息',
  '/status - 查看当前 DSH 会话',
  '/help - 查看命令帮助',
].join('\n')

const RESET_TEXT = '已重置。下一条普通消息将创建新的 DSH 会话。'
const NO_SESSION_TEXT = '当前还没有 DSH 会话。发送普通消息即可创建。'
const AGENT_FAILURE_TEXT = '本次 DSH 会话未能生成文本回复，请稍后重试。'
const UNKNOWN_COMMAND_TEXT = '无法识别该命令。发送 /help 查看可用命令。'

/** One opened DSH session returned by a replaceable runtime adapter. */
export interface AwikiListenerAgentSession {
  readonly sessionId: string
  prompt(text: string): Promise<string>
}

/** Agent boundary kept small so listener behavior can be tested without a model. */
export interface AwikiListenerAgentRuntime {
  open(sessionId?: string): Promise<AwikiListenerAgentSession>
  reset(sessionId?: string): Promise<void>
  dispose(): Promise<void>
}

/** Fully validated listener choices owned by the Host configuration. */
export interface AwikiListenerConfig {
  readonly allowedPeers: readonly string[]
  readonly workspacePath: string
  readonly stateRoot: string
}

/** One observable terminal result for the exact listener lifecycle. */
export type AwikiListenerTermination =
  | { readonly kind: 'stopped' }
  | { readonly kind: 'failed'; readonly error: unknown }

function textFromAssistant(message: Extract<SessionEvent, { type: 'assistant/message' }>): string {
  return message.data.message.content
    .filter((block): block is Extract<(typeof message.data.message.content)[number], { type: 'text' }> => block.type === 'text')
    .map(block => block.text)
    .join('')
}

/** Fold only the turn that claimed one exact submitted message. */
export function finalAssistantText(
  events: readonly SessionEvent[],
  messageId: string,
): string | undefined {
  const userIndex = events.findIndex(event => event.type === 'user/message' && event.data.id === messageId)
  if (userIndex < 0) return undefined
  let turn: number | undefined
  for (let index = userIndex; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type === 'turn/start') {
      turn = event.data.turn
      break
    }
  }
  if (turn === undefined) return undefined
  let output = ''
  let ended = false
  for (let index = userIndex + 1; index < events.length; index += 1) {
    const event = events[index]
    if (event?.type === 'assistant/message' && event.data.turn === turn) {
      const text = textFromAssistant(event)
      if (text !== '') output = text
    }
    if (event?.type === 'turn/end' && event.data.turn === turn) {
      ended = true
      break
    }
  }
  return ended && output.trim().length > 0 ? output.trim() : undefined
}

/** Production adapter around the registered Workspace and official Agent lifecycle. */
export class DshAwikiListenerAgentRuntime implements AwikiListenerAgentRuntime {
  private readonly handles = new Map<string, AgentHandle>()
  private workspace: Promise<Workspace> | undefined

  public constructor(
    private readonly ctx: Context,
    private readonly workspacePath: string,
  ) {}

  public async open(existingSessionId?: string): Promise<AwikiListenerAgentSession> {
    const workspace = await this.resolveWorkspace()
    const selection = this.currentSelection()
    const sessionId = existingSessionId ?? `session-${randomUUID()}`
    const id = SessionId(sessionId)
    let agent = this.ctx.agents.get(id)
    let openedHandle: AgentHandle | undefined
    if (agent === undefined) {
      const setup = (agentCtx: Context): void => {
        installModelSelection(agentCtx, { current: selection, assembled: undefined })
      }
      const handle = existingSessionId === undefined
        ? await this.ctx.agents.create({
            sessionId: id,
            meta: { cwd: workspace.path },
            agentOptions: { provider: selection.provider, model: selection.model },
            setup,
          })
        : await this.ctx.agents.resume({
            resumeSessionId: id,
            agentOptions: { provider: selection.provider, model: selection.model },
            setup,
          })
      openedHandle = handle
      this.handles.set(sessionId, handle)
      agent = handle.agent
    }
    try {
      await workspace.attachSession(id)
    } catch (error) {
      if (openedHandle !== undefined) {
        if (this.handles.get(sessionId) === openedHandle) this.handles.delete(sessionId)
        try {
          await openedHandle.dispose()
        } catch (disposeError) {
          throw new AggregateError([error, disposeError], 'awiki listener: failed to attach and dispose Agent session')
        }
      }
      throw error
    }
    return {
      sessionId,
      prompt: text => this.prompt(agent, text),
    }
  }

  public async reset(sessionId?: string): Promise<void> {
    if (sessionId === undefined) return
    const handle = this.handles.get(sessionId)
    if (handle === undefined) return
    this.handles.delete(sessionId)
    await handle.dispose()
  }

  public async dispose(): Promise<void> {
    const handles = [...this.handles.values()]
    this.handles.clear()
    const results = await Promise.allSettled(handles.map(handle => handle.dispose()))
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (rejected !== undefined) throw rejected.reason
  }

  private resolveWorkspace(): Promise<Workspace> {
    this.workspace ??= (async () => {
      await mkdir(this.workspacePath, { recursive: true })
      return await this.ctx.workspaceRegistry.resolveByPath(this.workspacePath)
        ?? await this.ctx.workspaceRegistry.create(this.workspacePath, 'AWiki')
    })()
    return this.workspace
  }

  private currentSelection(): ModelSelection {
    const defaults = this.ctx.get('agentDefaultModel')
    if (defaults === undefined) throw new Error('awiki listener: default Agent model is unavailable')
    return defaults.currentSelection()
  }

  private async prompt(agent: Agent, text: string): Promise<string> {
    await agent.whenIdle()
    const firstSeq = agent.session.seq
    const message = createUserMessage({
      content: [{ type: 'text', text }],
      source: { kind: 'plugin', plugin: LISTENER_SOURCE, form: 'relay' },
    })
    agent.followup(message)
    await agent.whenIdle()
    await this.ctx.sessions.flush(agent.session)
    const output = finalAssistantText(agent.session.events.slice(firstSeq), message.id)
    if (output === undefined) throw new Error('awiki listener: Agent produced no completed text response')
    return output
  }
}

function command(text: string): { readonly name: string; readonly argument: string } | undefined {
  const trimmed = text.trim()
  if (!trimmed.startsWith('/')) return undefined
  const separator = trimmed.search(/\s/u)
  const name = (separator < 0 ? trimmed : trimmed.slice(0, separator)).toLowerCase()
  return { name, argument: separator < 0 ? '' : trimmed.slice(separator).trim() }
}

function chunks(text: string): string[] {
  const characters = Array.from(text)
  const result: string[] = []
  for (let offset = 0; offset < characters.length; offset += MAX_REPLY_CHARACTERS) {
    result.push(characters.slice(offset, offset + MAX_REPLY_CHARACTERS).join(''))
  }
  return result.length === 0 ? [AGENT_FAILURE_TEXT] : result
}

function replyKey(messageId: string, index: number): string {
  const digest = createHash('sha256').update(messageId).digest('hex')
  return `awiki-listener-${digest}-${index}`
}

function allowedConversation(
  conversation: AwikiSdkListenerConversation,
  allowedPeers: ReadonlySet<string>,
): conversation is Extract<AwikiSdkListenerConversation, { kind: 'direct' }> {
  if (conversation.kind !== 'direct') return false
  if (allowedPeers.has(conversation.peerDid)) return true
  return conversation.peerHandle !== undefined && allowedPeers.has(conversation.peerHandle.toLowerCase())
}

function incomingFromPeer(
  message: AwikiSdkListenerMessage,
  conversation: Extract<AwikiSdkListenerConversation, { kind: 'direct' }>,
): boolean {
  return message.conversationId === conversation.id
    && message.conversationKind === 'direct'
    && !message.outgoing
    && message.senderDid === conversation.peerDid
}

function copyState(state: AwikiListenerState): AwikiListenerState {
  return {
    version: 1,
    conversations: Object.fromEntries(Object.entries(state.conversations).map(([id, route]) => [id, { ...route }])),
  }
}

interface ActiveRealtime {
  readonly generation: number
  readonly session: AwikiSdkListenerRealtimeSession
}

/** Reconcile authorized Direct text from Core history whenever realtime schedules synchronization. */
export class AwikiAgentListener {
  private readonly allowedPeers: ReadonlySet<string>
  private readonly store: AwikiListenerStateStore
  private readonly logger: Logger
  private readonly stateReady: Promise<void>
  private state: AwikiListenerState = { version: 1, conversations: {} }
  private stateMutation: Promise<void> = Promise.resolve()
  private syncMutation: Promise<void> = Promise.resolve()
  private readonly scheduledMessageIds = new Set<string>()
  private readonly conversationQueues = new Map<string, Promise<void>>()
  private lifecycle: Promise<void> | undefined
  private started: Promise<void> | undefined
  private resolveStarted: (() => void) | undefined
  private rejectStarted: ((error: unknown) => void) | undefined
  private lifecycleGeneration = 0
  private streamGeneration = 0
  private activeRealtime: ActiveRealtime | undefined
  private stopped = false
  private readonly termination: Promise<AwikiListenerTermination>
  private resolveTermination!: (result: AwikiListenerTermination) => void
  private terminationSettled = false

  public constructor(
    private readonly awiki: AwikiSdkListenerClient,
    private readonly agents: AwikiListenerAgentRuntime,
    private readonly config: AwikiListenerConfig,
    logger?: Logger,
    store?: AwikiListenerStateStore,
  ) {
    this.termination = new Promise(resolve => { this.resolveTermination = resolve })
    this.allowedPeers = new Set(config.allowedPeers.map(peer => peer.startsWith('did:') ? peer : peer.toLowerCase()))
    this.store = store ?? new AwikiListenerStateStore(config.stateRoot)
    this.logger = logger ?? ({
      debug() {}, info() {}, warn() {}, error() {}, name: 'awiki-listener',
    } as unknown as Logger)
    this.stateReady = this.store.load().then((state) => { this.state = state })
  }

  /** Start canonical startup sync followed by the single Core-owned realtime stream. */
  public start(): Promise<void> {
    if (this.started !== undefined) return this.started
    this.started = new Promise<void>((resolve, reject) => {
      this.resolveStarted = resolve
      this.rejectStarted = reject
    })
    const generation = ++this.lifecycleGeneration
    this.lifecycle = this.run(generation).then(
      () => { this.finishTermination({ kind: 'stopped' }) },
      (error: unknown) => {
        this.rejectStarted?.(error)
        this.rejectStarted = undefined
        this.finishTermination({ kind: 'failed', error })
        if (!this.stopped) {
          this.logger.warn('AWiki realtime listener stopped: %s', error instanceof Error ? error.message : 'unknown failure')
        }
      },
    )
    return this.started
  }

  /** Resolve once with either orderly shutdown or the exact terminal lifecycle failure. */
  public whenTerminated(): Promise<AwikiListenerTermination> {
    return this.termination
  }

  /** Deterministic canonical sync plus committed-history reconciliation for tests and recovery. */
  public async synchronizeOnce(reason: AwikiSdkListenerSyncReason): Promise<void> {
    await this.enqueueSync(async () => {
      await this.stateReady
      if (this.stopped) return
      await this.awiki.syncNow(reason)
      if (this.stopped) return
      await this.reconcileCommittedHistory()
    })
  }

  /** Wait until every message currently queued for a test or orderly shutdown settles. */
  public async whenIdle(): Promise<void> {
    await this.syncMutation
    while (this.conversationQueues.size > 0) {
      await Promise.allSettled([...this.conversationQueues.values()])
    }
    await this.stateMutation
  }

  /** Stop realtime first, fence late events, drain messages, then release listener-owned Agents. */
  public async dispose(): Promise<void> {
    if (this.stopped) return
    this.stopped = true
    this.lifecycleGeneration += 1
    this.streamGeneration += 1
    const active = this.activeRealtime
    this.activeRealtime = undefined
    await active?.session.stop().catch(() => undefined)
    await this.lifecycle
    this.resolveStarted?.()
    this.resolveStarted = undefined
    this.rejectStarted = undefined
    await this.whenIdle()
    await this.agents.dispose()
    this.finishTermination({ kind: 'stopped' })
  }

  private finishTermination(result: AwikiListenerTermination): void {
    if (this.terminationSettled) return
    this.terminationSettled = true
    this.resolveTermination(result)
  }

  private currentLifecycle(generation: number): boolean {
    return !this.stopped && this.lifecycleGeneration === generation
  }

  private async run(lifecycleGeneration: number): Promise<void> {
    await this.synchronize('session_start', lifecycleGeneration)
    if (!this.currentLifecycle(lifecycleGeneration)) return
    let active = await this.openRealtime(lifecycleGeneration)
    if (active === undefined) return
    this.resolveStarted?.()
    this.resolveStarted = undefined
    this.rejectStarted = undefined

    try {
      while (this.currentLifecycle(lifecycleGeneration)) {
        const event = await active.session.nextEvent()
        if (!this.currentLifecycle(lifecycleGeneration)
          || this.activeRealtime?.generation !== active.generation) return
        if (event === null) {
          this.activeRealtime = undefined
          this.streamGeneration += 1
          await active.session.stop()
          if (!this.currentLifecycle(lifecycleGeneration)) return
          await this.synchronize('websocket_reconnect', lifecycleGeneration)
          if (!this.currentLifecycle(lifecycleGeneration)) return
          const replacement = await this.openRealtime(lifecycleGeneration)
          if (replacement === undefined) return
          active = replacement
          continue
        }
        if (event.kind !== 'sync_required') continue
        await this.synchronize(
          event.cause === 'reconnected' ? 'websocket_reconnect' : 'websocket_hint',
          lifecycleGeneration,
        )
      }
    } finally {
      if (this.activeRealtime?.generation === active.generation) this.activeRealtime = undefined
      await active.session.stop().catch(() => undefined)
    }
  }

  private async openRealtime(lifecycleGeneration: number): Promise<ActiveRealtime | undefined> {
    const session = await this.awiki.startRealtime()
    if (!this.currentLifecycle(lifecycleGeneration)) {
      await session.stop().catch(() => undefined)
      return undefined
    }
    const active = { generation: ++this.streamGeneration, session }
    this.activeRealtime = active
    return active
  }

  private async synchronize(
    reason: AwikiSdkListenerSyncReason,
    lifecycleGeneration: number,
  ): Promise<void> {
    await this.enqueueSync(async () => {
      await this.stateReady
      if (!this.currentLifecycle(lifecycleGeneration)) return
      await this.awiki.syncNow(reason)
      if (!this.currentLifecycle(lifecycleGeneration)) return
      await this.reconcileCommittedHistory()
    })
  }

  private enqueueSync(operation: () => Promise<void>): Promise<void> {
    const pending = this.syncMutation.then(operation, operation)
    this.syncMutation = pending.catch(() => undefined)
    return pending
  }

  private async reconcileCommittedHistory(): Promise<void> {
    const conversations = await this.listConversations()
    await Promise.all(conversations
      .filter(conversation => allowedConversation(conversation, this.allowedPeers))
      .map(async (conversation) => {
        const messages = await this.unseenMessages(conversation)
        for (const message of messages) this.enqueue(conversation, message)
      }))
  }

  private async listConversations(): Promise<AwikiSdkListenerConversation[]> {
    const conversations: AwikiSdkListenerConversation[] = []
    let cursor: string | undefined
    for (let page = 0; page < MAX_CONVERSATION_PAGES; page += 1) {
      const result = await this.awiki.listConversations({
        limit: CONVERSATION_PAGE_LIMIT,
        ...(cursor === undefined ? {} : { cursor: cursor as never }),
      })
      conversations.push(...result.items)
      if (!result.hasMore || result.nextCursor === undefined) break
      cursor = String(result.nextCursor)
    }
    return conversations
  }

  private async unseenMessages(
    conversation: Extract<AwikiSdkListenerConversation, { kind: 'direct' }>,
  ): Promise<AwikiSdkListenerMessage[]> {
    await this.stateMutation
    const route = this.state.conversations[conversation.id]
    if (route !== undefined && route.peerDid !== conversation.peerDid) {
      this.logger.warn('AWiki listener refused a conversation whose peer DID changed')
      return []
    }
    const watermark = route?.lastProcessedMessageId
    const unread = conversation.unreadCount
    if (watermark === undefined && unread === 0) return []

    let cursor: string | undefined
    let history: AwikiSdkListenerMessage[] = []
    for (let page = 0; page < MAX_HISTORY_PAGES; page += 1) {
      const result = await this.awiki.getHistory({
        conversationId: conversation.id as AwikiConversationId,
        limit: HISTORY_PAGE_LIMIT,
        ...(cursor === undefined ? {} : { cursor: cursor as never }),
      })
      history = [...result.items, ...history]
      if (watermark !== undefined
        && history.some(message => message.id === watermark && incomingFromPeer(message, conversation))) break
      const incoming = history.filter(message => incomingFromPeer(message, conversation))
      if (watermark === undefined && new Set(incoming.map(message => message.id)).size >= unread) break
      if (!result.hasMore || result.nextCursor === undefined) break
      cursor = String(result.nextCursor)
    }

    const watermarkIndex = watermark === undefined
      ? -1
      : history.findLastIndex(message => message.id === watermark && incomingFromPeer(message, conversation))
    const incomingIds = new Set<string>()
    const incoming = history.filter((message) => {
      if (!incomingFromPeer(message, conversation) || incomingIds.has(message.id)) return false
      incomingIds.add(message.id)
      return true
    })
    const boundaryFound = watermark === undefined ? incoming.length >= unread : watermarkIndex >= 0
    if (!boundaryFound) {
      this.logger.warn('AWiki listener stopped reconciliation at the bounded history boundary')
      return []
    }
    let candidates = watermarkIndex >= 0
      ? history.slice(watermarkIndex + 1)
      : incoming.slice(-unread)
    candidates = candidates.filter(message => message.id !== watermark && incomingFromPeer(message, conversation))
    const seen = new Set<string>()
    return candidates.filter((message) => {
      if (seen.has(message.id)) return false
      seen.add(message.id)
      return true
    })
  }

  private enqueue(
    conversation: Extract<AwikiSdkListenerConversation, { kind: 'direct' }>,
    message: AwikiSdkListenerMessage,
  ): void {
    if (this.scheduledMessageIds.has(message.id)) return
    this.scheduledMessageIds.add(message.id)
    const previous = this.conversationQueues.get(conversation.id) ?? Promise.resolve()
    const queued = previous
      .then(async () => {
        try {
          await this.process(conversation, message)
        } catch (error) {
          this.logger.warn('AWiki listener message failed: %s', error instanceof Error ? error.message : 'unknown failure')
          throw error
        }
      })
      .finally(() => {
        this.scheduledMessageIds.delete(message.id)
        if (this.conversationQueues.get(conversation.id) === queued) {
          this.conversationQueues.delete(conversation.id)
        }
      })
    this.conversationQueues.set(conversation.id, queued)
    void queued.catch(() => undefined)
  }

  private async process(
    conversation: Extract<AwikiSdkListenerConversation, { kind: 'direct' }>,
    message: AwikiSdkListenerMessage,
  ): Promise<void> {
    if (this.stopped) return
    await this.stateMutation
    const route = this.state.conversations[conversation.id]
    if (route?.lastProcessedMessageId === message.id) return

    if (message.content.kind !== 'text') {
      await this.commit(conversation, message.id, route?.sessionId)
      return
    }
    const parsed = command(message.content.text)
    if (parsed?.name === '/help') {
      await this.reply(conversation, message.id, HELP_TEXT)
      await this.commit(conversation, message.id, route?.sessionId)
      return
    }
    if (parsed?.name === '/status') {
      await this.reply(
        conversation,
        message.id,
        route?.sessionId === undefined ? NO_SESSION_TEXT : `当前 DSH 会话：${route.sessionId}`,
      )
      await this.commit(conversation, message.id, route?.sessionId)
      return
    }
    if (parsed?.name === '/new' && parsed.argument.length === 0) {
      await this.agents.reset(route?.sessionId)
      await this.reply(conversation, message.id, RESET_TEXT)
      await this.commit(conversation, message.id, undefined)
      return
    }
    if (parsed !== undefined && parsed.name !== '/new') {
      await this.reply(conversation, message.id, UNKNOWN_COMMAND_TEXT)
      await this.commit(conversation, message.id, route?.sessionId)
      return
    }

    const prompt = parsed?.name === '/new' ? parsed.argument : message.content.text
    if (parsed?.name === '/new') await this.agents.reset(route?.sessionId)
    let sessionId = parsed?.name === '/new' ? undefined : route?.sessionId
    let output = AGENT_FAILURE_TEXT
    try {
      const session = await this.agents.open(sessionId)
      sessionId = session.sessionId
      await this.updateRoute(conversation, { sessionId })
      output = await session.prompt(prompt)
    } catch {
      output = AGENT_FAILURE_TEXT
    }
    await this.reply(conversation, message.id, output)
    await this.commit(conversation, message.id, sessionId)
  }

  private async reply(
    conversation: Extract<AwikiSdkListenerConversation, { kind: 'direct' }>,
    messageId: string,
    text: string,
  ): Promise<void> {
    const parts = chunks(text)
    for (const [index, part] of parts.entries()) {
      await this.awiki.sendText({
        target: { kind: 'direct', peer: conversation.peerDid },
        text: part,
        idempotencyKey: replyKey(messageId, index),
      })
    }
  }

  private async commit(
    conversation: Extract<AwikiSdkListenerConversation, { kind: 'direct' }>,
    messageId: string,
    sessionId: string | undefined,
  ): Promise<void> {
    await this.updateRoute(conversation, { sessionId, lastProcessedMessageId: messageId })
    try {
      await this.awiki.markConversationRead(conversation.id as AwikiConversationId)
    } catch {
      this.logger.debug('AWiki listener could not mark a processed conversation as read')
    }
  }

  private updateRoute(
    conversation: Extract<AwikiSdkListenerConversation, { kind: 'direct' }>,
    update: { readonly sessionId?: string | undefined; readonly lastProcessedMessageId?: string },
  ): Promise<void> {
    const operation = this.stateMutation.then(async () => {
      const current = this.state.conversations[conversation.id]
      const route: AwikiListenerConversationState = {
        peerDid: conversation.peerDid,
        ...(update.sessionId === undefined ? {} : { sessionId: update.sessionId }),
        ...(update.lastProcessedMessageId === undefined
          ? current?.lastProcessedMessageId === undefined ? {} : { lastProcessedMessageId: current.lastProcessedMessageId }
          : { lastProcessedMessageId: update.lastProcessedMessageId }),
      }
      this.state = {
        version: 1,
        conversations: { ...this.state.conversations, [conversation.id]: route },
      }
      await this.store.save(copyState(this.state))
    })
    this.stateMutation = operation.catch(() => undefined)
    return operation
  }
}
