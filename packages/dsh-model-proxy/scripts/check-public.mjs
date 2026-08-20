import { readdir, readFile } from 'node:fs/promises'
import { extname, relative } from 'node:path'

const root = new URL('../', import.meta.url)
const ignoredDirectories = new Set(['node_modules', 'lib', 'coverage', '.artifacts'])
const textExtensions = new Set(['.js', '.json', '.md', '.mjs', '.ts', '.yml', '.yaml'])

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
    if (entry.isDirectory()) files.push(...await walk(url))
    else files.push(url)
  }
  return files
}

for (const file of await walk(root)) {
  const path = relative(root.pathname, file.pathname)
  if (/(?:^|\/)(?:\.env(?:\..+)?|.*(?:identity|state).*\.json|.*(?:token|secret).*\.txt|.*\.(?:key|pem))$/iu.test(path)) {
    throw new Error(`public package contains a credential-shaped file: ${path}`)
  }
  if (!textExtensions.has(extname(path))) continue
  const text = await readFile(file, 'utf8')
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u.test(text)) {
    throw new Error(`public package contains private-key material: ${path}`)
  }
  if (path.startsWith('src/') && /from ['"](?:\.\.\/){3,}/u.test(text)) {
    throw new Error(`source crosses the package boundary by relative import: ${path}`)
  }
}

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
if (manifest.name !== '@awiki/dsh-model-proxy') throw new Error('unexpected public package name')
if (manifest.peerDependencies?.['@awiki/dsh-plugin'] === undefined) {
  throw new Error('the main AWiki package must remain a peer dependency')
}
if (manifest.dependencies?.['@awiki/dsh-plugin'] !== undefined) {
  throw new Error('the main AWiki package must not be bundled as a runtime dependency')
}
if (Object.keys(manifest.exports ?? {}).some(path => path.includes('model-proxy-contract'))) {
  throw new Error('the model proxy package must reuse the main package RPC contract')
}

const source = await readFile(new URL('../src/index.ts', import.meta.url), 'utf8')
for (const publicImport of [
  '@awiki/dsh-plugin/model-proxy-contract',
  '@awiki/dsh-plugin/types',
]) {
  if (!source.includes(publicImport)) throw new Error(`source is missing public import ${publicImport}`)
}
console.log('model-proxy public-tree safety scan passed')
