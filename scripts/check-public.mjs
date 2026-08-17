import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { extname, relative } from 'node:path'

const root = new URL('../', import.meta.url)
const ignoredDirectories = new Set(['.git', 'node_modules', 'coverage', '.artifacts'])
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.tsx', '.yml', '.yaml'])
const forbiddenText = [
  ['private test handle', ['chenzh', '1234'].join('')],
  ['old monorepo package name', ['@deepseek-ai', 'dsh-awiki'].join('/')],
]

const baseline = JSON.parse(await readFile(new URL('../tests/baseline/migration-contract.json', import.meta.url), 'utf8'))

function assertEqual(label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} changed from the Rust SDK migration baseline`)
  }
}

function sortedRecord(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))
}

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
  const exampleEnvironment = path === '.env.example'
  if (!exampleEnvironment && /(?:^|\/)(?:\.env(?:\..+)?|.*(?:identity|state).*\.json|.*(?:token|secret).*\.txt|.*\.(?:key|pem))$/iu.test(path)) {
    throw new Error(`public tree contains a credential-shaped file: ${path}`)
  }
  if (!textExtensions.has(extname(path))) continue
  const text = await readFile(file, 'utf8')
  for (const [label, needle] of forbiddenText) {
    if (text.includes(needle)) throw new Error(`public tree contains ${label}: ${path}`)
  }
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u.test(text)) {
    throw new Error(`public tree contains private-key material: ${path}`)
  }
}

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
assertEqual('public package name', manifest.name, '@awiki/dsh')
assertEqual('public package access', manifest.publishConfig, {
  access: 'public',
  registry: 'https://registry.npmjs.org',
})
assertEqual('package exports', Object.keys(manifest.exports ?? {}), baseline.packageExports)

const clientFiles = await walk(new URL('../src/client/', import.meta.url))
const clientHashes = Object.fromEntries(await Promise.all(clientFiles
  .sort((left, right) => left.pathname.localeCompare(right.pathname))
  .map(async file => [
    relative(root.pathname, file.pathname),
    createHash('sha256').update(await readFile(file)).digest('hex'),
  ])))
assertEqual(
  'src/client file list or content',
  sortedRecord(clientHashes),
  sortedRecord(baseline.clientSourceSha256),
)

await readFile(new URL(`../${baseline.providerContractFixture}`, import.meta.url))
console.log('public-tree safety scan passed')
