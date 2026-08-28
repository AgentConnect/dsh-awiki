/** Private, owner-bound persistence for mail successfully sent by this installation. */
import { createHash, randomUUID } from 'node:crypto';
import { chmod, lstat, mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mailAttachmentContentType, mailAttachmentFileName, mailSendRequest } from "./mail.js";
const STORE_VERSION = 2;
const STORE_DIRECTORY = 'sent-mail-v2';
const LEGACY_STORE_VERSION = 1;
const LEGACY_STORE_DIRECTORY = 'sent-mail-v1';
const MAX_RECORDS = 200;
const MAX_STORE_BYTES = 16 * 1024 * 1024;
const PREVIEW_CHARACTERS = 160;
export const LOCAL_SENT_MAIL_ID_PREFIX = 'awiki-sent-v1:';
function invalidState() {
    throw new TypeError('awiki: local sent-mail history is invalid');
}
function isMissing(error) {
    return typeof error === 'object' && error !== null && error.code === 'ENOENT';
}
function isFileExists(error) {
    return typeof error === 'object' && error !== null && error.code === 'EEXIST';
}
function validToken(value, maxCharacters) {
    return typeof value === 'string'
        && value.length > 0
        && value.trim() === value
        && Array.from(value).length <= maxCharacters
        && !/[\u0000-\u001f\u007f-\u009f]/u.test(value);
}
function validAddress(value) {
    return typeof value === 'string'
        && Array.from(value).length >= 3
        && Array.from(value).length <= 320
        && value.includes('@')
        && !/[\s\u0000-\u001f\u007f-\u009f]/u.test(value);
}
function decodeSharedRecord(input) {
    if (typeof input !== 'object' || input === null || Array.isArray(input))
        invalidState();
    const value = input;
    if (typeof value.id !== 'string'
        || !/^awiki-sent-v1:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value.id)
        || (value.serviceMessageId !== undefined && !validToken(value.serviceMessageId, 2_048))
        || (value.from !== undefined && !validAddress(value.from))
        || typeof value.sentAt !== 'string'
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value.sentAt)
        || !Number.isFinite(Date.parse(value.sentAt)))
        invalidState();
    let request;
    try {
        request = mailSendRequest({
            to: value.to,
            cc: value.cc,
            subject: value.subject,
            bodyText: value.bodyText,
        });
    }
    catch {
        invalidState();
    }
    return {
        id: value.id,
        ...value.serviceMessageId === undefined ? {} : { serviceMessageId: value.serviceMessageId },
        ...value.from === undefined ? {} : { from: value.from },
        to: [...request.to],
        cc: [...request.cc ?? []],
        subject: request.subject,
        bodyText: request.bodyText,
        sentAt: value.sentAt,
    };
}
function validMailFileName(value) {
    try {
        return mailAttachmentFileName(value) === value;
    }
    catch {
        return false;
    }
}
function validMailContentType(value) {
    try {
        return value !== '' && mailAttachmentContentType(value) === value;
    }
    catch {
        return false;
    }
}
function decodeAttachment(input) {
    if (typeof input !== 'object' || input === null || Array.isArray(input))
        invalidState();
    const value = input;
    if (!Number.isSafeInteger(value.index)
        || value.index < 0
        || value.index > 9
        || !validMailFileName(value.fileName)
        || !validMailContentType(value.contentType)
        || !Number.isSafeInteger(value.sizeBytes)
        || value.sizeBytes < 0
        || value.sizeBytes > 10 * 1024 * 1024
        || typeof value.sha256 !== 'string'
        || !/^[a-f0-9]{64}$/u.test(value.sha256))
        invalidState();
    return {
        index: value.index,
        fileName: value.fileName,
        contentType: value.contentType,
        sizeBytes: value.sizeBytes,
        sha256: value.sha256,
    };
}
function decodeRecord(input) {
    const shared = decodeSharedRecord(input);
    const value = input;
    if (!Array.isArray(value.attachments)
        || value.attachments.length > 10
        || !Array.isArray(value.warnings)
        || value.warnings.length > 100)
        invalidState();
    const attachments = value.attachments.map(decodeAttachment);
    if (new Set(attachments.map(attachment => attachment.index)).size !== attachments.length)
        invalidState();
    const warnings = value.warnings.map((warning) => {
        if (typeof warning !== 'string' || Buffer.byteLength(warning, 'utf8') > 1_024 || warning.includes('\0'))
            invalidState();
        return warning;
    });
    return { ...shared, attachments, warnings };
}
function decodeLegacyRecord(input) {
    return { ...decodeSharedRecord(input), attachments: [], warnings: [] };
}
function message(record) {
    const characters = Array.from(record.bodyText);
    const preview = characters.slice(0, PREVIEW_CHARACTERS).join('');
    return {
        summary: {
            id: record.id,
            folder: 'sent',
            from: record.from === undefined ? [] : [record.from],
            to: [...record.to],
            cc: [...record.cc],
            subject: record.subject,
            subjectTruncated: false,
            preview,
            previewTruncated: characters.length > PREVIEW_CHARACTERS,
            sentAt: record.sentAt,
            unread: false,
            hasAttachments: record.attachments.length > 0,
            attachmentCount: record.attachments.length,
        },
        bodyText: record.bodyText,
        bodyTruncated: false,
        hasHtmlBody: false,
        attachments: record.attachments.map(attachment => ({
            index: attachment.index,
            fileName: attachment.fileName,
            contentType: attachment.contentType,
            sizeBytes: String(attachment.sizeBytes),
        })),
    };
}
export function isLocalSentMailId(messageId) {
    return String(messageId).startsWith(LOCAL_SENT_MAIL_ID_PREFIX);
}
/** Atomic, bounded history of sends accepted by the Mail Service. */
export class AwikiSentMailStore {
    hostDirectory;
    directory;
    legacyDirectory;
    mutation = Promise.resolve();
    constructor(stateRoot) {
        this.hostDirectory = join(stateRoot, '.host');
        this.directory = join(this.hostDirectory, STORE_DIRECTORY);
        this.legacyDirectory = join(this.hostDirectory, LEGACY_STORE_DIRECTORY);
    }
    async list(ownerDid, request) {
        const records = request.unreadOnly === true ? [] : await this.load(ownerDid);
        const offset = request.offset ?? 0;
        const limit = request.limit ?? 20;
        const page = records.slice(offset, offset + limit);
        const nextOffset = offset + page.length;
        const hasMore = nextOffset < records.length;
        return {
            items: page.map(record => message(record).summary),
            ...hasMore ? { nextOffset } : {},
            hasMore,
        };
    }
    async read(ownerDid, messageId) {
        if (!isLocalSentMailId(messageId))
            return undefined;
        const record = (await this.load(ownerDid)).find(candidate => candidate.id === String(messageId));
        return record === undefined ? undefined : message(record);
    }
    append(ownerDid, request, result, account) {
        if (!result.accepted)
            return Promise.resolve();
        const record = {
            id: `${LOCAL_SENT_MAIL_ID_PREFIX}${randomUUID()}`,
            ...result.messageId === undefined ? {} : { serviceMessageId: String(result.messageId) },
            ...account?.mailboxAddress === undefined ? {} : { from: account.mailboxAddress },
            to: [...request.to],
            cc: [...request.cc],
            subject: request.subject,
            bodyText: request.bodyText,
            sentAt: new Date().toISOString(),
            attachments: request.attachments.map((attachment, index) => ({
                index,
                fileName: attachment.fileName,
                contentType: attachment.contentType,
                sizeBytes: attachment.sizeBytes,
                sha256: attachment.sha256,
            })),
            warnings: [...result.warnings],
        };
        const append = async () => {
            const records = await this.load(ownerDid);
            await this.write(ownerDid, [record, ...records].slice(0, MAX_RECORDS));
        };
        const pending = this.mutation.then(append, append);
        this.mutation = pending.catch(() => undefined);
        return pending;
    }
    async clear() {
        await this.mutation;
        await this.clearDirectory(this.directory);
        await this.clearDirectory(this.legacyDirectory);
    }
    async resolveAttachment(ownerDid, messageId, attachmentIndex) {
        if (!isLocalSentMailId(messageId))
            return messageId;
        const record = (await this.load(ownerDid)).find(candidate => candidate.id === String(messageId));
        if (record?.serviceMessageId === undefined
            || !record.attachments.some(attachment => attachment.index === attachmentIndex))
            return undefined;
        return record.serviceMessageId;
    }
    async clearDirectory(directory) {
        try {
            if (!(await this.hasDirectory(this.hostDirectory)))
                return;
            const metadata = await lstat(directory);
            if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
                await unlink(directory);
                return;
            }
            await rm(directory, { recursive: true, force: true });
        }
        catch (error) {
            if (!isMissing(error))
                throw error;
        }
    }
    async load(ownerDid) {
        if (!(await this.hasDirectory(this.hostDirectory)))
            return [];
        const current = await this.loadFile(ownerDid, this.directory, STORE_VERSION, decodeRecord);
        if (current !== undefined)
            return current;
        return await this.loadFile(ownerDid, this.legacyDirectory, LEGACY_STORE_VERSION, decodeLegacyRecord) ?? [];
    }
    async loadFile(ownerDid, directory, version, decode) {
        if (!(await this.hasDirectory(directory)))
            return undefined;
        const path = this.path(ownerDid, directory);
        let text;
        try {
            const metadata = await lstat(path);
            if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > MAX_STORE_BYTES)
                invalidState();
            text = await readFile(path, 'utf8');
        }
        catch (error) {
            if (isMissing(error))
                return undefined;
            throw error;
        }
        let parsed;
        try {
            parsed = JSON.parse(text);
        }
        catch {
            invalidState();
        }
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
            invalidState();
        const value = parsed;
        if (value.version !== version
            || value.ownerDid !== String(ownerDid)
            || !Array.isArray(value.records)
            || value.records.length > MAX_RECORDS)
            invalidState();
        const records = value.records.map(decode);
        if (new Set(records.map(record => record.id)).size !== records.length)
            invalidState();
        return records;
    }
    async write(ownerDid, records) {
        await this.ensureDirectory();
        const path = this.path(ownerDid, this.directory);
        const temporary = join(this.directory, `.${this.key(ownerDid)}.${randomUUID()}.tmp`);
        const payload = { version: STORE_VERSION, ownerDid: String(ownerDid), records };
        const text = JSON.stringify(payload);
        if (Buffer.byteLength(text, 'utf8') > MAX_STORE_BYTES)
            invalidState();
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
    path(ownerDid, directory) {
        return join(directory, `${this.key(ownerDid)}.json`);
    }
    key(ownerDid) {
        return createHash('sha256').update(String(ownerDid)).digest('hex');
    }
}
//# sourceMappingURL=sent-mail-store.js.map