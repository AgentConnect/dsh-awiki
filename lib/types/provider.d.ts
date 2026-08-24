/** Production AWiki provider backed by the versioned Rust IM Core Node bridge. */
import type { Context } from '@deepseek-ai/cordis';
import type { AnpIdentityServiceContract } from '@agent-network-protocol/dsh-anp-identity';
declare module '@deepseek-ai/cordis' {
    interface Context {
        anpIdentity: AnpIdentityServiceContract;
    }
}
/** Cordis plugin name used by Loader diagnostics. */
export declare const name = "awiki-rust-sdk-provider";
/** AWiki orchestration and the independent identity service must load first. */
export declare const inject: string[];
/** Register one SDK client whose disposal follows this provider's fiber. */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=provider.d.ts.map