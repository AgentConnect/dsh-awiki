import { chmod, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AwikiAgentBindingStore } from '../src/agent-bindings.ts'
import type { AwikiIdentity, AwikiIdentityId } from '../src/types.ts'

const roots: string[] = []

async function root(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'dsh-awiki-bindings-'))
  roots.push(path)
  return path
}

function identity(id: string, isDefault = false): AwikiIdentity {
  return {
    identityId: id as AwikiIdentityId,
    did: `did:wba:example.test:${id}` as never,
    handle: `${id}.example.test` as never,
    displayName: id,
    registeredAt: 1,
    isDefault,
  }
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('AwikiAgentBindingStore', () => {
  it('creates stable routes, prefers sessions, and reconciles unbound identities', async () => {
    const store = new AwikiAgentBindingStore(await root())
    const preset = await store.create('Research', { scope: 'preset', key: 'research' })
    expect(preset.created).toBe(true)
    const repeated = await store.create('Ignored', { scope: 'preset', key: 'research' })
    expect(repeated).toEqual({ binding: preset.binding, created: false })
    await store.markReady(preset.binding.bindingId, 'identity-research' as AwikiIdentityId)

    const session = await store.create('Session Agent', { scope: 'session', key: 'session-1' })
    await store.markReady(session.binding.bindingId, 'identity-session' as AwikiIdentityId)
    expect((await store.resolve('session-1', 'research'))?.bindingId).toBe(session.binding.bindingId)
    expect((await store.resolve('session-2', 'research'))?.bindingId).toBe(preset.binding.bindingId)

    const state = await store.reconcile([
      identity('main', true),
      identity('identity-research'),
      identity('identity-session'),
      identity('identity-orphan'),
    ])
    expect(state.bindings).toHaveLength(2)
    expect(state.bindings[0]).toMatchObject({ presetRoutes: ['research'], sessionRouteCount: 0 })
    expect(state.bindings[1]).toMatchObject({ presetRoutes: [], sessionRouteCount: 1 })
    expect(state.unboundIdentities.map(item => item.identityId)).toEqual(['identity-orphan'])
  })

  it('marks missing identities broken, repairs them, and never garbage-collects session routes', async () => {
    const store = new AwikiAgentBindingStore(await root())
    const created = await store.create('Agent', { scope: 'session', key: 'cold-zero-event-session' })
    await store.markReady(created.binding.bindingId, 'identity-agent' as AwikiIdentityId)

    const broken = await store.reconcile([identity('main', true)])
    expect(broken.bindings[0]).toMatchObject({ status: 'broken', sessionRouteCount: 1 })
    const repaired = await store.reconcile([identity('main', true), identity('identity-agent')])
    expect(repaired.bindings[0]).toMatchObject({ status: 'ready', sessionRouteCount: 1 })
    expect((await store.resolve('cold-zero-event-session'))?.bindingId).toBe(created.binding.bindingId)
  })

  it('requires explicit replace and clears only regular Host files', async () => {
    const stateRoot = await root()
    const store = new AwikiAgentBindingStore(stateRoot)
    const first = await store.create('First', { scope: 'session', key: 'session' })
    const second = await store.create('Second', { scope: 'session', key: 'other' })
    await expect(store.attach(second.binding.bindingId, { scope: 'session', key: 'session' }, false))
      .rejects.toThrow('route already exists')
    await store.attach(second.binding.bindingId, { scope: 'session', key: 'session' }, true)
    expect((await store.resolve('session'))?.bindingId).toBe(second.binding.bindingId)

    expect(await store.clear()).toBe(true)
    expect(await store.clear()).toBe(false)
    await expect(readFile(join(stateRoot, '.host', 'agent-bindings-v1.json'), 'utf8'))
      .rejects.toMatchObject({ code: 'ENOENT' })
    expect(first.binding.bindingId).not.toBe(second.binding.bindingId)
  })

  it.runIf(process.platform !== 'win32')('fails closed on binding symlinks', async () => {
    const stateRoot = await root()
    const host = join(stateRoot, '.host')
    await mkdir(host, { mode: 0o700 })
    const outside = join(stateRoot, 'outside')
    await writeFile(outside, '{}\n')
    await symlink(outside, join(host, 'agent-bindings-v1.json'))
    const store = new AwikiAgentBindingStore(stateRoot)
    await expect(store.reconcile([identity('main', true)])).rejects.toThrow('invalid')
  })

  it.runIf(process.platform !== 'win32')('hardens Host directory and binding file permissions', async () => {
    const stateRoot = await root()
    const store = new AwikiAgentBindingStore(stateRoot)
    await store.create('Agent', { scope: 'session', key: 'session' })
    const host = join(stateRoot, '.host')
    const file = join(host, 'agent-bindings-v1.json')
    await chmod(host, 0o755)
    await chmod(file, 0o644)
    await store.reconcile([identity('main', true)])
    expect((await lstat(host)).mode & 0o777).toBe(0o700)
    expect((await lstat(file)).mode & 0o777).toBe(0o600)
  })
})
