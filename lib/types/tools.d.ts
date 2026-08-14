/** Model-facing AWiki read and approved-send tools. */
import type { Context } from '@deepseek-ai/cordis';
import type { AwikiService } from './index.ts';
/** Model tool that reads the public deployment identity. */
export declare const AWIKI_IDENTITY_STATUS_TOOL = "awiki_identity_status";
/** Model tool that lists direct and existing group conversations. */
export declare const AWIKI_LIST_CONVERSATIONS_TOOL = "awiki_list_conversations";
/** Model tool that reads one conversation history page. */
export declare const AWIKI_HISTORY_TOOL = "awiki_history";
/** Model tool that sends an approved text message. */
export declare const AWIKI_SEND_MESSAGE_TOOL = "awiki_send_message";
/** Model tool that sends one approved attachment. */
export declare const AWIKI_SEND_ATTACHMENT_TOOL = "awiki_send_attachment";
/**
 * Register all AWiki tools and their execution-time approval listener.
 * @param ctx - owning effect scope carrying the tool registry.
 * @param service - shared deployment AWiki service invoked by each tool.
 */
export declare function registerAwikiTools(ctx: Context, service: AwikiService): void;
//# sourceMappingURL=tools.d.ts.map