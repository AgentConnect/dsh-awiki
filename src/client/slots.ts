/** Composed props and injected browser operations for the AWiki overlay. */

import type {
  HostObservable, InjectFace, PropsRuntime, PropsStore,
} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {
  AwikiAttachmentId,
  AwikiConversationId,
  AwikiCreateGroupResult,
  AwikiDownloadedAttachment,
  AwikiIdentityAccessInspection,
  AwikiIdentityAccessInspectionRequest,
  AwikiIdentity,
  AwikiGroupMember,
  AwikiGroupMemberRecord,
  AwikiGroupRebindRecoverySummary,
  AwikiGroupSnapshot,
  AwikiMessageId,
  AwikiMailAccount,
  AwikiMailAttachmentDownloadRequest,
  AwikiDownloadedMailAttachment,
  AwikiMailInboxPage,
  AwikiMailInboxRequest,
  AwikiMailMarkReadRequest,
  AwikiMailMarkReadResult,
  AwikiMailMessage,
  AwikiMailReadRequest,
  AwikiMailSendRequest,
  AwikiMailSendResult,
  AwikiRuntimeConfig,
  AwikiRegistrationOtpRequest,
  AwikiRegistrationOtpResult,
  AwikiRegistrationRequest,
  AwikiProfile,
  AwikiRecoveryOtpRequest,
  AwikiRecoveryOtpResult,
  AwikiRecoveryPrepareRequest,
  AwikiRecoveryProgress,
  AwikiConversationSummary,
  AwikiSession,
  AwikiUpdateProfileRequest,
  AwikiMention,
} from '@awiki/dsh-plugin/types'
import type { AwikiActionResult, AwikiView } from './controller.ts'
import type { createAwikiOverlayStore } from './store.ts'

/** Injected browser actions; components never receive Cordis ctx or Remote. */
export interface AwikiInjected {
  hooks: {
    /** One controller snapshot shared by the trigger and drawer. */
    awiki: HostObservable<AwikiView>
  }
  /** Load browser-safe policy, identity, and the first conversation page, then keep unread state fresh. */
  open: () => Promise<AwikiActionResult>
  /** Stop polling and invalidate work when the overlay is unmounted. */
  close: () => void
  /** Determine whether one Handle should use registration or Recovery V4. */
  inspectIdentityAccess: (request: AwikiIdentityAccessInspectionRequest) => Promise<AwikiActionResult<AwikiIdentityAccessInspection>>
  /**
   * Request a registration verification code.
   * @param request - desired Handle and verification phone number.
   */
  sendRegistrationOtp: (request: AwikiRegistrationOtpRequest) => Promise<AwikiActionResult<AwikiRegistrationOtpResult>>
  /**
   * Register the deployment's shared identity.
   * @param request - Handle, phone number, and verification code.
   */
  registerIdentity: (request: AwikiRegistrationRequest) => Promise<AwikiActionResult<AwikiIdentity>>
  /** Update the deployment identity's public WNS display name. */
  updateDisplayName: (displayName: string) => Promise<AwikiActionResult<AwikiIdentity>>
  updateProfile: (request: AwikiUpdateProfileRequest) => Promise<AwikiActionResult<AwikiProfile>>
  sendRecoveryOtp: (request: AwikiRecoveryOtpRequest) => Promise<AwikiActionResult<AwikiRecoveryOtpResult>>
  prepareRecovery: (request: Omit<AwikiRecoveryPrepareRequest, 'operationId'>) => Promise<AwikiActionResult<AwikiRecoveryProgress>>
  activateRecovery: () => Promise<AwikiActionResult<AwikiRecoveryProgress>>
  refreshRecoveryStatus: () => Promise<AwikiActionResult<AwikiRecoveryProgress>>
  resumeRecovery: () => Promise<AwikiActionResult<AwikiRecoveryProgress>>
  discardRecovery: () => Promise<AwikiActionResult>
  /** Load the next conversation page with the Host-owned cursor. */
  loadMoreConversations: () => Promise<AwikiActionResult>
  /** Retry Core-owned migration for old groups restored after Handle recovery. */
  retryGroupRebindRecovery: () => Promise<AwikiActionResult<AwikiGroupRebindRecoverySummary>>
  /** Hide only the current recovery-summary revision. */
  dismissGroupRecoveryNotice: () => Promise<AwikiActionResult>
  /** Remove one conversation from this installation's recent roster. */
  hideConversation: (conversationId: AwikiConversationId) => Promise<AwikiActionResult>
  /** Restore one locally hidden conversation. */
  restoreConversation: (conversationId: AwikiConversationId) => Promise<AwikiActionResult>
  /**
   * Open an existing direct conversation or a local draft for one Handle.
   * @param handle - peer Handle or DID typed by the user.
   */
  startDirectChat: (handle: string) => Promise<AwikiActionResult>
  /** Create a group with initial members and open its canonical conversation. */
  createGroup: (name: string, members: readonly string[]) => Promise<AwikiActionResult<AwikiCreateGroupResult>>
  joinGroup: (groupDid: string) => Promise<AwikiActionResult<AwikiGroupSnapshot>>
  refreshSelectedGroup: () => Promise<AwikiActionResult>
  loadMoreGroupMembers: () => Promise<AwikiActionResult>
  addSelectedGroupMember: (member: string) => Promise<AwikiActionResult<AwikiGroupMember>>
  removeSelectedGroupMember: (member: AwikiGroupMemberRecord) => Promise<AwikiActionResult<AwikiGroupMember>>
  leaveSelectedGroup: () => Promise<AwikiActionResult>
  /**
   * Select one conversation or return to the roster.
   * @param conversationId - conversation identifier, or `null` for the roster.
   */
  selectConversation: (conversationId: AwikiConversationId | null) => Promise<AwikiActionResult>
  /** Mark the selected conversation read after its newest message is visible. */
  markSelectedConversationRead: () => Promise<AwikiActionResult>
  /** Load the next older history page for the selected conversation. */
  loadOlderHistory: () => Promise<AwikiActionResult>
  /** Generate or regenerate the selected conversation's AI summary. */
  summarizeConversation: () => Promise<AwikiActionResult<AwikiConversationSummary>>
  /** Toggle a cached summary without invoking the model. */
  setSummaryCollapsed: (conversationId: AwikiConversationId, collapsed: boolean) => void
  /**
   * Send text to the selected conversation.
   * @param text - non-empty composer text.
   */
  sendText: (
    text: string,
    clientMessageId?: AwikiMessageId,
    mentions?: readonly AwikiMention[],
  ) => Promise<AwikiActionResult>
  /**
   * Send one JSON-safe file payload to the selected conversation.
   * @param file - file metadata, base64 bytes, and an optional caption.
   */
  sendAttachment: (file: {
    readonly fileName: string
    readonly mimeType: string
    readonly bytesBase64: string
    readonly caption?: string
    readonly clientMessageId?: AwikiMessageId
  }) => Promise<AwikiActionResult>
  /**
   * Download one attachment through its containing message.
   * @param messageId - message that contains the attachment.
   * @param attachmentId - attachment selected by the user.
   */
  downloadAttachment: (
    messageId: AwikiMessageId,
    attachmentId: AwikiAttachmentId,
  ) => Promise<AwikiActionResult<AwikiDownloadedAttachment>>
  /** Sign out on this installation without deleting local identity data. */
  logout: () => Promise<AwikiActionResult<AwikiSession>>
  /** Resume the same locally preserved identity. */
  login: () => Promise<AwikiActionResult<AwikiSession>>
  /** Clear the preserved local identity only after the component's destructive confirmation. */
  clearLocalIdentity: () => Promise<AwikiActionResult>
  /** Read browser-safe runtime policy, including mail attachment limits. */
  getConfig: () => Promise<AwikiActionResult<AwikiRuntimeConfig>>
  /** Read the current deployment mailbox account on demand. */
  getMailAccount: () => Promise<AwikiActionResult<AwikiMailAccount>>
  /** List one bounded mailbox page on demand. */
  listMailInbox: (request?: AwikiMailInboxRequest) => Promise<AwikiActionResult<AwikiMailInboxPage>>
  /** Read one selected plain-text mail message. */
  readMail: (request: AwikiMailReadRequest) => Promise<AwikiActionResult<AwikiMailMessage>>
  /** Mark explicitly selected mail messages read. */
  markMailRead: (request: AwikiMailMarkReadRequest) => Promise<AwikiActionResult<AwikiMailMarkReadResult>>
  /** Send one confirmed plain-text mail once. */
  sendMail: (request: AwikiMailSendRequest) => Promise<AwikiActionResult<AwikiMailSendResult>>
  /** Download one explicitly selected mail attachment. */
  downloadMailAttachment: (request: AwikiMailAttachmentDownloadRequest) => Promise<AwikiActionResult<AwikiDownloadedMailAttachment>>
}

/** Full four-share props of the floating launcher and anchored `shell.overlay` panel. */
export type AwikiOverlayProps =
  PropsRuntime<'shell.overlay'>
  & PropsStore<ReturnType<typeof createAwikiOverlayStore>>
  & InjectFace<AwikiInjected>
