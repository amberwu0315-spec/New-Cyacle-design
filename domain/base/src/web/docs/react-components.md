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
3. 普通滚动内容统一使用 `DialogBody`。它自身承担 `-mx-4 my-4 min-h-0 flex-1 overflow-y-auto px-4`，固定头尾间距通过 `my-4` 保持，不要在滚动内容上只设置 `py-4`。业务 `className` 继续作用于同一个滚动层，保证表格、树、DataGrid 等现有高度和滚动链不被拆断。
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

      <DialogBody>
        <FieldGroup className="gap-5">
          {/* fields */}
        </FieldGroup>
      </DialogBody>

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

  <DialogBody className="h-[520px] overflow-hidden py-2">
    <DataView className="h-full min-h-0 w-full" height="100%" />
  </DialogBody>

  <DialogFooter className="shrink-0">
    <Button type="button" variant="outline">取消</Button>
    <Button type="button">确认</Button>
  </DialogFooter>
</DialogContent>
```

如果多个弹框属于同一个业务 domain，优先在当前 domain 内抽局部 className 常量或小组件统一这些 class，不要为了某个领域页面直接修改 base 的 `DialogContent` 默认样式。修改 `/admin/**` 相关弹框时，后台专属布局也应留在后台路由或后台 domain 内，不要让后台弹框样式影响前台弹框。

## 日期选择控件

业务表单中的单日期字段优先使用 Base 导出的 `DatePicker`；只有日期范围、快捷选项等交互明显不同的场景，才通过 Base 的 `Calendar` 与 `Popover` 组合领域组件。不要使用原生 `<input type="date">`。原生日期输入的展示格式和弹层样式受浏览器、操作系统及语言环境影响，无法保证中英文界面和不同终端保持一致。

- 纯日期在界面中统一展示为 `YYYY-MM-DD`。
- 通用解析、格式化和输入规范化使用 Base 导出的 `parseDateInputValue`、`formatDateInputValue`、`normalizeDateInputValue`；不要在业务 domain 重复实现同名逻辑。
- 组件内部优先使用 `Date | undefined`；如果接口字段约定为字符串，则只在控件边界进行 `Date` 与字符串转换，不要改变既有接口提交格式。
- 日历语言跟随当前应用语言，触发器、占位文案和清除操作使用领域多语言文案。
- 支持键盘输入的日期选择器应在失焦时校验并规范化为 `YYYY-MM-DD`；非法输入必须显示字段错误并阻止提交，不能静默回退到上一次合法值。
- 表格或 SearchBox 的日期筛选优先使用 CrewUI 字段构建器提供的 `date` / `dateRange`，不要用 `custom + <input type="date">` 重写；内置编辑器已经包含输入、日历、失焦校验、范围顺序和多语言能力。
- 新增或改造日期字段时，应同时检查默认值、回显、清空、提交和时区边界，避免日期前移或后移一天。
