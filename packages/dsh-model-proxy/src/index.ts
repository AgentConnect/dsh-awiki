/** Host-only AWiki-authenticated model-proxy provider and loopback account API. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@awiki/dsh-plugin'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import { getOrCreateAnonymousUserId } from '@deepseek-ai/dsh-anonymous-user-id'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import { LlmError, resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import type { AdapterRegistrationHandle, DirectoryRegistrationHandle } from '@deepseek-ai/dsh-llm'
import { DeepSeekAdapter } from '@deepseek-ai/dsh-llm-deepseek'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  AWIKI_MODEL_PROXY_RPC_CHANNEL,
  AWIKI_MODEL_PROXY_RPC_ENDPOINTS,
  decodeModelProxyStatus,
  decodeModelProxyUsage,
  decodeRechargeOrder,
  type AwikiModelProxyStatus,
  type AwikiModelProxyUsage,
} from '@awiki/dsh-plugin/model-proxy-contract'
import type { AwikiSession } from '@awiki/dsh-plugin/types'

export const name = 'awiki-model-proxy'
export const inject = ['llm', 'settings', 'agentDefaultModel', 'connection']

const SETTINGS = settingsNamespace('awiki-model-proxy')
const PROVIDER = 'awiki-deepseek'
const FLASH = 'deepseek-v4-flash'
const PRO = 'deepseek-v4-pro'
const MODELS = [FLASH, PRO] as const
const PROVIDER_NAME = 'AWiki-hosted DeepSeek'

interface ModelProxySettings {
  readonly enabled: boolean
  readonly previousProvider?: string
  readonly previousModel?: string
  readonly previousReasoningEffort?: string
}

const SettingsSchema: z<ModelProxySettings> = z.object({
  enabled: z.boolean().default(false),
  previousProvider: z.string(),
  previousModel: z.string(),
  previousReasoningEffort: z.string(),
})

export interface Config {
  readonly baseURL?: string
  readonly contextWindow?: number
  readonly maxTokens?: number
  readonly tokenRefreshSkewSeconds?: number
}

export const Config: z<Config> = z.object({
  baseURL: z.string().default('https://model.awiki.info'),
  contextWindow: z.number().step(1).min(1).default(1_000_000),
  maxTokens: z.number().step(1).min(1).default(8_192),
  tokenRefreshSkewSeconds: z.number().step(1).min(0).default(60),
})

interface ResolvedConfig {
  readonly baseURL: URL
  readonly contextWindow: number
  readonly maxTokens: number
  readonly tokenRefreshSkewMs: number
}

interface TokenResponse {
  readonly access_token: string
  readonly expires_in: number
}

export function apply(ctx: Context, input: Config = {}): void {
  if (!('awiki' in ctx) || ctx.awiki === undefined) {
    throw new Error('@awiki/dsh-model-proxy requires the @awiki/dsh-plugin Host service')
  }
  const config = resolveConfig(input)
  const settings = ctx.settings.register(SETTINGS, SettingsSchema, {
    base: { enabled: false },
    applies: 'live',
  })
  const token = new ModelProxyToken(ctx, config)
  const adapter = new AwikiHostedDeepSeekAdapter({
    options: () => ({
      baseURL: new URL('/v1', config.baseURL).toString().replace(/\/$/, ''),
      apiKeyEnv: credentialRef('AWIKI_MODEL_PROXY_TOKEN'),
      defaults: {},
      maxTokens: config.maxTokens,
      defaultContextWindow: config.contextWindow,
      models: [
        { id: FLASH, name: 'DeepSeek V4 Flash', contextWindow: config.contextWindow, maxTokens: config.maxTokens },
        { id: PRO, name: 'DeepSeek V4 Pro', contextWindow: config.contextWindow, maxTokens: config.maxTokens },
      ],
      streamIdleTimeoutMs: 300_000,
      retryPolicy: resolveRetryPolicy(undefined, 'awiki-model-proxy: retryPolicy'),
    }),
    resolveApiKey: () => token.get(),
    resolveUserId: () => getOrCreateAnonymousUserId(),
  })
  let route: AdapterRegistrationHandle | undefined
  let directory: DirectoryRegistrationHandle | undefined
  let sessionStatus: AwikiSession['status'] | undefined
  let sessionRefresh: Promise<AwikiSession['status'] | undefined> | undefined

  const sync = (): void => {
    const enabled = settings.get().enabled
    if (enabled && sessionStatus === 'active' && route === undefined) {
      directory = ctx.llm.registerConfigurableProviders([{
        provider: PROVIDER,
        displayName: PROVIDER_NAME,
        settingsNs: SETTINGS,
        settingsPath: [],
      }])
      route = ctx.llm.registerAdapter([PROVIDER], adapter)
    } else if ((!enabled || sessionStatus !== 'active') && route !== undefined) {
      route()
      directory?.()
      route = undefined
      directory = undefined
      token.clear()
    }
  }
  const publishSession = (session: AwikiSession): void => {
    sessionStatus = session.status
    token.clear()
    sync()
  }
  const refreshSession = (): Promise<AwikiSession['status'] | undefined> => {
    if (sessionStatus !== undefined) return Promise.resolve(sessionStatus)
    return sessionRefresh ??= ctx.awiki.getSession().then((result) => {
      if (!result.ok) return undefined
      publishSession(result.value)
      return result.value.status
    }).finally(() => { sessionRefresh = undefined })
  }
  sync()
  void refreshSession()
  ctx.on('awiki/session', (session) => { publishSession(session) })
  ctx.on('settings/updated', (namespace) => {
    if (namespace === SETTINGS) sync()
  })
  ctx.effect(() => () => {
    route?.()
    directory?.()
    token.clear()
  }, 'awiki-model-proxy: release adapter and token')

  const handler = createRpcHandler(
    ctx,
    config,
    token,
    () => settings.get(),
    sync,
    async () => (await refreshSession()) === 'active',
  )
  ctx.connection.rpc.handle(AWIKI_MODEL_PROXY_RPC_CHANNEL, handler, { authority: 'loopback' })
}

class ModelProxyToken {
  private value: string | undefined
  private expiresAt = 0
  private pending: Promise<string> | undefined
  private generation = 0

  constructor(private readonly ctx: Context, private readonly config: ResolvedConfig) {}

  get(): Promise<string> {
    if (this.value !== undefined && Date.now() < this.expiresAt - this.config.tokenRefreshSkewMs) {
      return Promise.resolve(this.value)
    }
    if (this.pending !== undefined) return this.pending
    const generation = this.generation
    const pending = this.refresh(generation).finally(() => {
      if (this.pending === pending) this.pending = undefined
    })
    this.pending = pending
    return pending
  }

  clear(): void {
    this.generation += 1
    this.value = undefined
    this.expiresAt = 0
    this.pending = undefined
  }

  invalidate(value: string): void {
    if (this.value === value) this.clear()
  }

  private async refresh(generation: number): Promise<string> {
    const response = await this.ctx.awiki.externalHttpAuth.dispatch(
      new Request(new URL('/api/token', this.config.baseURL), { method: 'POST' }),
      request => fetch(request),
    )
    if (!response.ok) throw await modelProxyError(response, 'AWiki-hosted DeepSeek authentication failed')
    const value: unknown = await response.json()
    if (!isRecord(value)
      || typeof value.access_token !== 'string'
      || value.access_token.length === 0
      || !Number.isSafeInteger(value.expires_in)
      || (value.expires_in as number) <= 0) {
      throw new LlmError('AWiki-hosted DeepSeek authentication returned an invalid response', 'AUTH')
    }
    const token = value as unknown as TokenResponse
    if (generation !== this.generation) {
      throw new LlmError('AWiki-hosted DeepSeek authentication state changed', 'AUTH')
    }
    this.value = token.access_token
    this.expiresAt = Date.now() + token.expires_in * 1_000
    return token.access_token
  }
}

class AwikiHostedDeepSeekAdapter extends DeepSeekAdapter {
  override providerInfo(provider: string) {
    return { id: provider, name: PROVIDER_NAME }
  }
}

function createRpcHandler(
  ctx: Context,
  config: ResolvedConfig,
  token: ModelProxyToken,
  currentSettings: () => ModelProxySettings,
  sync: () => void,
  sessionActive: () => Promise<boolean>,
): ConnectionRpcHandler {
  return async (endpoint, payload, signal) => {
    try {
      if (signal.aborted) throw new Error('request cancelled')
      if (!await sessionActive()) throw new LlmError('Sign in to AWiki before using AWiki-hosted DeepSeek.', 'AUTH')
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status) {
        return { ok: true, value: await status(config, token, currentSettings().enabled, signal) }
      }
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.usage) {
        const value = await authenticatedJson(config, token, '/api/usage', { signal })
        const usage = decodeModelProxyUsage(value)
        if (usage === undefined) throw new Error('invalid usage response')
        return { ok: true, value: usage }
      }
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.createRecharge) {
        if (!isRecord(payload) || !Number.isSafeInteger(payload.amount_cents)) return badRequest()
        const value = await authenticatedJson(config, token, '/api/recharge/orders', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': globalThis.crypto.randomUUID(),
          },
          body: JSON.stringify({ amount_cents: payload.amount_cents }),
          signal,
        })
        const order = decodeRechargeOrder(value)
        if (order === undefined || order.payment_action === undefined) throw new Error('invalid recharge response')
        return { ok: true, value: order }
      }
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.rechargeStatus) {
        if (!isRecord(payload) || typeof payload.out_trade_no !== 'string') return badRequest()
        const value = await authenticatedJson(
          config,
          token,
          `/api/recharge/orders/${encodeURIComponent(payload.out_trade_no)}`,
          { signal },
        )
        const order = decodeRechargeOrder(value)
        if (order === undefined) throw new Error('invalid recharge status response')
        return { ok: true, value: order }
      }
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.closeRecharge) {
        if (!isRecord(payload) || typeof payload.out_trade_no !== 'string') return badRequest()
        const response = await authenticatedResponse(
          config,
          token,
          `/api/recharge/orders/${encodeURIComponent(payload.out_trade_no)}/close`,
          { method: 'POST', signal },
        )
        if (response.status !== 204) throw new Error('invalid recharge close response')
        return { ok: true, value: { closed: true } }
      }
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled) {
        if (!isRecord(payload) || typeof payload.enabled !== 'boolean') return badRequest()
        if (payload.enabled) {
          const current = await status(config, token, false, signal)
          if (!current.account.model_access_available) {
            return modelUnavailable('Account balance is required before enabling AWiki-hosted DeepSeek.')
          }
          const previous = ctx.agentDefaultModel.currentSelection()
          await ctx.settings.update(SETTINGS, {
            enabled: true,
            previousProvider: previous.provider,
            previousModel: previous.model,
            ...previous.reasoningEffort === undefined
              ? {}
              : { previousReasoningEffort: String(previous.reasoningEffort) },
          })
          sync()
          await ctx.agentDefaultModel.saveSelection({ provider: PROVIDER, model: FLASH })
        } else {
          const stored = currentSettings()
          await ctx.settings.update(SETTINGS, { enabled: false })
          sync()
          const selected = ctx.agentDefaultModel.currentSelection()
          if (selected.provider === PROVIDER) {
            await ctx.agentDefaultModel.saveSelection({
              provider: stored.previousProvider ?? 'deepseek-official',
              model: stored.previousModel ?? FLASH,
              ...stored.previousReasoningEffort === undefined
                ? {}
                : { reasoningEffort: stored.previousReasoningEffort as never },
            })
          }
        }
        return { ok: true, value: await status(config, token, payload.enabled, signal) }
      }
      return badRequest()
    } catch (error) {
      ctx.logger.warn('awiki-model-proxy: loopback request failed')
      ctx.logger.warn(error)
      return internal(displayMessage(error))
    }
  }
}

async function status(
  config: ResolvedConfig,
  token: ModelProxyToken,
  enabled: boolean,
  signal: AbortSignal,
): Promise<AwikiModelProxyStatus> {
  const [account, pendingRechargeOrder] = await Promise.all([
    authenticatedJson(config, token, '/api/account', { signal }),
    authenticatedJson(config, token, '/api/recharge/orders/pending', { signal }),
  ])
  const value = {
    enabled,
    account,
    pending_recharge_order: pendingRechargeOrder,
    recommended_model: FLASH,
    models: MODELS,
  }
  const decoded = decodeModelProxyStatus(value)
  if (decoded === undefined) throw new Error('invalid account response')
  return decoded
}

async function authenticatedJson(
  config: ResolvedConfig,
  token: ModelProxyToken,
  path: string,
  init: RequestInit,
): Promise<unknown> {
  const response = await authenticatedResponse(config, token, path, init)
  return response.json()
}

async function authenticatedResponse(
  config: ResolvedConfig,
  token: ModelProxyToken,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const send = async (): Promise<{ readonly response: Response; readonly accessToken: string }> => {
    const accessToken = await token.get()
    const response = await fetch(new URL(path, config.baseURL), {
      ...init,
      headers: { ...headersRecord(init.headers), authorization: `Bearer ${accessToken}` },
    })
    return { response, accessToken }
  }
  let result = await send()
  if (result.response.status === 401) {
    token.invalidate(result.accessToken)
    result = await send()
  }
  const { response } = result
  if (!response.ok) throw await modelProxyError(response, `AWiki-hosted DeepSeek service returned HTTP ${response.status}`)
  return response
}

async function modelProxyError(response: Response, fallback: string): Promise<LlmError> {
  let message = fallback
  try {
    const body = await response.text()
    if (body !== '') {
      try {
        const value: unknown = JSON.parse(body)
        if (isRecord(value) && isRecord(value.error) && typeof value.error.message === 'string') {
          message = value.error.message
        }
      } catch {
        message = body
      }
    }
  } catch {}
  return new LlmError(message, response.status === 401 || response.status === 403 ? 'AUTH' : `HTTP_${response.status}`, {
    status: response.status,
  })
}

function resolveConfig(input: Config): ResolvedConfig {
  const baseURL = new URL(input.baseURL ?? 'https://model.awiki.info')
  if (baseURL.username !== '' || baseURL.password !== '' || baseURL.search !== '' || baseURL.hash !== '') {
    throw new Error('awiki-model-proxy: baseURL must not contain credentials, query, or fragment')
  }
  if (baseURL.protocol !== 'https:'
    && !(baseURL.protocol === 'http:' && ['127.0.0.1', 'localhost', '::1'].includes(baseURL.hostname))) {
    throw new Error('awiki-model-proxy: baseURL must use HTTPS or loopback HTTP')
  }
  const contextWindow = positiveInteger(input.contextWindow ?? 1_000_000, 'contextWindow')
  const maxTokens = positiveInteger(input.maxTokens ?? 8_192, 'maxTokens')
  const skew = input.tokenRefreshSkewSeconds ?? 60
  if (!Number.isSafeInteger(skew) || skew < 0) {
    throw new Error('awiki-model-proxy: tokenRefreshSkewSeconds must be a non-negative integer')
  }
  return { baseURL, contextWindow, maxTokens, tokenRefreshSkewMs: skew * 1_000 }
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`awiki-model-proxy: ${name} must be a positive integer`)
  return value
}

function headersRecord(headers: HeadersInit | undefined): Record<string, string> {
  return Object.fromEntries(new Headers(headers))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function displayMessage(error: unknown): string {
  return error instanceof Error && error.message !== '' ? error.message : 'AWiki-hosted DeepSeek service is unavailable.'
}

function badRequest() {
  return {
    ok: false as const,
    error: { code: 'bad-request' as const, message: 'The AWiki-hosted DeepSeek request is invalid.', details: { issues: [] } },
  }
}

function modelUnavailable(message: string) {
  return {
    ok: false as const,
    error: { code: 'model-unavailable' as const, message, details: { provider: PROVIDER, model: FLASH } },
  }
}

function internal(message: string) {
  return { ok: false as const, error: { code: 'internal' as const, message, details: {} } }
}
