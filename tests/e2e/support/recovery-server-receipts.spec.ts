import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { reviewedE2eTargets, type ProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { collectMailServerReceipt, collectModelServerReceipt } from '../fixtures/recovery-server-receipts.ts'

const roots: string[] = []
const previousOutput = process.env.DSH_AWIKI_E2E_OUTPUT_DIR

afterEach(async () => {
  if (previousOutput === undefined) delete process.env.DSH_AWIKI_E2E_OUTPUT_DIR
  else process.env.DSH_AWIKI_E2E_OUTPUT_DIR = previousOutput
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

function fp(label: string) {
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
    mime: [fp('mime')], attachment: [fp('attachment')],
  }
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-recovery-receipts-'))
  roots.push(root)
  process.env.DSH_AWIKI_E2E_OUTPUT_DIR = root
  const modelReceiptPath = join(root, 'private-model.json')
  const mailReceiptPath = join(root, 'private-mail.json')
  const config: ProtectedE2eConfig = {
    schemaVersion: 2,
    target: 'awiki-info-testing',
    targetBinding: reviewedE2eTargets['awiki-info-testing'],
    phone: '+10000000000', otp: '000000', handlePrefix: 'fixture',
    cliBinary: '/tmp/cli', cliSourceRef: 'a'.repeat(40), cliSha256: 'b'.repeat(64),
    modelProxyUrl: 'http://127.0.0.1:19090', modelPrompt: 'prompt', modelExpectedText: 'response',
    mailEchoRecipient: 'echo@awiki.info', modelReceiptPath, mailReceiptPath,
    modelArtifactSha256: 'c'.repeat(64), mailAttachmentExpectedName: 'fixture.txt',
  }
  return { root, config, modelReceiptPath, mailReceiptPath }
}

describe('DSH Recovery server receipt ingestion', () => {
  it('copies only validated Model/Mail measurements bound to one run', async () => {
    const { root, config, modelReceiptPath, mailReceiptPath } = await fixture()
    const runId = '20260903T000000Z-deadbeef'
    const before = state('same', [1, 0, 0, 1, 0])
    const after = { ...state('same', [1, 1, 1, 2, 1]), ledger: before.ledger, accounting: before.accounting }
    await writeFile(modelReceiptPath, JSON.stringify({
      schemaVersion: 1, kind: 'model_recovery_measurements', runId,
      modelArtifactDigest: { algorithm: 'sha256', value: config.modelArtifactSha256 },
      requestFieldCount: 0, recoveryOutcome: 'restored', resolvedAssurance: 'provider_asserted',
      storedOperationAssurance: 'provider_asserted', storedFenceAssurances: ['provider_asserted'],
      providerTransitionAssertionVerifiedCount: 1, oldSignatureUseCount: 0,
      before, afterRecovery: after, preRecoveryCompletionCount: 1, completionCount: 1,
      completionProvider: 'no_charge_stub',
      oldPrincipalRejections: { bearer: 1, signature: 1, cache: 1, secondLedger: 1 },
      restart: { outcome: 'already_current', rowGrowth: { account: 0, alias: 0, fence: 0, anchor: 0, operation: 0 }, completionCount: 1 },
      unavailable: { errorCode: 'identity_recovery_unavailable', before: fp('u'), after: fp('u') },
      unverified: { errorCode: 'identity_recovery_transition_unsupported', before: fp('v'), after: fp('v') },
    }), { mode: 0o600 })
    await writeFile(mailReceiptPath, JSON.stringify({
      schemaVersion: 1, kind: 'mail_recovery_measurements', runId,
      before: history(), afterRecovery: history(), sentRequestFieldCount: 1,
      sentDirection: 'outbound', signedPrincipalRole: 'successor', historicalSentDetailCount: 1,
      attachmentBaselineCount: 1,
      newSend: { serverOutboundDelta: 1, refreshDelta: 1, uiRowDelta: 1 },
      failureCounts: { ownerConflict: 1, authRejection: 1, timeout: 1, staleCompletion: 1, authoritativeEmptySuccess: 0 },
      restart: { freshInboxQueries: 1, freshOutboundQueries: 1, mailboxGrowth: 0, history: history() },
    }), { mode: 0o600 })

    await collectModelServerReceipt(config, runId)
    await collectMailServerReceipt(config, runId)

    expect(JSON.parse(await readFile(join(root, 'model-receipt.json'), 'utf8'))).toMatchObject({ recoveryOutcome: 'restored' })
    expect(JSON.parse(await readFile(join(root, 'mail-receipt.json'), 'utf8'))).toMatchObject({ sentDirection: 'outbound' })
  })

  it('rejects a second Model account and Mail history without attachment evidence', async () => {
    const { config, modelReceiptPath, mailReceiptPath } = await fixture()
    const runId = '20260903T000000Z-deadbeef'
    const invalidModel = {
      schemaVersion: 1, kind: 'model_recovery_measurements', runId,
      modelArtifactDigest: { algorithm: 'sha256', value: config.modelArtifactSha256 },
      requestFieldCount: 0, recoveryOutcome: 'restored', resolvedAssurance: 'provider_asserted',
      storedOperationAssurance: 'provider_asserted', storedFenceAssurances: ['provider_asserted'],
      providerTransitionAssertionVerifiedCount: 1, oldSignatureUseCount: 0,
      before: state('same', [1, 0, 0, 1, 0]), afterRecovery: state('same', [2, 1, 1, 2, 1]),
      preRecoveryCompletionCount: 1, completionCount: 1, completionProvider: 'no_charge_stub',
      oldPrincipalRejections: {}, restart: {}, unavailable: {}, unverified: {},
    }
    await writeFile(modelReceiptPath, JSON.stringify(invalidModel), { mode: 0o600 })
    await expect(collectModelServerReceipt(config, runId)).rejects.toThrow('ledger continuity')
    const noAttachment = history()
    noAttachment.attachment = []
    await writeFile(mailReceiptPath, JSON.stringify({
      schemaVersion: 1, kind: 'mail_recovery_measurements', runId,
      before: noAttachment, afterRecovery: noAttachment, sentRequestFieldCount: 1,
      sentDirection: 'outbound', signedPrincipalRole: 'successor', historicalSentDetailCount: 1,
      attachmentBaselineCount: 0, newSend: {}, failureCounts: {}, restart: {},
    }), { mode: 0o600 })
    await expect(collectMailServerReceipt(config, runId)).rejects.toThrow('Mail receipt contract')
  })
})
