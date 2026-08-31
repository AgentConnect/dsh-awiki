/** Host-only fixed-scope client for Guest Integration management. */

import {
  AwikiExternalHttpAuthError,
  type AwikiExternalHttpAuth,
} from './external-http-auth.ts'
import type {
  AwikiCreateIntegrationRequest,
  AwikiIntegrationFailure,
  AwikiIntegrationResult,
  AwikiIntegrationRevisionRequest,
  AwikiIntegrationView,
  AwikiUpdateIntegrationRequest,
} from './types.ts'

const MAX_REQUEST_BYTES = 64 * 1024
const MAX_RESPONSE_BYTES = 1024 * 1024
const REQUEST_TIMEOUT_MS = 10_000
const INTEGRATION_STATUSES = ['active', 'closed'] as const
const TARGET_AVAILABILITIES = [
  'eligible',
  'group_not_found',
  'owner_not_active',
  'owner_mismatch',
  'not_open_join',
  'unsupported_security_profile',
  'member_send_disabled',
  'attachments_disabled',
  'group_full',
  'validation_unavailable',
] as const

type Operation = 'read' | 'create' | 'update' | 'rotate' | 'close'

const OPERATIONS: Readonly<Record<Operation, { readonly method: string; readonly path: string }>> = {
  read: { method: 'GET', path: '/guest/api/v1/management/integration' },
  create: { method: 'POST', path: '/guest/api/v1/management/integration' },
  update: { method: 'PATCH', path: '/guest/api/v1/management/integration' },
  rotate: { method: 'POST', path: '/guest/api/v1/management/integration/rotate-id' },
  close: { method: 'POST', path: '/guest/api/v1/management/integration/close' },
}

/** Browser-safe management input translated to the Gateway's snake-case contract. */
function fields(request: AwikiCreateIntegrationRequest | AwikiUpdateIntegrationRequest): object {
  return {
    product_name: request.productName,
    description: request.description,
    contact_enabled: request.contactEnabled,
    contact_description: request.contactDescription,
    group_targets: request.groupTargets.map(target => ({
      ...target.id === undefined ? {} : { id: target.id },
      group_did: target.groupDid,
      description: target.description,
    })),
  }
}

function view(raw: unknown): AwikiIntegrationView {
  if (typeof raw !== 'object' || raw === null) throw new TypeError('invalid Integration response')
  const value = raw as Record<string, unknown>
  const owner = value.owner as Record<string, unknown>
  const groups = value.group_targets
  if (typeof owner !== 'object' || owner === null || !Array.isArray(groups)) {
    throw new TypeError('invalid Integration response')
  }
  return {
    id: requiredString(value.id),
    publicId: nullableString(value.public_id),
    integrationUrl: nullableString(value.integration_url),
    owner: {
      tenantId: requiredString(owner.tenant_id),
      handle: requiredString(owner.handle),
      currentDid: requiredString(owner.current_did),
      displayName: requiredString(owner.display_name),
    },
    productName: requiredString(value.product_name),
    description: requiredString(value.description),
    contactEnabled: requiredBoolean(value.contact_enabled),
    contactDescription: requiredString(value.contact_description),
    groupTargets: groups.map(group => {
      if (typeof group !== 'object' || group === null) throw new TypeError('invalid Integration group')
      const target = group as Record<string, unknown>
      return {
        id: requiredString(target.id),
        groupDid: requiredString(target.group_did),
        displayName: requiredString(target.display_name),
        avatarUrl: nullableString(target.avatar_url),
        description: requiredString(target.description),
        availability: requiredEnum(target.availability, TARGET_AVAILABILITIES),
      }
    }),
    status: requiredEnum(value.status, INTEGRATION_STATUSES),
    revision: requiredInteger(value.revision),
  }
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('invalid Integration response')
  return value
}

function nullableString(value: unknown): string | null {
  if (value === null) return null
  return requiredString(value)
}

function requiredBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new TypeError('invalid Integration response')
  return value
}

function requiredInteger(value: unknown): number {
  if (!Number.isSafeInteger(value)) throw new TypeError('invalid Integration response')
  return value as number
}

function requiredEnum<const Value extends string>(
  value: unknown,
  allowed: readonly Value[],
): Value {
  if (typeof value !== 'string' || !allowed.includes(value as Value)) {
    throw new TypeError('invalid Integration response')
  }
  return value as Value
}

function failure(status: number, raw: unknown): AwikiIntegrationFailure {
  const body = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {}
  const nested = typeof body.error === 'object' && body.error !== null
    ? body.error as Record<string, unknown>
    : body
  const candidate = typeof nested.code === 'string' ? nested.code : ''
  const code: AwikiIntegrationFailure['code'] =
    status === 404 ? 'not-found'
      : status === 409 ? 'conflict'
        : status === 400 ? 'invalid-request'
          : status === 401 ? 'unauthorized'
            : status === 403 ? 'forbidden'
              : status === 429 ? 'rate-limited'
                : status >= 500 ? 'unavailable'
                  : ['not-found', 'conflict', 'invalid-request', 'forbidden', 'unauthorized', 'rate-limited', 'unavailable'].includes(candidate)
                    ? candidate as AwikiIntegrationFailure['code']
                    : 'remote'
  return { code, message: integrationFailureMessage(code) }
}

function integrationFailureMessage(code: AwikiIntegrationFailure['code']): string {
  switch (code) {
    case 'not-found': return '尚未创建 Integration。'
    case 'conflict': return 'Integration 已在其他位置更新，请重新加载后再试。'
    case 'invalid-request': return 'Integration 信息不完整或格式不正确。'
    case 'forbidden': return '当前 AWiki 身份无权管理这个 Integration。'
    case 'unauthorized': return '请先在 AWiki 正式版中登录。'
    case 'rate-limited': return '操作过于频繁，请稍后重试。'
    case 'unavailable': return '临时消息服务暂时不可用。'
    case 'network': return '无法连接临时消息服务。'
    default: return '临时消息服务返回了无法识别的结果。'
  }
}

async function readBounded(response: Response): Promise<unknown> {
  const reader = response.body?.getReader()
  if (reader === undefined) return null
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      size += result.value.byteLength
      if (size > MAX_RESPONSE_BYTES) throw new TypeError('Integration response too large')
      chunks.push(result.value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  if (bytes.length === 0) return null
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown
}

/** Fixed-origin client; callers cannot control path, method, headers, or transport. */
export class AwikiIntegrationClient {
  public constructor(
    private readonly origin: string,
    private readonly auth: AwikiExternalHttpAuth,
  ) {}

  public read(): Promise<AwikiIntegrationResult<AwikiIntegrationView>> {
    return this.execute('read')
  }

  public create(request: AwikiCreateIntegrationRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>> {
    return this.execute('create', fields(request), request.idempotencyKey)
  }

  public update(request: AwikiUpdateIntegrationRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>> {
    return this.execute('update', { expected_revision: request.expectedRevision, ...fields(request) }, request.idempotencyKey)
  }

  public rotate(request: AwikiIntegrationRevisionRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>> {
    return this.execute('rotate', { expected_revision: request.expectedRevision }, request.idempotencyKey)
  }

  public close(request: AwikiIntegrationRevisionRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>> {
    return this.execute('close', { expected_revision: request.expectedRevision }, request.idempotencyKey)
  }

  private async execute(
    operation: Operation,
    body?: object,
    idempotencyKey?: string,
  ): Promise<AwikiIntegrationResult<AwikiIntegrationView>> {
    const spec = OPERATIONS[operation]
    const encoded = body === undefined ? undefined : JSON.stringify(body)
    if (encoded !== undefined && Buffer.byteLength(encoded, 'utf8') > MAX_REQUEST_BYTES) {
      return { ok: false, error: { code: 'invalid-request', message: integrationFailureMessage('invalid-request') } }
    }
    const headers = new Headers({ accept: 'application/json' })
    if (encoded !== undefined) headers.set('content-type', 'application/json')
    if (idempotencyKey !== undefined) headers.set('idempotency-key', idempotencyKey)
    const abort = new AbortController()
    const timeout = setTimeout(() => { abort.abort() }, REQUEST_TIMEOUT_MS)
    try {
      const request = new Request(new URL(spec.path, this.origin), {
        method: spec.method,
        headers,
        ...encoded === undefined ? {} : { body: encoded },
        redirect: 'error',
        signal: abort.signal,
      })
      const response = await this.auth.dispatch(request, signed => fetch(signed))
      const raw = await readBounded(response)
      if (!response.ok) return { ok: false, error: failure(response.status, raw) }
      return { ok: true, value: view(raw) }
    } catch (error) {
      if (error instanceof AwikiExternalHttpAuthError
        && (error.code === 'not-registered' || error.code === 'signed-out')) {
        return { ok: false, error: { code: 'unauthorized', message: integrationFailureMessage('unauthorized') } }
      }
      return { ok: false, error: { code: 'network', message: integrationFailureMessage('network') } }
    } finally { clearTimeout(timeout) }
  }
}
