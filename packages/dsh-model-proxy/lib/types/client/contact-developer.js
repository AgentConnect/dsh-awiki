/** Direct-chat Handle for the Model Proxy maintainer. */
export const AWIKI_MODEL_PROXY_DEVELOPER_HANDLE = 'cgw.awiki.ai';
/** Profile install command for the AWiki messaging plugin. */
export const AWIKI_PLUGIN_INSTALL_COMMAND = 'dsh plugin --profile web add @awiki/dsh-plugin@latest';
const MESSAGING_UNAVAILABLE = 'AWiki 消息界面暂不可用';
/** True when the AWiki messaging plugin exposed a direct-chat action. */
export function isAwikiMessagingAvailable(client) {
    return typeof client?.openDirectChat === 'function';
}
/**
 * Open a direct chat with the maintainer, or report that the messaging plugin is missing.
 * @param client - the shared AWiki browser bridge, if the messaging plugin is installed.
 */
export async function contactModelProxyDeveloper(client) {
    if (!isAwikiMessagingAvailable(client) || client?.openDirectChat === undefined) {
        return { ok: false, reason: 'plugin-missing' };
    }
    try {
        const result = await client.openDirectChat(AWIKI_MODEL_PROXY_DEVELOPER_HANDLE);
        if (result.ok)
            return { ok: true };
        if (result.error === MESSAGING_UNAVAILABLE)
            return { ok: false, reason: 'plugin-missing' };
        return { ok: false, reason: 'failed', error: result.error ?? MESSAGING_UNAVAILABLE };
    }
    catch {
        return { ok: false, reason: 'plugin-missing' };
    }
}
//# sourceMappingURL=contact-developer.js.map