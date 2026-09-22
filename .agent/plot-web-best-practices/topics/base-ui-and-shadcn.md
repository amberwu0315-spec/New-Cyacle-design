# Plot Web Base UI 与 shadcn


## 适用范围

用于 Base UI/shadcn 组件的使用、封装、性能调整、新增和上游升级。先读取目标项目的 `components.json`、Base UI package、`components/ui/index.ts` 和待改组件源码。

Plot Web 当前组件基线通常是 Vite + Base UI + shadcn `base-nova`。必须以目标 `components.json` 的 `style`、`rsc`、aliases、icon library、menu color/accent 为准。

## Base UI 约定

- 复用目标项目已有 shadcn 组件、variant 和可访问语义。
- 自定义 Trigger 使用 Base UI `render`，不用 Radix `asChild`。
- `render` 改变 Button 根元素时，按当前封装设置 `nativeButton={false}`。

## Detached Trigger 性能模式

### 推荐场景

列表、表格、树或虚拟列表中有大量同构 Menu/Popover/PreviewCard，并且任意时刻只需要一个浮层内容时，使用 Base UI detached trigger：

```text
每行一个 Root + Portal + Content
→ 多个浮层状态树、订阅和 Portal 生命周期

多个轻量 Trigger + 一个共享 Root/Content
→ 只保留一个浮层实例，通过 payload 切换当前实体
```

这项优化针对**重复浮层实例数量**，不是所有浮层的默认写法。

```text
一对一 Trigger/Content                  → 就近组合，不使用 handle
大量行共享相同浮层结构                  → detached trigger
多个浮层必须同时打开或各自保留内部状态   → 独立 Root
Submenu                                → Trigger 保持在 SubmenuRoot 内
```

### 项目参考模板：共享 DropdownMenu

shadcn wrapper 必须保留 Base UI 的 payload 泛型；否则共享 Root 的 `payload` 会退化为 `unknown`：

```tsx
function DropdownMenu<Payload = unknown>(props: MenuPrimitive.Root.Props<Payload>) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger<Payload = unknown>(props: MenuPrimitive.Trigger.Props<Payload>) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}
```

业务代码创建 typed handle，不使用断言恢复类型：

```tsx
import { useMemo } from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@scope/web-base"

const rowMenu = useMemo(() => MenuPrimitive.createHandle<Row>(), [])

return (
  <>
    {rows.map((row) => (
      <DropdownMenuTrigger
        key={row.id}
        id={row.id}
        handle={rowMenu}
        payload={row}
        render={<Button variant="ghost" size="icon" />}
      >
        更多
      </DropdownMenuTrigger>
    ))}

    <DropdownMenu handle={rowMenu}>
      {({ payload: row }) =>
        row ? (
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => editRow(row)}>
              编辑
            </DropdownMenuItem>
          </DropdownMenuContent>
        ) : null
      }
    </DropdownMenu>
  </>
)
```

- Handle 使用 `useMemo` 保持稳定。
- 每个 Trigger 的 `id` 稳定且唯一，`payload` 携带当前实体。
- `triggerId` 只能指向同一 handle 注册的 Trigger；普通 DOM id 不能代替。
- 共享 Root 放在 rows 循环外，只渲染一次 Content。
- 优化前后用 React Profiler 或挂载计数验证，不凭组件数量主观宣称提升。

## Activity 与浮层生命周期

```text
隐藏后必须保留 DOM/state 的重型面板 → Activity
隐藏时应释放资源                     → 条件渲染卸载
```

Activity hidden 会清理 Effect，恢复时 Effect 重跑。iframe、media、canvas、WebSocket、MessagePort 和 SDK 必须区分“同资源恢复”与“新资源加载”，不能恢复时无条件重置 loading。

Outside press 不应穿透到下层操作时使用 modal。不要全局关闭动画，也不要条件移除 Content 来绕过退出生命周期。

## 新增 shadcn 组件

从 Base Web package 运行 shadcn CLI；依赖事务仍由 Plot 管理。

```bash
cd domain/base/src/<artifact>
pnpm exec shadcn info --json
pnpm exec shadcn docs <component>
pnpm exec shadcn add <component> --dry-run
```

执行前确认：

1. `components.json` 指向当前 `src/styles/globals.css` 和 `#/components/ui`。
2. 组件尚未存在，或任务明确要求升级。
3. Dry run 涉及的新增第三方依赖已从项目根通过 Plot 声明：

```bash
plot pnpm add <package> --domain base
```

再运行实际 add，并检查新增源码、imports 和 `components/ui/index.ts`。Plot Vite 项目 `rsc: false`，生成源码不保留无意义的 `"use client"`。

## 升级 shadcn / Base UI

### 1. 升级依赖版本

从项目根更新 catalog；不要进入 Base package 直接 `pnpm add/update`：

```bash
plot pnpm update shadcn@<range>
plot pnpm update @base-ui/react@<range>
plot pnpm install --frozen-lockfile
```

依赖升级不等于组件源码已升级。shadcn 组件是项目源码，必须逐组件比较和合并。

### 2. 预览组件差异

```bash
cd domain/base/src/<artifact>
pnpm exec shadcn add <component> --dry-run
pnpm exec shadcn add <component> --diff <component-file>
```

### 3. 按文件合并

```text
本地文件无定制 → 可按上游更新
本地文件有定制 → 阅读 local + diff，手工合并上游行为并保留项目 API
用户明确允许全部覆盖 → 才使用 --overwrite
```

禁止直接从 GitHub 下载 raw component 覆盖。不要批量升级所有组件来完成单个组件任务。

### 4. 更新公共出口并验证

- `components/ui/index.ts` 导出新增或改名组件。
- 保留 `components.json` 的 style、base、aliases、iconLibrary、menuColor/menuAccent。
- 检查 Base UI `render` API、Title/Group 结构、data attributes 和动画 selector。
- 新依赖保持 `catalog:<artifact>`，不产生 domain lockfile。

```bash
cd domain/base/src/<artifact>
pnpm typecheck
pnpm test

cd ../../../../app/src/<artifact>
pnpm typecheck
pnpm test
pnpm build
```

## DO / NOT

| DO | NOT |
| --- | --- |
| 先 info/docs/dry-run/diff | 凭记忆生成或升级组件 API |
| 多行同构浮层才用 detached trigger | 每个普通 Popover 都创建 handle |
| 一个共享 Root + typed payload | rows 循环内重复挂载 Content |
| 逐文件保护本地定制 | 未检查 diff 直接覆盖 |
| 依赖版本由 `plot pnpm` 管理 | shadcn CLI 留下独立依赖事务/lockfile |
| 更新 UI barrel 并跑 Base + App 验证 | 只看组件文件 typecheck |
