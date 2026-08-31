/** Production AWiki provider backed by the versioned Rust IM Core Node bridge. */

import type { Context } from '@deepseek-ai/cordis'
import { openImCoreNodeClient } from '@awiki/im-core-node'
import type {
  AnpIdentityHealth,
  AnpIdentityServiceContract,
} from '@agent-network-protocol/dsh-anp-identity'
import type {
  HostProviderLease,
  ProviderCapability,
} from '@agent-network-protocol/dsh-anp-identity/provider-api'
import type {} from './index.ts'
import { RustSdkAdapter } from './sdk-adapter.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    anpIdentity: AnpIdentityServiceContract
  }
}

/** Cordis plugin name used by Loader diagnostics. */
export const name = 'awiki-rust-sdk-provider'
/** AWiki orchestration and the independent identity service must load first. */
export const inject = ['awiki', 'anpIdentity']

const IDENTITY_PROVIDER_STARTUP_TIMEOUT_MS = 15_000
const IDENTITY_PROVIDER_STARTUP_POLL_MS = 25

const IDENTITY_PROVIDER_CAPABILITIES = [
  'IDENTITY_READ',
  'IDENTITY_CREATE',
  'IDENTITY_IMPORT',
  'IDENTITY_SIGN',
  'IDENTITY_ECDH_SEALED',
  'IDENTITY_DOCUMENT_UPDATE',
  'IDENTITY_KEY_LIFECYCLE',
  'IDENTITY_DELETE',
  'IDENTITY_HTTP_SIGNATURE',
  'AWIKI_LEGACY_ROOT_TRANSFER_V1',
] as const satisfies readonly ProviderCapability[]

type OpenOptionsWithIdentityProvider = Parameters<typeof openImCoreNodeClient>[0] & {
  readonly identityProvider: HostProviderLease
  readonly clientVersionInfo: {
    readonly product: 'awiki-daemon'
    readonly release: '0815'
    readonly version: '0.1.91'
  }
}

/** Register one SDK client whose disposal follows this provider's fiber. */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const lease = await acquireIdentityProvider(ctx.anpIdentity)
  try {
    const unregister = ctx.awiki.registerClientFactory(options => {
      const openOptions: OpenOptionsWithIdentityProvider = {
        stateRoot: options.stateRoot,
        serviceBaseUrl: options.userServiceUrl,
        didDomain: options.userServiceDomain,
        userServiceEndpoint: options.userServiceUrl,
        messageServiceEndpoint: options.messageServiceUrl,
        mailServiceEndpoint: options.mailServiceUrl,
        anpServiceEndpoint: options.messageServiceUrl,
        anpServiceDid: options.messageServiceDid,
        clientVersionInfo: {
          product: 'awiki-daemon',
          release: '0815',
          version: '0.1.91',
        },
        multiDeviceHandleRecoveryEnabled: true,
        multiDeviceDeviceRevokeEnabled: true,
        multiDeviceAudience: 'awiki-user-service',
        externalHttpAllowInsecureLoopbackForTesting: options.allowInsecureLoopbackForTesting,
        identityProvider: lease,
      }
      return new RustSdkAdapter(openImCoreNodeClient(openOptions))
    })
    return async () => {
      try {
        await unregister()
      } finally {
        lease.dispose()
      }
    }
  } catch (error) {
    lease.dispose()
    throw error
  }
}

async function acquireIdentityProvider(
  identity: AnpIdentityServiceContract,
): Promise<HostProviderLease> {
  const deadline = Date.now() + IDENTITY_PROVIDER_STARTUP_TIMEOUT_MS
  while (true) {
    try {
      return identity.acquireProvider({
        consumer: '@awiki/dsh-plugin',
        capabilities: [...IDENTITY_PROVIDER_CAPABILITIES],
        ttlSeconds: 3_600,
      })
    } catch (error) {
      if (!isProviderUnavailable(error) || Date.now() >= deadline) throw error
    }

    const health = await identity.health()
    if (!providerIsReady(health)) {
      await new Promise(resolve => setTimeout(resolve, IDENTITY_PROVIDER_STARTUP_POLL_MS))
    }
  }
}

function providerIsReady(health: AnpIdentityHealth): boolean {
  return health.status !== 'unavailable' && health.providerProtocol !== undefined
}

function isProviderUnavailable(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'provider_unavailable'
}
