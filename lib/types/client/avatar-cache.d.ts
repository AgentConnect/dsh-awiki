export declare function safeAvatarUrl(raw: string | null | undefined): string | undefined;
/** One browser runtime, separate from authenticated attachment caches. */
export declare class AvatarCache {
    private readonly memory;
    private readonly pending;
    private readonly bytesPending;
    private readonly retryAt;
    private readonly active;
    private readonly waiting;
    private running;
    private generation;
    private databasePromise;
    private database;
    private read;
    private write;
    load(owner: string, raw: string, edge?: number, force?: boolean): Promise<string | undefined>;
    private loadImage;
    private delete;
    private download;
    reset(): void;
    clear(owner?: string): Promise<void>;
}
export declare const avatarCache: AvatarCache;
//# sourceMappingURL=avatar-cache.d.ts.map