/** Project Core's registered Handle into the same provider-owned ANP identity. */
import { type AnpIdentityServiceContract } from '@agent-network-protocol/dsh-anp-identity';
import type { AwikiIdentity } from './types.ts';
export declare function syncAnpIdentityHandle(service: AnpIdentityServiceContract, identity: AwikiIdentity): Promise<void>;
//# sourceMappingURL=identity-handle.d.ts.map