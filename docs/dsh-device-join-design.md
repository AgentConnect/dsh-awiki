# DSH 多设备加入与设备管理设计

状态：设计完成，尚未实施（2026-08-23 根据独立代码复核修订）

跨仓导航：[Harness Feature](../../awiki-harness/features/dsh-device-join.md) ·
[Node SDK 增量合同](../../awiki-cli-rs2/docs/node-sdk/dsh-device-join-extension.md) ·
[AWiki Me 参考实现](../../awiki-me/docs/multi-device-join-ui.md)

## 1. 目标与范围

本文覆盖两个方向：`dsh-awiki` 可以作为独立 member device 加入已有 Handle；当 DSH 自己创建
或 Recovery Handle、成为 bootstrap ready-admin 时，也能批准手机等后续设备加入。

本阶段必须形成双向闭环：

- 已有 AWiki Me 或 CLI ready-admin 设备负责发现、核对 SAS 和批准；
- DSH 加入后固定为 `active + member + management_ready=false`；
- DSH 重启后恢复同一设备，不重新注册、不复制其他设备的私钥；
- Handle Recovery 保留为显式、破坏性替代操作，不能再作为已有 Handle 的默认路径。
- DSH-created/Recovery identity 精确为 `active + admin + management_ready=true` 时，提供 Registry、
  Join 请求、验证/SAS、批准 member、拒绝和撤销其他设备；
- DSH 作为 joiner 时仍是 member，不因安装管理 UI 自动升级。

DSH 的 Skill Agent DID 不是该 Handle 的 sibling device。若多 Agent 身份能力同时存在，必须
先完成部署级默认身份的 Device Join，再加载本机 Agent binding；不能把子 Agent DID 加入
Human Controller 的设备 Registry。

## 2. 当前问题

当前 DSH 身份入口在发送验证码前读取 Handle 状态：

```text
Handle 不存在 -> registration OTP -> 创建新 DID
Handle 已存在 -> Recovery V4 OTP -> 替换 DID
```

第二条路径会创建新 DID、围栏旧凭证，并要求其他设备重新 Join。它解决的是丢失全部可用管理
凭证后的 Handle 恢复，不是多设备登录。

Core 和 Node SDK 已经具备部分可复用基础：

- `completeRegistrationWithOutcome()` 可返回 `registered` 或 `existing_handle`；
- `existing_handle` 携带 Host-only、进程内、一次性的 prepared-registration continuation；
- `beginPreparedRegistrationJoin()` 和 `resumePreparedRegistrationJoin()` 已能启动和推进新设备
  Join，并在授权完成后安装本地身份。

当前 Node 投影仍缺 DSH 产品流程必需的短期 SAS、终止时间、显式取消和准确的 user-presence
输入，也没有暴露 Core 已有的管理端 Registry/Join/approval/revoke facade；DSH
provider/Remote/UI 仍只理解“注册成功或 Recovery”。因此 DSH 新建 Handle 后虽然底层是
ready-admin，产品上却无法批准手机 Join。

## 3. 目标用户流程

```text
DSH：输入 Handle + 手机号
  -> 请求真实 registration/account-verification OTP
  -> 输入 OTP，调用 completeRegistrationWithOutcome
     -> registered：新 Handle，直接进入消息页
     -> existing_handle：显示“加入新设备 / 恢复 Handle / 取消”

选择“加入新设备”
  -> Host 单次消费进程内 continuation
  -> Core 创建独立设备 key 和持久化 Join session
  -> DSH 显示等待已有设备验证
  -> AWiki Me/CLI ready-admin 经 system.notification 发现请求
  -> 两端独立计算并显示相同的 6 位 SAS
  -> 用户在已有设备确认 SAS，并批准为 member
  -> DSH 轮询到 authorized + consumed
  -> Core 安装本地 identity/account/device binding
  -> Host 启动 listener/sync，进入消息页
```

DSH 管理手机 Join：

```text
DSH 创建/Recovery Handle -> current device = ready-admin
手机提交同一 Handle -> pending Join
用户打开 DSH“设备”页 -> reliable sync -> Core local Join request
明确点击开始验证 -> DSH/手机各自显示 SAS
用户在 DSH 输入相同 SAS + APPROVE
Host 执行 Core prepare + confirm -> 手机成为 active member
Registry 收敛，手机进入消息页
```

选择“恢复 Handle”前，DSH 必须丢弃尚未消费的 Join continuation，再进入现有 Recovery V4
流程，并明确提示它会替换 DID、使旧设备凭证失效。Recovery 必须为同一只读 Handle/phone
重新请求一枚 purpose 隔离的 Recovery OTP；刚消费的 registration OTP/grant 不能复用，fresh
Recovery 也不得携带 local identity selector。OTP 和 SAS 任意一个都不能单独授权设备。

## 4. DSH Host 合同

### 4.1 注册结果改为闭集

`AwikiSdkClient.registerIdentity()` 和 Browser Remote 的 `registerIdentity()` 改为返回闭集，
不再把 `join_required` 压成 `handle-unavailable`：

```ts
type AwikiIdentityAccessResult =
  | { status: 'registered'; identity: AwikiIdentity }
  | {
      status: 'join-required'
      fullHandle: AwikiHandle
      mode: 'ordinary' | 'handle-recovery-rebind'
      requiresUserPresence: boolean
    }
```

Native `continuationId` 只保存在 Host 内存中的单一 pending slot。Browser、Agent tool、日志和
controller snapshot 均不得看到它。新的注册提交、清空本地数据、provider replacement 和
service disposal 都必须使旧 slot 失效；并发或过期调用失败关闭。

DSH 第一阶段只接受 `ordinary + requiresUserPresence=false`。如果 Core 返回
`handle_recovery_rebind`，DSH 不得把普通 Web 点击伪装成系统 user presence；该状态保持失败
关闭，并引导用户使用支持系统认证的 AWiki Me 或显式 Recovery。

### 4.2 Browser Remote

新增三个仅供本地 AWiki 面板使用的方法，不加入 Agent tools：

- `beginDeviceJoin()`：消费当前 Host continuation，生成 Host operation ID，开始 Join；
- `getDeviceJoinStatus()`：从 Core exact-one local session 恢复并推进同一 Join；
- `cancelDeviceJoin()`：开始前丢弃 continuation，开始后调用 Core 取消并验证 typed terminal summary。

Host `getConfig()` 同步增加 `handleRecoveryPhoneEnabled`：它只能来自同源 canonical
`/user-service/v1/server-info` 的 schema-v1 phone + `sms_otp` Recovery 声明；响应不可用、畸形或
关闭时为 false。Browser 不按 realm、Handle lookup 或本地 recovery flag 猜测该能力。

Browser 不提交 DID、device ID、Join session ID、operation ID、role、SAS 或授权结果。Host 只
返回适合渲染的状态：

```ts
interface AwikiDeviceJoinProgress {
  readonly phase:
    | 'pending'
    | 'verifying'
    | 'sas-ready'
    | 'authorized'
    | 'cancelled'
    | 'rejected'
    | 'expired'
  readonly expiresAt: string
  readonly sas?: string
  readonly completed: boolean
}
```

`sas` 只在 Core 已验证 challenge response 后短暂出现，必须是 6 位十进制字符串。它可以穿过
本地 Browser Remote 供人眼比较，但不能进入 `localStorage`、DSH settings、性能埋点、错误、
测试报告或任何 JSON 快照。UI 离开 SAS 阶段或流程终止时立即清空它。`expiresAt` 只显示
倒计时，不能由 Browser 本地时钟直接决定 expired。

Core → Browser 映射固定为：

| Core 条件 | Browser phase |
|---|---|
| `remote=rejected` | `rejected` |
| `remote=cancelled` 或 `local=cancelled` | `cancelled` |
| `remote=expired` 或 `local=expired` | `expired` |
| `local=authorized + remote=consumed + identity` | `authorized`，且仅此时 `completed=true` |
| `sas` 存在且 `remote=response_verified` | `sas-ready` |
| challenge/response/activation 中间态 | `verifying` |
| `local=pending + remote=pending` | `pending` |

远端 terminal 优先；未知组合失败关闭。重启后如果 Core local session 只保留 `cancelled` 而不再
保留远端 rejected 原因，UI 显示通用 cancelled，不得猜测拒绝原因。

### 4.3 Ready-admin 管理 Remote

管理能力只对 Core current device 精确返回 `active + admin + management_ready=true` 的默认身份
开放。Browser 只获得 Host 生成、绑定当前 session generation 的 `requestRef/deviceRef`，不获得
Join session ID、protocol device ID、approval handle、proof、token 或 Registry hash。

```ts
refreshDeviceManagement(): Promise<AwikiResult<AwikiDeviceManagementSnapshot>>
startDeviceJoinVerification({ requestRef }): Promise<AwikiResult<AwikiAdminJoinProgress>>
approveDeviceJoin({ requestRef, enteredSas, confirmation: 'APPROVE' }): Promise<AwikiResult<AwikiAdminJoinProgress>>
rejectDeviceJoin({ requestRef, reason }): Promise<AwikiResult<AwikiAdminJoinProgress>>
revokeDevice({ deviceRef, confirmation: 'REVOKE' }): Promise<AwikiResult<AwikiDeviceManagementSnapshot>>
```

Snapshot 只包含 `canManage`、当前 role/readiness，以及每台设备的 Host `deviceRef`、
active/revoked、role、management-ready、is-current；Join request 只含 Host `requestRef`、时间、
Core-verified candidate fingerprint、`canStartVerification`、claimed-by-current/other 和状态。
名称、DID、raw device/session ID、SAS 和 proof 均不进入 snapshot。

刷新只执行 existing `syncNow()` 加 Core local projection reads，不调用 User Service admin pending/
status list。设备页打开时立即刷新，页面可见期间使用现有有界 single-flight 节奏作为可靠 HTTP
fallback。身份激活后由默认开启、与 Workspace 无关的 Realtime Supervisor 独占唯一 Node WSS；
Direct、Group 和 System Notification hint 只调度同一可靠同步，页面关闭不停止身份级 WSS。
可选私聊 Agent consumer 不再启动、停止或重连 WSS，只在合格 message cause 已提交后读取白名单
Direct 文本。该变更有意替代旧的“关页即停、无常驻 control listener”决定，仍禁止第二条 WSS。

local request list 不发网络请求、也不 claim，但对本机已 claim 的 ResponseVerified notification
会验证 response 并幂等推进 local phase。刷新顺序必须是
`syncNow -> listLocalDeviceJoinRequests -> localVerificationProgress`；start 后只轮询 progress 会
一直得到 invalid state，不能显示 SAS。

批准步骤固定为：显式开始验证（同一 session 使用确定性 operation ID，TTL=240 秒）→ sync/list
推进 local response verification → local SAS → 用户输入手机 SAS 和 `APPROVE` → Host 常量时间
比较 → Core prepare → approval handle 只留 Host → 同一次前台交互 Core confirm。
只有来自已认证 DSH 用户界面的这次明确提交才映射为 `userPresenceConfirmed=true`；Agent tools、
模型、页面 mount、后台 timer 和 Remote replay 均不能批准。该模型等价于 CLI foreground TTY，
不宣称具备系统生物认证；不能证明交互式用户会话的部署必须关闭管理 mutation。

start 结果未知时先 sync/list：当前设备已 claim 则进入 local progress 等待，其他 admin 已 claim 则
只读，仍 `canStartVerification=true` 才允许用同一 operation ID 重试。不得为重试生成新 ID 或对
Claimed payload 再次 start。

撤销要求 ready-admin、非当前设备和显式 `REVOKE`。Core 继续执行 self/last-admin 拒绝、CAS、
outcome-unknown resume 和 live fencing。批准固定为 member，不提供 role selector、admin 晋升或
RootKey transfer。

### 4.4 Host 重启恢复

prepared-registration continuation 是进程内秘密：若 DSH 在远端 Join 创建前退出，用户必须
重新请求 OTP，不尝试持久化或重建 continuation。

远端 Join 创建成功时，Core 已经先持久化 candidate keys、Vault refs 和 local Join session。
Host 不再创建 `stateRoot/.host/device-join-v1.json` 或任何第二份 Join journal。Node v10 必须
暴露只读 `listLocalDeviceJoinSessions()`，其投影不含 SAS、token、challenge 或私钥。

重启时：

1. `getSession()` 仍以 Core 已提交 identity 为真相；
2. `active` 进入已登录产品、`signed-out` 进入本机解锁；只有 `unregistered` 才读取 Core local
   sessions；
3. `resumable` 固定为 `side=new_device` 且 phase 属于
   `pending/challenge_prepared/response_prepared/response_verified/approval_prepared/authorized`；
   cancelled/expired history 不计入 conflict，也不阻止重新 OTP/begin；
4. 0 条 resumable 回 onboarding；精确 1 条直接进入 Join 页，只允许 status/resume/cancel；
   多于 1 条 resumable 返回稳定 conflict，不静默选择 newest/first；
5. `authorized + consumed` 且 Node 返回 exact identity 后，Host 才激活 session 和 listener；
6. cancelled/rejected/expired 以 Core terminal state 收敛；网络失败保留 Core session 并重试。

已完成 local session 可继续由 Core 持有并在既有 identity retirement/clear 路径清理；identity
已经 active 时 Host 不再把它路由为 pending onboarding，也不为 UI 整洁提前删除 Core 记录。

该设计关闭“Core begin 已提交、Host 文件尚未写入就崩溃”的孤儿窗口，并且不在既有
`stateRoot/.host/` 共享写入面上再增加 Join 文件。DSH 当前的 signed-out、sent-mail 和
conversation-preference 文件仍在该 Host 目录中；本文不把整个 state root 误写为 Node 独占。
`clearLocalData()` 清理 Node-owned Core session/Vault，既有 `.host/signed-out` marker 继续由
`AwikiSessionStore` 管理，但不承载 Join truth。

status/resume 和 cancel 在打开 remote token 前先读 exact local phase。cancelled/expired 直接
投影通用 terminal，不再调用 remote advance；因此不会把 token 已清理后的 `invalid_state`
暴露给 Browser。当前 poll 已观察到 `remote=rejected` 时仍显示 rejected，重启后只剩 local
cancelled 则显示通用 cancelled。

## 5. UI 状态与文案

- 统一入口不再在发码前用 public Handle 查询决定安全协议；真实 OTP 消费后的 Core 结果才是
  `registered / join-required` 分流事实源。
- `join-required` 对话框把“加入新设备”作为推荐操作；只有 canonical server-info 明确声明
  phone + SMS Recovery 时才显示危险 Recovery 选项，并说明会替换 DID 和影响其他设备。
- Join 页显示等待、SAS、完成、拒绝、过期、取消和网络重试；不允许选择 admin role。
- 启动发现 exact-one pending Core session 时直接进入 Join 页；不得先显示 onboarding 并允许重复
  registration OTP。
- SAS 未出现前不得提示用户确认；两端不一致时只能在管理设备走 `sas_mismatch` 拒绝。
- DSH 只有在 Node 返回 `completed=true` 和 identity 后才进入消息页。中间阶段不得用
  `expectedDid`、Handle 或本地草稿合成 active session。
- ready-admin 显示“设备”页：设备列表、待处理请求、开始验证、SAS、批准/拒绝和撤销；member
  只显示“由其他管理设备管理”，不显示 mutation。
- 打开请求本身不 claim；只有用户点击“开始验证”才调用 Core。批准必须输入手机上的 SAS 和
  `APPROVE`，撤销必须输入 `REVOKE`；错误、离页或会话切换清空短期输入/opaque refs。

现有 `inspectIdentityAccess()` 为兼容保留在 public Remote/Typert baseline，但新 UI 不再调用
它决定 OTP purpose；后续删除必须作为独立 breaking change。`registerIdentity()` 返回类型变化
要求 Host/Typert/Browser 同版本原子切换，旧 Browser 不能把 `join-required` 当注册成功。

## 6. 安全与数据边界

- 每个设备独立生成并持有 signing/E2EE private key、PreKey、Ratchet、MLS Leaf 和 replay
  状态；禁止从 AWiki Me、CLI 或其他 DSH state root 复制。
- Node/Core 独占 OTP grant、continuation、Join crypto 和 identity activation；DSH TypeScript
  不拼 User/Message RPC，不解析 raw challenge，不计算 SAS。
- Browser Remote 只暴露短期 SAS 和闭集阶段；不暴露 continuation、Join token、proof、root
  key、auth generation、Registry hash 或原始服务错误。
- Device management 不加入 Agent tools；Browser request/device refs、typed SAS/确认词和 Core
  approval handle 都不持久化、不记录，跨 Host/session generation 立即失效。
- 新设备是 tail-only：不承诺自动获得 Join 前的 Direct 明文、MLS epoch secret 或附件 key。
- `stateRoot` 必须部署级独占。清空本地数据只删除本机设备材料，不撤销远端其他设备；撤销
  只能由当前仍有效的 management-ready admin 完成。
- DSH identity realtime、conversation poll 和 Agent routing 只在身份最终激活后启动；授权前任何消息
  API 都返回 `not-registered`。

## 7. 实施切片

### A. `awiki-cli-rs2`

1. 完成 [Node SDK 增量合同](../../awiki-cli-rs2/docs/node-sdk/dsh-device-join-extension.md)：
   SAS/expiry 投影、准确 user-presence、Core local-session list/restore、ordinary resume gate 修复
   和 typed cancel；同时映射 current summary、Registry、Join requests、admin verify/approve/reject
   与 revoke。
2. 更新 Rust DTO、N-API wrapper、TypeScript 类型、native API version、五个平台包版本、
   changelog、制品校验和 parity tests。
3. 先发布新的 `@awiki/im-core-node` patch，再更新 DSH 固定版本；禁止依赖 workspace link
   冒充 registry 制品已发布。

ordinary Join 必须在 Handle Recovery gate 关闭时也能 begin/resume。DSH 保留现有 Recovery，
所以 provider 的 recovery flag/audience 仍需与 awiki.info 部署匹配，但不能成为 ordinary Join
的隐藏前置。Node 当前未暴露 Direct/Group E2EE 开关；focused test 必须证明这些 gate 默认关闭
时，Join 后 PreKey publication 与 DSH `default-plain` Direct 仍可用，不能为通过 Join 偷开 E2EE。
Node v10 另增加默认 false 的 device-revoke open option；DSH provider 显式启用，Core 仍验证当前
ready-admin、self/last-admin 和远端 CAS，不能因为本地开关开启就放宽权限。

### B. `dsh-awiki`

1. Provider 改用 `completeRegistrationWithOutcome()`，建立 Host-only continuation slot。
2. 增加 Core exact-one restore、Remote 闭集、session 激活/清理和错误映射；不新增 Host Join
   journal。
3. 增加 Host opaque request/device refs、ready-admin gate、可靠同步/local management projection、
   SAS 比较、split approve/reject 和 revoke 编排。
4. 把现有身份页改为注册结果后的 Join/Recovery 选择，增加 Join 和设备管理页面，并为 Recovery 重新发送
   purpose 隔离的专用 OTP。
5. 更新 Typert 生成物、公开 Remote baseline、源码构建产物、README 和固定 Node package。

### C. `awiki-system-test`

实现时在同一任务新增 DSH-joiner 与 DSH-ready-admin 两个方向的远端用例和 catalog/suite 文档；
另在 `awiki-me/tests/e2e/` 增加 DSH admin 批准真实手机 App joiner 的产品 case。测试必须通过
reviewed `AWIKI_SYSTEM_TEST_TARGET=awiki-info-testing`，不得靠隐式默认域名或本地服务替代。
`production-awiki-ai` 只允许发布后只读 smoke，不开启 DEV OTP 或创建测试 Handle。

## 8. 验收矩阵

### 单元/合同

- Node：`registered / existing_handle`、ordinary user-presence=false、SAS/expiry 映射、Debug
  脱敏、local-session list、ordinary gate-off resume、typed cancel、restart restore、terminal
  idempotency、admin Join/Registry/revoke facade 和 native version mismatch。
- DSH Host：continuation 一次性、Browser 不见 native ID、Core exact-one restore/multiple conflict、
  terminal local preflight、ready-admin capability、opaque refs、SAS compare、approval/revoke gate、
  完成后才后台启动 identity realtime、provider replacement 和 clear-local-data 清理；身份成功不
  await startup sync 或 first connected，Agent consumer 不拥有 WSS。
- DSH Browser：Join/Recovery/Cancel 选择、pending 无 SAS、SAS 只在正确阶段显示、拒绝/过期/
  取消/网络重试、设备列表/请求/批准/拒绝/撤销、离页清空 SAS、429 Retry-After、Recovery
  capability、专用 Recovery OTP。
- 公开面扫描：Agent tools、Remote 生成物、日志、snapshot 和构建产物不含 OTP、continuation、
  Join token 或持久化 SAS。

### `awiki-info-testing` 产品 E2E

方向 A 保留原 DSH joiner 流程：

1. 用受保护的固定测试手机号先建立一个 fresh Handle ready-admin 设备；
2. 在隔离 DSH `stateRoot` 走真实发码和 OTP 消费，必须得到 `join-required` 而非 Recovery；
3. AWiki Me/CLI 管理端必须由真实 system notification 唤醒，不能直接 hydrate inbox；
4. 两端 SAS 在内存中精确相等，管理端前台批准一次且只能得到 member；
5. Registry 精确包含原 admin 与 DSH current member，DID/Handle 不变；
6. DSH 与独立账号各发送一条 Join 后 Direct，双方 exact-one 收敛；
7. 重启 DSH 后复用同一设备并继续收发；
8. 管理端撤销 DSH 后，旧 HTTP/WS/PreKey 和未来消息均失败关闭；
9. 覆盖 wrong/replayed OTP、无批准、SAS mismatch、cancel、expiry、begin 返回边界 crash、清本地
   后 ordinary re-Join、429 和 multiple-session conflict；
10. fresh Handle 创建后立即登记脱敏 residual，不调用 Handle revoke；
11. 输出脱敏 residual ledger，并恢复服务端测试 OTP 配置。

方向 B 增加 DSH admin 流程：

1. DSH 创建 fresh Handle 并精确成为 current ready-admin；
2. CLI joiner 提交同一 Handle，DSH 设备页经 reliable sync/local inbox 发现请求；
3. 打开不 claim，明确开始验证，DSH/CLI SAS 相同；
4. DSH 输入 exact SAS + `APPROVE`，手机/CLI 只成为 member；
5. 双向 Direct/restart 通过；DSH 用 `REVOKE` 撤销 member 并完成 live fence；
6. member/blocked、wrong SAS、页面卸载、重复 approve、self/last-admin revoke 均失败关闭。

AWiki Me 另执行真实手机加入产品 E2E：DSH-created ready-admin 通过实际 Web UI 批准 App joiner；
不能用 CLI joiner 或 fake Host 替代该结论。

测试手机号和固定验证码只允许位于 ignored、`0600` 的本地配置和受保护服务配置；不得写入
Git、命令参数、报告或回复。服务端如为测试临时启用 `DEV_OTP_PHONE` / `DEV_OTP_CODE`，必须在
测试后重新注释、重启 User Service，并以不回显值的方式确认 preset 已关闭。

Handle revoke 尚未进入本功能的产品或测试验收范围。`remote-dsh-device-join` 只撤销 joining
device；fresh Handle 在创建成功后立即进入脱敏 residual tracker，并允许保留在专用 awiki.info
测试服务器。driver、Browser Remote 和 Agent tools 均不得调用 `request_revoke/confirm_revoke`。
手机号 active Handle 配额由测试环境运维单独治理，不能为了 cleanup 把未充分验证的 Handle 注销
能力混入 Device Join gate。

远端 DSH 进程必须显式覆盖默认生产配置：隔离 `stateRoot`，所有 User/Message/Mail/public URL、
Handle domain 和 Message Service DID 均来自 reviewed awiki.info target；当前服务 DID 预期为
`did:wba:awiki.info`。hardcoded `multiDeviceAudience=awiki-user-service` 必须与 Ali 配置闭合。
任一 resolved URL/domain/DID 仍指向默认 `awiki.ai` 时，在发送 OTP 前 fail closed。

expiry 负例不使用固定 sleep，直接按 begin/status 返回的 `expiresAt` 计算有界等待；超出 suite
budget 时在创建 session 前失败关闭。candidate status 本身会让 User Service 同步提交到期状态，
不依赖后台 worker interval；无请求自动过期通知不扩入本用例。

## 9. 2026-08-22 `awiki.ai` 只读预检

已完成无业务副作用的公开连通性预检：

- `/user-service/v1/server-info`：HTTP 200，`schema_version=1`；
- `/user-service/server-info`：HTTP 200；
- `/.well-known/did.json`：HTTP 200；
- `/user-service/health`、`/message-service/health`：HTTP 200；
- `/im/ws` 普通 HTTP GET：HTTP 400，符合缺少 WebSocket upgrade/auth 的预期。

`server-info` 当前公开 phone + SMS OTP 的 Handle registration 和 Recovery；多设备 discovery
仍按既有 hidden-rollout 边界处理，不能仅凭公开响应推断 Join 已发布。设计阶段未发送 OTP、未
创建 Handle、未启动 Join，因此没有产生远端测试身份或修改服务端 preset。完整业务 E2E 必须
等待 Node/DSH 实现完成后在现有 `awiki-info-testing` 执行。`production-awiki-ai` 已登记但只声明
`core-messaging`，且生产配置拒绝非空 DEV OTP；它不能作为本计划的写操作 Join target。

## 10. 非目标与发布门禁

第一阶段不实现：

- member→admin 晋升、RootKey transfer、批量管理和设备自定义命名；
- 跨设备复制历史密钥、自动恢复 Join 前历史或让 DSH 继承 MLS 状态；
- 新 User/Message API、数据库 migration、ANP wire 或公开 discovery；
- 自动 Recovery、无 ready-admin 的 OTP-only 登录、自动批准或跳过 SAS；
- 把 Skill Agent DID 建模为 Human Handle 的设备。

发布顺序固定为：Node focused tests → Node 全量/制品 gate → Node patch 发布 → DSH 固定依赖与
单元/构建 gate → reviewed `awiki-info-testing` DSH Join E2E → DSH package 发布 →
`production-awiki-ai` 只读 smoke。任一阶段只有 mock、
collect-only、skipped、未清理 preset 或未记录 residual，都不能声明功能完成。
