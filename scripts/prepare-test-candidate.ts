// Uses the same package builders and isolated profile installation as product E2E.
import { mkdir, readdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { e2ePackageVersions, prepareProfile } from '../tests/e2e/fixtures/harness-instance.ts'

const root = process.argv[2]
if (!root || !isAbsolute(root) || !['local', 'source'].includes(process.env.AWIKI_DEPENDENCY_MODE ?? '')
  || !process.env.AWIKI_DEPENDENCY_FINGERPRINT) throw new Error('Use the source dependency runner with a new candidate directory')
await mkdir(root) // Refuse to reuse or overwrite a prior candidate.
const profile = await prepareProfile(root, true)
const platform = process.platform === 'linux'
  ? `linux-${process.arch}-${(process.report.getReport() as { header?: { glibcVersionRuntime?: string } }).header?.glibcVersionRuntime ? 'gnu' : 'musl'}`
  : `${process.platform}-${process.arch}`
const names: Record<string, string> = {
  '@agent-network-protocol/anp-identity': 'identityWrapper',
  [`@agent-network-protocol/anp-identity-${platform}`]: 'identityPlatform',
  '@agent-network-protocol/dsh-anp-identity': 'identityPlugin',
  '@awiki/im-core-node': 'imCoreWrapper',
  [`@awiki/im-core-node-${platform}`]: 'imCorePlatform',
  '@awiki/dsh-plugin': 'awikiPlugin',
}
const packages: Record<string, { name: string; version: string; sha256: string }> = {}
const archives: Record<string, string> = {}
for (const file of await readdir(join(root, 'packages'))) {
  if (!file.endsWith('.tgz')) continue
  const path = join(root, 'packages', file)
  const result = spawnSync('tar', ['-xOf', path, 'package/package.json'], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error('Cannot inspect candidate archive')
  const manifest = JSON.parse(result.stdout)
  const role = names[manifest.name]
  if (!role || packages[role]) throw new Error('Unexpected or duplicate candidate package')
  packages[role] = { name: manifest.name, version: manifest.version,
    sha256: createHash('sha256').update(await readFile(path)).digest('hex') }
  archives[role] = path
}
const expectedArchives = [
  'awikiPlugin',
  ...(process.env.AWIKI_LOCAL_CORE_ROOT ? ['imCoreWrapper', 'imCorePlatform'] : []),
  ...(process.env.AWIKI_LOCAL_IDENTITY_ROOT ? ['identityWrapper', 'identityPlatform', 'identityPlugin'] : []),
]
if (Object.keys(packages).sort().join() !== expectedArchives.sort().join()) {
  throw new Error('Candidate archives do not match selected source dependencies')
}
const registryPackages: Record<string, { name: string; version: string; source: 'registry' }> = {}
for (const [name, role] of Object.entries(names)) {
  let manifestPath = join(profile.profileRoot, 'node_modules', name, 'package.json')
  if (role === 'identityPlatform' || role === 'imCorePlatform') {
    const wrapper = role === 'identityPlatform' ? '@agent-network-protocol/anp-identity' : '@awiki/im-core-node'
    const require = createRequire(await realpath(join(profile.profileRoot, 'node_modules', wrapper, 'package.json')))
    manifestPath = require.resolve(`${name}/package.json`)
  }
  const installed = JSON.parse(await readFile(manifestPath, 'utf8'))
  const expectedVersion = packages[role]?.version ?? (role === 'identityPlugin'
    ? e2ePackageVersions.identityPlugin : role.startsWith('identity')
      ? e2ePackageVersions.identityNode : e2ePackageVersions.imCoreNode)
  if (installed.name !== name || installed.version !== expectedVersion) {
    throw new Error(`Installed candidate package does not match selected dependency: ${name}`)
  }
  if (!packages[role]) registryPackages[role] = { name, version: installed.version, source: 'registry' }
}
const profileLockSha256 = createHash('sha256').update(await readFile(join(profile.profileRoot, 'pnpm-lock.yaml'))).digest('hex')
await writeFile(join(root, 'candidate.json'), JSON.stringify({ schemaVersion: 1, packages, registryPackages, profileLockSha256, dependencyFingerprint: process.env.AWIKI_DEPENDENCY_FINGERPRINT }, null, 2) + '\n')
await writeFile(join(root, 'profile.json'), JSON.stringify({ ...profile, profile: 'web', archives }, null, 2) + '\n')
console.log(JSON.stringify({ status: 'prepared', ...profile }))
