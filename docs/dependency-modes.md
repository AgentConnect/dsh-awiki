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
