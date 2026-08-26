# 业务展示、列表与选择弹框规范

[← 返回 Web 文档入口](../web.md)

> 职责：统一业务名称空值、多语言名称、业务列表工具栏、数据选择弹框和枚举兜底值的交互规则。

名称类字段的空值兜底按当前语言展示：中文使用 `<未命名>`，英文使用 `<Untitled>`。这里的“名称类字段”包括数据记录、数据源、产品、地点等业务对象在标题、列表、选择项、链接文本里的名称展示；普通非名称字段仍沿用当前页面已有空值占位，例如 `-`、`—` 或 `未设置`。

普通字段为空时，空值占位符必须直接作为文本展示，不要包在 `Badge`、Tag、状态点等带有业务语义或装饰样式的容器里。例如数据源类型为空时展示普通文本 `-`，不能展示成带边框或底色的 `-` 标签；仅在存在真实类型、状态或分类值时使用相应的 Badge/Tag 样式。

多语言名称读取顺序以当前语言优先；当前语言没有时可以回退到另一个语言。有任意名称时展示已有名称，不把 ID、code、空字符串或通用空值符号当作对象名称兜底，除非该业务对象的既有产品规范明确要求使用 code/ID。

## 详情页面展示与分区

`/admin/**` 页面还需遵守 [Admin 页面展示规范](admin-pages.md)。

面向业务用户的详情页面默认不展示数据库主键、UUID、`orgId`、`userId`、`xxId` 等技术标识，也不能把 ID 当作名称、简称、操作人或联系方式的兜底。只有排障、审计、接口联调等明确以技术标识为业务信息的页面，才可以在有清晰字段名和产品需求的前提下展示。

详情页面通过轻量背景色、留白和标题层级区分主体信息、关联数据和操作记录，不使用“页面边框 → section 边框 → 卡片边框 → 表格边框”的多层边框嵌套。推荐让 section 使用无边框的浅色背景承载内容，由内部表格或确实可交互的控件保留自身边界；普通键值信息可以使用同色系背景块分组，不为每一个字段增加分割线或描边。

关联账号、订阅方案、服务对象、操作日志等结构化集合优先使用项目通用 `DataView` / `DataGrid` 和 `useDataModel`，必须提供可见表头。不要用 CSS Grid 模拟无表头表格，也不要只靠每行文本位置让用户猜测列含义。树、时间线、键值描述和只有单个对象的摘要不强制表格化，但仍需提供明确的字段或层级语义。

## 业务列表页面工具栏

带搜索或筛选能力的业务列表页面，创建等全局操作必须和搜索、筛选处于同一排：搜索和筛选位于左侧，创建按钮位于该排右侧。使用 `DataView` 时统一通过 `toolbarTrailingRight` 承载创建按钮，不要把创建按钮放在页面标题行或另起一排。服务客户、研究对象等因工作空间类型而切换名称、但共用列表结构的页面同样遵守此规则。

页面标题行只承载标题、说明、返回或面包屑等页面级信息。列表操作区存在多个全局操作时，右侧顺序统一为“刷新、创建”：刷新使用 outline 按钮，创建使用 primary 按钮，并配套统一图标、多语言文案、权限和禁用态。窄视口允许工具栏按组件既有响应式规则换行，但不能把创建按钮移回标题行。

```tsx
<DataView
  dataModel={dataModel}
  searchBox={searchBox}
  toolbarTrailingRight={
    <Button disabled={!canCreate} onClick={handleCreate}>
      <Plus data-icon="inline-start" />
      创建
    </Button>
  }
/>
```

## 数据选择弹框

这里的“数据选择弹框”是指从一批业务对象中选择并返回对象或对象 ID 的 Dialog，包括因子、元件、公式、数据记录、数据源、地点、产品、研究对象、常用排放源等。日期、枚举和少量静态候选项使用的 Select、Combobox、Popover 不属于本节；文件管理器、树形选择器和主从预览选择器可以保留适合其数据结构的内容组件，但仍需遵守工具栏、确认链路和滚动边界。

### 标准结构

数据选择弹框统一采用“固定头部 + 固定高度内容区 + 固定底部”的三段式结构：

1. `DialogContent` 使用纵向 flex，并限制在视口内：`flex max-h-[88vh] flex-col overflow-hidden`。常规表格选择器优先使用 `sm:!max-w-4xl`；列数较多、包含预览区或业务明确需要更宽时才扩大到 `sm:!max-w-5xl` / `sm:!max-w-6xl`。
2. `DialogHeader` 默认固定不收缩，包含明确的标题和必要的说明；不要把创建按钮塞进标题行。
3. 中间表格区统一使用 `DialogBody className="h-[520px] overflow-hidden py-2"`。`DialogBody` 自身保持滚动和高度链，不能再把 `className` 拆到第二层容器；`DataView` 使用 `height="100%"` 和 `h-full min-h-0`，分页、搜索栏留在内容区内，只有表格 viewport 滚动，Dialog、标题、工具栏和底部操作不能随表格滚动。
4. `DialogFooter` 默认固定不收缩。右侧按“取消、确认”的顺序放置操作；可清空的选择器可以把“清除选择”作为 ghost 按钮放在确认操作之前。
5. 初次加载使用表格 skeleton；刷新时保留已有表格和筛选条件，用 `isFetching` 表示刷新状态，避免整块内容闪回空白或骨架。

表格型选择器优先使用 `DataView + DataGrid + SearchBox`，不要再为同类对象选择器手写一套 `Input + Table/按钮列表 + ScrollArea`。树、文件和主从预览场景不能合理表达为表格时可以使用专用内容组件，但弹框外壳和下面的交互合同保持一致。

通用搜索表格和选择弹框中的 `SearchBox` 聚焦时只保留 `border-ring` 边框反馈，不显示 Crew UI 默认的 3px focus ring，避免工具栏或弹框头部出现类似整块阴影的灰色外沿。Base 全局样式已按 `search-box-start-input` slot 统一处理；选择弹框仍可复用 `DATA_SELECTOR_SEARCH_BOX_CLASS_NAMES` 作为局部兼容覆盖（`DataView` / `SearchBox` 通过 `searchBoxProps.classNames` 传入，compound 写法传给 `DataView.SearchBox.classNames`）。尚未迁移到 SearchBox 的旧式搜索输入通过 `className={cn(DATA_SELECTOR_SEARCH_INPUT_CLASS_NAME, ...)}` 覆盖。不要修改 Base `Input` / `InputGroup` 的全局焦点态，也不要完全移除边框反馈；普通表单继续保留默认可访问性焦点 ring。

```tsx
<DialogContent className="flex max-h-[88vh] flex-col overflow-hidden sm:!max-w-4xl">
  <DialogHeader>
    <DialogTitle>选择数据</DialogTitle>
    <DialogDescription>从当前工作空间可见的数据中选择一项。</DialogDescription>
  </DialogHeader>

  <DialogBody className="h-[520px] overflow-hidden py-2">
    <DataView
      className="h-full min-h-0 w-full"
      height="100%"
      searchBoxProps={{
        classNames: DATA_SELECTOR_SEARCH_BOX_CLASS_NAMES,
      }}
      toolbarTrailingRight={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            刷新
          </Button>
          <Button onClick={handleCreate}>创建</Button>
        </div>
      }
    />
  </DialogBody>

  <DialogFooter>
    <Button variant="outline" onClick={handleCancel}>
      取消
    </Button>
    <Button disabled={!selectedValue} onClick={handleConfirm}>
      确认
    </Button>
  </DialogFooter>
</DialogContent>
```

### 工具栏和操作位置

- 搜索和筛选放在工具栏左侧；刷新、创建等全局操作统一放在 `toolbarTrailingRight`，顺序为“刷新、创建”。刷新使用 outline 按钮，创建使用 primary 按钮，并配套统一图标和多语言文案。
- 数据来自接口的选择器必须提供刷新按钮。刷新列表时，列表依赖的单位、类型、地点等候选查询也要一起刷新；按钮在 `isFetching` 时显示忙碌状态并防止重复触发。
- 业务对象支持当前上下文内创建时必须提供创建按钮。权限、工作空间或组织上下文不足时保留按钮并展示合理禁用态/原因；只有对象在产品语义上明确只读、或创建必须离开当前流程时，才允许省略，并在实现附近记录例外原因。
- 创建成功后刷新列表、选中新建项，但不直接替用户确认；用户仍可核对后点击确认或双击该项。不要用“创建一个未命名对象”代替完整创建流程，除非该对象的产品规则本来就是先创建后编辑。
- 不在每一行重复放“选择/使用”按钮。单击行负责选中，双击行和底部确认负责提交，避免同一选择器出现三套操作入口。

### 选中和确认交互

单选数据选择弹框必须支持单击选中、双击直接确认：

- 单击只更新当前选中项和高亮，不提交、不关闭弹框。
- 双击调用与底部“确认”完全相同的确认函数；不得绕开禁用态、校验、`onConfirm`/`onSelect`、mutation、关闭弹框、toast 和缓存刷新另写一套逻辑。
- 已禁用或缺少稳定 ID 的行不能被单击选中或双击确认，并需提供可理解的禁用原因。
- 打开弹框时回显当前值；切换查询上下文、分页或筛选后，不能误把已经不在候选集里的旧对象作为新确认结果。
- 键盘可聚焦的表格行使用 Enter/Space 完成“选中”；确认仍通过底部确认按钮，除非组件明确实现并文档化 Enter 直接确认。

多选数据选择弹框不强制双击确认，双击可以保留打开、预览等已有交互。多选弹框必须显示已选数量，并由底部确认一次性提交。同一个选项对应多个不同确认动作、无法确定默认动作时，不要擅自绑定其中一个动作作为双击确认，应先明确默认确认语义；确认语义明确后，再让双击复用该默认确认链路。

### 查看详情与嵌套选择

数据选择弹框中的“查看详情”统一使用 Base 提供的 `DataSelectorDetailDrawer` 和 `useDataSelectorDetailDrawerHost`。Base 只维护唯一 Drawer、详情历史、返回、宽度和内容现场，不得依赖元件、公式、数据记录、数据源等业务类型；各 feature domain 负责把稳定 key、标题和详情 React 内容转换成 `DataSelectorDetailDrawerItem`。

详情 Drawer 内再次打开数据选择弹框时，选择器必须优先复用当前 `useDataSelectorDetailDrawerHost()`，不能渲染第二个 Drawer。查看嵌套对象详情前关闭当前选择弹框，在同一个 Drawer 中切换内容；返回上一层时恢复上一层详情并重新打开原选择弹框。详情页面里不属于“选择”流程的普通关联链接仍跳转到对应完整页面，不继续压入 Drawer。

### 状态和验收清单

新增或修改数据选择弹框时，至少逐项验证：

- [ ] 标题、说明、宽度、520px 内容高度和底部按钮位置与同类弹框一致。
- [ ] 搜索/筛选在左侧，刷新和创建在右侧，按钮顺序和 variant 一致。
- [ ] 搜索框聚焦时没有 3px 灰色 ring，仍保留焦点边框；样式复用 Base 选择器常量，没有影响普通表单输入框。
- [ ] 初次加载、刷新中、加载失败、无数据、无搜索结果、缺少上下文都有明确状态。
- [ ] 单击仅选中，双击与确认按钮走同一链路，取消不修改原值。
- [ ] 表格内部纵向/横向滚动，Dialog、标题、工具栏、分页和 Footer 不跟随滚动。
- [ ] 创建成功后列表可见且新项被选中；刷新不会丢失当前筛选条件。
- [ ] 中英文名称、空名称、按钮、空状态和禁用原因符合多语言及 `<未命名>` / `<Untitled>` 规范。
- [ ] 窄视口下弹框不超过 `88vh`，不会把 Footer 推出视口。

`unspecific` 是每个枚举都可能包含的特殊兜底类型，不属于面向用户的业务选项。下拉框、单选、多选、筛选器等由枚举生成的前端候选项必须过滤 `unspecific`，不允许用户主动选择；读取接口已有数据时仍需兼容该值，不要因此修改接口枚举、提交值或反序列化逻辑。

核算周期是日期范围，展示必须明确包含年、月、日，不能依赖浏览器默认 locale 生成 `01/01/2025` 这类年月日顺序不明确的文本。中英文都固定使用 `YYYY-MM-DD`，例如 `2025-01-01 - 2026-01-01`。接口返回 ISO 日期时间时，日期型业务字段优先保留原值中的 `YYYY-MM-DD` 部分进行展示，避免时区换算导致日期前移或后移。

日期输入状态和接口序列化格式不因展示规则改变：表单继续使用项目既有的日期值，提交时仍在 RPC 边界转换成接口要求的 ISO 或其他约定格式。不要为了修正页面文案而修改后端入参格式。

修改现有选择弹框时，只在当前任务触达或明确不符合上述规范时同步修正；不要为了补规范顺手迁移无关页面。
