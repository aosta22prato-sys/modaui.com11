#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/www/wwwroot/modaui.com"
LOG_DIR="$REPO_DIR/logs"
LOG_FILE="$LOG_DIR/git-sync.log"

mkdir -p "$LOG_DIR"
cd "$REPO_DIR"

echo "=== Git auto-sync started: $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOG_FILE"
bash ./scripts/git-sync.sh -m "自动同步更新 $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE" 2>&1
EXIT_CODE=$?
echo "=== Git auto-sync finished: $(date '+%Y-%m-%d %H:%M:%S') status=$EXIT_CODE ===" >> "$LOG_FILE"
exit "$EXIT_CODE"
