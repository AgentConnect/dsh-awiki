import type { AwikiSdkClient } from './provider-api.ts'

export type BackendSupport = 'supported' | 'unsupported' | 'unknown'
export type BackendFeatures = Readonly<Record<string, BackendSupport>>
type BackendSnapshot = Awaited<ReturnType<NonNullable<AwikiSdkClient['backendCapabilities']>>>

/** Keep the client ceiling and only project a confirmed positive byte limit. */
export function backendAttachmentMaxBytes(snapshot: BackendSnapshot | undefined, clientLimit: number): number {
  if (snapshot?.status !== 'confirmed' && snapshot?.status !== 'stale') return clientLimit
  const capability = snapshot.capabilities.attachments
  if (capability?.support !== 'supported') return clientLimit
  const raw = capability.limits?.max_object_bytes
  const value = typeof raw === 'number' ? raw
    : typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : Number.NaN
  return Number.isSafeInteger(value) && value > 0 ? Math.min(clientLimit, value) : clientLimit
}
const PUBLIC = ['identity.multi_device', 'identity.device_revoke', 'identity.capability_upgrade', 'identity.root_transfer', 'agents.managed_agents', 'agents.daemon', 'services.mail', 'services.model_proxy', 'services.guest_gateway', 'account.state_sync', 'content.pages', 'content.sites', 'content.hosting', 'client_updates.policy'] as const
const MESSAGE = ['direct', 'groups', 'attachments', 'direct_e2ee', 'group_e2ee', 'encrypted_attachments', 'group_open_join', 'group_admin_add'] as const

/** Copy only allowlisted support states. Browser never sees endpoints or SDK errors. */
export async function projectBackendFeatures(client: AwikiSdkClient, authenticated: boolean): Promise<BackendFeatures> {
  const result: Record<string, BackendSupport> = {}
  for (const [local, keys] of [[false, PUBLIC], [true, MESSAGE]] as const) {
    if (local && !authenticated) continue
    const snapshot = await client.backendCapabilities?.(local, false)
    for (const key of keys) {
      const support = snapshot?.capabilities[key]?.support
      result[key] = (snapshot?.status === 'confirmed' || snapshot?.status === 'stale') &&
        (support === 'supported' || support === 'unsupported') ? support : 'unknown'
    }
  }
  return result
}

export async function requireBackendFeature(client: AwikiSdkClient, key: string): Promise<void> {
  const snapshot = await client.backendCapabilities?.(!key.includes('.'), false)
  const support = (snapshot?.status === 'confirmed' || snapshot?.status === 'stale') ? snapshot.capabilities[key]?.support : 'unknown'
  if (support !== 'supported') throw Object.assign(new Error('Server feature unavailable'), {
    name: 'AwikiSdkError', code: support === 'unsupported' ? 'backend-not-supported' : 'backend-unconfirmed',
  })
}
