# dsh-awiki

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 提供 AWiki
身份与消息能力。一个包同时包含 Host Service、Rust SDK Provider、Agent 工具，
以及带可拖动 AWiki Me 悬浮入口的 Web 客户端。

## 功能

- 在 Web UI 中注册一个部署级 AWiki 身份，根 Agent 与子 Agent 共用。
- 注册失败时保留手机号、Handle、验证码和本机待注册密钥；注册未开放、验证码状态失效和提交冲突会给出对应的安全处理提示。
- 私聊和已有群聊列表、未读角标、最新消息预览、时间更新与昵称持久化。
- 文本和单附件消息，支持图片预览、附件说明与 SHA 校验。
- 圆形可拖动入口、自适应四角弹窗、深色模式和当前会话记忆。
- 用户点击后才生成的 AI 对话总结：最多处理 50 条最近或未读消息，按会话保留本次运行期缓存，并支持过期提示、重试、复制与跳转原消息。
- 在 DSH 设置中提供 AWiki 页面，可持久化修改并校验默认 Handle 域名。
- 在设置页危险区域中，经输入确认词的二次确认后，永久清空本机 AWiki 身份、密钥、令牌、注册草稿和消息索引。
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
| `DSH_AWIKI_STATE_ROOT` | 私有 Rust IM Core 状态目录 | `$DSH_HOME/awiki/im-core` 或 `~/.dsh/awiki/im-core` |
| `DSH_AWIKI_POLL_INTERVAL_MS` | 弹窗打开时的轮询间隔 | `5000` |
| `DSH_AWIKI_ATTACHMENT_MAX_BYTES` | 解码后的附件上限 | `10485760` |
| `DSH_AWIKI_SUMMARY_MAX_INPUT_BYTES` | Host 最小化后的 UTF-8 输入上限 | `32768` |
| `DSH_AWIKI_SUMMARY_TIMEOUT_MS` | 单次模型调用超时 | `30000` |
| `DSH_AWIKI_SUMMARY_MAX_OUTPUT_TOKENS` | 结构化摘要输出上限 | `768` |

Handle 提供方的默认域名为 `awiki.ai`。本机用户可以在“设置 → AWiki”中覆盖该值；
DSH 会把选择写入自己的设置文件，并在下次重启 Harness 后生效。该设置影响后续
身份注册和短 Handle 的域名补全，不会改写已经注册的 DID 或 Handle。

“设置 → AWiki → 危险区域”中的清空操作只删除此安装的本地 AWiki 状态，不删除
服务端账号或 Handle。执行前必须在确认弹窗中输入指定确认词；成功后本机 DID 私钥、
访问令牌、注册草稿、会话记录和附件索引无法通过应用恢复，原身份也可能无法再由本机使用。

Provider 域名和消息服务 DID 都是协议标识，不能根据 API host 猜测。生产环境 URL
必须使用 HTTPS。IM Core 状态目录含访问材料，应置于仓库外，限制文件权限，并为磁盘
和备份提供保护。

默认附件上限为解码后 10 MiB；反向代理请求体上限至少应为 14 MiB，以容纳
base64 与 JSON 封装开销。

AI 总结只在用户点击“AI 总结”后生成。打开会话时若存在未读消息，Host 总结该未读
尾部；否则总结最近 50 条。Host 最终强制 50 条与 UTF-8 字节上限，附件只发送文件名、
MIME、大小和说明，不发送文件二进制；序列化后的对话内容始终按不可信数据处理。
总结只按会话缓存在本次浏览器运行期；新消息只会把已有结果标记为过期，不会自动再次
调用模型。可替换的 `dsh-awiki/summary-provider` 使用 Harness 当前默认 provider/model
执行一次直接的 `ctx.llm.stream`，不会创建 Agent，也不会写入 Agent session。

## 开发与验证

需要 Node.js 22.19+（或 24+）以及 pnpm 11.7：

```bash
pnpm install --frozen-lockfile
pnpm run verify
pnpm pack --dry-run
```

生产 Host 加载固定版本 `@awiki/im-core-node@0.1.0`；平台原生 addon 由它的
optional dependencies 选择，并保持在 JavaScript bundle 外。使用者无需安装 Rust，
也无需检出 `awiki-cli-rs2`。来源与许可证见 `THIRD_PARTY_NOTICES.md`。

Typert Host/Remote 产物与当前 Host 契约一同提交；在独立 Typert 生成器支持根级
包之前，`pnpm check:generated` 会固定检查完整的 14 个 Remote 方法。

## 安全

不要提交 OTP、访问令牌、私钥、身份状态、`.env` 或远程测试报告。
`pnpm check:public` 是验证和打包前的公开仓库安全门禁。

## 许可证

插件使用 MIT 许可证；Rust IM Core 运行时依赖使用 AGPL-3.0-only，并继续适用其
自带的许可证与声明。
