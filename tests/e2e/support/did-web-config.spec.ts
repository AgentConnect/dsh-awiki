import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { assertE2eConfigScope, didWebFixtureHandle, loadProtectedE2eConfig, mayDiscardDidWebState, reviewedE2eTargets } from '../fixtures/protected-config.ts'
import { resolveAccountId, selectedSystemTestRoot } from './managed-cleanup.ts'

vi.mock('node:child_process', async importOriginal => ({
  ...await importOriginal<typeof import('node:child_process')>(),
  spawn: vi.fn(() => { throw new Error('Unit tests must not launch remote commands') }),
}))
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!
const roots: string[] = []
afterEach(async () => {
  Object.defineProperty(process, 'platform', originalPlatform)
  vi.restoreAllMocks()
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

it.each(['linux', 'darwin'])('distinguishes RPC errors without external requests on %s', async platform => {
  Object.defineProperty(process, 'platform', { ...originalPlatform, value: platform })
  const target = reviewedE2eTargets['rwiki-cn-testing']
  const handle = 'systestmd0123456789.rwiki.cn'
  const fetch = vi.spyOn(globalThis, 'fetch')
  const reply = (payload: unknown) => {
    fetch.mockResolvedValue(Response.json(payload))
    vi.mocked(spawn).mockImplementation((() => {
      const child = new EventEmitter() as any
      child.stdout = new PassThrough()
      child.stdin = new PassThrough()
      child.kill = vi.fn()
      child.stdin.on('finish', () => queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from(JSON.stringify(payload)))
        child.emit('exit', 0)
      }))
      return child
    }) as typeof spawn)
  }
  reply({ result: { user_id: 'owned-account', full_handle: handle, domain: target.didDomain }, error: null })
  await expect(resolveAccountId(handle, target)).resolves.toBe('owned-account')
  reply({ result: null, error: { code: -32002 } })
  await expect(resolveAccountId(handle, target)).resolves.toBeUndefined()
  for (const payload of [
    { result: null, error: { code: -32000 } },
    { result: { user_id: 'other', full_handle: 'another.rwiki.cn', domain: target.didDomain }, error: null },
    { result: { user_id: 'other', full_handle: handle, domain: 'another.example' }, error: null },
  ]) {
    reply(payload)
    await expect(resolveAccountId(handle, target)).rejects.toThrow()
  }
  if (platform === 'darwin') {
    expect(fetch).not.toHaveBeenCalled()
    expect(spawn).toHaveBeenCalled()
  } else {
    expect(fetch).toHaveBeenCalled()
    expect(spawn).not.toHaveBeenCalled()
  }
})

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-web-config-unit-'))
  roots.push(root)
  const cli = join(root, 'cli')
  const bytes = '#!/bin/sh\nexit 1\n'
  await writeFile(cli, bytes, { mode: 0o700 })
  const values = {
    schemaVersion: 2, scope: 'did-method-web', target: 'rwiki-cn-testing',
    phone: '+10000000000', otp: '000000', handlePrefix: 'systestmd', cliBinary: cli,
    cliSourceRef: 'a'.repeat(40), cliSha256: createHash('sha256').update(bytes).digest('hex'),
  }
  const path = join(root, 'config.json')
  await writeFile(path, JSON.stringify(values), { mode: 0o600 })
  return { path, values }
}

it('loads only the protected Web prerequisites and fences every other case', async () => {
  const { path } = await fixture()
  const config = await loadProtectedE2eConfig(path)
  expect(config.scope).toBe('did-method-web')
  expect(config.modelReceiptProducer).toBe('')
  expect(config.mailReceiptProducer).toBe('')
  expect(() => assertE2eConfigScope(config, ['DSH-WEB-DID-WEB-001'])).not.toThrow()
  for (const ids of [[], ['DSH-WEB-MODEL-RECOVERY-001'], ['DSH-WEB-DID-WEB-001', 'DSH-WEB-DIRECT-001']]) {
    expect(() => assertE2eConfigScope(config, ids)).toThrow('cannot run other')
  }
})

it('retains full-config requirements and exact source/config checks', async () => {
  const { path, values } = await fixture()
  for (const change of [{ scope: undefined }, { scope: 'other' }, { cliSha256: 'b'.repeat(64) }, { handlePrefix: 'ordinary' }]) {
    await writeFile(path, JSON.stringify({ ...values, ...change }), { mode: 0o600 })
    await expect(loadProtectedE2eConfig(path)).rejects.toThrow()
  }
})

it('uses distinct stable role handles in the exact managed cleanup namespace', () => {
  const handles = ['dsh', 'cli', 'web'].map(role => didWebFixtureHandle('systestmd', 'fixture-run', role))
  expect(new Set(handles).size).toBe(3)
  for (const handle of handles) expect(handle).toMatch(/^systestmd[0-9a-f]{10}$/u)
  expect(didWebFixtureHandle('systestmd', 'fixture-run', 'web')).toBe(handles[2])
  expect(() => didWebFixtureHandle('ordinary', 'fixture-run', 'web')).toThrow()
})

it('retains Web candidates on UI failure or unconfirmed remote cleanup', () => {
  expect(mayDiscardDidWebState('did-method-web', 0, true)).toBe(true)
  expect(mayDiscardDidWebState('did-method-web', 1, true)).toBe(false)
  expect(mayDiscardDidWebState('did-method-web', 0, false)).toBe(false)
  expect(mayDiscardDidWebState('did-method-web', 1, false)).toBe(false)
  expect(mayDiscardDidWebState(undefined, 1, false)).toBe(true)
})

it('keeps the owning cleanup repository explicit across source snapshots', () => {
  expect(selectedSystemTestRoot('/task/dsh-awiki', {})).toBe('/task/awiki-system-test')
  expect(selectedSystemTestRoot('/snapshot/dsh-awiki', { DSH_AWIKI_E2E_SYSTEM_TEST_ROOT: '/task/awiki-system-test' })).toBe('/task/awiki-system-test')
  expect(() => selectedSystemTestRoot('/snapshot/dsh-awiki', { DSH_AWIKI_E2E_SYSTEM_TEST_ROOT: '../other' })).toThrow()
})
