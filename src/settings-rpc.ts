/** Loopback-only Host transport for AWiki's durable plugin settings. */

import {
  SettingsConflictError,
  settingsNamespace,
  type SettingsDescriptor,
  type SettingsProvider,
} from '@deepseek-ai/dsh-settings'
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import { AWIKI_DOMAIN_FIELD, AWIKI_SETTINGS_NAMESPACE, normalizeAwikiDomain } from './domain.ts'
import {
  AWIKI_SETTINGS_RPC_ENDPOINTS,
  type AwikiSettingsRpcView,
} from './settings-rpc-contract.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function expectedRevision(payload: unknown): number | undefined {
  if (!isRecord(payload) || !Number.isSafeInteger(payload.expectedRevision) || (payload.expectedRevision as number) < 0) {
    return undefined
  }
  return payload.expectedRevision as number
}

function sanitizeLayer(value: unknown): { domain?: string } | undefined {
  if (!isRecord(value)) return undefined
  if (!Object.hasOwn(value, AWIKI_DOMAIN_FIELD)) return {}
  if (typeof value[AWIKI_DOMAIN_FIELD] !== 'string') return undefined
  const domain = normalizeAwikiDomain(value[AWIKI_DOMAIN_FIELD])
  if (domain !== value[AWIKI_DOMAIN_FIELD]) return undefined
  return { domain }
}

function view(provider: SettingsProvider): AwikiSettingsRpcView | undefined {
  const descriptor: SettingsDescriptor | undefined = provider.describe({ redactSecrets: true })
    .find(candidate => candidate.ns === AWIKI_SETTINGS_NAMESPACE)
  if (descriptor === undefined || !isRecord(descriptor.value) || typeof descriptor.value.domain !== 'string') {
    return undefined
  }
  const domain = normalizeAwikiDomain(descriptor.value.domain)
  if (domain !== descriptor.value.domain) return undefined
  const base = descriptor.base === undefined ? undefined : sanitizeLayer(descriptor.base)
  const user = descriptor.user === undefined ? undefined : sanitizeLayer(descriptor.user)
  if ((descriptor.base !== undefined && base === undefined)
    || (descriptor.user !== undefined && user === undefined)) return undefined
  return {
    value: { domain },
    ...base === undefined ? {} : { base },
    ...user === undefined ? {} : { user },
    revision: descriptor.revision,
    writable: provider.writable,
  }
}

function unavailable() {
  return {
    ok: false as const,
    error: {
      code: 'settings-not-exposed' as const,
      message: 'AWiki settings are unavailable in this Host composition.',
      details: { ns: AWIKI_SETTINGS_NAMESPACE },
    },
  }
}

function badRequest() {
  return {
    ok: false as const,
    error: {
      code: 'bad-request' as const,
      message: 'The AWiki settings request is invalid.',
      details: { issues: [] },
    },
  }
}

function cancelled() {
  return {
    ok: false as const,
    error: {
      code: 'cancelled' as const,
      message: 'The AWiki settings request was cancelled.',
      details: {},
    },
  }
}

/** Build a handler whose provider lookup remains correct across Cordis reinjection. */
export function createAwikiSettingsRpcHandler(
  getProvider: () => SettingsProvider | undefined,
): ConnectionRpcHandler {
  return async (endpoint, payload, signal) => {
    if (signal.aborted) return cancelled()
    const provider = getProvider()
    if (provider === undefined) return unavailable()

    if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.describe) {
      if (!isRecord(payload)) return badRequest()
      const current = view(provider)
      return current === undefined ? unavailable() : { ok: true, value: current }
    }

    const revision = expectedRevision(payload)
    if (revision === undefined) return badRequest()
    let operation: { op: 'set'; path: string[]; value: string } | { op: 'unset'; path: string[] }
    if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain) {
      if (!isRecord(payload) || typeof payload.domain !== 'string') return badRequest()
      let domain: string
      try {
        domain = normalizeAwikiDomain(payload.domain)
      } catch {
        return badRequest()
      }
      if (domain !== payload.domain) return badRequest()
      operation = { op: 'set', path: [AWIKI_DOMAIN_FIELD], value: domain }
    } else if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.resetDomain) {
      operation = { op: 'unset', path: [AWIKI_DOMAIN_FIELD] }
    } else {
      return badRequest()
    }

    try {
      await provider.mutate(settingsNamespace(AWIKI_SETTINGS_NAMESPACE), [operation], revision)
      const current = view(provider)
      return current === undefined ? unavailable() : { ok: true, value: current }
    } catch (cause) {
      if (cause instanceof SettingsConflictError) {
        return {
          ok: false,
          error: {
            code: 'settings-conflict',
            message: 'AWiki settings changed in another client.',
            details: {
              ns: AWIKI_SETTINGS_NAMESPACE,
              expected: cause.expected,
              actual: cause.actual,
            },
          },
        }
      }
      return {
        ok: false,
        error: {
          code: 'settings-rejected',
          message: 'The Host rejected the AWiki settings change.',
          details: { ns: AWIKI_SETTINGS_NAMESPACE },
        },
      }
    }
  }
}
