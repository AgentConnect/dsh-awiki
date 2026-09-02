/** Host-only server-authoritative outbound Mail query. */
import { type AwikiExternalHttpAuth } from './external-http-auth.ts';
import type { AwikiMailInboxPage, AwikiMailInboxRequest } from './types.ts';
/** Fixed Mail Service client; callers cannot select method, direction, headers, or transport. */
export declare class AwikiMailListClient {
    private readonly origin;
    private readonly auth;
    constructor(origin: string, auth: AwikiExternalHttpAuth);
    listOutbound(request: AwikiMailInboxRequest): Promise<AwikiMailInboxPage>;
    private page;
}
//# sourceMappingURL=mail-list-client.d.ts.map