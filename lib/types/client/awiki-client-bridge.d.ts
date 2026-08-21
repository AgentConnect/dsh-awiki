/** Browser service exposing the shared AWiki identity controller to optional clients. */
import { Service, type Context } from '@deepseek-ai/cordis';
import type { ComponentType } from 'react';
import { type AwikiIdentityAccessProps } from './AwikiIdentityAccess.tsx';
import type { AwikiActionResult, AwikiController } from './controller.ts';
/** Public browser-side bridge consumed by optional AWiki companion plugins. */
export declare class AwikiClientBridge extends Service {
    readonly identity: AwikiController;
    readonly IdentityAccess: ComponentType<AwikiIdentityAccessProps>;
    constructor(ctx: Context, identity: AwikiController);
    clearLocalIdentity: () => Promise<AwikiActionResult>;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        awikiClient: AwikiClientBridge;
    }
}
//# sourceMappingURL=awiki-client-bridge.d.ts.map