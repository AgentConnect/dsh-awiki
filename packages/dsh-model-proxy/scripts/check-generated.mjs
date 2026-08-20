import { readdir, readFile } from 'node:fs/promises'

const [bundle, declaration, entries] = await Promise.all([
  readFile(new URL('../lib/index.js', import.meta.url), 'utf8'),
  readFile(new URL('../lib/types/index.d.ts', import.meta.url), 'utf8'),
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
if (entries.some(path => /(?:^|\/)model-proxy-contract\./u.test(path))) {
  throw new Error('generated package copied the main AWiki RPC contract')
}
if (entries.some(path => /(?:^|\/)(?:types|session)\.(?:d\.ts|js|map)$/u.test(path))) {
  throw new Error('generated package copied AWiki session or shared types')
}
console.log('model-proxy generated boundary passed')
