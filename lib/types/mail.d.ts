/** Host-owned validation for on-demand mail requests. */
import type { AwikiMailAttachmentDownloadRequest, AwikiMailInboxRequest, AwikiMailMarkReadRequest, AwikiMailReadRequest, AwikiMailSendRequest } from './types.ts';
export declare const MAIL_ATTACHMENT_SERVICE_MAX_COUNT = 10;
export declare const MAIL_ATTACHMENT_SERVICE_MAX_BYTES: number;
export declare const MAIL_ATTACHMENT_SERVICE_TOTAL_MAX_BYTES: number;
export interface AwikiMailAttachmentLimits {
    readonly maxCount: number;
    readonly maxBytes: number;
    readonly totalMaxBytes: number;
}
export interface AwikiValidatedMailSendAttachment {
    readonly fileName: string;
    readonly contentType: string;
    readonly sizeBytes: number;
    readonly sha256: string;
    readonly bytes: Uint8Array;
}
export interface AwikiValidatedMailSendRequest {
    readonly to: readonly string[];
    readonly cc: readonly string[];
    readonly subject: string;
    readonly bodyText: string;
    readonly attachments: readonly AwikiValidatedMailSendAttachment[];
}
export declare const DEFAULT_MAIL_ATTACHMENT_LIMITS: AwikiMailAttachmentLimits;
export declare function mailAttachmentFileName(value: unknown): string;
export declare function mailAttachmentContentType(value: unknown): string;
/** Resolve mailbox defaults before the provider is invoked. */
export declare function mailInboxRequest(request?: AwikiMailInboxRequest): AwikiMailInboxRequest;
export declare function mailReadRequest(request: AwikiMailReadRequest): AwikiMailReadRequest;
export declare function mailMarkReadRequest(request: AwikiMailMarkReadRequest): AwikiMailMarkReadRequest;
export declare function mailSendRequest(request: AwikiMailSendRequest, limits?: AwikiMailAttachmentLimits): AwikiValidatedMailSendRequest;
export declare function mailAttachmentDownloadRequest(request: AwikiMailAttachmentDownloadRequest): AwikiMailAttachmentDownloadRequest;
//# sourceMappingURL=mail.d.ts.map