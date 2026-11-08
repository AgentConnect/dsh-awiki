import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface TenantCapabilityMetadata {
  readonly handleRecoveryPhoneEnabled: boolean
  readonly modelProxyBaseUrl?: string
  readonly guestGatewayBaseUrl?: string
}

/** Host-only metadata. Core owns feature truth; this contains no auth material. */
export class TenantCapabilityCache {
  private readonly key: string
  private readonly directory: string
  private readonly path: string
  constructor(stateRoot: string, endpoint: string) {
    this.key = createHash('sha256').update(JSON.stringify([endpoint, stateRoot, 1])).digest('hex')
    this.directory = join(stateRoot, 'cache', 'tenant-capabilities-v1')
    this.path = join(this.directory, `${this.key}.json`)
  }
  read(validate: (metadata: TenantCapabilityMetadata) => TenantCapabilityMetadata): TenantCapabilityMetadata | undefined {
    try {
      const bytes = readFileSync(this.path)
      if (bytes.length > 16_384) return undefined
      const value = JSON.parse(bytes.toString('utf8')) as { version?: unknown; key?: unknown; metadata?: TenantCapabilityMetadata }
      if (value.version !== 1 || value.key !== this.key || typeof value.metadata?.handleRecoveryPhoneEnabled !== 'boolean') return undefined
      return validate(value.metadata)
    } catch { return undefined }
  }
  write(metadata: TenantCapabilityMetadata): boolean {
    const temporary = `${this.path}.${randomUUID()}.tmp`
    try {
      mkdirSync(this.directory, { recursive: true, mode: 0o700 })
      writeFileSync(temporary, JSON.stringify({ version: 1, key: this.key, metadata }), { mode: 0o600, flag: 'wx' })
      renameSync(temporary, this.path)
      return true
    } catch {
      try { unlinkSync(temporary) } catch { /* no partial cache */ }
      return false
    }
  }
}
