/** Host-owned validation for on-demand mail requests. */
import type { AwikiMailInboxRequest, AwikiMailMarkReadRequest, AwikiMailReadRequest, AwikiMailSendRequest } from './types.ts';
/** Resolve mailbox defaults before the provider is invoked. */
export declare function mailInboxRequest(request?: AwikiMailInboxRequest): AwikiMailInboxRequest;
export declare function mailReadRequest(request: AwikiMailReadRequest): AwikiMailReadRequest;
export declare function mailMarkReadRequest(request: AwikiMailMarkReadRequest): AwikiMailMarkReadRequest;
export declare function mailSendRequest(request: AwikiMailSendRequest): AwikiMailSendRequest;
//# sourceMappingURL=mail.d.ts.map