/** Unified AWiki identity, messaging, attachment, Remote, and model-tool service. */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { AwikiConversation, AwikiDownloadAttachmentRequest, AwikiDownloadedAttachment, AwikiHistoryRequest, AwikiHostClient, AwikiIdentity, AwikiMessage, AwikiMarkConversationReadRequest, AwikiPage, AwikiPageRequest, AwikiRegistrationOtpRequest, AwikiRegistrationOtpResult, AwikiRegistrationRequest, AwikiResolvePeerRequest, AwikiResolvedPeer, AwikiResult, AwikiRuntimeConfig, AwikiSendAttachmentRequest, AwikiSendTextRequest, AwikiUpdateDisplayNameRequest } from './types.ts';
import type { AwikiClientFactory } from './provider-api.ts';
export type * from './types.ts';
export type { AwikiClientFactory, AwikiClientOptions, AwikiSdkClient } from './provider-api.ts';
export { AWIKI_DOMAIN_FIELD, AWIKI_SETTINGS_NAMESPACE, AwikiSettingsSchema, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain, validateAwikiSettings, type AwikiSettings, } from './settings.ts';
export { AWIKI_HISTORY_TOOL, AWIKI_IDENTITY_STATUS_TOOL, AWIKI_LIST_CONVERSATIONS_TOOL, AWIKI_SEND_ATTACHMENT_TOOL, AWIKI_SEND_MESSAGE_TOOL, } from './tools.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        awiki: AwikiService;
    }
}
/** Default maximum attachment size: 10 MiB. */
export declare const DEFAULT_ATTACHMENT_MAX_BYTES: number;
/** Default browser polling interval while the AWiki drawer is open. */
export declare const DEFAULT_POLL_INTERVAL_MS = 3000;
/** Host deployment configuration. */
export interface Config {
    /** AWiki user-service base URL. Production deployments require HTTPS. */
    readonly userServiceUrl: string;
    /** Handle provider domain used by Legacy registration. */
    readonly userServiceDomain?: string;
    /** AWiki message-service base URL. Production deployments require HTTPS. */
    readonly messageServiceUrl: string;
    /** Public message-service base URL published in the identity DID document. */
    readonly messageServicePublicUrl: string;
    /** Authoritative DID of the configured message service. */
    readonly messageServiceDid: string;
    /** Exact HTTPS origins allowed for discovered attachment object URLs. Defaults to the public message-service origin. */
    readonly allowedAttachmentOrigins?: string[];
    /** Permit loopback HTTP only for local tests. Defaults to false. */
    readonly allowInsecureLoopbackForTesting?: boolean;
    /** SDK-owned persistent identity state path. */
    readonly statePath: string;
    /** Complete decoded attachment byte limit. Defaults to 10 MiB. */
    readonly attachmentMaxBytes?: number;
    /** Browser history polling interval while its drawer is open. Defaults to 3000 ms. */
    readonly pollIntervalMs?: number;
}
/** Loader schema for the Host deployment configuration. */
export declare const Config: z<Config>;
/** Deployment-wide AWiki service over one replaceable TypeScript client provider. */
export declare class AwikiService extends TypertRemoteService implements AwikiHostClient {
    static inject: string[];
    static Config: z<Config>;
    private readonly resolved;
    private startupUserServiceDomain;
    private provider;
    /**
     * @param ctx - owning Host context.
     * @param config - service endpoints, SDK state path, and public limits.
     */
    constructor(ctx: Context, config: Config);
    /**
     * Register the deployment's sole client factory. The caller must return the
     * resulting disposer from its own `ctx.effect`; disposal clears the slot
     * before awaiting the client's quiescence and is idempotent.
     * @param factory - synchronous factory for one owned high-level client.
     * @returns asynchronous disposer for the exact registered client.
     */
    registerClientFactory(factory: AwikiClientFactory): () => Promise<void>;
    /**
     * Read settings needed by the browser presentation.
     * @returns Browser-safe polling configuration without SDK endpoints or state paths.
     */
    getConfig(): Promise<AwikiResult<AwikiRuntimeConfig>>;
    /**
     * Read the deployment's identity status.
     * @returns The public deployment identity or `null`.
     */
    getIdentity(): Promise<AwikiResult<AwikiIdentity | null>>;
    /**
     * Send one Legacy registration verification code.
     * @param request - Handle and phone used for the registration challenge.
     * @returns Public retry timing or a closed failure.
     */
    sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiResult<AwikiRegistrationOtpResult>>;
    /**
     * Register and persist the deployment's only AWiki identity.
     * @param request - Handle, phone, and verification code for registration.
     * @returns The new public identity or a closed failure.
     */
    registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiResult<AwikiIdentity>>;
    /**
     * Update the deployment identity's public WNS display name.
     * @param request - replacement display name selected by the user.
     * @returns The updated public identity or a closed failure.
     */
    updateDisplayName(request: AwikiUpdateDisplayNameRequest): Promise<AwikiResult<AwikiIdentity>>;
    /**
     * Resolve one Handle or DID before the browser opens a direct chat.
     * @param request - typed Handle or DID.
     * @returns The public peer and conversation id, or a closed failure.
     */
    resolvePeer(request: AwikiResolvePeerRequest): Promise<AwikiResult<AwikiResolvedPeer>>;
    /**
     * List direct and existing group conversations.
     * @param request - Optional opaque cursor and page limit.
     * @returns One page of direct and existing group conversations.
     */
    listConversations(request?: AwikiPageRequest): Promise<AwikiResult<AwikiPage<AwikiConversation>>>;
    /**
     * Read one direct or group conversation history page.
     * @param request - Conversation id, optional cursor, and page limit.
     * @returns One chronological history page.
     */
    getHistory(request: AwikiHistoryRequest): Promise<AwikiResult<AwikiPage<AwikiMessage>>>;
    /**
     * Mark every currently unread inbox message in one conversation as read.
     * @param request - conversation whose current inbox entries should be acknowledged.
     * @returns Number of inbox entries acknowledged by the Message Service.
     */
    markConversationRead(request: AwikiMarkConversationReadRequest): Promise<AwikiResult<number>>;
    /**
     * Send one text message through the deployment identity.
     * @param request - Target, text, and idempotency key.
     * @returns The accepted public message or a closed failure.
     */
    sendText(request: AwikiSendTextRequest): Promise<AwikiResult<AwikiMessage>>;
    /**
     * Upload and send one attachment after Host validation.
     * @param request - Target, attachment metadata and Base64 bytes, caption, and idempotency key.
     * @returns The accepted attachment message or a closed failure.
     */
    sendAttachment(request: AwikiSendAttachmentRequest): Promise<AwikiResult<AwikiMessage>>;
    /**
     * Download and encode one provider-verified attachment.
     * @param request - Containing message id and attachment id.
     * @returns Verified public metadata and canonical Base64 bytes, or a closed failure.
     */
    downloadAttachment(request: AwikiDownloadAttachmentRequest): Promise<AwikiResult<AwikiDownloadedAttachment>>;
    /** Invoke the current client and normalize every rejection to a public result. */
    private run;
    /** Clear one exact provider slot before joining its one shared disposal. */
    private disposeProvider;
}
export default AwikiService;
//# sourceMappingURL=index.d.ts.map