# Usage

这份文档只描述 `assistant-workbench` 当前真实可用的共享接入方式，重点覆盖：

- `launchArea` 协议长什么样
- 页面怎么打开标准锚点助手
- `sendMessage` 最终会把哪些信息发给 AgentService

后端接口细节以 [AgentService前端接口文档.md](./AgentService前端接口文档.md) 为参考；这里以当前前端实现为准。

## 适用范围

这份文档覆盖 `domain/base/src/web/src/components/assistant-workbench/index.ts` 当前公开导出的共享能力，不覆盖页面私有 helper。

外部接入优先从根出口导入，不要默认跨层 deep import：

```ts
import {
  AssistantAgentUserContextProvider,
  AssistantAnchorChatRenderer,
  AssistantResizableEmbeddedRenderer,
  AssistantSheetRenderer,
  AgentAnchorButton,
  AgentCollaborationRoot,
  agentCollaborationActions,
  assistantWorkbenchActions,
  configureAssistantAgentRuntime,
  createAssistantAnchorChatSession,
  openAssistantAnchorChat,
  resolveAssistantAnchorChatSession,
  useAgentCollaborationPage,
  useAssistantAgentSession,
  useAssistantWorkbenchController,
  useAssistantWorkbenchPageBridge,
  useAssistantWorkbenchSelector,
  type AssistantAnchorDeclaration,
  type AssistantLaunchArea,
} from '@carbonnt-cyacle/web-base'
```

## 运行时服务配置

`assistant-workbench` 放在 base domain 后不直接依赖某个业务 app 的后端生成代码。宿主应用需要在入口处把现有 AgentService、附件上传和文档预览能力注入进来：

```ts
configureAssistantAgentRuntime({
  agentService,
  buildAgentEventUrl: (path) => path,
  getDocumentDownloadUrl: (documentId) => documentDownloadUrl,
  getDocumentInfoByIds: async (documentIds) => documents,
  uploadAttachment: async (attachment, { organizationId }) => result,
})
```

真实会话还需要用户上下文。页面可以直接给 `useAssistantAgentSession(...)` 传 `operatorId / workspaceId / organizationId`；如果多个页面共用同一套上下文，也可以在上层挂：

```tsx
<AssistantAgentUserContextProvider
  value={{ operatorId, workspaceId, organizationId }}
>
  {children}
</AssistantAgentUserContextProvider>
```

这层配置只接入前端已有能力，不要求修改后端接口。

## 先记住 4 个概念

### 1. `launchArea`

`launchArea` 描述“当前助手是从哪个页面区域打开的”。当前共享协议已经收口为：

```ts
type AssistantLaunchArea = {
  area: {
    id: string
    title: string
    description?: string
  }
  anchors?: Array<AssistantAnchorDeclaration>
  suggestions?: Array<{ content: string }>
}
```

字段职责：

- `area.id`
  前端区域稳定标识。当前会用于本地消息 `anchorId`、当前区域切换识别、反馈 `targetId`、页面高亮等前端语义。
- `area.title`
  当前区域展示标题。会显示在助手头部和输入框上方的“当前目标区域”摘要里。
- `area.description`
  可选的区域说明。适合在对话框里回显当前区块说明，也可以给页面做高亮说明文案。
- `anchors`
  可选。表示这次激活额外附带的实体锚点；发送时会和页面 scene 提供的 `defaultAnchors` 合并，进入最终请求里的 `anchors`。
- `suggestions`
  可选。前端推荐选项，只影响快捷选项展示，不会直接发给后端。

几个容易混淆的点：

- 当前协议里不再保留 `areaId / areaInfo / target`。
- `launchArea.area` 是前端“当前区域”语义，不等于后端收到的 `anchors`。
- 如果只传 `area`，助手也能正常打开；但后端上下文仍主要取决于 `anchors + defaultAnchors + threadTags`。

### 2. `scene`

页面的真实会话上下文建议收敛成一个 scene，也就是：

- `threadTags`
- `defaultAnchors`

`useAssistantAgentSession(...)` 会用它来：

- 过滤当前页面所属的 thread 列表
- 给 `sendMessage` 组装公共上下文

页面切换到新的 `scopeId` 或新的 `threadTags` 时，页面侧需要清空共享
`contentProtocol / activeTarget`，避免上一页面的 `launchArea` 继续显示为“当前选中区域”。
当前产品碳任务页的共享助手 helper 已按 `scopeId + scene.threadTags` 执行这个 reset；同一
scene 内通过锚点按钮显式打开的 `launchArea` 不会被清空。

### 3. `protocol`

当前公共内容协议只有一种：`AssistantAnchorChatProtocol`。

它负责声明：

- 当前 `launchArea`
- 当前激活 session（`activationId + threadStrategy`）
- 可选 seed messages
- 可选 feedback 回调

页面如果要打开标准锚点协作入口，优先走 `openAssistantAnchorChat(...)`。

### 4. `renderMode`

共享状态里同时区分：

- `displayMode`：默认展示偏好
- `renderMode`：当前实际渲染位置

当前常用 `renderMode`：

- `embedded`
- `sheet`
- `dialog`
- `floating`

## 接入模式

### 1. 页面级单例助手

适合页面想快速挂一个统一 AI 入口、行级锚点按钮、右侧 panel slot，但当前页不一定已经接了真实 AgentService。

#### 根部挂载

`AgentCollaborationRoot` 应该只在应用根布局挂一次。当前项目已经在 `src/routes/_auth/route.tsx` 里挂载。

#### 页面注册

页面通过 `useAgentCollaborationPage(...)` 注册当前页配置：

```tsx
import {
  useAgentCollaborationPage,
  type AgentCollaborationTarget,
} from '@carbonnt-cyacle/web-base'

const defaultTarget: AgentCollaborationTarget = {
  id: 'products:list',
  label: '产品列表',
  title: '产品列表',
  section: 'products',
}

function ProductListPage() {
  const collaboration = useAgentCollaborationPage({
    defaultTarget,
    renderPanel: () => <div>自定义 panel 内容</div>,
  })

  return <div>{collaboration.panelSlot}</div>
}
```

返回值：

- `open()`
- `close()`
- `openTarget(target, options?)`
- `panelSlot`

默认情况下，`panelSlot` 由当前页面渲染，因此页面卸载时 slot 也会卸载。若某个业务域需要在子路由之间保持右侧助手容器稳定，可以在更高层级提供稳定 DOM 节点，并通过 `useAgentCollaborationPage(config, { panelSlotElement })` 注册外部 slot；这时当前页面只负责注册入口和 panel 内容，不再渲染自己的局部 `panelSlot`。

#### 行级 / 区块级入口

如果页面只是给某个对象补一个协作按钮，可以直接用 `AgentAnchorButton`：

```tsx
<AgentAnchorButton
  target={{
    id: 'products:item:p-1',
    label: '再生塑料包装盒',
    title: '产品：再生塑料包装盒',
    section: 'products',
  }}
/>
```

#### 重要说明

`useAgentCollaborationPage(...)` 只是页面注册和单例壳层，不自动等于真实 Agent 会话。

如果页面只传了 `defaultTarget`，没有提供自定义 `renderPanel` 或 `openAssistant`，当前默认面板仍是本地 mock 消息流，适合占位和轻量入口验证，不适合当成真实后端接入。

### 2. 真实 Agent 会话页面

这是当前推荐的主链路，适合详情页、编辑页、工作台等需要线程历史、附件上传、SSE 进度和交互卡片的页面。

#### 角色分工

- `useAssistantWorkbenchController(...)`
  负责共享 store、草稿、附件和业务类型适配。
- `useAssistantAgentSession(...)`
  负责 thread、message、run、SSE、交互卡片和真实发送。
- 页面自己的 hook / controller
  负责 scene、页面 target 映射、query 刷新和 content props 组装。

#### 最小骨架

```tsx
const controller = useAssistantWorkbenchController({ adapter })

const protocol = React.useMemo(() => {
  if (controller.contentProtocol?.type !== 'anchor-chat') {
    return null
  }

  return controller.contentProtocol
}, [controller.contentProtocol])

const session = useAssistantAgentSession({
  scopeId: 'page-scope-id',
  activeTarget: controller.activeTarget,
  launchArea: protocol?.launchArea ?? null,
  threadStrategy: protocol?.session?.threadStrategy,
  threadActivationId: protocol?.session?.activationId,
  resolveDefaultAnchors: () => scene.defaultAnchors,
  resolveThreadTags: () => scene.threadTags,
  organizationId,
  workspaceId,
  onMessageCompleted: async () => {
    await refreshQuery()
  },
})

async function send() {
  const result = await session.sendMessage({
    content: controller.composerValueRef.current,
    attachments: controller.attachmentsRef.current,
  })

  controller.setAttachments(result.attachments)
  controller.clearDraft()
}
```

#### `useAssistantAgentSession(...)` 重点参数

- `scopeId`
  页面级稳定标识；thread 列表、消息历史和恢复逻辑都按它区分。
- `launchArea`
  当前锚点激活区域；通常来自 `protocol.launchArea`。
- `threadStrategy`
  通常来自 `protocol.session.threadStrategy`。
- `threadActivationId`
  用于识别一次新的锚点激活，避免旧状态误复用。
- `resolveDefaultAnchors`
  返回页面公共上下文锚点。
- `resolveThreadTags`
  返回页面线程筛选标签。
- `operatorId / organizationId / workspaceId`
  可显式传入；不传时回退到 `AssistantAgentUserContextProvider` 提供的上下文。
- `onMessageCompleted`
  页面发送完成后的 query 刷新入口。
- `onRunProgressLoaded`
  当前运行在 SSE `done` 后自动拉到 `getRunProgress`，或消息列表按 `runId` 懒加载执行回显成功时触发，适合页面根据 `group.step` 做业务查询刷新；同一个 `runId` 的相同回显结果会去重，不会反复触发业务刷新。

#### `useAssistantAgentSession(...)` 返回值

常用返回值：

- `threads`
- `activeThread`
- `currentThreadId`
- `messages`
- `progressItems`
- `runProgressStateByRunId`
- `pendingInteractions`
- `currentRun`
- `loadingThread`
- `isBusy`
- `canSwitchThreads`
- `startThreadDraft()`
- `createThread()`
- `selectThread(threadId)`
- `loadRunProgress(runId)`
- `uploadAttachments(attachments)`
- `sendMessage({ content, attachments, threadStrategy? })`
- `cancelRun()`
- `submitInteraction(...)`

`startThreadDraft()` 会把当前页面切到“尚未绑定真实 threadId 的空草稿态”。进入这个状态后，如果页面又触发了 `reuse-current-thread` 的锚点激活，共享 session 会继续停留在草稿态，不会自动跳回历史线程；等用户真正发送第一条消息时，再创建新的真实线程。

`pendingInteractions` 用来承接后端要求用户选择或确认的交互项。`AssistantAnchorChatRenderer` 当前会显示 `PENDING` 状态的交互项；如果历史恢复时交互状态为 `UNSPECIFIED`、尚未响应且仍有 options，也会作为待处理选择展示。选择区出现时，底部只显示该选择区，不再同时显示当前锚点摘要、快捷选项、输入框、附件入口或发送按钮。

选择区内部只有 options 列表滚动，右上角关闭按钮和底部 `取消` 都走 `cancelRun()`；如果当前 `currentRun` 还没有恢复，但待处理交互项带有 `runId`，会使用该 `runId` 调用 `assistantAgentService.cancelRun(...)`，并先从前端状态移除对应交互项，接口失败时再恢复。底部 `确认` 走 `submitInteraction(...)`，提交选中的 option ids 后会先从前端状态移除对应交互项，再后台继续订阅当前 run；接入方应把 `submitInteraction(...)` 的 Promise 返回给渲染器，这样提交接口未完成时确认按钮会显示 `提交中` 并锁定选项，但不会等整轮 SSE 回复结束才退出提交态。

`runProgressStateByRunId` 和 `loadRunProgress(runId)` 用来承接按消息 `runId` 的执行回显：

- 当前运行中的消息在 SSE 收到 `done` 后，会自动预取一次当前 `runId` 的 `getRunProgress`。
- 如果页面传了 `onRunProgressLoaded`，共享 session 会在 SSE `done` 后强制刷新当前 `runId` 的 `getRunProgress` 成功时把 `{ runId, groups }` 交给页面，方便页面按执行结果精确刷新业务 query；历史消息进入视口后的懒加载回显只用于展示执行回显，不触发业务 query 刷新。
- 如果同一个 `runId` 先经历了一次 `require_action -> done`，用户提交交互后又继续执行并再次收到 `done`，共享 session 会强制重新拉一次 `getRunProgress`，不会复用第一次可能为空的缓存结果。
- 如果这轮 SSE 在 `done` 之前先收到了 terminal `error`，共享 session 仍会在 `done` 后继续拉一次 `getRunProgress`；同时保留 failed 状态，不会把失败 run 又重置成 completed。
- terminal `error` 不会只停留在内部状态里：如果当前流式消息本身没有正文，会直接把错误写进这条消息；如果这条消息已经有正文，会额外补一条失败系统消息，确保页面上能看到错误结果。
- 历史消息不要整条线程一次性拉完所有 `getRunProgress`；共享消息列表会按消息懒加载，只在消息进入视口时再触发对应 `runId` 的查询。
- 如果 `getRunProgress` 返回了可识别的步骤结果，`AssistantAnchorChatRenderer` 会在对应消息下方渲染“执行回显”；拿不到结果时保持静默，不额外插入占位消息。
- 如果页面想把某些 step 渲染成业务卡片，而不是默认的“执行回显”折叠块，可以给 `AssistantAnchorChatRenderer` 传 `renderRunProgressContent({ runId, groups, defaultContent })`；页面可以按 `group.step` 自定义结果卡，也可以在需要时继续把 `defaultContent` 拼回去。

#### 当前项目内示例

- `src/components/sections/product-carbon-tasks/accounting-detail/assistant-workbench/use-detail-anchor-chat-assistant.ts`
- `src/components/sections/product-carbon-tasks/accounting-list/controller/use-product-carbon-accounting-task-list-assistant.ts`
- `src/components/sections/product-carbon-tasks/assistant-workbench/use-product-carbon-task-page-assistant.ts`

### 3. 标准锚点打开方式

标准锚点入口优先使用 `openAssistantAnchorChat(...)`，不要在页面侧手写协议对象再直接操作 store。

```tsx
import {
  createAssistantAnchorChatSession,
  openAssistantAnchorChat,
  type AssistantLaunchArea,
} from '@carbonnt-cyacle/web-base'

const launchArea: AssistantLaunchArea = {
  area: {
    id: 'basic-info',
    title: '基础信息',
    description: '围绕模型名称、系统边界、核算周期和地理边界继续协作。',
  },
  anchors: [
    {
      dataType: 'ACCOUNTING',
      dataId: 'accounting_123',
      kind: 'ENTITY',
      mode: 'HARD',
      display: {
        title: '当前核算任务',
      },
    },
  ],
  suggestions: [{ content: '请先总结当前区域的关键信息和潜在问题。' }],
}

openAssistantAnchorChat({
  launchArea,
  renderMode: 'embedded',
  session: createAssistantAnchorChatSession({
    threadStrategy: 'new-thread',
  }),
})
```

这个例子里：

- `area` 必传，是最小可用前端区域协议。
- `anchors` 可选；适合页面想在默认 scene 之外，再额外指定这次激活绑定的实体。
- `suggestions` 可选；只影响快捷选项按钮。
- `area.description` 可选；适合给当前区块补一段“当前目标区域”说明。

如果页面需要在“保留当前 session”和“显式发起新线程”之间切换，优先用 `resolveAssistantAnchorChatSession(...)` 衔接当前协议状态，而不是自己拼 `activationId`。

如果页面切换锚点时需要保留输入中的草稿和附件，显式传 `resetDraft: false`；只有明确想丢弃当前草稿时，再传 `resetDraft: true`。

## 线程策略约定

- `reuse-current-thread`
  继续当前工作流。适合同一区域内继续追问。
- `new-thread`
  显式开启新协作支线。适合区块级 AI 编辑、报告字段级协作等。

注意：

- 激活锚点本身不会立刻创建真实线程。
- 只有真正发送第一条消息时，`useAssistantAgentSession(...)` 才会按当前策略创建或切换线程。

## 真实发送链路

当前真实发送统一走 `assistantAgentService.sendMessage(...)`。页面不需要自己拼 HTTP，只需要把页面上下文喂给 `useAssistantAgentSession(...)`。

### 最终请求结构

当前前端实际传给发送层的结构是：

```json
{
  "threadId": "...",
  "content": "...",
  "documentIds": ["..."],
  "anchors": [
    {
      "dataType": "PROJECT",
      "dataId": "...",
      "kind": "ENTITY",
      "mode": "HARD"
    }
  ],
  "threadTags": [{ "key": "Project", "value": "..." }]
}
```

发送层会把附件 ID 同步映射到 `message.fileIds`，以适配 `lca.core.AgentService` 当前契约；`documentIds` 保留给旧协议和前端附件语义兼容。

调用 `assistantAgentService.sendMessage(...)` 时，还会同时带上当前请求上下文里的：

- `workspaceId`
- `organizationId`
- `operatorId`

### 各字段从哪里来

- `threadId`
  由会话层当前 thread 决定；必要时会先创建新 thread。
- `content`
  就是输入框内容 `trim()` 后的结果；如果正文为空但已经上传了附件，会退化为默认提示词 `请结合我上传的文件继续分析。`。
- `documentIds` / `fileIds`
  只来自已经上传成功且拿到 `remoteFileId` 的附件；上传返回优先读取接口里的 `documentId`，发送到 `lca.core` 时会作为 `message.fileIds` 传入。
- `anchors`
  来自 `launchArea.anchors + defaultAnchors` 合并后的结果，并按 `dataType:dataId` 去重。注意这里只去掉完全相同的锚点，不会按 `dataType` 收敛；同一个 `dataType` 出现多个不同 `dataId` 时后端会判定冲突并让请求失败，所以页面侧要在传进来之前自己按 `dataType` 去重。
- `threadTags`
  来自 `resolveThreadTags()`，会先裁掉空值，再按 `key/value` 排序。

历史消息里的附件会兼容读取 `documentIds` 和 `fileIds`。前端加载消息后会通过宿主注入的文档信息查询能力批量补全文档名称；附件卡片再根据名称后缀展示文件类型。批量查询失败时保留“附件 1 / 附件 2”兜底，不阻断聊天历史渲染。

历史消息里同一个 Run 可能按后端内部链路拆成 `assistant(toolCalls)`、`tool(toolResults)`、`assistant(content)` 多条记录。共享消息服务会按 `runId` 把仅包含工具调用 / 工具结果摘要的辅助消息合并到同一个 Run 的最终助手消息上，消息列表侧也只在该 Run 最后一条非用户消息下渲染一次执行回显，避免同一工具结果重复展示成多条助手消息。

### `launchArea` 在发送链路里到底参与了什么

当前 `launchArea` 参与发送链路的方式可以拆成两部分：

#### 1. 真正发给后端的

- `launchArea.anchors`
  会并入最终请求的 `anchors`。

#### 2. 只在前端本地消费的

- `launchArea.area.id`
  会作为本地 optimistic message 的 `anchorId`，也会参与当前区域切换识别和反馈 target 绑定。
- `launchArea.area.title`
  会显示在助手头部和输入区摘要里；输入区摘要右上角的关闭按钮会调用页面传入的 `onClearAnchor`，用于取消当前选中的锚点区域。
- `launchArea.area.description`
  会显示在输入区“当前目标区域”摘要里。
- `launchArea.suggestions`
  只影响快捷选项展示。

也就是说，当前点击一个锚点并不会自动把 `area.title` 或 `area.description` 拼进 `content`，真正决定后端上下文的仍然是：

- 输入框正文
- 上传附件
- `launchArea.anchors`
- 页面 scene 的 `defaultAnchors`
- 页面 scene 的 `threadTags`

### 最容易混淆的点

`launchArea.area` 是前端当前区域语义，不会自动变成后端收到的 `anchors`。

如果页面只设置了：

- `area.id = basic-info`
- `area.title = 基础信息`

但没有在 `launchArea.anchors` 或 `resolveDefaultAnchors()` 里提供对应实体锚点，那么后端不会因为你当前选中了“基础信息”就自动收到一个“基础信息”锚点。

### 节点级入口要带够锚点

模型树、结果画布这类“点某个节点上的 AI”的入口，只传节点自身的锚点是不够的：后端只会拿到一个孤立的阶段 / 模块 / 单元过程 ID，不知道它属于哪个核算、哪个模型、哪个项目。

推荐按业务链把能拿到的锚点一次带全，顺序也从外到内：

```ts
anchors: [
  { dataType: 'PROJECT', dataId: cfpProjectId, kind: 'ENTITY', mode: 'HARD' },
  { dataType: 'MODEL', dataId: modelId, kind: 'ENTITY', mode: 'HARD' },
  { dataType: 'ACCOUNTING', dataId: accountingId, kind: 'ENTITY', mode: 'HARD' },
  { dataType: 'OUTPUT', dataId: outputProductId, kind: 'ENTITY', mode: 'HARD' },
  { dataType: 'PHASE', dataId: phaseId, kind: 'ENTITY', mode: 'HARD' },
  { dataType: 'MODULE', dataId: moduleId, kind: 'ENTITY', mode: 'HARD' },
  { dataType: 'UNIT_PROCESS', dataId: unitProcessId, kind: 'ENTITY', mode: 'HARD' },
]
```

两条硬约束：

- 同一 `dataType` 只能保留一个锚点，重复传不同 ID 后端会判定锚点冲突并让整次 `sendMessage` 失败；组装时按“越贴近当前操作对象优先级越高”去重，节点自身优先于祖先。
- 只传 `display.title` 的类型（`PHASE` / `MODULE` / `UNIT_PROCESS` / `OUTPUT` 等）不会做数据查询，标题就是智能体看到的名称，尽量给真实业务名称。

核算详情页已经把这部分收口成可复用函数，新入口直接复用即可：

- `assistant-workbench/detail-anchor-context.ts`
  `resolveAccountingDetailAnchorContext(...)` 解析项目 / 模型 / 核算 / 输出物 ID，`buildAccountingDetailContextAnchors(...)` 生成上下文锚点。
- `assistant-workbench/anchor-declarations.ts`
  `dedupeAssistantAnchorDeclarations(...)` 按 `dataType` 去重（保留最后一个）。
- `model-config/model/model-config-node-anchors.ts`
  `buildModelConfigNodeAncestorIndex(...)` 收集树上的祖先链，`buildModelConfigNodeAnchorDeclarations(...)` 生成“祖先 + 节点”锚点。

## Renderer 和内容层怎么分工

- `AssistantPanelContent`
  只负责通用 panel 结构。
- `AssistantSheetRenderer`
  右侧 sheet 容器。
- `AssistantDialogRenderer`
  对话框容器。
- `AssistantEmbeddedRenderer`
  页面内嵌容器。
- `AssistantResizableEmbeddedRenderer`
  带宽度拖拽和展开动画的页面内嵌容器。
- `AssistantAnchorChatRenderer`
  当前唯一共享内容层，已经内置线程列表、进度区、交互卡片、推荐提问、附件、消息视口逻辑，以及基于消息 `runId` 的执行回显懒加载；如果页面需要按 step 把回显改造成业务卡片，可通过 `renderRunProgressContent(...)` 做页面级覆写。

页面如果只是换容器，不要复制 `anchor-chat` 内容实现；优先复用 `AssistantAnchorChatRenderer`，只在页面侧做业务 props 组装。

## 什么时候用 `useAssistantWorkbenchPageBridge(...)`

如果页面里已经存在一层旧的 dock / layout bridge，需要把这些职责平滑过渡到共享 store，可以用 `useAssistantWorkbenchPageBridge(...)` 收口：

- 页面开关同步
- `requestAiEdit(...)`
- `clearAnchor()`
- 页面自定义 dock props

它适合过渡和编排，不适合替代真实会话层。真实发送、线程和 SSE 仍应走 `useAssistantAgentSession(...)`。

## 当前共享约束

- 共享内容协议当前只有 `anchor-chat`。
- 新页面接入真实会话时，优先从 `index.ts` 根出口导入，不要默认 deep import 内部实现。
- 页面自己的 scene、target 映射、query 刷新逻辑留在页面目录，不要回灌到 common。
- 后端接口契约以 `AgentService前端接口文档.md` 为参考；若公共用法变化，更新这份 `usage.md`。
