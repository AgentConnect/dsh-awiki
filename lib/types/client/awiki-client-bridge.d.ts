/** Browser service exposing the shared AWiki identity controller to optional clients. */
import { Service, type Context } from '@deepseek-ai/cordis';
import type { ComponentType } from 'react';
import { type AwikiIdentityAccessProps } from './AwikiIdentityAccess.tsx';
import type { AwikiActionResult, AwikiController } from './controller.ts';
/** Show the AWiki messaging drawer in chat mode. Bound by the overlay while it is mounted. */
export type AwikiOverlayPresenter = () => void;
/** Public browser-side bridge consumed by optional AWiki companion plugins. */
export declare class AwikiClientBridge extends Service {
    readonly identity: AwikiController;
    readonly IdentityAccess: ComponentType<AwikiIdentityAccessProps>;
    private overlayPresenter;
    constructor(ctx: Context, identity: AwikiController);
    /**
     * Register the mounted overlay's show action. The overlay owns drawer visibility.
     * @param show - open the messaging drawer and switch to chat mode.
     * @returns disposer that forgets this presenter if it is still bound.
     */
    bindOverlayPresenter: (show: AwikiOverlayPresenter) => (() => void);
    /**
     * Open the AWiki messaging drawer and, when an identity is ready, a direct chat.
     * @param handle - peer Handle or DID, such as `cgw.awiki.ai`.
     * @returns successful selection, identity-entry display, or one display-safe failure.
     */
    openDirectChat: (handle: string) => Promise<AwikiActionResult>;
    clearLocalIdentity: () => Promise<AwikiActionResult>;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        awikiClient: AwikiClientBridge;
    }
}
//# sourceMappingURL=awiki-client-bridge.d.ts.map