import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  assertSafeRunRoot,
  canonicalRepositoryRoot,
  e2ePackageVersions,
  dependencyBuildEnvironment,
  nativeProfileOverrides,
  harnessEnvironment,
  harnessRunRootPrefix,
  identityWrapperNeedsGeneration,
  localIdentityPlatformFor,
  localImCorePlatformFor,
  parseHarnessReadyLine,
  readProfileIdentityManifest,
  shouldUseLocalNativeCandidate,
  assertDependencySourceStamp,
} from './e2e/fixtures/harness-instance.ts'
import { reviewedE2eTargets } from './e2e/fixtures/protected-config.ts'

const ownedRoots: string[] = []

afterEach(async () => {
  await Promise.all(ownedRoots.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('DSH Web E2E Harness contract', () => {
  it('accepts the new local authentication bootstrap URL without accepting arbitrary query data', () => {
    const token = 'x'.repeat(43)
    const url = `http://127.0.0.1:12345/?token=${token}`
    expect(parseHarnessReadyLine(`dsh web: ${url}`)).toBe(url)
    expect(parseHarnessReadyLine(`dsh web: ${url}&redirect=https://remote.example`)).toBeUndefined()
    expect(parseHarnessReadyLine(`dsh web: ${url}&token=${token}`)).toBeUndefined()
    expect(parseHarnessReadyLine('dsh web: http://127.0.0.1:12345/?token=short')).toBeUndefined()
  })

  it('reads the Identity SDK resolved by its plugin in a pnpm profile without a root SDK link', async () => {
    const root = await mkdtemp(join(tmpdir(), harnessRunRootPrefix))
    ownedRoots.push(root)
    const scope = join(root, 'node_modules', '.pnpm', 'identity-plugin', 'node_modules', '@agent-network-protocol')
    const plugin = join(scope, 'dsh-anp-identity')
    const sdk = join(scope, 'anp-identity')
    const publicScope = join(root, 'node_modules', '@agent-network-protocol')
    await Promise.all([mkdir(plugin, { recursive: true }), mkdir(sdk, { recursive: true }), mkdir(publicScope, { recursive: true })])
    await writeFile(join(plugin, 'package.json'), JSON.stringify({ name: '@agent-network-protocol/dsh-anp-identity' }))
    await writeFile(join(sdk, 'package.json'), JSON.stringify({ name: '@agent-network-protocol/anp-identity', version: '0.2.1', exports: { '.': './index.js' } }))
    await writeFile(join(sdk, 'index.js'), 'throw new Error("version verification must not execute the native SDK")')
    await symlink(plugin, join(publicScope, 'dsh-anp-identity'), 'dir')
    await expect(readProfileIdentityManifest(root)).resolves.toMatchObject({ name: '@agent-network-protocol/anp-identity', version: '0.2.1' })
    await rm(sdk, { recursive: true })
    await expect(readProfileIdentityManifest(root)).rejects.toThrow()
  })

  it('pins selected native platforms as well as wrappers without selecting an unrelated SDK', () => {
    expect(nativeProfileOverrides({ core: { wrapper: '/core.tgz', platform: '/core-linux.tgz', target: 'linux-x64-gnu' } }))
      .toEqual({ '@awiki/im-core-node': 'file:/core.tgz', '@awiki/im-core-node-linux-x64-gnu': 'file:/core-linux.tgz' })
    expect(nativeProfileOverrides({ identity: { wrapper: '/identity.tgz', platform: '/identity-linux.tgz', target: 'linux-x64-gnu' } }))
      .toEqual({ '@awiki/im-core-node': '0.2.6', '@agent-network-protocol/anp-identity': 'file:/identity.tgz', '@agent-network-protocol/anp-identity-linux-x64-gnu': 'file:/identity-linux.tgz' })
  })

  it('preserves only explicit SDK source selection for isolated plugin builds', () => {
    expect(dependencyBuildEnvironment({ AWIKI_DEPENDENCY_MODE: 'source', AWIKI_LOCAL_CORE_ROOT: '/selected/core', PRIVATE_TOKEN: 'hidden' }))
      .toEqual({ AWIKI_DEPENDENCY_MODE: 'source', AWIKI_LOCAL_CORE_ROOT: '/selected/core' })
    expect(dependencyBuildEnvironment({ AWIKI_DEPENDENCY_MODE: 'registry', AWIKI_LOCAL_CORE_ROOT: '/unselected/core' }))
      .toEqual({ AWIKI_DEPENDENCY_MODE: 'registry' })
    expect(dependencyBuildEnvironment({})).toEqual({ AWIKI_DEPENDENCY_MODE: 'registry' })
    expect(() => dependencyBuildEnvironment({ AWIKI_DEPENDENCY_MODE: 'unknown' })).toThrow('Unknown dependency mode')
  })

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

  it('skips wrapper regeneration for a clean pinned Identity checkout', async () => {
    const root = await mkdtemp(join(tmpdir(), harnessRunRootPrefix))
    ownedRoots.push(root)
    await mkdir(join(root, 'scripts'))
    await Promise.all([
      writeFile(join(root, 'index.js'), 'wrapped-js\n'),
      writeFile(join(root, 'index.d.ts'), 'wrapped-dts\n'),
      writeFile(join(root, 'native.cjs'), 'native-loader\n'),
      writeFile(join(root, 'scripts/index.js.template'), 'wrapped-js\n'),
      writeFile(join(root, 'scripts/index.d.ts.template'), 'wrapped-dts\n'),
    ])

    await expect(identityWrapperNeedsGeneration(root)).resolves.toBe(false)

    await writeFile(join(root, 'index.d.ts'), 'generated-native-dts\n')
    await expect(identityWrapperNeedsGeneration(root)).resolves.toBe(true)
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
      expect(env.DSH_AWIKI_ALLOW_INSECURE_LOOPBACK_FOR_TESTING).toBeUndefined()
    } finally {
      if (previousPhone === undefined) delete process.env.DEV_OTP_PHONE
      else process.env.DEV_OTP_PHONE = previousPhone
      if (previousCode === undefined) delete process.env.DEV_OTP_CODE
      else process.env.DEV_OTP_CODE = previousCode
    }
  })

  it('pins the coordinated registry candidates used by the real profile', () => {
    expect(e2ePackageVersions).toEqual({
      localPlugin: '0.3.11-rc.2',
      localModelProxy: '0.1.7-rc.1',
      identityPlugin: '0.1.3-rc.2',
      identityNode: '0.2.2',
      imCoreNode: '0.2.6',
      localIdentityNode: '0.2.1',
      localIdentitySourceRef: 'c8f7ae8d123da4c7885545866a14212f91e424db',
      localImCoreNode: '0.2.4',
      localImCoreSourceRef: '805c33cc7e1149f6f56c0598b4c8cc76a33884db',
    })
  })

  it('derives the complete awiki.info service environment from the reviewed target', () => {
    const root = join(tmpdir(), `${harnessRunRootPrefix}awiki-info`)
    const env = harnessEnvironment(
      root,
      join(root, 'dsh-home'),
      reviewedE2eTargets['awiki-info-testing'],
      'http://127.0.0.1:19090',
    )
    expect(env).toMatchObject({
      DSH_AWIKI_USER_SERVICE_URL: 'https://awiki.info',
      DSH_AWIKI_USER_SERVICE_DOMAIN: 'awiki.info',
      DSH_AWIKI_MESSAGE_SERVICE_URL: 'https://awiki.info',
      DSH_AWIKI_MAIL_SERVICE_URL: 'https://awiki.info',
      DSH_AWIKI_MESSAGE_SERVICE_PUBLIC_URL: 'https://awiki.info',
      DSH_AWIKI_MESSAGE_SERVICE_DID: 'did:wba:awiki.info',
      DSH_AWIKI_ALLOW_INSECURE_LOOPBACK_FOR_TESTING: 'true',
    })
    expect(env.DSH_AWIKI_MODEL_PROXY_URL).toBeUndefined()
    const httpsModel = harnessEnvironment(
      root,
      join(root, 'dsh-home'),
      reviewedE2eTargets['awiki-info-testing'],
      'https://model.awiki.info',
    )
    expect(httpsModel.DSH_AWIKI_MODEL_PROXY_URL).toBeUndefined()
    expect(httpsModel.DSH_AWIKI_ALLOW_INSECURE_LOOPBACK_FOR_TESTING).toBeUndefined()
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
      nativeFile: 'target/aarch64-apple-darwin/release/libanp_identity_node.dylib',
    })
    expect(localIdentityPlatformFor('darwin', 'x64')).toEqual({
      target: 'darwin-x64',
      packageDirectory: 'bindings/node/npm/darwin-x64',
      nativeFile: 'target/x86_64-apple-darwin/release/libanp_identity_node.dylib',
    })
    expect(localIdentityPlatformFor('linux', 'x64', '2.39')).toEqual({
      target: 'linux-x64-gnu',
      packageDirectory: 'bindings/node/npm/linux-x64-gnu',
      nativeFile: 'target/x86_64-unknown-linux-gnu/release/libanp_identity_node.so',
    })
    expect(shouldUseLocalNativeCandidate({ platform: 'darwin', live: false })).toBe(false)
    expect(shouldUseLocalNativeCandidate({ platform: 'linux', live: false })).toBe(false)
    expect(shouldUseLocalNativeCandidate({ platform: 'linux', live: true })).toBe(false)
    expect(shouldUseLocalNativeCandidate({ platform: 'linux', live: false, copiedProfile: true })).toBe(false)
    expect(shouldUseLocalNativeCandidate({ platform: 'linux', live: false, dependencyMode: 'local' })).toBe(true)
    expect(shouldUseLocalNativeCandidate({ platform: 'darwin', live: false, dependencyMode: 'source' })).toBe(true)
  })

  it('rejects unsupported or non-glibc native package selections', () => {
    expect(() => localImCorePlatformFor('linux', 'x64')).toThrow('does not support musl')
    expect(() => localIdentityPlatformFor('win32', 'x64')).toThrow('platform is unsupported')
  })
})

describe('dependency source profile reuse', () => {
  it('rejects a same-version profile from a different source or source commit', () => {
    expect(() => assertDependencySourceStamp({ mode: 'local', fingerprint: 'commit-a' }, { mode: 'registry', fingerprint: 'registry' })).toThrow()
    expect(() => assertDependencySourceStamp({ mode: 'source', fingerprint: 'commit-a' }, { mode: 'source', fingerprint: 'commit-b' })).toThrow()
    expect(() => assertDependencySourceStamp(null, { mode: 'registry', fingerprint: 'registry' })).toThrow()
    expect(() => assertDependencySourceStamp({ mode: 'source', fingerprint: 'commit-a' }, { mode: 'source', fingerprint: 'commit-a' })).not.toThrow()
  })
})
