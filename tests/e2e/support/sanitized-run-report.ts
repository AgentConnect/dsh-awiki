/** Privacy-safe, behavior-derived DSH E2E report and immutable handoff writer. */

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { RedactedLedger } from '../fixtures/resource-ledger.ts'
import { reviewedE2eTargets } from '../fixtures/protected-config.ts'

export type CaseStatus = 'passed' | 'failed' | 'skipped' | 'not_run'

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

export interface SanitizedE2eSourceBinding {
  readonly commit: string
  readonly tree: string
  readonly producerSha256: string
}

export interface SanitizedE2eRunReport {
  readonly schemaVersion: 2
  readonly kind: 'dsh_awiki_sanitized_e2e_run'
  readonly source: SanitizedE2eSourceBinding
  readonly runId: string
  readonly mode: 'smoke' | 'smoke-webkit' | 'live'
  readonly status: 'passed' | 'failed'
  readonly target: string
  readonly targetBinding: {
    readonly didDomain: string
    readonly userServiceUrl: string
    readonly messageServiceUrl: string
    readonly mailServiceUrl: string
    readonly messageServiceWsUrl: string
    readonly messageServiceDid: string
    readonly operatorProfile: string
    readonly modelTarget: 'isolated_ali_candidate'
  } | null
  readonly browserMode: 'headed' | 'headless'
  readonly platform: { readonly os: string; readonly arch: string; readonly node: string }
  readonly configStatus: 'not_needed' | 'passed' | 'failed'
  readonly failureCode: string | null
  readonly playwrightExit: number
  readonly cases: Readonly<Record<string, CaseStatus>>
  readonly secretScan: { readonly status: 'passed' | 'failed'; readonly filesScanned: number; readonly hitCount: number }
  readonly cleanup: { readonly status: 'passed' | 'failed'; readonly ledger: RedactedLedger | null }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`DSH sanitized E2E ${label} is invalid`)
  }
  return value as Record<string, unknown>
}

function exactKeys(value: unknown, expected: readonly string[], label: string): Record<string, unknown> {
  const result = record(value, label)
  const actual = Object.keys(result).sort()
  const wanted = [...expected].sort()
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`DSH sanitized E2E ${label} fields are invalid`)
  }
  return result
}

function nonnegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`DSH sanitized E2E ${label} is invalid`)
  }
  return value as number
}

function validateReport(report: SanitizedE2eRunReport): void {
  const root = exactKeys(report, [
    'schemaVersion', 'kind', 'source', 'runId', 'mode', 'status', 'target', 'targetBinding',
    'browserMode', 'platform',
    'configStatus', 'failureCode', 'playwrightExit', 'cases', 'secretScan', 'cleanup',
  ], 'report')
  if (root.schemaVersion !== 2 || root.kind !== 'dsh_awiki_sanitized_e2e_run') {
    throw new Error('DSH sanitized E2E report schema is invalid')
  }
  const source = exactKeys(root.source, ['commit', 'tree', 'producerSha256'], 'source')
  if (![source.commit, source.tree].every(value => typeof value === 'string' && /^[a-f0-9]{40}$/u.test(value))
    || typeof source.producerSha256 !== 'string'
    || !/^[a-f0-9]{64}$/u.test(source.producerSha256)) {
    throw new Error('DSH sanitized E2E source binding is invalid')
  }
  if (typeof root.runId !== 'string' || !/^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{8}$/u.test(root.runId)) {
    throw new Error('DSH sanitized E2E run ID is invalid')
  }
  if (!['smoke', 'smoke-webkit', 'live'].includes(String(root.mode))
    || !['passed', 'failed'].includes(String(root.status))
    || !['none', 'rwiki-cn-testing', 'awiki-info-testing'].includes(String(root.target))
    || !['headed', 'headless'].includes(String(root.browserMode))
    || !['not_needed', 'passed', 'failed'].includes(String(root.configStatus))
    || (root.failureCode !== null && (typeof root.failureCode !== 'string' || !/^(?=.*[a-z_])[a-z0-9_]{1,64}$/u.test(root.failureCode)))) {
    throw new Error('DSH sanitized E2E closed run state is invalid')
  }
  nonnegativeInteger(root.playwrightExit, 'Playwright exit')
  if (root.target === 'none') {
    if (root.targetBinding !== null) throw new Error('DSH sanitized E2E target binding is invalid')
  } else {
    const binding = exactKeys(root.targetBinding, [
      'didDomain', 'userServiceUrl', 'messageServiceUrl', 'mailServiceUrl',
      'messageServiceWsUrl', 'messageServiceDid', 'operatorProfile',
      'modelTarget',
    ], 'target binding')
    const expected = reviewedE2eTargets[root.target as keyof typeof reviewedE2eTargets]
    if (expected === undefined || Object.entries(binding).some(([key, value]) => (
      value !== expected[key as keyof typeof expected]
    ))) throw new Error('DSH sanitized E2E target binding is invalid')
  }
  const platform = exactKeys(root.platform, ['os', 'arch', 'node'], 'platform')
  if (typeof platform.os !== 'string' || !/^[a-z0-9_-]+$/u.test(platform.os)
    || typeof platform.arch !== 'string' || !/^[a-z0-9_-]+$/u.test(platform.arch)
    || typeof platform.node !== 'string' || !/^v[0-9]+\.[0-9]+\.[0-9]+$/u.test(platform.node)) {
    throw new Error('DSH sanitized E2E platform is invalid')
  }
  const cases = record(root.cases, 'cases')
  if (Object.keys(cases).length === 0) throw new Error('DSH sanitized E2E cases are empty')
  for (const [caseId, status] of Object.entries(cases)) {
    if (!/^DSH-WEB-[A-Z0-9-]+$/u.test(caseId)
      || !['passed', 'failed', 'skipped', 'not_run'].includes(String(status))) {
      throw new Error('DSH sanitized E2E case state is invalid')
    }
  }
  const secretScan = exactKeys(root.secretScan, ['status', 'filesScanned', 'hitCount'], 'secret scan')
  if (!['passed', 'failed'].includes(String(secretScan.status))) {
    throw new Error('DSH sanitized E2E secret scan status is invalid')
  }
  nonnegativeInteger(secretScan.filesScanned, 'secret scan file count')
  nonnegativeInteger(secretScan.hitCount, 'secret scan hit count')
  const cleanup = exactKeys(root.cleanup, ['status', 'ledger'], 'cleanup')
  if (!['passed', 'failed'].includes(String(cleanup.status))) {
    throw new Error('DSH sanitized E2E cleanup status is invalid')
  }
  if (cleanup.ledger === null) return
  const ledger = exactKeys(cleanup.ledger, [
    'schemaVersion', 'runId', 'target', 'counts', 'cleanup', 'reasonCodes',
  ], 'cleanup ledger')
  if (ledger.schemaVersion !== 1 || ledger.runId !== root.runId || ledger.target !== root.target) {
    throw new Error('DSH sanitized E2E cleanup ledger binding is invalid')
  }
  const counts = exactKeys(ledger.counts, ['identity', 'group', 'message', 'local_root'], 'resource counts')
  const cleanupCounts = exactKeys(ledger.cleanup, ['pending', 'cleaned', 'partial', 'residual'], 'cleanup counts')
  for (const [key, value] of [...Object.entries(counts), ...Object.entries(cleanupCounts)]) {
    nonnegativeInteger(value, key)
  }
  if (!Array.isArray(ledger.reasonCodes)
    || ledger.reasonCodes.some(value => typeof value !== 'string' || !/^(?=.*[a-z_])[a-z0-9_]{1,64}$/u.test(value))) {
    throw new Error('DSH sanitized E2E cleanup reason codes are invalid')
  }
}

/** Derive effective Browser mode only from the actual Playwright CLI arguments. */
export function effectiveBrowserMode(args: readonly string[]): 'headed' | 'headless' {
  return args.includes('--headed') ? 'headed' : 'headless'
}

/** Fail closed when the frozen awiki.info Recovery topology is not headed macOS. */
export function assertReviewedExecutionMode(
  target: string,
  platform: string,
  browserMode: 'headed' | 'headless',
): void {
  if (target === 'awiki-info-testing' && (platform !== 'darwin' || browserMode !== 'headed')) {
    throw new Error('awiki_info_requires_headed_macos')
  }
}

function collectSpecs(suite: PlaywrightSuite, output: PlaywrightSpec[]): void {
  output.push(...suite.specs ?? [])
  for (const child of suite.suites ?? []) collectSpecs(child, output)
}

/** Derive closed required-case states from executed Playwright results. */
export function deriveCaseResults(
  document: unknown,
  required: readonly string[],
): Readonly<Record<string, CaseStatus>> {
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

function gitValue(repositoryRoot: string, args: readonly string[]): string {
  const result = spawnSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) throw new Error('DSH E2E source binding could not read Git state')
  return result.stdout.trim()
}

/** Bind one official run to a clean committed DSH tree and this executed producer. */
export async function readSanitizedE2eSourceBinding(
  repositoryRoot: string,
  producerPath: string,
): Promise<SanitizedE2eSourceBinding> {
  if (gitValue(repositoryRoot, ['status', '--porcelain=v1', '--untracked-files=no']) !== '') {
    throw new Error('DSH E2E source binding requires a clean tracked worktree')
  }
  const commit = gitValue(repositoryRoot, ['rev-parse', 'HEAD'])
  const tree = gitValue(repositoryRoot, ['rev-parse', 'HEAD^{tree}'])
  if (!/^[a-f0-9]{40}$/u.test(commit) || !/^[a-f0-9]{40}$/u.test(tree)) {
    throw new Error('DSH E2E source binding is invalid')
  }
  const producerSha256 = createHash('sha256').update(await readFile(producerPath)).digest('hex')
  return { commit, tree, producerSha256 }
}

/** Write the only System Test handoff report plus its transport digest sidecar. */
export async function writeSanitizedE2eRunReport(
  outputRoot: string,
  report: SanitizedE2eRunReport,
): Promise<string> {
  validateReport(report)
  const body = `${JSON.stringify(report, null, 2)}\n`
  const digest = createHash('sha256').update(body).digest('hex')
  await writeFile(join(outputRoot, 'run-report.json'), body)
  await writeFile(join(outputRoot, 'run-report.sha256'), `${digest}  run-report.json\n`)
  return digest
}
