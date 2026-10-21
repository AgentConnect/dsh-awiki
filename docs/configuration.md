# 配置说明

本文是 **dsh-awiki**（含 `packages/dsh-model-proxy`）的权威配置说明。真源是打包期双租户 JSON、`src/index.ts` 的 `Config` schema、`cordis.patch.yml` 注入，以及 model-proxy `Config`。

`cordis.patch.yml` 只传递显式环境变量；官方租户默认值统一来自打包期 JSON。其他运行参数若由 patch 显式注入，则以注入值为准（例如 `pollIntervalMs` 注入 `5000`，代码 schema 默认 `3000`）。

## 身份 / 服务发现

| 标识符 | 来源 | 作用 | 默认值 |
| --- | --- | --- | --- |
| `pnpm run build -- --tenant-config FILE` | 打包参数 | 完整替换两个内置租户槽位 | `config/builtin-tenants.default.json` |
| `userServiceUrl` / `DSH_AWIKI_USER_SERVICE_URL` | Cordis Config | 旧环境迁移用 User Service 基址 | 打包默认槽位 Origin |
| `userServiceDomain` / `DSH_AWIKI_USER_SERVICE_DOMAIN` | Config | 旧环境迁移用 Handle 域 | 打包默认槽位 DID host |
| `legacyTenantSlot` / `DSH_AWIKI_LEGACY_TENANT_SLOT` | Config | 运维明确知道旧数据属于当前官方槽位时的一次性覆盖 | 未配置；普通升级使用不可变的历史 `awiki.info` 快照 |
| `messageServiceUrl` / `DSH_AWIKI_MESSAGE_SERVICE_URL` | Config | 旧环境迁移用 Message Service 基址 | 打包默认槽位 Origin |
| `messageServicePublicUrl` / `DSH_AWIKI_MESSAGE_SERVICE_PUBLIC_URL` | Config | Message 公开基址；Provider 从该基址生成 DID 的 `/anp-im/rpc` 地址 | 打包默认槽位 Origin |
| `messageServiceDid` / `DSH_AWIKI_MESSAGE_SERVICE_DID` | Config | 旧权威 Message DID | 打包默认槽位 DID |
| `mailServiceUrl` / `DSH_AWIKI_MAIL_SERVICE_URL` | Config | Mail 基址 | 解析时回退 `userServiceUrl` |
| `domain` | 旧持久设置 `awiki.domain` | 只作为历史租户迁移输入 | 打包默认槽位 DID host |
| 租户注册表 | Host 私有原子 JSON | active tenant、generation、不可变 storage scope | 新安装使用 `default_slot`；无注册表的历史数据保留发布过的 `awiki.info` 端点；显式私有域保持自定义 |
| `services.model_proxy` / `services.guest_gateway` | 当前租户 `server-info` | 仅采用回显 `capabilities_version: 1` 且服务 `protocol_version: 1` 的启用声明；地址不根据域名猜测 | 缺失、未知版本或非法即仅禁用该能力；临时网络失败保留同租户已确认状态 |
| `allowInsecureLoopbackForTesting` | Config | 测试允许 loopback HTTP | `false` |
| `rootKeyProvider` | anp-identity-provider | 根密钥 provider | `keyring` |
| `keyringFallbackToLocalFile` | patch / schema | keyring 失败是否回退本地文件 | `false` |
| `recoveryOnOpen` | patch 写死 | 打开时尝试恢复身份 | `true` |

Provider 将当前租户公开基址的 `/anp-im/rpc` 完整 URL 传给 Core 的 `anpServiceEndpoint`，
用于注册和 Handle Recovery 新生成的身份；`messageServiceUrl` 仍是客户端访问 Home 的基址。
这不重写已发布的身份文档。受旧地址影响的账号可在安装修复版后，先通过产品入口清空当前
租户本地数据，再恢复原 Handle；恢复会替换 DID，其他设备需要重新加入。发送端重新按完整
Handle 查找目标并建立会话。本次不恢复历史失败消息或迁移旧会话。

## 发送目标

已有私聊的文本、附件和 Agent listener 回复使用 `{ kind: 'direct', conversationId }`。
`peer` 与 `conversationId` 互斥；Host 与 Remote 的生成 codec 均拒绝同时提供两者，
不会通过剥离某个字段来选择目标。Host 保留发送前校验，Core 负责会话所有权。
该 ID 来自 Core 的目录解析或会话列表，Host 不构造 ID、不按对方 DID 再次解析；会话的存在性、
归属和最终路由仍由 Core 校验。首次按目标发送继续接受 `{ kind: 'direct', peer }`，跨租户使用
完整 Handle。两个字段不得同时出现，也不得为空。群聊的 `{ kind: 'group', group }` 保持原契约。

## 存储 / 附件 / 实时

| 标识符 | 来源 | 作用 | 默认值 |
| --- | --- | --- | --- |
| `stateRoot` / `DSH_AWIKI_STATE_ROOT` | Config | IM Core 状态根 | `{DSH_HOME}/awiki/im-core` |
| `DSH_HOME` | 环境变量 | DSH 家目录 | `~/.dsh` |
| `attachmentMaxBytes` | Config | 解码后附件上限；Host 向 Browser 投影时取该值与已确认的服务器附件上限中的较小值 | `10485760`（10 MiB） |
| `imageAttachmentCacheMaxBytes` | Config | 图片缓存预算 | `67108864`（64 MiB） |
| `allowedAttachmentOrigins` | Config | 附件 HTTPS origin 允许列表 | `[]` → 回退 Message 公开 origin |
| `pollIntervalMs` | Config | 抽屉打开时轮询 | **代码 `3000`**（patch 注入 `5000`） |
| `realtimeEnabled` / `DSH_AWIKI_REALTIME_ENABLED` | Config | 身份级 Direct/Group/System Notification WSS | **`true`** |
| `listenerEnabled` / `DSH_AWIKI_LISTENER_ENABLED` | Config | Direct 消息当 Agent 入口 | `false`；`'true'` 才开；要求 `realtimeEnabled` |
| `listenerAllowedPeers` | Config | Handle/DID 白名单 | `[]`；开启 listener 时至少 1 个 |
| `listenerWorkspacePath` | Config | Session Workspace | `{DSH_HOME}/workspaces/awiki` |

能力后台发现及主动刷新成功后，Browser 同步更新附件选择器的有效上限（包括降低和提高）；
刷新失败保留最近上限，旧租户或旧会话的迟到配置不得改变当前选择器。

## 摘要 / Model Proxy

| 标识符 | 来源 | 作用 | 默认值 |
| --- | --- | --- | --- |
| `summaryMaxInputBytes` | Config | 摘要输入上限 | `32768` |
| `timeoutMs` / `DSH_AWIKI_SUMMARY_TIMEOUT_MS` | summary-provider | 一次摘要截止 | `30000` |
| `maxOutputTokens` / `DSH_AWIKI_SUMMARY_MAX_OUTPUT_TOKENS` | summary-provider | 摘要输出 token | `768` |
| `services.model_proxy.base_url` | 当前租户 `server-info` | Model Proxy 唯一运行时地址来源 | 缺失或非法即禁用 |
| `services.guest_gateway.base_url` | 当前租户 `server-info` | Guest Gateway 唯一运行时地址来源 | 缺失或非法即禁用 |
| `contextWindow` | Config | 上下文窗口 | `1000000` |
| `maxTokens` | Config | 最大生成 token | `8192` |
| `tokenRefreshSkewSeconds` | Config | 提前刷新秒数 | `60` |
| `enabled` / `tenantPreferencesJson` | 持久设置 `awiki-model-proxy` | 每租户托管模型意愿与回退模型 | `false` / `{}` |
| `AWIKI_RECHARGE_ENABLED` | 源码常量 | 客户端充值 UI | **`true`** |
| `NODE_ENV` | tsdown `define` | 打包时写入 | `production` |

## 租户切换与本地数据保留

显式切换先持久化退出原租户，再以已退出状态打开目标租户的固定 storage scope；成功、失败回滚和随后重启均停留登录页，已有身份由用户选择后进入。不移动或清除原身份和数据库。普通已登录会话的重启不受影响。
Host 在异步 Core 打开和本地身份读取成功后才提交 active tenant；失败重开原 scope，并拒绝
切换期间提交的登录、退出和清除操作。网络能力探测失败不阻止本地离线数据访问。

Browser 从发起切换时隔离旧请求；目标没有身份时显示注册/登录，有保留身份时显示主动进入入口。失败回滚同样停留登录页；加载错误不能显示为成功的空账号。清除操作仅针对当前
租户，由 Core 提供精确的身份归属清单，Browser 按对应 DID 清除缓存，其他租户保留。

官方目录槽位不是存储归属。新环境分配独立 UUID scope；原官方环境改为自定义环境时保留原 scope。读写控制文件均校验 scope 与解析后的目录唯一性。旧版固定槽位冲突只在 pre-v1 备份能证明唯一原归属、且本机身份索引无其他归属时修复，先保留 pre-scope-repair 备份；无法证明时停止打开，不回退到默认或旧环境。浏览器恢复选择与表单状态、托管模型偏好使用稳定 scope 隔离。恢复完成不等于登录，用户显式进入后才激活会话。

## 原生请求版本标识

AWiki 插件 `0.3.17` 使用已发布的 IM Core Node `0.2.9`（native API 18，基于 Rust Core 0.1.6），
Identity 插件固定为 `0.1.4`。正式依赖由 `package.json` 与 `pnpm-lock.yaml` 钉扎；
构建与发布约束见[依赖模式](dependency-modes.md)。
Provider 沿用现有 Core 支持的
`awiki-daemon/0815/0.1.93` 兼容版本头，匹配上海此次最低版本策略；这不新增产品枚举或协议能力。
DSH 插件自身的更新检查仍使用插件包版本。

## 测试

产品 loader 里测试专用旋钮就是 `allowInsecureLoopbackForTesting`（默认 `false`）。
该旋钮只放宽当前租户 `server-info.services.model_proxy.base_url` 的 loopback HTTP；
`guest_gateway` 广告仍要求 HTTPS。插件 Config 里显式配置的 User/Message/Mail URL 仍可用它做本机测试。
没有 `DSH_AWIKI_MODEL_PROXY_URL` 运行时覆盖。

## 用户头像

头像编辑只对当前人类账号且服务声明 `avatarUploadEnabled` 时开放。Browser 负责大小校验、裁剪、压缩和公开 HTTPS 图片缓存；Host 只校验闭合请求并委托 Node/Core 完成认证、幂等上传与资料版本检查。原图和图片字节不进入 Agent 工具、日志或模型上下文。群头像使用服务摘要中同一版本的最多四位成员，不以群成员分页推测拼图。

个人头像直接打开独立编辑器，hover/focus 有编辑提示，文字资料表单不保留重复入口。`react-image-crop 11.1.2` 只拥有正方形选框交互，图片固定完整显示；选区以图片像素存储，复用 `avatar-image.ts` 的预览/导出坐标。支持拖动、四角缩放、触摸与键盘，显示当前头像和新圆形预览。原图 20 MiB/50 MP/单边 16384、预览最长边 2048、512 JPEG/512 KiB 上传限制保持不变。

他人头像预览只在单聊顶部进入，列表点击语义不变，不新增用户资料页。主图/缩略图共用 `useAvatarReference` 与匿名图片缓存，权威清空不回退旧会话 URI；预览有关闭、Esc、背景点击和失败重试，不增加缩放/下载。owner/会话变化关闭预览并拒绝迟到下载。Core 负责公开资料 TTL、版本顺序与失败保留；Browser 不自行查询联邦目录。


## 智能体头像展示（2026-10-08）

仅消费 Core/Host 公开 `DisplayProfile` 的可选 `subjectType`，不查询私有 Agent Inventory，
不引入管理入口、不用姓名或 URI 猜类型。旧 Node 缺字段时安全使用静态策略。
列表、消息旁、成员与群拼图使用 PNG 封面；缺封面时对已有图片解码首帧。
单聊头像详情/放大预览仅对 `subjectType=agent` 播放有界 GIF；减少动态效果和隐藏页面使用封面。
失败按动图→封面→字符占位回退，PNG 解码使用透明画布，真人上传继续只接受既有静态图片。

静态与动图复用匿名缓存：URI 请求合并、最多四个下载、IndexedDB 64 MiB、内存 16 MiB，
GIF 最大 5 MiB、120 帧、累计 2400 万像素。预设稳定 URL 每五分钟条件重验，打开预览与 online
触发合并刷新；304 保留已有图片对象，失败可离线使用旧缓存，owner 切换取消并拒绝迟到结果。
UI 与缓存定向测试不代表真实 DSH/APP 互通验收。正式部署需发布包含头像与 subjectType 的 Node SDK 后更新 pin/lock。

模型偏好迁移由注册表在重命名前持久化 `preferenceTenantIds`，将旧槽位键明确绑定原 storage scope；不再从固定 scope 名推测归属。原 scope 已声明的旧键不会复制给替换环境；同一旧键出现多个声明时保留旧值并停止该键迁移。


## 能力恢复与发现隔离（2026-10-16 开发候选）

`getConfig()` 保留无参数 Remote 合同并立即返回投影；主动重试使用独立无参数 `refreshBackendCapabilities()`，等待刷新但不清空现有界面。

`getConfig()`、本地身份和历史读取不等待发现。Host 独立订阅 Core 公开/消息快照，分别
保留成功来源；Browser 会话轮询与功能投影读取并行。`getConfig(true)` 用于功能页主动
刷新，不清空当前页面。Core 原生 API v21 提供只读快照、订阅与登录状态控制，旧 v20
native 不能混用。暂时发现失败不改为全局 backend-unconfirmed；业务仍保留原认证错误。

同租户经既有地址校验的可选服务元数据以 0600 文件原子保存在 Host stateRoot/cache，
按实际服务地址与存储范围隔离；重启读取再次校验地址。缺少新版合同或网络失败保留
已确认元数据，明确不兼容暂停对应远程能力。Browser 不获得服务认证材料或原始错误。
新增租户的既有完成提示说明当时尚待确认的功能；功能页始终保留入口并补齐登录后的消息
能力。Agent 消费任务按确认/关闭/恢复幂等切换，租户与会话代次拒绝迟到结果。
