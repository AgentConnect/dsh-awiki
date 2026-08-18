/** Loopback-only Host transport for AWiki's durable plugin settings. */
import { type SettingsProvider } from '@deepseek-ai/dsh-settings';
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection';
/** Build a handler whose provider lookup remains correct across Cordis reinjection. */
export declare function createAwikiSettingsRpcHandler(getProvider: () => SettingsProvider | undefined): ConnectionRpcHandler;
//# sourceMappingURL=settings-rpc.d.ts.map