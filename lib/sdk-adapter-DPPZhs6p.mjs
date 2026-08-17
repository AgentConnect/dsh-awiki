//#region lib/types/sdk-adapter.js
/** Rust IM Core adapter that copies native values into Host-owned public DTOs. */
const GROUP_LOOKUP_LIMIT = 100;
const MAX_GROUP_LOOKUP_PAGES = 20;
const RUST_FAILURE_CODES = {
	invalid_input: "invalid-request",
	invalid_state_root: "invalid-request",
	invalid_cursor: "invalid-request",
	identity_required: "not-registered",
	identity_not_found: "not-registered",
	identity_not_ready: "not-registered",
	auth_required: "not-registered",
	invalid_otp: "invalid-otp",
	challenge_expired: "challenge-expired",
	handle_unavailable: "handle-unavailable",
	not_found: "not-found",
	permission_denied: "forbidden",
	auth_revoked: "forbidden",
	conflict: "conflict",
	join_required: "handle-unavailable",
	state_in_use: "conflict",
	rate_limited: "rate-limited",
	timeout: "network",
	transport_unavailable: "network",
	sync_failed: "network",
	session_expired: "network",
	attachment_transfer_network: "network"
};
/** Closed provider error consumed by the Host's fixed public failure mapping. */
var AwikiSdkError = class extends Error {
	code;
	name = "AwikiSdkError";
	constructor(code) {
		super(`AWiki SDK operation failed: ${code}`);
		this.code = code;
	}
};
function fail(code = "remote") {
	throw new AwikiSdkError(code);
}
function mapError(error) {
	if (error instanceof AwikiSdkError) throw error;
	let code = "remote";
	try {
		if (typeof error === "object" && error !== null) {
			const value = error;
			if (value.name === "ImCoreNodeError" && typeof value.code === "string") code = RUST_FAILURE_CODES[value.code] ?? "remote";
		}
	} catch {}
	fail(code);
}
function safeInteger(value, minimum = 0) {
	if (!/^(?:0|[1-9]\d*)$/u.test(value)) fail();
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed < minimum) fail();
	return parsed;
}
function timestamp(value) {
	const parsed = Date.parse(value);
	if (!Number.isSafeInteger(parsed)) fail();
	return parsed;
}
function required(value) {
	if (value === void 0 || value.trim().length === 0) fail();
	return value;
}
function sha256(value) {
	const provided = value.sha256Hex?.toLowerCase();
	if (provided !== void 0 && /^[a-f0-9]{64}$/u.test(provided)) return provided;
	try {
		const bytes = Buffer.from(value.digestB64u, "base64url");
		if (bytes.byteLength === 32 && bytes.toString("base64url") === value.digestB64u) return bytes.toString("hex");
	} catch {}
	fail();
}
/** Copy one native identity without retaining provider-owned objects. */
function identity(value) {
	return {
		handle: required(value.handle),
		did: required(value.did),
		...value.displayName === void 0 ? {} : { displayName: value.displayName },
		registeredAt: safeInteger(value.registeredAtMs)
	};
}
/** Copy one native attachment and normalize its decimal/digest encodings. */
function attachment(value) {
	return {
		id: required(value.id),
		fileName: required(value.fileName),
		mimeType: required(value.mimeType),
		size: safeInteger(value.sizeBytes),
		sha256: sha256(value)
	};
}
function preview(value) {
	if (value === void 0) return void 0;
	switch (value.content.kind) {
		case "text": return value.content.text;
		case "attachment": {
			const fileName = value.content.attachment?.fileName;
			return fileName === void 0 ? void 0 : `[附件] ${fileName}`;
		}
		default: return;
	}
}
/** Copy one native page and brand its opaque cursor for the Host API. */
function page(value, copy) {
	return {
		items: value.items.map(copy),
		...value.nextCursor === void 0 ? {} : { nextCursor: String(value.nextCursor) },
		hasMore: value.hasMore
	};
}
/** Adapt the Rust Node bridge to the frozen Host provider interface. */
var RustSdkAdapter = class {
	client;
	attachmentConversations = /* @__PURE__ */ new Map();
	disposal;
	constructor(client) {
		this.client = Promise.resolve(client);
	}
	async run(operation) {
		try {
			return await operation(await this.client);
		} catch (error) {
			mapError(error);
		}
	}
	message(value) {
		const sentAt = value.sentAt === void 0 ? fail() : timestamp(value.sentAt);
		const common = {
			id: required(value.id),
			conversationId: required(value.conversationId),
			conversationKind: value.conversationKind,
			senderDid: required(value.senderDid),
			...value.senderHandle === void 0 ? {} : { senderHandle: value.senderHandle },
			...value.senderDisplayName === void 0 ? {} : { senderDisplayName: value.senderDisplayName },
			sentAt,
			outgoing: value.outgoing
		};
		switch (value.content.kind) {
			case "text": return {
				...common,
				content: {
					kind: "text",
					text: required(value.content.text)
				}
			};
			case "attachment": {
				if (value.content.attachment === void 0) fail();
				const copied = attachment(value.content.attachment);
				this.attachmentConversations.set(`${String(common.id)}\u0000${String(copied.id)}`, String(common.conversationId));
				return {
					...common,
					content: {
						kind: "attachment",
						attachment: copied,
						...value.content.caption === void 0 ? {} : { caption: value.content.caption }
					}
				};
			}
			default: fail();
		}
	}
	conversation(value) {
		const id = required(value.id);
		const title = value.title?.trim();
		const lastMessagePreview = preview(value.lastMessage);
		const common = {
			id,
			title: title === void 0 || title.length === 0 ? required(value.kind === "direct" ? value.peerHandle ?? value.peerDid : value.groupDid) : title,
			unreadCount: value.unreadCount,
			...value.lastMessageAt === void 0 ? {} : { lastMessageAt: timestamp(value.lastMessageAt) },
			...lastMessagePreview === void 0 ? {} : { lastMessagePreview }
		};
		if (value.lastMessage !== void 0) this.message(value.lastMessage);
		switch (value.kind) {
			case "direct": return {
				kind: "direct",
				...common,
				peerDid: required(value.peerDid),
				...value.peerHandle === void 0 ? {} : { peerHandle: value.peerHandle }
			};
			case "group": return {
				kind: "group",
				...common,
				groupDid: required(value.groupDid)
			};
			default: fail();
		}
	}
	async conversationId(client, target) {
		if (target.kind === "direct") return required((await client.resolvePeer(target.peer)).conversationId);
		let cursor;
		for (let index = 0; index < MAX_GROUP_LOOKUP_PAGES; index += 1) {
			const result = await client.listConversations({
				...cursor === void 0 ? {} : { cursor },
				limit: GROUP_LOOKUP_LIMIT
			});
			const match = result.items.find((item) => item.kind === "group" && (item.id === target.group || item.groupDid === target.group));
			if (match !== void 0) return required(match.id);
			if (!result.hasMore || result.nextCursor === void 0) fail("not-found");
			cursor = result.nextCursor;
		}
		fail("not-found");
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
			return {
				retryAfterSeconds: value.retryAfterSeconds,
				retryAt: value.retryAt
			};
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
				...value.handle === void 0 ? {} : { handle: value.handle },
				...value.displayName === void 0 ? {} : { displayName: value.displayName }
			};
		});
	}
	listConversations(request) {
		return this.run(async (client) => page(await client.listConversations(request), (value) => this.conversation(value)));
	}
	getHistory(request) {
		return this.run(async (client) => {
			const history = await client.getHistory({
				conversationId: String(request.conversationId),
				...request.cursor === void 0 ? {} : { cursor: String(request.cursor) },
				...request.limit === void 0 ? {} : { limit: request.limit }
			});
			return page({
				...history,
				items: [...history.items].reverse()
			}, (value) => this.message(value));
		});
	}
	markConversationRead(conversationId) {
		return this.run(async (client) => (await client.markConversationRead(String(conversationId))).updatedCount);
	}
	sendText(request) {
		return this.run(async (client) => this.message(await client.sendText({
			conversationId: await this.conversationId(client, request.target),
			text: request.text,
			idempotencyKey: request.idempotencyKey
		})));
	}
	sendAttachment(request) {
		return this.run(async (client) => this.message(await client.sendAttachment({
			conversationId: await this.conversationId(client, request.target),
			fileName: request.attachment.fileName,
			mimeType: request.attachment.mimeType,
			bytes: request.attachment.bytes,
			...request.caption === void 0 ? {} : { caption: request.caption },
			idempotencyKey: request.idempotencyKey
		})));
	}
	downloadAttachment(request) {
		return this.run(async (client) => {
			const conversationId = this.attachmentConversations.get(`${String(request.messageId)}\u0000${String(request.attachmentId)}`);
			if (conversationId === void 0) fail("not-found");
			const value = await client.downloadAttachment({
				conversationId,
				messageId: String(request.messageId),
				attachmentId: String(request.attachmentId)
			});
			return {
				attachment: attachment(value.attachment),
				bytes: Uint8Array.from(value.bytes)
			};
		});
	}
	clearLocalData() {
		return this.run((client) => client.clearLocalData());
	}
	dispose() {
		this.disposal ??= this.client.then(async (client) => {
			try {
				await client.close();
			} catch (error) {
				mapError(error);
			}
		}, () => void 0);
		return this.disposal;
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
export { downloadedAttachment as n, RustSdkAdapter as t };
