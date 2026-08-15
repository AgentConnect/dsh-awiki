/** Client-safe AWiki service and Remote data types. */

import type { Branded } from '@deepseek-ai/dsh-brand'

/** Stable AWiki decentralized identifier. */
export type AwikiDid = Branded<'AwikiDid'>

/** Validated AWiki handle. */
export type AwikiHandle = Branded<'AwikiHandle'>

/** Stable direct or group conversation identifier. */
export type AwikiConversationId = Branded<'AwikiConversationId'>

/** Stable AWiki message identifier. */
export type AwikiMessageId = Branded<'AwikiMessageId'>

/** Stable AWiki attachment identifier. */
export type AwikiAttachmentId = Branded<'AwikiAttachmentId'>

/** Opaque pagination cursor returned by AWiki. */
export type AwikiCursor = Branded<'AwikiCursor'>

/** Public identity state. Secret keys and tokens never enter this type. */
export interface AwikiIdentity {
  readonly handle: AwikiHandle
  readonly did: AwikiDid
  /** WNS `profile.display_name`. Display-only; never used for routing. */
  readonly displayName?: string
  readonly registeredAt: number
}

/** Existing direct conversation. */
export interface AwikiDirectConversation {
  readonly kind: 'direct'
  readonly id: AwikiConversationId
  readonly peerDid: AwikiDid
  readonly peerHandle?: AwikiHandle
  /** WNS `profile.display_name`. Display-only; never used for routing. */
  readonly displayName?: string
  readonly title: string
  /** Current unread inbox messages for this conversation. */
  readonly unreadCount?: number
  readonly lastMessageAt?: number
  /** Display-only summary of the newest observed message. */
  readonly lastMessagePreview?: string
}

/** Existing group conversation. */
export interface AwikiGroupConversation {
  readonly kind: 'group'
  readonly id: AwikiConversationId
  readonly groupDid: AwikiDid
  readonly title: string
  /** Current unread inbox messages for this conversation. */
  readonly unreadCount?: number
  readonly lastMessageAt?: number
  /** Display-only summary of the newest observed message. */
  readonly lastMessagePreview?: string
}

/** Conversation visible to the deployment identity. */
export type AwikiConversation = AwikiDirectConversation | AwikiGroupConversation

/** Request one Handle or DID lookup before opening a direct chat. */
export interface AwikiResolvePeerRequest {
  readonly peer: string
}

/** Public peer returned after a successful Handle or DID resolution. */
export interface AwikiResolvedPeer {
  readonly did: AwikiDid
  readonly handle?: AwikiHandle
  /** WNS `profile.display_name`. Display-only; never used for routing. */
  readonly displayName?: string
  readonly conversationId: AwikiConversationId
}

/** Direct-message target resolved by the SDK. */
export interface AwikiDirectTarget {
  readonly kind: 'direct'
  readonly peer: string
}

/** Existing group target. */
export interface AwikiGroupTarget {
  readonly kind: 'group'
  readonly group: string
}

/** Target accepted by send operations. */
export type AwikiMessageTarget = AwikiDirectTarget | AwikiGroupTarget

/** Attachment metadata safe for browsers, models, logs, and transcripts. */
export interface AwikiAttachment {
  readonly id: AwikiAttachmentId
  readonly fileName: string
  readonly mimeType: string
  readonly size: number
  readonly sha256: string
}

/** Plain text message content. */
export interface AwikiTextContent {
  readonly kind: 'text'
  readonly text: string
}

/** Attachment message content. */
export interface AwikiAttachmentContent {
  readonly kind: 'attachment'
  readonly attachment: AwikiAttachment
  readonly caption?: string
}

/** Message content supported by the MVP. */
export type AwikiMessageContent = AwikiTextContent | AwikiAttachmentContent

/** Public direct or group message. */
export interface AwikiMessage {
  readonly id: AwikiMessageId
  readonly conversationId: AwikiConversationId
  readonly conversationKind: AwikiConversation['kind']
  readonly senderDid: AwikiDid
  readonly senderHandle?: AwikiHandle
  /** WNS `profile.display_name` for the sender. Display-only; never used for routing. */
  readonly senderDisplayName?: string
  readonly sentAt: number
  readonly outgoing: boolean
  readonly content: AwikiMessageContent
}

/** JSON-safe page returned through the Host Remote and model tools. */
export interface AwikiPage<Item> {
  readonly items: readonly Item[]
  readonly nextCursor?: AwikiCursor
  readonly hasMore: boolean
}

/** Optional cursor and bounded item count. */
export interface AwikiPageRequest {
  readonly cursor?: AwikiCursor
  readonly limit?: number
}

/** Request one conversation's history. */
export interface AwikiHistoryRequest extends AwikiPageRequest {
  readonly conversationId: AwikiConversationId
}

/** Mark every currently unread inbox message in one conversation as read. */
export interface AwikiMarkConversationReadRequest {
  readonly conversationId: AwikiConversationId
}

/** Request one registration verification code. */
export interface AwikiRegistrationOtpRequest {
  readonly handle: string
  readonly phone: string
}

/** Server-issued registration challenge. */
export interface AwikiRegistrationOtpResult {
  readonly retryAfterSeconds: number
  readonly retryAt: string
}

/** Complete the only identity registration allowed by this deployment. */
export interface AwikiRegistrationRequest {
  readonly handle: string
  readonly phone: string
  readonly otp: string
}

/** Replace the registered identity's public WNS display name. */
export interface AwikiUpdateDisplayNameRequest {
  readonly displayName: string
}

/** Send one plain text message. */
export interface AwikiSendTextRequest {
  readonly target: AwikiMessageTarget
  readonly text: string
  readonly idempotencyKey: string
}

/** JSON-safe upload accepted by the browser Remote. */
export interface AwikiSendAttachmentRequest {
  readonly target: AwikiMessageTarget
  readonly fileName: string
  readonly mimeType: string
  readonly bytesBase64: string
  readonly caption?: string
  readonly idempotencyKey: string
}

/** Request attachment bytes visible to the deployment identity. */
export interface AwikiDownloadAttachmentRequest {
  readonly attachmentId: AwikiAttachmentId
  readonly messageId: AwikiMessageId
}

/** Exact browser acknowledgement required before destructive local-state removal. */
export const AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION = 'clear-awiki-local-data'

/** Browser-only destructive request. The Host validates this marker independently. */
export interface AwikiClearLocalDataRequest {
  readonly confirmation: string
}

/** Whether an on-disk state file existed when the reset completed. */
export interface AwikiClearLocalDataResult {
  readonly cleared: boolean
}

/** Verified attachment content returned by the browser Remote. */
export interface AwikiDownloadedAttachment {
  readonly attachment: AwikiAttachment
  readonly bytesBase64: string
}

/** Stable public failure codes shared by UI and tools. */
export type AwikiFailureCode =
  | 'not-registered'
  | 'already-registered'
  | 'invalid-request'
  | 'invalid-otp'
  | 'challenge-expired'
  | 'handle-unavailable'
  | 'not-found'
  | 'forbidden'
  | 'conflict'
  | 'rate-limited'
  | 'attachment-too-large'
  | 'network'
  | 'remote'

/** Public business failure without credentials or remote response bodies. */
export interface AwikiFailure {
  readonly code: AwikiFailureCode
  readonly message: string
}

/** Successful AWiki operation. */
export interface AwikiSuccess<Value> {
  readonly ok: true
  readonly value: Value
}

/** Rejected AWiki operation. */
export interface AwikiRejected {
  readonly ok: false
  readonly error: AwikiFailure
}

/** Public AWiki operation result. */
export type AwikiResult<Value> = AwikiSuccess<Value> | AwikiRejected

/** Browser-safe AWiki runtime settings owned by the Host plugin. */
export interface AwikiRuntimeConfig {
  readonly pollIntervalMs: number
  readonly attachmentMaxBytes: number
}

/** Browser and tool operations over the deployment's one AWiki identity. */
export interface AwikiOperations {
  /** Return the registered identity or `null`. */
  getIdentity(): Promise<AwikiResult<AwikiIdentity | null>>
  /** Send a registration OTP. This operation is browser-only. */
  sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiResult<AwikiRegistrationOtpResult>>
  /** Register and persist the deployment identity. This operation is browser-only. */
  registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiResult<AwikiIdentity>>
  /** Update the deployment identity's public WNS display name. This operation is browser-only. */
  updateDisplayName(request: AwikiUpdateDisplayNameRequest): Promise<AwikiResult<AwikiIdentity>>
  /** Resolve one Handle or DID and persist the direct conversation row. */
  resolvePeer(request: AwikiResolvePeerRequest): Promise<AwikiResult<AwikiResolvedPeer>>
  /** List direct and existing group conversations. */
  listConversations(request?: AwikiPageRequest): Promise<AwikiResult<AwikiPage<AwikiConversation>>>
  /** Read paginated direct or group history. */
  getHistory(request: AwikiHistoryRequest): Promise<AwikiResult<AwikiPage<AwikiMessage>>>
  /** Mark every currently unread inbox message in one conversation as read. */
  markConversationRead(request: AwikiMarkConversationReadRequest): Promise<AwikiResult<number>>
  /** Send one idempotent text message. */
  sendText(request: AwikiSendTextRequest): Promise<AwikiResult<AwikiMessage>>
  /** Upload and send one idempotent attachment message. */
  sendAttachment(request: AwikiSendAttachmentRequest): Promise<AwikiResult<AwikiMessage>>
  /** Download one attachment after SDK integrity verification. */
  downloadAttachment(request: AwikiDownloadAttachmentRequest): Promise<AwikiResult<AwikiDownloadedAttachment>>
  /** Permanently clear this installation's local AWiki identity and message state. Browser-only. */
  clearLocalData(request: AwikiClearLocalDataRequest): Promise<AwikiResult<AwikiClearLocalDataResult>>
}

/** Browser-facing Host operations, including safe presentation settings. */
export interface AwikiHostClient extends AwikiOperations {
  /** Return settings required by the AWiki browser client. */
  getConfig(): Promise<AwikiResult<AwikiRuntimeConfig>>
}
