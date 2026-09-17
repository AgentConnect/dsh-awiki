import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

export function packageNames(platform = process.platform, arch = process.arch) {
  const target = {
    'darwin-arm64': 'darwin-arm64', 'darwin-x64': 'darwin-x64',
    'linux-arm64': 'linux-arm64-gnu', 'linux-x64': 'linux-x64-gnu',
    'win32-x64': 'win32-x64-msvc',
  }[`${platform}-${arch}`]
  if (!target) throw new Error(`unsupported candidate host ${platform}-${arch}`)
  return {
    identityWrapper: '@agent-network-protocol/anp-identity',
    identityPlatform: `@agent-network-protocol/anp-identity-${target}`,
    identityPlugin: '@agent-network-protocol/dsh-anp-identity',
    imCoreWrapper: '@awiki/im-core-node',
    imCorePlatform: `@awiki/im-core-node-${target}`,
    awikiPlugin: '@awiki/dsh-plugin',
  }
}

export function validateCandidateManifest(manifest, names = packageNames()) {
  const roles = Object.keys(names)
  if (manifest?.schemaVersion !== 1 || !manifest.packages
    || Object.keys(manifest.packages).length !== roles.length) {
    throw new Error('candidate manifest requires schemaVersion 1 and exactly six packages')
  }
  // Require an exact semver, including prereleases; never accept ranges or tags.
  const number = '(?:0|[1-9][0-9]*)'
  const pre = `(?:${number}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)`
  const version = new RegExp(`^${number}\\.${number}\\.${number}(?:-${pre}(?:\\.${pre})*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`, 'u')
  for (const role of roles) {
    const entry = manifest.packages[role]
    if (!entry || entry.name !== names[role] || typeof entry.version !== 'string'
      || !version.test(entry.version) || !/^[a-f0-9]{64}$/u.test(entry.sha256 ?? '')) {
      throw new Error(`invalid candidate manifest entry: ${role}`)
    }
  }
  for (const [wrapper, platform] of [['identityWrapper', 'identityPlatform'], ['imCoreWrapper', 'imCorePlatform']]) {
    if (manifest.packages[wrapper].version !== manifest.packages[platform].version) {
      throw new Error(`candidate wrapper/platform version mismatch: ${wrapper}`)
    }
  }
  return manifest.packages
}

export function assertRuntimeManifest(manifest, expected) {
  if (manifest.name !== expected.name || manifest.version !== expected.version) {
    throw new Error(`installed ${expected.name} version mismatch`)
  }
  for (const value of [
    ...Object.values(manifest.dependencies || {}),
    ...Object.values(manifest.peerDependencies || {}),
    ...Object.values(manifest.optionalDependencies || {}),
  ]) {
    if (typeof value !== 'string' || /^(?:file:|link:|workspace:)/u.test(value)) {
      throw new Error(`${manifest.name} leaked a local runtime spec`)
    }
  }
}

export async function verifyCandidateArchives(archives, manifest) {
  const expected = validateCandidateManifest(manifest)
  for (const [role, entry] of Object.entries(expected)) {
    const bytes = await readFile(archives[role])
    if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) {
      throw new Error(`candidate archive checksum mismatch: ${role}`)
    }
    const result = spawnSync('tar', ['-xOf', archives[role], 'package/package.json'], {
      encoding: 'utf8', timeout: 30_000, maxBuffer: 1024 * 1024,
    })
    if (result.status !== 0) throw new Error(`cannot read candidate manifest: ${role}`)
    assertRuntimeManifest(JSON.parse(result.stdout), entry)
  }
  return expected
}
