#!/bin/sh
cat <<'BANNER'

  ╔══════════════════════════════════════════════════════════════╗
  ║              Retold Todo List Example                       ║
  ╚══════════════════════════════════════════════════════════════╝

  COMMANDS
  ────────────────────────────────────────────────────────────────
  Start the API server (also serves the web client):
    node server/server.cjs

  Once the server is running (in the background or another shell):

  CLI client:
    cd /app/cli-client && npx todo list              List all tasks
    cd /app/cli-client && npx todo list --search gym  Search tasks
    cd /app/cli-client && npx todo add "New task"     Add a task
    cd /app/cli-client && npx todo complete 42        Complete a task
    cd /app/cli-client && npx todo remove 42          Remove a task
    cd /app/cli-client && npx todo --help             Full CLI help

  Console TUI (interactive terminal UI):
    node console-client/console-client.cjs

  Web client:
    Open http://localhost:8086 in your browser

  TIPS
  ────────────────────────────────────────────────────────────────
  Start the server in the background:
    node server/server.cjs &

  Then use the CLI or console client from this same shell.

BANNER
