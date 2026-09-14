/** Build public update metadata from integrity-verified npm archives; never publish/install. */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { satisfies, valid, validRange } from 'semver'

const names = { plugin: '@awiki/dsh-plugin', identity: '@agent-network-protocol/dsh-anp-identity', model_proxy: '@awiki/dsh-model-proxy' }
function archive(input, name) {
  if (!input || !isAbsolute(input.path) || statSync(input.path).size > 64 * 1024 * 1024) throw new Error('absolute bounded npm archive required')
  const integrity = 'sha512-' + createHash('sha512').update(readFileSync(input.path)).digest('base64')
  if (integrity !== input.integrity) throw new Error(`npm archive integrity mismatch: ${name}`)
  const manifest = JSON.parse(execFileSync('tar', ['-xOf', input.path, 'package/package.json'], { encoding: 'utf8', maxBuffer: 256 * 1024 }))
  if (manifest.name !== name || valid(manifest.version) !== manifest.version) throw new Error(`unexpected package identity: ${name}`)
  return { manifest, integrity }
}

export function prepareUpdateInstallation(input) {
  const packages = Object.fromEntries(Object.entries(names).filter(([key]) => key !== 'model_proxy' || input[key] !== undefined)
    .map(([key, name]) => [key, archive(input[key], name)]))
  const runtime = {}
  for (const { manifest } of Object.values(packages)) {
    for (const [name, range] of Object.entries(manifest.peerDependencies ?? {})) {
      if (!/^@deepseek-ai\/dsh-[a-z0-9-]+$/.test(name) || valid(range) !== range) continue
      if (runtime[name] !== undefined && runtime[name] !== range) throw new Error(`conflicting DSH Host pins: ${name}`)
      runtime[name] = range
    }
  }
  if (Object.keys(runtime).length === 0) throw new Error('no exact DSH Host pins in release artifacts')
  for (const { manifest } of Object.values(packages)) {
    for (const [name, range] of Object.entries(manifest.peerDependencies ?? {})) {
      if (!/^@deepseek-ai\/dsh-[a-z0-9-]+$/.test(name)) continue
      if (typeof range !== 'string' || validRange(range) === null || runtime[name] === undefined || !satisfies(runtime[name], range)) {
        throw new Error(`unsupported DSH Host combination: ${name}`)
      }
    }
  }
  const requiresIdentity = packages.plugin.manifest.peerDependencies?.[names.identity]
  if (typeof requiresIdentity !== 'string' || !satisfies(packages.identity.manifest.version, requiresIdentity)) throw new Error('incompatible Identity target')
  const requiresPlugin = packages.model_proxy?.manifest.peerDependencies?.[names.plugin]
  if (packages.model_proxy && (typeof requiresPlugin !== 'string' || !satisfies(packages.plugin.manifest.version, requiresPlugin))) throw new Error('incompatible Model Proxy target')
  return {
    installation: { runtime_packages: Object.fromEntries(Object.entries(runtime).sort(([a], [b]) => a.localeCompare(b))),
      identity: { package_name: names.identity, version: packages.identity.manifest.version, integrity: packages.identity.integrity },
      requires_identity: requiresIdentity },
    ...Object.fromEntries(['plugin', 'model_proxy'].filter(key => packages[key]).map(key => [key, {
      enabled: true, package_name: names[key], recommended_version: packages[key].manifest.version, integrity: packages[key].integrity,
      ...(key === 'model_proxy' ? { requires_plugin: requiresPlugin } : {}),
    }])),
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.argv.length !== 4) throw new Error('Usage: node prepare-update-installation.mjs INPUT.json OUTPUT.json')
  writeFileSync(process.argv[3], JSON.stringify(prepareUpdateInstallation(JSON.parse(readFileSync(process.argv[2], 'utf8'))), null, 2) + '\n', { flag: 'wx' })
}
