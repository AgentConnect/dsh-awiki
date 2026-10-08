// Uses the same package builders and isolated profile installation as product E2E.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { prepareProfile } from '../tests/e2e/fixtures/harness-instance.ts'

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
if (Object.keys(packages).length !== 6) throw new Error('Candidate requires all six matching packages')
await writeFile(join(root, 'candidate.json'), JSON.stringify({ schemaVersion: 1, packages }, null, 2) + '\n')
await writeFile(join(root, 'profile.json'), JSON.stringify({ ...profile, profile: 'web', archives }, null, 2) + '\n')
console.log(JSON.stringify({ status: 'prepared', ...profile }))
