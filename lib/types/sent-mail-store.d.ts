/** Private, owner-bound persistence for mail successfully sent by this installation. */
import type { AwikiDid, AwikiMailAccount, AwikiMailInboxPage, AwikiMailInboxRequest, AwikiMailMessage, AwikiMailMessageId, AwikiMailSendRequest, AwikiMailSendResult } from './types.ts';
export declare const LOCAL_SENT_MAIL_ID_PREFIX = "awiki-sent-v1:";
export declare function isLocalSentMailId(messageId: AwikiMailMessageId): boolean;
/** Atomic, bounded history of sends accepted by the Mail Service. */
export declare class AwikiSentMailStore {
    private readonly hostDirectory;
    private readonly directory;
    private mutation;
    constructor(stateRoot: string);
    list(ownerDid: AwikiDid, request: AwikiMailInboxRequest): Promise<AwikiMailInboxPage>;
    read(ownerDid: AwikiDid, messageId: AwikiMailMessageId): Promise<AwikiMailMessage | undefined>;
    append(ownerDid: AwikiDid, request: AwikiMailSendRequest, result: AwikiMailSendResult, account?: AwikiMailAccount): Promise<void>;
    clear(): Promise<void>;
    private load;
    private write;
    private ensureDirectory;
    private hasDirectory;
    private path;
    private key;
}
//# sourceMappingURL=sent-mail-store.d.ts.map