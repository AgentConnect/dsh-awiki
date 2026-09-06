import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { reviewedE2eTargets, type ProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { collectMailServerReceipt, collectModelServerReceipt } from '../fixtures/recovery-server-receipts.ts'
import {
  exchangeRecoveryReceiptProducer,
  recoveryOperationIdentityFingerprint,
  recoveryProducerHandshakePaths,
  type RecoveryProducerAck,
  type RecoveryReceiptRole,
} from './recovery-receipt-producer.ts'

const roots: string[] = []
const previousOutput = process.env.DSH_AWIKI_E2E_OUTPUT_DIR
const runId = '20260903T000000Z-deadbeef'

afterEach(async () => {
  if (previousOutput === undefined) delete process.env.DSH_AWIKI_E2E_OUTPUT_DIR
  else process.env.DSH_AWIKI_E2E_OUTPUT_DIR = previousOutput
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

function fp(label: string): { algorithm: 'sha256'; value: string } {
  return { algorithm: 'sha256', value: createHash('sha256').update(label).digest('hex') }
}

function state(label: string, counts: [number, number, number, number, number]) {
  return {
    ledger: fp(`ledger-${label}`), accounting: fp(`accounting-${label}`),
    accountCount: counts[0], aliasCount: counts[1], fenceCount: counts[2],
    anchorCount: counts[3], operationCount: counts[4],
  }
}

function history() {
  return {
    mailbox: [fp('mailbox')], inbound: [fp('inbound')],
    outbound: [fp('outbound-2'), fp('outbound-1')],
    mime: [fp('mime')], attachment: [],
  }
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-recovery-receipts-'))
  roots.push(root)
  process.env.DSH_AWIKI_E2E_OUTPUT_DIR = root
  const modelReceiptPath = join(root, 'private-model.json')
  const mailReceiptPath = join(root, 'private-mail.json')
  const modelProducer = join(root, 'model-producer')
  const mailProducer = join(root, 'mail-producer')
  await writeFile(modelProducer, '#!/bin/sh\nexit 0\n', { mode: 0o700 })
  await writeFile(mailProducer, '#!/bin/sh\nexit 0\n', { mode: 0o700 })
  const config: ProtectedE2eConfig = {
    schemaVersion: 2,
    target: 'awiki-info-testing',
    targetBinding: reviewedE2eTargets['awiki-info-testing'],
    phone: '+10000000000', otp: '000000', handlePrefix: 'fixture',
    cliBinary: '/tmp/cli', cliSourceRef: 'a'.repeat(40), cliSha256: 'b'.repeat(64),
    modelProxyUrl: 'http://127.0.0.1:19090', modelPrompt: 'prompt', modelExpectedText: 'response',
    mailEchoRecipient: 'echo@awiki.info', modelReceiptPath, mailReceiptPath,
    modelArtifactSha256: 'c'.repeat(64),
    modelReceiptProducer: modelProducer,
    modelReceiptProducerSha256: createHash('sha256').update(await readFile(modelProducer)).digest('hex'),
    modelReceiptProducerVersion: 'model-producer-v1',
    mailReceiptProducer: mailProducer,
    mailReceiptProducerSha256: createHash('sha256').update(await readFile(mailProducer)).digest('hex'),
    mailReceiptProducerVersion: 'mail-producer-v1',
    modelSourceCommit: 'd'.repeat(40), modelSourceTree: 'e'.repeat(40),
    mailSourceCommit: 'f'.repeat(40), mailDeploymentArtifactSha256: '1'.repeat(64),
  }
  return { root, config, modelReceiptPath, mailReceiptPath }
}

function ack(config: ProtectedE2eConfig, role: RecoveryReceiptRole): RecoveryProducerAck {
  return {
    role,
    producer: role === 'model'
      ? { version: config.modelReceiptProducerVersion, executableSha256: config.modelReceiptProducerSha256 }
      : { version: config.mailReceiptProducerVersion, executableSha256: config.mailReceiptProducerSha256 },
    measurementWindow: { startedAt: '2026-09-03T00:00:00Z', finishedAt: '2026-09-03T00:01:00Z' },
    measurementFingerprint: fp('measurement'),
  }
}

function provenance(config: ProtectedE2eConfig, role: RecoveryReceiptRole, producerAck = ack(config, role)) {
  const receiptPath = role === 'model' ? config.modelReceiptPath : config.mailReceiptPath
  return {
    runId,
    target: config.target,
    targetBinding: config.targetBinding,
    modelTarget: config.targetBinding.modelTarget,
    producer: { role, ...producerAck.producer },
    measurementWindow: producerAck.measurementWindow,
    measurementFingerprint: producerAck.measurementFingerprint,
    measuredEndpointFingerprint: fp(
      role === 'model' ? config.modelProxyUrl : config.targetBinding.mailServiceUrl,
    ),
    candidate: role === 'model'
      ? {
          sourceCommit: config.modelSourceCommit,
          sourceTree: config.modelSourceTree,
          artifactDigest: { algorithm: 'sha256', value: config.modelArtifactSha256 },
        }
      : {
          sourceCommit: config.mailSourceCommit,
          deploymentArtifactDigest: { algorithm: 'sha256', value: config.mailDeploymentArtifactSha256 },
        },
    receiptPathFingerprint: fp(receiptPath),
    operationIdentityFingerprint: recoveryOperationIdentityFingerprint(config, runId),
  }
}

type Assurance = 'verified' | 'recovery_verified' | 'provider_asserted' | 'unverified'
type FenceEvidence = {
  assurance: Assurance
  cacheEligible: boolean
  providerAssertionVerified: boolean
  oldKeyProofVerified: boolean
  recoveryKeyProofVerified: boolean
}

function fenceEvidence(assurance: Assurance): FenceEvidence {
  return {
    assurance,
    cacheEligible: assurance === 'verified' || assurance === 'recovery_verified',
    providerAssertionVerified: assurance === 'provider_asserted',
    oldKeyProofVerified: assurance === 'verified',
    recoveryKeyProofVerified: assurance === 'recovery_verified',
  }
}

function modelReceipt(
  config: ProtectedE2eConfig,
  assurance: Exclude<Assurance, 'unverified'> = 'verified',
  vector: Assurance[] = [assurance],
  storedFenceEvidence: FenceEvidence[] = vector.map(fenceEvidence),
) {
  const before = state('same', [1, 0, 0, 1, 0])
  const after = { ...state('same', [1, 1, 1, 2, 1]), ledger: before.ledger, accounting: before.accounting }
  return {
    schemaVersion: 1, kind: 'model_recovery_measurements', runId,
    provenance: provenance(config, 'model'),
    modelArtifactDigest: { algorithm: 'sha256', value: config.modelArtifactSha256 },
    requestFieldCount: 0, recoveryOutcome: 'restored', resolvedAssurance: assurance,
    storedOperationAssurance: assurance, storedFenceAssurances: vector, storedFenceEvidence,
    providerTransitionAssertionVerifiedCount: storedFenceEvidence.filter(value => value.providerAssertionVerified).length,
    oldKeyProofVerifiedCount: storedFenceEvidence.filter(value => value.oldKeyProofVerified).length,
    recoveryKeyProofVerifiedCount: storedFenceEvidence.filter(value => value.recoveryKeyProofVerified).length,
    strongCacheEligible: storedFenceEvidence.every(value => value.cacheEligible), oldSignatureUseCount: 0,
    before, afterRecovery: after, preRecoveryCompletionCount: 1, completionCount: 1,
    completionProvider: 'no_charge_stub',
    oldPrincipalRejections: { bearer: 1, signature: 1, cache: 1, secondLedger: 1 },
    restart: { outcome: 'already_current', rowGrowth: { account: 0, alias: 0, fence: 0, anchor: 0, operation: 0 }, completionCount: 1 },
    unavailable: { errorCode: 'identity_recovery_unavailable', before: fp('u'), after: fp('u') },
    unverified: { errorCode: 'identity_recovery_transition_unsupported', before: fp('v'), after: fp('v') },
  }
}

function mailReceipt(config: ProtectedE2eConfig) {
  return {
    schemaVersion: 1, kind: 'mail_recovery_measurements', runId,
    provenance: provenance(config, 'mail'),
    before: history(), afterRecovery: history(), sentRequestFieldCount: 1,
    sentDirection: 'outbound', signedPrincipalRole: 'successor', historicalSentDetailCount: 1,
    sentDetailFingerprint: fp('detail'),
    sentDetailOutboundFingerprint: fp('outbound-2'),
    sentDetailMimeFingerprint: fp('mime'),
    newSend: { serverOutboundDelta: 1, refreshDelta: 1, uiRowDelta: 1 },
    failureCounts: { ownerConflict: 1, authRejection: 1, timeout: 1, staleCompletion: 1, authoritativeEmptySuccess: 0 },
    restart: { freshInboxQueries: 1, freshOutboundQueries: 1, mailboxGrowth: 0, history: history() },
  }
}

async function writeReceipt(path: string, value: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(value), { mode: 0o600 })
}

async function waitForJson(path: string): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>
    } catch {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }
  throw new Error(`timed out waiting for ${path}`)
}

describe('DSH Recovery receipt producer handshake', () => {
  it('publishes exact begin/finish requests and accepts only the bound producer window', async () => {
    const { config } = await fixture()
    const beginPaths = recoveryProducerHandshakePaths(config, 'model', 'begin')
    const beginPromise = exchangeRecoveryReceiptProducer(config, runId, 'model', 'begin')
    const beginRequest = await waitForJson(beginPaths.request)
    expect(beginRequest).toMatchObject({
      schemaVersion: 1, kind: 'dsh_recovery_receipt_producer_request', action: 'begin',
      role: 'model', runId, target: 'awiki-info-testing',
      operationIdentityFingerprint: recoveryOperationIdentityFingerprint(config, runId),
    })
    const beginAck = {
      schemaVersion: 1, kind: 'dsh_recovery_receipt_producer_ack', action: 'begin', role: 'model', runId,
      producer: { version: config.modelReceiptProducerVersion, executableSha256: config.modelReceiptProducerSha256 },
      measurementWindow: { startedAt: '2026-09-03T00:00:00Z', finishedAt: null },
      measurementFingerprint: fp('measurement'),
    }
    await writeReceipt(beginPaths.acknowledgement, beginAck)
    const begin = await beginPromise

    const finishPaths = recoveryProducerHandshakePaths(config, 'model', 'finish')
    const finishPromise = exchangeRecoveryReceiptProducer(config, runId, 'model', 'finish', begin)
    const finishRequest = await waitForJson(finishPaths.request)
    expect(finishRequest).toMatchObject({ action: 'finish', measurementFingerprint: fp('measurement') })
    await writeReceipt(finishPaths.acknowledgement, {
      ...beginAck,
      action: 'finish',
      measurementWindow: { startedAt: '2026-09-03T00:00:00Z', finishedAt: '2026-09-03T00:01:00Z' },
    })
    await expect(finishPromise).resolves.toMatchObject({ measurementWindow: { finishedAt: '2026-09-03T00:01:00Z' } })
  })
})

describe('DSH Recovery server receipt ingestion', () => {
  it('accepts exact direct Verified receipts and mutually bound Model/Mail operations', async () => {
    const { root, config, modelReceiptPath, mailReceiptPath } = await fixture()
    const verifiedWithProvider = fenceEvidence('verified')
    verifiedWithProvider.providerAssertionVerified = true
    await writeReceipt(modelReceiptPath, modelReceipt(config, 'verified', ['verified'], [verifiedWithProvider]))
    await writeReceipt(mailReceiptPath, mailReceipt(config))

    const modelOperation = await collectModelServerReceipt(config, runId, ack(config, 'model'))
    const mailOperation = await collectMailServerReceipt(config, runId, ack(config, 'mail'))

    expect(modelOperation).toBe(mailOperation)
    expect(JSON.parse(await readFile(join(root, 'model-receipt.json'), 'utf8'))).toMatchObject({
      resolvedAssurance: 'verified',
      providerTransitionAssertionVerifiedCount: 1,
      oldKeyProofVerifiedCount: 1,
      storedFenceEvidence: [{
        assurance: 'verified', cacheEligible: true, providerAssertionVerified: true,
        oldKeyProofVerified: true, recoveryKeyProofVerified: false,
      }],
    })
    expect(JSON.parse(await readFile(join(root, 'mail-receipt.json'), 'utf8'))).toMatchObject({ sentDirection: 'outbound' })
  })

  it('accepts semantically exact producer JSON independent of object key order', async () => {
    const { config, modelReceiptPath } = await fixture()
    const value = modelReceipt(config)
    value.provenance.targetBinding = Object.fromEntries(
      Object.entries(value.provenance.targetBinding).reverse(),
    ) as typeof value.provenance.targetBinding
    value.provenance.measurementWindow = {
      finishedAt: value.provenance.measurementWindow.finishedAt,
      startedAt: value.provenance.measurementWindow.startedAt,
    }
    value.before.ledger = { value: value.before.ledger.value, algorithm: 'sha256' }
    await writeReceipt(modelReceiptPath, value)

    await expect(collectModelServerReceipt(config, runId, ack(config, 'model'))).resolves.toMatch(/^[a-f0-9]{64}$/u)
  })

  it('accepts direct RecoveryVerified and a mixed vector only at its recomputed weakest assurance', async () => {
    const { config, modelReceiptPath } = await fixture()
    await writeReceipt(modelReceiptPath, modelReceipt(config, 'recovery_verified'))
    await expect(collectModelServerReceipt(config, runId, ack(config, 'model'))).resolves.toMatch(/^[a-f0-9]{64}$/u)

    const recoveryWithProvider = fenceEvidence('recovery_verified')
    recoveryWithProvider.providerAssertionVerified = true
    await writeReceipt(modelReceiptPath, modelReceipt(
      config,
      'recovery_verified',
      ['recovery_verified'],
      [recoveryWithProvider],
    ))
    await expect(collectModelServerReceipt(config, runId, ack(config, 'model'))).resolves.toMatch(/^[a-f0-9]{64}$/u)

    await writeReceipt(modelReceiptPath, modelReceipt(config, 'provider_asserted'))
    await expect(collectModelServerReceipt(config, runId, ack(config, 'model'))).resolves.toMatch(/^[a-f0-9]{64}$/u)

    await writeReceipt(modelReceiptPath, modelReceipt(
      config,
      'provider_asserted',
      ['verified', 'provider_asserted'],
    ))
    await expect(collectModelServerReceipt(config, runId, ack(config, 'model'))).resolves.toMatch(/^[a-f0-9]{64}$/u)
  })

  it('rejects Unverified vectors, wrong weakest assurance, and strong ProviderAsserted cache', async () => {
    const { config, modelReceiptPath } = await fixture()
    await writeReceipt(modelReceiptPath, modelReceipt(config, 'verified', ['verified', 'unverified']))
    await expect(collectModelServerReceipt(config, runId, ack(config, 'model'))).rejects.toThrow('assurance vector')

    await writeReceipt(modelReceiptPath, modelReceipt(config, 'verified', ['verified', 'provider_asserted']))
    await expect(collectModelServerReceipt(config, runId, ack(config, 'model'))).rejects.toThrow('weakest assurance')

    const provider = modelReceipt(config, 'provider_asserted')
    provider.strongCacheEligible = true
    await writeReceipt(modelReceiptPath, provider)
    await expect(collectModelServerReceipt(config, runId, ack(config, 'model'))).rejects.toThrow('proof/cache')
  })

  it('rejects fence-evidence length/order, mixed cache swaps, and aggregate proof drift', async () => {
    const { config, modelReceiptPath } = await fixture()
    const vector: Assurance[] = ['verified', 'provider_asserted']

    const short = modelReceipt(config, 'provider_asserted', vector, [fenceEvidence('verified')])
    await writeReceipt(modelReceiptPath, short)
    await expect(collectModelServerReceipt(config, runId, ack(config, 'model'))).rejects.toThrow('evidence length')

    const reversed = modelReceipt(config, 'provider_asserted', vector, [
      fenceEvidence('provider_asserted'),
      fenceEvidence('verified'),
    ])
    await writeReceipt(modelReceiptPath, reversed)
    await expect(collectModelServerReceipt(config, runId, ack(config, 'model'))).rejects.toThrow('evidence order')

    const swappedCache = modelReceipt(config, 'provider_asserted', vector)
    swappedCache.storedFenceEvidence[0]!.cacheEligible = false
    swappedCache.storedFenceEvidence[1]!.cacheEligible = true
    swappedCache.strongCacheEligible = false
    await writeReceipt(modelReceiptPath, swappedCache)
    await expect(collectModelServerReceipt(config, runId, ack(config, 'model'))).rejects.toThrow('proof/cache')

    const wrongCount = modelReceipt(config, 'verified')
    wrongCount.providerTransitionAssertionVerifiedCount = 1
    await writeReceipt(modelReceiptPath, wrongCount)
    await expect(collectModelServerReceipt(config, runId, ack(config, 'model'))).rejects.toThrow('proof/cache')
  })

  it('rejects wrong target, producer, measurement window, and operation identity on the same run ID', async () => {
    const { config, modelReceiptPath } = await fixture()
    for (const mutate of [
      (value: ReturnType<typeof modelReceipt>) => { value.provenance.target = 'rwiki-cn-testing' as typeof value.provenance.target },
      (value: ReturnType<typeof modelReceipt>) => { value.provenance.candidate.sourceCommit = '0'.repeat(40) },
      (value: ReturnType<typeof modelReceipt>) => { value.provenance.producer.version = 'wrong-v1' },
      (value: ReturnType<typeof modelReceipt>) => {
        (value.provenance.measurementWindow as { finishedAt: string | null }).finishedAt = '2026-09-03T00:02:00Z'
      },
      (value: ReturnType<typeof modelReceipt>) => { value.provenance.measurementFingerprint = fp('wrong-measurement') },
      (value: ReturnType<typeof modelReceipt>) => { value.provenance.measuredEndpointFingerprint = fp('wrong-endpoint') },
      (value: ReturnType<typeof modelReceipt>) => { value.provenance.operationIdentityFingerprint = fp('wrong-operation') },
    ]) {
      const value = modelReceipt(config)
      mutate(value)
      await writeReceipt(modelReceiptPath, value)
      await expect(collectModelServerReceipt(config, runId, ack(config, 'model'))).rejects.toThrow(/binding|window/u)
    }
  })

  it('rejects a second Model account without relying on attachment evidence', async () => {
    const { config, modelReceiptPath } = await fixture()
    const value = modelReceipt(config)
    value.afterRecovery.accountCount = 2
    await writeReceipt(modelReceiptPath, value)
    await expect(collectModelServerReceipt(config, runId, ack(config, 'model'))).rejects.toThrow('ledger continuity')
  })
})
