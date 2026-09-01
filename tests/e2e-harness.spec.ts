import { mkdir, mkdtemp, realpath, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  assertSafeRunRoot,
  canonicalRepositoryRoot,
  e2ePackageVersions,
  harnessEnvironment,
  harnessRunRootPrefix,
  localIdentityPlatformFor,
  localImCorePlatformFor,
  parseHarnessReadyLine,
  shouldUseLocalNativeCandidate,
} from './e2e/fixtures/harness-instance.ts'

const ownedRoots: string[] = []

afterEach(async () => {
  await Promise.all(ownedRoots.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('DSH Web E2E Harness contract', () => {
  it('accepts only the exact loopback dynamic-port ready marker', () => {
    expect(parseHarnessReadyLine('dsh web: http://127.0.0.1:43127')).toBe('http://127.0.0.1:43127')
    for (const value of [
      'dsh web: https://127.0.0.1:43127',
      'dsh web: http://localhost:43127',
      'dsh web: http://0.0.0.0:43127',
      'dsh web: http://127.0.0.1:0',
      'dsh web: http://127.0.0.1:65536',
      'dsh web: http://127.0.0.1:43127/path',
      'prefix dsh web: http://127.0.0.1:43127',
    ]) expect(parseHarnessReadyLine(value)).toBeUndefined()
  })

  it('owns only direct children of the system temp directory', async () => {
    const root = await mkdtemp(join(tmpdir(), harnessRunRootPrefix))
    ownedRoots.push(root)
    await expect(assertSafeRunRoot(root)).resolves.toBeUndefined()
    await expect(assertSafeRunRoot(tmpdir())).rejects.toThrow('owned temporary namespace')
    await expect(assertSafeRunRoot(join(root, 'nested'))).rejects.toThrow('owned temporary namespace')
  })

  it('canonicalizes sibling repository symlinks before native staging', async () => {
    const root = await mkdtemp(join(tmpdir(), harnessRunRootPrefix))
    ownedRoots.push(root)
    const target = join(root, 'identity-source')
    const link = join(root, 'identity-link')
    await mkdir(target)
    await symlink(target, link, 'dir')
    await expect(canonicalRepositoryRoot(link)).resolves.toBe(await realpath(target))
  })

  it('builds a secret-free isolated process environment for the reviewed target', () => {
    const previousPhone = process.env.DEV_OTP_PHONE
    const previousCode = process.env.DEV_OTP_CODE
    process.env.DEV_OTP_PHONE = '+00000000000'
    process.env.DEV_OTP_CODE = '000000'
    try {
      const root = join(tmpdir(), `${harnessRunRootPrefix}fixture`)
      const env = harnessEnvironment(root, join(root, 'dsh-home'))
      expect(env.DEV_OTP_PHONE).toBeUndefined()
      expect(env.DEV_OTP_CODE).toBeUndefined()
      expect(env.HOME).toBe(join(root, 'home'))
      expect(env.XDG_CONFIG_HOME).toBe(join(root, 'xdg-config'))
      expect(env.DSH_AWIKI_USER_SERVICE_URL).toBe('https://rwiki.cn')
      expect(env.DSH_AWIKI_MESSAGE_SERVICE_DID).toBe('did:wba:rwiki.cn')
      expect(env.DSH_AWIKI_LISTENER_ENABLED).toBe('false')
    } finally {
      if (previousPhone === undefined) delete process.env.DEV_OTP_PHONE
      else process.env.DEV_OTP_PHONE = previousPhone
      if (previousCode === undefined) delete process.env.DEV_OTP_CODE
      else process.env.DEV_OTP_CODE = previousCode
    }
  })

  it('pins the coordinated registry candidates used by the real profile', () => {
    expect(e2ePackageVersions).toEqual({
      localPlugin: '0.3.9',
      identityPlugin: '0.1.0-dsh-test.20260831.1',
      identityNode: '0.2.0-dsh-test.20260831.1',
      imCoreNode: '0.2.1-dsh-test.20260831.1',
      localIdentityNode: '0.2.0',
      localIdentitySourceRef: '9f75891cc74d52a166a2d23c884ac32101b0c739',
      localImCoreNode: '0.2.3',
      localImCoreSourceRef: '53c9ed4250500281d7f448135ff76a089182593a',
    })
  })

  it('maps macOS native packages without borrowing Linux artifacts', () => {
    expect(localImCorePlatformFor('darwin', 'x64')).toEqual({
      target: 'darwin-x64',
      packageDirectory: 'packages/awiki-im-core-node-platforms/darwin-x64',
      nativeFile: 'target/release/libawiki_im_core_node.dylib',
    })
    expect(localIdentityPlatformFor('darwin', 'arm64')).toEqual({
      target: 'darwin-arm64',
      packageDirectory: 'bindings/node/npm/darwin-arm64',
      nativeFile: 'target/release/libanp_identity_node.dylib',
    })
    expect(shouldUseLocalNativeCandidate({ platform: 'darwin', live: false })).toBe(true)
    expect(shouldUseLocalNativeCandidate({ platform: 'linux', live: false })).toBe(false)
    expect(shouldUseLocalNativeCandidate({ platform: 'linux', live: true })).toBe(true)
  })

  it('rejects unsupported or non-glibc native package selections', () => {
    expect(() => localImCorePlatformFor('linux', 'x64')).toThrow('does not support musl')
    expect(() => localIdentityPlatformFor('win32', 'x64')).toThrow('platform is unsupported')
  })
})
