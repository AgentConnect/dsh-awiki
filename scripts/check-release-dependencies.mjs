import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { verifyInstalled } from './check-dependency-sources.mjs'

if ((process.env.AWIKI_DEPENDENCY_MODE ?? 'registry') !== 'registry'
  || process.env.AWIKI_LOCAL_CORE_ROOT || process.env.AWIKI_LOCAL_IDENTITY_ROOT
  || existsSync('dependencies.source.json')) {
  throw new Error('Publish requires registry dependencies; remove source integration and local overrides')
}
const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
for (const name of ['@awiki/im-core-node', '@agent-network-protocol/dsh-anp-identity']) {
  const version = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name]
  if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error(`${name}: release requires an exact stable version`)
}
verifyInstalled(resolve('.'), 'registry')
console.log('release_registry_dependencies=verified')
