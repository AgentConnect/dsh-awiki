/** React-free browser controller for the deployment's one AWiki identity. */
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { AwikiAttachmentId, AwikiClearLocalDataRequest, AwikiClearLocalDataResult, AwikiConversation, AwikiConversationSummary, AwikiConversationId, AwikiDownloadedAttachment, AwikiHistoryRequest, AwikiIdentity, AwikiIdentityId, AwikiIdentityList, AwikiIdentityTab, AwikiLogoutRequest, AwikiMessage, AwikiMessageId, AwikiMarkConversationReadRequest, AwikiPage, AwikiPageRequest, AwikiResolvePeerRequest, AwikiResolvedPeer, AwikiRegistrationOtpRequest, AwikiRegistrationOtpResult, AwikiRegistrationRequest, AwikiResult, AwikiRuntimeConfig, AwikiSession, AwikiSendAttachmentRequest, AwikiSendTextRequest, AwikiSummarizeConversationRequest, AwikiUpdateDisplayNameRequest } from '@awiki/dsh-plugin/types';
/** The generated `remote.awiki` methods consumed by this controller. */
export interface AwikiRemote {
    /** Read browser-safe Host polling policy. */
    getConfig: () => Promise<RemoteResult<AwikiResult<AwikiRuntimeConfig>>>;
    /** Read the deployment's public identity, if registered. */
    getIdentity: () => Promise<RemoteResult<AwikiResult<AwikiIdentity | null>>>;
    /** Read main, bound, and recoverable local identities. */
    listIdentities: () => Promise<RemoteResult<AwikiResult<AwikiIdentityList>>>;
    /** Read whether this installation is unregistered, signed out, or active. */
    getSession: () => Promise<RemoteResult<AwikiResult<AwikiSession>>>;
    /** Sign out locally without deleting the persisted identity. */
    logout: (request: AwikiLogoutRequest) => Promise<RemoteResult<AwikiResult<AwikiSession>>>;
    /** Resume the preserved local identity. */
    login: () => Promise<RemoteResult<AwikiResult<AwikiSession>>>;
    /** Request one registration verification code. */
    sendRegistrationOtp: (request: AwikiRegistrationOtpRequest) => Promise<RemoteResult<AwikiResult<AwikiRegistrationOtpResult>>>;
    /** Register and persist the deployment's sole identity. */
    registerIdentity: (request: AwikiRegistrationRequest) => Promise<RemoteResult<AwikiResult<AwikiIdentity>>>;
    /** Update the deployment identity's public WNS display name. */
    updateDisplayName: (request: AwikiUpdateDisplayNameRequest) => Promise<RemoteResult<AwikiResult<AwikiIdentity>>>;
    /** Resolve one Handle or DID before opening a direct chat. */
    resolvePeer: (request: AwikiResolvePeerRequest) => Promise<RemoteResult<AwikiResult<AwikiResolvedPeer>>>;
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
        identityId?: AwikiIdentityId;
    }) => Promise<RemoteResult<AwikiResult<AwikiDownloadedAttachment>>>;
    /** Permanently clear this installation's local identity and message state. */
    clearLocalData: (request: AwikiClearLocalDataRequest) => Promise<RemoteResult<AwikiResult<AwikiClearLocalDataResult>>>;
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
/** Immutable drawer data published through the framework hook binder. */
export interface AwikiView {
    readonly status: AwikiControllerStatus;
    readonly sessionStatus: AwikiSession['status'];
    readonly identity: AwikiIdentity | null;
    readonly identities: readonly AwikiIdentityTab[];
    readonly activeIdentityId: AwikiIdentityId | null;
    readonly conversations: readonly AwikiConversation[];
    readonly conversationsHasMore: boolean;
    readonly selectedConversationId: AwikiConversationId | null;
    readonly messages: readonly AwikiMessage[];
    readonly historyHasMore: boolean;
    /** True only while the selected conversation's committed local first page is loading. */
    readonly localPending: boolean;
    /** True while the selected conversation is reconciling remote history in the background. */
    readonly refreshing: boolean;
    readonly pending: string | null;
    readonly error: string | null;
    readonly attachmentMaxBytes: number;
    readonly summaries: Readonly<Record<string, AwikiSummaryView>>;
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
    private view;
    private readonly listeners;
    private config;
    private conversationsCursor;
    private historyCursor;
    private timer;
    private generation;
    private selectionRevision;
    private disposed;
    private polling;
    private readonly tabCache;
    private markReadInFlight;
    private unreadAtOpen;
    private summaryBaselines;
    /** @param remote - generated Host Remote namespace. */
    constructor(remote: AwikiRemote);
    /** Return the cached immutable view. */
    getSnapshot: () => AwikiView;
    /** Subscribe to view replacement. */
    subscribe: (listener: () => void) => (() => void);
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
    /** Switch the active identity Tab without changing Core's default identity. */
    selectIdentity(identityId: AwikiIdentityId): Promise<AwikiActionResult>;
    /**
     * Request one phone verification challenge.
     * @param request - desired Handle and verification phone number.
     * @returns challenge retry metadata or one display-safe failure.
     */
    sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiActionResult<AwikiRegistrationOtpResult>>;
    /**
     * Register the deployment identity and populate the initial conversation list.
     * @param request - verified Handle, phone number, and one-time code.
     * @returns the registered public identity or one display-safe failure.
     */
    registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiActionResult<AwikiIdentity>>;
    /**
     * Update the deployment identity's public display name.
     * @param displayName - replacement display name selected by the user.
     * @returns the updated identity or one display-safe failure.
     */
    updateDisplayName(displayName: string): Promise<AwikiActionResult<AwikiIdentity>>;
    /**
     * Load another page of the conversation roster.
     * @returns successful pagination or one display-safe failure.
     */
    loadMoreConversations(): Promise<AwikiActionResult>;
    /**
     * Look up a Handle or DID, then open the matching direct conversation.
     * @param handle - peer Handle or DID typed by the user.
     * @returns successful selection or one display-safe lookup failure.
     */
    startDirectChat(handle: string): Promise<AwikiActionResult>;
    /**
     * Select a conversation and load its newest history page.
     * @param conversationId - selected conversation, or `null` to return to the roster.
     * @returns successful selection or one display-safe history failure.
     */
    selectConversation(conversationId: AwikiConversationId | null): Promise<AwikiActionResult>;
    private reconcileSelectedConversation;
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
     * @returns successful delivery or one display-safe failure.
     */
    sendText(text: string): Promise<AwikiActionResult>;
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
    /** Stop timers, invalidate work, and drop subscribers during HMR unload. */
    dispose(): void;
    private refreshConversations;
    private loadHistory;
    private poll;
    private scope;
    private startTimer;
    private saveActiveTab;
    private withPending;
    private appendMessage;
    private setSummary;
    private staleSummaries;
    private markSummaryStale;
    private selectedConversation;
    private fail;
    private current;
    private currentSelection;
    private publish;
}
//# sourceMappingURL=controller.d.ts.map