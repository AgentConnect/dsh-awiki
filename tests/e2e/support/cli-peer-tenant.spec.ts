import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, vi } from 'vitest'
import { CliPeer } from '../fixtures/cli-peer.ts'
import { reviewedE2eTargets, type ProtectedE2eConfig } from '../fixtures/protected-config.ts'

it('reuses an endpoint-equivalent built-in tenant and writes only its resolved workspace', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-cli-tenant-'))
  const tenantRoot = join(root, 'workspace', 'tenants', 'existing-builtin')
  const source = 'a'.repeat(40)
  const calls: readonly string[][] = []
  const prototype = CliPeer.prototype as unknown as {
    runWithStdin(args: readonly string[], stdin: string | undefined): Promise<unknown>
  }
  const run = vi.spyOn(prototype, 'runWithStdin').mockImplementation(async args => {
    ;(calls as string[][]).push([...args])
    if (args.includes('version')) return { data: { commit: source } }
    if (args.includes('setup')) return { data: { result: { tenant: { tenant_dir: tenantRoot } } } }
    if (args.includes('register')) return { data: { identity: { did: 'did:example:peer' }, account_id: 'account' } }
    if (args.includes('init')) return { data: {} }
    throw new Error('Unexpected CLI action')
  })
  try {
    const config = { cliBinary: 'unused', cliSourceRef: source, phone: '+10000000000', otp: '000000',
      targetBinding: reviewedE2eTargets['singapore-staging'] } as ProtectedE2eConfig
    const peer = await CliPeer.provision(config, root, 'systestmd0123456789')
    expect(peer.state.did).toBe('did:example:peer')
    expect(calls[1]).toContain('setup')
    expect(calls[2]).toContain('init')
    expect(calls.some(args => args.includes('create') || args.includes('use'))).toBe(false)
    expect(await readFile(join(tenantRoot, 'config.yaml'), 'utf8')).toContain('anpclaw.com')
  } finally {
    run.mockRestore()
    await rm(root, { recursive: true, force: true })
  }
})
