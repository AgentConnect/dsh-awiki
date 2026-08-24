/** Production AWiki provider backed by the versioned Rust IM Core Node bridge. */

import type { Context } from '@deepseek-ai/cordis'
import { openImCoreNodeClient } from '@awiki/im-core-node'
import type { AnpIdentityServiceContract } from '@agent-network-protocol/dsh-anp-identity'
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
}

/** Register one SDK client whose disposal follows this provider's fiber. */
export function apply(ctx: Context): void {
  ctx.effect(
    () => {
      const lease = ctx.anpIdentity.acquireProvider({
        consumer: '@awiki/dsh-plugin',
        capabilities: [...IDENTITY_PROVIDER_CAPABILITIES],
        ttlSeconds: 3_600,
      })
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
    },
    'awiki Rust SDK client',
  )
}
