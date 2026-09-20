import type { AwikiIdentityServicesRequest, AwikiIdentityServicesSnapshot, AwikiUpdateIdentityServicesRequest } from '../types.ts';
import type { AwikiActionResult } from './controller.ts';
export interface AwikiIdentityServicesActions {
    getIdentityServices: () => Promise<AwikiActionResult<AwikiIdentityServicesSnapshot>>;
    updateIdentityServices: (request: AwikiUpdateIdentityServicesRequest) => Promise<AwikiActionResult<AwikiIdentityServicesSnapshot>>;
    resumeIdentityServicesUpdate: (request: AwikiIdentityServicesRequest) => Promise<AwikiActionResult<AwikiIdentityServicesSnapshot>>;
}
export declare function AwikiIdentityServices(props: AwikiIdentityServicesActions): import("react").JSX.Element;
//# sourceMappingURL=AwikiIdentityServices.d.ts.map