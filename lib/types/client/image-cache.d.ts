/** Browser-origin persistent cache for verified AWiki image previews. */
import type { AwikiAttachmentId, AwikiDid, AwikiDownloadedAttachment, AwikiMessageId } from '@awiki/dsh-plugin/types';
/** Persistent image-cache boundary injected into the browser controller. */
export interface AwikiBrowserImageCache {
    read: (ownerDid: AwikiDid, messageId: AwikiMessageId, attachmentId: AwikiAttachmentId) => Promise<AwikiDownloadedAttachment | undefined>;
    write: (ownerDid: AwikiDid, messageId: AwikiMessageId, value: AwikiDownloadedAttachment) => Promise<void>;
    clear: () => Promise<void>;
}
/** IndexedDB-backed cache that fails closed when browser storage is unavailable. */
export declare class IndexedDbAwikiBrowserImageCache implements AwikiBrowserImageCache {
    private databasePromise;
    read(ownerDid: AwikiDid, messageId: AwikiMessageId, attachmentId: AwikiAttachmentId): Promise<AwikiDownloadedAttachment | undefined>;
    write(ownerDid: AwikiDid, messageId: AwikiMessageId, value: AwikiDownloadedAttachment): Promise<void>;
    clear(): Promise<void>;
    private database;
    private delete;
    private touch;
    private prune;
}
//# sourceMappingURL=image-cache.d.ts.map