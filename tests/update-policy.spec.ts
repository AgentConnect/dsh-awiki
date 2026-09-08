import { mkdtemp, rm, writeFile } from 'node:fs/promises'
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
            repository: null,
            requires_plugin: null,
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
    expect(compareVersions('1.0.0-1a', '1.0.0-2')).toBeGreaterThan(0)
    expect(compareVersions('9007199254740993.0.0', '9007199254740992.0.0')).toBeGreaterThan(0)
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

describe('manual upgrade discovery', () => {
  it('requires a current revision to clear a cached gate with a disabled product', async () => {
    const options = { tenant: tenant('https://awiki.me', 'china'), generation: 1, stateRoot: await stateRoot(), currentPluginVersion: '0.3.7' }
    await checkAwikiUpdatePolicy({ ...options, fetcher: async () => response('https://awiki.me', manifest('https://awiki.me', 8, '0.3.9', '0.3.8')) })
    const disabled = manifest('https://awiki.me', 7, '0.3.9', '0.3.8')
    const releases = { ...disabled.client_versions, products: { dsh: { enabled: false } } }
    expect(await checkAwikiUpdatePolicy({ ...options, fetcher: async () => response('https://awiki.me', { ...disabled, client_versions: releases }) }))
      .toMatchObject({ restricted: true, checkState: 'failed', usedCache: true })
    releases.policy_revision = 9
    expect(await checkAwikiUpdatePolicy({ ...options, fetcher: async () => response('https://awiki.me', { ...disabled, client_versions: releases }) }))
      .toMatchObject({ restricted: false, checkState: 'unavailable', usedCache: false })
  })

  it('enforces verified live requirements even when the cache directory cannot be written', async () => {
    const blockedRoot = join(await stateRoot(), 'not-a-directory')
    await writeFile(blockedRoot, 'fixture')
    expect(await checkAwikiUpdatePolicy({ tenant: tenant('https://awiki.me', 'china'), generation: 1,
      stateRoot: blockedRoot, currentPluginVersion: '0.3.7',
      fetcher: async () => response('https://awiki.me', manifest('https://awiki.me', 8, '0.3.9', '0.3.8')) }))
      .toMatchObject({ restricted: true, checkState: 'ready', usedCache: false })
  })

  it('distinguishes no release from failure and supports bundled-only compatibility', async () => {
    const root = await stateRoot()
    const options = { tenant: tenant('https://awiki.me', 'china'), generation: 1, stateRoot: root, currentPluginVersion: '0.3.7' }
    const body = manifest('https://awiki.me', 1, '0.3.9', '0.3.8')
    const disabled = { ...body, client_versions: { ...body.client_versions, products: { dsh: { enabled: false } } } }
    expect(await checkAwikiUpdatePolicy({ ...options, fetcher: async () => response('https://awiki.me', disabled) }))
      .toMatchObject({ checkState: 'unavailable', restricted: false })
    expect(await checkAwikiUpdatePolicy({ ...options, fetcher: async () => { throw new Error('offline') } }))
      .toMatchObject({ checkState: 'failed', restricted: false })
    const bundled = { ...disabled, client_versions: { ...disabled.client_versions, products: { dsh: { enabled: false,
      compatibility: { plugin: { recommended_version: '0.3.9', minimum_supported_version: '0.3.8' } } } } } }
    const status = await checkAwikiUpdatePolicy({ ...options, fetcher: async () => response('https://awiki.me', bundled) })
    expect(status).toMatchObject({ checkState: 'ready', restricted: true, updateAvailable: true })
    expect(status.upgradeCommand).toBeUndefined()
    expect(status.pluginTarget).toBeUndefined()
    expect(await checkAwikiUpdatePolicy({ ...options, fetcher: async () => { throw new Error('offline') } }))
      .toMatchObject({ checkState: 'failed', restricted: true, usedCache: true })
  })

  it('produces exact compatible commands and never downgrades a newer component', async () => {
    const root = await stateRoot()
    const options = { tenant: tenant('https://awiki.me', 'china'), generation: 1, stateRoot: root }
    const fetcher = async () => response('https://awiki.me', manifest('https://awiki.me', 1, '0.3.9', '0.3.7'))
    expect((await checkAwikiUpdatePolicy({ ...options, fetcher, currentPluginVersion: '0.3.7', currentModelProxyVersion: '0.1.2' })).upgradeCommand)
      .toBe('dsh plugin add @awiki/dsh-plugin@0.3.9 @awiki/dsh-model-proxy@0.1.3')
    const newer = await checkAwikiUpdatePolicy({ ...options, fetcher, currentPluginVersion: '0.3.10', currentModelProxyVersion: '0.1.4' })
    expect(newer).toMatchObject({ updateAvailable: false })
    expect(newer.upgradeCommand).toBeUndefined()
    const incompatible = await checkAwikiUpdatePolicy({ ...options, fetcher, currentPluginVersion: '0.4.0', currentModelProxyVersion: '0.1.2' })
    expect(incompatible.upgradeCommand).toBeUndefined()
  })

  it('bounds a stalled request and preserves the last confirmed minimum', async () => {
    const root = await stateRoot()
    const options = { tenant: tenant('https://awiki.me', 'china'), generation: 1, stateRoot: root, currentPluginVersion: '0.3.7' }
    await checkAwikiUpdatePolicy({ ...options, fetcher: async () => response('https://awiki.me', manifest('https://awiki.me', 1, '0.3.9', '0.3.8')) })
    expect(await checkAwikiUpdatePolicy({ ...options, timeoutMs: 10, fetcher: () => new Promise(() => {}) }))
      .toMatchObject({ checkState: 'failed', usedCache: true, restricted: true })
  })

  it('does not start an already-cancelled request and stops an oversized response', async () => {
    const options = { tenant: tenant('https://awiki.me', 'china'), generation: 1, stateRoot: await stateRoot() }
    const fetcher = vi.fn(async () => Response.json({}))
    await expect(checkAwikiUpdatePolicy({ ...options, signal: AbortSignal.abort(new Error('cancelled')), fetcher })).rejects.toThrow('cancelled')
    expect(fetcher).not.toHaveBeenCalled()
    const cancel = vi.fn()
    const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(1024 * 1024 + 1)) }, cancel }))
    expect(await checkAwikiUpdatePolicy({ ...options, fetcher: async () => response })).toMatchObject({ checkState: 'failed', restricted: false })
    expect(cancel).toHaveBeenCalledOnce()
  })
})
