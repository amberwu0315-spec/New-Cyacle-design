---
name: plot-web-best-practices
description: >
  当任务会实现、修改、审查或排障 Web 前端手写代码或其 package 配置时触发：
  app/src/<artifact>（含 <artifact>.<subartifact> 等其它 Web 入口）、
  domain/*/src/<artifact> 中的 TS/TSX/CSS、route/layout、组件、query/auth/i18n、
  Base UI/shadcn、依赖、package exports 或前端验证；包括 build/modify/review/debug
  等任务。仅服务端或数据库变更、纯视觉设计说明、Plot 初始化/工作区编排，或手改
  generated 文件不触发。
---

# Plot Web Best Practices

| Topic | 读取时机 |
| --- | --- |
| [routing-and-layout.md](topics/routing-and-layout.md) | route、router、outlet、layout、RootError、title/meta |
| [packages-and-generated.md](topics/packages-and-generated.md) | package、imports/exports、依赖方向、generated 聚合 |
| [component-architecture.md](topics/component-architecture.md) | 组件拆分、目录内聚、组合 API、Base 复用、feature 结构 |
| [data-and-auth.md](topics/data-and-auth.md) | vRPC、React Query、表单 mutation、认证与登录态 |
| [i18n.md](topics/i18n.md) | 目标项目已有 i18n，或用户明确需要多语言 / i18n |
| [base-ui-and-shadcn.md](topics/base-ui-and-shadcn.md) | Base UI、浮层、detached trigger、shadcn 新增或升级 |
| [react-performance.md](topics/react-performance.md) | React 渲染、加载或性能优化 |
| [styling.md](topics/styling.md) | Tailwind、CSS Module、token、响应式样式 |
| [verification.md](topics/verification.md) | typecheck、test、build、浏览器验收与交付证据 |

无明确主题时，新增页面、组件或修复 Web bug 至少读取 `component-architecture.md` 和 `verification.md`。
