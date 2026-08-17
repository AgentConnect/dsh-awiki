/** Unified AWiki identity, messaging, attachment, Remote, and model-tool service. */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { AwikiClearLocalDataRequest, AwikiClearLocalDataResult, AwikiConversation, AwikiConversationSummary, AwikiDownloadAttachmentRequest, AwikiDownloadedAttachment, AwikiHistoryRequest, AwikiHostClient, AwikiIdentity, AwikiLogoutRequest, AwikiMessage, AwikiMarkConversationReadRequest, AwikiPage, AwikiPageRequest, AwikiRegistrationOtpRequest, AwikiRegistrationOtpResult, AwikiRegistrationRequest, AwikiResolvePeerRequest, AwikiResolvedPeer, AwikiResult, AwikiRuntimeConfig, AwikiSession, AwikiSendAttachmentRequest, AwikiSendTextRequest, AwikiSummarizeConversationRequest, AwikiUpdateDisplayNameRequest } from './types.ts';
import type { AwikiClientFactory } from './provider-api.ts';
import type { AwikiSummaryProvider } from './summary-provider-api.ts';
export type * from './types.ts';
export { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from './types.ts';
export type { AwikiClientFactory, AwikiClientOptions, AwikiSdkClient } from './provider-api.ts';
export type { AwikiSummaryProvider, AwikiSummaryProviderRequest, AwikiSummaryProviderResult, AwikiSummarySourceMessage, } from './summary-provider-api.ts';
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
/** Default AWiki production service origin. */
export declare const DEFAULT_AWIKI_SERVICE_URL = "https://awiki.ai";
/** Default authoritative AWiki message-service DID. */
export declare const DEFAULT_AWIKI_MESSAGE_SERVICE_DID = "did:wba:awiki.ai";
/** Host-owned model input cap after message minimization. */
export declare const DEFAULT_SUMMARY_MAX_INPUT_BYTES: number;
/** Hard limit for one user-triggered conversation summary. */
export declare const MAX_SUMMARY_MESSAGES = 50;
/** Host deployment configuration. */
export interface Config {
    /** AWiki user-service base URL. Production deployments require HTTPS. */
    readonly userServiceUrl?: string;
    /** Handle provider domain used by Legacy registration. */
    readonly userServiceDomain?: string;
    /** AWiki message-service base URL. Production deployments require HTTPS. */
    readonly messageServiceUrl?: string;
    /** Public message-service base URL published in the identity DID document. */
    readonly messageServicePublicUrl?: string;
    /** Authoritative DID of the configured message service. */
    readonly messageServiceDid?: string;
    /** Exact HTTPS origins allowed for discovered attachment object URLs. Defaults to the public message-service origin. */
    readonly allowedAttachmentOrigins?: string[];
    /** Permit loopback HTTP only for local tests. Defaults to false. */
    readonly allowInsecureLoopbackForTesting?: boolean;
    /** Rust IM Core root for identity, SQLite, cache, and compatibility state. */
    readonly stateRoot?: string;
    /** Complete decoded attachment byte limit. Defaults to 10 MiB. */
    readonly attachmentMaxBytes?: number;
    /** Browser history polling interval while its drawer is open. Defaults to 3000 ms. */
    readonly pollIntervalMs?: number;
    /** Maximum UTF-8 bytes of minimized message JSON sent to a summary provider. */
    readonly summaryMaxInputBytes?: number;
}
/** Loader schema for the Host deployment configuration. */
export declare const Config: z<Config>;
/** Deployment-wide AWiki service over one replaceable high-level client provider. */
export declare class AwikiService extends TypertRemoteService implements AwikiHostClient {
    static inject: string[];
    static Config: z<Config>;
    private readonly resolved;
    private readonly sessionStore;
    private startupUserServiceDomain;
    private settingsProvider;
    private provider;
    private signedOut;
    private sessionMutation;
    private sessionRevision;
    private readonly activeSummaryRequests;
    private summaryProvider;
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
    /** Register one replaceable conversation-summary provider for this deployment. */
    registerSummaryProvider(provider: AwikiSummaryProvider): () => void;
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
    /** Return the local registration and sign-in state without exposing secrets. */
    getSession(): Promise<AwikiResult<AwikiSession>>;
    /** Lock this installation while preserving the encrypted identity and local database. */
    logout(request: AwikiLogoutRequest): Promise<AwikiResult<AwikiSession>>;
    /** Resume the same locally preserved identity without registration. */
    login(): Promise<AwikiResult<AwikiSession>>;
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
     * Read real AWiki history, enforce range and byte caps, then invoke the configured model once.
     * @param request - selected conversation and its unread snapshot at open time.
     * @returns a structured summary plus the exact summarized source range.
     */
    summarizeConversation(request: AwikiSummarizeConversationRequest): Promise<AwikiResult<AwikiConversationSummary>>;
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
    /**
     * Permanently remove the exact SDK-owned local state after an explicit browser acknowledgement.
     * The remote AWiki account and Handle are not deleted.
     * @param request - exact destructive-action marker emitted only after the UI's second confirmation.
     * @returns Whether a persisted state file existed when the reset completed.
     */
    clearLocalData(request: AwikiClearLocalDataRequest): Promise<AwikiResult<AwikiClearLocalDataResult>>;
    /** Invalidate cached session work and cancel every model request still owned by the old session. */
    private invalidateSummaries;
    /** Invoke the current client and normalize every rejection to a public result. */
    private run;
    /** Read and cache the private Host-owned session marker. */
    private isSignedOut;
    /** Serialize sign-in, sign-out, and destructive clear transitions. */
    private mutateSession;
    /** Clear one exact provider slot before joining its one shared disposal. */
    private disposeProvider;
}
export default AwikiService;
//# sourceMappingURL=index.d.ts.map