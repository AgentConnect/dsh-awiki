import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const expected = [
  'clearLocalData',
  'createGroup',
  'downloadAttachment',
  'getConfig',
  'getHistory',
  'getIdentity',
  'getLocalHistory',
  'getSession',
  'login',
  'listConversations',
  'logout',
  'markConversationRead',
  'registerIdentity',
  'resolvePeer',
  'sendAttachment',
  'sendRegistrationOtp',
  'sendText',
  'summarizeConversation',
  'updateDisplayName',
]

const [host, remote, declaration, client, clientMap, baselineText] = await Promise.all([
  readFile(new URL('../lib/typert.host.js', import.meta.url), 'utf8'),
  readFile(new URL('../lib/typert.remote-client.js', import.meta.url), 'utf8'),
  readFile(new URL('../lib/typert.remote-client.d.ts', import.meta.url), 'utf8'),
  readFile(new URL('../lib/client.js', import.meta.url)),
  readFile(new URL('../lib/client.js.map', import.meta.url)),
  readFile(new URL('../tests/baseline/migration-contract.json', import.meta.url), 'utf8'),
])
const baseline = JSON.parse(baselineText)

for (const method of expected) {
  if (!host.includes(`#awiki/${method}'`) || !remote.includes(`#awiki/${method}'`) || !declaration.includes(`${method}:`)) {
    throw new Error(`generated Typert artifacts are missing awiki/${method}`)
  }
}
const expectedSorted = [...expected].sort()
const generatedMethods = text => [...text.matchAll(/id: '@awiki\/dsh-plugin#awiki\/([^']+)'/gu)]
  .map(match => match[1])
  .sort()
const declaredMethods = [...declaration.matchAll(/'awiki\/([^']+)':/gu)]
  .map(match => match[1])
  .sort()
if (JSON.stringify(generatedMethods(host)) !== JSON.stringify(expectedSorted)) {
  throw new Error('generated Host Typert methods differ from the migration baseline')
}
if (JSON.stringify(generatedMethods(remote)) !== JSON.stringify(expectedSorted)) {
  throw new Error('generated Remote Typert methods differ from the migration baseline')
}
if (JSON.stringify(declaredMethods) !== JSON.stringify(expectedSorted)) {
  throw new Error('generated Typert declarations differ from the migration baseline')
}
if (declaration.includes(['@deepseek-ai', 'dsh-awiki'].join('/'))) {
  throw new Error('generated Typert declarations still reference the monorepo package name')
}
if (declaration.includes("from 'dsh-awiki/")) {
  throw new Error('generated Typert declarations still reference the accidental unscoped package name')
}
if (!declaration.includes("from '@awiki/dsh-plugin/types'")) {
  throw new Error('generated Typert declarations do not reference the canonical scoped package name')
}
for (const [path, content] of [['lib/client.js', client], ['lib/client.js.map', clientMap]]) {
  const actual = createHash('sha256').update(content).digest('hex')
  if (actual !== baseline.clientBundleSha256[path]) {
    throw new Error(`${path} changed from the Rust SDK migration UI baseline`)
  }
}
console.log(`generated Typert contract: ${expected.length} methods verified`)
