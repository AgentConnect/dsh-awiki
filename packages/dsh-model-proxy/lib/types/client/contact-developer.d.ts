/** Direct-chat Handle for the Model Proxy maintainer. */
export declare const AWIKI_MODEL_PROXY_DEVELOPER_HANDLE = "cgw.awiki.ai";
/** Profile install command for the AWiki messaging plugin. */
export declare const AWIKI_PLUGIN_INSTALL_COMMAND = "dsh plugin --profile web add @awiki/dsh-plugin@latest";
/** Browser messaging client used by Contact developer. */
export interface AwikiMessagingClient {
    readonly openDirectChat?: (handle: string) => Promise<{
        readonly ok: boolean;
        readonly error?: string;
    }>;
}
/** Outcome of opening the maintainer chat from Model Proxy settings. */
export type ContactDeveloperResult = {
    readonly ok: true;
} | {
    readonly ok: false;
    readonly reason: 'plugin-missing';
} | {
    readonly ok: false;
    readonly reason: 'failed';
    readonly error: string;
};
/** True when the AWiki messaging plugin exposed a direct-chat action. */
export declare function isAwikiMessagingAvailable(client: AwikiMessagingClient | undefined): boolean;
/**
 * Open a direct chat with the maintainer, or report that the messaging plugin is missing.
 * @param client - the shared AWiki browser bridge, if the messaging plugin is installed.
 */
export declare function contactModelProxyDeveloper(client: AwikiMessagingClient | undefined): Promise<ContactDeveloperResult>;
//# sourceMappingURL=contact-developer.d.ts.map