/** Host-only AWiki-authenticated model-proxy provider and loopback account API. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@awiki/dsh-plugin'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import { getOrCreateAnonymousUserId } from '@deepseek-ai/dsh-anonymous-user-id'
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import { LlmError } from '@deepseek-ai/dsh-llm'
import type { AdapterRegistrationHandle, DirectoryRegistrationHandle } from '@deepseek-ai/dsh-llm'
import { DeepSeekAdapter, resolveAdapterOptions } from '@deepseek-ai/dsh-llm-deepseek'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import type {
  AwikiModelProxyStatus,
  AwikiModelProxyUsage,
} from '@awiki/dsh-plugin/model-proxy-contract'
import type { AwikiSession } from '@awiki/dsh-plugin/types'
import {
  AWIKI_PLUGIN_INSTALL_HINT,
  rethrowAwikiPluginDependencyError,
} from './dependency-error.ts'

const {
  AWIKI_MODEL_PROXY_RPC_CHANNEL,
  AWIKI_MODEL_PROXY_RPC_ENDPOINTS,
  decodeModelProxyStatus,
  decodeModelProxyUsage,
  decodeRechargeOrder,
} = await import('@awiki/dsh-plugin/model-proxy-contract').catch((error: unknown) => {
  rethrowAwikiPluginDependencyError(error)
})

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
  readonly tenantPreferencesJson?: string
}

const SettingsSchema: z<ModelProxySettings> = z.object({
  enabled: z.boolean().default(false),
  previousProvider: z.string(),
  previousModel: z.string(),
  previousReasoningEffort: z.string(),
  tenantPreferencesJson: z.string().default('{}'),
})

interface TenantModelPreference {
  readonly enabled: boolean
  readonly previousProvider: string
  readonly previousModel: string
  readonly previousReasoningEffort?: string
}

export interface Config {
  readonly baseURL?: string
  readonly contextWindow?: number
  readonly maxTokens?: number
  readonly tokenRefreshSkewSeconds?: number
}

export const Config: z<Config> = z.object({
  baseURL: z.string(),
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
    throw new Error(AWIKI_PLUGIN_INSTALL_HINT)
  }
  const initialConfig = resolveTenantConfig(ctx, input)
  let config = input.baseURL === undefined ? undefined : initialConfig
  let releaseRecoveryTarget: (() => void) | undefined
  const currentConfig = (): ResolvedConfig | undefined => config
  const requireConfig = (): ResolvedConfig => {
    if (config === undefined) throw new LlmError('AWiki-hosted DeepSeek is not available for the active tenant.', 'MODEL_UNAVAILABLE')
    return config
  }
  const bindRecoveryTarget = (): void => {
    releaseRecoveryTarget?.()
    releaseRecoveryTarget = config === undefined
      ? undefined
      : ctx.awiki.registerRecoveryReconciliationTarget({
          kind: 'model-proxy-v1',
          baseURL: config.baseURL.toString(),
        })
  }
  bindRecoveryTarget()
  const settings = ctx.settings.register(SETTINGS, SettingsSchema, {
    base: { enabled: false, tenantPreferencesJson: '{}' },
    applies: 'live',
  })
  let currentTenantId = ctx.awiki.getTenantCapabilities().tenantId
  const token = new ModelProxyToken(ctx, requireConfig)
  const adapter = new AwikiHostedDeepSeekAdapter({
    options: () => {
      const active = requireConfig()
      return resolveAdapterOptions({
      baseURL: new URL('/v1', active.baseURL).toString().replace(/\/$/, ''),
      apiKeyEnv: 'AWIKI_MODEL_PROXY_TOKEN',
      maxTokens: active.maxTokens,
      defaultContextWindow: active.contextWindow,
      models: [
        { id: FLASH, name: 'DeepSeek V4 Flash', contextWindow: active.contextWindow, maxTokens: active.maxTokens },
        { id: PRO, name: 'DeepSeek V4 Pro', contextWindow: active.contextWindow, maxTokens: active.maxTokens },
      ],
      streamIdleTimeoutMs: 300_000,
    })
    },
    resolveApiKey: () => token.get(),
    resolveUserId: () => getOrCreateAnonymousUserId(),
  })
  let route: AdapterRegistrationHandle | undefined
  let directory: DirectoryRegistrationHandle | undefined
  let sessionStatus: AwikiSession['status'] | undefined
  let sessionRefresh: Promise<AwikiSession['status'] | undefined> | undefined

  const registerAdapter = (): void => {
    let nextDirectory: DirectoryRegistrationHandle | undefined
    let nextRoute: AdapterRegistrationHandle | undefined
    try {
      nextDirectory = ctx.llm.registerConfigurableProviders([{
        provider: PROVIDER,
        displayName: PROVIDER_NAME,
        settingsNs: SETTINGS,
        settingsPath: [],
      }])
      nextRoute = ctx.llm.registerAdapter([PROVIDER], adapter)
    } catch (error) {
      for (const [label, dispose] of [
        ['adapter', nextRoute],
        ['directory', nextDirectory],
      ] as const) {
        try {
          dispose?.()
        } catch (rollbackError) {
          ctx.logger.warn(`awiki-model-proxy: failed to roll back ${label} registration`)
          ctx.logger.warn(rollbackError)
        }
      }
      throw error
    }
    directory = nextDirectory
    route = nextRoute
  }
  const releaseAdapter = (): void => {
    token.clear()
    const failures: unknown[] = []
    if (route !== undefined) {
      try {
        route()
        route = undefined
      } catch (error) {
        failures.push(error)
      }
    }
    if (directory !== undefined) {
      try {
        directory()
        directory = undefined
      } catch (error) {
        failures.push(error)
      }
    }
    if (failures.length === 1) throw failures[0]
    if (failures.length > 1) throw new AggregateError(failures, 'failed to release AWiki model adapter')
  }
  const sync = (): void => {
    const enabled = settings.get().enabled
    if (enabled && sessionStatus === 'active' && config !== undefined) {
      if (route === undefined && directory === undefined) {
        registerAdapter()
      } else if (directory === undefined) {
        directory = ctx.llm.registerConfigurableProviders([{
          provider: PROVIDER,
          displayName: PROVIDER_NAME,
          settingsNs: SETTINGS,
          settingsPath: [],
        }])
      } else if (route === undefined) {
        route = ctx.llm.registerAdapter([PROVIDER], adapter)
      }
    } else if (route !== undefined || directory !== undefined) {
      releaseAdapter()
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
  const restoreNonAwikiSelection = async (): Promise<void> => {
    const current = ctx.agentDefaultModel.currentSelection()
    if (current.provider !== PROVIDER) return
    const saved = settings.get()
    await ctx.agentDefaultModel.saveSelection({
      provider: saved.previousProvider ?? 'deepseek-official',
      model: saved.previousModel ?? FLASH,
      ...saved.previousReasoningEffort === undefined
        ? {}
        : { reasoningEffort: saved.previousReasoningEffort as never },
    })
  }
  const persistCurrentTenantPreference = async (): Promise<void> => {
    const saved = settings.get()
    const preferences = decodeTenantPreferences(saved.tenantPreferencesJson)
    preferences[currentTenantId] = {
      enabled: saved.enabled,
      previousProvider: saved.previousProvider ?? 'deepseek-official',
      previousModel: saved.previousModel ?? FLASH,
      ...saved.previousReasoningEffort === undefined
        ? {}
        : { previousReasoningEffort: saved.previousReasoningEffort },
    }
    await ctx.settings.update(SETTINGS, { tenantPreferencesJson: JSON.stringify(preferences) })
  }
  const applyTenantPreference = async (tenantId: string): Promise<void> => {
    const saved = settings.get()
    const preference = decodeTenantPreferences(saved.tenantPreferencesJson)[tenantId]
    const selection = ctx.agentDefaultModel.currentSelection()
    await ctx.settings.update(SETTINGS, preference === undefined
      ? {
          enabled: false,
          previousProvider: selection.provider === PROVIDER ? 'deepseek-official' : selection.provider,
          previousModel: selection.provider === PROVIDER ? FLASH : selection.model,
          ...selection.provider === PROVIDER || selection.reasoningEffort === undefined
            ? {}
            : { previousReasoningEffort: String(selection.reasoningEffort) },
        }
      : {
          enabled: preference.enabled,
          previousProvider: preference.previousProvider,
          previousModel: preference.previousModel,
          ...preference.previousReasoningEffort === undefined
            ? {}
            : { previousReasoningEffort: preference.previousReasoningEffort },
        })
  }
  const bindActiveTenant = async (): Promise<void> => {
    const capabilities = await ctx.awiki.refreshTenantCapabilities()
    currentTenantId = capabilities.tenantId
    await applyTenantPreference(currentTenantId)
    config = resolveTenantConfig(ctx, input)
    bindRecoveryTarget()
    token.clear()
    const session = await ctx.awiki.getSession()
    sessionStatus = session.ok ? session.value.status : undefined
    sync()
    if (config !== undefined && settings.get().enabled && sessionStatus === 'active') {
      await ctx.agentDefaultModel.saveSelection({ provider: PROVIDER, model: FLASH })
    }
  }
  const releaseTenantLifecycle = ctx.awiki.registerTenantLifecycleParticipant({
    prepareSwitch: async () => {
      await persistCurrentTenantPreference()
      releaseAdapter()
      releaseRecoveryTarget?.()
      releaseRecoveryTarget = undefined
      token.clear()
      config = undefined
      sessionStatus = undefined
      await restoreNonAwikiSelection()
    },
    commitSwitch: bindActiveTenant,
    rollbackSwitch: bindActiveTenant,
  })
  if (input.baseURL === undefined) {
    void bindActiveTenant().catch((error: unknown) => {
      ctx.logger.warn('awiki-model-proxy: initial tenant capability binding failed')
      ctx.logger.warn(error)
    })
  }
  ctx.effect(() => () => {
    releaseTenantLifecycle()
    releaseRecoveryTarget?.()
    releaseRecoveryTarget = undefined
    try {
      releaseAdapter()
    } catch (error) {
      ctx.logger.warn('awiki-model-proxy: failed to release adapter during unload')
      ctx.logger.warn(error)
    }
  }, 'awiki-model-proxy: release adapter and token')

  const handler = createRpcHandler(
    ctx,
    currentConfig,
    token,
    () => settings.get(),
    sync,
    persistCurrentTenantPreference,
    async () => (await refreshSession()) === 'active',
  )
  ctx.connection.rpc.handle(AWIKI_MODEL_PROXY_RPC_CHANNEL, handler, { authority: 'loopback' })
}

class ModelProxyToken {
  private value: string | undefined
  private expiresAt = 0
  private pending: Promise<string> | undefined
  private generation = 0

  constructor(private readonly ctx: Context, private readonly currentConfig: () => ResolvedConfig) {}

  get(): Promise<string> {
    const config = this.currentConfig()
    if (this.value !== undefined && Date.now() < this.expiresAt - config.tokenRefreshSkewMs) {
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
    const config = this.currentConfig()
    const response = await this.ctx.awiki.externalHttpAuth.dispatch(
      new Request(new URL('/api/token', config.baseURL), { method: 'POST' }),
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
  currentConfig: () => ResolvedConfig | undefined,
  token: ModelProxyToken,
  currentSettings: () => ModelProxySettings,
  sync: () => void,
  persistCurrentTenantPreference: () => Promise<void>,
  sessionActive: () => Promise<boolean>,
): ConnectionRpcHandler {
  const restoreState = async (
    previousSettings: ModelProxySettings,
    previousSelection: ReturnType<typeof ctx.agentDefaultModel.currentSelection>,
  ): Promise<void> => {
    const failures: unknown[] = []
    try {
      await ctx.settings.update(SETTINGS, {
        enabled: previousSettings.enabled,
        tenantPreferencesJson: previousSettings.tenantPreferencesJson ?? '{}',
        ...previousSettings.previousProvider === undefined
          ? {}
          : { previousProvider: previousSettings.previousProvider },
        ...previousSettings.previousModel === undefined
          ? {}
          : { previousModel: previousSettings.previousModel },
        ...previousSettings.previousReasoningEffort === undefined
          ? {}
          : { previousReasoningEffort: previousSettings.previousReasoningEffort },
      })
    } catch (error) {
      failures.push(error)
    }
    try {
      sync()
    } catch (error) {
      failures.push(error)
    }
    try {
      const currentSelection = ctx.agentDefaultModel.currentSelection()
      if (!sameModelSelection(currentSelection, previousSelection)) {
        await ctx.agentDefaultModel.saveSelection(previousSelection)
      }
    } catch (error) {
      failures.push(error)
    }
    if (failures.length > 0) {
      ctx.logger.warn('awiki-model-proxy: failed to fully restore model state')
      for (const error of failures) ctx.logger.warn(error)
    }
  }
  const updateEnabledState = async (enabled: boolean): Promise<void> => {
    const previousSettings = currentSettings()
    const previousSelection = ctx.agentDefaultModel.currentSelection()
    try {
      if (enabled === previousSettings.enabled) {
        sync()
        if (enabled && previousSelection.provider !== PROVIDER) {
          await ctx.agentDefaultModel.saveSelection({ provider: PROVIDER, model: FLASH })
        }
        await persistCurrentTenantPreference()
        return
      }
      if (enabled) {
        await ctx.settings.update(SETTINGS, {
          enabled: true,
          previousProvider: previousSelection.provider,
          previousModel: previousSelection.model,
          ...previousSelection.reasoningEffort === undefined
            ? {}
            : { previousReasoningEffort: String(previousSelection.reasoningEffort) },
        })
        sync()
        await ctx.agentDefaultModel.saveSelection({ provider: PROVIDER, model: FLASH })
        await persistCurrentTenantPreference()
      } else {
        if (previousSelection.provider === PROVIDER) {
          await ctx.agentDefaultModel.saveSelection({
            provider: previousSettings.previousProvider ?? 'deepseek-official',
            model: previousSettings.previousModel ?? FLASH,
            ...previousSettings.previousReasoningEffort === undefined
              ? {}
              : { reasoningEffort: previousSettings.previousReasoningEffort as never },
          })
        }
        await ctx.settings.update(SETTINGS, { enabled: false })
        sync()
        await persistCurrentTenantPreference()
      }
    } catch (error) {
      await restoreState(previousSettings, previousSelection)
      throw error
    }
  }
  return async (endpoint, payload, signal) => {
    try {
      if (signal.aborted) throw new Error('request cancelled')
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.capability) {
        return { ok: true, value: { available: currentConfig() !== undefined, protocol: 1 } }
      }
      const config = currentConfig()
      if (config === undefined) return modelUnavailable('AWiki-hosted DeepSeek is not available for the active tenant.')
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
        }
        await updateEnabledState(payload.enabled)
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

function sameModelSelection(
  left: { readonly provider: string; readonly model: string; readonly reasoningEffort?: unknown },
  right: { readonly provider: string; readonly model: string; readonly reasoningEffort?: unknown },
): boolean {
  return left.provider === right.provider
    && left.model === right.model
    && left.reasoningEffort === right.reasoningEffort
}

function decodeTenantPreferences(value: string | undefined): Record<string, TenantModelPreference> {
  if (value === undefined) return {}
  try {
    const decoded: unknown = JSON.parse(value)
    if (!isRecord(decoded)) return {}
    const result: Record<string, TenantModelPreference> = {}
    for (const [tenantId, candidate] of Object.entries(decoded)) {
      if (tenantId === '__proto__' || tenantId === 'constructor' || !isRecord(candidate)
        || typeof candidate.enabled !== 'boolean'
        || typeof candidate.previousProvider !== 'string' || candidate.previousProvider.length === 0
        || typeof candidate.previousModel !== 'string' || candidate.previousModel.length === 0
        || (candidate.previousReasoningEffort !== undefined
          && typeof candidate.previousReasoningEffort !== 'string')) continue
      result[tenantId] = {
        enabled: candidate.enabled,
        previousProvider: candidate.previousProvider,
        previousModel: candidate.previousModel,
        ...candidate.previousReasoningEffort === undefined
          ? {}
          : { previousReasoningEffort: candidate.previousReasoningEffort },
      }
    }
    return result
  } catch {
    return {}
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

function resolveTenantConfig(ctx: Context, input: Config): ResolvedConfig | undefined {
  const contextWindow = positiveInteger(input.contextWindow ?? 1_000_000, 'contextWindow')
  const maxTokens = positiveInteger(input.maxTokens ?? 8_192, 'maxTokens')
  const skew = input.tokenRefreshSkewSeconds ?? 60
  if (!Number.isSafeInteger(skew) || skew < 0) {
    throw new Error('awiki-model-proxy: tokenRefreshSkewSeconds must be a non-negative integer')
  }
  let published: string | undefined
  try { published = ctx.awiki.getTenantCapabilities().modelProxyBaseUrl } catch {}
  const raw = input.baseURL ?? published
  if (raw === undefined) return undefined
  const baseURL = new URL(raw)
  if (baseURL.username !== '' || baseURL.password !== '' || baseURL.search !== '' || baseURL.hash !== '') {
    throw new Error('awiki-model-proxy: baseURL must not contain credentials, query, or fragment')
  }
  if (baseURL.protocol !== 'https:'
    && !(baseURL.protocol === 'http:' && ['127.0.0.1', 'localhost', '::1'].includes(baseURL.hostname))) {
    throw new Error('awiki-model-proxy: baseURL must use HTTPS or loopback HTTP')
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
