import type { AwikiSdkClient } from './provider-api.ts'

export type BackendSupport = 'supported' | 'unsupported' | 'unknown'
export type BackendFeatures = Readonly<Record<string, BackendSupport>>
export type BackendSnapshot = Awaited<ReturnType<NonNullable<AwikiSdkClient['backendCapabilities']>>>

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
const PUBLIC = ['registration.handle_only', 'identity.multi_device', 'identity.device_revoke', 'identity.capability_upgrade', 'identity.root_transfer', 'agents.managed_agents', 'agents.daemon', 'services.mail', 'services.model_proxy', 'services.guest_gateway', 'account.state_sync', 'content.pages', 'content.sites', 'content.hosting', 'client_updates.policy'] as const
const MESSAGE = ['direct', 'groups', 'attachments', 'direct_e2ee', 'group_e2ee', 'encrypted_attachments', 'group_open_join', 'group_admin_add'] as const

/** Project one source independently so a failed source cannot erase its peer. */
export function projectBackendSnapshot(snapshot: BackendSnapshot | undefined, authenticated: boolean): BackendFeatures {
  const result: Record<string, BackendSupport> = {}
  for (const key of authenticated ? MESSAGE : PUBLIC) {
    const support = snapshot?.capabilities[key]?.support
    result[key] = (snapshot?.status === 'confirmed' || snapshot?.status === 'stale') &&
      (support === 'supported' || support === 'unsupported') ? support : 'unknown'
  }
  return result
}

/** Copy only allowlisted support states. Browser never sees endpoints or SDK errors. */
export async function projectBackendFeatures(client: AwikiSdkClient, authenticated: boolean): Promise<BackendFeatures> {
  const sources = await Promise.allSettled([
    client.backendCapabilities?.(false, false),
    ...(authenticated ? [client.backendCapabilities?.(true, false)] : []),
  ])
  const result: Record<string, BackendSupport> = {}
  for (const [index, source] of sources.entries()) {
    if (source.status === 'fulfilled') Object.assign(result, projectBackendSnapshot(source.value, index === 1))
    else throw source.reason
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
