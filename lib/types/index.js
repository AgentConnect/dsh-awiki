/** Unified AWiki identity, messaging, attachment, Remote, and model-tool service. */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { Context } from '@deepseek-ai/cordis';
import { homedir } from 'node:os';
import { join } from 'node:path';
import z from '@deepseek-ai/schemastery';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import { SessionId } from '@deepseek-ai/dsh-session';
import { resolveSessionPreset } from '@deepseek-ai/dsh-agent-presets';
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from "./types.js";
import { AwikiExternalHttpAuthError, createAwikiExternalHttpAuth, externalHttpAuthError, mapProviderError as mapExternalHttpProviderError, } from "./external-http-auth.js";
import { AwikiSdkError, downloadedAttachment } from "./sdk-adapter.js";
import { registerAwikiTools } from "./tools.js";
import { AwikiSettingsSchema, validateAwikiSettings, } from "./settings.js";
import { AWIKI_SETTINGS_NAMESPACE, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain } from "./domain.js";
import { AWIKI_SETTINGS_RPC_CHANNEL } from "./settings-rpc-contract.js";
import { createAwikiSettingsRpcHandler } from "./settings-rpc.js";
import { AwikiSessionStore } from "./session.js";
import { AwikiAgentBindingStore } from "./agent-bindings.js";
export { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from "./types.js";
export { AWIKI_EXTERNAL_HTTP_MAX_BODY_BYTES, AwikiExternalHttpAuthError, } from "./external-http-auth.js";
export { AWIKI_DOMAIN_FIELD, AWIKI_SETTINGS_NAMESPACE, AwikiSettingsSchema, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain, validateAwikiSettings, } from "./settings.js";
export { AWIKI_AGENT_IDENTITY_ATTACH_TOOL, AWIKI_AGENT_IDENTITY_CREATE_TOOL, AWIKI_AGENT_IDENTITY_LIST_TOOL, AWIKI_HISTORY_TOOL, AWIKI_IDENTITY_STATUS_TOOL, AWIKI_LIST_CONVERSATIONS_TOOL, AWIKI_SEND_ATTACHMENT_TOOL, AWIKI_SEND_MESSAGE_TOOL, } from "./tools.js";
/** Default maximum attachment size: 10 MiB. */
export const DEFAULT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
/** Default browser polling interval while the AWiki drawer is open. */
export const DEFAULT_POLL_INTERVAL_MS = 3_000;
/** Default AWiki production service origin. */
export const DEFAULT_AWIKI_SERVICE_URL = 'https://awiki.ai';
/** Default authoritative AWiki message-service DID. */
export const DEFAULT_AWIKI_MESSAGE_SERVICE_DID = 'did:wba:awiki.ai';
/** Host-owned model input cap after message minimization. */
export const DEFAULT_SUMMARY_MAX_INPUT_BYTES = 32 * 1024;
/** Hard limit for one user-triggered conversation summary. */
export const MAX_SUMMARY_MESSAGES = 50;
/** Loader schema for the Host deployment configuration. */
export const Config = z.object({
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
    summaryMaxInputBytes: z.number().default(DEFAULT_SUMMARY_MAX_INPUT_BYTES),
});
const FAILURE_CODES = new Set([
    'not-registered',
    'signed-out',
    'already-registered',
    'invalid-request',
    'invalid-otp',
    'challenge-expired',
    'handle-unavailable',
    'not-found',
    'forbidden',
    'conflict',
    'rate-limited',
    'provision-cleanup-failed',
    'agent-group-unsupported',
    'attachment-too-large',
    'summary-unavailable',
    'summary-timeout',
    'summary-cancelled',
    'summary-invalid-output',
    'summary-failed',
    'network',
    'remote',
]);
const FAILURE_MESSAGES = {
    'not-registered': 'No AWiki identity is registered for this deployment.',
    'signed-out': 'This installation is signed out of AWiki.',
    'already-registered': 'This deployment already has an AWiki identity.',
    'invalid-request': 'The AWiki request is invalid.',
    'invalid-otp': 'The AWiki verification code is invalid.',
    'challenge-expired': 'The AWiki verification challenge expired.',
    'handle-unavailable': 'The requested AWiki handle is unavailable.',
    'not-found': 'The requested AWiki resource was not found.',
    'forbidden': 'The AWiki operation is not permitted.',
    'conflict': 'The AWiki operation conflicts with current state.',
    'rate-limited': 'The AWiki service rate-limited the request.',
    'provision-cleanup-failed': 'AWiki could not release a temporary Agent registration slot. Wait before retrying.',
    'agent-group-unsupported': 'Agent identities support direct messages only in this version.',
    'attachment-too-large': 'The attachment exceeds this deployment\'s size limit.',
    'summary-unavailable': 'AI summary is unavailable. Check the current default model configuration.',
    'summary-timeout': 'AI summary timed out. Try again.',
    'summary-cancelled': 'AI summary was cancelled. Try again.',
    'summary-invalid-output': 'The model returned an invalid summary. Try again.',
    'summary-failed': 'AI summary could not be generated. Try again.',
    'network': 'The AWiki service could not be reached.',
    'remote': 'The AWiki service rejected the operation.',
};
class ProviderUnavailableError extends Error {
}
class SummaryProviderUnavailableError extends Error {
}
/** Validate and preserve one SDK service URL without accepting insecure remote HTTP. */
function serviceUrl(field, raw, allowInsecureLoopbackForTesting) {
    let url;
    try {
        url = new URL(raw);
    }
    catch (cause) {
        throw new TypeError(`awiki: ${field} must be an absolute HTTP(S) URL`, { cause });
    }
    const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    if (url.protocol !== 'https:' && !(allowInsecureLoopbackForTesting && url.protocol === 'http:' && loopback)) {
        throw new TypeError(`awiki: ${field} must use HTTPS unless test-only loopback HTTP is enabled`);
    }
    if (url.username !== '' || url.password !== '' || url.hash !== '') {
        throw new TypeError(`awiki: ${field} must not contain credentials or a URL fragment`);
    }
    return raw;
}
/** Validate a provider domain without inferring it from an API endpoint. */
function serviceDomain(raw, field = 'userServiceDomain') {
    return normalizeAwikiDomain(raw, field);
}
/** Validate an explicit DID used as the message-service authority. */
function serviceDid(raw) {
    const value = raw.trim();
    if (!value.startsWith('did:wba:') || value !== `did:wba:${serviceDomain(value.slice('did:wba:'.length), 'messageServiceDid')}`) {
        throw new TypeError('awiki: messageServiceDid must be a bare-domain did:wba DID');
    }
    return value;
}
/** Resolve an exact attachment origin allowlist without accepting paths or credentials. */
function attachmentOrigins(raw, messageServicePublicUrl, allowInsecureLoopbackForTesting) {
    const values = raw === undefined || raw.length === 0 ? [new URL(messageServicePublicUrl).origin] : raw;
    const origins = values.map((value) => {
        const normalized = serviceUrl('allowedAttachmentOrigins entry', value, allowInsecureLoopbackForTesting);
        const url = new URL(normalized);
        if (url.origin !== normalized || url.pathname !== '/' || url.search !== '') {
            throw new TypeError('awiki: each allowedAttachmentOrigins entry must be an exact origin without a path or query');
        }
        return url.origin;
    });
    if (new Set(origins).size !== origins.length) {
        throw new TypeError('awiki: allowedAttachmentOrigins must not contain duplicates');
    }
    return origins;
}
/** Resolve and validate every deployment choice before publishing the service. */
function resolveConfig(config) {
    const allowInsecureLoopbackForTesting = config.allowInsecureLoopbackForTesting ?? false;
    const configuredStateRoot = config.stateRoot?.trim();
    const configuredDshHome = process.env.DSH_HOME?.trim();
    const stateRoot = configuredStateRoot === undefined || configuredStateRoot.length === 0
        ? join(configuredDshHome === undefined || configuredDshHome.length === 0 ? join(homedir(), '.dsh') : configuredDshHome, 'awiki', 'im-core')
        : configuredStateRoot;
    if (stateRoot.length === 0)
        throw new TypeError('awiki: stateRoot must be non-empty');
    const attachmentMaxBytes = config.attachmentMaxBytes ?? DEFAULT_ATTACHMENT_MAX_BYTES;
    if (!Number.isSafeInteger(attachmentMaxBytes) || attachmentMaxBytes < 1) {
        throw new TypeError('awiki: attachmentMaxBytes must be a positive safe integer');
    }
    const pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 1_000 || pollIntervalMs > 60_000) {
        throw new TypeError('awiki: pollIntervalMs must be a safe integer from 1000 through 60000');
    }
    const summaryMaxInputBytes = config.summaryMaxInputBytes ?? DEFAULT_SUMMARY_MAX_INPUT_BYTES;
    if (!Number.isSafeInteger(summaryMaxInputBytes) || summaryMaxInputBytes < 1_024) {
        throw new TypeError('awiki: summaryMaxInputBytes must be a safe integer of at least 1024');
    }
    const userServiceUrl = serviceUrl('userServiceUrl', config.userServiceUrl ?? DEFAULT_AWIKI_SERVICE_URL, allowInsecureLoopbackForTesting);
    const messageServiceUrl = serviceUrl('messageServiceUrl', config.messageServiceUrl ?? DEFAULT_AWIKI_SERVICE_URL, allowInsecureLoopbackForTesting);
    const messageServicePublicUrl = serviceUrl('messageServicePublicUrl', config.messageServicePublicUrl ?? DEFAULT_AWIKI_SERVICE_URL, allowInsecureLoopbackForTesting);
    return {
        userServiceUrl,
        userServiceDomain: serviceDomain(config.userServiceDomain ?? DEFAULT_AWIKI_DOMAIN),
        messageServiceUrl,
        messageServicePublicUrl,
        messageServiceDid: serviceDid(config.messageServiceDid ?? DEFAULT_AWIKI_MESSAGE_SERVICE_DID),
        allowedAttachmentOrigins: attachmentOrigins(config.allowedAttachmentOrigins, messageServicePublicUrl, allowInsecureLoopbackForTesting),
        allowInsecureLoopbackForTesting,
        stateRoot,
        attachmentMaxBytes,
        pollIntervalMs,
        summaryMaxInputBytes,
    };
}
/** Return a public, fixed-message failure without retaining a thrown value. */
function failure(code) {
    return { code, message: FAILURE_MESSAGES[code] };
}
/** Normalize SDK and provider failures without returning remote bodies, credentials, or causes. */
function normalizeFailure(error) {
    if (error instanceof ProviderUnavailableError) {
        return { code: 'remote', message: 'AWiki client provider is unavailable.' };
    }
    try {
        if (typeof error === 'object' && error !== null) {
            const sdkFailure = error;
            const name = sdkFailure.name;
            const code = sdkFailure.code;
            if ((name === 'AwikiImError' || name === 'AwikiSdkError') && typeof code === 'string' && FAILURE_CODES.has(code)) {
                return failure(code);
            }
        }
    }
    catch {
        // Provider errors cross the external SDK boundary. Hostile property access
        // is indistinguishable from an unknown remote failure and exposes nothing.
    }
    return failure('remote');
}
/** Normalize summary-provider failures without returning prompts, model output, routes, or causes. */
function normalizeSummaryFailure(error) {
    if (error instanceof SummaryProviderUnavailableError)
        return failure('summary-unavailable');
    try {
        if (typeof error === 'object' && error !== null && Reflect.get(error, 'name') === 'AwikiSummaryProviderError') {
            switch (Reflect.get(error, 'code')) {
                case 'route-unavailable': return failure('summary-unavailable');
                case 'timeout': return failure('summary-timeout');
                case 'cancelled': return failure('summary-cancelled');
                case 'truncated':
                case 'tool-call':
                case 'empty-output':
                case 'invalid-output': return failure('summary-invalid-output');
                default: return failure('summary-failed');
            }
        }
    }
    catch {
        // Hostile provider errors collapse to one fixed public summary failure.
    }
    return failure('summary-failed');
}
/** Bound one untrusted display string before it can consume the shared model budget. */
function boundedText(value, maxCharacters, fallback = '') {
    const text = value?.trim() ?? fallback;
    return Array.from(text).slice(0, maxCharacters).join('');
}
/** Remove routing identifiers, attachment ids, hashes, and all binary fields from one message. */
function minimizeSummaryMessage(message) {
    const sender = boundedText(message.senderDisplayName ?? message.senderHandle, 50, message.outgoing ? '我' : '对方');
    const base = {
        id: message.id,
        sender,
        outgoing: message.outgoing,
        sentAt: new Date(message.sentAt).toISOString(),
    };
    if (message.content.kind === 'text') {
        return {
            ...base,
            content: { kind: 'text', text: boundedText(message.content.text, 4_000) },
        };
    }
    return {
        ...base,
        content: {
            kind: 'attachment',
            fileName: boundedText(message.content.attachment.fileName, 120, 'attachment'),
            mimeType: boundedText(message.content.attachment.mimeType, 80, 'application/octet-stream'),
            size: message.content.attachment.size,
            ...(message.content.caption === undefined
                ? {}
                : { caption: boundedText(message.content.caption, 1_000) }),
        },
    };
}
function summaryBytes(messages) {
    return Buffer.byteLength(JSON.stringify(messages), 'utf8');
}
/** Fit one newest oversized message by shortening only its text or caption. */
function fitNewestSummaryMessage(message, maxBytes) {
    if (summaryBytes([message]) <= maxBytes)
        return message;
    const original = message.content.kind === 'text' ? message.content.text : message.content.caption;
    if (original === undefined)
        return undefined;
    const characters = Array.from(original);
    let low = 0;
    let high = characters.length;
    let fitted;
    while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const shortened = characters.slice(0, middle).join('');
        const candidate = message.content.kind === 'text'
            ? { ...message, content: { ...message.content, text: shortened } }
            : { ...message, content: { ...message.content, caption: shortened } };
        if (summaryBytes([candidate]) <= maxBytes) {
            fitted = candidate;
            low = middle + 1;
        }
        else {
            high = middle - 1;
        }
    }
    return fitted;
}
/** Preserve the newest contiguous range while enforcing the exact UTF-8 JSON budget. */
function cropSummaryMessages(messages, maxBytes) {
    const selected = [];
    let truncated = false;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message === undefined)
            continue;
        const candidate = [message, ...selected];
        if (summaryBytes(candidate) <= maxBytes) {
            selected.unshift(message);
            continue;
        }
        truncated = true;
        if (selected.length === 0) {
            const fitted = fitNewestSummaryMessage(message, maxBytes);
            if (fitted !== undefined)
                selected.unshift(fitted);
        }
        break;
    }
    return { messages: selected, truncated };
}
/** Decode canonical standard Base64 after enforcing its complete decoded-byte cap. */
function decodeAttachment(bytesBase64, maxBytes) {
    const maxEncoded = Math.ceil(maxBytes / 3) * 4;
    if (bytesBase64.length > maxEncoded)
        return { ok: false, error: failure('attachment-too-large') };
    if (bytesBase64.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(bytesBase64)) {
        return { ok: false, error: failure('invalid-request') };
    }
    const bytes = Uint8Array.from(Buffer.from(bytesBase64, 'base64'));
    if (bytes.byteLength > maxBytes)
        return { ok: false, error: failure('attachment-too-large') };
    if (Buffer.from(bytes).toString('base64') !== bytesBase64)
        return { ok: false, error: failure('invalid-request') };
    return { ok: true, value: bytes };
}
/** Deployment-wide AWiki service over one replaceable high-level client provider. */
let AwikiService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _getConfig_decorators;
    let _getIdentity_decorators;
    let _listIdentities_decorators;
    let _getSession_decorators;
    let _logout_decorators;
    let _login_decorators;
    let _sendRegistrationOtp_decorators;
    let _registerIdentity_decorators;
    let _updateDisplayName_decorators;
    let _resolvePeer_decorators;
    let _listConversations_decorators;
    let _getHistory_decorators;
    let _getLocalHistory_decorators;
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
            _listIdentities_decorators = [Remote];
            _getSession_decorators = [Remote];
            _logout_decorators = [Remote];
            _login_decorators = [Remote];
            _sendRegistrationOtp_decorators = [Remote];
            _registerIdentity_decorators = [Remote];
            _updateDisplayName_decorators = [Remote];
            _resolvePeer_decorators = [Remote];
            _listConversations_decorators = [Remote];
            _getHistory_decorators = [Remote];
            _getLocalHistory_decorators = [Remote];
            _summarizeConversation_decorators = [Remote];
            _markConversationRead_decorators = [Remote];
            _sendText_decorators = [Remote];
            _sendAttachment_decorators = [Remote];
            _downloadAttachment_decorators = [Remote];
            _clearLocalData_decorators = [Remote];
            __esDecorate(this, null, _getConfig_decorators, { kind: "method", name: "getConfig", static: false, private: false, access: { has: obj => "getConfig" in obj, get: obj => obj.getConfig }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getIdentity_decorators, { kind: "method", name: "getIdentity", static: false, private: false, access: { has: obj => "getIdentity" in obj, get: obj => obj.getIdentity }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listIdentities_decorators, { kind: "method", name: "listIdentities", static: false, private: false, access: { has: obj => "listIdentities" in obj, get: obj => obj.listIdentities }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getSession_decorators, { kind: "method", name: "getSession", static: false, private: false, access: { has: obj => "getSession" in obj, get: obj => obj.getSession }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _logout_decorators, { kind: "method", name: "logout", static: false, private: false, access: { has: obj => "logout" in obj, get: obj => obj.logout }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _login_decorators, { kind: "method", name: "login", static: false, private: false, access: { has: obj => "login" in obj, get: obj => obj.login }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _sendRegistrationOtp_decorators, { kind: "method", name: "sendRegistrationOtp", static: false, private: false, access: { has: obj => "sendRegistrationOtp" in obj, get: obj => obj.sendRegistrationOtp }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _registerIdentity_decorators, { kind: "method", name: "registerIdentity", static: false, private: false, access: { has: obj => "registerIdentity" in obj, get: obj => obj.registerIdentity }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _updateDisplayName_decorators, { kind: "method", name: "updateDisplayName", static: false, private: false, access: { has: obj => "updateDisplayName" in obj, get: obj => obj.updateDisplayName }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _resolvePeer_decorators, { kind: "method", name: "resolvePeer", static: false, private: false, access: { has: obj => "resolvePeer" in obj, get: obj => obj.resolvePeer }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listConversations_decorators, { kind: "method", name: "listConversations", static: false, private: false, access: { has: obj => "listConversations" in obj, get: obj => obj.listConversations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getHistory_decorators, { kind: "method", name: "getHistory", static: false, private: false, access: { has: obj => "getHistory" in obj, get: obj => obj.getHistory }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getLocalHistory_decorators, { kind: "method", name: "getLocalHistory", static: false, private: false, access: { has: obj => "getLocalHistory" in obj, get: obj => obj.getLocalHistory }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _summarizeConversation_decorators, { kind: "method", name: "summarizeConversation", static: false, private: false, access: { has: obj => "summarizeConversation" in obj, get: obj => obj.summarizeConversation }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _markConversationRead_decorators, { kind: "method", name: "markConversationRead", static: false, private: false, access: { has: obj => "markConversationRead" in obj, get: obj => obj.markConversationRead }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _sendText_decorators, { kind: "method", name: "sendText", static: false, private: false, access: { has: obj => "sendText" in obj, get: obj => obj.sendText }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _sendAttachment_decorators, { kind: "method", name: "sendAttachment", static: false, private: false, access: { has: obj => "sendAttachment" in obj, get: obj => obj.sendAttachment }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _downloadAttachment_decorators, { kind: "method", name: "downloadAttachment", static: false, private: false, access: { has: obj => "downloadAttachment" in obj, get: obj => obj.downloadAttachment }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _clearLocalData_decorators, { kind: "method", name: "clearLocalData", static: false, private: false, access: { has: obj => "clearLocalData" in obj, get: obj => obj.clearLocalData }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['tools', 'agents'];
        static Config = Config;
        resolved = __runInitializers(this, _instanceExtraInitializers);
        sessionStore;
        bindingStore;
        hostContext;
        startupUserServiceDomain;
        settingsProvider;
        provider;
        signedOut;
        sessionMutation = Promise.resolve();
        sessionRevision = 0;
        activeSummaryRequests = new Set();
        summaryProvider;
        /** Trusted same-process external HTTP authentication dispatcher. Never Remote. */
        externalHttpAuth;
        /**
         * @param ctx - owning Host context.
         * @param config - service endpoints, SDK state path, and public limits.
         */
        constructor(ctx, config) {
            super(ctx, 'awiki');
            this.hostContext = ctx;
            this.resolved = resolveConfig(config);
            this.externalHttpAuth = createAwikiExternalHttpAuth(() => this.acquireExternalHttpAuthSession());
            this.sessionStore = new AwikiSessionStore(this.resolved.stateRoot);
            this.bindingStore = new AwikiAgentBindingStore(this.resolved.stateRoot);
            this.startupUserServiceDomain = this.resolved.userServiceDomain;
            ctx.inject(['settings'], (settingsCtx) => {
                const provider = settingsCtx.settings;
                const settingsScope = settingsCtx.settings.register(settingsNamespace(AWIKI_SETTINGS_NAMESPACE), AwikiSettingsSchema, {
                    base: { domain: this.resolved.userServiceDomain },
                    applies: 'restart',
                    validate: validateAwikiSettings,
                });
                this.settingsProvider = provider;
                this.startupUserServiceDomain = settingsScope.get().domain;
                settingsCtx.effect(() => () => {
                    if (this.settingsProvider === provider) {
                        this.settingsProvider = undefined;
                        this.startupUserServiceDomain = this.resolved.userServiceDomain;
                    }
                }, 'awiki: release settings namespace');
            });
            ctx.inject(['connection'], (connectionCtx) => {
                connectionCtx.connection.rpc.handle(AWIKI_SETTINGS_RPC_CHANNEL, createAwikiSettingsRpcHandler(() => this.settingsProvider), { authority: 'loopback' });
            });
            registerAwikiTools(ctx, this);
            ctx.effect(() => async () => {
                const provider = this.provider;
                if (provider !== undefined)
                    await this.disposeProvider(provider);
            }, 'awiki: dispose current client provider');
            ctx.effect(() => () => {
                this.summaryProvider = undefined;
            }, 'awiki: clear summary provider');
        }
        /**
         * Register the deployment's sole client factory. The caller must return the
         * resulting disposer from its own `ctx.effect`; disposal clears the slot
         * before awaiting the client's quiescence and is idempotent.
         * @param factory - synchronous factory for one owned high-level client.
         * @returns asynchronous disposer for the exact registered client.
         */
        registerClientFactory(factory) {
            if (this.provider !== undefined)
                throw new Error('awiki: a client provider is already registered');
            const client = factory({
                userServiceUrl: this.resolved.userServiceUrl,
                userServiceDomain: this.startupUserServiceDomain,
                messageServiceUrl: this.resolved.messageServiceUrl,
                messageServicePublicUrl: this.resolved.messageServicePublicUrl,
                messageServiceDid: this.resolved.messageServiceDid,
                allowedAttachmentOrigins: this.resolved.allowedAttachmentOrigins,
                attachmentMaxBytes: this.resolved.attachmentMaxBytes,
                allowInsecureLoopbackForTesting: this.resolved.allowInsecureLoopbackForTesting,
                stateRoot: this.resolved.stateRoot,
            });
            const provider = { client };
            this.provider = provider;
            return () => this.disposeProvider(provider);
        }
        /** Register one replaceable conversation-summary provider for this deployment. */
        registerSummaryProvider(provider) {
            if (this.summaryProvider !== undefined)
                throw new Error('awiki: a summary provider is already registered');
            this.summaryProvider = provider;
            let active = true;
            return () => {
                if (!active)
                    return;
                active = false;
                if (this.summaryProvider === provider)
                    this.summaryProvider = undefined;
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
                    attachmentMaxBytes: this.resolved.attachmentMaxBytes,
                },
            });
        }
        /**
         * Read the deployment's identity status.
         * @returns The public deployment identity or `null`.
         */
        getIdentity() {
            return this.run(client => client.getIdentity());
        }
        /** List main, bound, and locally recoverable unbound identities. */
        listIdentities() {
            return this.run(async (client) => {
                const identities = await client.listIdentities();
                const reconciled = await this.bindingStore.reconcile(identities);
                const main = identities.find(identity => identity.isDefault);
                const items = [
                    ...main === undefined ? [] : [{
                            tabId: 'main',
                            identity: main,
                            displayName: main.displayName ?? main.handle,
                            status: 'ready',
                        }],
                    ...reconciled.bindings.flatMap(binding => binding.identity === undefined ? [] : [{
                            tabId: binding.bindingId,
                            bindingId: binding.bindingId,
                            identity: binding.identity,
                            displayName: binding.displayName,
                            status: binding.status === 'broken' ? 'broken' : 'ready',
                        }]),
                    ...reconciled.unboundIdentities.map(identity => ({
                        tabId: `unbound:${identity.identityId}`,
                        identity,
                        displayName: `未关联 · ${identity.handle}`,
                        status: 'unbound',
                    })),
                ];
                return { items: Object.freeze(items) };
            });
        }
        /** Return the local registration and sign-in state without exposing secrets. */
        async getSession() {
            if (await this.isSignedOut())
                return { ok: true, value: { status: 'signed-out' } };
            const identity = await this.run(client => client.getIdentity(), { allowSignedOut: true });
            if (!identity.ok)
                return identity;
            return identity.value === null
                ? { ok: true, value: { status: 'unregistered' } }
                : { ok: true, value: { status: 'active', identity: identity.value } };
        }
        /** Lock this installation while preserving the encrypted identity and local database. */
        logout(request) {
            if (request?.confirmation !== AWIKI_LOGOUT_CONFIRMATION) {
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            }
            return this.mutateSession(async () => {
                if (await this.isSignedOut())
                    return { ok: true, value: { status: 'signed-out' } };
                const identity = await this.run(client => client.getIdentity(), { allowSignedOut: true });
                if (!identity.ok)
                    return identity;
                if (identity.value === null)
                    return { ok: false, error: failure('not-registered') };
                try {
                    await this.sessionStore.signOut();
                    this.signedOut = true;
                    this.invalidateSummaries();
                    return { ok: true, value: { status: 'signed-out' } };
                }
                catch {
                    return { ok: false, error: failure('remote') };
                }
            });
        }
        /** Resume the same locally preserved identity without registration. */
        login() {
            return this.mutateSession(async () => {
                const identity = await this.run(client => client.getIdentity(), { allowSignedOut: true });
                if (!identity.ok)
                    return identity;
                if (identity.value === null)
                    return { ok: false, error: failure('not-registered') };
                try {
                    await this.sessionStore.signIn();
                    this.signedOut = false;
                    this.invalidateSummaries();
                    return { ok: true, value: { status: 'active', identity: identity.value } };
                }
                catch {
                    return { ok: false, error: failure('remote') };
                }
            });
        }
        /**
         * Send one Legacy registration verification code.
         * @param request - Handle and phone used for the registration challenge.
         * @returns Public retry timing or a closed failure.
         */
        sendRegistrationOtp(request) {
            return this.run(client => client.sendRegistrationOtp(request));
        }
        /**
         * Register and persist the deployment's only AWiki identity.
         * @param request - Handle, phone, and verification code for registration.
         * @returns The new public identity or a closed failure.
         */
        registerIdentity(request) {
            return this.run(client => client.registerIdentity(request));
        }
        /**
         * Update the deployment identity's public WNS display name.
         * @param request - replacement display name selected by the user.
         * @returns The updated public identity or a closed failure.
         */
        updateDisplayName(request) {
            return this.runForIdentity(request.identityId, client => client.updateDisplayName(request));
        }
        /**
         * Resolve one Handle or DID before the browser opens a direct chat.
         * @param request - typed Handle or DID.
         * @returns The public peer and conversation id, or a closed failure.
         */
        resolvePeer(request) {
            return this.runForIdentity(request.identityId, client => client.resolvePeer(request.peer));
        }
        /**
         * List direct and existing group conversations.
         * @param request - Optional opaque cursor and page limit.
         * @returns One page of direct and existing group conversations.
         */
        listConversations(request) {
            return this.runForIdentity(request?.identityId, async (client, agentIdentity) => {
                const page = await client.listConversations(request);
                return agentIdentity ? { ...page, items: page.items.filter(item => item.kind === 'direct') } : page;
            });
        }
        /**
         * Read one direct or group conversation history page.
         * @param request - Conversation id, optional cursor, and page limit.
         * @returns One chronological history page.
         */
        getHistory(request) {
            return this.runForIdentity(request.identityId, async (client, agentIdentity) => {
                if (agentIdentity) {
                    await this.requireDirectConversation(client, request.conversationId);
                }
                return client.getHistory(request);
            });
        }
        /** Read one committed local conversation page without sync, history, or Directory RPC. */
        getLocalHistory(request) {
            return this.runForIdentity(request.identityId, async (client, agentIdentity) => {
                if (agentIdentity)
                    await this.requireDirectConversation(client, request.conversationId);
                return client.getLocalHistory(request);
            });
        }
        /**
         * Read real AWiki history, enforce range and byte caps, then invoke the configured model once.
         * @param request - selected conversation and its unread snapshot at open time.
         * @returns a structured summary plus the exact summarized source range.
         */
        async summarizeConversation(request) {
            if (typeof request?.conversationId !== 'string' || request.conversationId.length === 0) {
                return { ok: false, error: failure('invalid-request') };
            }
            if (request.unreadCountAtOpen !== undefined
                && (!Number.isSafeInteger(request.unreadCountAtOpen) || request.unreadCountAtOpen < 0)) {
                return { ok: false, error: failure('invalid-request') };
            }
            try {
                if (await this.isSignedOut())
                    return { ok: false, error: failure('signed-out') };
            }
            catch {
                return { ok: false, error: failure('remote') };
            }
            const sessionRevision = this.sessionRevision;
            const provider = this.summaryProvider;
            if (provider === undefined)
                return { ok: false, error: normalizeSummaryFailure(new SummaryProviderUnavailableError()) };
            const historyResult = await this.runForIdentity(request.identityId, (client, agentIdentity) => {
                if (agentIdentity) {
                    return this.requireDirectConversation(client, request.conversationId)
                        .then(() => client.getHistory({
                        conversationId: request.conversationId,
                        ...request.identityId === undefined ? {} : { identityId: request.identityId },
                        limit: MAX_SUMMARY_MESSAGES,
                    }));
                }
                return client.getHistory({
                    conversationId: request.conversationId,
                    ...request.identityId === undefined ? {} : { identityId: request.identityId },
                    limit: MAX_SUMMARY_MESSAGES,
                });
            });
            if (!historyResult.ok)
                return historyResult;
            if (this.sessionRevision !== sessionRevision) {
                return { ok: false, error: failure('summary-cancelled') };
            }
            const history = historyResult.value;
            if (history.items.some(message => message.conversationId !== request.conversationId)) {
                return { ok: false, error: failure('remote') };
            }
            const unread = request.unreadCountAtOpen ?? 0;
            const rangeKind = unread > 0 ? 'unread' : 'recent';
            const requestedCount = rangeKind === 'unread' ? unread : MAX_SUMMARY_MESSAGES;
            const bounded = history.items.slice(-Math.min(requestedCount, MAX_SUMMARY_MESSAGES));
            const minimized = bounded.map(minimizeSummaryMessage);
            const cropped = cropSummaryMessages(minimized, this.resolved.summaryMaxInputBytes);
            if (cropped.messages.length === 0)
                return { ok: false, error: failure('summary-failed') };
            const controller = new AbortController();
            this.activeSummaryRequests.add(controller);
            let summary;
            try {
                summary = await provider.summarize({ messages: cropped.messages, signal: controller.signal });
            }
            catch (error) {
                return { ok: false, error: normalizeSummaryFailure(error) };
            }
            finally {
                this.activeSummaryRequests.delete(controller);
            }
            if (this.sessionRevision !== sessionRevision) {
                return { ok: false, error: failure('summary-cancelled') };
            }
            const first = cropped.messages[0];
            const last = cropped.messages.at(-1);
            if (first === undefined || last === undefined)
                return { ok: false, error: failure('summary-failed') };
            const sourceById = new Map(bounded.map(message => [message.id, message]));
            const firstSource = sourceById.get(first.id);
            const lastSource = sourceById.get(last.id);
            if (firstSource === undefined || lastSource === undefined)
                return { ok: false, error: failure('remote') };
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
                        truncated: history.hasMore
                            || history.items.length > MAX_SUMMARY_MESSAGES
                            || requestedCount > MAX_SUMMARY_MESSAGES
                            || cropped.truncated,
                    },
                    highlights: summary.highlights,
                    conclusions: summary.conclusions,
                    todos: summary.todos,
                },
            };
        }
        /**
         * Mark every currently unread inbox message in one conversation as read.
         * @param request - conversation whose current inbox entries should be acknowledged.
         * @returns Number of inbox entries acknowledged by the Message Service.
         */
        markConversationRead(request) {
            return this.runForIdentity(request.identityId, client => client.markConversationRead(request.conversationId));
        }
        /**
         * Send one text message through the deployment identity.
         * @param request - Target, text, and idempotency key.
         * @returns The accepted public message or a closed failure.
         */
        sendText(request) {
            return this.runForIdentity(request.identityId, (client, agentIdentity) => {
                if (agentIdentity && request.target.kind === 'group') {
                    throw new AwikiSdkError('agent-group-unsupported');
                }
                return client.sendText(request);
            });
        }
        /**
         * Upload and send one attachment after Host validation.
         * @param request - Target, attachment metadata and Base64 bytes, caption, and idempotency key.
         * @returns The accepted attachment message or a closed failure.
         */
        async sendAttachment(request) {
            const decoded = decodeAttachment(request.bytesBase64, this.resolved.attachmentMaxBytes);
            if (!decoded.ok)
                return decoded;
            return this.runForIdentity(request.identityId, (client, agentIdentity) => {
                if (agentIdentity && request.target.kind === 'group') {
                    throw new AwikiSdkError('agent-group-unsupported');
                }
                return client.sendAttachment({
                    target: request.target,
                    attachment: {
                        fileName: request.fileName,
                        mimeType: request.mimeType,
                        bytes: decoded.value,
                    },
                    ...request.caption === undefined ? {} : { caption: request.caption },
                    idempotencyKey: request.idempotencyKey,
                });
            }, { skipAttachmentByteValidation: true });
        }
        /**
         * Download and encode one provider-verified attachment.
         * @param request - Containing message id and attachment id.
         * @returns Verified public metadata and canonical Base64 bytes, or a closed failure.
         */
        async downloadAttachment(request) {
            const result = await this.runForIdentity(request.identityId, client => client.downloadAttachment(request), { skipAttachmentByteValidation: true });
            if (!result.ok)
                return result;
            if (result.value.bytes.byteLength > this.resolved.attachmentMaxBytes) {
                return { ok: false, error: failure('attachment-too-large') };
            }
            if (result.value.bytes.byteLength !== result.value.attachment.size) {
                return { ok: false, error: failure('remote') };
            }
            return { ok: true, value: downloadedAttachment(result.value) };
        }
        /** Return the effective identity selected for one live DSH Agent. */
        async getIdentityForAgent(agent) {
            return this.run(async (client) => {
                const binding = await this.bindingForAgent(agent);
                if (binding !== undefined) {
                    if (binding.identityId === undefined || binding.status !== 'ready') {
                        throw new AwikiSdkError('conflict');
                    }
                    return {
                        identity: await (await client.forIdentity(binding.identityId)).getIdentity(),
                        source: 'binding',
                        bindingId: binding.bindingId,
                    };
                }
                const identity = await client.getIdentity();
                if (identity === null)
                    throw new ProviderUnavailableError();
                return { identity, source: 'main' };
            });
        }
        /** List public Agent identity bindings for model tools. */
        listAgentIdentityBindings() {
            return this.run(async (client) => {
                const reconciled = await this.bindingStore.reconcile(await client.listIdentities());
                return reconciled.bindings;
            });
        }
        /** Resolve the exact non-secret route shown in the Agent identity approval prompt. */
        agentIdentityApprovalRoute(caller, targetAgentId, scope) {
            return this.bindingRoute(this.authorizedTarget(caller, targetAgentId), scope);
        }
        /** Provision one approved Agent identity and commit its Host route. */
        async createAgentIdentity(caller, request) {
            let target;
            let route;
            let displayName;
            try {
                target = this.authorizedTarget(caller, request.targetAgentId);
                route = this.bindingRoute(target, request.scope);
                displayName = this.displayName(request.displayName);
            }
            catch {
                return { ok: false, error: failure('invalid-request') };
            }
            const creation = await this.bindingStore.create(displayName, route);
            const result = await this.run(async (client) => {
                if (creation.binding.identityId !== undefined) {
                    if (creation.binding.source === 'provisioned') {
                        await client.acknowledgeSkillAgentProvision(creation.binding.bindingId);
                    }
                }
                else {
                    const controller = await client.getIdentity();
                    if (controller === null || !controller.isDefault)
                        throw new ProviderUnavailableError();
                    const provisioned = await client.provisionSkillAgentIdentity({
                        operationId: creation.binding.bindingId,
                        displayName,
                        controllerIdentityId: controller.identityId,
                    });
                    await this.bindingStore.markReady(creation.binding.bindingId, provisioned.identityId);
                    await client.acknowledgeSkillAgentProvision(creation.binding.bindingId);
                }
                return this.projectBinding(client, creation.binding.bindingId);
            });
            if (!result.ok)
                await this.bindingStore.markFailed(creation.binding.bindingId);
            return result;
        }
        /** Attach or rebind an existing binding/local identity to an approved route. */
        async attachAgentIdentity(caller, request) {
            let route;
            try {
                route = this.bindingRoute(this.authorizedTarget(caller, request.targetAgentId), request.scope);
                if ((request.bindingId === undefined) === (request.identityId === undefined)) {
                    throw new TypeError('one binding selector is required');
                }
            }
            catch {
                return { ok: false, error: failure('invalid-request') };
            }
            return this.run(async (client) => {
                let bindingId = request.bindingId;
                if (bindingId !== undefined) {
                    await this.bindingStore.attach(bindingId, route, request.replace === true);
                }
                else {
                    const identityId = request.identityId;
                    const identities = await client.listIdentities();
                    const selected = identities.find(identity => identity.identityId === identityId && !identity.isDefault);
                    if (selected === undefined)
                        throw new AwikiSdkError('not-found');
                    const adopted = await this.bindingStore.adopt(identityId, this.displayName(request.displayName ?? selected.displayName ?? selected.handle), route, request.replace === true);
                    bindingId = adopted.bindingId;
                }
                return this.projectBinding(client, bindingId);
            });
        }
        listConversationsForAgent(agent, request) {
            return this.runForAgent(agent, async (client, bound) => {
                const page = await client.listConversations(request);
                return bound ? { ...page, items: page.items.filter(item => item.kind === 'direct') } : page;
            });
        }
        getHistoryForAgent(agent, request) {
            return this.runForAgent(agent, async (client, bound) => {
                if (bound) {
                    await this.requireDirectConversation(client, request.conversationId);
                }
                return client.getHistory(request);
            });
        }
        sendTextForAgent(agent, request) {
            return this.runForAgent(agent, async (client, bound) => {
                if (bound && request.target.kind === 'group')
                    throw new AwikiSdkError('agent-group-unsupported');
                return client.sendText(request);
            });
        }
        sendAttachmentForAgent(agent, request) {
            const decoded = decodeAttachment(request.bytesBase64, this.resolved.attachmentMaxBytes);
            if (!decoded.ok)
                return Promise.resolve(decoded);
            return this.runForAgent(agent, async (client, bound) => {
                if (bound && request.target.kind === 'group')
                    throw new AwikiSdkError('agent-group-unsupported');
                return client.sendAttachment({
                    target: request.target,
                    attachment: {
                        fileName: request.fileName,
                        mimeType: request.mimeType,
                        bytes: decoded.value,
                    },
                    ...request.caption === undefined ? {} : { caption: request.caption },
                    idempotencyKey: request.idempotencyKey,
                });
            }, { skipAttachmentByteValidation: true });
        }
        /**
         * Permanently remove the exact SDK-owned local state after an explicit browser acknowledgement.
         * The remote AWiki account and Handle are not deleted.
         * @param request - exact destructive-action marker emitted only after the UI's second confirmation.
         * @returns Whether a persisted state file existed when the reset completed.
         */
        clearLocalData(request) {
            if (request?.confirmation !== AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION) {
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            }
            return this.mutateSession(async () => {
                const result = await this.run(client => client.clearLocalData(), { allowSignedOut: true });
                if (!result.ok)
                    return result;
                try {
                    const bindingCleared = await this.bindingStore.clear();
                    await this.sessionStore.signIn();
                    this.signedOut = false;
                    this.invalidateSummaries();
                    return { ok: true, value: { cleared: result.value.cleared || bindingCleared } };
                }
                catch {
                    return { ok: false, error: failure('remote') };
                }
            });
        }
        authorizedTarget(caller, targetAgentId) {
            if (targetAgentId === undefined || targetAgentId === caller.id)
                return caller;
            if (targetAgentId.trim() !== targetAgentId || targetAgentId.length === 0) {
                throw new TypeError('invalid target Agent id');
            }
            const target = this.hostContext.agents.get(SessionId(targetAgentId));
            if (target === undefined || !this.hostContext.agents.isOwnedBy(target.id, caller)) {
                throw new TypeError('target Agent is not owned by caller');
            }
            return target;
        }
        bindingRoute(agent, scope) {
            if (scope === 'session')
                return { scope, key: String(agent.id) };
            const preset = resolveSessionPreset(agent.session);
            if (preset === undefined || preset.length === 0)
                throw new TypeError('Agent has no preset');
            return { scope, key: preset };
        }
        displayName(raw) {
            const value = raw.trim();
            if (value !== raw || value.length === 0 || [...value].length > 40) {
                throw new TypeError('invalid Agent display name');
            }
            return value;
        }
        bindingForAgent(agent) {
            return this.bindingStore.resolve(String(agent.id), resolveSessionPreset(agent.session));
        }
        async projectBinding(client, bindingId) {
            const reconciled = await this.bindingStore.reconcile(await client.listIdentities());
            const binding = reconciled.bindings.find(item => item.bindingId === bindingId);
            if (binding === undefined)
                throw new AwikiSdkError('not-found');
            return binding;
        }
        async requireDirectConversation(client, conversationId) {
            if (conversationId.startsWith('group:'))
                throw new AwikiSdkError('agent-group-unsupported');
            if (conversationId.startsWith('dm:'))
                return;
            let cursor;
            for (let page = 0; page < 20; page += 1) {
                const result = await client.listConversations({
                    ...cursor === undefined ? {} : { cursor },
                    limit: 100,
                });
                const conversation = result.items.find(item => item.id === conversationId);
                if (conversation !== undefined) {
                    if (conversation.kind === 'group')
                        throw new AwikiSdkError('agent-group-unsupported');
                    return;
                }
                if (!result.hasMore || result.nextCursor === undefined)
                    break;
                cursor = result.nextCursor;
            }
            throw new AwikiSdkError('not-found');
        }
        runForAgent(agent, operation, options = {}) {
            return this.run(async (client) => {
                const binding = await this.bindingForAgent(agent);
                if (binding === undefined)
                    return operation(client, false);
                if (binding.status !== 'ready' || binding.identityId === undefined) {
                    throw new AwikiSdkError('conflict');
                }
                return operation(await client.forIdentity(binding.identityId), true);
            }, options);
        }
        runForIdentity(identityId, operation, options = {}) {
            return this.run(async (client) => {
                if (identityId === undefined)
                    return operation(client, false);
                const main = await client.getIdentity();
                if (main === null)
                    throw new AwikiSdkError('not-registered');
                return operation(await client.forIdentity(identityId), main.identityId !== identityId);
            }, options);
        }
        /** Invalidate cached session work and cancel every model request still owned by the old session. */
        invalidateSummaries() {
            this.sessionRevision += 1;
            for (const controller of this.activeSummaryRequests)
                controller.abort();
            this.activeSummaryRequests.clear();
        }
        /** Invoke the current client and normalize every rejection to a public result. */
        async run(operation, options = {}) {
            try {
                if (options.allowSignedOut !== true && await this.isSignedOut()) {
                    return { ok: false, error: failure('signed-out') };
                }
                const provider = this.provider;
                if (provider === undefined)
                    throw new ProviderUnavailableError();
                const value = await operation(provider.client);
                if (options.skipAttachmentByteValidation !== true && containsUnexpectedBinary(value, new Set())) {
                    return { ok: false, error: failure('remote') };
                }
                return { ok: true, value };
            }
            catch (error) {
                return { ok: false, error: normalizeFailure(error) };
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
            }
            catch {
                throw externalHttpAuthError('auth-state-unavailable');
            }
            if (signedOut)
                throw externalHttpAuthError('signed-out');
            const revision = this.sessionRevision;
            const provider = this.provider;
            if (provider === undefined)
                throw externalHttpAuthError('auth-state-unavailable');
            let identity;
            try {
                identity = await provider.client.getIdentity();
            }
            catch (error) {
                throw mapExternalHttpProviderError(error);
            }
            if (identity === null)
                throw externalHttpAuthError('not-registered');
            return {
                client: provider.client,
                assertActive: async () => {
                    if (this.provider !== provider || this.sessionRevision !== revision) {
                        throw externalHttpAuthError('auth-state-unavailable');
                    }
                    try {
                        if (await this.isSignedOut())
                            throw externalHttpAuthError('signed-out');
                    }
                    catch (error) {
                        if (error instanceof AwikiExternalHttpAuthError)
                            throw error;
                        throw externalHttpAuthError('auth-state-unavailable');
                    }
                },
            };
        }
        /** Serialize sign-in, sign-out, and destructive clear transitions. */
        mutateSession(operation) {
            const pending = this.sessionMutation.then(operation, operation);
            this.sessionMutation = pending.then(() => undefined, () => undefined);
            return pending;
        }
        /** Clear one exact provider slot before joining its one shared disposal. */
        disposeProvider(provider) {
            if (this.provider === provider)
                this.provider = undefined;
            provider.disposal ??= provider.client.dispose();
            return provider.disposal;
        }
    };
})();
export { AwikiService };
/** Reject SDK values that could leak raw bytes through a supposedly public DTO. */
function containsUnexpectedBinary(value, seen) {
    if (value instanceof Uint8Array)
        return true;
    if (typeof value !== 'object' || value === null)
        return false;
    if (seen.has(value))
        return false;
    seen.add(value);
    for (const child of Object.values(value)) {
        if (containsUnexpectedBinary(child, seen))
            return true;
    }
    return false;
}
export default AwikiService;
//# sourceMappingURL=index.js.map