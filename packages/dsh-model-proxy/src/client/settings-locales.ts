/** Bilingual copy for the Model Proxy settings and onboarding surfaces. */

/** Keys owned by the Model Proxy settings and onboarding surfaces. */
export type ModelProxySettingsKey =
  | 'nav'
  | 'intro'
  | 'tabAccount'
  | 'tabUsage'
  | 'accountBalance'
  | 'billingMode'
  | 'billingStrict'
  | 'billingBypass'
  | 'billingBypassNotice'
  | 'modelStatus'
  | 'modelSourceNotice'
  | 'statusEnabled'
  | 'statusDisabled'
  | 'enableModels'
  | 'disableModels'
  | 'enablingModels'
  | 'disablingModels'
  | 'modelsEnabled'
  | 'modelsDisabled'
  | 'modelActionFailed'
  | 'insufficientBalanceTitle'
  | 'insufficientBalanceDescription'
  | 'modelAccessUnavailableTitle'
  | 'modelAccessUnavailable'
  | 'modelAccountLoading'
  | 'modelAccountUnavailable'
  | 'paymentsUnavailable'
  | 'rechargeComingSoonTitle'
  | 'rechargeComingSoonDescription'
  | 'rechargeComingSoonAcknowledge'
  | 'rechargeComingSoonClose'
  | 'rechargeAmount'
  | 'createRecharge'
  | 'creatingRecharge'
  | 'invalidRechargeAmount'
  | 'rechargeCreated'
  | 'rechargeFailed'
  | 'rechargePaid'
  | 'rechargeClosed'
  | 'rechargeStatusFailed'
  | 'paymentWindowFailed'
  | 'paymentQrAlt'
  | 'paymentQrHint'
  | 'paymentQrFailed'
  | 'pendingRechargeTitle'
  | 'pendingRechargeDescription'
  | 'pendingRechargeLimit'
  | 'continuePayment'
  | 'changeRechargeAmount'
  | 'cancelRechargeDialogTitle'
  | 'cancelRechargeDialogDescription'
  | 'cancelRechargeWarning'
  | 'confirmCancelRecharge'
  | 'cancellingRecharge'
  | 'rechargeCancelled'
  | 'rechargeCancelFailed'
  | 'refreshPaymentStatus'
  | 'refreshingPaymentStatus'
  | 'rechargeOrderStatus'
  | 'orderPending'
  | 'orderPaid'
  | 'orderClosed'
  | 'usageLoading'
  | 'usageDescription'
  | 'usageDescriptionBypass'
  | 'reloadUsage'
  | 'usageEmpty'
  | 'usageTokens'
  | 'usageCalculated'
  | 'usageCharged'
  | 'usageNoPrice'
  | 'onboardingUseApiKey'
  | 'onboardingLater'
  | 'onboardingClose'
  | 'onboardingConnectTitle'
  | 'onboardingIdentityUnavailable'
  | 'onboardingModelTitle'
  | 'onboardingRegistrationDescription'
  | 'onboardingRestoreTitle'
  | 'onboardingRestoreDescription'
  | 'onboardingRecoveryRequiredTitle'
  | 'onboardingRecoveryRequiredDescription'
  | 'onboardingRestore'
  | 'onboardingEnableTitle'
  | 'onboardingBypassDescription'
  | 'onboardingStrictDescription'
  | 'onboardingInsufficientBalanceDescription'
  | 'onboardingPendingRechargeDescription'
  | 'goToRecharge'
  | 'identityLoading'
  | 'identitySignedOutRequired'
  | 'identityRegistrationRequired'
  | 'identityRecoveryRequired'
  | 'identityRestoring'
  | 'contactDeveloper'
  | 'contactPluginMissingTitle'
  | 'contactPluginMissingDescription'
  | 'contactPluginCopyCommand'
  | 'contactPluginCopied'
  | 'contactPluginMissingAcknowledge'
  | 'contactPluginMissingClose'
  | 'cancel'

/** Simplified Chinese dictionary. */
export const zh: Record<ModelProxySettingsKey, string> = {
  nav: '快速充值',
  intro: '管理 AWiki 托管模型、账户充值与用量明细。',
  tabAccount: '账户与充值',
  tabUsage: '用量明细',
  accountBalance: '账户余额',
  billingMode: '计费模式',
  billingStrict: '正式计费',
  billingBypass: '开发联调',
  billingBypassNotice: '当前为开发联调模式，模型调用不会扣减账户余额。',
  modelStatus: 'AWiki 托管模型',
  modelSourceNotice: 'Awiki托管的模型来自DeepSeek官方API，收费标准与DeepSeek官方保持一致',
  statusEnabled: '已启用',
  statusDisabled: '未启用',
  enableModels: '启用',
  disableModels: '停用',
  enablingModels: '正在启用…',
  disablingModels: '正在停用…',
  modelsEnabled: 'AWiki 托管模型已启用，默认模型为 DeepSeek V4 Flash。',
  modelsDisabled: 'AWiki 托管模型已停用，并已恢复此前的默认模型。',
  modelActionFailed: '未能更新 AWiki 托管模型状态。',
  insufficientBalanceTitle: '余额不足',
  insufficientBalanceDescription: '充值到账后即可启用 AWiki 托管模型。充值不会自动启用模型或切换当前模型。',
  modelAccessUnavailableTitle: '暂时无法启用',
  modelAccessUnavailable: '当前账户暂不满足模型访问条件，请稍后刷新重试。',
  modelAccountLoading: '正在读取 AWiki 托管模型账户…',
  modelAccountUnavailable: 'AWiki 托管模型账户暂不可用。',
  paymentsUnavailable: '开发环境暂未开放充值。',
  rechargeComingSoonTitle: '充值功能正在开通中',
  rechargeComingSoonDescription: '我们正在完善充值服务，暂时无法创建充值订单，敬请期待。',
  rechargeComingSoonAcknowledge: '知道了',
  rechargeComingSoonClose: '关闭提示',
  rechargeAmount: '充值金额（元）',
  createRecharge: '创建充值',
  creatingRecharge: '正在创建…',
  invalidRechargeAmount: '请输入大于 0 且最多两位小数的金额。',
  rechargeCreated: '充值订单已创建。支付完成后余额会自动刷新，但不会自动启用或切换模型。',
  rechargeFailed: '未能创建充值订单。',
  rechargePaid: '充值已到账。是否启用 AWiki 托管模型仍由你决定。',
  rechargeClosed: '充值订单已关闭。',
  rechargeStatusFailed: '暂时无法刷新充值状态。',
  paymentWindowFailed: '未能打开系统浏览器中的支付页面。',
  paymentQrAlt: '支付宝充值二维码',
  paymentQrHint: '请使用支付宝扫描二维码完成充值。',
  paymentQrFailed: '未能生成支付二维码，请刷新页面后重试。',
  pendingRechargeTitle: '等待完成充值',
  pendingRechargeDescription: '已有一笔 {amount} 的订单等待支付。',
  pendingRechargeLimit: '该订单支付或关闭前不能创建新的充值订单。支付到账后仍需由你明确启用模型。',
  continuePayment: '继续支付',
  changeRechargeAmount: '取消并修改金额',
  cancelRechargeDialogTitle: '取消当前充值订单？',
  cancelRechargeDialogDescription: '当前 {amount} 订单及二维码将立即失效。关闭后可以重新选择充值金额。',
  cancelRechargeWarning: '如果你已经完成支付，请先返回并刷新支付状态。',
  confirmCancelRecharge: '确认取消',
  cancellingRecharge: '正在取消…',
  rechargeCancelled: '订单已取消，现在可以修改充值金额。',
  rechargeCancelFailed: '未能取消充值订单，当前支付入口仍然有效。',
  refreshPaymentStatus: '刷新支付状态',
  refreshingPaymentStatus: '正在刷新…',
  rechargeOrderStatus: '订单状态：{status}',
  orderPending: '等待支付',
  orderPaid: '已支付',
  orderClosed: '已关闭',
  usageLoading: '正在读取模型用量…',
  usageDescription: '最近 100 条模型调用记录。',
  usageDescriptionBypass: '最近 100 条模型调用记录。开发联调模式仍记录 Token，但实际扣费为 0。',
  reloadUsage: '刷新用量',
  usageEmpty: '暂无模型调用记录。',
  usageTokens: 'Token',
  usageCalculated: '计算费用',
  usageCharged: '实际扣费',
  usageNoPrice: '未配置价表',
  onboardingUseApiKey: '使用 API Key',
  onboardingLater: '稍后配置',
  onboardingClose: '关闭首次引导',
  onboardingConnectTitle: '连接 AWiki',
  onboardingIdentityUnavailable: 'AWiki 身份服务暂不可用。',
  onboardingModelTitle: '使用 AWiki 托管模型',
  onboardingRegistrationDescription: '创建或使用当前设备的 AWiki 身份，即可通过 AWiki 托管代理服务访问 DeepSeek 模型。',
  onboardingRestoreTitle: '恢复 AWiki 身份',
  onboardingRestoreDescription: '这台设备保留了一个已退出的 AWiki 身份。恢复后可以继续使用原账户。',
  onboardingRecoveryRequiredTitle: '需要重新恢复 AWiki 身份',
  onboardingRecoveryRequiredDescription: '当前设备的旧身份凭证已失效。验证原绑定手机号并恢复后，才能继续使用 AWiki 账户和托管模型。',
  onboardingRestore: '恢复身份',
  onboardingEnableTitle: '启用 AWiki 托管模型',
  onboardingBypassDescription: '当前为开发联调模式，可直接启用模型，不会扣减账户余额。',
  onboardingStrictDescription: '启用后默认使用 DeepSeek V4 Flash，可随时在模型选择器中切换到 Pro。',
  onboardingInsufficientBalanceDescription: '当前余额不足，需要先充值。充值到账后，你可以再决定是否启用 AWiki 托管模型。',
  onboardingPendingRechargeDescription: '你有一笔充值订单等待支付。完成支付后，再由你明确启用 AWiki 托管模型。',
  goToRecharge: '前往充值',
  identityLoading: '正在读取 AWiki 身份状态…',
  identitySignedOutRequired: '当前 AWiki 身份已退出。恢复这台设备保留的身份后，才能查看账户余额、充值和用量。',
  identityRegistrationRequired: '请先通过 AWiki 面板创建身份，再查看账户余额、充值和用量。',
  identityRecoveryRequired: '当前设备的 AWiki 身份凭证已失效。请在 AWiki 面板验证绑定手机号并恢复身份后，再查看账户余额、充值和用量。',
  identityRestoring: '正在恢复…',
  contactDeveloper: '联系开发者',
  contactPluginMissingTitle: '需要安装 AWiki 消息插件',
  contactPluginMissingDescription: '联系开发者需要先安装 AWiki 消息插件。请在终端运行下面的命令，安装后重新打开 DeepSeek Harness。',
  contactPluginCopyCommand: '复制命令',
  contactPluginCopied: '已复制',
  contactPluginMissingAcknowledge: '知道了',
  contactPluginMissingClose: '关闭提示',
  cancel: '取消',
}

/** English dictionary. */
export const en: Record<ModelProxySettingsKey, string> = {
  nav: 'Quick Recharge',
  intro: 'Manage AWiki-hosted models, account recharge, and usage.',
  tabAccount: 'Account & Recharge',
  tabUsage: 'Usage',
  accountBalance: 'Account balance',
  billingMode: 'Billing mode',
  billingStrict: 'Production billing',
  billingBypass: 'Development',
  billingBypassNotice: 'Development bypass is active. Model calls do not reduce the account balance.',
  modelStatus: 'AWiki-hosted DeepSeek',
  modelSourceNotice: 'Our hosted models use the official DeepSeek API, with pricing aligned to DeepSeek’s official rates.',
  statusEnabled: 'Enabled',
  statusDisabled: 'Disabled',
  enableModels: 'Enable',
  disableModels: 'Disable',
  enablingModels: 'Enabling…',
  disablingModels: 'Disabling…',
  modelsEnabled: 'AWiki-hosted DeepSeek is enabled. DeepSeek V4 Flash is now the default.',
  modelsDisabled: 'AWiki-hosted DeepSeek is disabled and the previous default model was restored.',
  modelActionFailed: 'The AWiki-hosted DeepSeek setting could not be updated.',
  insufficientBalanceTitle: 'Insufficient balance',
  insufficientBalanceDescription: 'Recharge the account before enabling AWiki-hosted DeepSeek. Recharge never enables or switches models automatically.',
  modelAccessUnavailableTitle: 'Temporarily unavailable',
  modelAccessUnavailable: 'This account cannot access hosted models right now. Refresh and try again later.',
  modelAccountLoading: 'Loading the AWiki-hosted DeepSeek account…',
  modelAccountUnavailable: 'The AWiki-hosted DeepSeek account is unavailable.',
  paymentsUnavailable: 'Recharge is not available in this development environment.',
  rechargeComingSoonTitle: 'Recharge is coming soon',
  rechargeComingSoonDescription: 'We are preparing the recharge service. New recharge orders are temporarily unavailable. Please stay tuned.',
  rechargeComingSoonAcknowledge: 'Got it',
  rechargeComingSoonClose: 'Close notice',
  rechargeAmount: 'Recharge amount (CNY)',
  createRecharge: 'Create recharge',
  creatingRecharge: 'Creating…',
  invalidRechargeAmount: 'Enter an amount greater than zero with no more than two decimal places.',
  rechargeCreated: 'The recharge order was created. Payment refreshes the balance but never enables or switches models automatically.',
  rechargeFailed: 'The recharge order could not be created.',
  rechargePaid: 'The recharge was credited. You still decide whether to enable AWiki-hosted DeepSeek.',
  rechargeClosed: 'The recharge order was closed.',
  rechargeStatusFailed: 'The recharge status could not be refreshed.',
  paymentWindowFailed: 'The payment page could not be opened in the system browser.',
  paymentQrAlt: 'Alipay recharge QR code',
  paymentQrHint: 'Scan this QR code with Alipay to complete the recharge.',
  paymentQrFailed: 'The payment QR code could not be generated. Refresh the page and try again.',
  pendingRechargeTitle: 'Complete your recharge',
  pendingRechargeDescription: 'A {amount} order is awaiting payment.',
  pendingRechargeLimit: 'A new recharge cannot be created until this order is paid or closed. Payment never enables models automatically.',
  continuePayment: 'Continue payment',
  changeRechargeAmount: 'Cancel and change amount',
  cancelRechargeDialogTitle: 'Cancel this recharge order?',
  cancelRechargeDialogDescription: 'The current {amount} order and payment code will stop working. You can then choose a new amount.',
  cancelRechargeWarning: 'If you have already paid, go back and refresh the payment status first.',
  confirmCancelRecharge: 'Cancel order',
  cancellingRecharge: 'Cancelling…',
  rechargeCancelled: 'The order was cancelled. You can now change the recharge amount.',
  rechargeCancelFailed: 'The recharge order could not be cancelled. Its payment action is still available.',
  refreshPaymentStatus: 'Refresh payment status',
  refreshingPaymentStatus: 'Refreshing…',
  rechargeOrderStatus: 'Order status: {status}',
  orderPending: 'Awaiting payment',
  orderPaid: 'Paid',
  orderClosed: 'Closed',
  usageLoading: 'Loading model usage…',
  usageDescription: 'The latest 100 model calls.',
  usageDescriptionBypass: 'The latest 100 model calls. Development mode records tokens while charging zero.',
  reloadUsage: 'Refresh usage',
  usageEmpty: 'No model usage has been recorded.',
  usageTokens: 'Tokens',
  usageCalculated: 'Calculated',
  usageCharged: 'Charged',
  usageNoPrice: 'No active price',
  onboardingUseApiKey: 'Use an API key',
  onboardingLater: 'Configure later',
  onboardingClose: 'Close onboarding',
  onboardingConnectTitle: 'Connect AWiki',
  onboardingIdentityUnavailable: 'The AWiki identity service is unavailable.',
  onboardingModelTitle: 'Use AWiki-hosted DeepSeek',
  onboardingRegistrationDescription: 'Create or use this device’s AWiki identity to access DeepSeek through AWiki’s hosted proxy service.',
  onboardingRestoreTitle: 'Restore AWiki identity',
  onboardingRestoreDescription: 'This device retains a signed-out AWiki identity. Restore it to continue using the existing account.',
  onboardingRecoveryRequiredTitle: 'Recover the AWiki identity again',
  onboardingRecoveryRequiredDescription: 'The previous identity credential on this device is no longer valid. Verify the bound phone and recover it before using the AWiki account or hosted models.',
  onboardingRestore: 'Restore identity',
  onboardingEnableTitle: 'Enable AWiki-hosted DeepSeek',
  onboardingBypassDescription: 'Development bypass is active, so models can be enabled without reducing the account balance.',
  onboardingStrictDescription: 'DeepSeek V4 Flash becomes the default. You can switch to Pro from the model selector.',
  onboardingInsufficientBalanceDescription: 'The balance is insufficient. Recharge first, then decide whether to enable AWiki-hosted DeepSeek.',
  onboardingPendingRechargeDescription: 'A recharge order is awaiting payment. After it is paid, you still explicitly choose whether to enable AWiki-hosted DeepSeek.',
  goToRecharge: 'Go to recharge',
  identityLoading: 'Loading the AWiki identity…',
  identitySignedOutRequired: 'The AWiki identity is signed out. Restore the identity retained on this device to view the account, recharge, and usage.',
  identityRegistrationRequired: 'Create an identity from the AWiki panel before viewing the account, recharge, and usage.',
  identityRecoveryRequired: 'The AWiki credential on this device is no longer valid. Recover the identity from the AWiki panel before viewing the account, recharge, and usage.',
  identityRestoring: 'Restoring…',
  contactDeveloper: 'Contact developer',
  contactPluginMissingTitle: 'Install the AWiki messaging plugin',
  contactPluginMissingDescription: 'Contacting the developer requires the AWiki messaging plugin. Run the command below in a terminal, then reopen DeepSeek Harness.',
  contactPluginCopyCommand: 'Copy command',
  contactPluginCopied: 'Copied',
  contactPluginMissingAcknowledge: 'Got it',
  contactPluginMissingClose: 'Close notice',
  cancel: 'Cancel',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.awiki-model-proxy': ModelProxySettingsKey
  }
}
