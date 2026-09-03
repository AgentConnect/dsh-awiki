import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkAwikiUpdatePolicy, compareVersions } from '../src/update-policy.ts'
import type { AwikiTenantProfile } from '../src/tenant-registry.ts'

const roots: string[] = []
const INTEGRITY = `sha512-${Buffer.alloc(64).toString('base64')}`

afterEach(async () => {
  await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function stateRoot(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'dsh-awiki-update-'))
  roots.push(path)
  return path
}

function tenant(origin: string, tenantId: string, kind: 'built_in' | 'custom' = 'built_in'): AwikiTenantProfile {
  const host = new URL(origin).hostname
  return {
    tenantId,
    storageScopeId: `${tenantId}-v1`,
    kind,
    displayName: tenantId,
    backendBaseUrl: origin,
    didHost: host,
    lifecycle: 'active',
    storageLayout: 'scope-v1',
    endpoints: {
      userServiceUrl: origin,
      messageServiceUrl: origin,
      mailServiceUrl: origin,
      messageServicePublicUrl: origin,
      messageServiceDid: `did:wba:${host}`,
    },
  }
}

function manifest(origin: string, revision: number, recommended: string, minimum: string) {
  return {
    schema_version: 1,
    client_versions: {
      schema_version: 1,
      channel: 'stable',
      policy_origin: origin,
      policy_revision: revision,
      published_at: '2026-09-01T00:00:00.000Z',
      products: {
        app: { enabled: false },
        cli: { enabled: false },
        dsh: {
          enabled: true,
          release_notes_url: `${origin}/downloads/dsh-awiki/releases/${recommended}`,
          plugin: {
            enabled: true,
            package_name: '@awiki/dsh-plugin',
            recommended_version: recommended,
            minimum_supported_version: minimum,
            integrity: INTEGRITY,
          },
          model_proxy: {
            enabled: true,
            package_name: '@awiki/dsh-model-proxy',
            recommended_version: '0.1.3',
            minimum_supported_version: '0.1.2',
            integrity: INTEGRITY,
            requires_plugin: '^0.3.0',
          },
        },
      },
    },
  }
}

function response(origin: string, body: unknown, status = 200): Response {
  const value = new Response(JSON.stringify(body), { status })
  Object.defineProperty(value, 'url', {
    configurable: true,
    value: `${origin}/user-service/v1/server-info?client_platform=dsh`,
  })
  return value
}

describe('tenant-scoped AWiki plugin update policy', () => {
  it('uses complete SemVer precedence for minimum-version gates', () => {
    expect(compareVersions('1.0.0-beta.2', '1.0.0-beta.11')).toBeLessThan(0)
    expect(compareVersions('1.0.0-rc.1', '1.0.0')).toBeLessThan(0)
    expect(compareVersions('1.0.0+build.2', '1.0.0+build.9')).toBe(0)
    expect(() => compareVersions('1.0.0-01', '1.0.0')).toThrow('semantic version')
  })
  it('keeps China and Global policy caches and minimum gates independent', async () => {
    const root = await stateRoot()
    const china = tenant('https://awiki.me', 'official-china')
    const global = tenant('https://awiki.ai', 'official-global')
    const chinaOnline = await checkAwikiUpdatePolicy({
      tenant: china,
      generation: 1,
      stateRoot: root,
      currentPluginVersion: '0.3.7',
      fetcher: vi.fn(async () => response('https://awiki.me', manifest('https://awiki.me', 4, '0.3.7', '0.3.6'))) as typeof fetch,
    })
    const globalOnline = await checkAwikiUpdatePolicy({
      tenant: global,
      generation: 2,
      stateRoot: root,
      currentPluginVersion: '0.3.7',
      fetcher: vi.fn(async () => response('https://awiki.ai', manifest('https://awiki.ai', 9, '0.3.8', '0.3.8'))) as typeof fetch,
    })
    expect(chinaOnline).toMatchObject({ policyRevision: 4, restricted: false, usedCache: false })
    expect(globalOnline).toMatchObject({ policyRevision: 9, restricted: true, usedCache: false })

    const offline = vi.fn(async () => { throw new Error('offline') }) as typeof fetch
    await expect(checkAwikiUpdatePolicy({
      tenant: china, generation: 3, stateRoot: root, currentPluginVersion: '0.3.7', fetcher: offline,
    })).resolves.toMatchObject({ policyRevision: 4, restricted: false, usedCache: true })
    await expect(checkAwikiUpdatePolicy({
      tenant: global, generation: 4, stateRoot: root, currentPluginVersion: '0.3.7', fetcher: offline,
    })).resolves.toMatchObject({ policyRevision: 9, restricted: true, usedCache: true })
  })

  it('rejects revision rollback and cross-origin responses in favor of the same tenant cache', async () => {
    const root = await stateRoot()
    const china = tenant('https://awiki.me', 'official-china')
    await checkAwikiUpdatePolicy({
      tenant: china,
      generation: 1,
      stateRoot: root,
      fetcher: vi.fn(async () => response('https://awiki.me', manifest('https://awiki.me', 3, '0.3.8', '0.3.7'))) as typeof fetch,
    })
    await expect(checkAwikiUpdatePolicy({
      tenant: china,
      generation: 2,
      stateRoot: root,
      fetcher: vi.fn(async () => response('https://awiki.me', manifest('https://awiki.me', 2, '0.3.7', '0.3.6'))) as typeof fetch,
    })).resolves.toMatchObject({ policyRevision: 3, usedCache: true })
    await expect(checkAwikiUpdatePolicy({
      tenant: china,
      generation: 3,
      stateRoot: root,
      fetcher: vi.fn(async () => response('https://evil.example', manifest('https://awiki.me', 4, '0.3.9', '0.3.9'))) as typeof fetch,
    })).resolves.toMatchObject({ policyRevision: 3, usedCache: true })
  })

  it('treats a custom tenant without a policy as unmanaged instead of restricted', async () => {
    const root = await stateRoot()
    const custom = tenant('https://team.example', 'custom-team', 'custom')
    await expect(checkAwikiUpdatePolicy({
      tenant: custom,
      generation: 1,
      stateRoot: root,
      fetcher: vi.fn(async () => response('https://team.example', {}, 404)) as typeof fetch,
    })).resolves.toMatchObject({
      policyUnavailable: true,
      offline: false,
      restricted: false,
      usedCache: false,
    })
  })

  it('clears an earlier custom-tenant gate when that tenant removes its policy', async () => {
    const root = await stateRoot()
    const custom = tenant('https://team.example', 'custom-team', 'custom')
    await checkAwikiUpdatePolicy({
      tenant: custom,
      generation: 1,
      stateRoot: root,
      currentPluginVersion: '0.3.7',
      fetcher: vi.fn(async () => response(
        'https://team.example',
        manifest('https://team.example', 1, '0.3.9', '0.3.8'),
      )) as typeof fetch,
    })

    await expect(checkAwikiUpdatePolicy({
      tenant: custom,
      generation: 2,
      stateRoot: root,
      currentPluginVersion: '0.3.7',
      fetcher: vi.fn(async () => response('https://team.example', {}, 404)) as typeof fetch,
    })).resolves.toMatchObject({
      policyUnavailable: true,
      offline: false,
      restricted: false,
      usedCache: false,
    })

    await expect(checkAwikiUpdatePolicy({
      tenant: custom,
      generation: 3,
      stateRoot: root,
      currentPluginVersion: '0.3.7',
      fetcher: vi.fn(async () => { throw new Error('offline') }) as typeof fetch,
    })).resolves.toMatchObject({ policyUnavailable: true, restricted: false, usedCache: false })
  })
})
