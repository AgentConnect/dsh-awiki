import { readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export type ResourceKind = 'identity' | 'group' | 'message' | 'local_root'
export type CleanupStatus = 'pending' | 'cleaned' | 'partial' | 'residual'

interface PrivateResource {
  readonly kind: ResourceKind
  readonly identifier: string
  readonly status: CleanupStatus
  readonly reasonCode: string
}

interface PrivateLedger {
  readonly schemaVersion: 1
  readonly runId: string
  readonly target: string
  readonly resources: readonly PrivateResource[]
}

export interface RedactedLedger {
  readonly schemaVersion: 1
  readonly runId: string
  readonly target: string
  readonly counts: Readonly<Record<ResourceKind, number>>
  readonly cleanup: Readonly<Record<CleanupStatus, number>>
  readonly reasonCodes: readonly string[]
}

function validateToken(value: string, label: string): void {
  if (!/^[a-zA-Z0-9._:-]{1,128}$/u.test(value)) throw new Error(`DSH E2E private ledger ${label} is invalid`)
}

async function readLedger(path: string): Promise<PrivateLedger> {
  const decoded = JSON.parse(await readFile(path, 'utf8')) as PrivateLedger
  if (decoded.schemaVersion !== 1 || !Array.isArray(decoded.resources)) {
    throw new Error('DSH E2E private ledger is invalid')
  }
  return decoded
}

async function writeLedger(path: string, ledger: PrivateLedger): Promise<void> {
  const temporary = join(dirname(path), `.ledger-${process.pid}.tmp`)
  await writeFile(temporary, `${JSON.stringify(ledger, null, 2)}\n`, { mode: 0o600 })
  await rename(temporary, path)
}

export async function createPrivateLedger(path: string, runId: string, target: string): Promise<void> {
  validateToken(runId, 'runId')
  validateToken(target, 'target')
  await writeLedger(path, { schemaVersion: 1, runId, target, resources: [] })
}

export async function recordResource(
  path: string,
  resource: PrivateResource,
): Promise<void> {
  validateToken(resource.kind, 'kind')
  validateToken(resource.status, 'status')
  validateToken(resource.reasonCode, 'reasonCode')
  if (resource.identifier.trim() === '') throw new Error('DSH E2E private ledger identifier is invalid')
  const ledger = await readLedger(path)
  await writeLedger(path, { ...ledger, resources: [...ledger.resources, resource] })
}

export async function updateResourceStatus(
  path: string,
  kind: ResourceKind,
  identifier: string,
  status: CleanupStatus,
  reasonCode: string,
): Promise<void> {
  validateToken(status, 'status')
  validateToken(reasonCode, 'reasonCode')
  const ledger = await readLedger(path)
  let matches = 0
  const resources = ledger.resources.map(resource => {
    if (resource.kind !== kind || resource.identifier !== identifier) return resource
    matches += 1
    return { ...resource, status, reasonCode }
  })
  if (matches !== 1) throw new Error('DSH E2E private ledger resource is not exact-one')
  await writeLedger(path, { ...ledger, resources })
}

export async function redactLedger(path: string): Promise<RedactedLedger> {
  const ledger = await readLedger(path)
  const counts: Record<ResourceKind, number> = { identity: 0, group: 0, message: 0, local_root: 0 }
  const cleanup: Record<CleanupStatus, number> = { pending: 0, cleaned: 0, partial: 0, residual: 0 }
  const reasonCodes = new Set<string>()
  for (const resource of ledger.resources) {
    counts[resource.kind] += 1
    cleanup[resource.status] += 1
    reasonCodes.add(resource.reasonCode)
  }
  return {
    schemaVersion: 1,
    runId: ledger.runId,
    target: ledger.target,
    counts,
    cleanup,
    reasonCodes: [...reasonCodes].sort(),
  }
}
