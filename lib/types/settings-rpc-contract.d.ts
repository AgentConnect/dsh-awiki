/** Client-safe contract for AWiki's plugin-owned settings transport. */
/** Dedicated Connection channel; the Host registers it with loopback authority. */
export declare const AWIKI_SETTINGS_RPC_CHANNEL = "/awiki-settings";
/** Supported channel-relative operations. */
export declare const AWIKI_SETTINGS_RPC_ENDPOINTS: {
    readonly describe: "describe";
    readonly setDomain: "set-domain";
    readonly resetDomain: "reset-domain";
    readonly describeTenants: "describe-tenants";
    readonly createTenant: "create-tenant";
    readonly renameTenant: "rename-tenant";
    readonly switchTenant: "switch-tenant";
    readonly archiveTenant: "archive-tenant";
    readonly describeUpdatePolicy: "describe-update-policy";
    readonly refreshUpdatePolicy: "refresh-update-policy";
};
export interface AwikiUpdatePolicyRpcView {
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