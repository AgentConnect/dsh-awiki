# 配置说明

本文是 **dsh-awiki**（含 `packages/dsh-model-proxy`）的权威配置说明。真源是 `src/index.ts` 的 `Config` schema、`cordis.patch.yml` 注入，以及 model-proxy `Config`。

`cordis.patch.yml` 里的 fallback 若与 schema 不一致，**以代码 schema 为准**（例如 `pollIntervalMs`：patch 写 `5000`，schema 默认 `3000`）。

## 身份 / 服务发现

| 标识符 | 来源 | 作用 | 默认值 |
| --- | --- | --- | --- |
| `userServiceUrl` / `DSH_AWIKI_USER_SERVICE_URL` | Cordis Config | User Service 基址 | `https://awiki.info` |
| `userServiceDomain` / `DSH_AWIKI_USER_SERVICE_DOMAIN` | Config | Legacy Handle 域 | `awiki.info` |
| `messageServiceUrl` / `DSH_AWIKI_MESSAGE_SERVICE_URL` | Config | Message Service 基址 | `https://awiki.info` |
| `messageServicePublicUrl` / `DSH_AWIKI_MESSAGE_SERVICE_PUBLIC_URL` | Config | DID 文档公开 Message URL | `https://awiki.info` |
| `messageServiceDid` / `DSH_AWIKI_MESSAGE_SERVICE_DID` | Config | 权威 Message DID | `did:wba:awiki.info` |
| `mailServiceUrl` / `DSH_AWIKI_MAIL_SERVICE_URL` | Config | Mail 基址 | 解析时回退 `userServiceUrl` |
| `domain` | 持久设置 `awiki.domain` | 注册与裸 Handle 解析域 | `awiki.info` |
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
| `baseURL` / `DSH_AWIKI_MODEL_PROXY_URL` | model-proxy Config | 模型代理 origin | `https://model.awiki.info` |
| `contextWindow` | Config | 上下文窗口 | `1000000` |
| `maxTokens` | Config | 最大生成 token | `8192` |
| `tokenRefreshSkewSeconds` | Config | 提前刷新秒数 | `60` |
| `enabled` | 持久设置 `awiki-model-proxy.enabled` | 用户是否打开托管 DeepSeek | `false` |
| `AWIKI_RECHARGE_ENABLED` | 源码常量 | 客户端充值 UI | **`true`** |
| `NODE_ENV` | tsdown `define` | 打包时写入 | `production` |

## 测试

产品 loader 里测试专用旋钮就是 `allowInsecureLoopbackForTesting`（默认 `false`）。
