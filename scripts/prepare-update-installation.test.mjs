import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { prepareUpdateInstallation } from './prepare-update-installation.mjs'

function fixture(t, overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-npm-evidence-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const names = { plugin: '@awiki/dsh-plugin', identity: '@agent-network-protocol/dsh-anp-identity', model_proxy: '@awiki/dsh-model-proxy' }
  const input = {}
  for (const [key, name] of Object.entries(names)) {
    const peers = { '@deepseek-ai/dsh-core': '0.1.5-rc.1', ...(key === 'plugin' ? { [names.identity]: '^1.0.0' } : key === 'model_proxy' ? { [names.plugin]: '^1.0.0' } : {}) }
    const dir = join(root, key)
    mkdirSync(join(dir, 'package'), { recursive: true })
    writeFileSync(join(dir, 'package/package.json'), JSON.stringify({ name, version: '1.0.0', peerDependencies: peers, ...overrides[key] }))
    const path = join(root, `${key}.tgz`)
    execFileSync('tar', ['-czf', path, '-C', dir, 'package/package.json'])
    input[key] = { path, integrity: 'sha512-' + createHash('sha512').update(readFileSync(path)).digest('base64') }
  }
  return input
}

test('reads the archived manifests, verifies bytes, and emits no arbitrary version floors', t => {
  const input = fixture(t)
  const result = prepareUpdateInstallation(input)
  assert.deepEqual(result.installation.runtime_packages, { '@deepseek-ai/dsh-core': '0.1.5-rc.1' })
  assert.equal(result.installation.identity.integrity, input.identity.integrity)
  assert.equal(result.plugin.recommended_version, '1.0.0')
  assert.equal(result.plugin.minimum_supported_version, undefined)
  assert.equal(result.model_proxy.requires_plugin, '^1.0.0')
  writeFileSync(input.plugin.path, 'changed')
  assert.throws(() => prepareUpdateInstallation(input), /integrity mismatch/)
})
test('rejects a mismatched package and conflicting Host runtime pins', t => {
  assert.throws(() => prepareUpdateInstallation(fixture(t, { plugin: { name: '@unexpected/plugin' } })), /unexpected package identity/)
  assert.throws(() => prepareUpdateInstallation(fixture(t, { identity: { peerDependencies: { '@deepseek-ai/dsh-core': '0.1.1-rc.2' } } })), /conflicting DSH Host pins/)
})
test('rejects incompatible Identity and Model Proxy releases instead of publishing a command', t => {
  assert.throws(() => prepareUpdateInstallation(fixture(t, { identity: { version: '2.0.0' } })), /incompatible Identity/)
  assert.throws(() => prepareUpdateInstallation(fixture(t, { model_proxy: { peerDependencies: { '@awiki/dsh-plugin': '^2.0.0' } } })), /incompatible Model Proxy/)
})
test('requires exact Host evidence for each peer range, with npm prerelease semantics', t => {
  assert.throws(() => prepareUpdateInstallation(fixture(t, { identity: { peerDependencies: { '@deepseek-ai/dsh-other': '^0.1.5' } } })), /unsupported DSH Host combination/)
  assert.throws(() => prepareUpdateInstallation(fixture(t, { identity: { peerDependencies: { '@deepseek-ai/dsh-core': '^0.1.5' } } })), /unsupported DSH Host combination/)
})
