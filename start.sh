#!/usr/bin/env bash
# Start the KnowKit website editor server in the background.
# Logs to editor.log, PID is written to editor.pid.
# Stop with ./stop.sh.

set -euo pipefail

cd "$(dirname "$0")"

PID_FILE="editor.pid"
LOG_FILE="editor.log"
PORT="${PORT:-9101}"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Editor server already running (PID $(cat "$PID_FILE")) on http://localhost:$PORT"
  echo "  Editor:  http://localhost:$PORT/editor.html"
  exit 0
fi

# Stale PID file
[ -f "$PID_FILE" ] && rm -f "$PID_FILE"

nohup python3 editor_server.py --port "$PORT" >"$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

sleep 1

if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "✓ Editor server started (PID $(cat "$PID_FILE"))"
  echo "  Website: http://localhost:$PORT/"
  echo "  Editor:  http://localhost:$PORT/editor.html"
  echo "  Logs:    tail -f $LOG_FILE"
  echo "  Stop:    ./stop.sh"
else
  echo "✗ Failed to start. Check $LOG_FILE for details."
  rm -f "$PID_FILE"
  exit 1
fi
