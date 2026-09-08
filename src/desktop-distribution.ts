import { assertVersion } from './version.ts'

/** Browser-safe projection of the optional Desktop-owned public update service. */
export interface AwikiDesktopDistribution {
  readonly schemaVersion: 1
  readonly distributionId: 'awiki-dsh-desktop'
  readonly currentVersion: string
  readonly channel: 'stable' | 'prerelease'
  readonly downloadPageUrl: string
  readonly state: 'unchecked' | 'checking' | 'ready' | 'failed'
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
  if (view.schemaVersion !== 1 || view.distributionId !== 'awiki-dsh-desktop'
    || typeof view.currentVersion !== 'string'
    || (view.channel !== 'stable' && view.channel !== 'prerelease')
    || typeof view.downloadPageUrl !== 'string'
    || !['unchecked', 'checking', 'ready', 'failed'].includes(String(view.state))
    || typeof view.updateAvailable !== 'boolean' || typeof view.usedCache !== 'boolean'
    || (view.latestVersion !== undefined && typeof view.latestVersion !== 'string')
    || (view.checkedAt !== undefined && typeof view.checkedAt !== 'string')
    || (view.noRelease !== undefined && typeof view.noRelease !== 'boolean')) return undefined
  try {
    assertVersion(view.currentVersion)
    if (view.latestVersion !== undefined) assertVersion(view.latestVersion as string)
    if (view.checkedAt !== undefined && !Number.isFinite(Date.parse(view.checkedAt as string))) return undefined
    const url = new URL(view.downloadPageUrl)
    if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') return undefined
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
    schemaVersion: 1, distributionId: 'awiki-dsh-desktop', currentVersion: view.currentVersion,
    channel: view.channel, downloadPageUrl: view.downloadPageUrl,
    state: view.state as AwikiDesktopDistribution['state'], updateAvailable: view.updateAvailable,
    usedCache: view.usedCache,
    ...typeof view.latestVersion === 'string' ? { latestVersion: view.latestVersion } : {},
    ...typeof view.checkedAt === 'string' ? { checkedAt: view.checkedAt } : {},
    ...typeof view.noRelease === 'boolean' ? { noRelease: view.noRelease } : {},
    ...bundledVersions === undefined ? {} : { bundledVersions },
  }
}
