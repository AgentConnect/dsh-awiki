/** Client-safe AWiki service and Remote data types. */
import type { Branded } from '@deepseek-ai/dsh-brand';
/** Stable AWiki decentralized identifier. */
export type AwikiDid = Branded<'AwikiDid'>;
/** Validated AWiki handle. */
export type AwikiHandle = Branded<'AwikiHandle'>;
/** Stable direct or group conversation identifier. */
export type AwikiConversationId = Branded<'AwikiConversationId'>;
/** Stable AWiki message identifier. */
export type AwikiMessageId = Branded<'AwikiMessageId'>;
/** Stable AWiki attachment identifier. */
export type AwikiAttachmentId = Branded<'AwikiAttachmentId'>;
/** Opaque mail-service message identifier. */
export type AwikiMailMessageId = Branded<'AwikiMailMessageId'>;
/** Opaque pagination cursor returned by AWiki. */
export type AwikiCursor = Branded<'AwikiCursor'>;
/** Public state of one developer-owned Guest integration. */
export type AwikiIntegrationStatus = 'active' | 'closed';
/** Stable target availability returned by Guest Gateway. */
export type AwikiIntegrationTargetAvailability = 'eligible' | 'group_not_found' | 'owner_not_active' | 'owner_mismatch' | 'not_open_join' | 'unsupported_security_profile' | 'member_send_disabled' | 'attachments_disabled' | 'group_full' | 'validation_unavailable';
/** Read-only owner resolved from the authenticated AWiki Host identity. */
export interface AwikiIntegrationOwner {
    readonly tenantId: string;
    readonly handle: string;
    readonly currentDid: string;
    readonly displayName: string;
}
/** One configured group target. Display data and availability are server-owned. */
export interface AwikiIntegrationGroupTarget {
    readonly id: string;
    readonly groupDid: string;
    readonly displayName: string;
    readonly avatarUrl: string | null;
    readonly description: string;
    readonly availability: AwikiIntegrationTargetAvailability;
}
/** Complete Integration management projection. */
export interface AwikiIntegrationView {
    readonly id: string;
    readonly publicId: string | null;
    readonly integrationUrl: string | null;
    readonly owner: AwikiIntegrationOwner;
    readonly productName: string;
    readonly description: string;
    readonly contactEnabled: boolean;
    readonly contactDescription: string;
    readonly groupTargets: readonly AwikiIntegrationGroupTarget[];
    readonly status: AwikiIntegrationStatus;
    readonly revision: number;
}
/** User-editable group target fields. */
export interface AwikiIntegrationGroupTargetInput {
    readonly id?: string | null;
    readonly groupDid: string;
    readonly description: string;
}
/** Fields shared by Integration creation and editing. */
export interface AwikiIntegrationFields {
    readonly productName: string;
    readonly description: string;
    readonly contactEnabled: boolean;
    readonly contactDescription: string;
    readonly groupTargets: readonly AwikiIntegrationGroupTargetInput[];
}
/** Create one Integration. The key is retained by the browser for one user action. */
export interface AwikiCreateIntegrationRequest extends AwikiIntegrationFields {
    readonly idempotencyKey: string;
}
/** Update one Integration with optimistic concurrency. */
export interface AwikiUpdateIntegrationRequest extends AwikiIntegrationFields {
    readonly expectedRevision: number;
    readonly idempotencyKey: string;
}
/** Reopen a closed Integration with revalidated fields and a new public URL. */
export interface AwikiReopenIntegrationRequest extends AwikiIntegrationFields {
    readonly expectedRevision: number;
    readonly idempotencyKey: string;
}
/** Rotate or close one Integration with optimistic concurrency. */
export interface AwikiIntegrationRevisionRequest {
    readonly expectedRevision: number;
    readonly idempotencyKey: string;
}
/** Stable management failure surfaced without downstream response bodies. */
export interface AwikiIntegrationFailure {
    readonly code: 'not-found' | 'conflict' | 'invalid-request' | 'forbidden' | 'unauthorized' | 'rate-limited' | 'unavailable' | 'network' | 'remote';
    readonly message: string;
}
/** Result returned by the five fixed-scope Integration Remotes. */
export type AwikiIntegrationResult<Value> = {
    readonly ok: true;
    readonly value: Value;
} | {
    readonly ok: false;
    readonly error: AwikiIntegrationFailure;
};
/** Public identity state. Secret keys and tokens never enter this type. */
export interface AwikiIdentity {
    readonly handle: AwikiHandle;
    readonly did: AwikiDid;
    /** WNS `profile.display_name`. Display-only; never used for routing. */
    readonly displayName?: string;
    readonly registeredAt: number;
}
/** Editable public profile. Proofs, metadata, and local identity state stay Host-only. */
export interface AwikiProfile {
    readonly did: AwikiDid;
    readonly handle?: AwikiHandle;
    readonly displayName: string;
    readonly bio: string;
    readonly tags: readonly string[];
    readonly updatedAt?: string;
}
/** Browser request for the three product-supported public profile fields. */
export interface AwikiUpdateProfileRequest {
    readonly displayName: string;
    readonly bio: string;
    readonly tags: readonly string[];
}
/** Browser-visible state of the local AWiki session. */
export type AwikiSession = {
    readonly status: 'unregistered';
} | {
    readonly status: 'signed-out';
} | {
    readonly status: 'active';
    readonly identity: AwikiIdentity;
};
/** Existing direct conversation. */
export interface AwikiDirectConversation {
    readonly kind: 'direct';
    readonly id: AwikiConversationId;
    readonly peerDid: AwikiDid;
    readonly peerHandle?: AwikiHandle;
    /** WNS `profile.display_name`. Display-only; never used for routing. */
    readonly displayName?: string;
    readonly title: string;
    /** Current unread inbox messages for this conversation. */
    readonly unreadCount?: number;
    readonly lastMessageAt?: number;
    /** Display-only summary of the newest observed message. */
    readonly lastMessagePreview?: string;
}
/** Existing group conversation. */
export interface AwikiGroupConversation {
    readonly kind: 'group';
    readonly id: AwikiConversationId;
    readonly groupDid: AwikiDid;
    readonly title: string;
    /** Current unread inbox messages for this conversation. */
    readonly unreadCount?: number;
    readonly lastMessageAt?: number;
    /** Display-only summary of the newest observed message. */
    readonly lastMessagePreview?: string;
}
/** Authoritative group state used for membership actions. */
export interface AwikiGroupSnapshot {
    readonly groupDid: AwikiDid;
    readonly conversationId: AwikiConversationId;
    readonly title: string;
    readonly description?: string;
    readonly myRole?: string;
    readonly membershipStatus?: string;
    readonly memberCount?: number;
}
/** Conversation visible to the deployment identity. */
export type AwikiConversation = AwikiDirectConversation | AwikiGroupConversation;
/** One conversation hidden from this installation's recent roster. */
export interface AwikiHiddenConversationPreference {
    readonly conversation: AwikiConversation;
    readonly hiddenAt: number;
}
/** Host-owned, identity-scoped presentation preferences. */
export interface AwikiConversationPreferences {
    readonly hiddenConversations: readonly AwikiHiddenConversationPreference[];
}
/** Browser mutation of presentation-only conversation preferences. */
export type AwikiConversationPreferenceMutation = {
    readonly action: 'hide';
    readonly conversation: AwikiConversation;
} | {
    readonly action: 'restore';
    readonly conversationId: AwikiConversationId;
};
/** Request one Handle or DID lookup before opening a direct chat. */
export interface AwikiResolvePeerRequest {
    readonly peer: string;
}
/** Public peer returned after a successful Handle or DID resolution. */
export interface AwikiResolvedPeer {
    readonly did: AwikiDid;
    readonly handle?: AwikiHandle;
    /** WNS `profile.display_name`. Display-only; never used for routing. */
    readonly displayName?: string;
    readonly conversationId: AwikiConversationId;
}
/** Browser-only request for one usable group with initial members. */
export interface AwikiCreateGroupRequest {
    readonly name: string;
    /** Handle or DID values resolved by the Rust SDK after group creation. */
    readonly members: readonly string[];
}
/** Authoritative member identity returned after a successful invitation. */
export interface AwikiGroupMember {
    readonly did: AwikiDid;
    readonly handle?: AwikiHandle;
}
/** Authoritative member row. Legacy rows can omit a stable DID and cannot be mentioned. */
export interface AwikiGroupMemberRecord {
    readonly membershipId?: string;
    readonly peerPersonaId?: string;
    readonly did?: AwikiDid;
    readonly credentialDid?: AwikiDid;
    readonly handle?: AwikiHandle;
    /** Locally hydrated WNS display name. Display-only and never used for membership authority. */
    readonly displayName?: string;
    readonly role?: string;
    readonly status?: string;
    readonly joinedAt?: string;
    readonly subjectType?: string;
}
/** Versioned group-member page. Cursor and version values are opaque. */
export interface AwikiGroupMemberPage {
    readonly items: readonly AwikiGroupMemberRecord[];
    readonly total?: number;
    readonly nextCursor?: AwikiCursor;
    readonly hasMore: boolean;
    readonly pageGroup?: AwikiDid;
    readonly groupStateVersion?: string;
    readonly warnings: readonly string[];
}
export interface AwikiGroupRequest {
    readonly groupDid: AwikiDid;
}
export interface AwikiGroupMembersRequest extends AwikiGroupRequest, AwikiPageRequest {
}
export interface AwikiAddGroupMemberRequest extends AwikiGroupRequest {
    readonly member: string;
    readonly role?: 'admin' | 'member';
}
export interface AwikiRemoveGroupMemberRequest extends AwikiGroupRequest {
    readonly member: string;
}
/** One initial member that could not be added after the group already existed. */
export interface AwikiGroupMemberFailure {
    readonly member: string;
    readonly error: AwikiFailure;
}
/** Created group plus the settled result of every requested initial member. */
export interface AwikiCreateGroupResult {
    readonly conversation: AwikiGroupConversation;
    readonly addedMembers: readonly AwikiGroupMember[];
    readonly failedMembers: readonly AwikiGroupMemberFailure[];
}
/** Direct-message target resolved by the SDK. */
export interface AwikiDirectTarget {
    readonly kind: 'direct';
    readonly peer: string;
}
/** Existing group target. */
export interface AwikiGroupTarget {
    readonly kind: 'group';
    readonly group: string;
}
/** Target accepted by send operations. */
export type AwikiMessageTarget = AwikiDirectTarget | AwikiGroupTarget;
/** Attachment metadata safe for browsers, models, logs, and transcripts. */
export interface AwikiAttachment {
    readonly id: AwikiAttachmentId;
    readonly fileName: string;
    readonly mimeType: string;
    readonly size: number;
    readonly sha256: string;
}
/** Plain text message content. */
export interface AwikiTextContent {
    readonly kind: 'text';
    readonly text: string;
    readonly mentions?: readonly AwikiMention[];
}
/** One validated ANP-P9 human mention over Unicode code-point offsets. */
export interface AwikiMention {
    readonly id: string;
    readonly start: number;
    readonly end: number;
    readonly did: AwikiDid;
    readonly displayName?: string;
}
/** Attachment message content. */
export interface AwikiAttachmentContent {
    readonly kind: 'attachment';
    readonly attachment: AwikiAttachment;
    readonly caption?: string;
}
/** Message content supported by the MVP. */
export type AwikiMessageContent = AwikiTextContent | AwikiAttachmentContent;
/** Public direct or group message. */
export interface AwikiMessage {
    readonly id: AwikiMessageId;
    readonly conversationId: AwikiConversationId;
    readonly conversationKind: AwikiConversation['kind'];
    readonly senderDid: AwikiDid;
    readonly senderHandle?: AwikiHandle;
    /** WNS `profile.display_name` for the sender. Display-only; never used for routing. */
    readonly senderDisplayName?: string;
    readonly sentAt: number;
    readonly outgoing: boolean;
    readonly content: AwikiMessageContent;
}
/** JSON-safe page returned through the Host Remote and model tools. */
export interface AwikiPage<Item> {
    readonly items: readonly Item[];
    readonly nextCursor?: AwikiCursor;
    readonly hasMore: boolean;
}
/** Optional cursor and bounded item count. */
export interface AwikiPageRequest {
    readonly cursor?: AwikiCursor;
    readonly limit?: number;
}
/** Request one conversation's history. */
export interface AwikiHistoryRequest extends AwikiPageRequest {
    readonly conversationId: AwikiConversationId;
}
/** User-triggered scope for one conversation summary. */
export interface AwikiSummarizeConversationRequest {
    readonly conversationId: AwikiConversationId;
    /** Unread messages observed immediately before this conversation was opened. */
    readonly unreadCountAtOpen?: number;
}
/** Range actually read and sent to the configured summary model. */
export interface AwikiSummaryRange {
    readonly kind: 'unread' | 'recent';
    readonly messageCount: number;
    readonly firstMessageId: AwikiMessageId;
    readonly lastMessageId: AwikiMessageId;
    readonly startedAt: number;
    readonly endedAt: number;
    /** True when the 50-message or UTF-8 input budget removed source content. */
    readonly truncated: boolean;
}
/** One bounded action item produced by the summary model. */
export interface AwikiSummaryTodo {
    readonly text: string;
    readonly owner?: string;
}
/** Structured Chinese conversation summary plus exact source provenance. */
export interface AwikiConversationSummary {
    readonly range: AwikiSummaryRange;
    readonly highlights: readonly string[];
    readonly conclusions: readonly string[];
    readonly todos: readonly AwikiSummaryTodo[];
}
/** Mark every currently unread inbox message in one conversation as read. */
export interface AwikiMarkConversationReadRequest {
    readonly conversationId: AwikiConversationId;
}
/** Request one registration verification code. */
export interface AwikiRegistrationOtpRequest {
    readonly handle: string;
    readonly phone: string;
}
/** Server-issued registration challenge. */
export interface AwikiRegistrationOtpResult {
    readonly retryAfterSeconds: number;
    readonly retryAt: string;
}
/** Complete the only identity registration allowed by this deployment. */
export interface AwikiRegistrationRequest {
    readonly handle: string;
    readonly phone: string;
    readonly otp: string;
}
/** Result of consuming one registration OTP without conflating Device Join with registration. */
export type AwikiIdentityAccessResult = {
    readonly status: 'registered';
    readonly identity: AwikiIdentity;
} | {
    readonly status: 'join-required';
    readonly fullHandle: AwikiHandle;
    readonly mode: 'ordinary' | 'handle-recovery-rebind';
    readonly requiresUserPresence: boolean;
};
export type AwikiDeviceJoinPhase = 'pending' | 'verifying' | 'sas-ready' | 'authorized' | 'cancelled' | 'rejected' | 'expired';
/** Browser-safe joining-device progress. Native identifiers remain in the Host. */
export interface AwikiDeviceJoinProgress {
    readonly phase: AwikiDeviceJoinPhase;
    readonly expiresAt: string;
    readonly sas?: string;
    readonly completed: boolean;
}
export interface AwikiDeviceManagementDevice {
    readonly deviceRef: string;
    readonly status: 'active' | 'revoked';
    readonly role: 'member' | 'admin';
    readonly managementReady: boolean;
    readonly isCurrent: boolean;
}
export interface AwikiDeviceJoinRequest {
    readonly requestRef: string;
    readonly candidateKeyFingerprint: string;
    readonly issuedAt: string;
    readonly expiresAt: string;
    readonly state: AwikiDeviceJoinPhase;
    readonly claimedByCurrentDevice: boolean;
    readonly canStartVerification: boolean;
}
export interface AwikiDeviceManagementSnapshot {
    readonly canManage: boolean;
    readonly rootTransferSupported: boolean;
    readonly role?: 'member' | 'admin';
    readonly readiness: 'legacy' | 'member_ready' | 'admin_awaiting_root' | 'admin_ready' | 'blocked';
    readonly devices: readonly AwikiDeviceManagementDevice[];
    readonly requests: readonly AwikiDeviceJoinRequest[];
}
export interface AwikiAdminJoinProgress {
    readonly requestRef: string;
    readonly phase: AwikiDeviceJoinPhase;
    readonly expiresAt: string;
    readonly sas?: string;
}
export interface AwikiRequestRefInput {
    readonly requestRef: string;
}
export interface AwikiApproveDeviceJoinRequest extends AwikiRequestRefInput {
    readonly enteredSas: string;
    readonly confirmation: string;
}
export interface AwikiRejectDeviceJoinRequest extends AwikiRequestRefInput {
    readonly reason: 'user_rejected' | 'sas_mismatch';
}
export interface AwikiRevokeDeviceRequest {
    readonly deviceRef: string;
    readonly confirmation: string;
}
/** Browser-safe summary for one short-lived, exact-device Root Transfer. */
export interface AwikiRootTransferPreparation {
    readonly transferRef: string;
    readonly deviceRef: string;
    readonly expiresAt: string;
}
export interface AwikiRootTransferReceipt {
    readonly deviceRef: string;
    readonly acceptedAt: string;
}
export interface AwikiPrepareRootTransferRequest {
    readonly deviceRef: string;
}
export interface AwikiConfirmRootTransferRequest {
    readonly transferRef: string;
}
/** Read-only classification used before sending one purpose-scoped identity OTP. */
export interface AwikiIdentityAccessInspectionRequest {
    readonly handle: string;
}
export interface AwikiIdentityAccessInspection {
    readonly status: 'available' | 'existing';
    readonly fullHandle: string;
}
/** Replace the registered identity's public WNS display name. */
export interface AwikiUpdateDisplayNameRequest {
    readonly displayName: string;
}
/** Send one plain text message. */
export interface AwikiSendTextRequest {
    readonly target: AwikiMessageTarget;
    readonly text: string;
    readonly idempotencyKey: string;
    readonly mentions?: readonly AwikiMention[];
}
/** Start recovery for an existing full Handle by phone verification. */
export interface AwikiRecoveryOtpRequest {
    readonly fullHandle: string;
    readonly phone: string;
}
export interface AwikiRecoveryOtpResult {
    readonly operationId: string;
    readonly fullHandle: string;
    readonly retryAfterSeconds: number;
    readonly retryAt: string;
}
export interface AwikiRecoveryPrepareRequest {
    readonly operationId: string;
    readonly phone: string;
    readonly otp: string;
}
export interface AwikiRecoveryOperationRequest {
    readonly operationId: string;
}
export type AwikiRecoveryPhase = 'awaiting_factor' | 'ready_to_commit' | 'remote_outcome_unknown' | 'remote_committed' | 'identity_transition_pending' | 'applied' | 'quarantined_key_unavailable';
/** Secret-free durable recovery state returned by Core. */
export interface AwikiRecoveryProgress {
    readonly operationId: string;
    readonly fullHandle: string;
    readonly previousDid?: AwikiDid;
    readonly currentDid: AwikiDid;
    readonly phase: AwikiRecoveryPhase;
    readonly failureCode?: string;
    readonly retryable: boolean;
    readonly localOrdinaryDataWillMigrate: boolean;
    readonly otherDevicesMustRejoin: boolean;
}
/** JSON-safe upload accepted by the browser Remote. */
export interface AwikiSendAttachmentRequest {
    readonly target: AwikiMessageTarget;
    readonly fileName: string;
    readonly mimeType: string;
    readonly bytesBase64: string;
    readonly caption?: string;
    readonly idempotencyKey: string;
}
/** Request attachment bytes visible to the deployment identity. */
export interface AwikiDownloadAttachmentRequest {
    readonly attachmentId: AwikiAttachmentId;
    readonly messageId: AwikiMessageId;
}
/** Public mailbox state for the deployment AWiki identity. */
export interface AwikiMailAccount {
    readonly mailboxAddress?: string;
    readonly displayName?: string;
    readonly status?: string;
}
/** Bounded mailbox row. Every string is untrusted external data. */
export interface AwikiMailSummary {
    readonly id: AwikiMailMessageId;
    readonly folder?: string;
    readonly from: readonly string[];
    readonly to: readonly string[];
    readonly cc: readonly string[];
    readonly subject: string;
    readonly subjectTruncated: boolean;
    readonly preview?: string;
    readonly previewTruncated: boolean;
    readonly receivedAt?: string;
    readonly sentAt?: string;
    readonly unread: boolean;
    readonly hasAttachments: boolean;
    readonly attachmentCount?: number;
}
/** Received attachment metadata only; no attachment bytes cross this boundary. */
export interface AwikiMailAttachmentMetadata {
    readonly index: number;
    readonly fileName?: string;
    readonly contentType?: string;
    readonly sizeBytes?: string;
}
/** Bounded plain-text mail projection. HTML is represented only by a presence flag. */
export interface AwikiMailMessage {
    readonly summary: AwikiMailSummary;
    readonly bodyText?: string;
    readonly bodyTruncated: boolean;
    readonly hasHtmlBody: boolean;
    readonly attachments: readonly AwikiMailAttachmentMetadata[];
}
/** Optional folder, unread filter, and offset pagination request. */
export interface AwikiMailInboxRequest {
    readonly folder?: string;
    readonly unreadOnly?: boolean;
    readonly limit?: number;
    readonly offset?: number;
}
/** Offset page returned by the mailbox service. */
export interface AwikiMailInboxPage {
    readonly items: readonly AwikiMailSummary[];
    readonly nextOffset?: number;
    readonly hasMore: boolean;
}
/** Read one exact mail message. */
export interface AwikiMailReadRequest {
    readonly messageId: AwikiMailMessageId;
}
/** Mark explicitly selected messages read. */
export interface AwikiMailMarkReadRequest {
    readonly messageIds: readonly AwikiMailMessageId[];
}
export interface AwikiMailMarkReadResult {
    readonly updated: number;
}
/** Send one plain-text mail without retry or idempotency claims. */
export interface AwikiMailSendRequest {
    readonly to: readonly string[];
    readonly cc?: readonly string[];
    readonly subject: string;
    readonly bodyText: string;
}
export interface AwikiMailSendResult {
    readonly accepted: boolean;
    readonly messageId?: AwikiMailMessageId;
    readonly warnings: readonly string[];
}
/** Exact browser acknowledgement required before locally signing out. */
export declare const AWIKI_LOGOUT_CONFIRMATION = "logout-awiki-session";
/** Browser-only sign-out request. The Host validates this marker independently. */
export interface AwikiLogoutRequest {
    readonly confirmation: string;
}
/** Exact browser acknowledgement required before destructive local-state removal. */
export declare const AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION = "clear-awiki-local-data";
/** Browser-only destructive request. The Host validates this marker independently. */
export interface AwikiClearLocalDataRequest {
    readonly confirmation: string;
}
/** Whether an on-disk state file existed when the reset completed. */
export interface AwikiClearLocalDataResult {
    readonly cleared: boolean;
}
/** Verified attachment content returned by the browser Remote. */
export interface AwikiDownloadedAttachment {
    readonly attachment: AwikiAttachment;
    readonly bytesBase64: string;
}
/** Stable public failure codes shared by UI and tools. */
export type AwikiFailureCode = 'client-version-unsupported' | 'not-registered' | 'signed-out' | 'already-registered' | 'invalid-request' | 'invalid-otp' | 'challenge-expired' | 'handle-unavailable' | 'not-found' | 'forbidden' | 'identity-recovery-required' | 'conflict' | 'rate-limited' | 'group-membership-required' | 'group-identity-stale' | 'attachment-too-large' | 'summary-unavailable' | 'summary-timeout' | 'summary-cancelled' | 'summary-invalid-output' | 'summary-failed' | 'delivery-unknown' | 'network' | 'remote';
/** Public business failure without credentials or remote response bodies. */
export interface AwikiFailure {
    readonly code: AwikiFailureCode;
    readonly message: string;
}
/** Successful AWiki operation. */
export interface AwikiSuccess<Value> {
    readonly ok: true;
    readonly value: Value;
}
/** Rejected AWiki operation. */
export interface AwikiRejected {
    readonly ok: false;
    readonly error: AwikiFailure;
}
/** Public AWiki operation result. */
export type AwikiResult<Value> = AwikiSuccess<Value> | AwikiRejected;
/** JSON completion receipt for Remote mutations whose provider result is otherwise empty. */
export interface AwikiCompletion {
    readonly completed: true;
}
/** Browser-safe AWiki runtime settings owned by the Host plugin. */
export interface AwikiRuntimeConfig {
    readonly pollIntervalMs: number;
    readonly attachmentMaxBytes: number;
    readonly handleRecoveryPhoneEnabled: boolean;
    readonly integrationGuideUrl?: string;
    readonly tenantId: string;
    readonly tenantGeneration: number;
    readonly tenantOnline: boolean;
    readonly services: {
        readonly modelProxy: {
            readonly enabled: boolean;
        };
        readonly guestGateway: {
            readonly enabled: boolean;
        };
    };
}
/** Browser and tool operations over the deployment's one AWiki identity. */
export interface AwikiOperations {
    /** Return whether this installation is unregistered, signed out, or active. */
    getSession(): Promise<AwikiResult<AwikiSession>>;
    /** Return the registered identity or `null`. */
    getIdentity(): Promise<AwikiResult<AwikiIdentity | null>>;
    /** Sign out locally while preserving the encrypted identity and message state. Browser-only. */
    logout(request: AwikiLogoutRequest): Promise<AwikiResult<AwikiSession>>;
    /** Resume the preserved local identity without registration. Browser-only. */
    login(): Promise<AwikiResult<AwikiSession>>;
    /** Determine whether the requested Handle should enter registration or Recovery V4. */
    inspectIdentityAccess(request: AwikiIdentityAccessInspectionRequest): Promise<AwikiResult<AwikiIdentityAccessInspection>>;
    /** Send a registration OTP. This operation is browser-only. */
    sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiResult<AwikiRegistrationOtpResult>>;
    /** Register and persist the deployment identity. This operation is browser-only. */
    registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiResult<AwikiIdentityAccessResult>>;
    /** Begin the exact process-local continuation returned by registration. Browser-only. */
    beginDeviceJoin(): Promise<AwikiResult<AwikiDeviceJoinProgress>>;
    /** Resume the exact Core-owned joining-device session, if one is resumable. */
    getDeviceJoinStatus(): Promise<AwikiResult<AwikiDeviceJoinProgress | null>>;
    /** Cancel the exact Core-owned joining-device session. */
    cancelDeviceJoin(): Promise<AwikiResult<AwikiCompletion>>;
    /** Reliable-sync and read the ready-admin device management projection. Browser-only. */
    refreshDeviceManagement(): Promise<AwikiResult<AwikiDeviceManagementSnapshot>>;
    startDeviceJoinVerification(request: AwikiRequestRefInput): Promise<AwikiResult<AwikiAdminJoinProgress>>;
    approveDeviceJoin(request: AwikiApproveDeviceJoinRequest): Promise<AwikiResult<AwikiAdminJoinProgress>>;
    rejectDeviceJoin(request: AwikiRejectDeviceJoinRequest): Promise<AwikiResult<AwikiAdminJoinProgress>>;
    revokeDevice(request: AwikiRevokeDeviceRequest): Promise<AwikiResult<AwikiDeviceManagementSnapshot>>;
    prepareRootTransfer(request: AwikiPrepareRootTransferRequest): Promise<AwikiResult<AwikiRootTransferPreparation>>;
    confirmRootTransfer(request: AwikiConfirmRootTransferRequest): Promise<AwikiResult<AwikiRootTransferReceipt>>;
    /** Read the deployment identity's editable public profile. */
    getProfile(): Promise<AwikiResult<AwikiProfile>>;
    /** Update the supported public profile fields. This operation is browser-only. */
    updateProfile(request: AwikiUpdateProfileRequest): Promise<AwikiResult<AwikiProfile>>;
    /** Compatibility update for callers that only edit Display Name. */
    updateDisplayName(request: AwikiUpdateDisplayNameRequest): Promise<AwikiResult<AwikiIdentity>>;
    /** Request a phone OTP for recovery of an existing Handle. Browser-only. */
    sendRecoveryOtp(request: AwikiRecoveryOtpRequest): Promise<AwikiResult<AwikiRecoveryOtpResult>>;
    /** Verify the recovery factor and prepare one frozen recovery intent. Browser-only. */
    prepareRecovery(request: AwikiRecoveryPrepareRequest): Promise<AwikiResult<AwikiRecoveryProgress>>;
    /** Commit a prepared recovery exactly once after explicit user confirmation. Browser-only. */
    activateRecovery(request: AwikiRecoveryOperationRequest): Promise<AwikiResult<AwikiRecoveryProgress>>;
    /** Read the Core-owned durable recovery state without repeating a remote mutation. */
    getRecoveryStatus(request: AwikiRecoveryOperationRequest): Promise<AwikiResult<AwikiRecoveryProgress>>;
    /** Resume a retryable or uncertain durable recovery state. Browser-only. */
    resumeRecovery(request: AwikiRecoveryOperationRequest): Promise<AwikiResult<AwikiRecoveryProgress>>;
    /** Discard only a recovery operation that has never attempted a remote commit. */
    discardRecovery(request: AwikiRecoveryOperationRequest): Promise<AwikiResult<AwikiCompletion>>;
    /** Resolve one Handle or DID and persist the direct conversation row. */
    resolvePeer(request: AwikiResolvePeerRequest): Promise<AwikiResult<AwikiResolvedPeer>>;
    /** Create one group and settle every initial-member invitation. Browser-only. */
    createGroup(request: AwikiCreateGroupRequest): Promise<AwikiResult<AwikiCreateGroupResult>>;
    getGroup(request: AwikiGroupRequest): Promise<AwikiResult<AwikiGroupSnapshot>>;
    joinGroup(request: AwikiGroupRequest): Promise<AwikiResult<AwikiGroupSnapshot>>;
    leaveGroup(request: AwikiGroupRequest): Promise<AwikiResult<AwikiCompletion>>;
    listGroupMembers(request: AwikiGroupMembersRequest): Promise<AwikiResult<AwikiGroupMemberPage>>;
    addGroupMember(request: AwikiAddGroupMemberRequest): Promise<AwikiResult<AwikiGroupMember>>;
    removeGroupMember(request: AwikiRemoveGroupMemberRequest): Promise<AwikiResult<AwikiGroupMember>>;
    /** Read identity-scoped local roster preferences. Browser-only. */
    getConversationPreferences(): Promise<AwikiResult<AwikiConversationPreferences>>;
    /** Hide/restore a local roster row or dismiss one recovery-notice revision. Browser-only. */
    updateConversationPreference(request: AwikiConversationPreferenceMutation): Promise<AwikiResult<AwikiConversationPreferences>>;
    /** List direct and existing group conversations. */
    listConversations(request?: AwikiPageRequest): Promise<AwikiResult<AwikiPage<AwikiConversation>>>;
    /** Read paginated direct or group history. */
    getHistory(request: AwikiHistoryRequest): Promise<AwikiResult<AwikiPage<AwikiMessage>>>;
    /** Summarize one bounded real-history range only after an explicit user action. */
    summarizeConversation(request: AwikiSummarizeConversationRequest): Promise<AwikiResult<AwikiConversationSummary>>;
    /** Mark every currently unread inbox message in one conversation as read. */
    markConversationRead(request: AwikiMarkConversationReadRequest): Promise<AwikiResult<number>>;
    /** Send one idempotent text message. */
    sendText(request: AwikiSendTextRequest): Promise<AwikiResult<AwikiMessage>>;
    /** Upload and send one idempotent attachment message. */
    sendAttachment(request: AwikiSendAttachmentRequest): Promise<AwikiResult<AwikiMessage>>;
    /** Download one attachment after SDK integrity verification. */
    downloadAttachment(request: AwikiDownloadAttachmentRequest): Promise<AwikiResult<AwikiDownloadedAttachment>>;
    /** Permanently clear this installation's local AWiki identity and message state. Browser-only. */
    clearLocalData(request: AwikiClearLocalDataRequest): Promise<AwikiResult<AwikiClearLocalDataResult>>;
}
/** Browser-facing Host operations, including safe presentation settings. */
export interface AwikiHostClient extends AwikiOperations {
    /** Return settings required by the AWiki browser client. */
    getConfig(): Promise<AwikiResult<AwikiRuntimeConfig>>;
    /** Read one canonical conversation only from the committed local projection. */
    getLocalHistory(request: AwikiHistoryRequest): Promise<AwikiResult<AwikiPage<AwikiMessage>>>;
    /** Read the Integration owned by the active full Handle. */
    getIntegration(): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    /** Create the active full Handle's only Integration. */
    createIntegration(request: AwikiCreateIntegrationRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    /** Edit the active full Handle's Integration. */
    updateIntegration(request: AwikiUpdateIntegrationRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    /** Atomically replace the Integration's public URL id. */
    rotateIntegrationId(request: AwikiIntegrationRevisionRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    /** Close the Integration and revoke its public URL id. */
    closeIntegration(request: AwikiIntegrationRevisionRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    /** Revalidate a closed Integration and issue a new public URL id. */
    reopenIntegration(request: AwikiReopenIntegrationRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
}
//# sourceMappingURL=types.d.ts.map