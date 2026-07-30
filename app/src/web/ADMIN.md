# Admin 后台迁移说明

## 定位

`/admin` 是 Cyacle 项目内的后台管理入口，用于逐步迁移原 Matrix 后台功能。

- 产品名称、代码目录和路由统一使用 `admin`，运行时不再使用 `matrix` 名称。
- Admin 与现有前台同时存在，挂在 `RootRoute` 下，与公共 `ShellRoute` 平级。
- Admin 不是 app edition，也不是独立 domain。
- 原 Matrix 只作为功能和交互迁移来源，不向通用领域注入 Matrix 判断。

```text
RootRoute
├── ShellRoute
│   └── 当前前台
└── /admin
    └── AdminLayout
        └── 各领域上报的 Admin 路由
```

## 分层职责

### `domain/base`

- 提供通用 `AdminLayout`。
- 定义 `AdminNavMetaFactory` 和菜单聚合方法。
- 只负责布局与协议，不保存任何业务菜单。

### Feature domain

- 维护本领域迁移后的 Admin 页面。
- 通过 `routeMounts.admin` 上报本领域 Admin 路由。
- 通过 `capabilities.adminNav` 上报本领域 Admin 菜单。
- 页面继续使用领域自己的服务、查询和实体，不把业务实现放进 app。
- Admin 页面放在 `features/admin/`，对应路由放在 `routes/admin/`，按业务模块继续拆分文件。

### `app/src/web`

- 创建 `/admin` 根路由。
- 挂载认证和 Admin 品牌。
- 聚合各领域的 `admin` route mount 和 `adminNav` capability。
- 根据第一个可用菜单决定 `/admin` 默认跳转地址。

## 领域接入示例

```tsx
const createAdminRoutes: WebDomainRouteFactory = ({ parentRoute }) =>
  createRoute({
    getParentRoute: () => parentRoute,
    path: 'resources',
    component: AdminResourceListPage,
  })

const createAdminNav: AdminNavMetaFactory = () => [
  {
    id: 'admin-common-data',
    title: '通用数据管理',
    items: [
      {
        id: 'admin-resources',
        label: '资源管理',
        description: '维护领域资源',
        to: '/admin/resources',
        icon: Database,
      },
    ],
  },
]

export const webDomain = defineWebDomain()({
  id: 'example',
  routeMounts: {
    shell: [createShellRoutes],
    admin: [createAdminRoutes],
  },
  capabilities: {
    adminNav: createAdminNav,
    nav: createShellNav,
  },
})
```

最终路径由 Admin 根路由和领域相对路径组成：示例中的 `resources` 对应
`/admin/resources`。领域 route factory 中不要再次添加 `admin` path。

推荐目录结构：

```text
src/
├── features/admin/
│   └── resource-list-page.tsx
└── routes/admin/
    ├── resource-list-route.tsx
    ├── nav-meta.ts
    └── index.ts
```

## 菜单约定

- 菜单必须由页面所属领域上报，禁止在 `AdminLayout` 或 app 中硬编码业务菜单。
- 多个领域可以使用相同的 group `id`，聚合器会按领域加载顺序合并菜单项。
- 菜单项 `id` 应全局唯一，建议使用 `admin-<domain>-<resource>`。
- 尚未迁移但需要保留位置的菜单可以设置 `disabled: true`。
- 已启用菜单必须存在对应的 `routeMounts.admin` 路由。

## Matrix 迁移步骤

1. 确认原 Matrix 页面所属的 Cyacle 领域。
2. 将页面和 API 适配代码迁到对应 feature domain。
3. 在该领域注册相对 Admin 路由。
4. 在该领域上报菜单项；未完成页面先保持 disabled。
5. 对齐原页面的查询、分页、增删改查和权限行为。
6. 从 `/admin` 验证页面，同时确认前台路由没有受到影响。

当前第一批接入由 `pcf.factor.api` 提供：

- `/admin/factors`：文献因子库。
- 通用数据管理下的其他因子相关入口先作为 disabled 迁移占位。

## 登录与系统入口

前台和 Admin 共用 UIC 登录页、会话 Cookie 与工作空间选择流程。正式方案需要在
登录成功并选定组织后，根据组织类型决定进入前台还是 Admin；组织类型接口尚未
接入前，暂时由 app 入口读取 localStorage。

临时配置键：

```text
cyacle:system-entry
```

支持的值：

- `frontend`：登录后进入当前前台系统，也是缺省值。
- `admin`：登录后进入 `/admin`，再跳到第一个已启用的 Admin 菜单。

可以在浏览器控制台切换：

```js
localStorage.setItem('cyacle:system-entry', 'admin')
localStorage.setItem('cyacle:system-entry', 'frontend')
localStorage.removeItem('cyacle:system-entry')
```

登录成功且没有显式 `redirect` 参数时，UIC 会返回 `/`，app 在该入口读取上述值。
如果登录链接携带了明确的 `redirect`，仍优先返回用户原本访问的地址。后续接入
组织类型时，应替换 `app/src/web/src/system-entry.ts` 的读取逻辑，不在 UIC 登录
领域中加入 Admin 业务判断。

## 禁止事项

- 不创建 Matrix domain 或 Matrix edition。
- 不把业务菜单写入通用 `AdminLayout`。
- 不在 app 中直接实现领域 CRUD 页面。
- 不让 Admin 路由复用前台 ShellRoute；两套布局保持独立。
- 不手动修改 `vineModules.gen.ts`、`vineStyles.gen.css` 等 Plot 生成文件。
