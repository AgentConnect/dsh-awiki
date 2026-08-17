/** Same-process contract between the AWiki Host service and a replaceable summary provider. */
import type { AwikiMessageId, AwikiSummaryTodo } from './types.ts';
/** Data-minimized text message passed to the model provider. */
export interface AwikiSummaryTextMessage {
    readonly id: AwikiMessageId;
    readonly sender: string;
    readonly outgoing: boolean;
    readonly sentAt: string;
    readonly content: {
        readonly kind: 'text';
        readonly text: string;
    };
}
/** Data-minimized attachment message. Attachment bytes and storage fields never enter this contract. */
export interface AwikiSummaryAttachmentMessage {
    readonly id: AwikiMessageId;
    readonly sender: string;
    readonly outgoing: boolean;
    readonly sentAt: string;
    readonly content: {
        readonly kind: 'attachment';
        readonly fileName: string;
        readonly mimeType: string;
        readonly size: number;
        readonly caption?: string;
    };
}
/** Chronological, JSON-safe message supplied to a summary provider. */
export type AwikiSummarySourceMessage = AwikiSummaryTextMessage | AwikiSummaryAttachmentMessage;
/** One bounded model request after Host-owned history selection and minimization. */
export interface AwikiSummaryProviderRequest {
    readonly messages: readonly AwikiSummarySourceMessage[];
    readonly signal?: AbortSignal;
}
/** Strict structured output accepted from a summary provider. */
export interface AwikiSummaryProviderResult {
    readonly highlights: readonly string[];
    readonly conclusions: readonly string[];
    readonly todos: readonly AwikiSummaryTodo[];
}
/** Replaceable same-process provider used by the Host Remote. */
export interface AwikiSummaryProvider {
    summarize(request: AwikiSummaryProviderRequest): Promise<AwikiSummaryProviderResult>;
}
//# sourceMappingURL=summary-provider-api.d.ts.map