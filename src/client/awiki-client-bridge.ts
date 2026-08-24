/** Browser service exposing the shared AWiki identity controller to optional clients. */

import { Service, type Context } from '@deepseek-ai/cordis'
import type { ComponentType } from 'react'
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION } from '../types.ts'
import { AwikiIdentityAccess, type AwikiIdentityAccessProps } from './AwikiIdentityAccess.tsx'
import type { AwikiActionResult, AwikiController } from './controller.ts'

/** Show the AWiki messaging drawer in chat mode. Bound by the overlay while it is mounted. */
export type AwikiOverlayPresenter = () => void

/** Public browser-side bridge consumed by optional AWiki companion plugins. */
export class AwikiClientBridge extends Service {
  readonly IdentityAccess: ComponentType<AwikiIdentityAccessProps> = AwikiIdentityAccess
  private overlayPresenter: AwikiOverlayPresenter | undefined

  constructor(ctx: Context, readonly identity: AwikiController) {
    super(ctx, 'awikiClient')
  }

  /**
   * Register the mounted overlay's show action. The overlay owns drawer visibility.
   * @param show - open the messaging drawer and switch to chat mode.
   * @returns disposer that forgets this presenter if it is still bound.
   */
  bindOverlayPresenter = (show: AwikiOverlayPresenter): (() => void) => {
    this.overlayPresenter = show
    return () => {
      if (this.overlayPresenter === show) this.overlayPresenter = undefined
    }
  }

  /**
   * Open the AWiki messaging drawer and, when an identity is ready, a direct chat.
   * @param handle - peer Handle or DID, such as `cgw.awiki.ai`.
   * @returns successful selection, identity-entry display, or one display-safe failure.
   */
  openDirectChat = async (handle: string): Promise<AwikiActionResult> => {
    if (this.overlayPresenter === undefined) {
      return { ok: false, error: 'AWiki 消息界面暂不可用' }
    }
    this.overlayPresenter()
    if (this.identity.getSnapshot().identity === null) {
      return { ok: true, value: undefined }
    }
    return this.identity.startDirectChat(handle)
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
