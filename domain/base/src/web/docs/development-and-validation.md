# 本地开发与验证

[← 返回 Web 文档入口](../web.md)

> 职责：说明 Web 本地开发的统一访问入口、验证地址和开发账号。

- 开发测试域名：http://localhost:7088（前后端一体，默认从这个地址检查页面）。
- 浏览器或 Playwright 验证默认访问 `http://localhost:7088`；即使 Vite 输出 `http://localhost:5173`，也不要直接用 5173 检查页面，7088 会代理到 Vite 服务。
- 开发环境测试账号：`dev-01` / `tanheng666!`
