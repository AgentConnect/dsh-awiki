/** Composed props and injected browser operations for the AWiki overlay. */
import type { HostObservable, InjectFace, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { AwikiAttachmentId, AwikiConversationId, AwikiDownloadedAttachment, AwikiIdentity, AwikiMessageId, AwikiRegistrationOtpRequest, AwikiRegistrationOtpResult, AwikiRegistrationRequest } from 'dsh-awiki/types';
import type { AwikiActionResult, AwikiView } from './controller.ts';
import type { createAwikiOverlayStore } from './store.ts';
/** Injected browser actions; components never receive Cordis ctx or Remote. */
export interface AwikiInjected {
    hooks: {
        /** One controller snapshot shared by the trigger and drawer. */
        awiki: HostObservable<AwikiView>;
    };
    /** Load browser-safe policy, identity, and the first conversation page, then keep unread state fresh. */
    open: () => Promise<AwikiActionResult>;
    /** Stop polling and invalidate work when the overlay is unmounted. */
    close: () => void;
    /**
     * Request a registration verification code.
     * @param request - desired Handle and verification phone number.
     */
    sendRegistrationOtp: (request: AwikiRegistrationOtpRequest) => Promise<AwikiActionResult<AwikiRegistrationOtpResult>>;
    /**
     * Register the deployment's shared identity.
     * @param request - Handle, phone number, and verification code.
     */
    registerIdentity: (request: AwikiRegistrationRequest) => Promise<AwikiActionResult<AwikiIdentity>>;
    /** Update the deployment identity's public WNS display name. */
    updateDisplayName: (displayName: string) => Promise<AwikiActionResult<AwikiIdentity>>;
    /** Load the next conversation page with the Host-owned cursor. */
    loadMoreConversations: () => Promise<AwikiActionResult>;
    /**
     * Open an existing direct conversation or a local draft for one Handle.
     * @param handle - peer Handle or DID typed by the user.
     */
    startDirectChat: (handle: string) => Promise<AwikiActionResult>;
    /**
     * Select one conversation or return to the roster.
     * @param conversationId - conversation identifier, or `null` for the roster.
     */
    selectConversation: (conversationId: AwikiConversationId | null) => Promise<AwikiActionResult>;
    /** Load the next older history page for the selected conversation. */
    loadOlderHistory: () => Promise<AwikiActionResult>;
    /**
     * Send text to the selected conversation.
     * @param text - non-empty composer text.
     */
    sendText: (text: string) => Promise<AwikiActionResult>;
    /**
     * Send one JSON-safe file payload to the selected conversation.
     * @param file - file metadata, base64 bytes, and an optional caption.
     */
    sendAttachment: (file: {
        readonly fileName: string;
        readonly mimeType: string;
        readonly bytesBase64: string;
        readonly caption?: string;
    }) => Promise<AwikiActionResult>;
    /**
     * Download one attachment through its containing message.
     * @param messageId - message that contains the attachment.
     * @param attachmentId - attachment selected by the user.
     */
    downloadAttachment: (messageId: AwikiMessageId, attachmentId: AwikiAttachmentId) => Promise<AwikiActionResult<AwikiDownloadedAttachment>>;
}
/** Full four-share props of the floating launcher and anchored `shell.overlay` panel. */
export type AwikiOverlayProps = PropsRuntime<'shell.overlay'> & PropsStore<ReturnType<typeof createAwikiOverlayStore>> & InjectFace<AwikiInjected>;
//# sourceMappingURL=slots.d.ts.map