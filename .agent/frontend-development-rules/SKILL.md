---
name: frontend-development-rules
description: >
  Use before implementing, modifying, reviewing, debugging, testing, or configuring frontend code
  under app/src/web or domain/*/src/web. Covers Plot typed routing, React, TypeScript, Vite,
  dependencies, layouts, i18n, vRPC/React Query, Tailwind/CSS Modules, Base UI, generated files,
  browser validation, and frontend quality checks.
---

# Web 前端开发指南

本文是 Plot/Vine Web 模板的开发基线。示例包名、domain、服务名和路径是占位符；落地时替换为项目实际名称。

## 0. 开始任务

1. 按任务命中对应章节；跨层改动、全新页面、路由迁移和审查任务通读全文。
2. 只改手写文件；生成文件必须通过 Plot 命令更新。保留已有改动，不做无关重构。
3. 实现完成后按第 6 节验证，并报告未覆盖的检查项。

| 任务 | 必须覆盖 |
|---|---|
| 新页面、feature、组件 | 1、2、3、4、5、6 |
| route、router、layout、redirect | 2、3、6 |
| vRPC、query、mutation、缓存 | 3 |
| Tailwind、CSS、动画、响应式 | 4 |
| 依赖、domain 接入、package、lockfile | 1、5、6 |
| 登录、session、AuthGuard、权限 | 2、3 的认证小节 |
| review、排障、测试、构建、浏览器验证 | 6 + 故障涉及章节 |

## 1. 代码边界、导入与依赖

```text
app/src/web                 最终入口：main、router、AppLayout、app-owned routes/pages
domain/base/src/web         共享 UI、Provider、client、基础 layout、route 工具、globals
domain/<name>/src/web       领域 route、feature、组件、i18n、pub、globals
```

- 依赖方向：`app -> domain`、`feature domain -> base/其它 domain 的 pub`；domain 不得导入 app 源码。
- 包内跨目录优先使用当前 package 的 `#/` alias，并带 `.ts/.tsx` 后缀；同目录强绑定文件才用相对路径。
- 跨 package 只用 `package.json` 的 `exports`；Base 从包根导入，领域稳定 API 从 `@scope/web-xxx/pub` 导入。
- 禁止跨 domain 引用对方 `#/`、相对源码路径或未声明的深层出口。
- Base 内不得导入自己的包名；barrel/index 只做显式 re-export，不写运行时实现。
- `pub` 只导出稳定能力，不导出页面私有状态；新增 pub 依赖前检查循环依赖。
- `src/lib`、browser-notifications、ConversationTimeline 等共享目录只维护其既有职责；不要把业务页面状态、通知发送或滚动策略散落到页面组件。

Base 和 feature package 的公共入口只做聚合，不绕过出口访问实现文件：

```text
src/index.ts
├── components/index.ts
├── context/index.ts
├── hooks/index.ts
├── lib/index.ts
└── routes/index.ts

src/pub/index.ts              # 跨 domain 稳定 API
src/styles/globals.css        # 包级样式入口
```

```tsx
// 推荐：使用公共出口
import { Button, ModuleLayout } from "@scope/web-base"
import { ProductNameLink } from "@scope/web-catalog/pub"

// 禁止：跨 package 深层路径或跨 domain 源码路径
import { Button } from "@scope/web-base/src/components/ui/button.tsx"
import { ProductNameLink } from "../../catalog/src/web/src/features/product/..."
```

### 依赖管理

- 第三方版本统一放根 `pnpm-workspace.yaml` 的 `catalogs.web`，package 使用 `catalog:web`；内部包使用 `workspace:*`。
- `app/src/web` 是真实安装入口和前端 lockfile 所在位置；不要进入 domain 目录直接运行 pnpm。
- 所有命令从仓库根执行：

```bash
plot pnpm install
plot pnpm install --frozen-lockfile
plot pnpm add <package>
plot pnpm add -D <package>
plot pnpm add <package> --domain <domain>
plot pnpm remove <package> [--domain <domain>]
plot pnpm update <package>@<range> --catalog web
plot pnpm prune
plot pnpm prune --write
plot app apply
```

- `plot pnpm install` 不接 package 名；不要传 `--dir`、`--filter`、`--recursive`、`--workspace-root` 改变 workspace 边界。
- `plot pnpm` 管理第三方依赖、catalog、lockfile；`plot app apply` 管理内部 `workspace:*`、domain 接入、虚拟 workspace 和生成聚合。
- `--domain` 添加依赖时，Plot 会同步 domain 与最终 app；不要依赖源码扫描自动推断。
- 移除依赖：先从不再使用的 domain remove，再确认 app 不使用后 remove app，最后 `prune`。

第三方包由“直接 import 它的代码”决定归属：

```text
只有 app 直接使用                 -> app
只有一个 feature domain 使用      -> plot pnpm add <pkg> --domain <domain>
多个 domain 各自直接使用稳定 API   -> 分别声明，共享 catalog 版本
需要统一配置/协议/兼容层           -> base 封装后由 base 暴露稳定 API
```

多个 domain 使用同一个第三方包，不自动意味着必须转导 Base；只有需要统一参数、样式适配、错误处理、上传协议或迁移兼容时才封装。

## 2. 路由与 Layout

当前模板采用 TanStack Router typed code-based 架构，Base 必须提供 `createWebDomain`、`createWebRouter`、
`createStandaloneWebDomainRouter` 和 `forwardComponentPreload`。
禁止使用旧版 `defineWebDomain`、`routeMounts`、`resolveWebDomainRouteMount`、手工 route resolver、
`router-registry.ts` 或返回 sibling route 数组的旧工厂。

### 分层职责

```text
Plot                  生成 webModules（domain 注册集合 + CSS 聚合）
feature domain        createWebDomain(id).addRoute(outlet, factory).addCapability(...)
domain/base           outlet 契约、domain 收集、route reparent、preload helper、createWebRouter
app                   Root Route、真实 layout outlet、app-owned routes、最终 Router
```

- 默认 outlet 是 `app`；登录、注册、SSO callback 等不使用 AppLayout 的页面挂 `root`。
- 新 outlet 必须同步 Base outlet registry、app `rootOutlets`、standalone Router 和类型测试。
- `main.tsx` 只负责样式、Provider、`RouterProvider`；`router.tsx` 负责组装，不实现业务页面。
- AppLayout 属于 app；ModuleLayout 属于 Base；业务 domain 用自己的 PageLayout 包住 ModuleLayout。

### App Router 模板

```tsx
// app/src/web/src/router.tsx
import { HeadContent, createRootRoute, createRoute } from "@tanstack/react-router"
import { NotFoundError, createWebRouter } from "@scope/web-base"

import { AppLayout } from "#/components/layouts/app-layout/index.ts"
import { createHomeRoute } from "#/routes/home-route.ts"
import { webModules } from "#/vineModules.gen.ts"

const rootRoute = createRootRoute({
  shellComponent: ({ children }) => <><HeadContent />{children}</>,
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
  routes: ({ app }) => ({
    app: [createHomeRoute({ parentRoute: app })],
  }),
})

export const { outlets, webDomains, routeTree, router } = webRouter

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}
```

`createWebRouter` 的默认值由 Base 提供，通常为 `defaultPreload: "intent"`、`defaultPreloadStaleTime: 0`、
`scrollRestoration: true`；只有项目确实需要覆盖时才传入。

### Domain Route 模板

```tsx
// domain/catalog/src/web/src/routes/web-domain.ts
import { Outlet, createRoute, lazyRouteComponent, type AnyRoute } from "@tanstack/react-router"
import { createWebDomain } from "@scope/web-base"

const HomePage = lazyRouteComponent(() => import("#/features/home/page.tsx"), "HomePage")

const createCatalogRoutes = (parentRoute: AnyRoute) => {
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
}

export const webDomain = createWebDomain("catalog")
  .addRoute("app", createCatalogRoutes)
```

规则：

- route factory 只接收 `AnyRoute` parent，返回一棵 Route tree；不要整体标注返回 `AnyRoute`，否则丢失 path/params/search 类型。
- 默认 domain root 使用 `Outlet`，子 route 使用相对 path；跳过 domain 前缀必须有明确产品合同。
- 多棵独立树重复 `.addRoute()`：

```ts
export const webDomain = createWebDomain("uic")
  .addRoute("app", createWorkspaceRoutes)
  .addRoute("root", createLoginRoutes)
  .addRoute("root", createSsoCallbackRoutes)
```

- capability 不是默认值；需要导航或扩展能力时显式 `.addCapability(key, value)`，不要让 app 猜 domain。
- app 不得导入 domain 的 `router.register.ts`；domain 不得维护 app route registry。

```ts
// 只有确实提供导航能力时才追加
export const webDomain = createWebDomain("catalog")
  .addRoute("app", createCatalogRoutes)
  .addCapability("nav", createCatalogNavMeta)
```

```tsx
// 反例：旧版 routeMounts/context/route array 写法，不要在 typed 项目中恢复
export const webDomain = defineWebDomain({
  id: "catalog",
  routeMounts: { app: [createCatalogHomeRoute, createCatalogReportsRoute] },
})
```

### Standalone Router 类型注册

每个 feature domain 都保留自己的 `routes/router.register.ts`，供 domain 内 `<Link>`、`navigate`、params/search 类型检查：

```tsx
// domain/catalog/src/web/src/routes/router.register.ts
import { createStandaloneWebDomainRouter } from "@scope/web-base"
import { webDomain } from "./web-domain.ts"

const router = createStandaloneWebDomainRouter(webDomain)

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}
```

该文件不从公共入口导出，也不由 app 导入；app 只注册组合后的最终 Router。

### Lazy Route、参数和 preload

route 文件只保留匹配、search 校验、权限和加载所需配置；较重页面默认从 `features/*/page.tsx` lazy 加载。

不需要把 route state 转成 props 时，直接把 lazy component 交给 Router：

```tsx
const WorkspacePage = lazyRouteComponent(
  () => import("#/features/workspace/page.tsx"),
  "WorkspacePage",
)

const workspaceRoute = createRoute({
  getParentRoute: () => parentRoute,
  path: "workspace",
  component: WorkspacePage,
})
```

需要把 params/search 转成页面 props 时，保留同步薄 wrapper，并转发 preload：

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

- 禁止在 wrapper 内硬编码 `useParams({ from: "/workspace/$appId" })`；完整 route id 会随 outlet/父路由变化。
- 禁止 `Object.assign(Component, { preload: Page.preload })`；统一使用 `forwardComponentPreload`。
- 只有拆出 `pendingComponent/errorComponent` 等非关键 route options 时，才使用 code-based `.lazy()`；`path`、`validateSearch`、
  `beforeLoad` 和通常的 `loader` 保持同步，避免匹配或数据加载瀑布。
- 不 lazy `main.tsx`、`router.tsx`、Root Route、AppLayout、layout outlet 或 domain factory。

### Layout

```tsx
// domain/catalog/src/web/src/layouts/page-layout/index.tsx
import type { ComponentPropsWithoutRef } from "react"
import { ModuleLayout, cn } from "@scope/web-base"

export interface PageLayoutProps extends ComponentPropsWithoutRef<"div"> {
  layoutClassName?: string
}

export function PageLayout({ children, className, layoutClassName, ...props }: PageLayoutProps) {
  return (
    <ModuleLayout className={layoutClassName}>
      <div
        {...props}
        data-slot="catalog-page-layout"
        className={cn("mx-auto w-full max-w-[1280px]", className)}
      >
        {children}
      </div>
    </ModuleLayout>
  )
}
```

页面只消费本 domain 的 `PageLayout`；不要每页重复 `ModuleLayout`、`mx-auto`、`max-w`，也不要让 domain 导入 app 的 AppLayout。

## 3. Feature、数据、i18n 与认证

### Feature 目录与页面职责

```text
features/<page>/
├── page.tsx
├── queries.ts
├── components/
│   ├── error-state.tsx
│   ├── overview.tsx
│   └── page-skeleton.tsx
├── dialogs/
│   └── create-task-dialog.tsx
└── hooks/
    ├── use-<page>-page.ts
    └── use-<page>-filters.ts
```

`page.tsx` 只做组合和状态分支：

```tsx
export function HomePage() {
  const page = useHomePage()

  if (page.overview.isLoading) return <HomePageSkeleton />
  if (page.overview.isError) return <HomeErrorState onRetry={page.retryOverview} />

  return (
    <>
      <HomeOverview filters={page.filters} tasks={page.visibleTasks} />
      <CreateTaskDialog projectId={page.overview.data.projectId} />
    </>
  )
}
```

页面编排 hook 组合 server state、focused hook 和页面逻辑：

```ts
export function useHomePage() {
  const overview = useHomeOverview()
  const filters = useHomeTaskFilters()
  const visibleTasks = useMemo(() => {
    const tasks = overview.data?.tasks ?? []
    return filters.status === "all" ? tasks : tasks.filter((task) => task.status === filters.status)
  }, [filters.status, overview.data?.tasks])

  return { filters, overview, retryOverview: overview.refetch, visibleTasks }
}
```

- API、query、mutation 不直接写在 page；Dialog 放 `dialogs/`，只暴露页面需要的 props。
- loading/error/empty/success 状态要明确；复杂计算和局部状态拆到 hooks/components。
- 仅本领域复用的组合组件放 domain-local `components/`；feature 私有组件留在 feature 内。

```tsx
// features/home/dialogs/create-task-dialog.tsx
export function CreateTaskDialog({ projectId }: { projectId: string }) {
  const createTask = useCreateTask(projectId)

  return (
    <Dialog>
      <DialogTrigger asChild><Button>新建任务</Button></DialogTrigger>
      <DialogContent>
        <Button disabled={createTask.isPending} onClick={() => createTask.mutate({})}>
          创建
        </Button>
      </DialogContent>
    </Dialog>
  )
}
```

```tsx
// 反例：page.tsx 同时管理弹窗 open、表单、RPC、缓存和页面布局
export function HomePage() {
  // 不要把 CreateTaskDialog 的内部状态全部摊在这里
  return <div onClick={/* 直接拼 RPC */ undefined}>...</div>
}
```

### vRPC + React Query QueryKey

业务 API 放 feature-local `queries.ts`，页面只消费 hook。query/mutation key 的前两段固定使用生成的 ServiceSpec：

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getVrpcClient } from "@scope/web-base"
import {
  CatalogReportServiceSpec,
  createCatalogReportService,
} from "@scope/skeled-catalog"

const service = createCatalogReportService(getVrpcClient())

export const reportKeys = {
  listRoot: () => [CatalogReportServiceSpec.serviceName, CatalogReportServiceSpec.methods.list] as const,
  list: (filters: { status?: string }) => [
    ...reportKeys.listRoot(),
    { status: filters.status ?? "all" },
  ] as const,
  detail: (id: string) => [
    CatalogReportServiceSpec.serviceName,
    CatalogReportServiceSpec.methods.get,
    id,
  ] as const,
}

export function useReports(filters: { status?: string }) {
  return useQuery({ queryKey: reportKeys.list(filters), queryFn: () => service.list(filters) })
}

export function useArchiveReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: [CatalogReportServiceSpec.serviceName, CatalogReportServiceSpec.methods.archive],
    mutationFn: (id: string) => service.archive({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.listRoot() }),
  })
}
```

- 不要重复手写 `{ serviceName, methodName }`；没有 Spec 的本地 service 才手写，并注明来源。
- key 后只追加稳定、可序列化的 id、分页、排序和规范化 filters；禁止函数、组件实例、临时对象、未规范化 Date。
- 列表保留 root key 供新增/删除/归档批量失效；详情使用详情方法前缀 + id；跨 domain 使用被调用包真实 Spec。
- mutation 成功后精确失效相关 root，不要全局清空 QueryClient。

```ts
// 反例：手写身份、详情复用列表 key、把函数放进 key
const badKey = [{ serviceName: "catalog", methodName: "list" }, () => filters]

// 推荐：使用 Spec + 稳定序列化参数
const goodKey = [
  CatalogReportServiceSpec.serviceName,
  CatalogReportServiceSpec.methods.list,
  { status: filters.status ?? "all" },
] as const
```

### Domain i18n

项目需要多语言时，严格按下面的目录、命名和 API 结构实现；不要在 feature 内自行读取语言状态或拼接消息。
业务消息推荐使用“值或函数”的 typed API，带参数的消息直接调用，例如 `t.home.count(12)`。

```text
src/lib/i18n/
├── language-store.ts
├── i18n-catalog.ts
├── index.ts
└── messages/
    ├── zh-CN/
    │   ├── common.ts
    │   ├── home.ts
    │   └── index.ts    # 组合并导出 zhCN 与 type Messages
    └── en-US/
        ├── common.ts
        ├── home.ts
        └── index.ts    # 组合并导出 enUS
```

语言状态由 Base 提供的单例 store 统一维护；所有 domain 共享同一个语言快照，不在 feature 内创建自己的 `useState` 或 store：

```ts
// src/lib/i18n/language-store.ts
import * as React from "react"

export const SUPPORTED_LANGUAGES = ["zh-CN", "en-US"] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const DEFAULT_LANGUAGE: SupportedLanguage = "zh-CN"
const listeners = new Set<() => void>()

function readStoredLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE
  try {
    const value = window.localStorage.getItem("language")
    return value === "en-US" || value === "zh-CN" ? value : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

let currentLanguage = readStoredLanguage()
if (typeof document !== "undefined") document.documentElement.lang = currentLanguage

function emit() {
  listeners.forEach((listener) => listener())
}

export const languageStore = {
  getSnapshot: () => currentLanguage,
  getServerSnapshot: () => DEFAULT_LANGUAGE,
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  setLanguage: (language: SupportedLanguage) => {
    if (language === currentLanguage) return
    currentLanguage = language
    try {
      if (typeof window !== "undefined") window.localStorage.setItem("language", language)
    } catch {
      // 存储不可用时仍然保持当前页面内的语言切换
    }
    if (typeof document !== "undefined") document.documentElement.lang = language
    emit()
  },
}

export function useLanguageStore() {
  return React.useSyncExternalStore(
    languageStore.subscribe,
    languageStore.getSnapshot,
    languageStore.getServerSnapshot,
  )
}
```

存储介质可以按部署需要替换为 cookie 或其它共享方案，但必须保留单例 `getSnapshot/subscribe/setLanguage` 边界，并同步更新 `document.documentElement.lang`。

```tsx
// 反例：每个页面各自维护语言，页面之间会出现语言分裂
const [language, setLanguage] = useState<SupportedLanguage>("zh-CN")

// 推荐：所有切换都经过共享单例
languageStore.setLanguage("en-US")
```

```ts
// messages/zh-CN/common.ts
export const common = {
  nav: {
    home: "首页",
  },
} as const
```

```ts
// messages/zh-CN/home.ts
export const home = {
  title: "首页",
  count: (count: number) => `共 ${count} 项`,
} as const
```

```ts
// messages/zh-CN/index.ts
import { common } from "./common"
import { home } from "./home"

export const zhCN = { common, home } as const
export type Messages = typeof zhCN
```

```ts
// messages/en-US/common.ts
import type { common as ZhCNCommon } from "../zh-CN/common"

export const common = {
  nav: {
    home: "Home",
  },
} satisfies typeof ZhCNCommon
```

```ts
// messages/en-US/home.ts
import type { home as ZhCNHome } from "../zh-CN/home"

export const home = {
  title: "Home",
  count: (count: number) => `${count} items`,
} satisfies typeof ZhCNHome
```

```ts
// messages/en-US/index.ts
import type { Messages } from "../zh-CN"
import { common } from "./common"
import { home } from "./home"

export const enUS = { common, home } satisfies Messages
```

```ts
// Base 提供的 createI18nCatalog：只负责按当前语言取 typed messages
import * as React from "react"
import type { SupportedLanguage } from "./language-store"
import { languageStore, useLanguageStore } from "./language-store"

export function createI18nCatalog<TMessages>(
  messages: Readonly<Record<SupportedLanguage, TMessages>>,
) {
  const getMessages = (language: SupportedLanguage = languageStore.getSnapshot()) => messages[language]

  const useTranslation = () => {
    const language = useLanguageStore()
    const t = getMessages(language)
    return React.useMemo(() => ({ language, t }), [language, t])
  }

  return { getMessages, useTranslation }
}
```

```ts
// i18n-catalog.ts
import { createI18nCatalog } from "@scope/web-base"
import { enUS } from "./messages/en-US"
import type { Messages } from "./messages/zh-CN"
import { zhCN } from "./messages/zh-CN"

export const i18nCatalog = createI18nCatalog<Messages>({ "zh-CN": zhCN, "en-US": enUS })
export const getMessages = i18nCatalog.getMessages
export const useTranslation = i18nCatalog.useTranslation
```

```ts
// src/lib/i18n/index.ts
export { languageStore, useLanguageStore } from "./language-store"
export { getMessages, i18nCatalog, useTranslation } from "./i18n-catalog"
export type { SupportedLanguage } from "./language-store"
export type { Messages } from "./messages/zh-CN"
```

```tsx
export function HomePage() {
  const { t } = useTranslation()
  return <><h1>{t.home.title}</h1><p>{t.home.count(12)}</p></>
}
```

- 每个业务消息模块单独维护一个文件（如 `common.ts`、`home.ts`）；不要把整个语言树堆在 locale `index.ts`。
- locale `index.ts` 只组合模块并导出 locale 对象和类型；`src/lib/i18n/index.ts` 只 re-export，不写 catalog 配置和工厂逻辑。
- 默认语言作为类型来源；其它语言的同名模块用 `satisfies typeof ZhCNModule`，locale 组合再用 `satisfies Messages`。
- React 组件使用 `useTranslation()` 取得 `t`；普通文本直接读取，带参数文本直接调用函数：`t.title`、`t.home.count(12)`。
- nav factory 等非 React 场景显式 `getMessages(language)`，然后使用同一套 `t` API；不要调用 React hook。
- 跨 domain 使用 i18n 时通过 `pub` 导出，并在 import 处 alias；不要在 API 名里重复 domain 前缀。

```tsx
// 反例：把带参数的消息当普通字符串处理，丢失类型和参数约束
const message = t.home.count

// 推荐：消息本身是 typed function，直接传参数
const message = t.home.count(12)
```

### 认证（按项目需要启用）

- login/profile/logout、Portal/vRPC 鉴权和 session 生命周期必须由同一套明确契约实现；不要凭空增加第二套认证链路。
- credential store 和 vRPC header 注入各有一个共享入口；client 每次请求动态读取凭据，不能在 singleton 创建时捕获 token。
- 本地凭据只做快速判断；受保护的 profile RPC 是登录态权威。profile query key 也使用 ServiceSpec。
- token 应为不可预测 opaque 值；服务端保存摘要、过期和撤销状态；敏感字段不进日志、错误提示、Devtools 或长期 mutation cache。
- AuthGuard 负责认证，不决定业务首页；回跳只接受同源站内 path，保留 query/hash，使用 replace；无合法目标回中立 `/`。
- logout 无论服务端成功或失败都清本地 credential、profile 和跨账号敏感缓存；前端守卫不能替代服务端授权。

#### Credential store 与 vRPC 注入

凭据读写只放 Base 的共享 lib；login、guard、logout 不得直接访问 Web Storage。存储介质按部署安全模型决定，下面示例使用 `localStorage`：

```ts
// domain/base/src/web/src/lib/session-credential.ts
const SESSION_KEY = "session-token"

export function getSessionCredential(): string | null {
  if (typeof window === "undefined") return null
  try {
    const value = window.localStorage.getItem(SESSION_KEY)?.trim()
    return value || null
  } catch {
    return null
  }
}

export const hasSessionCredential = () => getSessionCredential() !== null

export function setSessionCredential(value: string) {
  if (typeof window === "undefined") return
  const token = value.trim()
  if (!token) return clearSessionCredential()
  window.localStorage.setItem(SESSION_KEY, token)
}

export function clearSessionCredential() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(SESSION_KEY)
}

export function getSessionAuthorizationHeader() {
  const token = getSessionCredential()
  return token ? `Bearer ${token}` : null // scheme 以 Portal/vRPC 契约为准
}
```

在唯一的共享 vRPC client/interceptor 中每次请求动态读取当前凭据：

```ts
client.use({
  beforeRequest: (context) => {
    const authorization = getSessionAuthorizationHeader()
    if (!authorization) return

    const headers = new Headers(context.init.headers)
    headers.set("Authorization", authorization)
    context.init.headers = headers
  },
})
```

不要在 client 创建时捕获 token；登录、退出和账号切换后，singleton client 必须立即使用最新凭据。不要发送浏览器自报的
Actor/Initiator 身份，可信身份由 Portal 或服务端认证边界建立。

#### Profile query 与登录态权威

profile query 同时供页面和 route guard 使用，key 使用生成的 ServiceSpec：

```ts
import { queryOptions, useQuery } from "@tanstack/react-query"

export const profileKeys = {
  current: () => [AuthServiceSpec.serviceName, AuthServiceSpec.methods.getProfile] as const,
}

export function currentProfileQueryOptions() {
  return queryOptions({
    queryKey: profileKeys.current(),
    queryFn: ({ signal }) =>
      authService.getProfile(null, {
        suppressGlobalToast: true,
        requestInit: { signal },
      }),
  })
}

export function useCurrentProfile() {
  return useQuery({
    ...currentProfileQueryOptions(),
    enabled: hasSessionCredential(),
  })
}
```

本地 token 存在只代表“可能有 session”；`ensureQueryData(currentProfileQueryOptions())` 成功才代表服务端认证通过。
profile 失败时按项目错误契约处理 Unauthorized；不能把 token 内容当作账号、角色或权限来源。

#### AuthGuard、权限守卫与安全回跳

守卫挂在覆盖整组受保护页面的最近公共父路由；login、SSO callback 等公开页面挂 `root`，避免跳转循环：

```ts
import { redirect } from "@tanstack/react-router"

function redirectToLogin(location: { href: string }): never {
  throw redirect({
    to: "/login",
    search: { redirect: location.href },
    replace: true,
  })
}

export async function requireAuthProfile(location: { href: string }) {
  if (!hasSessionCredential()) redirectToLogin(location)

  try {
    return await getQueryClient().ensureQueryData(currentProfileQueryOptions())
  } catch (error) {
    if (isUnauthorizedError(error)) {
      clearSessionCredential()
      getQueryClient().removeQueries({ queryKey: profileKeys.current() })
      redirectToLogin(location)
    }
    throw error
  }
}

export async function requirePermission(
  location: { href: string },
  permission: string,
) {
  const profile = await requireAuthProfile(location)
  if (!profile.permissions.includes(permission)) {
    throw redirect({ to: "/", replace: true })
  }
  return profile
}
```

如果错误契约无法可靠区分 Unauthorized 与网络故障，可采用“profile 失败即清 session”的 fail-closed 策略；不要因短暂网络错误
在每个页面各自登出。`isUnauthorizedError`、`clearAuthSession` 等 helper 必须集中在认证模块。

回跳只接受同源站内绝对 path，并保留 query/hash：

```ts
export function resolveLoginRedirect(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "/"
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/"
  if (/[^\x20-\x7e]/.test(value)) return "/"
  if (value === "/login" || value.startsWith("/login?")) return "/"
  return value
}
```

禁止接受 `http:`、`https:`、`//host`、反斜杠、控制字符、登录页自身或无法解析的值；登录成功用 `replace` 回跳，无合法目标回 `/`，
由 App 的 home route 决定默认业务入口。

#### Login、logout 与缓存清理

登录 mutation 在内部收到完整 session 后立即保存 token，只把脱敏的 account 返回给 React Query：

```ts
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const session = await authService.login(input)
      setSessionCredential(session.sessionToken)
      queryClient.setQueryData(profileKeys.current(), session.account)
      return session.account
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authService.logout(null),
    onSettled: () => {
      clearSessionCredential()
      queryClient.removeQueries({ queryKey: profileKeys.current() })
      clearAccountSensitiveQueries(queryClient)
      void router.navigate({ to: "/login", replace: true })
    },
  })
}
```

服务端 logout 成功或失败都必须清本地 session；账号切换还要清理上一账号的权限敏感缓存，或把 account/tenant identity 纳入 query key。
多 Tab 场景在 credential store 层统一处理 `storage`/`BroadcastChannel`，不要每个页面各自监听。

认证代码建议按职责放置：

```text
domain/base/src/web/src/lib/
├── session-credential.ts    # 凭据读写
└── vrpc-client.ts           # 唯一 header 注入点

domain/uic/src/web/src/
├── features/login/          # login mutation、表单、redirect
├── features/session/        # profile、logout、AuthGuard、权限守卫
└── routes/paths.ts          # LOGIN_PATH 等稳定路径
```

认证回归至少覆盖：无凭据、有效/过期/撤销 session、Unauthorized、网络故障、非法回跳、登录后回跳、权限不足、logout 失败清理、账号切换和多 Tab 登出。

## 4. 样式与 React 交互

### 样式选择

- 默认使用 Tailwind CSS 表达布局、尺寸、间距、颜色、响应式和常见状态。
- Tailwind 难以表达的局部复杂样式（如 keyframes、伪元素、复杂 selector、渐变/mask、第三方 DOM 覆盖）才使用 CSS Modules。
- CSS Modules 文件与页面或组件并置，例如 `page.module.css`、`status-card.module.css`；不要建立远离所有者的 feature `styles/` 目录。
- `cn()` 只用于合并条件 class、CSS Modules 和外部 `className`；可复用的样式变体使用 `cva()`。
- 优先使用项目已有的语义颜色 token；不要在业务组件中重新定义品牌色。
- 非必要不修改 `globals.css`。页面和组件局部样式放在 Tailwind 或 CSS Modules；不要把页面名、feature 名、局部动画和伪类写进 globals。
- 确实需要包级全局补充时，新建文件如 `custom.css`，再由该包的 `globals.css` 导入：

```text
src/styles/
├── globals.css
└── custom.css
```

```css
/* src/styles/globals.css */
@import "tailwindcss";
@import "./custom.css";
```

```css
/* src/styles/custom.css */
/* 这里只放确实需要跨页面/跨组件生效的规则。 */
```

- `vineStyles.gen.css` 仍由 Plot 生成，禁止手改；不要用 `custom.css` 代替组件局部样式。

### React handler、Button 与 Link

传给 JSX 或子组件的 callback 默认使用稳定引用：

```tsx
function AccountPopover() {
  const navigate = useNavigate()
  const handleLogout = useCallback(() => {
    void navigate({ to: "/login" })
  }, [navigate])

  return <Button onClick={handleLogout}>退出登录</Button>
}
```

#### Button 的根元素语义

- 操作、提交、切换、打开浮层用 `Button`；页面导航和外部跳转用 `<a>` 或 Router `Link`。
- `Button` 默认根元素是原生 `<button>`；使用 `render` 替换为 `<a>`/Link 时必须 `nativeButton={false}`。
- 真正的 link 语义直接用 `<a>`/Link + `cn(buttonVariants(...), className)`，不要用带 `onClick` 的 button 冒充导航。
- 遇到 Base UI `nativeButton` 告警，修正具体调用处的 DOM 语义，不要屏蔽 console 或修改全局默认值。

```tsx
// 页面动作：保留原生 button
<Button type="button" onClick={handleOpenDialog}>打开弹窗</Button>

// 页面导航：保留 link 语义，不要用 Button + onClick 冒充
<Link
  to="/catalog"
  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
>
  查看目录
</Link>

// 只有产品语义仍是“操作按钮”但根节点确实不是 button 时，才关闭 native button 检查
<Button nativeButton={false} render={<span />} variant="outline">
  自定义操作
</Button>
```

### Activity 与浮层

- `Activity` 只用于需要保留 state/DOM 的重型面板；hidden 会清理 Effect，恢复时 Effect 会再次运行。
- iframe、video、audio、canvas、websocket、MessagePort 和第三方 SDK 必须区分“新资源加载”和“已加载资源恢复”，不能恢复时无条件重置 loading。
- 不需要保留状态、隐藏时应释放资源的内容用条件渲染卸载。
- Activity 内 Portal 浮层优先使用 `modal`，避免 outside press 同时关闭浮层并切换 Activity。
- 确需非 modal 且同一次点击必须继续激活下层控件时，局部使用 `actionsRef`，顺序为 `close()` → `unmount()` → 更新 active state；不要全局关闭动画或条件移除 Content。

保留工具 tab、文件管理器、预览 iframe、复杂表单或编辑器状态时使用 `Activity`；不需要保留状态时直接卸载：

```tsx
<Activity mode={active ? "visible" : "hidden"}>
  <PreviewPanel />
</Activity>

{active ? <TemporaryPanel /> : null}
```

`hidden` 会清理子树 Effect，恢复时 Effect 会再次执行。因此资源恢复逻辑必须区分“同一资源恢复”和“新资源加载”：

```tsx
const readyUrlRef = useRef<string | null>(null)

useEffect(() => {
  if (readyUrlRef.current === url && previewFrameRef.current?.contentWindow) {
    setStatus("ready")
    reconnectPreviewSdk()
    return
  }

  readyUrlRef.current = null
  setStatus("loading")
  void loadPreview(url).then(() => {
    readyUrlRef.current = url
    setStatus("ready")
  })
}, [loadPreview, reconnectPreviewSdk, url])
```

不要在恢复时无条件 `setStatus("loading")`；iframe 的 `load`、第三方 SDK ready、websocket 连接等事件不一定会在恢复时再次触发。
Activity 子树中的 Portal 仍属于同一 React 子树：切换为 `hidden` 会清理浮层退出动画的 Effect，可能留下未卸载的 Portal 节点。

浮层打开后，outside press 应先关闭浮层、不能同时触发下层控件时，使用 `modal`：

```tsx
<Popover modal open={open} onOpenChange={setOpen}>
  <PopoverTrigger render={<Button />}>变更历史</PopoverTrigger>
  <PopoverContent>...</PopoverContent>
</Popover>
```

只有产品明确要求非 modal，并且同一次 outside press 必须继续切换下层 Activity 时，才局部使用 Base UI 的 `actionsRef`：

```tsx
const popoverActionsRef = useRef<PopoverRootActions | null>(null)

const handleTabChange = useCallback((nextTab: ToolTab) => {
  popoverActionsRef.current?.close()
  popoverActionsRef.current?.unmount()
  setActiveTab(nextTab)
}, [])

<Popover actionsRef={popoverActionsRef}>
  <PopoverTrigger render={<Button />}>切换工具</PopoverTrigger>
  <PopoverContent>...</PopoverContent>
</Popover>
```

不要在 `open === false` 时条件移除 Content 来绕过动画生命周期；不要用全局 `data-closed:hidden` 关闭所有浮层动画。

多行共享 Menu/Popover/PreviewCard 时使用 detached trigger：

Base UI 官方用法（`createHandle`、detached `Trigger`、`payload`、`triggerId`、`render`）：
<https://base-ui.com/react/components/popover>

```tsx
const rowMenu = useMemo(() => Menu.createHandle(), [])

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
              <Menu.Popup><Menu.Item onClick={() => editRow(row)}>编辑</Menu.Item></Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        ) : null
      }}
    </Menu.Root>
  </>
)
```

- `triggerId` 必须对应已注册的 `Trigger`，不能只是任意 DOM id。
- 已有 Tooltip/pressed/button 封装时，用 Trigger 的 `render` 合并 props，不要绕过 Base UI trigger。
- 对话消息列表不得按“有新内容就滚到底部”实现；优先复用 Base 的 `ConversationTimeline`。滚动模型必须区分：
  `anchored-to-message`（新用户消息锚定）、`following-bottom`（用户明确跟随最新）和 `free-scrolling`（用户主动阅读）。
  用户上滚后，流式内容不得拉回底部；锚点 spacer 只能按真实 `scrollTop` 差值一次性消耗，不能使用 `wheel.deltaY`。
  timeline item 使用稳定且唯一的 message DOM id，spacer 使用 `aria-hidden` 且不进入可访问性树；optimistic → remote message 和草稿 session → 正式 session 要保留锚点、spacer、累计消耗量。
  测试至少覆盖新消息锚定、长消息、流式增长、向上阅读、跳到最新、历史 prepend、optimistic 替换、session 连续性和不可测 DOM 回退。

## 5. 生成文件与 CSS 聚合

`app/src/web/src/vineModules.gen.ts` 和 `vineStyles.gen.css` 由 `plot app apply` 生成，禁止手改：

```css
/* generated */
@import "@scope/web-base/globals.css";
@import "@scope/web-catalog/globals.css";
@import "./globals.css";
```

- 新增、删除 domain，修改 domain 依赖或聚合入口后，从根执行 `plot app apply`。
- 各包维护自己的 `globals.css` 并在 exports 中暴露 `./globals.css`；最终 `main.tsx` 只 import 生成的样式聚合。
- Base globals 承载 Tailwind、字体、主题 token、reset 和共享 UI 覆盖；feature globals 通常只需 `@source`；app globals 放 app 级全局补充。
- 如果生成样式缺少某个 domain，检查 package exports 和 apply 结果，不要手改 generated CSS。

```text
新增 domain / 调整接入
    -> 修改 domain/app 配置
    -> plot app apply
    -> 检查 vineModules.gen.ts / vineStyles.gen.css

反例：直接编辑 vineModules.gen.ts 或 vineStyles.gen.css
```

## 6. 验证与完成条件

所有命令从仓库根执行：

```bash
plot app run
cd app/src/web
pnpm typecheck
pnpm test
pnpm build
```

- 浏览器/Playwright 必须通过前后端代理入口验证，不要直接访问 Vite 私有端口。
- 页面变更验证：目标路由、loading/error/empty/success、关键交互、刷新/返回、响应式、console 无新增错误。
- 路由变更验证：standalone Router 类型、最终 app Router 类型、params/search、lazy preload、公开/受保护入口。
- 依赖/生成变更验证：catalog、`workspace:*`、exports、聚合文件和 lockfile 一致。
- 无法执行的验证必须明确写出命令、原因和未覆盖风险，不得声称已验证。

### 完成清单

- [ ] 没有把占位包名、路径、服务名或示例 API 当成项目事实。
- [ ] 没有反向导入、跨 domain 深层导入、手改 generated 文件或混用旧路由协议。
- [ ] route factory、lazy page、params/search wrapper、preload 和 standalone Register 类型正确。
- [ ] page 只编排；数据、QueryKey、i18n、样式和浮层遵守对应规则。
- [ ] typecheck、test、build、浏览器验证已执行，结果与未覆盖项已报告。
