import { spawn, type ChildProcess } from 'node:child_process'
import { copyFile, cp, mkdtemp, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { recordResource, updateResourceStatus } from './resource-ledger.ts'

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url))
const cliRepositoryRoot = resolve(repositoryRoot, '../awiki-cli-rs2')
const identityRepositoryRoot = resolve(repositoryRoot, '../anp/anp-identity')
const dshExecutable = join(repositoryRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'dsh.cmd' : 'dsh')
const runRootPrefix = 'dsh-awiki-e2e-'
const commandOutputLimit = 2 * 1024 * 1024
const commandFailureOutputLimit = 16 * 1024
const prepareTimeoutMs = 5 * 60_000
const nativeBuildTimeoutMs = 15 * 60_000
const readyTimeoutMs = 120_000
const shutdownTimeoutMs = 10_000
const inheritedEnvironmentKeys = [
  'CI',
  'COREPACK_HOME',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'LANG',
  'LC_ALL',
  'NODE_EXTRA_CA_CERTS',
  'NO_PROXY',
  'PATH',
  'PNPM_HOME',
  'SSL_CERT_FILE',
  'TEMP',
  'TMP',
  'TMPDIR',
] as const

export const e2ePackageVersions = Object.freeze({
  localPlugin: '0.3.9',
  identityPlugin: '0.1.0-dsh-test.20260831.1',
  identityNode: '0.2.0-dsh-test.20260831.1',
  imCoreNode: '0.2.1-dsh-test.20260831.1',
  localIdentityNode: '0.2.0',
  localIdentitySourceRef: '8dc65ccc388af0f0622263811776a6aadcd11d18',
  localImCoreNode: '0.2.3',
  localImCoreSourceRef: '647b8cf83cf14d37bdf527e1f5def2bd5fbe6034',
})

export interface HarnessInstance {
  readonly url: string
  readonly runRoot: string
  readonly profileRoot: string
  readonly stateRoot: string
  readonly logDir: string
  readonly dshHome: string
  pause(): Promise<void>
  restart(): Promise<string>
  stop(): Promise<void>
}

interface PreparedProfile {
  readonly dshHome: string
  readonly profileRoot: string
}

interface CommandResult {
  readonly stdout: string
  readonly stderr: string
}

interface LocalImCoreTarballs {
  readonly wrapper: string
  readonly platform: string
}

function delay(ms: number): Promise<void> {
  return new Promise(resolveDelay => setTimeout(resolveDelay, ms))
}

function isolatedBaseEnvironment(runRoot: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const key of inheritedEnvironmentKeys) {
    const value = process.env[key]
    if (value !== undefined) env[key] = value
  }
  env.HOME = join(runRoot, 'home')
  env.XDG_CONFIG_HOME = join(runRoot, 'xdg-config')
  env.XDG_CACHE_HOME = join(runRoot, 'xdg-cache')
  env.XDG_DATA_HOME = join(runRoot, 'xdg-data')
  return env
}

function appendBounded(current: string, chunk: Buffer | string): string {
  const next = current + chunk.toString()
  if (Buffer.byteLength(next) > commandOutputLimit) {
    throw new Error('DSH E2E child output exceeded its safe limit')
  }
  return next
}

export async function identityWrapperNeedsGeneration(bindingRoot: string): Promise<boolean> {
  const [currentJs, currentDts, expectedJs, expectedDts] = await Promise.all([
    readFile(join(bindingRoot, 'index.js'), 'utf8'),
    readFile(join(bindingRoot, 'index.d.ts'), 'utf8'),
    readFile(join(bindingRoot, 'scripts/index.js.template'), 'utf8'),
    readFile(join(bindingRoot, 'scripts/index.d.ts.template'), 'utf8'),
  ])
  return currentJs !== expectedJs || currentDts !== expectedDts
}

function failureOutput(stdout: string, stderr: string): string {
  const output = [
    stdout === '' ? '' : `stdout:\n${stdout}`,
    stderr === '' ? '' : `stderr:\n${stderr}`,
  ].filter(Boolean).join('\n')
  if (output === '') return ''
  const bounded = output.length > commandFailureOutputLimit
    ? output.slice(-commandFailureOutputLimit)
    : output
  return `\n${bounded}`
}

async function runChecked(
  stage: string,
  command: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly env: NodeJS.ProcessEnv; readonly timeoutMs?: number },
): Promise<CommandResult> {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      signalProcessGroup(child, 'SIGTERM')
      setTimeout(() => signalProcessGroup(child, 'SIGKILL'), 2_000).unref()
      rejectCommand(new Error(`DSH E2E ${stage} timed out`))
    }, options.timeoutMs ?? prepareTimeoutMs)
    child.stdout.on('data', chunk => {
      try {
        stdout = appendBounded(stdout, chunk)
      } catch (error) {
        signalProcessGroup(child, 'SIGTERM')
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          rejectCommand(error)
        }
      }
    })
    child.stderr.on('data', chunk => {
      try {
        stderr = appendBounded(stderr, chunk)
      } catch (error) {
        signalProcessGroup(child, 'SIGTERM')
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          rejectCommand(error)
        }
      }
    })
    child.once('error', () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      rejectCommand(new Error(`DSH E2E ${stage} could not start`))
    })
    child.once('exit', (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (code !== 0) {
        const reason = code === null ? `signal=${signal ?? 'unknown'}` : `exit=${code}`
        rejectCommand(new Error(
          `DSH E2E ${stage} failed (${reason})${failureOutput(stdout, stderr)}`,
        ))
        return
      }
      resolveCommand({ stdout, stderr })
    })
  })
}

export function parseHarnessReadyLine(line: string): string | undefined {
  const match = line.match(/^dsh web: (http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4}))$/u)
  if (match === null) return undefined
  const port = Number(match[2])
  if (!Number.isInteger(port) || port > 65_535) return undefined
  const url = new URL(match[1]!)
  if (
    url.protocol !== 'http:'
    || url.hostname !== '127.0.0.1'
    || url.username !== ''
    || url.password !== ''
    || url.pathname !== '/'
    || url.search !== ''
    || url.hash !== ''
  ) return undefined
  return url.origin
}

export async function assertSafeRunRoot(path: string): Promise<void> {
  if (!isAbsolute(path) || basename(path).startsWith(runRootPrefix) === false) {
    throw new Error('DSH E2E run root is outside the owned temporary namespace')
  }
  const actualParent = await realpath(dirname(path))
  const expectedParent = await realpath(tmpdir())
  if (actualParent !== expectedParent) {
    throw new Error('DSH E2E run root is outside the system temporary directory')
  }
  const value = await stat(path)
  if (!value.isDirectory()) throw new Error('DSH E2E run root is not a directory')
}

async function removeRunRoot(path: string): Promise<void> {
  await assertSafeRunRoot(path)
  await rm(path, { recursive: true, force: true })
}

function countConfigEntry(source: string, id: string): number {
  return source.match(new RegExp(`^\\s*- id: ${id}$`, 'gmu'))?.length ?? 0
}

function nativeBuildEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const key of [
    'CARGO_HOME',
    'HOME',
    'LANG',
    'LC_ALL',
    'PATH',
    'RUSTUP_HOME',
    'RUSTUP_TOOLCHAIN',
    'SSL_CERT_DIR',
    'SSL_CERT_FILE',
    'TMPDIR',
  ]) {
    if (process.env[key] !== undefined) env[key] = process.env[key]
  }
  return env
}

export function canonicalRepositoryRoot(path: string): Promise<string> {
  return realpath(path)
}

interface NativePlatform {
  readonly target: string
  readonly packageDirectory: string
  readonly nativeFile: string
}

export function localImCorePlatformFor(
  platform: string,
  arch: string,
  glibcVersion?: string,
): NativePlatform {
  if (platform === 'linux' && arch === 'x64') {
    if (glibcVersion === undefined) {
      throw new Error('DSH E2E local IM Core does not support musl')
    }
    return {
      target: 'linux-x64-gnu',
      packageDirectory: 'packages/awiki-im-core-node-platforms/linux-x64-gnu',
      nativeFile: 'target/release/libawiki_im_core_node.so',
    }
  }
  if (platform === 'darwin' && (arch === 'arm64' || arch === 'x64')) {
    const target = `darwin-${arch}`
    return {
      target,
      packageDirectory: `packages/awiki-im-core-node-platforms/${target}`,
      nativeFile: 'target/release/libawiki_im_core_node.dylib',
    }
  }
  throw new Error('DSH E2E local IM Core platform is unsupported')
}

export function localIdentityPlatformFor(
  platform: string,
  arch: string,
  glibcVersion?: string,
): NativePlatform {
  if (platform === 'linux' && arch === 'x64') {
    if (glibcVersion === undefined) {
      throw new Error('DSH E2E local Identity does not support musl')
    }
    return {
      target: 'linux-x64-gnu',
      packageDirectory: 'bindings/node/npm/linux-x64-gnu',
      nativeFile: 'target/x86_64-unknown-linux-gnu/release/libanp_identity_node.so',
    }
  }
  if (platform === 'darwin' && (arch === 'arm64' || arch === 'x64')) {
    const target = `darwin-${arch}`
    const rustTarget = arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin'
    return {
      target,
      packageDirectory: `bindings/node/npm/${target}`,
      nativeFile: `target/${rustTarget}/release/libanp_identity_node.dylib`,
    }
  }
  throw new Error('DSH E2E local Identity platform is unsupported')
}

function runtimeGlibcVersion(): string | undefined {
  const report = process.report.getReport() as { readonly header?: { readonly glibcVersionRuntime?: string } }
  return report.header?.glibcVersionRuntime
}

function localImCorePlatform(): NativePlatform {
  return localImCorePlatformFor(process.platform, process.arch, runtimeGlibcVersion())
}

function localIdentityPlatform(): NativePlatform {
  return localIdentityPlatformFor(process.platform, process.arch, runtimeGlibcVersion())
}

export function shouldUseLocalNativeCandidate(input: {
  readonly platform: string
  readonly live: boolean
  readonly copiedProfile?: boolean
}): boolean {
  return input.live || input.copiedProfile === true || input.platform === 'darwin'
}

async function prepareLocalIdentityTarballs(runRoot: string, packagesRoot: string): Promise<LocalImCoreTarballs> {
  const identityRoot = await canonicalRepositoryRoot(identityRepositoryRoot)
  const platform = localIdentityPlatform()
  const stagingRoot = join(
    identityRoot,
    'dist',
    'node-release',
    'staged',
    `e2e-${basename(runRoot)}`,
  )
  const stagingBoundary = `${join(identityRoot, 'dist', 'node-release', 'staged')}${sep}`
  if (!stagingRoot.startsWith(stagingBoundary)) throw new Error('DSH E2E Identity staging root is invalid')
  const tarballRoot = join(stagingRoot, 'tarballs')
  const wrapperName = 'agent-network-protocol-anp-identity-0.2.0.tgz'
  const platformName = `agent-network-protocol-anp-identity-${platform.target}-0.2.0.tgz`
  const env = nativeBuildEnvironment()
  try {
    await runChecked('local Identity source lock', 'git', [
      'diff', '--quiet', e2ePackageVersions.localIdentitySourceRef, '--',
      'Cargo.lock',
      'Cargo.toml',
      'bindings/node',
      'crates/anp-identity',
      'scripts/release',
    ], { cwd: identityRoot, env })
    await runChecked('local Identity native build', 'npm', [
      '--prefix', join(identityRoot, 'bindings/node'), 'run', 'build',
    ], { cwd: identityRoot, env, timeoutMs: nativeBuildTimeoutMs })
    if (await identityWrapperNeedsGeneration(join(identityRoot, 'bindings/node'))) {
      await runChecked('local Identity wrapper generation', process.execPath, [
        'bindings/node/scripts/wrap.mjs',
      ], { cwd: identityRoot, env })
    }
    await runChecked('local Identity wrapper staging', process.execPath, [
      'scripts/release/stage-node-package.mjs',
      '--kind', 'wrapper',
      '--output', join(stagingRoot, 'wrapper'),
    ], { cwd: identityRoot, env })
    await runChecked('local Identity platform staging', process.execPath, [
      'scripts/release/stage-node-package.mjs',
      '--kind', 'platform',
      '--package-dir', platform.packageDirectory,
      '--target', platform.target,
      '--binary', platform.nativeFile,
      '--output', join(stagingRoot, 'platform'),
    ], { cwd: identityRoot, env })
    for (const directory of ['wrapper', 'platform']) {
      await runChecked(`local Identity ${directory} pack audit`, process.execPath, [
        'scripts/release/pack-node-package.mjs',
        '--package-dir', join(stagingRoot, directory),
        '--destination', tarballRoot,
      ], { cwd: identityRoot, env })
    }
    await runChecked('local Identity packed install', process.execPath, [
      'scripts/release/verify-node-install.mjs',
      '--wrapper', join(tarballRoot, wrapperName),
      '--platform', join(tarballRoot, platformName),
    ], { cwd: identityRoot, env })
    const wrapper = join(packagesRoot, wrapperName)
    const nativePlatform = join(packagesRoot, platformName)
    await copyFile(join(tarballRoot, wrapperName), wrapper)
    await copyFile(join(tarballRoot, platformName), nativePlatform)
    return { wrapper, platform: nativePlatform }
  } finally {
    await rm(stagingRoot, { recursive: true, force: true })
  }
}

async function prepareLocalImCoreTarballs(runRoot: string, packagesRoot: string): Promise<LocalImCoreTarballs> {
  const cliRoot = await canonicalRepositoryRoot(cliRepositoryRoot)
  const platform = localImCorePlatform()
  const stagingRoot = join(cliRoot, 'dist', 'node-sdk', 'e2e', basename(runRoot))
  const stagingBoundary = `${join(cliRoot, 'dist', 'node-sdk', 'e2e')}${sep}`
  if (!stagingRoot.startsWith(stagingBoundary)) throw new Error('DSH E2E IM Core staging root is invalid')
  const tarballRoot = join(stagingRoot, 'tarballs')
  const wrapperName = `awiki-im-core-node-${e2ePackageVersions.localImCoreNode}.tgz`
  const platformName = `awiki-im-core-node-${platform.target}-${e2ePackageVersions.localImCoreNode}.tgz`
  const env = nativeBuildEnvironment()
  try {
    await runChecked('local IM Core source lock', 'git', [
      'diff', '--quiet', e2ePackageVersions.localImCoreSourceRef, '--',
      'Cargo.lock',
      'Cargo.toml',
      'crates/im-core',
      'crates/im-core-node',
      'packages/awiki-im-core-node',
      'packages/awiki-im-core-node-platforms',
      'scripts/release/node-sdk',
    ], { cwd: cliRoot, env })
    await runChecked('local IM Core native build', 'cargo', [
      'build', '--locked', '--release', '-p', 'awiki-im-core-node',
    ], { cwd: cliRoot, env, timeoutMs: nativeBuildTimeoutMs })
    await runChecked('local IM Core TypeScript build', process.execPath, [
      join(repositoryRoot, 'node_modules/typescript/bin/tsc'),
      '-p', join(cliRoot, 'packages/awiki-im-core-node/tsconfig.json'),
      '--types', 'node',
      '--typeRoots', join(repositoryRoot, 'node_modules/@types'),
    ], { cwd: repositoryRoot, env })
    await runChecked('local IM Core platform staging', process.execPath, [
      'scripts/release/node-sdk/stage-package.mjs',
      '--kind', 'platform',
      '--package-dir', platform.packageDirectory,
      '--target', platform.target,
      '--binary', platform.nativeFile,
      '--output', join(stagingRoot, 'platform'),
    ], { cwd: cliRoot, env })
    await runChecked('local IM Core wrapper staging', process.execPath, [
      'scripts/release/node-sdk/stage-package.mjs',
      '--kind', 'wrapper',
      '--package-dir', 'packages/awiki-im-core-node',
      '--output', join(stagingRoot, 'wrapper'),
    ], { cwd: cliRoot, env })
    for (const directory of ['platform', 'wrapper']) {
      await runChecked(`local IM Core ${directory} pack audit`, process.execPath, [
        'scripts/release/node-sdk/pack-audit.mjs',
        '--package-dir', join(stagingRoot, directory),
        '--destination', tarballRoot,
      ], { cwd: cliRoot, env })
    }
    await runChecked('local IM Core packed install', process.execPath, [
      'scripts/release/node-sdk/verify-packed-install.mjs',
      '--wrapper', join(tarballRoot, wrapperName),
      '--platform', join(tarballRoot, platformName),
    ], { cwd: cliRoot, env })
    const wrapper = join(packagesRoot, wrapperName)
    const nativePlatform = join(packagesRoot, platformName)
    await copyFile(join(tarballRoot, wrapperName), wrapper)
    await copyFile(join(tarballRoot, platformName), nativePlatform)
    return { wrapper, platform: nativePlatform }
  } finally {
    await rm(stagingRoot, { recursive: true, force: true })
  }
}

async function prepareProfile(
  runRoot: string,
  useLocalImCore: boolean,
  sourceDshHome?: string,
): Promise<PreparedProfile> {
  const packagesRoot = join(runRoot, 'packages')
  const dshHome = join(runRoot, 'dsh-home')
  const profileRoot = join(dshHome, 'profiles', 'web')
  const pluginTarball = join(packagesRoot, `awiki-dsh-plugin-${e2ePackageVersions.localPlugin}.tgz`)
  if (sourceDshHome !== undefined) {
    await mkdir(dirname(dshHome), { recursive: true })
    await cp(sourceDshHome, dshHome, { recursive: true, force: false })
  }
  try {
    const installedPlugin = JSON.parse(await readFile(join(
      profileRoot,
      'node_modules',
      '@awiki',
      'dsh-plugin',
      'package.json',
    ), 'utf8')) as { readonly name?: unknown; readonly version?: unknown }
    const installedCore = JSON.parse(await readFile(join(
      profileRoot,
      'node_modules',
      '@awiki',
      'im-core-node',
      'package.json',
    ), 'utf8')) as { readonly name?: unknown; readonly version?: unknown }
    const installedIdentity = JSON.parse(await readFile(join(
      profileRoot,
      'node_modules',
      '@agent-network-protocol',
      'anp-identity',
      'package.json',
    ), 'utf8')) as { readonly name?: unknown; readonly version?: unknown }
    const expectedCoreVersion = useLocalImCore
      ? e2ePackageVersions.localImCoreNode
      : e2ePackageVersions.imCoreNode
    const expectedIdentityVersion = useLocalImCore
      ? e2ePackageVersions.localIdentityNode
      : e2ePackageVersions.identityNode
    if (
      installedPlugin.name === '@awiki/dsh-plugin'
      && installedPlugin.version === e2ePackageVersions.localPlugin
      && installedCore.name === '@awiki/im-core-node'
      && installedCore.version === expectedCoreVersion
      && installedIdentity.name === '@agent-network-protocol/anp-identity'
      && installedIdentity.version === expectedIdentityVersion
    ) {
      return { dshHome, profileRoot }
    }
    throw new Error('DSH E2E cached profile plugin version is invalid')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  for (const directory of [
    packagesRoot,
    join(runRoot, 'home'),
    join(runRoot, 'xdg-config'),
    join(runRoot, 'xdg-cache'),
    join(runRoot, 'xdg-data'),
    join(runRoot, 'logs'),
  ]) await mkdir(directory, { recursive: true })
  const localIdentity = useLocalImCore
    ? await prepareLocalIdentityTarballs(runRoot, packagesRoot)
    : undefined
  const localImCore = useLocalImCore
    ? await prepareLocalImCoreTarballs(runRoot, packagesRoot)
    : undefined
  const env: NodeJS.ProcessEnv = {
    ...isolatedBaseEnvironment(runRoot),
    DSH_HOME: dshHome,
    DSH_TELEMETRY_DISABLED: '1',
  }
  await runChecked('IM Core Node TypeScript build', 'pnpm', [
    '--filter', '@awiki/im-core-node', 'run', 'build:typescript',
  ], { cwd: repositoryRoot, env })
  await runChecked('Identity plugin build', 'pnpm', [
    '--filter', '@agent-network-protocol/dsh-anp-identity', 'run', 'build',
  ], { cwd: repositoryRoot, env })
  await runChecked('plugin public contract', 'pnpm', ['run', 'check:public'], {
    cwd: repositoryRoot,
    env,
  })
  await runChecked('plugin build', 'pnpm', ['run', 'build'], {
    cwd: repositoryRoot,
    env,
  })
  await runChecked('plugin generated contract', 'pnpm', ['run', 'check:generated'], {
    cwd: repositoryRoot,
    env,
  })
  await runChecked('plugin pack', 'npm', ['pack', '--ignore-scripts', '--pack-destination', packagesRoot], {
    cwd: repositoryRoot,
    env,
  })
  await runChecked('profile dependency install', dshExecutable, [
    'plugin', '--profile', 'web', 'add',
    ...(localIdentity === undefined ? [] : [localIdentity.platform, localIdentity.wrapper]),
    `@agent-network-protocol/dsh-anp-identity@${e2ePackageVersions.identityPlugin}`,
    ...(localImCore === undefined
      ? [`@awiki/im-core-node@${e2ePackageVersions.imCoreNode}`]
      : [localImCore.platform, localImCore.wrapper]),
  ], { cwd: repositoryRoot, env })
  await writeFile(join(profileRoot, 'pnpm-workspace.yaml'), [
    'overrides:',
    ...(localIdentity === undefined
      ? []
      : [`  '@agent-network-protocol/anp-identity': file:${localIdentity.wrapper}`]),
    `  '@awiki/im-core-node': ${localImCore === undefined
      ? e2ePackageVersions.imCoreNode
      : `file:${localImCore.wrapper}`}`,
    '',
  ].join('\n'), { mode: 0o600 })
  await runChecked('profile plugin install', dshExecutable, [
    'plugin', '--profile', 'web', 'add', pluginTarball,
  ], { cwd: repositoryRoot, env })
  const composed = await runChecked('profile composition', dshExecutable, [
    '--profile', 'web', '--dump-default-config',
  ], { cwd: repositoryRoot, env })
  for (const id of [
    'anp-identity',
    'anp-identity-provider',
    'awiki',
    'awiki-provider',
    'awiki-summary-provider',
  ]) {
    if (countConfigEntry(composed.stdout, id) !== 1) {
      throw new Error(`DSH E2E composed profile does not contain exactly one ${id}`)
    }
  }
  const installed = JSON.parse(await readFile(join(
    profileRoot,
    'node_modules',
    '@awiki',
    'dsh-plugin',
    'package.json',
  ), 'utf8')) as { readonly name?: unknown; readonly version?: unknown }
  if (installed.name !== '@awiki/dsh-plugin' || installed.version !== e2ePackageVersions.localPlugin) {
    throw new Error('DSH E2E installed plugin version does not match the current candidate')
  }
  const installedCore = JSON.parse(await readFile(join(
    profileRoot,
    'node_modules',
    '@awiki',
    'im-core-node',
    'package.json',
  ), 'utf8')) as { readonly name?: unknown; readonly version?: unknown }
  const expectedCoreVersion = useLocalImCore
    ? e2ePackageVersions.localImCoreNode
    : e2ePackageVersions.imCoreNode
  if (installedCore.name !== '@awiki/im-core-node' || installedCore.version !== expectedCoreVersion) {
    throw new Error('DSH E2E installed IM Core Node version does not match the selected candidate')
  }
  const installedIdentity = JSON.parse(await readFile(join(
    profileRoot,
    'node_modules',
    '@agent-network-protocol',
    'anp-identity',
    'package.json',
  ), 'utf8')) as { readonly name?: unknown; readonly version?: unknown }
  const expectedIdentityVersion = useLocalImCore
    ? e2ePackageVersions.localIdentityNode
    : e2ePackageVersions.identityNode
  if (
    installedIdentity.name !== '@agent-network-protocol/anp-identity'
    || installedIdentity.version !== expectedIdentityVersion
  ) throw new Error('DSH E2E installed Identity Node version does not match the selected candidate')
  return { dshHome, profileRoot }
}

export function harnessEnvironment(runRoot: string, dshHome: string): NodeJS.ProcessEnv {
  return {
    ...isolatedBaseEnvironment(runRoot),
    DSH_HOME: dshHome,
    DSH_TELEMETRY_DISABLED: '1',
    DSH_ANP_IDENTITY_STATE_ROOT: join(runRoot, 'anp-identity'),
    DSH_ANP_IDENTITY_ROOT_KEY_PROVIDER: 'local-file',
    DSH_ANP_IDENTITY_ROOT_KEY_PROVIDER_ID: 'dsh-awiki-e2e',
    DSH_AWIKI_STATE_ROOT: join(runRoot, 'awiki-state'),
    DSH_AWIKI_USER_SERVICE_URL: 'https://rwiki.cn',
    DSH_AWIKI_USER_SERVICE_DOMAIN: 'rwiki.cn',
    DSH_AWIKI_MESSAGE_SERVICE_URL: 'https://rwiki.cn',
    DSH_AWIKI_MESSAGE_SERVICE_PUBLIC_URL: 'https://rwiki.cn',
    DSH_AWIKI_MESSAGE_SERVICE_DID: 'did:wba:rwiki.cn',
    DSH_AWIKI_REALTIME_ENABLED: 'true',
    DSH_AWIKI_LISTENER_ENABLED: 'false',
    DSH_AWIKI_LISTENER_ALLOWED_PEERS: '[]',
  }
}

async function awaitReadyUrl(child: ChildProcess): Promise<string> {
  return new Promise((resolveReady, rejectReady) => {
    let buffer = ''
    let stderr = ''
    let settled = false
    let readyUrl: string | undefined
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      rejectReady(new Error('DSH E2E Harness ready marker timed out'))
    }, readyTimeoutMs)
    const finishFailure = (message: string) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      rejectReady(new Error(message))
    }
    child.stdout?.on('data', chunk => {
      if (settled) return
      try {
        buffer = appendBounded(buffer, chunk)
      } catch (error) {
        finishFailure(error instanceof Error ? error.message : 'DSH E2E Harness output is invalid')
        return
      }
      const lines = buffer.split(/\r?\n/u)
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const parsed = parseHarnessReadyLine(line)
        if (parsed === undefined) continue
        if (readyUrl !== undefined) {
          finishFailure('DSH E2E Harness emitted more than one ready marker')
          return
        }
        readyUrl = parsed
        settled = true
        clearTimeout(timeout)
        resolveReady(parsed)
      }
    })
    child.stderr?.on('data', chunk => {
      try {
        stderr = appendBounded(stderr, chunk)
      } catch (error) {
        finishFailure(error instanceof Error ? error.message : 'DSH E2E Harness stderr is invalid')
      }
    })
    child.once('error', () => finishFailure('DSH E2E Harness could not start'))
    child.once('exit', (code, signal) => {
      const reason = code === null ? `signal=${signal ?? 'unknown'}` : `exit=${code}`
      finishFailure(`DSH E2E Harness exited before readiness (${reason})`)
    })
  })
}

async function waitForHttpReady(url: string): Promise<void> {
  const deadline = Date.now() + readyTimeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) })
      if (response.status >= 200 && response.status < 500) return
    } catch {
      // The loop is bounded and the Host owns the authoritative ready marker.
    }
    await delay(100)
  }
  throw new Error('DSH E2E Harness HTTP readiness timed out')
}

async function waitForHttpClosed(url: string): Promise<void> {
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(500) })
    } catch {
      return
    }
    await delay(100)
  }
  throw new Error('DSH E2E Harness port remained reachable after shutdown')
}

function signalProcessGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid === undefined) return
  try {
    if (process.platform === 'win32') child.kill(signal)
    else process.kill(-child.pid, signal)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ESRCH') throw error
  }
}

async function waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (child.exitCode !== null || child.signalCode !== null) return true
  return new Promise(resolveExit => {
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      resolveExit(false)
    }, timeoutMs)
    child.once('exit', () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolveExit(true)
    })
  })
}

async function stopHarnessProcess(child: ChildProcess, url: string): Promise<void> {
  signalProcessGroup(child, 'SIGTERM')
  if (!await waitForExit(child, shutdownTimeoutMs)) {
    signalProcessGroup(child, 'SIGKILL')
    if (!await waitForExit(child, 5_000)) {
      throw new Error('DSH E2E Harness process group did not stop')
    }
  }
  await waitForHttpClosed(url)
}

export async function startHarnessInstance(options: {
  readonly isolated?: boolean
  readonly profileSource?: string
} = {}): Promise<HarnessInstance> {
  const sharedRoot = options.isolated ? undefined : process.env.DSH_AWIKI_E2E_SHARED_ROOT
  const runRoot = sharedRoot ?? await mkdtemp(join(tmpdir(), runRootPrefix))
  await assertSafeRunRoot(runRoot)
  const privateLedger = process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER
  if (privateLedger !== undefined && sharedRoot === undefined) {
    await recordResource(privateLedger, {
      kind: 'local_root',
      identifier: runRoot,
      status: 'pending',
      reasonCode: 'created',
    })
  }
  let child: ChildProcess | undefined
  try {
    const prepared = await prepareProfile(runRoot, shouldUseLocalNativeCandidate({
      platform: process.platform,
      live: sharedRoot !== undefined,
      copiedProfile: options.profileSource !== undefined,
    }), options.profileSource)
    const env = harnessEnvironment(runRoot, prepared.dshHome)
    let url: string | undefined
    const launch = async () => {
      child = spawn(dshExecutable, [
        'web', '--no-open', '--host', '127.0.0.1', '--port', '0',
      ], {
        cwd: repositoryRoot,
        env,
        detached: process.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      url = await awaitReadyUrl(child)
      await waitForHttpReady(url)
    }
    await launch()
    let finalized = false
    return {
      get url() {
        if (url === undefined) throw new Error('DSH E2E Harness is paused')
        return url
      },
      runRoot,
      profileRoot: prepared.profileRoot,
      stateRoot: env.DSH_AWIKI_STATE_ROOT!,
      logDir: join(runRoot, 'logs'),
      dshHome: prepared.dshHome,
      async pause() {
        if (finalized || child === undefined || url === undefined) {
          throw new Error('DSH E2E Harness cannot pause in its current state')
        }
        const activeChild = child
        const activeUrl = url
        child = undefined
        url = undefined
        await stopHarnessProcess(activeChild, activeUrl)
      },
      async restart() {
        if (finalized || child !== undefined || url !== undefined) {
          throw new Error('DSH E2E Harness cannot restart in its current state')
        }
        await launch()
        return url!
      },
      async stop() {
        if (finalized) return
        finalized = true
        let portFailure: unknown
        try {
          if (child !== undefined && url !== undefined) await stopHarnessProcess(child, url)
        } catch (error) {
          portFailure = error
        } finally {
          if (sharedRoot === undefined) await removeRunRoot(runRoot)
        }
        if (privateLedger !== undefined && sharedRoot === undefined) {
          await updateResourceStatus(privateLedger, 'local_root', runRoot, 'cleaned', 'local_root_removed')
        }
        if (portFailure !== undefined) throw portFailure
      },
    }
  } catch (error) {
    if (child !== undefined) {
      signalProcessGroup(child, 'SIGTERM')
      if (!await waitForExit(child, 2_000)) signalProcessGroup(child, 'SIGKILL')
    }
    if (sharedRoot === undefined) await removeRunRoot(runRoot)
    if (privateLedger !== undefined && sharedRoot === undefined) {
      await updateResourceStatus(privateLedger, 'local_root', runRoot, 'cleaned', 'startup_failed_root_removed')
    }
    throw error
  }
}

export const harnessRepositoryRoot = resolve(repositoryRoot)
export const harnessRunRootPrefix = runRootPrefix
