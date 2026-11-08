export interface TenantCapabilityMetadata {
    readonly handleRecoveryPhoneEnabled: boolean;
    readonly modelProxyBaseUrl?: string;
    readonly guestGatewayBaseUrl?: string;
}
/** Host-only metadata. Core owns feature truth; this contains no auth material. */
export declare class TenantCapabilityCache {
    private readonly key;
    private readonly directory;
    private readonly path;
    constructor(stateRoot: string, endpoint: string);
    read(validate: (metadata: TenantCapabilityMetadata) => TenantCapabilityMetadata): TenantCapabilityMetadata | undefined;
    write(metadata: TenantCapabilityMetadata): boolean;
}
//# sourceMappingURL=tenant-capability-cache.d.ts.map