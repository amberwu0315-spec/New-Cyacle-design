# React 组件写法

[← 返回 Web 文档入口](../web.md)

> 职责：规定 JSX 回调的稳定引用、Dialog 弹框布局，以及 Base UI detached trigger 浮层的使用方式。

组件内传给 JSX 属性或子组件的事件处理器、回调函数，默认使用 `React.useCallback` 定义稳定引用，并写全依赖；不要在组件体内直接声明 `function handleXxx()` 后再传给 `onClick`、`onChange` 等 props。只有不传给 JSX/子组件、也不会被依赖比较消费的纯局部函数，才可以保持普通函数。

```tsx
// 不推荐：每次 render 都重新创建并传给 JSX prop
function AccountPopover() {
  const navigate = useNavigate();

  function handleLogoutClick() {
    void navigate({ to: crossDomainRoutePaths.uic.login });
  }

  return <Button onClick={handleLogoutClick}>退出登录</Button>;
}

// 推荐：传给 JSX prop 的 handler 使用稳定引用
function AccountPopover() {
  const navigate = useNavigate();
  const handleLogoutClick = React.useCallback(() => {
    void navigate({ to: crossDomainRoutePaths.uic.login });
  }, [navigate]);

  return <Button onClick={handleLogoutClick}>退出登录</Button>;
}
```

## Detached Trigger 浮层写法

Base UI 的 `Menu`、`Popover`、`PreviewCard` 都支持 detached trigger：触发点可以放在列表、表格、卡片内部，`Root` 和 `Popup/Content/Card` 只在外层渲染一次。多个触发点共享一个浮层时，创建一个 `handle`，同时传给 `Trigger` 和 `Root`，并用 `payload` 传当前行、当前卡片或当前节点的数据。

优先使用 detached trigger 的场景：表格行操作菜单、列表项更多操作、hover 预览卡、侧边栏收起态子菜单、虚拟列表或大量重复 item 中的浮层。简单的一对一浮层仍然就近组合 `Root + Trigger + Content`。`Menu` 只建议给顶层菜单使用 detached trigger；子菜单 trigger 仍放在 `SubmenuRoot` 内部。

```tsx
const rowMenu = React.useMemo(() => Menu.createHandle(), []);

return (
  <>
    {rows.map((row) => (
      <Menu.Trigger key={row.id} id={row.id} handle={rowMenu} payload={row}>
        更多
      </Menu.Trigger>
    ))}

    <Menu.Root handle={rowMenu}>
      {({ payload }) => {
        const row = payload as Row | undefined;

        return row ? (
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end">
              <Menu.Popup>
                <Menu.Item onClick={() => editRow(row)}>编辑</Menu.Item>
                <Menu.Item onClick={() => copyRow(row)}>复制</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        ) : null;
      }}
    </Menu.Root>
  </>
);
```

`PreviewCard.createHandle()` 和 `Popover.createHandle()` 同理；把预览卡、状态详情、统计说明、快捷编辑面板等浮层内容放在外层单例里，通过 `payload` 渲染当前行内容。

## Dialog 弹框布局标准

表单、选择器、详情配置等内容可能超过视口高度的 Dialog，必须固定头部和底部操作区，只允许中间内容区滚动。不要把 `overflow-y-auto` 直接写在 `DialogContent` 上，否则标题、关闭按钮和底部 `取消/确认` 操作会跟着内容一起滚动，不同页面也容易出现弹框高度和按钮位置不一致。

推荐结构：

1. `DialogContent` 负责弹框最大高度、纵向 flex 和整窗裁剪：`flex max-h-[88vh] flex-col overflow-hidden`。
2. `DialogHeader` 和 `DialogFooter` 默认包含 `shrink-0`，底部操作始终留在弹框底部；业务代码不需要重复声明，但自定义头尾组件仍需遵守这一点。
   `DialogHeader` 必须包含明确的标题；`DialogDescription` 仅在有明确、必要的业务说明时添加。没有特殊说明时，普通表单弹框不要额外添加描述文案。
3. 普通滚动内容统一使用 `DialogBody`。它自身承担 `-mx-4 my-4 min-h-0 flex-1 overflow-y-auto px-4`，固定头尾间距通过 `my-4` 保持，不要在滚动内容上只设置 `py-4`。业务 `className` 继续作用于同一个滚动层，保证表格、树、DataGrid 等现有高度和滚动链不被拆断。
4. 表单弹框的 `form` 本身也要是 `flex min-h-0 flex-1 flex-col`，不要只让 `FieldGroup` 撑开弹框。
5. 小型确认弹框内容确定不会溢出时可以保持默认 Dialog；一旦有较长表单、上传区、动态列表、条件字段或多语言 textarea，就按固定头尾结构实现。

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden sm:!max-w-4xl">
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>编辑数据</DialogTitle>
        <DialogDescription>维护基础信息和扩展字段。</DialogDescription>
      </DialogHeader>

      <DialogBody>
        <FieldGroup className="gap-5">{/* fields */}</FieldGroup>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={handleCancel}>
          取消
        </Button>
        <Button type="submit">保存</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

选择数据、选择变量、选择关联对象这类弹框通常中间是表格或树，推荐固定一个中间区域高度，并让表格或树占满这个区域：

```tsx
<DialogContent className="flex max-h-[88vh] flex-col overflow-hidden sm:!max-w-5xl">
  <DialogHeader>
    <DialogTitle>选择数据</DialogTitle>
  </DialogHeader>

  <DialogBody className="h-[520px] overflow-hidden py-2">
    <DataView className="h-full min-h-0 w-full" height="100%" />
  </DialogBody>

  <DialogFooter>
    <Button type="button" variant="outline">
      取消
    </Button>
    <Button type="button">确认</Button>
  </DialogFooter>
</DialogContent>
```

`DialogBody` 外层的 `py-4` 是普通表单、详情和文字内容的统一默认值。这个固定留白不能下放到内层滚动区，也不需要给所有 `DialogHeader` 叠加底部 padding。这样小型确认弹框仍保持紧凑，滚动内容也不会贴住固定头部。表格型选择器为了保持工具栏和表格密度，可以通过 `containerClassName="py-2"` 显式收紧；这属于明确例外。

使用 `gap-0 p-0` 自定义整窗布局的大型弹框可以不使用 `DialogBody`，但必须在固定头部和滚动内容区分别明确间距：头部通常使用 `shrink-0 border-b px-6 py-4 pr-12`，滚动内容容器至少使用 `min-h-0 flex-1 overflow-y-auto px-6 py-4`。已经提供 `py-4` 的自定义 body 不得再叠加额外的 Header 底部 padding。

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

### 日期错位问题复盘与统一处理

日期字段必须先区分“纯日期”（例如核算周期的开始日、结束日、报告日期）和“时间点”（例如创建时间、更新时间）。纯日期没有时区语义，不能先构造成 UTC 时间戳再使用本地时区格式化；否则在东八区等时区会出现结束日期从 `2026-12-31` 回显成 `2027-01-01` 的问题。

本次全仓扫描发现，这类风险已经出现多次：

- 发现 4 处业务页面仍直接使用原生 `type="date"`，包括 CFO 核算设置、CFO 看板进度、组织企业信息和 WuxiBiologics 基础管理；这些控件的格式、语言和浏览器行为不统一。
- 发现至少 6 处业务代码自行实现日期解析或 `toISOString().slice(0, 10)`，集中在 CFO 基准信息/核算设置、CFP 模型信息、项目日志、企业信息和数据记录等页面；同名 `formatDateInputValue` 在多个 domain 重复实现。
- CFO 详情展示使用 `new Date(value)` 配合本地 `Intl.DateTimeFormat`，当接口返回 `23:59:59Z` 的周期结束时间时，会在东八区显示为次日；这正是“选择 2026/12/31、详情显示 2027/01/01”问题的典型触发链路。

统一规则：

1. 纯日期回显先读取字符串的前 10 位（`YYYY-MM-DD`）；只有确实是时间点的字段，才允许 `new Date(value)` 后按当前语言和时区格式化。
2. 纯日期提交通过 `parseDateInputValue` 校验后，再在接口边界按既有协议补齐开始日 `00:00:00.000Z` 或结束日 `23:59:59.999Z`；不要在展示层反复进行 UTC/local 转换。
3. 禁止用 `new Date(dateText).toISOString().slice(0, 10)` 作为纯日期的通用格式化方式，也禁止用 `new Date(`${dateText}T00:00:00Z`)` 判断或回显纯日期。
4. 日期比较也必须按同一语义进行：纯日期比较使用经过校验的年月日或本地日期对象；时间点比较才使用毫秒时间戳。不能把一个纯日期和一个带时区的时间点直接比较后决定业务状态。
5. 新增或迁移日期字段必须覆盖以下场景：默认值、接口回显、手工输入、日历选择、清空、非法日期、最小/最大日期、跨年、东八区 `00:00` 和 `23:59:59.999` 边界，以及中英文展示。
6. 代码审查时搜索 `type="date"`、`new Date(`、`toISOString().slice(0, 10)`、重复的 `formatDateInputValue`；发现纯日期字段使用这些写法时，应改为 Base 的日期工具或在组件边界建立明确的纯日期转换函数。

推荐的数据流只有一层转换：

```text
接口时间点 -> 组件边界提取 YYYY-MM-DD -> DatePicker/DateRangePicker
DatePicker/DateRangePicker 的 YYYY-MM-DD -> 提交边界补齐 UTC 起止时间 -> 接口
```

页面详情展示不应再次把已经提取出的 `YYYY-MM-DD` 解析成带时区的 `Date`。日期组件相关改动完成后，必须在 changed-file diagnostics 之外补充日期边界测试，至少覆盖 `2026-12-31` 在本地时区不会变成 `2027-01-01`。
