import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, expect, it } from 'vitest'

const contract = await import(pathToFileURL(resolve('scripts/release-candidate-contract.mjs')).href)
const roots: string[] = []
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'candidate-contract-'))
  roots.push(root)
  const packages: Record<string, { name: string; version: string; sha256: string }> = {}
  const archives: Record<string, string> = {}
  for (const [role, name] of Object.entries(contract.packageNames()) as [string, string][]) {
    const dir = join(root, role)
    await mkdir(join(dir, 'package'), { recursive: true })
    await writeFile(join(dir, 'package/package.json'), JSON.stringify({ name, version: '1.2.3-rc.4' }))
    const archive = join(root, `${role}.tgz`)
    execFileSync('tar', ['-czf', archive, '-C', dir, 'package'])
    archives[role] = archive
    packages[role] = { name, version: '1.2.3-rc.4', sha256: createHash('sha256').update(await readFile(archive)).digest('hex') }
  }
  return { root, archives, manifest: { schemaVersion: 1, packages } }
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

it('verifies all six actual archives against explicit versions and hashes', async () => {
  const { archives, manifest } = await fixture()
  expect(await contract.verifyCandidateArchives(archives, manifest)).toEqual(manifest.packages)
})

it('rejects a replaced archive even if the package version did not change', async () => {
  const { archives, manifest } = await fixture()
  await writeFile(archives.awikiPlugin, 'replacement')
  await expect(contract.verifyCandidateArchives(archives, manifest)).rejects.toThrow('checksum mismatch: awikiPlugin')
})

it('rejects a version mismatch even with the correct archive hash', async () => {
  const { archives, manifest } = await fixture()
  manifest.packages.awikiPlugin.version = '1.2.4'
  await expect(contract.verifyCandidateArchives(archives, manifest)).rejects.toThrow('version mismatch')
})

it('requires complete exact versions and a matching platform before installation', async () => {
  const { manifest } = await fixture()
  for (const version of ['latest', '^1.2.3', '1.2.3-01', '01.2.3']) {
    const changed = structuredClone(manifest)
    changed.packages.awikiPlugin.version = version
    expect(() => contract.validateCandidateManifest(changed)).toThrow('invalid candidate')
  }
  const changed = structuredClone(manifest)
  changed.packages.identityPlatform.version = '1.2.4'
  expect(() => contract.validateCandidateManifest(changed)).toThrow('wrapper/platform version mismatch')
  changed.packages.identityPlatform = { ...manifest.packages.identityPlatform, name: '@wrong/platform' }
  expect(() => contract.validateCandidateManifest(changed)).toThrow('invalid candidate')
  delete changed.packages.identityPlatform
  expect(() => contract.validateCandidateManifest(changed)).toThrow('exactly six')
})

it('rejects local dependencies in installed runtime manifests including optional native addons', () => {
  const expected = { name: '@awiki/im-core-node', version: '1.2.3' }
  for (const key of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    expect(() => contract.assertRuntimeManifest({ ...expected, [key]: { addon: 'workspace:1.2.3' } }, expected)).toThrow('local runtime spec')
  }
  expect(() => contract.assertRuntimeManifest({ ...expected, version: '1.2.2' }, expected)).toThrow('version mismatch')
})

it('CLI rejects the wrong candidate before creating any DSH profile', async () => {
  const { root, archives, manifest } = await fixture()
  manifest.packages.imCorePlatform.sha256 = '0'.repeat(64)
  const manifestPath = join(root, 'manifest.json')
  await writeFile(manifestPath, JSON.stringify(manifest))
  const flags = ['identity-wrapper', 'identity-platform', 'identity-plugin', 'im-core-wrapper', 'im-core-platform', 'awiki-plugin']
  const roles = ['identityWrapper', 'identityPlatform', 'identityPlugin', 'imCoreWrapper', 'imCorePlatform', 'awikiPlugin']
  const output = spawnSync(process.execPath, ['scripts/verify-release-candidate.mjs', '--manifest', manifestPath,
    ...flags.flatMap((flag, index) => [`--${flag}`, archives[roles[index]!]!])], { encoding: 'utf8', env: { ...process.env, PATH: '/usr/bin:/bin' } })
  expect(output.status).not.toBe(0)
  expect(output.stderr).toContain('checksum mismatch: imCorePlatform')
  expect(output.stderr).not.toContain('spawnSync dsh')
})
