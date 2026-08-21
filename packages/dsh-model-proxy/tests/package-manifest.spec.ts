import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface PackageManifest {
  readonly name: string
  readonly version: string
  readonly dsh?: Readonly<Record<string, unknown>>
  readonly exports?: Readonly<Record<string, unknown>>
  readonly dependencies?: Readonly<Record<string, string>>
  readonly peerDependencies?: Readonly<Record<string, string>>
  readonly devDependencies?: Readonly<Record<string, string>>
}

const manifest = JSON.parse(readFileSync(
  new URL('../package.json', import.meta.url),
  'utf8',
)) as PackageManifest

describe('independent model-proxy package manifest', () => {
  it('owns an independent version plus its Host and Browser contributions', () => {
    expect(manifest.name).toBe('@awiki/dsh-model-proxy')
    expect(manifest.version).toBe('0.1.0')
    expect(manifest.exports?.['./client']).toEqual({
      types: './lib/types/client/index.d.ts',
      default: './lib/client.js',
    })
    expect(manifest.dsh).toEqual({
      bundle: { patch: './cordis.patch.yml' },
      client: {
        inject: [
          '@awiki/dsh-plugin',
          '@deepseek-ai/dsh-api-remotes',
          '@deepseek-ai/dsh-client-connection',
          '@deepseek-ai/dsh-client-locale',
          '@deepseek-ai/dsh-client-runtime',
          '@deepseek-ai/dsh-client-ui-settings',
        ],
        platform: 'web',
      },
    })
  })

  it('uses the main AWiki package only through a public peer boundary', () => {
    expect(manifest.peerDependencies?.['@awiki/dsh-plugin']).toBe('^0.3.0-rc.1')
    expect(manifest.devDependencies?.['@awiki/dsh-plugin']).toBe('workspace:*')
    expect(manifest.dependencies?.['@awiki/dsh-plugin']).toBeUndefined()

    const hostSource = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8')
    const clientSource = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')
    expect(hostSource).toContain("from '@awiki/dsh-plugin/model-proxy-contract'")
    expect(hostSource).toContain("from '@awiki/dsh-plugin/types'")
    expect(clientSource).toContain("from '@awiki/dsh-plugin/client'")
    expect(hostSource).not.toMatch(/from ['"]\.\.\//u)
    expect(clientSource).not.toMatch(/from ['"](?:\.\.\/){2,}/u)
  })

  it('declares every imported Harness package as an exact rc.7 peer', () => {
    const imported = new Set<string>()
    for (const path of globSync('**/*.{ts,tsx}', { cwd: new URL('../src/', import.meta.url) })) {
      const source = readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
      for (const match of source.matchAll(/['"](@deepseek-ai\/dsh(?:-[a-z0-9-]+)?)(?:\/[^'"]*)?['"]/gu)) {
        if (match[1] !== undefined) imported.add(match[1])
      }
    }

    expect([...imported].sort()).toEqual([
      '@deepseek-ai/dsh-agent-default-model',
      '@deepseek-ai/dsh-anonymous-user-id',
      '@deepseek-ai/dsh-api-remotes',
      '@deepseek-ai/dsh-client-connection',
      '@deepseek-ai/dsh-client-locale',
      '@deepseek-ai/dsh-client-runtime',
      '@deepseek-ai/dsh-client-ui-primitives',
      '@deepseek-ai/dsh-client-ui-settings',
      '@deepseek-ai/dsh-client-ui-slots',
      '@deepseek-ai/dsh-credentials',
      '@deepseek-ai/dsh-llm',
      '@deepseek-ai/dsh-llm-deepseek',
      '@deepseek-ai/dsh-settings',
    ])
    for (const name of imported) expect(manifest.peerDependencies?.[name]).toBe('0.1.0-rc.7')
  })

  it('keeps all model-hosting Browser ownership inside this package', () => {
    const modelProxyClient = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')
    const rootClient = readFileSync(new URL('../../../src/client/index.ts', import.meta.url), 'utf8')
    expect(modelProxyClient).toContain("id: 'awiki-model-proxy'")
    expect(modelProxyClient).toContain('ModelProxySettingsSection')
    expect(modelProxyClient).toContain('AwikiOnboarding')
    expect(rootClient).not.toContain('ModelProxySettingsSection')
    expect(rootClient).not.toContain('AwikiOnboarding')
    expect(rootClient).not.toContain('AwikiModelProxyController')
  })
})
