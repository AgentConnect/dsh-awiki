import { readdir, readFile, writeFile } from 'node:fs/promises'

const root = new URL('../lib/', import.meta.url)

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
