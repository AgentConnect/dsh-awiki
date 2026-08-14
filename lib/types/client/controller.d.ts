/** React-free browser controller for the deployment's one AWiki identity. */
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { AwikiAttachmentId, AwikiConversation, AwikiConversationId, AwikiDownloadedAttachment, AwikiHistoryRequest, AwikiIdentity, AwikiMessage, AwikiMessageId, AwikiMarkConversationReadRequest, AwikiPage, AwikiPageRequest, AwikiResolvePeerRequest, AwikiResolvedPeer, AwikiRegistrationOtpRequest, AwikiRegistrationOtpResult, AwikiRegistrationRequest, AwikiResult, AwikiRuntimeConfig, AwikiSendAttachmentRequest, AwikiSendTextRequest, AwikiUpdateDisplayNameRequest } from 'dsh-awiki/types';
/** The generated `remote.awiki` methods consumed by this controller. */
export interface AwikiRemote {
    /** Read browser-safe Host polling policy. */
    getConfig: () => Promise<RemoteResult<AwikiResult<AwikiRuntimeConfig>>>;
    /** Read the deployment's public identity, if registered. */
    getIdentity: () => Promise<RemoteResult<AwikiResult<AwikiIdentity | null>>>;
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
}
/** Load phase of the drawer's Host-owned data. */
export type AwikiControllerStatus = 'cold' | 'loading' | 'ready' | 'error';
/** Immutable drawer data published through the framework hook binder. */
export interface AwikiView {
    readonly status: AwikiControllerStatus;
    readonly identity: AwikiIdentity | null;
    readonly conversations: readonly AwikiConversation[];
    readonly conversationsHasMore: boolean;
    readonly selectedConversationId: AwikiConversationId | null;
    readonly messages: readonly AwikiMessage[];
    readonly historyHasMore: boolean;
    readonly pending: string | null;
    readonly error: string | null;
    readonly attachmentMaxBytes: number;
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
    private disposed;
    private polling;
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
    /** Stop polling and invalidate all in-flight drawer work. */
    close(): void;
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
    /**
     * Load one older history page before the currently rendered messages.
     * @returns successful pagination or one display-safe failure.
     */
    loadOlderHistory(): Promise<AwikiActionResult>;
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
    /** Stop timers, invalidate work, and drop subscribers during HMR unload. */
    dispose(): void;
    private refreshConversations;
    private loadHistory;
    private poll;
    private withPending;
    private appendMessage;
    private selectedConversation;
    private fail;
    private current;
    private publish;
}
//# sourceMappingURL=controller.d.ts.map