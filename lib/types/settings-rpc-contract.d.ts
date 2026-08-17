/** Client-safe contract for AWiki's plugin-owned settings transport. */
/** Dedicated Connection channel; the Host registers it with loopback authority. */
export declare const AWIKI_SETTINGS_RPC_CHANNEL = "/awiki-settings";
/** Supported channel-relative operations. */
export declare const AWIKI_SETTINGS_RPC_ENDPOINTS: {
    readonly describe: "describe";
    readonly setDomain: "set-domain";
    readonly resetDomain: "reset-domain";
};
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
//# sourceMappingURL=settings-rpc-contract.d.ts.map