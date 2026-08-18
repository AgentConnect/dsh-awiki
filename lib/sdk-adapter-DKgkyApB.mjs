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
function mapError(error, ambiguousSend = false) {
	if (error instanceof AwikiSdkError) throw error;
	let code = "remote";
	try {
		if (typeof error === "object" && error !== null) {
			const value = error;
			if (value.name === "ImCoreNodeError" && typeof value.code === "string") code = ambiguousSend && (value.code === "timeout" || value.code === "transport_unavailable") ? "delivery-unknown" : RUST_FAILURE_CODES[value.code] ?? "remote";
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
/** Recover the browser's exact optimistic message identity without widening the Remote schema. */
function browserMessageId(idempotencyKey) {
	return /^msg-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(idempotencyKey) ? idempotencyKey : void 0;
}
function remoteString(value, maxBytes) {
	if (typeof value !== "string" || value.includes("\0") || Buffer.byteLength(value, "utf8") > maxBytes) fail();
	return value;
}
function remoteOptionalString(value, maxBytes) {
	return value === void 0 ? void 0 : remoteString(value, maxBytes);
}
function mailToken(value, maxCharacters) {
	if (typeof value !== "string" || value.length === 0 || value.trim() !== value || Array.from(value).length > maxCharacters || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) fail();
	return value;
}
function mailAddress(value) {
	if (typeof value !== "string") fail();
	const length = Array.from(value).length;
	if (length < 3 || length > 320 || !value.includes("@") || /[\s\u0000-\u001f\u007f-\u009f]/u.test(value)) fail();
	return value;
}
function mailAddresses(value) {
	if (!Array.isArray(value) || value.length > 100) fail();
	return value.map(mailAddress);
}
function mailTimestamp(value) {
	if (value === void 0) return void 0;
	const copied = remoteString(value, 64);
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(copied) || !Number.isFinite(Date.parse(copied))) fail();
	return copied;
}
function uint32(value) {
	if (!Number.isSafeInteger(value) || value < 0 || value > 4294967295) fail();
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") fail();
	return value;
}
function mailSummary(value) {
	const receivedAt = mailTimestamp(value.receivedAt);
	const sentAt = mailTimestamp(value.sentAt);
	const folder = value.folder === void 0 ? void 0 : mailToken(value.folder, 64);
	const preview = remoteOptionalString(value.preview, 4096);
	const attachmentCount = value.attachmentCount === void 0 ? void 0 : uint32(value.attachmentCount);
	return {
		id: mailToken(value.id, 2048),
		...folder === void 0 ? {} : { folder },
		from: mailAddresses(value.from),
		to: mailAddresses(value.to),
		cc: mailAddresses(value.cc),
		subject: remoteString(value.subject, 1024),
		subjectTruncated: boolean(value.subjectTruncated),
		...preview === void 0 ? {} : { preview },
		previewTruncated: boolean(value.previewTruncated),
		...receivedAt === void 0 ? {} : { receivedAt },
		...sentAt === void 0 ? {} : { sentAt },
		unread: boolean(value.unread),
		hasAttachments: boolean(value.hasAttachments),
		...attachmentCount === void 0 ? {} : { attachmentCount }
	};
}
function mailAttachment(value) {
	const fileName = remoteOptionalString(value.fileName, 512);
	const contentType = remoteOptionalString(value.contentType, 255);
	const sizeBytes = value.sizeBytes === void 0 ? void 0 : remoteString(value.sizeBytes, 20);
	if (sizeBytes !== void 0 && !/^(?:0|[1-9]\d*)$/u.test(sizeBytes)) fail();
	return {
		index: uint32(value.index),
		...fileName === void 0 ? {} : { fileName },
		...contentType === void 0 ? {} : { contentType },
		...sizeBytes === void 0 ? {} : { sizeBytes }
	};
}
function mailAccount(value) {
	const mailboxAddress = value.mailboxAddress === void 0 ? void 0 : mailAddress(value.mailboxAddress);
	const displayName = remoteOptionalString(value.displayName, 512);
	const status = remoteOptionalString(value.status, 128);
	return {
		...mailboxAddress === void 0 ? {} : { mailboxAddress },
		...displayName === void 0 ? {} : { displayName },
		...status === void 0 ? {} : { status }
	};
}
function mailInbox(value) {
	if (!Array.isArray(value.items) || value.items.length > 100) fail();
	const hasMore = boolean(value.hasMore);
	const nextOffset = value.nextOffset === void 0 ? void 0 : uint32(value.nextOffset);
	if (hasMore && nextOffset === void 0 || !hasMore && nextOffset !== void 0) fail();
	return {
		items: value.items.map(mailSummary),
		...nextOffset === void 0 ? {} : { nextOffset },
		hasMore
	};
}
function mailMessage(value) {
	if (!Array.isArray(value.attachments) || value.attachments.length > 100) fail();
	const bodyText = remoteOptionalString(value.bodyText, 65536);
	return {
		summary: mailSummary(value.summary),
		...bodyText === void 0 ? {} : { bodyText },
		bodyTruncated: boolean(value.bodyTruncated),
		hasHtmlBody: boolean(value.hasHtmlBody),
		attachments: value.attachments.map(mailAttachment)
	};
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
/** Provider-only protocol events are not part of the browser's text/attachment history contract. */
function displayableMessage(value) {
	return value.content.kind === "text" || value.content.kind === "attachment";
}
/** Copy one native page and brand its opaque cursor for the Host API. */
function page(value, copy) {
	return {
		items: value.items.map(copy),
		...value.nextCursor === void 0 ? {} : { nextCursor: String(value.nextCursor) },
		hasMore: value.hasMore
	};
}
function httpHeaders(headers) {
	return headers.map((header) => ({
		name: String(header.name),
		value: String(header.value)
	}));
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
					headers: response.headers.map((header) => ({
						name: header.name,
						value: header.value
					}))
				});
				return retry === null ? null : externalHttpAttempt(retry);
			} catch (error) {
				mapError(error);
			}
		}
	};
}
/** Adapt the Rust Node bridge to the frozen Host provider interface. */
var RustSdkAdapter = class {
	client;
	attachmentConversations = /* @__PURE__ */ new Map();
	disposal;
	listener;
	constructor(client) {
		this.client = Promise.resolve(client);
		this.listener = {
			syncNow: (reason) => this.listenerSyncNow(reason),
			startRealtime: () => this.listenerStartRealtime(),
			listConversations: (request) => this.listenerConversations(request),
			getHistory: (request) => this.listenerHistory(request),
			markConversationRead: (conversationId) => this.markConversationRead(conversationId),
			sendText: (request) => this.sendText(request)
		};
	}
	async run(operation, ambiguousSend = false) {
		try {
			return await operation(await this.client);
		} catch (error) {
			mapError(error, ambiguousSend);
		}
	}
	async displayableMessages(client, values) {
		const messages = values.filter(displayableMessage);
		const peers = [...new Set(messages.filter((message) => message.conversationKind === "group" && !message.outgoing && message.senderHandle === void 0 && message.senderDisplayName === void 0).map((message) => message.senderDid))];
		if (peers.length === 0) return [...messages];
		const profiles = await client.hydrateDisplayProfiles({ peers });
		const byDid = /* @__PURE__ */ new Map();
		for (const profile of profiles) if (profile.did !== void 0) byDid.set(profile.did, profile);
		return messages.map((message) => {
			const profile = byDid.get(message.senderDid);
			if (profile === void 0) return message;
			return {
				...message,
				...profile.handle === void 0 ? {} : { senderHandle: profile.handle },
				...profile.displayName === void 0 ? {} : { senderDisplayName: profile.displayName }
			};
		});
	}
	/**
	* Join the persisted Core peer-profile projection onto direct roster rows.
	* The conversation registry intentionally keeps routing identifiers separate
	* from display metadata, so a bare roster row may otherwise regress to a Handle.
	*/
	async displayableConversations(client, values) {
		const peers = [...new Set(values.filter((conversation) => conversation.kind === "direct" && conversation.peerDid !== void 0).map((conversation) => conversation.peerDid))];
		const profiles = peers.length === 0 ? [] : await client.hydrateDisplayProfiles({ peers });
		const byPeer = /* @__PURE__ */ new Map();
		for (const [index, profile] of profiles.entries()) {
			const requested = peers[index];
			if (requested !== void 0) byPeer.set(requested, profile);
			if (profile.did !== void 0) byPeer.set(profile.did, profile);
			if (profile.handle !== void 0) byPeer.set(profile.handle, profile);
		}
		return values.map((value) => this.conversation(value, value.kind === "direct" ? byPeer.get(value.peerDid ?? "") ?? byPeer.get(value.peerHandle ?? "") : void 0));
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
	conversation(value, profile) {
		const id = required(value.id);
		const displayName = profile?.displayName?.trim();
		const profileHandle = profile?.handle?.trim();
		const title = displayName === void 0 || displayName.length === 0 ? value.title?.trim() : displayName;
		const lastMessagePreview = preview(value.lastMessage);
		const common = {
			id,
			title: title === void 0 || title.length === 0 ? required(value.kind === "direct" ? value.peerHandle ?? value.peerDid : value.groupDid) : title,
			unreadCount: value.unreadCount,
			...value.lastMessageAt === void 0 ? {} : { lastMessageAt: timestamp(value.lastMessageAt) },
			...lastMessagePreview === void 0 ? {} : { lastMessagePreview }
		};
		if (value.lastMessage !== void 0 && displayableMessage(value.lastMessage)) this.message(value.lastMessage);
		switch (value.kind) {
			case "direct": return {
				kind: "direct",
				...common,
				peerDid: required(profile?.did ?? value.peerDid),
				...profileHandle === void 0 && value.peerHandle === void 0 ? {} : { peerHandle: required(profileHandle ?? value.peerHandle) },
				...displayName === void 0 || displayName.length === 0 ? {} : { displayName }
			};
			case "group": return {
				kind: "group",
				...common,
				groupDid: required(value.groupDid)
			};
			default: fail();
		}
	}
	createdGroup(value) {
		return {
			kind: "group",
			id: required(value.conversationId),
			groupDid: required(value.did),
			title: required(value.title),
			unreadCount: 0
		};
	}
	groupMember(value) {
		return {
			did: required(value.did),
			...value.handle === void 0 ? {} : { handle: value.handle }
		};
	}
	listenerConversation(value) {
		const common = {
			id: required(value.id),
			unreadCount: value.unreadCount,
			...value.lastMessageAt === void 0 ? {} : { lastMessageAt: timestamp(value.lastMessageAt) }
		};
		if (value.kind === "direct") return {
			kind: "direct",
			...common,
			peerDid: required(value.peerDid),
			...value.peerHandle === void 0 ? {} : { peerHandle: value.peerHandle }
		};
		return {
			kind: "group",
			...common
		};
	}
	listenerMessage(value) {
		const sentAt = value.sentAt === void 0 ? fail() : timestamp(value.sentAt);
		const common = {
			id: required(value.id),
			conversationId: required(value.conversationId),
			conversationKind: value.conversationKind,
			senderDid: required(value.senderDid),
			sentAt,
			outgoing: value.outgoing
		};
		return value.content.kind === "text" && value.content.text !== void 0 ? {
			...common,
			content: {
				kind: "text",
				text: required(value.content.text)
			}
		} : {
			...common,
			content: { kind: "ignored" }
		};
	}
	listenerSyncNow(reason) {
		return this.run(async (client) => {
			const result = await client.syncNow({ reason });
			if (result.status === "idle" || result.status === "changed") return;
			if (result.status === "auth_revoked") fail("forbidden");
			fail("network");
		});
	}
	listenerStartRealtime() {
		return this.run(async (client) => {
			const session = await client.startRealtime();
			return {
				nextEvent: () => this.run(() => session.nextEvent()),
				stop: () => this.run(() => session.stop())
			};
		});
	}
	listenerConversations(request) {
		return this.run(async (client) => page(await client.listConversations(request), (value) => this.listenerConversation(value)));
	}
	listenerHistory(request) {
		return this.run(async (client) => {
			const history = await client.getHistory({
				conversationId: String(request.conversationId),
				...request.cursor === void 0 ? {} : { cursor: String(request.cursor) },
				...request.limit === void 0 ? {} : { limit: request.limit }
			});
			return page({
				...history,
				items: [...history.items].reverse()
			}, (value) => this.listenerMessage(value));
		});
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
	prepareExternalHttpRequest(request) {
		return this.run(async (client) => externalHttpAttempt(await client.prepareExternalHttpRequest({
			url: request.url,
			method: request.method,
			headers: request.headers.map((header) => ({
				name: header.name,
				value: header.value
			})),
			...request.body === void 0 ? {} : { body: Uint8Array.from(request.body) }
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
	createGroup(name) {
		return this.run(async (client) => this.createdGroup(await client.createGroup({ name })));
	}
	addGroupMember(groupDid, member) {
		return this.run(async (client) => this.groupMember(await client.addGroupMember({
			groupDid: String(groupDid),
			member
		})));
	}
	listConversations(request) {
		return this.run(async (client) => {
			const conversations = await client.listConversations(request);
			return {
				...page(conversations, (value) => value),
				items: await this.displayableConversations(client, conversations.items)
			};
		});
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
				items: await this.displayableMessages(client, [...history.items].reverse())
			}, (value) => this.message(value));
		});
	}
	getLocalHistory(request) {
		return this.run(async (client) => {
			const history = await client.getLocalConversationTimeline({
				conversationId: String(request.conversationId),
				...request.cursor === void 0 ? {} : { cursor: String(request.cursor) },
				...request.limit === void 0 ? {} : { limit: request.limit }
			});
			return page({
				...history,
				items: await this.displayableMessages(client, [...history.items].reverse())
			}, (value) => this.message(value));
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
				...clientMessageId === void 0 ? {} : { clientMessageId },
				idempotencyKey: request.idempotencyKey
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
				...request.caption === void 0 ? {} : { caption: request.caption },
				...clientMessageId === void 0 ? {} : { clientMessageId },
				idempotencyKey: request.idempotencyKey
			}));
		});
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
	getMailAccount() {
		return this.run(async (client) => mailAccount(await client.getMailAccount()));
	}
	listMailInbox(request = {}) {
		return this.run(async (client) => mailInbox(await client.listMailInbox({
			...request.folder === void 0 ? {} : { folder: request.folder },
			...request.unreadOnly === void 0 ? {} : { unreadOnly: request.unreadOnly },
			...request.limit === void 0 ? {} : { limit: request.limit },
			...request.offset === void 0 ? {} : { offset: request.offset }
		})));
	}
	readMail(request) {
		return this.run(async (client) => mailMessage(await client.readMail(request.messageId)));
	}
	markMailRead(request) {
		return this.run(async (client) => {
			return { updated: uint32((await client.markMailRead({ messageIds: [...request.messageIds] })).updated) };
		});
	}
	sendMail(request) {
		return this.run(async (client) => {
			const value = await client.sendMail({
				to: [...request.to],
				...request.cc === void 0 ? {} : { cc: [...request.cc] },
				subject: request.subject,
				bodyText: request.bodyText
			});
			if (!Array.isArray(value.warnings) || value.warnings.length > 100) fail();
			const messageId = value.messageId === void 0 ? void 0 : mailToken(value.messageId, 2048);
			return {
				accepted: boolean(value.accepted),
				...messageId === void 0 ? {} : { messageId },
				warnings: value.warnings.map((warning) => remoteString(warning, 1024))
			};
		}, true);
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
