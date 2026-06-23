# AppShellFrame 使用说明

`AppShellFrame` 是应用壳子的组合式基础组件，使用方式参考 `WorkbenchSidebar`：Root 提供 shell 状态，`Nav` 提供导航派生状态，具体视觉区域由 `Sidebar`、`SidebarNav`、`Topbar`、`Breadcrumbs`、`Main`、`Overlays` 组合。

使用方只关心自己的逻辑数据编排：准备 `navConfig`、当前 `pathname`、账号/工作空间等业务 slot。`isSelected`、active scene、active item、breadcrumbs、移动端侧栏和 scene panel 状态都由组件内部管理。

## 基础用法

```tsx
import { AppShellFrame, formatMessage } from '@carbonnt-cyacle/web-base'

export function AppLayout() {
  return (
    <AppShellFrame routeKey={pathname}>
      <AppShellFrame.Nav navConfig={navConfig} pathname={pathname}>
        <AppShellFrame.Body>
          <AppShellFrame.Sidebar
            resizeLabel={t.common.shell.sidebar.resizeLabel}
            resizeHint={t.common.shell.sidebar.resizeHint}
          >
            <AppShellFrame.SidebarBrand
              href="/"
              label={t.common.shell.sidebar.brandName}
              homeLabel={t.common.shell.sidebar.homeLink}
              logoSrc={logo}
              onNavigate={navigateTo}
            />
            <AppShellFrame.SidebarNav
              labels={{
                scenePicker: (scene) =>
                  formatMessage(t.common.shell.sidebar.scenePickerLabel, {
                    label: scene.label,
                  }),
              }}
              onNavigate={navigateTo}
            />
          </AppShellFrame.Sidebar>

          <AppShellFrame.Content>
            <AppShellFrame.Topbar>
              <AppShellFrame.TopbarStart>
                <AppShellFrame.SidebarTrigger
                  labels={{
                    open: t.common.shell.topbar.openSidebar,
                    expand: t.common.shell.topbar.expandSidebar,
                    collapse: t.common.shell.topbar.collapseSidebar,
                  }}
                />
                <AppShellFrame.Breadcrumbs />
              </AppShellFrame.TopbarStart>

              <AppShellFrame.TopbarEnd>
                <AccountPopover />
              </AppShellFrame.TopbarEnd>
            </AppShellFrame.Topbar>

            <AppShellFrame.Main>
              <Outlet />
            </AppShellFrame.Main>
          </AppShellFrame.Content>
        </AppShellFrame.Body>
      </AppShellFrame.Nav>

      <AppShellFrame.Overlays>
        <WorkspaceSelectionDialog />
      </AppShellFrame.Overlays>
    </AppShellFrame>
  )
}
```

## 导航职责

`AppShellFrame.Nav` 只接收逻辑数据：

- `navConfig`：外层按 domain capabilities 聚合后的导航配置。
- `pathname`：外层从 router 取到的当前路径。

组件内部会派生：

- 当前 active scene。
- 当前 active item。
- 分组后的 scene picker 数据。
- sidebar 展开/收起状态下不同的 breadcrumbs。
- scene/item 的选中态样式。

所以使用方不需要给每个导航项计算 `isSelected`，也不需要为了面包屑去读取 active item。

## 子组件

`AppShellFrame` 挂载了这些子组件：

- `AppShellFrame.Nav`：导航状态 provider，必须包住 `SidebarNav` 和默认 `Breadcrumbs`。
- `AppShellFrame.Body`：根内容行，默认 `flex h-full min-h-0 w-full`。
- `AppShellFrame.Sidebar`：左侧栏容器，管理移动端遮罩、桌面折叠、宽度拖拽。
- `AppShellFrame.SidebarBrand`：品牌入口，支持自定义 logo、标题和 navigate handler。
- `AppShellFrame.SidebarNav`：渲染 scene picker、scene 列表和当前 scene 的 group/items。
- `AppShellFrame.Content`：右侧内容列。
- `AppShellFrame.Topbar`：顶栏容器。
- `AppShellFrame.TopbarStart`：顶栏左侧 slot，默认放侧栏按钮和面包屑。
- `AppShellFrame.SidebarTrigger`：侧栏按钮，默认使用 active item/scene icon，hover 和移动端显示菜单图标。
- `AppShellFrame.Breadcrumbs`：默认从 nav context 生成面包屑，也可传 `items` 覆盖。
- `AppShellFrame.TopbarEnd`：顶栏右侧业务 slot。
- `AppShellFrame.Main`：页面主内容滚动区。
- `AppShellFrame.Overlays`：全局 dialog、bootstrap error 等覆盖层组合。

## 内部结构

组件按职责保持中等粒度拆分，外部仍从 `index.ts` 使用统一导出：

- `index.ts`：包级导出入口，组合 `Object.assign`，维护 `AppShellFrame.*` 的公开 API。
- `types.ts`：公共类型定义。
- `widgets/contexts.tsx`：shell/nav/sidebar context 和公开 hook。
- `widgets/root.tsx`：Root、Body、Content、Main、Nav、Overlays，以及 shell 顶层状态。
- `widgets/sidebar.tsx`：Sidebar、SidebarBrand、SidebarNav 和侧栏交互。
- `widgets/topbar.tsx`：Topbar、TopbarStart、TopbarEnd、SidebarTrigger、Breadcrumbs。
- `widgets/nav-utils.ts`：active scene/item、breadcrumbs 和导航点击辅助逻辑。
- `widgets/storage-utils.ts`：cookie、localStorage 和移动端断点读取逻辑。

后续如果 `widgets/sidebar.tsx` 继续变大，再优先拆 `SidebarNav` 相关的 scene picker 和 group list，而不是继续拆根组件和 topbar。

## Context

`useAppShellFrame()` 会返回 shell 状态：

- `isMobile`
- `isMobileSidebarOpen`
- `isScenePanelOpen`
- `isSidebarOpen`
- `sidebarState`
- `toggleSidebar()`
- `closeMobileSidebar()`
- `setScenePanelOpen(open)`
- `closeScenePanel()`

`useAppShellFrameNav()` 会返回导航派生状态：

- `navConfig`
- `pathname`
- `activeScene`
- `activeItem`
- `categorizedScenes`

常规 app layout 通常不需要直接使用这些 hook；只有需要插入自定义 shell 子组件时再消费。

## 受控侧栏

默认情况下，桌面侧栏状态由 `AppShellFrame` 自己维护，并写入 cookie `sidebar_open`。需要外部控制时传入 `sidebarOpen` 和 `onSidebarOpenChange`：

```tsx
<AppShellFrame
  routeKey={pathname}
  sidebarOpen={sidebarOpen}
  onSidebarOpenChange={setSidebarOpen}
>
  {/* ... */}
</AppShellFrame>
```

## 持久化和断点

默认配置：

- 桌面侧栏 cookie：`sidebar_open`，7 天。
- 侧栏宽度 localStorage：`app:sidebar:width`。
- 分组折叠 localStorage：`app:sidebar:collapsed-groups`。
- 移动端断点：`(max-width: 1023px)`。
- 快捷键：`Cmd/Ctrl + B`。

都可以通过对应子组件 props 覆盖，例如 `sidebarCookieName`、`mobileMediaQuery`、`widthStorageKey`、`collapsedGroupsStorageKey`。

## 边界

`AppShellFrame` 负责 shell/nav 的渲染能力和 UI 状态管理，不负责业务数据获取。profile query、workspace query、logout、workspace select、assistant context 等仍放在 app/layout 层组合。
