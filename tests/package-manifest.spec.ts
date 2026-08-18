import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface PackageManifest {
  readonly dependencies?: Readonly<Record<string, string>>
  readonly peerDependencies?: Readonly<Record<string, string>>
  readonly devDependencies?: Readonly<Record<string, string>>
}

const manifest = JSON.parse(readFileSync(
  new URL('../package.json', import.meta.url),
  'utf8',
)) as PackageManifest

const harnessPackage = /^@deepseek-ai\/dsh(?:-|$)/u

describe('published package dependency resolution', () => {
  it('pins every DeepSeek Harness prerelease package to one exact release family', () => {
    const target = manifest.devDependencies?.['@deepseek-ai/dsh']
    expect(target).toBe('0.1.0-rc.7')

    const harnessEntries = [
      ...Object.entries(manifest.dependencies ?? {}),
      ...Object.entries(manifest.peerDependencies ?? {}),
      ...Object.entries(manifest.devDependencies ?? {}),
    ].filter(([name]) => harnessPackage.test(name))

    expect(harnessEntries.length).toBeGreaterThan(0)
    expect(harnessEntries).toEqual(harnessEntries.map(([name]) => [name, target]))
  })

  it('leaves every Host package to the Harness installation instead of owning a duplicate', () => {
    expect(Object.keys(manifest.dependencies ?? {}).filter(name => harnessPackage.test(name))).toEqual([])
  })
})
