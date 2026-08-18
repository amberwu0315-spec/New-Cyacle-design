# 生成聚合文件与 CSS 链路

[← 返回 Web 文档入口](../web.md)

> 职责：说明 Plot 生成文件的边界、样式聚合顺序和各 package globals 的职责。

`app/src/web/src/vineModules.gen.ts` 和 `app/src/web/src/vineStyles.gen.css` 是 `plot app apply` 自动生成和同步的聚合文件，不手动维护。需要新增、删除或调整 domain 接入时，从项目根目录运行 `plot app apply`，让 app 入口重新聚合 route module 和样式入口。

聚合原理：`vineModules.gen.ts` 汇总最终 app 需要加载的 web domain module；`vineStyles.gen.css` 按最终 domain 列表依次 import base、各 feature domain 和 app 自身的 globals。`app/src/web/src/main.tsx` 只需要 import 生成后的 `#/vineStyles.gen.css`。

```css
/* app/src/web/src/vineStyles.gen.css，plot 生成，不手改 */
@import "@example-app/web-base/globals.css";
@import "@example-app/web-catalog/globals.css";
@import "./globals.css";
```

可以维护的是各包自己的 globals：共享 base globals 承载 Tailwind、shadcn、字体、主题 token 和共享 UI 源码覆盖；业务 domain globals 只覆盖本 domain 源码；最终应用专属的全局补充放 `app/src/web/src/globals.css`。

```css
/* domain/base/src/web/src/styles/globals.css */
@import "tailwindcss";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/geist";

@source "../**/*.{ts,tsx}";
```

```css
/* domain/catalog/src/web/src/styles/globals.css */
@source "../**/*.{ts,tsx}";
```

```css
/* app/src/web/src/globals.css */
/* 这里放最终应用自己的全局补充。 */
```

业务 package 需要导出自己的 globals；如果最终入口没有出现对应 import，不要手改 `vineStyles.gen.css`，优先检查 package export 和 `plot app apply` 同步结果。

```json
{
  "name": "@example-app/web-catalog",
  "exports": {
    ".": "./src/index.ts",
    "./globals.css": "./src/styles/globals.css",
    "./pub": "./src/pub/index.ts"
  }
}
```
