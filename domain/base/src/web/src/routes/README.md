# Typed Web Router

这套路由架构用于在保持 TanStack Router 完整类型能力的同时，让多个 domain 独立声明路由，再由 app 统一组装成最终 Router。

它解决四个问题：

1. domain 不依赖 app，也不需要知道最终 Route Tree。
2. domain 能在自己的 TypeScript program 中校验路径、params 和 search。
3. app 能获得所有 domain 与 app-owned routes 组合后的完整 Router 类型。
4. outlet、Router defaults 等项目配置与复杂的收集、重绑定、组树逻辑分离。

## 目录职责

```text
routes/
├── config/
│   ├── outlets.ts          # 项目维护：可供 domain 使用的 root outlet ids
│   └── router.ts           # 项目维护：Router 默认配置
├── domain/
│   ├── builder.ts          # createWebDomain 与 capability/route builder
│   ├── collect.ts          # 收集 domain routes 与 capabilities
│   ├── outlet-contract.ts  # 根据 outlet 配置推导严格类型
│   ├── reparent-route.ts   # 将 domain route 类型重绑定到实际 outlet
│   └── route-component.ts  # 路由组件辅助方法
├── router/
│   ├── create-web-router.ts # 创建最终或 standalone Router
│   ├── options.ts           # Router option 类型
│   ├── route-tree.ts        # 组装 root、outlet 和 children
│   └── standalone-router.ts # domain 独立类型检查使用的 Router
└── index.ts                 # 纯 barrel export
```

维护边界：

| 变更                     | 修改位置                              | 不需要修改                      |
| ------------------------ | ------------------------------------- | ------------------------------- |
| 新增 root outlet         | `config/outlets.ts`、app `router.tsx` | collect、route-tree、standalone |
| 修改 Router 默认行为     | `config/router.ts`                    | `create-web-router.ts`          |
| 新增 app 页面            | app `router.tsx` 的 `routes()`        | base、domain registry           |
| 新增 domain 页面         | domain `web-domain.ts`                | app Route Tree                  |
| 暴露 domain capability   | domain `web-domain.ts`                | Router 核心                     |
| 修改 Root Route/head/404 | app `router.tsx`                      | base                            |

`config` 和 app `router.tsx` 是项目配置，应由用户维护。`domain` 与 `router` 中的类型和组装工具属于稳定基础设施，日常业务开发不应修改。

## 整体数据流

```text
domain web-domain.ts
        │ addRoute(outlet, factory)
        ▼
collectWebDomains(domains, concreteOutlets)
        │ collect + reparent types
        ▼
createWebRouteTree(rootRoute, rootOutlets, ownedRoutes, domainRoutes)
        │
        ▼
createRouter({ routeTree, ...defaults, ...overrides })
```

Plot 只需要生成 domain tuple。Plot 不需要知道 `root`、`app`、`admin`、layout 或 Route Tree 的结构。

## 配置 outlet

`config/outlets.ts` 是 outlet id 的唯一注册入口：

```ts
export const webDomainRootOutletIds = defineWebDomainRootOutletIds("app", "admin")
```

`root` 是内建 outlet，不写在这个列表中。列表里的 outlet 都是直接挂在 Root Route 下的 pathless layout route。

新增 `workspace` 时只在这里增加 id：

```ts
export const webDomainRootOutletIds = defineWebDomainRootOutletIds("app", "admin", "workspace")
```

随后 TypeScript 会要求每个 app 在 `rootOutlets` 中明确配置 `workspace`：启用时提供 `id: "workspace"` 的实际 Route，禁用时提供 `null`。standalone Router 会自动创建对应的 pathless outlet，不需要再维护另一份 Route Tree。

## 配置 Router defaults

默认配置集中在 `config/router.ts`：

```ts
export const defaultWebRouterOptions = {
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
} satisfies WebRouterOptions
```

这里负责项目默认策略，`create-web-router.ts` 只负责合并配置。app 可以通过 `router` 覆盖默认值；内部生成的 `routeTree` 不允许覆盖。

## App 组装 Router

Root Route、具体 layout Route 和 app-owned routes 都归 app 所有：

```tsx
const rootRoute = createRootRoute({
  shellComponent: ({ children }) => (
    <>
      <HeadContent />
      {children}
    </>
  ),
  notFoundComponent: NotFoundError,
})

export const { outlets, webDomains, routeTree, router } = createWebRouter({
  rootRoute,
  domains: webModules,
  rootOutlets: {
    app: createRoute({
      getParentRoute: () => rootRoute,
      id: "app",
      component: AppLayout,
    }),
    admin: createRoute({
      getParentRoute: () => rootRoute,
      id: "admin",
      component: AdminLayout,
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
  router: {
    defaultPreloadStaleTime: 30_000,
  },
})
```

默认推荐先命名 app-owned route，再返回对应 outlet 的路由数组，方便继续补充 loader、组件和子路由。base 同时支持直接内联 `createRoute()`，且不会丢失 path、params 或 search 类型。

`rootOutlets` 接收完整 TanStack Route，不接收 `{ component }` 形式的二次配置。Route 的 parent、id、component、context、beforeLoad 等信息只声明一次。

root outlet 只使用 `id`，不要写 `path`。因此 `admin` outlet 本身不会产生 `/admin` URL；URL 由挂载进去的业务 route 决定。例如 admin outlet 下的 `path: "admin/orders"` 最终是 `/admin/orders`。

注册过的 outlet 也可以在某种应用模式下显式禁用。若 `yaoming` 是一种独立的 root-only 应用形态，app 可以使用单独的静态 Router profile：

```tsx
createWebRouter({
  rootRoute,
  domains: webModules,
  rootOutlets: {
    app: null,
    admin: null,
  },
})
```

`null` 表示明确禁用并且不会向 Route Tree 添加该 outlet；不能省略 key。若 active domain 仍然挂载到字面量 `null` outlet，app 会直接产生 TypeScript 错误；动态条件无法静态确定时还有运行时校验兜底。app-owned route 若被错误归入禁用 outlet，也会在创建 Router 时抛错，避免静默丢失页面。直接传字面量 `null` 时，该 outlet 会从最终 Router 类型树中消失。

也可以根据运行时条件传入 `Route | null`，但这不应作为主架构。此时 `routes()` 必须先做非空缩窄，最终 Router 类型也只能保守包含所有可能分支。若 outlet 拓扑由应用形态决定，优先让 app 静态选择 standard 或 root-only profile，使编译期 Router 类型与实际 Route Tree 保持一一对应。domain id 不应隐式决定全局 layout。

`routes()` 用于注入 app-owned routes。回调提供严格类型的 `{ root, app, admin, ... }`，返回值按 outlet 分组：

```tsx
routes: ({ root, app, admin }) => {
  const loginRoute = createRoute({
    getParentRoute: () => root,
    path: "login",
    component: LoginPage,
  })
  const settingsRoute = createRoute({
    getParentRoute: () => app,
    path: "settings",
    component: SettingsPage,
  })
  const adminHomeRoute = createRoute({
    getParentRoute: () => admin,
    path: "admin",
    component: AdminHomePage,
  })

  return {
    root: [loginRoute],
    app: [settingsRoute],
    admin: [adminHomeRoute],
  }
}
```

## Domain 声明路由

domain 使用 `createWebDomain()` 命令式追加 route tree，并明确挂载 outlet：

```tsx
export const webDomain = createWebDomain("order")
  .addRoute("app", (parentRoute) => {
    const domainRoute = createRoute({
      getParentRoute: () => parentRoute,
      path: "orders",
      component: Outlet,
    })
    const homeRoute = createRoute({
      getParentRoute: () => domainRoute,
      path: "/",
      component: OrdersPage,
    })

    return domainRoute.addChildren([homeRoute])
  })
  .addRoute("admin", (parentRoute) =>
    createRoute({
      getParentRoute: () => parentRoute,
      path: "admin/orders",
      component: AdminOrdersPage,
    }),
  )
```

这是普通 domain 的默认组织方式：小型 route tree 直接内联在 `web-domain.tsx`，不必
额外建立 factory 文件。只有树较大、需要拆分关注点或复用时，再使用下面的外置写法。

`.addRoute()` 的第一个参数只能是 `config/outlets.ts` 注册过的 outlet。拼错或使用未注册 outlet 会直接产生 TypeScript 错误。

### 外置 route factory

domain 可以把 route tree 抽到单独文件，factory 的参数应保持 base 提供的稳定边界：

```tsx
import type { AnyRoute } from "@tanstack/react-router"

export function createOrderRoutes(parentRoute: AnyRoute) {
  const orderRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: "order",
    component: Outlet,
  })

  // ...create children and return orderRoute.addChildren(children)
}

export const webDomain = createWebDomain("order").addRoute("app", createOrderRoutes)
```

这里的 `AnyRoute` 是 domain 与 base 之间的跨 package ABI。不要把它继续扩散到
页面组件或业务 props；app 收集时由 `reparent-route.ts` 恢复真实 outlet 的完整
路径和参数类型。只有 app-owned route factory（不经过 domain reparent）才需要用
`<TParentRoute extends AnyRoute>` 保留具体 parent 类型。

同一个 domain 可以向相同或不同 outlet 注册多棵 route tree。domain 不应导入 app Route，也不应依赖 app 的 `router.tsx`。

## Capability

capability 与路由注册相互独立，domain 按需暴露：

```ts
export const webDomain = createWebDomain("order")
  .addRoute("app", createOrderRoutes)
  .addCapability("navigation", {
    label: "Orders",
    to: "/orders",
  })
```

app 可以从 `webDomains.capabilities("navigation")` 收集能力。模板不应默认注册 capability。
如果 app 需要保留能力的来源 domain（例如生成导航模型、权限分组或埋点元数据），使用
`webDomains.capabilityEntries("navigation")`；它返回 `{ domainId, capability }`，
不会要求 app 遍历 domain 内部的 capability 对象。

## 参数与 search

参数组件优先从具体 route 实例读取状态，再以普通 props 传给页面组件：

```tsx
const OrderPage = lazyRouteComponent(() => import("#/features/order/page.tsx"), "OrderPage")

function OrderRouteComponent() {
  const { orderId } = orderRoute.useParams()
  const { tab } = orderRoute.useSearch()

  return <OrderPage orderId={orderId} initialTab={tab} />
}

const orderRoute = createRoute({
  getParentRoute: () => domainRoute,
  path: "$orderId",
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  component: forwardComponentPreload(OrderRouteComponent, OrderPage),
})
```

这种写法使 params/search 的来源清晰，同时保留 `lazyRouteComponent` 的 preload。不要在页面组件中硬编码包含 outlet id 的 route id。

## Domain 本地类型检查

每个 domain 在自己的 `routes/router.register.ts` 注册 standalone Router：

```ts
import { createStandaloneWebDomainRouter } from "@project/web-base"

import { webDomain } from "./web-domain.ts"

const router = createStandaloneWebDomainRouter(webDomain)

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
```

这个文件只属于 domain 的 TypeScript program，不从 domain 的公共入口导出。它让 domain 内的 `Link`、`navigate()`、params 和 search 只基于当前 domain 校验。

app 不导入任何 domain 的 `router.register.ts`。app 在自己的 `router.tsx` 注册最终 Router，因此能够获得所有 domain 和 app-owned routes 的完整类型。

## Plot 模板边界

Plot 后续接入时应遵循以下所有权：

| 文件                                      | 所有权       | Apply 行为                   |
| ----------------------------------------- | ------------ | ---------------------------- |
| base `routes/config/*`                    | 用户/项目    | 初次创建；已存在时保留       |
| base `routes/domain/*`、`routes/router/*` | 框架基础设施 | 随模板版本维护或迁移         |
| app `router.tsx`                          | 用户/项目    | 创建初始版本，后续保留       |
| domain `web-domain.ts`                    | 用户/domain  | 创建初始版本，后续保留       |
| domain `router.register.ts`               | 模板基础设施 | 保持标准 standalone 注册     |
| `vineModules.gen.ts`                      | Plot 生成    | 根据 active domains 重新生成 |

Plot 应只在 `vineModules.gen.ts` 中组装 domain tuple，不生成 outlet Route Tree，也不推断 Root Route 或 layout。

## 验证

修改路由架构后至少运行：

```sh
pnpm typecheck
pnpm test
pnpm build
```

验收应同时覆盖：

- domain standalone 能拒绝当前 domain 的错误路径、params 和 search。
- app 能识别所有 domain 的完整路径和参数。
- 新增 outlet 后 app 必须补齐匹配 id 的具体 Route，或用 `null` 显式禁用。
- pathless outlet 的 domain child 会通过对应 layout 的 `<Outlet />` 渲染。
- Router defaults 与 app override 都能生效。
