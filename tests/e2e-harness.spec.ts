import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  assertSafeRunRoot,
  e2ePackageVersions,
  harnessEnvironment,
  harnessRunRootPrefix,
  parseHarnessReadyLine,
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
      identityPlugin: '0.1.0-dsh-test.20260831.1',
      identityNode: '0.2.0-dsh-test.20260831.1',
      imCoreNode: '0.2.1-dsh-test.20260831.1',
      localIdentityNode: '0.2.0',
      localIdentitySourceRef: '9f75891cc74d52a166a2d23c884ac32101b0c739',
      localImCoreNode: '0.2.1',
      localImCoreSourceRef: '2bff9492c3b4eefd55f1ea35d7a09707a8163f43',
    })
  })
})
