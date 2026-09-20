import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { verifyInstalled } from './check-dependency-sources.mjs'
import { verifyReleaseVersions } from './dependencies/release-versions.mjs'

if ((process.env.AWIKI_DEPENDENCY_MODE ?? 'registry') !== 'registry'
  || process.env.AWIKI_LOCAL_CORE_ROOT || process.env.AWIKI_LOCAL_IDENTITY_ROOT
  || existsSync('dependencies.source.json')) {
  throw new Error('Publish requires registry dependencies; remove source integration and local overrides')
}
const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
verifyReleaseVersions(manifest)
verifyInstalled(resolve('.'), 'registry')
console.log('release_registry_dependencies=verified')
