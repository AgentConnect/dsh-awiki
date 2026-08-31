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
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import z from '@deepseek-ai/schemastery';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from "./types.js";
import { AwikiExternalHttpAuthError, createAwikiExternalHttpAuth, externalHttpAuthError, mapProviderError as mapExternalHttpProviderError, } from "./external-http-auth.js";
import { downloadedAttachment } from "./sdk-adapter.js";
import { standardBase64Syntax } from "./base64.js";
import { registerAwikiTools } from "./tools.js";
import { MAIL_ATTACHMENT_SERVICE_MAX_BYTES, MAIL_ATTACHMENT_SERVICE_MAX_COUNT, MAIL_ATTACHMENT_SERVICE_TOTAL_MAX_BYTES, mailAttachmentDownloadRequest, mailAttachmentContentType, mailAttachmentFileName, mailInboxRequest, mailMarkReadRequest, mailReadRequest, mailSendRequest, } from "./mail.js";
import { AwikiSettingsSchema, validateAwikiSettings, } from "./settings.js";
import { AWIKI_SETTINGS_NAMESPACE, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain } from "./domain.js";
import { AWIKI_SETTINGS_RPC_CHANNEL } from "./settings-rpc-contract.js";
import { createAwikiSettingsRpcHandler } from "./settings-rpc.js";
import { AwikiSessionStore } from "./session.js";
import { AwikiImageAttachmentCache, minimumImageAttachmentCacheMaxBytes } from "./attachment-cache.js";
import { AwikiSentMailStore, isLocalSentMailId } from "./sent-mail-store.js";
import { AwikiConversationPreferenceStore, normalizeConversationPreferenceMutation, } from "./conversation-preferences.js";
import { AwikiAgentListener, DshAwikiListenerAgentRuntime, } from "./listener.js";
import { resolveAwikiProfileName, resolveAwikiStateRoot, resolveAwikiTenantStateRoot, } from "./profile-state.js";
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
    userServiceUrl: z.string(),
    userServiceDomain: z.string().default(DEFAULT_AWIKI_DOMAIN),
    messageServiceUrl: z.string(),
    mailServiceUrl: z.string(),
    messageServicePublicUrl: z.string(),
    messageServiceDid: z.string(),
    allowedAttachmentOrigins: z.array(z.string()).default([]),
    allowInsecureLoopbackForTesting: z.boolean().default(false),
    stateRoot: z.string(),
    attachmentMaxBytes: z.number().default(DEFAULT_ATTACHMENT_MAX_BYTES),
    mailAttachmentMaxCount: z.number().default(MAIL_ATTACHMENT_SERVICE_MAX_COUNT),
    mailAttachmentMaxBytes: z.number().default(MAIL_ATTACHMENT_SERVICE_MAX_BYTES),
    mailAttachmentTotalMaxBytes: z.number().default(MAIL_ATTACHMENT_SERVICE_TOTAL_MAX_BYTES),
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
    'identity-recovery-required',
    'conflict',
    'state-in-use',
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
    'identity-recovery-required': 'The local AWiki identity must be recovered before it can be used again.',
    'conflict': 'The AWiki operation conflicts with current state.',
    'state-in-use': 'AWiki data is already open in another client.',
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
/** Resolve the only supported post-recovery endpoint without accepting URL-carried state. */
function recoveryReconciliationEndpoint(target, allowInsecureLoopbackForTesting) {
    if (target?.kind !== 'model-proxy-v1' || typeof target.baseURL !== 'string') {
        throw new TypeError('awiki: recovery reconciliation target is invalid');
    }
    const baseURL = serviceUrl('recoveryReconciliationTarget.baseURL', target.baseURL, allowInsecureLoopbackForTesting);
    const parsed = new URL(baseURL);
    if (parsed.search !== '') {
        throw new TypeError('awiki: recovery reconciliation target must not contain a query');
    }
    return new URL('/api/identity-recovery', parsed).toString();
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
function resolveConfig(ctx, config) {
    const allowInsecureLoopbackForTesting = config.allowInsecureLoopbackForTesting ?? false;
    const configuredStateRoot = config.stateRoot?.trim();
    const configuredDshHome = process.env.DSH_HOME?.trim();
    const dshHome = configuredDshHome === undefined || configuredDshHome.length === 0
        ? join(homedir(), '.dsh')
        : configuredDshHome;
    const profileName = configuredStateRoot === undefined || configuredStateRoot.length === 0
        ? resolveAwikiProfileName(ctx, dshHome)
        : undefined;
    const stateRoot = configuredStateRoot === undefined || configuredStateRoot.length === 0
        ? resolveAwikiStateRoot(ctx, dshHome)
        : configuredStateRoot;
    const legacySharedStateDetected = profileName !== undefined
        && existsSync(join(dshHome, 'awiki', 'im-core'));
    if (!isAbsolute(stateRoot))
        throw new TypeError('awiki: stateRoot must be an absolute path');
    const attachmentMaxBytes = config.attachmentMaxBytes ?? DEFAULT_ATTACHMENT_MAX_BYTES;
    if (!Number.isSafeInteger(attachmentMaxBytes) || attachmentMaxBytes < 1) {
        throw new TypeError('awiki: attachmentMaxBytes must be a positive safe integer');
    }
    const mailAttachmentMaxCount = config.mailAttachmentMaxCount ?? MAIL_ATTACHMENT_SERVICE_MAX_COUNT;
    if (!Number.isSafeInteger(mailAttachmentMaxCount)
        || mailAttachmentMaxCount < 0
        || mailAttachmentMaxCount > MAIL_ATTACHMENT_SERVICE_MAX_COUNT) {
        throw new TypeError('awiki: mailAttachmentMaxCount must be an integer from 0 through 10');
    }
    const mailAttachmentMaxBytes = config.mailAttachmentMaxBytes ?? MAIL_ATTACHMENT_SERVICE_MAX_BYTES;
    if (!Number.isSafeInteger(mailAttachmentMaxBytes)
        || mailAttachmentMaxBytes < 1
        || mailAttachmentMaxBytes > MAIL_ATTACHMENT_SERVICE_MAX_BYTES) {
        throw new TypeError('awiki: mailAttachmentMaxBytes must be a positive safe integer no greater than 10 MiB');
    }
    const mailAttachmentTotalMaxBytes = config.mailAttachmentTotalMaxBytes ?? MAIL_ATTACHMENT_SERVICE_TOTAL_MAX_BYTES;
    if (!Number.isSafeInteger(mailAttachmentTotalMaxBytes)
        || mailAttachmentTotalMaxBytes < mailAttachmentMaxBytes
        || mailAttachmentTotalMaxBytes > MAIL_ATTACHMENT_SERVICE_TOTAL_MAX_BYTES) {
        throw new TypeError('awiki: mailAttachmentTotalMaxBytes must cover one attachment and not exceed 18 MiB');
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
        tenantDomain: serviceDomain(config.userServiceDomain ?? DEFAULT_AWIKI_DOMAIN),
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
        mailAttachmentMaxCount,
        mailAttachmentMaxBytes,
        mailAttachmentTotalMaxBytes,
        imageAttachmentCacheMaxBytes,
        pollIntervalMs,
        ...profileName === undefined ? {} : { profileName, legacySharedStateDetected },
        listenerEnabled,
        listener: {
            allowedPeers,
            workspacePath: listenerWorkspacePath,
            stateRoot,
        },
        summaryMaxInputBytes,
        deriveUserServiceUrl: config.userServiceUrl === undefined,
        deriveMessageServiceUrl: config.messageServiceUrl === undefined,
        deriveMailServiceUrl: config.mailServiceUrl === undefined,
        deriveMessageServicePublicUrl: config.messageServicePublicUrl === undefined,
        deriveMessageServiceDid: config.messageServiceDid === undefined,
        deriveAllowedAttachmentOrigins: config.allowedAttachmentOrigins === undefined
            || config.allowedAttachmentOrigins.length === 0,
    };
}
/** Resolve every tenant-sensitive endpoint and state path from one selected domain. */
function activeTenantConfig(config, domain) {
    const tenantOrigin = `https://${domain}`;
    const userServiceUrl = config.deriveUserServiceUrl ? tenantOrigin : config.userServiceUrl;
    const messageServiceUrl = config.deriveMessageServiceUrl ? tenantOrigin : config.messageServiceUrl;
    const mailServiceUrl = config.deriveMailServiceUrl ? userServiceUrl : config.mailServiceUrl;
    const messageServicePublicUrl = config.deriveMessageServicePublicUrl
        ? tenantOrigin
        : config.messageServicePublicUrl;
    const messageServiceDid = config.deriveMessageServiceDid
        ? `did:wba:${domain}`
        : config.messageServiceDid;
    const allowedAttachmentOrigins = config.deriveAllowedAttachmentOrigins
        ? attachmentOrigins(undefined, messageServicePublicUrl, config.allowInsecureLoopbackForTesting)
        : config.allowedAttachmentOrigins;
    return {
        domain,
        userServiceUrl,
        userServiceDomain: domain,
        messageServiceUrl,
        mailServiceUrl,
        messageServicePublicUrl,
        messageServiceDid,
        allowedAttachmentOrigins,
        attachmentMaxBytes: config.attachmentMaxBytes,
        allowInsecureLoopbackForTesting: config.allowInsecureLoopbackForTesting,
        stateRoot: resolveAwikiTenantStateRoot(config.stateRoot, domain, config.userServiceDomain),
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
/** Rebuild the browser-safe recovery DTO instead of trusting provider object shape. */
function publicGroupRebindRecoverySummary(value) {
    if (typeof value !== 'object' || value === null)
        return undefined;
    const candidate = value;
    const counts = [candidate.processed, candidate.completed, candidate.pending, candidate.blocked];
    if (counts.some(count => !Number.isSafeInteger(count) || count < 0 || count > 0xffff_ffff)) {
        return undefined;
    }
    if (!Array.isArray(candidate.items) || candidate.items.length > 500)
        return undefined;
    const seen = new Set();
    const items = [];
    for (const value of candidate.items) {
        if (typeof value !== 'object' || value === null)
            return undefined;
        const item = value;
        const groupDid = normalizeGroupDid(item.groupDid);
        if (groupDid === undefined || seen.has(groupDid) || (item.status !== 'pending' && item.status !== 'blocked')) {
            return undefined;
        }
        seen.add(groupDid);
        items.push({ groupDid, status: item.status });
    }
    return {
        processed: candidate.processed,
        completed: candidate.completed,
        pending: candidate.pending,
        blocked: candidate.blocked,
        items,
    };
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
    if (bytesBase64.length % 4 !== 0 || !standardBase64Syntax(bytesBase64)) {
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
    let _inspectIdentityAccess_decorators;
    let _sendRegistrationOtp_decorators;
    let _registerIdentity_decorators;
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
    let _resumeGroupRebindRecovery_decorators;
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
    let _downloadMailAttachment_decorators;
    let _clearLocalData_decorators;
    return class AwikiService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _getConfig_decorators = [Remote];
            _getIdentity_decorators = [Remote];
            _getSession_decorators = [Remote];
            _logout_decorators = [Remote];
            _login_decorators = [Remote];
            _inspectIdentityAccess_decorators = [Remote];
            _sendRegistrationOtp_decorators = [Remote];
            _registerIdentity_decorators = [Remote];
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
            _resumeGroupRebindRecovery_decorators = [Remote];
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
            _downloadMailAttachment_decorators = [Remote];
            _clearLocalData_decorators = [Remote];
            __esDecorate(this, null, _getConfig_decorators, { kind: "method", name: "getConfig", static: false, private: false, access: { has: obj => "getConfig" in obj, get: obj => obj.getConfig }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getIdentity_decorators, { kind: "method", name: "getIdentity", static: false, private: false, access: { has: obj => "getIdentity" in obj, get: obj => obj.getIdentity }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getSession_decorators, { kind: "method", name: "getSession", static: false, private: false, access: { has: obj => "getSession" in obj, get: obj => obj.getSession }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _logout_decorators, { kind: "method", name: "logout", static: false, private: false, access: { has: obj => "logout" in obj, get: obj => obj.logout }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _login_decorators, { kind: "method", name: "login", static: false, private: false, access: { has: obj => "login" in obj, get: obj => obj.login }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _inspectIdentityAccess_decorators, { kind: "method", name: "inspectIdentityAccess", static: false, private: false, access: { has: obj => "inspectIdentityAccess" in obj, get: obj => obj.inspectIdentityAccess }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _sendRegistrationOtp_decorators, { kind: "method", name: "sendRegistrationOtp", static: false, private: false, access: { has: obj => "sendRegistrationOtp" in obj, get: obj => obj.sendRegistrationOtp }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _registerIdentity_decorators, { kind: "method", name: "registerIdentity", static: false, private: false, access: { has: obj => "registerIdentity" in obj, get: obj => obj.registerIdentity }, metadata: _metadata }, null, _instanceExtraInitializers);
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
            __esDecorate(this, null, _resumeGroupRebindRecovery_decorators, { kind: "method", name: "resumeGroupRebindRecovery", static: false, private: false, access: { has: obj => "resumeGroupRebindRecovery" in obj, get: obj => obj.resumeGroupRebindRecovery }, metadata: _metadata }, null, _instanceExtraInitializers);
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
            __esDecorate(this, null, _downloadMailAttachment_decorators, { kind: "method", name: "downloadMailAttachment", static: false, private: false, access: { has: obj => "downloadMailAttachment" in obj, get: obj => obj.downloadMailAttachment }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _clearLocalData_decorators, { kind: "method", name: "clearLocalData", static: false, private: false, access: { has: obj => "clearLocalData" in obj, get: obj => obj.clearLocalData }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['tools', 'settings'];
        static Config = Config;
        resolved = __runInitializers(this, _instanceExtraInitializers);
        tenantConfigCache;
        tenantStateCache;
        startupUserServiceDomain;
        settingsProvider;
        provider;
        signedOut;
        sessionMutation = Promise.resolve();
        sessionRevision = 0;
        activeIdentityDid;
        activeSummaryRequests = new Set();
        summaryProvider;
        recoveryReconciliationTarget;
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
            this.resolved = resolveConfig(ctx, config);
            this.externalHttpAuth = createAwikiExternalHttpAuth(() => this.acquireExternalHttpAuthSession());
            this.startupUserServiceDomain = this.resolved.userServiceDomain;
            const provider = ctx.settings;
            const settingsScope = provider.register(settingsNamespace(AWIKI_SETTINGS_NAMESPACE), AwikiSettingsSchema, {
                base: { domain: this.resolved.userServiceDomain },
                applies: 'restart',
                validate: validateAwikiSettings,
            });
            this.settingsProvider = provider;
            this.startupUserServiceDomain = settingsScope.get().domain;
            ctx.effect(() => () => {
                if (this.settingsProvider === provider) {
                    this.settingsProvider = undefined;
                    this.startupUserServiceDomain = this.resolved.userServiceDomain;
                }
            }, 'awiki: release settings namespace');
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
            const client = factory(this.activeTenant());
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
        /** Register the optional Model Proxy recovery target without exposing an arbitrary callback or token. */
        registerRecoveryReconciliationTarget(target) {
            if (this.recoveryReconciliationTarget !== undefined) {
                throw new Error('awiki: a recovery reconciliation target is already registered');
            }
            const registered = Object.freeze({
                endpoint: recoveryReconciliationEndpoint(target, this.resolved.allowInsecureLoopbackForTesting),
            });
            this.recoveryReconciliationTarget = registered;
            let active = true;
            return () => {
                if (!active)
                    return;
                active = false;
                if (this.recoveryReconciliationTarget === registered) {
                    this.recoveryReconciliationTarget = undefined;
                }
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
        getConfig() {
            return Promise.resolve({
                ok: true,
                value: {
                    tenantDomain: this.activeTenant().domain,
                    pollIntervalMs: this.resolved.pollIntervalMs,
                    attachmentMaxBytes: this.resolved.attachmentMaxBytes,
                    mailAttachmentMaxCount: this.resolved.mailAttachmentMaxCount,
                    mailAttachmentMaxBytes: this.resolved.mailAttachmentMaxBytes,
                    mailAttachmentTotalMaxBytes: this.resolved.mailAttachmentTotalMaxBytes,
                    ...this.resolved.profileName === undefined ? {} : {
                        profileName: this.resolved.profileName,
                        legacySharedStateDetected: this.resolved.legacySharedStateDetected,
                    },
                },
            });
        }
        activeTenant() {
            const cached = this.tenantConfigCache;
            if (cached !== undefined)
                return cached;
            const value = Object.freeze(activeTenantConfig(this.resolved, this.startupUserServiceDomain));
            this.tenantConfigCache = value;
            return value;
        }
        activeTenantState() {
            const cached = this.tenantStateCache;
            if (cached !== undefined)
                return cached;
            const tenant = this.activeTenant();
            const value = Object.freeze({
                domain: tenant.domain,
                stateRoot: tenant.stateRoot,
                sessionStore: new AwikiSessionStore(tenant.stateRoot),
                imageAttachmentCache: new AwikiImageAttachmentCache(tenant.stateRoot, this.resolved.attachmentMaxBytes, this.resolved.imageAttachmentCacheMaxBytes),
                sentMailStore: new AwikiSentMailStore(tenant.stateRoot),
                conversationPreferenceStore: new AwikiConversationPreferenceStore(tenant.stateRoot),
            });
            this.tenantStateCache = value;
            return value;
        }
        get sessionStore() {
            return this.activeTenantState().sessionStore;
        }
        get imageAttachmentCache() {
            return this.activeTenantState().imageAttachmentCache;
        }
        get sentMailStore() {
            return this.activeTenantState().sentMailStore;
        }
        get conversationPreferenceStore() {
            return this.activeTenantState().conversationPreferenceStore;
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
        /** Classify one configured-domain Handle before selecting the registration or recovery OTP purpose. */
        async inspectIdentityAccess(request) {
            const target = identityAccessTarget(request, this.startupUserServiceDomain);
            if (target === undefined)
                return { ok: false, error: failure('invalid-request') };
            const endpoint = new URL(`/.well-known/handle/${encodeURIComponent(target.localPart)}`, this.activeTenant().userServiceUrl);
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
            if (result.ok)
                await this.activateRegisteredIdentity(result.value);
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
            const normalized = normalizeRecoveryOtpRequest(request);
            if (normalized === undefined)
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            return this.run(client => client.sendRecoveryOtp(normalized), { allowSignedOut: true });
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
        /** Resume durable group membership convergence after account sync restores old groups. */
        async resumeGroupRebindRecovery() {
            const result = await this.run(client => client.resumeGroupRebindRecovery());
            if (!result.ok)
                return result;
            const summary = publicGroupRebindRecoverySummary(result.value);
            return summary === undefined
                ? { ok: false, error: failure('remote') }
                : { ok: true, value: summary };
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
            return this.run(client => client.getMailAccount(), { bindMailOwner: true });
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
            return this.run(async (client, _provider, ownerDid) => {
                if (normalized.folder !== 'sent')
                    return client.listMailInbox(normalized);
                return this.sentMailStore.list(ownerDid, normalized);
            }, { bindMailOwner: true });
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
            return this.run(async (client, _provider, ownerDid) => {
                if (!isLocalSentMailId(normalized.messageId))
                    return client.readMail(normalized);
                const local = await this.sentMailStore.read(ownerDid, normalized.messageId);
                if (local === undefined) {
                    throw Object.assign(new Error('sent mail not found'), { name: 'AwikiSdkError', code: 'not-found' });
                }
                return local;
            }, { bindMailOwner: true });
        }
        /** Mark explicitly selected mail messages read. Browser callers require an explicit click. */
        markMailRead(request) {
            return this.runValidatedMail(() => mailMarkReadRequest(request), (client, normalized) => client.markMailRead(normalized), { bindMailOwner: true });
        }
        /** Send one mail once. Browser callers require an explicit confirmation. */
        async sendMail(request) {
            let normalized;
            try {
                normalized = mailSendRequest(request, {
                    maxCount: this.resolved.mailAttachmentMaxCount,
                    maxBytes: this.resolved.mailAttachmentMaxBytes,
                    totalMaxBytes: this.resolved.mailAttachmentTotalMaxBytes,
                });
            }
            catch {
                return { ok: false, error: failure('invalid-request') };
            }
            return this.run(async (client, _provider, ownerDid, assertActive) => {
                const result = await client.sendMail({
                    to: [...normalized.to],
                    cc: [...normalized.cc],
                    subject: normalized.subject,
                    bodyText: normalized.bodyText,
                    ...normalized.attachments.length === 0 ? {} : {
                        attachments: normalized.attachments.map(attachment => ({
                            fileName: attachment.fileName,
                            contentType: attachment.contentType,
                            bytes: attachment.bytes,
                        })),
                    },
                });
                assertActive();
                if (!result.accepted)
                    return result;
                const settled = normalized.attachments.length > 0
                    && result.messageId === undefined
                    && result.warnings.length < 100
                    ? { ...result, warnings: [...result.warnings, 'Sent attachment download is unavailable because the service returned no message id.'] }
                    : result;
                try {
                    const account = await client.getMailAccount().catch(() => undefined);
                    assertActive();
                    await this.sentMailStore.append(ownerDid, normalized, settled, account);
                    assertActive();
                    return settled;
                }
                catch {
                    assertActive();
                    return settled.warnings.length >= 100
                        ? settled
                        : { ...settled, warnings: [...settled.warnings, 'Sent history could not be saved locally.'] };
                }
            }, { bindMailOwner: true });
        }
        /** Download one mail attachment only after an explicit browser action. */
        async downloadMailAttachment(request) {
            let normalized;
            try {
                normalized = mailAttachmentDownloadRequest(request);
            }
            catch {
                return { ok: false, error: failure('invalid-request') };
            }
            return this.run(async (client, _provider, ownerDid, assertActive) => {
                let serviceMessageId = normalized.localMessageId;
                if (isLocalSentMailId(serviceMessageId)) {
                    const resolved = await this.sentMailStore.resolveAttachment(ownerDid, serviceMessageId, normalized.attachmentIndex);
                    if (resolved === undefined) {
                        throw Object.assign(new Error('sent mail attachment is unavailable'), {
                            name: 'AwikiSdkError', code: 'not-found',
                        });
                    }
                    serviceMessageId = resolved;
                }
                const value = await client.downloadMailAttachment({
                    messageId: serviceMessageId,
                    attachmentIndex: normalized.attachmentIndex,
                });
                assertActive();
                if (!Number.isSafeInteger(value.sizeBytes) || value.sizeBytes < 0)
                    throw new TypeError('invalid mail attachment size');
                if (value.sizeBytes > this.resolved.mailAttachmentMaxBytes) {
                    throw Object.assign(new Error('mail attachment exceeds Host limit'), {
                        name: 'AwikiSdkError', code: 'attachment-too-large',
                    });
                }
                if (!(value.bytes instanceof Uint8Array) || value.bytes.byteLength !== value.sizeBytes) {
                    throw new TypeError('invalid mail attachment bytes');
                }
                const fileName = mailAttachmentFileName(value.fileName);
                const contentType = mailAttachmentContentType(value.contentType);
                const bytes = value.bytes;
                return {
                    fileName,
                    contentType,
                    sizeBytes: bytes.byteLength,
                    sha256: createHash('sha256').update(bytes).digest('hex'),
                    bytesBase64: Buffer.from(bytes).toString('base64'),
                };
            }, { bindMailOwner: true });
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
                    await this.conversationPreferenceStore.clear();
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
        /** Re-enter after Core applies the recovered identity without blocking on optional account restoration. */
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
                    if (this.provider !== provider)
                        return false;
                    if (!alreadyActive) {
                        const session = { status: 'active', identity };
                        this.publishSession(session);
                        await provider.listenerStartup;
                        await this.startListener(provider);
                    }
                    return true;
                }
                catch {
                    return false;
                }
            });
        }
        /** Publish one newly registered identity and start its listener through the existing session path. */
        async activateRegisteredIdentity(identity) {
            this.activeIdentityDid = identity.did;
            this.publishSession({ status: 'active', identity });
            const provider = this.provider;
            if (provider !== undefined) {
                await provider.listenerStartup;
                await this.startListener(provider);
            }
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
            const identity = await client.getIdentity();
            const ownerDid = identity?.did;
            if (ownerDid === undefined) {
                throw Object.assign(new Error('not registered'), { name: 'AwikiSdkError', code: 'not-registered' });
            }
            if (this.activeIdentityDid !== undefined && this.activeIdentityDid !== ownerDid) {
                throw new ProviderUnavailableError();
            }
            this.activeIdentityDid = ownerDid;
            return ownerDid;
        }
        /** Invoke the current client and normalize every rejection to a public result. */
        async run(operation, options = {}) {
            try {
                const sessionRevision = this.sessionRevision;
                if (options.allowSignedOut !== true && await this.isSignedOut()) {
                    return { ok: false, error: failure('signed-out') };
                }
                const provider = this.provider;
                if (provider === undefined)
                    throw new ProviderUnavailableError();
                const ownerDid = options.bindMailOwner === true
                    ? await this.ownerDid(provider.client)
                    : undefined;
                const assertActive = () => {
                    if (this.provider !== provider
                        || (options.bindMailOwner === true && (this.sessionRevision !== sessionRevision
                            || this.signedOut === true
                            || this.activeIdentityDid !== ownerDid)))
                        throw new ProviderUnavailableError();
                };
                assertActive();
                const value = await operation(provider.client, provider, ownerDid, assertActive);
                assertActive();
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
        runValidatedMail(validate, operation, options = {}) {
            let request;
            try {
                request = validate();
            }
            catch {
                return Promise.resolve({ ok: false, error: failure('invalid-request') });
            }
            return this.run(client => operation(client, request), options);
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
                const listener = new AwikiAgentListener(source, agents, {
                    ...this.resolved.listener,
                    stateRoot: this.activeTenant().stateRoot,
                }, logger);
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