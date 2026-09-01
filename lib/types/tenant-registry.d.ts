/** Host-owned durable AWiki tenant catalog and storage-scope migration. */
export declare const AWIKI_TENANT_REGISTRY_SCHEMA_VERSION = 1;
export declare const AWIKI_OFFICIAL_CATALOG_VERSION = 1;
export declare const AWIKI_CHINA_TENANT_ID = "official-china";
export declare const AWIKI_GLOBAL_TENANT_ID = "official-global";
export type AwikiTenantKind = 'built_in' | 'custom';
export type AwikiTenantLifecycle = 'active' | 'inactive' | 'archived';
export type AwikiTenantStorageLayout = 'scope-v1' | 'legacy-base' | 'domain-v1';
export interface AwikiTenantEndpoints {
    readonly userServiceUrl: string;
    readonly messageServiceUrl: string;
    readonly mailServiceUrl: string;
    readonly messageServicePublicUrl: string;
    readonly messageServiceDid: string;
}
export interface AwikiTenantProfile {
    readonly tenantId: string;
    readonly storageScopeId: string;
    readonly kind: AwikiTenantKind;
    readonly displayName: string;
    readonly backendBaseUrl: string;
    readonly didHost: string;
    readonly lifecycle: AwikiTenantLifecycle;
    readonly storageLayout: AwikiTenantStorageLayout;
    readonly endpoints: AwikiTenantEndpoints;
}
export interface AwikiTenantRegistryDocument {
    readonly schemaVersion: typeof AWIKI_TENANT_REGISTRY_SCHEMA_VERSION;
    readonly officialCatalogVersion: typeof AWIKI_OFFICIAL_CATALOG_VERSION;
    readonly generation: number;
    readonly activeTenantId: string;
    readonly tenants: readonly AwikiTenantProfile[];
}
export interface AwikiTenantRegistryView {
    readonly schemaVersion: number;
    readonly officialCatalogVersion: number;
    readonly generation: number;
    readonly activeTenantId: string;
    readonly tenants: readonly AwikiTenantProfile[];
    readonly switching: boolean;
    readonly diagnostic?: string;
}
export interface AwikiTenantLegacySeed extends AwikiTenantEndpoints {
    readonly domain: string;
    /** Treat this deployment configuration as an existing environment even when its directory is empty. */
    readonly configured: boolean;
}
/** Durable registry. All mutations are synchronous, backup-aware, and atomic. */
export declare class AwikiTenantRegistry {
    readonly baseStateRoot: string;
    readonly filePath: string;
    readonly backupPath: string;
    readonly diagnosticPath: string;
    private document;
    private readonly persistent;
    private constructor();
    static open(baseStateRoot: string, seed: AwikiTenantLegacySeed): AwikiTenantRegistry;
    snapshot(switching?: boolean): AwikiTenantRegistryView;
    active(): AwikiTenantProfile;
    find(tenantId: string): AwikiTenantProfile | undefined;
    stateRoot(tenant: AwikiTenantProfile): string;
    createCustom(displayName: string, rawDomain: string): AwikiTenantProfile;
    renameCustom(tenantId: string, displayName: string): AwikiTenantProfile;
    archiveCustom(tenantId: string): void;
    commitActive(tenantId: string): AwikiTenantRegistryDocument;
    private persist;
}
//# sourceMappingURL=tenant-registry.d.ts.map