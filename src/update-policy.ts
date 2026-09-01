/** Tenant-scoped DSH AWiki plugin update policy and verified cache. */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { AwikiTenantProfile } from './tenant-registry.ts'

export const DSH_AWIKI_VERSION = '0.3.7'
export const DSH_AWIKI_MODEL_PROXY_VERSION = '0.1.3'
const PRODUCT = 'dsh-awiki'
const CHANNEL = 'stable'
const MAX_POLICY_BYTES = 1024 * 1024

export interface AwikiPluginUpdateTarget {
  readonly name: string
  readonly recommendedVersion: string
  readonly minimumVersion: string
  readonly integrity: string
  readonly repository?: string
  readonly requiresPlugin?: string
}

export interface AwikiUpdatePolicyStatus {
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
  readonly pluginTarget?: AwikiPluginUpdateTarget
  readonly modelProxyTarget?: AwikiPluginUpdateTarget
  readonly offline: boolean
  readonly usedCache: boolean
  readonly policyUnavailable: boolean
  readonly restricted: boolean
  readonly modelProxyRestricted: boolean
  readonly checkedAt?: string
}

interface PolicyFile {
  readonly product: typeof PRODUCT
  readonly channel: typeof CHANNEL
  readonly policy_origin: string
  readonly policy_revision: number
  readonly published_at: string
  readonly release_notes_url: string
  readonly packages: {
    readonly plugin: PolicyPackage
    readonly model_proxy: PolicyPackage
  }
}

interface PolicyPackage {
  readonly name: string
  readonly recommended_version: string
  readonly min_supported_version: string
  readonly integrity: string
  readonly repository?: string
  readonly requires_plugin?: string
}

interface CachedPolicy {
  readonly checkedAt: string
  readonly policy: PolicyFile
}

export interface CheckAwikiUpdatePolicyOptions {
  readonly tenant: AwikiTenantProfile
  readonly generation: number
  readonly stateRoot: string
  readonly currentPluginVersion?: string
  readonly currentModelProxyVersion?: string
  readonly allowInsecureLoopback?: boolean
  readonly signal?: AbortSignal
  readonly fetcher?: typeof fetch
}

export async function checkAwikiUpdatePolicy(
  options: CheckAwikiUpdatePolicyOptions,
): Promise<AwikiUpdatePolicyStatus> {
  const origin = new URL(options.tenant.backendBaseUrl).origin
  assertPolicyOrigin(origin, options.allowInsecureLoopback === true)
  const cachePath = policyCachePath(options.stateRoot, options.tenant.tenantId, origin)
  const cached = readCache(cachePath, origin)
  const currentPluginVersion = options.currentPluginVersion ?? DSH_AWIKI_VERSION
  const base = {
    tenantId: options.tenant.tenantId,
    policyOrigin: origin,
    tenantGeneration: options.generation,
    currentPluginVersion,
    ...options.currentModelProxyVersion === undefined
      ? {}
      : { currentModelProxyVersion: options.currentModelProxyVersion },
  }
  try {
    const response = await (options.fetcher ?? fetch)(
      new URL('/downloads/dsh-awiki/stable/manifest.json', origin),
      {
        method: 'GET',
        headers: { accept: 'application/json', 'cache-control': 'no-store' },
        cache: 'no-store',
        redirect: 'error',
        ...options.signal === undefined ? {} : { signal: options.signal },
      },
    )
    if (response.status === 404 && options.tenant.kind === 'custom' && cached === undefined) {
      return {
        ...base,
        offline: false,
        usedCache: false,
        policyUnavailable: true,
        restricted: false,
        modelProxyRestricted: false,
      }
    }
    if (response.redirected
      || (response.url !== '' && new URL(response.url).origin !== origin)) {
      throw new Error('update policy response crossed its tenant origin')
    }
    if (!response.ok) throw new Error(`policy status ${response.status}`)
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > MAX_POLICY_BYTES) throw new Error('policy response exceeds 1 MiB')
    const policy = decodePolicy(JSON.parse(Buffer.from(bytes).toString('utf8')), origin)
    if (cached !== undefined && policy.policy_revision < cached.policy.policy_revision) {
      throw new Error('policy revision moved backwards')
    }
    const checkedAt = new Date().toISOString()
    writeCache(cachePath, { checkedAt, policy })
    return statusFromPolicy(base, policy, checkedAt, false, false)
  } catch (error) {
    if (options.signal?.aborted === true) throw error
    if (cached !== undefined) {
      return statusFromPolicy(base, cached.policy, cached.checkedAt, true, true)
    }
    return {
      ...base,
      offline: true,
      usedCache: false,
      policyUnavailable: true,
      restricted: false,
      modelProxyRestricted: false,
    }
  }
}

function statusFromPolicy(
  base: Pick<AwikiUpdatePolicyStatus, 'tenantId' | 'policyOrigin' | 'tenantGeneration' | 'currentPluginVersion' | 'currentModelProxyVersion'>,
  policy: PolicyFile,
  checkedAt: string,
  offline: boolean,
  usedCache: boolean,
): AwikiUpdatePolicyStatus {
  const plugin = policy.packages.plugin
  const modelProxy = policy.packages.model_proxy
  return {
    ...base,
    policyRevision: policy.policy_revision,
    recommendedPluginVersion: plugin.recommended_version,
    minimumPluginVersion: plugin.min_supported_version,
    recommendedModelProxyVersion: modelProxy.recommended_version,
    minimumModelProxyVersion: modelProxy.min_supported_version,
    releaseNotesUrl: policy.release_notes_url,
    pluginTarget: publicTarget(plugin),
    modelProxyTarget: publicTarget(modelProxy),
    offline,
    usedCache,
    policyUnavailable: false,
    restricted: compareVersions(base.currentPluginVersion, plugin.min_supported_version) < 0,
    modelProxyRestricted: base.currentModelProxyVersion !== undefined
      && compareVersions(base.currentModelProxyVersion, modelProxy.min_supported_version) < 0,
    checkedAt,
  }
}

function publicTarget(value: PolicyPackage): AwikiPluginUpdateTarget {
  return {
    name: value.name,
    recommendedVersion: value.recommended_version,
    minimumVersion: value.min_supported_version,
    integrity: value.integrity,
    ...value.repository === undefined ? {} : { repository: value.repository },
    ...value.requires_plugin === undefined ? {} : { requiresPlugin: value.requires_plugin },
  }
}

function decodePolicy(value: unknown, origin: string): PolicyFile {
  if (!isRecord(value)
    || value.product !== PRODUCT
    || value.channel !== CHANNEL
    || value.policy_origin !== origin
    || !Number.isSafeInteger(value.policy_revision) || (value.policy_revision as number) < 1
    || typeof value.published_at !== 'string' || Number.isNaN(Date.parse(value.published_at))
    || typeof value.release_notes_url !== 'string'
    || !isRecord(value.packages)) throw new Error('invalid update policy')
  const releaseNotes = new URL(value.release_notes_url)
  assertPolicyOrigin(releaseNotes.origin, origin.startsWith('http://'))
  const plugin = decodePackage(value.packages.plugin, '@awiki/dsh-plugin')
  const modelProxy = decodePackage(value.packages.model_proxy, '@awiki/dsh-model-proxy')
  if (compareVersions(plugin.min_supported_version, plugin.recommended_version) > 0
    || compareVersions(modelProxy.min_supported_version, modelProxy.recommended_version) > 0) {
    throw new Error('minimum version exceeds recommended version')
  }
  return {
    product: PRODUCT,
    channel: CHANNEL,
    policy_origin: origin,
    policy_revision: value.policy_revision as number,
    published_at: value.published_at,
    release_notes_url: releaseNotes.toString(),
    packages: { plugin, model_proxy: modelProxy },
  }
}

function decodePackage(value: unknown, expectedName: string): PolicyPackage {
  if (!isRecord(value)
    || value.name !== expectedName
    || typeof value.recommended_version !== 'string'
    || typeof value.min_supported_version !== 'string'
    || typeof value.integrity !== 'string' || !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(value.integrity)
    || (value.repository !== undefined && typeof value.repository !== 'string')
    || (value.requires_plugin !== undefined && typeof value.requires_plugin !== 'string')) {
    throw new Error('invalid update package target')
  }
  assertVersion(value.recommended_version)
  assertVersion(value.min_supported_version)
  return {
    name: value.name,
    recommended_version: value.recommended_version,
    min_supported_version: value.min_supported_version,
    integrity: value.integrity,
    ...value.repository === undefined ? {} : { repository: value.repository },
    ...value.requires_plugin === undefined ? {} : { requires_plugin: value.requires_plugin },
  }
}

function policyCachePath(stateRoot: string, tenantId: string, origin: string): string {
  const key = createHash('sha256')
    .update(`${tenantId}\n${origin}\n${PRODUCT}\n${CHANNEL}`, 'utf8')
    .digest('hex')
  return join(stateRoot, 'update-policy', `${key}.json`)
}

function readCache(path: string, origin: string): CachedPolicy | undefined {
  try {
    const value: unknown = JSON.parse(readFileSync(path, 'utf8'))
    if (!isRecord(value) || typeof value.checkedAt !== 'string') return undefined
    return { checkedAt: value.checkedAt, policy: decodePolicy(value.policy, origin) }
  } catch {
    return undefined
  }
}

function writeCache(path: string, value: CachedPolicy): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const temporary = `${path}.tmp-${process.pid}`
  writeFileSync(temporary, `${JSON.stringify(value, undefined, 2)}\n`, { mode: 0o600 })
  renameSync(temporary, path)
}

function assertPolicyOrigin(origin: string, allowLoopback: boolean): void {
  const url = new URL(origin)
  if (url.protocol === 'https:') return
  if (allowLoopback && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return
  throw new Error('update policy origin must use HTTPS')
}

function assertVersion(value: string): void {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(value)) throw new Error('invalid semantic version')
}

export function compareVersions(left: string, right: string): number {
  assertVersion(left)
  assertVersion(right)
  const parse = (value: string) => value.split('-', 1)[0]!.split('.').map(Number)
  const a = parse(left)
  const b = parse(right)
  for (let index = 0; index < 3; index += 1) {
    const difference = a[index]! - b[index]!
    if (difference !== 0) return Math.sign(difference)
  }
  return 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
