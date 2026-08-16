import { randomBytes } from 'node:crypto';
import { chmod, lstat, mkdir, open, readFile } from 'node:fs/promises';
import { join } from 'node:path';
const VAULT_ROOT_KEY_BYTES = 32;
/** Load or provision the Host-owned no-prompt key used by the Rust SecretVault. */
export async function loadOrCreateVaultRootKey(stateRoot) {
    await mkdir(stateRoot, { recursive: true, mode: 0o700 });
    const root = await lstat(stateRoot);
    if (!root.isDirectory() || root.isSymbolicLink()) {
        throw new TypeError('awiki: stateRoot must be a private directory');
    }
    await chmod(stateRoot, 0o700);
    const hostDirectory = join(stateRoot, '.host');
    await mkdir(hostDirectory, { recursive: true, mode: 0o700 });
    await chmod(hostDirectory, 0o700);
    const keyPath = join(hostDirectory, 'vault-root-key');
    try {
        const file = await open(keyPath, 'wx', 0o600);
        try {
            await file.writeFile(randomBytes(VAULT_ROOT_KEY_BYTES));
            await file.sync();
        }
        finally {
            await file.close();
        }
    }
    catch (error) {
        if (!isFileExists(error))
            throw error;
    }
    await chmod(keyPath, 0o600);
    const key = await readFile(keyPath);
    if (key.byteLength !== VAULT_ROOT_KEY_BYTES) {
        throw new TypeError('awiki: local vault root key is invalid');
    }
    return key;
}
function isFileExists(error) {
    return typeof error === 'object' && error !== null
        && 'code' in error && error.code === 'EEXIST';
}
//# sourceMappingURL=vault.js.map