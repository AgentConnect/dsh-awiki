# 配置说明

本文是 **dsh-awiki**（含 `packages/dsh-model-proxy`）的权威配置说明。真源是打包期双租户 JSON、`src/index.ts` 的 `Config` schema、`cordis.patch.yml` 注入，以及 model-proxy `Config`。

`cordis.patch.yml` 只传递显式环境变量；官方租户默认值统一来自打包期 JSON。其他运行参数若由 patch 显式注入，则以注入值为准（例如 `pollIntervalMs` 注入 `5000`，代码 schema 默认 `3000`）。

## 身份 / 服务发现

| 标识符 | 来源 | 作用 | 默认值 |
| --- | --- | --- | --- |
| `pnpm run build -- --tenant-config FILE` | 打包参数 | 完整替换两个内置租户槽位 | `config/builtin-tenants.default.json` |
| `userServiceUrl` / `DSH_AWIKI_USER_SERVICE_URL` | Cordis Config | 旧环境迁移用 User Service 基址 | 打包默认槽位 Origin |
| `userServiceDomain` / `DSH_AWIKI_USER_SERVICE_DOMAIN` | Config | 旧环境迁移用 Handle 域 | 打包默认槽位 DID host |
| `legacyTenantSlot` / `DSH_AWIKI_LEGACY_TENANT_SLOT` | Config | 无注册表但已有数据时的一次性迁移槽位覆盖 | 打包 JSON 的 `legacy_default_slot`（默认 Global） |
| `messageServiceUrl` / `DSH_AWIKI_MESSAGE_SERVICE_URL` | Config | 旧环境迁移用 Message Service 基址 | 打包默认槽位 Origin |
| `messageServicePublicUrl` / `DSH_AWIKI_MESSAGE_SERVICE_PUBLIC_URL` | Config | 旧 DID 文档公开 Message URL | 打包默认槽位 Origin |
| `messageServiceDid` / `DSH_AWIKI_MESSAGE_SERVICE_DID` | Config | 旧权威 Message DID | 打包默认槽位 DID |
| `mailServiceUrl` / `DSH_AWIKI_MAIL_SERVICE_URL` | Config | Mail 基址 | 解析时回退 `userServiceUrl` |
| `domain` | 旧持久设置 `awiki.domain` | 只作为历史租户迁移输入 | 打包默认槽位 DID host |
| 租户注册表 | Host 私有原子 JSON | active tenant、generation、不可变 storage scope | 新安装使用 `default_slot`；无注册表的历史数据使用 `legacy_default_slot`；显式私有域保持自定义 |
| `services.model_proxy` / `services.guest_gateway` | 当前租户 `server-info` | 可选能力地址；不根据域名猜测 | 缺失或非法即仅禁用该能力 |
| `allowInsecureLoopbackForTesting` | Config | 测试允许 loopback HTTP | `false` |
| `rootKeyProvider` | anp-identity-provider | 根密钥 provider | `keyring` |
| `keyringFallbackToLocalFile` | patch / schema | keyring 失败是否回退本地文件 | `false` |
| `recoveryOnOpen` | patch 写死 | 打开时尝试恢复身份 | `true` |

## 存储 / 附件 / 实时

| 标识符 | 来源 | 作用 | 默认值 |
| --- | --- | --- | --- |
| `stateRoot` / `DSH_AWIKI_STATE_ROOT` | Config | IM Core 状态根 | `{DSH_HOME}/awiki/im-core` |
| `DSH_HOME` | 环境变量 | DSH 家目录 | `~/.dsh` |
| `attachmentMaxBytes` | Config | 解码后附件上限 | `10485760`（10 MiB） |
| `imageAttachmentCacheMaxBytes` | Config | 图片缓存预算 | `67108864`（64 MiB） |
| `allowedAttachmentOrigins` | Config | 附件 HTTPS origin 允许列表 | `[]` → 回退 Message 公开 origin |
| `pollIntervalMs` | Config | 抽屉打开时轮询 | **代码 `3000`**（patch 注入 `5000`） |
| `realtimeEnabled` / `DSH_AWIKI_REALTIME_ENABLED` | Config | 身份级 Direct/Group/System Notification WSS | **`true`** |
| `listenerEnabled` / `DSH_AWIKI_LISTENER_ENABLED` | Config | Direct 消息当 Agent 入口 | `false`；`'true'` 才开；要求 `realtimeEnabled` |
| `listenerAllowedPeers` | Config | Handle/DID 白名单 | `[]`；开启 listener 时至少 1 个 |
| `listenerWorkspacePath` | Config | Session Workspace | `{DSH_HOME}/workspaces/awiki` |

## 摘要 / Model Proxy

| 标识符 | 来源 | 作用 | 默认值 |
| --- | --- | --- | --- |
| `summaryMaxInputBytes` | Config | 摘要输入上限 | `32768` |
| `timeoutMs` / `DSH_AWIKI_SUMMARY_TIMEOUT_MS` | summary-provider | 一次摘要截止 | `30000` |
| `maxOutputTokens` / `DSH_AWIKI_SUMMARY_MAX_OUTPUT_TOKENS` | summary-provider | 摘要输出 token | `768` |
| `baseURL` / `DSH_AWIKI_MODEL_PROXY_URL` | model-proxy Config | 私有/开发显式覆盖；正式环境使用 `server-info` | 未配置 |
| `guestGatewayUrl` / `DSH_AWIKI_GUEST_GATEWAY_URL` | 主插件 Config | 私有/开发显式覆盖；正式环境使用 `server-info` | 未配置 |
| `contextWindow` | Config | 上下文窗口 | `1000000` |
| `maxTokens` | Config | 最大生成 token | `8192` |
| `tokenRefreshSkewSeconds` | Config | 提前刷新秒数 | `60` |
| `enabled` / `tenantPreferencesJson` | 持久设置 `awiki-model-proxy` | 每租户托管模型意愿与回退模型 | `false` / `{}` |
| `AWIKI_RECHARGE_ENABLED` | 源码常量 | 客户端充值 UI | **`true`** |
| `NODE_ENV` | tsdown `define` | 打包时写入 | `production` |

## 测试

产品 loader 里测试专用旋钮就是 `allowInsecureLoopbackForTesting`（默认 `false`）。
