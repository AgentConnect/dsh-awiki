import { globSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

interface PackageManifest {
  readonly name: string
  readonly version: string
  readonly dsh?: Readonly<Record<string, unknown>>
  readonly exports?: Readonly<Record<string, unknown>>
  readonly files?: readonly string[]
  readonly dependencies?: Readonly<Record<string, string>>
  readonly peerDependencies?: Readonly<Record<string, string>>
  readonly devDependencies?: Readonly<Record<string, string>>
}

interface EmbeddedDependencyManifest {
  readonly version: string
  readonly license: string
}

const manifest = JSON.parse(readFileSync(
  new URL('../package.json', import.meta.url),
  'utf8',
)) as PackageManifest
const rootManifest = JSON.parse(readFileSync(
  new URL('../../../package.json', import.meta.url),
  'utf8',
)) as PackageManifest

describe('independent model-proxy package manifest', () => {
  it('owns an independent version plus its Host and Browser contributions', () => {
    expect(manifest.name).toBe('@awiki/dsh-model-proxy')
    expect(manifest.version).toBe('0.1.2')
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

  it('ships the licenses for dependencies embedded in the Browser bundle', () => {
    expect(manifest.files).toContain('THIRD_PARTY_NOTICES.md')
    const notices = readFileSync(new URL('../THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8')
    const qrcodeManifestUrl = new URL(import.meta.resolve('qrcode/package.json'))
    const qrcodeManifest = JSON.parse(readFileSync(qrcodeManifestUrl, 'utf8')) as EmbeddedDependencyManifest
    const qrcodeRequire = createRequire(qrcodeManifestUrl)
    const dijkstraManifest = JSON.parse(readFileSync(
      qrcodeRequire.resolve('dijkstrajs/package.json'),
      'utf8',
    )) as EmbeddedDependencyManifest

    const normalize = (value: string) => value.replace(/\s+/gu, ' ').trim()
    const qrcodeHeading = `## qrcode ${qrcodeManifest.version}`
    const dijkstraHeading = `## dijkstrajs ${dijkstraManifest.version}`
    const qrcodeSection = notices.split(qrcodeHeading)[1]?.split(dijkstraHeading)[0]
    const dijkstraSection = notices.split(dijkstraHeading)[1]
    const fullMitClauses = [
      [
        'Permission is hereby granted, free of charge, to any person obtaining a copy of',
        'this software and associated documentation files (the "Software"), to deal in',
        'the Software without restriction, including without limitation the rights to',
        'use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of',
        'the Software, and to permit persons to whom the Software is furnished to do so,',
        'subject to the following conditions:',
      ].join(' '),
      [
        'The above copyright notice and this permission notice shall be included in all',
        'copies or substantial portions of the Software.',
      ].join(' '),
      [
        'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
        'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,',
        'FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE',
        'AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER',
        'LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,',
        'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE',
        'SOFTWARE.',
      ].join(' '),
    ]

    expect(qrcodeManifest).toMatchObject({ version: '1.5.4', license: 'MIT' })
    expect(dijkstraManifest).toMatchObject({ version: '1.0.3', license: 'MIT' })
    expect(qrcodeSection).toBeDefined()
    expect(dijkstraSection).toBeDefined()

    const normalizedQrcodeSection = normalize(qrcodeSection ?? '')
    const normalizedDijkstraSection = normalize(dijkstraSection ?? '')
    for (const section of [normalizedQrcodeSection, normalizedDijkstraSection]) {
      for (const clause of fullMitClauses) expect(section).toContain(clause)
    }
    expect(normalizedQrcodeSection).toContain('Copyright (c) 2012 Ryan Day')
    expect(normalizedQrcodeSection).toContain('Copyright (c) 2011 Ryan Day')
    expect(normalizedQrcodeSection).toContain('Copyright (c) 2009 Kazuhiko Arase')
    expect(normalizedDijkstraSection).toContain('Copyright (C) 2008 Wyatt Baldwin <self@wyattbaldwin.com>')
  })

  it('uses the main AWiki package only through a public peer boundary', () => {
    expect(rootManifest.version).toBe('0.3.2')
    expect(manifest.peerDependencies?.['@awiki/dsh-plugin']).toBe(`^${rootManifest.version}`)
    expect(manifest.devDependencies?.['@awiki/dsh-plugin']).toBe('workspace:*')
    expect(manifest.dependencies?.['@awiki/dsh-plugin']).toBeUndefined()

    const hostSource = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8')
    const clientSource = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')
    const rootClientSource = readFileSync(new URL('../../../src/client/index.ts', import.meta.url), 'utf8')
    const rootClientBundle = readFileSync(new URL('../../../lib/client.js', import.meta.url), 'utf8')
    expect(hostSource).toContain("from '@awiki/dsh-plugin/model-proxy-contract'")
    expect(hostSource).toContain("from '@awiki/dsh-plugin/types'")
    expect(clientSource).toContain("from '@awiki/dsh-plugin/client'")
    expect(rootClientSource).toContain('new AwikiClientBridge(ctx, awiki)')
    expect(rootClientBundle).toContain('awikiClient')
    expect(hostSource).not.toMatch(/from ['"]\.\.\//u)
    expect(clientSource).not.toMatch(/from ['"](?:\.\.\/){2,}/u)
  })

  it('declares every imported Harness package as an exact rc.2 peer', () => {
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
      '@deepseek-ai/dsh-llm',
      '@deepseek-ai/dsh-llm-deepseek',
      '@deepseek-ai/dsh-settings',
    ])
    for (const name of imported) expect(manifest.peerDependencies?.[name]).toBe('0.1.1-rc.2')
  })

  it('keeps all model-hosting Browser ownership inside this package', () => {
    const modelProxyClient = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')
    const rootClient = readFileSync(new URL('../../../src/client/index.ts', import.meta.url), 'utf8')
    expect(modelProxyClient).toContain("id: 'awiki-model-proxy'")
    expect(modelProxyClient).toContain('ModelProxySettingsSection')
    expect(modelProxyClient).toContain('AwikiOnboarding')
    expect(modelProxyClient).toContain('AWIKI_MODEL_PROXY_DEVELOPER_HANDLE')
    expect(modelProxyClient).toContain('contactModelProxyDeveloper')
    const contactSource = readFileSync(new URL('../src/client/contact-developer.ts', import.meta.url), 'utf8')
    expect(contactSource).toContain("export const AWIKI_MODEL_PROXY_DEVELOPER_HANDLE = 'cgw.awiki.ai'")
    expect(contactSource).toContain("dsh plugin --profile web add @awiki/dsh-plugin@latest")
    expect(rootClient).not.toContain('ModelProxySettingsSection')
    expect(rootClient).not.toContain('AwikiOnboarding')
    expect(rootClient).not.toContain('AwikiModelProxyController')
  })
})
