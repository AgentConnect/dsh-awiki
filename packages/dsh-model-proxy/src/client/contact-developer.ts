/** Direct-chat Handle for the Model Proxy maintainer. */
export const AWIKI_MODEL_PROXY_DEVELOPER_HANDLE = 'cgw.awiki.ai'

/** Profile install command for the AWiki messaging plugin. */
export const AWIKI_PLUGIN_INSTALL_COMMAND = 'dsh plugin --profile web add @awiki/dsh-plugin@latest'

const MESSAGING_UNAVAILABLE = 'AWiki 消息界面暂不可用'

/** Browser messaging client used by Contact developer. */
export interface AwikiMessagingClient {
  readonly openDirectChat?: (handle: string) => Promise<{
    readonly ok: boolean
    readonly error?: string
  }>
}

/** Outcome of opening the maintainer chat from Model Proxy settings. */
export type ContactDeveloperResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'plugin-missing' }
  | { readonly ok: false; readonly reason: 'failed'; readonly error: string }

/** True when the AWiki messaging plugin exposed a direct-chat action. */
export function isAwikiMessagingAvailable(client: AwikiMessagingClient | undefined): boolean {
  return typeof client?.openDirectChat === 'function'
}

/**
 * Open a direct chat with the maintainer, or report that the messaging plugin is missing.
 * @param client - the shared AWiki browser bridge, if the messaging plugin is installed.
 */
export async function contactModelProxyDeveloper(
  client: AwikiMessagingClient | undefined,
): Promise<ContactDeveloperResult> {
  if (!isAwikiMessagingAvailable(client) || client?.openDirectChat === undefined) {
    return { ok: false, reason: 'plugin-missing' }
  }
  try {
    const result = await client.openDirectChat(AWIKI_MODEL_PROXY_DEVELOPER_HANDLE)
    if (result.ok) return { ok: true }
    if (result.error === MESSAGING_UNAVAILABLE) return { ok: false, reason: 'plugin-missing' }
    return { ok: false, reason: 'failed', error: result.error ?? MESSAGING_UNAVAILABLE }
  } catch {
    return { ok: false, reason: 'plugin-missing' }
  }
}
