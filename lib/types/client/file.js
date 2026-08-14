/** Browser attachment byte conversion and download helpers. */
/** Decode Host-verified Base64 bytes for browser-only Blob use. */
function downloadedBytes(value) {
    const binary = atob(value.bytesBase64);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
}
/**
 * Read one browser file as base64 without retaining the bytes after settlement.
 * @param file - selected browser file.
 * @returns base64 payload without a data-URL prefix.
 */
export async function fileToBase64(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
}
/**
 * Create a temporary browser URL for verified attachment bytes.
 * @param value - attachment metadata and base64 bytes returned by the Host.
 * @returns object URL that the caller must revoke after use.
 */
export function createAttachmentObjectUrl(value) {
    return URL.createObjectURL(new Blob([downloadedBytes(value)], { type: value.attachment.mimeType }));
}
/**
 * Offer verified Host-returned bytes as a browser download.
 * @param value - attachment metadata and base64 bytes returned by the Host.
 */
export function saveDownloadedAttachment(value) {
    const url = createAttachmentObjectUrl(value);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = value.attachment.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
}
//# sourceMappingURL=file.js.map