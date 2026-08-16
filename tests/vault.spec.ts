import { lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadOrCreateVaultRootKey } from '../src/vault.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('AWiki Rust SecretVault host key', () => {
  it('provisions one private 32-byte key and reuses it across restarts', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'dsh-awiki-vault-'))
    roots.push(parent)
    const stateRoot = join(parent, 'im-core')

    const first = await loadOrCreateVaultRootKey(stateRoot)
    const second = await loadOrCreateVaultRootKey(stateRoot)
    const keyPath = join(stateRoot, '.host', 'vault-root-key')

    expect(first).toHaveLength(32)
    expect(second).toEqual(first)
    expect(await readFile(keyPath)).toEqual(Buffer.from(first))
    if (process.platform !== 'win32') {
      expect((await lstat(stateRoot)).mode & 0o777).toBe(0o700)
      expect((await lstat(keyPath)).mode & 0o777).toBe(0o600)
    }
  })

  it('fails closed for a malformed persisted key', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'dsh-awiki-vault-invalid-'))
    roots.push(parent)
    const stateRoot = join(parent, 'im-core')
    await loadOrCreateVaultRootKey(stateRoot)
    const keyPath = join(stateRoot, '.host', 'vault-root-key')
    await writeFile(keyPath, 'invalid', { mode: 0o600 })

    await expect(loadOrCreateVaultRootKey(stateRoot)).rejects.toThrow(
      'awiki: local vault root key is invalid',
    )
  })
})
