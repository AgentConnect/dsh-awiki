# 版本查询、手动升级与租户边界

设置中的“版本与更新”显示 AWiki 插件和已安装的模型插件版本。只有 Host 提供
`desktopDistribution` 且 `schemaVersion=1`、`distributionId=awiki-dsh-desktop` 时，
才额外显示桌面发行版。浏览器只读取经过投影的公开信息，不依赖 Electron、UA、
私有运行时或安装路径。

## 交互

- 检查更新分别查询当前租户的插件信息和 Desktop 的发行信息；两个结果独立。
- 新版本提供轻量提示、精确版本命令或完整桌面版下载页面，由用户手动安装并重启。
  客户端不下载安装包、不启动安装器、不代用户运行命令。
- 命令始终可见、可选中；复制成功或失败均显示反馈。普通 DSH 命令中的
  `YOUR_PROFILE` 必须替换为启动 DSH 时使用的 profile 名称；桌面版从托盘打开
  DSH 终端执行，由现有终端 shim 选择当前 profile。
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

Desktop 自己拥有固定发行源、通道规则、请求合并与超时；其公共服务提供
`getSnapshot()`、`check()` 和 `subscribe()`。AWiki Host 仅把公开快照投影到
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
Desktop 结果与当前安装版本不随租户切换变化；Host profile 重启仍遵循原生命周期。

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
