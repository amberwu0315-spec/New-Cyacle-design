# Plot Web 组件架构

## 归属

```text
features/<page>/
├── page.tsx       页面组合与状态分支
├── queries.ts     server state
├── components/    页面私有 UI
├── dialogs/       页面私有浮层
└── hooks/         页面编排与单一关注点状态

feature 内复用        → feature/components
同 domain 跨 feature  → domain/components
跨 domain 稳定复用    → Base components
```

组件变大不改变归属。不能因为文件长或出现复用意图，就把 feature 组件提前提升到 domain/Base。

UI 复用不应制造领域依赖：同一业务能力留在 owner domain，跨 domain 的稳定 UI primitive 才进入 Base，跨领域业务组合放 app。不要让两个 domain 为复用组件互相 import。

## 何时提升到 Base

多个 domain 都会使用、没有业务领域归属、API 可以稳定复用的前端能力，放到 `domain/base/src/<artifact>` 并从 Base 公共入口显式导出：

```text
可复用 UI 或 DOM 能力       → components/common/<capability>/
独立 React 状态/生命周期能力 → hooks/ 或 hooks/<capability>/
与 React 无关的技术抽象      → lib/<capability>/
```

典型场景：

- drag/pointer 手势、拖动状态和边界计算。
- 双指缩放、平移、缩放范围与手势归一化。
- 文件选择、校验、上传进度、取消和重试等通用上传抽象。
- 并发池、任务队列、取消、限流和结果汇总。

提升前必须同时满足：

- 已有跨 domain 消费，或它是明确的项目级基础能力；不能只因“以后可能复用”提前抽象。
- API 不包含具体 domain 的 service、generated type、业务文案、权限或流程状态。
- Base 只提供机制；文件归属、业务校验、RPC method 和成功后的业务动作由消费 domain 注入。
- 有稳定公共类型和针对边界行为的测试；只从 Base barrel 导出调用方需要的 API。

仅服务一个组件的 hook/helper 继续放在该组件目录内；仅在同一 domain 复用的能力放该 domain。不要把 Base 变成新的 `common` 杂物箱。

## 按能力内聚拆分

不要只按行数拆分；出现可独立命名、测试或演进的子组件、hook、types、DOM helper 时再拆。单文件足够时保持：

```text
dialogs/
├── avatar-crop-dialog.tsx
└── member-invite-dialog.tsx
```

`avatar-crop-dialog` 需要辅助文件后，先建立同名目录，把实现细节收回该能力边界：

```text
dialogs/
├── avatar-crop-dialog/
│   ├── avatar-crop-dialog.tsx
│   ├── avatar-crop-preview.tsx
│   ├── avatar-crop-types.ts
│   ├── use-avatar-crop.ts
│   ├── avatar-crop-dialog.test.tsx
│   └── index.ts
└── member-invite-dialog.tsx
```

不要把拆出的 `avatar-crop-preview.tsx`、`avatar-crop-types.ts`、`use-avatar-crop.ts` 平铺到 `dialogs/`。同一规则递归适用于 `components/`、`hooks/`、`lib/`、编辑器、预览器和复杂 layout。

- 能力目录内使用相对 import；外部只从 `index.ts` 导入公开 API。
- test、types、hook、样式和纯 helper 与其唯一 owner 并置。
- 只有被多个 sibling 真实共享且语义稳定的代码，才提升到最近公共父目录。
- 避免无边界的 `utils.ts`、`types.ts` 和 `common/`；名称应表达所属能力。
- 移动现有组件前先查找全部 import；只迁移该组件拥有的文件，并通过 `index.ts` 保持稳定入口。
- 文件夹和文件必须按真实业务能力命名；字母序号、数字序号或临时占位命名不能进入实现。

## Page 保持组合层

### 项目参考模板

```tsx
export function HomePage() {
  const page = useHomePage()

  if (page.overview.isLoading) return <HomePageSkeleton />
  if (page.overview.isError) return <HomeErrorState onRetry={page.retry} />
  if (!page.overview.data?.items.length) return <HomeEmptyState />

  return (
    <PageLayout>
      <HomeOverview items={page.visibleItems} />
      <CreateItemDialog projectId={page.overview.data.projectId} />
    </PageLayout>
  )
}
```

Page 负责组合、路由输入和顶层状态分支；RPC、表单、Dialog 状态及细节交互下沉到各自能力目录。

## React 组合 API

```text
固定结构、仅需少量配置       → 普通组件
调用方需要替换内容区域       → children 或明确的 slot prop
调用方需要消费内部状态       → render prop
多个部件需自由排列并共享状态 → Compound Components + scoped context
```

优先组合，不用不断增加 `showX`、`hideY`、`compactZ` 等布尔 props 穷举布局。Compound Component 的 Root 持有共享状态和行为，部件持有各自 markup；常用结构提供默认组合。

### 项目参考模板：默认组合 + Compound Components

```tsx
function ComposerDefault(props: ComposerProps) {
  return (
    <ComposerRoot {...props}>
      <ComposerFileList />
      <ComposerEditor />
      <ComposerFooter>
        <ComposerFooterStart>
          <ComposerFileUpload />
        </ComposerFooterStart>
        <ComposerSubmit />
      </ComposerFooter>
    </ComposerRoot>
  )
}

export const Composer = Object.assign(ComposerDefault, {
  Root: ComposerRoot,
  Editor: ComposerEditor,
  FileList: ComposerFileList,
  FileUpload: ComposerFileUpload,
  Footer: ComposerFooter,
  FooterStart: ComposerFooterStart,
  Submit: ComposerSubmit,
})
```

- 默认组件必须由同一组公开 parts 组合，不能维护第二套实现。
- Context 只服务该组件树的协作状态；在 Root 外使用 part 时立即给出清晰错误。
- 只暴露调用方需要组合的稳定 parts；DOM helper、内部 hook 和实现组件不挂到公共对象。
- slot/part 保留语义元素、ref、事件合并和可访问属性；不要只为视觉自由破坏行为合同。
- 普通组件不强行改造成 Compound Components；只有调用方确实需要重排、替换或增删 parts 时使用。

## DO / NOT

| DO | NOT |
| --- | --- |
| 用真实业务能力命名目录和文件 | 使用字母、序号或临时占位名 |
| 拆分后建立同名能力目录 | 把一个组件的内部文件散落到父目录 |
| 私有代码留在最近 owner | 因文件变长就提升到 domain/Base |
| Base 只承载稳定、无业务归属的复用机制 | 把 domain service/type/流程塞进 Base |
| 在 app 组合跨领域业务 | 为 UI 复用建立 domain 双向依赖 |
| 默认组合复用公开 parts | 默认版和可组合版各写一套逻辑 |
| 用 composition 表达结构变化 | 用大量布尔 props 枚举布局 |
| 只导出稳定公共面 | 从外部深链内部文件 |
