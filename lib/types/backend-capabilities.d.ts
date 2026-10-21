import type { AwikiSdkClient } from './provider-api.ts';
export type BackendSupport = 'supported' | 'unsupported' | 'unknown';
export type BackendFeatures = Readonly<Record<string, BackendSupport>>;
/** Copy only allowlisted support states. Browser never sees endpoints or SDK errors. */
export declare function projectBackendFeatures(client: AwikiSdkClient, authenticated: boolean): Promise<BackendFeatures>;
export declare function requireBackendFeature(client: AwikiSdkClient, key: string): Promise<void>;
//# sourceMappingURL=backend-capabilities.d.ts.map