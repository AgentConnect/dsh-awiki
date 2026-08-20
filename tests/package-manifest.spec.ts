import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface PackageManifest {
  readonly dependencies?: Readonly<Record<string, string>>
  readonly peerDependencies?: Readonly<Record<string, string>>
  readonly peerDependenciesMeta?: Readonly<Record<string, { readonly optional?: boolean }>>
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

  it('declares every Harness package imported by published source as a peer dependency', () => {
    const sourceRoot = new URL('../src/', import.meta.url)
    const imported = new Set<string>()
    for (const path of [
      ...globSync('**/*.ts', { cwd: sourceRoot }),
      ...globSync('**/*.tsx', { cwd: sourceRoot }),
    ]) {
      const source = readFileSync(new URL(path, sourceRoot), 'utf8')
      for (const match of source.matchAll(/['"](@deepseek-ai\/dsh(?:-[a-z0-9-]+)?)(?:\/[^'"]*)?['"]/gu)) {
        if (match[1] !== undefined) imported.add(match[1])
      }
    }

    expect([...imported]
      .filter(name => manifest.peerDependencies?.[name] === undefined)
      .sort())
      .toEqual([])
  })

  it('does not retain runtime peers owned only by the standalone model-proxy package', () => {
    for (const name of [
      '@deepseek-ai/dsh-anonymous-user-id',
      '@deepseek-ai/dsh-credentials',
      '@deepseek-ai/dsh-llm-deepseek',
    ]) {
      expect(manifest.peerDependencies?.[name]).toBeUndefined()
      expect(manifest.devDependencies?.[name]).toBeUndefined()
    }
  })

  it('types the optional listener workspace against the exact Host release', () => {
    const target = manifest.devDependencies?.['@deepseek-ai/dsh']
    expect(manifest.peerDependencies?.['@deepseek-ai/dsh-workspace']).toBe(target)
    expect(manifest.peerDependenciesMeta?.['@deepseek-ai/dsh-workspace']).toEqual({ optional: true })
    expect(manifest.devDependencies?.['@deepseek-ai/dsh-workspace']).toBe(target)
    expect(manifest.dependencies?.['@deepseek-ai/dsh-workspace']).toBeUndefined()
  })
})
