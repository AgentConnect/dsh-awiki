import { createRequire } from 'node:module'
/** 显式新加坡测试组合校验；正式 registry/source 规则保持独立。 */
import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { resolve, relative, isAbsolute, dirname } from 'node:path'
export function verifyTestBundle(root, manifestPath = process.env.AWIKI_TEST_BUNDLE_MANIFEST) {
  if (!manifestPath || !isAbsolute(manifestPath)) throw new Error('Test source build requires an absolute bundle manifest')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.schemaVersion !== 1 || manifest.channel !== 'singapore-test' || manifest.published !== false || !Array.isArray(manifest.packages)) throw new Error('Invalid Singapore test bundle')
  const seen = new Set()
  for (const pkg of manifest.packages) {
    if (!/^(?:@awiki|@agent-network-protocol)\/[a-z0-9-]+$/u.test(pkg.name) || seen.has(pkg.name)
      || !/^\d+\.\d+\.\d+-sg\.20260922\.[1-9]\d*$/u.test(pkg.version)
      || !/^[a-f0-9]{64}$/u.test(pkg.sha256) || !isAbsolute(pkg.path)) throw new Error('Invalid or duplicate test package')
    seen.add(pkg.name)
    if (createHash('sha256').update(readFileSync(pkg.path)).digest('hex') !== pkg.sha256) throw new Error(`Test package checksum mismatch: ${pkg.name}`)
  }
  for (const name of ['@awiki/im-core-node', '@agent-network-protocol/anp-identity', '@agent-network-protocol/dsh-anp-identity']) {
    const expected = manifest.packages.find(pkg => pkg.name === name)
    if (!expected) throw new Error(`Missing required test package: ${name}`)
    const anchor = name === '@agent-network-protocol/anp-identity'
      ? resolve(root, 'node_modules/@agent-network-protocol/dsh-anp-identity/package.json') : resolve(root, 'package.json')
    let entry = name === '@agent-network-protocol/anp-identity' ? createRequire(realpathSync(anchor)).resolve(name) : resolve(root, 'node_modules', name, 'package.json')
    if (name === '@agent-network-protocol/anp-identity') {
      let folder = dirname(entry)
      while (true) {
        try { if (JSON.parse(readFileSync(resolve(folder, 'package.json'), 'utf8')).name === name) { entry = resolve(folder, 'package.json'); break } } catch {}
        const parent = dirname(folder); if (parent === folder) throw new Error(`Missing installed package manifest: ${name}`); folder = parent
      }
    }
    const path = realpathSync(entry)
    const inside = relative(realpathSync(resolve(root, 'node_modules')), path)
    if (inside.startsWith('..') || isAbsolute(inside)) throw new Error(`Test installation escapes node_modules: ${name}`)
    const installed = JSON.parse(readFileSync(path, 'utf8'))
    if (installed.name !== name || installed.version !== expected.version) throw new Error(`Installed test package mismatch: ${name}`)
  }
  return manifest
}
