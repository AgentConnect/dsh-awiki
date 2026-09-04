/** Exact cleanup for the removed Host-local sent-mail authority. */
import { lstat, rm, unlink } from 'node:fs/promises';
import { join } from 'node:path';
function isMissing(error) {
    return typeof error === 'object' && error !== null && error.code === 'ENOENT';
}
/** Clear only the legacy cache directory during the existing destructive local-data flow. */
export async function clearLegacySentMailCache(stateRoot) {
    const hostDirectory = join(stateRoot, '.host');
    const directory = join(hostDirectory, 'sent-mail-v1');
    try {
        const host = await lstat(hostDirectory);
        if (!host.isDirectory() || host.isSymbolicLink()) {
            throw new TypeError('awiki: legacy sent-mail cache parent is invalid');
        }
        const target = await lstat(directory);
        if (target.isDirectory() && !target.isSymbolicLink()) {
            await rm(directory, { recursive: true, force: true });
        }
        else {
            await unlink(directory);
        }
    }
    catch (error) {
        if (!isMissing(error))
            throw error;
    }
}
//# sourceMappingURL=legacy-sent-mail-cache.js.map