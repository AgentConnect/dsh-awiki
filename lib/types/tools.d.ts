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
/** Model tool that reads the deployment mailbox account. */
export declare const AWIKI_MAIL_ACCOUNT_TOOL = "awiki_mail_account";
/** Model tool that lists one bounded mailbox page. */
export declare const AWIKI_MAIL_INBOX_TOOL = "awiki_mail_inbox";
/** Model tool that reads one bounded plain-text mail message. */
export declare const AWIKI_MAIL_READ_TOOL = "awiki_mail_read";
/** Model tool that marks selected mail messages read after approval. */
export declare const AWIKI_MAIL_MARK_READ_TOOL = "awiki_mail_mark_read";
/** Model tool that sends one plain-text mail after approval. */
export declare const AWIKI_MAIL_SEND_TOOL = "awiki_mail_send";
/**
 * Register all AWiki tools and their execution-time approval listener.
 * @param ctx - owning effect scope carrying the tool registry.
 * @param service - shared deployment AWiki service invoked by each tool.
 */
export declare function registerAwikiTools(ctx: Context, service: AwikiService): void;
//# sourceMappingURL=tools.d.ts.map