import { createHash } from 'node:crypto'
import { chmod, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadProtectedE2eConfig } from './e2e/fixtures/protected-config.ts'
import {
  createPrivateLedger,
  recordResource,
  redactLedger,
  updateResourceStatus,
} from './e2e/fixtures/resource-ledger.ts'
import { scanArtifacts } from './e2e/support/secret-scan.ts'
import { cleanupInvocationFor } from './e2e/support/managed-cleanup.ts'
import { isReviewedConnectRequest } from './e2e/support/ssh-connect-proxy.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function fixtureRoot(label: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `dsh-awiki-${label}-`))
  roots.push(root)
  return root
}

async function protectedConfigFixture(): Promise<{ root: string; config: string; cli: string }> {
  const root = await fixtureRoot('protected-config')
  const cli = join(root, 'awiki-cli')
  await writeFile(cli, '#!/bin/sh\nexit 0\n', { mode: 0o700 })
  const digest = createHash('sha256').update(await readFile(cli)).digest('hex')
  const config = join(root, 'e2e.local.json')
  await writeFile(config, `${JSON.stringify({
    schemaVersion: 1,
    target: 'rwiki-cn-testing',
    phone: '+10000000000',
    otp: '000000',
    handlePrefix: 'dshfixture',
    cliBinary: cli,
    cliSourceRef: 'a'.repeat(40),
    cliSha256: digest,
  })}\n`, { mode: 0o600 })
  return { root, config, cli }
}

describe('DSH Web E2E protected configuration', () => {
  it('loads one strict 0600 config and verifies the CLI bytes', async () => {
    const fixture = await protectedConfigFixture()
    await expect(loadProtectedE2eConfig(fixture.config)).resolves.toMatchObject({
      target: 'rwiki-cn-testing',
      handlePrefix: 'dshfixture',
      cliBinary: fixture.cli,
      cliSourceRef: 'a'.repeat(40),
    })
  })

  it('rejects permissive files, symlinks, unknown fields, and digest drift', async () => {
    const fixture = await protectedConfigFixture()
    await chmod(fixture.config, 0o640)
    await expect(loadProtectedE2eConfig(fixture.config)).rejects.toThrow('permissions must be 0600')
    await chmod(fixture.config, 0o600)
    const link = join(fixture.root, 'config-link.json')
    await symlink(fixture.config, link)
    await expect(loadProtectedE2eConfig(link)).rejects.toThrow('non-symlink')
    const source = JSON.parse(await readFile(fixture.config, 'utf8')) as Record<string, unknown>
    source.unexpected = true
    await writeFile(fixture.config, JSON.stringify(source), { mode: 0o600 })
    await expect(loadProtectedE2eConfig(fixture.config)).rejects.toThrow('unknown field unexpected')
    delete source.unexpected
    source.cliBinary = 'relative/awiki-cli'
    await writeFile(fixture.config, JSON.stringify(source), { mode: 0o600 })
    await expect(loadProtectedE2eConfig(fixture.config)).rejects.toThrow('cliBinary must be absolute')
    source.cliBinary = fixture.cli
    source.cliSha256 = 'b'.repeat(64)
    await writeFile(fixture.config, JSON.stringify(source), { mode: 0o600 })
    await expect(loadProtectedE2eConfig(fixture.config)).rejects.toThrow('SHA-256 mismatch')
  })
})

describe('DSH Web E2E managed cleanup routing', () => {
  it('routes macOS through the fixed Ali bridge without secret-bearing arguments', () => {
    const invocation = cleanupInvocationFor('darwin')
    expect(invocation.command).toBe('ssh')
    expect(invocation.args[0]).toBe('ali')
    expect(invocation.args.join(' ')).toContain('helpers.dsh_e2e_cleanup')
    expect(invocation.args.join(' ')).not.toMatch(/phone|otp|token/iu)
  })

  it('keeps Linux on the reviewed local managed operator', () => {
    expect(cleanupInvocationFor('linux')).toMatchObject({ command: 'uv' })
  })
})

describe('DSH Web E2E macOS SSH proxy', () => {
  it('accepts only the reviewed RWiki TLS CONNECT target', () => {
    expect(isReviewedConnectRequest('CONNECT rwiki.cn:443 HTTP/1.1')).toBe(true)
    expect(isReviewedConnectRequest('CONNECT awiki.info:443 HTTP/1.1')).toBe(false)
    expect(isReviewedConnectRequest('GET https://rwiki.cn/ HTTP/1.1')).toBe(false)
  })
})

describe('DSH Web E2E resource evidence', () => {
  it('keeps exact identifiers private and emits only redacted counts', async () => {
    const root = await fixtureRoot('ledger')
    const path = join(root, 'private.json')
    await createPrivateLedger(path, '20260831T000000Z-aaaaaaaa', 'rwiki-cn-testing')
    await recordResource(path, {
      kind: 'identity',
      identifier: 'did:wba:rwiki.cn:private-fixture',
      status: 'pending',
      reasonCode: 'created',
    })
    await recordResource(path, {
      kind: 'local_root',
      identifier: '/tmp/private-fixture-root',
      status: 'cleaned',
      reasonCode: 'local_root_removed',
    })
    await updateResourceStatus(
      path,
      'identity',
      'did:wba:rwiki.cn:private-fixture',
      'residual',
      'public_delete_unavailable',
    )
    const redacted = await redactLedger(path)
    expect(redacted.counts).toEqual({ identity: 1, group: 0, message: 0, local_root: 1 })
    expect(redacted.cleanup).toEqual({ pending: 0, cleaned: 1, partial: 0, residual: 1 })
    expect(JSON.stringify(redacted)).not.toContain('private-fixture')
  })

  it('requires exact-one status updates', async () => {
    const root = await fixtureRoot('ledger-exact')
    const path = join(root, 'private.json')
    await createPrivateLedger(path, '20260831T000000Z-bbbbbbbb', 'rwiki-cn-testing')
    await expect(updateResourceStatus(
      path,
      'identity',
      'missing',
      'cleaned',
      'removed',
    )).rejects.toThrow('not exact-one')
  })
})

describe('DSH Web E2E artifact secret scan', () => {
  it('passes closed public evidence and rejects exact or shaped secrets', async () => {
    const root = await fixtureRoot('artifacts')
    await writeFile(join(root, 'clean.json'), JSON.stringify({ status: 'passed', target: 'rwiki-cn-testing' }))
    await expect(scanArtifacts(root, ['+10000000000', '000000'])).resolves.toMatchObject({ hits: [] })
    await writeFile(join(root, 'leak.log'), 'phone=+10000000000\nauthorization: Bearer fixture-token\n')
    const result = await scanArtifacts(root, ['+10000000000', '000000'])
    expect(result.hits).toContain('leak.log')
  })
})
