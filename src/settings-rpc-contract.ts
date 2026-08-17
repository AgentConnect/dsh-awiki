/** Client-safe contract for AWiki's plugin-owned settings transport. */

import { normalizeAwikiDomain } from './domain.ts'

/** Dedicated Connection channel; the Host registers it with loopback authority. */
export const AWIKI_SETTINGS_RPC_CHANNEL = '/awiki-settings'

/** Supported channel-relative operations. */
export const AWIKI_SETTINGS_RPC_ENDPOINTS = {
  describe: 'describe',
  setDomain: 'set-domain',
  resetDomain: 'reset-domain',
} as const

/** Minimal, secret-free settings view returned to the browser. */
export interface AwikiSettingsRpcView {
  readonly value: { readonly domain: string }
  readonly base?: { readonly domain?: string }
  readonly user?: { readonly domain?: string }
  readonly revision: number
  readonly writable: boolean
}

/** Optimistic revision carried by every browser write. */
export interface AwikiSettingsRevisionRequest {
  readonly expectedRevision: number
}

/** Domain write request. */
export interface AwikiSettingsSetDomainRequest extends AwikiSettingsRevisionRequest {
  readonly domain: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function decodeLayer(value: unknown): { domain?: string } | undefined {
  if (!isRecord(value)) return undefined
  if (!Object.hasOwn(value, 'domain')) return {}
  if (typeof value.domain !== 'string') return undefined
  try {
    const domain = normalizeAwikiDomain(value.domain)
    if (domain !== value.domain) return undefined
    return { domain }
  } catch {
    return undefined
  }
}

/** Fail closed when the Host response is not exactly usable by the settings UI. */
export function decodeAwikiSettingsRpcView(value: unknown): AwikiSettingsRpcView | undefined {
  if (!isRecord(value)
    || !isRecord(value.value)
    || typeof value.value.domain !== 'string'
    || !Number.isSafeInteger(value.revision)
    || (value.revision as number) < 0
    || typeof value.writable !== 'boolean') return undefined
  let domain: string
  try {
    domain = normalizeAwikiDomain(value.value.domain)
  } catch {
    return undefined
  }
  if (domain !== value.value.domain) return undefined
  const base = value.base === undefined ? undefined : decodeLayer(value.base)
  const user = value.user === undefined ? undefined : decodeLayer(value.user)
  if ((value.base !== undefined && base === undefined)
    || (value.user !== undefined && user === undefined)) return undefined
  return {
    value: { domain },
    ...base === undefined ? {} : { base },
    ...user === undefined ? {} : { user },
    revision: value.revision as number,
    writable: value.writable,
  }
}
