import { n as downloadedAttachment } from "./sdk-adapter-BBJ0CRJg.mjs";
import "@deepseek-ai/cordis";
import { homedir } from "node:os";
import { join } from "node:path";
import z from "@deepseek-ai/schemastery";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region lib/types/tools.js
/** Model-facing AWiki read and approved-send tools. */
/** Model tool that reads the public deployment identity. */
const AWIKI_IDENTITY_STATUS_TOOL = "awiki_identity_status";
/** Model tool that lists direct and existing group conversations. */
const AWIKI_LIST_CONVERSATIONS_TOOL = "awiki_list_conversations";
/** Model tool that reads one conversation history page. */
const AWIKI_HISTORY_TOOL = "awiki_history";
/** Model tool that sends an approved text message. */
const AWIKI_SEND_MESSAGE_TOOL = "awiki_send_message";
/** Model tool that sends one approved attachment. */
const AWIKI_SEND_ATTACHMENT_TOOL = "awiki_send_attachment";
const AWIKI_RESULT_OUTPUT = {
	schema: { type: "json" },
	render: (_args, value) => [{
		type: "text",
		text: JSON.stringify(value)
	}]
};
/** Derive the typed SDK target from schema-validated model arguments. */
function target(kind, value) {
	return kind === "direct" ? {
		kind,
		peer: value
	} : {
		kind,
		group: value
	};
}
/** Generic args-only card used by every AWiki tool. */
function present(title, kind, rawInput) {
	return {
		card: "generic",
		title,
		kind,
		...rawInput === void 0 ? {} : { rawInput }
	};
}
/** Project a DTO-only service result into the tool registry's JSON vocabulary. */
async function toolResult(pending) {
	return await pending;
}
/**
* Register all AWiki tools and their execution-time approval listener.
* @param ctx - owning effect scope carrying the tool registry.
* @param service - shared deployment AWiki service invoked by each tool.
*/
function registerAwikiTools(ctx, service) {
	ctx.on("tools/pre-execute", (exec, next) => {
		if (exec.name === "awiki_send_message") return Promise.resolve({
			kind: "ask",
			reason: "Send a text message through the deployment AWiki identity"
		});
		if (exec.name === "awiki_send_attachment") return Promise.resolve({
			kind: "ask",
			reason: "Send an attachment through the deployment AWiki identity"
		});
		return next();
	});
	ctx.effect(() => ctx.tools.register(defineTool({
		name: AWIKI_IDENTITY_STATUS_TOOL,
		description: "Return the deployment AWiki identity status. The result contains only the public handle and DID.",
		parameters: {},
		output: AWIKI_RESULT_OUTPUT,
		execute: () => toolResult(service.getIdentity()),
		presentCall: () => present("Read AWiki identity", "read")
	})), "awiki: identity tool");
	ctx.effect(() => ctx.tools.register(defineTool({
		name: AWIKI_LIST_CONVERSATIONS_TOOL,
		description: "List direct and existing group conversations for the deployment AWiki identity.",
		parameters: {
			cursor: {
				type: "string",
				description: "Opaque cursor returned by the preceding page."
			},
			limit: {
				type: "integer",
				description: "Positive number of conversations to request."
			}
		},
		output: AWIKI_RESULT_OUTPUT,
		execute: (args) => toolResult(service.listConversations({
			...args.cursor === void 0 ? {} : { cursor: args.cursor },
			...args.limit === void 0 ? {} : { limit: args.limit }
		})),
		presentCall: (args) => present("List AWiki conversations", "read", args)
	})), "awiki: conversation-list tool");
	ctx.effect(() => ctx.tools.register(defineTool({
		name: AWIKI_HISTORY_TOOL,
		description: "Read one direct or group AWiki conversation history page.",
		parameters: {
			conversation_id: {
				type: "string",
				required: true,
				description: "Conversation id from awiki_list_conversations."
			},
			cursor: {
				type: "string",
				description: "Opaque cursor returned by the preceding page."
			},
			limit: {
				type: "integer",
				description: "Positive number of messages to request."
			}
		},
		output: AWIKI_RESULT_OUTPUT,
		execute: (args) => toolResult(service.getHistory({
			conversationId: args.conversation_id,
			...args.cursor === void 0 ? {} : { cursor: args.cursor },
			...args.limit === void 0 ? {} : { limit: args.limit }
		})),
		presentCall: (args) => present("Read AWiki history", "read", { conversation_id: args.conversation_id })
	})), "awiki: history tool");
	ctx.effect(() => ctx.tools.register(defineTool({
		name: AWIKI_SEND_MESSAGE_TOOL,
		description: "Send one idempotent text message as the deployment AWiki identity. User approval is required.",
		parameters: {
			target_kind: {
				type: "string",
				enum: ["direct", "group"],
				required: true
			},
			target: {
				type: "string",
				required: true,
				description: "Peer handle/DID for direct, or existing group id/DID for group."
			},
			text: {
				type: "string",
				required: true
			},
			idempotency_key: {
				type: "string",
				required: true,
				description: "Stable unique key for safe retry of this exact send."
			}
		},
		output: AWIKI_RESULT_OUTPUT,
		execute: (args) => toolResult(service.sendText({
			target: target(args.target_kind, args.target),
			text: args.text,
			idempotencyKey: args.idempotency_key
		})),
		presentCall: (args) => present("Send AWiki message", "other", {
			target_kind: args.target_kind,
			target: args.target,
			text: args.text
		})
	})), "awiki: text-send tool");
	ctx.effect(() => ctx.tools.register(defineTool({
		name: AWIKI_SEND_ATTACHMENT_TOOL,
		description: "Upload and send one idempotent attachment as the deployment AWiki identity. User approval is required.",
		parameters: {
			target_kind: {
				type: "string",
				enum: ["direct", "group"],
				required: true
			},
			target: {
				type: "string",
				required: true,
				description: "Peer handle/DID for direct, or existing group id/DID for group."
			},
			file_name: {
				type: "string",
				required: true
			},
			mime_type: {
				type: "string",
				required: true
			},
			bytes_base64: {
				type: "string",
				required: true,
				description: "Canonical standard Base64 file bytes."
			},
			caption: { type: "string" },
			idempotency_key: {
				type: "string",
				required: true,
				description: "Stable unique key for safe retry of this exact send."
			}
		},
		output: AWIKI_RESULT_OUTPUT,
		execute: (args) => toolResult(service.sendAttachment({
			target: target(args.target_kind, args.target),
			fileName: args.file_name,
			mimeType: args.mime_type,
			bytesBase64: args.bytes_base64,
			...args.caption === void 0 ? {} : { caption: args.caption },
			idempotencyKey: args.idempotency_key
		})),
		presentCall: (args) => present("Send AWiki attachment", "other", {
			target_kind: args.target_kind,
			target: args.target,
			file_name: args.file_name,
			mime_type: args.mime_type,
			...args.caption === void 0 ? {} : { caption: args.caption }
		})
	})), "awiki: attachment-send tool");
}
//#endregion
//#region lib/types/domain.js
/** Client-safe AWiki Handle provider domain constants and validation. */
/** Default Handle provider domain for new AWiki deployments. */
const DEFAULT_AWIKI_DOMAIN = "awiki.ai";
/** Field carrying the Handle provider domain in the AWiki settings namespace. */
const AWIKI_DOMAIN_FIELD = "domain";
/** Settings namespace owned by the AWiki plugin. */
const AWIKI_SETTINGS_NAMESPACE = "awiki";
/** Normalize and validate one DNS provider domain. */
function normalizeAwikiDomain(raw, field = "domain") {
	const value = raw.trim().toLowerCase();
	const valid = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(value);
	if (value.length > 253 || !valid) throw new TypeError(`awiki: ${field} must contain a valid DNS domain`);
	return value;
}
//#endregion
//#region lib/types/settings.js
/** Durable AWiki settings shared by the Host service and browser settings page. */
/** Durable AWiki schema exposed through the DSH settings service. */
const AwikiSettingsSchema = z.object({ [AWIKI_DOMAIN_FIELD]: z.string().default(DEFAULT_AWIKI_DOMAIN) });
/** Reject settings values that cannot be consumed as canonical domains. */
function validateAwikiSettings(value) {
	if (normalizeAwikiDomain(value.domain) !== value.domain) throw new TypeError("awiki: domain must be lowercase and must not contain surrounding whitespace");
}
//#endregion
//#region lib/types/index.js
/** Unified AWiki identity, messaging, attachment, Remote, and model-tool service. */
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) {
			if (kind === "field") initializers.unshift(_);
			else descriptor[key] = _;
		}
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/** Default maximum attachment size: 10 MiB. */
const DEFAULT_ATTACHMENT_MAX_BYTES = 10485760;
/** Default browser polling interval while the AWiki drawer is open. */
const DEFAULT_POLL_INTERVAL_MS = 3e3;
/** Default AWiki production service origin. */
const DEFAULT_AWIKI_SERVICE_URL = "https://awiki.ai";
/** Default authoritative AWiki message-service DID. */
const DEFAULT_AWIKI_MESSAGE_SERVICE_DID = "did:wba:awiki.ai";
/** Loader schema for the Host deployment configuration. */
const Config = z.object({
	userServiceUrl: z.string().default(DEFAULT_AWIKI_SERVICE_URL),
	userServiceDomain: z.string().default(DEFAULT_AWIKI_DOMAIN),
	messageServiceUrl: z.string().default(DEFAULT_AWIKI_SERVICE_URL),
	messageServicePublicUrl: z.string().default(DEFAULT_AWIKI_SERVICE_URL),
	messageServiceDid: z.string().default(DEFAULT_AWIKI_MESSAGE_SERVICE_DID),
	allowedAttachmentOrigins: z.array(z.string()).default([]),
	allowInsecureLoopbackForTesting: z.boolean().default(false),
	statePath: z.string(),
	attachmentMaxBytes: z.number().default(DEFAULT_ATTACHMENT_MAX_BYTES),
	pollIntervalMs: z.number().default(DEFAULT_POLL_INTERVAL_MS)
});
const FAILURE_CODES = /* @__PURE__ */ new Set([
	"not-registered",
	"already-registered",
	"invalid-request",
	"invalid-otp",
	"challenge-expired",
	"handle-unavailable",
	"not-found",
	"forbidden",
	"conflict",
	"rate-limited",
	"attachment-too-large",
	"network",
	"remote"
]);
const FAILURE_MESSAGES = {
	"not-registered": "No AWiki identity is registered for this deployment.",
	"already-registered": "This deployment already has an AWiki identity.",
	"invalid-request": "The AWiki request is invalid.",
	"invalid-otp": "The AWiki verification code is invalid.",
	"challenge-expired": "The AWiki verification challenge expired.",
	"handle-unavailable": "The requested AWiki handle is unavailable.",
	"not-found": "The requested AWiki resource was not found.",
	"forbidden": "The AWiki operation is not permitted.",
	"conflict": "The AWiki operation conflicts with current state.",
	"rate-limited": "The AWiki service rate-limited the request.",
	"attachment-too-large": "The attachment exceeds this deployment's size limit.",
	"network": "The AWiki service could not be reached.",
	"remote": "The AWiki service rejected the operation."
};
var ProviderUnavailableError = class extends Error {};
/** Validate and preserve one SDK service URL without accepting insecure remote HTTP. */
function serviceUrl(field, raw, allowInsecureLoopbackForTesting) {
	let url;
	try {
		url = new URL(raw);
	} catch (cause) {
		throw new TypeError(`awiki: ${field} must be an absolute HTTP(S) URL`, { cause });
	}
	const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
	if (url.protocol !== "https:" && !(allowInsecureLoopbackForTesting && url.protocol === "http:" && loopback)) throw new TypeError(`awiki: ${field} must use HTTPS unless test-only loopback HTTP is enabled`);
	if (url.username !== "" || url.password !== "" || url.hash !== "") throw new TypeError(`awiki: ${field} must not contain credentials or a URL fragment`);
	return raw;
}
/** Validate a provider domain without inferring it from an API endpoint. */
function serviceDomain(raw, field = "userServiceDomain") {
	return normalizeAwikiDomain(raw, field);
}
/** Validate an explicit DID used as the message-service authority. */
function serviceDid(raw) {
	const value = raw.trim();
	if (!value.startsWith("did:wba:") || value !== `did:wba:${serviceDomain(value.slice(8), "messageServiceDid")}`) throw new TypeError("awiki: messageServiceDid must be a bare-domain did:wba DID");
	return value;
}
/** Resolve an exact attachment origin allowlist without accepting paths or credentials. */
function attachmentOrigins(raw, messageServicePublicUrl, allowInsecureLoopbackForTesting) {
	const origins = (raw === void 0 || raw.length === 0 ? [new URL(messageServicePublicUrl).origin] : raw).map((value) => {
		const normalized = serviceUrl("allowedAttachmentOrigins entry", value, allowInsecureLoopbackForTesting);
		const url = new URL(normalized);
		if (url.origin !== normalized || url.pathname !== "/" || url.search !== "") throw new TypeError("awiki: each allowedAttachmentOrigins entry must be an exact origin without a path or query");
		return url.origin;
	});
	if (new Set(origins).size !== origins.length) throw new TypeError("awiki: allowedAttachmentOrigins must not contain duplicates");
	return origins;
}
/** Resolve and validate every deployment choice before publishing the service. */
function resolveConfig(config) {
	const allowInsecureLoopbackForTesting = config.allowInsecureLoopbackForTesting ?? false;
	const configuredStatePath = config.statePath?.trim();
	const configuredDshHome = process.env.DSH_HOME?.trim();
	const statePath = configuredStatePath === void 0 || configuredStatePath.length === 0 ? join(configuredDshHome === void 0 || configuredDshHome.length === 0 ? join(homedir(), ".dsh") : configuredDshHome, "awiki", "identity.json") : configuredStatePath;
	if (statePath.length === 0) throw new TypeError("awiki: statePath must be non-empty");
	const attachmentMaxBytes = config.attachmentMaxBytes ?? 10485760;
	if (!Number.isSafeInteger(attachmentMaxBytes) || attachmentMaxBytes < 1) throw new TypeError("awiki: attachmentMaxBytes must be a positive safe integer");
	const pollIntervalMs = config.pollIntervalMs ?? 3e3;
	if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 1e3 || pollIntervalMs > 6e4) throw new TypeError("awiki: pollIntervalMs must be a safe integer from 1000 through 60000");
	const userServiceUrl = serviceUrl("userServiceUrl", config.userServiceUrl ?? "https://awiki.ai", allowInsecureLoopbackForTesting);
	const messageServiceUrl = serviceUrl("messageServiceUrl", config.messageServiceUrl ?? "https://awiki.ai", allowInsecureLoopbackForTesting);
	const messageServicePublicUrl = serviceUrl("messageServicePublicUrl", config.messageServicePublicUrl ?? "https://awiki.ai", allowInsecureLoopbackForTesting);
	return {
		userServiceUrl,
		userServiceDomain: serviceDomain(config.userServiceDomain ?? "awiki.ai"),
		messageServiceUrl,
		messageServicePublicUrl,
		messageServiceDid: serviceDid(config.messageServiceDid ?? "did:wba:awiki.ai"),
		allowedAttachmentOrigins: attachmentOrigins(config.allowedAttachmentOrigins, messageServicePublicUrl, allowInsecureLoopbackForTesting),
		allowInsecureLoopbackForTesting,
		statePath,
		attachmentMaxBytes,
		pollIntervalMs
	};
}
/** Return a public, fixed-message failure without retaining a thrown value. */
function failure(code) {
	return {
		code,
		message: FAILURE_MESSAGES[code]
	};
}
/** Normalize SDK and provider failures without returning remote bodies, credentials, or causes. */
function normalizeFailure(error) {
	if (error instanceof ProviderUnavailableError) return {
		code: "remote",
		message: "AWiki client provider is unavailable."
	};
	try {
		if (typeof error === "object" && error !== null) {
			const sdkFailure = error;
			const name = sdkFailure.name;
			const code = sdkFailure.code;
			if (name === "AwikiImError" && typeof code === "string" && FAILURE_CODES.has(code)) return failure(code);
		}
	} catch {}
	return failure("remote");
}
/** Decode canonical standard Base64 after enforcing its complete decoded-byte cap. */
function decodeAttachment(bytesBase64, maxBytes) {
	const maxEncoded = Math.ceil(maxBytes / 3) * 4;
	if (bytesBase64.length > maxEncoded) return {
		ok: false,
		error: failure("attachment-too-large")
	};
	if (bytesBase64.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(bytesBase64)) return {
		ok: false,
		error: failure("invalid-request")
	};
	const bytes = Uint8Array.from(Buffer.from(bytesBase64, "base64"));
	if (bytes.byteLength > maxBytes) return {
		ok: false,
		error: failure("attachment-too-large")
	};
	if (Buffer.from(bytes).toString("base64") !== bytesBase64) return {
		ok: false,
		error: failure("invalid-request")
	};
	return {
		ok: true,
		value: bytes
	};
}
/** Deployment-wide AWiki service over one replaceable TypeScript client provider. */
let AwikiService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _getConfig_decorators;
	let _getIdentity_decorators;
	let _sendRegistrationOtp_decorators;
	let _registerIdentity_decorators;
	let _updateDisplayName_decorators;
	let _resolvePeer_decorators;
	let _listConversations_decorators;
	let _getHistory_decorators;
	let _markConversationRead_decorators;
	let _sendText_decorators;
	let _sendAttachment_decorators;
	let _downloadAttachment_decorators;
	return class AwikiService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_getConfig_decorators = [Remote];
			_getIdentity_decorators = [Remote];
			_sendRegistrationOtp_decorators = [Remote];
			_registerIdentity_decorators = [Remote];
			_updateDisplayName_decorators = [Remote];
			_resolvePeer_decorators = [Remote];
			_listConversations_decorators = [Remote];
			_getHistory_decorators = [Remote];
			_markConversationRead_decorators = [Remote];
			_sendText_decorators = [Remote];
			_sendAttachment_decorators = [Remote];
			_downloadAttachment_decorators = [Remote];
			__esDecorate(this, null, _getConfig_decorators, {
				kind: "method",
				name: "getConfig",
				static: false,
				private: false,
				access: {
					has: (obj) => "getConfig" in obj,
					get: (obj) => obj.getConfig
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _getIdentity_decorators, {
				kind: "method",
				name: "getIdentity",
				static: false,
				private: false,
				access: {
					has: (obj) => "getIdentity" in obj,
					get: (obj) => obj.getIdentity
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _sendRegistrationOtp_decorators, {
				kind: "method",
				name: "sendRegistrationOtp",
				static: false,
				private: false,
				access: {
					has: (obj) => "sendRegistrationOtp" in obj,
					get: (obj) => obj.sendRegistrationOtp
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _registerIdentity_decorators, {
				kind: "method",
				name: "registerIdentity",
				static: false,
				private: false,
				access: {
					has: (obj) => "registerIdentity" in obj,
					get: (obj) => obj.registerIdentity
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _updateDisplayName_decorators, {
				kind: "method",
				name: "updateDisplayName",
				static: false,
				private: false,
				access: {
					has: (obj) => "updateDisplayName" in obj,
					get: (obj) => obj.updateDisplayName
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _resolvePeer_decorators, {
				kind: "method",
				name: "resolvePeer",
				static: false,
				private: false,
				access: {
					has: (obj) => "resolvePeer" in obj,
					get: (obj) => obj.resolvePeer
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _listConversations_decorators, {
				kind: "method",
				name: "listConversations",
				static: false,
				private: false,
				access: {
					has: (obj) => "listConversations" in obj,
					get: (obj) => obj.listConversations
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _getHistory_decorators, {
				kind: "method",
				name: "getHistory",
				static: false,
				private: false,
				access: {
					has: (obj) => "getHistory" in obj,
					get: (obj) => obj.getHistory
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _markConversationRead_decorators, {
				kind: "method",
				name: "markConversationRead",
				static: false,
				private: false,
				access: {
					has: (obj) => "markConversationRead" in obj,
					get: (obj) => obj.markConversationRead
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _sendText_decorators, {
				kind: "method",
				name: "sendText",
				static: false,
				private: false,
				access: {
					has: (obj) => "sendText" in obj,
					get: (obj) => obj.sendText
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _sendAttachment_decorators, {
				kind: "method",
				name: "sendAttachment",
				static: false,
				private: false,
				access: {
					has: (obj) => "sendAttachment" in obj,
					get: (obj) => obj.sendAttachment
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _downloadAttachment_decorators, {
				kind: "method",
				name: "downloadAttachment",
				static: false,
				private: false,
				access: {
					has: (obj) => "downloadAttachment" in obj,
					get: (obj) => obj.downloadAttachment
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = ["tools"];
		static Config = Config;
		resolved = __runInitializers(this, _instanceExtraInitializers);
		startupUserServiceDomain;
		provider;
		/**
		* @param ctx - owning Host context.
		* @param config - service endpoints, SDK state path, and public limits.
		*/
		constructor(ctx, config) {
			super(ctx, "awiki");
			this.resolved = resolveConfig(config);
			this.startupUserServiceDomain = this.resolved.userServiceDomain;
			ctx.inject(["settings"], (settingsCtx) => {
				const settingsScope = settingsCtx.settings.register(settingsNamespace(AWIKI_SETTINGS_NAMESPACE), AwikiSettingsSchema, {
					base: { domain: this.resolved.userServiceDomain },
					applies: "restart",
					validate: validateAwikiSettings
				});
				this.startupUserServiceDomain = settingsScope.get().domain;
				settingsCtx.effect(() => () => {
					this.startupUserServiceDomain = this.resolved.userServiceDomain;
				}, "awiki: release settings namespace");
			});
			registerAwikiTools(ctx, this);
			ctx.effect(() => async () => {
				const provider = this.provider;
				if (provider !== void 0) await this.disposeProvider(provider);
			}, "awiki: dispose current client provider");
		}
		/**
		* Register the deployment's sole client factory. The caller must return the
		* resulting disposer from its own `ctx.effect`; disposal clears the slot
		* before awaiting the client's quiescence and is idempotent.
		* @param factory - synchronous factory for one owned high-level client.
		* @returns asynchronous disposer for the exact registered client.
		*/
		registerClientFactory(factory) {
			if (this.provider !== void 0) throw new Error("awiki: a client provider is already registered");
			const provider = { client: factory({
				userServiceUrl: this.resolved.userServiceUrl,
				userServiceDomain: this.startupUserServiceDomain,
				messageServiceUrl: this.resolved.messageServiceUrl,
				messageServicePublicUrl: this.resolved.messageServicePublicUrl,
				messageServiceDid: this.resolved.messageServiceDid,
				allowedAttachmentOrigins: this.resolved.allowedAttachmentOrigins,
				attachmentMaxBytes: this.resolved.attachmentMaxBytes,
				allowInsecureLoopbackForTesting: this.resolved.allowInsecureLoopbackForTesting,
				statePath: this.resolved.statePath
			}) };
			this.provider = provider;
			return () => this.disposeProvider(provider);
		}
		/**
		* Read settings needed by the browser presentation.
		* @returns Browser-safe polling configuration without SDK endpoints or state paths.
		*/
		getConfig() {
			return Promise.resolve({
				ok: true,
				value: {
					pollIntervalMs: this.resolved.pollIntervalMs,
					attachmentMaxBytes: this.resolved.attachmentMaxBytes
				}
			});
		}
		/**
		* Read the deployment's identity status.
		* @returns The public deployment identity or `null`.
		*/
		getIdentity() {
			return this.run((client) => client.getIdentity());
		}
		/**
		* Send one Legacy registration verification code.
		* @param request - Handle and phone used for the registration challenge.
		* @returns Public retry timing or a closed failure.
		*/
		sendRegistrationOtp(request) {
			return this.run((client) => client.sendRegistrationOtp(request));
		}
		/**
		* Register and persist the deployment's only AWiki identity.
		* @param request - Handle, phone, and verification code for registration.
		* @returns The new public identity or a closed failure.
		*/
		registerIdentity(request) {
			return this.run((client) => client.registerIdentity(request));
		}
		/**
		* Update the deployment identity's public WNS display name.
		* @param request - replacement display name selected by the user.
		* @returns The updated public identity or a closed failure.
		*/
		updateDisplayName(request) {
			return this.run((client) => client.updateDisplayName(request));
		}
		/**
		* Resolve one Handle or DID before the browser opens a direct chat.
		* @param request - typed Handle or DID.
		* @returns The public peer and conversation id, or a closed failure.
		*/
		resolvePeer(request) {
			return this.run((client) => client.resolvePeer(request.peer));
		}
		/**
		* List direct and existing group conversations.
		* @param request - Optional opaque cursor and page limit.
		* @returns One page of direct and existing group conversations.
		*/
		listConversations(request) {
			return this.run((client) => client.listConversations(request));
		}
		/**
		* Read one direct or group conversation history page.
		* @param request - Conversation id, optional cursor, and page limit.
		* @returns One chronological history page.
		*/
		getHistory(request) {
			return this.run((client) => client.getHistory(request));
		}
		/**
		* Mark every currently unread inbox message in one conversation as read.
		* @param request - conversation whose current inbox entries should be acknowledged.
		* @returns Number of inbox entries acknowledged by the Message Service.
		*/
		markConversationRead(request) {
			return this.run((client) => client.markConversationRead(request.conversationId));
		}
		/**
		* Send one text message through the deployment identity.
		* @param request - Target, text, and idempotency key.
		* @returns The accepted public message or a closed failure.
		*/
		sendText(request) {
			return this.run((client) => client.sendText(request));
		}
		/**
		* Upload and send one attachment after Host validation.
		* @param request - Target, attachment metadata and Base64 bytes, caption, and idempotency key.
		* @returns The accepted attachment message or a closed failure.
		*/
		async sendAttachment(request) {
			const decoded = decodeAttachment(request.bytesBase64, this.resolved.attachmentMaxBytes);
			if (!decoded.ok) return decoded;
			return this.run((client) => client.sendAttachment({
				target: request.target,
				attachment: {
					fileName: request.fileName,
					mimeType: request.mimeType,
					bytes: decoded.value
				},
				...request.caption === void 0 ? {} : { caption: request.caption },
				idempotencyKey: request.idempotencyKey
			}), { skipAttachmentByteValidation: true });
		}
		/**
		* Download and encode one provider-verified attachment.
		* @param request - Containing message id and attachment id.
		* @returns Verified public metadata and canonical Base64 bytes, or a closed failure.
		*/
		async downloadAttachment(request) {
			const result = await this.run((client) => client.downloadAttachment(request), { skipAttachmentByteValidation: true });
			if (!result.ok) return result;
			if (result.value.bytes.byteLength > this.resolved.attachmentMaxBytes) return {
				ok: false,
				error: failure("attachment-too-large")
			};
			if (result.value.bytes.byteLength !== result.value.attachment.size) return {
				ok: false,
				error: failure("remote")
			};
			return {
				ok: true,
				value: downloadedAttachment(result.value)
			};
		}
		/** Invoke the current client and normalize every rejection to a public result. */
		async run(operation, options = {}) {
			try {
				const provider = this.provider;
				if (provider === void 0) throw new ProviderUnavailableError();
				const value = await operation(provider.client);
				if (options.skipAttachmentByteValidation !== true && containsUnexpectedBinary(value, /* @__PURE__ */ new Set())) return {
					ok: false,
					error: failure("remote")
				};
				return {
					ok: true,
					value
				};
			} catch (error) {
				return {
					ok: false,
					error: normalizeFailure(error)
				};
			}
		}
		/** Clear one exact provider slot before joining its one shared disposal. */
		disposeProvider(provider) {
			if (this.provider === provider) this.provider = void 0;
			provider.disposal ??= provider.client.dispose();
			return provider.disposal;
		}
	};
})();
/** Reject SDK values that could leak raw bytes through a supposedly public DTO. */
function containsUnexpectedBinary(value, seen) {
	if (value instanceof Uint8Array) return true;
	if (typeof value !== "object" || value === null) return false;
	if (seen.has(value)) return false;
	seen.add(value);
	for (const child of Object.values(value)) if (containsUnexpectedBinary(child, seen)) return true;
	return false;
}
//#endregion
export { AWIKI_DOMAIN_FIELD, AWIKI_HISTORY_TOOL, AWIKI_IDENTITY_STATUS_TOOL, AWIKI_LIST_CONVERSATIONS_TOOL, AWIKI_SEND_ATTACHMENT_TOOL, AWIKI_SEND_MESSAGE_TOOL, AWIKI_SETTINGS_NAMESPACE, AwikiService, AwikiService as default, AwikiSettingsSchema, Config, DEFAULT_ATTACHMENT_MAX_BYTES, DEFAULT_AWIKI_DOMAIN, DEFAULT_AWIKI_MESSAGE_SERVICE_DID, DEFAULT_AWIKI_SERVICE_URL, DEFAULT_POLL_INTERVAL_MS, normalizeAwikiDomain, validateAwikiSettings };
