# Web 端代码姿势与案例

本入口只维护 Web 文档的阅读顺序和职责边界。示例里的包名、domain 名、route path 和 skel service 名都是占位，实际开发以当前项目检测结果、`package.json`、生成文件和现有代码为准。

## 阅读方式

1. 开发 `src/web` 前先阅读本入口。
2. 再阅读目标 app/domain 的 `src/web/README.md`（如果存在）。
3. 按任务范围进入下面对应的叶子文档；跨职责改动需要同时阅读相关分支。

## 文档树

- [本地开发与验证](docs/development-and-validation.md)
- Web 架构
  - [代码边界与导入导出](docs/code-boundaries-and-exports.md)
  - [路由与 Layout](docs/routing-and-layout.md)
  - [Feature 组织](docs/feature-organization.md)
- Web 开发约定
  - [Domain 多语言](docs/domain-i18n.md)
  - [业务展示、列表与选择弹框](docs/business-display-and-selection.md)
  - [React 组件写法](docs/react-components.md)
- Web 数据与构建
  - [接口调用与 QueryKey](docs/api-and-query-key.md)
  - [生成聚合文件与 CSS 链路](docs/generated-files-and-css.md)

## 职责速查

| 要解决的问题 | 负责文档 |
| --- | --- |
| 从哪个地址联调、使用什么开发账号 | [本地开发与验证](docs/development-and-validation.md) |
| 代码属于 app、base 还是 feature domain，依赖和导出怎么处理 | [代码边界与导入导出](docs/code-boundaries-and-exports.md) |
| route 挂在哪个 outlet、页面如何懒加载、Layout 如何分层 | [路由与 Layout](docs/routing-and-layout.md) |
| 页面、hook、query、组件和 dialog 如何拆分 | [Feature 组织](docs/feature-organization.md) |
| Domain 文案目录和多语言 API 如何组织 | [Domain 多语言](docs/domain-i18n.md) |
| 空名称如何展示、列表工具栏如何布局、选择弹框和枚举候选项如何交互 | [业务展示、列表与选择弹框](docs/business-display-and-selection.md) |
| JSX 回调、Dialog 弹框布局和 detached trigger 浮层如何写 | [React 组件写法](docs/react-components.md) |
| API hook、QueryKey 和缓存失效如何组织 | [接口调用与 QueryKey](docs/api-and-query-key.md) |
| 哪些聚合文件由 Plot 生成、CSS 如何进入最终应用 | [生成聚合文件与 CSS 链路](docs/generated-files-and-css.md) |
