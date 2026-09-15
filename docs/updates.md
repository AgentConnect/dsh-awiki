# 版本查询、手动升级与租户边界

设置中的“版本与更新”显示 AWiki 插件和已安装的模型插件版本。只有 Host 提供
`desktopDistribution` 且 `distributionId=awiki-dsh-desktop` 时，
才额外显示桌面发行版。浏览器只读取经过投影的公开信息，不依赖 Electron、UA、
私有运行时或安装路径。

## 交互

- 检查更新分别读取当前租户的插件和 Desktop 策略；启用开关独立，策略来源均为当前租户。
- 新版本提供轻量提示、精确版本命令或完整桌面版下载页面，由用户手动安装并重启。
  客户端不下载安装包、不启动安装器、不代用户运行命令。
- 命令始终可见、可选中；复制成功或失败均显示反馈。普通 DSH 命令中的
  `YOUR_PROFILE` 必须替换为启动 DSH 时使用的 profile 名称。Desktop 的更新界面只提供整包升级，不显示内置插件的 npm 命令。
- 无策略、查询失败、尚未查询与已满足要求分别显示。无策略不等于已是最新版本。
  无可信制品信息时不编造 npm 版本或 `latest` 命令，安装说明仍可打开。
  Desktop 下载页面不依赖租户是否提供独立插件包。
- 最低版本门禁继续在 Host 实施；受限时保留版本入口与已有租户切换能力。
  模型组件的最低版本只限制 AWiki 托管模型，后台策略变更也会及时生效。

## 权威来源

`update-policy.ts` 查询当前租户 `/user-service/v1/server-info?client_platform=dsh`，
验证 origin、revision、SemVer 和包信息，按租户 ID + origin + 产品 + channel 缓存。
启用的独立包继续使用 `products.dsh.plugin/model_proxy`；`enabled=false` 可携带
`compatibility.plugin/model_proxy`，仅声明版本要求，不生成独立 npm 安装目标。
该新增字段向后兼容，旧客户端需先手动升级才能识别。

Host 只为已发布的、更高的组件版本生成安装目标，验证已安装模型插件与目标 AWiki
插件的依赖范围，不降级已安装组件，不主动安装未安装的模型插件。无法验证组合时
保留安装指引。只有桌面清单明确提供内置组件版本、且满足租户推荐版本时，页面才
提示该桌面更新能够满足插件要求。

Desktop 自己拥有通道选择、请求合并与超时，通过 AWiki 同进程公开租户生命周期绑定当前 origin。
公共服务提供 `getSnapshot()`、`check()`、`subscribe()` 和 `setTenant()`。
`schemaVersion=2` 快照包含 tenantId、policyOrigin、tenantGeneration、policyRevision；
旧 `schemaVersion=1` 只投影当前安装版本和人工升级说明，移除固定上海的推荐与链接。AWiki Host 仅把公开快照投影到
已有的 loopback settings RPC；不暴露该服务到远程客户端、Agent 工具或身份资料。
未安装或其他桌面发行版不影响独立 AWiki 插件工作。

## 租户切换与失败

切换开始立即清除旧租户的升级命令和页面结果；Host 取消旧请求并更换 runtime
generation。目标租户的已验证缓存先于业务运行时生效，再执行最长 15 秒的刷新。
同一 generation 和已安装组件版本的请求合并；组件装载变化会重新检查。
迟到的 A 结果即使在 A → B → A 后返回也不能写回缓存或覆盖当前 UI。

切换失败恢复原租户及其缓存要求。网络失败保留当前租户已验证的缓存门禁并标注，
没有缓存时不凭网络错误新增限制。已确认移除的策略清除该租户缓存。
`client_versions` 为 null 或缺失属于无效响应，不能当作租户撤销限制；保留已有缓存，
没有缓存时显示查询失败。解除策略仍通过校验 origin/revision 的显式 disabled 产品，
或现有自定义租户 404 约定完成，与 App 的异常响应边界一致。
Desktop 推荐、下载页与提示缓存同样按租户和通道隔离，切换立即清除旧结果；当前安装版本保持不变。
切换失败恢复原租户时仍递增运行代次，拒绝失败事务前的迟到回调。Host profile 重启仍遵循原生命周期。

## 安装组合证据

独立包的 `products.dsh.installation` 包含实际 npm 制品的 `runtime_packages` 精确 Host pins、
Identity 精确版本/integrity，以及 `requires_identity`。`scripts/prepare-update-installation.mjs`
从本地归档读取 package.json，先比对运营者从 npm 获取的 SHA512 integrity，再验证包名、
Host peer pins、Identity 和 Model Proxy peer 范围。不能用工作区 package.json 替代已发布制品。

`runtime_packages` 只包含必需的 Host peers。可选 peers 放入 `optional_runtime_packages`
（旧策略省略时视为空）；只有所有消费包均声明 `peerDependenciesMeta.optional=true`
的包才可缺失。只要一个消费包要求该 peer，就按必需处理。可选 peer 已安装时仍须匹配
精确版本；两组不能重叠，总计至多 128 项。缺失可选 workspace 不会阻断独立插件升级。

输入 JSON 的 `plugin`、`identity`、可选 `model_proxy` 各为 `{ "path": "/absolute/package.tgz", "integrity": "sha512-..." }`。
运行 `node scripts/prepare-update-installation.mjs INPUT.json OUTPUT.json` 只生成候选片段，不安装或发布。
每个租户自行补充最低版本、说明页、revision 和 Desktop channels，再通过 User 发布策略检查。

Host 与声明的 pins 不符时只提示升级宿主，不生成安装命令；兼容时仅升级较旧组件，
必要时命令先安装 Identity，再安装插件。缺证据、未知的较新 Model Proxy 依赖或不兼容
Identity 都保留人工指引。npm peer 范围使用标准 prerelease 语义，不放宽 RC 兼容性。

## 本地验证与后续发布

单元覆盖位于 `tests/update-policy.spec.ts`、`tests/update-switch.client.spec.ts`、
`tests/updates.client.spec.tsx`、`tests/tenant-switch.spec.ts` 及 model-proxy 用例；
真实 Harness 的入口与切换 smoke 由 `tests/e2e/specs/harness-smoke.spec.ts` 拥有。
跨仓 wire 合同由 `awiki-system-test/tests/non_did/test_dsh_updates_contract.py` 拥有。

本地源码通过不代表已有安装包自动获得修复。后续需按现有发布流程打入新的 Desktop
runtime inputs 或发布独立 npm 包，再发布真实制品对应的版本清单/租户策略。
不得把仅供 Desktop 打包的归档当作已发布 npm 包。

2026-09-09 Review 修复：空/缺失策略先通过回归用例复现错误解除限制，再修正解析边界；
无缓存时仍不凭响应错误新增限制。租户取消后迟到响应不能覆盖新缓存的用例也已补齐，
原同步写盘路径保持不变。上述四个单元/界面文件共 33 项通过，TypeScript 类型检查、
公开接口及生成代码检查通过；`lib` 使用 `pnpm run build:raw` 生成。
System 仓 `uv run pytest tests/non_did/test_dsh_updates_contract.py -q`：2 通过，失败 0、
跳过 0；只运行本地契约检查，未连接生产服务或发布 npm/Desktop。


2026-09-14：本轮仅在 `release/0815-bugfix` 开发并执行定向测试，不提交、不发布。
Desktop 的 `products.dsh.desktop.channels.stable/prerelease` 独立于 npm `enabled`；
正式版只选择 stable，RC 比较两个通道且只把更高版本标记为更新。策略不能跨租户回退，
制品 URL 可共用经部署允许的来源。已有 Desktop runtime pins 未升级，后续需要在兼容
宿主上组合包含本次修复的新插件，再验证真实安装包；本地契约测试不是制品验收。

本轮定向验证记录（2026-09-14，macOS 本地）：

| 仓库 / 范围 | 通过 | 失败 | 跳过 |
| --- | ---: | ---: | ---: |
| User：client_releases、server_info、prepare_client_releases | 50 | 0 | 0 |
| DSH：update-policy、update-installation、update-switch.client、updates.client、tenant-switch | 39 | 0 | 0 |
| DSH：prepare-update-installation 归档工具 | 4 | 0 | 0 |
| Desktop：update-checker、updates（含真实 Cordis 能力生命周期） | 48 | 0 | 0 |
| Web：prepare-desktop-downloads | 9 | 0 | 0 |
| System：test_dsh_updates_contract.py | 3 | 0 | 0 |
| 合计 | 153 | 0 | 0 |

另已通过 DSH typecheck / build:raw / check:generated / check:public、Desktop typecheck / build、
User 定向 Ruff、Web awiki-me build / lint、两地站点路由静态契约、awiki-ai SEO，以及 Desktop
中英文文档记录校验。User 输出两项既有 Pydantic schema 字段名警告；构建工具有既有弃用提示。
本表只覆盖列出的定向范围，不是全量系统或产品 E2E 通过证明。

未执行真实 Desktop 三平台打包、签名、公证、旧版安装升级、生产 Nginx 加载、线上 E2E、
npm 发布及两地部署。待后续发布时补齐实际运行时组合、真实制品来源和安装保留数据验收。
本轮五个对应仓库均在 release/0815-bugfix，未提交、未创建 PR；同工作区其他并行改动保留，
不包含在本次验证结论内。
