/** Closed privacy-safe Model/Mail server receipts bound to one DSH E2E run. */

import { lstat, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ProtectedE2eConfig } from './protected-config.ts'

type Json = Record<string, unknown>

function object(value: unknown, label: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`DSH E2E ${label} is invalid`)
  return value as Json
}

function keys(value: unknown, expected: readonly string[], label: string): Json {
  const result = object(value, label)
  if (JSON.stringify(Object.keys(result).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`DSH E2E ${label} fields are invalid`)
  }
  return result
}

function count(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`DSH E2E ${label} is invalid`)
  return value as number
}

function fingerprint(value: unknown, label: string): Json {
  const result = keys(value, ['algorithm', 'value'], label)
  if (result.algorithm !== 'sha256' || typeof result.value !== 'string' || !/^[a-f0-9]{64}$/u.test(result.value)) {
    throw new Error(`DSH E2E ${label} is invalid`)
  }
  return result
}

function fingerprintList(value: unknown, label: string, nonempty = true): Json[] {
  if (!Array.isArray(value) || (nonempty && value.length === 0)) throw new Error(`DSH E2E ${label} is invalid`)
  return value.map((item, index) => fingerprint(item, `${label}[${index}]`))
}

function countedState(value: unknown, label: string): Json {
  const result = keys(value, [
    'ledger', 'accounting', 'accountCount', 'aliasCount', 'fenceCount', 'anchorCount', 'operationCount',
  ], label)
  fingerprint(result.ledger, `${label}.ledger`)
  fingerprint(result.accounting, `${label}.accounting`)
  for (const field of ['accountCount', 'aliasCount', 'fenceCount', 'anchorCount', 'operationCount']) {
    count(result[field], `${label}.${field}`)
  }
  return result
}

function sameFingerprint(left: unknown, right: unknown): boolean {
  return JSON.stringify(fingerprint(left, 'fingerprint')) === JSON.stringify(fingerprint(right, 'fingerprint'))
}

function mailHistory(value: unknown, label: string): Json {
  const result = keys(value, ['mailbox', 'inbound', 'outbound', 'mime', 'attachment'], label)
  for (const field of ['mailbox', 'inbound', 'outbound', 'mime', 'attachment']) {
    fingerprintList(result[field], `${label}.${field}`)
  }
  if ((result.mailbox as unknown[]).length !== 1) throw new Error(`DSH E2E ${label}.mailbox is invalid`)
  return result
}

async function readReceipt(path: string, label: string): Promise<Json> {
  const deadline = Date.now() + 120_000
  while (true) {
    try {
      const metadata = await lstat(path)
      if (!metadata.isFile() || metadata.isSymbolicLink() || (metadata.mode & 0o777) !== 0o600
        || (process.getuid !== undefined && metadata.uid !== process.getuid())
        || metadata.size > 1024 * 1024) {
        throw new Error(`DSH E2E ${label} file is invalid`)
      }
      return object(JSON.parse(await readFile(path, 'utf8')) as unknown, label)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || Date.now() >= deadline) throw error
      await new Promise(resolve => setTimeout(resolve, 1_000))
    }
  }
}

function outputRoot(): string {
  const root = process.env.DSH_AWIKI_E2E_OUTPUT_DIR
  if (root === undefined) throw new Error('DSH E2E output root is unavailable')
  return root
}

export async function collectModelServerReceipt(config: ProtectedE2eConfig, runId: string): Promise<void> {
  const value = keys(await readReceipt(config.modelReceiptPath, 'Model receipt'), [
    'schemaVersion', 'kind', 'runId', 'modelArtifactDigest', 'requestFieldCount',
    'recoveryOutcome', 'resolvedAssurance', 'storedOperationAssurance', 'storedFenceAssurances',
    'providerTransitionAssertionVerifiedCount', 'oldSignatureUseCount', 'before', 'afterRecovery',
    'preRecoveryCompletionCount', 'completionCount', 'completionProvider', 'oldPrincipalRejections',
    'restart', 'unavailable', 'unverified',
  ], 'Model receipt')
  if (value.schemaVersion !== 1 || value.kind !== 'model_recovery_measurements' || value.runId !== runId
    || value.requestFieldCount !== 0 || value.recoveryOutcome !== 'restored'
    || value.resolvedAssurance !== 'provider_asserted' || value.storedOperationAssurance !== 'provider_asserted'
    || JSON.stringify(value.storedFenceAssurances) !== '["provider_asserted"]'
    || value.providerTransitionAssertionVerifiedCount !== 1 || value.oldSignatureUseCount !== 0
    || value.preRecoveryCompletionCount !== 1 || value.completionCount !== 1
    || value.completionProvider !== 'no_charge_stub') throw new Error('DSH E2E Model receipt contract failed')
  const artifact = fingerprint(value.modelArtifactDigest, 'Model artifact')
  if (artifact.value !== config.modelArtifactSha256) throw new Error('DSH E2E Model artifact binding failed')
  const before = countedState(value.before, 'Model before')
  const after = countedState(value.afterRecovery, 'Model after Recovery')
  if (!sameFingerprint(before.ledger, after.ledger) || !sameFingerprint(before.accounting, after.accounting)
    || before.accountCount !== 1 || after.accountCount !== 1
    || (after.aliasCount as number) - (before.aliasCount as number) !== 1
    || (after.fenceCount as number) - (before.fenceCount as number) !== 1
    || (after.anchorCount as number) - (before.anchorCount as number) !== 1
    || (after.operationCount as number) - (before.operationCount as number) !== 1) {
    throw new Error('DSH E2E Model ledger continuity failed')
  }
  const restart = keys(value.restart, ['outcome', 'rowGrowth', 'completionCount'], 'Model restart')
  const growth = keys(restart.rowGrowth, ['account', 'alias', 'fence', 'anchor', 'operation'], 'Model row growth')
  if (restart.outcome !== 'already_current' || restart.completionCount !== 1
    || Object.values(growth).some(item => item !== 0)) throw new Error('DSH E2E Model restart contract failed')
  const oldPrincipal = keys(value.oldPrincipalRejections, ['bearer', 'signature', 'cache', 'secondLedger'], 'Model old principal')
  if (Object.values(oldPrincipal).some(item => item !== 1)) throw new Error('DSH E2E Model old-principal fence failed')
  for (const [field, errorCode] of [
    ['unavailable', 'identity_recovery_unavailable'],
    ['unverified', 'identity_recovery_transition_unsupported'],
  ] as const) {
    const negative = keys(value[field], ['errorCode', 'before', 'after'], `Model ${field}`)
    if (negative.errorCode !== errorCode || !sameFingerprint(negative.before, negative.after)) {
      throw new Error(`DSH E2E Model ${field} negative contract failed`)
    }
  }
  await writeFile(join(outputRoot(), 'model-receipt.json'), `${JSON.stringify(value, null, 2)}\n`)
}

export async function collectMailServerReceipt(config: ProtectedE2eConfig, runId: string): Promise<void> {
  const value = keys(await readReceipt(config.mailReceiptPath, 'Mail receipt'), [
    'schemaVersion', 'kind', 'runId', 'before', 'afterRecovery', 'sentRequestFieldCount',
    'sentDirection', 'signedPrincipalRole', 'historicalSentDetailCount', 'attachmentBaselineCount',
    'newSend', 'failureCounts', 'restart',
  ], 'Mail receipt')
  if (value.schemaVersion !== 1 || value.kind !== 'mail_recovery_measurements' || value.runId !== runId
    || value.sentRequestFieldCount !== 1 || value.sentDirection !== 'outbound'
    || value.signedPrincipalRole !== 'successor' || value.historicalSentDetailCount !== 1
    || !Number.isSafeInteger(value.attachmentBaselineCount) || (value.attachmentBaselineCount as number) < 1) {
    throw new Error('DSH E2E Mail receipt contract failed')
  }
  const before = mailHistory(value.before, 'Mail before')
  const after = mailHistory(value.afterRecovery, 'Mail after Recovery')
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('DSH E2E Mail continuity failed')
  const newSend = keys(value.newSend, ['serverOutboundDelta', 'refreshDelta', 'uiRowDelta'], 'Mail new send')
  if (Object.values(newSend).some(item => item !== 1)) throw new Error('DSH E2E Mail send delta failed')
  const restart = keys(value.restart, ['freshInboxQueries', 'freshOutboundQueries', 'mailboxGrowth', 'history'], 'Mail restart')
  if (restart.freshInboxQueries !== 1 || restart.freshOutboundQueries !== 1 || restart.mailboxGrowth !== 0
    || JSON.stringify(mailHistory(restart.history, 'Mail restart history')) !== JSON.stringify(after)) {
    throw new Error('DSH E2E Mail restart contract failed')
  }
  const failures = keys(value.failureCounts, [
    'ownerConflict', 'authRejection', 'timeout', 'staleCompletion', 'authoritativeEmptySuccess',
  ], 'Mail failure counts')
  for (const field of ['ownerConflict', 'authRejection', 'timeout', 'staleCompletion']) {
    if (failures[field] !== 1) throw new Error('DSH E2E Mail failure contract failed')
  }
  if (failures.authoritativeEmptySuccess !== 0) throw new Error('DSH E2E Mail empty-success contract failed')
  await writeFile(join(outputRoot(), 'mail-receipt.json'), `${JSON.stringify(value, null, 2)}\n`)
}
