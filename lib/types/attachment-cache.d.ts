/** Private, bounded, persistent cache for verified image attachment bytes. */
import type { AwikiDid, AwikiDownloadAttachmentRequest } from './types.ts';
import type { AwikiSdkDownloadedAttachment } from './provider-api.ts';
/** Minimum budget that can retain one maximum-sized Base64 cache entry. */
export declare function minimumImageAttachmentCacheMaxBytes(attachmentMaxBytes: number): number;
/** Host-owned image cache. Cache failures never make an otherwise valid download fail. */
export declare class AwikiImageAttachmentCache {
    private readonly attachmentMaxBytes;
    private readonly cacheMaxBytes;
    private readonly hostDirectory;
    private readonly directory;
    constructor(stateRoot: string, attachmentMaxBytes: number, cacheMaxBytes: number);
    /** Return one verified cached image, or a miss for absent/corrupt optional state. */
    read(ownerDid: AwikiDid, request: AwikiDownloadAttachmentRequest): Promise<AwikiSdkDownloadedAttachment | undefined>;
    /** Persist one already-verified image with owner-only permissions and bounded total size. */
    write(ownerDid: AwikiDid, messageId: AwikiDownloadAttachmentRequest['messageId'], value: AwikiSdkDownloadedAttachment): Promise<void>;
    /** Remove only the plugin-owned image cache beneath the configured private state root. */
    clear(): Promise<void>;
    private decode;
    private validBytes;
    private ensureDirectory;
    private prune;
    private path;
    private key;
    private maxFileBytes;
    private hasPrivateDirectory;
}
//# sourceMappingURL=attachment-cache.d.ts.map