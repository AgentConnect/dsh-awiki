/** Production AWiki provider backed by the versioned TypeScript SDK. */
import { createAwikiImClient } from '@anp/typescript-sdk';
import { TypeScriptSdkAdapter } from "./sdk-adapter.js";
/** Cordis plugin name used by Loader diagnostics. */
export const name = 'awiki-typescript-sdk-provider';
/** The AWiki service must own its provider registry before this plugin loads. */
export const inject = ['awiki'];
/** Register one SDK client whose disposal follows this provider's fiber. */
export function apply(ctx) {
    ctx.effect(() => ctx.awiki.registerClientFactory(options => new TypeScriptSdkAdapter(createAwikiImClient(options))), 'awiki TypeScript SDK client');
}
//# sourceMappingURL=provider.js.map