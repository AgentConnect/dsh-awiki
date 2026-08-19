/** Provider interface between the AWiki Host service and one high-level TypeScript client. */
import type { AwikiAttachment, AwikiConversation, AwikiGroupConversation, AwikiGroupMember, AwikiHistoryRequest, AwikiIdentity, AwikiMessage, AwikiMailAccount, AwikiMailInboxPage, AwikiMailInboxRequest, AwikiMailMarkReadRequest, AwikiMailMarkReadResult, AwikiMailMessage, AwikiMailReadRequest, AwikiMailSendRequest, AwikiMailSendResult, AwikiConversationId, AwikiPage, AwikiPageRequest, AwikiResolvedPeer, AwikiRegistrationOtpRequest, AwikiRegistrationOtpResult, AwikiRegistrationRequest, AwikiSendTextRequest, AwikiUpdateDisplayNameRequest } from './types.ts';
import type { AwikiAttachmentId, AwikiDid, AwikiMessageId, AwikiMessageTarget } from './types.ts';
/** Reliable synchronization reasons the listener is allowed to schedule. */
export type AwikiSdkListenerSyncReason = 'session_start' | 'websocket_hint' | 'websocket_reconnect';
/** Product-safe realtime causes copied from the Core-owned Node session. */
export type AwikiSdkListenerSyncCause = 'connection_ready' | 'reconnected' | 'message' | 'message_update' | 'group' | 'system_notification' | 'stream_recovery';
/** Realtime events intentionally exclude raw frames, sequence values, and checkpoints. */
export type AwikiSdkListenerRealtimeEvent = {
    readonly kind: 'connection_state_changed';
    readonly state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'closed';
} | {
    readonly kind: 'sync_required';
    readonly cause: AwikiSdkListenerSyncCause;
    readonly dirty: boolean;
    readonly gapDetected: boolean;
};
/** One Core-owned realtime session. A null event requires stop/sync/restart recovery. */
export interface AwikiSdkListenerRealtimeSession {
    nextEvent(): Promise<AwikiSdkListenerRealtimeEvent | null>;
    stop(): Promise<void>;
}
/** Minimal conversation projection used only by the Agent listener. */
export type AwikiSdkListenerConversation = {
    readonly kind: 'direct';
    readonly id: string;
    readonly peerDid: string;
    readonly peerHandle?: string;
    readonly unreadCount: number;
    readonly lastMessageAt?: number;
} | {
    readonly kind: 'group';
    readonly id: string;
    readonly unreadCount: number;
    readonly lastMessageAt?: number;
};
/** Listener history projection. Non-plain content remains an opaque ignored marker. */
export interface AwikiSdkListenerMessage {
    readonly id: string;
    readonly conversationId: string;
    readonly conversationKind: 'direct' | 'group';
    readonly senderDid: string;
    readonly sentAt: number;
    readonly outgoing: boolean;
    readonly content: {
        readonly kind: 'text';
        readonly text: string;
    } | {
        readonly kind: 'ignored';
    };
}
/** Optional high-level feature seam supplied by providers that support realtime listening. */
export interface AwikiSdkListenerClient {
    syncNow(reason: AwikiSdkListenerSyncReason): Promise<void>;
    startRealtime(): Promise<AwikiSdkListenerRealtimeSession>;
    listConversations(request?: AwikiPageRequest): Promise<AwikiPage<AwikiSdkListenerConversation>>;
    getHistory(request: AwikiHistoryRequest): Promise<AwikiPage<AwikiSdkListenerMessage>>;
    markConversationRead(conversationId: AwikiConversationId): Promise<number>;
    sendText(request: AwikiSendTextRequest): Promise<AwikiMessage>;
}
/** SDK initialization values owned by the Host deployment configuration. */
export interface AwikiClientOptions {
    readonly userServiceUrl: string;
    readonly userServiceDomain: string;
    readonly messageServiceUrl: string;
    readonly mailServiceUrl: string;
    readonly messageServicePublicUrl: string;
    readonly messageServiceDid: string;
    readonly allowedAttachmentOrigins: readonly string[];
    readonly attachmentMaxBytes: number;
    readonly allowInsecureLoopbackForTesting: boolean;
    readonly stateRoot: string;
}
/** Raw attachment upload passed only across the same-process provider interface. */
export interface AwikiSdkAttachmentUpload {
    readonly fileName: string;
    readonly mimeType: string;
    readonly bytes: Uint8Array;
}
/** Raw attachment request passed only across the same-process provider interface. */
export interface AwikiSdkSendAttachmentRequest {
    readonly target: AwikiMessageTarget;
    readonly attachment: AwikiSdkAttachmentUpload;
    readonly caption?: string;
    readonly idempotencyKey: string;
}
/** Raw verified download returned only across the same-process provider interface. */
export interface AwikiSdkDownloadedAttachment {
    readonly attachment: AwikiAttachment;
    readonly bytes: Uint8Array;
}
/** Exact HTTP field crossing only the trusted same-process provider boundary. */
export interface AwikiSdkHttpHeader {
    readonly name: string;
    readonly value: string;
}
/** Buffered request bytes submitted to the Rust external HTTP auth facade. */
export interface AwikiSdkExternalHttpRequest {
    readonly url: string;
    readonly method: string;
    readonly headers: readonly AwikiSdkHttpHeader[];
    /** `undefined` means no body; an empty Uint8Array is an explicit empty body. */
    readonly body?: Uint8Array;
}
/** Response metadata observed without exposing or consuming its body. */
export interface AwikiSdkExternalHttpResponse {
    readonly statusCode: number;
    readonly headers: readonly AwikiSdkHttpHeader[];
}
/** Single-use Rust authentication attempt retained behind the provider. */
export interface AwikiSdkExternalHttpAttempt {
    readonly targetUrl: string;
    readonly method: string;
    readonly headerPatch: readonly AwikiSdkHttpHeader[];
    readonly retryCount: number;
    handleResponse(response: AwikiSdkExternalHttpResponse): Promise<AwikiSdkExternalHttpAttempt | null>;
}
/** Replaceable high-level AWiki client used by the Host service. */
export interface AwikiSdkClient {
    /** Prepare one exact external HTTP request without sending it. Host-only. */
    prepareExternalHttpRequest(request: AwikiSdkExternalHttpRequest): Promise<AwikiSdkExternalHttpAttempt>;
    /** Present only when the provider supports Core-owned realtime listening. */
    readonly listener?: AwikiSdkListenerClient;
    /** Return the persisted deployment identity or `null`. */
    getIdentity(): Promise<AwikiIdentity | null>;
    /** Send one Legacy registration verification code. */
    sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiRegistrationOtpResult>;
    /** Register and persist the deployment identity. */
    registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiIdentity>;
    /** Update and persist the deployment identity's public display name. */
    updateDisplayName(request: AwikiUpdateDisplayNameRequest): Promise<AwikiIdentity>;
    /** Resolve one Handle or DID and persist the direct conversation row. */
    resolvePeer(peer: string): Promise<AwikiResolvedPeer>;
    /** Create one private, open-join, transport-protected group. */
    createGroup(name: string): Promise<AwikiGroupConversation>;
    /** Add one Handle or DID to an existing group and return its authoritative identity. */
    addGroupMember(groupDid: AwikiDid, member: string): Promise<AwikiGroupMember>;
    /** List direct and existing group conversations. */
    listConversations(request?: AwikiPageRequest): Promise<AwikiPage<AwikiConversation>>;
    /** Read one conversation's paginated history. */
    getHistory(request: AwikiHistoryRequest): Promise<AwikiPage<AwikiMessage>>;
    /** Read one canonical conversation page only from the committed local projection. */
    getLocalHistory(request: AwikiHistoryRequest): Promise<AwikiPage<AwikiMessage>>;
    /** Mark every currently unread inbox message in one conversation as read. */
    markConversationRead(conversationId: AwikiConversationId): Promise<number>;
    /** Send one idempotent text message. */
    sendText(request: AwikiSendTextRequest): Promise<AwikiMessage>;
    /** Upload and send one idempotent attachment message. */
    sendAttachment(request: AwikiSdkSendAttachmentRequest): Promise<AwikiMessage>;
    /** Download one attachment after provider integrity verification. */
    downloadAttachment(request: {
        readonly attachmentId: AwikiAttachmentId;
        readonly messageId: AwikiMessageId;
    }): Promise<AwikiSdkDownloadedAttachment>;
    /** Return the deployment identity's public mailbox state. */
    getMailAccount(): Promise<AwikiMailAccount>;
    /** List one bounded mailbox page. */
    listMailInbox(request?: AwikiMailInboxRequest): Promise<AwikiMailInboxPage>;
    /** Read one bounded plain-text mail message. */
    readMail(request: AwikiMailReadRequest): Promise<AwikiMailMessage>;
    /** Mark selected mail messages read. */
    markMailRead(request: AwikiMailMarkReadRequest): Promise<AwikiMailMarkReadResult>;
    /** Send one plain-text mail once, without automatic retry. */
    sendMail(request: AwikiMailSendRequest): Promise<AwikiMailSendResult>;
    /** Permanently clear this installation's persisted and process-local AWiki state. */
    clearLocalData(): Promise<{
        readonly cleared: boolean;
    }>;
    /** Abort owned work and release resources before settling. */
    dispose(): Promise<void>;
}
/** Synchronous factory registered by production or keyless fixture providers. */
export type AwikiClientFactory = (options: AwikiClientOptions) => AwikiSdkClient;
//# sourceMappingURL=provider-api.d.ts.map