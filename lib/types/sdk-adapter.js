/** TypeScript SDK adapter that copies provider values into Host-owned public DTOs. */
/** Copy one SDK identity without retaining provider-owned objects. */
function identity(value) {
    return {
        handle: String(value.handle),
        did: String(value.did),
        ...value.displayName === undefined ? {} : { displayName: value.displayName },
        registeredAt: value.registeredAt,
    };
}
/** Copy one SDK attachment without retaining provider-owned objects. */
function attachment(value) {
    return {
        id: String(value.id),
        fileName: value.fileName,
        mimeType: value.mimeType,
        size: value.size,
        sha256: value.sha256,
    };
}
/** Copy one SDK conversation without retaining provider-owned objects. */
function conversation(value) {
    switch (value.kind) {
        case 'direct': return {
            kind: 'direct',
            id: String(value.id),
            peerDid: String(value.peerDid),
            ...value.peerHandle === undefined ? {} : { peerHandle: String(value.peerHandle) },
            ...value.displayName === undefined ? {} : { displayName: value.displayName },
            title: value.title,
            ...value.unreadCount === undefined ? {} : { unreadCount: value.unreadCount },
            ...value.lastMessageAt === undefined ? {} : { lastMessageAt: value.lastMessageAt },
            ...value.lastMessagePreview === undefined ? {} : { lastMessagePreview: value.lastMessagePreview },
        };
        case 'group': return {
            kind: 'group',
            id: String(value.id),
            groupDid: String(value.groupDid),
            title: value.title,
            ...value.unreadCount === undefined ? {} : { unreadCount: value.unreadCount },
            ...value.lastMessageAt === undefined ? {} : { lastMessageAt: value.lastMessageAt },
            ...value.lastMessagePreview === undefined ? {} : { lastMessagePreview: value.lastMessagePreview },
        };
        default: throw new TypeError('AWiki SDK returned an unsupported conversation kind');
    }
}
/** Copy one SDK message without retaining provider-owned objects. */
function message(value) {
    return {
        id: String(value.id),
        conversationId: String(value.conversationId),
        conversationKind: value.conversationKind,
        senderDid: String(value.senderDid),
        ...value.senderHandle === undefined ? {} : { senderHandle: String(value.senderHandle) },
        ...value.senderDisplayName === undefined ? {} : { senderDisplayName: value.senderDisplayName },
        sentAt: value.sentAt,
        outgoing: value.outgoing,
        content: value.content.kind === 'text'
            ? { kind: 'text', text: value.content.text }
            : {
                kind: 'attachment',
                attachment: attachment(value.content.attachment),
                ...value.content.caption === undefined ? {} : { caption: value.content.caption },
            },
    };
}
/** Copy one SDK page and brand its opaque cursor for the Host API. */
function page(value, copy) {
    return {
        items: value.items.map(copy),
        ...value.nextCursor === undefined ? {} : { nextCursor: String(value.nextCursor) },
        hasMore: value.hasMore,
    };
}
/** Adapt the versioned TypeScript SDK to the Host provider interface. */
export class TypeScriptSdkAdapter {
    client;
    /** @param client - initialized high-level SDK client owned by this adapter. */
    constructor(client) {
        this.client = client;
    }
    async getIdentity() {
        const value = await this.client.getIdentity();
        return value === null ? null : identity(value);
    }
    async sendRegistrationOtp(request) {
        const value = await this.client.sendRegistrationOtp(request);
        return { retryAfterSeconds: value.retryAfterSeconds, retryAt: value.retryAt };
    }
    async registerIdentity(request) {
        return identity(await this.client.registerIdentity(request));
    }
    async updateDisplayName(request) {
        return identity(await this.client.updateDisplayName(request));
    }
    async resolvePeer(peer) {
        const value = await this.client.resolvePeer(peer);
        return {
            did: String(value.did),
            conversationId: String(value.conversationId),
            ...value.handle === undefined ? {} : { handle: String(value.handle) },
            ...value.displayName === undefined ? {} : { displayName: value.displayName },
        };
    }
    async listConversations(request) {
        const value = await this.client.listConversations(request);
        return page(value, conversation);
    }
    async getHistory(request) {
        const sdkRequest = {
            conversationId: String(request.conversationId),
            ...request.cursor === undefined ? {} : { cursor: String(request.cursor) },
            ...request.limit === undefined ? {} : { limit: request.limit },
        };
        const value = await this.client.getHistory(sdkRequest);
        return page(value, message);
    }
    async markConversationRead(conversationId) {
        return this.client.markConversationRead(String(conversationId));
    }
    async sendText(request) {
        return message(await this.client.sendText(request));
    }
    async sendAttachment(request) {
        const sdkRequest = {
            target: request.target,
            attachment: {
                fileName: request.attachment.fileName,
                mimeType: request.attachment.mimeType,
                bytes: request.attachment.bytes,
            },
            ...request.caption === undefined ? {} : { caption: request.caption },
            idempotencyKey: request.idempotencyKey,
        };
        return message(await this.client.sendAttachment(sdkRequest));
    }
    async downloadAttachment(request) {
        const sdkRequest = {
            attachmentId: String(request.attachmentId),
            messageId: String(request.messageId),
        };
        const value = await this.client.downloadAttachment(sdkRequest);
        return { attachment: attachment(value.attachment), bytes: value.bytes.slice() };
    }
    clearLocalData() {
        return this.client.clearLocalData();
    }
    dispose() {
        return this.client.dispose();
    }
}
/**
 * Convert a raw provider download to the Remote JSON representation.
 * @param value - provider-verified public metadata and bytes.
 * @returns detached metadata with canonical Base64 bytes.
 */
export function downloadedAttachment(value) {
    return {
        attachment: { ...value.attachment },
        bytesBase64: Buffer.from(value.bytes).toString('base64'),
    };
}
//# sourceMappingURL=sdk-adapter.js.map