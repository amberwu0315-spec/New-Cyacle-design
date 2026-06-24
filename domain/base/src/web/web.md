# Web 端代码姿势与案例

本文件只放 Web 端代码姿势。示例里的包名、domain 名、route path 和 skel service 名都是占位，实际开发以当前项目检测结果、`package.json`、生成文件和现有代码为准。

## 本地开发与验证

- 开发测试域名：http://localhost:7088（前后端一体，默认从这个地址检查页面）。
- 浏览器或 Playwright 验证默认访问 `http://localhost:7088`；即使 Vite 输出 `http://localhost:5173`，也不要直接用 5173 检查页面，7088 会代理到 Vite 服务。
- 开发环境测试账号：`dev-01` / `tanheng666!`

---

## 代码边界与导入导出

`app/src/web` 是最终运行入口，也是项目 app 层；这里放最终 router、shell layout、首页/帮助页等 app 级路由、入口配置和应用专属页面。跨 domain 复用的共享组件、共享 lib、基础 layout 和 route helper 放 `domain/base/src/web`；feature domain 的业务页面、局部组件和领域路由放各自 `domain/<domain>/src/web`。

app 级配置优先通过 `app/src/web/src/project-config.ts` 注入到 base 提供的配置入口，domain 侧通过 base helper 消费；不要让 feature domain 反向 import `app/src/web`。

命名规则：`@example-app/*` 是中性示例包名；`@example-app/web-base` 表示共享 Web 包占位，真实项目以 `domain/base/src/web/package.json` 的 `name` 和 `exports` 为准。

### 本领域包源码导入

`#/` 指向当前 app 或当前 domain 的 `src/web/src`，只用于本 app/domain web 包内部源码引用。跨 domain 或跨 package 复用时使用 package exports，例如 `@example-app/web-catalog/pub`。本领域包内跨目录引用优先使用当前 `package.json` 配置的 `imports` 别名 `#/`，避免多层相对路径变形；通过 `#/` 引用源码时路径带 `.ts` / `.tsx` 后缀。

相对路径用于局部强绑定文件：同目录工具、同一个页面目录下拆出的组件、同一个组件目录内的子组件、样式或 schema 等。

```tsx
// 推荐：本 app/domain 包内跨目录引用
import { AuthGuard } from '#/components/guards/auth-guard/auth-guard.tsx'

// 可以：同页面或同组件目录内的邻近文件
import { validateLoginRouteSearch } from './redirect.ts'
```

### 本领域包对外导出

需要给其它 domain 或 app 层复用的组件、hook、i18n helper、业务工具等，先从本 domain 的 `src/pub/index.ts` 显式导出，再由消费方通过 `@example-app/web-xxx/pub` 导入；不要跨 domain 引用对方 `#/`、相对源码路径或 package 根出口里的非稳定能力。

```tsx
// domain/catalog/src/web/src/pub/index.ts
export { ProductNameLink } from '#/features/product/components/product-name-link.tsx'
export type { ProductNameLinkProps } from '#/features/product/components/product-name-link.tsx'

// 消费方
import { ProductNameLink } from '@example-app/web-catalog/pub'

export function InventoryProductCell({ productId }: { productId: string }) {
  return <ProductNameLink productId={productId} />
}
```

`pub` 只内聚稳定能力，不放本领域私有页面状态。新增 pub 依赖前检查依赖方向，避免循环。

app 层消费 feature domain 对外能力时也走 `./pub`，例如顶层 shell 使用 UIC 的登录态守卫时从 `@example-app/web-uic/pub` 导入 `AuthGuard`。

```text
允许：inventory -> catalog/pub
避免：inventory -> catalog/pub -> inventory/pub
```

---

## 路由与 Layout

`app/src/web` 创建最终 `RootRoute`、`ShellRoute`、项目 app 级路由和 domain outlet；feature domain 通过 `webDomain.routeMounts` 接入 app 定义的 outlet。普通业务页面默认挂到 shell outlet；login、register、SSO callback 等特殊页面挂到 root outlet。

| 场景 | 默认写法 |
| --- | --- |
| 全局 provider、Toaster、QueryClient 等基础设施 | `app/src/web/src/main.tsx` 中使用 `BaseProviders` |
| app 入口级配置、router、outlet 定义 | `app/src/web/src/router.ts` |
| app 自己需要统一页面框架的路由 | 挂到 `ShellRoute` 分支 |
| app 自己不需要页面框架的路由 | 直接挂 RootRoute |
| 普通 business domain route tree | `routeMounts.shell`，挂到 app shell 下 |
| 特殊无 layout domain route | `routeMounts.root`，直接挂 RootRoute |
| 普通页面内容区 | 优先用共享 `ModuleLayout` 打底；domain 可自定义 `PageLayout` |
| domain route 扩展信息 | `capabilities`，当前 app 消费函数式 `capabilities.nav` |

### App 层组织

`main.tsx` 只负责引入最终样式、包裹 `BaseProviders` 并挂载 `RouterProvider`。`router.ts` 负责创建 `RootRoute`、`ShellRoute`、项目 app 级路由、domain outlet 和入口配置。App shell 适配代码放 `app/src/web/src/components/layouts/`，共享 layout 与通用页面底座放 `domain/base/src/web/src/components/layouts/`。

```text
app/src/web/src/
├── main.tsx                     ← 挂载 React app + BaseProviders
├── project-config.ts            ← 配置项目级共享参数
├── router.ts                    ← 创建最终 router + app route + domain outlet
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

import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import {
  defineWebDomainRouteOutlets,
  resolveWebDomainRouteMount,
} from '@example-app/web-base'

import { AppLayout } from '#/components/layouts/app-layout/index.ts'
import { createHomeRoute } from '#/routes/home-route.ts'
import { webModules } from '#/vineModules.gen.ts'

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

### Lazy Route 写法

路由文件默认只保留 `path`、`getParentRoute`、`loader`、`beforeLoad`、search 校验等匹配和加载所需的关键配置；页面组件从 `features/*/page.tsx` 通过 TanStack Router 的 `lazyRouteComponent` 按需加载。不要在 route 文件里静态 import 页面组件，除非该页面非常轻且确认需要进入首包。

```tsx
import type { AnyRoute } from '@tanstack/react-router'
import { createRoute, lazyRouteComponent } from '@tanstack/react-router'

const LoginPage = lazyRouteComponent(
  () => import('#/features/login/page.tsx'),
  'LoginPage',
)

export function createLoginRouteBranches({ parentRoute }: { parentRoute: AnyRoute }) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: 'uic/login',
    component: LoginPage,
  })
}
```

同一个页面模块导出多个 route component 时，每个 route 单独声明对应的 lazy component。

```tsx
const UserAgreementPage = lazyRouteComponent(
  () => import('#/features/terms/page.tsx'),
  'UserAgreementPage',
)
const PrivacyPolicyPage = lazyRouteComponent(
  () => import('#/features/terms/page.tsx'),
  'PrivacyPolicyPage',
)
```

当前 app router 已配置 `defaultPreload: 'intent'`，`lazyRouteComponent` 会暴露 preload 能力；用户 hover/focus 链接时 TanStack Router 可以提前加载目标页面 chunk。只有当某个 route 需要把 `component`、`pendingComponent`、`errorComponent` 等非关键配置拆成独立 lazy route 文件时，才考虑 code-based `.lazy(() => import('./xxx.lazy').then((d) => d.Route))`；使用这种写法前先固定 route id，避免 lazy route id 和主 route 不一致。

若项目使用 file-based route，则沿用项目约定创建 `.lazy.tsx`，并用 `createLazyFileRoute` 替代 `createLazyRoute`。

不要 lazy app 壳子本身：`main.tsx`、`router.ts`、`ShellRoute`、`AppLayout`、domain route mount factory 保持同步。它们负责应用骨架、路由注册、outlet 挂载和 nav capability 聚合；改成异步会让 app 路由入口协议变复杂，收益不明显。

### Business Domain 路由

Business domain 对外导出 `webDomain`。默认写法使用 `defineWebDomain()` 声明 domain id、`routeMounts` 和可选 `capabilities`：`routeMounts.shell` 挂到 app shell 下，`routeMounts.root` 直接挂 RootRoute；当前 app 会读取函数式 `capabilities.nav` 聚合左侧导航。

Domain 默认路由以领域名称开始，domain root 可同步承载 `Outlet`，子页面挂在 domain root 下。子路由使用相对 path，例如 `reports` 最终成为 `/catalog/reports`。自定义顶层路由只在产品合同明确需要时创建，并先检查与其它 domain 的 path 冲突。

```tsx
// domain/catalog/src/web/src/routes/index.tsx
import { defineWebDomain, type WebDomainRouteFactory } from '@example-app/web-base'
import { Outlet, createRoute } from '@tanstack/react-router'

import { createHomeRouteTree } from './home-route'
import { createReportsRouteTree } from './reports-route'
import { createCatalogNavMeta } from './nav'

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
  capabilities: {
    nav: createCatalogNavMeta,
  },
})
```

```tsx
// 非必要不要这样做：它会跳过 /catalog 前缀并占用全局 path。
const publicCatalogRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: 'products',
})
```

### 页面 Layout

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

---

## Domain 多语言

Domain 自己维护业务文案时，统一放 `src/lib/i18n`。领域内只用通用名：`i18nCatalog`、`getMessages`、`useTranslation`、`Messages`。需要暴露给其它 domain/app 时通过 `pub` 导出，跨 domain 使用时在 import 处 alias。

```text
domain/catalog/src/web/src/lib/i18n/
├── i18n-catalog.ts
├── index.ts
└── messages/
    ├── zh-CN/
    │   └── index.ts     ← 导出 zhCN 和 type Messages = typeof zhCN
    └── en-US/
        └── index.ts     ← enUS satisfies Messages
```

```ts
// domain/catalog/src/web/src/lib/i18n/i18n-catalog.ts
import { createI18nCatalog } from '@example-app/web-base'

import { enUS } from './messages/en-US'
import type { Messages } from './messages/zh-CN'
import { zhCN } from './messages/zh-CN'

export const i18nCatalog = createI18nCatalog<Messages>({
  'zh-CN': zhCN,
  'en-US': enUS,
})

export const getMessages = i18nCatalog.getMessages
export const useTranslation = i18nCatalog.useTranslation
```

```ts
// domain/catalog/src/web/src/lib/i18n/index.ts
export { formatMessage } from '@example-app/web-base'
export {
  getMessages,
  i18nCatalog,
  useTranslation,
} from './i18n-catalog'
export type { Messages } from './messages/zh-CN'
```

React 组件从本 domain 的 `useTranslation()` 取文案；需要插值时用 hook 返回的 `format`。

```tsx
import { useTranslation } from '#/lib/i18n/index.ts'

export function HomePage() {
  const { t, format } = useTranslation()

  return (
    <section>
      <h1>{t.home.title}</h1>
      <p>{format(t.home.count, { count: 12 })}</p>
    </section>
  )
}
```

非 React 场景显式传入语言，例如 nav factory：

```ts
import type { DomainNavMetaFactory } from '@example-app/web-base'
import { Boxes } from 'lucide-react'

import { getMessages } from '#/lib/i18n/index.ts'

export const createCatalogNavMeta: DomainNavMetaFactory = ({ language }) => {
  const t = getMessages(language)

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
            to: '/catalog',
            icon: Boxes,
          },
        ],
      },
    ],
  }
}
```

规则：

- `index.ts` 只做 re-export，不写配置和工厂逻辑。
- `zh-CN` 作为类型来源，其他语言用 `satisfies Messages` 校验结构。
- 不在领域内 API 名里加 domain 前缀；跨 domain 或 app 层同时消费多个 domain i18n 时，在 import 处取别名。

```ts
// domain/catalog/src/web/src/pub/index.ts
export { getMessages } from '#/lib/i18n/index.ts'

// 消费方
import { getMessages as getCatalogDomainMessages } from '@example-app/web-catalog/pub'
```

---

## Feature 组织

非平凡页面的 `page.tsx` 只做组合，功能代码留在同 feature 子文件中。`useXxxPage()` 作为页面编排 hook，组合 server state hook、focused hook 和页面级 logic；dialog、schema、复杂计算和私有组件拆到对应目录。

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

```tsx
// domain/catalog/src/web/src/features/home/page.tsx
import { HomeErrorState } from '#/features/home/components/home-error-state.tsx'
import { HomeOverview } from '#/features/home/components/home-overview.tsx'
import { HomePageSkeleton } from '#/features/home/components/home-page-skeleton.tsx'
import { CreateTaskDialog } from '#/features/home/dialogs/create-task-dialog.tsx'
import { useHomePage } from '#/features/home/hooks/use-home-page.ts'

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

```ts
// domain/catalog/src/web/src/features/home/hooks/use-home-page.ts
import { useMemo } from 'react'

import { useHomeTaskFilters } from '#/features/home/hooks/use-home-task-filters.ts'
import { useHomeOverview } from '#/features/home/queries.ts'

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

Focused hooks 按关注点拆分，默认放 `hooks/`。

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

仅本领域复用的组合组件可以放 domain-local `components/`；feature 私有组件留在 `features/<feature>/components/`。

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

Dialog 组件放 `dialogs/`，只暴露页面需要的 props，不把弹窗内部状态摊到 `page.tsx`。

```tsx
// domain/catalog/src/web/src/features/home/dialogs/create-task-dialog.tsx
import { Button } from '@example-app/web-base/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@example-app/web-base/components/ui/dialog'

import { useCreateTask } from '#/features/home/queries.ts'

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

## 接口调用与 QueryKey

业务 API 推荐放 feature-local `queries.ts` 中，使用 React Query 管 server state。页面只消费 hook 结果和触发 mutation，不直接拼 RPC 请求。

### QueryKey 取值

`queryKey` / `mutationKey` 的前两段固定取 RPC 方法身份：`[serviceName, methodName]`。skel 生成的 TypeScript 包会从 `spec.ts` 导出 `XxxServiceSpec`，其中包含 `serviceName` 和 `methods`；generated `service.ts` 也使用同一个 `Spec.serviceName` / `Spec.methods.xxx` 调用 RPC。绝大多数 query key 直接 import 对应的 `XxxServiceSpec`，不要在业务代码里重复手写 `{ serviceName: '...', methodName: '...' }`，避免接口改名后 key 和 generated service 漂移。

```ts
// domain/catalog/src/web/src/features/reports/queries.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { vrpcClient } from '@example-app/web-base'
import {
  CatalogReportServiceSpec,
  createCatalogReportService,
} from '@example-app/skeled-catalog'

const catalogReportService = createCatalogReportService(vrpcClient)

type ReportFilters = {
  status?: string
}

function normalizeReportFilters(filters: ReportFilters) {
  return {
    status: filters.status ?? 'all',
  }
}

export const catalogReportKeys = {
  listRoot: () => [
    CatalogReportServiceSpec.serviceName,
    CatalogReportServiceSpec.methods.list,
  ] as const,
  list: (filters: ReportFilters) => [
    ...catalogReportKeys.listRoot(),
    normalizeReportFilters(filters),
  ] as const,
  detail: (id: string) => [
    CatalogReportServiceSpec.serviceName,
    CatalogReportServiceSpec.methods.get,
    id,
  ] as const,
}

export function useCatalogReports(filters: ReportFilters) {
  return useQuery({
    queryKey: catalogReportKeys.list(filters),
    queryFn: () => catalogReportService.list(filters),
  })
}

export function useCatalogReport(id: string) {
  return useQuery({
    queryKey: catalogReportKeys.detail(id),
    queryFn: () => catalogReportService.get({ id }),
  })
}

export function useArchiveCatalogReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [
      CatalogReportServiceSpec.serviceName,
      CatalogReportServiceSpec.methods.archive,
    ],
    mutationFn: (id: string) => catalogReportService.archive({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogReportKeys.listRoot() })
    },
  })
}
```

取值规则：

- 前缀优先用 skel `spec.ts` 导出的 `XxxServiceSpec.serviceName` 和 `XxxServiceSpec.methods.xxx`，保证跨 domain 不冲突，并和 generated service 使用同一份方法身份。
- 不要为了 query key 在 `queries.ts` 里再手写 `const xxxMethod = { serviceName: '...', methodName: '...' }`；只有本地封装服务、非 skel RPC、历史手写 client 等没有 `Spec` 导出的场景才手写，并在常量旁说明来源。
- 方法后追加资源维度，例如 `id`、`workspaceId`、分页、筛选和排序；只追加可序列化且稳定的值，不放函数、组件实例、未规范化的 `Date` 或临时对象。
- 列表接口保留 `listRoot()` 这类不带筛选参数的 root key，用于新增、删除、归档后批量失效；具体列表查询再在 root 后追加规范化后的 filters。
- 详情接口用对应详情方法的 key 前缀加资源 id，不要复用列表方法的 key 前缀。
- 跨领域调用时 import 被调用包导出的真实 `Spec`，例如从 `@example-app/skeled-uicpub` 使用 `WorkspaceAppApiServiceSpec`；调用 pub service 时同样以 pub skel 包导出的 `Spec` 为准。

页面只消费 hook，不直接拼请求。

```tsx
// domain/catalog/src/web/src/features/reports/page.tsx
import { Button } from '@example-app/web-base/components/ui/button'

import { useArchiveCatalogReport, useCatalogReports } from '#/features/reports/queries.ts'

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

---

## React 组件写法

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

### Detached Trigger 浮层写法

Base UI 的 `Menu`、`Popover`、`PreviewCard` 都支持 detached trigger：触发点可以放在列表、表格、卡片内部，`Root` 和 `Popup/Content/Card` 只在外层渲染一次。多个触发点共享一个浮层时，创建一个 `handle`，同时传给 `Trigger` 和 `Root`，并用 `payload` 传当前行、当前卡片或当前节点的数据。

优先使用 detached trigger 的场景：表格行操作菜单、列表项更多操作、hover 预览卡、侧边栏收起态子菜单、虚拟列表或大量重复 item 中的浮层。简单的一对一浮层仍然就近组合 `Root + Trigger + Content`。`Menu` 只建议给顶层菜单使用 detached trigger；子菜单 trigger 仍放在 `SubmenuRoot` 内部。

```tsx
const rowMenu = React.useMemo(() => Menu.createHandle(), [])

return (
  <>
    {rows.map((row) => (
      <Menu.Trigger key={row.id} id={row.id} handle={rowMenu} payload={row}>
        更多
      </Menu.Trigger>
    ))}

    <Menu.Root handle={rowMenu}>
      {({ payload }) => {
        const row = payload as Row | undefined

        return row ? (
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end">
              <Menu.Popup>
                <Menu.Item onClick={() => editRow(row)}>编辑</Menu.Item>
                <Menu.Item onClick={() => copyRow(row)}>复制</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        ) : null
      }}
    </Menu.Root>
  </>
)
```

`PreviewCard.createHandle()` 和 `Popover.createHandle()` 同理；把预览卡、状态详情、统计说明、快捷编辑面板等浮层内容放在外层单例里，通过 `payload` 渲染当前行内容。

---

## 生成聚合文件与 CSS 链路

`app/src/web/src/vineModules.gen.ts` 和 `app/src/web/src/vineStyles.gen.css` 是 `plot app apply` 自动生成和同步的聚合文件，不手动维护。需要新增、删除或调整 domain 接入时，从项目根目录运行 `plot app apply`，让 app 入口重新聚合 route module 和样式入口。

聚合原理：`vineModules.gen.ts` 汇总最终 app 需要加载的 web domain module；`vineStyles.gen.css` 按最终 domain 列表依次 import base、各 feature domain 和 app 自身的 globals。`app/src/web/src/main.tsx` 只需要 import 生成后的 `#/vineStyles.gen.css`。

```css
/* app/src/web/src/vineStyles.gen.css，plot 生成，不手改 */
@import "@example-app/web-base/globals.css";
@import "@example-app/web-catalog/globals.css";
@import "./globals.css";
```

可以维护的是各包自己的 globals：共享 base globals 承载 Tailwind、shadcn、字体、主题 token 和共享 UI 源码覆盖；业务 domain globals 只覆盖本 domain 源码；最终应用专属的全局补充放 `app/src/web/src/globals.css`。

```css
/* domain/base/src/web/src/styles/globals.css */
@import "tailwindcss";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/geist";

@source "../**/*.{ts,tsx}";
```

```css
/* domain/catalog/src/web/src/styles/globals.css */
@source "../**/*.{ts,tsx}";
```

```css
/* app/src/web/src/globals.css */
/* 这里放最终应用自己的全局补充。 */
```

业务 package 需要导出自己的 globals；如果最终入口没有出现对应 import，不要手改 `vineStyles.gen.css`，优先检查 package export 和 `plot app apply` 同步结果。

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
