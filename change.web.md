# Web 模板变更说明

## 背景

这次在 Cyacle 中验证新的 web 模板思路：`domain/base` 不再依赖 UIC，也不再承担具体业务域的组装职责；`app/src/web` 作为前端组合根，保留手写编码能力，负责路由树、布局注入、领域能力解析、接口查询和应用级样式覆盖。

目标是后续让 plot 只生成少量稳定入口文件，业务项目可以在 `app/src/web` 中持续演进，而不会被模板反复覆盖。

## 模板边界

### app/src/web

- `app/src/web/src` 不应整体被 `.gitignore` 忽略，只忽略生成文件。
- `main.tsx` 保持 React + TanStack Router 的原生组合写法，不再封装 `mountApp`。
- `main.tsx` 负责创建 `RootRoute`、应用 shell route、注册 domain routes，并导入 `vineStyles.gen.css`。
- 顶层应用页面、应用级 layout wrapper、home page、接口编排和多语言能力解析都放在 `app/src/web`。
- `components/layouts/app-layout` 是应用自己的布局编排层，只做依赖注入和状态编排，不复制 base 的完整 UI。

### domain/base/src/web

- 只提供稳定基础能力：`BaseProviders`、`BaseAppLayout`、基础 UI、session 工具、route manifest 工具、通用 capability 收集工具。
- 不依赖 UIC，不直接调用 `getProfile`、workspace 查询等业务接口。
- `BaseAppLayout` 只接收上层注入的数据和配置，例如 `navConfig`、`profileQuery`、`workspaceQuery`、`onLogout`。
- `root-layout.tsx`、`mount.tsx`、base 内置 home route 等应用级文件应移出 base 或删除。
- `routes` 目录只保留领域注册/路由挂载相关的工厂方法，不再承载应用路由树。

## 生成文件约定

plot 后续只生成这些 web 入口文件：

- `app/src/web/src/vineModules.gen.ts`
  - import 每个 domain 的 `webDomain` manifest。
  - 导出 `webModules`。
- `app/src/web/src/vineStyles.gen.css`
  - 聚合 CSS side-effect imports。
  - 顺序固定为 base globals、domain globals、app globals。

示例：

```ts
import { webDomain as ProjectDataWebModule } from '@carbonnt-cyacle/web-project-data'
import { webDomain as UicWebModule } from '@carbonnt-cyacle/web-uic'

export const webModules = [ProjectDataWebModule, UicWebModule] as const
```

```css
@import "@carbonnt-cyacle/web-base/globals.css";
@import "@carbonnt-cyacle/web-project-data/globals.css";
@import "@carbonnt-cyacle/web-uic/globals.css";
@import "./globals.css";
```

## CSS 链路

- `main.tsx` 只导入 `./vineStyles.gen.css`。
- `vineStyles.gen.css` 保证样式顺序，避免 TS import 顺序和 CSS import 链路交错。
- `app/src/web/src/globals.css` 是应用最终覆盖层，默认包含：

```css
@source "./**/*.{ts,tsx}";

#app {
  isolation: isolate;
  min-height: 100%;
}

body {
  position: relative;
}
```

- `domain/base/src/web/src/styles/globals.css` 不再包含 `#app`、`body` 的应用容器假设，只保留设计系统、reset、主题变量和 Tailwind/shadcn 基础能力。
- app globals 最后导入，负责项目自己的容器策略和主题覆盖。

## Domain Route Builder

领域注册统一为 typed builder，不再兼容旧的 manifest factory：

```ts
export const webDomain = createWebDomain('uic')
  .addRoute('root', createLoginRoute)
  .addRoute('root', createLegalRoute)
  .addRoute('app', createUicRoutes)
  .addCapability('nav', createUicNavCapability())
```

- `addRoute('root', factory)` 挂到 `RootRoute`，适合登录、协议、回调等无应用壳页面。
- `addRoute('app', factory)` 挂到 app shell route，适合需要 `BaseAppLayout` 的业务页面。
- outlet 是显式的类型约束；当前项目使用 `root`、`app` 和 `admin`，新增 outlet 需要同步更新 base 的路由契约和 app 组装。
- `metas` 统一改为 `capabilities`，base 只提供泛型承载和收集能力，不限定业务语义。
- `nav` 是 Cyacle 这类项目的能力约定，推荐由 app 层或项目级 web layer 解析并消费；模板 base 不应把 `nav` 作为领域注册的固定语义。

## App Layout 注入

当前验证后的推荐写法：

- app 层 `components/layouts/app-layout` 依赖 UIC。
- 使用共享 query client 相关 hook 查询 profile、workspace。
- 根据 `webModules` 的 capabilities 和当前 language 生成 `navConfig`。
- 将 `hasSessionCredential`、`profileQuery`、`workspaceQuery`、`navConfig`、`onLogout` 传给 `BaseAppLayout`。
- base 的 `BaseAppLayout` 只渲染布局和通用交互，不知道 UIC 的接口和路由细节。

## TypeScript 配置结论

- 不应在模板中加入 `baseUrl`；它不是现代 bundler mode 下的必要配置，也容易把普通依赖解析伪装成路径别名体系。
- `ignoreDeprecations` 不应作为模板默认配置，用它压掉配置问题会降低未来升级可见性。
- 当前 Cyacle 保留了最小 `paths`，仅用于让直接消费 TypeScript 源码的 workspace 包共享同一份 React ambient types：

```json
"paths": {
  "react": ["./node_modules/@types/react"],
  "react/jsx-runtime": ["./node_modules/@types/react/jsx-runtime"],
  "react/jsx-dev-runtime": ["./node_modules/@types/react/jsx-dev-runtime"]
}
```

这个 `paths` 是过渡约束，不是理想终态。它出现的原因是 domain package 通过 workspace exports 暴露 `.ts/.tsx` 源码，消费方 typecheck 时会把依赖包源码一起编译；在 `sharedWorkspaceLockfile: false` 的 pnpm 拓扑下，每个 web package 都可能解析到自己的 `@types/react`，React 19 的 `ref` 类型因此变成两份互不兼容的类型。

模板的长期解法优先级：

1. domain web package 输出声明产物，消费者 typecheck 不直接编译依赖包源码。
2. 统一 workspace 依赖拓扑，让 React runtime 和 `@types/react` 在 web workspace 内保持单例。
3. 如果短期仍直接消费 TS 源码，可以保留无 `baseUrl` 的最小 `paths`，并明确注释其目的。

## 这次遇到的问题

- base 依赖 UIC 会形成领域反向依赖，导致 base 不再是稳定共享层。
- base 内部承担 app root/layout/router/home，会让生成模板和业务项目手写代码互相覆盖。
- CSS 从 TS side-effect imports 分散导入时，base/domain/app 的覆盖顺序不够稳定，改为 `vineStyles.gen.css` 聚合更清晰。
- 领域注册里的 `metas` 语义太弱，但又容易被误用成固定业务协议；改为 `capabilities` 后，表达上更接近“领域向上层暴露能力”。
- 路由通过 `addRoute(outlet, factory)` 显式声明挂载 outlet，domain route tree 的路径和 params 类型会在 app 组装时保留。
- 直接源码消费 workspace 依赖会放大 React 类型重复问题；这不是业务代码问题，是模板包产物和 workspace 拓扑问题。

## 验证记录

- `plot app run` 已验证 7088 端口入口可访问。
- `http://localhost:7088/` 返回 `200 OK`，未登录时重定向到 `/uic/login?redirect=%2F`。
- 登录页 DOM 非空，控制台无 warn/error，登录方式 tab 可切换。
- 已通过：
  - `domain/base/src/web`: `pnpm typecheck`
  - `domain/uic/src/web`: `pnpm typecheck`
  - `domain/project.data/src/web`: `pnpm typecheck`
  - `app/src/web`: `pnpm typecheck`
  - `app/src/web`: `pnpm build`
