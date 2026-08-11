# React 组件写法

[← 返回 Web 文档入口](../web.md)

> 职责：规定 JSX 回调的稳定引用、Dialog 弹框布局，以及 Base UI detached trigger 浮层的使用方式。

组件内传给 JSX 属性或子组件的事件处理器、回调函数，默认使用 `React.useCallback` 定义稳定引用，并写全依赖；不要在组件体内直接声明 `function handleXxx()` 后再传给 `onClick`、`onChange` 等 props。只有不传给 JSX/子组件、也不会被依赖比较消费的纯局部函数，才可以保持普通函数。

```tsx
// 不推荐：每次 render 都重新创建并传给 JSX prop
function AccountPopover() {
  const navigate = useNavigate()

  function handleLogoutClick() {
    void navigate({ to: crossDomainRoutePaths.uic.login })
  }

  return <Button onClick={handleLogoutClick}>退出登录</Button>
}

// 推荐：传给 JSX prop 的 handler 使用稳定引用
function AccountPopover() {
  const navigate = useNavigate()
  const handleLogoutClick = React.useCallback(() => {
    void navigate({ to: crossDomainRoutePaths.uic.login })
  }, [navigate])

  return <Button onClick={handleLogoutClick}>退出登录</Button>
}
```

## Detached Trigger 浮层写法

Base UI 的 `Menu`、`Popover`、`PreviewCard` 都支持 detached trigger：触发点可以放在列表、表格、卡片内部，`Root` 和 `Popup/Content/Card` 只在外层渲染一次。多个触发点共享一个浮层时，创建一个 `handle`，同时传给 `Trigger` 和 `Root`，并用 `payload` 传当前行、当前卡片或当前节点的数据。

优先使用 detached trigger 的场景：表格行操作菜单、列表项更多操作、hover 预览卡、侧边栏收起态子菜单、虚拟列表或大量重复 item 中的浮层。简单的一对一浮层仍然就近组合 `Root + Trigger + Content`。`Menu` 只建议给顶层菜单使用 detached trigger；子菜单 trigger 仍放在 `SubmenuRoot` 内部。

```tsx
const rowMenu = React.useMemo(() => Menu.createHandle(), [])

return (
  <>
    {rows.map((row) => (
      <Menu.Trigger key={row.id} id={row.id} handle={rowMenu} payload={row}>
        更多
      </Menu.Trigger>
    ))}

    <Menu.Root handle={rowMenu}>
      {({ payload }) => {
        const row = payload as Row | undefined

        return row ? (
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end">
              <Menu.Popup>
                <Menu.Item onClick={() => editRow(row)}>编辑</Menu.Item>
                <Menu.Item onClick={() => copyRow(row)}>复制</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        ) : null
      }}
    </Menu.Root>
  </>
)
```

`PreviewCard.createHandle()` 和 `Popover.createHandle()` 同理；把预览卡、状态详情、统计说明、快捷编辑面板等浮层内容放在外层单例里，通过 `payload` 渲染当前行内容。

## Dialog 弹框布局标准

表单、选择器、详情配置等内容可能超过视口高度的 Dialog，必须固定头部和底部操作区，只允许中间内容区滚动。不要把 `overflow-y-auto` 直接写在 `DialogContent` 上，否则标题、关闭按钮和底部 `取消/确认` 操作会跟着内容一起滚动，不同页面也容易出现弹框高度和按钮位置不一致。

推荐结构：

1. `DialogContent` 负责弹框最大高度、纵向 flex 和整窗裁剪：`flex max-h-[88vh] flex-col overflow-hidden`。
2. `DialogHeader` 和 `DialogFooter` 使用 `shrink-0`，底部操作始终留在弹框底部。
3. 中间 body 使用 `min-h-0 flex-1 overflow-y-auto`；如果 body 内部是表格、树、编辑器等自带滚动的固定区域，则 body 用 `overflow-hidden`，由内部组件负责滚动。
4. 表单弹框的 `form` 本身也要是 `flex min-h-0 flex-1 flex-col`，不要只让 `FieldGroup` 撑开弹框。
5. 小型确认弹框内容确定不会溢出时可以保持默认 Dialog；一旦有较长表单、上传区、动态列表、条件字段或多语言 textarea，就按固定头尾结构实现。

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden sm:!max-w-4xl">
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <DialogHeader className="shrink-0">
        <DialogTitle>编辑数据</DialogTitle>
        <DialogDescription>维护基础信息和扩展字段。</DialogDescription>
      </DialogHeader>

      <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4">
        <FieldGroup className="gap-5 py-6">
          {/* fields */}
        </FieldGroup>
      </div>

      <DialogFooter className="shrink-0">
        <Button type="button" variant="outline" onClick={handleCancel}>取消</Button>
        <Button type="submit">保存</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

选择数据、选择变量、选择关联对象这类弹框通常中间是表格或树，推荐固定一个中间区域高度，并让表格或树占满这个区域：

```tsx
<DialogContent className="flex max-h-[88vh] flex-col overflow-hidden sm:!max-w-5xl">
  <DialogHeader className="shrink-0">
    <DialogTitle>选择数据</DialogTitle>
  </DialogHeader>

  <div className="-mx-4 h-[520px] min-h-0 flex-1 overflow-hidden px-4 py-2">
    <DataView className="h-full min-h-0 w-full" height="100%" />
  </div>

  <DialogFooter className="shrink-0">
    <Button type="button" variant="outline">取消</Button>
    <Button type="button">确认</Button>
  </DialogFooter>
</DialogContent>
```

如果多个弹框属于同一个业务 domain，优先在当前 domain 内抽局部 className 常量或小组件统一这些 class，不要为了某个领域页面直接修改 base 的 `DialogContent` 默认样式。修改 `/admin/**` 相关弹框时，后台专属布局也应留在后台路由或后台 domain 内，不要让后台弹框样式影响前台弹框。
