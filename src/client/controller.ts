/** React-free browser controller for the deployment's one AWiki identity. */

import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {
  AwikiAttachmentId,
  AwikiConversation,
  AwikiConversationId,
  AwikiDirectConversation,
  AwikiDownloadedAttachment,
  AwikiHistoryRequest,
  AwikiIdentity,
  AwikiMessage,
  AwikiMessageId,
  AwikiMarkConversationReadRequest,
  AwikiPage,
  AwikiPageRequest,
  AwikiResolvePeerRequest,
  AwikiResolvedPeer,
  AwikiRegistrationOtpRequest,
  AwikiRegistrationOtpResult,
  AwikiRegistrationRequest,
  AwikiResult,
  AwikiRuntimeConfig,
  AwikiSendAttachmentRequest,
  AwikiSendTextRequest,
  AwikiUpdateDisplayNameRequest,
} from 'dsh-awiki/types'

/** The generated `remote.awiki` methods consumed by this controller. */
export interface AwikiRemote {
  /** Read browser-safe Host polling policy. */
  getConfig: () => Promise<RemoteResult<AwikiResult<AwikiRuntimeConfig>>>
  /** Read the deployment's public identity, if registered. */
  getIdentity: () => Promise<RemoteResult<AwikiResult<AwikiIdentity | null>>>
  /** Request one registration verification code. */
  sendRegistrationOtp: (request: AwikiRegistrationOtpRequest) => Promise<RemoteResult<AwikiResult<AwikiRegistrationOtpResult>>>
  /** Register and persist the deployment's sole identity. */
  registerIdentity: (request: AwikiRegistrationRequest) => Promise<RemoteResult<AwikiResult<AwikiIdentity>>>
  /** Update the deployment identity's public WNS display name. */
  updateDisplayName: (request: AwikiUpdateDisplayNameRequest) => Promise<RemoteResult<AwikiResult<AwikiIdentity>>>
  /** Resolve one Handle or DID before opening a direct chat. */
  resolvePeer: (request: AwikiResolvePeerRequest) => Promise<RemoteResult<AwikiResult<AwikiResolvedPeer>>>
  /** List one page of direct and group conversations. */
  listConversations: (request?: AwikiPageRequest) => Promise<RemoteResult<AwikiResult<AwikiPage<AwikiConversation>>>>
  /** Read one conversation history page. */
  getHistory: (request: AwikiHistoryRequest) => Promise<RemoteResult<AwikiResult<AwikiPage<AwikiMessage>>>>
  /** Mark one conversation's current inbox entries as read. */
  markConversationRead: (request: AwikiMarkConversationReadRequest) => Promise<RemoteResult<AwikiResult<number>>>
  /** Send one idempotent text message. */
  sendText: (request: AwikiSendTextRequest) => Promise<RemoteResult<AwikiResult<AwikiMessage>>>
  /** Send one idempotent attachment message. */
  sendAttachment: (request: AwikiSendAttachmentRequest) => Promise<RemoteResult<AwikiResult<AwikiMessage>>>
  /** Download one attachment by containing message and attachment identity. */
  downloadAttachment: (request: {
    attachmentId: AwikiAttachmentId
    messageId: AwikiMessageId
  }) => Promise<RemoteResult<AwikiResult<AwikiDownloadedAttachment>>>
}

/** Load phase of the drawer's Host-owned data. */
export type AwikiControllerStatus = 'cold' | 'loading' | 'ready' | 'error'

/** Immutable drawer data published through the framework hook binder. */
export interface AwikiView {
  readonly status: AwikiControllerStatus
  readonly identity: AwikiIdentity | null
  readonly conversations: readonly AwikiConversation[]
  readonly conversationsHasMore: boolean
  readonly selectedConversationId: AwikiConversationId | null
  readonly messages: readonly AwikiMessage[]
  readonly historyHasMore: boolean
  readonly pending: string | null
  readonly error: string | null
  readonly attachmentMaxBytes: number
}

/** Settled user operation result with one display-safe failure. */
export type AwikiActionResult<Value = void> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly error: string }

const INITIAL_VIEW: AwikiView = Object.freeze({
  status: 'cold',
  identity: null,
  conversations: Object.freeze([]),
  conversationsHasMore: false,
  selectedConversationId: null,
  messages: Object.freeze([]),
  historyHasMore: false,
  pending: null,
  error: null,
  attachmentMaxBytes: 0,
})

/** Flatten the carrier and business result once for every controller caller. */
async function call<Value>(operation: () => Promise<RemoteResult<AwikiResult<Value>>>): Promise<AwikiActionResult<Value>> {
  try {
    const carried = await operation()
    if (!carried.ok) return { ok: false, error: `连接 AWiki Host 失败：${carried.error.message}` }
    if (!carried.value.ok) {
      return { ok: false, error: `${carried.value.error.code}：${carried.value.error.message}` }
    }
    return { ok: true, value: carried.value.value }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `AWiki 调用失败：${error.message}` : 'AWiki 调用失败',
    }
  }
}

/** Append unique values while retaining existing references. */
function appendUnique<T>(current: readonly T[], incoming: readonly T[], id: (value: T) => string): readonly T[] {
  const seen = new Set(current.map(id))
  const appended: T[] = []
  for (const value of incoming) {
    const key = id(value)
    if (seen.has(key)) continue
    seen.add(key)
    appended.push(value)
  }
  return [...current, ...appended]
}

/** Prepend unique values while retaining the existing tail. */
function prependUnique<T>(current: readonly T[], incoming: readonly T[], id: (value: T) => string): readonly T[] {
  const seen = new Set(current.map(id))
  const prepended: T[] = []
  for (const value of incoming) {
    const key = id(value)
    if (seen.has(key)) continue
    seen.add(key)
    prepended.push(value)
  }
  return [...prepended, ...current]
}

/** Strip surrounding space and a leading @ from a Handle the user typed. */
function normalizeHandle(value: string): string {
  return value.trim().replace(/^@+/u, '')
}

/** Compare a typed Handle against the deployment identity, including domain suffix form. */
function sameIdentity(identity: AwikiIdentity, peer: string): boolean {
  const own = identity.handle.toLowerCase()
  const target = peer.toLowerCase()
  return own === target || own.startsWith(`${target}.`) || target.startsWith(`${own}.`)
}

/** Keys that can identify one direct peer in the current roster. */
function directPeerKeys(conversation: AwikiDirectConversation): readonly string[] {
  const keys = [conversation.peerDid, conversation.title]
  if (conversation.peerHandle !== undefined) keys.push(conversation.peerHandle)
  if (conversation.displayName !== undefined) keys.push(conversation.displayName)
  return keys.map(value => value.replace(/^@/u, '').toLowerCase())
}

/** Find an existing direct conversation for one typed Handle or DID. */
function findDirect(
  conversations: readonly AwikiConversation[],
  peer: string,
): AwikiDirectConversation | undefined {
  const key = peer.toLowerCase()
  return conversations.find((conversation): conversation is AwikiDirectConversation => (
    conversation.kind === 'direct' && directPeerKeys(conversation).includes(key)
  ))
}

/** Keep a profile refreshed from WNS when a slower roster page still carries an older message snapshot. */
function preserveDirectProfile(
  incoming: AwikiConversation,
  current: AwikiConversation | undefined,
): AwikiConversation {
  if (incoming.kind !== 'direct' || current?.kind !== 'direct') return incoming
  const displayName = current.displayName ?? incoming.displayName
  const peerHandle = current.peerHandle ?? incoming.peerHandle
  return {
    ...incoming,
    title: displayName ?? peerHandle ?? incoming.title,
    ...(peerHandle === undefined ? {} : { peerHandle }),
    ...(displayName === undefined ? {} : { displayName }),
  }
}

/** Resolve one listed conversation into the send target accepted by AWiki. */
function targetOf(conversation: AwikiConversation): AwikiSendTextRequest['target'] {
  return conversation.kind === 'direct'
    ? { kind: 'direct', peer: conversation.peerDid }
    : { kind: 'group', group: conversation.groupDid }
}

/** Browser object layer for identity, conversations, history, and polling. */
export class AwikiController implements HostObservable<AwikiView> {
  private view = INITIAL_VIEW
  private readonly listeners = new Set<() => void>()
  private config: AwikiRuntimeConfig | null = null
  private conversationsCursor: AwikiPage<AwikiConversation>['nextCursor']
  private historyCursor: AwikiPage<AwikiMessage>['nextCursor']
  private timer: ReturnType<typeof setInterval> | undefined
  private generation = 0
  private disposed = false
  private polling = false

  /** @param remote - generated Host Remote namespace. */
  constructor(private readonly remote: AwikiRemote) {}

  /** Return the cached immutable view. */
  getSnapshot = (): AwikiView => this.view

  /** Subscribe to view replacement. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /**
   * Load Host policy and identity, then start polling while the drawer remains open.
   * @returns successful readiness or one display-safe Host failure.
   */
  async open(): Promise<AwikiActionResult> {
    if (this.disposed) return { ok: false, error: 'AWiki 插件已卸载' }
    this.close()
    const generation = this.generation
    this.publish({ ...INITIAL_VIEW, status: 'loading' })
    const config = await call(() => this.remote.getConfig())
    if (!this.current(generation)) return { ok: true, value: undefined }
    if (!config.ok) return this.fail(config.error)
    this.config = config.value
    const identity = await call(() => this.remote.getIdentity())
    if (!this.current(generation)) return { ok: true, value: undefined }
    if (!identity.ok) return this.fail(identity.error)
    this.publish({
      ...this.view,
      status: 'ready',
      identity: identity.value,
      error: null,
      attachmentMaxBytes: config.value.attachmentMaxBytes,
    })
    if (identity.value !== null) {
      const listed = await this.refreshConversations(generation)
      if (!listed.ok) return listed
    }
    if (this.current(generation)) {
      this.timer = setInterval(() => { void this.poll(generation) }, this.config.pollIntervalMs)
    }
    return { ok: true, value: undefined }
  }

  /** Stop polling and invalidate all in-flight drawer work. */
  close(): void {
    this.generation += 1
    if (this.timer !== undefined) clearInterval(this.timer)
    this.timer = undefined
    this.polling = false
  }

  /**
   * Request one phone verification challenge.
   * @param request - desired Handle and verification phone number.
   * @returns challenge retry metadata or one display-safe failure.
   */
  async sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiActionResult<AwikiRegistrationOtpResult>> {
    return this.withPending('发送验证码', () => call(() => this.remote.sendRegistrationOtp(request)))
  }

  /**
   * Register the deployment identity and populate the initial conversation list.
   * @param request - verified Handle, phone number, and one-time code.
   * @returns the registered public identity or one display-safe failure.
   */
  async registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiActionResult<AwikiIdentity>> {
    const generation = this.generation
    const result = await this.withPending('注册身份', () => call(() => this.remote.registerIdentity(request)))
    if (!result.ok) return result
    if (!this.current(generation)) return result
    this.publish({ ...this.view, identity: result.value, error: null })
    await this.refreshConversations(generation)
    return result
  }

  /**
   * Update the deployment identity's public display name.
   * @param displayName - replacement display name selected by the user.
   * @returns the updated identity or one display-safe failure.
   */
  async updateDisplayName(displayName: string): Promise<AwikiActionResult<AwikiIdentity>> {
    const normalized = displayName.trim()
    const length = Array.from(normalized).length
    if (length === 0) return this.fail('请输入昵称')
    if (length > 50) return this.fail('昵称不能超过 50 个字符')
    const generation = this.generation
    const result = await this.withPending('修改昵称', () => call(() => this.remote.updateDisplayName({ displayName: normalized })))
    if (!result.ok || !this.current(generation)) return result
    this.publish({ ...this.view, identity: result.value, error: null })
    return result
  }

  /**
   * Load another page of the conversation roster.
   * @returns successful pagination or one display-safe failure.
   */
  async loadMoreConversations(): Promise<AwikiActionResult> {
    const generation = this.generation
    const result = await this.withPending('加载更多会话', () => call(() => this.remote.listConversations(
      this.conversationsCursor === undefined ? {} : { cursor: this.conversationsCursor },
    )))
    if (!result.ok) return result
    if (!this.current(generation)) return { ok: true, value: undefined }
    this.conversationsCursor = result.value.nextCursor
    this.publish({
      ...this.view,
      conversations: appendUnique(this.view.conversations, result.value.items, value => value.id),
      conversationsHasMore: result.value.hasMore && result.value.nextCursor !== undefined,
    })
    return { ok: true, value: undefined }
  }

  /**
   * Look up a Handle or DID, then open the matching direct conversation.
   * @param handle - peer Handle or DID typed by the user.
   * @returns successful selection or one display-safe lookup failure.
   */
  async startDirectChat(handle: string): Promise<AwikiActionResult> {
    if (this.disposed) return { ok: false, error: 'AWiki 插件已卸载' }
    const peer = normalizeHandle(handle)
    if (peer === '') return this.fail('请输入 Handle')
    const identity = this.view.identity
    if (identity === null) return this.fail('请先注册 AWiki 身份')
    if (sameIdentity(identity, peer)) return this.fail('不能向自己发起私聊')
    const existing = findDirect(this.view.conversations, peer)
    if (existing !== undefined) return this.selectConversation(existing.id)
    const generation = this.generation
    const resolved = await this.withPending('查找用户', () => call(() => this.remote.resolvePeer({ peer })))
    if (!resolved.ok) {
      return resolved.error.startsWith('not-found') ? this.fail('该 Handle 不存在') : resolved
    }
    if (!this.current(generation)) return { ok: true, value: undefined }
    if (resolved.value.did === identity.did) return this.fail('不能向自己发起私聊')
    await this.refreshConversations(generation)
    if (!this.current(generation)) return { ok: true, value: undefined }
    const listed = this.view.conversations.find(conversation => conversation.id === resolved.value.conversationId)
      ?? findDirect(this.view.conversations, resolved.value.handle ?? peer)
      ?? findDirect(this.view.conversations, resolved.value.did)
    if (listed !== undefined) return this.selectConversation(listed.id)
    const conversation: AwikiDirectConversation = {
      kind: 'direct',
      id: resolved.value.conversationId,
      peerDid: resolved.value.did,
      title: resolved.value.displayName ?? resolved.value.handle ?? resolved.value.did,
      ...resolved.value.handle === undefined ? {} : { peerHandle: resolved.value.handle },
      ...resolved.value.displayName === undefined ? {} : { displayName: resolved.value.displayName },
    }
    this.publish({
      ...this.view,
      conversations: [conversation, ...this.view.conversations],
      error: null,
    })
    return this.selectConversation(conversation.id)
  }

  /**
   * Select a conversation and load its newest history page.
   * @param conversationId - selected conversation, or `null` to return to the roster.
   * @returns successful selection or one display-safe history failure.
   */
  async selectConversation(conversationId: AwikiConversationId | null): Promise<AwikiActionResult> {
    this.historyCursor = undefined
    const selected = conversationId === null
      ? undefined
      : this.view.conversations.find(conversation => conversation.id === conversationId)
    this.publish({ ...this.view, selectedConversationId: conversationId, messages: [], historyHasMore: false, error: null })
    if (conversationId === null) return { ok: true, value: undefined }
    const generation = this.generation
    const profile = selected?.kind === 'direct'
      ? call(() => this.remote.resolvePeer({ peer: selected.peerDid }))
      : Promise.resolve<AwikiActionResult<AwikiResolvedPeer> | null>(null)
    const [loaded, refreshed] = await Promise.all([this.loadHistory(false), profile])
    if (
      refreshed?.ok
      && this.current(generation)
      && this.view.selectedConversationId === conversationId
      && selected?.kind === 'direct'
      && refreshed.value.did === selected.peerDid
      && refreshed.value.conversationId === selected.id
    ) {
      this.publish({
        ...this.view,
        conversations: this.view.conversations.map((conversation) => {
          if (conversation.id !== conversationId || conversation.kind !== 'direct') return conversation
          const displayName = refreshed.value.displayName ?? conversation.displayName
          const peerHandle = refreshed.value.handle ?? conversation.peerHandle
          return {
            ...conversation,
            title: displayName ?? peerHandle ?? conversation.title,
            ...(peerHandle === undefined ? {} : { peerHandle }),
            ...(displayName === undefined ? {} : { displayName }),
          }
        }),
      })
    }
    if (!loaded.ok) return loaded
    const marked = await call(() => this.remote.markConversationRead({ conversationId }))
    if (!marked.ok) return this.fail(marked.error)
    if (!this.current(generation) || this.view.selectedConversationId !== conversationId) {
      return { ok: true, value: undefined }
    }
    this.publish({
      ...this.view,
      conversations: this.view.conversations.map(conversation => conversation.id === conversationId
        ? { ...conversation, unreadCount: 0 }
        : conversation),
      error: null,
    })
    return { ok: true, value: undefined }
  }

  /**
   * Load one older history page before the currently rendered messages.
   * @returns successful pagination or one display-safe failure.
   */
  loadOlderHistory(): Promise<AwikiActionResult> {
    return this.loadHistory(true)
  }

  /**
   * Send one text message to the selected direct or group conversation.
   * @param text - non-empty text prepared by the composer.
   * @returns successful delivery or one display-safe failure.
   */
  async sendText(text: string): Promise<AwikiActionResult> {
    const conversation = this.selectedConversation()
    if (conversation === undefined) return this.fail('请先选择会话')
    const conversationId = conversation.id
    const generation = this.generation
    const result = await this.withPending('发送消息', () => call(() => this.remote.sendText({
      target: targetOf(conversation), text, idempotencyKey: crypto.randomUUID(),
    })))
    if (!result.ok) return result
    if (!this.current(generation) || this.view.selectedConversationId !== conversationId) {
      return { ok: true, value: undefined }
    }
    this.appendMessage(result.value)
    return { ok: true, value: undefined }
  }

  /**
   * Send one already-read browser file without retaining its bytes in the view.
   * @param file - JSON-safe file name, MIME type, base64 bytes, and optional caption.
   * @returns successful delivery or one display-safe failure.
   */
  async sendAttachment(file: {
    readonly fileName: string
    readonly mimeType: string
    readonly bytesBase64: string
    readonly caption?: string
  }): Promise<AwikiActionResult> {
    const conversation = this.selectedConversation()
    if (conversation === undefined) return this.fail('请先选择会话')
    const conversationId = conversation.id
    const generation = this.generation
    const request: AwikiSendAttachmentRequest = {
      target: targetOf(conversation),
      fileName: file.fileName,
      mimeType: file.mimeType,
      bytesBase64: file.bytesBase64,
      ...(file.caption === undefined ? {} : { caption: file.caption }),
      idempotencyKey: crypto.randomUUID(),
    }
    const result = await this.withPending('发送附件', () => call(() => this.remote.sendAttachment(request)))
    if (!result.ok) return result
    if (!this.current(generation) || this.view.selectedConversationId !== conversationId) {
      return { ok: true, value: undefined }
    }
    this.appendMessage(result.value)
    return { ok: true, value: undefined }
  }

  /**
   * Download verified attachment bytes without publishing them into controller state.
   * @param messageId - message that grants access to the attachment.
   * @param attachmentId - attachment selected from that message.
   * @returns verified attachment metadata and bytes, or one display-safe failure.
   */
  async downloadAttachment(
    messageId: AwikiMessageId,
    attachmentId: AwikiAttachmentId,
  ): Promise<AwikiActionResult<AwikiDownloadedAttachment>> {
    if (this.disposed) return { ok: false, error: 'AWiki 插件已卸载' }
    const generation = this.generation
    const result = await call(() => this.remote.downloadAttachment({ attachmentId, messageId }))
    return this.current(generation) ? result : { ok: false, error: 'AWiki 已关闭' }
  }

  /** Stop timers, invalidate work, and drop subscribers during HMR unload. */
  dispose(): void {
    this.disposed = true
    this.close()
    this.listeners.clear()
  }

  private async refreshConversations(generation: number): Promise<AwikiActionResult> {
    const result = await call(() => this.remote.listConversations({}))
    if (!this.current(generation)) return { ok: true, value: undefined }
    if (!result.ok) return this.fail(result.error)
    const firstPage = this.view.conversations.length === 0
    if (firstPage) this.conversationsCursor = result.value.nextCursor
    const refreshed = result.value.items.map(incoming => preserveDirectProfile(
      incoming,
      this.view.conversations.find(current => current.id === incoming.id),
    ))
    this.publish({
      ...this.view,
      conversations: firstPage
        ? refreshed
        : appendUnique(refreshed, this.view.conversations, value => value.id),
      conversationsHasMore: firstPage
        ? result.value.hasMore && result.value.nextCursor !== undefined
        : this.view.conversationsHasMore,
      error: null,
    })
    return { ok: true, value: undefined }
  }

  private async loadHistory(older: boolean): Promise<AwikiActionResult> {
    const conversationId = this.view.selectedConversationId
    if (conversationId === null) return this.fail('请先选择会话')
    const generation = this.generation
    const request: AwikiHistoryRequest = {
      conversationId,
      ...(older && this.historyCursor !== undefined ? { cursor: this.historyCursor } : {}),
    }
    const result = await this.withPending(older ? '加载更早消息' : '加载消息', () => call(() => this.remote.getHistory(request)))
    if (!result.ok) return result
    if (!this.current(generation)) return { ok: true, value: undefined }
    if (this.view.selectedConversationId !== conversationId) return { ok: true, value: undefined }
    this.historyCursor = result.value.nextCursor
    this.publish({
      ...this.view,
      // SDK pages are chronological. A continuation page contains older
      // messages, so it is prepended to the already rendered chronological tail.
      messages: older
        ? prependUnique(this.view.messages, result.value.items, value => value.id)
        : result.value.items,
      historyHasMore: result.value.hasMore && result.value.nextCursor !== undefined,
    })
    return { ok: true, value: undefined }
  }

  private async poll(generation: number): Promise<void> {
    if (this.polling || !this.current(generation) || this.view.identity === null) return
    this.polling = true
    try {
      await this.refreshConversations(generation)
      const selected = this.view.selectedConversationId
      if (selected === null || !this.current(generation)) return
      const result = await call(() => this.remote.getHistory({ conversationId: selected }))
      if (!this.current(generation) || !result.ok || this.view.selectedConversationId !== selected) return
      this.publish({
        ...this.view,
        messages: appendUnique(this.view.messages, result.value.items, value => value.id),
      })
    } finally {
      this.polling = false
    }
  }

  private async withPending<Value>(label: string, operation: () => Promise<AwikiActionResult<Value>>): Promise<AwikiActionResult<Value>> {
    if (this.disposed) return { ok: false, error: 'AWiki 插件已卸载' }
    const generation = this.generation
    this.publish({ ...this.view, pending: label, error: null })
    const result = await operation()
    if (!this.current(generation)) return result
    this.publish({ ...this.view, pending: null, error: result.ok ? null : result.error })
    return result
  }

  private appendMessage(message: AwikiMessage): void {
    this.publish({
      ...this.view,
      messages: appendUnique(this.view.messages, [message], value => value.id),
      error: null,
    })
  }

  private selectedConversation(): AwikiConversation | undefined {
    const selected = this.view.selectedConversationId
    return selected === null ? undefined : this.view.conversations.find(value => value.id === selected)
  }

  private fail(error: string): AwikiActionResult<never> {
    this.publish({ ...this.view, status: this.view.status === 'loading' ? 'error' : this.view.status, pending: null, error })
    return { ok: false, error }
  }

  private current(generation: number): boolean {
    return !this.disposed && generation === this.generation
  }

  private publish(view: AwikiView): void {
    /* v8 ignore next -- every asynchronous and public mutation path checks disposal before publishing. */
    if (this.disposed) return
    this.view = Object.freeze(view)
    for (const listener of [...this.listeners]) listener()
  }
}
