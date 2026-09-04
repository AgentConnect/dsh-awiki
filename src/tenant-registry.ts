/** Host-owned durable AWiki tenant catalog and storage-scope migration. */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { randomUUID } from 'node:crypto'
import { basename, dirname, join } from 'node:path'
import { AWIKI_BUILTIN_TENANT_CONFIG, type AwikiBuiltinTenantSlot } from './builtin-tenant-config.ts'
import { normalizeAwikiDomain } from './domain.ts'

export const AWIKI_TENANT_REGISTRY_SCHEMA_VERSION = 1
export const AWIKI_OFFICIAL_CATALOG_VERSION = 2
export const AWIKI_PRIMARY_TENANT_ID = 'builtin-primary'
export const AWIKI_SECONDARY_TENANT_ID = 'builtin-secondary'
/** Compatibility aliases for existing callers; the persisted IDs are generic slots. */
export const AWIKI_CHINA_TENANT_ID = AWIKI_PRIMARY_TENANT_ID
export const AWIKI_GLOBAL_TENANT_ID = AWIKI_SECONDARY_TENANT_ID

export type AwikiTenantKind = 'built_in' | 'custom'
export type AwikiTenantLifecycle = 'active' | 'inactive' | 'archived'
export type AwikiTenantStorageLayout = 'scope-v1' | 'legacy-base' | 'domain-v1'

export interface AwikiTenantEndpoints {
  readonly userServiceUrl: string
  readonly messageServiceUrl: string
  readonly mailServiceUrl: string
  readonly messageServicePublicUrl: string
  readonly messageServiceDid: string
}

export interface AwikiTenantProfile {
  readonly tenantId: string
  readonly storageScopeId: string
  readonly kind: AwikiTenantKind
  readonly displayName: string
  readonly backendBaseUrl: string
  readonly didHost: string
  readonly lifecycle: AwikiTenantLifecycle
  readonly storageLayout: AwikiTenantStorageLayout
  readonly endpoints: AwikiTenantEndpoints
}

export interface AwikiTenantRegistryDocument {
  readonly schemaVersion: typeof AWIKI_TENANT_REGISTRY_SCHEMA_VERSION
  readonly officialCatalogVersion: typeof AWIKI_OFFICIAL_CATALOG_VERSION
  readonly generation: number
  readonly activeTenantId: string
  readonly tenants: readonly AwikiTenantProfile[]
}

export interface AwikiTenantRegistryView {
  readonly schemaVersion: number
  readonly officialCatalogVersion: number
  readonly generation: number
  readonly activeTenantId: string
  readonly tenants: readonly AwikiTenantProfile[]
  readonly switching: boolean
  readonly diagnostic?: string
}

export interface AwikiTenantLegacySeed extends AwikiTenantEndpoints {
  readonly domain: string
  /** Treat this deployment configuration as an existing environment even when its directory is empty. */
  readonly configured: boolean
  /** Optional one-time classification for a pre-registry data root. */
  readonly legacyTenantSlot?: AwikiBuiltinTenantSlot
}

interface OfficialEntry {
  readonly slot: AwikiBuiltinTenantSlot
  readonly tenantId: string
  readonly legacyTenantId: string
  readonly storageScopeId: string
  readonly displayName: string
  readonly backendOrigin: string
  readonly didHost: string
}

const OFFICIALS: readonly OfficialEntry[] = (['primary', 'secondary'] as const).map(slot => {
  const configured = AWIKI_BUILTIN_TENANT_CONFIG.tenants[slot]
  return {
    slot,
    tenantId: slot === 'primary' ? AWIKI_PRIMARY_TENANT_ID : AWIKI_SECONDARY_TENANT_ID,
    legacyTenantId: slot === 'primary' ? 'official-china' : 'official-global',
    storageScopeId: `builtin-${slot}-v1`,
    displayName: configured.displayName['zh-CN'],
    backendOrigin: configured.backendOrigin,
    didHost: configured.didHost,
  }
})

/** Immutable snapshot of the DSH endpoint defaults shipped before tenant registries existed. */
const PRE_REGISTRY_DEFAULT_DOMAIN = 'awiki.info'
const PRE_REGISTRY_DEFAULT_ENDPOINTS = endpointsForOrigin(
  `https://${PRE_REGISTRY_DEFAULT_DOMAIN}`,
  PRE_REGISTRY_DEFAULT_DOMAIN,
)

function registryFilePath(baseStateRoot: string): string {
  return join(dirname(baseStateRoot), `${basename(baseStateRoot)}.tenant-registry.json`)
}

function endpointsForOrigin(origin: string, domain: string): AwikiTenantEndpoints {
  return {
    userServiceUrl: origin,
    messageServiceUrl: origin,
    mailServiceUrl: origin,
    messageServicePublicUrl: origin,
    messageServiceDid: `did:wba:${domain}`,
  }
}

function officialProfile(entry: typeof OFFICIALS[number]): AwikiTenantProfile {
  return {
    tenantId: entry.tenantId,
    storageScopeId: entry.storageScopeId,
    kind: 'built_in',
    displayName: entry.displayName,
    backendBaseUrl: entry.backendOrigin,
    didHost: entry.didHost,
    lifecycle: 'inactive',
    storageLayout: 'scope-v1',
    endpoints: endpointsForOrigin(entry.backendOrigin, entry.didHost),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function decodeEndpoints(value: unknown): AwikiTenantEndpoints | undefined {
  if (!isRecord(value)) return undefined
  const userServiceUrl = safeString(value.userServiceUrl)
  const messageServiceUrl = safeString(value.messageServiceUrl)
  const mailServiceUrl = safeString(value.mailServiceUrl)
  const messageServicePublicUrl = safeString(value.messageServicePublicUrl)
  const messageServiceDid = safeString(value.messageServiceDid)
  if (userServiceUrl === undefined || messageServiceUrl === undefined || mailServiceUrl === undefined
    || messageServicePublicUrl === undefined || messageServiceDid === undefined) return undefined
  return { userServiceUrl, messageServiceUrl, mailServiceUrl, messageServicePublicUrl, messageServiceDid }
}

function decodeTenant(value: unknown): AwikiTenantProfile | undefined {
  if (!isRecord(value)) return undefined
  const tenantId = safeString(value.tenantId)
  const storageScopeId = safeString(value.storageScopeId)
  const displayName = safeString(value.displayName)
  const backendBaseUrl = safeString(value.backendBaseUrl)
  const didHost = safeString(value.didHost)
  const endpoints = decodeEndpoints(value.endpoints)
  if (tenantId === undefined || storageScopeId === undefined || displayName === undefined
    || backendBaseUrl === undefined || didHost === undefined || endpoints === undefined
    || (value.kind !== 'built_in' && value.kind !== 'custom')
    || (value.lifecycle !== 'active' && value.lifecycle !== 'inactive' && value.lifecycle !== 'archived')
    || (value.storageLayout !== 'scope-v1' && value.storageLayout !== 'legacy-base' && value.storageLayout !== 'domain-v1')) {
    return undefined
  }
  return {
    tenantId,
    storageScopeId,
    kind: value.kind,
    displayName,
    backendBaseUrl,
    didHost,
    lifecycle: value.lifecycle,
    storageLayout: value.storageLayout,
    endpoints,
  }
}

function decodeDocument(value: unknown): AwikiTenantRegistryDocument | undefined {
  if (!isRecord(value)
    || value.schemaVersion !== AWIKI_TENANT_REGISTRY_SCHEMA_VERSION
    || !Number.isSafeInteger(value.officialCatalogVersion)
    || (value.officialCatalogVersion as number) < 1
    || (value.officialCatalogVersion as number) > AWIKI_OFFICIAL_CATALOG_VERSION
    || !Number.isSafeInteger(value.generation) || (value.generation as number) < 0
    || typeof value.activeTenantId !== 'string' || !Array.isArray(value.tenants)) return undefined
  const tenants = value.tenants.map(decodeTenant)
  if (tenants.some(tenant => tenant === undefined)) return undefined
  const complete = tenants as AwikiTenantProfile[]
  if (new Set(complete.map(tenant => tenant.tenantId)).size !== complete.length
    || new Set(complete.map(tenant => tenant.storageScopeId)).size !== complete.length
    || !complete.some(tenant => tenant.tenantId === value.activeTenantId && tenant.lifecycle === 'active')
    || complete.filter(tenant => tenant.lifecycle === 'active').length !== 1) return undefined
  return {
    schemaVersion: AWIKI_TENANT_REGISTRY_SCHEMA_VERSION,
    officialCatalogVersion: AWIKI_OFFICIAL_CATALOG_VERSION,
    generation: value.generation as number,
    activeTenantId: value.activeTenantId,
    tenants: complete,
  }
}

function directoryHasData(path: string): boolean {
  try {
    return statSync(path).isDirectory() && readdirSync(path).length > 0
  } catch {
    return false
  }
}

function sameOfficialEndpoint(tenant: AwikiTenantProfile, entry: OfficialEntry): boolean {
  const origin = entry.backendOrigin
  return tenant.didHost === entry.didHost
    || tenant.backendBaseUrl.replace(/\/$/u, '') === origin
    || tenant.endpoints.userServiceUrl.replace(/\/$/u, '') === origin
}

function preservedTenantId(tenants: readonly AwikiTenantProfile[], tenant: AwikiTenantProfile): string {
  const base = `custom-${tenant.storageScopeId}`
  if (!tenants.some(candidate => candidate.tenantId === base)) return base
  let suffix = 2
  while (tenants.some(candidate => candidate.tenantId === `${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

function activate(document: AwikiTenantRegistryDocument, tenantId: string, generation: number): AwikiTenantRegistryDocument {
  return {
    ...document,
    generation,
    activeTenantId: tenantId,
    tenants: document.tenants.map(tenant => ({
      ...tenant,
      lifecycle: tenant.tenantId === tenantId ? 'active' : tenant.lifecycle === 'active' ? 'inactive' : tenant.lifecycle,
    })),
  }
}

function reconcileOfficials(document: AwikiTenantRegistryDocument): AwikiTenantRegistryDocument {
  const tenants = [...document.tenants]
  let activeTenantId = document.activeTenantId
  for (const entry of OFFICIALS) {
    let exactIndex = tenants.findIndex(tenant => tenant.tenantId === entry.tenantId)
    if (exactIndex >= 0) {
      const current = tenants[exactIndex]!
      if (sameOfficialEndpoint(current, entry)) {
        tenants[exactIndex] = {
          ...officialProfile(entry),
          storageScopeId: current.storageScopeId,
          storageLayout: current.storageLayout,
          lifecycle: current.lifecycle,
        }
        continue
      }
      const preservedId = preservedTenantId(tenants, current)
      tenants[exactIndex] = { ...current, tenantId: preservedId, kind: 'custom' }
      if (activeTenantId === current.tenantId) activeTenantId = preservedId
      exactIndex = -1
    }
    const legacyIndex = tenants.findIndex(tenant => tenant.tenantId === entry.legacyTenantId)
    if (legacyIndex >= 0) {
      const current = tenants[legacyIndex]!
      if (sameOfficialEndpoint(current, entry)) {
        tenants[legacyIndex] = {
          ...officialProfile(entry),
          storageScopeId: current.storageScopeId,
          storageLayout: current.storageLayout,
          lifecycle: current.lifecycle,
        }
        if (activeTenantId === current.tenantId) activeTenantId = entry.tenantId
        continue
      }
      tenants[legacyIndex] = { ...current, kind: 'custom' }
    }
    const endpointIndex = tenants.findIndex(tenant => sameOfficialEndpoint(tenant, entry))
    if (endpointIndex >= 0) {
      const current = tenants[endpointIndex]!
      tenants[endpointIndex] = {
        ...officialProfile(entry),
        storageScopeId: current.storageScopeId,
        storageLayout: current.storageLayout,
        lifecycle: current.lifecycle,
      }
      if (activeTenantId === current.tenantId) activeTenantId = entry.tenantId
    } else {
      tenants.push(officialProfile(entry))
    }
  }
  return activate({
    ...document,
    officialCatalogVersion: AWIKI_OFFICIAL_CATALOG_VERSION,
    activeTenantId,
    tenants,
  }, activeTenantId, document.generation)
}

function cloneDocument(document: AwikiTenantRegistryDocument): AwikiTenantRegistryDocument {
  return structuredClone(document)
}

/** Durable registry. All mutations are synchronous, backup-aware, and atomic. */
export class AwikiTenantRegistry {
  readonly filePath: string
  readonly backupPath: string
  readonly diagnosticPath: string
  private document: AwikiTenantRegistryDocument
  private readonly persistent: boolean

  private constructor(
    readonly baseStateRoot: string,
    document: AwikiTenantRegistryDocument,
    persistent: boolean,
  ) {
    this.filePath = registryFilePath(baseStateRoot)
    this.backupPath = `${this.filePath}.pre-v1.bak`
    this.diagnosticPath = `${this.filePath}.migration-error.txt`
    this.document = document
    this.persistent = persistent
  }

  static open(baseStateRoot: string, seed: AwikiTenantLegacySeed): AwikiTenantRegistry {
    const filePath = registryFilePath(baseStateRoot)
    if (existsSync(filePath)) {
      try {
        const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'))
        const decoded = decodeDocument(parsed)
        if (decoded === undefined) throw new Error('registry schema or invariants are invalid')
        const registry = new AwikiTenantRegistry(baseStateRoot, reconcileOfficials(decoded), true)
        if (JSON.stringify(decoded) !== JSON.stringify(registry.document)) registry.persist(true)
        return registry
      } catch (error) {
        const diagnostic = `AWiki tenant registry was not migrated: ${error instanceof Error ? error.message : 'unknown error'}\n`
        mkdirSync(dirname(filePath), { recursive: true })
        writeFileSync(`${filePath}.migration-error.txt`, diagnostic, { encoding: 'utf8', mode: 0o600 })
        return new AwikiTenantRegistry(baseStateRoot, legacyDocument(seed, !seed.configured), false)
      }
    }

    const hasLegacyData = directoryHasData(baseStateRoot)
    const useLegacy = seed.configured || hasLegacyData
    const document = useLegacy
      ? legacyDocument(seed, hasLegacyData && !seed.configured)
      : freshDocument()
    const registry = new AwikiTenantRegistry(baseStateRoot, document, true)
    registry.persist(false)
    return registry
  }

  snapshot(switching = false): AwikiTenantRegistryView {
    return {
      ...cloneDocument(this.document),
      switching,
      ...this.persistent ? {} : { diagnostic: this.diagnosticPath },
    }
  }

  active(): AwikiTenantProfile {
    const tenant = this.document.tenants.find(candidate => candidate.tenantId === this.document.activeTenantId)
    if (tenant === undefined) throw new Error('awiki: active tenant is unavailable')
    return structuredClone(tenant)
  }

  find(tenantId: string): AwikiTenantProfile | undefined {
    const tenant = this.document.tenants.find(candidate => candidate.tenantId === tenantId)
    return tenant === undefined ? undefined : structuredClone(tenant)
  }

  stateRoot(tenant: AwikiTenantProfile): string {
    if (tenant.storageLayout === 'legacy-base') return this.baseStateRoot
    if (tenant.storageLayout === 'domain-v1') {
      return join(dirname(this.baseStateRoot), 'tenants', tenant.didHost, basename(this.baseStateRoot))
    }
    return join(dirname(this.baseStateRoot), 'tenant-scopes', tenant.storageScopeId, basename(this.baseStateRoot))
  }

  createCustom(displayName: string, rawDomain: string): AwikiTenantProfile {
    const domain = normalizeAwikiDomain(rawDomain)
    const name = displayName.trim()
    if (name.length === 0 || Array.from(name).length > 80) throw new TypeError('awiki: tenant name is required and must not exceed 80 characters')
    if (this.document.tenants.some(tenant => tenant.didHost === domain || tenant.backendBaseUrl === `https://${domain}`)) {
      throw new Error('awiki: a tenant with this endpoint already exists')
    }
    const tenant: AwikiTenantProfile = {
      tenantId: randomUUID(),
      storageScopeId: randomUUID(),
      kind: 'custom',
      displayName: name,
      backendBaseUrl: `https://${domain}`,
      didHost: domain,
      lifecycle: 'inactive',
      storageLayout: 'scope-v1',
      endpoints: endpointsForOrigin(`https://${domain}`, domain),
    }
    this.document = { ...this.document, tenants: [...this.document.tenants, tenant] }
    this.persist(true)
    return structuredClone(tenant)
  }

  renameCustom(tenantId: string, displayName: string): AwikiTenantProfile {
    const name = displayName.trim()
    if (name.length === 0 || Array.from(name).length > 80) throw new TypeError('awiki: tenant name is required and must not exceed 80 characters')
    const current = this.find(tenantId)
    if (current === undefined) throw new Error('awiki: tenant does not exist')
    if (current.kind === 'built_in') throw new Error('awiki: official tenants cannot be modified')
    const updated = { ...current, displayName: name }
    this.document = {
      ...this.document,
      tenants: this.document.tenants.map(tenant => tenant.tenantId === tenantId ? updated : tenant),
    }
    this.persist(true)
    return structuredClone(updated)
  }

  archiveCustom(tenantId: string): void {
    const current = this.find(tenantId)
    if (current === undefined) throw new Error('awiki: tenant does not exist')
    if (current.kind === 'built_in') throw new Error('awiki: official tenants cannot be archived')
    if (current.lifecycle === 'active') throw new Error('awiki: switch away before archiving this tenant')
    this.document = {
      ...this.document,
      tenants: this.document.tenants.map(tenant => tenant.tenantId === tenantId
        ? { ...tenant, lifecycle: 'archived' }
        : tenant),
    }
    this.persist(true)
  }

  commitActive(tenantId: string): AwikiTenantRegistryDocument {
    const target = this.document.tenants.find(tenant => tenant.tenantId === tenantId)
    if (target === undefined || target.lifecycle === 'archived') throw new Error('awiki: target tenant is unavailable')
    const previous = this.document
    this.document = activate(previous, tenantId, previous.generation + 1)
    try {
      this.persist(true)
    } catch (error) {
      this.document = previous
      throw error
    }
    return cloneDocument(this.document)
  }

  private persist(backup: boolean): void {
    if (!this.persistent) throw new Error('awiki: tenant registry is read-only until its migration diagnostic is resolved')
    mkdirSync(dirname(this.filePath), { recursive: true })
    if (backup && existsSync(this.filePath) && !existsSync(this.backupPath)) copyFileSync(this.filePath, this.backupPath)
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`
    writeFileSync(temporary, `${JSON.stringify(this.document, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
    renameSync(temporary, this.filePath)
  }
}

function freshDocument(): AwikiTenantRegistryDocument {
  const tenants = OFFICIALS.map(officialProfile)
  const activeTenantId = AWIKI_BUILTIN_TENANT_CONFIG.defaultSlot === 'primary'
    ? AWIKI_PRIMARY_TENANT_ID
    : AWIKI_SECONDARY_TENANT_ID
  return activate({
    schemaVersion: AWIKI_TENANT_REGISTRY_SCHEMA_VERSION,
    officialCatalogVersion: AWIKI_OFFICIAL_CATALOG_VERSION,
    generation: 0,
    activeTenantId,
    tenants,
  }, activeTenantId, 0)
}

function legacyDocument(seed: AwikiTenantLegacySeed, usePreRegistryDefault: boolean): AwikiTenantRegistryDocument {
  const selectedSlot = seed.legacyTenantSlot
  const selectedEntry = selectedSlot === undefined
    ? undefined
    : OFFICIALS.find(candidate => candidate.slot === selectedSlot)
  const historicalSeed = usePreRegistryDefault && selectedEntry === undefined
    ? {
        ...seed,
        domain: PRE_REGISTRY_DEFAULT_DOMAIN,
        ...PRE_REGISTRY_DEFAULT_ENDPOINTS,
      }
    : seed
  const domain = selectedEntry?.didHost ?? normalizeAwikiDomain(historicalSeed.domain)
  const entry = selectedEntry ?? OFFICIALS.find(candidate => candidate.didHost === domain)
  const endpoints = selectedEntry === undefined
    ? {
        userServiceUrl: historicalSeed.userServiceUrl,
        messageServiceUrl: historicalSeed.messageServiceUrl,
        mailServiceUrl: historicalSeed.mailServiceUrl,
        messageServicePublicUrl: historicalSeed.messageServicePublicUrl,
        messageServiceDid: historicalSeed.messageServiceDid,
      }
    : endpointsForOrigin(selectedEntry.backendOrigin, selectedEntry.didHost)
  const tenant: AwikiTenantProfile = entry === undefined
    ? {
        tenantId: randomUUID(),
        storageScopeId: randomUUID(),
        kind: 'custom',
        displayName: domain,
        backendBaseUrl: historicalSeed.userServiceUrl,
        didHost: domain,
        lifecycle: 'active',
        storageLayout: 'legacy-base',
        endpoints,
      }
    : {
        ...officialProfile(entry),
        storageScopeId: randomUUID(),
        lifecycle: 'active',
        storageLayout: 'legacy-base',
        endpoints,
      }
  return reconcileOfficials({
    schemaVersion: AWIKI_TENANT_REGISTRY_SCHEMA_VERSION,
    officialCatalogVersion: AWIKI_OFFICIAL_CATALOG_VERSION,
    generation: 0,
    activeTenantId: tenant.tenantId,
    tenants: [tenant],
  })
}
