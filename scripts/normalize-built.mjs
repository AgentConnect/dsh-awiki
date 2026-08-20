import { readdir, readFile, rm, writeFile } from 'node:fs/promises'

const root = new URL('../lib/', import.meta.url)

for (const name of [
  'model-proxy.js',
  'types/model-proxy.d.ts',
  'types/model-proxy.d.ts.map',
  'types/model-proxy.js',
  'types/model-proxy.js.map',
]) {
  await rm(new URL(name, root), { force: true })
}

const entrySources = await Promise.all(
  ['index.js', 'provider.js', 'invariant.js'].map(name => readFile(new URL(name, root), 'utf8')),
)
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (
    entry.isFile()
    && /^sdk-adapter-.+\.mjs$/u.test(entry.name)
    && !entrySources.some(source => source.includes(entry.name))
  ) await rm(new URL(entry.name, root))
}

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
    if (entry.isDirectory()) files.push(...await walk(url))
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) files.push(url)
  }
  return files
}

for (const file of await walk(root)) {
  const source = await readFile(file, 'utf8')
  const normalized = source.replace(/[ \t]+$/gmu, '')
  if (normalized !== source) await writeFile(file, normalized)
}
