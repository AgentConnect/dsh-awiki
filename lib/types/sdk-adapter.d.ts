/** Rust IM Core adapter that copies native values into Host-owned public DTOs. */
import type { ImCoreNodeClient } from '@awiki/im-core-node';
import type { AwikiAttachmentId, AwikiConversation, AwikiConversationId, AwikiDownloadedAttachment, AwikiFailureCode, AwikiHistoryRequest, AwikiIdentity, AwikiMessage, AwikiMessageId, AwikiPage, AwikiPageRequest, AwikiResolvedPeer, AwikiRegistrationOtpRequest, AwikiRegistrationOtpResult, AwikiRegistrationRequest, AwikiSendTextRequest, AwikiUpdateDisplayNameRequest } from './types.ts';
import type { AwikiSdkClient, AwikiSdkDownloadedAttachment, AwikiSdkExternalHttpAttempt, AwikiSdkExternalHttpRequest, AwikiSdkSendAttachmentRequest } from './provider-api.ts';
/** Closed provider error consumed by the Host's fixed public failure mapping. */
export declare class AwikiSdkError extends Error {
    readonly code: AwikiFailureCode;
    readonly name = "AwikiSdkError";
    constructor(code: AwikiFailureCode);
}
/** Adapt the Rust Node bridge to the frozen Host provider interface. */
export declare class RustSdkAdapter implements AwikiSdkClient {
    private readonly client;
    private readonly attachmentConversations;
    private disposal;
    constructor(client: ImCoreNodeClient | Promise<ImCoreNodeClient>);
    private run;
    private message;
    private conversation;
    private conversationId;
    prepareExternalHttpRequest(request: AwikiSdkExternalHttpRequest): Promise<AwikiSdkExternalHttpAttempt>;
    getIdentity(): Promise<AwikiIdentity | null>;
    sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiRegistrationOtpResult>;
    registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiIdentity>;
    updateDisplayName(request: AwikiUpdateDisplayNameRequest): Promise<AwikiIdentity>;
    resolvePeer(peer: string): Promise<AwikiResolvedPeer>;
    listConversations(request?: AwikiPageRequest): Promise<AwikiPage<AwikiConversation>>;
    getHistory(request: AwikiHistoryRequest): Promise<AwikiPage<AwikiMessage>>;
    getLocalHistory(request: AwikiHistoryRequest): Promise<AwikiPage<AwikiMessage>>;
    markConversationRead(conversationId: AwikiConversationId): Promise<number>;
    sendText(request: AwikiSendTextRequest): Promise<AwikiMessage>;
    sendAttachment(request: AwikiSdkSendAttachmentRequest): Promise<AwikiMessage>;
    downloadAttachment(request: {
        readonly attachmentId: AwikiAttachmentId;
        readonly messageId: AwikiMessageId;
    }): Promise<AwikiSdkDownloadedAttachment>;
    clearLocalData(): Promise<{
        readonly cleared: boolean;
    }>;
    dispose(): Promise<void>;
}
/**
 * Convert a raw provider download to the Remote JSON representation.
 * @param value - provider-verified public metadata and bytes.
 * @returns detached metadata with canonical Base64 bytes.
 */
export declare function downloadedAttachment(value: AwikiSdkDownloadedAttachment): AwikiDownloadedAttachment;
//# sourceMappingURL=sdk-adapter.d.ts.map