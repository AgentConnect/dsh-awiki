import { chmod, lstat, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const SIGNED_OUT_MARKER = 'signed-out-v1\n';
/** Persist only the local session lock; identity and SecretVault data remain SDK-owned. */
export class AwikiSessionStore {
    hostDirectory;
    markerPath;
    constructor(stateRoot) {
        this.hostDirectory = join(stateRoot, '.host');
        this.markerPath = join(this.hostDirectory, 'signed-out');
    }
    /** Return whether this installation was explicitly signed out. */
    async isSignedOut() {
        if (!(await this.hasPrivateHostDirectory()))
            return false;
        try {
            const metadata = await lstat(this.markerPath);
            if (!metadata.isFile() || metadata.isSymbolicLink())
                throw new TypeError('awiki: local session marker is invalid');
            if ((await readFile(this.markerPath, 'utf8')) !== SIGNED_OUT_MARKER) {
                throw new TypeError('awiki: local session marker is invalid');
            }
            return true;
        }
        catch (error) {
            if (isMissing(error))
                return false;
            throw error;
        }
    }
    /** Lock this installation without modifying the persisted identity. */
    async signOut() {
        await mkdir(this.hostDirectory, { recursive: true, mode: 0o700 });
        await this.hasPrivateHostDirectory();
        await chmod(this.hostDirectory, 0o700);
        try {
            await writeFile(this.markerPath, SIGNED_OUT_MARKER, { flag: 'wx', mode: 0o600 });
        }
        catch (error) {
            if (!isFileExists(error) || !(await this.isSignedOut()))
                throw error;
        }
        await chmod(this.markerPath, 0o600);
    }
    /** Unlock this installation while retaining every SDK-owned file. */
    async signIn() {
        try {
            await unlink(this.markerPath);
        }
        catch (error) {
            if (!isMissing(error))
                throw error;
        }
    }
    async hasPrivateHostDirectory() {
        try {
            const directory = await lstat(this.hostDirectory);
            if (!directory.isDirectory() || directory.isSymbolicLink()) {
                throw new TypeError('awiki: local session directory is invalid');
            }
            return true;
        }
        catch (error) {
            if (isMissing(error))
                return false;
            throw error;
        }
    }
}
function isMissing(error) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
function isFileExists(error) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST';
}
//# sourceMappingURL=session.js.map