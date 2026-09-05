import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { loadProtectedE2eConfig, type ProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { collectMailServerReceipt, collectModelServerReceipt } from '../fixtures/recovery-server-receipts.ts'
import {
  createPrivateLedger,
  privateResourceIdentifiers,
  recordResource,
  redactLedger,
  updateResourceStatus,
} from '../fixtures/resource-ledger.ts'
import { scanArtifacts } from './secret-scan.ts'
import { startSshConnectProxy, type SshConnectProxy } from './ssh-connect-proxy.ts'
import { requiredCaseIds, type E2eRunMode } from './case-ids.ts'
import {
  deriveCaseResults,
  effectiveBrowserMode,
  assertReviewedExecutionMode,
  readSanitizedE2eSourceBinding,
  writeSanitizedE2eRunReport,
  type CaseStatus,
  type SanitizedE2eRunReport,
} from './sanitized-run-report.ts'
import {
  cleanupManagedAccounts,
  preflightManagedCleanup,
  resolveAccountId,
} from './managed-cleanup.ts'
import {
  exchangeRecoveryReceiptProducer,
  type RecoveryProducerAck,
  type RecoveryReceiptRole,
} from './recovery-receipt-producer.ts'

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url))
const privateRootPrefix = 'dsh-awiki-e2e-private-'
const liveRootPrefix = 'dsh-awiki-e2e-live-'
const runIdPattern = /^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{8}$/u

type RunMode = E2eRunMode

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

async function main(): Promise<void> {
  const mode = process.argv[2]
  if (mode !== 'smoke' && mode !== 'smoke-webkit' && mode !== 'live') {
    throw new Error('usage: run-e2e.ts <smoke|smoke-webkit|live> [playwright args]')
  }
  const source = await readSanitizedE2eSourceBinding(repositoryRoot, fileURLToPath(import.meta.url))
  const id = process.env.DSH_AWIKI_E2E_RUN_ID ?? runId()
  if (!runIdPattern.test(id)) throw new Error('DSH E2E run id is invalid')
  const outputRoot = resolve(repositoryRoot, '.artifacts', 'e2e', 'runs', id)
  const privateRoot = await mkdtemp(join(tmpdir(), privateRootPrefix))
  await assertPrivateRoot(privateRoot)
  await mkdir(outputRoot, { recursive: true })
  const privateLedger = join(privateRoot, 'resource-ledger.private.json')
  const handoffPath = join(privateRoot, 'live-handoff.json')
  const rawPlaywrightArgs = process.argv.slice(3)
  const playwrightArgs = rawPlaywrightArgs[0] === '--' ? rawPlaywrightArgs.slice(1) : rawPlaywrightArgs
  const required = requiredCaseIds(mode, playwrightArgs)
  const receiptRoles: RecoveryReceiptRole[] = []
  if (required.includes('DSH-WEB-MODEL-RECOVERY-001')) receiptRoles.push('model')
  if (required.includes('DSH-WEB-MAIL-RECOVERY-001')) receiptRoles.push('mail')
  const browserMode = effectiveBrowserMode(playwrightArgs)
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
  let config: ProtectedE2eConfig | undefined
  const producerBegins = new Map<RecoveryReceiptRole, RecoveryProducerAck>()
  try {
    if (mode === 'live') {
      const configPath = process.env.DSH_AWIKI_E2E_CONFIG
      if (configPath === undefined) throw new Error('live_config_missing')
      config = await loadProtectedE2eConfig(configPath)
      assertReviewedExecutionMode(config.target, process.platform, browserMode)
    }
    await createPrivateLedger(privateLedger, id, config?.target ?? 'none')
    if (mode === 'live' && config !== undefined) {
      sharedRoot = await mkdtemp(join(tmpdir(), liveRootPrefix))
      await assertLiveRoot(sharedRoot)
      await recordResource(privateLedger, {
        kind: 'local_root',
        identifier: sharedRoot,
        status: 'pending',
        reasonCode: 'created',
      })
      env.DSH_AWIKI_E2E_SHARED_ROOT = sharedRoot
      exactSecrets = [
        config.phone,
        config.otp,
        config.modelPrompt,
        config.modelExpectedText,
        config.mailEchoRecipient,
      ]
      configStatus = 'passed'
      await preflightManagedCleanup(id, config.targetBinding)
      for (const role of receiptRoles) {
        producerBegins.set(role, await exchangeRecoveryReceiptProducer(config, id, role, 'begin'))
      }
      if (process.platform === 'darwin' && config.target === 'rwiki-cn-testing') {
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
      cases = deriveCaseResults(report, required)
    } catch {
      // Missing or malformed Playwright evidence remains not_run and fails closed.
    }
    if (mode === 'live' && config !== undefined) {
      try {
        const operationFingerprints: string[] = []
        for (const role of receiptRoles) {
          const begin = producerBegins.get(role)
          if (begin === undefined) throw new Error('DSH E2E receipt producer begin acknowledgement is missing')
          const finish = await exchangeRecoveryReceiptProducer(config, id, role, 'finish', begin)
          operationFingerprints.push(role === 'model'
            ? await collectModelServerReceipt(config, id, finish)
            : await collectMailServerReceipt(config, id, finish))
        }
        if (new Set(operationFingerprints).size > 1) {
          throw new Error('DSH E2E Model/Mail operation identity mismatch')
        }
      } catch {
        evidenceFailureCode = 'receipt_pipeline_failed'
      }
      const handles = await privateResourceIdentifiers(privateLedger, 'identity')
      const accountIds: string[] = []
      for (const handle of handles) {
        const accountId = await resolveAccountId(handle, config.targetBinding)
        if (accountId !== undefined) accountIds.push(accountId)
      }
      if (accountIds.length > 0) await cleanupManagedAccounts(id, accountIds, config.targetBinding)
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
  const report: SanitizedE2eRunReport = {
    schemaVersion: 2,
    kind: 'dsh_awiki_sanitized_e2e_run',
    source,
    runId: id,
    mode,
    status,
    target: config?.target ?? 'none',
    targetBinding: config === undefined ? null : {
      didDomain: config.targetBinding.didDomain,
      userServiceUrl: config.targetBinding.userServiceUrl,
      messageServiceUrl: config.targetBinding.messageServiceUrl,
      mailServiceUrl: config.targetBinding.mailServiceUrl,
      messageServiceWsUrl: config.targetBinding.messageServiceWsUrl,
      messageServiceDid: config.targetBinding.messageServiceDid,
      operatorProfile: config.targetBinding.operatorProfile,
      modelTarget: config.targetBinding.modelTarget,
    },
    browserMode,
    platform: { os: process.platform, arch: process.arch, node: process.version },
    configStatus,
    failureCode: evidenceFailureCode,
    playwrightExit,
    cases,
    secretScan: { status: scanStatus, filesScanned, hitCount: scanHits.length },
    cleanup: { status: cleanupStatus, ledger: redactedLedger ?? null },
  }
  const reportSha256 = await writeSanitizedE2eRunReport(outputRoot, report)
  process.stdout.write(`DSH E2E ${mode}: status=${status}; runId=${id}; reportSha256=${reportSha256}; cases=${JSON.stringify(cases)}\n`)
  if (status !== 'passed') process.exitCode = 1
}

await main()
