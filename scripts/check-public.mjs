import { readdir, readFile } from 'node:fs/promises'
import { extname, relative } from 'node:path'

const root = new URL('../', import.meta.url)
const ignoredDirectories = new Set(['.git', 'node_modules', 'coverage', '.artifacts'])
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.tsx', '.yml', '.yaml'])
const forbiddenText = [
  ['private test handle', ['chenzh', '1234'].join('')],
  ['old monorepo package name', ['@deepseek-ai', 'dsh-awiki'].join('/')],
]

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
  if (path.startsWith(['vendor/anp-typescript-sdk/examples', '.generated'].join('/'))) {
    throw new Error(`public tree contains generated credentials: ${path}`)
  }
  const fixtureKey = path.startsWith('vendor/anp-typescript-sdk/tests/fixtures/')
  const exampleEnvironment = path === '.env.example'
  if (!fixtureKey && !exampleEnvironment && /(?:^|\/)(?:\.env(?:\..+)?|.*(?:identity|state).*\.json|.*(?:token|secret).*\.txt|.*\.(?:key|pem))$/iu.test(path)) {
    throw new Error(`public tree contains a credential-shaped file: ${path}`)
  }
  if (!textExtensions.has(extname(path))) continue
  const text = await readFile(file, 'utf8')
  for (const [label, needle] of forbiddenText) {
    if (text.includes(needle)) throw new Error(`public tree contains ${label}: ${path}`)
  }
  if (!fixtureKey && /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u.test(text)) {
    throw new Error(`public tree contains private-key material: ${path}`)
  }
}
console.log('public-tree safety scan passed')
