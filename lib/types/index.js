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
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import z from '@deepseek-ai/schemastery';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from "./types.js";
import { AwikiExternalHttpAuthError, createAwikiExternalHttpAuth, externalHttpAuthError, mapProviderError as mapExternalHttpProviderError, } from "./external-http-auth.js";
import { AwikiIntegrationClient } from "./integration-client.js";
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
import { AwikiConversationPreferenceStore, normalizeConversationPreferenceMutation, } from "./conversation-preferences.js";
import { AwikiAgentListener, DshAwikiListenerAgentRuntime, } from "./listener.js";
import { IdentityRealtimeSupervisor, } from "./realtime-supervisor.js";
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
/** Default Guest Gateway and Lite Web origin. */
export const DEFAULT_AWIKI_GUEST_URL = 'https://awiki.info';
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
    guestGatewayUrl: z.string().default(DEFAULT_AWIKI_GUEST_URL),
    allowedAttachmentOrigins: z.array(z.string()).default([]),
    allowInsecureLoopbackForTesting: z.boolean().default(false),
    stateRoot: z.string(),
    attachmentMaxBytes: z.number().default(DEFAULT_ATTACHMENT_MAX_BYTES),
    imageAttachmentCacheMaxBytes: z.number().default(DEFAULT_IMAGE_ATTACHMENT_CACHE_MAX_BYTES),
    pollIntervalMs: z.number().default(DEFAULT_POLL_INTERVAL_MS),
    realtimeEnabled: z.boolean().default(true),
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
    'identity-recovery-required',
    'conflict',
    'rate-limited',
    'group-membership-required',
    'group-identity-stale',
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
const DEVICE_JOIN_APPROVAL_CONFIRMATION = 'APPROVE';
const DEVICE_REVOKE_CONFIRMATION = 'REVOKE';
const DEVICE_JOIN_CHALLENGE_TTL_SECONDS = 240;
const RESUMABLE_JOIN_PHASES = new Set([
    'pending',
    'challenge_prepared',
    'response_prepared',
    'response_verified',
    'approval_prepared',
    'authorized',
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
    'identity-recovery-required': 'The local AWiki identity must be recovered before it can be used again.',
    'conflict': 'The AWiki operation conflicts with current state.',
    'rate-limited': 'The AWiki service rate-limited the request.',
    'group-membership-required': 'The active AWiki identity is not a member of this group.',
    'group-identity-stale': 'The AWiki group identity binding is still recovering.',
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
function candidateJoinPhase(value) {
    if (value.remoteState === 'rejected')
        return 'rejected';
    if (value.remoteState === 'cancelled' || value.localPhase === 'cancelled')
        return 'cancelled';
    if (value.remoteState === 'expired' || value.localPhase === 'expired')
        return 'expired';
    if (value.localPhase === 'authorized'
        && value.remoteState === 'consumed'
        && value.completed
        && value.identity !== undefined)
        return 'authorized';
    if (value.sas !== undefined) {
        return value.remoteState === 'response_verified' && /^\d{6}$/u.test(value.sas)
            ? 'sas-ready'
            : undefined;
    }
    if (value.remoteState === 'challenge_sent'
        || value.remoteState === 'response_verified'
        || value.remoteState === 'consumed'
        || value.localPhase !== 'pending')
        return 'verifying';
    return value.remoteState === 'pending' ? 'pending' : undefined;
}
function adminJoinPhase(value) {
    if (value.remoteState === 'rejected')
        return 'rejected';
    if (value.remoteState === 'cancelled' || value.localPhase === 'cancelled')
        return 'cancelled';
    if (value.remoteState === 'expired' || value.localPhase === 'expired')
        return 'expired';
    if (value.localPhase === 'authorized' && value.remoteState === 'consumed')
        return 'authorized';
    if (value.sas !== undefined) {
        return value.remoteState === 'response_verified' && /^\d{6}$/u.test(value.sas)
            ? 'sas-ready'
            : undefined;
    }
    if (value.remoteState === 'challenge_sent'
        || value.remoteState === 'response_verified'
        || value.remoteState === 'consumed'
        || value.localPhase !== 'pending')
        return 'verifying';
    return value.remoteState === 'pending' ? 'pending' : undefined;
}
function requestJoinPhase(value) {
    switch (value.state) {
        case 'pending': return 'pending';
        case 'challenge_sent':
        case 'response_verified': return 'verifying';
        case 'consumed': return 'authorized';
        case 'cancelled': return 'cancelled';
        case 'rejected': return 'rejected';
        case 'expired': return 'expired';
    }
}
function constantTimeSasMatches(expected, actual) {
    if (!/^\d{6}$/u.test(expected) || !/^\d{6}$/u.test(actual))
        return false;
    return timingSafeEqual(Buffer.from(expected, 'ascii'), Buffer.from(actual, 'ascii'));
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
    const realtimeEnabled = config.realtimeEnabled ?? true;
    if (listenerEnabled && !realtimeEnabled) {
        throw new TypeError('awiki: listenerEnabled requires realtimeEnabled');
    }
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
    const guestGatewayUrl = serviceUrl('guestGatewayUrl', config.guestGatewayUrl ?? DEFAULT_AWIKI_GUEST_URL, allowInsecureLoopbackForTesting);
    return {
        userServiceUrl,
        userServiceDomain: serviceDomain(config.userServiceDomain ?? DEFAULT_AWIKI_DOMAIN),
        messageServiceUrl,
        mailServiceUrl,
        messageServicePublicUrl,
        messageServiceDid: serviceDid(config.messageServiceDid ?? DEFAULT_AWIKI_MESSAGE_SERVICE_DID),
        guestGatewayUrl,
        allowedAttachmentOrigins: attachmentOrigins(config.allowedAttachmentOrigins, messageServicePublicUrl, allowInsecureLoopbackForTesting),
        allowInsecureLoopbackForTesting,
        stateRoot,
        attachmentMaxBytes,
        imageAttachmentCacheMaxBytes,
        pollIntervalMs,
        realtimeEnabled,
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
const MAX_PROFILE_DISPLAY_NAME_CHARACTERS = 50;
const MAX_PROFILE_BIO_CHARACTERS = 100;
const MAX_PROFILE_TAGS = 5;
const MAX_PROFILE_TAG_CHARACTERS = 30;
const MAX_MESSAGE_CHARACTERS = 20_000;
function normalizeCreateGroupRequest(request) {
    if (typeof request?.name !== 'string' || !Array.isArray(request.members))
        return undefined;
    const name = request.name.trim();
    if (name.length === 0 || Array.from(name).length > MAX_GROUP_NAME_CHARACTERS)
        return undefined;
    if (request.members.length > MAX_GROUP_INITIAL_MEMBERS)
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
    return { name, members };
}
function normalizeMember(value) {
    if (typeof value !== 'string')
        return undefined;
    const member = value.trim().replace(/^@+/u, '');
    return member.length > 0 && Array.from(member).length <= MAX_GROUP_MEMBER_CHARACTERS
        ? member
        : undefined;
}
function normalizeGroupDid(value) {
    if (typeof value !== 'string' || !value.startsWith('did:') || value.length > 2_048)
        return undefined;
    return value;
}
function normalizeProfileRequest(request) {
    if (typeof request?.displayName !== 'string' || typeof request.bio !== 'string' || !Array.isArray(request.tags))
        return undefined;
    const displayName = request.displayName.trim();
    const bio = request.bio.trim();
    if (displayName.length === 0
        || Array.from(displayName).length > MAX_PROFILE_DISPLAY_NAME_CHARACTERS
        || Array.from(bio).length > MAX_PROFILE_BIO_CHARACTERS
        || request.tags.length > MAX_PROFILE_TAGS)
        return undefined;
    const tags = [];
    const seen = new Set();
    for (const raw of request.tags) {
        if (typeof raw !== 'string')
            return undefined;
        const tag = raw.trim();
        const key = tag.toLocaleLowerCase();
        if (tag.length === 0 || Array.from(tag).length > MAX_PROFILE_TAG_CHARACTERS || seen.has(key))
            return undefined;
        seen.add(key);
        tags.push(tag);
    }
    return { displayName, bio, tags };
}
function normalizeRecoveryOperation(request) {
    if (typeof request?.operationId !== 'string')
        return undefined;
    const operationId = request.operationId.trim();
    return operationId.length > 0 && operationId.length <= 512 ? { operationId } : undefined;
}
function normalizeRecoveryOtpRequest(request) {
    if (typeof request?.fullHandle !== 'string' || typeof request.phone !== 'string')
        return undefined;
    const fullHandle = request.fullHandle.trim().replace(/^@+/u, '');
    const phone = request.phone.trim();
    if (fullHandle.length === 0 || fullHandle.length > 512 || phone.length < 5 || phone.length > 32)
        return undefined;
    return { fullHandle, phone };
}
function normalizeRecoveryPrepareRequest(request) {
    const operation = normalizeRecoveryOperation(request);
    if (operation === undefined || typeof request.phone !== 'string' || typeof request.otp !== 'string')
        return undefined;
    const phone = request.phone.trim();
    const otp = request.otp.trim();
    if (phone.length < 5 || phone.length > 32 || !/^\d{4,12}$/u.test(otp))
        return undefined;
    return { ...operation, phone, otp };
}
const IDENTITY_ACCESS_RESPONSE_MAX_BYTES = 64 * 1024;
const SERVER_INFO_RESPONSE_MAX_BYTES = 64 * 1024;
/** Read one untrusted discovery response without buffering beyond the fixed Host limit. */
async function readBoundedResponseText(response, maxBytes) {
    const declaredLength = response.headers.get('content-length');
    if (declaredLength !== null && /^\d+$/u.test(declaredLength) && Number(declaredLength) > maxBytes)
        return undefined;
    if (response.body === null)
        return '';
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    try {
        while (true) {
            const result = await reader.read();
            if (result.done)
                break;
            length += result.value.byteLength;
            if (length > maxBytes) {
                await reader.cancel();
                return undefined;
            }
            chunks.push(Uint8Array.from(result.value));
        }
    }
    catch {
        return undefined;
    }
    finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return Buffer.from(bytes).toString('utf8');
}
/** Resolve one configured-domain Handle without widening registration authority. */
function identityAccessTarget(request, configuredDomain) {
    if (typeof request?.handle !== 'string')
        return undefined;
    const raw = request.handle.trim();
    if (raw.length === 0 || raw.length > 255 || /[\u0000-\u001f\u007f]/u.test(raw))
        return undefined;
    const lowered = raw.replace(/[A-Z]/gu, character => character.toLowerCase());
    const handle = lowered.startsWith('wba://') ? lowered.slice('wba://'.length) : lowered;
    const dot = handle.indexOf('.');
    const localPart = (dot < 0 ? handle : handle.slice(0, dot)).trim();
    const domain = (dot < 0 ? configuredDomain : handle.slice(dot + 1)).trim().replace(/\.$/u, '');
    if (localPart.length === 0 || domain !== configuredDomain)
        return undefined;
    return { localPart, fullHandle: `${localPart}.${configuredDomain}` };
}
function normalizeSendTextRequest(request) {
    if (typeof request?.text !== 'string' || typeof request.idempotencyKey !== 'string'
        || typeof request.target !== 'object' || request.target === null)
        return undefined;
    const text = request.text;
    const codePoints = Array.from(text);
    if (text.trim().length === 0 || codePoints.length > MAX_MESSAGE_CHARACTERS
        || request.idempotencyKey.length === 0 || request.idempotencyKey.length > 512)
        return undefined;
    if (request.target.kind === 'direct') {
        if (typeof request.target.peer !== 'string' || request.mentions !== undefined)
            return undefined;
    }
    else if (request.target.kind === 'group') {
        if (typeof request.target.group !== 'string')
            return undefined;
    }
    else
        return undefined;
    if (request.mentions === undefined)
        return request;
    if (!Array.isArray(request.mentions) || request.mentions.length === 0 || request.mentions.length > 100)
        return undefined;
    const ids = new Set();
    let previousEnd = 0;
    const mentions = [...request.mentions].sort((left, right) => left.start - right.start || left.end - right.end);
    for (const mention of mentions) {
        if (typeof mention !== 'object' || mention === null
            || typeof mention.id !== 'string' || mention.id.trim() === '' || ids.has(mention.id)
            || !Number.isSafeInteger(mention.start) || !Number.isSafeInteger(mention.end)
            || mention.start < previousEnd || mention.start < 0 || mention.end <= mention.start || mention.end > codePoints.length
            || typeof mention.did !== 'string' || !mention.did.startsWith('did:')
            || (mention.displayName !== undefined && typeof mention.displayName !== 'string'))
            return undefined;
        ids.add(mention.id);
        previousEnd = mention.end;
    }
    return { ...request, mentions };
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
    let _getIntegration_decorators;
    let _createIntegration_decorators;
    let _updateIntegration_decorators;
    let _rotateIntegrationId_decorators;
    let _closeIntegration_decorators;
    let _reopenIntegration_decorators;
    let _getIdentity_decorators;
    let _getSession_decorators;
    let _logout_decorators;
    let _login_decorators;
    let _inspectIdentityAccess_decorators;
    let _sendRegistrationOtp_decorators;
    let _registerIdentity_decorators;
    let _beginDeviceJoin_decorators;
    let _getDeviceJoinStatus_decorators;
    let _cancelDeviceJoin_decorators;
    let _refreshDeviceManagement_decorators;
    let _startDeviceJoinVerification_decorators;
    let _approveDeviceJoin_decorators;
    let _rejectDeviceJoin_decorators;
    let _revokeDevice_decorators;
    let _prepareRootTransfer_decorators;
    let _confirmRootTransfer_decorators;
    let _updateDisplayName_decorators;
    let _getProfile_decorators;
    let _updateProfile_decorators;
    let _sendRecoveryOtp_decorators;
    let _prepareRecovery_decorators;
    let _activateRecovery_decorators;
    let _getRecoveryStatus_decorators;
    let _resumeRecovery_decorators;
    let _discardRecovery_decorators;
    let _resolvePeer_decorators;
    let _createGroup_decorators;
    let _getGroup_decorators;
    let _joinGroup_decorators;
    let _leaveGroup_decorators;
    let _listGroupMembers_decorators;
    let _addGroupMember_decorators;
    let _removeGroupMember_decorators;
    let _getConversationPreferences_decorators;
    let _updateConversationPreference_decorators;
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
            _getIntegration_decorators = [Remote];
            _createIntegration_decorators = [Remote];
            _updateIntegration_decorators = [Remote];
            _rotateIntegrationId_decorators = [Remote];
            _closeIntegration_decorators = [Remote];
            _reopenIntegration_decorators = [Remote];
            _getIdentity_decorators = [Remote];
            _getSession_decorators = [Remote];
            _logout_decorators = [Remote];
            _login_decorators = [Remote];
            _inspectIdentityAccess_decorators = [Remote];
            _sendRegistrationOtp_decorators = [Remote];
            _registerIdentity_decorators = [Remote];
            _beginDeviceJoin_decorators = [Remote];
            _getDeviceJoinStatus_decorators = [Remote];
            _cancelDeviceJoin_decorators = [Remote];
            _refreshDeviceManagement_decorators = [Remote];
            _startDeviceJoinVerification_decorators = [Remote];
            _approveDeviceJoin_decorators = [Remote];
            _rejectDeviceJoin_decorators = [Remote];
            _revokeDevice_decorators = [Remote];
            _prepareRootTransfer_decorators = [Remote];
            _confirmRootTransfer_decorators = [Remote];
            _updateDisplayName_decorators = [Remote];
            _getProfile_decorators = [Remote];
            _updateProfile_decorators = [Remote];
            _sendRecoveryOtp_decorators = [Remote];
            _prepareRecovery_decorators = [Remote];
            _activateRecovery_decorators = [Remote];
            _getRecoveryStatus_decorators = [Remote];
            _resumeRecovery_decorators = [Remote];
            _discardRecovery_decorators = [Remote];
            _resolvePeer_decorators = [Remote];
            _createGroup_decorators = [Remote];
            _getGroup_decorators = [Remote];
            _joinGroup_decorators = [Remote];
            _leaveGroup_decorators = [Remote];
            _listGroupMembers_decorators = [Remote];
            _addGroupMember_decorators = [Remote];
            _removeGroupMember_decorators = [Remote];
            _getConversationPreferences_decorators = [Remote];
            _updateConversationPreference_decorators = [Remote];
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
            __esDecorate(this, null, _getIntegration_decorators, { kind: "method", name: "getIntegration", static: false, private: false, access: { has: obj => "getIntegration" in obj, get: obj => obj.getIntegration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _createIntegration_decorators, { kind: "method", name: "createIntegration", static: false, private: false, access: { has: obj => "createIntegration" in obj, get: obj => obj.createIntegration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _updateIntegration_decorators, { kind: "method", name: "updateIntegration", static: false, private: false, access: { has: obj => "updateIntegration" in obj, get: obj => obj.updateIntegration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _rotateIntegrationId_decorators, { kind: "method", name: "rotateIntegrationId", static: false, private: false, access: { has: obj => "rotateIntegrationId" in obj, get: obj => obj.rotateIntegrationId }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _closeIntegration_decorators, { kind: "method", name: "closeIntegration", static: false, private: false, access: { has: obj => "closeIntegration" in obj, get: obj => obj.closeIntegration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _reopenIntegration_decorators, { kind: "method", name: "reopenIntegration", static: false, private: false, access: { has: obj => "reopenIntegration" in obj, get: obj => obj.reopenIntegration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getIdentity_decorators, { kind: "method", name: "getIdentity", static: false, private: false, access: { has: obj => "getIdentity" in obj, get: obj => obj.getIdentity }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getSession_decorators, { kind: "method", name: "getSession", static: false, private: false, access: { has: obj => "getSession" in obj, get: obj => obj.getSession }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _logout_decorators, { kind: "method", name: "logout", static: false, private: false, access: { has: obj => "logout" in obj, get: obj => obj.logout }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _login_decorators, { kind: "method", name: "login", static: false, private: false, access: { has: obj => "login" in obj, get: obj => obj.login }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _inspectIdentityAccess_decorators, { kind: "method", name: "inspectIdentityAccess", static: false, private: false, access: { has: obj => "inspectIdentityAccess" in obj, get: obj => obj.inspectIdentityAccess }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _sendRegistrationOtp_decorators, { kind: "method", name: "sendRegistrationOtp", static: false, private: false, access: { has: obj => "sendRegistrationOtp" in obj, get: obj => obj.sendRegistrationOtp }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _registerIdentity_decorators, { kind: "method", name: "registerIdentity", static: false, private: false, access: { has: obj => "registerIdentity" in obj, get: obj => obj.registerIdentity }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _beginDeviceJoin_decorators, { kind: "method", name: "beginDeviceJoin", static: false, private: false, access: { has: obj => "beginDeviceJoin" in obj, get: obj => obj.beginDeviceJoin }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getDeviceJoinStatus_decorators, { kind: "method", name: "getDeviceJoinStatus", static: false, private: false, access: { has: obj => "getDeviceJoinStatus" in obj, get: obj => obj.getDeviceJoinStatus }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _cancelDeviceJoin_decorators, { kind: "method", name: "cancelDeviceJoin", static: false, private: false, access: { has: obj => "cancelDeviceJoin" in obj, get: obj => obj.cancelDeviceJoin }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _refreshDeviceManagement_decorators, { kind: "method", name: "refreshDeviceManagement", static: false, private: false, access: { has: obj => "refreshDeviceManagement" in obj, get: obj => obj.refreshDeviceManagement }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _startDeviceJoinVerification_decorators, { kind: "method", name: "startDeviceJoinVerification", static: false, private: false, access: { has: obj => "startDeviceJoinVerification" in obj, get: obj => obj.startDeviceJoinVerification }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _approveDeviceJoin_decorators, { kind: "method", name: "approveDeviceJoin", static: false, private: false, access: { has: obj => "approveDeviceJoin" in obj, get: obj => obj.approveDeviceJoin }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _rejectDeviceJoin_decorators, { kind: "method", name: "rejectDeviceJoin", static: false, private: false, access: { has: obj => "rejectDeviceJoin" in obj, get: obj => obj.rejectDeviceJoin }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _revokeDevice_decorators, { kind: "method", name: "revokeDevice", static: false, private: false, access: { has: obj => "revokeDevice" in obj, get: obj => obj.revokeDevice }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _prepareRootTransfer_decorators, { kind: "method", name: "prepareRootTransfer", static: false, private: false, access: { has: obj => "prepareRootTransfer" in obj, get: obj => obj.prepareRootTransfer }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _confirmRootTransfer_decorators, { kind: "method", name: "confirmRootTransfer", static: false, private: false, access: { has: obj => "confirmRootTransfer" in obj, get: obj => obj.confirmRootTransfer }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _updateDisplayName_decorators, { kind: "method", name: "updateDisplayName", static: false, private: false, access: { has: obj => "updateDisplayName" in obj, get: obj => obj.updateDisplayName }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getProfile_decorators, { kind: "method", name: "getProfile", static: false, private: false, access: { has: obj => "getProfile" in obj, get: obj => obj.getProfile }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _updateProfile_decorators, { kind: "method", name: "updateProfile", static: false, private: false, access: { has: obj => "updateProfile" in obj, get: obj => obj.updateProfile }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _sendRecoveryOtp_decorators, { kind: "method", name: "sendRecoveryOtp", static: false, private: false, access: { has: obj => "sendRecoveryOtp" in obj, get: obj => obj.sendRecoveryOtp }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _prepareRecovery_decorators, { kind: "method", name: "prepareRecovery", static: false, private: false, access: { has: obj => "prepareRecovery" in obj, get: obj => obj.prepareRecovery }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _activateRecovery_decorators, { kind: "method", name: "activateRecovery", static: false, private: false, access: { has: obj => "activateRecovery" in obj, get: obj => obj.activateRecovery }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getRecoveryStatus_decorators, { kind: "method", name: "getRecoveryStatus", static: false, private: false, access: { has: obj => "getRecoveryStatus" in obj, get: obj => obj.getRecoveryStatus }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _resumeRecovery_decorators, { kind: "method", name: "resumeRecovery", static: false, private: false, access: { has: obj => "resumeRecovery" in obj, get: obj => obj.resumeRecovery }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _discardRecovery_decorators, { kind: "method", name: "discardRecovery", static: false, private: false, access: { has: obj => "discardRecovery" in obj, get: obj => obj.discardRecovery }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _resolvePeer_decorators, { kind: "method", name: "resolvePeer", static: false, private: false, access: { has: obj => "resolvePeer" in obj, get: obj => obj.resolvePeer }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _createGroup_decorators, { kind: "method", name: "createGroup", static: false, private: false, access: { has: obj => "createGroup" in obj, get: obj => obj.createGroup }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getGroup_decorators, { kind: "method", name: "getGroup", static: false, private: false, access: { has: obj => "getGroup" in obj, get: obj => obj.getGroup }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _joinGroup_decorators, { kind: "method", name: "joinGroup", static: false, private: false, access: { has: obj => "joinGroup" in obj, get: obj => obj.joinGroup }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _leaveGroup_decorators, { kind: "method", name: "leaveGroup", static: false, private: false, access: { has: obj => "leaveGroup" in obj, get: obj => obj.leaveGroup }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listGroupMembers_decorators, { kind: "method", name: "listGroupMembers", static: false, private: false, access: { has: obj => "listGroupMembers" in obj, get: obj => obj.listGroupMembers }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _addGroupMember_decorators, { kind: "method", name: "addGroupMember", static: false, private: false, access: { has: obj => "addGroupMember" in obj, get: obj => obj.addGroupMember }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _removeGroupMember_decorators, { kind: "method", name: "removeGroupMember", static: false, private: false, access: { has: obj => "removeGroupMember" in obj, get: obj => obj.removeGroupMember }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getConversationPreferences_decorators, { kind: "method", name: "getConversationPreferences", static: false, private: false, access: { has: obj => "getConversationPreferences" in obj, get: obj => obj.getConversationPreferences }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _updateConversationPreference_decorators, { kind: "method", name: "updateConversationPreference", static: false, private: false, access: { has: obj => "updateConversationPreference" in obj, get: obj => obj.updateConversationPreference }, metadata: _metadata }, null, _instanceExtraInitializers);
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
        conversationPreferenceStore;
        startupUserServiceDomain;
        settingsProvider;
        provider;
        signedOut;
        sessionMutation = Promise.resolve();
        sessionRevision = 0;
        activeIdentityDid;
        pendingDeviceJoin;
        activeDeviceJoinSessionId;
        requestRefs = new Map();
        requestSessions = new Map();
        deviceRefs = new Map();
        deviceIds = new Map();
        rootTransfers = new Map();
        activeSummaryRequests = new Set();
        summaryProvider;
        hostContext;
        /** Trusted same-process external HTTP authentication dispatcher. Never Remote. */
        externalHttpAuth;
        integrationClient;
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
            this.integrationClient = new AwikiIntegrationClient(this.resolved.guestGatewayUrl, this.externalHttpAuth);
            this.sessionStore = new AwikiSessionStore(this.resolved.stateRoot);
            this.imageAttachmentCache = new AwikiImageAttachmentCache(this.resolved.stateRoot, this.resolved.attachmentMaxBytes, this.resolved.imageAttachmentCacheMaxBytes);
            this.sentMailStore = new AwikiSentMailStore(this.resolved.stateRoot);
            this.conversationPreferenceStore = new AwikiConversationPreferenceStore(this.resolved.stateRoot);
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
                    this.ensureAgentConsumer(provider);
                workspaceCtx.effect(() => async () => {
                    if (this.workspaceContext !== workspaceCtx)
                        return;
                    this.workspaceContext = undefined;
                    const current = this.provider;
                    if (current !== undefined)
                        await this.stopAgentConsumer(current);
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
            this.pendingDeviceJoin = undefined;
            this.activeDeviceJoinSessionId = undefined;
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
                realtimeGeneration: 0,
                agentConsumerGeneration: 0,
                localDeviceJoinRequestCountAfterSync: 0,
            };
            this.provider = provider;
            this.ensureRealtimeSupervisor(provider);
            this.ensureAgentConsumer(provider);
            return () => this.disposeProvider(provider);
        }
        /** Safe same-process diagnostics for focused E2E. Never exposed through Typert Remote. */
        getRealtimeDiagnostics() {
            const provider = this.provider;
            const realtime = provider?.realtimeSupervisor?.diagnostics() ?? {
                connected: false,
                activeSessionCount: 0,
                startCount: 0,
                stopCount: 0,
                maxActiveSessionCount: 0,
                generation: 0,
                retryCount: 0,
                lifecyclePhase: 'idle',
            };
            return {
                ...realtime,
                localDeviceJoinRequestCountAfterSync: provider?.localDeviceJoinRequestCountAfterSync ?? 0,
            };
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
        async getConfig() {
            let handleRecoveryPhoneEnabled = false;
            const abort = new AbortController();
            const timeout = setTimeout(() => { abort.abort(); }, 10_000);
            try {
                const response = await fetch(new URL('/user-service/v1/server-info', this.resolved.userServiceUrl), {
                    method: 'GET',
                    headers: { accept: 'application/json', 'cache-control': 'no-store' },
                    cache: 'no-store',
                    redirect: 'error',
                    signal: abort.signal,
                });
                if (response.ok) {
                    const text = await readBoundedResponseText(response, SERVER_INFO_RESPONSE_MAX_BYTES);
                    const value = text === undefined ? undefined : JSON.parse(text);
                    if (typeof value === 'object' && value !== null && value.schema_version === 1) {
                        const methods = value.identity?.handle_recovery?.methods;
                        handleRecoveryPhoneEnabled = Array.isArray(methods) && methods.some((method) => (typeof method === 'object' && method !== null
                            && method.id === 'phone'
                            && method.enabled === true
                            && method.verification?.required === true
                            && method.verification?.type === 'sms_otp'));
                    }
                }
            }
            catch { }
            finally {
                clearTimeout(timeout);
            }
            return {
                ok: true,
                value: {
                    pollIntervalMs: this.resolved.pollIntervalMs,
                    attachmentMaxBytes: this.resolved.attachmentMaxBytes,
                    handleRecoveryPhoneEnabled,
                    integrationGuideUrl: new URL('/guest/guide/integration', this.resolved.guestGatewayUrl).toString(),
                },
            };
        }
        /** Read the Integration owned by the active full Handle through the fixed Host client. */
        getIntegration() {
            return this.integrationClient.read();
        }
        /** Create the active full Handle's only Integration. */
        createIntegration(request) {
            return this.integrationClient.create(request);
        }
        /** Update editable Integration fields with optimistic concurrency. */
        updateIntegration(request) {
            return this.integrationClient.update(request);
        }
        /** Atomically replace the current public Integration id. */
        rotateIntegrationId(request) {
            return this.integrationClient.rotate(request);
        }
        /** Close the Integration and revoke its current public id. */
        closeIntegration(request) {
            return this.integrationClient.close(request);
        }
        /** Revalidate one closed Integration and issue a new public id. */
        reopenIntegration(request) {
            return this.integrationClient.reopen(request);
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
            const provider = this.provider;
            if (identity.value !== null && provider !== undefined)
                this.ensureProviderRuntime(provider);
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
                        await this.stopProviderRuntime(provider);
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
                        this.ensureProviderRuntime(provider);
                    return { ok: true, value: session };
                }
                catch {
                    return { ok: false, error: failure('remote') };
                }
            });
        }
        /** Classify one configured-domain Handle before selecting the registration or recovery OTP purpose. */
        async inspectIdentityAccess(request) {
            const target = identityAccessTarget(request, this.startupUserServiceDomain);
            if (target === undefined)
                return { ok: false, error: failure('invalid-request') };
            const endpoint = new URL(`/.well-known/handle/${encodeURIComponent(target.localPart)}`, this.resolved.userServiceUrl);
            const abort = new AbortController();
            const timeout = setTimeout(() => { abort.abort(); }, 10_000);
            let response;
            try {
                response = await fetch(endpoint, {
                    method: 'GET',
                    headers: { accept: 'application/json', 'cache-control': 'no-store' },
                    cache: 'no-store',
                    redirect: 'error',
                    signal: abort.signal,
                });
            }
            catch {
                return { ok: false, error: failure('network') };
            }
            finally {
                clearTimeout(timeout);
            }
            if (response.status === 404) {
                return { ok: true, value: { status: 'available', fullHandle: target.fullHandle } };
            }
            if (!response.ok)
                return { ok: false, error: failure('remote') };
            try {
                const text = await readBoundedResponseText(response, IDENTITY_ACCESS_RESPONSE_MAX_BYTES);
                if (text === undefined)
                    return { ok: false, error: failure('remote') };
                const value = JSON.parse(text);
                if (typeof value !== 'object' || value === null)
                    return { ok: false, error: failure('remote') };
                const binding = value;
                if (binding.handle !== target.fullHandle
                    || typeof binding.did !== 'string'
                    || !binding.did.startsWith('did:')
                    || typeof binding.status !== 'string'
                    || binding.status.length === 0) {
                    return { ok: false, error: failure('remote') };
                }
                return { ok: true, value: { status: 'existing', fullHandle: target.fullHandle } };
            }
            catch {
                return { ok: false, error: failure('remote') };
            }
        }
        async sendRegistrationOtp(request) {
            this.pendingDeviceJoin = undefined;
            return this.run(async (client) => {
                if (await this.selectDeviceJoinSession(client) !== null) {
                    throw Object.assign(new Error('join already exists'), { name: 'AwikiSdkError', code: 'conflict' });
                }
                return client.sendRegistrationOtp(request);
            });
        }
        /**
         * Register and persist the deployment's only AWiki identity.
         * @param request - Handle, phone, and verification code for registration.
         * @returns The new public identity or a closed failure.
         */
        async registerIdentity(request) {
            this.pendingDeviceJoin = undefined;
            const result = await this.run(async (client) => {
                if (await this.selectDeviceJoinSession(client) !== null) {
                    throw Object.assign(new Error('join already exists'), { name: 'AwikiSdkError', code: 'conflict' });
                }
                return client.registerIdentity(request);
            });
            if (!result.ok)
                return result;
            if (result.value.status === 'registered') {
                await this.activateRegisteredIdentity(result.value.identity);
                return { ok: true, value: { status: 'registered', identity: result.value.identity } };
            }
            this.pendingDeviceJoin = {
                continuationId: result.value.continuationId,
                fullHandle: result.value.fullHandle,
                mode: result.value.mode,
                requiresUserPresence: result.value.requiresUserPresence,
            };
            return {
                ok: true,
                value: {
                    status: 'join-required',
                    fullHandle: result.value.fullHandle,
                    mode: result.value.mode,
                    requiresUserPresence: result.value.requiresUserPresence,
                },
            };
        }
        /** Consume the exact in-memory continuation; ordinary Join never claims rebind user presence. */
        async beginDeviceJoin() {
            const continuation = this.pendingDeviceJoin;
            if (continuation === undefined)
                return { ok: false, error: failure('conflict') };
            if ((continuation.mode === 'ordinary' && continuation.requiresUserPresence)
                || (continuation.mode === 'handle-recovery-rebind' && !continuation.requiresUserPresence)) {
                return { ok: false, error: failure('forbidden') };
            }
            const result = await this.run(async (client) => {
                let userPresenceConfirmed = false;
                if (continuation.mode === 'handle-recovery-rebind') {
                    if (!client.trustedUserPresenceSupported) {
                        throw Object.assign(new Error('trusted user presence unsupported'), { name: 'AwikiSdkError', code: 'forbidden' });
                    }
                    userPresenceConfirmed = await client.confirmUserPresence('Rejoin your recovered AWiki identity on this device');
                    if (!userPresenceConfirmed) {
                        throw Object.assign(new Error('user presence denied'), { name: 'AwikiSdkError', code: 'forbidden' });
                    }
                }
                this.pendingDeviceJoin = undefined;
                return client.beginDeviceJoin({
                    continuationId: continuation.continuationId,
                    operationId: `dsh-device-join-${randomUUID()}`,
                    userPresenceConfirmed,
                });
            });
            if (!result.ok)
                return result;
            this.activeDeviceJoinSessionId = result.value.joinSessionId;
            return this.applyCandidateJoinProgress(result.value);
        }
        /** Restore from Core local_sessions and advance only the exact resumable Join. */
        async getDeviceJoinStatus() {
            const result = await this.run(async (client) => {
                const joinSessionId = await this.selectDeviceJoinSession(client);
                return joinSessionId === null ? null : client.getDeviceJoinStatus(joinSessionId);
            });
            if (!result.ok)
                return result;
            if (result.value === null)
                return { ok: true, value: null };
            this.activeDeviceJoinSessionId = result.value.joinSessionId;
            return this.applyCandidateJoinProgress(result.value);
        }
        async cancelDeviceJoin() {
            const result = await this.run(async (client) => {
                const joinSessionId = await this.selectDeviceJoinSession(client);
                if (joinSessionId === null)
                    return null;
                return client.cancelDeviceJoin(joinSessionId);
            });
            if (!result.ok)
                return result;
            this.pendingDeviceJoin = undefined;
            this.activeDeviceJoinSessionId = undefined;
            return { ok: true, value: { completed: true } };
        }
        /** Reliable-sync and project only Host-opaque device/request references. */
        refreshDeviceManagement() {
            return this.run(client => this.deviceManagementSnapshot(client));
        }
        async startDeviceJoinVerification(request) {
            const joinSessionId = this.requestSessions.get(request?.requestRef);
            if (joinSessionId === undefined)
                return { ok: false, error: failure('invalid-request') };
            const result = await this.run(async (client) => {
                await this.requireDeviceManager(client);
                await client.syncDeviceManagement();
                let notice = (await client.listLocalDeviceJoinRequests())
                    .find(value => value.joinSessionId === joinSessionId);
                if (notice === undefined) {
                    throw Object.assign(new Error('request not found'), { name: 'AwikiSdkError', code: 'not-found' });
                }
                const localProgress = await this.localAdminJoinProgress(client, notice);
                if (localProgress !== undefined)
                    return localProgress;
                if (!notice.canStartVerification) {
                    throw Object.assign(new Error('request unavailable'), { name: 'AwikiSdkError', code: 'forbidden' });
                }
                const operationId = `dsh-device-verify-${createHash('sha256').update(joinSessionId).digest('hex').slice(0, 32)}`;
                let started;
                try {
                    started = await client.startDeviceJoinVerification({
                        joinSessionId,
                        operationId,
                        challengeTtlSeconds: DEVICE_JOIN_CHALLENGE_TTL_SECONDS,
                    });
                }
                catch (error) {
                    await client.syncDeviceManagement();
                    notice = (await client.listLocalDeviceJoinRequests())
                        .find(value => value.joinSessionId === joinSessionId);
                    const recovered = notice === undefined ? undefined : await this.localAdminJoinProgress(client, notice);
                    if (recovered !== undefined)
                        return recovered;
                    throw error;
                }
                await client.syncDeviceManagement();
                notice = (await client.listLocalDeviceJoinRequests())
                    .find(value => value.joinSessionId === joinSessionId);
                if (notice === undefined)
                    return started;
                return (await this.localAdminJoinProgress(client, notice)) ?? started;
            });
            return result.ok ? this.publicAdminJoinProgress(request.requestRef, result.value) : result;
        }
        async approveDeviceJoin(request) {
            if (request?.confirmation !== DEVICE_JOIN_APPROVAL_CONFIRMATION) {
                return { ok: false, error: failure('invalid-request') };
            }
            const joinSessionId = this.requestSessions.get(request.requestRef);
            if (joinSessionId === undefined || !/^\d{6}$/u.test(request.enteredSas)) {
                return { ok: false, error: failure('invalid-request') };
            }
            const result = await this.run(async (client) => {
                await this.requireDeviceManager(client);
                const progress = await client.getLocalDeviceJoinVerificationProgress(joinSessionId);
                if (progress.sas === undefined || !constantTimeSasMatches(progress.sas, request.enteredSas)) {
                    throw Object.assign(new Error('sas mismatch'), { name: 'AwikiSdkError', code: 'forbidden' });
                }
                const prompt = await client.prepareDeviceJoinApproval(joinSessionId);
                return client.confirmDeviceJoinApproval(prompt.approvalHandle);
            });
            return result.ok ? this.publicAdminJoinProgress(request.requestRef, result.value) : result;
        }
        async rejectDeviceJoin(request) {
            const joinSessionId = this.requestSessions.get(request?.requestRef);
            if (joinSessionId === undefined
                || (request.reason !== 'user_rejected' && request.reason !== 'sas_mismatch')) {
                return { ok: false, error: failure('invalid-request') };
            }
            const result = await this.run(async (client) => {
                await this.requireDeviceManager(client);
                return client.rejectDeviceJoin(joinSessionId, request.reason);
            });
            return result.ok ? this.publicAdminJoinProgress(request.requestRef, result.value) : result;
        }
        async revokeDevice(request) {
            if (request?.confirmation !== DEVICE_REVOKE_CONFIRMATION) {
                return { ok: false, error: failure('invalid-request') };
            }
            const deviceId = this.deviceIds.get(request.deviceRef);
            if (deviceId === undefined)
                return { ok: false, error: failure('invalid-request') };
            return this.run(async (client) => {
                await this.requireDeviceManager(client);
                const devices = await client.getDeviceRegistry();
                const target = devices.find(device => device.deviceId === deviceId);
                if (target === undefined || target.isCurrent) {
                    throw Object.assign(new Error('device unavailable'), { name: 'AwikiSdkError', code: 'forbidden' });
                }
                await client.revokeDevice(deviceId);
                return this.deviceManagementSnapshot(client);
            });
        }
        /** Prepare a short-lived Core authorization without exposing it to Browser. */
        async prepareRootTransfer(request) {
            const deviceId = this.deviceIds.get(request?.deviceRef);
            if (deviceId === undefined)
                return { ok: false, error: failure('invalid-request') };
            return this.run(async (client) => {
                const did = await this.requireRootTransferRecipient(client, deviceId);
                const preparation = await client.prepareRootKeyTransfer(deviceId);
                if (preparation.recipient.did !== did || preparation.recipient.deviceId !== deviceId) {
                    throw Object.assign(new Error('root transfer recipient mismatch'), { name: 'AwikiSdkError', code: 'remote' });
                }
                for (const [reference, pending] of this.rootTransfers) {
                    if (pending.deviceId === deviceId)
                        this.rootTransfers.delete(reference);
                }
                const transferRef = `root-transfer-${randomUUID()}`;
                this.rootTransfers.set(transferRef, {
                    authorizationHandle: preparation.authorizationHandle,
                    deviceId,
                    deviceRef: request.deviceRef,
                    did,
                });
                return { transferRef, deviceRef: request.deviceRef, expiresAt: preparation.expiresAt };
            });
        }
        /** Authenticate locally, recheck fresh context, then consume one exact Core authorization. */
        async confirmRootTransfer(request) {
            const pending = this.rootTransfers.get(request?.transferRef);
            if (pending === undefined)
                return { ok: false, error: failure('invalid-request') };
            this.rootTransfers.delete(request.transferRef);
            return this.run(async (client) => {
                const confirmed = await client.confirmUserPresence('Grant AWiki device management access');
                if (!confirmed) {
                    throw Object.assign(new Error('user presence denied'), { name: 'AwikiSdkError', code: 'forbidden' });
                }
                const did = await this.requireRootTransferRecipient(client, pending.deviceId);
                if (did !== pending.did) {
                    throw Object.assign(new Error('root transfer identity changed'), { name: 'AwikiSdkError', code: 'forbidden' });
                }
                const sent = await client.confirmAndSendRootKeyTransfer(pending.authorizationHandle);
                if (sent.recipientDeviceId !== pending.deviceId) {
                    throw Object.assign(new Error('root transfer receipt mismatch'), { name: 'AwikiSdkError', code: 'remote' });
                }
                return { deviceRef: pending.deviceRef, acceptedAt: sent.acceptedAt };
            });
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
        /** Return the public editable profile for the active identity. */
        getProfile() {
            return this.run(client => client.getProfile());
        }
        /** Update Display Name, bio, and tags after applying product limits in the Host. */
        updateProfile(request) {
            const normalized = normalizeProfileRequest(request);
            if (normalized === undefined)
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            return this.run(client => client.updateProfile(normalized));
        }
        /** Start durable phone recovery for one existing full Handle. */
        sendRecoveryOtp(request) {
            this.pendingDeviceJoin = undefined;
            const normalized = normalizeRecoveryOtpRequest(request);
            if (normalized === undefined)
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            return this.run(async (client) => {
                if (await this.selectDeviceJoinSession(client) !== null) {
                    throw Object.assign(new Error('join already exists'), { name: 'AwikiSdkError', code: 'conflict' });
                }
                return client.sendRecoveryOtp(normalized);
            }, { allowSignedOut: true });
        }
        /** Verify a recovery OTP and freeze its exact intent before the remote commit. */
        prepareRecovery(request) {
            const normalized = normalizeRecoveryPrepareRequest(request);
            if (normalized === undefined)
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            return this.run(client => client.prepareRecovery(normalized), { allowSignedOut: true });
        }
        /** Attempt one prepared recovery commit; uncertain outcomes remain durable in Core. */
        async activateRecovery(request) {
            const normalized = normalizeRecoveryOperation(request);
            if (normalized === undefined)
                return { ok: false, error: failure('invalid-request') };
            const result = await this.run(client => client.activateRecovery(normalized), { allowSignedOut: true });
            if (result.ok && !await this.applyRecoveredSession(result.value)) {
                return { ok: false, error: failure('remote') };
            }
            return result;
        }
        /** Read durable recovery state before deciding whether a retry is valid. */
        async getRecoveryStatus(request) {
            const normalized = normalizeRecoveryOperation(request);
            if (normalized === undefined)
                return { ok: false, error: failure('invalid-request') };
            const result = await this.run(client => client.getRecoveryStatus(normalized), { allowSignedOut: true });
            if (result.ok && !await this.applyRecoveredSession(result.value)) {
                return { ok: false, error: failure('remote') };
            }
            return result;
        }
        /** Resume only the exact Core-owned operation selected by the browser. */
        async resumeRecovery(request) {
            const normalized = normalizeRecoveryOperation(request);
            if (normalized === undefined)
                return { ok: false, error: failure('invalid-request') };
            const result = await this.run(client => client.resumeRecovery(normalized), { allowSignedOut: true });
            if (result.ok && !await this.applyRecoveredSession(result.value)) {
                return { ok: false, error: failure('remote') };
            }
            return result;
        }
        /** Discard only a pre-attempt operation; Core rejects post-attempt deletion. */
        async discardRecovery(request) {
            const normalized = normalizeRecoveryOperation(request);
            if (normalized === undefined)
                return { ok: false, error: failure('invalid-request') };
            const result = await this.run(client => client.discardRecovery(normalized), { allowSignedOut: true });
            return result.ok ? { ok: true, value: { completed: true } } : result;
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
        /** Return one authoritative group snapshot for permission-aware UI. */
        getGroup(request) {
            const groupDid = normalizeGroupDid(request?.groupDid);
            if (groupDid === undefined)
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            return this.run(client => client.getGroup(groupDid));
        }
        /** Join one open group and return its authoritative membership state. */
        joinGroup(request) {
            const groupDid = normalizeGroupDid(request?.groupDid);
            if (groupDid === undefined)
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            return this.run(client => client.joinGroup(groupDid));
        }
        /** Leave one group. Core rejects owner leave and unsupported security profiles. */
        async leaveGroup(request) {
            const groupDid = normalizeGroupDid(request?.groupDid);
            if (groupDid === undefined)
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            const result = await this.run(client => client.leaveGroup(groupDid));
            return result.ok ? { ok: true, value: { completed: true } } : result;
        }
        /** Read one authoritative versioned member page. */
        listGroupMembers(request) {
            const groupDid = normalizeGroupDid(request?.groupDid);
            if (groupDid === undefined
                || (request.cursor !== undefined && (typeof request.cursor !== 'string' || request.cursor.length > 4_096))
                || (request.limit !== undefined && (!Number.isSafeInteger(request.limit) || request.limit < 1 || request.limit > 100))) {
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            }
            return this.run(client => client.listGroupMembers({
                groupDid,
                ...request.cursor === undefined ? {} : { cursor: request.cursor },
                ...request.limit === undefined ? {} : { limit: request.limit },
            }));
        }
        /** Invite one ordinary member after group creation. */
        addGroupMember(request) {
            const groupDid = normalizeGroupDid(request?.groupDid);
            const member = normalizeMember(request?.member);
            if (groupDid === undefined || member === undefined || (request.role !== undefined && request.role !== 'member')) {
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            }
            return this.run(client => client.addGroupMember(groupDid, member));
        }
        /** Remove one member. The authoritative Core role check remains decisive. */
        removeGroupMember(request) {
            const groupDid = normalizeGroupDid(request?.groupDid);
            const member = normalizeMember(request?.member);
            if (groupDid === undefined || member === undefined) {
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            }
            return this.run(client => client.removeGroupMember(groupDid, member));
        }
        /** Read presentation-only roster preferences for the active identity. */
        getConversationPreferences() {
            return this.run(async (client) => this.conversationPreferenceStore.get(await this.ownerDid(client)));
        }
        /** Persist one bounded local roster preference without changing Core or remote membership. */
        updateConversationPreference(request) {
            const normalized = normalizeConversationPreferenceMutation(request);
            if (normalized === undefined)
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            return this.run(async (client) => this.conversationPreferenceStore.update(await this.ownerDid(client), normalized));
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
            const normalized = normalizeSendTextRequest(request);
            if (normalized === undefined)
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            return this.run(client => client.sendText(normalized));
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
                    await this.stopProviderRuntime(provider);
                const result = await this.run(client => client.clearLocalData(), { allowSignedOut: true });
                if (!result.ok) {
                    if (provider !== undefined && this.provider === provider)
                        this.ensureProviderRuntime(provider);
                    return result;
                }
                try {
                    await this.imageAttachmentCache.clear();
                    await this.sentMailStore.clear();
                    await this.conversationPreferenceStore.clear();
                    await this.sessionStore.signIn();
                    this.signedOut = false;
                    this.activeIdentityDid = undefined;
                    this.pendingDeviceJoin = undefined;
                    this.activeDeviceJoinSessionId = undefined;
                    this.invalidateSummaries();
                    this.publishSession({ status: 'unregistered' });
                    return result;
                }
                catch {
                    return { ok: false, error: failure('remote') };
                }
            });
        }
        /** Re-enter only after Core confirms that the exact recovered identity is applied locally. */
        async applyRecoveredSession(progress) {
            if (progress.phase !== 'applied')
                return true;
            return this.mutateSession(async () => {
                const provider = this.provider;
                if (provider === undefined)
                    return false;
                try {
                    const identity = await provider.client.getIdentity();
                    if (identity === null || identity.did !== progress.currentDid)
                        return false;
                    const alreadyActive = this.signedOut === false && this.activeIdentityDid === identity.did;
                    if (!alreadyActive) {
                        await this.sessionStore.signIn();
                        this.signedOut = false;
                        this.activeIdentityDid = identity.did;
                        this.invalidateSummaries();
                    }
                    const reconciled = await this.reconcileRecoveredMailbox(provider);
                    if (this.provider !== provider)
                        return false;
                    if (!alreadyActive) {
                        const session = { status: 'active', identity };
                        this.publishSession(session);
                        this.ensureProviderRuntime(provider);
                    }
                    return reconciled;
                }
                catch {
                    return false;
                }
            });
        }
        /** Rebind Mail first-use ownership after the recovered identity becomes current. */
        async reconcileRecoveredMailbox(provider) {
            const logger = this.ctx.logger('awiki-recovery');
            try {
                await provider.client.getMailAccount();
            }
            catch {
                logger.warn('awiki: recovered mailbox reconciliation is pending');
            }
            return true;
        }
        /** Select the only resumable new-device session; Core local_sessions is the sole restart SoT. */
        async selectDeviceJoinSession(client) {
            const sessions = await client.listLocalDeviceJoinSessions();
            if (this.activeDeviceJoinSessionId !== undefined) {
                const tracked = sessions.find(value => (value.side === 'new_device' && value.joinSessionId === this.activeDeviceJoinSessionId));
                if (tracked !== undefined)
                    return tracked.joinSessionId;
                this.activeDeviceJoinSessionId = undefined;
            }
            const resumable = sessions.filter(value => (value.side === 'new_device' && RESUMABLE_JOIN_PHASES.has(value.localPhase)));
            if (resumable.length > 1) {
                throw Object.assign(new Error('multiple local joins'), { name: 'AwikiSdkError', code: 'conflict' });
            }
            const selected = resumable[0];
            this.activeDeviceJoinSessionId = selected?.joinSessionId;
            return selected?.joinSessionId ?? null;
        }
        async applyCandidateJoinProgress(value) {
            const phase = candidateJoinPhase(value);
            if (phase === undefined)
                return { ok: false, error: failure('remote') };
            if (phase === 'cancelled' || phase === 'rejected' || phase === 'expired') {
                this.activeDeviceJoinSessionId = undefined;
            }
            if (phase === 'authorized') {
                if (value.identity === undefined)
                    return { ok: false, error: failure('remote') };
                await this.activateRegisteredIdentity(value.identity);
            }
            return {
                ok: true,
                value: {
                    phase,
                    expiresAt: value.expiresAt,
                    ...(phase === 'sas-ready' && value.sas !== undefined ? { sas: value.sas } : {}),
                    completed: phase === 'authorized',
                },
            };
        }
        publicAdminJoinProgress(requestRef, value) {
            const phase = adminJoinPhase(value);
            if (phase === undefined)
                return { ok: false, error: failure('remote') };
            return {
                ok: true,
                value: {
                    requestRef,
                    phase,
                    expiresAt: value.expiresAt,
                    ...(phase === 'sas-ready' && value.sas !== undefined ? { sas: value.sas } : {}),
                },
            };
        }
        async localAdminJoinProgress(client, notice) {
            const local = (await client.listLocalDeviceJoinSessions())
                .find(session => session.side === 'admin' && session.joinSessionId === notice.joinSessionId);
            if (local === undefined) {
                return notice.claimedByCurrentDevice
                    ? client.getLocalDeviceJoinVerificationProgress(notice.joinSessionId)
                    : undefined;
            }
            if (local.localPhase === 'challenge_prepared') {
                return {
                    joinSessionId: notice.joinSessionId,
                    localPhase: local.localPhase,
                    remoteState: notice.state,
                    expiresAt: local.expiresAt,
                };
            }
            return client.getLocalDeviceJoinVerificationProgress(notice.joinSessionId);
        }
        async requireDeviceManager(client) {
            const current = await client.getCurrentDeviceSummary();
            if (!current.canManage || current.role !== 'admin' || current.readiness !== 'admin_ready') {
                throw Object.assign(new Error('device manager required'), { name: 'AwikiSdkError', code: 'forbidden' });
            }
        }
        async requireRootTransferRecipient(client, deviceId) {
            if (!client.trustedUserPresenceSupported) {
                throw Object.assign(new Error('trusted user presence unsupported'), { name: 'AwikiSdkError', code: 'forbidden' });
            }
            await this.requireDeviceManager(client);
            await client.syncDeviceManagement();
            const identity = await client.getIdentity();
            if (identity === null) {
                throw Object.assign(new Error('identity required'), { name: 'AwikiSdkError', code: 'not-registered' });
            }
            const target = (await client.getDeviceRegistry()).find(device => device.deviceId === deviceId);
            if (target === undefined
                || target.isCurrent
                || target.status !== 'active'
                || target.role !== 'member'
                || target.managementReady) {
                throw Object.assign(new Error('root transfer recipient unavailable'), { name: 'AwikiSdkError', code: 'forbidden' });
            }
            return identity.did;
        }
        requestRef(joinSessionId) {
            const existing = this.requestRefs.get(joinSessionId);
            if (existing !== undefined)
                return existing;
            const reference = `join-${randomUUID()}`;
            this.requestRefs.set(joinSessionId, reference);
            this.requestSessions.set(reference, joinSessionId);
            return reference;
        }
        deviceRef(deviceId) {
            const existing = this.deviceRefs.get(deviceId);
            if (existing !== undefined)
                return existing;
            const reference = `device-${randomUUID()}`;
            this.deviceRefs.set(deviceId, reference);
            this.deviceIds.set(reference, deviceId);
            return reference;
        }
        async deviceManagementSnapshot(client) {
            await client.syncDeviceManagement();
            const current = await client.getCurrentDeviceSummary();
            if (!current.canManage || current.role !== 'admin' || current.readiness !== 'admin_ready') {
                this.requestRefs.clear();
                this.requestSessions.clear();
                this.deviceRefs.clear();
                this.deviceIds.clear();
                this.rootTransfers.clear();
                return {
                    canManage: false,
                    rootTransferSupported: client.trustedUserPresenceSupported,
                    ...current.role === undefined ? {} : { role: current.role },
                    readiness: current.readiness,
                    devices: [],
                    requests: [],
                };
            }
            const requests = await client.listLocalDeviceJoinRequests();
            await Promise.all(requests
                .filter(request => request.claimedByCurrentDevice)
                .map(request => client.getLocalDeviceJoinVerificationProgress(request.joinSessionId).catch(() => undefined)));
            const devices = await client.getDeviceRegistry();
            return {
                canManage: true,
                rootTransferSupported: client.trustedUserPresenceSupported,
                role: 'admin',
                readiness: 'admin_ready',
                devices: devices.map(device => this.publicDevice(device)),
                requests: requests.map(request => ({
                    requestRef: this.requestRef(request.joinSessionId),
                    candidateKeyFingerprint: request.candidateKeyFingerprint,
                    issuedAt: request.issuedAt,
                    expiresAt: request.expiresAt,
                    state: requestJoinPhase(request),
                    claimedByCurrentDevice: request.claimedByCurrentDevice,
                    canStartVerification: request.canStartVerification,
                })),
            };
        }
        publicDevice(device) {
            return {
                deviceRef: this.deviceRef(device.deviceId),
                status: device.status,
                role: device.role,
                managementReady: device.managementReady,
                isCurrent: device.isCurrent,
            };
        }
        /** Publish one newly registered identity, then start realtime only in the background. */
        async activateRegisteredIdentity(identity) {
            this.pendingDeviceJoin = undefined;
            this.activeDeviceJoinSessionId = undefined;
            this.activeIdentityDid = identity.did;
            this.publishSession({ status: 'active', identity });
            const provider = this.provider;
            if (provider !== undefined)
                this.ensureProviderRuntime(provider);
        }
        /** Invalidate cached session work and cancel every model request still owned by the old session. */
        invalidateSummaries() {
            this.sessionRevision += 1;
            this.requestRefs.clear();
            this.requestSessions.clear();
            this.deviceRefs.clear();
            this.deviceIds.clear();
            this.rootTransfers.clear();
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
        /** Start identity realtime and the optional Agent consumer without blocking identity success. */
        ensureProviderRuntime(provider) {
            const identityDid = this.activeIdentityDid;
            if (provider.runtimeReplacement !== undefined)
                return;
            if (identityDid !== undefined
                && provider.realtimeIdentityDid !== undefined
                && provider.realtimeIdentityDid !== identityDid) {
                this.replaceProviderRuntime(provider, identityDid);
                return;
            }
            this.ensureRealtimeSupervisor(provider);
            this.ensureAgentConsumer(provider);
        }
        replaceProviderRuntime(provider, identityDid) {
            if (provider.runtimeReplacement !== undefined || this.provider !== provider)
                return;
            const replacement = (async () => {
                await this.stopProviderRuntime(provider);
                if (this.provider !== provider || this.activeIdentityDid !== identityDid)
                    return;
                this.ensureRealtimeSupervisor(provider);
                this.ensureAgentConsumer(provider);
            })();
            const observed = replacement
                .catch((error) => {
                this.ctx.logger('awiki-realtime').warn('AWiki identity realtime replacement failed: %s', error instanceof Error ? error.message : 'unknown failure');
            })
                .finally(() => {
                if (provider.runtimeReplacement === observed)
                    delete provider.runtimeReplacement;
                if (this.provider === provider)
                    this.ensureProviderRuntime(provider);
            });
            provider.runtimeReplacement = observed;
        }
        ensureRealtimeSupervisor(provider) {
            if (!this.resolved.realtimeEnabled
                || provider.realtimeSupervisor !== undefined
                || provider.realtimeStartup !== undefined
                || this.provider !== provider
                || (provider.client.realtime ?? provider.client.listener) === undefined)
                return;
            const generation = provider.realtimeGeneration;
            const source = provider.client.realtime ?? provider.client.listener;
            if (source === undefined)
                return;
            const logger = this.ctx.logger('awiki-realtime');
            const startup = (async () => {
                if (await this.isSignedOut())
                    return;
                const identity = await provider.client.getIdentity();
                if (identity === null || !this.realtimeFenceMatches(provider, generation))
                    return;
                this.activeIdentityDid = identity.did;
                const supervisor = new IdentityRealtimeSupervisor(source, {
                    onSynchronized: cause => this.onRealtimeSynchronized(provider, generation, cause),
                }, logger);
                provider.realtimeSupervisor = supervisor;
                provider.realtimeIdentityDid = identity.did;
                supervisor.start();
                this.ensureAgentConsumer(provider);
            })();
            const observed = startup
                .catch((error) => {
                logger.warn('AWiki realtime startup failed: %s', error instanceof Error ? error.message : 'unknown failure');
            })
                .finally(() => {
                if (provider.realtimeStartup === observed)
                    delete provider.realtimeStartup;
            });
            provider.realtimeStartup = observed;
        }
        realtimeFenceMatches(provider, generation) {
            return this.provider === provider && provider.realtimeGeneration === generation;
        }
        async onRealtimeSynchronized(provider, generation, cause) {
            if (!this.realtimeFenceMatches(provider, generation))
                return;
            if (cause === 'system_notification' || cause === 'stream_recovery') {
                try {
                    provider.localDeviceJoinRequestCountAfterSync = (await provider.client.listLocalDeviceJoinRequests()).length;
                }
                catch {
                    this.ctx.logger('awiki-realtime').debug('AWiki realtime could not observe local device Join requests');
                }
            }
            if (!['session_start', 'connection_ready', 'reconnected', 'message', 'message_update'].includes(cause))
                return;
            this.ensureAgentConsumer(provider);
            await provider.agentConsumerStartup;
            if (!this.realtimeFenceMatches(provider, generation))
                return;
            await provider.agentConsumer?.reconcileOnce();
        }
        ensureAgentConsumer(provider) {
            const workspaceContext = this.workspaceContext;
            const source = provider.client.agentInbox ?? provider.client.listener;
            const identityDid = this.activeIdentityDid;
            if (!this.resolved.listenerEnabled
                || workspaceContext === undefined
                || source === undefined
                || identityDid === undefined
                || this.provider !== provider)
                return;
            if (provider.agentConsumer !== undefined && provider.agentConsumerIdentityDid === identityDid)
                return;
            if (provider.agentConsumerStartup !== undefined)
                return;
            const generation = ++provider.agentConsumerGeneration;
            const logger = this.ctx.logger('awiki-listener');
            const startup = (async () => {
                await this.detachAgentConsumer(provider);
                if (!this.agentConsumerFenceMatches(provider, workspaceContext, identityDid, generation))
                    return;
                const agents = new DshAwikiListenerAgentRuntime(workspaceContext, this.resolved.listener.workspacePath);
                const consumer = new AwikiAgentListener(source, agents, {
                    ...this.resolved.listener,
                    identityScope: identityDid,
                }, logger);
                provider.agentConsumer = consumer;
                provider.agentConsumerIdentityDid = identityDid;
                await consumer.reconcileOnce();
            })();
            const observed = startup
                .catch((error) => {
                logger.warn('AWiki Agent consumer startup failed: %s', error instanceof Error ? error.message : 'unknown failure');
            })
                .finally(() => {
                if (provider.agentConsumerStartup === observed)
                    delete provider.agentConsumerStartup;
            });
            provider.agentConsumerStartup = observed;
        }
        agentConsumerFenceMatches(provider, workspaceContext, identityDid, generation) {
            return this.provider === provider
                && this.workspaceContext === workspaceContext
                && this.activeIdentityDid === identityDid
                && provider.agentConsumerGeneration === generation;
        }
        async detachAgentConsumer(provider) {
            const consumer = provider.agentConsumer;
            if (consumer === undefined)
                return;
            delete provider.agentConsumer;
            delete provider.agentConsumerIdentityDid;
            const cleanup = consumer.dispose();
            const observed = cleanup.finally(() => {
                if (provider.agentConsumerCleanup === observed)
                    delete provider.agentConsumerCleanup;
            });
            provider.agentConsumerCleanup = observed;
            await observed;
        }
        async stopAgentConsumer(provider) {
            provider.agentConsumerGeneration += 1;
            await provider.agentConsumerStartup;
            await provider.agentConsumerCleanup;
            await this.detachAgentConsumer(provider);
        }
        async stopRealtimeSupervisor(provider) {
            provider.realtimeGeneration += 1;
            await provider.realtimeStartup;
            const supervisor = provider.realtimeSupervisor;
            if (supervisor === undefined)
                return;
            delete provider.realtimeSupervisor;
            delete provider.realtimeIdentityDid;
            await supervisor.dispose();
        }
        async stopProviderRuntime(provider) {
            await Promise.all([
                this.stopRealtimeSupervisor(provider),
                this.stopAgentConsumer(provider),
            ]);
        }
        /** Clear one exact provider slot before joining its one shared disposal. */
        disposeProvider(provider) {
            if (this.provider === provider) {
                this.provider = undefined;
                this.pendingDeviceJoin = undefined;
                this.activeDeviceJoinSessionId = undefined;
                this.invalidateSummaries();
            }
            provider.disposal ??= (async () => {
                try {
                    await provider.runtimeReplacement;
                    await this.stopProviderRuntime(provider);
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