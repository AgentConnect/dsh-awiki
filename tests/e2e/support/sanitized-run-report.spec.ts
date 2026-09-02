import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  deriveCaseResults,
  writeSanitizedE2eRunReport,
  type SanitizedE2eRunReport,
} from './sanitized-run-report.ts'
import { requiredCaseIds } from './case-ids.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function root(): Promise<string> {
  const value = await mkdtemp(join(tmpdir(), 'dsh-sanitized-e2e-report-'))
  roots.push(value)
  return value
}

describe('DSH sanitized E2E System Test handoff', () => {
  it('selects both executable recovery cases and reports them only from executed specs', () => {
    expect(requiredCaseIds('live', ['--grep', 'model-recovery'])).toEqual([
      'DSH-WEB-MODEL-RECOVERY-001',
    ])
    expect(requiredCaseIds('live', ['--grep=mail-recovery'])).toEqual([
      'DSH-WEB-MAIL-RECOVERY-001',
    ])
    expect(requiredCaseIds('live', ['--grep', 'recovery'])).toEqual([
      'DSH-WEB-RECOVERY-001',
      'DSH-WEB-MODEL-RECOVERY-001',
      'DSH-WEB-MAIL-RECOVERY-001',
    ])
    const required = ['DSH-WEB-MODEL-RECOVERY-001', 'DSH-WEB-MAIL-RECOVERY-001']
    const modelOnly = deriveCaseResults({
      suites: [{ specs: [{
        title: '[DSH-WEB-MODEL-RECOVERY-001] executed',
        tests: [{ status: 'expected', results: [{ status: 'passed', duration: 1 }] }],
      }] }],
    }, required)
    expect(modelOnly).toEqual({
      'DSH-WEB-MODEL-RECOVERY-001': 'passed',
      'DSH-WEB-MAIL-RECOVERY-001': 'not_run',
    })
    const both = deriveCaseResults({
      suites: [{ specs: required.map(caseId => ({
        title: `[${caseId}] executed`,
        tests: [{ status: 'expected', results: [{ status: 'passed', duration: 1 }] }],
      })) }],
    }, required)
    expect(both).toEqual({
      'DSH-WEB-MODEL-RECOVERY-001': 'passed',
      'DSH-WEB-MAIL-RECOVERY-001': 'passed',
    })
  })

  it('derives closed case states from native execution while dropping reporter paths', () => {
    const native = {
      config: {
        rootDir: '/Users/private/dsh-awiki',
        projects: [{ outputDir: '/Users/private/results', testDir: '/Users/private/tests' }],
      },
      suites: [{
        specs: [
          { title: '[CASE-PASS] flow', tests: [{ status: 'expected', results: [{ status: 'passed', duration: 12 }] }] },
          { title: '[CASE-FAIL] flow', tests: [{ status: 'unexpected', results: [{ status: 'failed', duration: 7 }] }] },
          { title: '[CASE-SKIP] flow', tests: [{ status: 'skipped', results: [{ status: 'skipped', workerIndex: 0, duration: 1 }] }] },
          { title: '[CASE-NOT-RUN] flow', tests: [{ status: 'skipped', results: [{ status: 'skipped', workerIndex: -1, duration: 0 }] }] },
        ],
      }],
    }

    const cases = deriveCaseResults(native, [
      'CASE-PASS', 'CASE-FAIL', 'CASE-SKIP', 'CASE-NOT-RUN', 'CASE-MISSING',
    ])

    expect(cases).toEqual({
      'CASE-PASS': 'passed',
      'CASE-FAIL': 'failed',
      'CASE-SKIP': 'skipped',
      'CASE-NOT-RUN': 'not_run',
      'CASE-MISSING': 'not_run',
    })
    expect(JSON.stringify(cases)).not.toContain('/Users/private')
  })

  it('writes only the sanitized report and exact digest sidecar for immutable handoff', async () => {
    const output = await root()
    const report: SanitizedE2eRunReport = {
      schemaVersion: 2,
      kind: 'dsh_awiki_sanitized_e2e_run',
      source: {
        commit: 'a'.repeat(40),
        tree: 'b'.repeat(40),
        producerSha256: 'c'.repeat(64),
      },
      runId: '20260902T120000Z-1234abcd',
      mode: 'live',
      status: 'passed',
      target: 'rwiki-cn-testing',
      platform: { os: 'darwin', arch: 'x64', node: 'v22.23.1' },
      configStatus: 'passed',
      failureCode: null,
      playwrightExit: 0,
      cases: {
        'DSH-WEB-MODEL-RECOVERY-001': 'passed',
        'DSH-WEB-MAIL-RECOVERY-001': 'passed',
      },
      secretScan: { status: 'passed', filesScanned: 7, hitCount: 0 },
      cleanup: {
        status: 'passed',
        ledger: {
          schemaVersion: 1,
          runId: '20260902T120000Z-1234abcd',
          target: 'rwiki-cn-testing',
          counts: { identity: 2, group: 0, message: 1, local_root: 1 },
          cleanup: { pending: 0, cleaned: 4, partial: 0, residual: 0 },
          reasonCodes: ['local_root_removed', 'managed_account_cleanup'],
        },
      },
    }

    const digest = await writeSanitizedE2eRunReport(output, report)
    const body = await readFile(join(output, 'run-report.json'), 'utf8')
    const sidecar = await readFile(join(output, 'run-report.sha256'), 'utf8')

    expect(digest).toBe(createHash('sha256').update(body).digest('hex'))
    expect(sidecar).toBe(`${digest}  run-report.json\n`)
    expect(JSON.parse(body)).toEqual(report)
    expect(body).not.toMatch(/\/Users\/|did:wba:|@[a-z0-9.-]+|playwright-report\.json/iu)
  })

  it.each([
    ['absolute path', { platform: { os: 'darwin', arch: 'x64', node: '/Users/private/node' } }],
    ['raw identifier field', { rawDid: 'did:wba:private.example' }],
    ['raw identifier case', { cases: { 'alice@example.com': 'passed' } }],
    ['pretty JSON phone scalar', { failureCode: '13800138000' }],
    ['pretty JSON OTP array value', {
      cleanup: {
        status: 'passed',
        ledger: {
          schemaVersion: 1,
          runId: '20260902T120000Z-1234abcd',
          target: 'rwiki-cn-testing',
          counts: { identity: 0, group: 0, message: 0, local_root: 0 },
          cleanup: { pending: 0, cleaned: 0, partial: 0, residual: 0 },
          reasonCodes: ['123456'],
        },
      },
    }],
  ] as const)('rejects %s before writing a handoff', async (_label, mutation) => {
    const output = await root()
    const report = {
      schemaVersion: 2,
      kind: 'dsh_awiki_sanitized_e2e_run',
      source: { commit: 'a'.repeat(40), tree: 'b'.repeat(40), producerSha256: 'c'.repeat(64) },
      runId: '20260902T120000Z-1234abcd',
      mode: 'live',
      status: 'failed',
      target: 'rwiki-cn-testing',
      platform: { os: 'darwin', arch: 'x64', node: 'v22.23.1' },
      configStatus: 'passed',
      failureCode: null,
      playwrightExit: 1,
      cases: { 'DSH-WEB-MODEL-RECOVERY-001': 'failed' },
      secretScan: { status: 'passed', filesScanned: 1, hitCount: 0 },
      cleanup: { status: 'passed', ledger: null },
      ...mutation,
    }

    await expect(writeSanitizedE2eRunReport(output, report as never)).rejects.toThrow('DSH sanitized E2E')
    await expect(readFile(join(output, 'run-report.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
