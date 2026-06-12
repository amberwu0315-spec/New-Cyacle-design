# Web 端代码姿势与案例

本文件只放代码姿势。实际包名、domain 名、skel service 名和 method meta export 名以项目检测结果为准。

## 代码变更
严禁修改`app/src/web` 中的代码，它只负责最终汇总和暴露。`domain/app/src/web` 中的代码才是其他子domain依赖的共享 app 代码。

## 约定与命名

命名规则：`@example-app/*` 是中性示例包名；`@example-app/web-app` 表示共享 app Web 包占位，真实项目以 `domain/app/src/web/package.json` 的 `name` 和 `exports` 为准。

---

## React 性能写法

组件内传给 JSX 属性或子组件的事件处理器、回调函数，默认使用 `React.useCallback` 定义稳定引用，并写全依赖；不要在组件体内直接声明 `function handleXxx()` 后再传给 `onClick`、`onChange` 等 props。只有不传给 JSX/子组件、也不会被依赖比较消费的纯局部函数，才可以保持普通函数。

```tsx
// 不推荐：每次 render 都重新创建并传给 JSX prop
function AccountPopover() {
  const navigate = useNavigate()

  function handleLogoutClick() {
    void navigate({ to: crossDomainRoutePaths.uic.login })
  }

  return <Button onClick={handleLogoutClick}>退出登录</Button>
}

// 推荐：传给 JSX prop 的 handler 使用稳定引用
function AccountPopover() {
  const navigate = useNavigate()
  const handleLogoutClick = React.useCallback(() => {
    void navigate({ to: crossDomainRoutePaths.uic.login })
  }, [navigate])

  return <Button onClick={handleLogoutClick}>退出登录</Button>
}
```

---

## Lazy Route 写法

路由文件默认只保留路由注册、`path`、`loader`、`beforeLoad`、search 校验等匹配和加载所需的关键配置；页面组件从 `features/*/page.tsx` 通过 TanStack Router 的 `lazyRouteComponent` 按需加载。不要在 route 文件里静态 import 页面组件，除非该页面非常轻且确认需要进入首包。

```tsx
import type { AnyRoute } from '@tanstack/react-router'
import { createRoute, lazyRouteComponent } from '@tanstack/react-router'

const LoginPage = lazyRouteComponent(
  () => import('../features/login/page'),
  'LoginPage',
)

type LoginRouteDeps = {
  RootRoute: AnyRoute
}

export function createLoginRouteBranches({ RootRoute }: LoginRouteDeps) {
  return createRoute({
    getParentRoute: () => RootRoute,
    path: 'uic/login',
    component: LoginPage,
  })
}
```

同一个页面模块导出多个 route component 时，每个 route 单独声明对应的 lazy component：

```tsx
const UserAgreementPage = lazyRouteComponent(
  () => import('../features/terms/page'),
  'UserAgreementPage',
)
const PrivacyPolicyPage = lazyRouteComponent(
  () => import('../features/terms/page'),
  'PrivacyPolicyPage',
)
```

不要 lazy app 壳子本身：`RootComponent`、`AppLayoutRoute`、`AppLayout`、`createDomainRouteTree()` 和 domain route branch factory 保持同步。它们负责应用骨架、路由注册、slot 挂载和 nav meta 聚合；把这些改成异步会让 `createAppRouter([...])` 协议变复杂，收益也不明显。

当前 app router 已配置 `defaultPreload: 'intent'`，`lazyRouteComponent` 会暴露 preload 能力；用户 hover/focus 链接时 TanStack Router 可以提前加载目标页面 chunk。只有当某个 route 需要把 `component`、`pendingComponent`、`errorComponent` 等非关键配置拆成独立 lazy route 文件时，才考虑 TanStack Router 的 code-based `.lazy(() => import('./xxx.lazy').then((d) => d.Route))` 写法；使用这种写法前先固定 route id，避免 lazy route id 和主 route 不一致。

---

## Shell Layout 结构

本节只定义最小代码姿势：app 自身路由区分有/无 layout；feature domain 通过 `createDomainRouteTree()` 接入自己的 route tree。当前 plot 默认模板生成的 `{ RootRoute }` route factory 仍被 app 侧兼容，默认挂到 app layout 下，只负责路由注册；需要 nav、login/register 无 layout route、或其它 shell meta 时，升级为 `defineDomainRouteTree(...)`。

| 场景 | 默认写法 |
| --- | --- |
| 全局 provider、Toaster、QueryClient 等基础设施 | `root-layout.tsx` |
| app 自己需要统一页面框架的路由 | 挂到 `AppLayout` 分支 |
| app 自己不需要页面框架的路由 | 直接挂 RootRoute |
| 普通 business domain route tree | `routes: [...]`，挂到 app layout 下 |
| 特殊无 layout domain route | `routes: { root: [...] }`，直接挂 RootRoute |
| 普通页面内容区 | 页面包 `AppPage`；domain 可自定义 `DomainPage` |
| domain route tree 扩展信息 | `metas?: TMetas`，当前 app 消费函数式 `metas.nav` |

---

### App 层目录与 layout 组织

`root-layout.tsx` 保持作为 RootRoute component，只承载全局 provider、Toaster 等基础设施，不参与业务页面结构。App layout 与页面容器统一放在 `src/components/layouts/` 下：

```text
domain/app/src/web/src/
├── root-layout.tsx                        ← RootRoute component，全局 provider + Outlet
└── components/
    └── layouts/
        ├── app-layout/                    ← app 自身有 layout 路由使用；domain 可按需导入
        │   └── index.tsx
        └── app-page/                      ← 共享页面内容区容器，供 app/domain 页面直接包裹
            └── index.tsx
```

---

### App 路由：app 自身分有/无 layout，domain 通过 slot 接入

App 自身路由分两类：login、register、SSO、独立落地页等不需要 layout 的路由直接挂 RootRoute；help、settings 等需要 app 统一页面框架的路由挂 `AppLayoutRoute`。feature domain 的 `routes.root` 直接挂 RootRoute，`routes.layout` 和 `routes: [...]` 挂 `AppLayoutRoute`。

```tsx
// domain/app/src/web/src/routes/index.tsx
import { createRootRoute } from '@tanstack/react-router'
import { RootLayout } from '../root-layout'
import { createAppLayoutRoute } from './app-layout-route'
import { createHomeRouteTree } from './home-route'
import {
  getDomainRouteBranchFactories,
  resolveDomainRoutes,
  type DomainRouteTreeCollection,
} from './helpers/domain-route-tree'

export function createAppRouteTree(domainRouteTrees: DomainRouteTreeCollection) {
  const { routeTrees } = domainRouteTrees
  const RootRoute = createRootRoute({ component: RootLayout })
  const AppLayoutRoute = createAppLayoutRoute({ RootRoute, routeTrees })
  const rootDomainRoutes = resolveDomainRoutes(
    RootRoute,
    routeTrees.flatMap((routeTree) => getDomainRouteBranchFactories(routeTree, 'root')),
  )
  const layoutDomainRoutes = resolveDomainRoutes(
    AppLayoutRoute,
    routeTrees.flatMap((routeTree) => getDomainRouteBranchFactories(routeTree, 'layout')),
  )

  return RootRoute.addChildren([
    ...rootDomainRoutes,
    AppLayoutRoute.addChildren([createHomeRouteTree({ RootRoute: AppLayoutRoute }), ...layoutDomainRoutes]),
  ])
}
```

`AppLayout` 承载 app 自己页面和 layout slot 下 domain 页面使用的统一框架。当前 app 的左侧导航由内置 nav 和 domain 函数式 `metas.nav` 聚合而来，app 会按当前语言调用 `nav({ language })`。

```tsx
// domain/app/src/web/src/components/layouts/app-layout/index.tsx
import { Outlet } from '@tanstack/react-router'

export function AppLayout() {
  return (
    <div data-slot="app-layout" className="min-h-screen bg-background text-foreground">
      <header data-slot="app-layout-header" className="border-b px-6 py-3">
        <div className="text-sm font-medium">App</div>
      </header>
      <main data-slot="app-layout-main">
        <Outlet />
      </main>
      <footer data-slot="app-layout-footer" className="border-t px-6 py-3 text-xs text-muted-foreground">
        Yorun
      </footer>
    </div>
  )
}
```

`AppPage` 是共享页面内容区容器。页面尽量不要裸跑；app 页面和 business domain 页面优先包 `AppPage`，需要不同体验时再创建 domain 自己的 `DomainPage`。

```tsx
// domain/app/src/web/src/components/layouts/app-page/index.tsx
import type { HTMLAttributes } from 'react'
import { cn } from '../../../lib/utils'

export function AppPage({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="app-page" className={cn('p-6', className)} {...props}>
      {children}
    </div>
  )
}
```

通过统一的 `./components/layouts` export 导出：

```ts
// domain/app/src/web/src/components/layouts/index.ts
export { AppLayout } from './app-layout'
export { AppPage } from './app-page'
```

---

### Business domain：默认模板与高级声明

Business domain 对外只导出 `createDomainRouteTree()`。默认模板可以继续使用 `{ RootRoute }` factory，只注册路由并默认挂到 app layout 下。高级场景改为返回 `defineDomainRouteTree(...)`：`routes: [...]` 会挂到 app layout 下，`{ root, layout }` 可同时声明无 layout 路由和带 app layout/nav 的业务路由。每个普通页面通过 `AppPage` 或 domain 自己的 `DomainPage` 收口内容区。

```text
domain/catalog/src/web/src/
└── components/
    └── layouts/
        └── catalog-page/        ← 可选：需要自定义 page 容器时创建
            └── index.tsx
```

默认模板只注册路由：

```tsx
// domain/catalog/src/web/src/routes/index.tsx
import type { AnyRoute } from '@tanstack/react-router'
import { Outlet, createRoute } from '@tanstack/react-router'

import { createHomeRouteTree } from './home-route'

export function createDomainRouteTree({ RootRoute }: { RootRoute: AnyRoute }): AnyRoute[] {
  const domainRoute = createRoute({
    getParentRoute: () => RootRoute,
    path: 'catalog',
    component: Outlet,
  })

  const homeRoute = createHomeRouteTree({ domainRoute })

  return [domainRoute.addChildren([homeRoute])]
}
```

高级写法可注册 app nav 和 layout/root slot：

```tsx
// domain/catalog/src/web/src/routes/index.tsx
import { defineDomainRouteTree } from '@example-app/web-app'
import type { DomainNavMetaFactory } from '@example-app/web-app'
import type { AnyRoute } from '@tanstack/react-router'
import { Outlet, createRoute } from '@tanstack/react-router'
import { Boxes } from 'lucide-react'

import { createHomeRouteTree } from './home-route'
import { createReportsRouteTree } from './reports-route'
import { getCatalogMessages } from '../lib/i18n'

function createCatalogRouteBranches({ RootRoute }: { RootRoute: AnyRoute }): AnyRoute[] {
  const domainRoute = createRoute({
    getParentRoute: () => RootRoute,
    path: 'catalog',
    component: Outlet,
  })

  return [
    domainRoute.addChildren([
      createHomeRouteTree({ domainRoute }),
      createReportsRouteTree({ domainRoute }),
    ]),
  ]
}

const createCatalogNavMeta: DomainNavMetaFactory = ({ language }) => {
  const t = getCatalogMessages(language)

  return {
    label: t.common.nav.label,
    desc: t.common.nav.desc,
    icon: Boxes,
    defaultTo: '/catalog',
    groups: [
      {
        id: 'catalog-main',
        title: t.common.nav.groupTitle,
        items: [
          {
            id: 'catalog-home',
            label: t.common.nav.homeLabel,
            desc: t.common.nav.homeDesc,
            to: '/catalog',
            icon: Boxes,
          },
        ],
      },
    ],
  }
}

export function createDomainRouteTree() {
  return defineDomainRouteTree({
    routes: [createCatalogRouteBranches],
    metas: {
      nav: createCatalogNavMeta,
    },
  })
}
```

需要特殊无 layout 路由时使用 slot 写法：

```tsx
import { defineDomainRouteSlots, defineDomainRouteTree } from '@example-app/web-app'

export function createDomainRouteTree() {
  return defineDomainRouteTree({
    routes: defineDomainRouteSlots({
      root: [createLoginRouteBranches, createRegisterRouteBranches],
      layout: [createAuthRouteBranches],
    }),
  })
}
```

普通页面用 `AppPage`（或自定义的 `CatalogPage`）包裹内容：

```tsx
// domain/catalog/src/web/src/features/reports/page.tsx
import { AppPage } from '@example-app/web-app/components/layouts'
import { useReportsPage } from './hooks/use-reports-page'

export function ReportsPage() {
  const page = useReportsPage()

  return (
    <AppPage>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Reports</h1>
        {/* ... */}
      </div>
    </AppPage>
  )
}
```

Domain 有自定义 page 容器需求时，在自身的 `src/components/layouts/` 创建域名命名的组件，只替换页面中的 import 来源：

```tsx
// domain/catalog/src/web/src/components/layouts/catalog-page/index.tsx
import type { HTMLAttributes } from 'react'
import { AppPage } from '@example-app/web-app/components/layouts'

export function CatalogPage({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <AppPage {...props}>{children}</AppPage>
}
```

### 复用或定制共享 layout

Domain 需要和 app domain 一样的共享页面结构时，从 app package 导入 `AppLayout` 或 `AppPage` 使用；如果产品体验不同，就在 domain 自己的 `src/components/layouts/` 下定制。不要把这种选择上移成 app route resolver 的 domain 分类逻辑。

```tsx
// domain/auth/src/web/src/components/layouts/auth-page/index.tsx
import type { ReactNode } from 'react'

export function AuthPage({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen px-6 py-10">
      {children}
    </main>
  )
}
```


**规则**
- Layout 组件统一放 `src/components/layouts/`，不平铺在 src 顶层
- `root-layout.tsx` 只作 RootRoute component（provider + Outlet）
- app 自身路由分有/无 layout；有 layout 路由挂 `AppLayout`，无 layout 路由直接挂 RootRoute
- 普通 business domain 默认使用 `routes: [...]`，挂到 app layout 下并可配合函数式 `metas.nav`
- login、register、SSO callback 等特殊页面使用 `routes.root`，直接接入 RootRoute
- 页面尽量不要裸跑；普通页面通过 `AppPage` / `DomainPage` 收口内容区
- Domain 需要不同页面容器时在自身 `src/components/layouts/` 定制

---

## CSS 链路

最终入口只汇总各 domain 的 globals，业务样式生成由被导入的 domain globals 负责。

```css
/* app/src/web/src/styles.css */
@import "@example-app/web-app/globals.css";
@import "@example-app/web-catalog/globals.css";
```

共享 app globals 承载 Tailwind、shadcn、字体、主题 token 和 app shell 源码覆盖。

```css
/* domain/app/src/web/src/styles/globals.css */
@import "tailwindcss";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/geist";

@source "../**/*.{ts,tsx}";

/* ... */
```

业务 domain globals 只覆盖本 domain 源码，不创建独立主题系统。

```css
/* domain/catalog/src/web/src/styles/globals.css */
@source "../**/*.{ts,tsx}";
```

业务 package 需要导出 globals，最终入口缺少 import 时优先同步 app。

```json
{
  "name": "@example-app/web-catalog",
  "exports": {
    ".": "./src/index.ts",
    "./globals.css": "./src/styles/globals.css",
    "./pub": "./src/pub/index.ts"
  }
}
```

---

## 路由链路

用户可见业务页面优先创建 lazy route：基础 route 只放 `path`、`getParentRoute`、`loader`、`beforeLoad` 和 search 参数等关键配置，页面组件放 `.lazy.tsx`。

最终 ship module 只接收各 domain 的 route factory，不承载业务页面。

```tsx
// app/src/web/src/main.tsx
import { createAppRouter, mountApp } from '@example-app/web-app'
import { createDomainRouteTree as createCatalogRouteTree } from '@example-app/web-catalog'

import './styles.css'

const router = createAppRouter([createCatalogRouteTree])

mountApp(document.getElementById('app')!, router)
```

App 级路由只放全局页面、shell 页面或公共入口；用户可见页面同样优先 lazy。

```tsx
// domain/app/src/web/src/routes/help-route.ts
import type { AnyRoute } from '@tanstack/react-router'
import { createRoute } from '@tanstack/react-router'

export function createHelpRouteTree({ RootRoute }: { RootRoute: AnyRoute }) {
  return createRoute({
    getParentRoute: () => RootRoute,
    path: 'help',
  }).lazy(() => import('./help-route.lazy').then((d) => d.Route))
}
```

```tsx
// domain/app/src/web/src/routes/help-route.lazy.tsx
import { createLazyRoute } from '@tanstack/react-router'

import { HelpPage } from '../features/help/page'

export const Route = createLazyRoute('/help')({
  component: HelpPage,
})
```

App route tree 在 shell 层组装 app 级 route、domain root slot 和 domain layout slot。

```tsx
// domain/app/src/web/src/routes/index.tsx
import { createRootRoute } from '@tanstack/react-router'

import { RootComponent } from '../root-layout'
import { createAppLayoutRoute } from './app-layout-route'
import { createHomeRouteTree } from './home-route'
import {
  getDomainRouteBranchFactories,
  resolveDomainRoutes,
  type DomainRouteTreeCollection,
} from './helpers/domain-route-tree'

export function createAppRouteTree(domainRouteTrees: DomainRouteTreeCollection) {
  const { routeTrees } = domainRouteTrees
  const RootRoute = createRootRoute({ component: RootComponent })
  const AppLayoutRoute = createAppLayoutRoute({ RootRoute, routeTrees })
  const rootDomainRoutes = resolveDomainRoutes(
    RootRoute,
    routeTrees.flatMap((routeTree) => getDomainRouteBranchFactories(routeTree, 'root')),
  )
  const layoutDomainRoutes = resolveDomainRoutes(
    AppLayoutRoute,
    routeTrees.flatMap((routeTree) => getDomainRouteBranchFactories(routeTree, 'layout')),
  )

  return RootRoute.addChildren([
    ...rootDomainRoutes,
    AppLayoutRoute.addChildren([createHomeRouteTree({ RootRoute: AppLayoutRoute }), ...layoutDomainRoutes]),
  ])
}
```

Domain 默认路由以领域名称开始，domain root 可同步承载 `Outlet`，子页面挂在 domain root 下并优先 lazy。公开的 `createDomainRouteTree()` 返回声明对象，内部 route branch factory 才接收 app 传入的 `RootRoute`。

```tsx
// domain/catalog/src/web/src/routes/index.tsx
import { defineDomainRouteTree } from '@example-app/web-app'
import type { AnyRoute } from '@tanstack/react-router'
import { Outlet, createRoute } from '@tanstack/react-router'

import { createHomeRouteTree } from './home-route'
import { createReportsRouteTree } from './reports-route'

function createCatalogRouteBranches({ RootRoute }: { RootRoute: AnyRoute }): AnyRoute[] {
  const domainRoute = createRoute({
    getParentRoute: () => RootRoute,
    path: 'catalog',
    component: Outlet,
  })

  return [
    domainRoute.addChildren([
      createHomeRouteTree({ domainRoute }),
      createReportsRouteTree({ domainRoute }),
    ]),
  ]
}

export function createDomainRouteTree() {
  return defineDomainRouteTree({
    routes: [createCatalogRouteBranches],
  })
}
```

Domain 子路由使用相对 path，`reports` 最终成为 `/catalog/reports`；页面组件放 lazy 文件。

```tsx
// domain/catalog/src/web/src/routes/reports-route.ts
import type { AnyRoute } from '@tanstack/react-router'
import { createRoute } from '@tanstack/react-router'

export function createReportsRouteTree({ domainRoute }: { domainRoute: AnyRoute }) {
  return createRoute({
    getParentRoute: () => domainRoute,
    path: 'reports',
  }).lazy(() => import('./reports-route.lazy').then((d) => d.Route))
}
```

```tsx
// domain/catalog/src/web/src/routes/reports-route.lazy.tsx
import { createLazyRoute } from '@tanstack/react-router'

import { ReportsPage } from '../features/reports/page'

export const Route = createLazyRoute('/catalog/reports')({
  component: ReportsPage,
})
```

若项目使用 file-based route，则沿用项目约定创建 `.lazy.tsx`，并用 `createLazyFileRoute` 替代 `createLazyRoute`。

自定义顶层路由只在产品合同明确需要时创建，并先检查与其它 domain 的 path 冲突。

```tsx
// 非必要不要这样做：它会跳过 /catalog 前缀并占用全局 path。
const publicCatalogRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: 'products',
}).lazy(() => import('./public-products-route.lazy').then((d) => d.Route))
```

---

## Feature 拆分

非平凡页面的 `page.tsx` 只做组合，功能代码留在同 feature 子文件中。

```text
features/home/
├── page.tsx
├── queries.ts
├── components/
│   ├── home-error-state.tsx
│   ├── home-overview.tsx
│   └── home-page-skeleton.tsx
├── dialogs/
│   └── create-task-dialog.tsx
└── hooks/
    ├── use-home-page.ts
    └── use-home-task-filters.ts
```

`page.tsx` 消费 `useHomePage()` 和组合组件，不直接写 query、dialog 实现或复杂 JSX 区块。

```tsx
// domain/catalog/src/web/src/features/home/page.tsx
import { CreateTaskDialog } from './dialogs/create-task-dialog'
import { HomeErrorState } from './components/home-error-state'
import { HomeOverview } from './components/home-overview'
import { HomePageSkeleton } from './components/home-page-skeleton'
import { useHomePage } from './hooks/use-home-page'

export function HomePage() {
  const page = useHomePage()

  if (page.overview.isLoading) return <HomePageSkeleton />
  if (page.overview.isError) return <HomeErrorState onRetry={page.retryOverview} />

  return (
    <>
      <HomeOverview
        filters={page.filters}
        metrics={page.overview.data.metrics}
        tasks={page.visibleTasks}
      />
      <CreateTaskDialog projectId={page.overview.data.projectId} />
    </>
  )
}
```

`useXxxPage()` 推荐作为页面编排 hook，组合其它 hooks 和页面级 logic。

```ts
// domain/catalog/src/web/src/features/home/hooks/use-home-page.ts
import { useMemo } from 'react'

import { useHomeOverview } from '../queries'
import { useHomeTaskFilters } from './use-home-task-filters'

export function useHomePage() {
  const overview = useHomeOverview()
  const filters = useHomeTaskFilters()

  const visibleTasks = useMemo(() => {
    const tasks = overview.data?.tasks ?? []

    if (filters.status === 'all') return tasks
    return tasks.filter((task) => task.status === filters.status)
  }, [filters.status, overview.data?.tasks])

  return {
    filters,
    overview,
    retryOverview: overview.refetch,
    visibleTasks,
  }
}
```

Focused hooks 按关注点拆分，默认放在 `hooks/`。

```ts
// domain/catalog/src/web/src/features/home/hooks/use-home-task-filters.ts
import { useMemo, useState } from 'react'

type TaskStatus = 'all' | 'open' | 'done'

export function useHomeTaskFilters() {
  const [status, setStatus] = useState<TaskStatus>('all')
  const activeFilterCount = useMemo(() => (status === 'all' ? 0 : 1), [status])

  return { activeFilterCount, setStatus, status }
}
```

`useHomePage()` 可以组合 hooks 和页面级 logic；server state 仍放 `queries.ts`，dialog、schema 和复杂计算仍拆到对应文件。

仅本领域复用的组合组件可以放在 domain-local `components/`；feature 私有组件留在 `features/<feature>/components/`。

```tsx
// domain/catalog/src/web/src/components/catalog-status-badge.tsx
import { Badge } from '@example-app/web-app/components/ui/badge'

type CatalogStatusBadgeProps = {
  status: 'active' | 'archived'
}

export function CatalogStatusBadge({ status }: CatalogStatusBadgeProps) {
  return <Badge variant={status === 'active' ? 'default' : 'secondary'}>{status}</Badge>
}
```

Query hooks 放到 `queries.ts`，保持 server state 入口稳定。

```ts
// domain/catalog/src/web/src/features/home/queries.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { vrpcClient } from '@example-app/web-app'
import { createCatalogHomeService, catalogHomeServiceMeta } from '@example-app/skeled-catalog'

const homeService = createCatalogHomeService(vrpcClient)
const overviewMeta = catalogHomeServiceMeta.methods.getOverview
const createTaskMeta = catalogHomeServiceMeta.methods.createTask

export const homeKeys = {
  overview: () => [overviewMeta.serviceName, overviewMeta.methodName] as const,
}

export function useHomeOverview() {
  return useQuery({
    queryKey: homeKeys.overview(),
    queryFn: () => homeService.getOverview(),
  })
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [createTaskMeta.serviceName, createTaskMeta.methodName, projectId],
    mutationFn: () => homeService.createTask({ projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homeKeys.overview() })
    },
  })
}
```

推荐使用 skel service 导出的 `serviceName` 和 `methodName` 组成 query key；不要为了 key 新建 `api.ts`。

Dialog 组件放到 `dialogs/`，只暴露页面需要的 props。

```tsx
// domain/catalog/src/web/src/features/home/dialogs/create-task-dialog.tsx
import { Button } from '@example-app/web-app/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@example-app/web-app/components/ui/dialog'

import { useCreateTask } from '../queries'

export function CreateTaskDialog({ projectId }: { projectId: string }) {
  const createTask = useCreateTask(projectId)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>New task</Button>
      </DialogTrigger>
      <DialogContent>
        <Button disabled={createTask.isPending}>Create</Button>
      </DialogContent>
    </Dialog>
  )
}
```

---

## pub 导出

`pub` 是 domain 对其它领域暴露的稳定 Web 能力，不放本领域私有页面状态。

```tsx
// domain/catalog/src/web/src/pub/index.ts
export { ProductNameLink } from '../features/product/components/product-name-link'
export type { ProductNameLinkProps } from '../features/product/components/product-name-link'
```

其它领域通过 package 的 `./pub` export 引用，不相对引用源码。

```tsx
import { ProductNameLink } from '@example-app/web-catalog/pub'

export function InventoryProductCell({ productId }: { productId: string }) {
  return <ProductNameLink productId={productId} />
}
```

pub 只内聚内置功能，跨领域互相 import 前先检查循环依赖。

```text
允许：inventory -> catalog/pub
避免：inventory -> catalog/pub -> inventory/pub
```

---

## 接口调用

业务 API 推荐放在 feature-local `queries.ts` 中，使用 React Query 管 server state。

```ts
// domain/catalog/src/web/src/features/reports/queries.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { vrpcClient } from '@example-app/web-app'
import { createCatalogReportService, catalogReportServiceMeta } from '@example-app/skeled-catalog'

const catalogReportService = createCatalogReportService(vrpcClient)
const reportMethods = catalogReportServiceMeta.methods
const listReportsMeta = reportMethods.list
const archiveReportMeta = reportMethods.archive

// 推荐使用 skel service 导出的 serviceName 和 methodName 组成 query key。

type ReportFilters = {
  status?: string
}

export const catalogReportKeys = {
  listRoot: () => [listReportsMeta.serviceName, listReportsMeta.methodName] as const,
  list: (filters: ReportFilters) => [
    ...catalogReportKeys.listRoot(),
    filters,
  ] as const,
}

export function useCatalogReports(filters: ReportFilters) {
  return useQuery({
    queryKey: catalogReportKeys.list(filters),
    queryFn: () => catalogReportService.list(filters),
  })
}

export function useArchiveCatalogReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [archiveReportMeta.serviceName, archiveReportMeta.methodName],
    mutationFn: (id: string) => catalogReportService.archive({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogReportKeys.listRoot() })
    },
  })
}
```

页面只消费 hook 结果和触发 mutation，不直接拼 RPC 请求。

```tsx
// domain/catalog/src/web/src/features/reports/page.tsx
import { Button } from '@example-app/web-app/components/ui/button'

import { useArchiveCatalogReport, useCatalogReports } from './queries'

export function ReportsPage() {
  const reports = useCatalogReports({ status: 'active' })
  const archiveReport = useArchiveCatalogReport()

  if (reports.isLoading) return <div>Loading...</div>
  if (reports.isError) return <div>Failed to load reports.</div>

  return reports.data?.map((report) => (
    <Button
      key={report.id}
      disabled={archiveReport.isPending}
      onClick={() => archiveReport.mutate(report.id)}
    >
      Archive
    </Button>
  ))
}
```
