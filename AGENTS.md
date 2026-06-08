# Cyacle 协作说明

- 本项目的协作说明、注意事项和后续补充默认使用中文记录。
- `cyacle` 是通过 app 壳子运行的 Vine 多 domain 应用，不要把 `domain/*/src/server` 当作可独立运行的应用来编译或测试。
- 构建和测试验证应从壳子入口 `app/src/server` 执行，例如在该目录运行 `go build ./...` 和 `go test ./...`。
- 涉及 workspace 或 module 同步时，从项目根目录运行 `plot app apply`；自定义本地 module 解析也要能适配这个整体应用流程。
