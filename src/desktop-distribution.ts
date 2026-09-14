import { assertVersion } from './version.ts'

/** Browser-safe projection of the optional Desktop-owned public update service. */
export interface AwikiDesktopDistribution {
  readonly schemaVersion: 1 | 2
  readonly distributionId: 'awiki-dsh-desktop'
  readonly currentVersion: string
  readonly channel: 'stable' | 'prerelease'
  readonly tenantId?: string
  readonly policyOrigin?: string
  readonly tenantGeneration?: number
  readonly policyRevision?: number
  readonly downloadPageUrl?: string
  readonly state: 'unchecked' | 'checking' | 'ready' | 'failed' | 'unavailable'
  readonly latestVersion?: string
  readonly updateAvailable: boolean
  readonly noRelease?: boolean
  readonly usedCache: boolean
  readonly checkedAt?: string
  readonly bundledVersions?: Readonly<{ plugin: string; modelProxy?: string }>
}

/** Structural consumer of Desktop's optional public contract; no Electron dependency. */
export interface AwikiDesktopDistributionService {
  getSnapshot(): unknown
  check(): Promise<unknown>
}

export function decodeDesktopDistribution(value: unknown): AwikiDesktopDistribution | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const view = value as Record<string, unknown>
  if ((view.schemaVersion !== 1 && view.schemaVersion !== 2) || view.distributionId !== 'awiki-dsh-desktop'
    || typeof view.currentVersion !== 'string'
    || (view.channel !== 'stable' && view.channel !== 'prerelease')
    || (view.downloadPageUrl !== undefined && typeof view.downloadPageUrl !== 'string')
    || !['unchecked', 'checking', 'ready', 'failed', 'unavailable'].includes(String(view.state))
    || typeof view.updateAvailable !== 'boolean' || typeof view.usedCache !== 'boolean'
    || (view.latestVersion !== undefined && typeof view.latestVersion !== 'string')
    || (view.checkedAt !== undefined && typeof view.checkedAt !== 'string')
    || (view.noRelease !== undefined && typeof view.noRelease !== 'boolean')) return undefined
  try {
    assertVersion(view.currentVersion)
    // Legacy Desktop has no tenant context. Keep detection/current version, never its Shanghai recommendation.
    if (view.schemaVersion === 1) return { schemaVersion: 1, distributionId: 'awiki-dsh-desktop',
      currentVersion: view.currentVersion, channel: view.channel, state: 'unavailable', updateAvailable: false, usedCache: false }
    const hasTenant = view.tenantId !== undefined || view.policyOrigin !== undefined || view.tenantGeneration !== undefined
    if (hasTenant && (typeof view.tenantId !== 'string' || view.tenantId.length === 0
      || typeof view.policyOrigin !== 'string' || new URL(view.policyOrigin).origin !== view.policyOrigin
      || new URL(view.policyOrigin).protocol !== 'https:' || !Number.isSafeInteger(view.tenantGeneration)
      || (view.tenantGeneration as number) < 0)) return undefined
    if (!hasTenant && view.state !== 'unavailable') return undefined
    if (view.policyRevision !== undefined && (!Number.isSafeInteger(view.policyRevision) || (view.policyRevision as number) < 1)) return undefined
    if (view.latestVersion !== undefined) assertVersion(view.latestVersion as string)
    if (view.checkedAt !== undefined && !Number.isFinite(Date.parse(view.checkedAt as string))) return undefined
    if (typeof view.downloadPageUrl === 'string') {
      const url = new URL(view.downloadPageUrl)
      if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.origin !== view.policyOrigin) return undefined
    }
  } catch { return undefined }
  let bundledVersions: AwikiDesktopDistribution['bundledVersions']
  if (view.bundledVersions !== undefined) {
    if (typeof view.bundledVersions !== 'object' || view.bundledVersions === null) return undefined
    const bundled = view.bundledVersions as Record<string, unknown>
    if (typeof bundled.plugin !== 'string' || (bundled.modelProxy !== undefined && typeof bundled.modelProxy !== 'string')) return undefined
    try {
      assertVersion(bundled.plugin)
      if (bundled.modelProxy !== undefined) assertVersion(bundled.modelProxy as string)
    } catch { return undefined }
    bundledVersions = { plugin: bundled.plugin, ...typeof bundled.modelProxy === 'string' ? { modelProxy: bundled.modelProxy } : {} }
  }
  return {
    schemaVersion: 2, distributionId: 'awiki-dsh-desktop', currentVersion: view.currentVersion,
    channel: view.channel,
    ...typeof view.downloadPageUrl === 'string' ? { downloadPageUrl: view.downloadPageUrl } : {},
    ...typeof view.tenantId === 'string' ? { tenantId: view.tenantId, policyOrigin: view.policyOrigin as string, tenantGeneration: view.tenantGeneration as number } : {},
    ...typeof view.policyRevision === 'number' ? { policyRevision: view.policyRevision } : {},
    state: view.state as AwikiDesktopDistribution['state'], updateAvailable: view.updateAvailable,
    usedCache: view.usedCache,
    ...typeof view.latestVersion === 'string' ? { latestVersion: view.latestVersion } : {},
    ...typeof view.checkedAt === 'string' ? { checkedAt: view.checkedAt } : {},
    ...typeof view.noRelease === 'boolean' ? { noRelease: view.noRelease } : {},
    ...bundledVersions === undefined ? {} : { bundledVersions },
  }
}
