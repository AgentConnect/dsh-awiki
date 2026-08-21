/** Browser service exposing the shared AWiki identity controller to optional clients. */
import { Service } from '@deepseek-ai/cordis';
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION } from "../types.js";
import { AwikiIdentityAccess } from "./AwikiIdentityAccess.js";
/** Public browser-side bridge consumed by optional AWiki companion plugins. */
export class AwikiClientBridge extends Service {
    identity;
    IdentityAccess = AwikiIdentityAccess;
    constructor(ctx, identity) {
        super(ctx, 'awikiClient');
        this.identity = identity;
    }
    clearLocalIdentity = async () => {
        const result = await this.identity.clearLocalData({ confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION });
        return result.ok ? { ok: true, value: undefined } : result;
    };
}
//# sourceMappingURL=awiki-client-bridge.js.map