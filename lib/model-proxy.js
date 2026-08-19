import { AWIKI_MODEL_PROXY_RPC_CHANNEL, AWIKI_MODEL_PROXY_RPC_ENDPOINTS, decodeModelProxyStatus, decodeModelProxyUsage, decodeRechargeOrder } from "./model-proxy-contract.js";
import z from "@deepseek-ai/schemastery";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import { LlmError, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { getOrCreateAnonymousUserId } from "@deepseek-ai/dsh-anonymous-user-id";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { DeepSeekAdapter } from "@deepseek-ai/dsh-llm-deepseek";
//#region lib/types/model-proxy.js
/** Host-only AWiki-authenticated model-proxy provider and loopback account API. */
const name = "awiki-model-proxy";
const inject = [
	"awiki",
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
	previousReasoningEffort: z.string()
});
const Config = z.object({
	baseURL: z.string().default("https://model.awiki.info"),
	contextWindow: z.number().step(1).min(1).default(1e6),
	maxTokens: z.number().step(1).min(1).default(8192),
	tokenRefreshSkewSeconds: z.number().step(1).min(0).default(60)
});
function apply(ctx, input = {}) {
	const config = resolveConfig(input);
	const settings = ctx.settings.register(SETTINGS, SettingsSchema, {
		base: { enabled: false },
		applies: "live"
	});
	const token = new ModelProxyToken(ctx, config);
	const adapter = new AwikiHostedDeepSeekAdapter({
		options: () => ({
			baseURL: new URL("/v1", config.baseURL).toString().replace(/\/$/, ""),
			apiKeyEnv: credentialRef("AWIKI_MODEL_PROXY_TOKEN"),
			defaults: {},
			maxTokens: config.maxTokens,
			defaultContextWindow: config.contextWindow,
			models: [{
				id: FLASH,
				name: "DeepSeek V4 Flash",
				contextWindow: config.contextWindow,
				maxTokens: config.maxTokens
			}, {
				id: PRO,
				name: "DeepSeek V4 Pro",
				contextWindow: config.contextWindow,
				maxTokens: config.maxTokens
			}],
			streamIdleTimeoutMs: 3e5,
			retryPolicy: resolveRetryPolicy(void 0, "awiki-model-proxy: retryPolicy")
		}),
		resolveApiKey: () => token.get(),
		resolveUserId: () => getOrCreateAnonymousUserId()
	});
	let route;
	let directory;
	let sessionStatus;
	let sessionRefresh;
	const sync = () => {
		const enabled = settings.get().enabled;
		if (enabled && sessionStatus === "active" && route === void 0) {
			directory = ctx.llm.registerConfigurableProviders([{
				provider: PROVIDER,
				displayName: PROVIDER_NAME,
				settingsNs: SETTINGS,
				settingsPath: []
			}]);
			route = ctx.llm.registerAdapter([PROVIDER], adapter);
		} else if ((!enabled || sessionStatus !== "active") && route !== void 0) {
			route();
			directory?.();
			route = void 0;
			directory = void 0;
			token.clear();
		}
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
	ctx.effect(() => () => {
		route?.();
		directory?.();
		token.clear();
	}, "awiki-model-proxy: release adapter and token");
	const handler = createRpcHandler(ctx, config, token, () => settings.get(), sync, async () => await refreshSession() === "active");
	ctx.connection.rpc.handle(AWIKI_MODEL_PROXY_RPC_CHANNEL, handler, { authority: "loopback" });
}
var ModelProxyToken = class {
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
		if (this.value !== void 0 && Date.now() < this.expiresAt - this.config.tokenRefreshSkewMs) return Promise.resolve(this.value);
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
		const response = await this.ctx.awiki.externalHttpAuth.dispatch(new Request(new URL("/api/token", this.config.baseURL), { method: "POST" }), (request) => fetch(request));
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
function createRpcHandler(ctx, config, token, currentSettings, sync, sessionActive) {
	return async (endpoint, payload, signal) => {
		try {
			if (signal.aborted) throw new Error("request cancelled");
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
					const previous = ctx.agentDefaultModel.currentSelection();
					await ctx.settings.update(SETTINGS, {
						enabled: true,
						previousProvider: previous.provider,
						previousModel: previous.model,
						...previous.reasoningEffort === void 0 ? {} : { previousReasoningEffort: String(previous.reasoningEffort) }
					});
					sync();
					await ctx.agentDefaultModel.saveSelection({
						provider: PROVIDER,
						model: FLASH
					});
				} else {
					const stored = currentSettings();
					await ctx.settings.update(SETTINGS, { enabled: false });
					sync();
					if (ctx.agentDefaultModel.currentSelection().provider === PROVIDER) await ctx.agentDefaultModel.saveSelection({
						provider: stored.previousProvider ?? "deepseek-official",
						model: stored.previousModel ?? FLASH,
						...stored.previousReasoningEffort === void 0 ? {} : { reasoningEffort: stored.previousReasoningEffort }
					});
				}
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
function resolveConfig(input) {
	const baseURL = new URL(input.baseURL ?? "https://model.awiki.info");
	if (baseURL.username !== "" || baseURL.password !== "" || baseURL.search !== "" || baseURL.hash !== "") throw new Error("awiki-model-proxy: baseURL must not contain credentials, query, or fragment");
	if (baseURL.protocol !== "https:" && !(baseURL.protocol === "http:" && [
		"127.0.0.1",
		"localhost",
		"::1"
	].includes(baseURL.hostname))) throw new Error("awiki-model-proxy: baseURL must use HTTPS or loopback HTTP");
	const contextWindow = positiveInteger(input.contextWindow ?? 1e6, "contextWindow");
	const maxTokens = positiveInteger(input.maxTokens ?? 8192, "maxTokens");
	const skew = input.tokenRefreshSkewSeconds ?? 60;
	if (!Number.isSafeInteger(skew) || skew < 0) throw new Error("awiki-model-proxy: tokenRefreshSkewSeconds must be a non-negative integer");
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
