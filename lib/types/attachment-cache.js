/** Private, bounded, persistent cache for verified image attachment bytes. */
import { createHash, randomUUID } from 'node:crypto';
import { chmod, lstat, mkdir, readFile, readdir, rename, rm, unlink, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const CACHE_VERSION = 1;
const CACHE_DIRECTORY = 'image-attachments-v1';
const CACHE_METADATA_BYTES = 8 * 1024;
const CACHE_FILE_PATTERN = /^[0-9a-f]{64}\.json$/u;
/** Minimum budget that can retain one maximum-sized Base64 cache entry. */
export function minimumImageAttachmentCacheMaxBytes(attachmentMaxBytes) {
    return Math.ceil(attachmentMaxBytes / 3) * 4 + CACHE_METADATA_BYTES;
}
/** Host-owned image cache. Cache failures never make an otherwise valid download fail. */
export class AwikiImageAttachmentCache {
    attachmentMaxBytes;
    cacheMaxBytes;
    hostDirectory;
    directory;
    constructor(stateRoot, attachmentMaxBytes, cacheMaxBytes) {
        this.attachmentMaxBytes = attachmentMaxBytes;
        this.cacheMaxBytes = cacheMaxBytes;
        this.hostDirectory = join(stateRoot, '.host');
        this.directory = join(this.hostDirectory, CACHE_DIRECTORY);
    }
    /** Return one verified cached image, or a miss for absent/corrupt optional state. */
    async read(ownerDid, request) {
        const path = this.path(ownerDid, request);
        try {
            if (!(await this.hasPrivateDirectory(this.hostDirectory)) || !(await this.hasPrivateDirectory(this.directory))) {
                return undefined;
            }
            const metadata = await lstat(path);
            if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > this.maxFileBytes()) {
                await unlink(path).catch(() => undefined);
                return undefined;
            }
            const parsed = JSON.parse(await readFile(path, 'utf8'));
            const value = this.decode(parsed, ownerDid, request);
            if (value === undefined) {
                await unlink(path).catch(() => undefined);
                return undefined;
            }
            const now = new Date();
            await utimes(path, now, now).catch(() => undefined);
            return value;
        }
        catch {
            return undefined;
        }
    }
    /** Persist one already-verified image with owner-only permissions and bounded total size. */
    async write(ownerDid, messageId, value) {
        if (!value.attachment.mimeType.startsWith('image/'))
            return;
        if (!this.validBytes(value.attachment, value.bytes))
            return;
        await this.ensureDirectory();
        const request = { messageId, attachmentId: value.attachment.id };
        const path = this.path(ownerDid, request);
        const temporary = join(this.directory, `.${this.key(ownerDid, request)}.${randomUUID()}.tmp`);
        const payload = {
            version: CACHE_VERSION,
            ownerDid: String(ownerDid),
            messageId: String(messageId),
            attachment: { ...value.attachment },
            bytesBase64: Buffer.from(value.bytes).toString('base64'),
        };
        try {
            await writeFile(temporary, JSON.stringify(payload), { flag: 'wx', mode: 0o600 });
            await rename(temporary, path);
            await chmod(path, 0o600);
            await this.prune();
        }
        finally {
            await unlink(temporary).catch(() => undefined);
        }
    }
    /** Remove only the plugin-owned image cache beneath the configured private state root. */
    async clear() {
        try {
            if (!(await this.hasPrivateDirectory(this.hostDirectory)))
                return;
            const metadata = await lstat(this.directory);
            if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
                await unlink(this.directory);
                return;
            }
            await rm(this.directory, { recursive: true, force: true });
        }
        catch (error) {
            if (!isMissing(error))
                throw error;
        }
    }
    decode(input, ownerDid, request) {
        if (typeof input !== 'object' || input === null || Array.isArray(input))
            return undefined;
        const value = input;
        const attachment = value.attachment;
        if (value.version !== CACHE_VERSION
            || value.ownerDid !== String(ownerDid)
            || value.messageId !== String(request.messageId)
            || typeof attachment !== 'object'
            || attachment === null
            || String(attachment.id) !== String(request.attachmentId)
            || typeof attachment.fileName !== 'string'
            || typeof attachment.mimeType !== 'string'
            || !attachment.mimeType.startsWith('image/')
            || typeof attachment.size !== 'number'
            || typeof attachment.sha256 !== 'string'
            || typeof value.bytesBase64 !== 'string'
            || value.bytesBase64.length > Math.ceil(this.attachmentMaxBytes / 3) * 4)
            return undefined;
        const bytes = Uint8Array.from(Buffer.from(value.bytesBase64, 'base64'));
        if (Buffer.from(bytes).toString('base64') !== value.bytesBase64 || !this.validBytes(attachment, bytes))
            return undefined;
        return { attachment: { ...attachment }, bytes };
    }
    validBytes(attachment, bytes) {
        return Number.isSafeInteger(attachment.size)
            && attachment.size >= 0
            && attachment.size <= this.attachmentMaxBytes
            && bytes.byteLength === attachment.size
            && /^[0-9a-f]{64}$/u.test(attachment.sha256)
            && createHash('sha256').update(bytes).digest('hex') === attachment.sha256;
    }
    async ensureDirectory() {
        await mkdir(this.hostDirectory, { recursive: true, mode: 0o700 });
        if (!(await this.hasPrivateDirectory(this.hostDirectory)))
            throw new TypeError('awiki: local Host directory is invalid');
        await chmod(this.hostDirectory, 0o700);
        await mkdir(this.directory, { mode: 0o700 }).catch((error) => {
            if (!isFileExists(error))
                throw error;
        });
        if (!(await this.hasPrivateDirectory(this.directory)))
            throw new TypeError('awiki: local image cache directory is invalid');
        await chmod(this.directory, 0o700);
    }
    async prune() {
        const entries = await readdir(this.directory, { withFileTypes: true });
        const files = (await Promise.all(entries
            .filter(entry => entry.isFile() && !entry.isSymbolicLink() && CACHE_FILE_PATTERN.test(entry.name))
            .map(async (entry) => {
            const path = join(this.directory, entry.name);
            const metadata = await lstat(path);
            return { path, size: metadata.size, modifiedAt: metadata.mtimeMs };
        })))
            .sort((left, right) => left.modifiedAt - right.modifiedAt);
        let total = files.reduce((sum, file) => sum + file.size, 0);
        for (const file of files) {
            if (total <= this.cacheMaxBytes)
                break;
            await unlink(file.path).catch(() => undefined);
            total -= file.size;
        }
    }
    path(ownerDid, request) {
        return join(this.directory, `${this.key(ownerDid, request)}.json`);
    }
    key(ownerDid, request) {
        return createHash('sha256')
            .update(String(ownerDid))
            .update('\0')
            .update(String(request.messageId))
            .update('\0')
            .update(String(request.attachmentId))
            .digest('hex');
    }
    maxFileBytes() {
        return minimumImageAttachmentCacheMaxBytes(this.attachmentMaxBytes);
    }
    async hasPrivateDirectory(path) {
        try {
            const metadata = await lstat(path);
            if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
                throw new TypeError('awiki: local image cache path is invalid');
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
//# sourceMappingURL=attachment-cache.js.map