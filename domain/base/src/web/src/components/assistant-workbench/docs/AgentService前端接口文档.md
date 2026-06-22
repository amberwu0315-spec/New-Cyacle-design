# AgentService 前端接口文档

## 1. 接入约定

本文面向真实客户端应用开发，描述当前 `lca.AgentService` 对前端开放的 HTTP 接口、交互流程、请求字段、响应字段和 SSE 事件协议。

### 1.1 基础地址

```http
/lca.AgentService
```

接口路径统一追加在基础地址之后，例如：

```http
POST /lca.AgentService/sendMessage
GET  /lca.AgentService/getEvents?runId={runId}
```

### 1.2 请求头

除 `getEvents` 这类流式接口需要 `Accept: text/event-stream` 外，普通 JSON 接口建议统一携带以下请求头：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `Accept` | string | 建议 | 普通接口使用 `application/json`，SSE 接口使用 `text/event-stream`。 |
| `Content-Type` | string | 视接口而定 | JSON 请求使用 `application/json`；上传文件使用浏览器自动生成的 `multipart/form-data`。 |
| `vrpc-operator` | string | 是 | Base64 编码后的 JSON，格式为 `{"id": 123}`；`id` 必须为大于 0 的数字，用于识别当前操作人。 |
| `Last-Event-ID` | string | 否 | SSE 断线续传时使用，含义同 `lastEventId` 查询参数。 |

说明：`workspaceId` 和 `organizationId` 不再通过请求头传递。需要工作空间或组织上下文的接口通过 `orgInfo` 参数传递。

### 1.3 `orgInfo` 参数

前端仍从本地存储读取 `workspaceId` 和 `organizationId`，但传给后端时放入请求体或表单字段的 `orgInfo`。

`OrgInfo` 字段：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `workspaceId` | string | 否 | 当前工作空间 ID。 |
| `organizationId` | string | 否 | 当前组织 ID。 |

当前应携带 `orgInfo` 的接口：

| 接口 | 传递方式 | 说明 |
| --- | --- | --- |
| `sendMessage` | JSON 字段 `orgInfo` | 用于消息执行、附件归属校验和工具运行上下文。 |
| `submitInteraction` | JSON 字段 `orgInfo` | 用于恢复 Run 后继续注入工作空间和组织上下文。 |
| `uploadFile` | multipart 表单字段 `orgInfo`，值为 JSON 字符串 | 用于保存文件引用的工作空间和组织归属，后续 `sendMessage` 校验附件时会使用。 |

### 1.4 返回与错误

普通接口成功时返回 JSON；`cancelRun` 成功时返回 `204 No Content`。

失败时当前 Web 适配层返回 HTTP 400，响应体格式如下：

```json
{
  "error": "send message: content is required"
}
```

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `error` | string | 后端返回的错误信息，通常包含接口阶段和具体原因。 |

### 1.5 时间格式

| 场景 | 类型 | 说明 |
| --- | --- | --- |
| `Thread.createdAt` | string | RFC3339Nano 字符串。 |
| 其他 `createdAt`、`updatedAt`、`completedAt`、`respondedAt` | string 或 null | JSON 时间字符串；可直接交给 `Date` 解析。 |

### 1.6 参数传递规则

- JSON 接口整体使用对象参数；`sendMessage` 的用户消息内容放在 `message` 对象中。
- `getThreads`、`getMessages`、`getRun`、`getFile`、`getPendingInteractions`、`getEvents` 同时支持 GET 查询参数和 POST JSON 字段。
- `sendMessage` 当前只注册 POST 路由；真实客户端应使用 JSON 请求体传递 `threadId`、`message` 和 `orgInfo`。
- `uploadFile` 使用 `multipart/form-data`，文件字段名固定为 `file`；如需传递 `orgInfo`，表单字段值使用 JSON 字符串。

## 2. 核心交互流程

### 2.1 初始化会话

1. 客户端准备统一请求头，尤其是 `vrpc-operator`。
2. 客户端从本地存储读取 `workspaceId` 和 `organizationId`，在需要时组装为 `orgInfo`。
3. 调用 `getThreads` 获取当前操作人的最近会话列表。
4. 如果没有可用会话，调用 `newThread` 创建会话。
5. 进入某个会话后调用 `getMessages` 加载历史消息。
6. 可选调用 `getPendingInteractions` 恢复未处理的交互卡片。

### 2.2 发送普通消息

1. 客户端调用 `sendMessage`，传入 `threadId`、`message` 和 `orgInfo`；`message` 中包含 `content`、可选 `fileIds` 和可选 `anchors`。
2. 服务端写入用户消息和 Run，立即返回 `messageId` 与 `runId`。
3. 客户端使用 `runId` 调用 `getEvents` 建立 SSE 连接。
4. 客户端按 SSE 包中的 `type` 与 `name` 渲染正文增量、推理增量、进度、交互请求、生命周期事件和错误。
5. 收到 `done` 事件后，本次 SSE 响应结束。
6. 客户端可调用 `getMessages` 重新加载最终消息历史。

### 2.3 上传文件并发送消息

1. 客户端调用 `uploadFile` 上传文件，并在表单字段中携带 `orgInfo`。
2. 上传成功后服务端返回 `fileId`，文件状态通常为 `extracting`。
3. 客户端轮询 `getFile`，直到状态变为 `ready` 或 `failed`。
4. 只有 `ready` 文件可以放入 `sendMessage.message.fileIds`。
5. `sendMessage` 会校验文件数量、归属和解析状态；解析未完成或失败的文件会导致请求失败。

### 2.4 用户交互确认

1. Run 执行期间，如果 Agent 需要用户选择或确认，SSE 会推送 `interaction.requested`。
2. 客户端展示交互卡片，并在收到 `run.require_action` 后将 Run 标记为等待用户。
3. 后端随后发送 `done`，当前 SSE 连接结束。
4. 用户选择后，客户端调用 `submitInteraction`。
5. `submitInteraction` 返回已回答的交互对象，并尽量携带 `lastEventId`。
6. 客户端继续调用 `getEvents?runId={runId}&lastEventId={lastEventId}` 接收恢复后的事件流。

### 2.5 断线续传

1. 客户端保存每个 SSE 包的 `id`。
2. 重新连接时将最后处理成功的 `id` 作为 `lastEventId` 查询参数，或放入 `Last-Event-ID` 请求头。
3. 服务端从该事件之后继续读取。
4. 客户端应对相同 `id` 的事件做幂等处理。

## 3. 接口总览

| 接口 | 方法 | 用途 | 成功响应 |
| --- | --- | --- | --- |
| `/newThread` | POST | 创建新会话 | `Thread` |
| `/getThreads` | GET、POST | 查询当前操作人的会话列表 | `Thread[]` |
| `/sendMessage` | POST | 发送用户消息并创建或恢复 Run | `MessageResponse` |
| `/uploadFile` | POST | 上传文件并启动异步解析 | `FileResponse` |
| `/getFile` | GET、POST | 查询文件引用与解析状态 | `FileResponse` |
| `/getMessages` | GET、POST | 查询会话消息历史 | `Message[]` |
| `/getRun` | GET、POST | 查询 Run 详情 | `RunDetail` |
| `/cancelRun` | POST | 标记取消 Run | `204 No Content` |
| `/getPendingInteractions` | GET、POST | 查询待用户处理的交互 | `AgentInteraction[]` |
| `/submitInteraction` | POST | 提交用户交互结果并恢复 Run | `AgentInteraction` |
| `/getEvents` | GET、POST | 订阅 Run 的 SSE 事件流 | `text/event-stream` |

## 4. 接口明细

### 4.1 创建会话

```http
POST /lca.AgentService/newThread
Content-Type: application/json
```

请求体可以为空对象：

```json
{}
```

处理流程：

1. 从 `vrpc-operator` 解析当前操作人。
2. 生成新的 `threadId`。
3. 创建会话记录。
4. 返回 `Thread`。

响应示例：

```json
{
  "threadId": "d7400ef4-9ff2-497c-9acb-0cf795f7f514",
  "createdAt": "2026-05-24T10:20:30.123456789Z",
  "summary": ""
}
```

`Thread` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `threadId` | string | 会话 ID。 |
| `createdAt` | string | 会话创建时间，RFC3339Nano 字符串。 |
| `summary` | string | 会话摘要；当前实现不生成摘要，通常为空字符串。 |

### 4.2 查询会话列表

```http
GET /lca.AgentService/getThreads
```

也支持：

```http
POST /lca.AgentService/getThreads
Content-Type: application/json
```

处理流程：

1. 从 `vrpc-operator` 解析当前操作人。
2. 查询当前操作人的最近会话。
3. 最多返回 50 条。
4. 返回 `Thread[]`。

响应示例：

```json
[
  {
    "threadId": "d7400ef4-9ff2-497c-9acb-0cf795f7f514",
    "createdAt": "2026-05-24T10:20:30.123456789Z",
    "summary": ""
  }
]
```

### 4.3 发送消息

```http
POST /lca.AgentService/sendMessage
Content-Type: application/json
```

请求示例：

```json
{
  "threadId": "d7400ef4-9ff2-497c-9acb-0cf795f7f514",
  "message": {
    "threadId": "d7400ef4-9ff2-497c-9acb-0cf795f7f514",
    "content": "帮我检查这个模型的活动数据是否完整",
    "fileIds": ["file_123"],
    "anchors": [
      {
        "dataType": "PROJECT",
        "dataId": "project_1",
        "kind": "ENTITY",
        "mode": "HARD",
        "display": { "title": "2026 产品碳足迹项目" }
      }
    ]
  },
  "orgInfo": {
    "workspaceId": "workspace_1",
    "organizationId": "org_1"
  }
}
```

请求字段：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `threadId` | string | 否 | 会话 ID；为空时服务端会自动创建新会话。 |
| `message` | `Message` | 是 | 用户消息对象，至少需要包含 `content`。 |
| `orgInfo` | `OrgInfo` | 否 | 当前工作空间和组织上下文；有相关上下文时建议传入。 |

`Message` 请求字段：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `threadId` | string | 否 | 会话 ID；通常与外层 `threadId` 保持一致。 |
| `content` | string | 是 | 用户消息正文，去除首尾空白后不能为空。 |
| `fileIds` | string[] | 否 | 已上传且解析完成的文件 ID 列表。 |
| `anchors` | `AnchorDeclaration[]` | 否 | 本次消息携带的业务锚点，当前支持项目和模型硬锚点。 |

`AnchorDeclaration` 字段：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `dataType` | enum | 是 | 锚点数据类型；当前实现支持 `PROJECT`、`MODEL`。 |
| `dataId` | string | 是 | 锚点数据 ID。 |
| `kind` | enum | 否 | 锚点类型；当前支持 `ENTITY`，不传时按实体锚点处理。 |
| `mode` | enum | 否 | 锚点模式；当前支持 `HARD`，不传时按硬锚点处理。 |
| `display` | `AnchorDisplay` 或 null | 否 | 前端展示信息。 |

`AnchorDisplay` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `title` | string | 锚点显示标题。 |

处理流程：

1. 从 `orgInfo` 注入工作空间和组织上下文。
2. 校验 `message.content` 不能为空。
3. 从 `vrpc-operator` 解析当前操作人。
4. 清洗 `message.fileIds`，校验数量、归属和解析状态。
5. 规范化 `message.anchors`，仅接受项目和模型实体硬锚点。
6. 如果用户正文里显式出现项目或模型 ID，服务端会尝试识别为提示词锚点。
7. 如果提示词锚点与显式传入锚点冲突，Run 进入 `REQUIRE_ACTION`，并创建交互确认。
8. 若无冲突，创建或读取会话，写入用户消息，创建 Run。
9. Run 初始状态为 `QUEUED`，随后异步执行 Agent。
10. 返回 `MessageResponse`。

响应示例：

```json
{
  "messageId": "msg_123",
  "runId": "run_456"
}
```

`MessageResponse` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `messageId` | string | 本次用户消息 ID。 |
| `runId` | string | 本次 Agent 执行实例 ID；客户端用它订阅 SSE。 |

常见失败：

| 场景 | 错误含义 |
| --- | --- |
| `message.content` 为空 | 消息正文不能为空。 |
| `message.fileIds` 数量超过配置 | 单条消息附件数量超限。 |
| 文件不存在或不属于当前上下文 | 文件不可用。 |
| 文件状态为 `extracting`、`queued`、`uploaded` | 文件仍在解析，需等待 `ready`。 |
| 文件状态为 `failed` | 文件解析失败，不能用于消息上下文。 |
| 锚点类型或模式不支持 | 当前仅支持项目、模型实体硬锚点。 |

### 4.4 上传文件

```http
POST /lca.AgentService/uploadFile
Content-Type: multipart/form-data
```

表单字段：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `file` | File | 是 | 要上传的文件。 |
| `threadId` | string | 否 | 上传时所在会话 ID，用于提前绑定文件引用。 |
| `fileDesc` | string | 否 | 文件描述，会传给文件记录服务。 |
| `purpose` | string | 否 | 文件用途；不传时使用 `agent_context`。 |
| `orgInfo` | string | 否 | `OrgInfo` 的 JSON 字符串，用于保存文件引用的工作空间和组织归属。 |

服务端派生字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `userId` | string | 来自 `vrpc-operator.id`。 |
| `workspaceId` | string | 来自表单字段 `orgInfo.workspaceId`。 |
| `organizationId` | string | 来自表单字段 `orgInfo.organizationId`。 |
| `contentType` | string | 优先使用上传文件头；缺失或为 `application/octet-stream` 时按扩展名推断。 |
| `sizeBytes` | number | 上传文件大小。 |

当前支持的文件扩展名：

```text
.txt, .md, .log, .yaml, .yml, .json, .csv, .tsv, .xlsx
```

处理流程：

1. 校验文件字段、文件名、文件大小和扩展名。
2. 从 `vrpc-operator` 解析当前操作人，操作人 ID 必须可转换为数字。
3. 从 `orgInfo` 注入工作空间和组织上下文。
4. 创建文件记录。
5. 上传文件内容到对象存储。
6. 标记文件记录完成。
7. 保存 Agent 文件引用，初始状态为 `extracting`。
8. 启动异步文件解析。
9. 返回 `FileResponse`，不等待解析完成。

响应示例：

```json
{
  "fileId": "file_123",
  "name": "activity-data.xlsx",
  "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "sizeBytes": 182736,
  "status": "extracting",
  "commonFile": {
    "id": "file_123",
    "bucket": "private-bucket",
    "path": "agent/file_123.xlsx",
    "accessType": "LOGIN"
  },
  "createdAt": "2026-05-24T10:20:30.123456789Z",
  "updatedAt": "2026-05-24T10:20:30.123456789Z"
}
```

`FileResponse` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `fileId` | string | 文件 ID，等同于公共文件记录 ID；发送消息时放入 `message.fileIds`。 |
| `name` | string | 原始文件名或文件记录返回的文件名。 |
| `contentType` | string | 文件 MIME 类型。 |
| `sizeBytes` | number | 文件大小，单位字节。 |
| `status` | enum | Agent 文件解析状态。 |
| `errorMessage` | string | 文件解析失败或引用异常时的错误信息。 |
| `commonFile` | `CommonFileSummary` | 公共文件记录摘要；没有内容时该字段可能省略。 |
| `extraction` | `ExtractionSummary` | 最新解析结果摘要；上传刚完成或尚未解析成功时该字段通常省略。 |
| `createdAt` | string | Agent 文件引用创建时间。 |
| `updatedAt` | string | Agent 文件引用更新时间。 |

`FileResponse.status` 可取值：

| 值 | 含义 |
| --- | --- |
| `uploaded` | 已上传，尚未进入解析。 |
| `queued` | 已排队等待解析。 |
| `extracting` | 正在解析。 |
| `ready` | 解析完成，可以用于 `sendMessage.message.fileIds`。 |
| `failed` | 解析失败。 |
| `deleted` | 文件已删除或不可用。 |

`CommonFileSummary` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `id` | string | 公共文件记录 ID。 |
| `bucket` | string | 对象存储 bucket。 |
| `path` | string | 对象存储路径。 |
| `accessType` | string | 文件访问类型。 |

`ExtractionSummary` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `kind` | string | 解析后的文件类型，例如 `text`、`json`、`spreadsheet`。 |
| `summary` | string | 文件内容摘要。 |
| `stats` | object | 解析统计信息，例如行数、列数、sheet 数等。 |
| `warnings` | string[] | 解析警告，例如内容被截断、空表等。 |

### 4.5 查询文件状态

```http
GET /lca.AgentService/getFile?fileId=file_123
```

也支持：

```http
POST /lca.AgentService/getFile
Content-Type: application/json

{"fileId":"file_123"}
```

请求字段：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `fileId` | string | 是 | 文件 ID。 |

处理流程：

1. 从 `vrpc-operator` 解析当前操作人。
2. 查询 Agent 文件引用。
3. 校验文件归属当前用户。
4. 查询最新解析摘要。
5. 返回 `FileResponse`。

客户端建议：

- 上传成功后每隔数秒调用一次 `getFile`。
- `ready` 后允许发送消息。
- `extracting`、`queued`、`uploaded` 继续等待。
- `failed` 展示 `errorMessage`，不要放入 `sendMessage.message.fileIds`。

### 4.6 查询消息列表

```http
GET /lca.AgentService/getMessages?threadId=d7400ef4-9ff2-497c-9acb-0cf795f7f514
```

也支持：

```http
POST /lca.AgentService/getMessages
Content-Type: application/json

{"threadId":"d7400ef4-9ff2-497c-9acb-0cf795f7f514"}
```

请求字段：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `threadId` | string | 是 | 会话 ID。 |

处理流程：

1. 校验 `threadId` 不能为空。
2. 查询该会话下的消息历史。
3. 按会话内消息顺序返回。
4. 返回数量受会话历史配置限制，默认 50 条。
5. 对带 Run 的消息补充锚点解析摘要。

响应示例：

```json
[
  {
    "messageId": "msg_123",
    "threadId": "d7400ef4-9ff2-497c-9acb-0cf795f7f514",
    "role": "user",
    "content": "帮我检查这个模型的活动数据是否完整",
    "thinking": null,
    "toolCalls": [],
    "toolResults": [],
    "fileIds": ["file_123"],
    "createdAt": "2026-05-24T10:20:30.123456789Z",
    "anchors": [],
    "resolvedAnchorsSummary": {
      "status": "EMPTY",
      "summary": "未锁定业务锚点",
      "resolvedAnchorsSummary": [],
      "anchorErrors": null
    }
  }
]
```

`Message` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `messageId` | string | 消息 ID。 |
| `threadId` | string | 所属会话 ID。 |
| `role` | string | 消息角色，常见值为 `user`、`assistant`、`system`、`tool`。 |
| `content` | string | 消息正文。 |
| `thinking` | string 或 null | Agent 推理文本；没有内容时为 null。 |
| `toolCalls` | `AgentToolCall[]` | Assistant 消息中的工具调用摘要。 |
| `toolResults` | `AgentToolResult[]` | Tool 消息中的工具结果摘要。 |
| `fileIds` | string[] 或 null | 用户消息携带的文件 ID 列表；没有文件时可能为 null。 |
| `createdAt` | string | 消息创建时间。 |
| `anchors` | `AnchorDeclaration[]` | 用户消息携带的锚点声明。 |
| `resolvedAnchorsSummary` | `ResolvedAnchorsSummary` 或 null | 该消息关联 Run 的锚点解析摘要；没有关联 Run 或 Run 不可读取时可能为 null。 |

`AgentToolCall` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `id` | string 或 null | 工具调用 ID。 |
| `name` | string | 工具名称。 |
| `input` | string 或 null | 工具输入的 JSON 字符串；无输入时为 null。 |

`AgentToolResult` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `id` | string 或 null | 工具调用 ID。 |
| `name` | string | 工具名称。 |
| `output` | string 或 null | 工具输出的 JSON 字符串；无输出时为 null。 |

### 4.7 查询 Run 详情

```http
GET /lca.AgentService/getRun?runId=run_456
```

也支持：

```http
POST /lca.AgentService/getRun
Content-Type: application/json

{"runId":"run_456"}
```

请求字段：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `runId` | string | 是 | Run ID。 |

处理流程：

1. 校验 `runId` 不能为空。
2. 查询 Run 记录。
3. 将内部状态转换为前端枚举。
4. 返回 Run 详情和锚点解析信息。

响应示例：

```json
{
  "id": "run_456",
  "messageId": "msg_123",
  "threadId": "d7400ef4-9ff2-497c-9acb-0cf795f7f514",
  "status": "RUNNING",
  "intend": null,
  "createdAt": "2026-05-24T10:20:30.123456789Z",
  "updatedAt": "2026-05-24T10:20:31.123456789Z",
  "completedAt": null,
  "resolvedAnchors": [],
  "anchorStatus": "EMPTY",
  "anchorErrors": null,
  "resolvedAnchorsSummary": {
    "status": "EMPTY",
    "summary": "未锁定业务锚点",
    "resolvedAnchorsSummary": [],
    "anchorErrors": null
  }
}
```

`RunDetail` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `id` | string | Run ID。 |
| `messageId` | string | 触发该 Run 的用户消息 ID。 |
| `threadId` | string | 所属会话 ID。 |
| `status` | enum | Run 状态。 |
| `intend` | string 或 null | 契约字段，当前实现不设置。 |
| `createdAt` | string | Run 创建时间。 |
| `updatedAt` | string | Run 更新时间。 |
| `completedAt` | string 或 null | Run 完成、失败或取消时间；未结束时为 null。 |
| `resolvedAnchors` | `ResolvedAnchor[]` | 服务端解析后的锚点列表。 |
| `anchorStatus` | enum | 本次 Run 的锚点解析状态。 |
| `anchorErrors` | `AnchorError[]` 或 null | 锚点解析错误列表；没有错误时通常为 null。 |
| `resolvedAnchorsSummary` | `ResolvedAnchorsSummary` 或 null | 锚点解析摘要。 |

`RunDetail.status` 可取值：

| 值 | 含义 |
| --- | --- |
| `QUEUED` | 已创建，等待执行。 |
| `RUNNING` | 正在执行。 |
| `REQUIRE_ACTION` | 等待用户交互。 |
| `COMPLETED` | 已完成。 |
| `FAILED` | 执行失败。 |
| `CANCELLED` | 已取消。 |
| `UNSPECIFIED` | 未识别状态。 |

`ResolvedAnchor` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `dataType` | enum | 锚点数据类型。 |
| `dataId` | string | 锚点数据 ID。 |
| `kind` | enum | 锚点类型。 |
| `name` | string 或 null | 锚点显示名称。 |
| `status` | enum | 锚点解析状态。 |

`ResolvedAnchorsSummary` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `status` | enum | 整体锚点状态。 |
| `summary` | string 或 null | 面向前端展示的摘要文本。 |
| `resolvedAnchorsSummary` | `AnchorSummary[]` | 按锚点类型汇总后的名称列表。 |
| `anchorErrors` | `AnchorError[]` 或 null | 锚点错误列表；没有错误时通常为 null。 |

`AnchorSummary` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `dataType` | enum | 锚点数据类型。 |
| `name` | string | 锚点名称；没有标题时使用数据 ID。 |

`AnchorError` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `code` | string | 错误码。 |
| `message` | string 或 null | 错误描述。 |
| `dataType` | enum | 相关锚点类型；不一定有值。 |
| `dataId` | string | 相关锚点 ID；不一定有值。 |

`AnchorResolvedStatus` 可取值：

| 值 | 含义 |
| --- | --- |
| `EMPTY` | 未锁定锚点。 |
| `RESOLVED` | 已解析并应用锚点。 |
| `CONFLICTED` | 锚点冲突。 |
| `REJECTED` | 锚点被拒绝。 |
| `UNSPECIFIED` | 未识别状态。 |

### 4.8 取消 Run

```http
POST /lca.AgentService/cancelRun
Content-Type: application/json
```

请求示例：

```json
{
  "runId": "run_456"
}
```

请求字段：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `runId` | string | 是 | 要取消的 Run ID。 |

处理流程：

1. 校验 `runId` 不能为空。
2. 将 Run 状态更新为 `CANCELLED`。
3. 写入完成时间。
4. 返回 `204 No Content`。

说明：当前取消接口负责更新 Run 状态；客户端仍应主动关闭正在读取的 SSE 连接。

### 4.9 查询待处理交互

```http
GET /lca.AgentService/getPendingInteractions?threadId=d7400ef4-9ff2-497c-9acb-0cf795f7f514
```

也支持：

```http
POST /lca.AgentService/getPendingInteractions
Content-Type: application/json

{"threadId":"d7400ef4-9ff2-497c-9acb-0cf795f7f514"}
```

请求字段：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `threadId` | string | 是 | 会话 ID。 |

处理流程：

1. 从 `vrpc-operator` 解析当前操作人。
2. 查询该会话下当前操作人的待处理交互。
3. 最多返回 50 条。
4. 返回 `AgentInteraction[]`。

响应示例：

```json
[
  {
    "id": "interaction_123",
    "threadId": "d7400ef4-9ff2-497c-9acb-0cf795f7f514",
    "runId": "run_456",
    "lastEventId": null,
    "kind": "CONFIRM",
    "title": "锚点冲突确认",
    "body": "当前锁定锚点是：项目：A；用户消息中明确指定的是：项目：B。是否改用用户消息中的锚点继续？",
    "selectionMode": "SINGLE",
    "options": [
      { "id": "confirm", "label": "改用提示词锚点", "description": null, "disabled": null },
      { "id": "cancel", "label": "保留当前锚点", "description": null, "disabled": null }
    ],
    "status": "PENDING",
    "createdAt": "2026-05-24T10:20:31.123456789Z",
    "respondedAt": null
  }
]
```

`AgentInteraction` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `id` | string | 交互 ID，提交时作为 `interactionId`。 |
| `threadId` | string | 所属会话 ID。 |
| `runId` | string | 所属 Run ID。 |
| `lastEventId` | string 或 null | 可用于恢复 SSE 的事件 ID；查询待处理交互时通常为空。 |
| `kind` | enum | 交互类型。 |
| `title` | string | 交互标题。 |
| `body` | string 或 null | 交互说明正文。 |
| `selectionMode` | enum 或 null | 选项选择模式。 |
| `options` | `AgentInteractionOption[]` | 可选项列表。 |
| `status` | enum | 交互状态。 |
| `createdAt` | string | 交互创建时间。 |
| `respondedAt` | string 或 null | 用户提交时间。 |

`AgentInteractionOption` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `id` | string | 选项 ID，提交时放入 `selectedOptionIds`。 |
| `label` | string | 选项展示文案。 |
| `description` | string 或 null | 选项说明。 |
| `disabled` | boolean 或 null | 是否禁用；为 true 时不能提交。 |

交互枚举：

| 枚举 | 可取值 | 含义 |
| --- | --- | --- |
| `AgentInteractionKind` | `CONFIRM`、`CHOICE`、`UNSPECIFIED` | 确认类或选择类交互。 |
| `AgentInteractionSelectionMode` | `SINGLE`、`MULTIPLE`、`UNSPECIFIED` | 单选或多选。 |
| `AgentInteractionStatus` | `PENDING`、`ANSWERED`、`CANCELLED`、`EXPIRED`、`UNSPECIFIED` | 交互处理状态。 |

### 4.10 提交用户交互

```http
POST /lca.AgentService/submitInteraction
Content-Type: application/json
```

请求示例：

```json
{
  "threadId": "d7400ef4-9ff2-497c-9acb-0cf795f7f514",
  "runId": "run_456",
  "interactionId": "interaction_123",
  "confirmed": true,
  "selectedOptionIds": ["confirm"],
  "orgInfo": {
    "workspaceId": "workspace_1",
    "organizationId": "org_1"
  }
}
```

请求字段：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `threadId` | string | 是 | 交互所属会话 ID。 |
| `runId` | string | 是 | 交互所属 Run ID。 |
| `interactionId` | string | 是 | 要提交的交互 ID。 |
| `confirmed` | boolean | 否 | 确认类交互的快捷字段；true 等价于选择 `confirm`，false 等价于选择 `cancel`。 |
| `selectedOptionIds` | string[] | 否 | 用户选择的选项 ID 列表；传入时以该字段为准。 |
| `orgInfo` | `OrgInfo` | 否 | 当前工作空间和组织上下文；恢复 Run 后继续注入工具运行上下文。 |

提交规则：

- 最终至少要有一个选中选项。
- 非多选交互只允许一个选项。
- 选项必须存在于后端创建交互时的选项快照中。
- 禁用选项不能提交。
- 对 `CONFIRM` 交互，如果未传 `selectedOptionIds`，可只传 `confirmed`。

处理流程：

1. 从 `orgInfo` 注入工作空间和组织上下文。
2. 从 `vrpc-operator` 解析当前操作人。
3. 读取交互记录。
4. 根据 `selectedOptionIds` 或 `confirmed` 构造交互响应。
5. 标记交互为已回答。
6. 写入 `interaction.resolved` 事件。
7. 根据交互恢复 Run 执行。
8. 返回更新后的 `AgentInteraction`。

响应说明：

- 响应结构同 `AgentInteraction`。
- 如果成功写入 `interaction.resolved` 事件，响应中的 `lastEventId` 会是该事件 ID。
- 客户端应使用返回的 `runId` 和 `lastEventId` 继续调用 `getEvents`。

### 4.11 订阅 Run 事件流

```http
GET /lca.AgentService/getEvents?runId=run_456&lastEventId=1747540000000-0
Accept: text/event-stream
```

也支持通过请求头续传：

```http
GET /lca.AgentService/getEvents?runId=run_456
Accept: text/event-stream
Last-Event-ID: 1747540000000-0
```

请求字段：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `runId` | string | 是 | 要订阅的 Run ID。 |
| `lastEventId` | string | 否 | 从该事件之后继续读取；为空时从事件流起始位置读取。 |

响应头：

```http
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive
X-Content-Type-Options: nosniff
X-Accel-Buffering: no
X-Run-Id: run_456
```

SSE 帧示例：

```text
id: 1747540000000-0
event: content
data: {"v":"1","id":"1747540000000-0","type":"content","name":"assistant.delta","runId":"run_456","threadId":"d7400ef4-9ff2-497c-9acb-0cf795f7f514","ts":"2026-05-24T10:20:31.123456789Z","status":"running","scope":{"kind":"run","id":"run_456"},"data":{"delta":"正在分析"}}

id: 1747540000001-0
event: done
data: {"v":"1","id":"1747540000001-0","type":"done","name":"done","runId":"run_456","threadId":"d7400ef4-9ff2-497c-9acb-0cf795f7f514","scope":{"kind":"run","id":"run_456"},"data":{}}

```

处理流程：

1. 校验 `runId` 不能为空。
2. 读取 `lastEventId` 查询参数；如果为空，再读取 `Last-Event-ID` 请求头。
3. 未提供续传位置时，从事件流起始位置读取。
4. 阻塞读取 Run 事件，每批最多输出 100 条。
5. 没有事件时输出 SSE 注释心跳：`: ping`。
6. 输出 `done` 事件后结束本次响应。
7. 输出失败时服务端尽量写入 `error` 事件。

`StreamPacket` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `v` | string | 流协议版本，当前为 `1`。 |
| `id` | string | 事件 ID，与 SSE `id` 一致，可用于断线续传。 |
| `type` | string | 前端分发用事件类型。 |
| `name` | string | 更细的事件名称。 |
| `runId` | string | 所属 Run ID。 |
| `threadId` | string | 所属会话 ID。 |
| `ts` | string | 事件创建时间。 |
| `status` | string | 事件状态，例如 `running`、`completed`、`failed`、`waiting_user`。 |
| `scope` | `StreamScope` 或 null | 事件作用域。 |
| `display` | `StreamDisplay` 或 null | 展示文案。 |
| `data` | object | 事件数据主体，结构由 `type` 和 `name` 决定。 |
| `meta` | object | 额外元数据。 |

`StreamScope` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `kind` | string | 作用域类型，例如 `run`、`tool`、`section`、`interaction`。 |
| `id` | string | 作用域 ID。 |
| `parentId` | string | 父作用域 ID。 |
| `tool` | string | 工具名称。 |
| `attempt` | number | 重试次数或尝试序号。 |
| `index` | number | 顺序索引。 |

`StreamDisplay` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `title` | string | 展示标题。 |
| `message` | string | 展示说明。 |
| `level` | string | 展示级别，例如 `info`、`warning`、`error`。 |
| `progressLabel` | string | 进度标签。 |

说明：`display` 是后端已经渲染好的展示文案，客户端直接展示即可，不需要也不应该再解析模板。工具和工作流的进度文案可能由后端根据本次调用的 `input`、`output` 渲染得到，但 SSE 包仍然不会暴露原始工具输入输出明细；如果某个 `display` 字段缺失，客户端可以按 `name`、`type` 或本地默认文案兜底。

事件类型：

| `type` | `name` | `data` 关键字段 | 客户端处理建议 |
| --- | --- | --- | --- |
| `content` | `assistant.delta` | `delta: string` | 追加到 Assistant 正文。 |
| `thinking` | `assistant.reasoning` | `delta: string` | 追加到推理区。 |
| `progress` | `progress.update`、`workflow.run`、`workflow.step` 或自定义 | 由进度事件决定 | 更新进度面板。 |
| `progress` | `tool.call` | `tool: string`、可选 `reason`、`retryable` | 展示工具调用进度；流式包不暴露工具输入输出明细。 |
| `progress` | `section.<kind>` | `kind: string`、`phase: string` | 展示非工具区块开始或结束；`kind=tools` 的区块事件不会下发给客户端。 |
| `interaction` | `interaction.requested` | `interactionId`、`kind`、`title`、`body`、`selectionMode`、`options`、`submit` | 展示交互卡片。 |
| `interaction` | `interaction.resolved` | `interactionId`、`status`、`answeredAt` | 将交互卡片标记为已处理。 |
| `lifecycle` | `run.started` | 空对象 | 标记 Run 开始。 |
| `lifecycle` | `run.require_action` | `interactionId`、`reason` | 标记 Run 等待用户。 |
| `lifecycle` | `run.resumed` | `interactionId`、`resumedFrom` | 标记 Run 恢复执行。 |
| `lifecycle` | `message.completed` | `messageId` | 标记 Assistant 消息完成。 |
| `error` | `run.error` 或自定义 | `code`、`message`、`retryable`、`terminal`、`detail` | 展示错误；`terminal` 为 true 时标记 Run 失败。 |
| `done` | `done` | 空对象 | 本次 SSE 响应结束。 |
| `custom` | `anchor.applied@v1` | `schema`、`payload` | 更新本地锚点状态；不建议渲染为普通事件消息或进度卡片。 |
| `command` | 命令名称 | 命令载荷 | 按客户端白名单执行页面联动。 |

`tool.call.data` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `tool` | string | 工具名称。 |
| `reason` | string | 失败原因；当前可出现 `tool_input_schema_validation_failed`。 |
| `retryable` | boolean | 是否属于可由模型修正后重试的工具调用失败。 |

说明：当 `tool.call` 的 `status=failed` 且 `data.retryable=true`、`data.reason=tool_input_schema_validation_failed` 时，表示本次工具参数校验失败，工具没有实际执行。客户端应展示该失败和后续重试过程，但不要仅凭这类 retryable 进度把整个 Run 标记为终止失败；后续同名工具可能继续出现 `running`、`completed` 或非 retryable 的 `failed` 进度。

`interaction.requested.data` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `interactionId` | string | 交互 ID。 |
| `kind` | string | 交互类型，常见为 `CONFIRM` 或 `CHOICE`。 |
| `title` | string | 交互标题。 |
| `body` | string | 交互正文。 |
| `selectionMode` | string | 选择模式，常见为 `SINGLE` 或 `MULTIPLE`。 |
| `options` | `AgentInteractionOption[]` | 可选项。 |
| `submit` | object | 提交提示，当前为 `{ "endpoint": "submitInteraction", "method": "POST" }`。 |

`anchor.applied@v1` 的 `payload` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `status` | string | 锚点状态，常见为 `empty`、`resolved`。 |
| `summary` | string | 锚点摘要文案。 |
| `data` | `AnchorDataSummaryPacket[]` | 按锚点类型分组的数据。 |

`AnchorDataSummaryPacket` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `dataType` | string | 锚点数据类型，当前常见为 `project` 或 `model`。 |
| `anchors` | `ResolvedAnchorPacket[]` | 当前类型下的锚点列表。 |

`ResolvedAnchorPacket` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `kind` | string | 锚点类型，当前为 `ENTITY`。 |
| `dataType` | string | 锚点数据类型。 |
| `id` | string | 锚点数据 ID。 |
| `mode` | string | 锚点模式。 |
| `title` | string | 展示标题。 |
| `status` | string | 锚点解析状态。 |
| `source` | string | 锚点来源，例如 `sendMessage`。 |

说明：`anchor.applied@v1` 是锚点状态同步事件，客户端可以用它刷新当前会话的锚点上下文；如果页面已经有独立锚点区域，不需要再把该事件渲染成聊天区消息、进度项或事件卡片。

## 5. 推荐客户端状态机

### 5.1 Run 状态

| 客户端状态 | 进入条件 | 建议 UI |
| --- | --- | --- |
| `idle` | 未订阅 Run。 | 可发送消息。 |
| `running` | `sendMessage` 成功、收到 `run.started`、`content`、`thinking`、普通 `progress`，或 retryable 的工具校验失败进度。 | 禁用发送按钮，展示停止按钮。 |
| `waiting_user` | 收到 `run.require_action`。 | 展示交互卡片，允许用户选择。 |
| `completed` | 收到 `message.completed` 且未等待用户。 | 允许发送下一条消息。 |
| `failed` | 收到终止性 `error`，或收到非 retryable 的失败进度。 | 展示错误，允许重试。 |
| `cancelled` | 客户端调用 `cancelRun` 或收到取消状态。 | 关闭 SSE，允许继续操作。 |

### 5.2 文件状态

| 客户端状态 | 进入条件 | 建议 UI |
| --- | --- | --- |
| `uploading` | 浏览器正在发起 `uploadFile`。 | 展示上传中。 |
| `extracting`、`queued`、`uploaded` | `uploadFile` 或 `getFile` 返回待处理状态。 | 展示解析中并继续轮询。 |
| `ready` | `getFile` 返回 `ready`。 | 允许随消息发送。 |
| `failed` | `getFile` 返回 `failed` 或轮询多次失败。 | 展示错误并阻止发送。 |
| `deleted` | `getFile` 返回 `deleted`。 | 从待发送附件中移除或提示不可用。 |

## 6. 最小调用示例

### 6.1 统一请求方法

```ts
function operatorHeader(operatorId: number) {
  return btoa(JSON.stringify({ id: operatorId }));
}

function currentOrgInfo() {
  const orgInfo = {
    workspaceId: localStorage.getItem('workspaceId')?.trim() || undefined,
    organizationId: localStorage.getItem('organizationId')?.trim() || undefined,
  };
  return orgInfo.workspaceId || orgInfo.organizationId ? orgInfo : undefined;
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', headers.get('Accept') || 'application/json');
  headers.set('vrpc-operator', operatorHeader(123));

  const response = await fetch(`/lca.AgentService/${path}`, { ...init, headers });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text ? JSON.parse(text).error || text : `HTTP ${response.status}`);
  }
  return text.trim() ? JSON.parse(text) as T : undefined as T;
}
```

### 6.2 发送消息并读取 SSE

```ts
const { runId } = await requestJson<{ messageId: string; runId: string }>('sendMessage', {
  method: 'POST',
  body: JSON.stringify({
    threadId,
    message: {
      threadId,
      content: '帮我检查活动数据',
      fileIds: readyFileIds,
      anchors: [{ dataType: 'PROJECT', dataId: 'project_1', kind: 'ENTITY', mode: 'HARD' }],
    },
    orgInfo: currentOrgInfo(),
  }),
});

const response = await fetch(`/lca.AgentService/getEvents?runId=${encodeURIComponent(runId)}`, {
  headers: {
    Accept: 'text/event-stream',
    'vrpc-operator': operatorHeader(123),
  },
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  for (;;) {
    const index = buffer.indexOf('\n\n');
    if (index < 0) break;
    const frame = buffer.slice(0, index);
    buffer = buffer.slice(index + 2);
    // 解析 id、event、data 后，JSON.parse(data) 得到 StreamPacket。
  }
}
```

## 7. 开发注意事项

- `sendMessage` 只返回 `messageId` 和 `runId`，不会直接返回 Assistant 回复内容。
- Assistant 回复、推理、进度、交互请求都通过 `getEvents` 返回。
- `done` 只表示当前 SSE 响应结束；如果 Run 进入 `REQUIRE_ACTION`，用户提交交互后还需要继续订阅同一个 `runId`。
- 文件上传成功不代表可用于对话，必须等 `getFile.status` 为 `ready`。
- 断线续传依赖事件 ID，客户端应保存最后成功处理的 `StreamPacket.id`。
- `getMessages` 返回的是持久化消息历史；流式过程中尚未完成的 Assistant 增量以 SSE 为准。
- 工具调用的详细输入输出会在消息历史中以 JSON 字符串形式返回；SSE 进度包只提供适合前端展示的摘要，`display` 文案由后端渲染完成后下发。
- 客户端不应等待或渲染 `section.tools`；工具调用只按 `tool.call` 进度展示。
- `tool.call` 的 retryable 失败表示当前尝试失败但 Run 仍可继续，客户端应显示失败/重试状态，不要隐藏，也不要直接判定整个 Run 失败。
- `anchor.applied@v1` 用于同步本地锚点状态，不需要在聊天区输出“锚点应用成功”之类的消息。
- 当前锚点能力只支持项目和模型实体硬锚点；其他类型会被拒绝。

2026年6月1日
lca.skel-0.0.1-f.c-ca866fd2
创建thread和查询thread支持指定tags了
新增了getRunProgress(runId: string)，可以轮询这个接口用来查询建模阶段的执行进度
sendMessage的时候，如果没有传threadId，会自动创建一个thread