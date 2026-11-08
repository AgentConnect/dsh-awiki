import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TenantCapabilityCache } from '../src/tenant-capability-cache.ts'

describe('Host service metadata restart cache', () => {
  it('restores only matching endpoints and scope, tolerates corruption and uses restricted files', () => {
    const root = mkdtempSync(join(tmpdir(), 'awiki-capability-cache-'))
    try {
      const metadata = { handleRecoveryPhoneEnabled: true, modelProxyBaseUrl: 'https://model.example' }
      const cache = new TenantCapabilityCache(root, 'https://tenant.example')
      expect(cache.write(metadata)).toBe(true)
      expect(new TenantCapabilityCache(root, 'https://tenant.example').read(value => value)).toEqual(metadata)
      expect(new TenantCapabilityCache(root, 'https://other.example').read(value => value)).toBeUndefined()
      expect(new TenantCapabilityCache(join(root, 'other'), 'https://tenant.example').read(value => value)).toBeUndefined()
      const directory = join(root, 'cache', 'tenant-capabilities-v1')
      const path = join(directory, readdirSync(directory)[0]!)
      if (process.platform !== 'win32') expect(statSync(path).mode & 0o777).toBe(0o600)
      expect(readFileSync(path, 'utf8')).not.toContain('generation')
      writeFileSync(path, 'corrupt')
      expect(cache.read(value => value)).toBeUndefined()
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
  it('retains validation authority on restore', () => {
    const root = mkdtempSync(join(tmpdir(), 'awiki-capability-cache-'))
    try {
      const cache = new TenantCapabilityCache(root, 'https://tenant.example')
      cache.write({ handleRecoveryPhoneEnabled: true, modelProxyBaseUrl: 'http://unsafe.example' })
      expect(cache.read(() => { throw new Error('invalid endpoint') })).toBeUndefined()
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
})
