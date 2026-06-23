# WorkbenchSidebar 使用说明

`WorkbenchSidebar` 是一个组合式工作区侧边菜单组件，适合截图中的“上方分组菜单 + 下方未分组菜单 + 最底部自定义区域”结构。组件内部已经包含：

- 左右折叠/展开的边缘把手。
- 上方 `Content` 滚动到顶部/底部时自动显示或隐藏的渐变阴影。
- 和旧项目一致的原生滚动条；滚动条只在滚动发生时显示，停止滚动后自动隐藏。
- 分组标题默认可点击折叠/展开，折叠箭头只在标题 hover 或键盘聚焦时显示。
- 展开态与折叠态两套菜单项布局。
- 默认使用 `bg-sidebar` 作为背景色，不强加右侧边框。
- `Bottom` 自定义区域，适合放模式切换、账号入口、状态按钮等。

## 基础用法

```tsx
import { useState } from 'react'
import { BarChart3, FileText, Info, Package2 } from 'lucide-react'
import { WorkbenchSidebar } from '@carbonnt-cyacle/web-base'

export function AccountingSidebar() {
  const [activeItemId, setActiveItemId] = useState('analysis-tools')

  return (
    <WorkbenchSidebar
      activeItemId={activeItemId}
      storageKey="accounting-sidebar-expanded"
      labels={{ navigation: '产品碳核算菜单' }}
      onItemSelect={({ id }) => setActiveItemId(id)}
    >
      <WorkbenchSidebar.Content>
        <WorkbenchSidebar.Group title="核算信息">
          <WorkbenchSidebar.Item id="basic" icon={Info} compactLabel="基础">
            基础信息
          </WorkbenchSidebar.Item>
          <WorkbenchSidebar.Item id="output" icon={Package2} compactLabel="产品">
            输出产品
          </WorkbenchSidebar.Item>
        </WorkbenchSidebar.Group>

        <WorkbenchSidebar.Group title="计算分析">
          <WorkbenchSidebar.Item
            id="analysis-tools"
            icon={BarChart3}
            compactLabel="分析"
          >
            分析工具
          </WorkbenchSidebar.Item>
        </WorkbenchSidebar.Group>

      </WorkbenchSidebar.Content>

      <WorkbenchSidebar.Footer>
        <WorkbenchSidebar.Ungrouped>
          <WorkbenchSidebar.Item id="report" icon={FileText} compactLabel="报告">
            核算报告
          </WorkbenchSidebar.Item>
        </WorkbenchSidebar.Ungrouped>

        <WorkbenchSidebar.Bottom>
          <YourModeSwitch />
        </WorkbenchSidebar.Bottom>
      </WorkbenchSidebar.Footer>
    </WorkbenchSidebar>
  )
}
```

## 受控展开状态

默认情况下组件自己维护展开状态。需要由页面控制时传入 `expanded` 与 `onExpandedChange`：

```tsx
const [expanded, setExpanded] = useState(true)

<WorkbenchSidebar
  expanded={expanded}
  onExpandedChange={setExpanded}
  activeItemId={activeItemId}
  onItemSelect={({ id }) => setActiveItemId(id)}
>
  {/* ... */}
</WorkbenchSidebar>
```

`storageKey` 可用于把非受控展开状态写入 `localStorage`。受控模式下也会在用户点击折叠把手时写入该 key。

## 自定义背景

组件默认带 `bg-sidebar`。项目里的 `cn` 使用 `twMerge`，因此可以通过 `className` 覆盖背景色；需要自定义色值时也可以使用 `style`：

```tsx
<WorkbenchSidebar className="bg-card" />

<WorkbenchSidebar style={{ backgroundColor: 'var(--sidebar)' }} />
```

## A11y labels 与多语言

`labels` 是无障碍文案配置，不只是可见 UI 文案：

- `navigation`：传给 `WorkbenchSidebar.Content` 内部 `nav` 的 `aria-label`。
- `collapse`：展开态边缘折叠把手的 `aria-label` 和 `title`。
- `expand`：收起态边缘展开把手的 `aria-label` 和 `title`。

`labels` 的每个字段都可以单独覆盖；未传字段会回退到组件默认中文。多语言页面建议始终按当前语言完整传入三个字段，避免页面语言和屏幕阅读器文案不一致。

推荐把 labels 放在语言映射或 i18n messages 里，保证传给组件的是稳定对象：

```tsx
import type { WorkbenchSidebarLabels } from '@carbonnt-cyacle/web-base'

type AppLanguage = 'zh-CN' | 'en-US'

const ACCOUNTING_SIDEBAR_LABELS = {
  'zh-CN': {
    collapse: '收起产品碳核算菜单',
    expand: '展开产品碳核算菜单',
    navigation: '产品碳核算菜单',
  },
  'en-US': {
    collapse: 'Collapse product carbon accounting menu',
    expand: 'Expand product carbon accounting menu',
    navigation: 'Product carbon accounting menu',
  },
} satisfies Record<AppLanguage, WorkbenchSidebarLabels>

function AccountingSidebar({ language }: { language: AppLanguage }) {
  return (
    <WorkbenchSidebar labels={ACCOUNTING_SIDEBAR_LABELS[language]}>
      {/* ... */}
    </WorkbenchSidebar>
  )
}
```

如果文案来自 hook 或运行时计算，使用 `useMemo` 包住 labels 对象，避免每次 render 都创建新引用导致整棵菜单 context 更新：

```tsx
const labels = React.useMemo<WorkbenchSidebarLabels>(
  () => ({
    collapse: t.sidebar.collapse,
    expand: t.sidebar.expand,
    navigation: t.sidebar.navigation,
  }),
  [t.sidebar.collapse, t.sidebar.expand, t.sidebar.navigation],
)

<WorkbenchSidebar labels={labels}>{/* ... */}</WorkbenchSidebar>
```

菜单项自身的可见文案仍由 `WorkbenchSidebar.Item` 的 children 和 `compactLabel` 提供，分组标题由 `WorkbenchSidebar.Group` 的 `title` 提供；这些也应从当前语言的业务 i18n 中取值。若直接给 `WorkbenchSidebar.Content` 传 `aria-label`，它会优先于 `labels.navigation`，同样需要按当前语言传入。

## 分组折叠

`WorkbenchSidebar.Group` 有标题时默认可以点击标题折叠。需要默认收起或由页面控制时，可以使用：

```tsx
<WorkbenchSidebar.Group title="计算分析" defaultCollapsed>
  {/* ... */}
</WorkbenchSidebar.Group>

<WorkbenchSidebar.Group
  title="交付成果"
  collapsed={collapsed}
  onCollapsedChange={setCollapsed}
>
  {/* ... */}
</WorkbenchSidebar.Group>
```

如果某个标题只作为静态分隔文案，传入 `collapsible={false}` 即可。

## 自定义 bottom 区域

`WorkbenchSidebar.Footer` 不在滚动区内，适合放下方未分组菜单和 bottom。`WorkbenchSidebar.Bottom` 不限制内容。自定义内容如果需要知道当前是否折叠，可以在子组件里使用 `useWorkbenchSidebar()`：

```tsx
import { useWorkbenchSidebar } from '@carbonnt-cyacle/web-base'

function YourModeSwitch() {
  const { expanded } = useWorkbenchSidebar()

  return expanded ? <ExpandedModeSwitch /> : <CompactModeSwitch />
}
```

## 常用 props

- `activeItemId`：当前激活菜单项 id。
- `onItemSelect`：点击菜单项后的统一回调。
- `expanded` / `defaultExpanded` / `onExpandedChange`：展开状态控制。
- `expandedWidth` / `collapsedWidth`：展开和折叠宽度，支持数字或 CSS 尺寸字符串。
- `className` / `style`：覆盖根节点样式，可用于自定义 sidebar 背景色。
- `labels`：覆盖无障碍文案，如 `collapse`、`expand`、`navigation`。
- `WorkbenchSidebar.Content`：唯一的滚动区域，推荐只放上方分组菜单。
- `WorkbenchSidebar.Footer`：滚动区域外的底部区域，推荐放 `Ungrouped` 和 `Bottom`。
- `WorkbenchSidebar.Group` 的 `defaultCollapsed` / `collapsed` / `onCollapsedChange`：控制单个分组的折叠状态。
- `WorkbenchSidebar.Group` 的 `collapsible`：是否允许点击分组标题折叠，默认 `true`。
- `WorkbenchSidebar.Item` 的 `compactLabel`：折叠态显示的短标签；未传时使用完整菜单文案。
- `WorkbenchSidebar.Item` 的 `disabled`：禁用菜单项，适合截图中灰态的 `LCI结果`。

## Demo route

组件目录导出了 `createWorkbenchSidebarDemoRoute`，app 层可直接挂到 shell route 下：

```tsx
import { createWorkbenchSidebarDemoRoute } from '@carbonnt-cyacle/web-base'

ShellRoute.addChildren([
  createWorkbenchSidebarDemoRoute({ parentRoute: ShellRoute }),
])
```

当前项目已接入 `/demo/workbench-sidebar`。
