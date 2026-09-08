import { readFileSync, realpathSync } from 'node:fs'
import { resolve, relative, isAbsolute, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'

export function verifyLock(lock, mode = 'registry', workspacePackages = {}) {
  if (!['registry', 'local', 'source'].includes(mode)) throw new Error('Unknown dependency mode')
  if (mode !== 'registry') return
  for (const [id, info] of Object.entries(lock.packages ?? {})) {
    const resolution = info.resolution ?? {}
    if (!resolution.integrity || resolution.type || resolution.directory || resolution.repo
      || (resolution.tarball && !resolution.tarball.startsWith('https://registry.npmjs.org/'))) {
      throw new Error(`Non-registry resolution: ${id}`)
    }
  }
  for (const [id, importer] of Object.entries(lock.importers ?? {})) {
    if (id.startsWith('../')) throw new Error(`External workspace importer: ${id}`)
    for (const group of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [name, item] of Object.entries(importer[group] ?? {})) {
        const target = (item.version ?? '').startsWith('link:') ? posix.normalize(posix.join(id, item.version.slice(5))) : undefined
        // The current product is allowed as an internal development dependency.
        // Runtime SDKs and links outside the checked-in workspace remain forbidden.
        if (group === 'devDependencies' && target !== undefined && !target.startsWith('..')
          && workspacePackages[target] === name) continue
        if (/^(file:|link:|workspace:|git\+|https?:)/u.test(item.version ?? '')) {
          throw new Error(`Non-registry dependency: ${name}`)
        }
      }
    }
  }
}

export function verifyInstalled(root, mode = 'registry') {
  const lock = YAML.parse(readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8'))
  const workspacePackages = {}
  for (const id of Object.keys(lock.importers ?? {})) {
    if (id === '.' || /^packages\/[^/]+$/u.test(id)) {
      workspacePackages[id] = JSON.parse(readFileSync(resolve(root, id, 'package.json'), 'utf8')).name
    }
  }
  verifyLock(lock, mode, workspacePackages)
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const resolved = []
  for (const name of ['@awiki/im-core-node', '@agent-network-protocol/dsh-anp-identity']) {
    const entry = realpathSync(resolve(root, 'node_modules', name, 'package.json'))
    const selectedRoot = name === '@awiki/im-core-node' ? process.env.AWIKI_LOCAL_CORE_ROOT : process.env.AWIKI_LOCAL_IDENTITY_ROOT
    const selectedPath = name === '@awiki/im-core-node' ? 'packages/awiki-im-core-node/package.json' : 'packages/dsh-anp-identity/package.json'
    const installed = JSON.parse(readFileSync(entry, 'utf8'))
    if (mode !== 'registry' && selectedRoot) {
      if (entry !== realpathSync(resolve(selectedRoot, selectedPath))) throw new Error(`${name}: selected source override was not used`)
    } else {
      const path = relative(resolve(root, 'node_modules'), entry)
      if (path.startsWith('..') || isAbsolute(path)) throw new Error(`Installed ${name} escapes node_modules`)
      const expected = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name]
      if (installed.version !== expected) throw new Error(`${name}: installed version mismatch`)
    }
    resolved.push({ name, version: installed.version, source: mode !== 'registry' && selectedRoot ? mode : 'registry' })
    if (mode === 'registry') {
      for (const group of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
        for (const value of Object.values(installed[group] ?? {})) {
          if (/^(file:|link:|workspace:|git\+|https?:)/u.test(value)) throw new Error(`${name}: local runtime dependency`)
        }
      }
    }
  }
  return resolved
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.env.AWIKI_DEPENDENCY_MODE ?? 'registry'
  console.log(JSON.stringify({ mode, packages: verifyInstalled(process.cwd(), mode) }))
}
