import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verifyLock } from '../check-dependency-sources.mjs'

test('registry rejects transitive local, git, tarball and external workspace sources', () => {
  const lock = { packages: { 'sdk@1.0.0': { resolution: { integrity: 'sha512-fixture' } } }, importers: { '.': { dependencies: { sdk: { version: '1.0.0' } } } } }
  assert.doesNotThrow(() => verifyLock(lock))
  for (const resolution of [{ directory: '../sdk' }, { repo: 'https://github.com/example/sdk' }, { integrity: 'sha512-fixture', tarball: 'file:/tmp/sdk.tgz' }]) {
    assert.throws(() => verifyLock({ ...lock, packages: { sdk: { resolution } } }))
  }
  assert.throws(() => verifyLock({ ...lock, importers: { '../sdk': {} } }))
  for (const version of ['link:../sdk', 'file:../sdk.tgz', 'git+https://github.com/example/sdk']) {
    assert.throws(() => verifyLock({ ...lock, importers: { '.': { dependencies: { sdk: { version } } } } }))
  }
})
test('source linkage is accepted only in explicit development modes', () => {
  const lock = { importers: { '../sdk': {} } }
  assert.doesNotThrow(() => verifyLock(lock, 'local'))
  assert.doesNotThrow(() => verifyLock(lock, 'source'))
  assert.throws(() => verifyLock(lock, 'release'))
})

test('an explicit local SDK cannot silently fall back to a registry copy', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const { verifyInstalled } = await import('../check-dependency-sources.mjs')
  const root = mkdtempSync(join(tmpdir(), 'dsh-source-check-'))
  const previous = process.env.AWIKI_LOCAL_CORE_ROOT
  try {
    writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: { '@awiki/im-core-node': '0.2.3' } }))
    writeFileSync(join(root, 'pnpm-lock.yaml'), 'packages: {}\nimporters: {}\n')
    const installed = join(root, 'node_modules/@awiki/im-core-node')
    const selected = join(root, 'selected/packages/awiki-im-core-node')
    for (const directory of [installed, selected]) {
      mkdirSync(directory, { recursive: true })
      writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: '@awiki/im-core-node', version: '0.2.3' }))
    }
    process.env.AWIKI_LOCAL_CORE_ROOT = join(root, 'selected')
    assert.throws(() => verifyInstalled(root, 'local'), /selected source override was not used/u)
  } finally {
    if (previous === undefined) delete process.env.AWIKI_LOCAL_CORE_ROOT
    else process.env.AWIKI_LOCAL_CORE_ROOT = previous
    rmSync(root, { recursive: true, force: true })
  }
})

test('registry mode permits only an internal development link to the product being built', () => {
  const importer = { devDependencies: { '@awiki/dsh-plugin': { version: 'link:../..' } } }
  const lock = { packages: {}, importers: { '.': {}, 'packages/dsh-model-proxy': importer } }
  assert.doesNotThrow(() => verifyLock(lock, 'registry', { '.': '@awiki/dsh-plugin' }))
  assert.throws(() => verifyLock(lock, 'registry', { '.': 'different-product' }))
  importer.dependencies = importer.devDependencies
  delete importer.devDependencies
  assert.throws(() => verifyLock(lock, 'registry', { '.': '@awiki/dsh-plugin' }))
})
import { verifyReleaseVersions } from './release-versions.mjs'

test('release gate accepts coordinated Identity RC pins only for AWiki RC packages', () => {
  const manifest = {
    version: '0.3.11-rc.2',
    dependencies: { '@awiki/im-core-node': '0.2.6' },
    devDependencies: { '@agent-network-protocol/dsh-anp-identity': '0.1.3-rc.2' },
  }
  assert.doesNotThrow(() => verifyReleaseVersions(manifest))
  assert.throws(() => verifyReleaseVersions({ ...manifest, version: '0.3.11' }))
  for (const version of ['^0.1.3-rc.2', 'next', 'file:../identity', '0.1.3-beta.1']) {
    assert.throws(() => verifyReleaseVersions({ ...manifest,
      devDependencies: { '@agent-network-protocol/dsh-anp-identity': version },
    }))
  }
  assert.throws(() => verifyReleaseVersions({ ...manifest,
    dependencies: { '@awiki/im-core-node': '0.2.7-rc.1' },
  }))
  assert.doesNotThrow(() => verifyReleaseVersions({ ...manifest, version: '0.3.11',
    devDependencies: { '@agent-network-protocol/dsh-anp-identity': '0.1.2' },
  }))
})
