# 路由与 Layout

[← 返回 Web 文档入口](../web.md)

> 职责：规定 app 与 domain 的路由挂载、懒加载策略和页面布局分层。

`app/src/web` 创建最终 `RootRoute`、pathless Layout outlet、项目 app 级路由和最终 Router；feature domain 通过 `createWebDomain().addRoute()` 声明 route tree，再由 `createWebRouter` 统一接入。普通业务页面默认挂到 `app` outlet；login、register、SSO callback 等特殊页面挂到 `root` outlet。

| 场景 | 默认写法 |
| --- | --- |
| 全局 provider、Toaster、QueryClient 等基础设施 | `app/src/web/src/main.tsx` 中使用 `BaseProviders` |
| app 入口级配置、router、outlet 定义 | `app/src/web/src/router.ts` |
| app 自己需要统一页面框架的路由 | 挂到 `app` outlet 分支 |
| app 自己不需要页面框架的路由 | 直接挂 RootRoute |
| 普通 business domain route tree | `.addRoute('app', factory)`，挂到 app Layout 下 |
| 后台 domain route tree | `.addRoute('admin', factory)`，挂到 Admin Layout 下 |
| 特殊无 layout domain route | `.addRoute('root', factory)`，直接挂 RootRoute |
| 普通页面内容区 | 优先用共享 `ModuleLayout` 打底；domain 可自定义 `PageLayout` |
| domain route 扩展信息 | `capabilities`，当前 app 消费函数式 `capabilities.nav` |

## App 层组织

`main.tsx` 只负责引入最终样式、包裹 `BaseProviders` 并挂载 `RouterProvider`。`router.ts` 负责创建 `RootRoute`、Layout outlet、项目 app 级路由、domain route tree 和入口配置。App shell 适配代码放 `app/src/web/src/components/layouts/`，共享 layout 与通用页面底座放 `domain/base/src/web/src/components/layouts/`。

```text
app/src/web/src/
├── main.tsx                     ← 挂载 React app + BaseProviders
├── project-config.ts            ← 配置项目级共享参数
├── router.ts                    ← 创建最终 router + Layout outlet + domain route tree
├── routes/                      ← 项目 app 级路由
├── features/                    ← 项目 app 级页面
└── components/layouts/          ← app shell 适配代码

domain/base/src/web/src/
├── base-providers.tsx           ← 全局 provider
├── components/layouts/app-layout/
└── components/layouts/module-layout/
```

```tsx
// app/src/web/src/router.ts
import '#/project-config.ts'

import { createRootRoute, createRoute } from '@tanstack/react-router'
import { createWebRouter } from '@example-app/web-base'

import { AppLayout } from '#/components/layouts/app-layout/index.ts'
import { createHomeRoute } from '#/routes/home-route.ts'
import { webModules } from '#/vineModules.gen.ts'

const RootRoute = createRootRoute()
const ShellRoute = createRoute({
  getParentRoute: () => RootRoute,
  id: 'app',
  component: AppLayout,
})
const AdminRoute = createRoute({
  getParentRoute: () => RootRoute,
  id: 'admin',
})

export const { router } = createWebRouter({
  rootRoute: RootRoute,
  domains: webModules.filter((domain) => domain.id !== 'wuxibiologics'),
  rootOutlets: { app: ShellRoute, admin: AdminRoute, wuxibiologics: null },
  routes: ({ app }) => ({ app: [createHomeRoute({ parentRoute: app! })] }),
})
```


## Lazy Route 写法

路由文件默认只保留 `path`、`getParentRoute`、`loader`、`beforeLoad`、search 校验等匹配和加载所需的关键配置；页面组件从 `features/*/page.tsx` 通过 TanStack Router 的 `lazyRouteComponent` 按需加载。不要在 route 文件里静态 import 页面组件，除非该页面非常轻且确认需要进入首包。

```tsx
import type { AnyRoute } from "@tanstack/react-router"
import { createRoute, lazyRouteComponent } from "@tanstack/react-router"

const LoginPage = lazyRouteComponent(() => import("#/features/login/page.tsx"), "LoginPage")

export function createLoginRouteBranches({ parentRoute }: { parentRoute: AnyRoute }) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: "uic/login",
    component: LoginPage,
  })
}
```

同一个页面模块导出多个 route component 时，每个 route 单独声明对应的 lazy component。

```tsx
const UserAgreementPage = lazyRouteComponent(
  () => import("#/features/terms/page.tsx"),
  "UserAgreementPage",
)
const PrivacyPolicyPage = lazyRouteComponent(
  () => import("#/features/terms/page.tsx"),
  "PrivacyPolicyPage",
)
```

当前 app router 已配置 `defaultPreload: 'intent'`，`lazyRouteComponent` 返回的组件会暴露 `.preload()`；用户 hover/focus 链接时，TanStack Router 会从 `route.options.component` 读取并调用这个 preload，从而提前加载目标页面 chunk。页面不需要额外适配 props 时，优先把 `lazyRouteComponent` 返回的组件直接赋给 route 的 `component`。

不要在同步 wrapper 里面再渲染 lazy component。下面的页面仍会在实际渲染时懒加载，但 Router 看到的 `component` 是没有 `.preload()` 的匿名函数，所以 hover/focus 不会提前加载页面 chunk。

```tsx
// 避免：同步 wrapper 会隐藏 WorkspacePage.preload
const WorkspacePage = lazyRouteComponent(
  () => import("#/features/workspace/page.tsx"),
  "WorkspacePage",
)

const workspaceRoute = createRoute({
  getParentRoute: () => domainRoute,
  path: "$appId",
  component: () => {
    const { appId } = workspaceRoute.useParams()

    return <WorkspacePage appId={appId} />
  },
})
```

路由需要通过当前 route 实例读取 params/search 并把它们转换成页面 props 时，可以保留同步薄 wrapper，但必须把 lazy 页面的 `.preload` 转发给 wrapper。这样 `route.options.component` 仍然具有 preload 能力，同时继续使用 `route.useParams()` / `route.useSearch()` 的精确类型。

```tsx
const WorkspacePage = lazyRouteComponent(
  () => import("#/features/workspace/page.tsx"),
  "WorkspacePage",
)

export function createWorkspaceRoute({ domainRoute }: { domainRoute: AnyRoute }) {
  function WorkspaceRouteComponent() {
    const { appId } = workspaceRoute.useParams()
    const { prompt } = workspaceRoute.useSearch()

    return <WorkspacePage appId={appId} initialPrompt={prompt} />
  }

  const workspaceRoute = createRoute({
    getParentRoute: () => domainRoute,
    path: "$appId",
    component: Object.assign(WorkspaceRouteComponent, {
      preload: WorkspacePage.preload,
    }),
  })

  return workspaceRoute
}
```

不要为了把 wrapper 放进独立 lazy 模块而硬编码 `useParams({ from: '/workspace/$appId' })`。`from` 匹配的是完整 route id，不是浏览器 URL；code-based domain route 挂到 pathless `app`、`settingsLayout` 等父路由后，实际 route id 会包含父级 id，而且更换 outlet 后还会改变。使用当前 factory 创建的 `route.useParams()` / `route.useSearch()` 不依赖最终挂载位置。

只有当某个 route 需要把 `component`、`pendingComponent`、`errorComponent` 等非关键配置拆成独立 lazy route 文件时，才考虑 code-based `.lazy(() => import('./xxx.lazy').then((d) => d.Route))`；使用这种写法前先固定 route id，避免 lazy route id 和主 route 不一致。`path`、`validateSearch`、`beforeLoad` 和通常情况下的 `loader` 继续同步保留，避免先下载 route options 才能开始加载数据的额外瀑布。

若项目使用 file-based route，则沿用项目约定创建 `.lazy.tsx`，并用 `createLazyFileRoute` 替代 `createLazyRoute`。

不要 lazy app 壳子本身：`main.tsx`、`router.ts`、Layout outlet、`AppLayout`、domain route factory 保持同步。它们负责应用骨架、路由注册、outlet 挂载和 nav capability 聚合；改成异步会让 app 路由入口协议变复杂，收益不明显。

## Business Domain 路由

Business domain 对外导出 `webDomain`。默认写法使用 `createWebDomain(id)` 声明 domain，再通过 `.addRoute(outlet, factory)` 注册路由、`.addCapability(key, value)` 暴露能力：`app` 挂到普通应用 Layout，`admin` 挂到后台 Layout，`root` 直接挂 RootRoute；当前 app 会读取函数式 `capabilities.nav` 聚合左侧导航。

Domain 默认路由以领域名称开始，domain root 可同步承载 `Outlet`，子页面挂在 domain root 下。子路由使用相对 path，例如 `reports` 最终成为 `/catalog/reports`。自定义顶层路由只在产品合同明确需要时创建，并先检查与其它 domain 的 path 冲突。

```tsx
// domain/catalog/src/web/src/routes/index.tsx
import { createWebDomain } from "@example-app/web-base"
import { Outlet, createRoute } from "@tanstack/react-router"
import type { AnyRoute } from "@tanstack/react-router"

import { createHomeRouteTree } from "./home-route"
import { createReportsRouteTree } from "./reports-route"
import { createCatalogNavMeta } from "./nav"

const createCatalogRoutes = (parentRoute: AnyRoute) => {
  const domainRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: "catalog",
    component: Outlet,
  })

  return [
    domainRoute.addChildren([
      createHomeRouteTree({ domainRoute }),
      createReportsRouteTree({ domainRoute }),
    ]),
  ]
}

export const webDomain = createWebDomain("catalog")
  .addRoute("app", createCatalogRoutes)
  .addCapability("nav", createCatalogNavMeta)
```

```tsx
// 非必要不要这样做：它会跳过 /catalog 前缀并占用全局 path。
const publicCatalogRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "products",
})
```

## Admin 改动隔离

后台页面的具体展示、技术 ID、详情跳转、分区和表格要求见 [Admin 页面展示规范](admin-pages.md)。

修改 `/admin` 下的后台相关代码时，必须保证不影响前台路由和前台界面样式。后台页面优先使用独立的 route factory、page wrapper 和 layout，不要在同一个页面组件里通过 `presentation === 'admin'`、`mode === 'admin'` 等分支同时承载后台和前台的页面外壳。

可以复用无视觉副作用的能力，例如 API hook、query key、纯数据转换、表单 schema、无样式业务组件或明确设计为跨端复用的基础组件。页面头部、导航、容器边距、表格密度、按钮区、详情布局、空状态和局部 CSS class 等视觉结构应留在各自路由侧封装，避免后台改动影响前台入口。

如果确实需要把某段 UI 抽成共享组件，先把它设计成无路由立场的业务片段，并通过 props 接收必要数据；不要让共享组件内部感知 admin route，也不要把后台专属样式写进前台路由会使用的通用布局或常量里。改动后台样式时，默认验证 `/admin/**`，同时抽查对应前台入口没有被牵连；只有明确修改共享底座时，才同时调整并验证两侧。

## 页面 Layout

`ModuleLayout` 是共享给 web module 页面使用的轻量内容容器，只负责通用背景、最外层边距和 `data-slot="module-layout"`；如需要进一步收口内容宽度、分区和语义 slot 时，在 domain 自己的 `src/layouts/` 或 `src/components/layouts/` 下封装 `PageLayout`。

```tsx
// domain/base/src/web/src/components/layouts/module-layout/module-layout.tsx
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '#/lib/utils.ts'

export type ModuleLayoutProps = ComponentPropsWithoutRef<'div'>

export function ModuleLayout({
  children,
  className,
  ...props
}: ModuleLayoutProps) {
  return (
    <div
      {...props}
      data-slot="module-layout"
      className={cn('min-h-full bg-background px-4 py-5 sm:px-6 lg:px-8', className)}
    >
      {children}
    </div>
  )
}
```

Domain 普通页面默认封装自己的 `PageLayout`，内部复用 `ModuleLayout`，让共享底座和 domain 个性化结构职责分开。页面组件只消费本 domain 的 `PageLayout`，不要每个页面重复写 `ModuleLayout`、`mx-auto`、`max-w` 等外壳结构。

`ModuleLayout` 通过 base package 根出口导出，domain 侧按当前真实包名导入。

```tsx
// domain/catalog/src/web/src/layouts/page-layout/index.tsx
import type { ComponentPropsWithoutRef } from 'react'
import { ModuleLayout, cn } from '@example-app/web-base'

export interface PageLayoutProps extends ComponentPropsWithoutRef<'div'> {
  layoutClassName?: string
}

export function PageLayout({
  children,
  className,
  layoutClassName,
  ...props
}: PageLayoutProps) {
  return (
    <ModuleLayout className={layoutClassName}>
      <div
        {...props}
        data-slot="catalog-page-layout"
        className={cn('mx-auto w-full max-w-[1280px]', className)}
      >
        {children}
      </div>
    </ModuleLayout>
  )
}
```

产品体验完全不同的页面可以在 domain 内写独立 layout；不要导入 `AppLayout` 来包业务页面，也不要把 domain 分类逻辑上移到 app route resolver 里。
