import { readFile } from 'node:fs/promises'

const expected = [
  'downloadAttachment',
  'getConfig',
  'getHistory',
  'getIdentity',
  'listConversations',
  'markConversationRead',
  'registerIdentity',
  'resolvePeer',
  'sendAttachment',
  'sendRegistrationOtp',
  'sendText',
  'updateDisplayName',
]

const [host, remote, declaration] = await Promise.all([
  readFile(new URL('../lib/typert.host.js', import.meta.url), 'utf8'),
  readFile(new URL('../lib/typert.remote-client.js', import.meta.url), 'utf8'),
  readFile(new URL('../lib/typert.remote-client.d.ts', import.meta.url), 'utf8'),
])

for (const method of expected) {
  if (!host.includes(`#awiki/${method}'`) || !remote.includes(`#awiki/${method}'`) || !declaration.includes(`${method}:`)) {
    throw new Error(`generated Typert artifacts are missing awiki/${method}`)
  }
}
if (declaration.includes(['@deepseek-ai', 'dsh-awiki'].join('/'))) {
  throw new Error('generated Typert declarations still reference the monorepo package name')
}
console.log(`generated Typert contract: ${expected.length} methods verified`)
