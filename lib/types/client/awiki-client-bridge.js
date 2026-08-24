/** Browser service exposing the shared AWiki identity controller to optional clients. */
import { Service } from '@deepseek-ai/cordis';
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION } from "../types.js";
import { AwikiIdentityAccess } from "./AwikiIdentityAccess.js";
/** Public browser-side bridge consumed by optional AWiki companion plugins. */
export class AwikiClientBridge extends Service {
    identity;
    IdentityAccess = AwikiIdentityAccess;
    overlayPresenter;
    constructor(ctx, identity) {
        super(ctx, 'awikiClient');
        this.identity = identity;
    }
    /**
     * Register the mounted overlay's show action. The overlay owns drawer visibility.
     * @param show - open the messaging drawer and switch to chat mode.
     * @returns disposer that forgets this presenter if it is still bound.
     */
    bindOverlayPresenter = (show) => {
        this.overlayPresenter = show;
        return () => {
            if (this.overlayPresenter === show)
                this.overlayPresenter = undefined;
        };
    };
    /**
     * Open the AWiki messaging drawer and, when an identity is ready, a direct chat.
     * @param handle - peer Handle or DID, such as `cgw.awiki.ai`.
     * @returns successful selection, identity-entry display, or one display-safe failure.
     */
    openDirectChat = async (handle) => {
        if (this.overlayPresenter === undefined) {
            return { ok: false, error: 'AWiki 消息界面暂不可用' };
        }
        this.overlayPresenter();
        if (this.identity.getSnapshot().identity === null) {
            return { ok: true, value: undefined };
        }
        return this.identity.startDirectChat(handle);
    };
    clearLocalIdentity = async () => {
        const result = await this.identity.clearLocalData({ confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION });
        return result.ok ? { ok: true, value: undefined } : result;
    };
}
//# sourceMappingURL=awiki-client-bridge.js.map