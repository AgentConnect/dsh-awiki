import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { verifyTestBundle } from './test-bundle.mjs'

test('test source mode fails without an explicit manifest', () => {
  assert.throws(() => verifyTestBundle('.', ''), /absolute bundle manifest/u)
})
test('test combination checks input bytes, complete required dependencies and actual installed versions', () => {
  const root = mkdtempSync(join(tmpdir(), 'awiki-test-bundle-'))
  try {
    const names = ['@awiki/im-core-node', '@agent-network-protocol/anp-identity', '@agent-network-protocol/dsh-anp-identity']
    const packages = names.map((name, i) => {
      const path = join(root, `${i}.tgz`); writeFileSync(path, `test bytes ${i}`)
      const version = '0.1.0-sg.20260922.1'; const folder = join(root, 'node_modules', name)
      mkdirSync(folder, { recursive: true });writeFileSync(join(folder, 'index.js'), '');writeFileSync(join(folder, 'package.json'), JSON.stringify({ name, version }))
      return { name, version, path, sha256: createHash('sha256').update(`test bytes ${i}`).digest('hex') }
    })
    const manifest = { schemaVersion: 1, channel: 'singapore-test', published: false, packages }
    const path = join(root, 'manifest.json'); const save = () => writeFileSync(path, JSON.stringify(manifest))
    save();verifyTestBundle(root, path)
    manifest.published = true;save();assert.throws(() => verifyTestBundle(root, path), /Invalid/u)
    manifest.published = false;packages[0].sha256 = 'a'.repeat(64);save();assert.throws(() => verifyTestBundle(root, path), /checksum/u)
    packages[0].sha256 = createHash('sha256').update('test bytes 0').digest('hex');save()
    writeFileSync(join(root, 'node_modules', names[0], 'package.json'), JSON.stringify({ name: names[0], version: '0.1.0' }))
    assert.throws(() => verifyTestBundle(root, path), /Installed test package mismatch/u)
    packages.splice(0, 1);save();assert.throws(() => verifyTestBundle(root, path), /Missing required/u)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
