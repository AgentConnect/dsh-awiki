import { afterEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { clearLegacySentMailCache } from '../src/legacy-sent-mail-cache.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function root(): Promise<string> {
  const value = await mkdtemp(join(tmpdir(), 'awiki-legacy-sent-cache-'))
  roots.push(value)
  return value
}

describe('legacy sent-mail cache cleanup', () => {
  it('removes only the retired sent-mail directory', async () => {
    const stateRoot = await root()
    await mkdir(join(stateRoot, '.host', 'sent-mail-v1'), { recursive: true })
    await writeFile(join(stateRoot, '.host', 'sent-mail-v1', 'history.json'), 'legacy')
    await writeFile(join(stateRoot, '.host', 'keep.txt'), 'keep')

    await clearLegacySentMailCache(stateRoot)

    await expect(readFile(join(stateRoot, '.host', 'sent-mail-v1', 'history.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(join(stateRoot, '.host', 'keep.txt'), 'utf8')).resolves.toBe('keep')
  })

  it('unlinks a legacy-path symlink without deleting its target', async () => {
    const stateRoot = await root()
    const target = await root()
    await mkdir(join(stateRoot, '.host'), { recursive: true })
    await writeFile(join(target, 'outside.txt'), 'outside')
    await symlink(target, join(stateRoot, '.host', 'sent-mail-v1'))

    await clearLegacySentMailCache(stateRoot)

    await expect(readFile(join(target, 'outside.txt'), 'utf8')).resolves.toBe('outside')
  })
})
