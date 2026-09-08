/** Bilingual copy for the AWiki identity and installation settings page. */

export type AwikiSettingsKey =
  | 'nav'
  | 'intro'
  | 'tabsLabel'
  | 'basicTab'
  | 'devicesTab'
  | 'integrationTab'
  | 'devicesUnavailable'
  | 'devicesLoading'
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
  | 'tenantTab'
  | 'localDataTab'
  | 'tenantLoading'
  | 'tenantUnavailable'
  | 'tenantDiagnostic'
  | 'tenantAdd'
  | 'tenantName'
  | 'tenantDomain'
  | 'tenantDomainHelp'
  | 'tenantCreate'
  | 'tenantCreated'
  | 'tenantOfficial'
  | 'tenantCustom'
  | 'tenantCurrent'
  | 'tenantSwitch'
  | 'tenantSwitching'
  | 'tenantSwitched'
  | 'tenantRenamed'
  | 'tenantArchive'
  | 'tenantArchived'
  | 'tenantChangeFailed'
  | 'updatesTab'
  | 'updateCurrent'
  | 'updateModelCurrent'
  | 'updateTenant'
  | 'updateUnchecked'
  | 'updateFailed'
  | 'updateCached'
  | 'updateLatest'
  | 'updateRecommended'
  | 'updateModelRecommended'
  | 'desktopNoRelease'
  | 'updateAvailable'
  | 'updateRequired'
  | 'updateNoCommand'
  | 'updateCopied'
  | 'updateCopyFailed'
  | 'updateGuide'
  | 'pluginInstallHelp'
  | 'desktopPluginCommandHelp'
  | 'desktopUpdateTitle'
  | 'desktopDownloadPage'
  | 'desktopInstallHelp'
  | 'desktopPluginHelp'
  | 'desktopResolvesPlugin'
  | 'updateModelRestricted'
  | 'updateTitle'
  | 'updateLoading'
  | 'updateUnavailable'
  | 'updateNoPolicy'
  | 'updateVersions'
  | 'updateRestricted'
  | 'updateRestart'
  | 'updateCheck'
  | 'updateCopy'
  | 'localDataNotice'
  | 'integrationTitle'
  | 'integrationDescription'
  | 'integrationLoading'
  | 'integrationGuide'
  | 'integrationName'
  | 'integrationNamePlaceholder'
  | 'integrationIntroduction'
  | 'integrationIntroductionPlaceholder'
  | 'integrationContactDeveloper'
  | 'integrationContactIntroduction'
  | 'integrationContactIntroductionPlaceholder'
  | 'integrationGroups'
  | 'integrationGroupIntroduction'
  | 'integrationGroupIntroductionPlaceholder'
  | 'integrationAddGroup'
  | 'integrationNoOwnedGroups'
  | 'integrationGroupsUnavailable'
  | 'integrationRemove'
  | 'integrationCopy'
  | 'integrationCreate'
  | 'integrationRotate'
  | 'integrationRotateConfirm'
  | 'integrationClose'
  | 'integrationCloseConfirm'
  | 'integrationClosed'
  | 'integrationClosedDescription'
  | 'integrationReopen'

export const zh: Record<AwikiSettingsKey, string> = {
  nav: 'AWiki',
  intro: '管理 AWiki 身份、域名与本地数据设置。',
  tabsLabel: 'AWiki 设置',
  basicTab: '基础设置',
  devicesTab: '设备',
  devicesUnavailable: '登录 AWiki 后才能管理此安装关联的设备。',
  devicesLoading: '正在读取 AWiki 设备状态…',
  domainLabel: '默认域名',
  domainDescription: '输入纯域名，不要包含协议、路径或端口。',
  defaultValue: '默认值：{domain}',
  save: '保存',
  saving: '保存中…',
  reset: '恢复默认值',
  saved: '已保存。',
  restartNotice: '重启 DeepSeek Harness 后生效。',
  identityNotice: '此设置仅影响后续注册和短 Handle 的域名补全，不会改写已经注册的 DID 或 Handle。',
  invalidDomain: '请输入有效的域名，例如 tenant.example。',
  saveFailed: '未能保存设置，请刷新后重试。',
  loading: '正在读取 AWiki 设置…',
  unavailable: '当前连接无法修改 Host 设置。请在运行 DeepSeek Harness 的本机打开此页面。',
  readOnly: '当前设置文件为只读。',
  dangerTitle: '危险区域',
  dangerDescription: '仅清除当前租户在本机的 AWiki 凭证与消息数据，其他租户保留。清除后需要重新验证绑定手机号才能恢复身份。',
  clearLocalData: '清空本地 AWiki 数据',
  clearDialogTitle: '确认清空本地 AWiki 数据',
  clearDialogDescription: '这是不可恢复的危险操作。请确认你了解以下影响后再继续。',
  clearScope: '当前租户在本机拥有的 DID 凭证、私钥、访问令牌、注册草稿、会话记录和附件索引将被永久删除；其他租户的数据不会被清除。',
  clearRemoteNotice: '服务端 AWiki 账号与 Handle 不会被删除；之后可在 AWiki 面板使用完整 Handle、绑定手机号和验证码恢复原身份，但已清除的本地消息与附件索引不会恢复。',
  clearConfirmationLabel: '请输入“{phrase}”以确认：',
  clearConfirmationPhrase: '永久清空',
  clearConfirm: '永久清空',
  clearing: '正在清空…',
  clearSucceeded: '本地 AWiki 数据已清空。原身份可通过 Handle 和绑定手机号恢复，已清除的本地数据无法恢复。',
  clearFailed: '未能清空本地 AWiki 数据，未完成删除。请重试。',
  cancel: '取消',
  tenantTab: '租户',
  localDataTab: '本地数据',
  integrationTab: '临时消息集成',
  tenantLoading: '正在读取租户目录…',
  tenantUnavailable: '租户目录当前不可用。请在运行 DeepSeek Harness 的本机重试。',
  tenantDiagnostic: '历史租户目录无法安全判定，当前保持原运行环境且已写入本地诊断。',
  tenantAdd: '添加自定义租户',
  tenantName: '租户名称',
  tenantDomain: '租户域名',
  tenantDomainHelp: '只填写纯域名。创建后端点与数据 Scope 将固定，不会随名称改变。',
  tenantCreate: '创建租户',
  tenantCreated: '租户已创建。',
  tenantOfficial: '官方',
  tenantCustom: '自定义',
  tenantCurrent: '当前',
  tenantSwitch: '切换',
  tenantSwitching: '正在切换租户并隔离旧运行时…',
  tenantSwitched: '租户切换完成。',
  tenantRenamed: '租户已重命名。',
  tenantArchive: '归档',
  tenantArchived: '租户已归档；本地数据仍保留。',
  tenantChangeFailed: '租户操作失败；如发生切换，Host 已尝试恢复原租户。',
  updatesTab: "版本与更新",
  updateCurrent: "当前版本：{version}",
  updateModelCurrent: "模型组件：{version}",
  updateTenant: "当前服务：{tenant}",
  updateUnchecked: "尚未检查更新。",
  updateFailed: "检查失败，请稍后重试。",
  updateCached: "当前显示上次成功检查的结果。",
  updateLatest: "当前版本无需升级。",
  updateRecommended: "推荐版本：{version}",
  updateModelRecommended: "模型插件推荐版本：{version}",
  desktopNoRelease: "暂未发布适用于当前发行通道的更新。",
  updateAvailable: "有可用更新。",
  updateRequired: "当前组件版本不满足服务要求，请升级或切换服务。",
  updateNoCommand: "该服务暂未提供可用的独立插件升级命令。",
  updateCopied: "已复制升级命令。",
  updateCopyFailed: "复制失败，请选中上方命令手动复制。",
  updateGuide: "查看发布与安装说明",
  pluginInstallHelp: "将 YOUR_PROFILE 替换为启动 DSH 时使用的配置名（通常为 web），在终端执行，完成后重启 DSH。",
  desktopPluginCommandHelp: "从托盘打开“DSH 终端”，执行命令，完成后重启桌面版。",
  desktopUpdateTitle: "DSH Desktop · AWiki",
  desktopDownloadPage: "前往桌面版下载页面",
  desktopInstallHelp: "选择适合电脑的完整安装包，完成安装后重新打开应用。",
  desktopPluginHelp: "桌面用户可前往上方下载页面查看完整桌面版；插件兼容要求由当前服务决定。",
  desktopResolvesPlugin: "此桌面更新包含满足当前服务推荐版本要求的插件组件。",
  updateModelRestricted: "当前模型组件低于最低支持版本 {minimum}，AWiki 模型服务暂不可用。",
  updateTitle: '插件更新',
  updateLoading: '正在检查更新…',
  updateUnavailable: '暂时无法读取更新状态；不会使用其他租户的策略。',
  updateNoPolicy: '当前服务暂未提供更新信息。',
  updateVersions: '当前版本 {current}，推荐版本 {recommended}，最低支持版本 {minimum}。',
  updateRestricted: '当前版本 {current} 低于「{tenant}」要求的最低版本 {minimum}，请升级后重启，或切换服务。',
  updateRestart: '升级完成后请重启 DeepSeek Harness。',
  updateCheck: '检查更新',
  updateCopy: '复制升级命令',
  localDataNotice: '这里只管理当前租户的独立本地数据。归档租户不会删除其身份、消息或密钥。',
  integrationTitle: '临时消息集成',
  integrationDescription: '为你的产品创建一个可公开使用的 AWiki 联系入口。',
  integrationLoading: '正在读取临时消息集成…',
  integrationGuide: '查看集成指南',
  integrationName: '产品或插件名称',
  integrationNamePlaceholder: '请输入产品或插件名称',
  integrationIntroduction: '总体介绍',
  integrationIntroductionPlaceholder: '请输入产品、插件或开发者的总体介绍',
  integrationContactDeveloper: '允许访客联系当前开发者身份',
  integrationContactIntroduction: '开发者私聊介绍',
  integrationContactIntroductionPlaceholder: '请输入访客联系开发者时看到的介绍',
  integrationGroups: '可联系社群',
  integrationGroupIntroduction: '社群介绍',
  integrationGroupIntroductionPlaceholder: '请输入访客加入这个社群前看到的介绍',
  integrationAddGroup: '添加我创建的社群…',
  integrationNoOwnedGroups: '当前没有可添加的自有社群。',
  integrationGroupsUnavailable: '暂时无法读取你创建的社群，请稍后重试。',
  integrationRemove: '移除',
  integrationCopy: '复制链接',
  integrationCreate: '创建 Integration',
  integrationRotate: '换发链接',
  integrationRotateConfirm: '换发后旧链接将立即失效，是否继续？',
  integrationClose: '关闭 Integration',
  integrationCloseConfirm: '关闭后当前公开链接将永久失效。以后重新开放时会生成新链接，旧链接不会恢复。是否继续？',
  integrationClosed: '公开入口已关闭',
  integrationClosedDescription: '旧链接不会恢复。你可以调整下方配置并创建一个全新的公开链接。',
  integrationReopen: '创建新的公开入口',
}

export const en: Record<AwikiSettingsKey, string> = {
  nav: 'AWiki',
  intro: 'Manage AWiki identity, domain, and local data settings.',
  tabsLabel: 'AWiki settings',
  basicTab: 'Basics',
  devicesTab: 'Devices',
  devicesUnavailable: 'Sign in to AWiki to manage devices associated with this installation.',
  devicesLoading: 'Loading AWiki device status…',
  domainLabel: 'Default domain',
  domainDescription: 'Enter a bare domain without a protocol, path, or port.',
  defaultValue: 'Default: {domain}',
  save: 'Save',
  saving: 'Saving…',
  reset: 'Restore default',
  saved: 'Saved.',
  restartNotice: 'Restart DeepSeek Harness for the change to take effect.',
  identityNotice: 'This affects future registrations and short-Handle completion. It does not rewrite an existing DID or Handle.',
  invalidDomain: 'Enter a valid domain, such as tenant.example.',
  saveFailed: 'The setting could not be saved. Refresh and try again.',
  loading: 'Loading AWiki settings…',
  unavailable: 'This connection cannot edit Host settings. Open this page on the machine running DeepSeek Harness.',
  readOnly: 'The settings document is read-only.',
  dangerTitle: 'Danger zone',
  dangerDescription: 'Clear only the current tenant’s local AWiki credentials and messages. Other tenants are preserved. Restoring this identity requires phone verification.',
  clearLocalData: 'Clear local AWiki data',
  clearDialogTitle: 'Clear local AWiki data?',
  clearDialogDescription: 'This is an irreversible operation. Confirm that you understand the impact before continuing.',
  clearScope: 'Only the current tenant’s locally owned DID credentials, private keys, access tokens, registration drafts, conversations, and attachment index will be deleted. Other tenants are preserved.',
  clearRemoteNotice: 'The server-side AWiki account and Handle are not deleted. You can restore the original identity from the AWiki panel with its full Handle, bound phone number, and verification code, but cleared local messages and attachment indexes cannot be restored.',
  clearConfirmationLabel: 'Type “{phrase}” to confirm:',
  clearConfirmationPhrase: 'PERMANENTLY CLEAR',
  clearConfirm: 'Clear permanently',
  clearing: 'Clearing…',
  clearSucceeded: 'Local AWiki data was cleared. The identity can be restored with its Handle and bound phone number, but the cleared local data cannot be recovered.',
  clearFailed: 'Local AWiki data could not be cleared. Deletion did not complete. Try again.',
  cancel: 'Cancel',
  tenantTab: 'Tenant',
  localDataTab: 'Local data',
  integrationTab: 'Guest integration',
  tenantLoading: 'Loading the tenant catalog…',
  tenantUnavailable: 'The tenant catalog is unavailable. Retry on the machine running DeepSeek Harness.',
  tenantDiagnostic: 'The historical tenant layout could not be determined safely. The previous runtime is preserved and a local diagnostic was written.',
  tenantAdd: 'Add custom tenant',
  tenantName: 'Tenant name',
  tenantDomain: 'Tenant domain',
  tenantDomainHelp: 'Enter a bare domain. Its endpoint and storage scope become immutable after creation; renaming does not change either.',
  tenantCreate: 'Create tenant',
  tenantCreated: 'Tenant created.',
  tenantOfficial: 'Official',
  tenantCustom: 'Custom',
  tenantCurrent: 'Current',
  tenantSwitch: 'Switch',
  tenantSwitching: 'Switching tenant and fencing the previous runtime…',
  tenantSwitched: 'Tenant switch completed.',
  tenantRenamed: 'Tenant renamed.',
  tenantArchive: 'Archive',
  tenantArchived: 'Tenant archived; its local data was retained.',
  tenantChangeFailed: 'The tenant operation failed. If this was a switch, the Host attempted to restore the previous tenant.',
  updatesTab: "Versions & Updates",
  updateCurrent: "Installed version: {version}",
  updateModelCurrent: "Model component: {version}",
  updateTenant: "Current service: {tenant}",
  updateUnchecked: "Updates have not been checked yet.",
  updateFailed: "Unable to check. Please retry.",
  updateCached: "Showing the last successful check.",
  updateLatest: "Your version is up to date.",
  updateRecommended: "Recommended version: {version}",
  updateModelRecommended: "Recommended model plugin: {version}",
  desktopNoRelease: "No release is currently available for this channel.",
  updateAvailable: "An update is available.",
  updateRequired: "Your component version is unsupported. Update or switch services.",
  updateNoCommand: "This service has not provided an independent plugin upgrade command.",
  updateCopied: "Upgrade command copied.",
  updateCopyFailed: "Copy failed. Select the command above and copy it manually.",
  updateGuide: "Release and installation guide",
  pluginInstallHelp: "Replace YOUR_PROFILE with the profile used to launch DSH (usually web), run in your terminal, then restart DSH.",
  desktopPluginCommandHelp: "Open DSH Terminal from the tray, run the command, then restart Desktop.",
  desktopUpdateTitle: "DSH Desktop · AWiki",
  desktopDownloadPage: "Visit Desktop Download Page",
  desktopInstallHelp: "Choose the full installer for your computer, install it, then reopen the app.",
  desktopPluginHelp: "Desktop users can visit the download page above. Plugin requirements belong to the current service.",
  desktopResolvesPlugin: "This Desktop update includes components meeting the current service’s recommended versions.",
  updateModelRestricted: "The model component is below the minimum version {minimum}; the AWiki model service is unavailable.",
  updateTitle: 'Plugin updates',
  updateLoading: 'Loading the active tenant’s update policy…',
  updateUnavailable: 'Update status is unavailable. No other tenant’s policy will be used.',
  updateNoPolicy: 'This service has not provided update information.',
  updateVersions: 'Current {current}; recommended {recommended}; minimum supported {minimum}.',
  updateRestricted: 'Plugin {current} is below this tenant’s minimum {minimum}. Upgrade and restart DSH.',
  updateRestart: 'Restart DeepSeek Harness after upgrading.',
  updateCheck: 'Check for updates',
  updateCopy: 'Copy upgrade command',
  localDataNotice: 'This area manages only the current tenant’s isolated local data. Archiving a tenant does not delete its identity, messages, or keys.',
  integrationTitle: 'Guest messaging integration',
  integrationDescription: 'Create a public AWiki contact entry for your product.',
  integrationLoading: 'Loading the guest messaging integration…',
  integrationGuide: 'View integration guide',
  integrationName: 'Product or plugin name',
  integrationNamePlaceholder: 'Enter the product or plugin name',
  integrationIntroduction: 'Introduction',
  integrationIntroductionPlaceholder: 'Describe the product, plugin, or developer',
  integrationContactDeveloper: 'Allow guests to contact this developer identity',
  integrationContactIntroduction: 'Developer contact introduction',
  integrationContactIntroductionPlaceholder: 'Describe what guests see before contacting the developer',
  integrationGroups: 'Contactable communities',
  integrationGroupIntroduction: 'Community introduction',
  integrationGroupIntroductionPlaceholder: 'Describe what guests see before joining this community',
  integrationAddGroup: 'Add one of my communities…',
  integrationNoOwnedGroups: 'There are no owned communities available to add.',
  integrationGroupsUnavailable: 'Your owned communities cannot be loaded right now. Please try again later.',
  integrationRemove: 'Remove',
  integrationCopy: 'Copy link',
  integrationCreate: 'Create Integration',
  integrationRotate: 'Rotate link',
  integrationRotateConfirm: 'The old link will stop working immediately. Continue?',
  integrationClose: 'Close Integration',
  integrationCloseConfirm: 'The current public link will be revoked permanently. Reopening later creates a new link; the old one will not return. Continue?',
  integrationClosed: 'Public entry closed',
  integrationClosedDescription: 'The old link will not return. Adjust the settings below, then create a new public link.',
  integrationReopen: 'Create new public entry',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.awiki': AwikiSettingsKey
  }
}
