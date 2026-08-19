/** Production AWiki provider backed by the versioned Rust IM Core Node bridge. */
import { openImCoreNodeClient } from '@awiki/im-core-node';
import { RustSdkAdapter } from "./sdk-adapter.js";
/** Cordis plugin name used by Loader diagnostics. */
export const name = 'awiki-rust-sdk-provider';
/** The AWiki service must own its provider registry before this plugin loads. */
export const inject = ['awiki'];
/** Register one SDK client whose disposal follows this provider's fiber. */
export function apply(ctx) {
    ctx.effect(() => ctx.awiki.registerClientFactory(options => new RustSdkAdapter(openImCoreNodeClient({
        stateRoot: options.stateRoot,
        serviceBaseUrl: options.userServiceUrl,
        didDomain: options.userServiceDomain,
        userServiceEndpoint: options.userServiceUrl,
        messageServiceEndpoint: options.messageServiceUrl,
        mailServiceEndpoint: options.mailServiceUrl,
        anpServiceEndpoint: options.messageServiceUrl,
        anpServiceDid: options.messageServiceDid,
        externalHttpAllowInsecureLoopbackForTesting: options.allowInsecureLoopbackForTesting,
    }))), 'awiki Rust SDK client');
}
//# sourceMappingURL=provider.js.map