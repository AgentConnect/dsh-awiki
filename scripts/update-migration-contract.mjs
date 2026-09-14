import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { relative } from 'node:path'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const baselineUrl = new URL('../tests/baseline/migration-contract.json', import.meta.url)

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
    if (entry.isDirectory()) files.push(...await walk(url))
    else files.push(url)
  }
  return files
}

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex')
}

const baseline = JSON.parse(await readFile(baselineUrl, 'utf8'))
const hostSource = ts.createSourceFile('index.ts', await readFile(new URL('../src/index.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
const service = hostSource.statements.find(value => ts.isClassDeclaration(value) && value.name?.text === 'AwikiService')
if (service === undefined) throw new Error('Missing AwikiService contract')
baseline.remoteMethods = service.members.filter(ts.isMethodDeclaration)
  .filter(method => (ts.getDecorators(method) ?? []).some(decorator => decorator.expression.getText(hostSource) === 'Remote'))
  .map(method => method.name.getText(hostSource))
if (baseline.remoteMethods.length === 0) throw new Error('Empty Remote contract')
const clientFiles = (await walk(new URL('../src/client/', import.meta.url)))
  .sort((left, right) => left.pathname.localeCompare(right.pathname))
baseline.clientSourceSha256 = Object.fromEntries(await Promise.all(clientFiles.map(async file => [
  relative(root.pathname, file.pathname),
  await sha256(file),
])))
baseline.clientBundleSha256 = Object.fromEntries(await Promise.all([
  'lib/client.js',
  'lib/client.js.map',
].map(async path => [path, await sha256(new URL(`../${path}`, import.meta.url))])))

await writeFile(baselineUrl, `${JSON.stringify(baseline, null, 2)}\n`)
console.log(`migration contract updated: ${clientFiles.length} client sources and 2 bundle artifacts`)
