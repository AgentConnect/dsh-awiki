# dsh-awiki

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 提供 AWiki
身份与消息能力。一个包同时包含 Host Service、TypeScript SDK Provider、Agent 工具，
以及带可拖动 AWiki Me 悬浮入口的 Web 客户端。

## 功能

- 在 Web UI 中注册一个部署级 AWiki 身份，根 Agent 与子 Agent 共用。
- 私聊和已有群聊列表、未读角标、最新消息预览、时间更新与昵称持久化。
- 文本和单附件消息，支持图片预览、附件说明与 SHA 校验。
- 圆形可拖动入口、自适应四角弹窗、深色模式和当前会话记忆。
- 在 DSH 设置中提供 AWiki 页面，可持久化修改并校验默认 Handle 域名。
- 五个受 Harness 审批约束的 Agent 工具：身份、会话、历史、文本发送、附件发送。

首版不包含端到端加密、多身份、群管理、实时推送和单消息多附件。

## 安装

仓库提交了构建产物，可以直接作为 DSH 插件安装：

```bash
pnpm add github:AgentConnect/dsh-awiki
```

请在常规 DSH base 和 Web app bundle 之后应用本包。`cordis.patch.yml` 会加入
Host Service 和 Provider；浏览器客户端由 DSH 根据包元数据自动发现并注入。

## 配置

插件无需环境变量即可连接公开的 `awiki.ai` 租户；仅在部署需要覆盖默认值时设置以下变量：

| 环境变量 | 用途 | 默认值 |
| --- | --- | --- |
| `DSH_AWIKI_USER_SERVICE_URL` | AWiki user service 绝对 URL | `https://awiki.ai` |
| `DSH_AWIKI_USER_SERVICE_DOMAIN` | Handle 提供方域名的部署默认值 | `awiki.ai` |
| `DSH_AWIKI_MESSAGE_SERVICE_URL` | Host 调用的 message service URL | `https://awiki.ai` |
| `DSH_AWIKI_MESSAGE_SERVICE_DID` | 权威消息服务 DID | `did:wba:awiki.ai` |
| `DSH_AWIKI_MESSAGE_SERVICE_PUBLIC_URL` | 写入协议记录的公开 endpoint | `https://awiki.ai` |
| `DSH_AWIKI_ALLOWED_ATTACHMENT_ORIGINS` | 额外附件 HTTPS origin 的 JSON 数组 | `[]` |
| `DSH_AWIKI_STATE_PATH` | 私有身份状态文件 | `$DSH_HOME/awiki/identity.json` 或 `~/.dsh/awiki/identity.json` |
| `DSH_AWIKI_POLL_INTERVAL_MS` | 弹窗打开时的轮询间隔 | `5000` |
| `DSH_AWIKI_ATTACHMENT_MAX_BYTES` | 解码后的附件上限 | `10485760` |

Handle 提供方的默认域名为 `awiki.ai`。本机用户可以在“设置 → AWiki”中覆盖该值；
DSH 会把选择写入自己的设置文件，并在下次重启 Harness 后生效。该设置影响后续
身份注册和短 Handle 的域名补全，不会改写已经注册的 DID 或 Handle。

Provider 域名和消息服务 DID 都是协议标识，不能根据 API host 猜测。生产环境 URL
必须使用 HTTPS。身份状态文件含访问材料，应置于仓库外，限制文件权限，并为磁盘
和备份提供保护。

默认附件上限为解码后 10 MiB；反向代理请求体上限至少应为 14 MiB，以容纳
base64 与 JSON 封装开销。

## 开发与验证

需要 Node.js 22.19+（或 24+）以及 pnpm 11.7：

```bash
pnpm install --frozen-lockfile
pnpm run verify
pnpm pack --dry-run
```

因为 `@anp/typescript-sdk@0.2.0` 尚未发布到 npm，仓库暂时在 `vendor/` 中保留
经过验证的源码快照。生产 Host 构建会把 SDK 打进插件，使用者不需要额外检出
ANP 仓库。来源与许可证见 `THIRD_PARTY_NOTICES.md`。

Typert Host/Remote 产物与当前 Host 契约一同提交；在独立 Typert 生成器支持根级
包之前，`pnpm check:generated` 会固定检查完整的 12 个 Remote 方法。

## 安全

不要提交 OTP、访问令牌、私钥、身份状态、`.env` 或远程测试报告。
`pnpm check:public` 是验证和打包前的公开仓库安全门禁。

## 许可证

插件使用 MIT 许可证；vendor 中的第三方材料继续适用其保留的许可证与声明。
