//#region lib/types/sdk-adapter.js
/** TypeScript SDK adapter that copies provider values into Host-owned public DTOs. */
/** Copy one SDK identity without retaining provider-owned objects. */
function identity(value) {
	return {
		handle: String(value.handle),
		did: String(value.did),
		...value.displayName === void 0 ? {} : { displayName: value.displayName },
		registeredAt: value.registeredAt
	};
}
/** Copy one SDK attachment without retaining provider-owned objects. */
function attachment(value) {
	return {
		id: String(value.id),
		fileName: value.fileName,
		mimeType: value.mimeType,
		size: value.size,
		sha256: value.sha256
	};
}
/** Copy one SDK conversation without retaining provider-owned objects. */
function conversation(value) {
	switch (value.kind) {
		case "direct": return {
			kind: "direct",
			id: String(value.id),
			peerDid: String(value.peerDid),
			...value.peerHandle === void 0 ? {} : { peerHandle: String(value.peerHandle) },
			...value.displayName === void 0 ? {} : { displayName: value.displayName },
			title: value.title,
			...value.unreadCount === void 0 ? {} : { unreadCount: value.unreadCount },
			...value.lastMessageAt === void 0 ? {} : { lastMessageAt: value.lastMessageAt },
			...value.lastMessagePreview === void 0 ? {} : { lastMessagePreview: value.lastMessagePreview }
		};
		case "group": return {
			kind: "group",
			id: String(value.id),
			groupDid: String(value.groupDid),
			title: value.title,
			...value.unreadCount === void 0 ? {} : { unreadCount: value.unreadCount },
			...value.lastMessageAt === void 0 ? {} : { lastMessageAt: value.lastMessageAt },
			...value.lastMessagePreview === void 0 ? {} : { lastMessagePreview: value.lastMessagePreview }
		};
		default: throw new TypeError("AWiki SDK returned an unsupported conversation kind");
	}
}
/** Copy one SDK message without retaining provider-owned objects. */
function message(value) {
	return {
		id: String(value.id),
		conversationId: String(value.conversationId),
		conversationKind: value.conversationKind,
		senderDid: String(value.senderDid),
		...value.senderHandle === void 0 ? {} : { senderHandle: String(value.senderHandle) },
		...value.senderDisplayName === void 0 ? {} : { senderDisplayName: value.senderDisplayName },
		sentAt: value.sentAt,
		outgoing: value.outgoing,
		content: value.content.kind === "text" ? {
			kind: "text",
			text: value.content.text
		} : {
			kind: "attachment",
			attachment: attachment(value.content.attachment),
			...value.content.caption === void 0 ? {} : { caption: value.content.caption }
		}
	};
}
/** Copy one SDK page and brand its opaque cursor for the Host API. */
function page(value, copy) {
	return {
		items: value.items.map(copy),
		...value.nextCursor === void 0 ? {} : { nextCursor: String(value.nextCursor) },
		hasMore: value.hasMore
	};
}
/** Adapt the versioned TypeScript SDK to the Host provider interface. */
var TypeScriptSdkAdapter = class {
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
		return {
			retryAfterSeconds: value.retryAfterSeconds,
			retryAt: value.retryAt
		};
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
			...value.handle === void 0 ? {} : { handle: String(value.handle) },
			...value.displayName === void 0 ? {} : { displayName: value.displayName }
		};
	}
	async listConversations(request) {
		return page(await this.client.listConversations(request), conversation);
	}
	async getHistory(request) {
		const sdkRequest = {
			conversationId: String(request.conversationId),
			...request.cursor === void 0 ? {} : { cursor: String(request.cursor) },
			...request.limit === void 0 ? {} : { limit: request.limit }
		};
		return page(await this.client.getHistory(sdkRequest), message);
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
				bytes: request.attachment.bytes
			},
			...request.caption === void 0 ? {} : { caption: request.caption },
			idempotencyKey: request.idempotencyKey
		};
		return message(await this.client.sendAttachment(sdkRequest));
	}
	async downloadAttachment(request) {
		const sdkRequest = {
			attachmentId: String(request.attachmentId),
			messageId: String(request.messageId)
		};
		const value = await this.client.downloadAttachment(sdkRequest);
		return {
			attachment: attachment(value.attachment),
			bytes: value.bytes.slice()
		};
	}
	clearLocalData() {
		return this.client.clearLocalData();
	}
	dispose() {
		return this.client.dispose();
	}
};
/**
* Convert a raw provider download to the Remote JSON representation.
* @param value - provider-verified public metadata and bytes.
* @returns detached metadata with canonical Base64 bytes.
*/
function downloadedAttachment(value) {
	return {
		attachment: { ...value.attachment },
		bytesBase64: Buffer.from(value.bytes).toString("base64")
	};
}
//#endregion
export { downloadedAttachment as n, TypeScriptSdkAdapter as t };
