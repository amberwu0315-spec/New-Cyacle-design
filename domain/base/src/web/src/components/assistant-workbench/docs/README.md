# 协作助手工作台

`assistant-workbench` 是当前共享的协作助手基础层，负责统一助手状态、锚点协议、内容渲染、真实 Agent 会话链路，以及页面级单例入口注册。

这份 README 只做总览和索引；具体接入方式、真实发送链路和 API 约定请看 [usage.md](./usage.md)。

## 文档入口

- [README.md](./README.md)：目录总览、职责边界、当前主链路。
- [usage.md](./usage.md)：接入方式、公共 API、真实发送链路、推荐模式。
- [AgentService前端接口文档.md](./AgentService前端接口文档.md)：后端提供的接口文档，前端实现可参考，但不要在这里直接改动接口约定。

`todo.md` 已移除。这里不再维护阶段性迁移清单，后续以实现、测试和接入文档为准。

## 当前状态

当前共享实现已经稳定在下面这条主链路上：

- 共享 store：`assistant-workbench/store`
- 共享内容协议：`anchor-chat`
- 共享渲染器：`sheet / dialog / embedded / resizable embedded`
- 真实会话链路：`useAssistantAgentSession(...)`
- 页面级单例入口：`AgentCollaborationRoot + useAgentCollaborationPage(...)`

当前公共内容协议只有 `anchor-chat` 一种。页面如果需要真实 AI 会话，优先在页面侧补 adapter、scene 和 query 刷新逻辑，再复用这里的公共 controller / session / renderer；不要重新维护一套消息、线程和 SSE runtime。

## 目录职责

- `adapters/`
  业务 target / message / attachment 到 workbench 通用类型的映射边界。
- `content/`
  按协议收拢内容实现。当前只有 `anchor-chat/`。
- `controller/`
  通用控制层。`useAssistantWorkbenchController(...)` 负责共享 store 适配；`useAssistantAgentSession(...)` 负责真实线程、消息、SSE 和交互卡片。
- `docs/`
  共享文档入口。这里只放公共接入和协议约定，不放页面私有说明。
- `model/`
  共享类型：target、protocol、message、attachment、thread、run、interaction 等。
- `page-agent-collaboration.tsx` / `page-agent-collaboration-store.ts`
  页面级单例助手注册表与根挂载逻辑，适合轻量入口和统一 panel slot。
- `page-bridge/`
  旧页面桥接 helper。适合把页面里“open / clear anchor / dock props / embedded 判定”这一层编排收口。
- `service/`
  AgentService 和附件上传的公共访问层。
- `store/`
  外部 store、actions、hooks、snapshot helper。
- `ui/`
  与内容协议无关的通用容器：`AssistantPanelContent`、`AssistantSheetRenderer`、`AssistantDialogRenderer`、`AssistantEmbeddedRenderer`、`AssistantResizableEmbeddedRenderer`。
- `index.ts`
  唯一公开出口。外部接入优先从这里导入。

## 推荐接入路径

### 1. 页面级轻量单例入口

适合列表页、管理页、工作台壳层：

- 应用根部挂一次 `AgentCollaborationRoot`
- 页面用 `useAgentCollaborationPage(...)` 注册入口、panel slot 和自定义 panel 内容
- 行级或区块级入口可直接用 `AgentAnchorButton`

注意：如果页面只注册 `defaultTarget`，没有提供自定义 `renderPanel` 或 `openAssistant`，默认面板会使用共享的真实 Agent 会话实现；宿主应用仍需要先通过 `configureAssistantAgentRuntime(...)` 注入 AgentService、附件上传和文档下载能力。

### 2. 真实 Agent 会话页面

适合详情页、编辑页、需要线程历史和 SSE 的业务页面：

- 页面自己维护 adapter
- 页面自己维护 scene（`threadTags + defaultAnchors`）
- `useAssistantWorkbenchController(...)` 负责 shared store / draft / attachment 映射
- `useAssistantAgentSession(...)` 负责真实线程、消息、进度、交互和发送
- 页面自己的 content/controller 再把这些 props 组装给 `AssistantAnchorChatRenderer`

当前 `product-carbon-tasks/accounting-detail` 和 `product-carbon-tasks/accounting-list` 都走这条路径。

### 3. 老页面桥接过渡

如果页面仍然保留旧 dock 或 layout 编排，可以基于 `useAssistantWorkbenchPageBridge(...)` 先把共享开关、active target 和 dock props 收口，再逐步迁移到新的 panel / content 结构。

## 当前示例

- `src/routes/_auth/route.tsx`
  全局挂载 `AgentCollaborationRoot`。
- `src/components/sections/product-carbon-tasks/layout/assistant-shell.tsx`
  页面级 `useAgentCollaborationPage(...)` 注册示例。
- `src/components/sections/product-carbon-tasks/accounting-detail/assistant-workbench/`
  详情页真实 Agent 会话接入示例。
- `src/components/sections/product-carbon-tasks/accounting-list/controller/use-product-carbon-accounting-task-list-assistant.ts`
  列表页真实 Agent 会话接入示例。
- `src/components/sections/product-carbon-tasks/assistant-workbench/use-product-carbon-task-page-assistant.ts`
  可复用的页面级真实会话 helper。

## 文档边界

- 共享 API、协议、发送链路、接入方式，统一写在这里。
- 页面私有 target、scene、字段语义、刷新逻辑，优先放在页面自己的 `assistant-workbench/` 或页面目录内。
- 后端接口契约以 `AgentService前端接口文档.md` 为参考来源；若前端实现变化影响共享用法，需要更新这里的 `usage.md`，而不是只留在页面代码里。

## 同步要求

- 修改 `index.ts` 导出、公共 hook、公共 renderer、协议字段时，更新 [usage.md](./usage.md)。
- 修改目录职责、主链路或推荐接入方式时，更新本文件。
- 新增或删除共享文档时，同步更新这里的入口列表，以及根 `AGENTS.md` 里的文档索引。
