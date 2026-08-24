# Typed Web Router

当前 Web 路由采用三层职责：

- feature domain 使用 `createWebDomain(id).addRoute(outlet, factory)` 声明自己的 route tree，使用 `.addCapability(key, value)` 暴露导航、权限或 edition 能力。
- base 的 `routes/domain` 负责收集 domain、校验 outlet、聚合 capability；`routes/router` 负责把 domain route tree 组装到 app 提供的真实 Layout Route。
- app 在 `router.ts` 中创建 Root Route、pathless outlet 和 app-owned routes，再调用 `createWebRouter` 创建最终 Router。

普通业务页挂到 `app` outlet，后台页挂到 `admin` outlet，无壳页面挂到内置 `root` outlet。当前项目的定制 Wuxibiologics 壳使用 `wuxibiologics` outlet；这个 outlet 只在对应 edition 的 Router 中启用。

```tsx
export const webDomain = createWebDomain('catalog')
  .addRoute('app', (parentRoute) => {
    const catalogRoute = createRoute({
      getParentRoute: () => parentRoute,
      path: 'catalog',
      component: Outlet,
    })

    return catalogRoute.addChildren([
      createRoute({
        getParentRoute: () => catalogRoute,
        path: '/',
        component: CatalogPage,
      }),
    ])
  })
  .addCapability('navigation', { label: 'Catalog', to: '/catalog' })
```

route factory 的 parent 参数是跨 package 的稳定 `AnyRoute` 边界；页面组件不要依赖它，也不要在 domain 内创建 Root Router。需要从 route 实例读取 params/search 时，在 factory 内先创建 route，再用该 route 实例实现组件，并保留 lazy component 的 preload 转发。

旧的 `defineWebDomain({ routeMounts })` 仍保留兼容读取能力，便于增量迁移；新代码不要继续新增旧结构。迁移 domain 后可在 `routes/router.register.ts` 使用 `createStandaloneWebDomainRouter(webDomain)` 做 domain-local 类型检查。
