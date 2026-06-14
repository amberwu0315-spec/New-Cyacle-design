# Web App - cyacle

应用名称：`cyacle`

## 启动与构建

```bash
pnpm install
pnpm dev
pnpm build                                   # 可选参数 --vrpcClientVersion=x.y.z 用于覆盖 VRPC client 版本，默认为 0.0.0-dev
pnpm build -- --vrpcClientVersion=1.1.1
```

## 项目结构

```text
cyacle/
├─ pnpm-workspace.yaml
├─ app/
│  └─ src/web/              # ship module，最终运行和构建入口
│     ├─ index.html
│     ├─ package.json
│     ├─ vite.config.ts
│     ├─ public/
│     └─ src/
│        ├─ main.tsx
│        └─ styles.css
└─ domain/
   ├─ app/src/web/          # app domain，共享前端基础包
   └─ <domain>/src/web/     # feature domain 前端包
```

`app/src/web` 是唯一直接执行 `pnpm dev` 和 `pnpm build` 的 ship module。它不承载业务页面和共享组件，只负责把 app domain 与各 feature domain 的前端包组装成最终应用。

`domain/base/src/web` 是 plotted app domain 的前端基础包，提供根路由、全局布局、共享 UI、全局样式、React Query、VRPC client 等能力。

`domain/<domain>/src/web` 是 feature domain 的前端包，提供该领域自己的路由、页面和局部组件。

## Ship Module

ship module 的主要职责：

- 提供 Vite 标准入口：`index.html`
- 提供静态资源目录：`public/`
- 启动 Vite dev server
- 执行生产构建并输出 `dist/`
- 在 `src/main.tsx` 中创建最终 router，并挂载 React app
- 在 `src/styles.css` 中声明全局样式入口和 Tailwind source
- 在 `package.json` 中依赖 app domain 和 feature domain 的 web package
- 启动 dev server 时把实际监听信息写入 `.cache/web/dev-state.json`

`src/main.tsx` 由 `plot app apply` 生成，结构类似：

```ts
import { mountApp, createAppRouter } from '@scope/web-base'

import './styles.css'

import { createDomainRouteTree as createFeatureRouteTree } from '@scope/web-feature'

const router = createAppRouter([
  createFeatureRouteTree,
])

mountApp(document.getElementById('app')!, router)
```

ship module 不自己定义根布局和领域页面，只把 app domain 与 feature domain 暴露的能力拼起来。

## App Domain

app domain 提供：

- `createAppRouter`：创建最终应用 router
- `mountApp`：挂载 React 应用
- `globals.css`：全局 Tailwind、theme、字体和基础 CSS
- root layout 与首页路由
- `components/ui/*`：共享 UI 组件
- `lib/query-client`：React Query provider
- `lib/vrpc-client`：VRPC client

app domain 是共享层，不作为 feature domain route tree 加入 `createAppRouter([...])`。feature domain 可以依赖 app domain，例如：

```ts
import { Button } from '@scope/web-base/components/ui/button'
```

## Feature Domain

feature domain 通常包含：

```text
domain/<domain>/src/web/
├─ package.json
├─ src/
│  ├─ index.ts
│  ├─ routes/
│  ├─ features/
│  ├─ components/
│  ├─ pub/
│  └─ styles/
└─ tsconfig.json
```

对 ship module 来说，feature domain 最重要的出口是：

```ts
export { createDomainRouteTree } from './routes'
```

`createDomainRouteTree` 接收 app domain 创建的 `RootRoute`，返回该领域挂到根路由下的路由树。feature domain 不应该自己创建 root router，也不应该自己挂载 React app。

## 路由关系

路由分三层：

```text
createAppRouter                       # app domain
└─ RootRoute                          # app domain
   ├─ home route                      # app domain
   └─ /<domain>                       # feature domain
```

app domain 负责根路由和公共布局。feature domain 只负责自己领域下的子树。

## 样式与 Tailwind

最终页面只有一个 CSS 入口：

```text
app/src/web/src/styles.css
```

内容由 `plot app apply` 生成，结构类似：

```css
@import "@scope/web-base/globals.css";

@import "@scope/web-feature/globals.css";
```

`@scope/web-base/globals.css` 是 Tailwind/global CSS 基础入口，包含 Tailwind、theme、字体和全局基础样式。feature domain 通过自己的 `globals.css` 暴露样式入口，ship module 统一 import 这些入口。

## Package 依赖

`app/src/web/package.json` 保留最终运行和构建需要直接可见的包。`plot app apply` 会维护 web workspace package 依赖：

- app domain web package
- feature domain web package

这些依赖使用 `workspace:*`。ship module 不写入 skeled TypeScript 包依赖。

feature domain 的 `package.json` 依赖 app domain：

```json
{
  "dependencies": {
    "@scope/web-base": "workspace:*"
  }
}
```

## PNPM Workspace

根目录的 `pnpm-workspace.yaml` 由 plot 维护，包含 ship module、app domain web package、feature domain web package，以及 skeled TypeScript package。

当前策略是：

```yaml
sharedWorkspaceLockfile: false
recursiveInstall: false
```

这表示不使用根目录共享 lockfile，而是每个 package 维护自己的 `pnpm-lock.yaml`。根目录不需要 `package.json` 和 `pnpm-lock.yaml`。

在 ship module 目录下执行：

```bash
pnpm install
pnpm dev
pnpm build
```

`plot art run web` 会使用 plot 内部 dev script 启动 Vite，并把实际监听到的端口、URL 和进程号写入 app 根目录下的 `.cache/web/dev-state.json`。

## 维护约束

- `src/main.tsx` 由 `plot app apply` 生成，不手动编辑。
- `src/styles.css` 由 `plot app apply` 生成，不手动编辑。
- app domain 负责共享能力，feature domain 负责领域页面，ship module 只负责组合和运行。
