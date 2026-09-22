# Plot Web Routing 与 Layout

Plot Web 基于 TanStack Router **code-based routing**。按资深 TanStack 用户的 type-first、idiomatic 风格实现，充分使用 route tree 类型推导、route factory、`head`、`beforeLoad` 和 lazy preload。

## 路由模型

```text
Plot            生成 webModules
feature domain  createWebDomain(id).addRoute(outlet, factory).addCapability(...)
base            定义 outlet 契约并提供 createWebRouter
app             创建 Root Route、真实 layout outlet、app-owned routes 和最终 Router
```

默认业务页面挂 `app`；不使用 AppLayout 的 login、register、callback 挂 `root`。只有跨多个 domain 共用独立 layout/guard 时才新增 outlet。

## Plot 标准模板：App Router

以下结构来自当前 Plot Web 模板。替换包名、标题、layout 和 app-owned routes；不要改写组装协议。

```tsx
import { HeadContent, createRootRoute, createRoute } from "@tanstack/react-router"
import { NotFoundError, createWebRouter } from "@scope/web-base"

import { AppLayout } from "#/components/layouts/app-layout/index.ts"
import { AppHomePage } from "#/features/home/page.tsx"
import { webModules } from "#/generated/modules.gen.ts"

const rootRoute = createRootRoute({
  shellComponent: ({ children }) => (
    <>
      <HeadContent />
      {children}
    </>
  ),
  notFoundComponent: NotFoundError,
})

const webRouter = createWebRouter({
  rootRoute,
  domains: webModules,
  rootOutlets: {
    app: createRoute({
      getParentRoute: () => rootRoute,
      id: "app",
      component: AppLayout,
    }),
  },
  routes: ({ app }) => {
    const homeRoute = createRoute({
      getParentRoute: () => app,
      path: "/",
      component: AppHomePage,
    })

    return { app: [homeRoute] }
  },
})

export const { outlets, webDomains, routeTree, router } = webRouter

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
```

`createWebRouter` 已提供模板默认项（通常为 intent preload、零 preload stale time、scroll restoration）；项目确需覆盖时使用 `router` option。

## Root Metadata 与 RootError

### Metadata 放置

```text
固定站点 title/description       → rootRoute.head
需要随语言实时切换               → RootShell 读取 i18n，并渲染 title/meta
页面专属 title/description       → 对应 route.head
favicon、manifest 等固定 links   → rootRoute.head
```

实现时遵循两点：

- `HeadContent` 必须保留，用于渲染 route tree 的 `head`；放在 RootShell 的默认 title/meta 之后，让页面级 metadata 生效。
- title 与 description 只维护一份消息源。启用语言切换时由 RootShell 读取共享 language store；模式见 [i18n.md](i18n.md)。

### `index.html` 去重

采用 RootShell 或 route `head` 后，同一个 head 项只能有一个 owner。检查 app module 的 `index.html` 并移除已经交给 Router 的内容：

```text
Router 已提供 title                    → 移除 index.html 的 <title>
Router 已提供 description              → 移除同名 <meta name="description">
Router 已提供 favicon / manifest       → 移除对应的重复 <link>
Router 已提供 Open Graph 等 metadata    → 按 name/property 移除重复项
```

保留浏览器启动和运行时需要的静态内容，例如 `charset`、`viewport`、vRPC 地址等运行时配置 meta，以及没有交给 Router 管理的 link/script。不要为了 metadata 把 `index.html` 的整个 `<head>` 清空。

### 项目参考模板：可切换语言的 RootShell

```tsx
import type { ReactNode } from "react"
import { HeadContent, createRootRoute } from "@tanstack/react-router"
import { NotFound, RootError } from "@scope/web-base"

import { useTranslation } from "#/lib/i18n/index.ts"

function RootShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <>
      <title>{t.metadata.title}</title>
      <meta name="description" content={t.metadata.description} />
      <HeadContent />
      {children}
    </>
  )
}

const rootRoute = createRootRoute({
  shellComponent: RootShell,
  head: () => ({
    links: [
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  errorComponent: RootError,
  notFoundComponent: NotFound,
})
```

没有 i18n 时直接在 `rootRoute.head` 提供固定 metadata：

```tsx
const rootRoute = createRootRoute({
  head: () => ({
    meta: [
      { title: "Application" },
      { name: "description", content: "Application description." },
    ],
  }),
  errorComponent: RootError,
  notFoundComponent: NotFound,
})
```

页面有独立 metadata 时写在该 route 的 `head`，不要在 page 组件里用 Effect 修改 `document.title`：

```tsx
const aboutRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "about",
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About" },
      { name: "description", content: "About this application." },
    ],
  }),
})
```

### RootError 归属

RootError 放 Base，由 Base 公共入口导出；app root 只注册 `errorComponent: RootError`。它接收 TanStack Router 的 `ErrorComponentProps`，把稳定错误合同映射为用户状态页。`notFoundComponent` 单独处理 404，不混入异常分类。

### 项目参考模板：RootError

```tsx
import type { ErrorComponentProps } from "@tanstack/react-router"
import { isVrpcError } from "@yorun-ai/vrpc/client"

import { ErrorPage } from "../error-page/error-page.tsx"
import { ForbiddenPage } from "../forbidden/forbidden.tsx"
import { ServiceUnavailablePage } from "../service-unavailable/service-unavailable.tsx"

function isForbiddenError(error: unknown) {
  return isVrpcError(error) && error.kind === "invoke" && error.status === 403
}

function isServiceUnavailableError(error: unknown) {
  if (!isVrpcError(error)) return false

  if (error.kind === "protocol" || error.kind === "transport" || error.kind === "timeout") {
    return true
  }

  return error.kind === "invoke" && error.status >= 500 && error.status <= 599
}

export function RootError(props: ErrorComponentProps) {
  if (isForbiddenError(props.error)) return <ForbiddenPage />
  if (isServiceUnavailableError(props.error)) {
    return <ServiceUnavailablePage {...props} />
  }
  return <ErrorPage {...props} />
}
```

- 只按 generated/shared error contract 分类，不解析 message 文本。
- 403、transport/timeout、5xx 和未知错误使用不同用户页面；认证失效按项目 AuthGuard 合同处理。
- 用户页面不输出 stack、内部 RPC 细节或敏感字段；诊断信息只进入受控日志。
- 可恢复页面透传 `ErrorComponentProps`，重试按钮调用 `reset`；Forbidden 等无重试页面不必接收错误详情。

## Plot 标准模板：Domain Route

```tsx
import { Outlet, createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { createWebDomain } from "@scope/web-base"

const HomePage = lazyRouteComponent(
  () => import("#/features/home/page.tsx"),
  "HomePage",
)

export const webDomain = createWebDomain("catalog")
  .addRoute("app", (parentRoute) => {
    const domainRoute = createRoute({
      getParentRoute: () => parentRoute,
      path: "catalog",
      component: Outlet,
    })
    const homeRoute = createRoute({
      getParentRoute: () => domainRoute,
      path: "/",
      component: HomePage,
    })

    return domainRoute.addChildren([homeRoute])
  })
```

- Factory 接收 parent，返回**一棵** route tree；不要返回 sibling array。
- 不给整个 factory 标注 `AnyRoute` 返回类型，否则会擦除 path/params/search literal type。
- Domain root 默认使用 domain slug，子 route 使用相对 path。
- 多棵独立树重复 `.addRoute()`；有真实扩展能力时才 `.addCapability(key, value)`。

## Plot 标准模板：Standalone Register

每个 feature domain 保留此文件，供 domain 内 `Link`、navigate、params/search 独立 typecheck。它不从公共入口导出，app 也不导入它。

```tsx
import { createStandaloneWebDomainRouter } from "@scope/web-base"

import { webDomain } from "./web-domain.ts"

const router = createStandaloneWebDomainRouter(webDomain)

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
```

## Lazy Route

无需把 route state 转成 props时，直接把 `lazyRouteComponent` 交给 route，保留 intent preload。

必须转换 params/search 时使用同步薄 wrapper，并转发 preload。

### 项目参考模板：Params/Search Wrapper

```tsx
import { createRoute, lazyRouteComponent, type AnyRoute } from "@tanstack/react-router"
import { forwardComponentPreload } from "@scope/web-base"

const DetailPage = lazyRouteComponent(
  () => import("#/features/detail/page.tsx"),
  "DetailPage",
)

export function createDetailRoute(parentRoute: AnyRoute) {
  function DetailRouteComponent() {
    const { itemId } = detailRoute.useParams()
    const { tab } = detailRoute.useSearch()
    return <DetailPage itemId={itemId} initialTab={tab} />
  }

  const detailRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: "$itemId",
    component: forwardComponentPreload(DetailRouteComponent, DetailPage),
  })

  return detailRoute
}
```

保持同步：`path`、`validateSearch`、`beforeLoad` 和通常的 `loader`。不要 lazy `main.tsx`、`router.tsx`、Root Route、layout outlet 或 domain factory。

## Outlet 与 Layout

```text
只在一个 domain 内复用 layout  → domain 内建立父 route + layout
跨多个 domain 共用 layout/guard → Base 注册 outlet + app 创建真实 outlet route
```

新增 outlet 必须同步：Base outlet 契约、app `rootOutlets`、app-owned routes、domain `.addRoute()`、standalone/router 类型测试。

```text
AppLayout（app）      最终应用 shell
ModuleLayout（base）  跨 domain 共享页面底座
PageLayout（domain）  domain 内容宽度与结构
page.tsx              只消费本 domain PageLayout
```

### 项目参考模板：PageLayout

```tsx
import type { ComponentPropsWithoutRef } from "react"
import { ModuleLayout, cn } from "@scope/web-base"

export interface PageLayoutProps extends ComponentPropsWithoutRef<"div"> {
  layoutClassName?: string
}

export function PageLayout({ children, className, layoutClassName, ...props }: PageLayoutProps) {
  return (
    <ModuleLayout className={layoutClassName}>
      <div {...props} className={cn("mx-auto w-full max-w-[1280px]", className)}>
        {children}
      </div>
    </ModuleLayout>
  )
}
```

## DO / NOT

| DO | NOT |
| --- | --- |
| `main.tsx` 只挂 Provider、样式和 RouterProvider | 在 `main.tsx` 实现业务或注册 domain |
| `router.tsx` 只组装 root/outlet/app routes | 让 app 感知并分别挂载具体 domain |
| Route factory 返回一棵 typed tree | 返回 sibling array 或擦除具体返回类型 |
| Wrapper 使用 factory 内 route 的 hooks | 硬编码完整 `from` route id |
| 使用 `forwardComponentPreload` | `Object.assign(Component, { preload })` |
| Domain 使用自己的 PageLayout | Domain 导入 app 的 AppLayout |
| Guard 放在覆盖页面组的最近公共父 route | 仅隐藏导航代替权限校验 |
