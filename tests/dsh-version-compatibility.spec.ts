import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface PackageManifest {
  readonly dependencies: Readonly<Record<string, string>>
  readonly peerDependencies: Readonly<Record<string, string>>
}

const manifest = JSON.parse(readFileSync(
  new URL('../package.json', import.meta.url),
  'utf8',
)) as PackageManifest

describe('DSH version compatibility declaration', () => {
  it('keeps rc.5 as the minimum DSH prerelease for runtime and peer dependencies', () => {
    expect(manifest.dependencies['@deepseek-ai/dsh-settings']).toBe('^0.1.0-rc.5')
    expect(Object.entries(manifest.peerDependencies)
      .filter(([name]) => name.startsWith('@deepseek-ai/dsh-'))
      .map(([, range]) => range))
      .toEqual(expect.arrayContaining(['^0.1.0-rc.5']))
    expect(Object.entries(manifest.peerDependencies)
      .filter(([name]) => name.startsWith('@deepseek-ai/dsh-'))
      .every(([, range]) => range === '^0.1.0-rc.5'))
      .toBe(true)
  })
})
