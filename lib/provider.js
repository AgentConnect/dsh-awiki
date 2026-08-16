import { t as RustSdkAdapter } from "./sdk-adapter-D0AaUkaa.mjs";
import { join } from "node:path";
import { openImCoreNodeClient } from "@awiki/im-core-node";
import { randomBytes } from "node:crypto";
import { chmod, lstat, mkdir, open, readFile } from "node:fs/promises";
//#region lib/types/vault.js
const VAULT_ROOT_KEY_BYTES = 32;
/** Load or provision the Host-owned no-prompt key used by the Rust SecretVault. */
async function loadOrCreateVaultRootKey(stateRoot) {
	await mkdir(stateRoot, {
		recursive: true,
		mode: 448
	});
	const root = await lstat(stateRoot);
	if (!root.isDirectory() || root.isSymbolicLink()) throw new TypeError("awiki: stateRoot must be a private directory");
	await chmod(stateRoot, 448);
	const hostDirectory = join(stateRoot, ".host");
	await mkdir(hostDirectory, {
		recursive: true,
		mode: 448
	});
	await chmod(hostDirectory, 448);
	const keyPath = join(hostDirectory, "vault-root-key");
	try {
		const file = await open(keyPath, "wx", 384);
		try {
			await file.writeFile(randomBytes(VAULT_ROOT_KEY_BYTES));
			await file.sync();
		} finally {
			await file.close();
		}
	} catch (error) {
		if (!isFileExists(error)) throw error;
	}
	await chmod(keyPath, 384);
	const key = await readFile(keyPath);
	if (key.byteLength !== VAULT_ROOT_KEY_BYTES) throw new TypeError("awiki: local vault root key is invalid");
	return key;
}
function isFileExists(error) {
	return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
//#endregion
//#region lib/types/provider.js
/** Production AWiki provider backed by the versioned Rust IM Core Node bridge. */
/** Cordis plugin name used by Loader diagnostics. */
const name = "awiki-rust-sdk-provider";
/** The AWiki service must own its provider registry before this plugin loads. */
const inject = ["awiki"];
/** Register one SDK client whose disposal follows this provider's fiber. */
function apply(ctx) {
	ctx.effect(() => ctx.awiki.registerClientFactory((options) => new RustSdkAdapter((async () => {
		const vaultRootKey = await loadOrCreateVaultRootKey(options.stateRoot);
		return openImCoreNodeClient({
			stateRoot: options.stateRoot,
			vaultRootKey,
			vaultWorkspaceId: "dsh-awiki",
			vaultDeviceId: "dsh-awiki-node",
			serviceBaseUrl: options.userServiceUrl,
			didDomain: options.userServiceDomain,
			userServiceEndpoint: options.userServiceUrl,
			messageServiceEndpoint: options.messageServiceUrl,
			anpServiceEndpoint: options.messageServiceUrl,
			anpServiceDid: options.messageServiceDid
		});
	})())), "awiki Rust SDK client");
}
//#endregion
export { apply, inject, name };
