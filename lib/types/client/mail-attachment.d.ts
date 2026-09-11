/** Browser-only mail attachment selection, encoding, integrity, and download helpers. */
import type { AwikiDownloadedMailAttachment, AwikiMailAttachmentDownloadRequest, AwikiMailAttachmentMetadata, AwikiMailSendAttachment } from '@awiki/dsh-plugin/types';
import type { AwikiActionResult } from './controller.ts';
export interface BrowserMailAttachmentLimits {
    readonly maxCount: number;
    readonly maxBytes: number;
    readonly totalMaxBytes: number;
}
export interface SelectedMailAttachment {
    readonly id: string;
    readonly file: File;
    readonly fileName: string;
    readonly contentType: string;
    readonly sizeBytes: number;
    readonly lastModified: number;
}
export interface DownloadableMailAttachment {
    readonly index: number;
    readonly fileName: string;
    readonly contentType: string;
    readonly sizeBytes: number;
}
export interface PreparedMailAttachmentDownload {
    readonly fileName: string;
    readonly contentType: string;
    readonly bytes: Uint8Array<ArrayBuffer>;
}
/** Append browser File references after enforcing the exact Host-owned limits. */
export declare function selectMailAttachments(current: readonly SelectedMailAttachment[], selected: Iterable<File>, limits: BrowserMailAttachmentLimits, createId: () => string): readonly SelectedMailAttachment[];
/** Re-read the same approved File objects and return JSON-safe Remote attachments. */
export declare function encodeMailAttachments(attachments: readonly SelectedMailAttachment[], limits: BrowserMailAttachmentLimits): Promise<readonly AwikiMailSendAttachment[]>;
/** Return canonical download metadata only when the service supplied every required field. */
export declare function downloadableMailAttachment(value: AwikiMailAttachmentMetadata, maxBytes: number): DownloadableMailAttachment | undefined;
/** Validate exact metadata, canonical Base64, byte length, and SHA-256 before download. */
export declare function prepareMailAttachmentDownload(value: AwikiDownloadedMailAttachment, expected: DownloadableMailAttachment, maxBytes: number): Promise<PreparedMailAttachmentDownload>;
/** Trigger one download and always revoke the temporary object URL immediately. */
export declare function savePreparedMailAttachment(value: PreparedMailAttachmentDownload): void;
/** Execute the exact Browser UI download path: Remote, integrity check, Blob, and save click. */
export declare function downloadAndSaveMailAttachment(download: (request: AwikiMailAttachmentDownloadRequest) => Promise<AwikiActionResult<AwikiDownloadedMailAttachment>>, request: AwikiMailAttachmentDownloadRequest, expected: DownloadableMailAttachment, maxBytes: number, active?: () => boolean): Promise<boolean>;
//# sourceMappingURL=mail-attachment.d.ts.map