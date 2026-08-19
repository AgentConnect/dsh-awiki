/** Browser-safe contracts for the loopback AWiki-hosted DeepSeek proxy channel. */
export declare const AWIKI_MODEL_PROXY_RPC_CHANNEL = "/awiki-model-proxy";
export declare const AWIKI_MODEL_PROXY_RPC_ENDPOINTS: {
    readonly status: "status";
    readonly usage: "usage";
    readonly setEnabled: "set-enabled";
    readonly createRecharge: "create-recharge";
    readonly rechargeStatus: "recharge-status";
    readonly closeRecharge: "close-recharge";
};
export interface AwikiModelProxyAccount {
    readonly did: string;
    readonly balance_cents: number;
    readonly balance: string;
    readonly currency: 'CNY';
    readonly model_access_available: boolean;
    readonly model_access_reason: string | null;
    readonly billing_mode: 'strict' | 'development_bypass';
    readonly payments_available: boolean;
}
export interface AwikiModelProxyUsage {
    readonly id: number;
    readonly endpoint: string;
    readonly model: string;
    readonly cache_hit_tokens: number;
    readonly cache_miss_tokens: number;
    readonly completion_tokens: number;
    readonly billing_mode: 'strict' | 'development_bypass';
    readonly calculated_cost_micros: number | null;
    readonly charged_micros: number;
    readonly estimated: boolean;
    readonly created_at: string;
}
export interface AwikiModelProxyStatus {
    readonly enabled: boolean;
    readonly account: AwikiModelProxyAccount;
    readonly pending_recharge_order: AwikiModelProxyRechargeOrder | null;
    readonly recommended_model: 'deepseek-v4-flash';
    readonly models: readonly ['deepseek-v4-flash', 'deepseek-v4-pro'];
}
export interface AwikiModelProxyPaymentAction {
    readonly type: 'redirect_url' | 'qr_code';
    readonly data: string;
}
export interface AwikiModelProxyRechargeOrder {
    readonly out_trade_no: string;
    readonly amount_cents: number;
    readonly status: 'pending' | 'paid' | 'closed';
    readonly provider: string;
    readonly payment_method: string;
    readonly created_at: string;
    readonly payment_action?: AwikiModelProxyPaymentAction;
}
export interface AwikiModelProxyCloseRechargeResult {
    readonly closed: true;
}
export declare function decodeModelProxyStatus(value: unknown): AwikiModelProxyStatus | undefined;
export declare function decodeModelProxyUsage(value: unknown): AwikiModelProxyUsage[] | undefined;
export declare function decodeRechargeOrder(value: unknown): AwikiModelProxyRechargeOrder | undefined;
export declare function decodeCloseRechargeResult(value: unknown): AwikiModelProxyCloseRechargeResult | undefined;
//# sourceMappingURL=model-proxy-contract.d.ts.map