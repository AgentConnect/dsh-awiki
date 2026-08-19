/** Browser-safe contracts for the loopback AWiki-hosted DeepSeek proxy channel. */

export const AWIKI_MODEL_PROXY_RPC_CHANNEL = '/awiki-model-proxy'

export const AWIKI_MODEL_PROXY_RPC_ENDPOINTS = {
  status: 'status',
  usage: 'usage',
  setEnabled: 'set-enabled',
  createRecharge: 'create-recharge',
  rechargeStatus: 'recharge-status',
  closeRecharge: 'close-recharge',
} as const

export interface AwikiModelProxyAccount {
  readonly did: string
  readonly balance_cents: number
  readonly balance: string
  readonly currency: 'CNY'
  readonly model_access_available: boolean
  readonly model_access_reason: string | null
  readonly billing_mode: 'strict' | 'development_bypass'
  readonly payments_available: boolean
}

export interface AwikiModelProxyUsage {
  readonly id: number
  readonly endpoint: string
  readonly model: string
  readonly cache_hit_tokens: number
  readonly cache_miss_tokens: number
  readonly completion_tokens: number
  readonly billing_mode: 'strict' | 'development_bypass'
  readonly calculated_cost_micros: number | null
  readonly charged_micros: number
  readonly estimated: boolean
  readonly created_at: string
}

export interface AwikiModelProxyStatus {
  readonly enabled: boolean
  readonly account: AwikiModelProxyAccount
  readonly pending_recharge_order: AwikiModelProxyRechargeOrder | null
  readonly recommended_model: 'deepseek-v4-flash'
  readonly models: readonly ['deepseek-v4-flash', 'deepseek-v4-pro']
}

export interface AwikiModelProxyPaymentAction {
  readonly type: 'redirect_url' | 'qr_code'
  readonly data: string
}

export interface AwikiModelProxyRechargeOrder {
  readonly out_trade_no: string
  readonly amount_cents: number
  readonly status: 'pending' | 'paid' | 'closed'
  readonly provider: string
  readonly payment_method: string
  readonly created_at: string
  readonly payment_action?: AwikiModelProxyPaymentAction
}

export interface AwikiModelProxyCloseRechargeResult {
  readonly closed: true
}

export function decodeModelProxyStatus(value: unknown): AwikiModelProxyStatus | undefined {
  if (!isRecord(value) || typeof value.enabled !== 'boolean') return undefined
  const account = decodeAccount(value.account)
  if (account === undefined) return undefined
  const pendingRechargeOrder = value.pending_recharge_order === null
    ? null
    : decodeRechargeOrder(value.pending_recharge_order)
  if (pendingRechargeOrder === undefined
    || (pendingRechargeOrder !== null && pendingRechargeOrder.status !== 'pending')) return undefined
  if (value.recommended_model !== 'deepseek-v4-flash'
    || !Array.isArray(value.models)
    || value.models.length !== 2
    || value.models[0] !== 'deepseek-v4-flash'
    || value.models[1] !== 'deepseek-v4-pro') return undefined
  return {
    enabled: value.enabled,
    account,
    pending_recharge_order: pendingRechargeOrder,
    recommended_model: 'deepseek-v4-flash',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  }
}

export function decodeModelProxyUsage(value: unknown): AwikiModelProxyUsage[] | undefined {
  if (!Array.isArray(value)) return undefined
  const usage = value.map(decodeUsage)
  return usage.every((item): item is AwikiModelProxyUsage => item !== undefined) ? usage : undefined
}

export function decodeRechargeOrder(value: unknown): AwikiModelProxyRechargeOrder | undefined {
  if (!isRecord(value)
    || typeof value.out_trade_no !== 'string'
    || !Number.isSafeInteger(value.amount_cents)
    || !['pending', 'paid', 'closed'].includes(String(value.status))
    || typeof value.provider !== 'string'
    || typeof value.payment_method !== 'string'
    || typeof value.created_at !== 'string') return undefined
  if (value.payment_action !== undefined
    && (!isRecord(value.payment_action)
      || !['redirect_url', 'qr_code'].includes(String(value.payment_action.type))
      || typeof value.payment_action.data !== 'string')) return undefined
  const action = value.payment_action as Record<string, unknown> | undefined
  return {
    out_trade_no: value.out_trade_no,
    amount_cents: value.amount_cents as number,
    status: value.status as AwikiModelProxyRechargeOrder['status'],
    provider: value.provider,
    payment_method: value.payment_method,
    created_at: value.created_at,
    ...action === undefined ? {} : {
      payment_action: {
        type: action.type as AwikiModelProxyPaymentAction['type'],
        data: action.data as string,
      },
    },
  }
}

export function decodeCloseRechargeResult(value: unknown): AwikiModelProxyCloseRechargeResult | undefined {
  return isRecord(value) && value.closed === true ? { closed: true } : undefined
}

function decodeAccount(value: unknown): AwikiModelProxyAccount | undefined {
  if (!(isRecord(value)
    && typeof value.did === 'string'
    && Number.isSafeInteger(value.balance_cents)
    && typeof value.balance === 'string'
    && value.currency === 'CNY'
    && typeof value.model_access_available === 'boolean'
    && (value.model_access_reason === null || typeof value.model_access_reason === 'string')
    && ['strict', 'development_bypass'].includes(String(value.billing_mode))
    && typeof value.payments_available === 'boolean')) return undefined
  return {
    did: value.did,
    balance_cents: value.balance_cents as number,
    balance: value.balance,
    currency: 'CNY',
    model_access_available: value.model_access_available,
    model_access_reason: value.model_access_reason,
    billing_mode: value.billing_mode as AwikiModelProxyAccount['billing_mode'],
    payments_available: value.payments_available,
  }
}

function decodeUsage(value: unknown): AwikiModelProxyUsage | undefined {
  if (!(isRecord(value)
    && Number.isSafeInteger(value.id)
    && typeof value.endpoint === 'string'
    && typeof value.model === 'string'
    && Number.isSafeInteger(value.cache_hit_tokens)
    && Number.isSafeInteger(value.cache_miss_tokens)
    && Number.isSafeInteger(value.completion_tokens)
    && ['strict', 'development_bypass'].includes(String(value.billing_mode))
    && (value.calculated_cost_micros === null || Number.isSafeInteger(value.calculated_cost_micros))
    && Number.isSafeInteger(value.charged_micros)
    && typeof value.estimated === 'boolean'
    && typeof value.created_at === 'string')) return undefined
  return {
    id: value.id as number,
    endpoint: value.endpoint,
    model: value.model,
    cache_hit_tokens: value.cache_hit_tokens as number,
    cache_miss_tokens: value.cache_miss_tokens as number,
    completion_tokens: value.completion_tokens as number,
    billing_mode: value.billing_mode as AwikiModelProxyUsage['billing_mode'],
    calculated_cost_micros: value.calculated_cost_micros as number | null,
    charged_micros: value.charged_micros as number,
    estimated: value.estimated,
    created_at: value.created_at,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
