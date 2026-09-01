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
    expect(registry.stateRoot(registry.active())).toContain('/tenant-scopes/official-china-v1/')
    expect(await readFile(registry.filePath, 'utf8')).toContain('AWiki 中国（上海）')
  })

  it('promotes a historical awiki.ai environment in place and preserves its exact root', async () => {
    const stateRoot = await root()
    await mkdir(stateRoot, { recursive: true })
    await writeFile(join(stateRoot, 'identity.db'), 'legacy')
    const registry = AwikiTenantRegistry.open(stateRoot, seed())
    expect(registry.active().tenantId).toBe(AWIKI_GLOBAL_TENANT_ID)
    expect(registry.active().storageLayout).toBe('legacy-base')
    expect(registry.stateRoot(registry.active())).toBe(stateRoot)
    expect(registry.snapshot().tenants).toHaveLength(2)
  })

  it('keeps explicit private deployments on the legacy root without guessing official endpoints', async () => {
    const stateRoot = await root()
    const registry = AwikiTenantRegistry.open(stateRoot, seed('team.example', true))
    expect(registry.active()).toMatchObject({ kind: 'custom', didHost: 'team.example', storageLayout: 'legacy-base' })
    expect(registry.snapshot().tenants).toHaveLength(3)
  })

  it('promotes same-endpoint custom profiles during idempotent official reconciliation', async () => {
    const stateRoot = await root()
    const first = AwikiTenantRegistry.open(stateRoot, seed('awiki.me', true))
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

  it('fails closed to the legacy runtime when an existing control file is invalid', async () => {
    const stateRoot = await root()
    await mkdir(stateRoot, { recursive: true })
    await writeFile(join(stateRoot, 'identity.db'), 'legacy')
    const control = `${stateRoot}.tenant-registry.json`
    await writeFile(control, '{"schemaVersion":999}')
    const registry = AwikiTenantRegistry.open(stateRoot, seed())
    expect(registry.active().storageLayout).toBe('legacy-base')
    expect(registry.snapshot().diagnostic).toBe(registry.diagnosticPath)
    expect(() => registry.commitActive(AWIKI_CHINA_TENANT_ID)).toThrow('read-only')
    expect(await readFile(control, 'utf8')).toBe('{"schemaVersion":999}')
  })
})
