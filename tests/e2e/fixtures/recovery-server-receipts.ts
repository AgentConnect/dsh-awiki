/** Closed privacy-safe Model/Mail server receipts bound to one DSH E2E run. */

import { createHash } from 'node:crypto'
import { lstat, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ProtectedE2eConfig } from './protected-config.ts'
import {
  recoveryOperationIdentityFingerprint,
  type RecoveryProducerAck,
  type RecoveryReceiptRole,
} from '../support/recovery-receipt-producer.ts'

type Json = Record<string, unknown>
type Fingerprint = { readonly algorithm: 'sha256'; readonly value: string }
type CountedState = {
  readonly ledger: Fingerprint
  readonly accounting: Fingerprint
  readonly accountCount: number
  readonly aliasCount: number
  readonly fenceCount: number
  readonly anchorCount: number
  readonly operationCount: number
}
type MailHistory = {
  readonly mailbox: readonly Fingerprint[]
  readonly inbound: readonly Fingerprint[]
  readonly outbound: readonly Fingerprint[]
  readonly mime: readonly Fingerprint[]
  readonly attachment: readonly Fingerprint[]
}

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

function fingerprint(value: unknown, label: string): Fingerprint {
  const result = keys(value, ['algorithm', 'value'], label)
  if (result.algorithm !== 'sha256' || typeof result.value !== 'string' || !/^[a-f0-9]{64}$/u.test(result.value)) {
    throw new Error(`DSH E2E ${label} is invalid`)
  }
  return { algorithm: 'sha256', value: result.value }
}

function fingerprintList(value: unknown, label: string, nonempty = true): Fingerprint[] {
  if (!Array.isArray(value) || (nonempty && value.length === 0)) throw new Error(`DSH E2E ${label} is invalid`)
  return value.map((item, index) => fingerprint(item, `${label}[${index}]`))
}

function countedState(value: unknown, label: string): CountedState {
  const result = keys(value, [
    'ledger', 'accounting', 'accountCount', 'aliasCount', 'fenceCount', 'anchorCount', 'operationCount',
  ], label)
  return {
    ledger: fingerprint(result.ledger, `${label}.ledger`),
    accounting: fingerprint(result.accounting, `${label}.accounting`),
    accountCount: count(result.accountCount, `${label}.accountCount`),
    aliasCount: count(result.aliasCount, `${label}.aliasCount`),
    fenceCount: count(result.fenceCount, `${label}.fenceCount`),
    anchorCount: count(result.anchorCount, `${label}.anchorCount`),
    operationCount: count(result.operationCount, `${label}.operationCount`),
  }
}

function sameFingerprint(left: unknown, right: unknown): boolean {
  return fingerprint(left, 'fingerprint').value === fingerprint(right, 'fingerprint').value
}

function mailHistory(value: unknown, label: string): MailHistory {
  const result = keys(value, ['mailbox', 'inbound', 'outbound', 'mime', 'attachment'], label)
  const history = {
    mailbox: fingerprintList(result.mailbox, `${label}.mailbox`),
    inbound: fingerprintList(result.inbound, `${label}.inbound`),
    outbound: fingerprintList(result.outbound, `${label}.outbound`),
    mime: fingerprintList(result.mime, `${label}.mime`),
    attachment: fingerprintList(result.attachment, `${label}.attachment`, false),
  }
  if (history.mailbox.length !== 1) throw new Error(`DSH E2E ${label}.mailbox is invalid`)
  return history
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

function provenance(
  value: unknown,
  config: ProtectedE2eConfig,
  runId: string,
  role: RecoveryReceiptRole,
  ack: RecoveryProducerAck,
): string {
  const result = keys(value, [
    'runId', 'target', 'targetBinding', 'modelTarget', 'producer', 'measurementWindow', 'measurementFingerprint',
    'measuredEndpointFingerprint',
    'candidate', 'receiptPathFingerprint', 'operationIdentityFingerprint',
  ], `${role} receipt provenance`)
  const targetBinding = keys(result.targetBinding, [
    'name', 'didDomain', 'userServiceUrl', 'messageServiceUrl', 'mailServiceUrl',
    'messageServiceWsUrl', 'messageServiceDid', 'operatorProfile', 'modelTarget',
  ], `${role} target binding`)
  if (result.runId !== runId || result.target !== config.target
    || Object.entries(config.targetBinding).some(([key, expected]) => targetBinding[key] !== expected)
    || result.modelTarget !== config.targetBinding.modelTarget) throw new Error(`DSH E2E ${role} target binding failed`)
  const producer = keys(result.producer, ['role', 'version', 'executableSha256'], `${role} producer`)
  if (ack.role !== role || producer.role !== role || producer.version !== ack.producer.version
    || producer.executableSha256 !== ack.producer.executableSha256) throw new Error(`DSH E2E ${role} producer binding failed`)
  const window = keys(result.measurementWindow, ['startedAt', 'finishedAt'], `${role} measurement window`)
  if (window.startedAt !== ack.measurementWindow.startedAt || window.finishedAt !== ack.measurementWindow.finishedAt
    || fingerprint(result.measurementFingerprint, `${role} measurement fingerprint`).value !== ack.measurementFingerprint.value) {
    throw new Error(`DSH E2E ${role} measurement window failed`)
  }
  const measuredEndpoint = role === 'model' ? config.modelProxyUrl : config.targetBinding.mailServiceUrl
  const expectedEndpointFingerprint = createHash('sha256').update(measuredEndpoint).digest('hex')
  if (fingerprint(result.measuredEndpointFingerprint, `${role} measured endpoint`).value !== expectedEndpointFingerprint) {
    throw new Error(`DSH E2E ${role} measured endpoint binding failed`)
  }
  const candidate = object(result.candidate, `${role} candidate`)
  if (role === 'model') {
    const bound = keys(candidate, ['sourceCommit', 'sourceTree', 'artifactDigest'], 'Model candidate')
    if (bound.sourceCommit !== config.modelSourceCommit || bound.sourceTree !== config.modelSourceTree
      || fingerprint(bound.artifactDigest, 'Model candidate artifact').value !== config.modelArtifactSha256) {
      throw new Error('DSH E2E Model candidate binding failed')
    }
  } else {
    const bound = keys(candidate, ['sourceCommit', 'deploymentArtifactDigest'], 'Mail candidate')
    if (bound.sourceCommit !== config.mailSourceCommit
      || fingerprint(bound.deploymentArtifactDigest, 'Mail deployment artifact').value !== config.mailDeploymentArtifactSha256) {
      throw new Error('DSH E2E Mail candidate binding failed')
    }
  }
  const receiptPath = role === 'model' ? config.modelReceiptPath : config.mailReceiptPath
  const expectedPathFingerprint = createHash('sha256').update(receiptPath).digest('hex')
  if (fingerprint(result.receiptPathFingerprint, `${role} receipt path`).value !== expectedPathFingerprint) {
    throw new Error(`DSH E2E ${role} receipt path binding failed`)
  }
  const operationFingerprint = fingerprint(result.operationIdentityFingerprint, `${role} operation identity`).value as string
  if (operationFingerprint !== recoveryOperationIdentityFingerprint(config, runId).value) {
    throw new Error(`DSH E2E ${role} operation identity binding failed`)
  }
  return operationFingerprint
}

const ASSURANCE_ORDER = ['verified', 'recovery_verified', 'provider_asserted', 'unverified'] as const
type AdmittedAssurance = Exclude<typeof ASSURANCE_ORDER[number], 'unverified'>

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`DSH E2E ${label} is invalid`)
  return value
}

function validateAssuranceEvidence(value: Json): void {
  const vector = value.storedFenceAssurances
  if (!Array.isArray(vector) || vector.length === 0
    || vector.some(item => !ASSURANCE_ORDER.includes(item as typeof ASSURANCE_ORDER[number]) || item === 'unverified')) {
    throw new Error('DSH E2E Model stored assurance vector is invalid')
  }
  const weakest = vector.reduce((left, right) => (
    ASSURANCE_ORDER.indexOf(left as typeof ASSURANCE_ORDER[number]) >= ASSURANCE_ORDER.indexOf(right as typeof ASSURANCE_ORDER[number]) ? left : right
  ))
  if (!['verified', 'recovery_verified', 'provider_asserted'].includes(String(value.resolvedAssurance))
    || value.resolvedAssurance !== value.storedOperationAssurance || value.resolvedAssurance !== weakest) {
    throw new Error('DSH E2E Model weakest assurance binding failed')
  }
  const storedFenceEvidence = value.storedFenceEvidence
  if (!Array.isArray(storedFenceEvidence) || storedFenceEvidence.length !== vector.length) {
    throw new Error('DSH E2E Model stored fence evidence length is invalid')
  }
  const evidence = storedFenceEvidence.map((item, index) => {
    const result = keys(item, [
      'assurance', 'cacheEligible', 'providerAssertionVerified',
      'oldKeyProofVerified', 'recoveryKeyProofVerified',
    ], `Model stored fence evidence[${index}]`)
    const assurance = result.assurance as AdmittedAssurance
    const cacheEligible = boolean(result.cacheEligible, `Model stored fence evidence[${index}].cacheEligible`)
    const providerAssertionVerified = boolean(
      result.providerAssertionVerified,
      `Model stored fence evidence[${index}].providerAssertionVerified`,
    )
    const oldKeyProofVerified = boolean(
      result.oldKeyProofVerified,
      `Model stored fence evidence[${index}].oldKeyProofVerified`,
    )
    const recoveryKeyProofVerified = boolean(
      result.recoveryKeyProofVerified,
      `Model stored fence evidence[${index}].recoveryKeyProofVerified`,
    )
    if (assurance !== vector[index]) throw new Error('DSH E2E Model stored fence evidence order is invalid')
    const valid = assurance === 'provider_asserted'
      ? providerAssertionVerified && !cacheEligible && !oldKeyProofVerified && !recoveryKeyProofVerified
      : assurance === 'verified'
        ? cacheEligible && oldKeyProofVerified && !recoveryKeyProofVerified
        : assurance === 'recovery_verified'
          ? cacheEligible && !oldKeyProofVerified && recoveryKeyProofVerified
          : false
    if (!valid) throw new Error(`DSH E2E Model stored fence evidence[${index}] proof/cache is invalid`)
    return { cacheEligible, providerAssertionVerified, oldKeyProofVerified, recoveryKeyProofVerified }
  })
  const providerCount = evidence.filter(item => item.providerAssertionVerified).length
  const verifiedCount = evidence.filter(item => item.oldKeyProofVerified).length
  const recoveryCount = evidence.filter(item => item.recoveryKeyProofVerified).length
  if (count(value.providerTransitionAssertionVerifiedCount, 'Model provider proof count') !== providerCount
    || count(value.oldKeyProofVerifiedCount, 'Model old-key proof count') !== verifiedCount
    || count(value.recoveryKeyProofVerifiedCount, 'Model recovery-key proof count') !== recoveryCount
    || value.strongCacheEligible !== evidence.every(item => item.cacheEligible)) {
    throw new Error('DSH E2E Model assurance proof/cache evidence failed')
  }
}

export async function collectModelServerReceipt(
  config: ProtectedE2eConfig,
  runId: string,
  ack: RecoveryProducerAck,
): Promise<string> {
  const value = keys(await readReceipt(config.modelReceiptPath, 'Model receipt'), [
    'schemaVersion', 'kind', 'runId', 'provenance', 'modelArtifactDigest', 'requestFieldCount',
    'recoveryOutcome', 'resolvedAssurance', 'storedOperationAssurance', 'storedFenceAssurances', 'storedFenceEvidence',
    'providerTransitionAssertionVerifiedCount', 'oldKeyProofVerifiedCount', 'recoveryKeyProofVerifiedCount',
    'strongCacheEligible', 'oldSignatureUseCount', 'before', 'afterRecovery',
    'preRecoveryCompletionCount', 'completionCount', 'completionProvider', 'oldPrincipalRejections',
    'restart', 'unavailable', 'unverified',
  ], 'Model receipt')
  if (value.schemaVersion !== 1 || value.kind !== 'model_recovery_measurements' || value.runId !== runId
    || value.requestFieldCount !== 0 || value.recoveryOutcome !== 'restored'
    || value.oldSignatureUseCount !== 0
    || value.preRecoveryCompletionCount !== 1 || value.completionCount !== 1
    || value.completionProvider !== 'no_charge_stub') throw new Error('DSH E2E Model receipt contract failed')
  const artifact = fingerprint(value.modelArtifactDigest, 'Model artifact')
  if (artifact.value !== config.modelArtifactSha256) throw new Error('DSH E2E Model artifact binding failed')
  validateAssuranceEvidence(value)
  const operationFingerprint = provenance(value.provenance, config, runId, 'model', ack)
  const before = countedState(value.before, 'Model before')
  const after = countedState(value.afterRecovery, 'Model after Recovery')
  if (!sameFingerprint(before.ledger, after.ledger) || !sameFingerprint(before.accounting, after.accounting)
    || before.accountCount !== 1 || after.accountCount !== 1
    || after.aliasCount - before.aliasCount !== 1
    || after.fenceCount - before.fenceCount !== 1
    || after.anchorCount - before.anchorCount !== 1
    || after.operationCount - before.operationCount !== 1) {
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
  return operationFingerprint
}

export async function collectMailServerReceipt(
  config: ProtectedE2eConfig,
  runId: string,
  ack: RecoveryProducerAck,
): Promise<string> {
  const value = keys(await readReceipt(config.mailReceiptPath, 'Mail receipt'), [
    'schemaVersion', 'kind', 'runId', 'provenance', 'before', 'afterRecovery', 'sentRequestFieldCount',
    'sentDirection', 'signedPrincipalRole', 'historicalSentDetailCount',
    'sentDetailFingerprint', 'sentDetailOutboundFingerprint', 'sentDetailMimeFingerprint',
    'newSend', 'failureCounts', 'restart',
  ], 'Mail receipt')
  if (value.schemaVersion !== 1 || value.kind !== 'mail_recovery_measurements' || value.runId !== runId
    || value.sentRequestFieldCount !== 1 || value.sentDirection !== 'outbound'
    || value.signedPrincipalRole !== 'successor' || value.historicalSentDetailCount !== 1) {
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
  const detail = fingerprint(value.sentDetailFingerprint, 'Mail sent detail')
  for (const [field, list] of [
    ['sentDetailOutboundFingerprint', after.outbound],
    ['sentDetailMimeFingerprint', after.mime],
  ] as const) {
    const bound = fingerprint(value[field], `Mail ${field}`)
    if (!list.some(item => item.value === bound.value)) {
      throw new Error('DSH E2E Mail sent-detail binding failed')
    }
  }
  if (detail.value === undefined) throw new Error('DSH E2E Mail sent detail is invalid')
  const operationFingerprint = provenance(value.provenance, config, runId, 'mail', ack)
  await writeFile(join(outputRoot(), 'mail-receipt.json'), `${JSON.stringify(value, null, 2)}\n`)
  return operationFingerprint
}
