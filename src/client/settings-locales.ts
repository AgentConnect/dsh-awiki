/** Bilingual copy for the AWiki identity and installation settings page. */

export type AwikiSettingsKey =
  | 'nav'
  | 'intro'
  | 'domainLabel'
  | 'domainDescription'
  | 'defaultValue'
  | 'save'
  | 'saving'
  | 'reset'
  | 'saved'
  | 'restartNotice'
  | 'identityNotice'
  | 'invalidDomain'
  | 'saveFailed'
  | 'loading'
  | 'unavailable'
  | 'readOnly'
  | 'dangerTitle'
  | 'dangerDescription'
  | 'clearLocalData'
  | 'clearDialogTitle'
  | 'clearDialogDescription'
  | 'clearScope'
  | 'clearRemoteNotice'
  | 'clearConfirmationLabel'
  | 'clearConfirmationPhrase'
  | 'clearConfirm'
  | 'clearing'
  | 'clearSucceeded'
  | 'clearFailed'
  | 'cancel'

export const zh: Record<AwikiSettingsKey, string> = {
  nav: 'AWiki',
  intro: '管理 AWiki 身份、域名与本地数据设置。',
  domainLabel: '默认域名',
  domainDescription: '输入纯域名，不要包含协议、路径或端口。',
  defaultValue: '默认值：{domain}',
  save: '保存',
  saving: '保存中…',
  reset: '恢复默认值',
  saved: '已保存。',
  restartNotice: '重启 DeepSeek Harness 后生效。',
  identityNotice: '此设置仅影响后续注册和短 Handle 的域名补全，不会改写已经注册的 DID 或 Handle。',
  invalidDomain: '请输入有效的域名，例如 awiki.ai。',
  saveFailed: '未能保存设置，请刷新后重试。',
  loading: '正在读取 AWiki 设置…',
  unavailable: '当前连接无法修改 Host 设置。请在运行 DeepSeek Harness 的本机打开此页面。',
  readOnly: '当前设置文件为只读。',
  dangerTitle: '危险区域',
  dangerDescription: '永久清除此安装中的 AWiki 凭证与消息数据。清除后需要重新验证绑定手机号才能恢复原身份。',
  clearLocalData: '清空本地 AWiki 数据',
  clearDialogTitle: '确认清空本地 AWiki 数据',
  clearDialogDescription: '这是不可恢复的危险操作。请确认你了解以下影响后再继续。',
  clearScope: '本地 DID、私钥、访问令牌、注册草稿、会话记录和附件索引都会被永久删除。',
  clearRemoteNotice: '服务端 AWiki 账号与 Handle 不会被删除；之后可在 AWiki 面板使用完整 Handle、绑定手机号和验证码恢复原身份，但已清除的本地消息与附件索引不会恢复。',
  clearConfirmationLabel: '请输入“{phrase}”以确认：',
  clearConfirmationPhrase: '永久清空',
  clearConfirm: '永久清空',
  clearing: '正在清空…',
  clearSucceeded: '本地 AWiki 数据已清空。原身份可通过 Handle 和绑定手机号恢复，已清除的本地数据无法恢复。',
  clearFailed: '未能清空本地 AWiki 数据，未完成删除。请重试。',
  cancel: '取消',
}

export const en: Record<AwikiSettingsKey, string> = {
  nav: 'AWiki',
  intro: 'Manage AWiki identity, domain, and local data settings.',
  domainLabel: 'Default domain',
  domainDescription: 'Enter a bare domain without a protocol, path, or port.',
  defaultValue: 'Default: {domain}',
  save: 'Save',
  saving: 'Saving…',
  reset: 'Restore default',
  saved: 'Saved.',
  restartNotice: 'Restart DeepSeek Harness for the change to take effect.',
  identityNotice: 'This affects future registrations and short-Handle completion. It does not rewrite an existing DID or Handle.',
  invalidDomain: 'Enter a valid domain, such as awiki.ai.',
  saveFailed: 'The setting could not be saved. Refresh and try again.',
  loading: 'Loading AWiki settings…',
  unavailable: 'This connection cannot edit Host settings. Open this page on the machine running DeepSeek Harness.',
  readOnly: 'The settings document is read-only.',
  dangerTitle: 'Danger zone',
  dangerDescription: 'Permanently clear the AWiki credentials and message data stored by this installation. Restoring the identity will require phone verification.',
  clearLocalData: 'Clear local AWiki data',
  clearDialogTitle: 'Clear local AWiki data?',
  clearDialogDescription: 'This is an irreversible operation. Confirm that you understand the impact before continuing.',
  clearScope: 'The local DID, private keys, access token, registration draft, conversations, and attachment index will be permanently deleted.',
  clearRemoteNotice: 'The server-side AWiki account and Handle are not deleted. You can restore the original identity from the AWiki panel with its full Handle, bound phone number, and verification code, but cleared local messages and attachment indexes cannot be restored.',
  clearConfirmationLabel: 'Type “{phrase}” to confirm:',
  clearConfirmationPhrase: 'PERMANENTLY CLEAR',
  clearConfirm: 'Clear permanently',
  clearing: 'Clearing…',
  clearSucceeded: 'Local AWiki data was cleared. The identity can be restored with its Handle and bound phone number, but the cleared local data cannot be recovered.',
  clearFailed: 'Local AWiki data could not be cleared. Deletion did not complete. Try again.',
  cancel: 'Cancel',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.awiki': AwikiSettingsKey
  }
}
