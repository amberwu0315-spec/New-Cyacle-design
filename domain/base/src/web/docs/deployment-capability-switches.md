# 前端部署能力开关改造说明

[← 返回 Web 文档入口](../web.md)

> 职责：说明如何把前端功能显示从“写死在组件里”改造成“部署时可配置的能力开关”，并给出可复用到其它项目的标准链路与新增开关的步骤清单。

## 背景

在 Cyacle 中，部分前端功能需要按部署环境或客户形态开关，例如：

- 是否显示 Agent 协作入口；
- 是否显示语言切换入口；
- 数据记录是否支持地图测算；
- CFP/LCA 模型列表是否显示“AI 创建核算”入口。

这些开关不应该是散落在组件里的 `if`，也不应该依赖 localStorage 或后端接口才能决定。项目统一采用 **Vite 环境变量** 作为部署时输入，经过 **项目配置层** 归一化后，通过 **共享能力配置** 给各领域消费。

## 总体链路

```text
app/src/web/.env*（VITE_APP_XXX_ENABLED）
        │  构建时注入 import.meta.env.VITE_APP_XXX_ENABLED
        ▼
app/src/web/src/project-config.ts（readBooleanEnv，默认值 + 校验）
        │  configureWebProjectConfig(webProjectConfig)
        ▼
domain/base/src/web/src/lib/web-project-config.ts（能力类型 + 全局 store）
        │  getWebProjectConfig().capabilities.xxx.enabled
        ▼
业务领域组件（消费开关，决定渲染/查询/加载）
```

职责边界：

- `app` 层：决定“这个项目有哪些开关、默认值是什么”，是唯一直接读 `VITE_*` 的地方。
- `base` 层：只提供能力配置的**类型和存取**，不关心具体开关语义。
- `feature domain` 层：用 `getWebProjectConfig()` 读取开关并决定行为。

## 关键文件

| 文件 | 职责 |
| --- | --- |
| `app/src/web/.env.example` | 环境变量模板与注释，是部署同学和开发者阅读开关含义的入口 |
| `app/src/web/src/project-config.ts` | 应用入口配置：读取 `VITE_*`、归一化为布尔值、注入 base |
| `domain/base/src/web/src/lib/web-project-config.ts` | `WebProjectConfig` 类型、`configureWebProjectConfig`、`getWebProjectConfig` |
| `domain/base/src/web/src/test/web-project-config.ts` | 测试夹具，构造完整能力配置供单测使用 |
| 各 feature domain 的组件/hook | 消费 `getWebProjectConfig().capabilities.xxx.enabled` |

## 改造步骤

下面按“新增一个开关”的完整流程给出步骤。步骤 1、2、3 是在既有体系上新增能力；如果是新项目首次引入这套体系，则按同样顺序先把 base 的配置层建立起来。

### 1. 在 base 声明能力类型

编辑 `domain/base/src/web/src/lib/web-project-config.ts`。

先给 `WebProjectCapabilitiesConfig` 增加一个字段：

```ts
export interface WebProjectCapabilitiesConfig {
  readonly agent: WebProjectCapabilityConfig
  readonly dataRecordMap: WebProjectCapabilityConfig
  readonly languageSwitcher: WebProjectCapabilityConfig
  readonly lcaAiCreateAccounting: WebProjectCapabilityConfig // 新增
}
```

再在 `createWebProjectConfig` 的 `capabilities` 中补一行校验：

```ts
lcaAiCreateAccounting: createCapabilityConfig(
  config.capabilities.lcaAiCreateAccounting,
  'lcaAiCreateAccounting',
),
```

`createCapabilityConfig` 会校验 `enabled` 必须是布尔值，避免上层传入非法值。

### 2. 同步测试夹具

编辑 `domain/base/src/web/src/test/web-project-config.ts`，给 `configureTestWebProjectConfig` 里的 `capabilities` 补上同样的字段，否则类型检查会报缺字段：

```ts
capabilities: {
  agent: { enabled: true },
  dataRecordMap: { enabled: true },
  languageSwitcher: { enabled: true },
  lcaAiCreateAccounting: { enabled: true },
},
```

### 3. 在 app 入口读取环境变量

编辑 `app/src/web/src/project-config.ts`，在 `webProjectConfig.capabilities` 中增加：

```ts
lcaAiCreateAccounting: {
  enabled: readBooleanEnv(
    'VITE_APP_LCA_AI_CREATE_ACCOUNTING_ENABLED',
    import.meta.env.VITE_APP_LCA_AI_CREATE_ACCOUNTING_ENABLED,
    true,
  ),
},
```

`readBooleanEnv` 的约定：

- 未配置、空字符串：返回默认值；
- `true` / `false`（忽略大小写和首尾空格）：返回对应布尔值；
- 其它值：抛出错误，让配置错误在启动时显式暴露。

### 4. 写环境变量模板

编辑 `app/src/web/.env.example`，增加一条带注释的模板：

```bash
# 是否显示 CFP/LCA 项目详情「模型列表」页的“AI 创建核算”入口。
# 未配置时默认开启。
VITE_APP_LCA_AI_CREATE_ACCOUNTING_ENABLED=true
```

实际生效值放在 `app/src/web/.env`、`.env.local`、`.env.production`、`.env.development` 等 Vite 会读取的文件里；`.env.example` 本身不会被 Vite 读取。

### 5. 在业务处消费开关

在需要开关的 feature domain 组件里导入并读取：

```ts
import { getWebProjectConfig } from '@carbonnt-cyacle/web-base'

const enabled = getWebProjectConfig().capabilities.lcaAiCreateAccounting.enabled
```

消费方式推荐把开关收敛到最靠近渲染的位置，一次决定、多处复用。例如 Cyacle 中把 `onCreateModelWithAi` 解析成 `resolvedOnCreateModelWithAi`，工具栏和空态两个入口共用同一个结果，避免只改一半：

```tsx
const resolvedOnCreateModelWithAi = enabled ? onCreateModelWithAi : undefined
```

### 6. 补测试

单测需要先配置好项目能力。可以在测试里调用 `configureWebProjectConfig`，或使用 base 的 `configureTestWebProjectConfig`：

```ts
beforeEach(() => {
  configureWebProjectConfig({
    capabilities: {
      agent: { enabled: true },
      dataRecordMap: { enabled: true },
      languageSwitcher: { enabled: true },
      lcaAiCreateAccounting: { enabled: true },
    },
    routes: { loginPath: '/uic/login' },
    uploadServices: {
      file: {
        publicUploadPath: '/file.FileWeb/FileService/public/upload',
        publicDownloadPath: '/file.FileWeb/FileService/public/download',
        privateUploadPath: '/file.FileWeb/FileService/upload',
        privateDownloadPath: '/file.FileWeb/FileService/download',
      },
      document: {
        uploadPath: '/uic.DocumentWeb/DocumentService/upload',
        downloadPath: '/uic.DocumentWeb/DocumentService/download',
      },
    },
  })
})
```

为开关的关闭场景补一条用例，断言目标入口隐藏、其它入口仍保留。

## 约定与注意事项

- `VITE_*` 变量会打进前端产物并暴露给浏览器，**不要放密钥、Token 等敏感信息**。
- 变量在构建时被替换，修改后需要重新构建；开发模式下改动 `.env` 通常需要重启 dev server。
- 开关只接受 `true` / `false`；不要把“是否显示”的语义塞进一个多值字符串。
- 默认值要在 `readBooleanEnv` 的第三个参数显式给出，未配置时行为可预期。
- base 层只做类型和存取，不要在 base 里写“某个业务开关叫什么名字”的语义；项目级开关名属于 `app` 层。
- 新开关的命名保持 `VITE_APP_<SCOPE>_<BEHAVIOR>_ENABLED` 风格，capability key 用 camelCase（如 `lcaAiCreateAccounting`），三处保持一致：`.env.example`、`project-config.ts`、base 类型。
- 当前 Cyacle 还有两个特殊变量，复用时要区分：
  - `VITE_APP_EDITION`：不是开关，是应用版本选择器，逻辑在 `app/src/web/src/app-edition.ts`。
  - `VITE_APP_REPORT_NEW_ENABLED`：在 `.env.example` 中声明但当前无代码消费，属于占位/待接线状态，复制文档时不要照搬这种“有声明无实现”的项。

## 验证清单

- [ ] `domain/base/src/web`：`pnpm typecheck`
- [ ] 消费开关的领域包：对应单测通过
- [ ] `app/src/web`：`pnpm typecheck`
- [ ] 关闭开关后页面入口隐藏，其余功能不受影响
- [ ] 未配置时按默认值表现

## 完整示例

“AI 创建核算”开关（`VITE_APP_LCA_AI_CREATE_ACCOUNTING_ENABLED`）是这套体系的端到端示例：

1. `.env.example` 声明 `VITE_APP_LCA_AI_CREATE_ACCOUNTING_ENABLED=true`；
2. `project-config.ts` 读取并默认 `true`；
3. base 声明 `lcaAiCreateAccounting` 能力并校验；
4. `accounting` 领域的 `model-list-section.tsx` 读取该能力，关闭时同时隐藏工具栏和空态的“AI 创建核算”按钮；
5. 单测覆盖“关闭后隐藏 AI 入口、保留其它创建入口”。

该开关对 CFP 和 LCA 一起生效。若需要按项目类型区分，可在消费处叠加 `projectType` 判断，而不是再发明一套开关机制。
