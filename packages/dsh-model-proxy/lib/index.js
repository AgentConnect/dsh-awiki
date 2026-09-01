import z from "@deepseek-ai/schemastery";
import { getOrCreateAnonymousUserId } from "@deepseek-ai/dsh-anonymous-user-id";
import { LlmError } from "@deepseek-ai/dsh-llm";
import { DeepSeekAdapter, resolveAdapterOptions } from "@deepseek-ai/dsh-llm-deepseek";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
//#region lib/types/dependency-error.js
const AWIKI_PLUGIN_REQUIREMENT = "@awiki/dsh-plugin@^0.3.0";
const AWIKI_PLUGIN_INSTALL_HINT = `@awiki/dsh-model-proxy requires ${AWIKI_PLUGIN_REQUIREMENT} in the same DSH profile. Install or upgrade it first with: dsh plugin --profile <profile> add ${AWIKI_PLUGIN_REQUIREMENT}`;
function rethrowAwikiPluginDependencyError(error) {
	if (error instanceof Error && "code" in error && (error.code === "ERR_MODULE_NOT_FOUND" || error.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") && error.message.includes("@awiki/dsh-plugin")) throw new Error(AWIKI_PLUGIN_INSTALL_HINT, { cause: error });
	throw error;
}
//#endregion
//#region lib/types/index.js
/** Host-only AWiki-authenticated model-proxy provider and loopback account API. */
const { AWIKI_MODEL_PROXY_RPC_CHANNEL, AWIKI_MODEL_PROXY_RPC_ENDPOINTS, decodeModelProxyStatus, decodeModelProxyUsage, decodeRechargeOrder } = await import("@awiki/dsh-plugin/model-proxy-contract").catch((error) => {
	rethrowAwikiPluginDependencyError(error);
});
const name = "awiki-model-proxy";
const inject = [
	"llm",
	"settings",
	"agentDefaultModel",
	"connection"
];
const SETTINGS = settingsNamespace("awiki-model-proxy");
const PROVIDER = "awiki-deepseek";
const FLASH = "deepseek-v4-flash";
const PRO = "deepseek-v4-pro";
const MODELS = [FLASH, PRO];
const PROVIDER_NAME = "AWiki-hosted DeepSeek";
const SettingsSchema = z.object({
	enabled: z.boolean().default(false),
	previousProvider: z.string(),
	previousModel: z.string(),
	previousReasoningEffort: z.string(),
	tenantPreferencesJson: z.string().default("{}")
});
const Config = z.object({
	baseURL: z.string(),
	contextWindow: z.number().step(1).min(1).default(1e6),
	maxTokens: z.number().step(1).min(1).default(8192),
	tokenRefreshSkewSeconds: z.number().step(1).min(0).default(60)
});
function apply(ctx, input = {}) {
	if (!("awiki" in ctx) || ctx.awiki === void 0) throw new Error(AWIKI_PLUGIN_INSTALL_HINT);
	const initialConfig = resolveTenantConfig(ctx, input);
	let config = input.baseURL === void 0 ? void 0 : initialConfig;
	let releaseRecoveryTarget;
	const currentConfig = () => config;
	const requireConfig = () => {
		if (config === void 0) throw new LlmError("AWiki-hosted DeepSeek is not available for the active tenant.", "MODEL_UNAVAILABLE");
		return config;
	};
	const bindRecoveryTarget = () => {
		releaseRecoveryTarget?.();
		releaseRecoveryTarget = config === void 0 ? void 0 : ctx.awiki.registerRecoveryReconciliationTarget({
			kind: "model-proxy-v1",
			baseURL: config.baseURL.toString()
		});
	};
	bindRecoveryTarget();
	const settings = ctx.settings.register(SETTINGS, SettingsSchema, {
		base: {
			enabled: false,
			tenantPreferencesJson: "{}"
		},
		applies: "live"
	});
	let currentTenantId = ctx.awiki.getTenantCapabilities().tenantId;
	const token = new ModelProxyToken(ctx, requireConfig);
	const adapter = new AwikiHostedDeepSeekAdapter({
		options: () => {
			const active = requireConfig();
			return resolveAdapterOptions({
				baseURL: new URL("/v1", active.baseURL).toString().replace(/\/$/, ""),
				apiKeyEnv: "AWIKI_MODEL_PROXY_TOKEN",
				maxTokens: active.maxTokens,
				defaultContextWindow: active.contextWindow,
				models: [{
					id: FLASH,
					name: "DeepSeek V4 Flash",
					contextWindow: active.contextWindow,
					maxTokens: active.maxTokens
				}, {
					id: PRO,
					name: "DeepSeek V4 Pro",
					contextWindow: active.contextWindow,
					maxTokens: active.maxTokens
				}],
				streamIdleTimeoutMs: 3e5
			});
		},
		resolveApiKey: () => token.get(),
		resolveUserId: () => getOrCreateAnonymousUserId()
	});
	let route;
	let directory;
	let sessionStatus;
	let sessionRefresh;
	const registerAdapter = () => {
		let nextDirectory;
		let nextRoute;
		try {
			nextDirectory = ctx.llm.registerConfigurableProviders([{
				provider: PROVIDER,
				displayName: PROVIDER_NAME,
				settingsNs: SETTINGS,
				settingsPath: []
			}]);
			nextRoute = ctx.llm.registerAdapter([PROVIDER], adapter);
		} catch (error) {
			for (const [label, dispose] of [["adapter", nextRoute], ["directory", nextDirectory]]) try {
				dispose?.();
			} catch (rollbackError) {
				ctx.logger.warn(`awiki-model-proxy: failed to roll back ${label} registration`);
				ctx.logger.warn(rollbackError);
			}
			throw error;
		}
		directory = nextDirectory;
		route = nextRoute;
	};
	const releaseAdapter = () => {
		token.clear();
		const failures = [];
		if (route !== void 0) try {
			route();
			route = void 0;
		} catch (error) {
			failures.push(error);
		}
		if (directory !== void 0) try {
			directory();
			directory = void 0;
		} catch (error) {
			failures.push(error);
		}
		if (failures.length === 1) throw failures[0];
		if (failures.length > 1) throw new AggregateError(failures, "failed to release AWiki model adapter");
	};
	const sync = () => {
		if (settings.get().enabled && sessionStatus === "active" && config !== void 0) {
			if (route === void 0 && directory === void 0) registerAdapter();
			else if (directory === void 0) directory = ctx.llm.registerConfigurableProviders([{
				provider: PROVIDER,
				displayName: PROVIDER_NAME,
				settingsNs: SETTINGS,
				settingsPath: []
			}]);
			else if (route === void 0) route = ctx.llm.registerAdapter([PROVIDER], adapter);
		} else if (route !== void 0 || directory !== void 0) releaseAdapter();
	};
	const publishSession = (session) => {
		sessionStatus = session.status;
		token.clear();
		sync();
	};
	const refreshSession = () => {
		if (sessionStatus !== void 0) return Promise.resolve(sessionStatus);
		return sessionRefresh ??= ctx.awiki.getSession().then((result) => {
			if (!result.ok) return void 0;
			publishSession(result.value);
			return result.value.status;
		}).finally(() => {
			sessionRefresh = void 0;
		});
	};
	sync();
	refreshSession();
	ctx.on("awiki/session", (session) => {
		publishSession(session);
	});
	ctx.on("settings/updated", (namespace) => {
		if (namespace === SETTINGS) sync();
	});
	const restoreNonAwikiSelection = async () => {
		if (ctx.agentDefaultModel.currentSelection().provider !== PROVIDER) return;
		const saved = settings.get();
		await ctx.agentDefaultModel.saveSelection({
			provider: saved.previousProvider ?? "deepseek-official",
			model: saved.previousModel ?? FLASH,
			...saved.previousReasoningEffort === void 0 ? {} : { reasoningEffort: saved.previousReasoningEffort }
		});
	};
	const persistCurrentTenantPreference = async () => {
		const saved = settings.get();
		const preferences = decodeTenantPreferences(saved.tenantPreferencesJson);
		preferences[currentTenantId] = {
			enabled: saved.enabled,
			previousProvider: saved.previousProvider ?? "deepseek-official",
			previousModel: saved.previousModel ?? FLASH,
			...saved.previousReasoningEffort === void 0 ? {} : { previousReasoningEffort: saved.previousReasoningEffort }
		};
		await ctx.settings.update(SETTINGS, { tenantPreferencesJson: JSON.stringify(preferences) });
	};
	const applyTenantPreference = async (tenantId) => {
		const preference = decodeTenantPreferences(settings.get().tenantPreferencesJson)[tenantId];
		const selection = ctx.agentDefaultModel.currentSelection();
		await ctx.settings.update(SETTINGS, preference === void 0 ? {
			enabled: false,
			previousProvider: selection.provider === PROVIDER ? "deepseek-official" : selection.provider,
			previousModel: selection.provider === PROVIDER ? FLASH : selection.model,
			...selection.provider === PROVIDER || selection.reasoningEffort === void 0 ? {} : { previousReasoningEffort: String(selection.reasoningEffort) }
		} : {
			enabled: preference.enabled,
			previousProvider: preference.previousProvider,
			previousModel: preference.previousModel,
			...preference.previousReasoningEffort === void 0 ? {} : { previousReasoningEffort: preference.previousReasoningEffort }
		});
	};
	const bindActiveTenant = async () => {
		currentTenantId = (await ctx.awiki.refreshTenantCapabilities()).tenantId;
		await applyTenantPreference(currentTenantId);
		config = resolveTenantConfig(ctx, input);
		bindRecoveryTarget();
		token.clear();
		const session = await ctx.awiki.getSession();
		sessionStatus = session.ok ? session.value.status : void 0;
		sync();
		if (config !== void 0 && settings.get().enabled && sessionStatus === "active") await ctx.agentDefaultModel.saveSelection({
			provider: PROVIDER,
			model: FLASH
		});
	};
	const releaseTenantLifecycle = ctx.awiki.registerTenantLifecycleParticipant({
		prepareSwitch: async () => {
			await persistCurrentTenantPreference();
			releaseAdapter();
			releaseRecoveryTarget?.();
			releaseRecoveryTarget = void 0;
			token.clear();
			config = void 0;
			sessionStatus = void 0;
			await restoreNonAwikiSelection();
		},
		commitSwitch: bindActiveTenant,
		rollbackSwitch: bindActiveTenant
	});
	if (input.baseURL === void 0) bindActiveTenant().catch((error) => {
		ctx.logger.warn("awiki-model-proxy: initial tenant capability binding failed");
		ctx.logger.warn(error);
	});
	ctx.effect(() => () => {
		releaseTenantLifecycle();
		releaseRecoveryTarget?.();
		releaseRecoveryTarget = void 0;
		try {
			releaseAdapter();
		} catch (error) {
			ctx.logger.warn("awiki-model-proxy: failed to release adapter during unload");
			ctx.logger.warn(error);
		}
	}, "awiki-model-proxy: release adapter and token");
	const handler = createRpcHandler(ctx, currentConfig, token, () => settings.get(), sync, persistCurrentTenantPreference, async () => await refreshSession() === "active");
	ctx.connection.rpc.handle(AWIKI_MODEL_PROXY_RPC_CHANNEL, handler, { authority: "loopback" });
}
var ModelProxyToken = class {
	ctx;
	currentConfig;
	value;
	expiresAt = 0;
	pending;
	generation = 0;
	constructor(ctx, currentConfig) {
		this.ctx = ctx;
		this.currentConfig = currentConfig;
	}
	get() {
		const config = this.currentConfig();
		if (this.value !== void 0 && Date.now() < this.expiresAt - config.tokenRefreshSkewMs) return Promise.resolve(this.value);
		if (this.pending !== void 0) return this.pending;
		const generation = this.generation;
		const pending = this.refresh(generation).finally(() => {
			if (this.pending === pending) this.pending = void 0;
		});
		this.pending = pending;
		return pending;
	}
	clear() {
		this.generation += 1;
		this.value = void 0;
		this.expiresAt = 0;
		this.pending = void 0;
	}
	invalidate(value) {
		if (this.value === value) this.clear();
	}
	async refresh(generation) {
		const config = this.currentConfig();
		const response = await this.ctx.awiki.externalHttpAuth.dispatch(new Request(new URL("/api/token", config.baseURL), { method: "POST" }), (request) => fetch(request));
		if (!response.ok) throw await modelProxyError(response, "AWiki-hosted DeepSeek authentication failed");
		const value = await response.json();
		if (!isRecord(value) || typeof value.access_token !== "string" || value.access_token.length === 0 || !Number.isSafeInteger(value.expires_in) || value.expires_in <= 0) throw new LlmError("AWiki-hosted DeepSeek authentication returned an invalid response", "AUTH");
		const token = value;
		if (generation !== this.generation) throw new LlmError("AWiki-hosted DeepSeek authentication state changed", "AUTH");
		this.value = token.access_token;
		this.expiresAt = Date.now() + token.expires_in * 1e3;
		return token.access_token;
	}
};
var AwikiHostedDeepSeekAdapter = class extends DeepSeekAdapter {
	providerInfo(provider) {
		return {
			id: provider,
			name: PROVIDER_NAME
		};
	}
};
function createRpcHandler(ctx, currentConfig, token, currentSettings, sync, persistCurrentTenantPreference, sessionActive) {
	const restoreState = async (previousSettings, previousSelection) => {
		const failures = [];
		try {
			await ctx.settings.update(SETTINGS, {
				enabled: previousSettings.enabled,
				tenantPreferencesJson: previousSettings.tenantPreferencesJson ?? "{}",
				...previousSettings.previousProvider === void 0 ? {} : { previousProvider: previousSettings.previousProvider },
				...previousSettings.previousModel === void 0 ? {} : { previousModel: previousSettings.previousModel },
				...previousSettings.previousReasoningEffort === void 0 ? {} : { previousReasoningEffort: previousSettings.previousReasoningEffort }
			});
		} catch (error) {
			failures.push(error);
		}
		try {
			sync();
		} catch (error) {
			failures.push(error);
		}
		try {
			if (!sameModelSelection(ctx.agentDefaultModel.currentSelection(), previousSelection)) await ctx.agentDefaultModel.saveSelection(previousSelection);
		} catch (error) {
			failures.push(error);
		}
		if (failures.length > 0) {
			ctx.logger.warn("awiki-model-proxy: failed to fully restore model state");
			for (const error of failures) ctx.logger.warn(error);
		}
	};
	const updateEnabledState = async (enabled) => {
		const previousSettings = currentSettings();
		const previousSelection = ctx.agentDefaultModel.currentSelection();
		try {
			if (enabled === previousSettings.enabled) {
				sync();
				if (enabled && previousSelection.provider !== PROVIDER) await ctx.agentDefaultModel.saveSelection({
					provider: PROVIDER,
					model: FLASH
				});
				await persistCurrentTenantPreference();
				return;
			}
			if (enabled) {
				await ctx.settings.update(SETTINGS, {
					enabled: true,
					previousProvider: previousSelection.provider,
					previousModel: previousSelection.model,
					...previousSelection.reasoningEffort === void 0 ? {} : { previousReasoningEffort: String(previousSelection.reasoningEffort) }
				});
				sync();
				await ctx.agentDefaultModel.saveSelection({
					provider: PROVIDER,
					model: FLASH
				});
				await persistCurrentTenantPreference();
			} else {
				if (previousSelection.provider === PROVIDER) await ctx.agentDefaultModel.saveSelection({
					provider: previousSettings.previousProvider ?? "deepseek-official",
					model: previousSettings.previousModel ?? FLASH,
					...previousSettings.previousReasoningEffort === void 0 ? {} : { reasoningEffort: previousSettings.previousReasoningEffort }
				});
				await ctx.settings.update(SETTINGS, { enabled: false });
				sync();
				await persistCurrentTenantPreference();
			}
		} catch (error) {
			await restoreState(previousSettings, previousSelection);
			throw error;
		}
	};
	return async (endpoint, payload, signal) => {
		try {
			if (signal.aborted) throw new Error("request cancelled");
			if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.capability) return {
				ok: true,
				value: {
					available: currentConfig() !== void 0,
					protocol: 1
				}
			};
			const config = currentConfig();
			if (config === void 0) return modelUnavailable("AWiki-hosted DeepSeek is not available for the active tenant.");
			if (!await sessionActive()) throw new LlmError("Sign in to AWiki before using AWiki-hosted DeepSeek.", "AUTH");
			if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status) return {
				ok: true,
				value: await status(config, token, currentSettings().enabled, signal)
			};
			if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.usage) {
				const value = await authenticatedJson(config, token, "/api/usage", { signal });
				const usage = decodeModelProxyUsage(value);
				if (usage === void 0) throw new Error("invalid usage response");
				return {
					ok: true,
					value: usage
				};
			}
			if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.createRecharge) {
				if (!isRecord(payload) || !Number.isSafeInteger(payload.amount_cents)) return badRequest();
				const value = await authenticatedJson(config, token, "/api/recharge/orders", {
					method: "POST",
					headers: {
						"content-type": "application/json",
						"idempotency-key": globalThis.crypto.randomUUID()
					},
					body: JSON.stringify({ amount_cents: payload.amount_cents }),
					signal
				});
				const order = decodeRechargeOrder(value);
				if (order === void 0 || order.payment_action === void 0) throw new Error("invalid recharge response");
				return {
					ok: true,
					value: order
				};
			}
			if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.rechargeStatus) {
				if (!isRecord(payload) || typeof payload.out_trade_no !== "string") return badRequest();
				const value = await authenticatedJson(config, token, `/api/recharge/orders/${encodeURIComponent(payload.out_trade_no)}`, { signal });
				const order = decodeRechargeOrder(value);
				if (order === void 0) throw new Error("invalid recharge status response");
				return {
					ok: true,
					value: order
				};
			}
			if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.closeRecharge) {
				if (!isRecord(payload) || typeof payload.out_trade_no !== "string") return badRequest();
				if ((await authenticatedResponse(config, token, `/api/recharge/orders/${encodeURIComponent(payload.out_trade_no)}/close`, {
					method: "POST",
					signal
				})).status !== 204) throw new Error("invalid recharge close response");
				return {
					ok: true,
					value: { closed: true }
				};
			}
			if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled) {
				if (!isRecord(payload) || typeof payload.enabled !== "boolean") return badRequest();
				if (payload.enabled) {
					if (!(await status(config, token, false, signal)).account.model_access_available) return modelUnavailable("Account balance is required before enabling AWiki-hosted DeepSeek.");
				}
				await updateEnabledState(payload.enabled);
				return {
					ok: true,
					value: await status(config, token, payload.enabled, signal)
				};
			}
			return badRequest();
		} catch (error) {
			ctx.logger.warn("awiki-model-proxy: loopback request failed");
			ctx.logger.warn(error);
			return internal(displayMessage(error));
		}
	};
}
function sameModelSelection(left, right) {
	return left.provider === right.provider && left.model === right.model && left.reasoningEffort === right.reasoningEffort;
}
function decodeTenantPreferences(value) {
	if (value === void 0) return {};
	try {
		const decoded = JSON.parse(value);
		if (!isRecord(decoded)) return {};
		const result = {};
		for (const [tenantId, candidate] of Object.entries(decoded)) {
			if (tenantId === "__proto__" || tenantId === "constructor" || !isRecord(candidate) || typeof candidate.enabled !== "boolean" || typeof candidate.previousProvider !== "string" || candidate.previousProvider.length === 0 || typeof candidate.previousModel !== "string" || candidate.previousModel.length === 0 || candidate.previousReasoningEffort !== void 0 && typeof candidate.previousReasoningEffort !== "string") continue;
			result[tenantId] = {
				enabled: candidate.enabled,
				previousProvider: candidate.previousProvider,
				previousModel: candidate.previousModel,
				...candidate.previousReasoningEffort === void 0 ? {} : { previousReasoningEffort: candidate.previousReasoningEffort }
			};
		}
		return result;
	} catch {
		return {};
	}
}
async function status(config, token, enabled, signal) {
	const [account, pendingRechargeOrder] = await Promise.all([authenticatedJson(config, token, "/api/account", { signal }), authenticatedJson(config, token, "/api/recharge/orders/pending", { signal })]);
	const decoded = decodeModelProxyStatus({
		enabled,
		account,
		pending_recharge_order: pendingRechargeOrder,
		recommended_model: FLASH,
		models: MODELS
	});
	if (decoded === void 0) throw new Error("invalid account response");
	return decoded;
}
async function authenticatedJson(config, token, path, init) {
	return (await authenticatedResponse(config, token, path, init)).json();
}
async function authenticatedResponse(config, token, path, init) {
	const send = async () => {
		const accessToken = await token.get();
		return {
			response: await fetch(new URL(path, config.baseURL), {
				...init,
				headers: {
					...headersRecord(init.headers),
					authorization: `Bearer ${accessToken}`
				}
			}),
			accessToken
		};
	};
	let result = await send();
	if (result.response.status === 401) {
		token.invalidate(result.accessToken);
		result = await send();
	}
	const { response } = result;
	if (!response.ok) throw await modelProxyError(response, `AWiki-hosted DeepSeek service returned HTTP ${response.status}`);
	return response;
}
async function modelProxyError(response, fallback) {
	let message = fallback;
	try {
		const body = await response.text();
		if (body !== "") try {
			const value = JSON.parse(body);
			if (isRecord(value) && isRecord(value.error) && typeof value.error.message === "string") message = value.error.message;
		} catch {
			message = body;
		}
	} catch {}
	return new LlmError(message, response.status === 401 || response.status === 403 ? "AUTH" : `HTTP_${response.status}`, { status: response.status });
}
function resolveTenantConfig(ctx, input) {
	const contextWindow = positiveInteger(input.contextWindow ?? 1e6, "contextWindow");
	const maxTokens = positiveInteger(input.maxTokens ?? 8192, "maxTokens");
	const skew = input.tokenRefreshSkewSeconds ?? 60;
	if (!Number.isSafeInteger(skew) || skew < 0) throw new Error("awiki-model-proxy: tokenRefreshSkewSeconds must be a non-negative integer");
	let published;
	try {
		published = ctx.awiki.getTenantCapabilities().modelProxyBaseUrl;
	} catch {}
	const raw = input.baseURL ?? published;
	if (raw === void 0) return void 0;
	const baseURL = new URL(raw);
	if (baseURL.username !== "" || baseURL.password !== "" || baseURL.search !== "" || baseURL.hash !== "") throw new Error("awiki-model-proxy: baseURL must not contain credentials, query, or fragment");
	if (baseURL.protocol !== "https:" && !(baseURL.protocol === "http:" && [
		"127.0.0.1",
		"localhost",
		"::1"
	].includes(baseURL.hostname))) throw new Error("awiki-model-proxy: baseURL must use HTTPS or loopback HTTP");
	return {
		baseURL,
		contextWindow,
		maxTokens,
		tokenRefreshSkewMs: skew * 1e3
	};
}
function positiveInteger(value, name) {
	if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`awiki-model-proxy: ${name} must be a positive integer`);
	return value;
}
function headersRecord(headers) {
	return Object.fromEntries(new Headers(headers));
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function displayMessage(error) {
	return error instanceof Error && error.message !== "" ? error.message : "AWiki-hosted DeepSeek service is unavailable.";
}
function badRequest() {
	return {
		ok: false,
		error: {
			code: "bad-request",
			message: "The AWiki-hosted DeepSeek request is invalid.",
			details: { issues: [] }
		}
	};
}
function modelUnavailable(message) {
	return {
		ok: false,
		error: {
			code: "model-unavailable",
			message,
			details: {
				provider: PROVIDER,
				model: FLASH
			}
		}
	};
}
function internal(message) {
	return {
		ok: false,
		error: {
			code: "internal",
			message,
			details: {}
		}
	};
}
//#endregion
export { Config, apply, inject, name };
