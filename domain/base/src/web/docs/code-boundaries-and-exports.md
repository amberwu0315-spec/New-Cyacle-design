# 代码边界与导入导出

[← 返回 Web 文档入口](../web.md)

> 职责：界定 app、base 与 feature domain 的代码归属，以及依赖、源码导入和稳定导出的规则。

`app/src/web` 是最终运行入口，也是项目 app 层；这里放最终 router、shell layout、首页/帮助页等 app 级路由、入口配置和应用专属页面。跨 domain 复用的共享组件、共享 lib、基础 layout 和 route helper 放 `domain/base/src/web`；feature domain 的业务页面、局部组件和领域路由放各自 `domain/<domain>/src/web`。

app 级配置优先通过 `app/src/web/src/project-config.ts` 注入到 base 提供的配置入口，domain 侧通过 base helper 消费；不要让 feature domain 反向 import `app/src/web`。

命名规则：`@example-app/*` 是中性示例包名；`@example-app/web-base` 表示共享 Web 包占位，真实项目以 `domain/base/src/web/package.json` 的 `name` 和 `exports` 为准。

## 第三方依赖安装与使用

Web 端新增第三方依赖时，先看消费边界，不强制所有三方包都从 base 转导。能由当前 package 自己声明并直接使用的依赖，就让它留在当前 package；只有 app package 边界、共享抽象或兼容迁移需要 base 承接时，才从 base 暴露入口。

`app/src/web` 是最终 ship module，package 依赖由整体应用流程维护；不要为了新增三方包手动修改 `app/src/web/package.json`。app 层需要三方能力时，优先在 `domain/base/src/web` 封装成项目无关的 helper、hook 或组件，再从 `@example-app/web-base` 引入。

```tsx
// 推荐：app 消费 base 提供的稳定抽象
import { SharedUploader } from '@example-app/web-base'

// 避免：app 直接 import 新三方包后再去改 app/src/web/package.json
import { SharedUploader } from 'some-third-party-package'
```

feature domain 的 `package.json` 可以修改。只服务当前 domain，或领域代码直接使用更自然的三方包，可以安装到该 domain 自己的 web package 并直接 import；不需要为了“统一”再绕到 base。像 `@crew-ui/base` 这类领域已经声明依赖、直接使用语义清晰的包，就保持直接引入。

```bash
cd domain/catalog/src/web
pnpm add @crew-ui/base
```

```tsx
// 可以：domain 自己声明依赖后直接使用
import { DataView } from '@crew-ui/base'
```

多个 domain 都会用到同一个三方包时，也不自动等于要进 base。按意图选择：如果只是各 domain 都直接使用一个稳定三方 API，并且各自 `package.json` 都声明依赖，可以直接引入；如果需要统一项目级默认参数、样式适配、错误处理、上传协议、权限上下文等，再在 base 封装成自己的稳定 API。

裸三方转导是可选的桥接方案，只在这些场景使用：app 不能声明依赖但确实需要三方原始 API；需要临时收敛一个历史上已经从 base 根出口暴露的三方符号；或必须统一一个很窄的三方公共面但暂时不值得封装 wrapper。此时按包拆文件，不建统一大出口。

```ts
// domain/base/src/web/src/lib/external/date-fns.ts
export { formatDistanceToNow } from 'date-fns'
export type { Locale } from 'date-fns'

// app/src/web 或 domain/<domain>/src/web 消费方
import { formatDistanceToNow } from '@example-app/web-base/lib/external/date-fns.ts'
```

`SimplePackageName` 默认取 npm 包名的最后一段：`date-fns` 对应 `date-fns.ts`，`@tanstack/react-query` 对应 `react-query.ts`。如果最后一段过于通用或发生冲突，再加 scope 前缀，例如 `base-ui-react.ts`。每个 external 文件只转导一个第三方包，优先使用具名 export，避免 `export *` 带来的命名冲突和不清晰公共面。

当前 `domain/base/src/web/package.json` 由 `plot app apply` 维护，已稳定保留 `./lib/*` 导出；external 桥接文件放在 `src/lib/external/` 下，不额外手改 package exports。导入时按真实文件路径带后缀，例如 `@example-app/web-base/lib/external/date-fns.ts`；不要写成需要新增 exact export 的 `@example-app/web-base/lib/external/date-fns`。

已经从根 `@example-app/web-base` 暴露过的第三方符号不要直接删除，否则旧 domain 可能找不到导出。先保留根 `src/index.ts` 的兼容 re-export；新代码按上面的消费边界判断是直接依赖、base wrapper，还是 external 桥接，等有明确迁移窗口后再清理旧 import。

涉及 workspace package、module 生成文件或依赖关系同步时，从项目根目录运行 `plot app apply` 后再做构建验证。

## 本领域包源码导入

`#/` 指向当前 app 或当前 domain 的 `src/web/src`，只用于本 app/domain web 包内部源码引用。跨 domain 或跨 package 复用时使用 package exports，例如 `@example-app/web-catalog/pub`。本领域包内跨目录引用优先使用当前 `package.json` 配置的 `imports` 别名 `#/`，避免多层相对路径变形；通过 `#/` 引用源码时路径带 `.ts` / `.tsx` 后缀。

相对路径用于局部强绑定文件：同目录工具、同一个页面目录下拆出的组件、同一个组件目录内的子组件、样式或 schema 等。

```tsx
// 推荐：本 app/domain 包内跨目录引用
import { AuthGuard } from '#/components/guards/auth-guard/auth-guard.tsx'

// 可以：同页面或同组件目录内的邻近文件
import { validateLoginRouteSearch } from './redirect.ts'
```

## 本领域包对外导出

需要给其它 domain 或 app 层复用的组件、hook、i18n helper、业务工具等，先从本 domain 的 `src/pub/index.ts` 显式导出，再由消费方通过 `@example-app/web-xxx/pub` 导入；不要跨 domain 引用对方 `#/`、相对源码路径或 package 根出口里的非稳定能力。

```tsx
// domain/catalog/src/web/src/pub/index.ts
export { ProductNameLink } from '#/features/product/components/product-name-link.tsx'
export type { ProductNameLinkProps } from '#/features/product/components/product-name-link.tsx'

// 消费方
import { ProductNameLink } from '@example-app/web-catalog/pub'

export function InventoryProductCell({ productId }: { productId: string }) {
  return <ProductNameLink productId={productId} />
}
```

`pub` 只内聚稳定能力，不放本领域私有页面状态。新增 pub 依赖前检查依赖方向，避免循环。

app 层消费 feature domain 对外能力时也走 `./pub`，例如顶层 shell 使用 UIC 的登录态守卫时从 `@example-app/web-uic/pub` 导入 `AuthGuard`。

```text
允许：inventory -> catalog/pub
避免：inventory -> catalog/pub -> inventory/pub
```
