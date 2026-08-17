/** One-shot LLM provider for user-triggered AWiki conversation summaries. */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm';
import type { AwikiSummaryProviderRequest, AwikiSummaryProviderResult } from './summary-provider-api.ts';
/** Default end-to-end deadline for an auxiliary summary request. */
export declare const DEFAULT_SUMMARY_TIMEOUT_MS = 30000;
/** Default output cap for the small structured JSON response. */
export declare const DEFAULT_SUMMARY_MAX_OUTPUT_TOKENS = 768;
/** Loader configuration for the replaceable default summary provider. */
export interface Config {
    readonly timeoutMs?: number;
    readonly maxOutputTokens?: number;
}
/** Loader schema for one-shot summary policy. */
export declare const Config: z<Config>;
/** Stable internal failure taxonomy consumed only by the Host normalizer. */
export type AwikiSummaryProviderFailureCode = 'route-unavailable' | 'timeout' | 'cancelled' | 'model-failed' | 'truncated' | 'tool-call' | 'empty-output' | 'invalid-output';
/** Closed provider error. Its message contains no model output or provider response. */
export declare class AwikiSummaryProviderError extends Error {
    readonly code: AwikiSummaryProviderFailureCode;
    readonly name = "AwikiSummaryProviderError";
    constructor(code: AwikiSummaryProviderFailureCode);
}
interface SummaryLlmContext {
    readonly llm: {
        stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
    };
    readonly agentDefaultModel: {
        currentSelection(): {
            readonly provider: string;
            readonly model: string;
            readonly reasoningEffort?: GenerateOptions['reasoningEffort'];
        };
    };
}
/** JSON-frame untrusted messages without allowing their content to escape the data boundary. */
export declare function frameAwikiSummaryMessages(messages: AwikiSummaryProviderRequest['messages']): string;
/** Execute one direct LLM stream without creating an Agent or writing a Session. */
export declare function summarizeAwikiMessagesWithLlm(ctx: SummaryLlmContext, config: Config, request: AwikiSummaryProviderRequest): Promise<AwikiSummaryProviderResult>;
/** Cordis plugin name used by Loader diagnostics. */
export declare const name = "awiki-default-summary-provider";
/** The Host registry and current Harness model route must exist before this provider loads. */
export declare const inject: string[];
/** Register the one-shot provider after the AWiki SDK provider. */
export declare function apply(ctx: Context, config: Config): void;
export {};
//# sourceMappingURL=summary-provider.d.ts.map