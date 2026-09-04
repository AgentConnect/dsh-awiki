/** Unified AWiki identity, messaging, attachment, Remote, and model-tool service. */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { AwikiClearLocalDataRequest, AwikiClearLocalDataResult, AwikiCompletion, AwikiConversation, AwikiConversationPreferenceMutation, AwikiConversationPreferences, AwikiConversationSummary, AwikiCreateGroupRequest, AwikiCreateGroupResult, AwikiCreateIntegrationRequest, AwikiDownloadAttachmentRequest, AwikiDownloadedAttachment, AwikiAdminJoinProgress, AwikiApproveDeviceJoinRequest, AwikiDeviceJoinProgress, AwikiDeviceManagementSnapshot, AwikiGroupMember, AwikiGroupMemberPage, AwikiGroupMembersRequest, AwikiGroupRequest, AwikiGroupSnapshot, AwikiAddGroupMemberRequest, AwikiRemoveGroupMemberRequest, AwikiHistoryRequest, AwikiHostClient, AwikiIdentityAccessInspection, AwikiIdentityAccessInspectionRequest, AwikiIdentityAccessResult, AwikiIdentity, AwikiIntegrationResult, AwikiIntegrationRevisionRequest, AwikiIntegrationView, AwikiLogoutRequest, AwikiMessage, AwikiMailAccount, AwikiMailInboxPage, AwikiMailInboxRequest, AwikiMailMarkReadRequest, AwikiMailMarkReadResult, AwikiMailMessage, AwikiMailReadRequest, AwikiMailSendRequest, AwikiMailSendResult, AwikiMarkConversationReadRequest, AwikiPage, AwikiPageRequest, AwikiProfile, AwikiReopenIntegrationRequest, AwikiRecoveryOperationRequest, AwikiRecoveryOtpRequest, AwikiRecoveryOtpResult, AwikiRecoveryPrepareRequest, AwikiRecoveryProgress, AwikiConfirmRootTransferRequest, AwikiPrepareRootTransferRequest, AwikiRootTransferPreparation, AwikiRootTransferReceipt, AwikiRegistrationOtpRequest, AwikiRegistrationOtpResult, AwikiRegistrationRequest, AwikiRejectDeviceJoinRequest, AwikiRequestRefInput, AwikiRevokeDeviceRequest, AwikiResolvePeerRequest, AwikiResolvedPeer, AwikiResult, AwikiRuntimeConfig, AwikiSession, AwikiSendAttachmentRequest, AwikiSendTextRequest, AwikiSummarizeConversationRequest, AwikiUpdateDisplayNameRequest, AwikiUpdateProfileRequest, AwikiUpdateIntegrationRequest } from './types.ts';
import type { AwikiClientFactory } from './provider-api.ts';
import type { AwikiSummaryProvider } from './summary-provider-api.ts';
import type { AwikiExternalHttpAuth } from './external-http-auth.ts';
import { type AwikiRealtimeDiagnostics } from './realtime-supervisor.ts';
import { type AwikiTenantProfile, type AwikiTenantRegistryView } from './tenant-registry.ts';
import { type AwikiUpdatePolicyStatus } from './update-policy.ts';
export type * from './types.ts';
export { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from './types.ts';
export { AWIKI_CHINA_TENANT_ID, AWIKI_GLOBAL_TENANT_ID, AWIKI_OFFICIAL_CATALOG_VERSION, AWIKI_TENANT_REGISTRY_SCHEMA_VERSION, type AwikiTenantEndpoints, type AwikiTenantKind, type AwikiTenantLifecycle, type AwikiTenantProfile, type AwikiTenantRegistryDocument, type AwikiTenantRegistryView, type AwikiTenantStorageLayout, } from './tenant-registry.ts';
export type { AwikiClientFactory, AwikiClientOptions, AwikiSdkClient } from './provider-api.ts';
export { DSH_AWIKI_MODEL_PROXY_VERSION, DSH_AWIKI_VERSION, compareVersions as compareAwikiPluginVersions, type AwikiPluginUpdateTarget, type AwikiUpdatePolicyStatus, } from './update-policy.ts';
export { AWIKI_EXTERNAL_HTTP_MAX_BODY_BYTES, AwikiExternalHttpAuthError, } from './external-http-auth.ts';
export type { AwikiExternalHttpAuth, AwikiExternalHttpAuthErrorCode, AwikiHttpTransport, } from './external-http-auth.ts';
export type { AwikiSummaryProvider, AwikiSummaryProviderRequest, AwikiSummaryProviderResult, AwikiSummarySourceMessage, } from './summary-provider-api.ts';
export { AWIKI_DOMAIN_FIELD, AWIKI_SETTINGS_NAMESPACE, AwikiSettingsSchema, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain, validateAwikiSettings, type AwikiSettings, } from './settings.ts';
export { AWIKI_HISTORY_TOOL, AWIKI_IDENTITY_STATUS_TOOL, AWIKI_LIST_CONVERSATIONS_TOOL, AWIKI_MAIL_ACCOUNT_TOOL, AWIKI_MAIL_INBOX_TOOL, AWIKI_MAIL_MARK_READ_TOOL, AWIKI_MAIL_READ_TOOL, AWIKI_MAIL_SEND_TOOL, AWIKI_SEND_ATTACHMENT_TOOL, AWIKI_SEND_MESSAGE_TOOL, } from './tools.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        awiki: AwikiService;
    }
    interface Events {
        /**
         * Committed change to this installation's AWiki sign-in state.
         * @param session - the new public session state after persistence succeeds.
         * @mode emit
         */
        'awiki/session'(session: AwikiSession): void;
        /** Committed active tenant change after the replacement runtime is ready. */
        'awiki/tenant'(tenant: AwikiTenantRegistryView): void;
    }
}
/** Default maximum attachment size: 10 MiB. */
export declare const DEFAULT_ATTACHMENT_MAX_BYTES: number;
/** Default private on-disk budget for verified image previews: 64 MiB. */
export declare const DEFAULT_IMAGE_ATTACHMENT_CACHE_MAX_BYTES: number;
/** Default browser polling interval while the AWiki drawer is open. */
export declare const DEFAULT_POLL_INTERVAL_MS = 3000;
/** Package-configured primary AWiki service origin. */
export declare const DEFAULT_AWIKI_SERVICE_URL: string;
/** @deprecated Runtime capability binding has no separate production fallback. */
export declare const DEFAULT_AWIKI_GUEST_URL: string;
/** Package-configured primary authoritative AWiki message-service DID. */
export declare const DEFAULT_AWIKI_MESSAGE_SERVICE_DID: string;
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
    /** One-time slot override when adopting a pre-registry data root. */
    readonly legacyTenantSlot?: string;
    /** AWiki message-service base URL. Production deployments require HTTPS. */
    readonly messageServiceUrl?: string;
    /** AWiki mail-service base URL. Defaults to the resolved AWiki user-service URL. */
    readonly mailServiceUrl?: string;
    /** Public message-service base URL published in the identity DID document. */
    readonly messageServicePublicUrl?: string;
    /** Authoritative DID of the configured message service. */
    readonly messageServiceDid?: string;
    /** Explicit private/development Guest override; normal deployments use active-tenant service discovery. */
    readonly guestGatewayUrl?: string;
    /** Exact HTTPS origins allowed for discovered attachment object URLs. Defaults to the public message-service origin. */
    readonly allowedAttachmentOrigins?: string[];
    /** Permit loopback HTTP only for local tests. Defaults to false. */
    readonly allowInsecureLoopbackForTesting?: boolean;
    /** Rust IM Core root for identity, SQLite, cache, and compatibility state. */
    readonly stateRoot?: string;
    /** Complete decoded attachment byte limit. Defaults to 10 MiB. */
    readonly attachmentMaxBytes?: number;
    /** Private on-disk image-preview cache budget. Defaults to 64 MiB. */
    readonly imageAttachmentCacheMaxBytes?: number;
    /** Browser history polling interval while its drawer is open. Defaults to 3000 ms. */
    readonly pollIntervalMs?: number;
    /** Enable the identity-level Direct/Group/System Notification WSS. Defaults to true. */
    readonly realtimeEnabled?: boolean;
    /** Enable authorized AWiki direct messages as a DSH Agent entry point. Defaults to false. */
    readonly listenerEnabled?: boolean;
    /** Exact AWiki Handles or DIDs permitted to drive the listener. Required when enabled. */
    readonly listenerAllowedPeers?: string[];
    /** Absolute Workspace used by every AWiki-originated Session. Defaults below DSH_HOME. */
    readonly listenerWorkspacePath?: string;
    /** Maximum UTF-8 bytes of minimized message JSON sent to a summary provider. */
    readonly summaryMaxInputBytes?: number;
}
export interface AwikiTenantSwitchContext {
    readonly from: AwikiTenantProfile;
    readonly to: AwikiTenantProfile;
    readonly generation: number;
}
/** Same-process optional capability participating in the Host tenant transaction. */
export interface AwikiTenantLifecycleParticipant {
    readonly component?: {
        readonly product: 'dsh-awiki-model-proxy';
        readonly version: string;
    };
    prepareSwitch(context: AwikiTenantSwitchContext): void | Promise<void>;
    commitSwitch?(context: AwikiTenantSwitchContext): void | Promise<void>;
    rollbackSwitch?(context: AwikiTenantSwitchContext): void | Promise<void>;
}
export interface AwikiTenantCapabilities {
    readonly tenantId: string;
    readonly generation: number;
    readonly online: boolean;
    readonly handleRecoveryPhoneEnabled: boolean;
    readonly modelProxyBaseUrl?: string;
    readonly guestGatewayBaseUrl?: string;
}
/** Loader schema for the Host deployment configuration. */
export declare const Config: z<Config>;
export interface AwikiHostRealtimeDiagnostics extends AwikiRealtimeDiagnostics {
    readonly localDeviceJoinRequestCountAfterSync: number;
}
/** Deployment-wide AWiki service over one replaceable high-level client provider. */
export declare class AwikiService extends TypertRemoteService implements AwikiHostClient {
    static inject: string[];
    static Config: z<Config>;
    private readonly resolved;
    private sessionStore;
    private imageAttachmentCache;
    private sentMailStore;
    private conversationPreferenceStore;
    private startupUserServiceDomain;
    private settingsProvider;
    private tenantRegistry;
    private activeTenant;
    private activeClientOptions;
    private clientFactory;
    private provider;
    private runtimeGeneration;
    private tenantSwitching;
    private readonly tenantParticipants;
    private activeCapabilities;
    private updatePolicyStatus;
    private updatePolicyRequest;
    private signedOut;
    private sessionMutation;
    private sessionRevision;
    private activeIdentityDid;
    private pendingDeviceJoin;
    private activeDeviceJoinSessionId;
    private readonly requestRefs;
    private readonly requestSessions;
    private readonly deviceRefs;
    private readonly deviceIds;
    private readonly rootTransfers;
    private readonly activeSummaryRequests;
    private summaryProvider;
    private readonly hostContext;
    /** Trusted same-process external HTTP authentication dispatcher. Never Remote. */
    readonly externalHttpAuth: AwikiExternalHttpAuth;
    private integrationClient;
    private workspaceContext;
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
    private ensureTenantRegistry;
    private optionsForTenant;
    private ensureTenantOptions;
    private bindTenantState;
    private openTenantProvider;
    /** Read the Host-owned catalog for trusted loopback settings surfaces. */
    getTenantRegistryView(): AwikiTenantRegistryView;
    /** Browser-safe, same-process update state for Desktop and loopback settings. */
    getUpdatePolicyStatus(): AwikiUpdatePolicyStatus;
    /** Refresh only the active generation; late results from old tenants are discarded. */
    refreshUpdatePolicy(): Promise<AwikiUpdatePolicyStatus>;
    private currentModelProxyVersion;
    createCustomTenant(displayName: string, domain: string): AwikiTenantRegistryView;
    renameCustomTenant(tenantId: string, displayName: string): AwikiTenantRegistryView;
    archiveCustomTenant(tenantId: string): AwikiTenantRegistryView;
    /** Register one same-process resource owner in every transactional tenant change. */
    registerTenantLifecycleParticipant(participant: AwikiTenantLifecycleParticipant): () => void;
    /** Replace the complete Core runtime and commit the active tenant only after opening succeeds. */
    switchTenant(tenantId: string): Promise<AwikiTenantRegistryView>;
    /** Safe same-process diagnostics for focused E2E. Never exposed through Typert Remote. */
    getRealtimeDiagnostics(): AwikiHostRealtimeDiagnostics;
    /** Register one replaceable conversation-summary provider for this deployment. */
    registerSummaryProvider(provider: AwikiSummaryProvider): () => void;
    /**
     * Read settings needed by the browser presentation.
     * @returns Browser-safe polling configuration without SDK endpoints or state paths.
     */
    getConfig(): Promise<AwikiResult<AwikiRuntimeConfig>>;
    /** Trusted same-process capability binding for optional tenant participants. */
    getTenantCapabilities(): AwikiTenantCapabilities;
    /** Refresh the active tenant's optional service advertisement without affecting Core availability. */
    refreshTenantCapabilities(): Promise<AwikiTenantCapabilities>;
    private discoverTenantCapabilities;
    /** Read the Integration owned by the active full Handle through the fixed Host client. */
    getIntegration(): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    /** Create the active full Handle's only Integration. */
    createIntegration(request: AwikiCreateIntegrationRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    /** Update editable Integration fields with optimistic concurrency. */
    updateIntegration(request: AwikiUpdateIntegrationRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    /** Atomically replace the current public Integration id. */
    rotateIntegrationId(request: AwikiIntegrationRevisionRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    /** Close the Integration and revoke its current public id. */
    closeIntegration(request: AwikiIntegrationRevisionRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    /** Revalidate one closed Integration and issue a new public id. */
    reopenIntegration(request: AwikiReopenIntegrationRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
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
    /** Classify one configured-domain Handle before selecting the registration or recovery OTP purpose. */
    inspectIdentityAccess(request: AwikiIdentityAccessInspectionRequest): Promise<AwikiResult<AwikiIdentityAccessInspection>>;
    sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiResult<AwikiRegistrationOtpResult>>;
    /**
     * Register and persist the deployment's only AWiki identity.
     * @param request - Handle, phone, and verification code for registration.
     * @returns The new public identity or a closed failure.
     */
    registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiResult<AwikiIdentityAccessResult>>;
    /** Retire only this revoked device credential; ordinary local messages remain for the rejoined identity. */
    retireDeviceIdentityForRejoin(): Promise<AwikiResult<AwikiCompletion>>;
    /** Consume the exact in-memory continuation; ordinary Join never claims rebind user presence. */
    beginDeviceJoin(): Promise<AwikiResult<AwikiDeviceJoinProgress>>;
    /** Restore from Core local_sessions and advance only the exact resumable Join. */
    getDeviceJoinStatus(): Promise<AwikiResult<AwikiDeviceJoinProgress | null>>;
    cancelDeviceJoin(): Promise<AwikiResult<AwikiCompletion>>;
    /** Reliable-sync and project only Host-opaque device/request references. */
    refreshDeviceManagement(): Promise<AwikiResult<AwikiDeviceManagementSnapshot>>;
    startDeviceJoinVerification(request: AwikiRequestRefInput): Promise<AwikiResult<AwikiAdminJoinProgress>>;
    approveDeviceJoin(request: AwikiApproveDeviceJoinRequest): Promise<AwikiResult<AwikiAdminJoinProgress>>;
    rejectDeviceJoin(request: AwikiRejectDeviceJoinRequest): Promise<AwikiResult<AwikiAdminJoinProgress>>;
    revokeDevice(request: AwikiRevokeDeviceRequest): Promise<AwikiResult<AwikiDeviceManagementSnapshot>>;
    /** Prepare a short-lived Core authorization without exposing it to Browser. */
    prepareRootTransfer(request: AwikiPrepareRootTransferRequest): Promise<AwikiResult<AwikiRootTransferPreparation>>;
    /** Authenticate locally, recheck fresh context, then consume one exact Core authorization. */
    confirmRootTransfer(request: AwikiConfirmRootTransferRequest): Promise<AwikiResult<AwikiRootTransferReceipt>>;
    /**
     * Update the deployment identity's public WNS display name.
     * @param request - replacement display name selected by the user.
     * @returns The updated public identity or a closed failure.
     */
    updateDisplayName(request: AwikiUpdateDisplayNameRequest): Promise<AwikiResult<AwikiIdentity>>;
    /** Return the public editable profile for the active identity. */
    getProfile(): Promise<AwikiResult<AwikiProfile>>;
    /** Update Display Name, bio, and tags after applying product limits in the Host. */
    updateProfile(request: AwikiUpdateProfileRequest): Promise<AwikiResult<AwikiProfile>>;
    /** Start durable phone recovery for one existing full Handle. */
    sendRecoveryOtp(request: AwikiRecoveryOtpRequest): Promise<AwikiResult<AwikiRecoveryOtpResult>>;
    /** Verify a recovery OTP and freeze its exact intent before the remote commit. */
    prepareRecovery(request: AwikiRecoveryPrepareRequest): Promise<AwikiResult<AwikiRecoveryProgress>>;
    /** Attempt one prepared recovery commit; uncertain outcomes remain durable in Core. */
    activateRecovery(request: AwikiRecoveryOperationRequest): Promise<AwikiResult<AwikiRecoveryProgress>>;
    /** Read durable recovery state before deciding whether a retry is valid. */
    getRecoveryStatus(request: AwikiRecoveryOperationRequest): Promise<AwikiResult<AwikiRecoveryProgress>>;
    /** Resume only the exact Core-owned operation selected by the browser. */
    resumeRecovery(request: AwikiRecoveryOperationRequest): Promise<AwikiResult<AwikiRecoveryProgress>>;
    /** Discard only a pre-attempt operation; Core rejects post-attempt deletion. */
    discardRecovery(request: AwikiRecoveryOperationRequest): Promise<AwikiResult<AwikiCompletion>>;
    /**
     * Resolve one Handle or DID before the browser opens a direct chat.
     * @param request - typed Handle or DID.
     * @returns The public peer and conversation id, or a closed failure.
     */
    resolvePeer(request: AwikiResolvePeerRequest): Promise<AwikiResult<AwikiResolvedPeer>>;
    /**
     * Create one group, then settle every initial-member invitation without hiding a created group.
     * @param request - bounded group name and initial Handle/DID values.
     * @returns The created conversation and per-member outcomes.
     */
    createGroup(request: AwikiCreateGroupRequest): Promise<AwikiResult<AwikiCreateGroupResult>>;
    /** Return one authoritative group snapshot for permission-aware UI. */
    getGroup(request: AwikiGroupRequest): Promise<AwikiResult<AwikiGroupSnapshot>>;
    /** Join one open group and return its authoritative membership state. */
    joinGroup(request: AwikiGroupRequest): Promise<AwikiResult<AwikiGroupSnapshot>>;
    /** Leave one group. Core rejects owner leave and unsupported security profiles. */
    leaveGroup(request: AwikiGroupRequest): Promise<AwikiResult<AwikiCompletion>>;
    /** Read one authoritative versioned member page. */
    listGroupMembers(request: AwikiGroupMembersRequest): Promise<AwikiResult<AwikiGroupMemberPage>>;
    /** Invite one ordinary member after group creation. */
    addGroupMember(request: AwikiAddGroupMemberRequest): Promise<AwikiResult<AwikiGroupMember>>;
    /** Remove one member. The authoritative Core role check remains decisive. */
    removeGroupMember(request: AwikiRemoveGroupMemberRequest): Promise<AwikiResult<AwikiGroupMember>>;
    /** Read presentation-only roster preferences for the active identity. */
    getConversationPreferences(): Promise<AwikiResult<AwikiConversationPreferences>>;
    /** Persist one bounded local roster preference without changing Core or remote membership. */
    updateConversationPreference(request: AwikiConversationPreferenceMutation): Promise<AwikiResult<AwikiConversationPreferences>>;
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
    /** Read one committed local conversation page without sync, history, or Directory RPC. */
    getLocalHistory(request: AwikiHistoryRequest): Promise<AwikiResult<AwikiPage<AwikiMessage>>>;
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
    /** Revalidate cached/provider bytes before crossing the browser Remote boundary. */
    private publicDownloadedAttachment;
    /** Return the deployment identity's public mailbox state. */
    getMailAccount(): Promise<AwikiResult<AwikiMailAccount>>;
    /** List one bounded mailbox page on explicit browser/tool demand. */
    listMailInbox(request?: AwikiMailInboxRequest): Promise<AwikiResult<AwikiMailInboxPage>>;
    /** Read one bounded plain-text mail message. */
    readMail(request: AwikiMailReadRequest): Promise<AwikiResult<AwikiMailMessage>>;
    /** Mark explicitly selected mail messages read. Browser callers require an explicit click. */
    markMailRead(request: AwikiMailMarkReadRequest): Promise<AwikiResult<AwikiMailMarkReadResult>>;
    /** Send one plain-text mail once. Browser callers require an explicit confirmation. */
    sendMail(request: AwikiMailSendRequest): Promise<AwikiResult<AwikiMailSendResult>>;
    /**
     * Permanently remove the exact SDK-owned local state after an explicit browser acknowledgement.
     * The remote AWiki account and Handle are not deleted.
     * @param request - exact destructive-action marker emitted only after the UI's second confirmation.
     * @returns Whether a persisted state file existed when the reset completed.
     */
    clearLocalData(request: AwikiClearLocalDataRequest): Promise<AwikiResult<AwikiClearLocalDataResult>>;
    /** Re-enter only after Core confirms that the exact recovered identity is applied locally. */
    private applyRecoveredSession;
    /** Rebind Mail first-use ownership after the recovered identity becomes current. */
    private reconcileRecoveredMailbox;
    /** Select the only resumable new-device session; Core local_sessions is the sole restart SoT. */
    private selectDeviceJoinSession;
    private applyCandidateJoinProgress;
    private publicAdminJoinProgress;
    private localAdminJoinProgress;
    private requireDeviceManager;
    private requireRootTransferRecipient;
    private requestRef;
    private deviceRef;
    private deviceManagementSnapshot;
    private publicDevice;
    /** Publish one newly registered identity, then start realtime only in the background. */
    private activateRegisteredIdentity;
    /** Invalidate cached session work and cancel every model request still owned by the old session. */
    private invalidateSummaries;
    /** Publish a committed session transition to same-process Host consumers. */
    private publishSession;
    /** Resolve and cache the owner binding required by private Host-side projections. */
    private ownerDid;
    /** Invoke the current client and normalize every rejection to a public result. */
    private run;
    private assertVersionSupported;
    /** Validate mail input before entering the provider and preserve fixed public failures. */
    private runValidatedMail;
    /** Read and cache the private Host-owned session marker. */
    private isSignedOut;
    /** Bind one external-auth dispatch to the current provider and session revision. */
    private acquireExternalHttpAuthSession;
    /** Serialize sign-in, sign-out, and destructive clear transitions. */
    private mutateSession;
    /** Start identity realtime and the optional Agent consumer without blocking identity success. */
    private ensureProviderRuntime;
    private replaceProviderRuntime;
    private ensureRealtimeSupervisor;
    private realtimeFenceMatches;
    private onRealtimeSynchronized;
    private ensureAgentConsumer;
    private agentConsumerFenceMatches;
    private detachAgentConsumer;
    private stopAgentConsumer;
    private stopRealtimeSupervisor;
    private stopProviderRuntime;
    /** Clear one exact provider slot before joining its one shared disposal. */
    private disposeProvider;
}
export default AwikiService;
//# sourceMappingURL=index.d.ts.map