/** Rust IM Core adapter that copies native values into Host-owned public DTOs. */
import type { ImCoreNodeClient } from '@awiki/im-core-node';
import type { AwikiAttachmentId, AwikiConversation, AwikiConversationId, AwikiDid, AwikiDownloadedAttachment, AwikiFailureCode, AwikiGroupConversation, AwikiGroupMember, AwikiGroupMemberPage, AwikiGroupMembersRequest, AwikiGroupSnapshot, AwikiHistoryRequest, AwikiIdentity, AwikiMessage, AwikiMessageId, AwikiMailAccount, AwikiMailInboxPage, AwikiMailInboxRequest, AwikiMailMarkReadRequest, AwikiMailMarkReadResult, AwikiMailMessage, AwikiMailReadRequest, AwikiMailSendRequest, AwikiMailSendResult, AwikiPage, AwikiPageRequest, AwikiProfile, AwikiRecoveryOperationRequest, AwikiRecoveryOtpRequest, AwikiRecoveryOtpResult, AwikiRecoveryPrepareRequest, AwikiRecoveryProgress, AwikiResolvedPeer, AwikiRegistrationOtpRequest, AwikiRegistrationOtpResult, AwikiRegistrationRequest, AwikiSendTextRequest, AwikiUpdateDisplayNameRequest, AwikiUpdateProfileRequest } from './types.ts';
import type { AwikiSdkClient, AwikiSdkAdminJoinProgress, AwikiSdkCurrentDeviceSummary, AwikiSdkDownloadedAttachment, AwikiSdkDeviceJoinProgress, AwikiSdkDeviceJoinRequest, AwikiSdkExternalHttpAttempt, AwikiSdkExternalHttpRequest, AwikiSdkAgentInboxClient, AwikiSdkListenerClient, AwikiSdkRealtimeFailureCode, AwikiSdkRealtimeClient, AwikiSdkLocalDeviceJoinSession, AwikiSdkRegistrationResult, AwikiSdkRegistryDevice, AwikiSdkSendAttachmentRequest } from './provider-api.ts';
/** Closed provider error consumed by the Host's fixed public failure mapping. */
export declare class AwikiSdkError extends Error {
    readonly code: AwikiFailureCode;
    readonly realtimeFailureCode?: AwikiSdkRealtimeFailureCode | undefined;
    readonly name = "AwikiSdkError";
    constructor(code: AwikiFailureCode, realtimeFailureCode?: AwikiSdkRealtimeFailureCode | undefined);
}
/** Adapt the Rust Node bridge to the frozen Host provider interface. */
export declare class RustSdkAdapter implements AwikiSdkClient {
    private readonly client;
    private readonly attachmentConversations;
    private disposal;
    readonly realtime: AwikiSdkRealtimeClient;
    readonly agentInbox: AwikiSdkAgentInboxClient;
    readonly listener: AwikiSdkListenerClient;
    constructor(client: ImCoreNodeClient | Promise<ImCoreNodeClient>);
    private run;
    private displayableMessages;
    /**
     * Join the persisted Core peer-profile projection onto direct roster rows.
     * The conversation registry intentionally keeps routing identifiers separate
     * from display metadata, so a bare roster row may otherwise regress to a Handle.
     */
    private displayableConversations;
    private message;
    private conversation;
    private createdGroup;
    private groupSnapshot;
    private groupMember;
    private groupMemberRecord;
    private listenerConversation;
    private listenerMessage;
    private listenerSyncNow;
    private listenerStartRealtime;
    private listenerConversations;
    private listenerHistory;
    private conversationId;
    prepareExternalHttpRequest(request: AwikiSdkExternalHttpRequest): Promise<AwikiSdkExternalHttpAttempt>;
    getIdentity(): Promise<AwikiIdentity | null>;
    sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiRegistrationOtpResult>;
    registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiSdkRegistrationResult>;
    beginDeviceJoin(request: {
        readonly continuationId: string;
        readonly operationId: string;
        readonly userPresenceConfirmed: boolean;
    }): Promise<AwikiSdkDeviceJoinProgress>;
    getDeviceJoinStatus(joinSessionId: string): Promise<AwikiSdkDeviceJoinProgress>;
    listLocalDeviceJoinSessions(): Promise<readonly AwikiSdkLocalDeviceJoinSession[]>;
    cancelDeviceJoin(joinSessionId: string): Promise<AwikiSdkLocalDeviceJoinSession>;
    getCurrentDeviceSummary(): Promise<AwikiSdkCurrentDeviceSummary>;
    syncDeviceManagement(): Promise<void>;
    getDeviceRegistry(): Promise<readonly AwikiSdkRegistryDevice[]>;
    listLocalDeviceJoinRequests(): Promise<readonly AwikiSdkDeviceJoinRequest[]>;
    startDeviceJoinVerification(request: {
        readonly joinSessionId: string;
        readonly operationId: string;
        readonly challengeTtlSeconds: number;
    }): Promise<AwikiSdkAdminJoinProgress>;
    getLocalDeviceJoinVerificationProgress(joinSessionId: string): Promise<AwikiSdkAdminJoinProgress>;
    prepareDeviceJoinApproval(joinSessionId: string): Promise<{
        readonly approvalHandle: string;
    }>;
    confirmDeviceJoinApproval(approvalHandle: string): Promise<AwikiSdkAdminJoinProgress>;
    rejectDeviceJoin(joinSessionId: string, reason: 'user_rejected' | 'sas_mismatch'): Promise<AwikiSdkAdminJoinProgress>;
    revokeDevice(deviceId: string): Promise<void>;
    updateDisplayName(request: AwikiUpdateDisplayNameRequest): Promise<AwikiIdentity>;
    getProfile(): Promise<AwikiProfile>;
    updateProfile(request: AwikiUpdateProfileRequest): Promise<AwikiProfile>;
    private recoveryProgress;
    sendRecoveryOtp(request: AwikiRecoveryOtpRequest): Promise<AwikiRecoveryOtpResult>;
    prepareRecovery(request: AwikiRecoveryPrepareRequest): Promise<AwikiRecoveryProgress>;
    activateRecovery(request: AwikiRecoveryOperationRequest): Promise<AwikiRecoveryProgress>;
    getRecoveryStatus(request: AwikiRecoveryOperationRequest): Promise<AwikiRecoveryProgress>;
    resumeRecovery(request: AwikiRecoveryOperationRequest): Promise<AwikiRecoveryProgress>;
    issueRecoveryAttestation(request: AwikiRecoveryOperationRequest): Promise<{
        attestation: string;
        expiresAt: string;
    }>;
    discardRecovery(request: AwikiRecoveryOperationRequest): Promise<void>;
    resolvePeer(peer: string): Promise<AwikiResolvedPeer>;
    createGroup(name: string): Promise<AwikiGroupConversation>;
    addGroupMember(groupDid: AwikiDid, member: string): Promise<AwikiGroupMember>;
    getGroup(groupDid: AwikiDid): Promise<AwikiGroupSnapshot>;
    joinGroup(groupDid: AwikiDid): Promise<AwikiGroupSnapshot>;
    leaveGroup(groupDid: AwikiDid): Promise<void>;
    listGroupMembers(request: AwikiGroupMembersRequest): Promise<AwikiGroupMemberPage>;
    removeGroupMember(groupDid: AwikiDid, member: string): Promise<AwikiGroupMember>;
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
    getMailAccount(): Promise<AwikiMailAccount>;
    listMailInbox(request?: AwikiMailInboxRequest): Promise<AwikiMailInboxPage>;
    readMail(request: AwikiMailReadRequest): Promise<AwikiMailMessage>;
    markMailRead(request: AwikiMailMarkReadRequest): Promise<AwikiMailMarkReadResult>;
    sendMail(request: AwikiMailSendRequest): Promise<AwikiMailSendResult>;
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