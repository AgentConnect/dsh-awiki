import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface PackageManifest {
  readonly name: string
  readonly version: string
  readonly dsh?: Readonly<Record<string, unknown>>
  readonly dependencies?: Readonly<Record<string, string>>
  readonly peerDependencies?: Readonly<Record<string, string>>
  readonly devDependencies?: Readonly<Record<string, string>>
}

const manifest = JSON.parse(readFileSync(
  new URL('../package.json', import.meta.url),
  'utf8',
)) as PackageManifest

describe('independent model-proxy package manifest', () => {
  it('owns an independent version and remains Host-only', () => {
    expect(manifest.name).toBe('@awiki/dsh-model-proxy')
    expect(manifest.version).toBe('0.1.0')
    expect(manifest.dsh).toEqual({ bundle: { patch: './cordis.patch.yml' } })
    expect(manifest.dsh).not.toHaveProperty('client')
  })

  it('uses the main AWiki package only through a public peer boundary', () => {
    expect(manifest.peerDependencies?.['@awiki/dsh-plugin']).toBe('^0.3.0')
    expect(manifest.devDependencies?.['@awiki/dsh-plugin']).toBe('workspace:*')
    expect(manifest.dependencies?.['@awiki/dsh-plugin']).toBeUndefined()

    const source = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8')
    expect(source).toContain("from '@awiki/dsh-plugin/model-proxy-contract'")
    expect(source).toContain("from '@awiki/dsh-plugin/types'")
    expect(source).not.toMatch(/from ['"]\.\.\//u)
  })

  it('declares every imported Harness package as an exact rc.7 peer', () => {
    const imported = new Set<string>()
    for (const path of globSync('**/*.ts', { cwd: new URL('../src/', import.meta.url) })) {
      const source = readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
      for (const match of source.matchAll(/['"](@deepseek-ai\/dsh(?:-[a-z0-9-]+)?)(?:\/[^'"]*)?['"]/gu)) {
        if (match[1] !== undefined) imported.add(match[1])
      }
    }

    expect([...imported].sort()).toEqual([
      '@deepseek-ai/dsh-agent-default-model',
      '@deepseek-ai/dsh-anonymous-user-id',
      '@deepseek-ai/dsh-client-connection',
      '@deepseek-ai/dsh-credentials',
      '@deepseek-ai/dsh-llm',
      '@deepseek-ai/dsh-llm-deepseek',
      '@deepseek-ai/dsh-settings',
    ])
    for (const name of imported) expect(manifest.peerDependencies?.[name]).toBe('0.1.0-rc.7')
  })
})
