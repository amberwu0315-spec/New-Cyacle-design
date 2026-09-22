# Plot Web Verification

先读取目标 package 的 `scripts`，只运行存在且与改动相关的命令。

```bash
# 项目根：需要真实运行时
plot app apply
plot app run

# 目标 domain
cd domain/<domain>/src/<artifact>
pnpm typecheck
pnpm test

# 最终 app
cd app/src/<artifact>
pnpm typecheck
pnpm test
pnpm build
```

改动依赖或 package 配置时，从项目根执行 `plot pnpm install --frozen-lockfile`，确认 catalog、`workspace:*` 与各 app module 的 lockfile 一致。依赖事务只用 `plot pnpm` 的 `install`、`add`、`remove`、`update`（或其别名），其它 pnpm 命令原样透传；不要在 package 内直接 `pnpm add/remove/update`。

| 改动 | 必验 |
| --- | --- |
| Page/UI | 目标路由、loading/error/empty/success/pending、窄屏、键盘、focus、console |
| Route | domain standalone + app Router type、params/search、lazy preload、head 无重复、刷新/返回 |
| Query/mutation | 请求参数、pending/error、成功状态、精确缓存更新 |
| Auth | 无/有效/过期凭据、Unauthorized、网络错误、非法回跳、logout 清理 |
| Dependency/generated | 依赖方向与无环、catalog、`workspace:*`、exports、聚合文件、lockfile 一致 |

表单额外验证 label/error 关联和重复提交；Dialog/Popover/Menu 验证初始焦点、Escape、Tab、Enter/Space 及关闭后的焦点恢复。

无法运行时报告具体命令、原因和未覆盖风险。没有刚运行的证据，不声称通过或可交付。

完成报告只包含：修改范围、关键行为、查看/使用方式、验证命令与结果、剩余风险。
