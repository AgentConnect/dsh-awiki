/** Production AWiki provider backed by the versioned TypeScript SDK. */

import type { Context } from '@deepseek-ai/cordis'
import { createAwikiImClient } from '@anp/typescript-sdk'
import type {} from './index.ts'
import { TypeScriptSdkAdapter } from './sdk-adapter.ts'

/** Cordis plugin name used by Loader diagnostics. */
export const name = 'awiki-typescript-sdk-provider'
/** The AWiki service must own its provider registry before this plugin loads. */
export const inject = ['awiki']

/** Register one SDK client whose disposal follows this provider's fiber. */
export function apply(ctx: Context): void {
  ctx.effect(
    () => ctx.awiki.registerClientFactory(options => new TypeScriptSdkAdapter(createAwikiImClient(options))),
    'awiki TypeScript SDK client',
  )
}
