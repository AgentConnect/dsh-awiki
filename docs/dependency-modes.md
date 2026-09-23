# Debug、源码联调与正式发布依赖

默认 Debug 使用线上固定依赖，正式 Release 也只能使用线上固定依赖。
编译优化级别与来源分开记录；Debug 可以显式选择本地或未合并 PR 源码。

```bash
# registry 默认入口，在没有 sibling 的隔离目录安装并构建
pnpm run build:registry
# 初次准备个人本地路径（相对于根目录配置文件）
cp scripts/dependencies/local.example.json dependencies.local.json
pnpm run build:local
# 只安装并核对本地来源，不代表编译通过
python3 scripts/dependencies/run.py --deps local --local-config dependencies.local.json --resolve-only
# 正式构建：拒绝 local/source，检查完整 registry lock 和安装路径
pnpm run build:release
```

原生本地源码需要相应 Rust/Node 工具链。各模式使用独立临时目录，消费者包含当前未提交源码，
个人源码也会快照，不改原工作区依赖或锁文件。产物及 `resolution.json` 在
`.artifacts/dependencies/<mode>/`。默认 `pnpm-workspace.yaml` 不发现 sibling；联调脚本只把
明确选中的源码加入生成的 workspace/override，并核对真正安装的路径，禁止自动 fallback。
隔离目录保留重写前的 registry workspace 快照，合同测试据此检查默认隔离规则；源码模式
生成的 workspace 不被误当成默认配置。无 `.git` 的隔离目录还保留原 commit/tree 与逐文件
SHA-256；E2E 逐文件核验快照并要求原工作区干净，不以临时安装目录伪造 Git 提交。
本地安装完成后再记录消费者指纹，使临时锁文件对应实际解析结果。SDK 快照另从本机仓库
读取原始 commit 和 Git index，供原生候选包记录真实来源；不复制 Git 配置、凭据或 hooks，
不覆盖快照中的未提交改动。临时路径改写仍如实表现为 dirty，不能当作正式 registry 发布。
Node 原生 fixture 在 registry 模式加载已安装包，不编译 sibling；来源选择不因 Linux、macOS、
live/smoke 而变化。Core/Identity 独立选择来源，选中的 Identity 插件也打包本地候选，
不会偷偷下载同名旧 registry 插件。缓存 profile 必须匹配本次来源指纹，不能仅靠版本号复用。
本地 E2E 的 native tarball 使用其候选原生构建流程，是候选包证据，不作为 registry 安装证据。

## 哪些依赖信息要提交

- 提交正常 package.json、registry pnpm-lock.yaml，以及必要的 PR 源码清单和联调锁。
- 不提交 `dependencies.local.json`、个人绝对路径、node_modules、临时 override、缓存或构建目录。
- 消费者依赖另一仓未合并改动时，先将依赖提交推送到协作者/CI 可访问的仓库。
  提交完整 SHA 和 PR 链接，不只写移动分支名，也不依赖作者电脑的未提交修改。

`dependencies.source.json` 使用如下结构。键允许 `anp`、`anp-identity`、`awiki-im-core`；
源地址为无凭据 HTTPS，commit 必须替换成实际可获取的完整 40 位 SHA：

```json
{
  "schema_version": 1,
  "dependencies": {
    "anp-identity": {
      "repository": "https://github.com/your-org/anp-identity.git",
      "commit": "替换为实际可拉取的40位commit SHA",
      "pull_request": "https://github.com/your-org/anp-identity/pull/123"
    }
  }
}
```

先运行：

```bash
python3 scripts/dependencies/run.py --deps source --source-manifest dependencies.source.json --refresh-lock
python3 scripts/dependencies/run.py --deps source --source-manifest dependencies.source.json --command verify
```

提交清单及 `dependencies.source.pnpm-lock.yaml`、生成的
`dependencies.source.<SDK名>.Cargo.lock`。源码联调 CI 使用 frozen pnpm lock 和 locked Cargo
解析；原生构建后还会检查 Cargo lock 没有改变。没有 source 清单时不运行源码联调 job。
CI 仅使用普通 pull_request、只读仓库权限、不保留 checkout 凭据，不传递发布或生产凭据。

CI 根据仓库中是否存在 `dependencies.source.json` 只选择一个依赖门禁：存在清单时运行
`source-integration-check`，并跳过无法成立的 registry 与 Web smoke；清单撤掉后运行
`registry-check` 和三平台 Web smoke。这样开发 PR 不会因为尚未发布的精确依赖产生假失败，
同时也不会把源码联调绿灯冒充为正式依赖绿灯。默认先合并并发布依赖 PR，再更新消费者正式
pin/lock、撤掉临时 source 清单/锁，并在发布前通过 registry 与 Web smoke。

## 当前正式 SDK 依赖

正式依赖已切换为 npm 上的 `@awiki/im-core-node@0.2.5`（Apache-2.0，native API v14）、
`@agent-network-protocol/dsh-anp-identity@0.1.1`，以及该插件精确依赖的
`@agent-network-protocol/anp-identity@0.2.1`。两个 Node SDK 的五个平台包与主包
分别保持相同版本，安装时不编译 Rust，也不依赖 sibling checkout。

相关 SDK 已发布后，已撤销上海集成阶段的 `dependencies.source.json`、pnpm 联调锁
及两份 Cargo 联调锁。后续 PR 如需源码联调，仍按上面的显式 source 流程创建清单。
本次通过官方 registry 刷新根 `pnpm-lock.yaml`，并核对实际安装版本和来源。
新发布的自有包仅以精确版本加入 `minimumReleaseAgeExclude`；其他包的
发布年龄策略保持既有设置。

2026-09-09 本轮按用户明确要求只发布，不运行测试。已完成 SDK 构建、打包、上传、
校验值及 registry 来源核验；此前 source 集成的 19 项检查是历史证据，不表示本轮复验。

## registry lock 与当前发布前提

刷新 registry lock 的显式命令是：

```bash
python3 scripts/dependencies/run.py --refresh-lock
```

该命令在隔离目录执行安装和来源验证，成功后才更新根 pnpm-lock.yaml。普通本地联调从不
回写正式锁文件；不要手填制品 integrity 或把 link/source 锁当成正式 registry 证据。

当前上述 SDK 版本均已在 npm 官方源发布，registry lock 已更新，原先依赖未发布的阻断
已解除。本轮没有执行产品 E2E 或安装运行测试，不将发布/来源核验表述为功能验收。

## 发布检查

`build:release` 强制 registry 和已提交源码；存在 `dependencies.source.json` 会拒绝发布构建。
`prepublishOnly` 在正常 npm/pnpm 发布前检查模式、正式 SDK 版本、锁文件中的传递依赖来源、
安装路径及 runtime/optional dependency 声明。仅允许当前仓内产品作为另一个仓内模块的
开发依赖（例如 model-proxy 的 devDependency 指向当前 DSH 插件）；运行时 SDK 和跨仓链接
不适用此例外。安装使用 npm 官方源，registry 缓存可以复用，
不能静默从镜像换成较旧版本。

现有 `verify:candidate` 仍验证本地 tarball 的安装/运行，允许明确的候选包 override。
其通过不代表 npm 制品已发布；registry 构建和独立 registry CI 才验证线上依赖组合。


### 显式候选包组合验收

`verify:candidate` 额外要求 `--manifest <JSON 文件>`。清单包含 `schemaVersion: 1` 和 `packages`，后者必须列出六个角色：`identityWrapper`、`identityPlatform`、`identityPlugin`、`imCoreWrapper`、`imCorePlatform`、`awikiPlugin`。每项包含确切的 `name`、`version`（可带预发布标记，不能用范围或 dist-tag）和小写 `sha256`。平台包必须对应当前主机，且与其 wrapper 同版本。

先选定并审阅六个候选，再记录打包清单中的版本和 tarball SHA-256；验收不会自行从实装版本倒推期望值。调用时同时传入六个原有包参数：

```sh
pnpm run verify:candidate --manifest /absolute/candidate.json \
  --identity-wrapper /absolute/identity-wrapper.tgz \
  --identity-platform /absolute/identity-platform.tgz \
  --identity-plugin /absolute/identity-plugin.tgz \
  --im-core-wrapper /absolute/core-wrapper.tgz \
  --im-core-platform /absolute/core-platform.tgz \
  --awiki-plugin /absolute/awiki-plugin.tgz
```

安装前核对六包摘要及归档内的包名、版本，拒绝 runtime/peer/optional 依赖中的 `file:`、`link:`、`workspace:`。仅在新建临时 profile 内把六包全部 override 为指定 tarball，防止传递依赖静默加载同版本 registry 原生包。安装后再次核对六包实际 manifest，再验证插件条目唯一性和两次独立 Provider/Core 生命周期。临时 profile 在成功或失败后清理，不使用常用 Desktop profile。

该检查证明当前主机的显式候选组合可安装和重启，不证明 registry 已发布、多平台完整通过或真实账号/消息验收。正式版本切换仍须走上述 registry 门禁。

## DID Web 源码候选（2026-09-15）

本分支 Web 产品入口要求 Core Node native API v18（包括方法能力、注册公开续接摘要和
既有服务更新接口），通过显式 local 配置选择本任务 Core、ANP Identity 与 ANP 源码。
正式 `package.json` 仍固定 `@awiki/im-core-node@0.2.6` 与独立 Identity 插件 `0.1.2`，
本次不发布 SDK，也不把 local link 写入正式 manifest/lock。
因此源码构建、原生加载和本地测试只证明此源码组合；后续仍须发布新 SDK、更新正式
pin/lock，再验证 registry 安装及适用平台。不能用同版本号下的本地 API v18 制品冒充
线上旧包已经包含 Web 能力。开发时使用本节上方的 owning local runner，产物来源按实际
选中的路径、提交和内容指纹记录。

定向真实 Web E2E 通过同一源码依赖入口执行，不能手填来源指纹：

```bash
DSH_AWIKI_E2E_CONFIG=<仓库外的受保护配置> \
python3 scripts/dependencies/run.py --deps local --local-config dependencies.local.json \
  --command e2e:live --e2e-grep DID-WEB
```

该入口保留原始源码 SHA、实际解析后的 lock 与依赖指纹，在隔离消费者中执行 owning runner。
成功或失败的 E2E 报告都会导出到 `.artifacts/dependencies/local/e2e/<run-id>/`。
工作树任务可显式设置 `TMPDIR` 为任务自己的 scratch 目录；未决 Web 用例的 Core roots 和
私有清单保留在该目录。只有 UI 验收成功且精确远端清理已确认，owning runner 才删除这些
本地状态；不得因临时源码消费者退出而删除未知结果的候选密钥。

源码消费者的执行日志目录 `.execution/` 已从版本控制和源码快照排除；源码净状态与逐文件
哈希检查仍保持。staged live E2E 通过显式 `DSH_AWIKI_E2E_SYSTEM_TEST_ROOT` 调用原任务
worktree 的 owning cleanup runner，不能把临时 SDK snapshot 的 sibling 当成 System Test。

Identity 源码候选由 owning staging 的显式 `--local-candidate` 参数生成；其 manifest
标记 private，provenance 记录实际 ANP 提交、dirty 状态及 Cargo lock 摘要。默认 staging
仍要求经过验证的 registry manifest。候选路径不设置或伪造该正式 manifest。

源码隔离工作区按消费端锁定的 DSH 版本统一宿主包解析，避免 Identity 与消费端分别加载不同 prerelease 的 Cordis/Slot/Typert 类型扩展。仅改写临时 workspace overrides；上游源码及 registry 工作区不变，源码 pnpm 锁由 owning resolver 刷新并在 CI 冻结验证。
