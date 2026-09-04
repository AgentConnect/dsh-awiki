/** Host-only AWiki-authenticated model-proxy provider and loopback account API. */
import z from '@deepseek-ai/schemastery';
import { getOrCreateAnonymousUserId } from '@deepseek-ai/dsh-anonymous-user-id';
import { LlmError } from '@deepseek-ai/dsh-llm';
import { DeepSeekAdapter, resolveAdapterOptions } from '@deepseek-ai/dsh-llm-deepseek';
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import { AWIKI_PLUGIN_INSTALL_HINT, rethrowAwikiPluginDependencyError, } from "./dependency-error.js";
const { AWIKI_MODEL_PROXY_RPC_CHANNEL, AWIKI_MODEL_PROXY_RPC_ENDPOINTS, decodeModelProxyStatus, decodeModelProxyUsage, decodeRechargeOrder, } = await import('@awiki/dsh-plugin/model-proxy-contract').catch((error) => {
    rethrowAwikiPluginDependencyError(error);
});
export const name = 'awiki-model-proxy';
export const inject = ['llm', 'settings', 'agentDefaultModel', 'connection'];
const SETTINGS = settingsNamespace('awiki-model-proxy');
const PROVIDER = 'awiki-deepseek';
const FLASH = 'deepseek-v4-flash';
const PRO = 'deepseek-v4-pro';
const MODELS = [FLASH, PRO];
const PROVIDER_NAME = 'AWiki-hosted DeepSeek';
const SettingsSchema = z.object({
    enabled: z.boolean().default(false),
    previousProvider: z.string(),
    previousModel: z.string(),
    previousReasoningEffort: z.string(),
});
export const Config = z.object({
    baseURL: z.string().default('https://model.awiki.info'),
    contextWindow: z.number().step(1).min(1).default(1_000_000),
    maxTokens: z.number().step(1).min(1).default(8_192),
    tokenRefreshSkewSeconds: z.number().step(1).min(0).default(60),
});
const IDENTITY_RECOVERY_RESPONSE_MAX_BYTES = 4 * 1024;
const IDENTITY_RECOVERY_OUTCOMES = new Set(['restored', 'already_current', 'not_applicable']);
async function reconcileModelIdentity(ctx, config) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const response = await ctx.awiki.externalHttpAuth.dispatch(new Request(new URL('/api/identity-recovery', config.baseURL), {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: '{}',
            }), request => fetch(request));
            if (response.status === 503 && attempt === 0)
                continue;
            if (!response.ok)
                return false;
            return await acceptsIdentityRecoveryOutcome(response);
        }
        catch {
            if (attempt === 0)
                continue;
            return false;
        }
    }
    return false;
}
async function acceptsIdentityRecoveryOutcome(response) {
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > IDENTITY_RECOVERY_RESPONSE_MAX_BYTES)
        return false;
    const reader = response.body?.getReader();
    if (reader === undefined)
        return false;
    const chunks = [];
    let length = 0;
    while (true) {
        const { value, done } = await reader.read();
        if (done)
            break;
        length += value.byteLength;
        if (length > IDENTITY_RECOVERY_RESPONSE_MAX_BYTES) {
            await reader.cancel();
            return false;
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    let value;
    try {
        value = JSON.parse(new TextDecoder().decode(bytes));
    }
    catch {
        return false;
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const result = value;
    return Object.keys(result).length === 1
        && typeof result.outcome === 'string'
        && IDENTITY_RECOVERY_OUTCOMES.has(result.outcome);
}
export function apply(ctx, input = {}) {
    if (!('awiki' in ctx) || ctx.awiki === undefined) {
        throw new Error(AWIKI_PLUGIN_INSTALL_HINT);
    }
    const config = resolveConfig(input);
    const settings = ctx.settings.register(SETTINGS, SettingsSchema, {
        base: { enabled: false },
        applies: 'live',
    });
    const token = new ModelProxyToken(ctx, config);
    const adapter = new AwikiHostedDeepSeekAdapter({
        options: () => resolveAdapterOptions({
            baseURL: new URL('/v1', config.baseURL).toString().replace(/\/$/, ''),
            apiKeyEnv: 'AWIKI_MODEL_PROXY_TOKEN',
            maxTokens: config.maxTokens,
            defaultContextWindow: config.contextWindow,
            models: [
                { id: FLASH, name: 'DeepSeek V4 Flash', contextWindow: config.contextWindow, maxTokens: config.maxTokens },
                { id: PRO, name: 'DeepSeek V4 Pro', contextWindow: config.contextWindow, maxTokens: config.maxTokens },
            ],
            streamIdleTimeoutMs: 300_000,
        }),
        resolveApiKey: () => token.get(),
        resolveUserId: () => getOrCreateAnonymousUserId(),
    });
    let route;
    let directory;
    let sessionStatus;
    let sessionRefresh;
    let identityReady = false;
    let identityDid;
    let identityGeneration = 0;
    let identityReconciliation;
    let resolveIdentityGenerationChanged;
    let identityGenerationChanged = new Promise((resolve) => {
        resolveIdentityGenerationChanged = resolve;
    });
    const advanceIdentityGeneration = () => {
        identityGeneration += 1;
        resolveIdentityGenerationChanged();
        identityGenerationChanged = new Promise((resolve) => {
            resolveIdentityGenerationChanged = resolve;
        });
        return identityGeneration;
    };
    const registerAdapter = () => {
        let nextDirectory;
        let nextRoute;
        try {
            nextDirectory = ctx.llm.registerConfigurableProviders([{
                    provider: PROVIDER,
                    displayName: PROVIDER_NAME,
                    settingsNs: SETTINGS,
                    settingsPath: [],
                }]);
            nextRoute = ctx.llm.registerAdapter([PROVIDER], adapter);
        }
        catch (error) {
            for (const [label, dispose] of [
                ['adapter', nextRoute],
                ['directory', nextDirectory],
            ]) {
                try {
                    dispose?.();
                }
                catch (rollbackError) {
                    ctx.logger.warn(`awiki-model-proxy: failed to roll back ${label} registration`);
                    ctx.logger.warn(rollbackError);
                }
            }
            throw error;
        }
        directory = nextDirectory;
        route = nextRoute;
    };
    const releaseAdapter = () => {
        token.clear();
        const failures = [];
        if (route !== undefined) {
            try {
                route();
                route = undefined;
            }
            catch (error) {
                failures.push(error);
            }
        }
        if (directory !== undefined) {
            try {
                directory();
                directory = undefined;
            }
            catch (error) {
                failures.push(error);
            }
        }
        if (failures.length === 1)
            throw failures[0];
        if (failures.length > 1)
            throw new AggregateError(failures, 'failed to release AWiki model adapter');
    };
    const sync = () => {
        const enabled = settings.get().enabled;
        if (enabled && sessionStatus === 'active' && identityReady) {
            if (route === undefined && directory === undefined) {
                registerAdapter();
            }
            else if (directory === undefined) {
                directory = ctx.llm.registerConfigurableProviders([{
                        provider: PROVIDER,
                        displayName: PROVIDER_NAME,
                        settingsNs: SETTINGS,
                        settingsPath: [],
                    }]);
            }
            else if (route === undefined) {
                route = ctx.llm.registerAdapter([PROVIDER], adapter);
            }
        }
        else if (route !== undefined || directory !== undefined) {
            releaseAdapter();
        }
    };
    const publishSession = (session) => {
        sessionStatus = session.status;
        token.clear();
        const generation = advanceIdentityGeneration();
        const nextDid = session.status === 'active' ? session.identity?.did : undefined;
        identityDid = nextDid;
        identityReady = false;
        sync();
        if (nextDid === undefined) {
            identityReconciliation = undefined;
            return;
        }
        const pending = reconcileModelIdentity(ctx, config).then((ready) => {
            if (generation !== identityGeneration || identityDid !== nextDid || sessionStatus !== 'active')
                return;
            identityReady = ready;
            sync();
        }).finally(() => {
            if (identityReconciliation === pending)
                identityReconciliation = undefined;
        });
        identityReconciliation = pending;
    };
    const refreshSession = (force = false) => {
        if (!force && sessionStatus !== undefined)
            return Promise.resolve(sessionStatus);
        const generation = identityGeneration;
        return sessionRefresh ??= ctx.awiki.getSession().then((result) => {
            if (!result.ok)
                return undefined;
            if (generation !== identityGeneration)
                return sessionStatus;
            publishSession(result.value);
            return result.value.status;
        }).finally(() => { sessionRefresh = undefined; });
    };
    const modelIdentityReady = async () => {
        const staleOrUnready = sessionStatus !== 'active'
            || (!identityReady && identityReconciliation === undefined);
        if (await refreshSession(staleOrUnready) !== 'active')
            return false;
        while (sessionStatus === 'active') {
            const generation = identityGeneration;
            const pending = identityReconciliation;
            if (pending === undefined)
                return identityReady;
            await Promise.race([pending, identityGenerationChanged]);
            if (generation === identityGeneration)
                return identityReady;
        }
        return false;
    };
    sync();
    void refreshSession();
    ctx.on('awiki/session', (session) => { publishSession(session); });
    ctx.on('settings/updated', (namespace) => {
        if (namespace === SETTINGS)
            sync();
    });
    ctx.effect(() => () => {
        advanceIdentityGeneration();
        identityReady = false;
        identityDid = undefined;
        try {
            releaseAdapter();
        }
        catch (error) {
            ctx.logger.warn('awiki-model-proxy: failed to release adapter during unload');
            ctx.logger.warn(error);
        }
    }, 'awiki-model-proxy: release adapter and token');
    const handler = createRpcHandler(ctx, config, token, () => settings.get(), sync, modelIdentityReady);
    ctx.connection.rpc.handle(AWIKI_MODEL_PROXY_RPC_CHANNEL, handler, { authority: 'loopback' });
}
class ModelProxyToken {
    ctx;
    config;
    value;
    expiresAt = 0;
    pending;
    generation = 0;
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
    }
    get() {
        if (this.value !== undefined && Date.now() < this.expiresAt - this.config.tokenRefreshSkewMs) {
            return Promise.resolve(this.value);
        }
        if (this.pending !== undefined)
            return this.pending;
        const generation = this.generation;
        const pending = this.refresh(generation).finally(() => {
            if (this.pending === pending)
                this.pending = undefined;
        });
        this.pending = pending;
        return pending;
    }
    clear() {
        this.generation += 1;
        this.value = undefined;
        this.expiresAt = 0;
        this.pending = undefined;
    }
    invalidate(value) {
        if (this.value === value)
            this.clear();
    }
    async refresh(generation) {
        const response = await this.ctx.awiki.externalHttpAuth.dispatch(new Request(new URL('/api/token', this.config.baseURL), { method: 'POST' }), request => fetch(request));
        if (!response.ok)
            throw await modelProxyError(response, 'AWiki-hosted DeepSeek authentication failed');
        const value = await response.json();
        if (!isRecord(value)
            || typeof value.access_token !== 'string'
            || value.access_token.length === 0
            || !Number.isSafeInteger(value.expires_in)
            || value.expires_in <= 0) {
            throw new LlmError('AWiki-hosted DeepSeek authentication returned an invalid response', 'AUTH');
        }
        const token = value;
        if (generation !== this.generation) {
            throw new LlmError('AWiki-hosted DeepSeek authentication state changed', 'AUTH');
        }
        this.value = token.access_token;
        this.expiresAt = Date.now() + token.expires_in * 1_000;
        return token.access_token;
    }
}
class AwikiHostedDeepSeekAdapter extends DeepSeekAdapter {
    providerInfo(provider) {
        return { id: provider, name: PROVIDER_NAME };
    }
}
function createRpcHandler(ctx, config, token, currentSettings, sync, sessionActive) {
    const restoreState = async (previousSettings, previousSelection) => {
        const failures = [];
        try {
            await ctx.settings.update(SETTINGS, {
                enabled: previousSettings.enabled,
                ...previousSettings.previousProvider === undefined
                    ? {}
                    : { previousProvider: previousSettings.previousProvider },
                ...previousSettings.previousModel === undefined
                    ? {}
                    : { previousModel: previousSettings.previousModel },
                ...previousSettings.previousReasoningEffort === undefined
                    ? {}
                    : { previousReasoningEffort: previousSettings.previousReasoningEffort },
            });
        }
        catch (error) {
            failures.push(error);
        }
        try {
            sync();
        }
        catch (error) {
            failures.push(error);
        }
        try {
            const currentSelection = ctx.agentDefaultModel.currentSelection();
            if (!sameModelSelection(currentSelection, previousSelection)) {
                await ctx.agentDefaultModel.saveSelection(previousSelection);
            }
        }
        catch (error) {
            failures.push(error);
        }
        if (failures.length > 0) {
            ctx.logger.warn('awiki-model-proxy: failed to fully restore model state');
            for (const error of failures)
                ctx.logger.warn(error);
        }
    };
    const updateEnabledState = async (enabled) => {
        const previousSettings = currentSettings();
        const previousSelection = ctx.agentDefaultModel.currentSelection();
        try {
            if (enabled === previousSettings.enabled) {
                sync();
                if (enabled && previousSelection.provider !== PROVIDER) {
                    await ctx.agentDefaultModel.saveSelection({ provider: PROVIDER, model: FLASH });
                }
                return;
            }
            if (enabled) {
                await ctx.settings.update(SETTINGS, {
                    enabled: true,
                    previousProvider: previousSelection.provider,
                    previousModel: previousSelection.model,
                    ...previousSelection.reasoningEffort === undefined
                        ? {}
                        : { previousReasoningEffort: String(previousSelection.reasoningEffort) },
                });
                sync();
                await ctx.agentDefaultModel.saveSelection({ provider: PROVIDER, model: FLASH });
            }
            else {
                if (previousSelection.provider === PROVIDER) {
                    await ctx.agentDefaultModel.saveSelection({
                        provider: previousSettings.previousProvider ?? 'deepseek-official',
                        model: previousSettings.previousModel ?? FLASH,
                        ...previousSettings.previousReasoningEffort === undefined
                            ? {}
                            : { reasoningEffort: previousSettings.previousReasoningEffort },
                    });
                }
                await ctx.settings.update(SETTINGS, { enabled: false });
                sync();
            }
        }
        catch (error) {
            await restoreState(previousSettings, previousSelection);
            throw error;
        }
    };
    return async (endpoint, payload, signal) => {
        try {
            if (signal.aborted)
                throw new Error('request cancelled');
            if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.capability) {
                return { ok: true, value: { available: true, protocol: 1 } };
            }
            if (!await sessionActive())
                throw new LlmError('Sign in to AWiki before using AWiki-hosted DeepSeek.', 'AUTH');
            if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status) {
                return { ok: true, value: await status(config, token, currentSettings().enabled, signal) };
            }
            if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.usage) {
                const value = await authenticatedJson(config, token, '/api/usage', { signal });
                const usage = decodeModelProxyUsage(value);
                if (usage === undefined)
                    throw new Error('invalid usage response');
                return { ok: true, value: usage };
            }
            if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.createRecharge) {
                if (!isRecord(payload) || !Number.isSafeInteger(payload.amount_cents))
                    return badRequest();
                const value = await authenticatedJson(config, token, '/api/recharge/orders', {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'idempotency-key': globalThis.crypto.randomUUID(),
                    },
                    body: JSON.stringify({ amount_cents: payload.amount_cents }),
                    signal,
                });
                const order = decodeRechargeOrder(value);
                if (order === undefined || order.payment_action === undefined)
                    throw new Error('invalid recharge response');
                return { ok: true, value: order };
            }
            if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.rechargeStatus) {
                if (!isRecord(payload) || typeof payload.out_trade_no !== 'string')
                    return badRequest();
                const value = await authenticatedJson(config, token, `/api/recharge/orders/${encodeURIComponent(payload.out_trade_no)}`, { signal });
                const order = decodeRechargeOrder(value);
                if (order === undefined)
                    throw new Error('invalid recharge status response');
                return { ok: true, value: order };
            }
            if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.closeRecharge) {
                if (!isRecord(payload) || typeof payload.out_trade_no !== 'string')
                    return badRequest();
                const response = await authenticatedResponse(config, token, `/api/recharge/orders/${encodeURIComponent(payload.out_trade_no)}/close`, { method: 'POST', signal });
                if (response.status !== 204)
                    throw new Error('invalid recharge close response');
                return { ok: true, value: { closed: true } };
            }
            if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled) {
                if (!isRecord(payload) || typeof payload.enabled !== 'boolean')
                    return badRequest();
                if (payload.enabled) {
                    const current = await status(config, token, false, signal);
                    if (!current.account.model_access_available) {
                        return modelUnavailable('Account balance is required before enabling AWiki-hosted DeepSeek.');
                    }
                }
                await updateEnabledState(payload.enabled);
                return { ok: true, value: await status(config, token, payload.enabled, signal) };
            }
            return badRequest();
        }
        catch (error) {
            ctx.logger.warn('awiki-model-proxy: loopback request failed');
            ctx.logger.warn(error);
            return internal(displayMessage(error));
        }
    };
}
function sameModelSelection(left, right) {
    return left.provider === right.provider
        && left.model === right.model
        && left.reasoningEffort === right.reasoningEffort;
}
async function status(config, token, enabled, signal) {
    const [account, pendingRechargeOrder] = await Promise.all([
        authenticatedJson(config, token, '/api/account', { signal }),
        authenticatedJson(config, token, '/api/recharge/orders/pending', { signal }),
    ]);
    const value = {
        enabled,
        account,
        pending_recharge_order: pendingRechargeOrder,
        recommended_model: FLASH,
        models: MODELS,
    };
    const decoded = decodeModelProxyStatus(value);
    if (decoded === undefined)
        throw new Error('invalid account response');
    return decoded;
}
async function authenticatedJson(config, token, path, init) {
    const response = await authenticatedResponse(config, token, path, init);
    return response.json();
}
async function authenticatedResponse(config, token, path, init) {
    const send = async () => {
        const accessToken = await token.get();
        const response = await fetch(new URL(path, config.baseURL), {
            ...init,
            headers: { ...headersRecord(init.headers), authorization: `Bearer ${accessToken}` },
        });
        return { response, accessToken };
    };
    let result = await send();
    if (result.response.status === 401) {
        token.invalidate(result.accessToken);
        result = await send();
    }
    const { response } = result;
    if (!response.ok)
        throw await modelProxyError(response, `AWiki-hosted DeepSeek service returned HTTP ${response.status}`);
    return response;
}
async function modelProxyError(response, fallback) {
    let message = fallback;
    try {
        const body = await response.text();
        if (body !== '') {
            try {
                const value = JSON.parse(body);
                if (isRecord(value) && isRecord(value.error) && typeof value.error.message === 'string') {
                    message = value.error.message;
                }
            }
            catch {
                message = body;
            }
        }
    }
    catch { }
    return new LlmError(message, response.status === 401 || response.status === 403 ? 'AUTH' : `HTTP_${response.status}`, {
        status: response.status,
    });
}
function resolveConfig(input) {
    const baseURL = new URL(input.baseURL ?? 'https://model.awiki.info');
    if (baseURL.username !== '' || baseURL.password !== '' || baseURL.search !== '' || baseURL.hash !== '') {
        throw new Error('awiki-model-proxy: baseURL must not contain credentials, query, or fragment');
    }
    if (baseURL.protocol !== 'https:'
        && !(baseURL.protocol === 'http:' && ['127.0.0.1', 'localhost', '::1'].includes(baseURL.hostname))) {
        throw new Error('awiki-model-proxy: baseURL must use HTTPS or loopback HTTP');
    }
    const contextWindow = positiveInteger(input.contextWindow ?? 1_000_000, 'contextWindow');
    const maxTokens = positiveInteger(input.maxTokens ?? 8_192, 'maxTokens');
    const skew = input.tokenRefreshSkewSeconds ?? 60;
    if (!Number.isSafeInteger(skew) || skew < 0) {
        throw new Error('awiki-model-proxy: tokenRefreshSkewSeconds must be a non-negative integer');
    }
    return { baseURL, contextWindow, maxTokens, tokenRefreshSkewMs: skew * 1_000 };
}
function positiveInteger(value, name) {
    if (!Number.isSafeInteger(value) || value <= 0)
        throw new Error(`awiki-model-proxy: ${name} must be a positive integer`);
    return value;
}
function headersRecord(headers) {
    return Object.fromEntries(new Headers(headers));
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function displayMessage(error) {
    return error instanceof Error && error.message !== '' ? error.message : 'AWiki-hosted DeepSeek service is unavailable.';
}
function badRequest() {
    return {
        ok: false,
        error: { code: 'bad-request', message: 'The AWiki-hosted DeepSeek request is invalid.', details: { issues: [] } },
    };
}
function modelUnavailable(message) {
    return {
        ok: false,
        error: { code: 'model-unavailable', message, details: { provider: PROVIDER, model: FLASH } },
    };
}
function internal(message) {
    return { ok: false, error: { code: 'internal', message, details: {} } };
}
//# sourceMappingURL=index.js.map