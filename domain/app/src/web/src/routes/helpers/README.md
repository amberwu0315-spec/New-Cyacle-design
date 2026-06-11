# domain-route-tree

`domain-route-tree.ts` 定义 feature domain 接入 Web app 的最小协议。ship module 仍然只需要把每个 domain 暴露的 `createDomainRouteTree` 放进 `createAppRouter([...])`，真正的路由挂载、layout 分槽和 app 侧 meta 聚合都由 app domain 处理。

## 默认模板

当前 plot 默认模板生成的是 route branch factory，只负责注册路由：

```ts
export function createDomainRouteTree({ RootRoute }: DomainRouteDeps): AnyRoute[] {
  const domainRoute = createRoute({
    getParentRoute: () => RootRoute,
    path: 'uic',
    component: Outlet,
  })

  const homeRoute = createHomeRouteTree({ domainRoute })

  return [domainRoute.addChildren([homeRoute])]
}
```

app 侧会兼容这种函数签名，并默认把它挂到 `layout` slot。它能完成路由注册，但不会注册 `metas.nav`，也不能声明无 layout 路由。

## 高级出口

需要左侧导航、无 layout route、或者后续其它 app shell meta 时，把默认模板升级为无参 `createDomainRouteTree()`，并返回 `defineDomainRouteTree(...)`。`domain-route-tree` 不定义 `metas` 的业务结构；当前 app shell 的 nav 类型由 app-layout 导出，子 domain 可以按需使用 `DomainNavMetaFactory`：

```ts
import { defineDomainRouteTree } from '@carbonnt-cyacle/web-app'
import type { DomainNavMetaFactory } from '@carbonnt-cyacle/web-app'

const createUicNavMeta: DomainNavMetaFactory = ({ locale }) => {
  const isEnglish = locale.startsWith('en')

  return {
    label: isEnglish ? 'User Center' : '用户中心',
    desc: isEnglish
      ? 'Account, sign-in, organization, and permission entries'
      : '账号、登录注册、组织与权限入口',
    icon: Users,
    defaultTo: '/uic',
    groups: [
      {
        id: 'uic-main',
        title: isEnglish ? 'User Center' : '用户中心',
        items: [
          {
            id: 'uic-home',
            label: isEnglish ? 'Home' : '首页',
            desc: isEnglish
              ? 'Open the user center home page'
              : '进入用户中心首页',
            to: '/uic',
            icon: Users,
          },
        ],
      },
    ],
  }
}

export function createDomainRouteTree() {
  return defineDomainRouteTree({
    routes: {
      root: [createUicLoginRouteBranches],
      layout: [createUicRouteBranches],
    },
    metas: {
      nav: createUicNavMeta,
    },
  })
}
```

`metas` 是可选泛型扩展位，当前 app 只消费函数式 `metas.nav` 来注册左侧导航，并会调用 `nav({ locale })`。其他应用可以按自己的 shell 继续扩展 `metas`。

## 两种 routes 写法

### 简写：带 AppLayout 的业务路由

```ts
routes: [createUicRouteBranches]
```

数组简写等价于把路由挂到 `layout` slot。它会挂载到 app 的 `AppLayoutRoute` 下，因此页面会带左侧导航、顶栏和 breadcrumb。当前有函数式 `metas.nav` 的业务模块通常使用这个写法。

### 高级写法：同时声明无 layout 和有 layout 路由

```ts
routes: defineDomainRouteSlots({
  root: [createUicLoginRouteBranches],
  layout: [createUicRouteBranches],
})
```

也可以直接写对象，效果一致：

```ts
routes: {
  root: [createUicLoginRouteBranches],
  layout: [createUicRouteBranches],
}
```

`root` slot 直接挂到 TanStack `RootRoute` 下，不经过 `AppLayoutRoute`，适合 `/uic/login`、`/uic/register`、SSO callback、独立落地页等不需要左侧导航的页面。

`layout` slot 挂到 `AppLayoutRoute` 下，适合需要 app shell、左侧导航和 breadcrumb 的业务页面。`metas.nav` 只负责注册导航入口，不会自动创建路由；路由仍然需要放进 `layout` 或 `root`。

也可以用便捷函数表达单一 slot：

```ts
routes: defineLayoutRoutes([createUicRouteBranches])
routes: defineLayoutlessRoutes([createUicLoginRouteBranches])
```

## Route branch factory

每个 route branch factory 接收的 `RootRoute` 会根据 slot 不同而变化：

```ts
export function createUicRouteBranches({ RootRoute }: { RootRoute: AnyRoute }) {
  const domainRoute = createRoute({
    getParentRoute: () => RootRoute,
    path: 'uic',
    component: Outlet,
  })

  return [domainRoute.addChildren([createHomeRouteTree({ domainRoute })])]
}
```

放在 `layout` slot 时，`RootRoute` 实际是 `AppLayoutRoute`；放在 `root` slot 时，`RootRoute` 是真正的根路由。
