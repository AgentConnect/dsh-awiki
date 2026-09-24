# agent-connect.cn Mail E2E 前置变更审阅稿

日期：2026-09-24。状态：BLOCKED；仅只读审计与仓库内方案准备，未部署。

## 目标与授权边界

唯一目标为 `agent-connect.cn`（SSH alias `ali`），不回退到 rwiki.cn、awiki.info 或
anpclaw.com。最终验收仍是两个独立账号通过 DSH Web 与 CLI 双向真实发信、独立收件、
唯一匹配、已读状态跨 Browser context 保持，以及正式报告、秘密扫描与清理零残留回执。
健康接口、静态检查、配置加载、SMTP 接收成功均不能代替该验收。

本轮没有启停服务、修改 /etc、Nginx 或 DNS、安装生产依赖、创建账号或发送邮件。
下述路径中标为“拟议”的内容不是已部署事实，也不是部署授权。

## 证据与阻断

| 项目 | 证据来源 | 结论 |
| --- | --- | --- |
| SSH ali 主机与 agent-connect.cn A 记录 `47.100.103.208` 一致 | 用户独立只读核验 | 确认诊断主机归属，不据此推断 Mail 能力或执行授权 |
| `/mail/health`、`/mail/rpc` 均返回 404；agent-connect vhost 无 `/mail` 路由 | 用户独立 SSH 核验 | Mail HTTP 入口不可用；未在本轮重复请求 |
| 仅有 `awiki-agent-connect-user-service` 9911、`awiki-agent-connect-message-service` 9900，无 9899/SMTP 邮件进程 | 用户独立 SSH 核验 | 缺少 Mail 与实际投递链路；端口是该证据的时点值 |
| User `MAIL_SERVICE_URL` 为空，无 `DEV_OTP_PHONE/CODE`；Message TOML 无 testing cleanup gate | 用户独立 SSH 核验 | 邮箱创建和当前自动化身份前提缺失；清理不得默认放行 |
| User/Message 实际进程使用 `/opt/awiki/agent-connect/releases/shprod-20260909` 下的部署；User 环境文件为 `/etc/awiki/agent-connect/simple/user-service.env`，Message TOML 无 `testing` 节 | 用户补充独立只读核验 | 9911/9900 是目标专用进程；后续候选须绑定实际 release，不能假设 simple 源目录就是运行版本 |
| `/opt/awiki/agent-connect` 内没有 Mail cleanup 脚本 | 用户独立只读核验 | Mail 精确清理 operator 缺失，不能只补 Message cleanup |
| DNS MX/TXT 未见记录 | 用户独立只读核验 | 当前不能证明公网 SMTP 路由/域名认证；不能把缺记录解释为同域本地投递必然不可行或已经可行 |
| `/opt/awiki/agent-connect/simple/message` 只有 `bin` 和 TOML example，未找到 cleanup 脚本 | 本轮文件清单，结合用户部署包核验 | 不能复用其他目标的脚本路径/config 冒充本目标清理 |
| `/opt/awiki/agent-connect/simple/user/src/user_service/ops/config_contract.py` | 本轮源码读取 | `environment == production` 时要求 `DEV_OTP_PHONE/CODE` 为空；不可建议直接开启开发 OTP |
| DSH `tests/e2e/fixtures/protected-config.ts` 与 System Test `src/helpers/operator_profiles.py` | 本轮源码读取 | 均未注册 agent-connect 审核目标/profile；用户选择域名不等于现有门禁已支持该部署布局 |
| Mail `install.sh` | 本轮源码读取 | 固定通用 unit `awiki-mail-service`，执行 `uv sync`，写 systemd、daemon-reload、enable；不能原样作为只读准备或 agent-connect 隔离安装 |
| Mail `scripts/postfix_pipe.py`、`pyproject.toml` | 本轮源码读取 | pipe 用系统 Python shebang，导入未被项目直接声明的 `requests`，硬编码本机 9899；须在冻结运行环境验证依赖与入口 |
| Mail `doc/awiki-mail-service-plan.md` §9.1（1132–1178 行）与 `services/mail_service.py` 的 `send_email` | 本轮源码核对，用户指出差异 | 文档把 agent-connect 定义为仅 API 验证、不装 Postfix、模拟入站；当前真实发送却调用 sendmail。API-only 方案不能满足两条真实邮件用例 |
| Mail internal API 与认证 middleware | 本轮源码读取 | `/mail/internal/*` 豁免通用认证；create/delete 有 internal secret 检查，deliver handler 无此检查。禁止公开代理整个 `/mail/` 后连带开放内部写接口 |
| Mail mailbox DELETE 与数据库 schema | 本轮源码读取 | DELETE 仅置 `status=deleted`；不是物理清理，不能证明 MIME、事件及队列清零 |
| System Test `src/helpers/dsh_e2e_cleanup.py` | 本轮源码读取 | 桥接 Message 后 User cleanup，没有独立 Mail 清理及残留计数；现有 `residualCount=0` 不足以证明 Mail 零残留 |

本轮部分 systemd/主机路径组合只读检查被工具自动审批拒绝（需要审批但 Never）。
User EnvironmentFile 和活动 release 路径已由用户补充核验；实际 unit FragmentPath、
Message 配置文件精确路径、活动 Nginx 文件及各产物摘要仍待受授权只读核验。
`/opt/awiki/agent-connect/simple/user` 是本轮源码审计路径，其与活动 release 的内容一致性
尚未证明；其中 production 配置校验规则是待对照的部署源约束，不能宣称已检查运行态加载。
不读取或输出配置中的密钥、手机号、OTP、数据库口令及内部 token。

## 已检查的源码及依赖

Mail 源码：`/home/ecs-user/awiki-space/awiki-mail-service`，本轮读到的 HEAD 为
`16e54b8ec2372cbfa8bebc5213d91f8bd7d6c937`，工作树干净。这是本地审计快照，
不是已冻结部署候选，也不代表远端最新版本。执行前须另行核对目标 release source ref 与产物摘要。

- `pyproject.toml`：Python >=3.13；FastAPI/Uvicorn、SQLAlchemy async、asyncmy、
  Pydantic、JWT/cryptography、httpx 等；`uv.lock` 应用于可复现候选安装。
- `src/awiki_mail_service/config.py`：数据库与服务参数，参见下方键名清单。
- `services/sendmail.py`：调用 `SENDMAIL_PATH` 的 `sendmail -f … -t`，成功只表示 MTA 接受。
- `scripts/postfix_pipe.py`：MTA pipe 将 MIME POST 给 `/mail/internal/deliver`。
  要求保留该实际发送/接收链路，不能以直接调用 deliver 代替产品发信。
- `scripts/init_db.sql`：默认创建/选择 `awiki_mail` 并预置其他域名；不得原样导入目标数据库。
  主要表为 `mail_domains`、`mailboxes`、`messages`、`mail_events`、`mail_rules`；
  `messages.raw_mime` 保存 MIME，messages/rules 对 mailbox 有级联外键，events 没有对应级联。
- `doc/awiki-mail-service-deploy-playbook.md`：包含 Postfix、postfix-mysql、OpenDKIM 等部署流程；
  文档中的其他域名、端口与系统用户不能直接复制为 agent-connect 配置。

同域两账号邮件必须经过真实 MTA 本地域投递。若仅接受同域 E2E，不必把外部 SMTP relay、
公网 MX/SPF/DKIM/DMARC 可达性当成该 focused case 的通过条件；必须先确认并验证 MTA 的
本地域路由，不能假定当前 DNS 能完成投递。公网跨域收发属于另需审核的部署范围。

## 具体变更清单（待审阅，不执行）

### 必须先审阅的部署授权决策

| 决策 | 可审阅的具体范围 | 当前状态 |
| --- | --- | --- |
| agent-connect 的角色是否由 API-only 扩展为真实 Mail E2E 承载主机 | 明确修订 Mail plan §9.1；保留 agent-connect.cn 为目标，不能以切换域名或模拟 deliver 替代 | 待决策；本轮没有部署授权 |
| 真实传输如何落地 | 候选首选为该主机的受管 sendmail/Postfix 本地域传输与 pipe；如选独立真实 MTA，须另审传输边界、认证和队列归属，并证明实际同域收件 | 不能只启动 HTTP Mail 服务；当前 sendmail 依赖未满足 |
| 同域 focused E2E 与公网收发范围 | 本轮业务只要求本目标两个邮箱互投；本地域路由可不依赖公网 MX，但必须真实经过 MTA。若还要求外域邮件，另审 MX、SMTP 网络、SPF/DKIM/DMARC 等 | DNS MX/TXT 当前未见；本轮不改 DNS |
| 对生产身份和清理配置的授权 | 审核真实 OTP 输入方案及精确 run-owned 清理；生产 DEV_OTP 禁令与关闭的 cleanup gate 不得静默取消 | 未批准任何开关改动 |
| 上线和回滚的对象范围 | 目标专用 Mail unit、Python/系统依赖、DB/schema/grants、Nginx 精确路由、MTA maps/pipe；必要的 User/Message 配置或候选升级逐项列明影响与回滚 | 本轮仅形成候选方案；不得安装、写 /etc、启停或发布 |

§9.1 中直接调用 deliver 的模拟路径不能作为真实收件证据；其中旧的应用入口、初始化
脚本、9891 User 端口也须对照实际源码和目标 9911 核验，不能原样执行文档示例。
审核结果若仍维持“不装 Postfix且无其他真实 MTA”，则目标保持 BLOCKED，不降低验收标准。

### 1. 冻结部署与身份方案

核验现有两项 unit 的可执行文件、WorkingDirectory、EnvironmentFile 的路径及文件权限，
记录脱敏 source ref/产物摘要；核验 Mail 候选与 User/Core CLI 的公开契约兼容性。
不得复制 awiki.info 的数据库、内部 token、固定 operator config 或 OTP 到本目标。

身份路径必须先解决 production 的开发 OTP 禁令：沿用真实 OTP 接收机制时，需要审核能够
支持两个本轮账号注册的受保护输入流程；若另设受管测试机制，应独立设计并审查，不能改
production validation 来适配旧 fixture。现有单个静态 `phone/otp` 配置不能自动证明这条
真实 OTP 流程可执行，禁止伪造或猜测 OTP。

### 2. Mail 服务与配置候选

拟议独立 unit：`awiki-agent-connect-mail-service.service`；拟议独立候选目录放在
`/opt/awiki/agent-connect/` 下，经确认后固定为版本目录和受管配置路径。
使用冻结 Python >=3.13 环境与 lockfile，显式绑定 loopback，拟议 HTTP 端口 9899
须先确认未被占用。不能直接运行当前通用 install.sh，不能覆盖其他 Mail 实例。

待审阅配置键（只列键名，不包含敏感值）：

| 组件 | 配置键与约束 |
| --- | --- |
| Mail 数据库 | `DB_HOST/PORT/USER/PASSWORD/NAME/CHARSET`；独立 Mail DB，最小权限；`USER_SERVICE_DB_NAME` 绑定该目标 User DB，当前实现要求同一 MySQL 实例跨库读取 |
| Mail 认证 | `JWT_PUBLIC_KEY`、`JWT_ALGORITHM`、`SERVICE_DOMAIN`、`USER_SERVICE_URL`；服务域名为 agent-connect.cn，认证转发绑定该目标 User 服务 |
| Mail 传输 | `MAIL_DOMAIN`、`SENDMAIL_PATH`、`MAIL_INTERNAL_SECRET`、可选 `SMTP_ENVELOPE_FROM`；同域传输，不使用其他部署的默认域名 |
| Mail 限制 | `MAX_MESSAGE_SIZE_MB`、`MAX_RECIPIENTS`、`MAX_ATTACHMENTS`、`RATE_LIMIT_PER_HOUR`；沿用已审核限制 |
| User 集成 | `MAIL_SERVICE_URL`、`MAIL_INTERNAL_SECRET`；审核一致性与创建失败的表现，不能执行全量 backfill 作为两账号 E2E 前置 |
| 可选新邮件通知 | `MAIL_NOTIFICATION_ENABLED`、`MESSAGE_SERVICE_RPC_URL`、`MESSAGE_SERVICE_INTERNAL_TOKEN`；当前 focused case 使用收件刷新，不要求开启通知扩展 |

SQL 候选须把硬编码数据库和初始域名改为经审核的目标值，提供幂等/回滚与权限检查；
禁止影响现有账号数据。Mail 与 User 共享的配置值只经受保护文件交接，不进入报告或模型上下文。

### 3. HTTP/MTA 边界

未来 Nginx 候选只公开必要的 `/mail/rpc` 和可选 `/mail/health`，保持路径与认证头；
明确拒绝公网 `/mail/internal/`。Mail 服务绑定 loopback；健康接口返回值不查询数据库，
不能用其单独证明数据库、认证或 SMTP 已可用。

Postfix 本地域映射与 mailbox lookup 绑定 agent-connect.cn 独立 DB；pipe 使用固定且依赖
已验证的 Python，投递到对应本机服务。提供队列归属可追踪性、临时失败重试/去重评审及
运行用户权限验证。修正 requests 依赖或采用显式声明的 HTTP 客户端须在 Mail 独立工作树
加单元测试；本轮不安装 Postfix、不写 master.cf、不修改 DNS、不启用 relay。

### 4. 完整清理与回执（必须先于账号创建）

增加目标绑定的审核 operator profile，固定 User、Message、Mail 的 interpreter/script/config
及执行主机，不接受任意 shell/路径/目标覆盖。不得把 agent-connect 指到现有 rwiki 或
awiki.info profile。Message 候选须包含 `cleanup_system_test_scope.py` 及配套 SQL，
其 `testing.system_test_cleanup_operator_enabled` 和 User 测试账号授权机制必须单独审核。
当前缺失/关闭的 gate 必须继续拒绝，本轮不启用任何 gate。

Mail 清理应以本轮 run ID 与精确 account IDs 为输入，由 User 受保护授权机制确认归属，
冻结 mailbox ID/域名/Handle/消息 ID 的闭集。不能只按域名或 Handle 前缀批量删除。
保持 User 账号到最后删除，以便 Mail/Message 能完成独立授权和残留检查。

清理顺序候选：先确认本轮投递任务已收敛，精确检查/处理本轮 MTA 队列项，再清理 Mail
events/messages/rules/mailboxes，再完成 Message、User 清理和最终复核。禁止全局 flush、
删除共享 domain 配置、跨账号删除或清空共享日志。若队列或邮件无法精确归属，必须 fail closed。
除了软删除状态，还须确认 MIME/正文、事件、规则、待投递队列不残留；共享运行日志按已审核
留存/脱敏规则处理，不把原始日志打包为 E2E 产物。

应新增 Mail selector-free preflight 和精确 cleanup/residual receipt，包含 schema、run ID、
target/source binding、授权范围指纹、分域删除数、分域残留数和整体结果；不含地址、正文、
密钥或手机号。只有 Mail、Message、User 和本地根目录全部清理成功才能报告 cleanup PASS。
任何阶段失败保留受保护的精确清理账本，返回非零并可恢复，不制造成功回执。

### 5. DSH/System Test 目标注册与执行

在上述 profile/config/资产审核后，才可在 System Test target catalog/operator profile 和
DSH `reviewedE2eTargets` 同步加入 agent-connect 的精确绑定（拟议名称
`agent-connect-cn-testing`，须经审核确认）。更新脱敏报告 target 校验、网络路由和配置
契约测试，不将其映射为 `awiki-info-testing`。保留 awiki.info 原 headed macOS 门禁。

准备仓库外 owner-only 0600 `scope=mail-delivery` 配置及匹配的 CLI candidate source/SHA。
先执行 selector-free cleanup preflight，再通过正式 runner 的 `--grep MAIL-00` 运行。
成功证据必须包含两条可见 UI + 独立 CLI 用例的真实结果、源码绑定、扫描及完整清理回执；
不得将 HTTP 200、单测、静态检查或 SMTP accept 记为该业务 PASS。

## 审阅顺序、验证与回滚要求

1. 先确认身份/清理权限设计和部署源版本，再审阅固定路径与受保护配置键的候选差异。
2. 在独立工作树验证 installer 生成物、Mail pipe 成功/失败/超时契约、internal 路由隔离、
   mailbox provisioning、精确清理拒绝越界及残留计数、target/profile/报告闭集。
3. 本轮止于候选与测试；将来获授权执行部署前，须具备配置和数据库备份、精确 unit/路由
   回退方案。已有排队邮件不能因回退而被全局丢弃；不得影响原 User/Message 业务。
4. 部署后只读预检仍不能替代两条真实邮件用例；预检失败不得创建账号。

当前没有足够的已审核目标布局、真实 OTP 自动化路径或 Mail 清理 operator，因而本轮仅
提交可审阅方案，不提前开放新目标，也不生成可误用于生产的执行脚本。

## 当前验收状态

- PASS：只读源码审计与方案完成；含已知证据来源及具体配置/资产/清理缺口。
- BLOCKER：Mail 服务/路由/MTA 缺失；身份自动化与 production OTP 边界待解决；
  target/profile 未注册；Message/Mail 清理资产及授权、回执链路不完整。
- UNVERIFIED：候选部署、内部路由隔离的运行态、真实双向投递、已读持久性、完整清理。
- 无正式 E2E run ID，无远端资源创建，无 cleanup PASS 回执。
