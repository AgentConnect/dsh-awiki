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

`registry-check` 始终使用默认线上依赖，独立于 `source-integration-check`。默认先合并并发布
依赖 PR，再更新消费者正式 pin/lock、撤掉临时 source 清单/锁并通过 registry 检查，最后合并
消费者 PR。源码联调绿灯不能替代正式依赖绿灯。

## 当前 #48 的清理回归依赖

当前 [dependencies.source.json](../dependencies.source.json) 只选择 Identity PR #4 的
`a0af4e1590ef9b1911a40c9f25a83cbbccd0bd4b`。Core Node 保持 registry `0.2.3`；
该组合已通过 #48 的真实原生 Provider 恢复和本地清理回归，无需恢复旧 sibling checkout。
配套的 pnpm / Identity Cargo 联调锁一并随清单提交。Identity 正式包发布并完成 registry
验证后，撤掉这份临时清单和锁文件；它们存在时正式 Release 仍被阻断。

定向复测命令：

```bash
python3 scripts/dependencies/run.py --deps source --source-manifest dependencies.source.json \
  --command test --test-filter tests/recovery-external-provider.spec.ts
```

`--test-filter` 可重复，仅用于 `--command test`，不扩大为全部测试。

## registry lock 与当前发布前提

刷新 registry lock 的显式命令是：

```bash
python3 scripts/dependencies/run.py --refresh-lock
```

该命令在隔离目录执行安装和来源验证，成功后才更新根 pnpm-lock.yaml。普通本地联调从不
回写正式锁文件。仓库已有锁包含旧 workspace link，在完成 registry 锁刷新前不能用于新
registry CI；不要手填不存在制品的 integrity 或把 link 锁当成线上证据。

本轮从 npm 官方源确认：`@awiki/im-core-node@0.2.3` 存在，但
`@agent-network-protocol/anp-identity@0.2.0` 和
`@agent-network-protocol/dsh-anp-identity@0.1.0` 不存在。
因此当前 registry 安装及 lock 刷新处于依赖发布阻断状态。需要先发布经验证的 Identity
Node/平台包及 DSH Identity 插件，再刷新锁；本次不自动回退旧 dsh-test 包，也不发布包。
本地模式可以验证选中的源码，但不能宣称正式发布已就绪。

## 发布检查

`build:release` 强制 registry 和已提交源码；存在 `dependencies.source.json` 会拒绝发布构建。
`prepublishOnly` 在正常 npm/pnpm 发布前检查模式、正式 SDK 版本、锁文件中的传递依赖来源、
安装路径及 runtime/optional dependency 声明。仅允许当前仓内产品作为另一个仓内模块的
开发依赖（例如 model-proxy 的 devDependency 指向当前 DSH 插件）；运行时 SDK 和跨仓链接
不适用此例外。安装使用 npm 官方源，registry 缓存可以复用，
不能静默从镜像换成较旧版本。

现有 `verify:candidate` 仍验证本地 tarball 的安装/运行，允许明确的候选包 override。
其通过不代表 npm 制品已发布；registry 构建和独立 registry CI 才验证线上依赖组合。
