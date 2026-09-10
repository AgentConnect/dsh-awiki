/** Keep AWiki settings local while using Connection's authenticated Fetch carrier. */
import type { ConnectionRpcHandler, HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
/** Register exact buffered routes; Connection applies authentication before dispatch. */
export declare function registerAwikiSettingsTransport(connection: Pick<HostConnectionHandle, 'fetch'>, handler: ConnectionRpcHandler): void;
/** Shared carrier for the AWiki and Model Proxy plugin-owned local operations. */
export declare function registerAwikiLoopbackRpc(connection: Pick<HostConnectionHandle, 'fetch'>, channel: string, endpoints: readonly string[], handler: ConnectionRpcHandler): void;
//# sourceMappingURL=settings-transport.d.ts.map