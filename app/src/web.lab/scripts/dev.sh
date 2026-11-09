#!/usr/bin/env bash
# 起整个应用（server + web + web.lab），并清理 sandbox 环境留下的僵尸运行标记。
#
# 背景：本机沙箱禁止 fork /bin/ps，plot 无法确认"上一个实例是否还活着"，
# 于是每次被强杀后会留下 instance.json 挡住下一次启动。这个脚本先确认端口
# 空闲，再清掉标记。
#
# 用法：bash app/src/web.lab/scripts/dev.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

if lsof -nP -iTCP:7088 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "7088 已被占用，应用可能已经在跑。先停掉再执行本脚本。"
  lsof -nP -iTCP:7088 -sTCP:LISTEN | head -3
  exit 1
fi

if [ -f .plot/run/instance.json ]; then
  echo "清理残留运行标记 .plot/run/instance.json（端口已空闲，实例确认已退出）"
  rm -f .plot/run/instance.json
fi

if [ -x .toolchain/run.sh ]; then
  exec ./.toolchain/run.sh plot app run "$@"
fi

exec plot app run "$@"
