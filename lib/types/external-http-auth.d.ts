/** Host-only dispatcher for externally transported ANP-authenticated HTTP. */
import type { AwikiSdkClient } from './provider-api.ts';
export declare const AWIKI_EXTERNAL_HTTP_MAX_BODY_BYTES: number;
export type AwikiExternalHttpAuthErrorCode = 'not-registered' | 'signed-out' | 'invalid-request' | 'unsupported-body' | 'body-too-large' | 'auth-state-unavailable';
/** Stable Host-only failure without request, response, credential, or path detail. */
export declare class AwikiExternalHttpAuthError extends Error {
    readonly code: AwikiExternalHttpAuthErrorCode;
    readonly name = "AwikiExternalHttpAuthError";
    constructor(code: AwikiExternalHttpAuthErrorCode);
}
export type AwikiHttpTransport = (request: Request) => Promise<Response>;
/** Trusted same-process API; never expose this interface through Remote or tools. */
export interface AwikiExternalHttpAuth {
    dispatch(request: Request, transport: AwikiHttpTransport): Promise<Response>;
}
export interface AwikiExternalHttpAuthSession {
    readonly client: AwikiSdkClient;
    assertActive(): Promise<void>;
}
export declare function createAwikiExternalHttpAuth(acquire: () => Promise<AwikiExternalHttpAuthSession>): AwikiExternalHttpAuth;
export declare function externalHttpAuthError(code: AwikiExternalHttpAuthErrorCode): AwikiExternalHttpAuthError;
export declare function mapProviderError(error: unknown): AwikiExternalHttpAuthError;
//# sourceMappingURL=external-http-auth.d.ts.map