# Plot Web React 性能实践

## 目标

先消除网络瀑布、重复挂载和大体积加载，再处理可观测的重复渲染；不要从 `useMemo`/`useCallback` 开始盲目优化。

```text
优先级
1. 串行请求与阻塞加载
2. 路由/功能 bundle 体积
3. 大量重复组件、Portal、监听器
4. 昂贵重复渲染与计算
5. 热路径 JavaScript
```

## 先取证

优化前记录至少一项可比较证据：

- React Profiler：commit 次数、组件 render 次数、耗时。
- Network：独立请求是否串行、目标 chunk 是否过早加载。
- Performance：长任务、输入响应、layout/paint。
- Build 输出：大 chunk、重复依赖、动态 chunk 是否生成。
- 业务基准：列表规模、首次可交互时间、输入延迟或浮层挂载数量。

优化后用相同入口和数据量复测。没有前后证据时只报告“结构优化”，不声称性能提升。

## 消除请求瀑布

独立请求并行启动；只有真实依赖的数据才串行。

```ts
// 独立数据：并行预取
const loader = async () => {
  await Promise.all([
    getQueryClient().ensureQueryData(profileQueryOptions()),
    getQueryClient().ensureQueryData(projectsQueryOptions()),
  ])
}
```

- Route loader 保留同步注册，让匹配后立即开始数据加载。
- React Query 使用稳定 key 自动去重；不要在多个组件的 Effect 中重复 RPC。
- Mutation 后精确更新或失效相关 key，不通过全量 refetch 制造请求风暴。
- 能在交互发生时执行的逻辑放事件 handler，不先写 state 再由 Effect 响应。

## 控制 Bundle

- Route page 使用 `lazyRouteComponent`；具体模式见 [routing-and-layout.md](routing-and-layout.md)。
- 大型编辑器、图表、预览器和仅特定操作使用的第三方 SDK 按功能动态加载。
- Hover/focus 会访问的 route 保留 Router preload；不要用 wrapper 丢失 preload。
- 模块顶层不初始化重型 SDK、连接或大数据结构。
- Barrel 必须只有 re-export 且无副作用；跨 package 仍遵守公开 exports，不为追求直引绕过边界。

```tsx
const HeavyChart = lazy(() => import("#/features/analytics/heavy-chart.tsx"))

function AnalyticsPanel({ open }: { open: boolean }) {
  if (!open) return null
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <HeavyChart />
    </Suspense>
  )
}
```

只有功能激活时才加载的组件，不能在入口 barrel 或 eager route 中被同时静态 import。

## 控制重新渲染

### 派生值直接计算

不要用 Effect 把 props/state 再同步为另一份 state：

```tsx
// NOT
const [visibleItems, setVisibleItems] = useState<Item[]>([])
useEffect(() => {
  setVisibleItems(items.filter((item) => item.active))
}, [items])

// DO
const visibleItems = items.filter((item) => item.active)
```

计算确实昂贵且依赖稳定时才 `useMemo`；简单布尔值、短数组和字符串拼接不 memo。

### 缩小订阅

- 组件只订阅渲染需要的最小状态或 derived boolean。
- React Query 使用 `select` 提取需要的数据，避免消费完整大对象。
- 只在 callback 中读取的瞬时值，优先在执行时读取或使用 ref，不为它订阅整棵组件树。
- 将依赖不同状态的组合 Hook 拆开，避免无关状态一起触发更新。

### 稳定引用要有消费者

只有 memoized child、Effect dependency、订阅或命令式 API 会观察引用时才使用 `useCallback`/`useMemo`。

```tsx
const handleSelect = useCallback((id: string) => {
  setSelectedIds((current) => toggleId(current, id))
}, [])

return <MemoizedTable onSelect={handleSelect} />
```

- 使用 functional setState 减少 callback 对当前 state 的依赖。
- 非原始默认 props 提升到模块常量，避免每次 render 创建新引用。
- 不在组件函数内部定义另一个组件；这会导致组件类型变化和子树重挂载。
- `memo()` 只包裹可观测昂贵且 props 能保持稳定的组件。

## 保持输入响应

非紧急的大列表过滤、搜索结果切换或复杂视图更新使用 `useDeferredValue` 或 `startTransition`；提交、校验和焦点反馈仍保持紧急。

```tsx
const deferredQuery = useDeferredValue(query)
const visibleItems = useMemo(
  () => filterItems(items, deferredQuery),
  [deferredQuery, items],
)
```

不要用 transition 掩盖慢 RPC 或错误的数据结构；先解决请求与算法问题。

## 大量重复 UI

```text
大量同构浮层 → detached trigger，共享一个 Root/Content
长列表        → 先分页/窗口化；静态长内容可评估 content-visibility
高频临时值    → ref，而不是每帧 setState
全局监听器    → 一个稳定 owner，scroll/touch 可用 passive 时使用 passive
```

Detached trigger 模式见 [base-ui-and-shadcn.md](base-ui-and-shadcn.md)。需要保留隐藏 DOM/state 的重型面板才使用 Activity；普通条件内容直接卸载。

## JavaScript 热路径

仅在 profiler 指向热路径时使用：

- 重复按 id 查找先构造 `Map`/`Set`。
- 大数组避免连续 `filter().map().filter()` 产生多份中间数组。
- 循环内提升不变的正则、配置和属性读取。
- 求 min/max 不为取一个值排序整个数组。
- State 数组保持不可变，使用 `toSorted()` 或复制后排序。
- 缓存必须有明确失效和容量边界，不能无限增长 module-level Map。

## DO / NOT

| DO | NOT |
| --- | --- |
| 先测量 waterfall、bundle、render | 先给所有函数加 `useCallback` |
| 独立请求并行、QueryKey 去重 | 多个 Effect 重复拉相同数据 |
| 重型可选功能动态加载 | 入口静态 import 全部 SDK |
| 派生值在 render 计算 | Effect 同步 derived state |
| 缩小状态订阅和 props | 为方便把完整 store/query object 层层传递 |
| Detached trigger 减少重复浮层实例 | 每行挂载一套相同 Portal/Content |
| 优化后重复同一基准 | 仅凭代码更复杂就声称更快 |

## 验证

- Typecheck、测试和行为回归必须保持通过。
- 对比优化前后的同一 Profiler/Network/Performance 证据。
- Bundle 优化确认目标动态 chunk 实际生成且未被其它静态 import 拉回入口。
- 列表/浮层优化使用真实目标规模验证，不只测试 3 条数据。
- 检查优化没有破坏 loading/error/empty、焦点、键盘和返回行为。
