import { t as RustSdkAdapter } from "./sdk-adapter-FGaOi8It.mjs";
import { setTimeout } from "node:timers/promises";
import { openImCoreNodeClient } from "@awiki/im-core-node";
//#region lib/types/provider.js
/** Production AWiki provider backed by the versioned Rust IM Core Node bridge. */
/** Cordis plugin name used by Loader diagnostics. */
const name = "awiki-rust-sdk-provider";
/** AWiki orchestration and the independent identity service must load first. */
const inject = ["awiki", "anpIdentity"];
const IDENTITY_PROVIDER_CAPABILITIES = [
	"IDENTITY_READ",
	"IDENTITY_CREATE",
	"IDENTITY_IMPORT",
	"IDENTITY_SIGN",
	"IDENTITY_ECDH_SEALED",
	"IDENTITY_DOCUMENT_UPDATE",
	"IDENTITY_KEY_LIFECYCLE",
	"IDENTITY_DELETE",
	"IDENTITY_HTTP_SIGNATURE",
	"AWIKI_LEGACY_ROOT_TRANSFER_V1"
];
const IDENTITY_PROVIDER_READY_TIMEOUT_MS = 1e4;
const IDENTITY_PROVIDER_READY_POLL_MS = 50;
/** Register one SDK client whose disposal follows this provider's fiber. */
async function apply(ctx) {
	await waitForIdentityProvider(ctx.anpIdentity);
	ctx.effect(() => {
		const lease = ctx.anpIdentity.acquireProvider({
			consumer: "@awiki/dsh-plugin",
			capabilities: [...IDENTITY_PROVIDER_CAPABILITIES],
			ttlSeconds: 3600
		});
		try {
			const unregister = ctx.awiki.registerClientFactory((options) => {
				const openOptions = {
					stateRoot: options.stateRoot,
					serviceBaseUrl: options.userServiceUrl,
					didDomain: options.userServiceDomain,
					userServiceEndpoint: options.userServiceUrl,
					messageServiceEndpoint: options.messageServiceUrl,
					mailServiceEndpoint: options.mailServiceUrl,
					anpServiceEndpoint: options.messageServiceUrl,
					anpServiceDid: options.messageServiceDid,
					clientVersionInfo: {
						product: "awiki-daemon",
						release: "0815",
						version: "0.1.91"
					},
					multiDeviceHandleRecoveryEnabled: true,
					multiDeviceDeviceRevokeEnabled: true,
					multiDeviceAudience: "awiki-user-service",
					externalHttpAllowInsecureLoopbackForTesting: options.allowInsecureLoopbackForTesting,
					identityProvider: lease
				};
				return new RustSdkAdapter(openImCoreNodeClient(openOptions));
			});
			return async () => {
				try {
					await unregister();
				} finally {
					lease.dispose();
				}
			};
		} catch (error) {
			lease.dispose();
			throw error;
		}
	}, "awiki Rust SDK client");
}
async function waitForIdentityProvider(identity) {
	const deadline = Date.now() + IDENTITY_PROVIDER_READY_TIMEOUT_MS;
	while ((await identity.health()).status === "unavailable") {
		const remaining = deadline - Date.now();
		if (remaining <= 0) throw new Error(`awiki: ANP Identity provider did not become ready within ${IDENTITY_PROVIDER_READY_TIMEOUT_MS}ms`);
		await setTimeout(Math.min(IDENTITY_PROVIDER_READY_POLL_MS, remaining));
	}
}
//#endregion
export { apply, inject, name };
