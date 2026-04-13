#!/usr/bin/env bash
# Stop the KnowKit website editor server started via ./start.sh.

set -euo pipefail

cd "$(dirname "$0")"

PID_FILE="editor.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "No editor.pid found — nothing to stop."
  exit 0
fi

PID=$(cat "$PID_FILE")

if ! kill -0 "$PID" 2>/dev/null; then
  echo "Process $PID is not running. Cleaning up stale PID file."
  rm -f "$PID_FILE"
  exit 0
fi

kill "$PID"

# Wait up to 5s for graceful shutdown
for _ in 1 2 3 4 5; do
  if ! kill -0 "$PID" 2>/dev/null; then break; fi
  sleep 1
done

if kill -0 "$PID" 2>/dev/null; then
  echo "Process $PID did not stop, sending SIGKILL."
  kill -9 "$PID" || true
fi

rm -f "$PID_FILE"
echo "✓ Editor server stopped."
