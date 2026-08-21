/** Browser service exposing the shared AWiki identity controller to optional clients. */

import { Service, type Context } from '@deepseek-ai/cordis'
import type { ComponentType } from 'react'
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION } from '../types.ts'
import { AwikiIdentityAccess, type AwikiIdentityAccessProps } from './AwikiIdentityAccess.tsx'
import type { AwikiActionResult, AwikiController } from './controller.ts'

/** Public browser-side bridge consumed by optional AWiki companion plugins. */
export class AwikiClientBridge extends Service {
  readonly IdentityAccess: ComponentType<AwikiIdentityAccessProps> = AwikiIdentityAccess

  constructor(ctx: Context, readonly identity: AwikiController) {
    super(ctx, 'awikiClient')
  }

  clearLocalIdentity = async (): Promise<AwikiActionResult> => {
    const result = await this.identity.clearLocalData({ confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION })
    return result.ok ? { ok: true, value: undefined } : result
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    awikiClient: AwikiClientBridge
  }
}
