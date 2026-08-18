//#region lib/types/model-proxy-contract.js
/** Browser-safe contracts for the loopback AWiki-hosted DeepSeek proxy channel. */
const AWIKI_MODEL_PROXY_RPC_CHANNEL = "/awiki-model-proxy";
const AWIKI_MODEL_PROXY_RPC_ENDPOINTS = {
	status: "status",
	usage: "usage",
	setEnabled: "set-enabled",
	createRecharge: "create-recharge",
	rechargeStatus: "recharge-status"
};
function decodeModelProxyStatus(value) {
	if (!isRecord(value) || typeof value.enabled !== "boolean") return void 0;
	const account = decodeAccount(value.account);
	if (account === void 0) return void 0;
	if (value.recommended_model !== "deepseek-v4-flash" || !Array.isArray(value.models) || value.models.length !== 2 || value.models[0] !== "deepseek-v4-flash" || value.models[1] !== "deepseek-v4-pro") return void 0;
	return {
		enabled: value.enabled,
		account,
		recommended_model: "deepseek-v4-flash",
		models: ["deepseek-v4-flash", "deepseek-v4-pro"]
	};
}
function decodeModelProxyUsage(value) {
	if (!Array.isArray(value)) return void 0;
	const usage = value.map(decodeUsage);
	return usage.every((item) => item !== void 0) ? usage : void 0;
}
function decodeRechargeOrder(value) {
	if (!isRecord(value) || typeof value.out_trade_no !== "string" || !Number.isSafeInteger(value.amount_cents) || ![
		"pending",
		"paid",
		"closed"
	].includes(String(value.status)) || typeof value.provider !== "string" || typeof value.payment_method !== "string") return void 0;
	if (value.payment_action !== void 0 && (!isRecord(value.payment_action) || !["redirect_url", "qr_code"].includes(String(value.payment_action.type)) || typeof value.payment_action.data !== "string")) return void 0;
	const action = value.payment_action;
	return {
		out_trade_no: value.out_trade_no,
		amount_cents: value.amount_cents,
		status: value.status,
		provider: value.provider,
		payment_method: value.payment_method,
		...action === void 0 ? {} : { payment_action: {
			type: action.type,
			data: action.data
		} }
	};
}
function decodeAccount(value) {
	if (!(isRecord(value) && typeof value.did === "string" && Number.isSafeInteger(value.balance_cents) && typeof value.balance === "string" && value.currency === "CNY" && typeof value.model_access_available === "boolean" && ["strict", "development_bypass"].includes(String(value.billing_mode)) && typeof value.payments_available === "boolean")) return void 0;
	return {
		did: value.did,
		balance_cents: value.balance_cents,
		balance: value.balance,
		currency: "CNY",
		model_access_available: value.model_access_available,
		billing_mode: value.billing_mode,
		payments_available: value.payments_available
	};
}
function decodeUsage(value) {
	if (!(isRecord(value) && Number.isSafeInteger(value.id) && typeof value.endpoint === "string" && typeof value.model === "string" && Number.isSafeInteger(value.cache_hit_tokens) && Number.isSafeInteger(value.cache_miss_tokens) && Number.isSafeInteger(value.completion_tokens) && ["strict", "development_bypass"].includes(String(value.billing_mode)) && (value.calculated_cost_micros === null || Number.isSafeInteger(value.calculated_cost_micros)) && Number.isSafeInteger(value.charged_micros) && typeof value.estimated === "boolean" && typeof value.created_at === "string")) return void 0;
	return {
		id: value.id,
		endpoint: value.endpoint,
		model: value.model,
		cache_hit_tokens: value.cache_hit_tokens,
		cache_miss_tokens: value.cache_miss_tokens,
		completion_tokens: value.completion_tokens,
		billing_mode: value.billing_mode,
		calculated_cost_micros: value.calculated_cost_micros,
		charged_micros: value.charged_micros,
		estimated: value.estimated,
		created_at: value.created_at
	};
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
//#endregion
export { AWIKI_MODEL_PROXY_RPC_CHANNEL, AWIKI_MODEL_PROXY_RPC_ENDPOINTS, decodeModelProxyStatus, decodeModelProxyUsage, decodeRechargeOrder };
