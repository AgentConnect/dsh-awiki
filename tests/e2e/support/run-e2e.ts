import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { loadProtectedE2eConfig, reviewedE2eTarget } from '../fixtures/protected-config.ts'
import {
  createPrivateLedger,
  privateResourceIdentifiers,
  recordResource,
  redactLedger,
  updateResourceStatus,
} from '../fixtures/resource-ledger.ts'
import { scanArtifacts } from './secret-scan.ts'
import { startSshConnectProxy, type SshConnectProxy } from './ssh-connect-proxy.ts'
import { liveCaseIds, smokeCaseIds } from './case-ids.ts'
import {
  cleanupManagedAccounts,
  preflightManagedCleanup,
  resolveAccountId,
} from './managed-cleanup.ts'

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url))
const privateRootPrefix = 'dsh-awiki-e2e-private-'
const liveRootPrefix = 'dsh-awiki-e2e-live-'
const runIdPattern = /^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{8}$/u

type RunMode = 'smoke' | 'smoke-webkit' | 'live'
type CaseStatus = 'passed' | 'failed' | 'skipped' | 'not_run'

interface PlaywrightSuite {
  readonly suites?: readonly PlaywrightSuite[]
  readonly specs?: readonly PlaywrightSpec[]
}

interface PlaywrightSpec {
  readonly title?: unknown
  readonly tests?: readonly {
    readonly status?: unknown
    readonly results?: readonly {
      readonly status?: unknown
      readonly workerIndex?: unknown
      readonly duration?: unknown
    }[]
  }[]
}

function runId(): string {
  const timestamp = new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, 'Z')
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8)
  return `${timestamp}-${suffix}`
}

async function runPlaywright(mode: RunMode, env: NodeJS.ProcessEnv, args: readonly string[]): Promise<number> {
  const cli = join(repositoryRoot, 'node_modules', '@playwright', 'test', 'cli.js')
  const project = mode === 'smoke'
    ? 'smoke-chromium'
    : mode === 'smoke-webkit' ? 'smoke-webkit' : 'live-chromium'
  return new Promise(resolveExit => {
    const child = spawn(process.execPath, [cli, 'test', `--project=${project}`, ...args], {
      cwd: repositoryRoot,
      env,
      stdio: 'inherit',
    })
    child.once('error', () => resolveExit(1))
    child.once('exit', code => resolveExit(code ?? 1))
  })
}

function collectSpecs(suite: PlaywrightSuite, output: PlaywrightSpec[]): void {
  output.push(...suite.specs ?? [])
  for (const child of suite.suites ?? []) collectSpecs(child, output)
}

function caseResults(document: unknown, required: readonly string[]): Readonly<Record<string, CaseStatus>> {
  const suites = typeof document === 'object' && document !== null
    ? (document as { readonly suites?: readonly PlaywrightSuite[] }).suites ?? []
    : []
  const specs: PlaywrightSpec[] = []
  for (const suite of suites) collectSpecs(suite, specs)
  return Object.fromEntries(required.map(caseId => {
    const matching = specs.filter(spec => typeof spec.title === 'string' && spec.title.includes(`[${caseId}]`))
    if (matching.length !== 1) return [caseId, 'not_run']
    const tests = matching[0]!.tests ?? []
    if (tests.length === 0) return [caseId, 'not_run']
    if (tests.every(test => test.results?.every(result => (
      result.status === 'skipped' && result.workerIndex === -1 && result.duration === 0
    )) === true)) return [caseId, 'not_run']
    if (tests.some(test => test.status === 'skipped' || test.results?.some(result => result.status === 'skipped'))) {
      return [caseId, 'skipped']
    }
    if (tests.every(test => test.status === 'expected' && test.results?.some(result => result.status === 'passed'))) {
      return [caseId, 'passed']
    }
    return [caseId, 'failed']
  }))
}

async function assertPrivateRoot(path: string): Promise<void> {
  if (!isAbsolute(path) || !basename(path).startsWith(privateRootPrefix)) {
    throw new Error('DSH E2E private root is outside the owned namespace')
  }
  if (await realpath(dirname(path)) !== await realpath(tmpdir())) {
    throw new Error('DSH E2E private root is outside the system temp directory')
  }
}

async function assertLiveRoot(path: string): Promise<void> {
  if (!isAbsolute(path) || !basename(path).startsWith(liveRootPrefix)) {
    throw new Error('DSH E2E live root is outside the owned namespace')
  }
  if (await realpath(dirname(path)) !== await realpath(tmpdir())) {
    throw new Error('DSH E2E live root is outside the system temp directory')
  }
}

function requiredCases(mode: RunMode, args: readonly string[]): readonly string[] {
  if (mode !== 'live') return smokeCaseIds
  const grepIndex = args.findIndex(value => value === '--grep')
  const grep = grepIndex >= 0 ? args[grepIndex + 1] : args.find(value => value.startsWith('--grep='))?.slice(7)
  if (grep === undefined) return liveCaseIds
  if (/direct/iu.test(grep)) return liveCaseIds.slice(0, 2)
  if (/group/iu.test(grep)) return [liveCaseIds[2]]
  if (/restart/iu.test(grep)) return [liveCaseIds[3]]
  if (/multi-device|device/iu.test(grep)) return [liveCaseIds[4]]
  if (/recovery/iu.test(grep)) return [liveCaseIds[5]]
  throw new Error('DSH E2E live grep does not select a reviewed case scope')
}

async function main(): Promise<void> {
  const mode = process.argv[2]
  if (mode !== 'smoke' && mode !== 'smoke-webkit' && mode !== 'live') {
    throw new Error('usage: run-e2e.ts <smoke|smoke-webkit|live> [playwright args]')
  }
  const id = runId()
  if (!runIdPattern.test(id)) throw new Error('DSH E2E run id is invalid')
  const outputRoot = resolve(repositoryRoot, '.artifacts', 'e2e', 'runs', id)
  const privateRoot = await mkdtemp(join(tmpdir(), privateRootPrefix))
  await assertPrivateRoot(privateRoot)
  await mkdir(outputRoot, { recursive: true })
  const privateLedger = join(privateRoot, 'resource-ledger.private.json')
  const handoffPath = join(privateRoot, 'live-handoff.json')
  const rawPlaywrightArgs = process.argv.slice(3)
  const playwrightArgs = rawPlaywrightArgs[0] === '--' ? rawPlaywrightArgs.slice(1) : rawPlaywrightArgs
  const required = requiredCases(mode, playwrightArgs)
  let exactSecrets: string[] = []
  let configStatus: 'not_needed' | 'passed' | 'failed' = mode === 'live' ? 'failed' : 'not_needed'
  const playwrightReport = join(outputRoot, 'playwright-report.json')
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DSH_AWIKI_E2E_RUN_ID: id,
    DSH_AWIKI_E2E_OUTPUT_DIR: outputRoot,
    DSH_AWIKI_E2E_PRIVATE_LEDGER: privateLedger,
    DSH_AWIKI_E2E_HANDOFF: handoffPath,
  }
  let playwrightExit = 1
  let scanStatus: 'passed' | 'failed' = 'failed'
  let filesScanned = 0
  let scanHits: readonly string[] = []
  let redactedLedger: Awaited<ReturnType<typeof redactLedger>> | undefined
  let cleanupStatus: 'passed' | 'failed' = 'passed'
  let evidenceFailureCode: string | null = null
  let cases: Readonly<Record<string, CaseStatus>> = Object.fromEntries(
    required.map(caseId => [caseId, 'not_run']),
  )
  let sharedRoot: string | undefined
  let sshProxy: SshConnectProxy | undefined
  try {
    await createPrivateLedger(privateLedger, id, mode === 'live' ? reviewedE2eTarget.name : 'none')
    if (mode === 'live') {
      sharedRoot = await mkdtemp(join(tmpdir(), liveRootPrefix))
      await assertLiveRoot(sharedRoot)
      await recordResource(privateLedger, {
        kind: 'local_root',
        identifier: sharedRoot,
        status: 'pending',
        reasonCode: 'created',
      })
      env.DSH_AWIKI_E2E_SHARED_ROOT = sharedRoot
      const configPath = process.env.DSH_AWIKI_E2E_CONFIG
      if (configPath === undefined) throw new Error('live_config_missing')
      const config = await loadProtectedE2eConfig(configPath)
      exactSecrets = [config.phone, config.otp]
      configStatus = 'passed'
      await preflightManagedCleanup(id)
      if (process.platform === 'darwin') {
        sshProxy = await startSshConnectProxy()
        env.HTTP_PROXY = sshProxy.url
        env.HTTPS_PROXY = sshProxy.url
        env.NO_PROXY = '127.0.0.1,localhost,registry.npmjs.org'
        delete env.ALL_PROXY
      }
    }
    playwrightExit = await runPlaywright(mode, env, playwrightArgs)
    try {
      const report = JSON.parse(await readFile(playwrightReport, 'utf8')) as unknown
      cases = caseResults(report, required)
    } catch {
      // Missing or malformed Playwright evidence remains not_run and fails closed.
    }
    if (mode === 'live') {
      const handles = await privateResourceIdentifiers(privateLedger, 'identity')
      const accountIds: string[] = []
      for (const handle of handles) {
        const accountId = await resolveAccountId(handle)
        if (accountId !== undefined) accountIds.push(accountId)
      }
      if (accountIds.length > 0) await cleanupManagedAccounts(id, accountIds)
      for (const handle of handles) {
        await updateResourceStatus(privateLedger, 'identity', handle, 'cleaned', 'managed_account_cleanup')
      }
      for (const kind of ['group', 'message'] as const) {
        for (const identifier of await privateResourceIdentifiers(privateLedger, kind)) {
          await updateResourceStatus(privateLedger, kind, identifier, 'cleaned', 'managed_account_cleanup')
        }
      }
    }
  } catch {
    evidenceFailureCode = 'evidence_pipeline_failed'
  }
  await sshProxy?.close().catch(() => { cleanupStatus = 'failed' })
  if (sharedRoot !== undefined) {
    try {
      await assertLiveRoot(sharedRoot)
      await rm(sharedRoot, { recursive: true, force: true })
      await updateResourceStatus(privateLedger, 'local_root', sharedRoot, 'cleaned', 'local_root_removed')
    } catch {
      cleanupStatus = 'failed'
      evidenceFailureCode = 'evidence_pipeline_failed'
    }
  }
  try {
    redactedLedger = await redactLedger(privateLedger)
    await writeFile(join(outputRoot, 'resource-ledger.json'), `${JSON.stringify(redactedLedger, null, 2)}\n`)
    const scan = await scanArtifacts(outputRoot, exactSecrets)
    filesScanned = scan.filesScanned
    scanHits = scan.hits
    scanStatus = scan.hits.length === 0 ? 'passed' : 'failed'
    if (redactedLedger.cleanup.pending !== 0) cleanupStatus = 'failed'
  } catch {
    evidenceFailureCode = 'evidence_pipeline_failed'
  }
  try {
    await assertPrivateRoot(privateRoot)
    await rm(privateRoot, { recursive: true, force: true })
  } catch {
    cleanupStatus = 'failed'
  }
  const requiredStatuses = Object.values(cases)
  const status = playwrightExit === 0
    && evidenceFailureCode === null
    && scanStatus === 'passed'
    && cleanupStatus === 'passed'
    && requiredStatuses.length > 0
    && requiredStatuses.every(value => value === 'passed')
    ? 'passed'
    : 'failed'
  const report = {
    schemaVersion: 1,
    runId: id,
    mode,
    status,
    target: mode === 'live' ? reviewedE2eTarget.name : 'none',
    platform: { os: process.platform, arch: process.arch, node: process.version },
    configStatus,
    failureCode: evidenceFailureCode,
    playwrightExit,
    cases,
    secretScan: { status: scanStatus, filesScanned, hitCount: scanHits.length },
    cleanup: { status: cleanupStatus, ledger: redactedLedger ?? null },
  }
  await writeFile(join(outputRoot, 'run-report.json'), `${JSON.stringify(report, null, 2)}\n`)
  process.stdout.write(`DSH E2E ${mode}: status=${status}; runId=${id}; cases=${JSON.stringify(cases)}\n`)
  if (status !== 'passed') process.exitCode = 1
}

await main()
