/** Provider interface between the AWiki Host service and one high-level TypeScript client. */

import type {
  AwikiAttachment,
  AwikiConversation,
  AwikiGroupConversation,
  AwikiGroupMember,
  AwikiGroupMemberPage,
  AwikiGroupMembersRequest,
  AwikiGroupSnapshot,
  AwikiHistoryRequest,
  AwikiIdentity,
  AwikiMessage,
  AwikiMailAccount,
  AwikiMailInboxPage,
  AwikiMailInboxRequest,
  AwikiMailMarkReadRequest,
  AwikiMailMarkReadResult,
  AwikiMailMessage,
  AwikiMailReadRequest,
  AwikiMailSendRequest,
  AwikiMailSendResult,
  AwikiConversationId,
  AwikiPage,
  AwikiPageRequest,
  AwikiProfile,
  AwikiRecoveryOperationRequest,
  AwikiRecoveryOtpRequest,
  AwikiRecoveryOtpResult,
  AwikiRecoveryPrepareRequest,
  AwikiRecoveryProgress,
  AwikiResolvedPeer,
  AwikiRegistrationOtpRequest,
  AwikiRegistrationOtpResult,
  AwikiRegistrationRequest,
  AwikiSendTextRequest,
  AwikiUpdateDisplayNameRequest,
  AwikiUpdateProfileRequest,
} from './types.ts'
import type { AwikiAttachmentId, AwikiDid, AwikiMessageId, AwikiMessageTarget } from './types.ts'

/** Reliable synchronization reasons the listener is allowed to schedule. */
export type AwikiSdkListenerSyncReason = 'session_start' | 'websocket_hint' | 'websocket_reconnect'

/** Product-safe realtime causes copied from the Core-owned Node session. */
export type AwikiSdkListenerSyncCause =
  | 'connection_ready'
  | 'reconnected'
  | 'message'
  | 'message_update'
  | 'group'
  | 'system_notification'
  | 'stream_recovery'

/** Product-safe reason why a realtime lifecycle attempt could not finish synchronization. */
export type AwikiSdkRealtimeFailureCode =
  | 'sync.retry.transport_unavailable'
  | 'sync.retry.service_unavailable'
  | 'sync.retry.local_state_unavailable'
  | 'sync.retry.local_state.actor_closed'
  | 'sync.retry.local_state.database_busy'
  | 'sync.retry.local_state.constraint_failed'
  | 'sync.retry.local_state.schema_unavailable'
  | 'sync.retry.local_state.storage_unavailable'
  | 'sync.retry.local_state.codec_unavailable'
  | 'sync.retry.local_state.other'
  | 'sync.retryable_failure'
  | 'sync.recovery_required'
  | 'sync.auth_revoked'
  | 'sync.blocked'
  | 'sync.blocked.client_upgrade_required'
  | 'sync.blocked.device_reprovision_required'
  | 'sync.blocked.server_repair_required'
  | 'sync.blocked.snapshot_capacity'
  | 'sync.blocked.invalid_request'
  | 'sync.blocked.invalid_cursor'
  | 'sync.blocked.other'
  | 'sync.unexpected_status'

/** Realtime events intentionally exclude raw frames, sequence values, and checkpoints. */
export type AwikiSdkListenerRealtimeEvent =
  | {
      readonly kind: 'connection_state_changed'
      readonly state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'closed'
    }
  | {
      readonly kind: 'sync_required'
      readonly cause: AwikiSdkListenerSyncCause
      readonly dirty: boolean
      readonly gapDetected: boolean
    }

/** One Core-owned realtime session. A null event requires stop/sync/restart recovery. */
export interface AwikiSdkListenerRealtimeSession {
  nextEvent(): Promise<AwikiSdkListenerRealtimeEvent | null>
  getStatus(): Promise<{ readonly connected: boolean }>
  stop(): Promise<void>
}

/** Minimal conversation projection used only by the Agent listener. */
export type AwikiSdkListenerConversation =
  | {
      readonly kind: 'direct'
      readonly id: string
      readonly peerDid: string
      readonly peerHandle?: string
      readonly unreadCount: number
      readonly lastMessageAt?: number
    }
  | {
      readonly kind: 'group'
      readonly id: string
      readonly unreadCount: number
      readonly lastMessageAt?: number
    }

/** Listener history projection. Non-plain content remains an opaque ignored marker. */
export interface AwikiSdkListenerMessage {
  readonly id: string
  readonly conversationId: string
  readonly conversationKind: 'direct' | 'group'
  readonly senderDid: string
  readonly sentAt: number
  readonly outgoing: boolean
  readonly content: { readonly kind: 'text'; readonly text: string } | { readonly kind: 'ignored' }
}

/** Identity-level realtime seam. It never exposes raw frames or business payloads. */
export interface AwikiSdkSyncResult {
  readonly pagesFetched: number
  readonly messagesHydrated: number
  readonly olderHistoryExcluded: boolean
}

export interface AwikiSdkRealtimeClient {
  syncNow(reason: AwikiSdkListenerSyncReason): Promise<AwikiSdkSyncResult>
  startRealtime(): Promise<AwikiSdkListenerRealtimeSession>
}

/** Committed Direct-message seam available only to the optional Agent consumer. */
export interface AwikiSdkAgentInboxClient {
  listConversations(request?: AwikiPageRequest): Promise<AwikiPage<AwikiSdkListenerConversation>>
  getHistory(request: AwikiHistoryRequest): Promise<AwikiPage<AwikiSdkListenerMessage>>
  markConversationRead(conversationId: AwikiConversationId): Promise<number>
  sendText(request: AwikiSendTextRequest): Promise<AwikiMessage>
}

/** Compatibility composition for callers that need both internal seams. */
export interface AwikiSdkListenerClient extends AwikiSdkRealtimeClient, AwikiSdkAgentInboxClient {}

/** SDK initialization values owned by the Host deployment configuration. */
export interface AwikiClientOptions {
  readonly userServiceUrl: string
  readonly userServiceDomain: string
  readonly messageServiceUrl: string
  readonly mailServiceUrl: string
  readonly messageServicePublicUrl: string
  readonly messageServiceDid: string
  readonly allowedAttachmentOrigins: readonly string[]
  readonly attachmentMaxBytes: number
  readonly allowInsecureLoopbackForTesting: boolean
  readonly stateRoot: string
}

/** Raw attachment upload passed only across the same-process provider interface. */
export interface AwikiSdkAttachmentUpload {
  readonly fileName: string
  readonly mimeType: string
  readonly bytes: Uint8Array
}

/** Raw attachment request passed only across the same-process provider interface. */
export interface AwikiSdkSendAttachmentRequest {
  readonly target: AwikiMessageTarget
  readonly attachment: AwikiSdkAttachmentUpload
  readonly caption?: string
  readonly idempotencyKey: string
}

/** Raw verified download returned only across the same-process provider interface. */
export interface AwikiSdkDownloadedAttachment {
  readonly attachment: AwikiAttachment
  readonly bytes: Uint8Array
}

/** Exact HTTP field crossing only the trusted same-process provider boundary. */
export interface AwikiSdkHttpHeader {
  readonly name: string
  readonly value: string
}

/** Buffered request bytes submitted to the Rust external HTTP auth facade. */
export interface AwikiSdkExternalHttpRequest {
  readonly url: string
  readonly method: string
  readonly headers: readonly AwikiSdkHttpHeader[]
  /** `undefined` means no body; an empty Uint8Array is an explicit empty body. */
  readonly body?: Uint8Array
}

/** Response metadata observed without exposing or consuming its body. */
export interface AwikiSdkExternalHttpResponse {
  readonly statusCode: number
  readonly headers: readonly AwikiSdkHttpHeader[]
}

/** Single-use Rust authentication attempt retained behind the provider. */
export interface AwikiSdkExternalHttpAttempt {
  readonly targetUrl: string
  readonly method: string
  readonly headerPatch: readonly AwikiSdkHttpHeader[]
  readonly retryCount: number
  handleResponse(response: AwikiSdkExternalHttpResponse): Promise<AwikiSdkExternalHttpAttempt | null>
}

export type AwikiSdkJoinLocalPhase =
  | 'pending'
  | 'challenge_prepared'
  | 'response_prepared'
  | 'response_verified'
  | 'approval_prepared'
  | 'authorized'
  | 'cancelled'
  | 'expired'

export type AwikiSdkJoinRemoteState =
  | 'pending'
  | 'challenge_sent'
  | 'response_verified'
  | 'consumed'
  | 'cancelled'
  | 'rejected'
  | 'expired'

export type AwikiSdkRegistrationResult =
  | { readonly status: 'registered'; readonly identity: AwikiIdentity }
  | {
      readonly status: 'join-required'
      readonly continuationId: string
      readonly fullHandle: string
      readonly mode: 'ordinary' | 'handle-recovery-rebind'
      readonly requiresUserPresence: boolean
    }

export interface AwikiSdkDeviceJoinProgress {
  readonly joinSessionId: string
  readonly localPhase: AwikiSdkJoinLocalPhase
  readonly remoteState: AwikiSdkJoinRemoteState
  readonly expiresAt: string
  readonly sas?: string
  readonly completed: boolean
  readonly identity?: AwikiIdentity
}

export interface AwikiSdkLocalDeviceJoinSession {
  readonly joinSessionId: string
  readonly side: 'new_device' | 'admin'
  readonly localPhase: AwikiSdkJoinLocalPhase
  readonly expiresAt: string
}

export interface AwikiSdkCurrentDeviceSummary {
  readonly role?: 'member' | 'admin'
  readonly readiness: 'legacy' | 'member_ready' | 'admin_awaiting_root' | 'admin_ready' | 'blocked'
  readonly canManage: boolean
}

export interface AwikiSdkRegistryDevice {
  readonly deviceId: string
  readonly status: 'active' | 'revoked'
  readonly role: 'member' | 'admin'
  readonly managementReady: boolean
  readonly isCurrent: boolean
}

/** Host-only Core preparation. The authorization handle never crosses Remote. */
export interface AwikiSdkRootTransferPreparation {
  readonly authorizationHandle: string
  readonly recipient: {
    readonly did: string
    readonly deviceId: string
    readonly registryVersion: string
  }
  readonly expiresAt: string
}

export interface AwikiSdkRootTransferSendResult {
  readonly recipientDeviceId: string
  readonly acceptedAt: string
}

export interface AwikiSdkDeviceJoinRequest {
  readonly joinSessionId: string
  readonly protocolDeviceId: string
  readonly candidateKeyFingerprint: string
  readonly issuedAt: string
  readonly expiresAt: string
  readonly state: AwikiSdkJoinRemoteState
  readonly claimedByCurrentDevice: boolean
  readonly canStartVerification: boolean
}

export interface AwikiSdkAdminJoinProgress {
  readonly joinSessionId: string
  readonly localPhase: AwikiSdkJoinLocalPhase
  readonly remoteState: AwikiSdkJoinRemoteState
  readonly expiresAt: string
  readonly sas?: string
}

/** Replaceable high-level AWiki client used by the Host service. */
export interface AwikiSdkClient {
  /** Whether this Host build can request trusted local device-owner authentication. */
  readonly trustedUserPresenceSupported: boolean
  /** Prepare one exact external HTTP request without sending it. Host-only. */
  prepareExternalHttpRequest(request: AwikiSdkExternalHttpRequest): Promise<AwikiSdkExternalHttpAttempt>
  /** Present only when the provider supports Core-owned identity realtime. */
  readonly realtime?: AwikiSdkRealtimeClient
  /** Present only when the provider supports committed Direct-message Agent consumption. */
  readonly agentInbox?: AwikiSdkAgentInboxClient
  /** @deprecated Compatibility composition; new Hosts narrow it to the two seams above. */
  readonly listener?: AwikiSdkListenerClient
  /** Return the persisted deployment identity or `null`. */
  getIdentity(): Promise<AwikiIdentity | null>
  /** Send one Legacy registration verification code. */
  sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiRegistrationOtpResult>
  /** Register and persist the deployment identity. */
  registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiSdkRegistrationResult>
  beginDeviceJoin(request: {
    readonly continuationId: string
    readonly operationId: string
    readonly userPresenceConfirmed: boolean
  }): Promise<AwikiSdkDeviceJoinProgress>
  getDeviceJoinStatus(joinSessionId: string): Promise<AwikiSdkDeviceJoinProgress>
  listLocalDeviceJoinSessions(): Promise<readonly AwikiSdkLocalDeviceJoinSession[]>
  cancelDeviceJoin(joinSessionId: string): Promise<AwikiSdkLocalDeviceJoinSession>
  getCurrentDeviceSummary(): Promise<AwikiSdkCurrentDeviceSummary>
  syncDeviceManagement(): Promise<void>
  getDeviceRegistry(): Promise<readonly AwikiSdkRegistryDevice[]>
  listLocalDeviceJoinRequests(): Promise<readonly AwikiSdkDeviceJoinRequest[]>
  startDeviceJoinVerification(request: {
    readonly joinSessionId: string
    readonly operationId: string
    readonly challengeTtlSeconds: number
  }): Promise<AwikiSdkAdminJoinProgress>
  getLocalDeviceJoinVerificationProgress(joinSessionId: string): Promise<AwikiSdkAdminJoinProgress>
  prepareDeviceJoinApproval(joinSessionId: string): Promise<{ readonly approvalHandle: string }>
  confirmDeviceJoinApproval(approvalHandle: string): Promise<AwikiSdkAdminJoinProgress>
  rejectDeviceJoin(joinSessionId: string, reason: 'user_rejected' | 'sas_mismatch'): Promise<AwikiSdkAdminJoinProgress>
  revokeDevice(deviceId: string): Promise<void>
  confirmUserPresence(reason: string): Promise<boolean>
  prepareRootKeyTransfer(deviceId: string): Promise<AwikiSdkRootTransferPreparation>
  confirmAndSendRootKeyTransfer(authorizationHandle: string): Promise<AwikiSdkRootTransferSendResult>
  /** Update and persist the deployment identity's public display name. */
  updateDisplayName(request: AwikiUpdateDisplayNameRequest): Promise<AwikiIdentity>
  /** Return only the product-supported public profile fields. */
  getProfile(): Promise<AwikiProfile>
  /** Update Display Name, bio, and tags through the Core profile service. */
  updateProfile(request: AwikiUpdateProfileRequest): Promise<AwikiProfile>
  /** Start durable recovery for an existing full Handle. */
  sendRecoveryOtp(request: AwikiRecoveryOtpRequest): Promise<AwikiRecoveryOtpResult>
  /** Verify the recovery factor and freeze the exact recovery intent. */
  prepareRecovery(request: AwikiRecoveryPrepareRequest): Promise<AwikiRecoveryProgress>
  /** Attempt the remote recovery commit once. */
  activateRecovery(request: AwikiRecoveryOperationRequest): Promise<AwikiRecoveryProgress>
  /** Read durable recovery state before deciding whether to resume. */
  getRecoveryStatus(request: AwikiRecoveryOperationRequest): Promise<AwikiRecoveryProgress>
  /** Resume a retryable or uncertain recovery state. */
  resumeRecovery(request: AwikiRecoveryOperationRequest): Promise<AwikiRecoveryProgress>
  /** Issue one short-lived reconciliation authority after the exact local recovery is applied. Host-only. */
  /** Discard a pre-attempt recovery operation. */
  discardRecovery(request: AwikiRecoveryOperationRequest): Promise<void>
  /** Retire only the revoked default-device credential while preserving ordinary local data. */
  retireDefaultIdentityForRejoin(): Promise<void>
  /** Resolve one Handle or DID and persist the direct conversation row. */
  resolvePeer(peer: string): Promise<AwikiResolvedPeer>
  /** Create one private, open-join, transport-protected group. */
  createGroup(name: string): Promise<AwikiGroupConversation>
  /** Add one Handle or DID to an existing group and return its authoritative identity. */
  addGroupMember(groupDid: AwikiDid, member: string): Promise<AwikiGroupMember>
  /** Return one authoritative group snapshot. */
  getGroup(groupDid: AwikiDid): Promise<AwikiGroupSnapshot>
  /** Join one open group and return its authoritative state. */
  joinGroup(groupDid: AwikiDid): Promise<AwikiGroupSnapshot>
  /** Leave one group; owners are rejected by Core. */
  leaveGroup(groupDid: AwikiDid): Promise<void>
  /** Read one authoritative, versioned member page. */
  listGroupMembers(request: AwikiGroupMembersRequest): Promise<AwikiGroupMemberPage>
  /** Remove one Handle or DID from a group. */
  removeGroupMember(groupDid: AwikiDid, member: string): Promise<AwikiGroupMember>
  /** List direct and existing group conversations. */
  listConversations(request?: AwikiPageRequest): Promise<AwikiPage<AwikiConversation>>
  /** Read one conversation's paginated history. */
  getHistory(request: AwikiHistoryRequest): Promise<AwikiPage<AwikiMessage>>
  /** Read one canonical conversation page only from the committed local projection. */
  getLocalHistory(request: AwikiHistoryRequest): Promise<AwikiPage<AwikiMessage>>
  /** Mark every currently unread inbox message in one conversation as read. */
  markConversationRead(conversationId: AwikiConversationId): Promise<number>
  /** Send one idempotent text message. */
  sendText(request: AwikiSendTextRequest): Promise<AwikiMessage>
  /** Upload and send one idempotent attachment message. */
  sendAttachment(request: AwikiSdkSendAttachmentRequest): Promise<AwikiMessage>
  /** Download one attachment after provider integrity verification. */
  downloadAttachment(request: {
    readonly attachmentId: AwikiAttachmentId
    readonly messageId: AwikiMessageId
  }): Promise<AwikiSdkDownloadedAttachment>
  /** Return the deployment identity's public mailbox state. */
  getMailAccount(): Promise<AwikiMailAccount>
  /** List one bounded mailbox page. */
  listMailInbox(request?: AwikiMailInboxRequest): Promise<AwikiMailInboxPage>
  /** Read one bounded plain-text mail message. */
  readMail(request: AwikiMailReadRequest): Promise<AwikiMailMessage>
  /** Mark selected mail messages read. */
  markMailRead(request: AwikiMailMarkReadRequest): Promise<AwikiMailMarkReadResult>
  /** Send one plain-text mail once, without automatic retry. */
  sendMail(request: AwikiMailSendRequest): Promise<AwikiMailSendResult>
  /** Permanently clear this installation's persisted and process-local AWiki state. */
  clearLocalData(): Promise<{ readonly cleared: boolean }>
  /** Abort owned work and release resources before settling. */
  dispose(): Promise<void>
}

/** Synchronous factory registered by production or keyless fixture providers. */
export type AwikiClientFactory = (options: AwikiClientOptions) => AwikiSdkClient
