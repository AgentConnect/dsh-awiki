/** Host-only AWiki-authenticated model-proxy provider and loopback account API. */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "awiki-model-proxy";
export declare const inject: string[];
export interface Config {
    readonly baseURL?: string;
    readonly contextWindow?: number;
    readonly maxTokens?: number;
    readonly tokenRefreshSkewSeconds?: number;
}
export declare const Config: z<Config>;
export declare function apply(ctx: Context, input?: Config): void;
//# sourceMappingURL=index.d.ts.map