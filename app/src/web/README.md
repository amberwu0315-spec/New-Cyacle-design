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
│  └─ src/web/              # ship module，最终运行和构建入口，也是项目 app 层
│     ├─ index.html
│     ├─ package.json
│     ├─ vite.config.ts
│     ├─ public/
│     └─ src/
│        ├─ main.tsx
│        ├─ project-config.ts
│        ├─ router.ts
│        ├─ globals.css
│        ├─ vineModules.gen.ts
│        ├─ vineStyles.gen.css
│        ├─ components/
│        ├─ routes/
│        └─ features/
└─ domain/
   ├─ base/src/web/         # 共享前端基础包
   └─ <domain>/src/web/     # feature domain 前端包
```

`app/src/web` 是唯一直接执行 `pnpm dev` 和 `pnpm build` 的 ship module，同时也是本项目的 app 层入口。它可以承载项目自己的 router、shell layout、首页/帮助页等 app 级路由、入口级配置和只属于最终应用的页面。

`app/src/web` 不放跨 domain 复用的共享组件、共享 lib 或 feature domain 的业务页面。可复用能力放到 `domain/base/src/web`，领域业务页面放到对应 `domain/<domain>/src/web`。

`domain/base/src/web` 是共享前端基础包，提供 BaseProviders、共享 UI、共享 layout、全局样式、React Query、VRPC client、route mount helper 等能力。

`domain/<domain>/src/web` 是 feature domain 的前端包，提供该领域自己的路由、页面、局部组件，并通过 `webDomain` 暴露 route mounts 和 capabilities。

## Ship Module

ship module 的主要职责：

- 提供 Vite 标准入口：`index.html`
- 提供静态资源目录：`public/`
- 启动 Vite dev server
- 执行生产构建并输出 `dist/`
- 在 `src/main.tsx` 中挂载 React app，并引入最终样式入口
- 在 `src/router.ts` 中创建最终 router，配置项目级入口参数，定义 domain route outlet，并挂载 app 自身路由和 feature domain 路由
- 在 `src/routes/`、`src/features/`、`src/components/` 中放项目 app 层路由、页面和 shell 适配代码
- 在 `src/globals.css` 中声明只属于最终应用的全局样式补充
- 通过生成的 `src/vineModules.gen.ts` 和 `src/vineStyles.gen.css` 汇总 feature domain 入口
- 在 `package.json` 中依赖 base domain 和 feature domain 的 web package
- 启动 dev server 时把实际监听信息写入 `.cache/web/dev-state.json`

`src/main.tsx` 结构类似：

```tsx
import { RouterProvider } from '@tanstack/react-router'
import ReactDOM from 'react-dom/client'
import { BaseProviders } from '@scope/web-base'

import './vineStyles.gen.css'
import { router } from './router'

const rootElement = document.getElementById('app')!

ReactDOM.createRoot(rootElement).render(
  <BaseProviders>
    <RouterProvider router={router} />
  </BaseProviders>,
)
```

`src/project-config.ts` 是项目级配置入口，结构类似：

```ts
import { configureWebProjectConfig, type WebProjectConfig } from '@scope/web-base'

const webProjectConfig = {
  routes: {
    loginPath: '/uic/login',
  },
  uploadServices: {
    file: {
      publicUploadPath: '/file.FileWeb/FileService/public/upload',
      publicDownloadPath: '/file.FileWeb/FileService/public/download',
      privateUploadPath: '/file.FileWeb/FileService/upload',
      downloadPath: '/file.FileWeb/FileService/download',
    },
    document: {
      uploadPath: '/doc.DocumentWeb/DocumentService/upload',
      downloadPath: '/doc.DocumentWeb/DocumentService/download',
    },
  },
} satisfies WebProjectConfig

configureWebProjectConfig(webProjectConfig)
```

`src/router.ts` 是项目 app 层可维护的路由入口，先加载项目级配置，再创建最终 router：

```ts
import './project-config'

import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import {
  defineWebDomainRouteOutlets,
  resolveWebDomainRouteMount,
} from '@scope/web-base'

import { AppLayout } from './components/layouts/app-layout'
import { createHomeRoute } from './routes/home-route'
import { webModules } from './vineModules.gen'

const appRouteOutlets = defineWebDomainRouteOutlets({
  root: 'root',
  shell: 'shell',
})

const RootRoute = createRootRoute()
const ShellRoute = createRoute({
  getParentRoute: () => RootRoute,
  id: 'shell',
  component: AppLayout,
})

const routeTree = RootRoute.addChildren([
  ...resolveWebDomainRouteMount({
    domains: webModules,
    outlet: appRouteOutlets.root,
    parentRoute: RootRoute,
  }),
  ShellRoute.addChildren([
    createHomeRoute({ parentRoute: ShellRoute }),
    ...resolveWebDomainRouteMount({
      domains: webModules,
      outlet: appRouteOutlets.shell,
      parentRoute: ShellRoute,
    }),
  ]),
])

export const router = createRouter({ routeTree })
```

ship module 可以定义项目级 layout 和项目级页面。跨 domain 共享的基础设施仍放 `domain/base/src/web`；feature domain 的业务页面仍放各自 domain 包。

## Base Domain

base domain 提供：

- `BaseProviders`：React Query、主题、Toaster 等全局 provider
- `globals.css`：全局 Tailwind、theme、字体和基础 CSS
- `defineWebDomain`、`defineWebDomainRouteOutlets`、`resolveWebDomainRouteMount`：domain route mount 协议
- `AppLayout`、`ModuleLayout` 等共享 layout
- `components/ui/*`：共享 UI 组件
- `lib/query-client`：React Query provider
- `lib/vrpc-client`：VRPC client

base domain 是共享层，不作为 feature domain 加入 `webModules`。feature domain 可以依赖 base domain，例如：

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
export { webDomain } from './routes'
```

`webDomain` 使用 base domain 提供的 `defineWebDomain()` 声明 route mounts 和 capabilities。feature domain 不应该自己创建 root router，也不应该自己挂载 React app。

## 路由关系

路由由 `app/src/web/src/router.ts` 统一创建：

```text
router.ts                             # app/src/web
└─ RootRoute                          # app 根路由
   ├─ root outlet                     # login、register、SSO callback 等无 shell 页面
   └─ ShellRoute                      # app shell
      ├─ app routes                   # 首页、帮助页、项目级公共入口
      └─ shell outlet                 # 普通 feature domain 页面
```

app 层负责根路由、shell 路由、项目级页面和入口级配置。feature domain 只负责自己领域下的 route factory，并通过 `root`、`shell` 等 outlet 接入最终应用。

## 样式与 Tailwind

最终页面由 `main.tsx` 引入一个生成的 CSS 汇总入口：

```text
app/src/web/src/vineStyles.gen.css
```

内容由 `plot app apply` 生成，结构类似：

```css
@import "@scope/web-base/globals.css";
@import "@scope/web-feature/globals.css";
@import "./globals.css";
```

`@scope/web-base/globals.css` 是 Tailwind/global CSS 基础入口，包含 Tailwind、theme、字体和全局基础样式。feature domain 通过自己的 `globals.css` 暴露样式入口，ship module 统一 import 这些入口。`app/src/web/src/globals.css` 用于最终应用自己的全局样式补充。

## Package 依赖

`app/src/web/package.json` 保留最终运行和构建需要直接可见的包。`plot app apply` 会维护 web workspace package 依赖：

- base domain web package
- feature domain web package

这些依赖使用 `workspace:*`。ship module 不写入 skeled TypeScript 包依赖。

feature domain 的 `package.json` 依赖 base domain：

```json
{
  "dependencies": {
    "@scope/web-base": "workspace:*"
  }
}
```

## PNPM Workspace

根目录的 `pnpm-workspace.yaml` 由 plot 维护，包含 ship module、base domain web package、feature domain web package，以及 skeled TypeScript package。

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

- `src/main.tsx`、`src/vineModules.gen.ts`、`src/vineStyles.gen.css` 由 `plot app apply` 维护，不手动编辑。
- `src/router.ts`、`src/routes/`、`src/features/`、`src/components/` 可以承载项目 app 层自己的路由、页面和 shell 适配代码。
- `src/globals.css` 可以放最终应用自己的全局样式补充。
- base domain 负责跨 domain 共享能力，feature domain 负责领域页面，ship module 负责组合、运行入口、项目级路由和入口级配置。
