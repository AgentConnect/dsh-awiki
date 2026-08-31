/** Host-only fixed-scope client for Guest Integration management. */
import { type AwikiExternalHttpAuth } from './external-http-auth.ts';
import type { AwikiCreateIntegrationRequest, AwikiIntegrationResult, AwikiIntegrationRevisionRequest, AwikiIntegrationView, AwikiUpdateIntegrationRequest } from './types.ts';
/** Fixed-origin client; callers cannot control path, method, headers, or transport. */
export declare class AwikiIntegrationClient {
    private readonly origin;
    private readonly auth;
    constructor(origin: string, auth: AwikiExternalHttpAuth);
    read(): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    create(request: AwikiCreateIntegrationRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    update(request: AwikiUpdateIntegrationRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    rotate(request: AwikiIntegrationRevisionRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    close(request: AwikiIntegrationRevisionRequest): Promise<AwikiIntegrationResult<AwikiIntegrationView>>;
    private execute;
}
//# sourceMappingURL=integration-client.d.ts.map