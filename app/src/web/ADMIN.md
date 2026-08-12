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

## 页面与表格规范

### 页面头部

- Admin 列表页头部只展示一个明确的页面名称，使用一个 `h1`；不要同时堆叠面包屑、模块名、重复标题或可见描述。
- 标题区域保持轻量，不添加下划线、底部分隔线或装饰线。需要补充页面说明时使用 `sr-only`，或者放到内容区的说明、空状态中，不在标题下再铺一行副标题。
- 页面级新增、导出、批量操作等按钮不要放进标题栏，统一进入表格工具栏。

### 页面间距与内容边界

- Admin 页面内容不能紧贴主内容区左右边缘。标题区、表格工具栏、表格和分页必须落在同一条左右内容边界内，避免标题与表格错位。
- 列表页统一由页面 layout 提供响应式水平间距，建议窄屏使用 `px-3` 或 `px-4`，桌面使用 `lg:px-5` 或 `lg:px-6`；垂直间距由同一 layout 统一管理。页面内的 `DataView` 不要再次叠加左右 padding，避免双重缩进。
- 标题区与内容区应共享同一层带 padding 的内容容器；如果结构需要分别渲染，两处必须使用完全一致的响应式 `px-*`。不要让标题贴边、表格有间距，或标题有间距、表格贴边。
- 页面背景可以铺满可用区域，但可交互内容必须保留安全边距。表格需要占满剩余宽度时，应占满“扣除页面左右间距后的内容宽度”，不能通过负 margin 抵消页面 padding。
- 详情页、卡片页和表单页同样遵循统一内容边界；允许设置内容最大宽度并居中，但不能取消基础左右间距。
- 组织账号管理下的组织、用户、角色、权限、空间、工单和操作记录等页面也必须遵循本节，不能因为页面来自不同领域或使用不同 page wrapper 而各自定义一套左右间距。

### 表格与工具栏

- Admin 列表统一使用 `@crew-ui/base` 的 `DataView`、`useDataModel`、`useSearchBox`、`useDataGridSearchBoxIntegration` 和列构建器；不要用原生 `table`、`Table` 基础组件或页面私有 div/grid 自己实现排序、筛选、分页、空状态和加载态。
- 所有表格必须提供刷新按钮。刷新按钮调用当前列表 query 的 `refetch()`；刷新期间使用 `isFetching` 禁用按钮并提供可感知的加载状态，不能通过整页重载刷新。
- 常规字段筛选使用 `DataView` 的 `searchBox`。刷新、新增、导出、批量处理等页面级操作统一放入 `toolbarTrailingRight`，排列在筛选区域右侧；不要在筛选区上方或表格外另起一排按钮。
- `toolbarTrailingRight` 内使用一个 `flex items-center justify-end gap-2` 操作组。按钮高度、尺寸和基线保持一致，主要操作放最右侧；刷新通常使用 `outline` 或 `ghost`，新增等主操作使用默认强调样式。
- 行级操作留在操作列；操作超过两个时优先收进“更多”菜单，不要挤进页面级工具栏。
- 表格继续由 `DataView` 负责空状态、加载态、分页、列设置和内部滚动。页面只组织 query、列、筛选条件及业务操作，不复制这些通用能力。

### 特殊业务筛选

- 已有页面中无法直接映射到 `useSearchBox`、列筛选或 `DataGrid` header adapter 的特殊业务筛选暂不要求迁移，也不要为了满足本规范强行改写其查询合同或交互逻辑。
- 特殊筛选仅指树选择、级联关系、业务状态组合、跨资源联动、日期区间联动等通用表格筛选不能完整表达的条件；普通文本、枚举、数值、日期等已有通用操作符可以表达的筛选，仍应接入 `DataView` 的 `searchBox`。
- 保留特殊筛选时，现有功能和查询语义优先，本轮规范补充不要求同步修改现有页面。后续只有在明确迁移该页面或通用表格已经具备等价能力时，再单独评估收敛。
- 特殊筛选应放在表格工具栏的筛选侧，与通用筛选形成一个可折行的筛选组；刷新、新增、导出等操作仍统一位于右侧操作组，不能因为存在特殊筛选就把操作按钮散落到标题栏或表格外。
- 窄屏下特殊筛选允许独占一行、纵向排列或收进“更多筛选”弹层，但必须保持标签清晰、可重置，并避免挤压右侧操作按钮。筛选变更后应按列表约定重置分页起点。
- 页面私有特殊筛选只负责业务条件与查询参数，不自行接管表格的加载、骨架屏、分页、刷新、空状态和列设置。

### 加载与刷新状态

- Admin 表格首次加载统一使用 CrewUI `DataGrid` 内置的表格骨架屏，配置 `gridProps.loadingOptions.variant = 'skeleton'`；不要在表格内容区显示 spinner、“正在加载……”文字、空白占位或页面私有骨架组件。
- `useDataModel({ loading })` 的 `loading` 只绑定首次加载或当前没有可展示数据的加载状态，例如 `listQuery.isLoading`，让骨架行保留真实表头、列宽和表格结构。
- 已有数据后的手动刷新、筛选、分页和后台重新请求应尽量保留当前表格内容，不要让整张表反复闪回骨架屏。此时使用 `isFetching` 驱动刷新按钮的禁用和旋转状态；需要额外反馈时使用组件支持的轻量刷新状态，不另放“正在加载”文本。
- 骨架行数量按常用可视区域设置，默认使用组件值即可；确需指定时使用 `skeletonRowCount`，不要在各页面复制不同形状、间距和动画的骨架实现。

```tsx
const handleRefresh = React.useCallback(() => {
  void listQuery.refetch()
}, [listQuery.refetch])

const toolbarActions = (
  <div className="flex items-center justify-end gap-2">
    <Button
      type="button"
      variant="outline"
      aria-label="刷新列表"
      disabled={listQuery.isFetching}
      onClick={handleRefresh}
    >
      <RefreshCw
        aria-hidden="true"
        className={cn('size-4', listQuery.isFetching && 'animate-spin')}
      />
      <span className="hidden sm:inline">刷新</span>
    </Button>
    <Button type="button" onClick={openCreateDialog}>
      <Plus aria-hidden="true" className="size-4" />
      新建
    </Button>
  </div>
)

return (
  // AdminPageLayout 统一提供标题区和内容区一致的响应式左右间距。
  <AdminPageLayout title="资源管理">
    <div className="h-full min-h-0 overflow-hidden">
      <DataView
        dataModel={dataModel}
        searchBox={searchBox}
        toolbarTrailingRight={toolbarActions}
        classNames={{
          root: 'h-full min-h-0',
          header: 'flex-wrap sm:flex-nowrap',
          searchBox: 'order-1 w-full sm:order-none sm:w-auto',
          actions: 'order-2 ml-auto justify-end sm:order-none',
          content: 'min-h-0 flex-1',
        }}
        gridProps={{
          header: { adapter: searchBoxAdapter },
          loadingOptions: {
            variant: 'skeleton',
          },
          classNames: {
            surface: 'flex h-full min-h-0 min-w-0 flex-1',
            viewport: 'min-h-0 min-w-0 flex-1 overflow-x-auto',
            body: 'min-h-0',
          },
        }}
        paginationOptions={paginationOptions}
      />
    </div>
  </AdminPageLayout>
)
```

### 移动端与窄屏

- Admin 页面必须至少覆盖手机窄屏和桌面两种宽度，不能只依赖桌面侧栏剩余空间设计。
- 窄屏下页面标题保持单行截断；内容区减少左右留白，不让固定宽度、最小宽度或绝对定位把页面撑出视口。
- 表格工具栏允许折行：筛选区域独占第一行并占满宽度，操作组在下一行右对齐。桌面宽度恢复为筛选在左、操作在右的同一行布局。
- 刷新按钮在窄屏可以只显示图标，但必须保留 `aria-label`；主操作保留清晰文字。次要操作较多时收进“更多”菜单，不能让按钮横向溢出或被压缩到不可点击。
- 数据列较多时保留表格横向滚动，并固定或优先保留关键名称列、状态列和操作列；不要为了塞进手机宽度把所有单元格强制换成多行。可隐藏的次要列应通过响应式列配置或列设置收敛。
- 分页区域允许换行或使用紧凑尺寸，触控按钮保持足够点击面积；弹窗、抽屉在窄屏使用接近全宽的布局，并保证提交操作始终可见。
- 新增或修改 Admin 列表页后，至少在约 `375px` 和常用桌面宽度各检查一次标题、筛选、操作组、横向滚动、分页与弹层。

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
登录成功并选定工作空间后，通过 `PCFUserApiService.getOrgProfile` 读取当前组织的
`businessCodes`，再由 app 入口决定进入前台还是 Admin。UIC 登录领域只负责认证
和工作空间选择，不包含 Admin 业务判断。

入口规则：

- `businessCodes` 只有 `MATRIX`：默认进入 `/admin`。
- 同时包含 `MATRIX` 和其他 code：默认进入前台，并在前台账号菜单显示“进入后台管理”，新窗口打开 `/admin`。
- 不包含 `MATRIX`，或者组织信息为空、读取失败：默认进入前台，不显示后台入口。
- `UNSPECIFIED` 按其他 code 处理，只有严格的单一 `MATRIX` 才默认进入后台。

登录成功且没有显式 `redirect` 参数时，UIC 返回 `/`，app 在该入口执行上述判断。
如果登录链接携带明确的 `redirect`，仍优先返回原地址。`/admin` 自身还会再次检查
当前组织是否包含 `MATRIX`，避免通过手工输入 URL 绕过入口判断。旧的
`cyacle:system-entry` localStorage 临时配置已经废弃。

## 禁止事项

- 不创建 Matrix domain 或 Matrix edition。
- 不把业务菜单写入通用 `AdminLayout`。
- 不在 app 中直接实现领域 CRUD 页面。
- 不让 Admin 路由复用前台 ShellRoute；两套布局保持独立。
- 不手动修改 `vineModules.gen.ts`、`vineStyles.gen.css` 等 Plot 生成文件。
