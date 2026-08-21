import { createHash, randomUUID } from 'node:crypto';
import { chmod, lstat, mkdir, readFile, rm, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const STORE_VERSION = 1;
const STORE_DIRECTORY = 'conversation-preferences';
const MAX_STORE_BYTES = 2 * 1024 * 1024;
const MAX_HIDDEN_CONVERSATIONS = 500;
const MAX_IDENTIFIER_CHARACTERS = 2_048;
const MAX_TITLE_CHARACTERS = 1_024;
const MAX_PREVIEW_CHARACTERS = 4_096;
const MAX_HANDLE_CHARACTERS = 512;
const MAX_RECOVERY_SIGNATURE_CHARACTERS = 128;
function invalidState() {
    throw new TypeError('awiki: conversation preferences are invalid');
}
function isMissing(error) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
function isFileExists(error) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST';
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function boundedString(value, maximum) {
    if (typeof value !== 'string' || value.length === 0 || value.length > maximum * 2)
        invalidState();
    if (Array.from(value).length > maximum)
        invalidState();
    return value;
}
function optionalString(value, maximum) {
    return value === undefined ? undefined : boundedString(value, maximum);
}
function optionalCount(value) {
    if (value === undefined)
        return undefined;
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff)
        invalidState();
    return value;
}
function optionalTimestamp(value) {
    if (value === undefined)
        return undefined;
    if (!Number.isSafeInteger(value) || value < 0)
        invalidState();
    return value;
}
/** Rebuild a bounded display-only snapshot before it reaches private persistence. */
function conversation(value) {
    if (!isRecord(value))
        invalidState();
    const kind = value.kind;
    const id = boundedString(value.id, MAX_IDENTIFIER_CHARACTERS);
    const title = boundedString(value.title, MAX_TITLE_CHARACTERS);
    const unreadCount = optionalCount(value.unreadCount);
    const lastMessageAt = optionalTimestamp(value.lastMessageAt);
    const lastMessagePreview = optionalString(value.lastMessagePreview, MAX_PREVIEW_CHARACTERS);
    const common = {
        id,
        title,
        ...(unreadCount === undefined ? {} : { unreadCount }),
        ...(lastMessageAt === undefined ? {} : { lastMessageAt }),
        ...(lastMessagePreview === undefined ? {} : { lastMessagePreview }),
    };
    if (kind === 'direct') {
        const peerDid = boundedString(value.peerDid, MAX_IDENTIFIER_CHARACTERS);
        if (!peerDid.startsWith('did:'))
            invalidState();
        const peerHandle = optionalString(value.peerHandle, MAX_HANDLE_CHARACTERS);
        const displayName = optionalString(value.displayName, MAX_TITLE_CHARACTERS);
        return {
            kind,
            ...common,
            peerDid: peerDid,
            ...(peerHandle === undefined ? {} : { peerHandle: peerHandle }),
            ...(displayName === undefined ? {} : { displayName }),
        };
    }
    if (kind === 'group') {
        const groupDid = boundedString(value.groupDid, MAX_IDENTIFIER_CHARACTERS);
        if (!groupDid.startsWith('did:'))
            invalidState();
        return { kind, ...common, groupDid: groupDid };
    }
    invalidState();
}
function hiddenPreference(value) {
    if (!isRecord(value) || !Number.isSafeInteger(value.hiddenAt) || value.hiddenAt < 0)
        invalidState();
    return { conversation: conversation(value.conversation), hiddenAt: value.hiddenAt };
}
function preferences(value, expectedOwnerDid) {
    if (!isRecord(value)
        || value.version !== STORE_VERSION
        || value.ownerDid !== String(expectedOwnerDid)
        || !Array.isArray(value.hiddenConversations)
        || value.hiddenConversations.length > MAX_HIDDEN_CONVERSATIONS)
        invalidState();
    const hiddenConversations = value.hiddenConversations.map(hiddenPreference);
    const seen = new Set();
    for (const hidden of hiddenConversations) {
        if (seen.has(hidden.conversation.id))
            invalidState();
        seen.add(hidden.conversation.id);
    }
    const dismissedGroupRecoverySignature = optionalString(value.dismissedGroupRecoverySignature, MAX_RECOVERY_SIGNATURE_CHARACTERS);
    return {
        version: STORE_VERSION,
        ownerDid: String(expectedOwnerDid),
        hiddenConversations,
        ...(dismissedGroupRecoverySignature === undefined ? {} : { dismissedGroupRecoverySignature }),
    };
}
function publicPreferences(value) {
    return {
        hiddenConversations: value.hiddenConversations.map(hidden => ({
            conversation: { ...hidden.conversation },
            hiddenAt: hidden.hiddenAt,
        })),
        ...(value.dismissedGroupRecoverySignature === undefined
            ? {}
            : { dismissedGroupRecoverySignature: value.dismissedGroupRecoverySignature }),
    };
}
function emptyPreferences(ownerDid) {
    return { version: STORE_VERSION, ownerDid: String(ownerDid), hiddenConversations: [] };
}
/** Validate one browser mutation before entering private Host persistence. */
export function normalizeConversationPreferenceMutation(value) {
    try {
        if (!isRecord(value))
            return undefined;
        if (value.action === 'hide')
            return { action: 'hide', conversation: conversation(value.conversation) };
        if (value.action === 'restore') {
            return {
                action: 'restore',
                conversationId: boundedString(value.conversationId, MAX_IDENTIFIER_CHARACTERS),
            };
        }
        if (value.action === 'dismiss-group-recovery') {
            return {
                action: 'dismiss-group-recovery',
                signature: boundedString(value.signature, MAX_RECOVERY_SIGNATURE_CHARACTERS),
            };
        }
    }
    catch {
        return undefined;
    }
    return undefined;
}
/** Atomic identity-scoped product preferences, independent of Core membership and history. */
export class AwikiConversationPreferenceStore {
    hostDirectory;
    directory;
    mutation = Promise.resolve();
    constructor(stateRoot) {
        this.hostDirectory = join(stateRoot, '.host');
        this.directory = join(this.hostDirectory, STORE_DIRECTORY);
    }
    async get(ownerDid) {
        await this.mutation;
        return publicPreferences(await this.load(ownerDid));
    }
    update(ownerDid, request) {
        const mutate = async () => {
            const normalized = normalizeConversationPreferenceMutation(request);
            if (normalized === undefined)
                invalidState();
            const current = await this.load(ownerDid);
            let next;
            switch (normalized.action) {
                case 'hide': {
                    const snapshot = normalized.conversation;
                    const hidden = current.hiddenConversations.filter(item => item.conversation.id !== snapshot.id);
                    hidden.unshift({ conversation: snapshot, hiddenAt: Date.now() });
                    next = { ...current, hiddenConversations: hidden.slice(0, MAX_HIDDEN_CONVERSATIONS) };
                    break;
                }
                case 'restore': {
                    const conversationId = normalized.conversationId;
                    next = {
                        ...current,
                        hiddenConversations: current.hiddenConversations.filter(item => item.conversation.id !== conversationId),
                    };
                    break;
                }
                case 'dismiss-group-recovery': {
                    const signature = normalized.signature;
                    next = { ...current, dismissedGroupRecoverySignature: signature };
                    break;
                }
                default:
                    invalidState();
            }
            await this.write(ownerDid, next);
            return publicPreferences(next);
        };
        const pending = this.mutation.then(mutate, mutate);
        this.mutation = pending.then(() => undefined, () => undefined);
        return pending;
    }
    async clear() {
        await this.mutation;
        try {
            if (!(await this.hasDirectory(this.hostDirectory)))
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
    async load(ownerDid) {
        if (!(await this.hasDirectory(this.hostDirectory)) || !(await this.hasDirectory(this.directory))) {
            return emptyPreferences(ownerDid);
        }
        const path = this.path(ownerDid);
        try {
            const metadata = await lstat(path);
            if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > MAX_STORE_BYTES)
                invalidState();
            const text = await readFile(path, 'utf8');
            if (Buffer.byteLength(text, 'utf8') > MAX_STORE_BYTES)
                invalidState();
            return preferences(JSON.parse(text), ownerDid);
        }
        catch (error) {
            if (isMissing(error))
                return emptyPreferences(ownerDid);
            if (error instanceof SyntaxError)
                invalidState();
            throw error;
        }
    }
    async write(ownerDid, value) {
        const snapshot = preferences(value, ownerDid);
        const text = `${JSON.stringify(snapshot)}\n`;
        if (Buffer.byteLength(text, 'utf8') > MAX_STORE_BYTES)
            invalidState();
        await this.ensureDirectory();
        const path = this.path(ownerDid);
        const temporary = join(this.directory, `.${this.key(ownerDid)}.${randomUUID()}.tmp`);
        try {
            await writeFile(temporary, text, { flag: 'wx', mode: 0o600 });
            await rename(temporary, path);
            await chmod(path, 0o600);
        }
        finally {
            await unlink(temporary).catch(() => undefined);
        }
    }
    async ensureDirectory() {
        await mkdir(this.hostDirectory, { recursive: true, mode: 0o700 });
        if (!(await this.hasDirectory(this.hostDirectory)))
            invalidState();
        await chmod(this.hostDirectory, 0o700);
        await mkdir(this.directory, { mode: 0o700 }).catch((error) => {
            if (!isFileExists(error))
                throw error;
        });
        if (!(await this.hasDirectory(this.directory)))
            invalidState();
        await chmod(this.directory, 0o700);
    }
    async hasDirectory(path) {
        try {
            const metadata = await lstat(path);
            if (!metadata.isDirectory() || metadata.isSymbolicLink())
                invalidState();
            return true;
        }
        catch (error) {
            if (isMissing(error))
                return false;
            throw error;
        }
    }
    path(ownerDid) {
        return join(this.directory, `${this.key(ownerDid)}.json`);
    }
    key(ownerDid) {
        return createHash('sha256').update(String(ownerDid)).digest('hex');
    }
}
//# sourceMappingURL=conversation-preferences.js.map