import { type AwikiExternalHttpAuth } from './external-http-auth.ts';
import { type AwikiValidatedMailSendRequest } from './mail.ts';
import type { AwikiDownloadedMailAttachment, AwikiMailAttachmentDownloadRequest, AwikiMailSendResult } from './types.ts';
/** Reserve JSON escaping, recipients, subject, body text and ten attachment metadata records. */
export declare const MAIL_HTTP_UPLOAD_MAX_BYTES: number;
export declare class AwikiMailAttachmentClient {
    private readonly origin;
    private readonly auth;
    constructor(origin: string, auth: AwikiExternalHttpAuth);
    send(request: AwikiValidatedMailSendRequest): Promise<AwikiMailSendResult>;
    download(request: AwikiMailAttachmentDownloadRequest, maxBytes: number): Promise<AwikiDownloadedMailAttachment>;
    private rpc;
}
//# sourceMappingURL=mail-attachment-client.d.ts.map