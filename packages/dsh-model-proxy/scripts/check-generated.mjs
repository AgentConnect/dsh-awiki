import { readdir, readFile } from 'node:fs/promises'

const [bundle, clientBundle, clientMap, declaration, clientDeclaration, entries] = await Promise.all([
  readFile(new URL('../lib/index.js', import.meta.url), 'utf8'),
  readFile(new URL('../lib/client.js', import.meta.url), 'utf8'),
  readFile(new URL('../lib/client.js.map', import.meta.url), 'utf8'),
  readFile(new URL('../lib/types/index.d.ts', import.meta.url), 'utf8'),
  readFile(new URL('../lib/types/client/index.d.ts', import.meta.url), 'utf8'),
  readdir(new URL('../lib/', import.meta.url), { recursive: true }),
])

for (const specifier of [
  '@awiki/dsh-plugin/model-proxy-contract',
]) {
  if (!bundle.includes(specifier) && !declaration.includes(specifier)) {
    throw new Error(`generated artifacts are missing public dependency ${specifier}`)
  }
}
if (bundle.includes('../../src/') || declaration.includes('../../src/')) {
  throw new Error('generated artifacts contain a source-relative package import')
}
for (const [label, artifact] of [
  ['Browser bundle', clientBundle],
  ['Browser source map', clientMap],
  ['Browser declaration', clientDeclaration],
]) {
  if (artifact.includes('../../../src/')) throw new Error(`${label} crosses the package source boundary`)
}
for (const required of [
  '@awiki/dsh-model-proxy',
  'awiki-model-proxy',
  '快速充值',
  '账户与充值',
  '用量明细',
  'Awiki托管的模型来自DeepSeek官方API，收费标准与DeepSeek官方保持一致',
]) {
  if (!clientBundle.includes(required)) throw new Error(`generated Browser bundle is missing ${required}`)
}
if (entries.some(path => /(?:^|\/)model-proxy-contract\./u.test(path))) {
  throw new Error('generated package copied the main AWiki RPC contract')
}
if (entries.some(path => /(?:^|\/)(?:types|session)\.(?:d\.ts|js|map)$/u.test(path))) {
  throw new Error('generated package copied AWiki session or shared types')
}
console.log('model-proxy generated boundary passed')
