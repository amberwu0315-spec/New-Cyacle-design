#!/usr/bin/env bash
# 把 lab 的壳恢复到 parity 基线（与正式版逐像素一致的那一刻）。
#
# 只恢复已跟踪文件；你自己的实验目录（如 src/experiments/**）如果没有提交过，
# 不会被删除。要连实验一起清掉：git clean -fd app/src/web.lab/src/experiments
#
# 用法：bash app/src/web.lab/scripts/reset.sh
# 首次使用前需要建立基线标签：
#   git tag lab-parity

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

if ! git rev-parse -q --verify refs/tags/lab-parity >/dev/null; then
  echo "缺少基线标签 lab-parity。"
  echo "先确认当前 lab 壳与正式版一致，然后执行："
  echo "  git tag lab-parity"
  exit 1
fi

git restore --source=lab-parity --worktree -- app/src/web.lab/src

echo "已把 app/src/web.lab/src 恢复到 lab-parity。"
echo "未跟踪的实验文件保持不动。当前改动："
git status --short app/src/web.lab | head -20
