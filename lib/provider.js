import { n as RustSdkAdapter } from "./sdk-adapter-Cf6exE0c.mjs";
import { openImCoreNodeClient } from "@awiki/im-core-node";
//#region lib/types/provider.js
/** Production AWiki provider backed by the versioned Rust IM Core Node bridge. */
/** Cordis plugin name used by Loader diagnostics. */
const name = "awiki-rust-sdk-provider";
/** The AWiki service must own its provider registry before this plugin loads. */
const inject = ["awiki"];
/** Register one SDK client whose disposal follows this provider's fiber. */
function apply(ctx) {
	ctx.effect(() => ctx.awiki.registerClientFactory((options) => new RustSdkAdapter(openImCoreNodeClient({
		stateRoot: options.stateRoot,
		serviceBaseUrl: options.userServiceUrl,
		didDomain: options.userServiceDomain,
		userServiceEndpoint: options.userServiceUrl,
		messageServiceEndpoint: options.messageServiceUrl,
		anpServiceEndpoint: new URL("/anp-im/rpc", options.messageServiceUrl).toString(),
		anpServiceDid: options.messageServiceDid,
		externalHttpAllowInsecureLoopbackForTesting: options.allowInsecureLoopbackForTesting
	}))), "awiki Rust SDK client");
}
//#endregion
export { apply, inject, name };
