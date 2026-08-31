import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtemp, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { recordResource, updateResourceStatus } from './resource-ledger.ts'

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url))
const dshExecutable = join(repositoryRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'dsh.cmd' : 'dsh')
const runRootPrefix = 'dsh-awiki-e2e-'
const commandOutputLimit = 2 * 1024 * 1024
const prepareTimeoutMs = 5 * 60_000
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
  identityPlugin: '0.1.0-dsh-test.20260831.1',
  imCoreNode: '0.2.1-dsh-test.20260831.1',
})

export interface HarnessInstance {
  readonly url: string
  readonly runRoot: string
  readonly profileRoot: string
  readonly stateRoot: string
  readonly logDir: string
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

async function runChecked(
  stage: string,
  command: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly env: NodeJS.ProcessEnv },
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
    }, prepareTimeoutMs)
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
        rejectCommand(new Error(`DSH E2E ${stage} failed (${reason})`))
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

async function prepareProfile(runRoot: string): Promise<PreparedProfile> {
  const packagesRoot = join(runRoot, 'packages')
  const dshHome = join(runRoot, 'dsh-home')
  const profileRoot = join(dshHome, 'profiles', 'web')
  const pluginTarball = join(packagesRoot, 'awiki-dsh-plugin-0.3.7.tgz')
  for (const directory of [
    packagesRoot,
    join(runRoot, 'home'),
    join(runRoot, 'xdg-config'),
    join(runRoot, 'xdg-cache'),
    join(runRoot, 'xdg-data'),
    join(runRoot, 'logs'),
  ]) await mkdir(directory, { recursive: true })
  const env: NodeJS.ProcessEnv = {
    ...isolatedBaseEnvironment(runRoot),
    DSH_HOME: dshHome,
    DSH_TELEMETRY_DISABLED: '1',
  }
  await runChecked('plugin pack', 'pnpm', ['pack', '--out', pluginTarball], {
    cwd: repositoryRoot,
    env,
  })
  await runChecked('profile dependency install', dshExecutable, [
    'plugin', '--profile', 'web', 'add',
    `@agent-network-protocol/dsh-anp-identity@${e2ePackageVersions.identityPlugin}`,
    `@awiki/im-core-node@${e2ePackageVersions.imCoreNode}`,
  ], { cwd: repositoryRoot, env })
  await writeFile(join(profileRoot, 'pnpm-workspace.yaml'), [
    'overrides:',
    `  '@awiki/im-core-node': ${e2ePackageVersions.imCoreNode}`,
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
  if (installed.name !== '@awiki/dsh-plugin' || installed.version !== '0.3.7') {
    throw new Error('DSH E2E installed plugin version does not match the current candidate')
  }
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

export async function startHarnessInstance(): Promise<HarnessInstance> {
  const runRoot = await mkdtemp(join(tmpdir(), runRootPrefix))
  await assertSafeRunRoot(runRoot)
  const privateLedger = process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER
  if (privateLedger !== undefined) {
    await recordResource(privateLedger, {
      kind: 'local_root',
      identifier: runRoot,
      status: 'pending',
      reasonCode: 'created',
    })
  }
  let child: ChildProcess | undefined
  try {
    const prepared = await prepareProfile(runRoot)
    const env = harnessEnvironment(runRoot, prepared.dshHome)
    child = spawn(dshExecutable, [
      'web', '--no-open', '--host', '127.0.0.1', '--port', '0',
    ], {
      cwd: repositoryRoot,
      env,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const url = await awaitReadyUrl(child)
    await waitForHttpReady(url)
    let stopped = false
    return {
      url,
      runRoot,
      profileRoot: prepared.profileRoot,
      stateRoot: env.DSH_AWIKI_STATE_ROOT!,
      logDir: join(runRoot, 'logs'),
      async stop() {
        if (stopped) return
        stopped = true
        signalProcessGroup(child!, 'SIGTERM')
        if (!await waitForExit(child!, shutdownTimeoutMs)) {
          signalProcessGroup(child!, 'SIGKILL')
          if (!await waitForExit(child!, 5_000)) {
            throw new Error('DSH E2E Harness process group did not stop')
          }
        }
        let portFailure: unknown
        try {
          await waitForHttpClosed(url)
        } catch (error) {
          portFailure = error
        } finally {
          await removeRunRoot(runRoot)
        }
        if (privateLedger !== undefined) {
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
    await removeRunRoot(runRoot)
    if (privateLedger !== undefined) {
      await updateResourceStatus(privateLedger, 'local_root', runRoot, 'cleaned', 'startup_failed_root_removed')
    }
    throw error
  }
}

export const harnessRepositoryRoot = resolve(repositoryRoot)
export const harnessRunRootPrefix = runRootPrefix
