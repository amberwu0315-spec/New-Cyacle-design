# Dialog 与 Drawer 浮层协作规范

[← 返回 Web 文档入口](../web.md)

> 职责：统一 Dialog、数据选择器和详情 Drawer 同时出现时的层级、生命周期、焦点与关闭行为。业务 domain 不自行维护浮层栈，也不通过临时提高 `z-index` 修复遮挡。

## 适用范围

本规范适用于以下组合：

- 普通页面打开 Dialog。
- 数据选择器 Dialog 中查看对象详情。
- 详情 Drawer 中打开编辑、删除等 Dialog。
- 详情 Drawer 中再次打开数据选择器，并继续查看嵌套对象详情。

Popover、Select、Tooltip 等组件继续使用各自 Primitive 的定位和层级；如果它们通过自定义 Portal 脱离当前浮层上下文，必须显式接入本规范并补充交互测试。

## 统一模型

页面中最多存在一个详情 Drawer。嵌套查看详情时，不创建第二个 Drawer，而是在同一个 `DataSelectorDetailDrawer` 中压入详情历史；关闭或返回时恢复上一层详情。

数据选择器 Dialog 可以有多个，但只有栈顶选择器处于 `active` 状态并可交互：

| 状态 | 是否可见 | 是否 modal | 是否可交互 | 用途 |
| --- | --- | --- | --- | --- |
| `active` | 是 | 是 | 是 | 当前正在操作的选择器 |
| `suspended` | 是 | 否 | 否 | 当前 Drawer 后面保留的选择器 |
| `hidden` | 否 | 否 | 否 | 更早的选择器，仅保留现场 |

打开详情时，当前选择器从 `active` 切换为 `suspended`，仍显示在 Drawer 后方并保留搜索、分页、排序和选中项。关闭 Drawer 后恢复为 `active`。不得为了打开详情而销毁选择器、把其 `open` 改为 `false`，或在返回时重新创建一个空白选择器。

## 固定层级

| 层级 | 内容 |
| --- | --- |
| `0` | 普通页面 |
| `50` | 页面直接打开的普通 Dialog |
| `60` | `suspended` 数据选择器 |
| `70` | 唯一详情 Drawer |
| `80` | `active` 数据选择器；Drawer 内第一层 Dialog |
| `90` 及以上 | Dialog 内继续打开的 Dialog，每层递增 `10` |

Dialog 的 Backdrop 和 Popup 必须处于同一层级，避免遮罩盖住自身内容。普通页面 Dialog 没有浮层上下文时仍使用默认层级 `50`。

统一复用 Base 能力：

- `OverlayLayerScope`：声明 Drawer 或 Dialog 所在的基础层级。
- `useOverlayLayer`：让共享 Dialog 根据父浮层自动递增。
- `useDataSelectorDialogLayer`：管理选择器栈、状态、modal、外部点击保护和关闭事件保护。
- `DataSelectorDetailDrawer` / `useDataSelectorDetailDrawerHost`：承载唯一 Drawer 和详情历史。

业务组件不要写新的全局浮层 store，不要为单个页面添加 `z-[999]`，也不要只改 Popup 而遗漏 Backdrop。

## 标准接入方式

选择器必须把 `useDataSelectorDialogLayer` 返回的 `dialogProps` 原样传给 Dialog Root，并把内容状态传给 `DialogContent`：

```tsx
const dialogLayer = useDataSelectorDialogLayer({ open, onOpenChange })

<Dialog {...dialogLayer.dialogProps}>
  <DialogContent
    inert={dialogLayer.inert ? true : undefined}
    hidden={dialogLayer.hidden}
    className={cn(dialogLayer.layerClassName, "...")}
  >
    {/* selector content */}
  </DialogContent>
</Dialog>
```

打开详情前先调用 `dialogLayer.suspend()`；关闭或返回详情时调用 `dialogLayer.resume()`。不要绕过 `dialogProps.onOpenChange` 直接把受控状态传给 Dialog Root，因为 Drawer 的关闭点击、焦点迁移和 Escape 对挂起选择器都属于“外部交互”，必须由 Base 统一拦截，防止选择器被误关。

Drawer 内打开的普通编辑 Dialog 不需要业务代码指定层级。`DataSelectorDetailDrawer` 已提供 `OverlayLayerScope baseLayer={70}`，共享 `DialogContent` 会自动进入 `80`；Dialog 内再打开 Dialog 时继续自动递增。

## 生命周期和 Portal

详情历史中的旧详情必须保留挂载状态，才能保留由它拥有的选择器 Portal 和表单现场。包含已打开 Dialog 的详情子树不能使用 `React.Activity mode="hidden"` 隐藏，因为 Activity 会清理 Effect，可能触发 Dialog 关闭；应使用 CSS `display: none` / 可见性包装层，或者把 Dialog 的 owner 提升到 Activity 外部。

这里的“保留挂载”只用于 Drawer 详情历史。普通已关闭 Dialog 仍应正常卸载或停止查询。详情页应继续以 `embedded` 等既有参数控制查询范围，避免隐藏历史页发起无边界请求。

## 焦点、键盘与关闭规则

- `active` 选择器是唯一 modal、可点击、可接收键盘输入的选择器。
- `suspended` 选择器设置 `inert`，禁止鼠标和键盘交互，同时禁止外部点击或焦点迁移将其关闭。
- Drawer 打开时焦点进入 Drawer；Drawer 内 Dialog 打开时焦点进入该 Dialog。
- Escape 只关闭当前最上层浮层：先关闭内层 Dialog，再关闭或返回 Drawer，最后才轮到恢复后的选择器。
- 关闭 Drawer 不得关闭其后方的选择器；关闭编辑 Dialog 不得关闭 Drawer。
- 嵌套详情的关闭动作等同于“返回上一层详情”；只有详情历史为空时才真正关闭 Drawer。

## 最低回归矩阵

新增或修改这类交互时，至少验证：

- [ ] 选择器打开后，筛选、分页、排序和选中项正常。
- [ ] 点击名称查看详情后，Drawer 位于选择器上方，选择器仍可见但不可交互。
- [ ] Drawer 内打开编辑 Dialog 后，编辑 Dialog 位于 Drawer 上方。
- [ ] 关闭编辑 Dialog 后，Drawer 和选择器都保留。
- [ ] 关闭 Drawer 后，原选择器恢复可交互，筛选、分页、排序和选中项不丢失。
- [ ] Drawer 中打开第二个选择器并查看第二层详情时，页面始终只有一个 Drawer。
- [ ] 从第二层详情返回后，第二个选择器恢复；关闭第二个选择器后仍回到第一层详情。
- [ ] 连续按 Escape 时，每次只关闭一个最上层浮层。
- [ ] Backdrop 不遮挡自身 Popup，任何被遮挡的浮层都不能截获点击或焦点。

单元测试需覆盖选择器状态栈、挂起选择器的关闭保护和唯一 Drawer 历史；涉及实际 Primitive、Portal、焦点或 Backdrop 的修改，还必须在本地壳子页面完成浏览器回归，不能只凭组件测试判定通过。
