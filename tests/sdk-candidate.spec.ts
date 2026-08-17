import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SDK_OID = '4a4f84239a7ad9059a0ee6e7ec2807ee8d611cea'
const WRAPPER_SHA256 = '0df4b2e3028a29dd219c15147f1e7058aad8280c780145af65a2b93060ee73df'
const LINUX_SHA256 = '97108bb4f0e1966bf0ab09db67cc83dd16e3f3673a19f11f1445fd4cf3229f1e'
const wrapperTarball = new URL('../../awiki-cli-rs2/dist/node-sdk/tarballs/awiki-im-core-node-0.1.3.tgz', import.meta.url)
const linuxTarball = new URL('../../awiki-cli-rs2/dist/node-sdk/tarballs/awiki-im-core-node-linux-x64-gnu-0.1.3.tgz', import.meta.url)

async function sha256(url: URL): Promise<string> {
  return createHash('sha256').update(await readFile(url)).digest('hex')
}

describe('fixed AWiki IM Core Node candidate', () => {
  it('binds the publishable manifest to 0.1.3 while loading both fixed local artifacts', async () => {
    await expect(sha256(wrapperTarball)).resolves.toBe(WRAPPER_SHA256)
    await expect(sha256(linuxTarball)).resolves.toBe(LINUX_SHA256)

    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
      readonly dependencies: Record<string, string>
    }
    expect(manifest.dependencies['@awiki/im-core-node']).toBe('0.1.3')

    const wrapperEntry = fileURLToPath(import.meta.resolve('@awiki/im-core-node'))
    const wrapperRoot = join(dirname(wrapperEntry), '..')
    const installedWrapper = JSON.parse(await readFile(join(wrapperRoot, 'package.json'), 'utf8')) as {
      readonly version: string
    }
    const provenance = JSON.parse(await readFile(join(wrapperRoot, 'provenance.json'), 'utf8')) as {
      readonly source: { readonly commit: string; readonly dirty: boolean }
    }
    expect(installedWrapper.version).toBe('0.1.3')
    expect(provenance.source).toMatchObject({ commit: SDK_OID, dirty: false })

    if (process.platform === 'linux' && process.arch === 'x64') {
      const wrapperRequire = createRequire(wrapperEntry)
      const nativeEntry = wrapperRequire.resolve('@awiki/im-core-node-linux-x64-gnu')
      const nativeManifest = JSON.parse(await readFile(join(dirname(nativeEntry), 'package.json'), 'utf8')) as {
        readonly name: string
        readonly version: string
      }
      expect(nativeManifest).toMatchObject({
        name: '@awiki/im-core-node-linux-x64-gnu',
        version: '0.1.3',
      })
    }
  })
})
