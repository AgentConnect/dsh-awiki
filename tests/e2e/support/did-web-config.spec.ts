import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { assertE2eConfigScope, didWebFixtureHandle, loadProtectedE2eConfig, reviewedE2eTargets } from '../fixtures/protected-config.ts'
import { resolveAccountId } from './managed-cleanup.ts'

const roots: string[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

it('distinguishes null RPC errors from an absent Handle and fails closed otherwise', async () => {
  const target = reviewedE2eTargets['rwiki-cn-testing']
  const handle = 'systestmd0123456789.rwiki.cn'
  const fetch = vi.spyOn(globalThis, 'fetch')
  fetch.mockResolvedValue(Response.json({ result: { user_id: 'owned-account', full_handle: handle, domain: target.didDomain }, error: null }))
  await expect(resolveAccountId(handle, target)).resolves.toBe('owned-account')
  fetch.mockResolvedValue(Response.json({ result: null, error: { code: -32002 } }))
  await expect(resolveAccountId(handle, target)).resolves.toBeUndefined()
  for (const payload of [
    { result: null, error: { code: -32000 } },
    { result: { user_id: 'other', full_handle: 'another.rwiki.cn', domain: target.didDomain }, error: null },
    { result: { user_id: 'other', full_handle: handle, domain: 'another.example' }, error: null },
  ]) {
    fetch.mockResolvedValue(Response.json(payload))
    await expect(resolveAccountId(handle, target)).rejects.toThrow()
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
