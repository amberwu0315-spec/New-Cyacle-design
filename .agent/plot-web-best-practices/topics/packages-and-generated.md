# Plot Web Packages、依赖与 Generated 文件


## 代码归属

```text
app/src/<artifact>                main、最终 router、AppLayout、app-owned pages
app/src/<artifact>.<subartifact>  同一 artifact 的其它 Web 入口，独立 app module
domain/base/src/<artifact>        共享 UI、Provider、client、route 工具、globals
domain/<name>/src/<artifact>      domain routes、features、queries、i18n、pub、globals
```

依赖方向：`app → domain`、`feature domain → base/其它 domain 的 ./pub`。Base 不依赖 feature domain，domain 不依赖 app，一定避免循环依赖。

导入路径按**能力归属**选择，不要看到两个包都能导出相似名称就随意改成同一个来源：

```tsx
// Base 的通用 UI / 技术能力
import { Button, useUploadQueue } from "@scope/web-base"

// 另一个 domain 对外开放的稳定业务能力
import { ProjectStatusBadge } from "@scope/web-project/pub"
```

```tsx
// NOT：如果 ProjectStatusBadge 属于 project domain，不要从 Base 借名导出
import { ProjectStatusBadge } from "@scope/web-base"
```

```tsx
// NOT：也不要绕过 exports 深链 domain 源码
import { ProjectStatusBadge } from "@scope/web-project/src/features/project-status/project-status.tsx"
```

同名能力只能有一个 owner：通用机制归 Base，业务能力归 owner domain；消费方按 `@scope/web-base` 或 `@scope/web-<domain>/pub` 的唯一公开入口导入，不同时从两个包导入同一能力。

## 领域依赖与循环

跨 domain import 会形成真实领域关系，只在消费对方稳定能力时建立。新增前检查双方 `package.json`、现有 imports 和 public exports，依赖图必须保持单向且无环。

```text
仅调用另一 domain 的稳定能力 → 依赖 owner domain 的 ./pub
多个 domain 需要无业务归属的 UI/技术能力 → 提取到 Base
多个 domain 的业务流程需要协作 → app 负责组合
A 已依赖 B，B 又需要 A → 重新划分 owner 或提取中立能力；禁止反向 import
```

- 不为共享一个组件、type 或 helper 建立双向 domain 依赖。
- Domain 的 `./pub` 不 re-export 其它 domain，用转导出隐藏的依赖仍会形成环。
- Barrel 保持纯 re-export 也不代表无环；检查源码 import graph，而不只检查运行时是否暂时正常。

## Plot 标准模板：Package API

Base：

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./globals.css": "./src/styles/globals.css"
  },
  "imports": { "#/*": "./src/*" }
}
```

Feature：

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./globals.css": "./src/styles/globals.css",
    "./pub": "./src/pub/index.ts"
  },
  "imports": { "#/*": "./src/*" }
}
```

```text
当前 package 内跨目录  → #/path/file.ts[x]
同目录强绑定文件         → ./file.ts[x]
Base 公共 API            → @scope/web-base
其它 domain 稳定 API     → @scope/web-<domain>/pub
```

Barrel 只做显式 re-export。Base 根入口只聚合一级 barrel；Feature 根入口导出本入口的 domain 对象（导出名由入口名推导，camelCase 加 `Domain` 后缀），只在参与该入口时导出，未导出的入口不需要补空对象；`./pub` 只开放稳定跨 domain API。

## 依赖归属

```text
谁直接 import 第三方包？
├─ app                 → plot pnpm add <pkg> [--artifact <artifact>[.<subartifact>]]
├─ 一个 domain          → plot pnpm add <pkg> --domain <domain>
├─ 多个 domain          → 各自声明，共享该 artifact 的 catalog 版本
└─ 需要统一协议/配置     → base 封装后开放项目 API
```

所有事务从项目根执行：

```bash
plot pnpm install
plot pnpm install --frozen-lockfile
plot pnpm install --artifact <artifact>.<subartifact>
plot pnpm add <package>
plot pnpm add -D <package>
plot pnpm add <package> --artifact <artifact>.<subartifact>
plot pnpm add <package> --domain <domain>              # 同时写入 domain package、app package 和 catalog
plot pnpm remove <package> [--domain <domain>]
plot pnpm update <package>@<range>
plot pnpm update <package> --latest
plot pnpm prune                                        # 未代理的命令原样透传
plot pnpm prune --write
```

第三方版本放根 `pnpm-workspace.yaml` 的 `catalogs.<artifact>`（catalog 名就是 artifact 名），package 使用 `catalog:<artifact>`；内部包使用 `workspace:*`。每个 app module 各自持有并提交自己的 lockfile（`app/src/<artifact>/pnpm-lock.yaml` 及每个 `app/src/<artifact>.<subartifact>/pnpm-lock.yaml`），依赖变更后重新安装会一并刷新。catalog 名由 artifact 决定，所以用 `--artifact`（或等价的 `--dir app/src/<artifact>[.<subartifact>]`）选择目标即可；plot v0.9.0 起 `--catalog` 会被拒绝（更早的版本仅在 `update` 上接受它）。

## Plot 标准生成边界

```text
app/src/<artifact>/src/generated/modules.gen.ts  ← plot app apply
app/src/<artifact>/src/generated/styles.gen.css  ← plot app apply
.plot/<artifact>/virtual/**                      ← plot app apply（虚拟 package 投影）
app/src/<artifact>/pnpm-lock.yaml                ← plot pnpm
```

`modules.gen.ts` 聚合各 feature package 根入口导出的本入口 domain 对象（导出名由入口名推导，camelCase 加 `Domain` 后缀；未导出该名称的 domain 不参与），同时导出 `webModules` 和 `webModulesById`。`styles.gen.css` 按 base → feature domains → app globals 聚合样式：

```css
@import "@scope/web-base/globals.css";
@import "@scope/web-catalog/globals.css";
@import "../globals.css";
```

最终 `main.tsx` 只 import `#/generated/styles.gen.css`。

## 何时运行 Apply

```text
只改 route/page/component 或已有 globals 内容 → 不需要 apply
新增/删除 domain、改变内部 package 接入       → plot app apply
聚合文件缺 domain/CSS                         → 修 exports/接入后 plot app apply
升级已有 Plot 项目                            → env upgrade → app apply → frozen install
```

```bash
plot env upgrade
plot app apply
plot pnpm install --frozen-lockfile
```

## DO / NOT

| DO | NOT |
| --- | --- |
| 包内走 `#/`，跨包走 exports | 跨 domain `#/`、相对源码路径或深层 export |
| 新增跨 domain import 前确认依赖图无环 | 建立 A ↔ B 或通过 `./pub` 转导出隐藏依赖 |
| 直接 import 的 package 声明依赖 | 依靠源码扫描或 app 偶然依赖 |
| 多 domain 各自声明稳定第三方 API | 仅为隐藏 import 路径让 Base `export *` |
| `plot pnpm` 管理 catalog/lockfile | 在 package 内执行 `pnpm add/remove/update` |
| `plot app apply` 管理内部聚合 | 手改 generated 文件或 `.plot` |
| `index.ts` 仅导出 | 在 barrel 初始化 client 或注册 middleware |

`plot pnpm` 用 `--artifact`（或等价的 `--dir app/src/<artifact>[.<subartifact>]`）选择目标；`--filter`、`--recursive`、`--workspace-root`、`--global`、`--lockfile-dir` 等会绕过 workspace 边界的参数会被拒绝；catalog 名由 `--artifact` 决定，plot v0.9.0 起 `--catalog` 不再接受。
