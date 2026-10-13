import { afterEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  AWIKI_CHINA_TENANT_ID,
  AWIKI_GLOBAL_TENANT_ID,
  AwikiTenantRegistry,
  type AwikiTenantLegacySeed,
} from '../src/tenant-registry.ts'

import { AWIKI_BUILTIN_TENANT_CONFIG } from '../src/builtin-tenant-config.ts'
const primary = AWIKI_BUILTIN_TENANT_CONFIG.tenants.primary
const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function root(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'awiki-tenant-registry-'))
  roots.push(path)
  return join(path, 'im-core')
}

function seed(domain = 'awiki.ai', configured = false): AwikiTenantLegacySeed {
  const origin = `https://${domain}`
  return {
    domain,
    configured,
    userServiceUrl: origin,
    messageServiceUrl: origin,
    mailServiceUrl: origin,
    messageServicePublicUrl: origin,
    messageServiceDid: `did:wba:${domain}`,
  }
}

describe('Host-owned tenant registry', () => {
  it('creates both official tenants and activates China for a fresh install', async () => {
    const stateRoot = await root()
    const registry = AwikiTenantRegistry.open(stateRoot, seed())
    const view = registry.snapshot()
    expect(view.activeTenantId).toBe(AWIKI_CHINA_TENANT_ID)
    expect(view.tenants.map(tenant => [tenant.tenantId, tenant.lifecycle])).toEqual([
      [AWIKI_CHINA_TENANT_ID, 'active'],
      [AWIKI_GLOBAL_TENANT_ID, 'inactive'],
    ])
    expect(registry.stateRoot(registry.active())).toContain(`/tenant-scopes/${registry.active().storageScopeId}/`)
    expect(await readFile(registry.filePath, 'utf8')).toContain(primary.displayName['zh-CN'])
  })

  it('migrates legacy official ids in place without moving their storage scopes', async () => {
    const stateRoot = await root()
    const control = `${stateRoot}.tenant-registry.json`
    await writeFile(control, JSON.stringify({
      schemaVersion: 1,
      officialCatalogVersion: 1,
      generation: 7,
      activeTenantId: 'official-global',
      tenants: [
        {
          tenantId: 'official-china', storageScopeId: 'official-china-v1', kind: 'built_in',
          displayName: primary.displayName['zh-CN'], backendBaseUrl: primary.backendOrigin, didHost: primary.didHost,
          lifecycle: 'inactive', storageLayout: 'scope-v1',
          endpoints: seed(primary.didHost),
        },
        {
          tenantId: 'official-global', storageScopeId: 'official-global-v1', kind: 'built_in',
          displayName: 'AWiki Global (Silicon Valley)', backendBaseUrl: 'https://awiki.ai', didHost: 'awiki.ai',
          lifecycle: 'active', storageLayout: 'scope-v1',
          endpoints: seed('awiki.ai'),
        },
      ],
    }))

    const registry = AwikiTenantRegistry.open(stateRoot, seed())
    expect(registry.snapshot()).toMatchObject({ activeTenantId: AWIKI_GLOBAL_TENANT_ID, generation: 7 })
    expect(registry.find(AWIKI_CHINA_TENANT_ID)?.storageScopeId).toBe('official-china-v1')
    expect(registry.find(AWIKI_GLOBAL_TENANT_ID)?.storageScopeId).toBe('official-global-v1')
  })

  it('promotes a historical awiki.ai environment in place and preserves its exact root', async () => {
    const stateRoot = await root()
    await mkdir(stateRoot, { recursive: true })
    await writeFile(join(stateRoot, 'identity.db'), 'legacy')
    const registry = AwikiTenantRegistry.open(stateRoot, seed('awiki.ai', true))
    expect(registry.active().tenantId).toBe(AWIKI_GLOBAL_TENANT_ID)
    expect(registry.active().storageLayout).toBe('legacy-base')
    expect(registry.stateRoot(registry.active())).toBe(stateRoot)
    expect(registry.snapshot().tenants).toHaveLength(2)
  })

  it('preserves the immutable awiki.info endpoint snapshot for pre-registry data', async () => {
    const stateRoot = await root()
    await mkdir(stateRoot, { recursive: true })
    await writeFile(join(stateRoot, 'identity.db'), 'legacy')

    const registry = AwikiTenantRegistry.open(stateRoot, seed('awiki.me'))

    expect(registry.active()).toMatchObject({
      kind: 'custom',
      didHost: 'awiki.info',
      backendBaseUrl: 'https://awiki.info',
      storageLayout: 'legacy-base',
    })
    expect(registry.stateRoot(registry.active())).toBe(stateRoot)
    expect(registry.snapshot().tenants).toHaveLength(3)
  })

  it('allows an explicit one-time legacy slot override', async () => {
    const stateRoot = await root()
    await mkdir(stateRoot, { recursive: true })
    await writeFile(join(stateRoot, 'identity.db'), 'legacy')

    const registry = AwikiTenantRegistry.open(stateRoot, {
      ...seed('awiki.me'),
      legacyTenantSlot: 'primary',
    })

    expect(registry.active()).toMatchObject({
      tenantId: AWIKI_CHINA_TENANT_ID,
      didHost: primary.didHost,
      storageLayout: 'legacy-base',
    })
  })

  it('keeps explicit private deployments on the legacy root without guessing official endpoints', async () => {
    const stateRoot = await root()
    const registry = AwikiTenantRegistry.open(stateRoot, seed('team.example', true))
    expect(registry.active()).toMatchObject({ kind: 'custom', didHost: 'team.example', storageLayout: 'legacy-base' })
    expect(registry.snapshot().tenants).toHaveLength(3)
  })

  it('promotes same-endpoint custom profiles during idempotent official reconciliation', async () => {
    const stateRoot = await root()
    const first = AwikiTenantRegistry.open(stateRoot, seed(primary.didHost, true))
    const storageScopeId = first.active().storageScopeId
    const second = AwikiTenantRegistry.open(stateRoot, seed())
    expect(second.active()).toMatchObject({ tenantId: AWIKI_CHINA_TENANT_ID, storageScopeId, storageLayout: 'legacy-base' })
    expect(second.snapshot().tenants).toHaveLength(2)
  })

  it('uses immutable UUID scopes for custom tenants and never derives their path from the editable name', async () => {
    const stateRoot = await root()
    const registry = AwikiTenantRegistry.open(stateRoot, seed())
    const tenant = registry.createCustom('Team One', 'tenant.example')
    const path = registry.stateRoot(tenant)
    const renamed = registry.renameCustom(tenant.tenantId, 'Renamed Team')
    expect(registry.stateRoot(renamed)).toBe(path)
    expect(path).not.toContain('Team One')
    expect(path).not.toContain('Renamed Team')
    expect(path).not.toContain('tenant.example')
    expect(() => registry.renameCustom(AWIKI_CHINA_TENANT_ID, 'No')).toThrow('official tenants')
  })

  it('backs up before an atomic active-tenant commit and prevents active/archive misuse', async () => {
    const stateRoot = await root()
    const registry = AwikiTenantRegistry.open(stateRoot, seed())
    const initial = await readFile(registry.filePath, 'utf8')
    const custom = registry.createCustom('Private', 'private.example')
    registry.commitActive(custom.tenantId)
    expect(registry.snapshot()).toMatchObject({ activeTenantId: custom.tenantId, generation: 1 })
    expect(await readFile(registry.backupPath, 'utf8')).toBe(initial)
    expect(() => registry.archiveCustom(custom.tenantId)).toThrow('switch away')
    registry.commitActive(AWIKI_CHINA_TENANT_ID)
    registry.archiveCustom(custom.tenantId)
    expect(registry.find(custom.tenantId)?.lifecycle).toBe('archived')
  })

  it('restores the last completely committed tenant and generation after restart', async () => {
    const stateRoot = await root()
    const first = AwikiTenantRegistry.open(stateRoot, seed())
    const globalRoot = first.stateRoot(first.find(AWIKI_GLOBAL_TENANT_ID)!)
    first.commitActive(AWIKI_GLOBAL_TENANT_ID)

    const reopened = AwikiTenantRegistry.open(stateRoot, seed())
    expect(reopened.snapshot()).toMatchObject({
      activeTenantId: AWIKI_GLOBAL_TENANT_ID,
      generation: 1,
      switching: false,
    })
    expect(reopened.stateRoot(reopened.active())).toBe(globalRoot)
  })

  it('does not open any environment when an existing control file is invalid', async () => {
    const stateRoot = await root()
    await mkdir(stateRoot, { recursive: true })
    await writeFile(join(stateRoot, 'identity.db'), 'legacy')
    const control = `${stateRoot}.tenant-registry.json`
    await writeFile(control, '{"schemaVersion":999}')
    expect(() => AwikiTenantRegistry.open(stateRoot, seed())).toThrow('no environment was opened')
    expect(await readFile(control, 'utf8')).toBe('{"schemaVersion":999}')
  })
  it.each(['builtin-primary-v1', 'official-china-v1', 'opaque-historical-scope'])('preserves catalog preference ownership for %s across restart', async (oldScope) => {
    const stateRoot = await root()
    const first = AwikiTenantRegistry.open(stateRoot, seed())
    const old = first.snapshot()
    const tenants = old.tenants.map(t => t.tenantId !== AWIKI_CHINA_TENANT_ID ? t : {
      ...t, storageScopeId: oldScope, didHost: 'old.example', backendBaseUrl: 'https://old.example', endpoints: seed('old.example'),
    })
    await writeFile(first.filePath, JSON.stringify({ ...old, tenants }))
    const migrated = AwikiTenantRegistry.open(stateRoot, seed())
    expect(migrated.active().didHost).toBe('old.example')
    expect(migrated.active().storageScopeId).toBe(oldScope)
    expect(migrated.active().preferenceTenantIds).toEqual([AWIKI_CHINA_TENANT_ID])
    const target = migrated.find(AWIKI_CHINA_TENANT_ID)!
    expect(target.storageScopeId).not.toBe(oldScope)
    migrated.commitActive(target.tenantId)
    const reopened = AwikiTenantRegistry.open(stateRoot, seed())
    expect(reopened.find(`custom-${oldScope}`)?.preferenceTenantIds).toEqual([AWIKI_CHINA_TENANT_ID])
    expect(reopened.active()).toEqual({ ...target, lifecycle: 'active' })
    expect(new Set(reopened.snapshot().tenants.map(t => reopened.stateRoot(t))).size).toBe(3)
  })

  it('repairs the known duplicate only with a unique historical owner, preserving data and backups', async () => {
    const stateRoot = await root()
    const first = AwikiTenantRegistry.open(stateRoot, seed())
    const initial = first.snapshot()
    const current = { ...first.active(), storageScopeId: 'builtin-primary-v1' }
    const historical = { ...current, didHost: 'old.example', backendBaseUrl: 'https://old.example', endpoints: seed('old.example') }
    const backup = { ...initial, tenants: [historical, initial.tenants[1]] }
    await writeFile(first.backupPath, JSON.stringify(backup))
    const preserved = { ...historical, tenantId: 'custom-builtin-primary-v1', kind: 'custom', lifecycle: 'inactive' }
    const broken = JSON.stringify({ ...initial, tenants: [preserved, initial.tenants[1], current] })
    await writeFile(first.filePath, broken)
    const identityDir = join(first.stateRoot(current), 'identities')
    await mkdir(identityDir, { recursive: true })
    const identities = JSON.stringify({ credentials: { old: { did: 'did:wba:old.example:user:one' } } })
    await writeFile(join(identityDir, 'registry.json'), identities)
    const repaired = AwikiTenantRegistry.open(stateRoot, seed())
    expect(repaired.active().storageScopeId).not.toBe('builtin-primary-v1')
    expect(repaired.find(preserved.tenantId)?.storageScopeId).toBe('builtin-primary-v1')
    expect(await readFile(join(identityDir, 'registry.json'), 'utf8')).toBe(identities)
    expect(await readFile(first.filePath + '.pre-scope-repair.bak', 'utf8')).toBe(broken)
    expect(AwikiTenantRegistry.open(stateRoot, seed()).snapshot()).toEqual(repaired.snapshot())
    await writeFile(first.filePath, broken)
    await writeFile(join(identityDir, 'registry.json'), JSON.stringify({ credentials: { foreign: { did: 'did:wba:foreign.example:user:two' } } }))
    expect(() => AwikiTenantRegistry.open(stateRoot, seed())).toThrow('no environment was opened')
    expect(await readFile(first.filePath, 'utf8')).toBe(broken)
  })

})
