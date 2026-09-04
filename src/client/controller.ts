/** React-free browser controller for the deployment's one AWiki identity. */

import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {
  AwikiAttachmentId,
  AwikiCompletion,
  AwikiClearLocalDataRequest,
  AwikiClearLocalDataResult,
  AwikiConversation,
  AwikiConversationPreferenceMutation,
  AwikiConversationPreferences,
  AwikiConversationSummary,
  AwikiConversationId,
  AwikiCreateGroupRequest,
  AwikiCreateGroupResult,
  AwikiCreateIntegrationRequest,
  AwikiCursor,
  AwikiDirectConversation,
  AwikiDownloadedAttachment,
  AwikiAdminJoinProgress,
  AwikiApproveDeviceJoinRequest,
  AwikiDeviceJoinProgress,
  AwikiDeviceManagementSnapshot,
  AwikiFailure,
  AwikiGroupMember,
  AwikiGroupMemberPage,
  AwikiGroupMemberRecord,
  AwikiGroupSnapshot,
  AwikiHistoryRequest,
  AwikiHandle,
  AwikiIdentityAccessInspection,
  AwikiIdentityAccessInspectionRequest,
  AwikiIdentityAccessResult,
  AwikiIdentity,
  AwikiIntegrationResult,
  AwikiIntegrationRevisionRequest,
  AwikiIntegrationView,
  AwikiLogoutRequest,
  AwikiMessage,
  AwikiMessageId,
  AwikiMention,
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
  AwikiProfile,
  AwikiReopenIntegrationRequest,
  AwikiRecoveryOtpRequest,
  AwikiRecoveryOtpResult,
  AwikiRecoveryPrepareRequest,
  AwikiRecoveryProgress,
  AwikiConfirmRootTransferRequest,
  AwikiPrepareRootTransferRequest,
  AwikiRootTransferPreparation,
  AwikiRootTransferReceipt,
  AwikiResolvePeerRequest,
  AwikiResolvedPeer,
  AwikiRegistrationOtpRequest,
  AwikiRegistrationOtpResult,
  AwikiRegistrationRequest,
  AwikiRejectDeviceJoinRequest,
  AwikiRequestRefInput,
  AwikiRevokeDeviceRequest,
  AwikiResult,
  AwikiRuntimeConfig,
  AwikiSession,
  AwikiSendAttachmentRequest,
  AwikiSendTextRequest,
  AwikiSummarizeConversationRequest,
  AwikiUpdateDisplayNameRequest,
  AwikiUpdateProfileRequest,
  AwikiUpdateIntegrationRequest,
} from '@awiki/dsh-plugin/types'
import {
  IndexedDbAwikiBrowserImageCache,
  type AwikiBrowserImageCache,
} from './image-cache.ts'

/** The generated `remote.awiki` methods consumed by this controller. */
export interface AwikiRemote {
  /** Read browser-safe Host polling policy. */
  getConfig: () => Promise<RemoteResult<AwikiResult<AwikiRuntimeConfig>>>
  getIntegration: () => Promise<RemoteResult<AwikiIntegrationResult<AwikiIntegrationView>>>
  createIntegration: (request: AwikiCreateIntegrationRequest) => Promise<RemoteResult<AwikiIntegrationResult<AwikiIntegrationView>>>
  updateIntegration: (request: AwikiUpdateIntegrationRequest) => Promise<RemoteResult<AwikiIntegrationResult<AwikiIntegrationView>>>
  rotateIntegrationId: (request: AwikiIntegrationRevisionRequest) => Promise<RemoteResult<AwikiIntegrationResult<AwikiIntegrationView>>>
  closeIntegration: (request: AwikiIntegrationRevisionRequest) => Promise<RemoteResult<AwikiIntegrationResult<AwikiIntegrationView>>>
  reopenIntegration: (request: AwikiReopenIntegrationRequest) => Promise<RemoteResult<AwikiIntegrationResult<AwikiIntegrationView>>>
  /** Read the deployment's public identity, if registered. */
  getIdentity: () => Promise<RemoteResult<AwikiResult<AwikiIdentity | null>>>
  /** Read whether this installation is unregistered, signed out, or active. */
  getSession: () => Promise<RemoteResult<AwikiResult<AwikiSession>>>
  /** Sign out locally without deleting the persisted identity. */
  logout: (request: AwikiLogoutRequest) => Promise<RemoteResult<AwikiResult<AwikiSession>>>
  /** Resume the preserved local identity. */
  login: () => Promise<RemoteResult<AwikiResult<AwikiSession>>>
  /** Classify one configured-domain Handle before selecting the OTP purpose. */
  inspectIdentityAccess: (request: AwikiIdentityAccessInspectionRequest) => Promise<RemoteResult<AwikiResult<AwikiIdentityAccessInspection>>>
  /** Request one registration verification code. */
  sendRegistrationOtp: (request: AwikiRegistrationOtpRequest) => Promise<RemoteResult<AwikiResult<AwikiRegistrationOtpResult>>>
  /** Register and persist the deployment's sole identity. */
  registerIdentity: (request: AwikiRegistrationRequest) => Promise<RemoteResult<AwikiResult<AwikiIdentityAccessResult>>>
  beginDeviceJoin: () => Promise<RemoteResult<AwikiResult<AwikiDeviceJoinProgress>>>
  getDeviceJoinStatus: () => Promise<RemoteResult<AwikiResult<AwikiDeviceJoinProgress | null>>>
  cancelDeviceJoin: () => Promise<RemoteResult<AwikiResult<AwikiCompletion>>>
  retireDeviceIdentityForRejoin: () => Promise<RemoteResult<AwikiResult<AwikiCompletion>>>
  refreshDeviceManagement: () => Promise<RemoteResult<AwikiResult<AwikiDeviceManagementSnapshot>>>
  startDeviceJoinVerification: (request: AwikiRequestRefInput) => Promise<RemoteResult<AwikiResult<AwikiAdminJoinProgress>>>
  approveDeviceJoin: (request: AwikiApproveDeviceJoinRequest) => Promise<RemoteResult<AwikiResult<AwikiAdminJoinProgress>>>
  rejectDeviceJoin: (request: AwikiRejectDeviceJoinRequest) => Promise<RemoteResult<AwikiResult<AwikiAdminJoinProgress>>>
  revokeDevice: (request: AwikiRevokeDeviceRequest) => Promise<RemoteResult<AwikiResult<AwikiDeviceManagementSnapshot>>>
  prepareRootTransfer: (request: AwikiPrepareRootTransferRequest) => Promise<RemoteResult<AwikiResult<AwikiRootTransferPreparation>>>
  confirmRootTransfer: (request: AwikiConfirmRootTransferRequest) => Promise<RemoteResult<AwikiResult<AwikiRootTransferReceipt>>>
  /** Update the deployment identity's public WNS display name. */
  updateDisplayName: (request: AwikiUpdateDisplayNameRequest) => Promise<RemoteResult<AwikiResult<AwikiIdentity>>>
  getProfile: () => Promise<RemoteResult<AwikiResult<AwikiProfile>>>
  updateProfile: (request: AwikiUpdateProfileRequest) => Promise<RemoteResult<AwikiResult<AwikiProfile>>>
  sendRecoveryOtp: (request: AwikiRecoveryOtpRequest) => Promise<RemoteResult<AwikiResult<AwikiRecoveryOtpResult>>>
  prepareRecovery: (request: AwikiRecoveryPrepareRequest) => Promise<RemoteResult<AwikiResult<AwikiRecoveryProgress>>>
  activateRecovery: (request: { readonly operationId: string }) => Promise<RemoteResult<AwikiResult<AwikiRecoveryProgress>>>
  getRecoveryStatus: (request: { readonly operationId: string }) => Promise<RemoteResult<AwikiResult<AwikiRecoveryProgress>>>
  resumeRecovery: (request: { readonly operationId: string }) => Promise<RemoteResult<AwikiResult<AwikiRecoveryProgress>>>
  discardRecovery: (request: { readonly operationId: string }) => Promise<RemoteResult<AwikiResult<AwikiCompletion>>>
  /** Resolve one Handle or DID before opening a direct chat. */
  resolvePeer: (request: AwikiResolvePeerRequest) => Promise<RemoteResult<AwikiResult<AwikiResolvedPeer>>>
  /** Create one group and settle every initial-member invitation. */
  createGroup: (request: AwikiCreateGroupRequest) => Promise<RemoteResult<AwikiResult<AwikiCreateGroupResult>>>
  getGroup: (request: { readonly groupDid: AwikiGroupSnapshot['groupDid'] }) => Promise<RemoteResult<AwikiResult<AwikiGroupSnapshot>>>
  joinGroup: (request: { readonly groupDid: AwikiGroupSnapshot['groupDid'] }) => Promise<RemoteResult<AwikiResult<AwikiGroupSnapshot>>>
  leaveGroup: (request: { readonly groupDid: AwikiGroupSnapshot['groupDid'] }) => Promise<RemoteResult<AwikiResult<AwikiCompletion>>>
  listGroupMembers: (request: {
    readonly groupDid: AwikiGroupSnapshot['groupDid']
    readonly cursor?: AwikiGroupMemberPage['nextCursor']
    readonly limit?: number
  }) => Promise<RemoteResult<AwikiResult<AwikiGroupMemberPage>>>
  addGroupMember: (request: {
    readonly groupDid: AwikiGroupSnapshot['groupDid']
    readonly member: string
  }) => Promise<RemoteResult<AwikiResult<AwikiGroupMember>>>
  removeGroupMember: (request: {
    readonly groupDid: AwikiGroupSnapshot['groupDid']
    readonly member: string
  }) => Promise<RemoteResult<AwikiResult<AwikiGroupMember>>>
  /** Read identity-scoped, presentation-only roster preferences. */
  getConversationPreferences: () => Promise<RemoteResult<AwikiResult<AwikiConversationPreferences>>>
  /** Persist one presentation-only roster preference. */
  updateConversationPreference: (
    request: AwikiConversationPreferenceMutation,
  ) => Promise<RemoteResult<AwikiResult<AwikiConversationPreferences>>>
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

/** Authoritative access state for the currently selected Group conversation. */
export interface AwikiGroupAccessView {
  readonly groupDid: AwikiGroupSnapshot['groupDid']
  readonly status: 'loading' | 'available' | 'recovering' | 'blocked' | 'not-member' | 'network-error'
}

/** Session state rendered by the browser, including a recoverable revoked credential. */
export type AwikiViewSessionStatus = AwikiSession['status'] | 'recovery-required' | 'device-rejoin-required'

/** Immutable drawer data published through the framework hook binder. */
export interface AwikiView {
  readonly status: AwikiControllerStatus
  readonly sessionStatus: AwikiViewSessionStatus
  readonly identity: AwikiIdentity | null
  readonly profile: AwikiProfile | null
  readonly conversations: readonly AwikiConversation[]
  readonly hiddenConversations: readonly AwikiConversation[]
  readonly conversationsHasMore: boolean
  readonly selectedConversationId: AwikiConversationId | null
  readonly selectedGroup: AwikiGroupSnapshot | null
  readonly groupAccess: AwikiGroupAccessView | null
  readonly groupMembers: readonly AwikiGroupMemberRecord[]
  readonly groupMembersHasMore: boolean
  readonly messages: readonly AwikiMessage[]
  readonly historyHasMore: boolean
  /** True only while the selected conversation's committed local first page is loading. */
  readonly localPending: boolean
  /** True while the selected conversation is reconciling remote history in the background. */
  readonly refreshing: boolean
  readonly pending: string | null
  readonly error: string | null
  readonly attachmentMaxBytes: number
  readonly handleRecoveryPhoneEnabled: boolean
  readonly summaries: Readonly<Record<string, AwikiSummaryView>>
  readonly recoveryOperationId: string | null
  readonly recoveryProgress: AwikiRecoveryProgress | null
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
      return '该 Handle 刚刚已被注册。请返回身份入口，再按恢复流程重新获取验证码。'
    case 'conflict':
      return '注册冲突：服务端可能已收到上次注册请求，或该手机号 / Handle 已绑定其他身份。请保留当前页面并再次提交；若仍失败，请勿清除本机身份数据，联系管理员并提供失败时间。'
    case 'rate-limited':
      return '注册请求过于频繁，请稍后重试。'
    case 'network':
      return '无法连接 AWiki 服务，请检查网络后重试。'
    case 'identity-recovery-required':
      return '这台设备保留了原 AWiki 身份，但本地登录状态已被清除。请先恢复该身份或完整清除这台设备上的 AWiki 身份数据，再重新注册。'
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

function recoveryPreparationFailureMessage(failure: AwikiFailure): string {
  switch (failure.code) {
    case 'invalid-request':
      return '恢复信息不匹配，请检查验证码后重试。'
    case 'invalid-otp':
      return '验证码不正确，请检查后重试。'
    case 'challenge-expired':
      return '验证码状态已失效，请重新获取恢复验证码。'
    case 'rate-limited':
      return '恢复验证过于频繁，请稍后重试。'
    case 'network':
      return '无法连接 AWiki 服务，请检查网络后重试。'
    case 'remote':
      return 'AWiki 服务暂时无法验证恢复信息，请稍后重试。'
    default:
      return `${failure.code}：${failure.message}`
  }
}

function recoveryContinuationFailureMessage(
  failure: AwikiFailure,
  phase: AwikiRecoveryProgress['phase'] | undefined,
): string {
  const remoteCommitted = phase === 'remote_committed' || phase === 'identity_transition_pending'
  if (remoteCommitted && ['invalid-request', 'conflict', 'forbidden', 'remote'].includes(failure.code)) {
    return '身份已在服务端恢复，但本机切换尚未完成。请保留当前恢复操作，并继续完成本机切换；不要重新获取验证码或创建新身份。'
  }
  switch (failure.code) {
    case 'network':
      return remoteCommitted
        ? '身份已在服务端恢复，但当前设备暂时无法完成本机切换。请检查网络后继续完成本机切换。'
        : '恢复请求结果尚未确认。请保留当前恢复操作并重新检查状态，不要重复提交。'
    case 'invalid-request':
    case 'conflict':
      return '身份恢复暂未完成。请保留当前恢复操作并重新检查状态，不要重新获取验证码或创建新身份。'
    case 'rate-limited':
      return '恢复状态检查过于频繁，请稍后继续。'
    default:
      return `${failure.code}：${failure.message}`
  }
}

function identityAccessInspectionFailureMessage(failure: AwikiFailure): string {
  switch (failure.code) {
    case 'invalid-request':
      return 'Handle 格式不正确，请检查后重试。'
    case 'network':
      return '无法连接 AWiki 服务，暂时不能确认该 Handle 是否已经存在。'
    case 'remote':
      return 'AWiki 服务暂时无法确认该 Handle 的状态，请稍后重试。'
    default:
      return `${failure.code}：${failure.message}`
  }
}

const INITIAL_VIEW: AwikiView = Object.freeze({
  status: 'cold',
  sessionStatus: 'unregistered',
  identity: null,
  profile: null,
  conversations: Object.freeze([]),
  hiddenConversations: Object.freeze([]),
  conversationsHasMore: false,
  selectedConversationId: null,
  selectedGroup: null,
  groupAccess: null,
  groupMembers: Object.freeze([]),
  groupMembersHasMore: false,
  messages: Object.freeze([]),
  historyHasMore: false,
  localPending: false,
  refreshing: false,
  pending: null,
  error: null,
  attachmentMaxBytes: 0,
  handleRecoveryPhoneEnabled: false,
  summaries: Object.freeze({}),
  recoveryOperationId: null,
  recoveryProgress: null,
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

/** Turn a rejected group create into a concrete next step instead of exposing Host error text. */
function groupCreateFailureMessage(failure: AwikiFailure): string {
  switch (failure.code) {
    case 'invalid-request': return '群聊名称或首批成员格式不正确，请检查后重试。'
    case 'not-registered': return '请先注册 AWiki 身份后创建群聊。'
    case 'signed-out': return '当前 AWiki 身份已退出，请重新进入后创建群聊。'
    case 'forbidden': return '当前 AWiki 身份没有创建群聊的权限。'
    case 'rate-limited': return '创建群聊过于频繁，请稍后重试。'
    case 'network': return '无法连接 AWiki 服务，请检查网络后重试。'
    case 'conflict': return '群聊创建状态发生冲突，请刷新群聊列表后确认是否已经创建。'
    case 'remote': return 'AWiki 服务暂时无法创建群聊，请稍后重试。'
    default: return `${failure.code}：${failure.message}`
  }
}

/** Keep group authorization failures actionable without exposing raw service text. */
function groupReadFailureMessage(failure: AwikiFailure): string {
  switch (failure.code) {
    case 'group-membership-required':
      return '当前身份暂时无法访问这个群聊。若刚完成身份恢复，请返回会话列表重试群聊身份恢复；若持续出现，可能已不再是群成员。'
    case 'group-identity-stale':
      return '群聊身份正在恢复，请稍候后重试。'
    case 'not-found':
      return '这个群聊不存在，或当前身份已经无法访问。'
    case 'forbidden':
      return '当前身份没有访问这个群聊的权限。'
    case 'network':
      return '无法连接 AWiki 群聊服务，请检查网络后重试。'
    case 'remote':
      return 'AWiki 暂时无法读取这个群聊，请稍后重试。'
    default:
      return `${failure.code}：${failure.message}`
  }
}

function conversationPreferenceFailureMessage(_failure: AwikiFailure): string {
  return '无法保存本机会话设置，请稍后重试。'
}

type AwikiGroupReadFailureReason = Exclude<AwikiGroupAccessView['status'], 'loading' | 'available' | 'blocked'>

type AwikiGroupReadResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly error: string; readonly reason: AwikiGroupReadFailureReason }

function groupReadFailureReason(failure: AwikiFailure): AwikiGroupReadFailureReason {
  switch (failure.code) {
    case 'group-identity-stale': return 'recovering'
    case 'group-membership-required':
    case 'not-found':
    case 'forbidden': return 'not-member'
    default: return 'network-error'
  }
}

async function callGroupRead<Value>(
  operation: () => Promise<RemoteResult<AwikiResult<Value>>>,
): Promise<AwikiGroupReadResult<Value>> {
  try {
    const carried = await operation()
    if (!carried.ok) {
      return { ok: false, error: '暂时无法连接 AWiki 群聊服务，请稍后重新检查。', reason: 'network-error' }
    }
    if (!carried.value.ok) {
      return {
        ok: false,
        error: groupReadFailureMessage(carried.value.error),
        reason: groupReadFailureReason(carried.value.error),
      }
    }
    return { ok: true, value: carried.value.value }
  } catch {
    return { ok: false, error: '暂时无法连接 AWiki 群聊服务，请稍后重新检查。', reason: 'network-error' }
  }
}

/** Flatten the carrier and business result once for every controller caller. */
async function call<Value>(
  operation: () => Promise<RemoteResult<AwikiResult<Value>>>,
  failureMessage: (failure: AwikiFailure) => string = failure => `${failure.code}：${failure.message}`,
  carrierFailureMessage: (message: string) => string = message => `连接 AWiki Host 失败：${message}`,
): Promise<AwikiActionResult<Value>> {
  try {
    const carried = await operation()
    if (!carried.ok) return { ok: false, error: carrierFailureMessage(carried.error.message) }
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

/** Flatten the carrier and the isolated Guest Integration business result. */
async function callIntegration<Value>(
  operation: () => Promise<RemoteResult<AwikiIntegrationResult<Value>>>,
): Promise<AwikiActionResult<Value>> {
  try {
    const carried = await operation()
    if (!carried.ok) return { ok: false, error: `连接 AWiki Host 失败：${carried.error.message}` }
    if (!carried.value.ok) return { ok: false, error: carried.value.error.message }
    return { ok: true, value: carried.value.value }
  } catch {
    return { ok: false, error: '临时消息服务暂时不可用，请稍后重试。' }
  }
}

type AwikiCallWithFailureCodeResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly error: string; readonly failureCode?: AwikiFailure['code'] }

/** Preserve only the stable business code for controller-level state transitions. */
async function callWithFailureCode<Value>(
  operation: () => Promise<RemoteResult<AwikiResult<Value>>>,
): Promise<AwikiCallWithFailureCodeResult<Value>> {
  try {
    const carried = await operation()
    if (!carried.ok) return { ok: false, error: `连接 AWiki Host 失败：${carried.error.message}` }
    if (!carried.value.ok) {
      return {
        ok: false,
        error: `${carried.value.error.code}：${carried.value.error.message}`,
        failureCode: carried.value.error.code,
      }
    }
    return { ok: true, value: carried.value.value }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `AWiki 调用失败：${error.message}` : 'AWiki 调用失败',
    }
  }
}

function recoveryCarrierFailureMessage(message: string): string {
  return message.includes('business result failed boundary validation')
    ? '恢复信息已验证，但暂时无法读取恢复状态。请稍后重试。'
    : `连接 AWiki Host 失败：${message}`
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
const RECOVERY_OPERATION_STORAGE_KEY = 'awiki.handle-recovery.operation.v1'

function recoveryOperationStorageKey(tenantId: string | undefined): string {
  return tenantId === undefined || tenantId === ''
    ? RECOVERY_OPERATION_STORAGE_KEY
    : `${RECOVERY_OPERATION_STORAGE_KEY}.${encodeURIComponent(tenantId)}`
}

function storedRecoveryOperation(tenantId?: string): string | null {
  try {
    return globalThis.localStorage?.getItem(recoveryOperationStorageKey(tenantId)) ?? null
  } catch {
    return null
  }
}

function storeRecoveryOperation(operationId: string | null, tenantId?: string): void {
  try {
    const key = recoveryOperationStorageKey(tenantId)
    if (operationId === null) globalThis.localStorage?.removeItem(key)
    else globalThis.localStorage?.setItem(key, operationId)
  } catch {
    // Recovery remains durable in Core even when browser storage is unavailable.
  }
}

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

function groupMemberKey(member: AwikiGroupMemberRecord): string {
  return member.membershipId ?? member.did ?? member.credentialDid ?? member.handle ?? `${member.role ?? ''}:${member.joinedAt ?? ''}`
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
  private groupMembersCursor: AwikiGroupMemberPage['nextCursor']
  private timer: ReturnType<typeof setInterval> | undefined
  private opening: Promise<AwikiActionResult> | undefined
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
  /** Identity-scoped product overlays. Core conversations and history remain untouched. */
  private readonly hiddenConversationPreferences = new Map<AwikiConversationId, {
    readonly conversation: AwikiConversation
    readonly hiddenAt: number
  }>()
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

  /** Open the deployment-matched dynamic Integration guide. */
  openIntegrationGuide(): void {
    const url = this.config?.integrationGuideUrl
    if (url !== undefined) window.open(url, '_blank', 'noopener,noreferrer')
  }

  /** Load Host policy and the shared identity state without starting drawer polling. */
  async loadSession(): Promise<AwikiActionResult> {
    if (this.disposed) return { ok: false, error: 'AWiki 插件已卸载' }
    this.stopPollingLifecycle()
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
      handleRecoveryPhoneEnabled: config.value.handleRecoveryPhoneEnabled,
      recoveryOperationId: storedRecoveryOperation(this.config?.tenantId),
    })
    const operationId = storedRecoveryOperation(this.config?.tenantId)
    if (operationId !== null) {
      const recovery = await call(() => this.remote.getRecoveryStatus({ operationId }))
      if (this.current(generation) && recovery.ok) {
        this.publish({ ...this.view, recoveryOperationId: operationId, recoveryProgress: recovery.value })
        if (recovery.value.phase === 'applied') {
          storeRecoveryOperation(null, this.config?.tenantId)
          this.publish({ ...this.view, recoveryOperationId: null, recoveryProgress: recovery.value })
          if (identity === null) return this.loadSession()
        }
      }
    }
    if (identity !== null) {
      await this.loadConversationPreferences(generation)
      const profile = await call(() => this.remote.getProfile())
      if (this.current(generation) && profile.ok) this.publish({ ...this.view, profile: profile.value })
    }
    return { ok: true, value: undefined }
  }

  /**
   * Load Host policy and identity, then start polling while the drawer remains open.
   * @returns successful readiness or one display-safe Host failure.
   */
  async open(): Promise<AwikiActionResult> {
    if (this.opening !== undefined) return this.opening
    const opening = this.openOnce()
    this.opening = opening
    try {
      return await opening
    } finally {
      if (this.opening === opening) this.opening = undefined
    }
  }

  private async openOnce(): Promise<AwikiActionResult> {
    const loaded = await this.loadSession()
    if (!loaded.ok) return loaded
    const generation = this.generation
    let listed: AwikiActionResult = { ok: true, value: undefined }
    if (this.view.identity !== null) {
      listed = await this.refreshConversations(generation)
    }
    if (this.current(generation)) {
      if (this.timer !== undefined) clearInterval(this.timer)
      this.timer = setInterval(() => { void this.poll(generation) }, this.config?.pollIntervalMs ?? 3_000)
    }
    return listed
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
      handleRecoveryPhoneEnabled: this.config?.handleRecoveryPhoneEnabled ?? false,
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
    this.opening = undefined
    this.stopPollingLifecycle()
  }

  private stopPollingLifecycle(): void {
    this.generation += 1
    this.selectionRevision += 1
    if (this.timer !== undefined) clearInterval(this.timer)
    this.timer = undefined
    this.polling = false
    this.markReadInFlight.clear()
    this.groupMembersCursor = undefined
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

  /** Classify one Handle before sending exactly one registration or recovery OTP. */
  async inspectIdentityAccess(
    request: AwikiIdentityAccessInspectionRequest,
  ): Promise<AwikiActionResult<AwikiIdentityAccessInspection>> {
    return this.withPending('检查身份', () => call(
      () => this.remote.inspectIdentityAccess(request),
      identityAccessInspectionFailureMessage,
    ))
  }

  /**
   * Register the deployment identity and populate the initial conversation list.
   * @param request - verified Handle, phone number, and one-time code.
   * @returns the registered public identity or one display-safe failure.
   */
  async registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiActionResult<AwikiIdentityAccessResult>> {
    const generation = this.generation
    const result = await this.withPending('注册身份', () => call(
      () => this.remote.registerIdentity(request),
      registrationFailureMessage,
    ))
    if (!result.ok) return result
    if (!this.current(generation)) return result
    if (result.value.status === 'registered') {
      this.activatePresentationCache(result.value.identity)
      this.publish({ ...this.view, sessionStatus: 'active', identity: result.value.identity, error: null })
      await this.refreshConversations(generation)
    }
    return result
  }

  beginDeviceJoin(): Promise<AwikiActionResult<AwikiDeviceJoinProgress>> {
    return this.withPending('开始加入设备', () => call(() => this.remote.beginDeviceJoin()))
  }

  async getDeviceJoinStatus(): Promise<AwikiActionResult<AwikiDeviceJoinProgress | null>> {
    const result = await call(() => this.remote.getDeviceJoinStatus())
    if (result.ok && result.value?.completed) await this.open()
    return result
  }

  cancelDeviceJoin(): Promise<AwikiActionResult> {
    return this.withPending('取消加入设备', async () => {
      const result = await call(() => this.remote.cancelDeviceJoin())
      return result.ok ? { ok: true, value: undefined } : result
    })
  }

  retireDeviceIdentityForRejoin(): Promise<AwikiActionResult> {
    return this.withPending('准备重新加入设备', async () => {
      const result = await call(() => this.remote.retireDeviceIdentityForRejoin())
      if (!result.ok) return result
      this.publish({ ...this.view, sessionStatus: 'unregistered', identity: null, error: null })
      return { ok: true, value: undefined }
    })
  }

  refreshDeviceManagement(): Promise<AwikiActionResult<AwikiDeviceManagementSnapshot>> {
    return call(() => this.remote.refreshDeviceManagement())
  }

  startDeviceJoinVerification(request: AwikiRequestRefInput): Promise<AwikiActionResult<AwikiAdminJoinProgress>> {
    return this.withPending('开始设备验证', () => call(() => this.remote.startDeviceJoinVerification(request)))
  }

  approveDeviceJoin(request: AwikiApproveDeviceJoinRequest): Promise<AwikiActionResult<AwikiAdminJoinProgress>> {
    return this.withPending('批准设备', () => call(() => this.remote.approveDeviceJoin(request)))
  }

  rejectDeviceJoin(request: AwikiRejectDeviceJoinRequest): Promise<AwikiActionResult<AwikiAdminJoinProgress>> {
    return this.withPending('拒绝设备', () => call(() => this.remote.rejectDeviceJoin(request)))
  }

  revokeDevice(request: AwikiRevokeDeviceRequest): Promise<AwikiActionResult<AwikiDeviceManagementSnapshot>> {
    return this.withPending('撤销设备', () => call(() => this.remote.revokeDevice(request)))
  }

  prepareRootTransfer(request: AwikiPrepareRootTransferRequest): Promise<AwikiActionResult<AwikiRootTransferPreparation>> {
    return this.withPending('准备授予管理权', () => call(() => this.remote.prepareRootTransfer(request)))
  }

  confirmRootTransfer(request: AwikiConfirmRootTransferRequest): Promise<AwikiActionResult<AwikiRootTransferReceipt>> {
    return this.withPending('验证并授予管理权', () => call(() => this.remote.confirmRootTransfer(request)))
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

  /** Save all supported public profile fields and keep identity/profile projections aligned. */
  async updateProfile(request: AwikiUpdateProfileRequest): Promise<AwikiActionResult<AwikiProfile>> {
    const displayName = request.displayName.trim()
    const bio = request.bio.trim()
    const tags = request.tags.map(tag => tag.trim()).filter(tag => tag !== '')
    if (displayName === '' || Array.from(displayName).length > 50) return this.fail('昵称需要填写且不能超过 50 个字符')
    if (Array.from(bio).length > 100) return this.fail('个人简介不能超过 100 个字符')
    if (tags.length > 5 || new Set(tags.map(tag => tag.toLocaleLowerCase())).size !== tags.length) {
      return this.fail('最多填写 5 个不重复的标签')
    }
    const generation = this.generation
    const result = await this.withPending('保存资料', () => call(() => this.remote.updateProfile({ displayName, bio, tags })))
    if (!result.ok || !this.current(generation)) return result
    const identity = this.view.identity === null ? null : { ...this.view.identity, displayName: result.value.displayName }
    this.publish({ ...this.view, identity, profile: result.value, error: null })
    return result
  }

  /** Request a recovery OTP and persist only its secret-free operation id in the browser. */
  async sendRecoveryOtp(request: AwikiRecoveryOtpRequest): Promise<AwikiActionResult<AwikiRecoveryOtpResult>> {
    const result = await this.withPending(
      '发送恢复验证码',
      () => call(() => this.remote.sendRecoveryOtp(request), registrationOtpFailureMessage),
      { publishFailure: false },
    )
    if (!result.ok) return result
    storeRecoveryOperation(result.value.operationId, this.config?.tenantId)
    this.publish({ ...this.view, recoveryOperationId: result.value.operationId, recoveryProgress: null })
    return result
  }

  /** Verify the recovery OTP without attempting the remote identity mutation yet. */
  async prepareRecovery(request: Omit<AwikiRecoveryPrepareRequest, 'operationId'>): Promise<AwikiActionResult<AwikiRecoveryProgress>> {
    const operationId = this.view.recoveryOperationId
    if (operationId === null) return this.fail('请先获取恢复验证码')
    const result = await this.withPending('验证恢复信息', () => call(
      () => this.remote.prepareRecovery({ ...request, operationId }),
      recoveryPreparationFailureMessage,
      recoveryCarrierFailureMessage,
    ), { publishFailure: false })
    if (result.ok) this.publish({ ...this.view, recoveryProgress: result.value })
    return result
  }

  /** Commit the prepared operation once. Unknown outcomes remain available through status refresh. */
  async activateRecovery(): Promise<AwikiActionResult<AwikiRecoveryProgress>> {
    const operationId = this.view.recoveryOperationId
    if (operationId === null) return this.fail('没有可继续的身份恢复操作')
    if (this.view.recoveryProgress?.phase !== 'ready_to_commit') return this.fail('请先完成恢复信息验证')
    const phase = this.view.recoveryProgress.phase
    const result = await this.withPending('恢复身份', () => call(
      () => this.remote.activateRecovery({ operationId }),
      failure => recoveryContinuationFailureMessage(failure, phase),
      recoveryCarrierFailureMessage,
    ), { publishFailure: false })
    if (!result.ok) return result
    this.publish({ ...this.view, recoveryProgress: result.value })
    if (result.value.phase === 'applied') {
      storeRecoveryOperation(null, this.config?.tenantId)
      this.publish({ ...this.view, recoveryOperationId: null, recoveryProgress: result.value })
      await this.open()
    }
    return result
  }

  /** Refresh Core status without repeating activation. */
  async refreshRecoveryStatus(): Promise<AwikiActionResult<AwikiRecoveryProgress>> {
    const operationId = this.view.recoveryOperationId
    if (operationId === null) return this.fail('没有可查询的身份恢复操作')
    const result = await this.withPending('刷新恢复状态', () => call(
      () => this.remote.getRecoveryStatus({ operationId }),
      undefined,
      recoveryCarrierFailureMessage,
    ), { publishFailure: false })
    if (!result.ok) return result
    this.publish({ ...this.view, recoveryProgress: result.value })
    if (result.value.phase === 'applied') {
      storeRecoveryOperation(null, this.config?.tenantId)
      this.publish({ ...this.view, recoveryOperationId: null, recoveryProgress: result.value })
      await this.open()
    }
    return result
  }

  /** Resume only a Core-declared retryable or uncertain phase. */
  async resumeRecovery(): Promise<AwikiActionResult<AwikiRecoveryProgress>> {
    const operationId = this.view.recoveryOperationId
    const progress = this.view.recoveryProgress
    if (operationId === null || progress === null) return this.fail('请先刷新恢复状态')
    if (!progress.retryable && !['remote_outcome_unknown', 'remote_committed', 'identity_transition_pending'].includes(progress.phase)) {
      return this.fail('当前恢复状态不能重试')
    }
    const result = await this.withPending('继续恢复身份', () => call(
      () => this.remote.resumeRecovery({ operationId }),
      failure => recoveryContinuationFailureMessage(failure, progress.phase),
      recoveryCarrierFailureMessage,
    ), { publishFailure: false })
    if (!result.ok) return result
    this.publish({ ...this.view, recoveryProgress: result.value })
    if (result.value.phase === 'applied') {
      storeRecoveryOperation(null, this.config?.tenantId)
      this.publish({ ...this.view, recoveryOperationId: null, recoveryProgress: result.value })
      await this.open()
    }
    return result
  }

  /** Discard only a pre-attempt operation. */
  async discardRecovery(): Promise<AwikiActionResult> {
    const operationId = this.view.recoveryOperationId
    if (operationId === null) return { ok: true, value: undefined }
    const phase = this.view.recoveryProgress?.phase
    if (phase !== undefined && phase !== 'awaiting_factor' && phase !== 'ready_to_commit') {
      return this.fail('当前恢复状态不能取消')
    }
    const result = await this.withPending(
      '取消身份恢复',
      () => call(() => this.remote.discardRecovery({ operationId })),
      { publishFailure: false },
    )
    if (!result.ok) return result
    storeRecoveryOperation(null, this.config?.tenantId)
    this.publish({ ...this.view, recoveryOperationId: null, recoveryProgress: null })
    return { ok: true, value: undefined }
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
    const result = await this.withPending('加载更多会话', () => this.listConversationPage(
      this.conversationsCursor === undefined ? {} : { cursor: this.conversationsCursor },
    ))
    if (!result.ok) return result
    if (!this.current(generation)) return { ok: true, value: undefined }
    this.conversationsCursor = result.value.nextCursor
    const conversations = await this.reconcileConversationPage(result.value.items, generation)
    if (!this.current(generation)) return { ok: true, value: undefined }
    this.publish({
      ...this.view,
      conversations: appendUnique(this.view.conversations, conversations.visible, value => value.id),
      hiddenConversations: conversations.hidden,
      conversationsHasMore: result.value.hasMore && result.value.nextCursor !== undefined,
    })
    return { ok: true, value: undefined }
  }

  /** Hide one recent row locally without leaving a group or deleting history. */
  async hideConversation(conversationId: AwikiConversationId): Promise<AwikiActionResult> {
    const conversation = this.view.conversations.find(item => item.id === conversationId)
    if (conversation === undefined) return this.fail('该会话已不在当前列表中')
    const generation = this.generation
    const result = await this.withPending('移除会话', () => call(
      () => this.remote.updateConversationPreference({ action: 'hide', conversation }),
      conversationPreferenceFailureMessage,
    ))
    if (!result.ok) return result
    if (!this.current(generation)) return { ok: true, value: undefined }
    this.applyConversationPreferences(result.value)
    const selected = this.view.selectedConversationId === conversationId
    if (selected) {
      this.selectionRevision += 1
      this.historyCursor = undefined
      this.groupMembersCursor = undefined
    }
    this.publish({
      ...this.view,
      conversations: this.view.conversations.filter(item => item.id !== conversationId),
      hiddenConversations: this.hiddenConversationsView(),
      ...(selected
        ? {
            selectedConversationId: null,
            selectedGroup: null,
            groupAccess: null,
            groupMembers: [],
            groupMembersHasMore: false,
            messages: [],
            historyHasMore: false,
            localPending: false,
            refreshing: false,
          }
        : {}),
      error: null,
    })
    return { ok: true, value: undefined }
  }

  /** Restore one locally hidden row to the recent roster. */
  async restoreConversation(conversationId: AwikiConversationId): Promise<AwikiActionResult> {
    const hidden = this.hiddenConversationPreferences.get(conversationId)
    if (hidden === undefined) return { ok: true, value: undefined }
    const generation = this.generation
    const result = await this.withPending('恢复会话', () => call(
      () => this.remote.updateConversationPreference({ action: 'restore', conversationId }),
      conversationPreferenceFailureMessage,
    ))
    if (!result.ok) return result
    if (!this.current(generation)) return { ok: true, value: undefined }
    this.applyConversationPreferences(result.value)
    const conversation = this.cacheConversation(
      hidden.conversation,
      this.view.conversations.find(item => item.id === conversationId),
    )
    this.publish({
      ...this.view,
      conversations: appendUnique([conversation], this.view.conversations, item => item.id),
      hiddenConversations: this.hiddenConversationsView(),
      error: null,
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
    const existing = findDirect([...this.view.conversations, ...this.view.hiddenConversations], peer)
    if (existing !== undefined) {
      if (this.hiddenConversationPreferences.has(existing.id)) {
        const restored = await this.restoreConversation(existing.id)
        if (!restored.ok) return restored
      }
      return this.selectConversation(existing.id)
    }
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
    }), groupCreateFailureMessage))
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

  /** Join one open group by its canonical DID, then select the refreshed conversation. */
  async joinGroup(groupDidInput: string): Promise<AwikiActionResult<AwikiGroupSnapshot>> {
    const groupDid = groupDidInput.trim() as AwikiGroupSnapshot['groupDid']
    if (!groupDid.startsWith('did:')) return this.fail('请输入有效的群 DID')
    const generation = this.generation
    const result = await this.withPending('加入群聊', () => call(() => this.remote.joinGroup({ groupDid })))
    if (!result.ok || !this.current(generation)) return result
    await this.refreshConversations(generation)
    if (!this.current(generation)) return result
    const conversation = [...this.view.conversations, ...this.view.hiddenConversations]
      .find(value => value.kind === 'group' && value.groupDid === groupDid)
      ?? this.cacheConversation({
        kind: 'group',
        id: result.value.conversationId,
        groupDid,
        title: result.value.title,
        unreadCount: 0,
      })
    if (this.hiddenConversationPreferences.has(conversation.id)) {
      const restored = await this.restoreConversation(conversation.id)
      if (!restored.ok) return { ok: false, error: restored.error }
    } else {
      this.publish({
        ...this.view,
        conversations: appendUnique([conversation], this.view.conversations, value => value.id),
      })
    }
    await this.selectConversation(conversation.id)
    return result
  }

  /** Refresh the selected group's authoritative snapshot and first member page. */
  async refreshSelectedGroup(): Promise<AwikiActionResult> {
    const conversation = this.selectedConversation()
    if (conversation?.kind !== 'group') return this.fail('请先打开一个群聊')
    if (this.disposed) return { ok: false, error: 'AWiki 插件已卸载' }
    const generation = this.generation
    this.publish({ ...this.view, pending: '刷新群成员', error: null })
    const result = await (async () => {
      const refreshed = await this.loadGroupState(conversation, true, true)
      return refreshed.ok ? { ok: true as const, value: undefined } : refreshed
    })()
    if (this.current(generation)) this.publish({ ...this.view, pending: null, error: null })
    return result
  }

  /** Load the next authoritative member page using Core's opaque cursor. */
  async loadMoreGroupMembers(): Promise<AwikiActionResult> {
    const group = this.view.selectedGroup
    if (group === null || this.groupMembersCursor === undefined) return { ok: true, value: undefined }
    const result = await this.withPending('加载更多群成员', () => call(() => this.remote.listGroupMembers({
      groupDid: group.groupDid,
      cursor: this.groupMembersCursor,
      limit: 50,
    })))
    if (!result.ok) return result
    if (result.value.pageGroup !== undefined && result.value.pageGroup !== group.groupDid) {
      return this.fail('群成员分页归属不一致，请刷新后重试')
    }
    this.groupMembersCursor = result.value.nextCursor
    this.publish({
      ...this.view,
      groupMembers: appendUnique(this.view.groupMembers, result.value.items, groupMemberKey),
      groupMembersHasMore: result.value.hasMore && result.value.nextCursor !== undefined,
    })
    return { ok: true, value: undefined }
  }

  /** Invite one ordinary member, then replace snapshot and roster with authoritative reads. */
  async addSelectedGroupMember(memberInput: string): Promise<AwikiActionResult<AwikiGroupMember>> {
    const group = this.view.selectedGroup
    const member = normalizeHandle(memberInput)
    if (group === null) return this.fail('请先打开一个群聊')
    if (member === '') return this.fail('请输入成员 Handle 或 DID')
    if (this.view.identity !== null && (member === this.view.identity.did || sameIdentity(this.view.identity, member))) {
      return this.fail('群成员列表不需要包含自己')
    }
    return await this.withPending('邀请群成员', async () => {
      const invited = await call(() => this.remote.addGroupMember({
        groupDid: group.groupDid,
        member,
      }))
      if (!invited.ok) return invited
      const refreshed = await this.reloadSelectedGroupAfterMutation(group.groupDid)
      if (!refreshed.ok) {
        return {
          ok: false,
          error: `已提交对 ${member} 的邀请，但成员列表刷新失败。请点击刷新查看最新状态。`,
        }
      }
      return invited
    })
  }

  /** Remove one authorized member, then refresh count, roles, and roster from Core. */
  async removeSelectedGroupMember(member: AwikiGroupMemberRecord): Promise<AwikiActionResult<AwikiGroupMember>> {
    const group = this.view.selectedGroup
    const reference = member.did ?? member.handle
    if (group === null || reference === undefined) return this.fail('该成员缺少可用的身份标识')
    const result = await this.withPending('移除群成员', () => call(() => this.remote.removeGroupMember({
      groupDid: group.groupDid,
      member: reference,
    })))
    if (result.ok) await this.reloadSelectedGroupAfterMutation(group.groupDid)
    return result
  }

  /** Leave the selected group; Core prevents the owner from leaving. */
  async leaveSelectedGroup(): Promise<AwikiActionResult> {
    const group = this.view.selectedGroup
    if (group === null) return this.fail('请先打开一个群聊')
    const generation = this.generation
    const result = await this.withPending('退出群聊', () => call(() => this.remote.leaveGroup({ groupDid: group.groupDid })))
    if (!result.ok) return result
    if (!this.current(generation)) return { ok: true, value: undefined }
    this.groupMembersCursor = undefined
    this.publish({
      ...this.view,
      selectedConversationId: null,
      selectedGroup: null,
      groupAccess: null,
      groupMembers: [],
      groupMembersHasMore: false,
      messages: [],
    })
    await this.refreshConversations(generation)
    return { ok: true, value: undefined }
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
    this.groupMembersCursor = undefined
    const selected = conversationId === null
      ? undefined
      : this.view.conversations.find(conversation => conversation.id === conversationId)
    if (selected !== undefined) this.unreadAtOpen.set(selected.id, selected.unreadCount ?? 0)
    this.publish({
      ...this.view,
      selectedConversationId: conversationId,
      selectedGroup: null,
      groupAccess: selected?.kind === 'group'
        ? { groupDid: selected.groupDid, status: 'loading' }
        : null,
      groupMembers: [],
      groupMembersHasMore: false,
      messages: sameConversation ? this.view.messages : [],
      historyHasMore: false,
      localPending: conversationId !== null,
      refreshing: false,
      error: null,
    })
    if (selected?.kind === 'group') void this.loadGroupState(selected, true)
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

  private async loadGroupState(
    conversation: Extract<AwikiConversation, { readonly kind: 'group' }>,
    reset: boolean,
    preserveAvailableOnNetworkFailure = false,
  ): Promise<AwikiActionResult<AwikiGroupSnapshot>> {
    const generation = this.generation
    const selectionRevision = this.selectionRevision
    const snapshot = await callGroupRead(() => this.remote.getGroup({ groupDid: conversation.groupDid }))
    if (!snapshot.ok) {
      const retainAvailable = preserveAvailableOnNetworkFailure
        && snapshot.reason === 'network-error'
        && this.view.groupAccess?.groupDid === conversation.groupDid
        && this.view.groupAccess.status === 'available'
      if (!retainAvailable && this.currentSelection(generation, selectionRevision, conversation.id)) {
        this.publishGroupAccessFailure(conversation, snapshot.reason)
      }
      return snapshot
    }
    if (this.currentSelection(generation, selectionRevision, conversation.id)) {
      const access = this.view.groupAccess
      this.publish({
        ...this.view,
        selectedGroup: snapshot.value,
        groupAccess: access?.groupDid === conversation.groupDid && access.status === 'available'
          ? access
          : { groupDid: conversation.groupDid, status: 'loading' },
        error: null,
      })
    }
    const members = await callGroupRead(
      () => this.remote.listGroupMembers({ groupDid: conversation.groupDid, limit: 50 }),
    )
    if (!members.ok) {
      const retainAvailable = preserveAvailableOnNetworkFailure
        && members.reason === 'network-error'
        && this.view.groupAccess?.groupDid === conversation.groupDid
        && this.view.groupAccess.status === 'available'
      if (!retainAvailable && this.currentSelection(generation, selectionRevision, conversation.id)) {
        this.publishGroupAccessFailure(conversation, members.reason)
      }
      return members
    }
    if (!this.currentSelection(generation, selectionRevision, conversation.id)) return snapshot
    if (members.value.pageGroup !== undefined && members.value.pageGroup !== conversation.groupDid) {
      return this.fail('群成员列表归属不一致，请刷新后重试')
    }
    this.groupMembersCursor = members.value.nextCursor
    this.publish({
      ...this.view,
      selectedGroup: snapshot.value,
      groupAccess: { groupDid: conversation.groupDid, status: 'available' },
      groupMembers: reset
        ? members.value.items
        : appendUnique(this.view.groupMembers, members.value.items, groupMemberKey),
      groupMembersHasMore: members.value.hasMore && members.value.nextCursor !== undefined,
    })
    return snapshot
  }

  private async reloadSelectedGroupAfterMutation(expectedGroupDid: AwikiGroupSnapshot['groupDid']): Promise<AwikiActionResult> {
    const conversation = this.selectedConversation()
    if (conversation?.kind !== 'group' || conversation.groupDid !== expectedGroupDid) {
      return { ok: true, value: undefined }
    }
    const generation = this.generation
    const group = await this.loadGroupState(conversation, true)
    if (!group.ok) return group
    if (!this.current(generation)) return { ok: true, value: undefined }
    await this.refreshConversations(generation, true)
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
      if (selected?.kind === 'group') this.publishGroupAccessFailure(selected, remote.reason)
      this.publish({
        ...this.view,
        refreshing: false,
        error: selected?.kind === 'group' ? null : refreshFailureMessage(this.view.messages, remote.error),
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
  ): Promise<AwikiGroupReadResult<AwikiPage<AwikiMessage>>> {
    if (conversation?.kind !== 'group') {
      const result = await call(() => this.remote.getHistory({ conversationId }))
      return result.ok
        ? result
        : { ...result, reason: 'network-error' }
    }
    for (const retryDelay of GROUP_HISTORY_RETRY_DELAYS_MS) {
      const remote = await callGroupRead(() => this.remote.getHistory({ conversationId }))
      if (remote.ok || !this.currentSelection(generation, selectionRevision, conversationId)) return remote
      if (remote.reason !== 'network-error') return remote
      await delay(retryDelay)
      if (!this.currentSelection(generation, selectionRevision, conversationId)) return remote
    }
    return callGroupRead(() => this.remote.getHistory({ conversationId }))
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
    if (conversation.kind === 'group' && this.view.groupAccess?.status !== 'available') {
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
  async sendText(
    text: string,
    clientMessageId?: AwikiMessageId,
    mentions?: readonly AwikiMention[],
  ): Promise<AwikiActionResult> {
    const conversation = this.selectedConversation()
    if (conversation === undefined) return this.fail('请先选择会话')
    if (conversation.kind === 'group' && this.view.groupAccess?.status !== 'available') {
      return this.fail('当前身份尚未获得这个群聊的发送权限，请先重新检查群成员状态。')
    }
    const conversationId = conversation.id
    const generation = this.generation
    const result = await this.withPending('发送消息', () => call(() => this.remote.sendText({
      target: targetOf(conversation),
      text,
      idempotencyKey: clientMessageId ?? crypto.randomUUID(),
      ...mentions === undefined || mentions.length === 0 ? {} : { mentions },
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
    if (conversation.kind === 'group' && this.view.groupAccess?.status !== 'available') {
      return this.fail('当前身份尚未获得这个群聊的发送权限，请先重新检查群成员状态。')
    }
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
    const tenantId = this.config?.tenantId
    this.close()
    this.config = null
    this.conversationsCursor = undefined
    this.historyCursor = undefined
    this.unreadAtOpen.clear()
    this.summaryBaselines.clear()
    this.clearPresentationCache()
    storeRecoveryOperation(null, tenantId)
    this.publish({ ...INITIAL_VIEW, status: 'ready' })
    return result
  }

  /** Read the Integration without coupling Guest Gateway health to the main AWiki view. */
  getIntegration(): Promise<AwikiActionResult<AwikiIntegrationView>> {
    return callIntegration(() => this.remote.getIntegration())
  }

  createIntegration(request: AwikiCreateIntegrationRequest): Promise<AwikiActionResult<AwikiIntegrationView>> {
    return callIntegration(() => this.remote.createIntegration(request))
  }

  updateIntegration(request: AwikiUpdateIntegrationRequest): Promise<AwikiActionResult<AwikiIntegrationView>> {
    return callIntegration(() => this.remote.updateIntegration(request))
  }

  rotateIntegrationId(request: AwikiIntegrationRevisionRequest): Promise<AwikiActionResult<AwikiIntegrationView>> {
    return callIntegration(() => this.remote.rotateIntegrationId(request))
  }

  closeIntegration(request: AwikiIntegrationRevisionRequest): Promise<AwikiActionResult<AwikiIntegrationView>> {
    return callIntegration(() => this.remote.closeIntegration(request))
  }

  reopenIntegration(request: AwikiReopenIntegrationRequest): Promise<AwikiActionResult<AwikiIntegrationView>> {
    return callIntegration(() => this.remote.reopenIntegration(request))
  }

  /** Return only locally known groups for which the active identity is authoritative owner. */
  async listOwnedGroups(): Promise<AwikiActionResult<readonly AwikiGroupSnapshot[]>> {
    const groups: AwikiGroupSnapshot[] = []
    const visited = new Set<string>()
    let cursor: AwikiCursor | undefined
    for (let pageIndex = 0; pageIndex < 20 && groups.length < 20; pageIndex += 1) {
      const conversations = await call(() => this.remote.listConversations({
        limit: 100,
        ...(cursor === undefined ? {} : { cursor }),
      }))
      if (!conversations.ok) return conversations
      for (const conversation of conversations.value.items) {
        if (conversation.kind !== 'group' || visited.has(conversation.groupDid)) continue
        visited.add(conversation.groupDid)
        const snapshot = await call(() => this.remote.getGroup({ groupDid: conversation.groupDid }))
        if (!snapshot.ok) continue
        if (snapshot.value.myRole === 'owner') groups.push(snapshot.value)
        if (groups.length >= 20) break
      }
      cursor = conversations.value.nextCursor
      if (cursor === undefined) break
    }
    return { ok: true, value: groups }
  }

  /** Stop timers, invalidate work, and drop subscribers during HMR unload. */
  dispose(): void {
    this.disposed = true
    this.close()
    this.listeners.clear()
  }

  private async loadConversationPreferences(generation: number): Promise<void> {
    const result = await call(() => this.remote.getConversationPreferences(), conversationPreferenceFailureMessage)
    if (!result.ok || !this.current(generation)) return
    this.applyConversationPreferences(result.value)
    this.publish({ ...this.view, hiddenConversations: this.hiddenConversationsView() })
  }

  private applyConversationPreferences(preferences: AwikiConversationPreferences): void {
    this.hiddenConversationPreferences.clear()
    for (const hidden of preferences.hiddenConversations) {
      this.hiddenConversationPreferences.set(hidden.conversation.id, {
        conversation: { ...hidden.conversation },
        hiddenAt: hidden.hiddenAt,
      })
    }
  }

  private hiddenConversationsView(): readonly AwikiConversation[] {
    return [...this.hiddenConversationPreferences.values()]
      .sort((left, right) => right.hiddenAt - left.hiddenAt)
      .map(item => item.conversation)
  }

  private async reconcileConversationPage(
    incoming: readonly AwikiConversation[],
    generation: number,
  ): Promise<{ readonly visible: readonly AwikiConversation[]; readonly hidden: readonly AwikiConversation[] }> {
    const current = [...this.view.conversations, ...this.view.hiddenConversations]
    const conversations = incoming.map(item => this.cacheConversation(
      item,
      current.find(candidate => candidate.id === item.id),
    ))
    for (const conversation of conversations) {
      const hidden = this.hiddenConversationPreferences.get(conversation.id)
      if (hidden === undefined) continue
      const previousActivity = hidden.conversation.lastMessageAt ?? 0
      const currentActivity = conversation.lastMessageAt ?? 0
      if (currentActivity <= previousActivity) continue
      const restored = await call(() => this.remote.updateConversationPreference({
        action: 'restore',
        conversationId: conversation.id,
      }), conversationPreferenceFailureMessage)
      if (!this.current(generation)) return { visible: [], hidden: this.hiddenConversationsView() }
      if (restored.ok) this.applyConversationPreferences(restored.value)
    }
    const visible: AwikiConversation[] = []
    for (const conversation of conversations) {
      const hidden = this.hiddenConversationPreferences.get(conversation.id)
      if (hidden === undefined) {
        visible.push(conversation)
      } else {
        this.hiddenConversationPreferences.set(conversation.id, { ...hidden, conversation })
      }
    }
    return { visible, hidden: this.hiddenConversationsView() }
  }

  private async refreshConversations(generation: number, background = false): Promise<AwikiActionResult> {
    const result = await this.listConversationPage({})
    if (!this.current(generation)) return { ok: true, value: undefined }
    if (!result.ok) return background ? result : this.fail(result.error)
    const firstPage = this.view.conversations.length === 0
    if (firstPage) this.conversationsCursor = result.value.nextCursor
    const refreshed = await this.reconcileConversationPage(result.value.items, generation)
    if (!this.current(generation)) return { ok: true, value: undefined }
    this.publish({
      ...this.view,
      conversations: firstPage
        ? refreshed.visible
        : appendUnique(refreshed.visible, this.view.conversations, value => value.id),
      hiddenConversations: refreshed.hidden,
      conversationsHasMore: firstPage
        ? result.value.hasMore && result.value.nextCursor !== undefined
        : this.view.conversationsHasMore,
      error: background ? this.view.error : null,
    })
    return { ok: true, value: undefined }
  }

  /** List the active identity's own conversations and detect a revoked local credential. */
  private async listConversationPage(request: AwikiPageRequest): Promise<AwikiActionResult<AwikiPage<AwikiConversation>>> {
    const result = await callWithFailureCode(() => this.remote.listConversations(request))
    if (!result.ok && result.failureCode === 'device-rejoin-required') {
      this.enterBlockedIdentityState('device-rejoin-required')
      return { ok: false, error: '当前设备已被撤销，请重新申请加入。' }
    }
    if (!result.ok && (result.failureCode === 'identity-recovery-required' || result.failureCode === 'forbidden')) {
      this.enterBlockedIdentityState('recovery-required')
      return { ok: false, error: '当前设备的 AWiki 身份凭证已失效，请重新恢复身份。' }
    }
    return result.ok ? result : { ok: false, error: result.error }
  }

  /** Replace only visible browser projections; Core identity and SQLite state remain untouched. */
  private enterBlockedIdentityState(status: 'recovery-required' | 'device-rejoin-required'): void {
    if (this.view.identity === null) return
    this.close()
    this.conversationsCursor = undefined
    this.historyCursor = undefined
    this.groupMembersCursor = undefined
    this.unreadAtOpen.clear()
    this.summaryBaselines.clear()
    this.clearImageAttachments()
    this.publish({
      ...this.view,
      status: 'ready',
      sessionStatus: status,
      conversations: Object.freeze([]),
      hiddenConversations: Object.freeze([]),
      conversationsHasMore: false,
      selectedConversationId: null,
      selectedGroup: null,
      groupAccess: null,
      groupMembers: Object.freeze([]),
      groupMembersHasMore: false,
      messages: Object.freeze([]),
      historyHasMore: false,
      localPending: false,
      refreshing: false,
      pending: null,
      error: null,
      summaries: Object.freeze({}),
    })
  }

  private async loadHistory(older: boolean): Promise<AwikiActionResult> {
    const conversationId = this.view.selectedConversationId
    if (conversationId === null) return this.fail('请先选择会话')
    const selectedConversation = this.selectedConversation()
    if (selectedConversation?.kind === 'group' && this.view.groupAccess?.status !== 'available') {
      return { ok: false, error: '当前群聊仅可查看本机已有记录，请先重新检查群成员状态。' }
    }
    const generation = this.generation
    const request: AwikiHistoryRequest = {
      conversationId,
      ...(older && this.historyCursor !== undefined ? { cursor: this.historyCursor } : {}),
    }
    const selected = this.view.conversations.find(value => value.id === conversationId)
    const result = await this.withPending(
      older ? '加载更早消息' : '加载消息',
      () => call(
        () => this.remote.getHistory(request),
        selected?.kind === 'group' ? groupReadFailureMessage : undefined,
      ),
    )
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
      const selectedConversation = this.selectedConversation()
      if (selectedConversation?.kind === 'group' && this.view.groupAccess?.status !== 'available') return
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

  private async withPending<Value>(
    label: string,
    operation: () => Promise<AwikiActionResult<Value>>,
    options: { readonly publishFailure?: boolean } = {},
  ): Promise<AwikiActionResult<Value>> {
    if (this.disposed) return { ok: false, error: 'AWiki 插件已卸载' }
    const generation = this.generation
    this.publish({ ...this.view, pending: label, error: null })
    const result = await operation()
    if (!this.current(generation)) return result
    this.publish({
      ...this.view,
      pending: null,
      error: result.ok || options.publishFailure === false ? null : result.error,
    })
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

  private publishGroupAccessFailure(
    conversation: Extract<AwikiConversation, { readonly kind: 'group' }>,
    reason: AwikiGroupReadFailureReason,
  ): void {
    const status: AwikiGroupAccessView['status'] = reason
    this.publish({
      ...this.view,
      groupAccess: { groupDid: conversation.groupDid, status },
      error: null,
    })
  }

  /** Keep presentation-only cache entries isolated to one authenticated identity. */
  private activatePresentationCache(identity: AwikiIdentity | null): void {
    const ownerDid = identity?.did ?? null
    if (ownerDid === this.presentationCacheOwnerDid) return
    this.directProfiles.clear()
    this.groupTitles.clear()
    this.hiddenConversationPreferences.clear()
    this.clearImageAttachments()
    this.presentationCacheOwnerDid = ownerDid
  }

  /** Drop every browser projection without touching the Core-owned SQLite cache. */
  private clearPresentationCache(): void {
    this.directProfiles.clear()
    this.groupTitles.clear()
    this.hiddenConversationPreferences.clear()
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
