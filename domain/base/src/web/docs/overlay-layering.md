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

详情 Drawer 按打开次数创建独立实例，最多同时存在 3 个 Drawer。每次调用当前 Drawer 提供的 `openDetail` 都会追加一个新的 Drawer；新的 Portal 节点位于旧节点之后，因此最新打开的 Drawer 显示在最前。达到上限后新的打开请求不会创建 Drawer，并通过 AlertDialog 提示用户先关闭已有 Drawer。关闭某个 Drawer 只移除该实例，不会切换或销毁其他 Drawer。

数据选择器 Dialog 可以有多个，但只有栈顶选择器处于 `active` 状态并可交互：

| 状态        | 是否可见 | 是否 modal | 是否可交互 | 用途                         |
| ----------- | -------- | ---------- | ---------- | ---------------------------- |
| `active`    | 是       | 是         | 是         | 当前正在操作的选择器         |
| `suspended` | 是       | 否         | 否         | 当前 Drawer 后面保留的选择器 |
| `hidden`    | 否       | 否         | 否         | 更早的选择器，仅保留现场     |

打开详情时，当前选择器从 `active` 切换为 `suspended`，仍显示在 Drawer 后方并保留搜索、分页、排序和选中项。关闭 Drawer 后恢复为 `active`。不得为了打开详情而销毁选择器、把其 `open` 改为 `false`，或在返回时重新创建一个空白选择器。

## 统一浮层顺序

浮层不再通过业务约定的 `z-index` 数值分层。所有 Base UI Portal 都挂载到 `document.body`，并保持 Backdrop 与 Popup 在同一个 Portal 中；浏览器按 Portal 节点在 DOM 中的顺序绘制浮层，后打开的浮层追加到后面，因此显示在最前。

每个浮层必须作为一个完整的 Portal 单元：

```text
Portal A: Backdrop A → Popup A
Portal B: Backdrop B → Popup B  ← 后打开，显示在最前
```

不要给 Dialog、Drawer、Popover、Select 或数据选择器添加 `z-[...]`、内联 `zIndex` 或按组件类型写死的层级。关闭动画完成前保留 Portal 节点，动画结束后再移除，避免节点顺序变化造成闪烁。

如果后续需要专用的 `overlay-root`，必须让所有浮层（包括 `@crew-ui/base` 的 DataGrid/SearchBox）共同使用同一个容器；在未完成依赖包适配前，统一使用 `document.body`，不要混用多个 Portal 容器。当前 `@crew-ui/base@5.0.0` 内部仍有少量固定 `z-index`，待该依赖发布适配版本后再移除，暂不通过业务 CSS 覆盖。

统一复用 Base 能力：

- `OverlayLayerScope`：保留兼容上下文，不再驱动 CSS 层级。
- `useOverlayLayer`：保留旧 API 兼容性；共享浮层的视觉顺序由 Portal DOM 顺序决定。
- `useDataSelectorDialogLayer`：管理选择器栈、状态、modal、外部点击保护和关闭事件保护。
- `DataSelectorDetailDrawerStackHost`：挂载 Base 级详情 Drawer 实例栈，并按打开顺序渲染多个 Drawer。
- `DataSelectorDetailDrawer` / `useDataSelectorDetailDrawerHost`：承载单个 Drawer，并为其内容提供追加详情实例的能力。

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

Drawer 内打开的普通编辑 Dialog 不需要业务代码指定层级。Dialog、Drawer 及其子浮层都通过各自的 Portal 按打开顺序排列，业务组件不传递或计算层级数值。

## 生命周期和 Portal

每个 Drawer 实例独立挂载自己的内容、选择器 Portal 和表单现场。关闭实例时只卸载该实例；其他 Drawer 不使用历史切换，也不因兄弟实例关闭而重新创建。普通已关闭 Dialog 仍应正常卸载或停止查询。详情页应继续以 `embedded` 等既有参数控制查询范围，避免隐藏内容发起无边界请求。

## 焦点、键盘与关闭规则

- `active` 选择器是唯一 modal、可点击、可接收键盘输入的选择器。
- `suspended` 选择器设置 `inert`，禁止鼠标和键盘交互，同时禁止外部点击或焦点迁移将其关闭。
- Drawer 打开时焦点进入 Drawer；Drawer 内 Dialog 打开时焦点进入该 Dialog。
- Escape 只关闭当前最上层浮层：先关闭内层 Dialog，再关闭或返回 Drawer，最后才轮到恢复后的选择器。
- 关闭 Drawer 不得关闭其后方的选择器；关闭编辑 Dialog 不得关闭 Drawer。
- 嵌套详情的关闭动作只关闭当前 Drawer；其他已打开的 Drawer 保持挂载和现场。

## 最低回归矩阵

新增或修改这类交互时，至少验证：

- [ ] 选择器打开后，筛选、分页、排序和选中项正常。
- [ ] 点击名称查看详情后，Drawer 位于选择器上方，选择器仍可见但不可交互。
- [ ] Drawer 内打开编辑 Dialog 后，编辑 Dialog 位于 Drawer 上方。
- [ ] 关闭编辑 Dialog 后，Drawer 和选择器都保留。
- [ ] 关闭 Drawer 后，原选择器恢复可交互，筛选、分页、排序和选中项不丢失。
- [ ] Drawer 中打开第二个选择器并查看第二层详情时，页面同时存在独立 Drawer，最新 Drawer 位于最前，最多 3 个。
- [ ] 关闭第二层详情时只移除当前 Drawer，第一层 Drawer 和第二个选择器的现场保持不变。
- [ ] 连续按 Escape 时，每次只关闭一个最上层浮层。
- [ ] Backdrop 不遮挡自身 Popup，任何被遮挡的浮层都不能截获点击或焦点。

单元测试需覆盖选择器状态栈、挂起选择器的关闭保护和多 Drawer 实例的独立关闭；涉及实际 Primitive、Portal、焦点或 Backdrop 的修改，还必须在本地壳子页面完成浏览器回归，不能只凭组件测试判定通过。
