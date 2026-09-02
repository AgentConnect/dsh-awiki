/** Tenant-scoped DSH AWiki plugin update policy and verified cache. */
import type { AwikiTenantProfile } from './tenant-registry.ts';
export declare const DSH_AWIKI_VERSION = "0.3.9";
export declare const DSH_AWIKI_MODEL_PROXY_VERSION = "0.1.4";
export interface AwikiPluginUpdateTarget {
    readonly name: string;
    readonly recommendedVersion: string;
    readonly minimumVersion: string;
    readonly integrity: string;
    readonly repository?: string;
    readonly requiresPlugin?: string;
}
export interface AwikiUpdatePolicyStatus {
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
    readonly pluginTarget?: AwikiPluginUpdateTarget;
    readonly modelProxyTarget?: AwikiPluginUpdateTarget;
    readonly offline: boolean;
    readonly usedCache: boolean;
    readonly policyUnavailable: boolean;
    readonly restricted: boolean;
    readonly modelProxyRestricted: boolean;
    readonly checkedAt?: string;
}
export interface CheckAwikiUpdatePolicyOptions {
    readonly tenant: AwikiTenantProfile;
    readonly generation: number;
    readonly stateRoot: string;
    readonly currentPluginVersion?: string;
    readonly currentModelProxyVersion?: string;
    readonly allowInsecureLoopback?: boolean;
    readonly signal?: AbortSignal;
    readonly fetcher?: typeof fetch;
}
export declare function checkAwikiUpdatePolicy(options: CheckAwikiUpdatePolicyOptions): Promise<AwikiUpdatePolicyStatus>;
export declare function compareVersions(left: string, right: string): number;
//# sourceMappingURL=update-policy.d.ts.map