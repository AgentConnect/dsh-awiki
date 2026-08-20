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
import { isAbsolute, join } from 'node:path';
import z from '@deepseek-ai/schemastery';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from "./types.js";
import { AwikiExternalHttpAuthError, createAwikiExternalHttpAuth, externalHttpAuthError, mapProviderError as mapExternalHttpProviderError, } from "./external-http-auth.js";
import { downloadedAttachment } from "./sdk-adapter.js";
import { registerAwikiTools } from "./tools.js";
import { mailInboxRequest, mailMarkReadRequest, mailReadRequest, mailSendRequest, } from "./mail.js";
import { AwikiSettingsSchema, validateAwikiSettings, } from "./settings.js";
import { AWIKI_SETTINGS_NAMESPACE, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain } from "./domain.js";
import { AWIKI_SETTINGS_RPC_CHANNEL } from "./settings-rpc-contract.js";
import { createAwikiSettingsRpcHandler } from "./settings-rpc.js";
import { AwikiSessionStore } from "./session.js";
import { AwikiImageAttachmentCache, minimumImageAttachmentCacheMaxBytes } from "./attachment-cache.js";
import { AwikiSentMailStore, isLocalSentMailId } from "./sent-mail-store.js";
import { AwikiAgentListener, DshAwikiListenerAgentRuntime, } from "./listener.js";
export { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from "./types.js";
export { AWIKI_EXTERNAL_HTTP_MAX_BODY_BYTES, AwikiExternalHttpAuthError, } from "./external-http-auth.js";
export { AWIKI_DOMAIN_FIELD, AWIKI_SETTINGS_NAMESPACE, AwikiSettingsSchema, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain, validateAwikiSettings, } from "./settings.js";
export { AWIKI_HISTORY_TOOL, AWIKI_IDENTITY_STATUS_TOOL, AWIKI_LIST_CONVERSATIONS_TOOL, AWIKI_MAIL_ACCOUNT_TOOL, AWIKI_MAIL_INBOX_TOOL, AWIKI_MAIL_MARK_READ_TOOL, AWIKI_MAIL_READ_TOOL, AWIKI_MAIL_SEND_TOOL, AWIKI_SEND_ATTACHMENT_TOOL, AWIKI_SEND_MESSAGE_TOOL, } from "./tools.js";
/** Default maximum attachment size: 10 MiB. */
export const DEFAULT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
/** Default private on-disk budget for verified image previews: 64 MiB. */
export const DEFAULT_IMAGE_ATTACHMENT_CACHE_MAX_BYTES = 64 * 1024 * 1024;
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
    mailServiceUrl: z.string(),
    messageServicePublicUrl: z.string().default(DEFAULT_AWIKI_SERVICE_URL),
    messageServiceDid: z.string().default(DEFAULT_AWIKI_MESSAGE_SERVICE_DID),
    allowedAttachmentOrigins: z.array(z.string()).default([]),
    allowInsecureLoopbackForTesting: z.boolean().default(false),
    stateRoot: z.string(),
    attachmentMaxBytes: z.number().default(DEFAULT_ATTACHMENT_MAX_BYTES),
    imageAttachmentCacheMaxBytes: z.number().default(DEFAULT_IMAGE_ATTACHMENT_CACHE_MAX_BYTES),
    pollIntervalMs: z.number().default(DEFAULT_POLL_INTERVAL_MS),
    listenerEnabled: z.boolean().default(false),
    listenerAllowedPeers: z.array(z.string()).default([]),
    listenerWorkspacePath: z.string(),
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
    'attachment-too-large',
    'summary-unavailable',
    'summary-timeout',
    'summary-cancelled',
    'summary-invalid-output',
    'summary-failed',
    'delivery-unknown',
    'network',
    'remote',
]);
const LISTENER_RESTART_BASE_DELAY_MS = 1_000;
const LISTENER_RESTART_MAX_DELAY_MS = 30_000;
const LISTENER_RESTART_MAX_ATTEMPT = 6;
const LISTENER_STABLE_RESET_MS = 60_000;
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
    'attachment-too-large': 'The attachment exceeds this deployment\'s size limit.',
    'summary-unavailable': 'AI summary is unavailable. Check the current default model configuration.',
    'summary-timeout': 'AI summary timed out. Try again.',
    'summary-cancelled': 'AI summary was cancelled. Try again.',
    'summary-invalid-output': 'The model returned an invalid summary. Try again.',
    'summary-failed': 'AI summary could not be generated. Try again.',
    'delivery-unknown': 'Mail delivery could not be confirmed. Inspect the mailbox before retrying.',
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
/** Resolve the explicit listener allowlist without accepting wildcards or ambiguous whitespace. */
function listenerAllowedPeers(raw, enabled) {
    const peers = (raw ?? []).map((peer) => {
        if (peer !== peer.trim() || peer.length === 0 || peer.length > 2_048 || /[\u0000-\u001f\u007f]/u.test(peer)) {
            throw new TypeError('awiki: listenerAllowedPeers entries must be non-empty exact Handles or DIDs');
        }
        if (peer === '*')
            throw new TypeError('awiki: listenerAllowedPeers does not accept wildcards');
        return peer.startsWith('did:') ? peer : peer.toLowerCase();
    });
    if (peers.length > 100 || new Set(peers).size !== peers.length) {
        throw new TypeError('awiki: listenerAllowedPeers must contain at most 100 unique entries');
    }
    if (enabled && peers.length === 0) {
        throw new TypeError('awiki: listenerAllowedPeers must contain at least one Handle or DID when listenerEnabled is true');
    }
    return peers;
}
/** Resolve and validate every deployment choice before publishing the service. */
function resolveConfig(config) {
    const allowInsecureLoopbackForTesting = config.allowInsecureLoopbackForTesting ?? false;
    const configuredStateRoot = config.stateRoot?.trim();
    const configuredDshHome = process.env.DSH_HOME?.trim();
    const dshHome = configuredDshHome === undefined || configuredDshHome.length === 0
        ? join(homedir(), '.dsh')
        : configuredDshHome;
    const stateRoot = configuredStateRoot === undefined || configuredStateRoot.length === 0
        ? join(dshHome, 'awiki', 'im-core')
        : configuredStateRoot;
    if (!isAbsolute(stateRoot))
        throw new TypeError('awiki: stateRoot must be an absolute path');
    const attachmentMaxBytes = config.attachmentMaxBytes ?? DEFAULT_ATTACHMENT_MAX_BYTES;
    if (!Number.isSafeInteger(attachmentMaxBytes) || attachmentMaxBytes < 1) {
        throw new TypeError('awiki: attachmentMaxBytes must be a positive safe integer');
    }
    const imageAttachmentCacheMaxBytes = config.imageAttachmentCacheMaxBytes ?? DEFAULT_IMAGE_ATTACHMENT_CACHE_MAX_BYTES;
    if (!Number.isSafeInteger(imageAttachmentCacheMaxBytes)
        || imageAttachmentCacheMaxBytes < minimumImageAttachmentCacheMaxBytes(attachmentMaxBytes)) {
        throw new TypeError('awiki: imageAttachmentCacheMaxBytes cannot retain one maximum-sized attachment');
    }
    const pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 1_000 || pollIntervalMs > 60_000) {
        throw new TypeError('awiki: pollIntervalMs must be a safe integer from 1000 through 60000');
    }
    const listenerEnabled = config.listenerEnabled ?? false;
    const listenerWorkspacePath = config.listenerWorkspacePath?.trim() || join(dshHome, 'workspaces', 'awiki');
    if (!isAbsolute(listenerWorkspacePath)) {
        throw new TypeError('awiki: listenerWorkspacePath must be an absolute path');
    }
    const allowedPeers = listenerAllowedPeers(config.listenerAllowedPeers, listenerEnabled);
    const summaryMaxInputBytes = config.summaryMaxInputBytes ?? DEFAULT_SUMMARY_MAX_INPUT_BYTES;
    if (!Number.isSafeInteger(summaryMaxInputBytes) || summaryMaxInputBytes < 1_024) {
        throw new TypeError('awiki: summaryMaxInputBytes must be a safe integer of at least 1024');
    }
    const userServiceUrl = serviceUrl('userServiceUrl', config.userServiceUrl ?? DEFAULT_AWIKI_SERVICE_URL, allowInsecureLoopbackForTesting);
    const messageServiceUrl = serviceUrl('messageServiceUrl', config.messageServiceUrl ?? DEFAULT_AWIKI_SERVICE_URL, allowInsecureLoopbackForTesting);
    const mailServiceUrl = serviceUrl('mailServiceUrl', config.mailServiceUrl ?? userServiceUrl, allowInsecureLoopbackForTesting);
    const messageServicePublicUrl = serviceUrl('messageServicePublicUrl', config.messageServicePublicUrl ?? DEFAULT_AWIKI_SERVICE_URL, allowInsecureLoopbackForTesting);
    return {
        userServiceUrl,
        userServiceDomain: serviceDomain(config.userServiceDomain ?? DEFAULT_AWIKI_DOMAIN),
        messageServiceUrl,
        mailServiceUrl,
        messageServicePublicUrl,
        messageServiceDid: serviceDid(config.messageServiceDid ?? DEFAULT_AWIKI_MESSAGE_SERVICE_DID),
        allowedAttachmentOrigins: attachmentOrigins(config.allowedAttachmentOrigins, messageServicePublicUrl, allowInsecureLoopbackForTesting),
        allowInsecureLoopbackForTesting,
        stateRoot,
        attachmentMaxBytes,
        imageAttachmentCacheMaxBytes,
        pollIntervalMs,
        listenerEnabled,
        listener: {
            allowedPeers,
            workspacePath: listenerWorkspacePath,
            stateRoot,
        },
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
const MAX_GROUP_NAME_CHARACTERS = 100;
const MAX_GROUP_INITIAL_MEMBERS = 50;
const MAX_GROUP_MEMBER_CHARACTERS = 512;
function normalizeCreateGroupRequest(request) {
    if (typeof request?.name !== 'string' || !Array.isArray(request.members))
        return undefined;
    const name = request.name.trim();
    if (name.length === 0 || Array.from(name).length > MAX_GROUP_NAME_CHARACTERS)
        return undefined;
    if (request.members.length === 0 || request.members.length > MAX_GROUP_INITIAL_MEMBERS)
        return undefined;
    const members = [];
    const seen = new Set();
    for (const raw of request.members) {
        if (typeof raw !== 'string')
            return undefined;
        const member = raw.trim().replace(/^@+/u, '');
        if (member.length === 0 || Array.from(member).length > MAX_GROUP_MEMBER_CHARACTERS)
            return undefined;
        if (seen.has(member))
            continue;
        seen.add(member);
        members.push(member);
    }
    return members.length === 0 ? undefined : { name, members };
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
    let _getSession_decorators;
    let _logout_decorators;
    let _login_decorators;
    let _sendRegistrationOtp_decorators;
    let _registerIdentity_decorators;
    let _updateDisplayName_decorators;
    let _resolvePeer_decorators;
    let _createGroup_decorators;
    let _listConversations_decorators;
    let _getHistory_decorators;
    let _getLocalHistory_decorators;
    let _summarizeConversation_decorators;
    let _markConversationRead_decorators;
    let _sendText_decorators;
    let _sendAttachment_decorators;
    let _downloadAttachment_decorators;
    let _getMailAccount_decorators;
    let _listMailInbox_decorators;
    let _readMail_decorators;
    let _markMailRead_decorators;
    let _sendMail_decorators;
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
            _createGroup_decorators = [Remote];
            _listConversations_decorators = [Remote];
            _getHistory_decorators = [Remote];
            _getLocalHistory_decorators = [Remote];
            _summarizeConversation_decorators = [Remote];
            _markConversationRead_decorators = [Remote];
            _sendText_decorators = [Remote];
            _sendAttachment_decorators = [Remote];
            _downloadAttachment_decorators = [Remote];
            _getMailAccount_decorators = [Remote];
            _listMailInbox_decorators = [Remote];
            _readMail_decorators = [Remote];
            _markMailRead_decorators = [Remote];
            _sendMail_decorators = [Remote];
            _clearLocalData_decorators = [Remote];
            __esDecorate(this, null, _getConfig_decorators, { kind: "method", name: "getConfig", static: false, private: false, access: { has: obj => "getConfig" in obj, get: obj => obj.getConfig }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getIdentity_decorators, { kind: "method", name: "getIdentity", static: false, private: false, access: { has: obj => "getIdentity" in obj, get: obj => obj.getIdentity }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getSession_decorators, { kind: "method", name: "getSession", static: false, private: false, access: { has: obj => "getSession" in obj, get: obj => obj.getSession }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _logout_decorators, { kind: "method", name: "logout", static: false, private: false, access: { has: obj => "logout" in obj, get: obj => obj.logout }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _login_decorators, { kind: "method", name: "login", static: false, private: false, access: { has: obj => "login" in obj, get: obj => obj.login }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _sendRegistrationOtp_decorators, { kind: "method", name: "sendRegistrationOtp", static: false, private: false, access: { has: obj => "sendRegistrationOtp" in obj, get: obj => obj.sendRegistrationOtp }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _registerIdentity_decorators, { kind: "method", name: "registerIdentity", static: false, private: false, access: { has: obj => "registerIdentity" in obj, get: obj => obj.registerIdentity }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _updateDisplayName_decorators, { kind: "method", name: "updateDisplayName", static: false, private: false, access: { has: obj => "updateDisplayName" in obj, get: obj => obj.updateDisplayName }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _resolvePeer_decorators, { kind: "method", name: "resolvePeer", static: false, private: false, access: { has: obj => "resolvePeer" in obj, get: obj => obj.resolvePeer }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _createGroup_decorators, { kind: "method", name: "createGroup", static: false, private: false, access: { has: obj => "createGroup" in obj, get: obj => obj.createGroup }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listConversations_decorators, { kind: "method", name: "listConversations", static: false, private: false, access: { has: obj => "listConversations" in obj, get: obj => obj.listConversations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getHistory_decorators, { kind: "method", name: "getHistory", static: false, private: false, access: { has: obj => "getHistory" in obj, get: obj => obj.getHistory }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getLocalHistory_decorators, { kind: "method", name: "getLocalHistory", static: false, private: false, access: { has: obj => "getLocalHistory" in obj, get: obj => obj.getLocalHistory }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _summarizeConversation_decorators, { kind: "method", name: "summarizeConversation", static: false, private: false, access: { has: obj => "summarizeConversation" in obj, get: obj => obj.summarizeConversation }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _markConversationRead_decorators, { kind: "method", name: "markConversationRead", static: false, private: false, access: { has: obj => "markConversationRead" in obj, get: obj => obj.markConversationRead }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _sendText_decorators, { kind: "method", name: "sendText", static: false, private: false, access: { has: obj => "sendText" in obj, get: obj => obj.sendText }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _sendAttachment_decorators, { kind: "method", name: "sendAttachment", static: false, private: false, access: { has: obj => "sendAttachment" in obj, get: obj => obj.sendAttachment }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _downloadAttachment_decorators, { kind: "method", name: "downloadAttachment", static: false, private: false, access: { has: obj => "downloadAttachment" in obj, get: obj => obj.downloadAttachment }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getMailAccount_decorators, { kind: "method", name: "getMailAccount", static: false, private: false, access: { has: obj => "getMailAccount" in obj, get: obj => obj.getMailAccount }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listMailInbox_decorators, { kind: "method", name: "listMailInbox", static: false, private: false, access: { has: obj => "listMailInbox" in obj, get: obj => obj.listMailInbox }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _readMail_decorators, { kind: "method", name: "readMail", static: false, private: false, access: { has: obj => "readMail" in obj, get: obj => obj.readMail }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _markMailRead_decorators, { kind: "method", name: "markMailRead", static: false, private: false, access: { has: obj => "markMailRead" in obj, get: obj => obj.markMailRead }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _sendMail_decorators, { kind: "method", name: "sendMail", static: false, private: false, access: { has: obj => "sendMail" in obj, get: obj => obj.sendMail }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _clearLocalData_decorators, { kind: "method", name: "clearLocalData", static: false, private: false, access: { has: obj => "clearLocalData" in obj, get: obj => obj.clearLocalData }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['tools'];
        static Config = Config;
        resolved = __runInitializers(this, _instanceExtraInitializers);
        sessionStore;
        imageAttachmentCache;
        sentMailStore;
        startupUserServiceDomain;
        settingsProvider;
        provider;
        signedOut;
        sessionMutation = Promise.resolve();
        sessionRevision = 0;
        activeIdentityDid;
        activeSummaryRequests = new Set();
        summaryProvider;
        hostContext;
        /** Trusted same-process external HTTP authentication dispatcher. Never Remote. */
        externalHttpAuth;
        workspaceContext;
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
            this.imageAttachmentCache = new AwikiImageAttachmentCache(this.resolved.stateRoot, this.resolved.attachmentMaxBytes, this.resolved.imageAttachmentCacheMaxBytes);
            this.sentMailStore = new AwikiSentMailStore(this.resolved.stateRoot);
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
            ctx.inject(['workspaceRegistry'], (workspaceCtx) => {
                this.workspaceContext = workspaceCtx;
                const provider = this.provider;
                if (provider !== undefined)
                    void this.startListener(provider);
                workspaceCtx.effect(() => async () => {
                    if (this.workspaceContext !== workspaceCtx)
                        return;
                    this.workspaceContext = undefined;
                    const current = this.provider;
                    if (current !== undefined)
                        await this.stopListener(current);
                }, 'awiki: release Workspace listener composition');
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
                mailServiceUrl: this.resolved.mailServiceUrl,
                messageServicePublicUrl: this.resolved.messageServicePublicUrl,
                messageServiceDid: this.resolved.messageServiceDid,
                allowedAttachmentOrigins: this.resolved.allowedAttachmentOrigins,
                attachmentMaxBytes: this.resolved.attachmentMaxBytes,
                allowInsecureLoopbackForTesting: this.resolved.allowInsecureLoopbackForTesting,
                stateRoot: this.resolved.stateRoot,
            });
            const provider = {
                client,
                listenerRestartAttempt: 0,
                listenerGeneration: 0,
                listenerRecoveryBlocked: false,
            };
            this.provider = provider;
            void this.startListener(provider);
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
        async getIdentity() {
            const result = await this.run(client => client.getIdentity());
            if (result.ok)
                this.activeIdentityDid = result.value?.did;
            return result;
        }
        /** Return the local registration and sign-in state without exposing secrets. */
        async getSession() {
            if (await this.isSignedOut()) {
                this.activeIdentityDid = undefined;
                return { ok: true, value: { status: 'signed-out' } };
            }
            const identity = await this.run(client => client.getIdentity(), { allowSignedOut: true });
            if (!identity.ok)
                return identity;
            this.activeIdentityDid = identity.value?.did;
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
                    this.activeIdentityDid = undefined;
                    this.invalidateSummaries();
                    const session = { status: 'signed-out' };
                    this.publishSession(session);
                    const provider = this.provider;
                    if (provider !== undefined)
                        await this.stopListener(provider);
                    return { ok: true, value: session };
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
                    this.activeIdentityDid = identity.value.did;
                    this.invalidateSummaries();
                    const session = { status: 'active', identity: identity.value };
                    this.publishSession(session);
                    const provider = this.provider;
                    if (provider !== undefined)
                        void this.startListener(provider);
                    return { ok: true, value: session };
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
        async registerIdentity(request) {
            const result = await this.run(client => client.registerIdentity(request));
            if (result.ok) {
                this.activeIdentityDid = result.value.did;
                this.publishSession({ status: 'active', identity: result.value });
                const provider = this.provider;
                if (provider !== undefined) {
                    await provider.listenerStartup;
                    await this.startListener(provider);
                }
            }
            return result;
        }
        /**
         * Update the deployment identity's public WNS display name.
         * @param request - replacement display name selected by the user.
         * @returns The updated public identity or a closed failure.
         */
        async updateDisplayName(request) {
            const result = await this.run(client => client.updateDisplayName(request));
            if (result.ok)
                this.activeIdentityDid = result.value.did;
            return result;
        }
        /**
         * Resolve one Handle or DID before the browser opens a direct chat.
         * @param request - typed Handle or DID.
         * @returns The public peer and conversation id, or a closed failure.
         */
        resolvePeer(request) {
            return this.run(client => client.resolvePeer(request.peer));
        }
        /**
         * Create one group, then settle every initial-member invitation without hiding a created group.
         * @param request - bounded group name and initial Handle/DID values.
         * @returns The created conversation and per-member outcomes.
         */
        async createGroup(request) {
            const normalized = normalizeCreateGroupRequest(request);
            if (normalized === undefined)
                return { ok: false, error: failure('invalid-request') };
            const created = await this.run(client => client.createGroup(normalized.name));
            if (!created.ok)
                return created;
            const addedMembers = [];
            const failedMembers = [];
            for (const member of normalized.members) {
                const result = await this.run(client => client.addGroupMember(created.value.groupDid, member));
                if (result.ok)
                    addedMembers.push(result.value);
                else
                    failedMembers.push({ member, error: result.error });
            }
            return {
                ok: true,
                value: { conversation: created.value, addedMembers, failedMembers },
            };
        }
        /**
         * List direct and existing group conversations.
         * @param request - Optional opaque cursor and page limit.
         * @returns One page of direct and existing group conversations.
         */
        listConversations(request) {
            return this.run(client => client.listConversations(request));
        }
        /**
         * Read one direct or group conversation history page.
         * @param request - Conversation id, optional cursor, and page limit.
         * @returns One chronological history page.
         */
        getHistory(request) {
            return this.run(client => client.getHistory(request));
        }
        /** Read one committed local conversation page without sync, history, or Directory RPC. */
        getLocalHistory(request) {
            return this.run(client => client.getLocalHistory(request));
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
            const historyResult = await this.run(client => client.getHistory({
                conversationId: request.conversationId,
                limit: MAX_SUMMARY_MESSAGES,
            }));
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
            return this.run(client => client.markConversationRead(request.conversationId));
        }
        /**
         * Send one text message through the deployment identity.
         * @param request - Target, text, and idempotency key.
         * @returns The accepted public message or a closed failure.
         */
        sendText(request) {
            return this.run(client => client.sendText(request));
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
            return this.run(async (client) => {
                const message = await client.sendAttachment({
                    target: request.target,
                    attachment: {
                        fileName: request.fileName,
                        mimeType: request.mimeType,
                        bytes: decoded.value,
                    },
                    ...request.caption === undefined ? {} : { caption: request.caption },
                    idempotencyKey: request.idempotencyKey,
                });
                if (message.content.kind === 'attachment') {
                    const ownerDid = this.activeIdentityDid ?? (await client.getIdentity().catch(() => null))?.did;
                    if (ownerDid !== undefined) {
                        this.activeIdentityDid = ownerDid;
                        await this.imageAttachmentCache.write(ownerDid, message.id, {
                            attachment: message.content.attachment,
                            bytes: decoded.value,
                        }).catch(() => undefined);
                    }
                }
                return message;
            }, { skipAttachmentByteValidation: true });
        }
        /**
         * Download and encode one provider-verified attachment.
         * @param request - Containing message id and attachment id.
         * @returns Verified public metadata and canonical Base64 bytes, or a closed failure.
         */
        async downloadAttachment(request) {
            try {
                if (await this.isSignedOut())
                    return { ok: false, error: failure('signed-out') };
            }
            catch {
                return { ok: false, error: failure('remote') };
            }
            if (this.provider !== undefined && this.activeIdentityDid !== undefined) {
                const cached = await this.imageAttachmentCache.read(this.activeIdentityDid, request);
                if (cached !== undefined)
                    return this.publicDownloadedAttachment(cached);
            }
            const result = await this.run(async (client) => {
                const identity = this.activeIdentityDid === undefined ? await client.getIdentity() : undefined;
                const ownerDid = this.activeIdentityDid ?? identity?.did;
                if (ownerDid === undefined)
                    throw Object.assign(new Error('not registered'), { name: 'AwikiSdkError', code: 'not-registered' });
                this.activeIdentityDid = ownerDid;
                const cached = await this.imageAttachmentCache.read(ownerDid, request);
                if (cached !== undefined)
                    return cached;
                const downloaded = await client.downloadAttachment(request);
                await this.imageAttachmentCache.write(ownerDid, request.messageId, downloaded).catch(() => undefined);
                return downloaded;
            }, { skipAttachmentByteValidation: true });
            if (!result.ok)
                return result;
            return this.publicDownloadedAttachment(result.value);
        }
        /** Revalidate cached/provider bytes before crossing the browser Remote boundary. */
        publicDownloadedAttachment(value) {
            if (value.bytes.byteLength > this.resolved.attachmentMaxBytes) {
                return { ok: false, error: failure('attachment-too-large') };
            }
            if (value.bytes.byteLength !== value.attachment.size) {
                return { ok: false, error: failure('remote') };
            }
            return { ok: true, value: downloadedAttachment(value) };
        }
        /** Return the deployment identity's public mailbox state. */
        getMailAccount() {
            return this.run(client => client.getMailAccount());
        }
        /** List one bounded mailbox page on explicit browser/tool demand. */
        async listMailInbox(request) {
            let normalized;
            try {
                normalized = mailInboxRequest(request ?? {});
            }
            catch {
                return { ok: false, error: failure('invalid-request') };
            }
            return this.run(async (client) => {
                if (normalized.folder !== 'sent')
                    return client.listMailInbox(normalized);
                return this.sentMailStore.list(await this.ownerDid(client), normalized);
            });
        }
        /** Read one bounded plain-text mail message. */
        async readMail(request) {
            let normalized;
            try {
                normalized = mailReadRequest(request);
            }
            catch {
                return { ok: false, error: failure('invalid-request') };
            }
            return this.run(async (client) => {
                if (!isLocalSentMailId(normalized.messageId))
                    return client.readMail(normalized);
                const local = await this.sentMailStore.read(await this.ownerDid(client), normalized.messageId);
                if (local === undefined) {
                    throw Object.assign(new Error('sent mail not found'), { name: 'AwikiSdkError', code: 'not-found' });
                }
                return local;
            });
        }
        /** Mark explicitly selected mail messages read. Browser callers require an explicit click. */
        markMailRead(request) {
            return this.runValidatedMail(() => mailMarkReadRequest(request), (client, normalized) => client.markMailRead(normalized));
        }
        /** Send one plain-text mail once. Browser callers require an explicit confirmation. */
        async sendMail(request) {
            let normalized;
            try {
                normalized = mailSendRequest(request);
            }
            catch {
                return { ok: false, error: failure('invalid-request') };
            }
            return this.run(async (client) => {
                const result = await client.sendMail(normalized);
                if (!result.accepted)
                    return result;
                try {
                    const ownerDid = await this.ownerDid(client);
                    const account = await client.getMailAccount().catch(() => undefined);
                    await this.sentMailStore.append(ownerDid, normalized, result, account);
                    return result;
                }
                catch {
                    return result.warnings.length >= 100
                        ? result
                        : { ...result, warnings: [...result.warnings, 'Sent history could not be saved locally.'] };
                }
            });
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
                const provider = this.provider;
                if (provider !== undefined)
                    await this.stopListener(provider);
                const result = await this.run(client => client.clearLocalData(), { allowSignedOut: true });
                if (!result.ok) {
                    if (provider !== undefined && this.provider === provider)
                        void this.startListener(provider);
                    return result;
                }
                try {
                    await this.imageAttachmentCache.clear();
                    await this.sentMailStore.clear();
                    await this.sessionStore.signIn();
                    this.signedOut = false;
                    this.activeIdentityDid = undefined;
                    this.invalidateSummaries();
                    this.publishSession({ status: 'unregistered' });
                    if (provider !== undefined && this.provider === provider)
                        void this.startListener(provider);
                    return result;
                }
                catch {
                    return { ok: false, error: failure('remote') };
                }
            });
        }
        /** Invalidate cached session work and cancel every model request still owned by the old session. */
        invalidateSummaries() {
            this.sessionRevision += 1;
            for (const controller of this.activeSummaryRequests)
                controller.abort();
            this.activeSummaryRequests.clear();
        }
        /** Publish a committed session transition to same-process Host consumers. */
        publishSession(session) {
            this.hostContext.emit('awiki/session', session);
        }
        /** Resolve and cache the owner binding required by private Host-side projections. */
        async ownerDid(client) {
            const identity = this.activeIdentityDid === undefined ? await client.getIdentity() : undefined;
            const ownerDid = this.activeIdentityDid ?? identity?.did;
            if (ownerDid === undefined) {
                throw Object.assign(new Error('not registered'), { name: 'AwikiSdkError', code: 'not-registered' });
            }
            this.activeIdentityDid = ownerDid;
            return ownerDid;
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
        /** Validate mail input before entering the provider and preserve fixed public failures. */
        runValidatedMail(validate, operation) {
            let request;
            try {
                request = validate();
            }
            catch {
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            }
            return this.run(client => operation(client, request));
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
        /** Start one exact identity-bound listener, atomically releasing a failed startup. */
        startListener(provider) {
            if (!this.resolved.listenerEnabled
                || provider.listener !== undefined
                || provider.listenerRecoveryBlocked
                || this.provider !== provider) {
                return Promise.resolve();
            }
            if (provider.listenerStartup !== undefined)
                return provider.listenerStartup;
            if (provider.listenerCleanup !== undefined || provider.listenerRestartTimer !== undefined)
                return Promise.resolve();
            const workspaceContext = this.workspaceContext;
            const source = provider.client.listener;
            if (workspaceContext === undefined || source === undefined)
                return Promise.resolve();
            const generation = provider.listenerGeneration;
            const logger = this.ctx.logger('awiki-listener');
            const startup = (async () => {
                if (await this.isSignedOut())
                    return;
                if (await provider.client.getIdentity() === null)
                    return;
                if (!this.listenerFenceMatches(provider, workspaceContext, generation))
                    return;
                const agents = new DshAwikiListenerAgentRuntime(workspaceContext, this.resolved.listener.workspacePath);
                const listener = new AwikiAgentListener(source, agents, this.resolved.listener, logger);
                provider.listener = listener;
                try {
                    await listener.start();
                }
                catch (error) {
                    if (provider.listener === listener)
                        delete provider.listener;
                    try {
                        await listener.dispose();
                    }
                    catch {
                        provider.listenerRecoveryBlocked = true;
                    }
                    if (!provider.listenerRecoveryBlocked && provider.listenerRestartAttempt > 0) {
                        this.scheduleListenerRestart(provider, workspaceContext, generation);
                    }
                    throw error;
                }
                if (!this.listenerFenceMatches(provider, workspaceContext, generation)) {
                    if (provider.listener === listener)
                        delete provider.listener;
                    try {
                        await listener.dispose();
                    }
                    catch (error) {
                        provider.listenerRecoveryBlocked = true;
                        throw error;
                    }
                    return;
                }
                provider.listenerStartedAt = Date.now();
                void listener.whenTerminated().then((result) => {
                    if (result.kind === 'failed') {
                        this.releaseFailedListener(provider, listener, workspaceContext, generation, result.error);
                    }
                });
            })();
            const observed = startup
                .catch((error) => {
                logger.warn('AWiki listener startup failed: %s', error instanceof Error ? error.message : 'unknown failure');
            })
                .finally(() => {
                if (provider.listenerStartup === observed)
                    delete provider.listenerStartup;
            });
            provider.listenerStartup = observed;
            return observed;
        }
        async stopListener(provider) {
            provider.listenerGeneration += 1;
            provider.listenerRestartAttempt = 0;
            delete provider.listenerStartedAt;
            const timer = provider.listenerRestartTimer;
            if (timer !== undefined) {
                delete provider.listenerRestartTimer;
                clearTimeout(timer);
            }
            await provider.listenerStartup;
            await provider.listenerCleanup;
            const listener = provider.listener;
            if (listener === undefined)
                return;
            delete provider.listener;
            try {
                await listener.dispose();
            }
            catch (error) {
                provider.listenerRecoveryBlocked = true;
                throw error;
            }
        }
        listenerFenceMatches(provider, workspaceContext, generation) {
            return this.provider === provider
                && this.workspaceContext === workspaceContext
                && provider.listenerGeneration === generation;
        }
        releaseFailedListener(provider, listener, workspaceContext, generation, error) {
            if (provider.listener !== listener)
                return;
            delete provider.listener;
            const startedAt = provider.listenerStartedAt;
            delete provider.listenerStartedAt;
            if (startedAt !== undefined && Date.now() - startedAt >= LISTENER_STABLE_RESET_MS) {
                provider.listenerRestartAttempt = 0;
            }
            const logger = this.ctx.logger('awiki-listener');
            logger.warn('AWiki listener lifecycle failed: %s', error instanceof Error ? error.message : 'unknown failure');
            let disposed = false;
            const cleanup = listener.dispose()
                .then(() => { disposed = true; }, (cleanupError) => {
                provider.listenerRecoveryBlocked = true;
                logger.warn('AWiki listener cleanup failed: %s', cleanupError instanceof Error ? cleanupError.message : 'unknown failure');
            });
            const observed = cleanup.finally(() => {
                if (provider.listenerCleanup === observed)
                    delete provider.listenerCleanup;
                if (disposed)
                    this.scheduleListenerRestart(provider, workspaceContext, generation);
            });
            provider.listenerCleanup = observed;
        }
        scheduleListenerRestart(provider, workspaceContext, generation) {
            if (provider.listenerRestartTimer !== undefined
                || !this.listenerFenceMatches(provider, workspaceContext, generation))
                return;
            provider.listenerRestartAttempt = Math.min(provider.listenerRestartAttempt + 1, LISTENER_RESTART_MAX_ATTEMPT);
            const exponent = provider.listenerRestartAttempt - 1;
            const delay = Math.min(LISTENER_RESTART_BASE_DELAY_MS * 2 ** exponent, LISTENER_RESTART_MAX_DELAY_MS);
            const timer = setTimeout(() => {
                if (provider.listenerRestartTimer !== timer)
                    return;
                delete provider.listenerRestartTimer;
                if (!this.listenerFenceMatches(provider, workspaceContext, generation))
                    return;
                void this.startListener(provider);
            }, delay);
            provider.listenerRestartTimer = timer;
        }
        /** Clear one exact provider slot before joining its one shared disposal. */
        disposeProvider(provider) {
            if (this.provider === provider)
                this.provider = undefined;
            provider.disposal ??= (async () => {
                try {
                    await this.stopListener(provider);
                }
                finally {
                    await provider.client.dispose();
                }
            })();
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