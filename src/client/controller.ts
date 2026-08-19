/** React-free browser controller for the deployment's one AWiki identity. */

import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {
  AwikiAttachmentId,
  AwikiClearLocalDataRequest,
  AwikiClearLocalDataResult,
  AwikiConversation,
  AwikiConversationSummary,
  AwikiConversationId,
  AwikiCreateGroupRequest,
  AwikiCreateGroupResult,
  AwikiDirectConversation,
  AwikiDownloadedAttachment,
  AwikiFailure,
  AwikiHistoryRequest,
  AwikiHandle,
  AwikiIdentity,
  AwikiLogoutRequest,
  AwikiMessage,
  AwikiMessageId,
  AwikiMarkConversationReadRequest,
  AwikiMailAccount,
  AwikiMailInboxPage,
  AwikiMailInboxRequest,
  AwikiMailMarkReadRequest,
  AwikiMailMarkReadResult,
  AwikiMailMessage,
  AwikiMailReadRequest,
  AwikiMailSendRequest,
  AwikiMailSendResult,
  AwikiPage,
  AwikiPageRequest,
  AwikiResolvePeerRequest,
  AwikiResolvedPeer,
  AwikiRegistrationOtpRequest,
  AwikiRegistrationOtpResult,
  AwikiRegistrationRequest,
  AwikiResult,
  AwikiRuntimeConfig,
  AwikiSession,
  AwikiSendAttachmentRequest,
  AwikiSendTextRequest,
  AwikiSummarizeConversationRequest,
  AwikiUpdateDisplayNameRequest,
} from '@awiki/dsh-plugin/types'
import {
  IndexedDbAwikiBrowserImageCache,
  type AwikiBrowserImageCache,
} from './image-cache.ts'

/** The generated `remote.awiki` methods consumed by this controller. */
export interface AwikiRemote {
  /** Read browser-safe Host polling policy. */
  getConfig: () => Promise<RemoteResult<AwikiResult<AwikiRuntimeConfig>>>
  /** Read the deployment's public identity, if registered. */
  getIdentity: () => Promise<RemoteResult<AwikiResult<AwikiIdentity | null>>>
  /** Read whether this installation is unregistered, signed out, or active. */
  getSession: () => Promise<RemoteResult<AwikiResult<AwikiSession>>>
  /** Sign out locally without deleting the persisted identity. */
  logout: (request: AwikiLogoutRequest) => Promise<RemoteResult<AwikiResult<AwikiSession>>>
  /** Resume the preserved local identity. */
  login: () => Promise<RemoteResult<AwikiResult<AwikiSession>>>
  /** Request one registration verification code. */
  sendRegistrationOtp: (request: AwikiRegistrationOtpRequest) => Promise<RemoteResult<AwikiResult<AwikiRegistrationOtpResult>>>
  /** Register and persist the deployment's sole identity. */
  registerIdentity: (request: AwikiRegistrationRequest) => Promise<RemoteResult<AwikiResult<AwikiIdentity>>>
  /** Update the deployment identity's public WNS display name. */
  updateDisplayName: (request: AwikiUpdateDisplayNameRequest) => Promise<RemoteResult<AwikiResult<AwikiIdentity>>>
  /** Resolve one Handle or DID before opening a direct chat. */
  resolvePeer: (request: AwikiResolvePeerRequest) => Promise<RemoteResult<AwikiResult<AwikiResolvedPeer>>>
  /** Create one group and settle every initial-member invitation. */
  createGroup: (request: AwikiCreateGroupRequest) => Promise<RemoteResult<AwikiResult<AwikiCreateGroupResult>>>
  /** List one page of direct and group conversations. */
  listConversations: (request?: AwikiPageRequest) => Promise<RemoteResult<AwikiResult<AwikiPage<AwikiConversation>>>>
  /** Read one conversation history page. */
  getHistory: (request: AwikiHistoryRequest) => Promise<RemoteResult<AwikiResult<AwikiPage<AwikiMessage>>>>
  /** Read one committed local conversation page without network refresh. */
  getLocalHistory: (request: AwikiHistoryRequest) => Promise<RemoteResult<AwikiResult<AwikiPage<AwikiMessage>>>>
  /** Summarize one Host-bounded real-history range. */
  summarizeConversation: (request: AwikiSummarizeConversationRequest) => Promise<RemoteResult<AwikiResult<AwikiConversationSummary>>>
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
  /** Permanently clear this installation's local identity and message state. */
  clearLocalData: (request: AwikiClearLocalDataRequest) => Promise<RemoteResult<AwikiResult<AwikiClearLocalDataResult>>>
  /** Read the deployment mailbox account on demand. */
  getMailAccount: () => Promise<RemoteResult<AwikiResult<AwikiMailAccount>>>
  /** List one bounded mailbox page on demand. */
  listMailInbox: (request?: AwikiMailInboxRequest) => Promise<RemoteResult<AwikiResult<AwikiMailInboxPage>>>
  /** Read one bounded plain-text mail message. */
  readMail: (request: AwikiMailReadRequest) => Promise<RemoteResult<AwikiResult<AwikiMailMessage>>>
  /** Mark explicitly selected mail messages read. */
  markMailRead: (request: AwikiMailMarkReadRequest) => Promise<RemoteResult<AwikiResult<AwikiMailMarkReadResult>>>
  /** Send one confirmed plain-text mail once. */
  sendMail: (request: AwikiMailSendRequest) => Promise<RemoteResult<AwikiResult<AwikiMailSendResult>>>
}

/** Load phase of the drawer's Host-owned data. */
export type AwikiControllerStatus = 'cold' | 'loading' | 'ready' | 'error'

/** Runtime-only summary state retained independently for every conversation. */
export type AwikiSummaryStatus = 'idle' | 'loading' | 'success' | 'error'

/** One conversation's non-persistent AI summary projection. */
export interface AwikiSummaryView {
  readonly status: AwikiSummaryStatus
  readonly collapsed: boolean
  readonly stale: boolean
  readonly result?: AwikiConversationSummary
  readonly error?: string
}

/** Immutable drawer data published through the framework hook binder. */
export interface AwikiView {
  readonly status: AwikiControllerStatus
  readonly sessionStatus: AwikiSession['status']
  readonly identity: AwikiIdentity | null
  readonly conversations: readonly AwikiConversation[]
  readonly conversationsHasMore: boolean
  readonly selectedConversationId: AwikiConversationId | null
  readonly messages: readonly AwikiMessage[]
  readonly historyHasMore: boolean
  /** True only while the selected conversation's committed local first page is loading. */
  readonly localPending: boolean
  /** True while the selected conversation is reconciling remote history in the background. */
  readonly refreshing: boolean
  readonly pending: string | null
  readonly error: string | null
  readonly attachmentMaxBytes: number
  readonly summaries: Readonly<Record<string, AwikiSummaryView>>
}

/** Settled user operation result with one display-safe failure. */
export type AwikiActionResult<Value = void> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly error: string }

/** Turn a registration rejection into an actionable message without exposing remote response text. */
function registrationFailureMessage(failure: AwikiFailure): string {
  switch (failure.code) {
    case 'already-registered':
      return '当前设备已注册 AWiki 身份，请刷新后继续使用。'
    case 'invalid-request':
      return '注册信息不匹配，请检查手机号、Handle 和验证码后重试。'
    case 'invalid-otp':
      return '验证码不正确，请检查后重试。'
    case 'challenge-expired':
      return '验证码状态已失效，请重新获取验证码后再注册。'
    case 'handle-unavailable':
      return '该 Handle 已存在，无法重复注册。请更换一个未使用的 Handle，并重新获取验证码。'
    case 'conflict':
      return '注册冲突：服务端可能已收到上次注册请求，或该手机号 / Handle 已绑定其他身份。请保留当前页面并再次提交；若仍失败，请勿清除本机身份数据，联系管理员并提供失败时间。'
    case 'rate-limited':
      return '注册请求过于频繁，请稍后重试。'
    case 'network':
      return '无法连接 AWiki 服务，请检查网络后重试。'
    case 'forbidden':
      return '当前 AWiki 服务未开放公开注册，或该手机号不在注册白名单。请使用已获准的手机号，或联系管理员开通注册权限。'
    case 'remote':
      return 'AWiki 服务暂时无法完成注册，请稍后重试；若持续失败，请联系管理员并提供失败时间。'
    default:
      return `${failure.code}：${failure.message}`
  }
}

/** Turn a verification-code request failure into a safe next action. */
function registrationOtpFailureMessage(failure: AwikiFailure): string {
  switch (failure.code) {
    case 'rate-limited':
      return '验证码发送过于频繁，请等待限流解除后再重新获取。'
    case 'invalid-request':
      return '无法发送验证码，请检查手机号和 Handle 后重试。'
    case 'forbidden':
      return '当前 AWiki 服务未向该手机号开放注册，请联系管理员。'
    case 'network':
      return '无法连接 AWiki 服务，请检查网络后重试。'
    case 'remote':
      return 'AWiki 服务暂时无法发送验证码，请稍后重试。'
    default:
      return registrationFailureMessage(failure)
  }
}

const INITIAL_VIEW: AwikiView = Object.freeze({
  status: 'cold',
  sessionStatus: 'unregistered',
  identity: null,
  conversations: Object.freeze([]),
  conversationsHasMore: false,
  selectedConversationId: null,
  messages: Object.freeze([]),
  historyHasMore: false,
  localPending: false,
  refreshing: false,
  pending: null,
  error: null,
  attachmentMaxBytes: 0,
  summaries: Object.freeze({}),
})

/** Turn a closed Host summary failure into one actionable Chinese message. */
function summaryFailureMessage(failure: AwikiFailure): string {
  switch (failure.code) {
    case 'summary-unavailable': return 'AI 总结暂不可用，请先在 Harness 设置中配置可用的默认模型。'
    case 'summary-timeout': return 'AI 总结超时，请稍后重新生成。'
    case 'summary-cancelled': return 'AI 总结已取消，请重新生成。'
    case 'summary-invalid-output': return '模型没有返回有效的结构化摘要，请重新生成。'
    case 'summary-failed': return '暂时无法生成 AI 总结，请检查模型连接后重试。'
    default: return `${failure.code}：${failure.message}`
  }
}

/** Turn closed mail failures into safe, actionable browser messages. */
function mailFailureMessage(failure: AwikiFailure): string {
  switch (failure.code) {
    case 'invalid-request': return '邮件信息不完整或格式不正确，请检查后重试。'
    case 'not-registered': return '请先注册 AWiki 身份后使用邮箱。'
    case 'signed-out': return '当前 AWiki 身份已退出，请重新进入后使用邮箱。'
    case 'forbidden': return '当前 AWiki 身份没有执行此邮件操作的权限。'
    case 'not-found': return '该邮件不存在或已经不可访问。'
    case 'rate-limited': return '邮件请求过于频繁，请稍后重试。'
    case 'delivery-unknown': return '发送结果未知，请先检查已发送邮件再决定是否重试。'
    case 'network': return '无法连接 AWiki 邮件服务，请检查网络后重试。'
    default: return 'AWiki 邮件服务暂时不可用，请稍后重试。'
  }
}

/** Flatten the carrier and business result once for every controller caller. */
async function call<Value>(
  operation: () => Promise<RemoteResult<AwikiResult<Value>>>,
  failureMessage: (failure: AwikiFailure) => string = failure => `${failure.code}：${failure.message}`,
): Promise<AwikiActionResult<Value>> {
  try {
    const carried = await operation()
    if (!carried.ok) return { ok: false, error: `连接 AWiki Host 失败：${carried.error.message}` }
    if (!carried.value.ok) {
      return { ok: false, error: failureMessage(carried.value.error) }
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

/** Keep one last-wins value per canonical id without changing the page's order. */
function canonicalMessagePage(incoming: readonly AwikiMessage[]): readonly AwikiMessage[] {
  const byId = new Map<AwikiMessageId, AwikiMessage>()
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()]
}

/** Replace the newest loaded window while preserving older messages before it. */
function mergeLatestMessages(
  current: readonly AwikiMessage[],
  incoming: readonly AwikiMessage[],
): readonly AwikiMessage[] {
  const page = canonicalMessagePage(incoming)
  const incomingIds = new Set(page.map(message => message.id))
  return [...current.filter(message => !incomingIds.has(message.id)), ...page]
}

/** Prepend one chronological continuation page while exact-updating any overlap. */
function mergeOlderMessages(
  current: readonly AwikiMessage[],
  incoming: readonly AwikiMessage[],
): readonly AwikiMessage[] {
  const page = canonicalMessagePage(incoming)
  const incomingIds = new Set(page.map(message => message.id))
  return [...page, ...current.filter(message => !incomingIds.has(message.id))]
}

/** Append a newly committed message, or enrich its existing canonical row in place. */
function appendMessageById(
  current: readonly AwikiMessage[],
  incoming: AwikiMessage,
): readonly AwikiMessage[] {
  const index = current.findIndex(message => message.id === incoming.id)
  if (index < 0) return [...current, incoming]
  return current.map((message, currentIndex) => currentIndex === index ? incoming : message)
}

/** Explain a background failure without implying that visible local messages were lost. */
function refreshFailureMessage(messages: readonly AwikiMessage[], error: string): string {
  return messages.length > 0 ? `刷新失败，当前显示本地数据。${error}` : error
}

/** Reject a page that attempts to cross the selected canonical conversation boundary. */
function pageBelongsToConversation(
  conversationId: AwikiConversationId,
  messages: readonly AwikiMessage[],
): boolean {
  return messages.every(message => message.conversationId === conversationId)
}

type ConversationTimingName =
  | 'conversation.select.local_timeline_ms'
  | 'conversation.select.first_paint_ms'
  | 'conversation.select.remote_history_ms'

function timingStart(): number {
  return globalThis.performance?.now() ?? Date.now()
}

function clearConversationTimings(): void {
  const performance = globalThis.performance
  if (performance === undefined) return
  try {
    for (const name of [
      'conversation.select.local_timeline_ms',
      'conversation.select.first_paint_ms',
      'conversation.select.remote_history_ms',
    ] satisfies ConversationTimingName[]) performance.clearMeasures(name)
  } catch {
    // Performance measurement is optional in restricted browser/test runtimes.
  }
}

/** Keep only one secret-free development measure for each selected-conversation phase. */
function recordTiming(name: ConversationTimingName, startedAt: number, success: boolean): void {
  const performance = globalThis.performance
  if (performance === undefined) return
  try {
    performance.clearMeasures(name)
    performance.measure(name, {
      start: startedAt,
      end: performance.now(),
      detail: { success, count: 1 },
    })
  } catch {
    // Performance measurement is optional in restricted browser/test runtimes.
  }
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

/** Bounded readiness window for a newly projected group conversation. */
const GROUP_HISTORY_RETRY_DELAYS_MS = [250, 750, 1_500, 2_500] as const
/** Runtime-only decoded-byte budget that prevents repeat Host calls while browsing. */
const BROWSER_IMAGE_ATTACHMENT_CACHE_MAX_BYTES = 32 * 1024 * 1024

/** Wait between group-history readiness probes without retaining controller state. */
function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
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

/** True when a group title contains presentation data instead of a protocol fallback. */
function hasDisplayableGroupTitle(conversation: AwikiConversation): boolean {
  if (conversation.kind !== 'group') return false
  const title = conversation.title.trim()
  return title !== '' && title !== conversation.groupDid && title !== conversation.id
}

/** True when a direct title is richer than its routing identifiers. */
function hasDisplayableDirectTitle(conversation: AwikiDirectConversation): boolean {
  const title = conversation.title.trim().replace(/^@/u, '')
  if (title === '') return false
  return ![conversation.id, conversation.peerDid, conversation.peerHandle]
    .some(value => value !== undefined && value.trim().replace(/^@/u, '') === title)
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
  private selectionRevision = 0
  private disposed = false
  private polling = false
  private readonly markReadInFlight = new Map<AwikiConversationId, Promise<AwikiActionResult>>()
  private readonly unreadAtOpen = new Map<AwikiConversationId, number>()
  private readonly summaryBaselines = new Map<AwikiConversationId, {
    readonly latestSentAt: number
    readonly messageIdsAtLatest: ReadonlySet<AwikiMessageId>
  }>()
  /** Last trustworthy direct profile for the active identity, keyed by canonical peer DID. */
  private readonly directProfiles = new Map<string, {
    readonly peerHandle?: AwikiHandle
    readonly displayName?: string
    readonly title?: string
  }>()
  /** Last trustworthy group title for the active identity, keyed by canonical Group DID. */
  private readonly groupTitles = new Map<string, string>()
  /** Verified image payloads retained outside observable state for instant remounts. */
  private readonly imageAttachments = new Map<string, AwikiDownloadedAttachment>()
  private imageAttachmentCacheBytes = 0
  private presentationCacheOwnerDid: AwikiIdentity['did'] | null = null

  /**
   * @param remote - generated Host Remote namespace.
   * @param persistentImageCache - browser-origin verified preview cache.
   */
  constructor(
    private readonly remote: AwikiRemote,
    private readonly persistentImageCache: AwikiBrowserImageCache = new IndexedDbAwikiBrowserImageCache(),
  ) {}

  /** Return the cached immutable view. */
  getSnapshot = (): AwikiView => this.view

  /** Subscribe to view replacement. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Load Host policy and the shared identity state without starting drawer polling. */
  async loadSession(): Promise<AwikiActionResult> {
    if (this.disposed) return { ok: false, error: 'AWiki 插件已卸载' }
    this.close()
    this.summaryBaselines.clear()
    const generation = this.generation
    this.publish({ ...INITIAL_VIEW, status: 'loading' })
    const config = await call(() => this.remote.getConfig())
    if (!this.current(generation)) return { ok: true, value: undefined }
    if (!config.ok) return this.fail(config.error)
    this.config = config.value
    const session = await call(() => this.remote.getSession())
    if (!this.current(generation)) return { ok: true, value: undefined }
    if (!session.ok) return this.fail(session.error)
    const identity = session.value.status === 'active' ? session.value.identity : null
    this.activatePresentationCache(identity)
    this.publish({
      ...this.view,
      status: 'ready',
      sessionStatus: session.value.status,
      identity: session.value.status === 'active' ? session.value.identity : null,
      error: null,
      attachmentMaxBytes: config.value.attachmentMaxBytes,
    })
    return { ok: true, value: undefined }
  }

  /**
   * Load Host policy and identity, then start polling while the drawer remains open.
   * @returns successful readiness or one display-safe Host failure.
   */
  async open(): Promise<AwikiActionResult> {
    const loaded = await this.loadSession()
    if (!loaded.ok) return loaded
    const generation = this.generation
    if (this.view.identity !== null) {
      const listed = await this.refreshConversations(generation)
      if (!listed.ok) return listed
    }
    if (this.current(generation)) {
      this.timer = setInterval(() => { void this.poll(generation) }, this.config?.pollIntervalMs ?? 3_000)
    }
    return { ok: true, value: undefined }
  }

  /** Sign out locally while retaining the SDK-owned identity and database. */
  async logout(request: AwikiLogoutRequest): Promise<AwikiActionResult<AwikiSession>> {
    if (this.disposed) return { ok: false, error: 'AWiki 插件已卸载' }
    const result = await call(() => this.remote.logout(request))
    if (!result.ok) return result
    this.close()
    this.conversationsCursor = undefined
    this.historyCursor = undefined
    this.summaryBaselines.clear()
    this.clearPresentationCache()
    this.publish({
      ...INITIAL_VIEW,
      status: 'ready',
      sessionStatus: 'signed-out',
      attachmentMaxBytes: this.config?.attachmentMaxBytes ?? 0,
    })
    return result
  }

  /** Resume the preserved local identity and reload its conversations. */
  async login(): Promise<AwikiActionResult<AwikiSession>> {
    if (this.disposed) return { ok: false, error: 'AWiki 插件已卸载' }
    const result = await call(() => this.remote.login())
    if (!result.ok) return result
    if (result.value.status !== 'active') return { ok: false, error: '本机没有可恢复的 AWiki 身份' }
    const opened = await this.open()
    return opened.ok ? result : { ok: false, error: opened.error }
  }

  /** Stop polling and invalidate all in-flight drawer work. */
  close(): void {
    this.generation += 1
    this.selectionRevision += 1
    if (this.timer !== undefined) clearInterval(this.timer)
    this.timer = undefined
    this.polling = false
    this.markReadInFlight.clear()
  }

  /**
   * Request one phone verification challenge.
   * @param request - desired Handle and verification phone number.
   * @returns challenge retry metadata or one display-safe failure.
   */
  async sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiActionResult<AwikiRegistrationOtpResult>> {
    return this.withPending('发送验证码', () => call(
      () => this.remote.sendRegistrationOtp(request),
      registrationOtpFailureMessage,
    ))
  }

  /**
   * Register the deployment identity and populate the initial conversation list.
   * @param request - verified Handle, phone number, and one-time code.
   * @returns the registered public identity or one display-safe failure.
   */
  async registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiActionResult<AwikiIdentity>> {
    const generation = this.generation
    const result = await this.withPending('注册身份', () => call(
      () => this.remote.registerIdentity(request),
      registrationFailureMessage,
    ))
    if (!result.ok) return result
    if (!this.current(generation)) return result
    this.activatePresentationCache(result.value)
    this.publish({ ...this.view, sessionStatus: 'active', identity: result.value, error: null })
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

  /** Read the active deployment identity's public mailbox state. */
  getMailAccount(): Promise<AwikiActionResult<AwikiMailAccount>> {
    return call(() => this.remote.getMailAccount(), mailFailureMessage)
  }

  /** List one browser-requested mailbox page without background polling. */
  listMailInbox(request: AwikiMailInboxRequest = {}): Promise<AwikiActionResult<AwikiMailInboxPage>> {
    return call(() => this.remote.listMailInbox(request), mailFailureMessage)
  }

  /** Read one selected plain-text mail message without marking it read. */
  readMail(request: AwikiMailReadRequest): Promise<AwikiActionResult<AwikiMailMessage>> {
    return call(() => this.remote.readMail(request), mailFailureMessage)
  }

  /** Mark mail read only after the browser supplied an explicit selected id. */
  markMailRead(request: AwikiMailMarkReadRequest): Promise<AwikiActionResult<AwikiMailMarkReadResult>> {
    return call(() => this.remote.markMailRead(request), mailFailureMessage)
  }

  /** Send one user-confirmed plain-text mail without retrying. */
  sendMail(request: AwikiMailSendRequest): Promise<AwikiActionResult<AwikiMailSendResult>> {
    return call(() => this.remote.sendMail(request), mailFailureMessage)
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
    const conversations = result.value.items.map(incoming => this.cacheConversation(
      incoming,
      this.view.conversations.find(current => current.id === incoming.id),
    ))
    this.publish({
      ...this.view,
      conversations: appendUnique(this.view.conversations, conversations, value => value.id),
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
    const conversation = this.cacheConversation({
      kind: 'direct',
      id: resolved.value.conversationId,
      peerDid: resolved.value.did,
      title: resolved.value.displayName ?? resolved.value.handle ?? resolved.value.did,
      ...resolved.value.handle === undefined ? {} : { peerHandle: resolved.value.handle },
      ...resolved.value.displayName === undefined ? {} : { displayName: resolved.value.displayName },
    }) as AwikiDirectConversation
    this.publish({
      ...this.view,
      conversations: [conversation, ...this.view.conversations],
      error: null,
    })
    return this.selectConversation(conversation.id)
  }

  /**
   * Create one group, add its initial members, and open the new canonical conversation.
   * Group selection owns a bounded readiness retry so a fresh empty group can settle before
   * its first history failure becomes visible.
   * @param name - user-visible group name.
   * @param members - Handle or DID values entered by the user.
   * @returns the created group and settled invitation outcomes.
   */
  async createGroup(name: string, members: readonly string[]): Promise<AwikiActionResult<AwikiCreateGroupResult>> {
    if (this.disposed) return { ok: false, error: 'AWiki 插件已卸载' }
    const normalizedName = name.trim()
    if (normalizedName === '') return this.fail('请输入群聊名称')
    if (Array.from(normalizedName).length > 100) return this.fail('群聊名称不能超过 100 个字符')
    const normalizedMembers = [...new Set(members.map(normalizeHandle).filter(member => member !== ''))]
    if (normalizedMembers.length === 0) return this.fail('请至少添加一位群成员')
    if (normalizedMembers.length > 50) return this.fail('首批群成员不能超过 50 位')
    const identity = this.view.identity
    if (identity === null) return this.fail('请先注册 AWiki 身份')
    if (normalizedMembers.some(member => member === identity.did || sameIdentity(identity, member))) {
      return this.fail('群成员列表不需要包含自己')
    }
    const generation = this.generation
    const result = await this.withPending('创建群聊', () => call(() => this.remote.createGroup({
      name: normalizedName,
      members: normalizedMembers,
    })))
    if (!result.ok || !this.current(generation)) return result
    const conversation = this.cacheConversation(result.value.conversation)
    this.publish({
      ...this.view,
      conversations: appendUnique([conversation], this.view.conversations, value => value.id),
      error: null,
    })
    const selected = await this.selectConversation(result.value.conversation.id)
    if (!this.current(generation)) return result
    const failed = result.value.failedMembers.map(item => item.member)
    const warning = failed.length === 0
      ? selected.ok ? null : '群聊已创建，但暂时无法打开消息历史。'
      : `群聊已创建，但以下成员未加入：${failed.join('、')}`
    if (warning !== null) this.publish({ ...this.view, error: warning })
    return result
  }

  /**
   * Select a conversation and load its newest history page.
   * @param conversationId - selected conversation, or `null` to return to the roster.
   * @returns successful selection or one display-safe history failure.
   */
  async selectConversation(conversationId: AwikiConversationId | null): Promise<AwikiActionResult> {
    clearConversationTimings()
    const selectStartedAt = timingStart()
    const previousConversationId = this.view.selectedConversationId
    const sameConversation = conversationId !== null && previousConversationId === conversationId
    const selectionRevision = ++this.selectionRevision
    this.historyCursor = undefined
    const selected = conversationId === null
      ? undefined
      : this.view.conversations.find(conversation => conversation.id === conversationId)
    if (selected !== undefined) this.unreadAtOpen.set(selected.id, selected.unreadCount ?? 0)
    this.publish({
      ...this.view,
      selectedConversationId: conversationId,
      messages: sameConversation ? this.view.messages : [],
      historyHasMore: false,
      localPending: conversationId !== null,
      refreshing: false,
      error: null,
    })
    if (conversationId === null) return { ok: true, value: undefined }
    const generation = this.generation
    const localStartedAt = timingStart()
    const local = await call(() => this.remote.getLocalHistory({ conversationId }))
    recordTiming('conversation.select.local_timeline_ms', localStartedAt, local.ok)
    if (!this.currentSelection(generation, selectionRevision, conversationId)) {
      return local.ok ? { ok: true, value: undefined } : local
    }
    if (!local.ok) {
      this.publish({
        ...this.view,
        localPending: false,
        refreshing: true,
        error: local.error,
      })
      void this.reconcileSelectedConversation(conversationId, generation, selectionRevision)
      void this.refreshSelectedDirectProfile(selected, generation, selectionRevision)
      return local
    }
    if (!pageBelongsToConversation(conversationId, local.value.items)) {
      return this.failSelectedConversation(
        generation,
        selectionRevision,
        conversationId,
        'AWiki 本地消息归属不一致，请重新打开会话。',
      )
    }
    this.publish({
      ...this.view,
      messages: mergeLatestMessages(this.view.messages, local.value.items),
      localPending: false,
      refreshing: true,
      error: null,
    })
    recordTiming('conversation.select.first_paint_ms', selectStartedAt, true)
    void this.reconcileSelectedConversation(conversationId, generation, selectionRevision)
    void this.refreshSelectedDirectProfile(selected, generation, selectionRevision)
    return { ok: true, value: undefined }
  }

  private async reconcileSelectedConversation(
    conversationId: AwikiConversationId,
    generation: number,
    selectionRevision: number,
  ): Promise<void> {
    const selected = this.view.conversations.find(conversation => conversation.id === conversationId)
    const remoteStartedAt = timingStart()
    const remote = await this.readRemoteHistoryWithGroupReadiness(
      selected,
      conversationId,
      generation,
      selectionRevision,
    )
    recordTiming('conversation.select.remote_history_ms', remoteStartedAt, remote.ok)
    if (!this.currentSelection(generation, selectionRevision, conversationId)) return
    if (!remote.ok) {
      this.publish({
        ...this.view,
        refreshing: false,
        error: refreshFailureMessage(this.view.messages, remote.error),
      })
      return
    }
    if (!pageBelongsToConversation(conversationId, remote.value.items)) {
      this.failSelectedConversation(
        generation,
        selectionRevision,
        conversationId,
        'AWiki 远端消息归属不一致，请重新打开会话。',
      )
      return
    }
    this.historyCursor = remote.value.nextCursor
    const committed = await call(() => this.remote.getLocalHistory({ conversationId }))
    if (!this.currentSelection(generation, selectionRevision, conversationId)) return
    if (!committed.ok) {
      this.publish({
        ...this.view,
        refreshing: false,
        error: refreshFailureMessage(this.view.messages, committed.error),
      })
      return
    }
    if (!pageBelongsToConversation(conversationId, committed.value.items)) {
      this.failSelectedConversation(
        generation,
        selectionRevision,
        conversationId,
        'AWiki 本地消息归属不一致，请重新打开会话。',
      )
      return
    }
    const existingIds = new Set(this.view.messages.map(message => message.id))
    const incoming = committed.value.items.filter(message => !existingIds.has(message.id))
    const existingError = this.view.error
    this.publish({
      ...this.view,
      messages: mergeLatestMessages(this.view.messages, committed.value.items),
      historyHasMore: remote.value.hasMore && remote.value.nextCursor !== undefined,
      refreshing: false,
      error: existingError?.startsWith('群聊已创建，但以下成员未加入：') ? existingError : null,
      summaries: this.staleSummaries(conversationId, incoming),
    })
  }

  private async readRemoteHistoryWithGroupReadiness(
    conversation: AwikiConversation | undefined,
    conversationId: AwikiConversationId,
    generation: number,
    selectionRevision: number,
  ): Promise<AwikiActionResult<AwikiPage<AwikiMessage>>> {
    if (conversation?.kind !== 'group') {
      return call(() => this.remote.getHistory({ conversationId }))
    }
    for (const retryDelay of GROUP_HISTORY_RETRY_DELAYS_MS) {
      const remote = await call(() => this.remote.getHistory({ conversationId }))
      if (remote.ok || !this.currentSelection(generation, selectionRevision, conversationId)) return remote
      await delay(retryDelay)
      if (!this.currentSelection(generation, selectionRevision, conversationId)) return remote
    }
    return call(() => this.remote.getHistory({ conversationId }))
  }

  private async refreshSelectedDirectProfile(
    selected: AwikiConversation | undefined,
    generation: number,
    selectionRevision: number,
  ): Promise<void> {
    if (selected?.kind !== 'direct') return
    const refreshed = await call(() => this.remote.resolvePeer({ peer: selected.peerDid }))
    if (
      !refreshed.ok
      || !this.currentSelection(generation, selectionRevision, selected.id)
      || refreshed.value.did !== selected.peerDid
      || refreshed.value.conversationId !== selected.id
    ) return
    this.publish({
      ...this.view,
      conversations: this.view.conversations.map((conversation) => {
        if (conversation.id !== selected.id || conversation.kind !== 'direct') return conversation
        const displayName = refreshed.value.displayName ?? conversation.displayName
        const peerHandle = refreshed.value.handle ?? conversation.peerHandle
        this.directProfiles.set(conversation.peerDid, {
          ...(peerHandle === undefined ? {} : { peerHandle }),
          ...(displayName === undefined ? {} : { displayName, title: displayName }),
        })
        return this.cacheConversation({
          ...conversation,
          title: displayName ?? peerHandle ?? conversation.title,
          ...(peerHandle === undefined ? {} : { peerHandle }),
          ...(displayName === undefined ? {} : { displayName }),
        })
      }),
    })
  }

  private failSelectedConversation(
    generation: number,
    selectionRevision: number,
    conversationId: AwikiConversationId,
    error: string,
  ): AwikiActionResult<never> {
    if (this.currentSelection(generation, selectionRevision, conversationId)) {
      this.publish({
        ...this.view,
        localPending: false,
        refreshing: false,
        error,
      })
    }
    return { ok: false, error }
  }

  /**
   * Mark the selected conversation read after the UI proves its newest message is visible.
   * Repeated scroll and layout notifications share one Host request, while a failed
   * background attempt keeps the unread badge so reaching the bottom can retry.
   */
  async markSelectedConversationRead(): Promise<AwikiActionResult> {
    if (this.disposed) return { ok: false, error: 'AWiki 插件已卸载' }
    const conversation = this.selectedConversation()
    if (conversation === undefined || (conversation.unreadCount ?? 0) <= 0) {
      return { ok: true, value: undefined }
    }
    const existing = this.markReadInFlight.get(conversation.id)
    if (existing !== undefined) return existing
    const conversationId = conversation.id
    const generation = this.generation
    const operation = (async (): Promise<AwikiActionResult> => {
      const result = await call(() => this.remote.markConversationRead({ conversationId }))
      if (!result.ok) return result
      if (this.current(generation)) {
        this.publish({
          ...this.view,
          conversations: this.view.conversations.map(current => current.id === conversationId
            ? { ...current, unreadCount: 0 }
            : current),
        })
      }
      return { ok: true, value: undefined }
    })()
    this.markReadInFlight.set(conversationId, operation)
    try {
      return await operation
    } finally {
      if (this.markReadInFlight.get(conversationId) === operation) {
        this.markReadInFlight.delete(conversationId)
      }
    }
  }

  /**
   * Load one older history page before the currently rendered messages.
   * @returns successful pagination or one display-safe failure.
   */
  loadOlderHistory(): Promise<AwikiActionResult> {
    return this.loadHistory(true)
  }

  /** Generate or regenerate the selected conversation's runtime-only summary. */
  async summarizeConversation(): Promise<AwikiActionResult<AwikiConversationSummary>> {
    const conversation = this.selectedConversation()
    if (conversation === undefined) return this.fail('请先选择会话')
    const conversationId = conversation.id
    const generation = this.generation
    this.setSummary(conversationId, { status: 'loading', collapsed: false, stale: false })
    const unreadCountAtOpen = this.unreadAtOpen.get(conversationId) ?? 0
    const result = await call(
      () => this.remote.summarizeConversation({
        conversationId,
        ...(unreadCountAtOpen > 0 ? { unreadCountAtOpen } : {}),
      }),
      summaryFailureMessage,
    )
    if (!this.current(generation)) return result
    if (!result.ok) {
      this.setSummary(conversationId, {
        status: 'error',
        collapsed: false,
        stale: false,
        error: result.error,
      })
      return result
    }
    this.setSummary(conversationId, {
      status: 'success',
      collapsed: false,
      stale: false,
      result: result.value,
    })
    const latestSentAt = Math.max(result.value.range.endedAt, ...this.view.messages.map(message => message.sentAt))
    const messageIdsAtLatest = new Set(this.view.messages
      .filter(message => message.sentAt === latestSentAt)
      .map(message => message.id))
    if (result.value.range.endedAt === latestSentAt) messageIdsAtLatest.add(result.value.range.lastMessageId)
    this.summaryBaselines.set(conversationId, { latestSentAt, messageIdsAtLatest })
    return result
  }

  /** Expand or collapse one cached summary without another model call. */
  setSummaryCollapsed(conversationId: AwikiConversationId, collapsed: boolean): void {
    const current = this.view.summaries[conversationId]
    if (current === undefined || current.status === 'idle') return
    this.setSummary(conversationId, { ...current, collapsed })
  }

  /**
   * Send one text message to the selected direct or group conversation.
   * @param text - non-empty text prepared by the composer.
   * @param clientMessageId - optional logical identity shared with the optimistic row.
   * @returns successful delivery or one display-safe failure.
   */
  async sendText(text: string, clientMessageId?: AwikiMessageId): Promise<AwikiActionResult> {
    const conversation = this.selectedConversation()
    if (conversation === undefined) return this.fail('请先选择会话')
    const conversationId = conversation.id
    const generation = this.generation
    const result = await this.withPending('发送消息', () => call(() => this.remote.sendText({
      target: targetOf(conversation),
      text,
      idempotencyKey: clientMessageId ?? crypto.randomUUID(),
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
    readonly clientMessageId?: AwikiMessageId
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
      idempotencyKey: file.clientMessageId ?? crypto.randomUUID(),
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
    const cacheKey = `${String(messageId)}\u0000${String(attachmentId)}`
    const cached = this.imageAttachments.get(cacheKey)
    if (cached !== undefined) {
      this.imageAttachments.delete(cacheKey)
      this.imageAttachments.set(cacheKey, cached)
      return { ok: true, value: cached }
    }
    const generation = this.generation
    const ownerDid = this.presentationCacheOwnerDid
    if (ownerDid !== null) {
      const persisted = await this.persistentImageCache.read(ownerDid, messageId, attachmentId).catch(() => undefined)
      if (!this.current(generation)) return { ok: false, error: 'AWiki 已关闭' }
      if (persisted !== undefined) {
        this.cacheImageAttachment(cacheKey, persisted)
        return { ok: true, value: persisted }
      }
    }
    const result = await call(() => this.remote.downloadAttachment({ attachmentId, messageId }))
    if (!this.current(generation)) return { ok: false, error: 'AWiki 已关闭' }
    if (result.ok && result.value.attachment.mimeType.startsWith('image/')) {
      this.cacheImageAttachment(cacheKey, result.value)
      if (ownerDid !== null) {
        void this.persistentImageCache.write(ownerDid, messageId, result.value).catch(() => undefined)
      }
    }
    return result
  }

  /** Clear Host-owned local data and immediately remove every cached browser projection. */
  async clearLocalData(request: AwikiClearLocalDataRequest): Promise<AwikiActionResult<AwikiClearLocalDataResult>> {
    if (this.disposed) return { ok: false, error: 'AWiki 插件已卸载' }
    const result = await call(() => this.remote.clearLocalData(request))
    if (!result.ok) return result
    await this.persistentImageCache.clear().catch(() => undefined)
    this.close()
    this.config = null
    this.conversationsCursor = undefined
    this.historyCursor = undefined
    this.unreadAtOpen.clear()
    this.summaryBaselines.clear()
    this.clearPresentationCache()
    this.publish({ ...INITIAL_VIEW, status: 'ready' })
    return result
  }

  /** Stop timers, invalidate work, and drop subscribers during HMR unload. */
  dispose(): void {
    this.disposed = true
    this.close()
    this.listeners.clear()
  }

  private async refreshConversations(generation: number, background = false): Promise<AwikiActionResult> {
    const result = await call(() => this.remote.listConversations({}))
    if (!this.current(generation)) return { ok: true, value: undefined }
    if (!result.ok) return background ? result : this.fail(result.error)
    const firstPage = this.view.conversations.length === 0
    if (firstPage) this.conversationsCursor = result.value.nextCursor
    const refreshed = result.value.items.map((incoming) => {
      const current = this.view.conversations.find(value => value.id === incoming.id)
      return this.cacheConversation(incoming, current)
    })
    this.publish({
      ...this.view,
      conversations: firstPage
        ? refreshed
        : appendUnique(refreshed, this.view.conversations, value => value.id),
      conversationsHasMore: firstPage
        ? result.value.hasMore && result.value.nextCursor !== undefined
        : this.view.conversationsHasMore,
      error: background ? this.view.error : null,
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
    if (!pageBelongsToConversation(conversationId, result.value.items)) {
      return this.fail('AWiki 远端消息归属不一致，请重新打开会话。')
    }
    this.historyCursor = result.value.nextCursor
    const messages = older
      ? mergeOlderMessages(this.view.messages, result.value.items)
      : mergeLatestMessages(this.view.messages, result.value.items)
    this.publish({
      ...this.view,
      // SDK pages are chronological. A continuation page contains older
      // messages, so it is prepended to the already rendered chronological tail.
      messages,
      historyHasMore: result.value.hasMore && result.value.nextCursor !== undefined,
      summaries: older ? this.view.summaries : this.staleSummaries(conversationId, result.value.items),
    })
    return { ok: true, value: undefined }
  }

  private async poll(generation: number): Promise<void> {
    if (this.polling || !this.current(generation) || this.view.identity === null) return
    this.polling = true
    try {
      await this.refreshConversations(generation, true)
      const selected = this.view.selectedConversationId
      if (selected === null || !this.current(generation)) return
      const result = await call(() => this.remote.getHistory({ conversationId: selected }))
      if (!this.current(generation) || !result.ok || this.view.selectedConversationId !== selected) return
      if (!pageBelongsToConversation(selected, result.value.items)) {
        this.publish({ ...this.view, error: 'AWiki 远端消息归属不一致，请重新打开会话。' })
        return
      }
      const existingIds = new Set(this.view.messages.map(message => message.id))
      const incoming = result.value.items.filter(message => !existingIds.has(message.id))
      const messages = mergeLatestMessages(this.view.messages, result.value.items)
      const added = messages.length - this.view.messages.length
      if (added > 0 && (this.unreadAtOpen.get(selected) ?? 0) > 0) {
        this.unreadAtOpen.set(selected, (this.unreadAtOpen.get(selected) ?? 0) + added)
      }
      this.publish({
        ...this.view,
        messages,
        summaries: this.staleSummaries(selected, incoming),
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
    if (this.view.selectedConversationId !== message.conversationId) return
    const isNew = !this.view.messages.some(current => current.id === message.id)
    const messages = appendMessageById(this.view.messages, message)
    if ((this.unreadAtOpen.get(message.conversationId) ?? 0) > 0 && messages.length > this.view.messages.length) {
      this.unreadAtOpen.set(message.conversationId, (this.unreadAtOpen.get(message.conversationId) ?? 0) + 1)
    }
    this.publish({
      ...this.view,
      messages,
      summaries: isNew ? this.markSummaryStale(message.conversationId) : this.view.summaries,
      error: null,
    })
  }

  private setSummary(conversationId: AwikiConversationId, summary: AwikiSummaryView): void {
    this.publish({
      ...this.view,
      summaries: Object.freeze({ ...this.view.summaries, [conversationId]: Object.freeze(summary) }),
    })
  }

  private staleSummaries(
    conversationId: AwikiConversationId,
    messages: readonly AwikiMessage[],
  ): Readonly<Record<string, AwikiSummaryView>> {
    const summary = this.view.summaries[conversationId]
    if (summary?.status !== 'success' || summary.result === undefined || summary.stale) return this.view.summaries
    const baseline = this.summaryBaselines.get(conversationId) ?? {
      latestSentAt: summary.result.range.endedAt,
      messageIdsAtLatest: new Set([summary.result.range.lastMessageId]),
    }
    const hasNewMessage = messages.some(message => (
      message.sentAt > baseline.latestSentAt
      || (message.sentAt === baseline.latestSentAt && !baseline.messageIdsAtLatest.has(message.id))
    ))
    if (!hasNewMessage) return this.view.summaries
    return this.markSummaryStale(conversationId)
  }

  private markSummaryStale(conversationId: AwikiConversationId): Readonly<Record<string, AwikiSummaryView>> {
    const summary = this.view.summaries[conversationId]
    if (summary?.status !== 'success' || summary.stale) return this.view.summaries
    return Object.freeze({
      ...this.view.summaries,
      [conversationId]: Object.freeze({ ...summary, stale: true }),
    })
  }

  private selectedConversation(): AwikiConversation | undefined {
    const selected = this.view.selectedConversationId
    return selected === null ? undefined : this.view.conversations.find(value => value.id === selected)
  }

  /** Keep presentation-only cache entries isolated to one authenticated identity. */
  private activatePresentationCache(identity: AwikiIdentity | null): void {
    const ownerDid = identity?.did ?? null
    if (ownerDid === this.presentationCacheOwnerDid) return
    this.directProfiles.clear()
    this.groupTitles.clear()
    this.clearImageAttachments()
    this.presentationCacheOwnerDid = ownerDid
  }

  /** Drop every browser projection without touching the Core-owned SQLite cache. */
  private clearPresentationCache(): void {
    this.directProfiles.clear()
    this.groupTitles.clear()
    this.clearImageAttachments()
    this.presentationCacheOwnerDid = null
  }

  /** Retain recently used verified image bytes without exposing them in AwikiView. */
  private cacheImageAttachment(key: string, value: AwikiDownloadedAttachment): void {
    if (value.attachment.size > BROWSER_IMAGE_ATTACHMENT_CACHE_MAX_BYTES) return
    const previous = this.imageAttachments.get(key)
    if (previous !== undefined) this.imageAttachmentCacheBytes -= previous.attachment.size
    this.imageAttachments.delete(key)
    this.imageAttachments.set(key, Object.freeze({
      attachment: Object.freeze({ ...value.attachment }),
      bytesBase64: value.bytesBase64,
    }))
    this.imageAttachmentCacheBytes += value.attachment.size
    while (this.imageAttachmentCacheBytes > BROWSER_IMAGE_ATTACHMENT_CACHE_MAX_BYTES) {
      const oldestKey = this.imageAttachments.keys().next().value as string | undefined
      if (oldestKey === undefined) break
      const oldest = this.imageAttachments.get(oldestKey)
      this.imageAttachments.delete(oldestKey)
      if (oldest !== undefined) this.imageAttachmentCacheBytes -= oldest.attachment.size
    }
  }

  private clearImageAttachments(): void {
    this.imageAttachments.clear()
    this.imageAttachmentCacheBytes = 0
  }

  /**
   * Reconcile direct identity and group title projections with their last trustworthy values.
   * Core remains authoritative; this browser cache only prevents sparse refreshes from
   * replacing already resolved presentation data with protocol identifiers.
   */
  private cacheConversation(
    incoming: AwikiConversation,
    current?: AwikiConversation,
  ): AwikiConversation {
    if (incoming.kind === 'direct') {
      const active = current?.kind === 'direct' && current.peerDid === incoming.peerDid ? current : undefined
      const cached = this.directProfiles.get(incoming.peerDid)
      const incomingDisplayName = incoming.displayName?.trim()
      const displayName = active?.displayName
        ?? cached?.displayName
        ?? (incomingDisplayName === undefined || incomingDisplayName === '' ? undefined : incomingDisplayName)
      const peerHandle = active?.peerHandle ?? cached?.peerHandle ?? incoming.peerHandle
      const title = displayName
        ?? (active !== undefined && hasDisplayableDirectTitle(active) ? active.title : undefined)
        ?? cached?.title
        ?? (hasDisplayableDirectTitle(incoming) ? incoming.title : undefined)
        ?? peerHandle
        ?? incoming.title
      if (displayName !== undefined || peerHandle !== undefined || hasDisplayableDirectTitle(incoming)) {
        this.directProfiles.set(incoming.peerDid, {
          ...(peerHandle === undefined ? {} : { peerHandle }),
          ...(displayName === undefined ? {} : { displayName }),
          ...hasDisplayableDirectTitle({ ...incoming, title }) ? { title } : {},
        })
      }
      return {
        ...incoming,
        title,
        ...(peerHandle === undefined ? {} : { peerHandle }),
        ...(displayName === undefined ? {} : { displayName }),
      }
    }
    return this.cacheGroupTitle(incoming, current)
  }

  /**
   * Reconcile one group roster row with the last trustworthy local presentation.
   * A real remote/Core title may update the cache; a temporary Group DID fallback may not.
   */
  private cacheGroupTitle(
    incoming: AwikiConversation,
    current?: AwikiConversation,
  ): AwikiConversation {
    if (incoming.kind !== 'group') return incoming
    if (hasDisplayableGroupTitle(incoming)) {
      this.groupTitles.set(incoming.groupDid, incoming.title)
      return incoming
    }
    if (current?.kind === 'group' && current.groupDid === incoming.groupDid && hasDisplayableGroupTitle(current)) {
      this.groupTitles.set(incoming.groupDid, current.title)
      return { ...incoming, title: current.title }
    }
    const cached = this.groupTitles.get(incoming.groupDid)
    return cached === undefined ? incoming : { ...incoming, title: cached }
  }

  private fail(error: string): AwikiActionResult<never> {
    this.publish({ ...this.view, status: this.view.status === 'loading' ? 'error' : this.view.status, pending: null, error })
    return { ok: false, error }
  }

  private current(generation: number): boolean {
    return !this.disposed && generation === this.generation
  }

  private currentSelection(
    generation: number,
    selectionRevision: number,
    conversationId: AwikiConversationId,
  ): boolean {
    return this.current(generation)
      && selectionRevision === this.selectionRevision
      && this.view.selectedConversationId === conversationId
  }

  private publish(view: AwikiView): void {
    /* v8 ignore next -- every asynchronous and public mutation path checks disposal before publishing. */
    if (this.disposed) return
    this.view = Object.freeze(view)
    for (const listener of [...this.listeners]) listener()
  }
}
