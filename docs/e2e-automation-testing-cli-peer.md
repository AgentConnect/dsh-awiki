# DSH-AWiki Web 自动化端到端测试技术方案（CLI Peer V1）

状态：已批准实施；阶段 0 合同已冻结，阶段 1 待实施
日期：2026-08-31
适用仓库：`dsh-awiki`
首版边界：一个真实 DeepSeek Harness Web 实例 + Playwright + 真实 AWiki CLI Peer

## 1. 目标与所有权

本方案在 `dsh-awiki` 仓库内建立插件自身的 Web 产品端到端测试。测试必须启动真实
DeepSeek Harness，加载真实 ANP Identity 与 DSH-AWiki 插件，由 Playwright 操作用户可见页面，
再由独立 AWiki CLI 身份充当私聊和群聊对端。

本方案调整的是 DSH 插件 Web E2E 的所有权，不移动其他产品测试：

- `dsh-awiki/tests/e2e/` 拥有 DSH 插件安装、Harness Host、Web 页面和 CLI Peer 互通 E2E；
- `awiki-me/tests/e2e/` 继续拥有 AWiki Me App 产品 E2E；
- `awiki-system-test` 继续拥有不依赖某个具体 UI 的通用跨服务协议、身份和消息系统验收。

当前仓库 `AGENTS.md` 仍写着产品 E2E 只属于 `awiki-me`。开始实施本方案前，必须先把它同步为
上述边界，避免文档与执行规则冲突。本文件只定义方案，不授权在本步骤中实现测试代码。

## 2. 首版范围

首版实现：

- 真实构建或打包的 `@awiki/dsh-plugin`；
- 真实 DeepSeek Harness Web profile；
- 真实 `@agent-network-protocol/dsh-anp-identity`；
- 一个 Playwright BrowserContext 操作 DSH Web 页面；
- 一个或多个真实 `awiki-cli` 子进程作为独立 Peer；
- macOS 与无桌面 Linux 使用同一组业务用例；
- 私聊双向收发、群聊双向收发、刷新和 Harness 重启连续性；
- 失败 trace、截图、Harness/CLI 脱敏日志和 cleanup ledger。

首版不实现：

- 两个 DeepSeek Harness 实例或两个 DSH Web 用户；
- AWiki Me、移动端或浏览器兼容性产品验收；
- 用 HTTP Stub、数据库插入或复制 Core/Vault 状态冒充真实 Peer；
- 全浏览器全用例笛卡尔积；
- 性能、长稳、压力和大群容量测试；
- 为测试新增生产认证绕过、自动审批或弱化 SAS/OTP/用户确认。

双 Harness 可作为后续 V2，用于验证 DSH Web ↔ DSH Web、双页面群管理和双页面 Device Join，
但不进入本方案的首版交付条件。

## 3. 总体架构

```text
                         Playwright Test
                               |
                      BrowserContext / Page
                               |
                     http://127.0.0.1:<port>
                               |
                  DeepSeek Harness Web + Host
                    |                     |
          dsh-anp-identity          dsh-awiki plugin
                    |                     |
                    +------ AWiki Core ---+
                               |
              reviewed User / Message services
                               |
                   independent awiki-cli Peer
                 separate DID / Vault / Core root
```

Playwright 只操作 DSH 页面。CLI Peer 通过公开 CLI 命令和真实服务完成注册、私聊、群聊与独立
收件验证。发送端显示成功不能代替接收端证据，数据库和服务端内部状态也不能作为业务 oracle。

## 4. 仓库布局

建议实施后的目录结构：

```text
dsh-awiki/
├── playwright.config.ts
├── tests/e2e/
│   ├── fixtures/
│   │   ├── harness-instance.ts
│   │   ├── cli-peer.ts
│   │   ├── protected-config.ts
│   │   └── resource-ledger.ts
│   ├── pages/
│   │   ├── awiki-identity-page.ts
│   │   ├── awiki-conversation-page.ts
│   │   └── awiki-group-page.ts
│   ├── specs/
│   │   ├── harness-smoke.spec.ts
│   │   ├── direct-cli-peer.spec.ts
│   │   ├── group-cli-peer.spec.ts
│   │   └── restart-continuity.spec.ts
│   └── support/
│       ├── exact-message.ts
│       ├── redaction.ts
│       └── process-tree.ts
└── scripts/
    ├── prepare-e2e-profile.mjs
    └── start-e2e-harness.mjs
```

`pages/` 只封装用户可见操作和稳定定位器，不放业务捷径。`fixtures/` 拥有进程、账号、状态根和
清理生命周期。`specs/` 不自行拼接 DSH 配置、CLI 环境或秘密。

## 5. Harness 实例模型

`HarnessInstance` fixture 负责一个真实、可回收的 DSH 实例：

```ts
interface HarnessInstance {
  readonly url: string
  readonly profileRoot: string
  readonly stateRoot: string
  readonly logDir: string
  stop(): Promise<void>
}
```

每次运行必须：

1. 生成不可预测的 `runId` 和临时根目录；
2. 分配空闲 loopback 端口，不写死共享端口；
3. 隔离 `HOME`、`XDG_CONFIG_HOME`、DSH profile、ANP Identity Store、AWiki Core state root、
   Workspace 和日志目录；
4. 从当前源码构建一次插件 tarball，再由临时 profile 安装/激活该不可变产物；
5. 先加载 ANP Identity Service/Provider，再加载 AWiki Service/Provider 和 Web client；
6. 启动 DSH Web Host，等待进程 ready marker 与 HTTP 页面同时就绪；
7. 在任何业务写入前断言实际 plugin 版本、目标域、User/Message URL、Message Service DID、
   state root 和 listener/realtime 策略；
8. 测试结束时先关闭 BrowserContext，再优雅停止 Harness 进程组，超时后才强制终止；
9. 删除本地临时根，并把无法公开删除的远端资源写入脱敏 ledger。

本地开发可以显式复用人工启动的 Harness；CI 和正式 gate 必须启动新实例，不能连接未知的既有
profile。首版先使用 `workers: 1`，避免固定 OTP cooldown、远端 Handle quota、端口和状态根竞争。

## 6. CLI Peer 模型

CLI Peer 是独立真实用户，不是被测 DSH Host 的内部 helper：

```ts
interface CliPeer {
  readonly did: string
  readonly handle: string
  sendDirect(target: string, text: string): Promise<MessageRef>
  waitForDirect(message: ExpectedMessage): Promise<ObservedMessage>
  createGroup(name: string, members: readonly string[]): Promise<GroupRef>
  sendGroup(group: string, text: string): Promise<MessageRef>
  waitForGroupMessage(message: ExpectedMessage): Promise<ObservedMessage>
  close(): Promise<void>
}
```

每个 Peer 必须拥有：

- 独立 Handle、DID、设备密钥和服务 Token；
- 独立 CLI home、workspace、Core state、Vault、缓存和配置文件；
- 与当前测试冻结的 CLI binary source ref；
- 只通过公开 `awiki-cli` 命令完成身份、消息和群操作；
- 固定、脱敏的错误投影，不把 stdout/stderr 原文直接写入 Playwright 报告。

OTP 和其他写入凭据只允许通过受保护配置及 stdin/进程环境传递，禁止出现在 argv、Git、报告、
截图、trace 或异常文本。相同 DID 的多设备场景必须走真实 Device Join，不能复制 CLI 或 DSH
状态目录；该场景不属于本首版的必需用例。

## 7. Playwright 与跨平台策略

首选 `@playwright/test`，版本精确固定为开发时验证过的版本。

| Gate | 环境 | 浏览器与模式 | 范围 |
| --- | --- | --- | --- |
| PR smoke | Linux | Chromium headless | 安装、启动、页面加载、插件入口 |
| PR focused | Linux | Chromium headless | 私聊与群聊核心路径，条件齐全时执行 |
| macOS focused | macOS | Chromium headless | 与 Linux 相同的必需业务用例 |
| release compatibility | macOS | WebKit headless | 少量入口、私聊和群聊兼容检查 |
| local debug | macOS/Linux | headed | 人工诊断，不作为独立业务证据 |

无桌面 Linux 默认直接使用 Playwright headless，不要求 Xvfb。只有明确验证窗口、焦点或 headed
差异时才使用：

```bash
xvfb-run pnpm exec playwright test --headed
```

Linux CI 优先使用与 `@playwright/test` 精确同版本的官方 Playwright 容器；若使用宿主机，则由
固定的安装步骤准备浏览器和系统依赖。截图像素基线按 OS/浏览器拆分，核心业务断言使用 DOM、
可访问角色和稳定状态，不依赖跨平台像素一致。

每个测试创建新的 BrowserContext。BrowserContext 只隔离浏览器状态；真正的身份、私钥和消息
状态由独立 Harness/CLI state root 隔离。本首版只有一个 DSH Harness，所以多个 BrowserContext
仍代表同一个 DSH 部署身份，不能把它们描述为多个用户。

## 8. 页面驱动与定位器

定位优先级固定为：

1. `getByRole` + 可见名称；
2. `getByLabel`；
3. 稳定且无敏感内容的 `data-testid`；
4. 最后才使用结构选择器。

测试不得：

- 从 Playwright 直接调用 Host Remote 方法来替代点击、输入和页面确认；
- 用 CSS class、构建 hash、列表序号或文案全文作为唯一业务定位；
- 通过 sleep 等待消息；
- 根据发送端 toast 推导接收端已经收到消息；
- 读取 SQLite、Vault、Token、WebSocket raw payload 或服务数据库作为页面成功证据。

若页面缺少稳定定位器，可以增加 `data-testid` 和非敏感 `data-message-id`，但不得增加测试专用
业务 API、认证绕过或自动用户确认。

## 9. 首版用例矩阵

### 9.1 P0：安装与启动

- 临时 DSH profile 从当前 tarball 安装两个插件；
- profile 中 Identity/AWiki Service 与 Provider 各只有一份；
- Web 页面可访问，AWiki launcher 和身份入口可见；
- 错误 Node native API、插件装载失败或 unsafe target 必须在业务写入前失败；
- Harness 停止后端口、Store lock 和子进程全部释放。

### 9.2 P0：DSH → CLI 私聊

1. DSH Web 和 CLI Peer 使用两个独立 fresh identity；
2. Playwright 在 DSH 页面按 Handle/DID 打开 Direct；
3. 页面发送带唯一 `runId` marker 的文本；
4. CLI Peer 从自己的真实 Inbox/History 观察该消息；
5. 验证 sender/receiver DID、正文、方向和 exact-one；
6. DSH 刷新与重复可靠同步后，页面仍只显示一条。

### 9.3 P0：CLI → DSH 私聊

1. CLI Peer 发送一个具有唯一消息 ID/marker 的 Direct；
2. DSH realtime 只触发可靠同步，不把 WebSocket payload 直接写入页面；
3. 页面会话列表、未读数和消息正文收敛；
4. 打开会话后正文出现一次，read 状态收敛且不反弹；
5. 页面刷新后消息和会话身份保持一致。

### 9.4 P0：群聊双向消息

- DSH Web 创建支持范围内的群，并把 CLI Peer 作为初始成员；
- CLI 独立确认相同 Group DID、成员身份和加入状态；
- DSH 发送群消息，CLI 精确收到一次；
- CLI 发送群消息，DSH 页面精确显示一次并标识正确发送者；
- 页面刷新、realtime reconnect 和重复 sync 不产生第二个群或重复消息；
- 非成员或已失去成员资格的 CLI Peer 发送必须失败关闭。

首版不要求 DSH Web 实现当前产品不支持的 post-creation group administration。只测试已有公开
能力：创建时初始成员、现有 open-join 行为和消息收发。

### 9.5 P0：Harness 重启连续性

- 保留同一 DSH state root，停止并重新启动 Harness；
- 页面恢复同一 DID/Handle、Direct roster、群和本地 committed timeline；
- CLI Peer 在 DSH 离线期间发送消息；
- DSH 恢复后通过正式 reliable sync 收敛该消息一次；
- 重启不重复注册、不复制密钥、不创建第二 identity-level realtime session。

### 9.6 P1：后续增量

- 文本附件/图片预览与 restart cache；
- optimistic send 失败和精确回滚；
- 网络断开、hint loss、reconnect 和远端 history 暂时失败；
- Group 创建部分成员失败；
- sign-out/resume 与 clear-local-data；
- Device Join 的 DSH UI 方向；
- WebKit/Firefox 扩展矩阵。

P1 不阻塞首版框架和 P0 闭环落地。

## 10. 断言与可信证据

每条业务消息至少验证：

- 唯一测试 marker；
- canonical message ID（当 UI 提供安全属性时）；
- canonical Direct conversation 或 Group DID；
- sender/receiver DID 和方向；
- 精确正文；
- 接收端 exact-one；
- 稳定窗口、页面刷新或重复同步后仍 exact-one。

CLI 的发送成功和 DSH 的 toast 只能作为局部证据。私聊与群聊最终成功必须由对端独立投影与
页面可见结果共同证明。Playwright 失败产物包括：

- `trace.zip`（仅限无秘密业务阶段）；
- 当前页面截图；
- 可选失败视频；
- DSH/CLI 脱敏日志；
- 进程退出状态和固定 readiness 阶段；
- cleanup/residual ledger；
- plugin/CLI/Playwright/浏览器精确版本和 source ref。

报告必须区分 passed、failed、skipped 和 not-run；required 用例缺环境、被跳过或没有 Peer 独立
oracle 时整体非零。

## 11. 秘密、trace 与测试账号

Playwright trace 会保存 DOM snapshot 和网络信息，因此身份 provisioning 与 OTP 输入不能使用
普通业务 trace：

1. 单独的 setup 阶段启动 BrowserContext，关闭 trace、video 和 screenshot；
2. 通过真实 DSH 页面完成必要的 OTP 输入；
3. 身份进入 Host active 状态后销毁 setup context；
4. 新建不含 OTP 的业务 BrowserContext，再为私聊/群聊测试开启失败 trace；
5. 产物写入前运行秘密形状扫描，发现手机号、OTP、Bearer、JWT、私钥或 SAS 即使测试断言通过，
   整体仍失败。

受保护配置必须 ignored、权限限制为 `0600`，至少包含目标名、账号池引用和 CLI binary/source
ref。测试报告只记录 target 名、域、公开 URL 和资源计数，不记录秘密值。

## 12. 环境与清理

建议保留两个执行 lane：

- `ui-smoke`：只启动本地 Harness 和页面，不创建远端身份；进入 PR 必需门禁；
- `live-cli-peer`：显式选择 reviewed test target 后运行真实身份、私聊和群聊；不得隐式回退到
  `awiki.ai` 或默认生产配置。

`live-cli-peer` 的每次运行使用唯一 Handle 前缀和消息 marker。fixture 必须在创建远端资源前
打开 ledger，随后逐项登记 identity、DID、group、message 和本地 root。清理遵循：

- 本地 profile、Store、浏览器目录、CLI root、日志和进程必须精确清除；
- 有公开且已审计删除能力的远端资源，按 run scope 自动清除并复验；
- 没有公开删除能力的 identity/Handle 记录为 `residual`，不能报告为 cleaned；
- cleanup failure、未关闭进程、未释放 Store lock 或秘密扫描失败均使 gate 非零；
- 不为了测试方便直接修改共享数据库、绕过 quota 或扩大远端清理范围。

若首版选择 `rwiki-cn-testing`，只能修改和重启该独立环境的受管服务；`awiki.info` 只作只读
配置参考，不能成为副作用目标。

## 13. 命令与 CI 入口（目标形态）

建议最终提供：

```bash
# 无远端业务写入的本地 Harness Web smoke
pnpm run e2e:smoke

# 显式 reviewed target 上的 DSH Web + CLI Peer focused E2E
DSH_AWIKI_E2E_TARGET=rwiki-cn-testing \
pnpm run e2e:live

# 本地可视化调试
pnpm exec playwright test --headed

# 无桌面 Linux 上的 headed 诊断，仅在需要时使用
xvfb-run pnpm exec playwright test --headed
```

CI 至少包含：

- Linux Chromium headless smoke；
- macOS Chromium headless smoke；
- 条件受保护的 Linux/macOS live-cli-peer focused gate；
- macOS WebKit 少量 release compatibility；
- artifact 上传与 secret scan；
- required skip/not-run、stale tarball、CLI source ref 不匹配和 cleanup failure 的 fail-closed 检查。

## 14. 实施阶段与完成标准

### 阶段 0：规则和合同冻结

- 更新 `AGENTS.md` 的 E2E 所有权；
- 冻结 DSH 启动命令、ready marker、profile schema、Playwright 版本和 CLI artifact/source ref；
- 冻结受保护配置、报告和 ledger schema；
- 明确首个 reviewed live target 与账号池/cooldown 策略。

### 阶段 1：Harness + Playwright smoke

- 实现临时 profile、插件 tarball 安装、动态端口、ready 等待和进程树 teardown；
- macOS/Linux Chromium headless 均能加载真实 AWiki 页面；
- 不发送 OTP、不创建远端身份。

### 阶段 2：CLI Peer 与私聊闭环

- 实现独立 CLI Peer fixture；
- 完成 DSH → CLI、CLI → DSH、exact-one、unread/read 和页面刷新；
- setup 阶段秘密不进入 trace 或报告。

### 阶段 3：群聊与重启

- 完成群创建、初始 CLI 成员、双向群消息和非成员失败关闭；
- 完成同 root Harness 重启与离线消息收敛；
- local cleanup、remote residual 和进程/Store lock 复验闭合。

### 阶段 4：CI 与发布门禁

- Linux/macOS required gate 上线；
- 固定 Playwright/浏览器/DSH/插件/CLI 版本证据；
- 失败 trace、截图、日志、ledger 与 secret scan 可复核；
- focused gate 真实通过后才评估 P1 或双 Harness V2。

首版完成必须同时满足：

1. 一个真实 DSH Harness Web 实例由 Playwright 启动、操作并精确停止；
2. 一个真实独立 CLI Peer 与 DSH 完成双向 Direct 和 Group；
3. macOS 与无桌面 Linux 使用相同 P0 业务用例并通过；
4. Harness 同 root 重启后身份和消息连续；
5. required 用例 0 failed、0 skipped、0 not-run；
6. 本地资源无残留，远端资源 cleanup/residual 如实登记；
7. OTP、Token、手机号、SAS、私钥和 Store 内容未进入 Git、trace、日志或报告；
8. AWiki Me 与通用 System Test 的测试所有权没有被复制或弱化。

## 15. 实施前待冻结事项

进入开发前需要在评审中确认：

- DeepSeek Harness 当前版本的正式无交互 profile 安装与 Web Host 启动命令；
- 首版 live target 使用 `rwiki-cn-testing` 还是另一受审计测试环境；
- CLI binary 的构建/下载位置和精确 source ref 验证方式；
- 两个独立用户所需账号池、OTP cooldown 与 Handle quota；
- CI macOS runner 和 Linux Playwright 镜像版本；
- identity/Handle 没有公开删除 API 时的 residual retention 和运维清理责任人。

这些事项未冻结前可以完成无写入 smoke fixture，但不得把 live-cli-peer 注册或消息用例加入
required gate，也不得用 mock、skip 或 collect-only 宣称端到端测试已经完成。

## 16. 阶段 0 冻结执行合同

以下合同由 2026-08-31 当前分支与官方工具资料核验；实施若需改变其中任何闭集，必须先更新
本文和执行 Plan，再修改代码。

### 16.1 版本与平台

| 项目 | 冻结值 |
| --- | --- |
| DeepSeek Harness package family | `0.1.1-rc.2` |
| DSH-AWiki | `@awiki/dsh-plugin@0.3.7` |
| IM Core Node | `@awiki/im-core-node@0.2.1` |
| Playwright Test | `@playwright/test@1.62.1` |
| Playwright Node engine | `>=20`；本仓 CI 继续使用 Node 22/24 |
| Linux browser image | `mcr.microsoft.com/playwright:v1.62.1-noble` |
| macOS runner | `macos-15`（GitHub-hosted arm64） |
| required browser | Linux/macOS Chromium headless |
| compatibility browser | macOS WebKit headless；不替代 Chromium P0 |

Linux live/smoke 与 macOS live/smoke 的业务 case ID 必须相同。`workers` 首版固定为 `1`；live
项目固定 `retries: 0`，避免自动重试重复远端写入。无写 smoke 可以在 CI 使用一次重试，但报告
必须保留首次失败。

### 16.2 Harness 启动与 readiness

正式启动 argv 固定为：

```text
dsh web --no-open --host 127.0.0.1 --port 0
```

测试只接受 stdout 中唯一一行：

```text
dsh web: http://127.0.0.1:<1-65535>
```

launcher 必须解析并再次验证 scheme=`http`、host=`127.0.0.1`、无用户名/密码/path/query/hash，
随后用 HTTP 页面 ready 作为第二门禁。未出现、重复、非 loopback、进程提前退出或 ready timeout
都在打开浏览器前失败。teardown 先发 `SIGTERM` 并等待有界退出，超时后才终止当前 run 的进程
组；端口仍可连接、子进程存活或 Store lock 未释放均视为失败。

隔离 profile 的插件装载复用现有 release-candidate 组合：先安装 Identity wrapper/platform 与
IM Core wrapper/platform，再安装 `dsh-anp-identity` 和 `dsh-awiki` tarball；`--dump-default-config`
必须证明 `anp-identity`、`anp-identity-provider`、`awiki`、`awiki-provider`、
`awiki-summary-provider` 各精确一份。

### 16.3 CLI artifact

当前 Linux baseline 为 `awiki-cli 1.0.48`，source ref
`7595c92fd8453f20d0f9307e8e25952c5e9db69c`。本机 debug artifact 的 SHA-256 仅作本次 baseline
证据，不跨 OS 写死；每个 runner 必须构建或取得该阶段冻结 source ref 的本平台 binary，并同时
校验：

- `awiki-cli --format json version` 的 commit 等于 run manifest；
- binary 是当前 OS/arch；
- run manifest 中的 SHA-256 等于实际文件；
- Direct、Inbox/History、Group 与 identity schema 是当前公开 surface。

任一不匹配都在创建账号前失败。本计划不新增 CLI 测试专用隐藏命令。

### 16.4 Live target 与账号门禁

首版 live target 固定为 `rwiki-cn-testing`：

- DID domain `rwiki.cn`；
- User/Message origin `https://rwiki.cn`；
- WebSocket `wss://rwiki.cn/im/ws`；
- Message Service DID `did:wba:rwiki.cn`；
- operator profile `rwiki-cn-managed-local-v1`。

受保护 DEV preset 已确认可用，并只对精确手机号的注册/ordinary Join/Recovery 绕过发送
cooldown，仍保留 purpose/target scoped hash、TTL 与一次性消费。服务端默认每手机号最多 3 个
active Handle；本用例需要两个独立 Handle，因此每次 live mutation 前必须通过公开或受审计
preflight 证明剩余额度至少 2。不能靠固定 sleep、数据库业务 oracle、扩大 quota 或清理其他 run
来满足前置。

服务端 root-owned 配置保持其受管 `0640` 权限；E2E 运行时使用的本机凭据文件必须另建为
ignored `0600` 文件。当前 operator 声明支持 exact account cleanup；如果实际 preflight/cleanup
不可用，live required gate 在创建账号前失败，而不是留下不可持续的 quota 消耗后报告通过。

### 16.5 受保护配置闭集

`DSH_AWIKI_E2E_CONFIG` 必须指向绝对路径、regular file、owner-only `0600` JSON；拒绝 symlink、
未知字段和 repo 内 tracked 文件。schema v1 只允许：

```json
{
  "schemaVersion": 1,
  "target": "rwiki-cn-testing",
  "phone": "<secret>",
  "otp": "<secret>",
  "handlePrefix": "<non-secret-run-prefix>",
  "cliBinary": "<absolute-path>",
  "cliSourceRef": "<40-hex>",
  "cliSha256": "<64-hex>"
}
```

target 的 domain/URL/DID 不从该文件自由配置，而由代码中的 reviewed target closed map 派生并
写入非秘密 run manifest。phone/otp 不得复制到 run manifest、report、ledger artifact、trace、
截图、argv 或异常。

### 16.6 报告与 ledger

run manifest 是非秘密输入证据，至少记录 schema、runId、mode、target 公开端点、OS/arch、
DSH/Node/plugin/CLI/Playwright/browser 版本、source refs、hash 和 case IDs。

case report 至少记录：

- `passed` / `failed` / `skipped` / `not_run`；
- started/finished/duration；
- 每个 required case 的精确状态和固定 reason code；
- 首轮、focused 复验与最终 gate 的阶段；
- artifact secret scan、process cleanup 和 resource cleanup 状态。

资源证据分为两份：

1. ignored `0600` private ledger 保存当前 run 精确 cleanup 标识，只供 teardown/operator 使用，
   永不上传；
2. redacted ledger artifact 只保存 target、resource type/count、`cleaned`/`partial`/`residual`、
   固定 reason code 和责任边界，不保存 DID、Handle、phone、Token、消息正文或私钥材料。

required case 缺失、skip/not-run、artifact secret hit、cleanup failure、进程残留、report/ledger 缺失
或外层命令仅退出 0 都不能构成通过。
