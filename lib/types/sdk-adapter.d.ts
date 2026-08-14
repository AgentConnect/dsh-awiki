/** TypeScript SDK adapter that copies provider values into Host-owned public DTOs. */
import type { AwikiImClient } from '@anp/typescript-sdk';
import type { AwikiAttachmentId, AwikiConversation, AwikiConversationId, AwikiDownloadedAttachment, AwikiHistoryRequest, AwikiIdentity, AwikiMessage, AwikiMessageId, AwikiPage, AwikiPageRequest, AwikiResolvedPeer, AwikiRegistrationOtpRequest, AwikiRegistrationOtpResult, AwikiRegistrationRequest, AwikiSendTextRequest, AwikiUpdateDisplayNameRequest } from './types.ts';
import type { AwikiSdkClient, AwikiSdkDownloadedAttachment, AwikiSdkSendAttachmentRequest } from './provider-api.ts';
/** Adapt the versioned TypeScript SDK to the Host provider interface. */
export declare class TypeScriptSdkAdapter implements AwikiSdkClient {
    private readonly client;
    /** @param client - initialized high-level SDK client owned by this adapter. */
    constructor(client: AwikiImClient);
    getIdentity(): Promise<AwikiIdentity | null>;
    sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiRegistrationOtpResult>;
    registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiIdentity>;
    updateDisplayName(request: AwikiUpdateDisplayNameRequest): Promise<AwikiIdentity>;
    resolvePeer(peer: string): Promise<AwikiResolvedPeer>;
    listConversations(request?: AwikiPageRequest): Promise<AwikiPage<AwikiConversation>>;
    getHistory(request: AwikiHistoryRequest): Promise<AwikiPage<AwikiMessage>>;
    markConversationRead(conversationId: AwikiConversationId): Promise<number>;
    sendText(request: AwikiSendTextRequest): Promise<AwikiMessage>;
    sendAttachment(request: AwikiSdkSendAttachmentRequest): Promise<AwikiMessage>;
    downloadAttachment(request: {
        readonly attachmentId: AwikiAttachmentId;
        readonly messageId: AwikiMessageId;
    }): Promise<AwikiSdkDownloadedAttachment>;
    dispose(): Promise<void>;
}
/**
 * Convert a raw provider download to the Remote JSON representation.
 * @param value - provider-verified public metadata and bytes.
 * @returns detached metadata with canonical Base64 bytes.
 */
export declare function downloadedAttachment(value: AwikiSdkDownloadedAttachment): AwikiDownloadedAttachment;
//# sourceMappingURL=sdk-adapter.d.ts.map