import { randomUUID } from 'node:crypto';
import { chmod, lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const SIGNED_OUT_MARKER = 'signed-out-v1\n';
const RECOVERY_OPERATION_PREFIX = 'recovery-operation-v1:';
const RECOVERY_OPERATION_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;
/** Persist only the local session lock; identity and SecretVault data remain SDK-owned. */
export class AwikiSessionStore {
    hostDirectory;
    markerPath;
    recoveryOperationPath;
    constructor(stateRoot) {
        this.hostDirectory = join(stateRoot, '.host');
        this.markerPath = join(this.hostDirectory, 'signed-out');
        this.recoveryOperationPath = join(this.hostDirectory, 'recovery-operation');
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
    /** Return the secret-free Core operation selected by this Host across browser origins. */
    async recoveryOperationId() {
        if (!(await this.hasPrivateHostDirectory()))
            return null;
        try {
            const metadata = await lstat(this.recoveryOperationPath);
            if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 256) {
                throw new TypeError('awiki: recovery operation marker is invalid');
            }
            const marker = await readFile(this.recoveryOperationPath, 'utf8');
            if (!marker.endsWith('\n') || marker.indexOf('\n') !== marker.length - 1) {
                throw new TypeError('awiki: recovery operation marker is invalid');
            }
            const operationId = marker.slice(RECOVERY_OPERATION_PREFIX.length, -1);
            if (!marker.startsWith(RECOVERY_OPERATION_PREFIX)
                || !RECOVERY_OPERATION_PATTERN.test(operationId)) {
                throw new TypeError('awiki: recovery operation marker is invalid');
            }
            return operationId;
        }
        catch (error) {
            if (isMissing(error))
                return null;
            throw error;
        }
    }
    /** Atomically retain or clear only the public operation id; Core owns all recovery state. */
    async setRecoveryOperationId(operationId) {
        if (operationId === null) {
            if (!(await this.hasPrivateHostDirectory()))
                return;
            try {
                const metadata = await lstat(this.recoveryOperationPath);
                if (!metadata.isFile() || metadata.isSymbolicLink()) {
                    throw new TypeError('awiki: recovery operation marker is invalid');
                }
                await unlink(this.recoveryOperationPath);
            }
            catch (error) {
                if (!isMissing(error))
                    throw error;
            }
            return;
        }
        if (!RECOVERY_OPERATION_PATTERN.test(operationId)) {
            throw new TypeError('awiki: recovery operation id is invalid');
        }
        await mkdir(this.hostDirectory, { recursive: true, mode: 0o700 });
        await this.hasPrivateHostDirectory();
        await chmod(this.hostDirectory, 0o700);
        const temporaryPath = join(this.hostDirectory, `.recovery-operation-${process.pid}-${randomUUID()}.tmp`);
        try {
            await writeFile(temporaryPath, `${RECOVERY_OPERATION_PREFIX}${operationId}\n`, { flag: 'wx', mode: 0o600 });
            await chmod(temporaryPath, 0o600);
            await rename(temporaryPath, this.recoveryOperationPath);
            await chmod(this.recoveryOperationPath, 0o600);
        }
        finally {
            await unlink(temporaryPath).catch((error) => {
                if (!isMissing(error))
                    throw error;
            });
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