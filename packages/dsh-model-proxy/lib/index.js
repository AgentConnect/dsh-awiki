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
//#region lib/types/package-version.generated.js
/** Generated from package.json by scripts/sync-package-versions.mjs. */
const DSH_AWIKI_MODEL_PROXY_PACKAGE_VERSION = "0.1.6";
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
const MODEL_IDENTITY_SYNC_MESSAGE = "AWiki is syncing this device's identity with the hosted model service. Please retry shortly.";
const MODEL_IDENTITY_AUTH_MESSAGE = "AWiki-hosted DeepSeek could not authorize this AWiki identity. Restore the identity or contact support.";
const MODEL_IDENTITY_SERVICE_MESSAGE = "The AWiki-hosted DeepSeek identity service is temporarily unavailable. Please retry.";
const MODEL_PROXY_FAILURE_CODES = {
	badRequest: "bad-request",
	modelUnavailable: "model-unavailable",
	internal: "internal"
};
const MODEL_PROXY_OUTCOME_CODES = {
	pendingRechargeOrder: "pending-recharge-order",
	rechargeAlreadyPaid: "recharge-already-paid"
};
const MODEL_PROXY_IDENTITY_REASONS = {
	signedOut: "awiki-identity-signed-out",
	syncPending: "awiki-identity-sync-pending",
	permanentAuth: "awiki-identity-permanent-auth",
	serviceUnavailable: "awiki-identity-service-unavailable"
};
const SettingsSchema = z.object({
	enabled: z.boolean().default(false),
	previousProvider: z.string(),
	previousModel: z.string(),
	previousReasoningEffort: z.string(),
	tenantPreferencesJson: z.string().default("{}")
});
const Config = z.object({
	contextWindow: z.number().step(1).min(1).default(1e6),
	maxTokens: z.number().step(1).min(1).default(8192),
	tokenRefreshSkewSeconds: z.number().step(1).min(0).default(60)
});
const IDENTITY_RECOVERY_RESPONSE_MAX_BYTES = 4096;
const IDENTITY_RECOVERY_OUTCOMES = /* @__PURE__ */ new Set([
	"restored",
	"already_current",
	"not_applicable"
]);
const STALE_DID_DOCUMENT_ERRORS = /* @__PURE__ */ new Set([
	"Verification method not found",
	"Verification method is not authorized for authentication",
	"verification_method_not_found",
	"verification_method_is_not_authorized"
]);
const TRANSIENT_DID_DOCUMENT_ERRORS = /* @__PURE__ */ new Set(["Failed to resolve DID document"]);
async function reconcileModelIdentity(ctx, config) {
	for (let attempt = 0; attempt < 2; attempt += 1) try {
		const response = await ctx.awiki.externalHttpAuth.dispatch(new Request(new URL("/api/identity-recovery", config.baseURL), {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: "{}"
		}), (request) => fetch(request));
		if (response.status >= 500) {
			if (attempt === 0) continue;
			return "service-unavailable";
		}
		if (!response.ok) {
			const error = await identityRecoveryError(response);
			if ((response.status === 401 || response.status === 403) && error !== void 0 && STALE_DID_DOCUMENT_ERRORS.has(error)) return "sync-pending";
			if (response.status === 401 && error !== void 0 && TRANSIENT_DID_DOCUMENT_ERRORS.has(error)) {
				if (attempt === 0) continue;
				return "service-unavailable";
			}
			return "permanent-auth";
		}
		return await acceptsIdentityRecoveryOutcome(response) ? "ready" : "permanent-auth";
	} catch {
		if (attempt === 0) continue;
		return "service-unavailable";
	}
	return "service-unavailable";
}
async function acceptsIdentityRecoveryOutcome(response) {
	const result = await boundedJsonObject(response);
	return result !== void 0 && Object.keys(result).length === 1 && typeof result.outcome === "string" && IDENTITY_RECOVERY_OUTCOMES.has(result.outcome);
}
async function identityRecoveryError(response) {
	const result = await boundedJsonObject(response);
	return typeof result?.error === "string" ? result.error : void 0;
}
async function boundedJsonObject(response) {
	const declaredLength = Number(response.headers.get("content-length"));
	if (Number.isFinite(declaredLength) && declaredLength > IDENTITY_RECOVERY_RESPONSE_MAX_BYTES) return void 0;
	const reader = response.body?.getReader();
	if (reader === void 0) return void 0;
	const chunks = [];
	let length = 0;
	while (true) {
		const { value, done } = await reader.read();
		if (done) break;
		length += value.byteLength;
		if (length > IDENTITY_RECOVERY_RESPONSE_MAX_BYTES) {
			await reader.cancel();
			return;
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
	} catch {
		return;
	}
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	return value;
}
function apply(ctx, input = {}) {
	if (!("awiki" in ctx) || ctx.awiki === void 0) throw new Error(AWIKI_PLUGIN_INSTALL_HINT);
	let config = resolveTenantConfig(ctx, input);
	const isVersionRestricted = () => {
		const status = ctx.awiki.getUpdatePolicyStatus();
		return status.restricted || status.modelProxyRestricted;
	};
	const currentConfig = () => isVersionRestricted() ? void 0 : config;
	const requireConfig = () => {
		const active = currentConfig();
		if (active === void 0) throw new LlmError("AWiki-hosted DeepSeek is not available for the active tenant.", "MODEL_UNAVAILABLE");
		return active;
	};
	const settings = ctx.settings.register(SETTINGS, SettingsSchema, {
		base: {
			enabled: false,
			tenantPreferencesJson: "{}"
		},
		applies: "live"
	});
	let currentTenantId = ctx.awiki.getTenantRegistryView().activeTenantId;
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
	let identityReady = false;
	let identityFailure = "sync-pending";
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
		if (settings.get().enabled && sessionStatus === "active" && currentConfig() !== void 0 && identityReady) {
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
		const generation = advanceIdentityGeneration();
		const nextDid = session.status === "active" ? session.identity?.did : void 0;
		identityDid = nextDid;
		identityReady = false;
		identityFailure = "sync-pending";
		sync();
		const recoveryConfig = config;
		if (nextDid === void 0 || recoveryConfig === void 0) {
			identityReconciliation = void 0;
			return;
		}
		const pending = reconcileModelIdentity(ctx, recoveryConfig).then((result) => {
			if (generation !== identityGeneration || identityDid !== nextDid || sessionStatus !== "active") return;
			identityReady = result === "ready";
			if (result !== "ready") identityFailure = result;
			sync();
		}).finally(() => {
			if (identityReconciliation === pending) identityReconciliation = void 0;
		});
		identityReconciliation = pending;
	};
	const refreshSession = (force = false) => {
		if (!force && sessionStatus !== void 0) return Promise.resolve(sessionStatus);
		const generation = identityGeneration;
		return sessionRefresh ??= ctx.awiki.getSession().then((result) => {
			if (!result.ok) return void 0;
			if (generation !== identityGeneration) return sessionStatus;
			publishSession(result.value);
			return result.value.status;
		}).finally(() => {
			sessionRefresh = void 0;
		});
	};
	const modelIdentityReady = async () => {
		if (await refreshSession(sessionStatus !== "active" || !identityReady && identityReconciliation === void 0) !== "active") return false;
		while (sessionStatus === "active") {
			const generation = identityGeneration;
			const pending = identityReconciliation;
			if (pending === void 0) return identityReady;
			await Promise.race([pending, identityGenerationChanged]);
			if (generation === identityGeneration) return identityReady;
		}
		return false;
	};
	const modelIdentityReadiness = async () => {
		if (await modelIdentityReady()) return "ready";
		return sessionStatus === "active" ? identityFailure : "signed-out";
	};
	sync();
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
	const bindActiveTenant = async (expectedSessionGeneration) => {
		const capabilities = await ctx.awiki.refreshTenantCapabilities();
		const updatePolicy = await ctx.awiki.refreshUpdatePolicy();
		const currentCapabilities = ctx.awiki.getTenantCapabilities();
		if (currentCapabilities.tenantId !== capabilities.tenantId || currentCapabilities.generation !== capabilities.generation) throw new Error("active AWiki tenant changed while model-proxy binding was in progress");
		currentTenantId = capabilities.tenantId;
		policyRestricted = updatePolicy.restricted || updatePolicy.modelProxyRestricted;
		await applyTenantPreference(currentTenantId);
		config = resolveTenantConfig(ctx, input);
		if (updatePolicy.restricted || updatePolicy.modelProxyRestricted) {
			token.clear();
			sync();
			await restoreNonAwikiSelection();
			return;
		}
		token.clear();
		const session = await ctx.awiki.getSession();
		if (expectedSessionGeneration !== identityGeneration) sync();
		else if (session.ok) publishSession(session.value);
		else {
			advanceIdentityGeneration();
			identityReady = false;
			identityDid = void 0;
			identityReconciliation = void 0;
			sessionStatus = void 0;
			sync();
		}
		if (config !== void 0 && settings.get().enabled && await modelIdentityReady()) await ctx.agentDefaultModel.saveSelection({
			provider: PROVIDER,
			model: FLASH
		});
	};
	let tenantLifecycle = Promise.resolve();
	const serializeTenantLifecycle = (operation) => {
		const result = tenantLifecycle.then(operation, operation);
		tenantLifecycle = result.then(() => void 0, () => void 0);
		return result;
	};
	let policyRestricted = isVersionRestricted();
	ctx.on("awiki/update-policy", (status) => {
		if (status.tenantId !== currentTenantId || ctx.awiki.getTenantRegistryView().switching) return;
		const restricted = status.restricted || status.modelProxyRestricted;
		const changed = policyRestricted !== restricted;
		policyRestricted = restricted;
		if (!changed) return;
		token.clear();
		sync();
		const expectedGeneration = identityGeneration;
		serializeTenantLifecycle(() => policyRestricted ? restoreNonAwikiSelection() : bindActiveTenant(expectedGeneration)).catch((error) => {
			ctx.logger.warn("awiki-model-proxy: update-policy reconciliation failed: %s", String(error));
		});
	});
	const releaseTenantLifecycle = ctx.awiki.registerTenantLifecycleParticipant({
		component: {
			product: "dsh-awiki-model-proxy",
			version: DSH_AWIKI_MODEL_PROXY_PACKAGE_VERSION
		},
		prepareSwitch: () => serializeTenantLifecycle(async () => {
			await persistCurrentTenantPreference();
			advanceIdentityGeneration();
			identityReady = false;
			identityDid = void 0;
			identityReconciliation = void 0;
			releaseAdapter();
			token.clear();
			config = void 0;
			sessionStatus = void 0;
			await restoreNonAwikiSelection();
		}),
		commitSwitch: () => {
			const expectedSessionGeneration = identityGeneration;
			return serializeTenantLifecycle(() => bindActiveTenant(expectedSessionGeneration));
		},
		rollbackSwitch: () => {
			const expectedSessionGeneration = identityGeneration;
			return serializeTenantLifecycle(() => bindActiveTenant(expectedSessionGeneration));
		}
	});
	let initialBindingFailed = false;
	let bindingRetry;
	const initialSessionGeneration = identityGeneration;
	serializeTenantLifecycle(() => bindActiveTenant(initialSessionGeneration)).catch((error) => {
		initialBindingFailed = true;
		ctx.logger.warn("awiki-model-proxy: initial tenant capability binding failed");
		ctx.logger.warn(error);
	});
	ctx.effect(() => () => {
		advanceIdentityGeneration();
		identityReady = false;
		identityDid = void 0;
		identityReconciliation = void 0;
		releaseTenantLifecycle();
		try {
			releaseAdapter();
		} catch (error) {
			ctx.logger.warn("awiki-model-proxy: failed to release adapter during unload");
			ctx.logger.warn(error);
		}
	}, "awiki-model-proxy: release adapter and token");
	const handler = createRpcHandler(ctx, currentConfig, token, () => settings.get(), sync, () => serializeTenantLifecycle(persistCurrentTenantPreference), () => serializeTenantLifecycle(modelIdentityReadiness));
	ctx.connection.rpc.handle(AWIKI_MODEL_PROXY_RPC_CHANNEL, async (endpoint, payload, signal) => {
		if (initialBindingFailed && !signal.aborted && !ctx.awiki.getTenantRegistryView().switching) {
			bindingRetry ??= serializeTenantLifecycle(async () => {
				await bindActiveTenant(identityGeneration);
				initialBindingFailed = false;
			}).catch(() => {}).finally(() => {
				bindingRetry = void 0;
			});
			await bindingRetry;
		}
		return handler(endpoint, payload, signal);
	}, { authority: "loopback" });
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
function createRpcHandler(ctx, currentConfig, token, currentSettings, sync, persistCurrentTenantPreference, identityReadiness) {
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
			const readiness = await identityReadiness();
			if (readiness === "signed-out") throw new LlmError("Sign in to AWiki before using AWiki-hosted DeepSeek.", MODEL_PROXY_IDENTITY_REASONS.signedOut);
			if (readiness === "sync-pending") throw new LlmError(MODEL_IDENTITY_SYNC_MESSAGE, MODEL_PROXY_IDENTITY_REASONS.syncPending);
			if (readiness === "permanent-auth") throw new LlmError(MODEL_IDENTITY_AUTH_MESSAGE, MODEL_PROXY_IDENTITY_REASONS.permanentAuth);
			if (readiness === "service-unavailable") throw new LlmError(MODEL_IDENTITY_SERVICE_MESSAGE, MODEL_PROXY_IDENTITY_REASONS.serviceUnavailable);
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
				let value;
				try {
					value = await authenticatedJson(config, token, "/api/recharge/orders", {
						method: "POST",
						headers: {
							"content-type": "application/json",
							"idempotency-key": globalThis.crypto.randomUUID()
						},
						body: JSON.stringify({ amount_cents: payload.amount_cents }),
						signal
					});
				} catch (error) {
					if (error instanceof LlmError && error.code === MODEL_PROXY_OUTCOME_CODES.pendingRechargeOrder) return {
						ok: true,
						value: { code: MODEL_PROXY_OUTCOME_CODES.pendingRechargeOrder }
					};
					throw error;
				}
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
				let response;
				try {
					response = await authenticatedResponse(config, token, `/api/recharge/orders/${encodeURIComponent(payload.out_trade_no)}/close`, {
						method: "POST",
						signal
					});
				} catch (error) {
					if (error instanceof LlmError && error.code === MODEL_PROXY_OUTCOME_CODES.rechargeAlreadyPaid) return {
						ok: true,
						value: { code: MODEL_PROXY_OUTCOME_CODES.rechargeAlreadyPaid }
					};
					throw error;
				}
				if (response.status !== 204) throw new Error("invalid recharge close response");
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
			return loopbackFailure(error);
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
async function modelProxyError(response, _fallback) {
	let upstreamCode;
	try {
		const body = await response.text();
		if (body !== "") try {
			const value = JSON.parse(body);
			if (isRecord(value) && isRecord(value.error) && typeof value.error.code === "string") upstreamCode = value.error.code;
			else if (isRecord(value) && typeof value.code === "string") upstreamCode = value.code;
			else if (typeof value === "string") upstreamCode = value;
		} catch {
			upstreamCode = body.trim();
		}
	} catch {}
	const code = upstreamCode === "pending_recharge_order_exists" ? MODEL_PROXY_OUTCOME_CODES.pendingRechargeOrder : upstreamCode === "recharge_order_already_paid" ? MODEL_PROXY_OUTCOME_CODES.rechargeAlreadyPaid : response.status === 401 || response.status === 403 ? "AUTH" : `HTTP_${response.status}`;
	const message = code === MODEL_PROXY_OUTCOME_CODES.pendingRechargeOrder ? "An existing recharge order must be completed first." : code === MODEL_PROXY_OUTCOME_CODES.rechargeAlreadyPaid ? "The recharge order is already paid." : response.status === 401 || response.status === 403 ? "AWiki-hosted DeepSeek authorization failed." : "The AWiki-hosted DeepSeek service is unavailable.";
	return new LlmError(message, code, { status: response.status });
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
	if (published === void 0) return void 0;
	const baseURL = new URL(published);
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
function loopbackFailure(error) {
	if (error instanceof LlmError) switch (error.code) {
		case MODEL_PROXY_IDENTITY_REASONS.signedOut: return internal("Sign in to AWiki before using AWiki-hosted DeepSeek.");
		case MODEL_PROXY_IDENTITY_REASONS.syncPending: return internal(MODEL_IDENTITY_SYNC_MESSAGE);
		case MODEL_PROXY_IDENTITY_REASONS.permanentAuth: return internal(MODEL_IDENTITY_AUTH_MESSAGE);
		case MODEL_PROXY_IDENTITY_REASONS.serviceUnavailable: return internal(MODEL_IDENTITY_SERVICE_MESSAGE);
	}
	return internal();
}
function badRequest() {
	return {
		ok: false,
		error: {
			code: MODEL_PROXY_FAILURE_CODES.badRequest,
			message: "The AWiki-hosted DeepSeek request is invalid.",
			details: { issues: [] }
		}
	};
}
function modelUnavailable(message) {
	return {
		ok: false,
		error: {
			code: MODEL_PROXY_FAILURE_CODES.modelUnavailable,
			message,
			details: {
				provider: PROVIDER,
				model: FLASH
			}
		}
	};
}
function internal(message = "The AWiki-hosted DeepSeek request could not be completed.") {
	return {
		ok: false,
		error: {
			code: MODEL_PROXY_FAILURE_CODES.internal,
			message,
			details: {}
		}
	};
}
//#endregion
export { Config, apply, inject, name };
