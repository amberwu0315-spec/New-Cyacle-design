# Plot Web 样式

## 默认写法

Plot Web 组件默认直接在 TSX 中使用 Tailwind：

```tsx
<section className="flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground" />
```

- 颜色、边框和状态优先使用项目已有语义 token，不另建一套局部颜色。
- 可复用 variant 用 `cva()`；条件 class 用 `cn()`。
- 从最窄受支持宽度设计，明确长文本的 wrap/truncate 和容器的 overflow。

## 何时使用 CSS Module

Tailwind 难以清楚表达或必须使用原生 CSS 能力时，才使用 CSS Module，例如：

- 局部 keyframes 和复杂 animation。
- `::before`、`::after` 等伪元素。
- 多层 selector、状态组合或需要覆盖第三方 DOM。
- 与组件强绑定、但写进 `className` 会明显降低可读性的样式。

CSS Module 必须放在使用它的组件旁边，并使用同一业务名称：

```text
chat/
├── chat.tsx
└── chat.module.css
```

```tsx
import { cn } from "@scope/web-base"

import styles from "./chat.module.css"

export function Chat() {
  return <section className={cn("flex min-w-0 flex-col", styles.root)} />
}
```

组件拆成独立目录后，CSS Module 跟随 owner 一起移动；不要集中放到 feature 级 `styles/` 目录，也不要把组件私有 selector 写入 globals。

## 全局样式

- `globals.css` 是包级样式入口和 Tailwind source 声明，不承载页面或组件私有样式。
- `custom.css` 只放确实需要影响整个包的基础规则，例如 body、全局 scrollbar 或全局 selection。
- 主题 token 放项目既有 token 文件；不要在页面或组件里复制 light/dark 色值。
- `src/generated/styles.gen.css` 由 Plot 生成，不能手改。

## DO / NOT

| DO | NOT |
| --- | --- |
| 普通布局和视觉状态优先 Tailwind | 同一组件混出另一套样式体系 |
| CSS Module 与 owner 组件同目录、同名 | 把组件 CSS 集中到远离组件的目录 |
| 局部 selector 留在 `.module.css` | 把页面名、feature 名或组件名写进 globals |
| 使用语义 token、响应式布局和清晰 focus | 硬编码主题色、固定尺寸掩盖溢出或隐藏 focus |
