/** Provider interface between the AWiki Host service and one high-level TypeScript client. */
import type { AwikiAttachment, AwikiConversation, AwikiHistoryRequest, AwikiIdentity, AwikiMessage, AwikiConversationId, AwikiPage, AwikiPageRequest, AwikiResolvedPeer, AwikiRegistrationOtpRequest, AwikiRegistrationOtpResult, AwikiRegistrationRequest, AwikiSendTextRequest, AwikiUpdateDisplayNameRequest } from './types.ts';
import type { AwikiAttachmentId, AwikiMessageId, AwikiMessageTarget } from './types.ts';
/** SDK initialization values owned by the Host deployment configuration. */
export interface AwikiClientOptions {
    readonly userServiceUrl: string;
    readonly userServiceDomain: string;
    readonly messageServiceUrl: string;
    readonly messageServicePublicUrl: string;
    readonly messageServiceDid: string;
    readonly allowedAttachmentOrigins: readonly string[];
    readonly attachmentMaxBytes: number;
    readonly allowInsecureLoopbackForTesting: boolean;
    readonly statePath: string;
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
/** Replaceable high-level AWiki client used by the Host service. */
export interface AwikiSdkClient {
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
    /** List direct and existing group conversations. */
    listConversations(request?: AwikiPageRequest): Promise<AwikiPage<AwikiConversation>>;
    /** Read one conversation's paginated history. */
    getHistory(request: AwikiHistoryRequest): Promise<AwikiPage<AwikiMessage>>;
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
    /** Abort owned work and release resources before settling. */
    dispose(): Promise<void>;
}
/** Synchronous factory registered by production or keyless fixture providers. */
export type AwikiClientFactory = (options: AwikiClientOptions) => AwikiSdkClient;
//# sourceMappingURL=provider-api.d.ts.map