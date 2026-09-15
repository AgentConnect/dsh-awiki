/** Host-only compatibility evidence for exact, tenant-recommended npm targets. */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { satisfies, validRange } from 'semver'
import { assertVersion, compareVersions } from './version.ts'

export const IDENTITY_PACKAGE = '@agent-network-protocol/dsh-anp-identity'
export interface InstallationRequirements {
  readonly runtime_packages: Readonly<Record<string, string>>
  readonly optional_runtime_packages?: Readonly<Record<string, string>>
  readonly identity: { readonly package_name: typeof IDENTITY_PACKAGE; readonly version: string; readonly integrity: string }
  readonly requires_identity: string
}
export type InstallationBlockedReason = 'installation-unverified' | 'host-incompatible' | 'identity-incompatible'
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export function decodeInstallation(value: unknown): InstallationRequirements | undefined {
  if (value === undefined || value === null) return undefined
  if (!record(value) || !record(value.runtime_packages) || !record(value.identity)
    || value.identity.package_name !== IDENTITY_PACKAGE || typeof value.identity.version !== 'string'
    || typeof value.identity.integrity !== 'string' || !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(value.identity.integrity)
    || typeof value.requires_identity !== 'string' || value.requires_identity.length > 256 || validRange(value.requires_identity) === null) {
    throw new Error('invalid installation requirements')
  }
  const optional = value.optional_runtime_packages === undefined ? {} : value.optional_runtime_packages
  if (!record(optional)) throw new Error('invalid optional Host requirements')
  const requiredEntries = Object.entries(value.runtime_packages)
  const entries = [...requiredEntries, ...Object.entries(optional)]
  if (requiredEntries.length === 0 || entries.length > 128) throw new Error('invalid Host requirement count')
  if (Object.keys(optional).some(name => Object.hasOwn(value.runtime_packages as object, name))) {
    throw new Error('overlapping Host requirements')
  }
  for (const [name, version] of entries) {
    if (!/^@deepseek-ai\/dsh-[a-z0-9-]+$/u.test(name) || typeof version !== 'string') throw new Error('invalid Host requirement')
    assertVersion(version)
  }
  assertVersion(value.identity.version)
  if (!satisfies(value.identity.version, value.requires_identity)) throw new Error('incompatible Identity release target')
  return { runtime_packages: value.runtime_packages as Record<string, string>, requires_identity: value.requires_identity,
    ...(value.optional_runtime_packages === undefined ? {} : { optional_runtime_packages: optional as Record<string, string> }),
    identity: { package_name: IDENTITY_PACKAGE, version: value.identity.version, integrity: value.identity.integrity } }
}

/** Only package manifests are read; paths and native objects never enter the public view. */
function installedVersion(name: string): string | undefined {
  try {
    let directory = dirname(fileURLToPath(import.meta.resolve(name)))
    for (let depth = 0; depth < 12; depth++) {
      try {
        const manifest: unknown = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))
        if (record(manifest) && manifest.name === name && typeof manifest.version === 'string') {
          assertVersion(manifest.version)
          return manifest.version
        }
      } catch { /* The resolved entry may be inside lib or dist. */ }
      const parent = dirname(directory)
      if (parent === directory) break
      directory = parent
    }
  } catch { /* A missing peer is incompatible, never an invented installed version. */ }
  return undefined
}

export function checkInstallation(requirements: InstallationRequirements | undefined,
  installed?: Readonly<Record<string, string | undefined>>,
): { blockedReason?: InstallationBlockedReason; identityTarget?: string } {
  if (requirements === undefined) return { blockedReason: 'installation-unverified' }
  const versionOf = (name: string): string | undefined => installed === undefined ? installedVersion(name) : installed[name]
  for (const [name, required] of Object.entries(requirements.runtime_packages)) {
    const actual = versionOf(name)
    try {
      if (actual === undefined || compareVersions(actual, required) !== 0) return { blockedReason: 'host-incompatible' }
    } catch { return { blockedReason: 'host-incompatible' } }
  }
  for (const [name, required] of Object.entries(requirements.optional_runtime_packages ?? {})) {
    const actual = versionOf(name)
    if (actual === undefined) continue
    try {
      if (compareVersions(actual, required) !== 0) return { blockedReason: 'host-incompatible' }
    } catch { return { blockedReason: 'host-incompatible' } }
  }
  const identity = versionOf(IDENTITY_PACKAGE)
  try {
    if (identity === undefined || compareVersions(identity, requirements.identity.version) < 0) {
      return { identityTarget: `${IDENTITY_PACKAGE}@${requirements.identity.version}` }
    }
    if (!satisfies(identity, requirements.requires_identity)) return { blockedReason: 'identity-incompatible' }
  } catch { return { blockedReason: 'identity-incompatible' } }
  return {}
}
