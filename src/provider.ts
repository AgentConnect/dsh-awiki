/** Production AWiki provider backed by the versioned Rust IM Core Node bridge. */

import type { Context } from '@deepseek-ai/cordis'
import { openImCoreNodeClient } from '@awiki/im-core-node'
import type {} from './index.ts'
import { RustSdkAdapter } from './sdk-adapter.ts'
import { loadOrCreateVaultRootKey } from './vault.ts'

/** Cordis plugin name used by Loader diagnostics. */
export const name = 'awiki-rust-sdk-provider'
/** The AWiki service must own its provider registry before this plugin loads. */
export const inject = ['awiki']

/** Register one SDK client whose disposal follows this provider's fiber. */
export function apply(ctx: Context): void {
  ctx.effect(
    () => ctx.awiki.registerClientFactory(options => new RustSdkAdapter((async () => {
      const vaultRootKey = await loadOrCreateVaultRootKey(options.stateRoot)
      return openImCoreNodeClient({
        stateRoot: options.stateRoot,
        vaultRootKey,
        vaultWorkspaceId: 'dsh-awiki',
        vaultDeviceId: 'dsh-awiki-node',
        serviceBaseUrl: options.userServiceUrl,
        didDomain: options.userServiceDomain,
        userServiceEndpoint: options.userServiceUrl,
        messageServiceEndpoint: options.messageServiceUrl,
        anpServiceEndpoint: options.messageServiceUrl,
        anpServiceDid: options.messageServiceDid,
      })
    })())),
    'awiki Rust SDK client',
  )
}
