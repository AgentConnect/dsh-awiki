/** Production AWiki provider backed by the versioned TypeScript SDK. */
import type { Context } from '@deepseek-ai/cordis';
/** Cordis plugin name used by Loader diagnostics. */
export declare const name = "awiki-typescript-sdk-provider";
/** The AWiki service must own its provider registry before this plugin loads. */
export declare const inject: string[];
/** Register one SDK client whose disposal follows this provider's fiber. */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=provider.d.ts.map