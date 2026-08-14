/** Browser attachment byte conversion and download helpers. */
import type { AwikiDownloadedAttachment } from 'dsh-awiki/types';
/**
 * Read one browser file as base64 without retaining the bytes after settlement.
 * @param file - selected browser file.
 * @returns base64 payload without a data-URL prefix.
 */
export declare function fileToBase64(file: File): Promise<string>;
/**
 * Create a temporary browser URL for verified attachment bytes.
 * @param value - attachment metadata and base64 bytes returned by the Host.
 * @returns object URL that the caller must revoke after use.
 */
export declare function createAttachmentObjectUrl(value: AwikiDownloadedAttachment): string;
/**
 * Offer verified Host-returned bytes as a browser download.
 * @param value - attachment metadata and base64 bytes returned by the Host.
 */
export declare function saveDownloadedAttachment(value: AwikiDownloadedAttachment): void;
//# sourceMappingURL=file.d.ts.map