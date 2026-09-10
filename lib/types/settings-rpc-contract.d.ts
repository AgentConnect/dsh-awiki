/** Client-safe contract for AWiki's plugin-owned settings transport. */
/** Shared Connection carrier with plugin-owned exact loopback routes. */
export declare const AWIKI_SETTINGS_RPC_CHANNEL = "/api";
/** Supported channel-relative operations. */
export declare const AWIKI_SETTINGS_RPC_ENDPOINTS: {
    readonly describe: "awiki-settings/describe";
    readonly setDomain: "awiki-settings/set-domain";
    readonly resetDomain: "awiki-settings/reset-domain";
    readonly describeTenants: "awiki-settings/describe-tenants";
    readonly createTenant: "awiki-settings/create-tenant";
    readonly renameTenant: "awiki-settings/rename-tenant";
    readonly switchTenant: "awiki-settings/switch-tenant";
    readonly archiveTenant: "awiki-settings/archive-tenant";
    readonly describeUpdatePolicy: "awiki-settings/describe-update-policy";
    readonly refreshUpdatePolicy: "awiki-settings/refresh-update-policy";
    readonly describeDesktopUpdate: "awiki-settings/describe-desktop-update";
    readonly refreshDesktopUpdate: "awiki-settings/refresh-desktop-update";
};
export interface AwikiUpdatePolicyRpcView {
    readonly checkState?: 'unchecked' | 'ready' | 'unavailable' | 'failed';
    readonly updateAvailable?: boolean;
    readonly upgradeCommand?: string;
    readonly tenantId: string;
    readonly policyOrigin: string;
    readonly tenantGeneration: number;
    readonly currentPluginVersion: string;
    readonly currentModelProxyVersion?: string;
    readonly policyRevision?: number;
    readonly recommendedPluginVersion?: string;
    readonly minimumPluginVersion?: string;
    readonly recommendedModelProxyVersion?: string;
    readonly minimumModelProxyVersion?: string;
    readonly releaseNotesUrl?: string;
    readonly offline: boolean;
    readonly usedCache: boolean;
    readonly policyUnavailable: boolean;
    readonly restricted: boolean;
    readonly modelProxyRestricted: boolean;
    readonly checkedAt?: string;
}
export interface AwikiTenantRpcProfile {
    readonly tenantId: string;
    readonly storageScopeId: string;
    readonly kind: 'built_in' | 'custom';
    readonly displayName: string;
    readonly displayNames?: Readonly<{
        'zh-CN': string;
        en: string;
    }>;
    readonly backendBaseUrl: string;
    readonly didHost: string;
    readonly lifecycle: 'active' | 'inactive' | 'archived';
    readonly storageLayout: 'scope-v1' | 'legacy-base' | 'domain-v1';
}
export interface AwikiTenantRpcView {
    readonly schemaVersion: number;
    readonly officialCatalogVersion: number;
    readonly generation: number;
    readonly activeTenantId: string;
    readonly tenants: readonly AwikiTenantRpcProfile[];
    readonly switching: boolean;
    readonly diagnostic?: string;
}
/** Minimal, secret-free settings view returned to the browser. */
export interface AwikiSettingsRpcView {
    readonly value: {
        readonly domain: string;
    };
    readonly base?: {
        readonly domain?: string;
    };
    readonly user?: {
        readonly domain?: string;
    };
    readonly revision: number;
    readonly writable: boolean;
}
/** Optimistic revision carried by every browser write. */
export interface AwikiSettingsRevisionRequest {
    readonly expectedRevision: number;
}
/** Domain write request. */
export interface AwikiSettingsSetDomainRequest extends AwikiSettingsRevisionRequest {
    readonly domain: string;
}
/** Fail closed when the Host response is not exactly usable by the settings UI. */
export declare function decodeAwikiSettingsRpcView(value: unknown): AwikiSettingsRpcView | undefined;
/** Decode the secret-free Host tenant catalog and its switch state. */
export declare function decodeAwikiTenantRpcView(value: unknown): AwikiTenantRpcView | undefined;
/** Decode the browser-safe subset of the Host's tenant update status. */
export declare function decodeAwikiUpdatePolicyRpcView(value: unknown): AwikiUpdatePolicyRpcView | undefined;
//# sourceMappingURL=settings-rpc-contract.d.ts.map