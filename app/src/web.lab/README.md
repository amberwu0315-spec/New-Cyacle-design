# web.lab — 设计探索入口

与正式版并排运行的第二个 Web 入口：同一个 server、同一份数据，挂在 `/lab`。

- 怎么用、规则、已知坑：[`docs/lab/工作室说明.md`](../../../docs/lab/工作室说明.md)
- 想改的东西在哪、会波及什么：[`docs/lab/探索地图.md`](../../../docs/lab/探索地图.md)
- 分支/同步/合并策略：[`docs/lab/工作流.md`](../../../docs/lab/工作流.md)

快速开始：

```bash
bash app/src/web.lab/scripts/dev.sh     # 起应用，打开 http://127.0.0.1:7088/lab
node app/src/web.lab/scripts/shot.mjs   # 三档截图
bash app/src/web.lab/scripts/reset.sh   # 回到 parity
```

> `src/generated/` 由 `plot app apply` 生成，不入库；`src/lab-modules.ts` 由
> `node app/src/web.lab/scripts/sync-modules.mjs` 同步。
