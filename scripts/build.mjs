import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
let tenantConfig = resolve('config/builtin-tenants.default.json')
for (let index = 0; index < args.length; index += 1) {
  if (args[index] !== '--tenant-config' || args[index + 1] === undefined) {
    throw new Error(`unknown or incomplete build argument: ${args[index] ?? ''}`)
  }
  tenantConfig = resolve(args[index + 1])
  index += 1
}
const value = JSON.parse(readFileSync(tenantConfig, 'utf8'))
if (value?.schema_version !== 1 || !['primary', 'secondary'].includes(value.default_slot)
  || value.tenants === null || typeof value.tenants !== 'object'
  || Object.keys(value.tenants).sort().join(',') !== 'primary,secondary') {
  throw new Error('invalid AWiki built-in tenant config')
}
const endpoints = ['primary', 'secondary'].map((slot) => {
  const entry = value.tenants[slot]
  if (entry?.display_name === null || typeof entry?.display_name !== 'object'
    || typeof entry.display_name['zh-CN'] !== 'string' || entry.display_name['zh-CN'].trim() === ''
    || typeof entry.display_name.en !== 'string' || entry.display_name.en.trim() === ''
    || typeof entry.backend_origin !== 'string' || typeof entry.did_host !== 'string') {
    throw new Error(`invalid AWiki built-in tenant ${slot}`)
  }
  const origin = new URL(entry.backend_origin)
  const loopback = origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
  if ((origin.protocol !== 'https:' && !loopback) || origin.username !== '' || origin.password !== ''
    || origin.pathname !== '/' || origin.search !== '' || origin.hash !== ''
    || (!loopback && origin.port !== '')
    || origin.hostname !== entry.did_host.trim().toLowerCase().replace(/\.$/u, '')) {
    throw new Error(`invalid AWiki built-in tenant endpoint ${slot}`)
  }
  return origin.origin
})
if (new Set(endpoints).size !== 2) throw new Error('AWiki built-in tenant endpoints must be distinct')
const result = spawnSync('pnpm', ['run', 'build:raw'], {
  stdio: 'inherit',
  env: { ...process.env, DSH_AWIKI_TENANT_CONFIG_PATH: tenantConfig },
})
if (result.error !== undefined) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
const raw = readFileSync(tenantConfig)
const digest = createHash('sha256').update(raw).digest('hex')
writeFileSync('lib/builtin-tenants.json', raw)
writeFileSync('lib/builtin-tenants.sha256', `${digest}\n`)
console.log(`Embedded AWiki tenant config SHA-256: ${digest}`)
