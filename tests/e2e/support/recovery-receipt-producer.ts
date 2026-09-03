/** Run-ID-first file handshake for external System-owned Model/Mail receipt producers. */

import { createHash } from 'node:crypto'
import { lstat, readFile, writeFile } from 'node:fs/promises'
import type { ProtectedE2eConfig } from '../fixtures/protected-config.ts'

export type RecoveryReceiptRole = 'model' | 'mail'

export interface RecoveryProducerAck {
  readonly role: RecoveryReceiptRole
  readonly producer: { readonly version: string; readonly executableSha256: string }
  readonly measurementWindow: { readonly startedAt: string; readonly finishedAt: string | null }
  readonly measurementFingerprint: { readonly algorithm: 'sha256'; readonly value: string }
}

export function recoveryOperationIdentityFingerprint(
  config: ProtectedE2eConfig,
  runId: string,
): { readonly algorithm: 'sha256'; readonly value: string } {
  const identity = JSON.stringify({
    schemaVersion: 1,
    kind: 'dsh_recovery_operation_identity',
    runId,
    target: config.target,
    targetBinding: config.targetBinding,
    modelTarget: config.targetBinding.modelTarget,
  })
  return { algorithm: 'sha256', value: createHash('sha256').update(identity).digest('hex') }
}

function iso(value: unknown, nullable = false): string | null {
  if (nullable && value === null) return null
  if (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value)
    || !Number.isFinite(Date.parse(value))) throw new Error('DSH E2E producer time is invalid')
  return value
}

function fp(value: unknown): { readonly algorithm: 'sha256'; readonly value: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('DSH E2E producer fingerprint is invalid')
  const record = value as Record<string, unknown>
  if (JSON.stringify(Object.keys(record).sort()) !== '["algorithm","value"]'
    || record.algorithm !== 'sha256' || typeof record.value !== 'string'
    || !/^[a-f0-9]{64}$/u.test(record.value)) throw new Error('DSH E2E producer fingerprint is invalid')
  return { algorithm: 'sha256', value: record.value }
}

function producerConfig(config: ProtectedE2eConfig, role: RecoveryReceiptRole) {
  return role === 'model'
    ? {
        version: config.modelReceiptProducerVersion,
        digest: config.modelReceiptProducerSha256,
        receiptPath: config.modelReceiptPath,
        candidate: {
          sourceCommit: config.modelSourceCommit,
          sourceTree: config.modelSourceTree,
          artifactDigest: { algorithm: 'sha256' as const, value: config.modelArtifactSha256 },
        },
      }
    : {
        version: config.mailReceiptProducerVersion,
        digest: config.mailReceiptProducerSha256,
        receiptPath: config.mailReceiptPath,
        candidate: {
          sourceCommit: config.mailSourceCommit,
          deploymentArtifactDigest: { algorithm: 'sha256' as const, value: config.mailDeploymentArtifactSha256 },
        },
      }
}

export function recoveryProducerHandshakePaths(
  config: ProtectedE2eConfig,
  role: RecoveryReceiptRole,
  action: 'begin' | 'finish',
): { readonly request: string; readonly acknowledgement: string } {
  const base = producerConfig(config, role).receiptPath
  return {
    request: `${base}.${action}.request.json`,
    acknowledgement: `${base}.${action}.ack.json`,
  }
}

async function readAcknowledgement(path: string): Promise<Record<string, unknown>> {
  const deadline = Date.now() + 120_000
  while (true) {
    try {
      const metadata = await lstat(path)
      if (!metadata.isFile() || metadata.isSymbolicLink() || (metadata.mode & 0o777) !== 0o600
        || (process.getuid !== undefined && metadata.uid !== process.getuid())
        || metadata.size > 1024 * 1024) throw new Error('DSH E2E producer acknowledgement file is invalid')
      const value = JSON.parse(await readFile(path, 'utf8')) as unknown
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('DSH E2E producer acknowledgement is invalid')
      }
      return value as Record<string, unknown>
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || Date.now() >= deadline) throw error
      await new Promise(resolve => setTimeout(resolve, 250))
    }
  }
}

export async function exchangeRecoveryReceiptProducer(
  config: ProtectedE2eConfig,
  runId: string,
  role: RecoveryReceiptRole,
  action: 'begin' | 'finish',
  previous?: RecoveryProducerAck,
): Promise<RecoveryProducerAck> {
  const producer = producerConfig(config, role)
  const paths = recoveryProducerHandshakePaths(config, role, action)
  const request = {
    schemaVersion: 1,
    kind: 'dsh_recovery_receipt_producer_request',
    action,
    role,
    runId,
    target: config.target,
    targetBinding: config.targetBinding,
    modelTarget: config.targetBinding.modelTarget,
    candidate: producer.candidate,
    receiptPath: producer.receiptPath,
    receiptPathFingerprint: {
      algorithm: 'sha256',
      value: createHash('sha256').update(producer.receiptPath).digest('hex'),
    },
    measuredEndpointFingerprint: {
      algorithm: 'sha256',
      value: createHash('sha256').update(
        role === 'model' ? config.modelProxyUrl : config.targetBinding.mailServiceUrl,
      ).digest('hex'),
    },
    operationIdentityFingerprint: recoveryOperationIdentityFingerprint(config, runId),
    ...previous === undefined ? {} : { measurementFingerprint: previous.measurementFingerprint },
  }
  await writeFile(paths.request, `${JSON.stringify(request)}\n`, { mode: 0o600, flag: 'wx' })
  const value = await readAcknowledgement(paths.acknowledgement)
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([
    'schemaVersion', 'kind', 'action', 'role', 'runId', 'producer',
    'measurementWindow', 'measurementFingerprint',
  ].sort())) throw new Error(`DSH E2E ${role} producer acknowledgement fields are invalid`)
  const metadata = value.producer as Record<string, unknown>
  const window = value.measurementWindow as Record<string, unknown>
  if (value.schemaVersion !== 1 || value.kind !== 'dsh_recovery_receipt_producer_ack'
    || value.action !== action || value.role !== role || value.runId !== runId
    || typeof metadata !== 'object' || metadata === null
    || JSON.stringify(Object.keys(metadata).sort()) !== '["executableSha256","version"]'
    || metadata.version !== producer.version || metadata.executableSha256 !== producer.digest
    || typeof window !== 'object' || window === null
    || JSON.stringify(Object.keys(window).sort()) !== '["finishedAt","startedAt"]') {
    throw new Error(`DSH E2E ${role} producer acknowledgement is invalid`)
  }
  const ack: RecoveryProducerAck = {
    role,
    producer: { version: producer.version, executableSha256: producer.digest },
    measurementWindow: {
      startedAt: iso(window.startedAt) as string,
      finishedAt: iso(window.finishedAt, true),
    },
    measurementFingerprint: fp(value.measurementFingerprint),
  }
  if (action === 'begin' && ack.measurementWindow.finishedAt !== null) throw new Error('DSH E2E producer begin window is invalid')
  if (action === 'finish') {
    if (previous === undefined || ack.measurementWindow.finishedAt === null
      || Date.parse(ack.measurementWindow.finishedAt) < Date.parse(ack.measurementWindow.startedAt)
      || ack.measurementWindow.startedAt !== previous.measurementWindow.startedAt
      || ack.measurementFingerprint.value !== previous.measurementFingerprint.value) {
      throw new Error('DSH E2E producer finish window is invalid')
    }
  }
  return ack
}
