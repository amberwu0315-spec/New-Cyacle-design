# Cyacle 协作说明

- 本项目的协作说明、注意事项和后续补充默认使用中文记录。
- `cyacle` 是通过 app 壳子运行的 Vine 多 domain 应用，不要把 `domain/*/src/server` 当作可独立运行的应用来编译或测试。
- 构建和测试验证应从壳子入口 `app/src/server` 执行，例如在该目录运行 `go build ./...` 和 `go test ./...`。
- 涉及 workspace 或 module 同步时，从项目根目录运行 `plot app apply`；自定义本地 module 解析也要能适配这个整体应用流程。

## 前端代码开发
开发 `src/web` 下的前端代码的时候一定先阅读 `domain/base/src/web/web.md`，里面有前端代码的姿势和案例说明。
另外每一个前端 src/web 下如果有 README.md，先读一下，里面会包含一些规则说明。

## 前端代码开发说明
开发 `app/src/web`、`domain/*/src/web` 或涉及 React、TypeScript、Vite、路由、Layout、i18n、vRPC、React Query、CSS、Base UI、前端依赖、测试和构建时，必读 `.agent/plot-web-best-practices/SKILL.md`。

## 双 Agent 独立开发模式
当任务要求「双 agent 开发」「开发/测试双 agent」「实现与测试分离」「独立开发模式」或需要 worktree 隔离时，必须使用 `multi-agents-dev-mode` 技能，按其 `prepare-task.sh`（多仓库时用 `REPOS` 指定参与仓库）建 implementation/tests worktree、冻结契约、按固定角色提示词启动两个 Agent；不要自行设计 agent 分工或跳过隔离。如果未找到`multi-agents-dev-mode` 技能，忽略此条。

## 多 Agent 编排任务的硬规则
- 所有 worktree / 任务包 / isolated-root 路径一律使用绝对路径（`prepare-task.sh` 内部会 `cd` 到各参与仓库，相对路径会解析错位，导致 worktree 建错位置）。
- 后台 subagent 启动后等待完成通知，不频繁轮询、不因暂时无产出而过早 `interrupt_agent`；要干预前先 `send_message` 询问卡点，给足读输入与规划时间（约 5~6 分钟才开始落盘属正常）。
- 遇到「无产出 / 失败」先做最小诊断（如最小写文件测试）确认环境是否可写，再决定是环境问题还是 agent 慢，不要靠猜。
- 出问题优先检查：路径是否正确、进程/端口是否残留（如 `7099` 端口被残留 cyacle 进程占用会阻断 testkit）。
