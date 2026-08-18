import { n as downloadedAttachment } from "./sdk-adapter-DK6RqV-c.mjs";
import "@deepseek-ai/cordis";
import { homedir } from "node:os";
import { join } from "node:path";
import z from "@deepseek-ai/schemastery";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { SettingsConflictError, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { chmod, lstat, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
//#region lib/types/types.js
/** Client-safe AWiki service and Remote data types. */
/** Exact browser acknowledgement required before locally signing out. */
const AWIKI_LOGOUT_CONFIRMATION = "logout-awiki-session";
/** Exact browser acknowledgement required before destructive local-state removal. */
const AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION = "clear-awiki-local-data";
//#endregion
//#region lib/types/external-http-auth.js
/** Host-only dispatcher for externally transported ANP-authenticated HTTP. */
const AWIKI_EXTERNAL_HTTP_MAX_BODY_BYTES = 4194304;
const MANAGED_HEADERS = [
	"authorization",
	"signature-input",
	"signature",
	"content-digest"
];
const ERROR_MESSAGES = {
	"not-registered": "A registered AWiki identity is required.",
	"signed-out": "This installation is signed out of AWiki.",
	"invalid-request": "The external HTTP request is invalid.",
	"unsupported-body": "The external HTTP request body cannot be replayed safely.",
	"body-too-large": "The external HTTP request body exceeds 4 MiB.",
	"auth-state-unavailable": "AWiki external HTTP authentication is unavailable."
};
/** Stable Host-only failure without request, response, credential, or path detail. */
var AwikiExternalHttpAuthError = class extends Error {
	code;
	name = "AwikiExternalHttpAuthError";
	constructor(code) {
		super(ERROR_MESSAGES[code]);
		this.code = code;
	}
};
function createAwikiExternalHttpAuth(acquire) {
	return Object.freeze({ async dispatch(request, transport) {
		validateDispatchInput(request, transport);
		const session = await acquire();
		await session.assertActive();
		const body = await readReplayableBody(request);
		await session.assertActive();
		let attempt;
		try {
			attempt = await session.client.prepareExternalHttpRequest({
				url: request.url,
				method: request.method,
				headers: requestHeaders(request),
				...body === void 0 ? {} : { body }
			});
		} catch (error) {
			throw mapProviderError(error);
		}
		await session.assertActive();
		const response = await transport(authenticatedRequest(request, body, attempt));
		const retry = await handleResponseWithoutChangingCompletedRequest(attempt, response);
		if (retry === null) return response;
		try {
			await session.assertActive();
		} catch {
			return response;
		}
		const retriedResponse = await transport(authenticatedRequest(request, body, retry));
		await handleResponseWithoutChangingCompletedRequest(retry, retriedResponse);
		return retriedResponse;
	} });
}
function externalHttpAuthError(code) {
	return new AwikiExternalHttpAuthError(code);
}
function mapProviderError(error) {
	if (error instanceof AwikiExternalHttpAuthError) return error;
	try {
		if (typeof error === "object" && error !== null) {
			const value = error;
			if (value.name === "AwikiSdkError") {
				if (value.code === "not-registered") return externalHttpAuthError("not-registered");
				if (value.code === "invalid-request") return externalHttpAuthError("invalid-request");
			}
		}
	} catch {}
	return externalHttpAuthError("auth-state-unavailable");
}
function validateDispatchInput(request, transport) {
	if (!(request instanceof Request) || typeof transport !== "function" || request.bodyUsed) throw externalHttpAuthError("invalid-request");
	for (const name of MANAGED_HEADERS) if (request.headers.has(name)) throw externalHttpAuthError("invalid-request");
}
async function readReplayableBody(request) {
	if (request.body === null) return void 0;
	let clone;
	try {
		clone = request.clone();
	} catch {
		throw externalHttpAuthError("unsupported-body");
	}
	const stream = clone.body;
	if (stream === null) return /* @__PURE__ */ new Uint8Array();
	const reader = stream.getReader();
	const chunks = [];
	let length = 0;
	try {
		while (true) {
			const result = await reader.read();
			if (result.done) break;
			length += result.value.byteLength;
			if (length > 4194304) {
				reader.cancel().catch(() => {});
				request.body?.cancel().catch(() => {});
				throw externalHttpAuthError("body-too-large");
			}
			chunks.push(Uint8Array.from(result.value));
		}
	} catch (error) {
		if (error instanceof AwikiExternalHttpAuthError) throw error;
		throw externalHttpAuthError("unsupported-body");
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}
function requestHeaders(request) {
	return [...request.headers].map(([name, value]) => ({
		name,
		value
	}));
}
function authenticatedRequest(original, body, attempt) {
	const headers = new Headers(original.headers);
	for (const header of attempt.headerPatch) headers.set(header.name, header.value);
	const init = {
		method: attempt.method,
		headers,
		redirect: "manual",
		signal: original.signal,
		cache: original.cache,
		credentials: original.credentials,
		integrity: original.integrity,
		keepalive: original.keepalive,
		mode: original.mode,
		referrer: original.referrer,
		referrerPolicy: original.referrerPolicy,
		...body === void 0 ? {} : { body: Uint8Array.from(body) }
	};
	try {
		return new Request(attempt.targetUrl, init);
	} catch {
		throw externalHttpAuthError("invalid-request");
	}
}
async function handleResponseWithoutChangingCompletedRequest(attempt, response) {
	try {
		return await attempt.handleResponse(responseMetadata(response));
	} catch {
		return null;
	}
}
function responseMetadata(response) {
	const headers = [];
	for (const name of [
		"authentication-info",
		"www-authenticate",
		"accept-signature"
	]) {
		const value = response.headers.get(name);
		if (value !== null) headers.push({
			name,
			value
		});
	}
	return {
		statusCode: response.status,
		headers
	};
}
//#endregion
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
//#region lib/types/settings-rpc-contract.js
/** Dedicated Connection channel; the Host registers it with loopback authority. */
const AWIKI_SETTINGS_RPC_CHANNEL = "/awiki-settings";
/** Supported channel-relative operations. */
const AWIKI_SETTINGS_RPC_ENDPOINTS = {
	describe: "describe",
	setDomain: "set-domain",
	resetDomain: "reset-domain"
};
//#endregion
//#region lib/types/settings-rpc.js
/** Loopback-only Host transport for AWiki's durable plugin settings. */
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function expectedRevision(payload) {
	if (!isRecord(payload) || !Number.isSafeInteger(payload.expectedRevision) || payload.expectedRevision < 0) return;
	return payload.expectedRevision;
}
function sanitizeLayer(value) {
	if (!isRecord(value)) return void 0;
	if (!Object.hasOwn(value, "domain")) return {};
	if (typeof value["domain"] !== "string") return void 0;
	const domain = normalizeAwikiDomain(value[AWIKI_DOMAIN_FIELD]);
	if (domain !== value["domain"]) return void 0;
	return { domain };
}
function view(provider) {
	const descriptor = provider.describe({ redactSecrets: true }).find((candidate) => candidate.ns === AWIKI_SETTINGS_NAMESPACE);
	if (descriptor === void 0 || !isRecord(descriptor.value) || typeof descriptor.value.domain !== "string") return;
	const domain = normalizeAwikiDomain(descriptor.value.domain);
	if (domain !== descriptor.value.domain) return void 0;
	const base = descriptor.base === void 0 ? void 0 : sanitizeLayer(descriptor.base);
	const user = descriptor.user === void 0 ? void 0 : sanitizeLayer(descriptor.user);
	if (descriptor.base !== void 0 && base === void 0 || descriptor.user !== void 0 && user === void 0) return void 0;
	return {
		value: { domain },
		...base === void 0 ? {} : { base },
		...user === void 0 ? {} : { user },
		revision: descriptor.revision,
		writable: provider.writable
	};
}
function unavailable() {
	return {
		ok: false,
		error: {
			code: "settings-rejected",
			message: "AWiki settings are unavailable in this Host composition.",
			details: { ns: AWIKI_SETTINGS_NAMESPACE }
		}
	};
}
function badRequest() {
	return {
		ok: false,
		error: {
			code: "bad-request",
			message: "The AWiki settings request is invalid.",
			details: { issues: [] }
		}
	};
}
function cancelled() {
	return {
		ok: false,
		error: {
			code: "cancelled",
			message: "The AWiki settings request was cancelled.",
			details: {}
		}
	};
}
/** Build a handler whose provider lookup remains correct across Cordis reinjection. */
function createAwikiSettingsRpcHandler(getProvider) {
	return async (endpoint, payload, signal) => {
		if (signal.aborted) return cancelled();
		const provider = getProvider();
		if (provider === void 0) return unavailable();
		if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.describe) {
			if (!isRecord(payload)) return badRequest();
			const current = view(provider);
			return current === void 0 ? unavailable() : {
				ok: true,
				value: current
			};
		}
		const revision = expectedRevision(payload);
		if (revision === void 0) return badRequest();
		let operation;
		if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain) {
			if (!isRecord(payload) || typeof payload.domain !== "string") return badRequest();
			let domain;
			try {
				domain = normalizeAwikiDomain(payload.domain);
			} catch {
				return badRequest();
			}
			if (domain !== payload.domain) return badRequest();
			operation = {
				op: "set",
				path: [AWIKI_DOMAIN_FIELD],
				value: domain
			};
		} else if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.resetDomain) operation = {
			op: "unset",
			path: [AWIKI_DOMAIN_FIELD]
		};
		else return badRequest();
		try {
			await provider.mutate(settingsNamespace(AWIKI_SETTINGS_NAMESPACE), [operation], revision);
			const current = view(provider);
			return current === void 0 ? unavailable() : {
				ok: true,
				value: current
			};
		} catch (cause) {
			if (cause instanceof SettingsConflictError) return {
				ok: false,
				error: {
					code: "settings-conflict",
					message: "AWiki settings changed in another client.",
					details: {
						ns: AWIKI_SETTINGS_NAMESPACE,
						expected: cause.expected,
						actual: cause.actual
					}
				}
			};
			return {
				ok: false,
				error: {
					code: "settings-rejected",
					message: "The Host rejected the AWiki settings change.",
					details: { ns: AWIKI_SETTINGS_NAMESPACE }
				}
			};
		}
	};
}
//#endregion
//#region lib/types/session.js
const SIGNED_OUT_MARKER = "signed-out-v1\n";
/** Persist only the local session lock; identity and SecretVault data remain SDK-owned. */
var AwikiSessionStore = class {
	hostDirectory;
	markerPath;
	constructor(stateRoot) {
		this.hostDirectory = join(stateRoot, ".host");
		this.markerPath = join(this.hostDirectory, "signed-out");
	}
	/** Return whether this installation was explicitly signed out. */
	async isSignedOut() {
		if (!await this.hasPrivateHostDirectory()) return false;
		try {
			const metadata = await lstat(this.markerPath);
			if (!metadata.isFile() || metadata.isSymbolicLink()) throw new TypeError("awiki: local session marker is invalid");
			if (await readFile(this.markerPath, "utf8") !== SIGNED_OUT_MARKER) throw new TypeError("awiki: local session marker is invalid");
			return true;
		} catch (error) {
			if (isMissing(error)) return false;
			throw error;
		}
	}
	/** Lock this installation without modifying the persisted identity. */
	async signOut() {
		await mkdir(this.hostDirectory, {
			recursive: true,
			mode: 448
		});
		await this.hasPrivateHostDirectory();
		await chmod(this.hostDirectory, 448);
		try {
			await writeFile(this.markerPath, SIGNED_OUT_MARKER, {
				flag: "wx",
				mode: 384
			});
		} catch (error) {
			if (!isFileExists(error) || !await this.isSignedOut()) throw error;
		}
		await chmod(this.markerPath, 384);
	}
	/** Unlock this installation while retaining every SDK-owned file. */
	async signIn() {
		try {
			await unlink(this.markerPath);
		} catch (error) {
			if (!isMissing(error)) throw error;
		}
	}
	async hasPrivateHostDirectory() {
		try {
			const directory = await lstat(this.hostDirectory);
			if (!directory.isDirectory() || directory.isSymbolicLink()) throw new TypeError("awiki: local session directory is invalid");
			return true;
		} catch (error) {
			if (isMissing(error)) return false;
			throw error;
		}
	}
};
function isMissing(error) {
	return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
function isFileExists(error) {
	return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
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
/** Host-owned model input cap after message minimization. */
const DEFAULT_SUMMARY_MAX_INPUT_BYTES = 32768;
/** Hard limit for one user-triggered conversation summary. */
const MAX_SUMMARY_MESSAGES = 50;
/** Loader schema for the Host deployment configuration. */
const Config = z.object({
	userServiceUrl: z.string().default(DEFAULT_AWIKI_SERVICE_URL),
	userServiceDomain: z.string().default(DEFAULT_AWIKI_DOMAIN),
	messageServiceUrl: z.string().default(DEFAULT_AWIKI_SERVICE_URL),
	messageServicePublicUrl: z.string().default(DEFAULT_AWIKI_SERVICE_URL),
	messageServiceDid: z.string().default(DEFAULT_AWIKI_MESSAGE_SERVICE_DID),
	allowedAttachmentOrigins: z.array(z.string()).default([]),
	allowInsecureLoopbackForTesting: z.boolean().default(false),
	stateRoot: z.string(),
	attachmentMaxBytes: z.number().default(DEFAULT_ATTACHMENT_MAX_BYTES),
	pollIntervalMs: z.number().default(DEFAULT_POLL_INTERVAL_MS),
	summaryMaxInputBytes: z.number().default(DEFAULT_SUMMARY_MAX_INPUT_BYTES)
});
const FAILURE_CODES = /* @__PURE__ */ new Set([
	"not-registered",
	"signed-out",
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
	"summary-unavailable",
	"summary-timeout",
	"summary-cancelled",
	"summary-invalid-output",
	"summary-failed",
	"network",
	"remote"
]);
const FAILURE_MESSAGES = {
	"not-registered": "No AWiki identity is registered for this deployment.",
	"signed-out": "This installation is signed out of AWiki.",
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
	"summary-unavailable": "AI summary is unavailable. Check the current default model configuration.",
	"summary-timeout": "AI summary timed out. Try again.",
	"summary-cancelled": "AI summary was cancelled. Try again.",
	"summary-invalid-output": "The model returned an invalid summary. Try again.",
	"summary-failed": "AI summary could not be generated. Try again.",
	"network": "The AWiki service could not be reached.",
	"remote": "The AWiki service rejected the operation."
};
var ProviderUnavailableError = class extends Error {};
var SummaryProviderUnavailableError = class extends Error {};
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
	const configuredStateRoot = config.stateRoot?.trim();
	const configuredDshHome = process.env.DSH_HOME?.trim();
	const stateRoot = configuredStateRoot === void 0 || configuredStateRoot.length === 0 ? join(configuredDshHome === void 0 || configuredDshHome.length === 0 ? join(homedir(), ".dsh") : configuredDshHome, "awiki", "im-core") : configuredStateRoot;
	if (stateRoot.length === 0) throw new TypeError("awiki: stateRoot must be non-empty");
	const attachmentMaxBytes = config.attachmentMaxBytes ?? 10485760;
	if (!Number.isSafeInteger(attachmentMaxBytes) || attachmentMaxBytes < 1) throw new TypeError("awiki: attachmentMaxBytes must be a positive safe integer");
	const pollIntervalMs = config.pollIntervalMs ?? 3e3;
	if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 1e3 || pollIntervalMs > 6e4) throw new TypeError("awiki: pollIntervalMs must be a safe integer from 1000 through 60000");
	const summaryMaxInputBytes = config.summaryMaxInputBytes ?? 32768;
	if (!Number.isSafeInteger(summaryMaxInputBytes) || summaryMaxInputBytes < 1024) throw new TypeError("awiki: summaryMaxInputBytes must be a safe integer of at least 1024");
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
		stateRoot,
		attachmentMaxBytes,
		pollIntervalMs,
		summaryMaxInputBytes
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
			if ((name === "AwikiImError" || name === "AwikiSdkError") && typeof code === "string" && FAILURE_CODES.has(code)) return failure(code);
		}
	} catch {}
	return failure("remote");
}
/** Normalize summary-provider failures without returning prompts, model output, routes, or causes. */
function normalizeSummaryFailure(error) {
	if (error instanceof SummaryProviderUnavailableError) return failure("summary-unavailable");
	try {
		if (typeof error === "object" && error !== null && Reflect.get(error, "name") === "AwikiSummaryProviderError") switch (Reflect.get(error, "code")) {
			case "route-unavailable": return failure("summary-unavailable");
			case "timeout": return failure("summary-timeout");
			case "cancelled": return failure("summary-cancelled");
			case "truncated":
			case "tool-call":
			case "empty-output":
			case "invalid-output": return failure("summary-invalid-output");
			default: return failure("summary-failed");
		}
	} catch {}
	return failure("summary-failed");
}
/** Bound one untrusted display string before it can consume the shared model budget. */
function boundedText(value, maxCharacters, fallback = "") {
	const text = value?.trim() ?? fallback;
	return Array.from(text).slice(0, maxCharacters).join("");
}
/** Remove routing identifiers, attachment ids, hashes, and all binary fields from one message. */
function minimizeSummaryMessage(message) {
	const sender = boundedText(message.senderDisplayName ?? message.senderHandle, 50, message.outgoing ? "我" : "对方");
	const base = {
		id: message.id,
		sender,
		outgoing: message.outgoing,
		sentAt: new Date(message.sentAt).toISOString()
	};
	if (message.content.kind === "text") return {
		...base,
		content: {
			kind: "text",
			text: boundedText(message.content.text, 4e3)
		}
	};
	return {
		...base,
		content: {
			kind: "attachment",
			fileName: boundedText(message.content.attachment.fileName, 120, "attachment"),
			mimeType: boundedText(message.content.attachment.mimeType, 80, "application/octet-stream"),
			size: message.content.attachment.size,
			...message.content.caption === void 0 ? {} : { caption: boundedText(message.content.caption, 1e3) }
		}
	};
}
function summaryBytes(messages) {
	return Buffer.byteLength(JSON.stringify(messages), "utf8");
}
/** Fit one newest oversized message by shortening only its text or caption. */
function fitNewestSummaryMessage(message, maxBytes) {
	if (summaryBytes([message]) <= maxBytes) return message;
	const original = message.content.kind === "text" ? message.content.text : message.content.caption;
	if (original === void 0) return void 0;
	const characters = Array.from(original);
	let low = 0;
	let high = characters.length;
	let fitted;
	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		const shortened = characters.slice(0, middle).join("");
		const candidate = message.content.kind === "text" ? {
			...message,
			content: {
				...message.content,
				text: shortened
			}
		} : {
			...message,
			content: {
				...message.content,
				caption: shortened
			}
		};
		if (summaryBytes([candidate]) <= maxBytes) {
			fitted = candidate;
			low = middle + 1;
		} else high = middle - 1;
	}
	return fitted;
}
/** Preserve the newest contiguous range while enforcing the exact UTF-8 JSON budget. */
function cropSummaryMessages(messages, maxBytes) {
	const selected = [];
	let truncated = false;
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message === void 0) continue;
		if (summaryBytes([message, ...selected]) <= maxBytes) {
			selected.unshift(message);
			continue;
		}
		truncated = true;
		if (selected.length === 0) {
			const fitted = fitNewestSummaryMessage(message, maxBytes);
			if (fitted !== void 0) selected.unshift(fitted);
		}
		break;
	}
	return {
		messages: selected,
		truncated
	};
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
/** Deployment-wide AWiki service over one replaceable high-level client provider. */
let AwikiService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _getConfig_decorators;
	let _getIdentity_decorators;
	let _getSession_decorators;
	let _logout_decorators;
	let _login_decorators;
	let _sendRegistrationOtp_decorators;
	let _registerIdentity_decorators;
	let _updateDisplayName_decorators;
	let _resolvePeer_decorators;
	let _listConversations_decorators;
	let _getHistory_decorators;
	let _summarizeConversation_decorators;
	let _markConversationRead_decorators;
	let _sendText_decorators;
	let _sendAttachment_decorators;
	let _downloadAttachment_decorators;
	let _clearLocalData_decorators;
	return class AwikiService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_getConfig_decorators = [Remote];
			_getIdentity_decorators = [Remote];
			_getSession_decorators = [Remote];
			_logout_decorators = [Remote];
			_login_decorators = [Remote];
			_sendRegistrationOtp_decorators = [Remote];
			_registerIdentity_decorators = [Remote];
			_updateDisplayName_decorators = [Remote];
			_resolvePeer_decorators = [Remote];
			_listConversations_decorators = [Remote];
			_getHistory_decorators = [Remote];
			_summarizeConversation_decorators = [Remote];
			_markConversationRead_decorators = [Remote];
			_sendText_decorators = [Remote];
			_sendAttachment_decorators = [Remote];
			_downloadAttachment_decorators = [Remote];
			_clearLocalData_decorators = [Remote];
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
			__esDecorate(this, null, _getSession_decorators, {
				kind: "method",
				name: "getSession",
				static: false,
				private: false,
				access: {
					has: (obj) => "getSession" in obj,
					get: (obj) => obj.getSession
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _logout_decorators, {
				kind: "method",
				name: "logout",
				static: false,
				private: false,
				access: {
					has: (obj) => "logout" in obj,
					get: (obj) => obj.logout
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _login_decorators, {
				kind: "method",
				name: "login",
				static: false,
				private: false,
				access: {
					has: (obj) => "login" in obj,
					get: (obj) => obj.login
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
			__esDecorate(this, null, _summarizeConversation_decorators, {
				kind: "method",
				name: "summarizeConversation",
				static: false,
				private: false,
				access: {
					has: (obj) => "summarizeConversation" in obj,
					get: (obj) => obj.summarizeConversation
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
			__esDecorate(this, null, _clearLocalData_decorators, {
				kind: "method",
				name: "clearLocalData",
				static: false,
				private: false,
				access: {
					has: (obj) => "clearLocalData" in obj,
					get: (obj) => obj.clearLocalData
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
		sessionStore;
		startupUserServiceDomain;
		settingsProvider;
		provider;
		signedOut;
		sessionMutation = Promise.resolve();
		sessionRevision = 0;
		activeSummaryRequests = /* @__PURE__ */ new Set();
		summaryProvider;
		hostContext;
		/** Trusted same-process external HTTP authentication dispatcher. Never Remote. */
		externalHttpAuth;
		/**
		* @param ctx - owning Host context.
		* @param config - service endpoints, SDK state path, and public limits.
		*/
		constructor(ctx, config) {
			super(ctx, "awiki");
			this.hostContext = ctx;
			this.resolved = resolveConfig(config);
			this.externalHttpAuth = createAwikiExternalHttpAuth(() => this.acquireExternalHttpAuthSession());
			this.sessionStore = new AwikiSessionStore(this.resolved.stateRoot);
			this.startupUserServiceDomain = this.resolved.userServiceDomain;
			ctx.inject(["settings"], (settingsCtx) => {
				const provider = settingsCtx.settings;
				const settingsScope = settingsCtx.settings.register(settingsNamespace(AWIKI_SETTINGS_NAMESPACE), AwikiSettingsSchema, {
					base: { domain: this.resolved.userServiceDomain },
					applies: "restart",
					validate: validateAwikiSettings
				});
				this.settingsProvider = provider;
				this.startupUserServiceDomain = settingsScope.get().domain;
				settingsCtx.effect(() => () => {
					if (this.settingsProvider === provider) {
						this.settingsProvider = void 0;
						this.startupUserServiceDomain = this.resolved.userServiceDomain;
					}
				}, "awiki: release settings namespace");
			});
			ctx.inject(["connection"], (connectionCtx) => {
				connectionCtx.connection.rpc.handle(AWIKI_SETTINGS_RPC_CHANNEL, createAwikiSettingsRpcHandler(() => this.settingsProvider), { authority: "loopback" });
			});
			registerAwikiTools(ctx, this);
			ctx.effect(() => async () => {
				const provider = this.provider;
				if (provider !== void 0) await this.disposeProvider(provider);
			}, "awiki: dispose current client provider");
			ctx.effect(() => () => {
				this.summaryProvider = void 0;
			}, "awiki: clear summary provider");
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
				stateRoot: this.resolved.stateRoot
			}) };
			this.provider = provider;
			return () => this.disposeProvider(provider);
		}
		/** Register one replaceable conversation-summary provider for this deployment. */
		registerSummaryProvider(provider) {
			if (this.summaryProvider !== void 0) throw new Error("awiki: a summary provider is already registered");
			this.summaryProvider = provider;
			let active = true;
			return () => {
				if (!active) return;
				active = false;
				if (this.summaryProvider === provider) this.summaryProvider = void 0;
			};
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
		/** Return the local registration and sign-in state without exposing secrets. */
		async getSession() {
			if (await this.isSignedOut()) return {
				ok: true,
				value: { status: "signed-out" }
			};
			const identity = await this.run((client) => client.getIdentity(), { allowSignedOut: true });
			if (!identity.ok) return identity;
			return identity.value === null ? {
				ok: true,
				value: { status: "unregistered" }
			} : {
				ok: true,
				value: {
					status: "active",
					identity: identity.value
				}
			};
		}
		/** Lock this installation while preserving the encrypted identity and local database. */
		logout(request) {
			if (request?.confirmation !== "logout-awiki-session") return Promise.resolve({
				ok: false,
				error: failure("invalid-request")
			});
			return this.mutateSession(async () => {
				if (await this.isSignedOut()) return {
					ok: true,
					value: { status: "signed-out" }
				};
				const identity = await this.run((client) => client.getIdentity(), { allowSignedOut: true });
				if (!identity.ok) return identity;
				if (identity.value === null) return {
					ok: false,
					error: failure("not-registered")
				};
				try {
					await this.sessionStore.signOut();
					this.signedOut = true;
					this.invalidateSummaries();
					const session = { status: "signed-out" };
					this.publishSession(session);
					return {
						ok: true,
						value: session
					};
				} catch {
					return {
						ok: false,
						error: failure("remote")
					};
				}
			});
		}
		/** Resume the same locally preserved identity without registration. */
		login() {
			return this.mutateSession(async () => {
				const identity = await this.run((client) => client.getIdentity(), { allowSignedOut: true });
				if (!identity.ok) return identity;
				if (identity.value === null) return {
					ok: false,
					error: failure("not-registered")
				};
				try {
					await this.sessionStore.signIn();
					this.signedOut = false;
					this.invalidateSummaries();
					const session = {
						status: "active",
						identity: identity.value
					};
					this.publishSession(session);
					return {
						ok: true,
						value: session
					};
				} catch {
					return {
						ok: false,
						error: failure("remote")
					};
				}
			});
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
		async registerIdentity(request) {
			const result = await this.run((client) => client.registerIdentity(request));
			if (result.ok) this.publishSession({
				status: "active",
				identity: result.value
			});
			return result;
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
		* Read real AWiki history, enforce range and byte caps, then invoke the configured model once.
		* @param request - selected conversation and its unread snapshot at open time.
		* @returns a structured summary plus the exact summarized source range.
		*/
		async summarizeConversation(request) {
			if (typeof request?.conversationId !== "string" || request.conversationId.length === 0) return {
				ok: false,
				error: failure("invalid-request")
			};
			if (request.unreadCountAtOpen !== void 0 && (!Number.isSafeInteger(request.unreadCountAtOpen) || request.unreadCountAtOpen < 0)) return {
				ok: false,
				error: failure("invalid-request")
			};
			try {
				if (await this.isSignedOut()) return {
					ok: false,
					error: failure("signed-out")
				};
			} catch {
				return {
					ok: false,
					error: failure("remote")
				};
			}
			const sessionRevision = this.sessionRevision;
			const provider = this.summaryProvider;
			if (provider === void 0) return {
				ok: false,
				error: normalizeSummaryFailure(new SummaryProviderUnavailableError())
			};
			const historyResult = await this.run((client) => client.getHistory({
				conversationId: request.conversationId,
				limit: 50
			}));
			if (!historyResult.ok) return historyResult;
			if (this.sessionRevision !== sessionRevision) return {
				ok: false,
				error: failure("summary-cancelled")
			};
			const history = historyResult.value;
			if (history.items.some((message) => message.conversationId !== request.conversationId)) return {
				ok: false,
				error: failure("remote")
			};
			const unread = request.unreadCountAtOpen ?? 0;
			const rangeKind = unread > 0 ? "unread" : "recent";
			const requestedCount = rangeKind === "unread" ? unread : 50;
			const bounded = history.items.slice(-Math.min(requestedCount, 50));
			const cropped = cropSummaryMessages(bounded.map(minimizeSummaryMessage), this.resolved.summaryMaxInputBytes);
			if (cropped.messages.length === 0) return {
				ok: false,
				error: failure("summary-failed")
			};
			const controller = new AbortController();
			this.activeSummaryRequests.add(controller);
			let summary;
			try {
				summary = await provider.summarize({
					messages: cropped.messages,
					signal: controller.signal
				});
			} catch (error) {
				return {
					ok: false,
					error: normalizeSummaryFailure(error)
				};
			} finally {
				this.activeSummaryRequests.delete(controller);
			}
			if (this.sessionRevision !== sessionRevision) return {
				ok: false,
				error: failure("summary-cancelled")
			};
			const first = cropped.messages[0];
			const last = cropped.messages.at(-1);
			if (first === void 0 || last === void 0) return {
				ok: false,
				error: failure("summary-failed")
			};
			const sourceById = new Map(bounded.map((message) => [message.id, message]));
			const firstSource = sourceById.get(first.id);
			const lastSource = sourceById.get(last.id);
			if (firstSource === void 0 || lastSource === void 0) return {
				ok: false,
				error: failure("remote")
			};
			return {
				ok: true,
				value: {
					range: {
						kind: rangeKind,
						messageCount: cropped.messages.length,
						firstMessageId: first.id,
						lastMessageId: last.id,
						startedAt: firstSource.sentAt,
						endedAt: lastSource.sentAt,
						truncated: history.hasMore || history.items.length > 50 || requestedCount > 50 || cropped.truncated
					},
					highlights: summary.highlights,
					conclusions: summary.conclusions,
					todos: summary.todos
				}
			};
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
		/**
		* Permanently remove the exact SDK-owned local state after an explicit browser acknowledgement.
		* The remote AWiki account and Handle are not deleted.
		* @param request - exact destructive-action marker emitted only after the UI's second confirmation.
		* @returns Whether a persisted state file existed when the reset completed.
		*/
		clearLocalData(request) {
			if (request?.confirmation !== "clear-awiki-local-data") return Promise.resolve({
				ok: false,
				error: failure("invalid-request")
			});
			return this.mutateSession(async () => {
				const result = await this.run((client) => client.clearLocalData(), { allowSignedOut: true });
				if (!result.ok) return result;
				try {
					await this.sessionStore.signIn();
					this.signedOut = false;
					this.invalidateSummaries();
					this.publishSession({ status: "unregistered" });
					return result;
				} catch {
					return {
						ok: false,
						error: failure("remote")
					};
				}
			});
		}
		/** Invalidate cached session work and cancel every model request still owned by the old session. */
		invalidateSummaries() {
			this.sessionRevision += 1;
			for (const controller of this.activeSummaryRequests) controller.abort();
			this.activeSummaryRequests.clear();
		}
		/** Publish a committed session transition to same-process Host consumers. */
		publishSession(session) {
			this.hostContext.emit("awiki/session", session);
		}
		/** Invoke the current client and normalize every rejection to a public result. */
		async run(operation, options = {}) {
			try {
				if (options.allowSignedOut !== true && await this.isSignedOut()) return {
					ok: false,
					error: failure("signed-out")
				};
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
		/** Read and cache the private Host-owned session marker. */
		async isSignedOut() {
			this.signedOut ??= await this.sessionStore.isSignedOut();
			return this.signedOut;
		}
		/** Bind one external-auth dispatch to the current provider and session revision. */
		async acquireExternalHttpAuthSession() {
			let signedOut;
			try {
				signedOut = await this.isSignedOut();
			} catch {
				throw externalHttpAuthError("auth-state-unavailable");
			}
			if (signedOut) throw externalHttpAuthError("signed-out");
			const revision = this.sessionRevision;
			const provider = this.provider;
			if (provider === void 0) throw externalHttpAuthError("auth-state-unavailable");
			let identity;
			try {
				identity = await provider.client.getIdentity();
			} catch (error) {
				throw mapProviderError(error);
			}
			if (identity === null) throw externalHttpAuthError("not-registered");
			return {
				client: provider.client,
				assertActive: async () => {
					if (this.provider !== provider || this.sessionRevision !== revision) throw externalHttpAuthError("auth-state-unavailable");
					try {
						if (await this.isSignedOut()) throw externalHttpAuthError("signed-out");
					} catch (error) {
						if (error instanceof AwikiExternalHttpAuthError) throw error;
						throw externalHttpAuthError("auth-state-unavailable");
					}
				}
			};
		}
		/** Serialize sign-in, sign-out, and destructive clear transitions. */
		mutateSession(operation) {
			const pending = this.sessionMutation.then(operation, operation);
			this.sessionMutation = pending.then(() => void 0, () => void 0);
			return pending;
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
export { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_DOMAIN_FIELD, AWIKI_EXTERNAL_HTTP_MAX_BODY_BYTES, AWIKI_HISTORY_TOOL, AWIKI_IDENTITY_STATUS_TOOL, AWIKI_LIST_CONVERSATIONS_TOOL, AWIKI_LOGOUT_CONFIRMATION, AWIKI_SEND_ATTACHMENT_TOOL, AWIKI_SEND_MESSAGE_TOOL, AWIKI_SETTINGS_NAMESPACE, AwikiExternalHttpAuthError, AwikiService, AwikiService as default, AwikiSettingsSchema, Config, DEFAULT_ATTACHMENT_MAX_BYTES, DEFAULT_AWIKI_DOMAIN, DEFAULT_AWIKI_MESSAGE_SERVICE_DID, DEFAULT_AWIKI_SERVICE_URL, DEFAULT_POLL_INTERVAL_MS, DEFAULT_SUMMARY_MAX_INPUT_BYTES, MAX_SUMMARY_MESSAGES, normalizeAwikiDomain, validateAwikiSettings };
