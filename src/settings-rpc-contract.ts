/** Client-safe contract for AWiki's plugin-owned settings transport. */

import { normalizeAwikiDomain } from './domain.ts'

/** Dedicated Connection channel; the Host registers it with loopback authority. */
export const AWIKI_SETTINGS_RPC_CHANNEL = '/awiki-settings'

/** Supported channel-relative operations. */
export const AWIKI_SETTINGS_RPC_ENDPOINTS = {
  describe: 'describe',
  setDomain: 'set-domain',
  resetDomain: 'reset-domain',
  describeTenants: 'describe-tenants',
  createTenant: 'create-tenant',
  renameTenant: 'rename-tenant',
  switchTenant: 'switch-tenant',
  archiveTenant: 'archive-tenant',
  describeUpdatePolicy: 'describe-update-policy',
  refreshUpdatePolicy: 'refresh-update-policy',
} as const

export interface AwikiUpdatePolicyRpcView {
  readonly tenantId: string
  readonly policyOrigin: string
  readonly tenantGeneration: number
  readonly currentPluginVersion: string
  readonly currentModelProxyVersion?: string
  readonly policyRevision?: number
  readonly recommendedPluginVersion?: string
  readonly minimumPluginVersion?: string
  readonly recommendedModelProxyVersion?: string
  readonly minimumModelProxyVersion?: string
  readonly releaseNotesUrl?: string
  readonly offline: boolean
  readonly usedCache: boolean
  readonly policyUnavailable: boolean
  readonly restricted: boolean
  readonly modelProxyRestricted: boolean
  readonly checkedAt?: string
}

export interface AwikiTenantRpcProfile {
  readonly tenantId: string
  readonly storageScopeId: string
  readonly kind: 'built_in' | 'custom'
  readonly displayName: string
  readonly displayNames?: Readonly<{ 'zh-CN': string; en: string }>
  readonly backendBaseUrl: string
  readonly didHost: string
  readonly lifecycle: 'active' | 'inactive' | 'archived'
  readonly storageLayout: 'scope-v1' | 'legacy-base' | 'domain-v1'
}

export interface AwikiTenantRpcView {
  readonly schemaVersion: number
  readonly officialCatalogVersion: number
  readonly generation: number
  readonly activeTenantId: string
  readonly tenants: readonly AwikiTenantRpcProfile[]
  readonly switching: boolean
  readonly diagnostic?: string
}

/** Minimal, secret-free settings view returned to the browser. */
export interface AwikiSettingsRpcView {
  readonly value: { readonly domain: string }
  readonly base?: { readonly domain?: string }
  readonly user?: { readonly domain?: string }
  readonly revision: number
  readonly writable: boolean
}

/** Optimistic revision carried by every browser write. */
export interface AwikiSettingsRevisionRequest {
  readonly expectedRevision: number
}

/** Domain write request. */
export interface AwikiSettingsSetDomainRequest extends AwikiSettingsRevisionRequest {
  readonly domain: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function decodeLayer(value: unknown): { domain?: string } | undefined {
  if (!isRecord(value)) return undefined
  if (!Object.hasOwn(value, 'domain')) return {}
  if (typeof value.domain !== 'string') return undefined
  try {
    const domain = normalizeAwikiDomain(value.domain)
    if (domain !== value.domain) return undefined
    return { domain }
  } catch {
    return undefined
  }
}

/** Fail closed when the Host response is not exactly usable by the settings UI. */
export function decodeAwikiSettingsRpcView(value: unknown): AwikiSettingsRpcView | undefined {
  if (!isRecord(value)
    || !isRecord(value.value)
    || typeof value.value.domain !== 'string'
    || !Number.isSafeInteger(value.revision)
    || (value.revision as number) < 0
    || typeof value.writable !== 'boolean') return undefined
  let domain: string
  try {
    domain = normalizeAwikiDomain(value.value.domain)
  } catch {
    return undefined
  }
  if (domain !== value.value.domain) return undefined
  const base = value.base === undefined ? undefined : decodeLayer(value.base)
  const user = value.user === undefined ? undefined : decodeLayer(value.user)
  if ((value.base !== undefined && base === undefined)
    || (value.user !== undefined && user === undefined)) return undefined
  return {
    value: { domain },
    ...base === undefined ? {} : { base },
    ...user === undefined ? {} : { user },
    revision: value.revision as number,
    writable: value.writable,
  }
}

function decodeTenant(value: unknown): AwikiTenantRpcProfile | undefined {
  const displayNames = value !== null && isRecord(value) && value.displayNames !== undefined
    && isRecord(value.displayNames)
    && typeof value.displayNames['zh-CN'] === 'string' && value.displayNames['zh-CN'].length > 0
    && typeof value.displayNames.en === 'string' && value.displayNames.en.length > 0
    ? { 'zh-CN': value.displayNames['zh-CN'], en: value.displayNames.en }
    : undefined
  if (!isRecord(value)
    || typeof value.tenantId !== 'string' || value.tenantId.length === 0
    || typeof value.storageScopeId !== 'string' || value.storageScopeId.length === 0
    || (value.kind !== 'built_in' && value.kind !== 'custom')
    || typeof value.displayName !== 'string' || value.displayName.length === 0
    || typeof value.backendBaseUrl !== 'string'
    || typeof value.didHost !== 'string'
    || (value.lifecycle !== 'active' && value.lifecycle !== 'inactive' && value.lifecycle !== 'archived')
    || (value.storageLayout !== 'scope-v1' && value.storageLayout !== 'legacy-base' && value.storageLayout !== 'domain-v1')
    || (value.displayNames !== undefined && displayNames === undefined)) {
    return undefined
  }
  return {
    tenantId: value.tenantId,
    storageScopeId: value.storageScopeId,
    kind: value.kind,
    displayName: value.displayName,
    ...displayNames === undefined ? {} : { displayNames },
    backendBaseUrl: value.backendBaseUrl,
    didHost: value.didHost,
    lifecycle: value.lifecycle,
    storageLayout: value.storageLayout,
  }
}

/** Decode the secret-free Host tenant catalog and its switch state. */
export function decodeAwikiTenantRpcView(value: unknown): AwikiTenantRpcView | undefined {
  if (!isRecord(value)
    || !Number.isSafeInteger(value.schemaVersion) || (value.schemaVersion as number) < 1
    || !Number.isSafeInteger(value.officialCatalogVersion) || (value.officialCatalogVersion as number) < 1
    || !Number.isSafeInteger(value.generation) || (value.generation as number) < 0
    || typeof value.activeTenantId !== 'string'
    || !Array.isArray(value.tenants)
    || typeof value.switching !== 'boolean'
    || (value.diagnostic !== undefined && typeof value.diagnostic !== 'string')) return undefined
  const tenants = value.tenants.map(decodeTenant)
  if (tenants.some(tenant => tenant === undefined)) return undefined
  const decoded = tenants as AwikiTenantRpcProfile[]
  if (decoded.filter(tenant => tenant.lifecycle === 'active').length !== 1
    || !decoded.some(tenant => tenant.tenantId === value.activeTenantId && tenant.lifecycle === 'active')) return undefined
  return {
    schemaVersion: value.schemaVersion as number,
    officialCatalogVersion: value.officialCatalogVersion as number,
    generation: value.generation as number,
    activeTenantId: value.activeTenantId,
    tenants: decoded,
    switching: value.switching,
    ...value.diagnostic === undefined ? {} : { diagnostic: value.diagnostic },
  }
}

/** Decode the browser-safe subset of the Host's tenant update status. */
export function decodeAwikiUpdatePolicyRpcView(value: unknown): AwikiUpdatePolicyRpcView | undefined {
  if (!isRecord(value)
    || typeof value.tenantId !== 'string' || value.tenantId.length === 0
    || typeof value.policyOrigin !== 'string' || !value.policyOrigin.startsWith('http')
    || !Number.isSafeInteger(value.tenantGeneration) || (value.tenantGeneration as number) < 0
    || typeof value.currentPluginVersion !== 'string'
    || typeof value.offline !== 'boolean'
    || typeof value.usedCache !== 'boolean'
    || typeof value.policyUnavailable !== 'boolean'
    || typeof value.restricted !== 'boolean'
    || typeof value.modelProxyRestricted !== 'boolean') return undefined
  for (const key of [
    'currentModelProxyVersion',
    'recommendedPluginVersion',
    'minimumPluginVersion',
    'recommendedModelProxyVersion',
    'minimumModelProxyVersion',
    'releaseNotesUrl',
    'checkedAt',
  ] as const) {
    if (value[key] !== undefined && typeof value[key] !== 'string') return undefined
  }
  if (value.policyRevision !== undefined
    && (!Number.isSafeInteger(value.policyRevision) || (value.policyRevision as number) < 1)) return undefined
  return value as unknown as AwikiUpdatePolicyRpcView
}
