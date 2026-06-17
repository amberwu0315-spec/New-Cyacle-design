# Web 端代码姿势与案例

本文件只放代码姿势。实际包名、domain 名和 skel service 名以项目检测结果为准。

## 本地开发测试账号

- 开发测试域名：http://localhost:7088（前后端一体，无需访问 vite 服务）
- 开发环境测试账号：`dev-01` / `tanheng666!`

## 代码变更
`app/src/web` 是最终运行入口，也是本项目的 app 层；可以在这里开发项目自己的 router、shell layout、首页/帮助页等 app 级路由、入口级配置和最终应用专属页面。跨 domain 复用的共享组件、共享 lib、基础 layout 和 route helper 仍放 `domain/base/src/web`；feature domain 的业务页面、局部组件和领域路由仍放各自 `domain/<domain>/src/web`。

## 约定与命名

命名规则：`@example-app/*` 是中性示例包名；`@example-app/web-base` 表示共享 app Web 包占位，真实项目以 `domain/base/src/web/package.json` 的 `name` 和 `exports` 为准。

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
  parentRoute: AnyRoute
}

export function createLoginRouteBranches({ parentRoute }: LoginRouteDeps) {
  return createRoute({
    getParentRoute: () => parentRoute,
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

不要 lazy app 壳子本身：`main.tsx`、`router.ts`、`ShellRoute`、`AppLayout`、domain route mount factory 保持同步。它们负责应用骨架、路由注册、outlet 挂载和 nav capability 聚合；把这些改成异步会让 app 路由入口协议变复杂，收益也不明显。

当前 app router 已配置 `defaultPreload: 'intent'`，`lazyRouteComponent` 会暴露 preload 能力；用户 hover/focus 链接时 TanStack Router 可以提前加载目标页面 chunk。只有当某个 route 需要把 `component`、`pendingComponent`、`errorComponent` 等非关键配置拆成独立 lazy route 文件时，才考虑 TanStack Router 的 code-based `.lazy(() => import('./xxx.lazy').then((d) => d.Route))` 写法；使用这种写法前先固定 route id，避免 lazy route id 和主 route 不一致。

---

## Shell Layout 结构

本节只定义最小代码姿势：`app/src/web` 负责最终 `RootRoute`、`ShellRoute`、项目 app 级路由和入口级配置；feature domain 通过 `webDomain.routeMounts` 接入 app 定义的 outlet。普通业务页面默认挂到 shell outlet；login、register、SSO callback 等特殊页面挂到 root outlet。

| 场景 | 默认写法 |
| --- | --- |
| 全局 provider、Toaster、QueryClient 等基础设施 | `app/src/web/src/main.tsx` 中使用 `BaseProviders` |
| app 入口级配置、router、outlet 定义 | `app/src/web/src/router.ts` |
| app 自己需要统一页面框架的路由 | 挂到 `ShellRoute` 分支 |
| app 自己不需要页面框架的路由 | 直接挂 RootRoute |
| 普通 business domain route tree | `routeMounts.shell`，挂到 app shell 下 |
| 特殊无 layout domain route | `routeMounts.root`，直接挂 RootRoute |
| 普通页面内容区 | 优先用共享 `ModuleLayout` 打底；domain 可自定义 `PageLayout`/`DomainPage` |
| domain route 扩展信息 | `capabilities`，当前 app 消费函数式 `capabilities.nav` |

---

### App 层目录与 layout 组织

`main.tsx` 只负责引入最终样式、包裹 `BaseProviders` 并挂载 `RouterProvider`。`router.ts` 负责创建 `RootRoute`、`ShellRoute`、项目 app 级路由、domain outlet 和入口级配置。App shell 适配代码放在 `app/src/web/src/components/layouts/`，共享 layout 与通用页面底座放在 `domain/base/src/web/src/components/layouts/`。

```text
app/src/web/src/
├── main.tsx                               ← 挂载 React app + BaseProviders
├── router.ts                              ← 创建最终 router + app route + domain outlet
├── routes/                                ← 项目 app 级路由
├── features/                              ← 项目 app 级页面
└── components/
    └── layouts/
        └── app-layout/                    ← 组合共享 AppLayout、profile/workspace/nav 等项目能力

domain/base/src/web/src/
├── base-providers.tsx                     ← 全局 provider
├── components/layouts/app-layout/         ← 共享 app shell UI
└── components/layouts/module-layout/      ← business domain 页面通用底座
```

---

### App 路由：app 自身分有/无 layout，domain 通过 slot 接入

App 自身路由分两类：独立落地页等不需要 shell 的路由直接挂 RootRoute；首页、help、settings 等需要 app 统一页面框架的路由挂 `ShellRoute`。feature domain 的 `routeMounts.root` 直接挂 RootRoute，`routeMounts.shell` 挂 `ShellRoute`。

```tsx
// app/src/web/src/router.ts
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import {
  configureAuthSession,
  defineWebDomainRouteOutlets,
  resolveWebDomainRouteMount,
} from '@example-app/web-base'

import { AppLayout } from './components/layouts/app-layout'
import { createHomeRoute } from './routes/home-route'
import { webModules } from './vineModules.gen'

configureAuthSession({ loginPath: '/uic/login' })

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
  ...resolveWebDomainRouteMount({ domains: webModules, outlet: appRouteOutlets.root, parentRoute: RootRoute }),
  ShellRoute.addChildren([
    createHomeRoute({ parentRoute: ShellRoute }),
    ...resolveWebDomainRouteMount({ domains: webModules, outlet: appRouteOutlets.shell, parentRoute: ShellRoute }),
  ]),
])

export const router = createRouter({ routeTree })
```

`AppLayout` 承载 app 自己页面和 shell outlet 下 domain 页面使用的统一框架。当前 app 的左侧导航由 app 自己的配置和 domain 函数式 `capabilities.nav` 聚合而来，app 会按当前语言调用 `nav({ language })`。

`ModuleLayout` 是共享给 web module 页面使用的轻量内容容器，只负责通用背景、最外层边距和 `data-slot="module-layout"`；不要在这里加入具体 domain 的最大宽度、标题栏、筛选区或业务组件。需要进一步收口内容宽度、分区和语义 slot 时，在 domain 自己的 `src/layouts/` 或 `src/components/layouts/` 下封装 `PageLayout`。

```tsx
// domain/base/src/web/src/components/layouts/module-layout/module-layout.tsx
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../../lib/utils'

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

通过 package 根出口导出，domain 侧按当前真实包名导入：

```ts
// domain/base/src/web/src/index.ts
export { ModuleLayout } from './components/layouts/module-layout/index.ts'
export type { ModuleLayoutProps } from './components/layouts/module-layout/index.ts'
```

---

### Business domain：默认模板与高级声明

Business domain 对外导出 `webDomain`。默认写法使用 `defineWebDomain()` 声明 domain id、`routeMounts` 和可选 `capabilities`：`routeMounts.shell` 会挂到 app shell 下，`routeMounts.root` 会直接挂 RootRoute；当前 app 会读取函数式 `capabilities.nav` 聚合左侧导航。每个普通业务页面通过 `ModuleLayout` 或 domain 自己封装的 `PageLayout` 收口内容区。

```text
domain/catalog/src/web/src/
└── layouts/
    └── page-layout/             ← 推荐：统一本 domain 普通页面内容宽度和语义 slot
        └── index.tsx
```

默认模板只注册 shell 路由：

```tsx
// domain/catalog/src/web/src/routes/index.tsx
import { defineWebDomain, type WebDomainRouteFactory } from '@example-app/web-base'
import { Outlet, createRoute } from '@tanstack/react-router'

import { createHomeRouteTree } from './home-route'

const createCatalogRoutes: WebDomainRouteFactory = ({ parentRoute }) => {
  const domainRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: 'catalog',
    component: Outlet,
  })

  const homeRoute = createHomeRouteTree({ domainRoute })

  return [domainRoute.addChildren([homeRoute])]
}

export const webDomain = defineWebDomain()({
  id: 'catalog',
  routeMounts: {
    shell: [createCatalogRoutes],
  },
})
```

高级写法可注册 app nav 和 root/shell outlet：

```tsx
// domain/catalog/src/web/src/routes/index.tsx
import { defineWebDomain } from '@example-app/web-base'
import type { DomainNavMetaFactory, WebDomainRouteFactory } from '@example-app/web-base'
import { Outlet, createRoute } from '@tanstack/react-router'
import { Boxes } from 'lucide-react'

import { createLoginRouteBranches } from './login-route'
import { createHomeRouteTree } from './home-route'
import { createReportsRouteTree } from './reports-route'
import { getCatalogMessages } from '../lib/i18n'

const createCatalogRoutes: WebDomainRouteFactory = ({ parentRoute }) => {
  const domainRoute = createRoute({
    getParentRoute: () => parentRoute,
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

export const webDomain = defineWebDomain()({
  id: 'catalog',
  routeMounts: {
    root: [createLoginRouteBranches],
    shell: [createCatalogRoutes],
  },
  capabilities: {
    nav: createCatalogNavMeta,
  },
})
```

普通页面优先使用 domain 自己的 `PageLayout`。`PageLayout` 内部再复用 `ModuleLayout`，这样共享底座和 domain 个性化结构职责分开；`uic` 当前已经按这个姿势落地。

```tsx
// domain/uic/src/web/src/layouts/page-layout/index.tsx
import type { ComponentPropsWithoutRef } from 'react'
import { ModuleLayout, cn } from '@carbonnt-cyacle/web-base'

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
        data-slot="uic-page-layout"
        className={cn('mx-auto w-full max-w-[1280px]', className)}
      >
        {children}
      </div>
    </ModuleLayout>
  )
}
```

页面组件只消费本 domain 的 `PageLayout`，不要每个页面重复写 `ModuleLayout`、`mx-auto`、`max-w` 这些外壳结构。

```tsx
// domain/uic/src/web/src/features/user/profile/page.tsx
import { PageLayout } from '../../../layouts/page-layout'

export function ProfilePage() {
  return (
    <PageLayout className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Profile</h1>
      {/* ... */}
    </PageLayout>
  )
}
```

### 复用或定制共享 layout

Domain 普通页面默认复用 `ModuleLayout`，并在 domain 内封装自己的 `PageLayout`；如果产品体验完全不同，可以在 domain 内写独立 layout。不要导入 `AppLayout` 来包业务页面，也不要把 domain 分类逻辑上移到 app route resolver 里。

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
- base 共享 layout 统一放 `src/components/layouts/`；business domain 可按现有目录放 `src/layouts/` 或 `src/components/layouts/`
- `main.tsx` 只作最终挂载入口；项目 router、outlet 和入口级配置放 `app/src/web/src/router.ts`
- app 自身路由分有/无 shell；有 shell 路由挂 `ShellRoute`，无 shell 路由直接挂 RootRoute
- 普通 business domain 默认使用 `routeMounts.shell`，挂到 app shell 下并可配合函数式 `capabilities.nav`
- login、register、SSO callback 等特殊页面使用 `routeMounts.root`，直接接入 RootRoute
- 页面尽量不要裸跑；普通 business domain 页面通过 `ModuleLayout` 或 domain 自己的 `PageLayout` 收口内容区
- Domain 推荐封装自己的 `PageLayout`，内部复用 `ModuleLayout` 并只放本 domain 的宽度、间距和语义 slot
- Domain 需要完全不同页面容器时在自身 `src/layouts/` 或 `src/components/layouts/` 定制

---

## CSS 链路

最终入口由生成文件 `app/src/web/src/vineStyles.gen.css` 汇总 base、各 feature domain 和 app 自身 globals。业务样式生成由被导入的 domain globals 负责，最终应用专属的全局补充放 `app/src/web/src/globals.css`。

```css
/* app/src/web/src/vineStyles.gen.css */
@import "@example-app/web-base/globals.css";
@import "@example-app/web-catalog/globals.css";
@import "./globals.css";
```

共享 base globals 承载 Tailwind、shadcn、字体、主题 token 和共享 UI 源码覆盖。

```css
/* domain/base/src/web/src/styles/globals.css */
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

最终 ship module 在 `app/src/web/src/router.ts` 中创建 app router，负责项目 app 级路由、shell route、domain outlet 和入口级配置。ship module 可以承载首页、帮助页、shell 页面等项目 app 级页面；feature domain 的业务页面仍由各自 `webDomain.routeMounts` 接入。

```tsx
// app/src/web/src/routes/help-route.ts
import type { AnyRoute } from '@tanstack/react-router'
import { createRoute } from '@tanstack/react-router'

export function createHelpRoute({ parentRoute }: { parentRoute: AnyRoute }) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: 'help',
  }).lazy(() => import('./help-route.lazy').then((d) => d.Route))
}
```

```tsx
// app/src/web/src/routes/help-route.lazy.tsx
import { createLazyRoute } from '@tanstack/react-router'

import { HelpPage } from '../features/help/page'

export const Route = createLazyRoute('/help')({
  component: HelpPage,
})
```

App route tree 在 root/shell 层组装 app 级 route、domain root outlet 和 domain shell outlet。

```tsx
// app/src/web/src/router.ts
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import {
  defineWebDomainRouteOutlets,
  resolveWebDomainRouteMount,
} from '@example-app/web-base'

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
  ...resolveWebDomainRouteMount({ domains: webModules, outlet: appRouteOutlets.root, parentRoute: RootRoute }),
  ShellRoute.addChildren([
    createHomeRoute({ parentRoute: ShellRoute }),
    ...resolveWebDomainRouteMount({ domains: webModules, outlet: appRouteOutlets.shell, parentRoute: ShellRoute }),
  ]),
])

export const router = createRouter({ routeTree })
```

Domain 默认路由以领域名称开始，domain root 可同步承载 `Outlet`，子页面挂在 domain root 下并优先 lazy。公开出口导出 `webDomain`，内部 route factory 接收 app 传入的 `parentRoute`。

```tsx
// domain/catalog/src/web/src/routes/index.tsx
import { defineWebDomain, type WebDomainRouteFactory } from '@example-app/web-base'
import { Outlet, createRoute } from '@tanstack/react-router'

import { createHomeRouteTree } from './home-route'
import { createReportsRouteTree } from './reports-route'

const createCatalogRoutes: WebDomainRouteFactory = ({ parentRoute }) => {
  const domainRoute = createRoute({
    getParentRoute: () => parentRoute,
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

export const webDomain = defineWebDomain()({
  id: 'catalog',
  routeMounts: {
    shell: [createCatalogRoutes],
  },
})
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
import { Badge } from '@example-app/web-base/components/ui/badge'

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

import { vrpcClient } from '@example-app/web-base'
import { createCatalogHomeService } from '@example-app/skeled-catalog'

const homeService = createCatalogHomeService(vrpcClient)
const overviewMethod = {
  serviceName: 'catalog.CatalogHomeService',
  methodName: 'getOverview',
} as const
const createTaskMethod = {
  serviceName: 'catalog.CatalogHomeService',
  methodName: 'createTask',
} as const

export const homeKeys = {
  overview: () => [overviewMethod.serviceName, overviewMethod.methodName] as const,
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
    mutationKey: [createTaskMethod.serviceName, createTaskMethod.methodName, projectId],
    mutationFn: () => homeService.createTask({ projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homeKeys.overview() })
    },
  })
}
```

使用 skel service 的 `serviceName` 和 `methodName` 组成 query key；不要为了 key 新建 `api.ts`。

### QueryKey 取值

`queryKey` / `mutationKey` 的前两段固定取 RPC 方法身份：`[serviceName, methodName]`。当前 skelc 不再生成 `meta.ts`，也没有导出 `xxxServiceMeta`；generated `service.ts` 只在 `client.invoke(...)` 中内联 `serviceName` 和 `methodName`。不要手改 generated `service.ts`，需要 query key 时在对应 `queries.ts` 附近集中手写方法身份常量。

```ts
import { createCatalogReportService } from '@example-app/skeled-catalog'

const catalogReportService = createCatalogReportService(vrpcClient)
const listReportsMethod = {
  serviceName: 'catalog.CatalogReportService',
  methodName: 'list',
} as const
const getReportMethod = {
  serviceName: 'catalog.CatalogReportService',
  methodName: 'get',
} as const
const archiveReportMethod = {
  serviceName: 'catalog.CatalogReportService',
  methodName: 'archive',
} as const

type ReportFilters = {
  status?: string
}

function normalizeReportFilters(filters: ReportFilters) {
  return {
    status: filters.status ?? 'all',
  }
}

export const catalogReportKeys = {
  listRoot: () => [listReportsMethod.serviceName, listReportsMethod.methodName] as const,
  list: (filters: ReportFilters) => [
    ...catalogReportKeys.listRoot(),
    normalizeReportFilters(filters),
  ] as const,
  detail: (id: string) => [getReportMethod.serviceName, getReportMethod.methodName, id] as const,
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
    mutationKey: [archiveReportMethod.serviceName, archiveReportMethod.methodName],
    mutationFn: (id: string) => catalogReportService.archive({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogReportKeys.listRoot() })
    },
  })
}
```

取值规则：

- 前缀用 RPC 方法身份常量里的 `serviceName`、`methodName`，保证跨 domain 不冲突。
- 方法后追加资源维度，例如 `id`、`workspaceId`、分页、筛选和排序；只追加可序列化且稳定的值，不放函数、组件实例、未规范化的 `Date` 或临时对象。
- 列表接口保留 `listRoot()` 这类不带筛选参数的 root key，用于新增、删除、归档后批量失效；具体列表查询再在 root 后追加规范化后的 filters。
- 详情接口用对应详情方法的 key 前缀加资源 id，不要复用列表方法的 key 前缀。
- 跨领域调用时使用被调用服务的真实 skel 名，例如 `uic.WorkspaceAppApiService`；调用 pub service 时同样按 generated `service.ts` 中的 `serviceName` / `methodName` 填写。

Dialog 组件放到 `dialogs/`，只暴露页面需要的 props。

```tsx
// domain/catalog/src/web/src/features/home/dialogs/create-task-dialog.tsx
import { Button } from '@example-app/web-base/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@example-app/web-base/components/ui/dialog'

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

import { vrpcClient } from '@example-app/web-base'
import { createCatalogReportService } from '@example-app/skeled-catalog'

const catalogReportService = createCatalogReportService(vrpcClient)
const listReportsMethod = {
  serviceName: 'catalog.CatalogReportService',
  methodName: 'list',
} as const
const archiveReportMethod = {
  serviceName: 'catalog.CatalogReportService',
  methodName: 'archive',
} as const

// 使用 skel service 的 serviceName 和 methodName 组成 query key。

type ReportFilters = {
  status?: string
}

export const catalogReportKeys = {
  listRoot: () => [listReportsMethod.serviceName, listReportsMethod.methodName] as const,
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
    mutationKey: [archiveReportMethod.serviceName, archiveReportMethod.methodName],
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
import { Button } from '@example-app/web-base/components/ui/button'

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
