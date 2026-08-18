/** Rust IM Core adapter that copies native values into Host-owned public DTOs. */
const GROUP_LOOKUP_LIMIT = 100;
const MAX_GROUP_LOOKUP_PAGES = 20;
const RUST_FAILURE_CODES = {
    invalid_input: 'invalid-request',
    invalid_state_root: 'invalid-request',
    invalid_cursor: 'invalid-request',
    identity_required: 'not-registered',
    identity_not_found: 'not-registered',
    identity_not_ready: 'not-registered',
    auth_required: 'not-registered',
    invalid_otp: 'invalid-otp',
    challenge_expired: 'challenge-expired',
    handle_unavailable: 'handle-unavailable',
    not_found: 'not-found',
    permission_denied: 'forbidden',
    auth_revoked: 'forbidden',
    conflict: 'conflict',
    join_required: 'handle-unavailable',
    state_in_use: 'conflict',
    rate_limited: 'rate-limited',
    timeout: 'network',
    transport_unavailable: 'network',
    sync_failed: 'network',
    session_expired: 'network',
    attachment_transfer_network: 'network',
};
/** Closed provider error consumed by the Host's fixed public failure mapping. */
export class AwikiSdkError extends Error {
    code;
    name = 'AwikiSdkError';
    constructor(code) {
        super(`AWiki SDK operation failed: ${code}`);
        this.code = code;
    }
}
function fail(code = 'remote') {
    throw new AwikiSdkError(code);
}
function mapError(error) {
    if (error instanceof AwikiSdkError)
        throw error;
    let code = 'remote';
    try {
        if (typeof error === 'object' && error !== null) {
            const value = error;
            if (value.name === 'ImCoreNodeError' && typeof value.code === 'string') {
                code = RUST_FAILURE_CODES[value.code] ?? 'remote';
            }
        }
    }
    catch { }
    fail(code);
}
function safeInteger(value, minimum = 0) {
    if (!/^(?:0|[1-9]\d*)$/u.test(value))
        fail();
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < minimum)
        fail();
    return parsed;
}
function timestamp(value) {
    const parsed = Date.parse(value);
    if (!Number.isSafeInteger(parsed))
        fail();
    return parsed;
}
function required(value) {
    if (value === undefined || value.trim().length === 0)
        fail();
    return value;
}
/** Recover the browser's exact optimistic message identity without widening the Remote schema. */
function browserMessageId(idempotencyKey) {
    return /^msg-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(idempotencyKey)
        ? idempotencyKey
        : undefined;
}
function sha256(value) {
    const provided = value.sha256Hex?.toLowerCase();
    if (provided !== undefined && /^[a-f0-9]{64}$/u.test(provided))
        return provided;
    try {
        const bytes = Buffer.from(value.digestB64u, 'base64url');
        if (bytes.byteLength === 32 && bytes.toString('base64url') === value.digestB64u) {
            return bytes.toString('hex');
        }
    }
    catch { }
    fail();
}
/** Copy one native identity without retaining provider-owned objects. */
function identity(value) {
    return {
        handle: required(value.handle),
        did: required(value.did),
        ...value.displayName === undefined ? {} : { displayName: value.displayName },
        registeredAt: safeInteger(value.registeredAtMs),
    };
}
/** Copy one native attachment and normalize its decimal/digest encodings. */
function attachment(value) {
    return {
        id: required(value.id),
        fileName: required(value.fileName),
        mimeType: required(value.mimeType),
        size: safeInteger(value.sizeBytes),
        sha256: sha256(value),
    };
}
function preview(value) {
    if (value === undefined)
        return undefined;
    switch (value.content.kind) {
        case 'text': return value.content.text;
        case 'attachment': {
            const fileName = value.content.attachment?.fileName;
            return fileName === undefined ? undefined : `[附件] ${fileName}`;
        }
        default: return undefined;
    }
}
/** Provider-only protocol events are not part of the browser's text/attachment history contract. */
function displayableMessage(value) {
    return value.content.kind === 'text' || value.content.kind === 'attachment';
}
/** Copy one native page and brand its opaque cursor for the Host API. */
function page(value, copy) {
    return {
        items: value.items.map(copy),
        ...value.nextCursor === undefined ? {} : { nextCursor: String(value.nextCursor) },
        hasMore: value.hasMore,
    };
}
function httpHeaders(headers) {
    return headers.map(header => ({ name: String(header.name), value: String(header.value) }));
}
function externalHttpAttempt(value) {
    return {
        targetUrl: String(value.targetUrl),
        method: String(value.method),
        headerPatch: httpHeaders(value.headerPatch),
        retryCount: value.retryCount,
        async handleResponse(response) {
            try {
                const retry = await value.handleResponse({
                    statusCode: response.statusCode,
                    headers: response.headers.map(header => ({ name: header.name, value: header.value })),
                });
                return retry === null ? null : externalHttpAttempt(retry);
            }
            catch (error) {
                mapError(error);
            }
        },
    };
}
/** Adapt the Rust Node bridge to the frozen Host provider interface. */
export class RustSdkAdapter {
    client;
    attachmentConversations = new Map();
    disposal;
    constructor(client) {
        this.client = Promise.resolve(client);
    }
    async run(operation) {
        try {
            return await operation(await this.client);
        }
        catch (error) {
            mapError(error);
        }
    }
    async displayableMessages(client, values) {
        const messages = values.filter(displayableMessage);
        const peers = [...new Set(messages
                .filter(message => (message.conversationKind === 'group'
                && !message.outgoing
                && message.senderHandle === undefined
                && message.senderDisplayName === undefined))
                .map(message => message.senderDid))];
        if (peers.length === 0)
            return [...messages];
        const profiles = await client.hydrateDisplayProfiles({ peers });
        const byDid = new Map();
        for (const profile of profiles) {
            if (profile.did !== undefined)
                byDid.set(profile.did, profile);
        }
        return messages.map((message) => {
            const profile = byDid.get(message.senderDid);
            if (profile === undefined)
                return message;
            return {
                ...message,
                ...profile.handle === undefined ? {} : { senderHandle: profile.handle },
                ...profile.displayName === undefined ? {} : { senderDisplayName: profile.displayName },
            };
        });
    }
    /**
     * Join the persisted Core peer-profile projection onto direct roster rows.
     * The conversation registry intentionally keeps routing identifiers separate
     * from display metadata, so a bare roster row may otherwise regress to a Handle.
     */
    async displayableConversations(client, values) {
        const peers = [...new Set(values
                .filter((conversation) => (conversation.kind === 'direct' && conversation.peerDid !== undefined))
                .map(conversation => conversation.peerDid))];
        const profiles = peers.length === 0 ? [] : await client.hydrateDisplayProfiles({ peers });
        const byPeer = new Map();
        for (const [index, profile] of profiles.entries()) {
            const requested = peers[index];
            if (requested !== undefined)
                byPeer.set(requested, profile);
            if (profile.did !== undefined)
                byPeer.set(profile.did, profile);
            if (profile.handle !== undefined)
                byPeer.set(profile.handle, profile);
        }
        return values.map(value => this.conversation(value, value.kind === 'direct'
            ? byPeer.get(value.peerDid ?? '') ?? byPeer.get(value.peerHandle ?? '')
            : undefined));
    }
    message(value) {
        const sentAt = value.sentAt === undefined ? fail() : timestamp(value.sentAt);
        const common = {
            id: required(value.id),
            conversationId: required(value.conversationId),
            conversationKind: value.conversationKind,
            senderDid: required(value.senderDid),
            ...value.senderHandle === undefined ? {} : { senderHandle: value.senderHandle },
            ...value.senderDisplayName === undefined ? {} : { senderDisplayName: value.senderDisplayName },
            sentAt,
            outgoing: value.outgoing,
        };
        switch (value.content.kind) {
            case 'text': return {
                ...common,
                content: { kind: 'text', text: required(value.content.text) },
            };
            case 'attachment': {
                if (value.content.attachment === undefined)
                    fail();
                const copied = attachment(value.content.attachment);
                this.attachmentConversations.set(`${String(common.id)}\u0000${String(copied.id)}`, String(common.conversationId));
                return {
                    ...common,
                    content: {
                        kind: 'attachment',
                        attachment: copied,
                        ...value.content.caption === undefined ? {} : { caption: value.content.caption },
                    },
                };
            }
            default: fail();
        }
    }
    conversation(value, profile) {
        const id = required(value.id);
        const displayName = profile?.displayName?.trim();
        const profileHandle = profile?.handle?.trim();
        const title = displayName === undefined || displayName.length === 0
            ? value.title?.trim()
            : displayName;
        const lastMessagePreview = preview(value.lastMessage);
        const common = {
            id,
            title: title === undefined || title.length === 0
                ? required(value.kind === 'direct' ? value.peerHandle ?? value.peerDid : value.groupDid)
                : title,
            unreadCount: value.unreadCount,
            ...value.lastMessageAt === undefined ? {} : { lastMessageAt: timestamp(value.lastMessageAt) },
            ...lastMessagePreview === undefined ? {} : { lastMessagePreview },
        };
        if (value.lastMessage !== undefined && displayableMessage(value.lastMessage))
            this.message(value.lastMessage);
        switch (value.kind) {
            case 'direct': return {
                kind: 'direct',
                ...common,
                peerDid: required(profile?.did ?? value.peerDid),
                ...profileHandle === undefined && value.peerHandle === undefined
                    ? {}
                    : { peerHandle: required(profileHandle ?? value.peerHandle) },
                ...displayName === undefined || displayName.length === 0 ? {} : { displayName },
            };
            case 'group': return {
                kind: 'group',
                ...common,
                groupDid: required(value.groupDid),
            };
            default: fail();
        }
    }
    createdGroup(value) {
        return {
            kind: 'group',
            id: required(value.conversationId),
            groupDid: required(value.did),
            title: required(value.title),
            unreadCount: 0,
        };
    }
    groupMember(value) {
        return {
            did: required(value.did),
            ...value.handle === undefined ? {} : { handle: value.handle },
        };
    }
    async conversationId(client, target) {
        if (target.kind === 'direct')
            return required((await client.resolvePeer(target.peer)).conversationId);
        let cursor;
        for (let index = 0; index < MAX_GROUP_LOOKUP_PAGES; index += 1) {
            const result = await client.listConversations({
                ...cursor === undefined ? {} : { cursor },
                limit: GROUP_LOOKUP_LIMIT,
            });
            const match = result.items.find(item => item.kind === 'group' && (item.id === target.group || item.groupDid === target.group));
            if (match !== undefined)
                return required(match.id);
            if (!result.hasMore || result.nextCursor === undefined)
                fail('not-found');
            cursor = result.nextCursor;
        }
        fail('not-found');
    }
    prepareExternalHttpRequest(request) {
        return this.run(async (client) => externalHttpAttempt(await client.prepareExternalHttpRequest({
            url: request.url,
            method: request.method,
            headers: request.headers.map(header => ({ name: header.name, value: header.value })),
            ...request.body === undefined ? {} : { body: Uint8Array.from(request.body) },
        })));
    }
    getIdentity() {
        return this.run(async (client) => {
            const value = await client.getDefaultIdentity();
            return value === null ? null : identity(value);
        });
    }
    sendRegistrationOtp(request) {
        return this.run(async (client) => {
            const value = await client.requestRegistrationOtp(request);
            return { retryAfterSeconds: value.retryAfterSeconds, retryAt: value.retryAt };
        });
    }
    registerIdentity(request) {
        return this.run(async (client) => identity(await client.completeRegistration(request)));
    }
    updateDisplayName(request) {
        return this.run(async (client) => identity(await client.updateDisplayName(request.displayName)));
    }
    resolvePeer(peer) {
        return this.run(async (client) => {
            const value = await client.resolvePeer(peer);
            return {
                did: required(value.did),
                conversationId: required(value.conversationId),
                ...value.handle === undefined ? {} : { handle: value.handle },
                ...value.displayName === undefined ? {} : { displayName: value.displayName },
            };
        });
    }
    createGroup(name) {
        return this.run(async (client) => this.createdGroup(await client.createGroup({ name })));
    }
    addGroupMember(groupDid, member) {
        return this.run(async (client) => this.groupMember(await client.addGroupMember({
            groupDid: String(groupDid),
            member,
        })));
    }
    listConversations(request) {
        return this.run(async (client) => {
            const conversations = await client.listConversations(request);
            return {
                ...page(conversations, value => value),
                items: await this.displayableConversations(client, conversations.items),
            };
        });
    }
    getHistory(request) {
        return this.run(async (client) => {
            const history = await client.getHistory({
                conversationId: String(request.conversationId),
                ...request.cursor === undefined ? {} : { cursor: String(request.cursor) },
                ...request.limit === undefined ? {} : { limit: request.limit },
            });
            return page(
            // Rust Core pages newest-first; the Host/UI contract is chronological.
            { ...history, items: await this.displayableMessages(client, [...history.items].reverse()) }, value => this.message(value));
        });
    }
    getLocalHistory(request) {
        return this.run(async (client) => {
            const history = await client.getLocalConversationTimeline({
                conversationId: String(request.conversationId),
                ...request.cursor === undefined ? {} : { cursor: String(request.cursor) },
                ...request.limit === undefined ? {} : { limit: request.limit },
            });
            return page(
            // Rust Core local pages are newest-first; the Host/UI contract is chronological.
            { ...history, items: await this.displayableMessages(client, [...history.items].reverse()) }, value => this.message(value));
        });
    }
    markConversationRead(conversationId) {
        return this.run(async (client) => (await client.markConversationRead(String(conversationId))).updatedCount);
    }
    sendText(request) {
        return this.run(async (client) => {
            const clientMessageId = browserMessageId(request.idempotencyKey);
            return this.message(await client.sendText({
                conversationId: await this.conversationId(client, request.target),
                text: request.text,
                ...clientMessageId === undefined ? {} : { clientMessageId },
                idempotencyKey: request.idempotencyKey,
            }));
        });
    }
    sendAttachment(request) {
        return this.run(async (client) => {
            const clientMessageId = browserMessageId(request.idempotencyKey);
            return this.message(await client.sendAttachment({
                conversationId: await this.conversationId(client, request.target),
                fileName: request.attachment.fileName,
                mimeType: request.attachment.mimeType,
                bytes: request.attachment.bytes,
                ...request.caption === undefined ? {} : { caption: request.caption },
                ...clientMessageId === undefined ? {} : { clientMessageId },
                idempotencyKey: request.idempotencyKey,
            }));
        });
    }
    downloadAttachment(request) {
        return this.run(async (client) => {
            const conversationId = this.attachmentConversations.get(`${String(request.messageId)}\u0000${String(request.attachmentId)}`);
            if (conversationId === undefined)
                fail('not-found');
            const value = await client.downloadAttachment({
                conversationId,
                messageId: String(request.messageId),
                attachmentId: String(request.attachmentId),
            });
            return { attachment: attachment(value.attachment), bytes: Uint8Array.from(value.bytes) };
        });
    }
    clearLocalData() {
        return this.run(client => client.clearLocalData());
    }
    dispose() {
        this.disposal ??= this.client.then(async (client) => {
            try {
                await client.close();
            }
            catch (error) {
                mapError(error);
            }
        }, () => undefined);
        return this.disposal;
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