import type { AwikiSdkClient } from './provider-api.ts';
export type BackendSupport = 'supported' | 'unsupported' | 'unknown';
export type BackendFeatures = Readonly<Record<string, BackendSupport>>;
export type BackendSnapshot = Awaited<ReturnType<NonNullable<AwikiSdkClient['backendCapabilities']>>>;
/** Keep the client ceiling and only project a confirmed positive byte limit. */
export declare function backendAttachmentMaxBytes(snapshot: BackendSnapshot | undefined, clientLimit: number): number;
/** Project one source independently so a failed source cannot erase its peer. */
export declare function projectBackendSnapshot(snapshot: BackendSnapshot | undefined, authenticated: boolean): BackendFeatures;
/** Copy only allowlisted support states. Browser never sees endpoints or SDK errors. */
export declare function projectBackendFeatures(client: AwikiSdkClient, authenticated: boolean): Promise<BackendFeatures>;
export declare function requireBackendFeature(client: AwikiSdkClient, key: string): Promise<void>;
//# sourceMappingURL=backend-capabilities.d.ts.map