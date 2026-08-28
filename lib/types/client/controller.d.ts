/** React-free browser controller for the deployment's one AWiki identity. */
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { AwikiAttachmentId, AwikiCompletion, AwikiClearLocalDataRequest, AwikiClearLocalDataResult, AwikiConversation, AwikiConversationPreferenceMutation, AwikiConversationPreferences, AwikiConversationSummary, AwikiConversationId, AwikiCreateGroupRequest, AwikiCreateGroupResult, AwikiCreateIntegrationRequest, AwikiDownloadedAttachment, AwikiAdminJoinProgress, AwikiApproveDeviceJoinRequest, AwikiDeviceJoinProgress, AwikiDeviceManagementSnapshot, AwikiGroupMember, AwikiGroupMemberPage, AwikiGroupMemberRecord, AwikiGroupSnapshot, AwikiHistoryRequest, AwikiIdentityAccessInspection, AwikiIdentityAccessInspectionRequest, AwikiIdentityAccessResult, AwikiIdentity, AwikiIntegrationResult, AwikiIntegrationRevisionRequest, AwikiIntegrationView, AwikiLogoutRequest, AwikiMessage, AwikiMessageId, AwikiMention, AwikiMarkConversationReadRequest, AwikiMailAccount, AwikiMailInboxPage, AwikiMailInboxRequest, AwikiMailMarkReadRequest, AwikiMailMarkReadResult, AwikiMailMessage, AwikiMailReadRequest, AwikiMailSendRequest, AwikiMailSendResult, AwikiPage, AwikiPageRequest, AwikiProfile, AwikiRecoveryOtpRequest, AwikiRecoveryOtpResult, AwikiRecoveryPrepareRequest, AwikiRecoveryProgress, AwikiResolvePeerRequest, AwikiResolvedPeer, AwikiRegistrationOtpRequest, AwikiRegistrationOtpResult, AwikiRegistrationRequest, AwikiRejectDeviceJoinRequest, AwikiRequestRefInput, AwikiRevokeDeviceRequest, AwikiResult, AwikiRuntimeConfig, AwikiSession, AwikiSendAttachmentRequest, AwikiSendTextRequest, AwikiSummarizeConversationRequest, AwikiUpdateDisplayNameRequest, AwikiUpdateProfileRequest, AwikiUpdateIntegrationRequest } from '@awiki/dsh-plugin/types';
import { type AwikiBrowserImageCache } from './image-cache.ts';
/** The generated `remote.awiki` methods consumed by this controller. */
export interface AwikiRemote {
    /** Read browser-safe Host polling policy. */
    getConfig: () => Promise<RemoteResult<AwikiResult<AwikiRuntimeConfig>>>;
    getIntegration: () => Promise<RemoteResult<AwikiIntegrationResult<AwikiIntegrationView>>>;
    createIntegration: (request: AwikiCreateIntegrationRequest) => Promise<RemoteResult<AwikiIntegrationResult<AwikiIntegrationView>>>;
    updateIntegration: (request: AwikiUpdateIntegrationRequest) => Promise<RemoteResult<AwikiIntegrationResult<AwikiIntegrationView>>>;
    rotateIntegrationId: (request: AwikiIntegrationRevisionRequest) => Promise<RemoteResult<AwikiIntegrationResult<AwikiIntegrationView>>>;
    closeIntegration: (request: AwikiIntegrationRevisionRequest) => Promise<RemoteResult<AwikiIntegrationResult<AwikiIntegrationView>>>;
    /** Read the deployment's public identity, if registered. */
    getIdentity: () => Promise<RemoteResult<AwikiResult<AwikiIdentity | null>>>;
    /** Read whether this installation is unregistered, signed out, or active. */
    getSession: () => Promise<RemoteResult<AwikiResult<AwikiSession>>>;
    /** Sign out locally without deleting the persisted identity. */
    logout: (request: AwikiLogoutRequest) => Promise<RemoteResult<AwikiResult<AwikiSession>>>;
    /** Resume the preserved local identity. */
    login: () => Promise<RemoteResult<AwikiResult<AwikiSession>>>;
    /** Classify one configured-domain Handle before selecting the OTP purpose. */
    inspectIdentityAccess: (request: AwikiIdentityAccessInspectionRequest) => Promise<RemoteResult<AwikiResult<AwikiIdentityAccessInspection>>>;
    /** Request one registration verification code. */
    sendRegistrationOtp: (request: AwikiRegistrationOtpRequest) => Promise<RemoteResult<AwikiResult<AwikiRegistrationOtpResult>>>;
    /** Register and persist the deployment's sole identity. */
    registerIdentity: (request: AwikiRegistrationRequest) => Promise<RemoteResult<AwikiResult<AwikiIdentityAccessResult>>>;
    beginDeviceJoin: () => Promise<RemoteResult<AwikiResult<AwikiDeviceJoinProgress>>>;
    getDeviceJoinStatus: () => Promise<RemoteResult<AwikiResult<AwikiDeviceJoinProgress | null>>>;
    cancelDeviceJoin: () => Promise<RemoteResult<AwikiResult<AwikiCompletion>>>;
    refreshDeviceManagement: () => Promise<RemoteResult<AwikiResult<AwikiDeviceManagementSnapshot>>>;
    startDeviceJoinVerification: (request: AwikiRequestRefInput) => Promise<RemoteResult<AwikiResult<AwikiAdminJoinProgress>>>;
    approveDeviceJoin: (request: AwikiApproveDeviceJoinRequest) => Promise<RemoteResult<AwikiResult<AwikiAdminJoinProgress>>>;
    rejectDeviceJoin: (request: AwikiRejectDeviceJoinRequest) => Promise<RemoteResult<AwikiResult<AwikiAdminJoinProgress>>>;
    revokeDevice: (request: AwikiRevokeDeviceRequest) => Promise<RemoteResult<AwikiResult<AwikiDeviceManagementSnapshot>>>;
    /** Update the deployment identity's public WNS display name. */
    updateDisplayName: (request: AwikiUpdateDisplayNameRequest) => Promise<RemoteResult<AwikiResult<AwikiIdentity>>>;
    getProfile: () => Promise<RemoteResult<AwikiResult<AwikiProfile>>>;
    updateProfile: (request: AwikiUpdateProfileRequest) => Promise<RemoteResult<AwikiResult<AwikiProfile>>>;
    sendRecoveryOtp: (request: AwikiRecoveryOtpRequest) => Promise<RemoteResult<AwikiResult<AwikiRecoveryOtpResult>>>;
    prepareRecovery: (request: AwikiRecoveryPrepareRequest) => Promise<RemoteResult<AwikiResult<AwikiRecoveryProgress>>>;
    activateRecovery: (request: {
        readonly operationId: string;
    }) => Promise<RemoteResult<AwikiResult<AwikiRecoveryProgress>>>;
    getRecoveryStatus: (request: {
        readonly operationId: string;
    }) => Promise<RemoteResult<AwikiResult<AwikiRecoveryProgress>>>;
    resumeRecovery: (request: {
        readonly operationId: string;
    }) => Promise<RemoteResult<AwikiResult<AwikiRecoveryProgress>>>;
    discardRecovery: (request: {
        readonly operationId: string;
    }) => Promise<RemoteResult<AwikiResult<AwikiCompletion>>>;
    /** Resolve one Handle or DID before opening a direct chat. */
    resolvePeer: (request: AwikiResolvePeerRequest) => Promise<RemoteResult<AwikiResult<AwikiResolvedPeer>>>;
    /** Create one group and settle every initial-member invitation. */
    createGroup: (request: AwikiCreateGroupRequest) => Promise<RemoteResult<AwikiResult<AwikiCreateGroupResult>>>;
    getGroup: (request: {
        readonly groupDid: AwikiGroupSnapshot['groupDid'];
    }) => Promise<RemoteResult<AwikiResult<AwikiGroupSnapshot>>>;
    joinGroup: (request: {
        readonly groupDid: AwikiGroupSnapshot['groupDid'];
    }) => Promise<RemoteResult<AwikiResult<AwikiGroupSnapshot>>>;
    leaveGroup: (request: {
        readonly groupDid: AwikiGroupSnapshot['groupDid'];
    }) => Promise<RemoteResult<AwikiResult<AwikiCompletion>>>;
    listGroupMembers: (request: {
        readonly groupDid: AwikiGroupSnapshot['groupDid'];
        readonly cursor?: AwikiGroupMemberPage['nextCursor'];
        readonly limit?: number;
    }) => Promise<RemoteResult<AwikiResult<AwikiGroupMemberPage>>>;
    addGroupMember: (request: {
        readonly groupDid: AwikiGroupSnapshot['groupDid'];
        readonly member: string;
    }) => Promise<RemoteResult<AwikiResult<AwikiGroupMember>>>;
    removeGroupMember: (request: {
        readonly groupDid: AwikiGroupSnapshot['groupDid'];
        readonly member: string;
    }) => Promise<RemoteResult<AwikiResult<AwikiGroupMember>>>;
    /** Read identity-scoped, presentation-only roster preferences. */
    getConversationPreferences: () => Promise<RemoteResult<AwikiResult<AwikiConversationPreferences>>>;
    /** Persist one presentation-only roster preference. */
    updateConversationPreference: (request: AwikiConversationPreferenceMutation) => Promise<RemoteResult<AwikiResult<AwikiConversationPreferences>>>;
    /** List one page of direct and group conversations. */
    listConversations: (request?: AwikiPageRequest) => Promise<RemoteResult<AwikiResult<AwikiPage<AwikiConversation>>>>;
    /** Read one conversation history page. */
    getHistory: (request: AwikiHistoryRequest) => Promise<RemoteResult<AwikiResult<AwikiPage<AwikiMessage>>>>;
    /** Read one committed local conversation page without network refresh. */
    getLocalHistory: (request: AwikiHistoryRequest) => Promise<RemoteResult<AwikiResult<AwikiPage<AwikiMessage>>>>;
    /** Summarize one Host-bounded real-history range. */
    summarizeConversation: (request: AwikiSummarizeConversationRequest) => Promise<RemoteResult<AwikiResult<AwikiConversationSummary>>>;
    /** Mark one conversation's current inbox entries as read. */
    markConversationRead: (request: AwikiMarkConversationReadRequest) => Promise<RemoteResult<AwikiResult<number>>>;
    /** Send one idempotent text message. */
    sendText: (request: AwikiSendTextRequest) => Promise<RemoteResult<AwikiResult<AwikiMessage>>>;
    /** Send one idempotent attachment message. */
    sendAttachment: (request: AwikiSendAttachmentRequest) => Promise<RemoteResult<AwikiResult<AwikiMessage>>>;
    /** Download one attachment by containing message and attachment identity. */
    downloadAttachment: (request: {
        attachmentId: AwikiAttachmentId;
        messageId: AwikiMessageId;
    }) => Promise<RemoteResult<AwikiResult<AwikiDownloadedAttachment>>>;
    /** Permanently clear this installation's local identity and message state. */
    clearLocalData: (request: AwikiClearLocalDataRequest) => Promise<RemoteResult<AwikiResult<AwikiClearLocalDataResult>>>;
    /** Read the deployment mailbox account on demand. */
    getMailAccount: () => Promise<RemoteResult<AwikiResult<AwikiMailAccount>>>;
    /** List one bounded mailbox page on demand. */
    listMailInbox: (request?: AwikiMailInboxRequest) => Promise<RemoteResult<AwikiResult<AwikiMailInboxPage>>>;
    /** Read one bounded plain-text mail message. */
    readMail: (request: AwikiMailReadRequest) => Promise<RemoteResult<AwikiResult<AwikiMailMessage>>>;
    /** Mark explicitly selected mail messages read. */
    markMailRead: (request: AwikiMailMarkReadRequest) => Promise<RemoteResult<AwikiResult<AwikiMailMarkReadResult>>>;
    /** Send one confirmed plain-text mail once. */
    sendMail: (request: AwikiMailSendRequest) => Promise<RemoteResult<AwikiResult<AwikiMailSendResult>>>;
}
/** Load phase of the drawer's Host-owned data. */
export type AwikiControllerStatus = 'cold' | 'loading' | 'ready' | 'error';
/** Runtime-only summary state retained independently for every conversation. */
export type AwikiSummaryStatus = 'idle' | 'loading' | 'success' | 'error';
/** One conversation's non-persistent AI summary projection. */
export interface AwikiSummaryView {
    readonly status: AwikiSummaryStatus;
    readonly collapsed: boolean;
    readonly stale: boolean;
    readonly result?: AwikiConversationSummary;
    readonly error?: string;
}
/** Authoritative access state for the currently selected Group conversation. */
export interface AwikiGroupAccessView {
    readonly groupDid: AwikiGroupSnapshot['groupDid'];
    readonly status: 'loading' | 'available' | 'recovering' | 'blocked' | 'not-member' | 'network-error';
}
/** Session state rendered by the browser, including a recoverable revoked credential. */
export type AwikiViewSessionStatus = AwikiSession['status'] | 'recovery-required';
/** Immutable drawer data published through the framework hook binder. */
export interface AwikiView {
    readonly status: AwikiControllerStatus;
    readonly sessionStatus: AwikiViewSessionStatus;
    readonly identity: AwikiIdentity | null;
    readonly profile: AwikiProfile | null;
    readonly conversations: readonly AwikiConversation[];
    readonly hiddenConversations: readonly AwikiConversation[];
    readonly conversationsHasMore: boolean;
    readonly selectedConversationId: AwikiConversationId | null;
    readonly selectedGroup: AwikiGroupSnapshot | null;
    readonly groupAccess: AwikiGroupAccessView | null;
    readonly groupMembers: readonly AwikiGroupMemberRecord[];
    readonly groupMembersHasMore: boolean;
    readonly messages: readonly AwikiMessage[];
    readonly historyHasMore: boolean;
    /** True only while the selected conversation's committed local first page is loading. */
    readonly localPending: boolean;
    /** True while the selected conversation is reconciling remote history in the background. */
    readonly refreshing: boolean;
    readonly pending: string | null;
    readonly error: string | null;
    readonly attachmentMaxBytes: number;
    readonly handleRecoveryPhoneEnabled: boolean;
    readonly summaries: Readonly<Record<string, AwikiSummaryView>>;
    readonly recoveryOperationId: string | null;
    readonly recoveryProgress: AwikiRecoveryProgress | null;
}
/** Settled user operation result with one display-safe failure. */
export type AwikiActionResult<Value = void> = {
    readonly ok: true;
    readonly value: Value;
} | {
    readonly ok: false;
    readonly error: string;
};
/** Browser object layer for identity, conversations, history, and polling. */
export declare class AwikiController implements HostObservable<AwikiView> {
    private readonly remote;
    private readonly persistentImageCache;
    private view;
    private readonly listeners;
    private config;
    private conversationsCursor;
    private historyCursor;
    private groupMembersCursor;
    private timer;
    private generation;
    private selectionRevision;
    private disposed;
    private polling;
    private readonly markReadInFlight;
    private readonly unreadAtOpen;
    private readonly summaryBaselines;
    /** Last trustworthy direct profile for the active identity, keyed by canonical peer DID. */
    private readonly directProfiles;
    /** Last trustworthy group title for the active identity, keyed by canonical Group DID. */
    private readonly groupTitles;
    /** Identity-scoped product overlays. Core conversations and history remain untouched. */
    private readonly hiddenConversationPreferences;
    /** Verified image payloads retained outside observable state for instant remounts. */
    private readonly imageAttachments;
    private imageAttachmentCacheBytes;
    private presentationCacheOwnerDid;
    /**
     * @param remote - generated Host Remote namespace.
     * @param persistentImageCache - browser-origin verified preview cache.
     */
    constructor(remote: AwikiRemote, persistentImageCache?: AwikiBrowserImageCache);
    /** Return the cached immutable view. */
    getSnapshot: () => AwikiView;
    /** Subscribe to view replacement. */
    subscribe: (listener: () => void) => (() => void);
    /** Load Host policy and the shared identity state without starting drawer polling. */
    loadSession(): Promise<AwikiActionResult>;
    /**
     * Load Host policy and identity, then start polling while the drawer remains open.
     * @returns successful readiness or one display-safe Host failure.
     */
    open(): Promise<AwikiActionResult>;
    /** Sign out locally while retaining the SDK-owned identity and database. */
    logout(request: AwikiLogoutRequest): Promise<AwikiActionResult<AwikiSession>>;
    /** Resume the preserved local identity and reload its conversations. */
    login(): Promise<AwikiActionResult<AwikiSession>>;
    /** Stop polling and invalidate all in-flight drawer work. */
    close(): void;
    /**
     * Request one phone verification challenge.
     * @param request - desired Handle and verification phone number.
     * @returns challenge retry metadata or one display-safe failure.
     */
    sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiActionResult<AwikiRegistrationOtpResult>>;
    /** Classify one Handle before sending exactly one registration or recovery OTP. */
    inspectIdentityAccess(request: AwikiIdentityAccessInspectionRequest): Promise<AwikiActionResult<AwikiIdentityAccessInspection>>;
    /**
     * Register the deployment identity and populate the initial conversation list.
     * @param request - verified Handle, phone number, and one-time code.
     * @returns the registered public identity or one display-safe failure.
     */
    registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiActionResult<AwikiIdentityAccessResult>>;
    beginDeviceJoin(): Promise<AwikiActionResult<AwikiDeviceJoinProgress>>;
    getDeviceJoinStatus(): Promise<AwikiActionResult<AwikiDeviceJoinProgress | null>>;
    cancelDeviceJoin(): Promise<AwikiActionResult>;
    refreshDeviceManagement(): Promise<AwikiActionResult<AwikiDeviceManagementSnapshot>>;
    startDeviceJoinVerification(request: AwikiRequestRefInput): Promise<AwikiActionResult<AwikiAdminJoinProgress>>;
    approveDeviceJoin(request: AwikiApproveDeviceJoinRequest): Promise<AwikiActionResult<AwikiAdminJoinProgress>>;
    rejectDeviceJoin(request: AwikiRejectDeviceJoinRequest): Promise<AwikiActionResult<AwikiAdminJoinProgress>>;
    revokeDevice(request: AwikiRevokeDeviceRequest): Promise<AwikiActionResult<AwikiDeviceManagementSnapshot>>;
    /**
     * Update the deployment identity's public display name.
     * @param displayName - replacement display name selected by the user.
     * @returns the updated identity or one display-safe failure.
     */
    updateDisplayName(displayName: string): Promise<AwikiActionResult<AwikiIdentity>>;
    /** Save all supported public profile fields and keep identity/profile projections aligned. */
    updateProfile(request: AwikiUpdateProfileRequest): Promise<AwikiActionResult<AwikiProfile>>;
    /** Request a recovery OTP and persist only its secret-free operation id in the browser. */
    sendRecoveryOtp(request: AwikiRecoveryOtpRequest): Promise<AwikiActionResult<AwikiRecoveryOtpResult>>;
    /** Verify the recovery OTP without attempting the remote identity mutation yet. */
    prepareRecovery(request: Omit<AwikiRecoveryPrepareRequest, 'operationId'>): Promise<AwikiActionResult<AwikiRecoveryProgress>>;
    /** Commit the prepared operation once. Unknown outcomes remain available through status refresh. */
    activateRecovery(): Promise<AwikiActionResult<AwikiRecoveryProgress>>;
    /** Refresh Core status without repeating activation. */
    refreshRecoveryStatus(): Promise<AwikiActionResult<AwikiRecoveryProgress>>;
    /** Resume only a Core-declared retryable or uncertain phase. */
    resumeRecovery(): Promise<AwikiActionResult<AwikiRecoveryProgress>>;
    /** Discard only a pre-attempt operation. */
    discardRecovery(): Promise<AwikiActionResult>;
    /** Read the active deployment identity's public mailbox state. */
    getMailAccount(): Promise<AwikiActionResult<AwikiMailAccount>>;
    /** List one browser-requested mailbox page without background polling. */
    listMailInbox(request?: AwikiMailInboxRequest): Promise<AwikiActionResult<AwikiMailInboxPage>>;
    /** Read one selected plain-text mail message without marking it read. */
    readMail(request: AwikiMailReadRequest): Promise<AwikiActionResult<AwikiMailMessage>>;
    /** Mark mail read only after the browser supplied an explicit selected id. */
    markMailRead(request: AwikiMailMarkReadRequest): Promise<AwikiActionResult<AwikiMailMarkReadResult>>;
    /** Send one user-confirmed plain-text mail without retrying. */
    sendMail(request: AwikiMailSendRequest): Promise<AwikiActionResult<AwikiMailSendResult>>;
    /**
     * Load another page of the conversation roster.
     * @returns successful pagination or one display-safe failure.
     */
    loadMoreConversations(): Promise<AwikiActionResult>;
    /** Hide one recent row locally without leaving a group or deleting history. */
    hideConversation(conversationId: AwikiConversationId): Promise<AwikiActionResult>;
    /** Restore one locally hidden row to the recent roster. */
    restoreConversation(conversationId: AwikiConversationId): Promise<AwikiActionResult>;
    /**
     * Look up a Handle or DID, then open the matching direct conversation.
     * @param handle - peer Handle or DID typed by the user.
     * @returns successful selection or one display-safe lookup failure.
     */
    startDirectChat(handle: string): Promise<AwikiActionResult>;
    /**
     * Create one group, add its initial members, and open the new canonical conversation.
     * Group selection owns a bounded readiness retry so a fresh empty group can settle before
     * its first history failure becomes visible.
     * @param name - user-visible group name.
     * @param members - Handle or DID values entered by the user.
     * @returns the created group and settled invitation outcomes.
     */
    createGroup(name: string, members: readonly string[]): Promise<AwikiActionResult<AwikiCreateGroupResult>>;
    /** Join one open group by its canonical DID, then select the refreshed conversation. */
    joinGroup(groupDidInput: string): Promise<AwikiActionResult<AwikiGroupSnapshot>>;
    /** Refresh the selected group's authoritative snapshot and first member page. */
    refreshSelectedGroup(): Promise<AwikiActionResult>;
    /** Load the next authoritative member page using Core's opaque cursor. */
    loadMoreGroupMembers(): Promise<AwikiActionResult>;
    /** Invite one ordinary member, then replace snapshot and roster with authoritative reads. */
    addSelectedGroupMember(memberInput: string): Promise<AwikiActionResult<AwikiGroupMember>>;
    /** Remove one authorized member, then refresh count, roles, and roster from Core. */
    removeSelectedGroupMember(member: AwikiGroupMemberRecord): Promise<AwikiActionResult<AwikiGroupMember>>;
    /** Leave the selected group; Core prevents the owner from leaving. */
    leaveSelectedGroup(): Promise<AwikiActionResult>;
    /**
     * Select a conversation and load its newest history page.
     * @param conversationId - selected conversation, or `null` to return to the roster.
     * @returns successful selection or one display-safe history failure.
     */
    selectConversation(conversationId: AwikiConversationId | null): Promise<AwikiActionResult>;
    private loadGroupState;
    private reloadSelectedGroupAfterMutation;
    private reconcileSelectedConversation;
    private readRemoteHistoryWithGroupReadiness;
    private refreshSelectedDirectProfile;
    private failSelectedConversation;
    /**
     * Mark the selected conversation read after the UI proves its newest message is visible.
     * Repeated scroll and layout notifications share one Host request, while a failed
     * background attempt keeps the unread badge so reaching the bottom can retry.
     */
    markSelectedConversationRead(): Promise<AwikiActionResult>;
    /**
     * Load one older history page before the currently rendered messages.
     * @returns successful pagination or one display-safe failure.
     */
    loadOlderHistory(): Promise<AwikiActionResult>;
    /** Generate or regenerate the selected conversation's runtime-only summary. */
    summarizeConversation(): Promise<AwikiActionResult<AwikiConversationSummary>>;
    /** Expand or collapse one cached summary without another model call. */
    setSummaryCollapsed(conversationId: AwikiConversationId, collapsed: boolean): void;
    /**
     * Send one text message to the selected direct or group conversation.
     * @param text - non-empty text prepared by the composer.
     * @param clientMessageId - optional logical identity shared with the optimistic row.
     * @returns successful delivery or one display-safe failure.
     */
    sendText(text: string, clientMessageId?: AwikiMessageId, mentions?: readonly AwikiMention[]): Promise<AwikiActionResult>;
    /**
     * Send one already-read browser file without retaining its bytes in the view.
     * @param file - JSON-safe file name, MIME type, base64 bytes, and optional caption.
     * @returns successful delivery or one display-safe failure.
     */
    sendAttachment(file: {
        readonly fileName: string;
        readonly mimeType: string;
        readonly bytesBase64: string;
        readonly caption?: string;
        readonly clientMessageId?: AwikiMessageId;
    }): Promise<AwikiActionResult>;
    /**
     * Download verified attachment bytes without publishing them into controller state.
     * @param messageId - message that grants access to the attachment.
     * @param attachmentId - attachment selected from that message.
     * @returns verified attachment metadata and bytes, or one display-safe failure.
     */
    downloadAttachment(messageId: AwikiMessageId, attachmentId: AwikiAttachmentId): Promise<AwikiActionResult<AwikiDownloadedAttachment>>;
    /** Clear Host-owned local data and immediately remove every cached browser projection. */
    clearLocalData(request: AwikiClearLocalDataRequest): Promise<AwikiActionResult<AwikiClearLocalDataResult>>;
    /** Read the Integration without coupling Guest Gateway health to the main AWiki view. */
    getIntegration(): Promise<AwikiActionResult<AwikiIntegrationView>>;
    createIntegration(request: AwikiCreateIntegrationRequest): Promise<AwikiActionResult<AwikiIntegrationView>>;
    updateIntegration(request: AwikiUpdateIntegrationRequest): Promise<AwikiActionResult<AwikiIntegrationView>>;
    rotateIntegrationId(request: AwikiIntegrationRevisionRequest): Promise<AwikiActionResult<AwikiIntegrationView>>;
    closeIntegration(request: AwikiIntegrationRevisionRequest): Promise<AwikiActionResult<AwikiIntegrationView>>;
    /** Return only locally known groups for which the active identity is authoritative owner. */
    listOwnedGroups(): Promise<AwikiActionResult<readonly AwikiGroupSnapshot[]>>;
    /** Stop timers, invalidate work, and drop subscribers during HMR unload. */
    dispose(): void;
    private loadConversationPreferences;
    private applyConversationPreferences;
    private hiddenConversationsView;
    private reconcileConversationPage;
    private refreshConversations;
    /** List the active identity's own conversations and detect a revoked local credential. */
    private listConversationPage;
    /** Replace only visible browser projections; Core identity and SQLite state remain untouched. */
    private enterIdentityRecoveryRequired;
    private loadHistory;
    private poll;
    private withPending;
    private appendMessage;
    private setSummary;
    private staleSummaries;
    private markSummaryStale;
    private selectedConversation;
    private publishGroupAccessFailure;
    /** Keep presentation-only cache entries isolated to one authenticated identity. */
    private activatePresentationCache;
    /** Drop every browser projection without touching the Core-owned SQLite cache. */
    private clearPresentationCache;
    /** Retain recently used verified image bytes without exposing them in AwikiView. */
    private cacheImageAttachment;
    private clearImageAttachments;
    /**
     * Reconcile direct identity and group title projections with their last trustworthy values.
     * Core remains authoritative; this browser cache only prevents sparse refreshes from
     * replacing already resolved presentation data with protocol identifiers.
     */
    private cacheConversation;
    /**
     * Reconcile one group roster row with the last trustworthy local presentation.
     * A real remote/Core title may update the cache; a temporary Group DID fallback may not.
     */
    private cacheGroupTitle;
    private fail;
    private current;
    private currentSelection;
    private publish;
}
//# sourceMappingURL=controller.d.ts.map