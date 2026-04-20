#!/bin/sh

set -eu

PROJECT_DIR="/home/simon/Dokumente/Codex-Stuff/EWH"
NPM_BIN="/usr/bin/npm"

cd "$PROJECT_DIR"

if [ ! -x "$NPM_BIN" ]; then
  printf 'npm was not found at %s\n' "$NPM_BIN"
  printf 'Press Enter to close...\n'
  read dummy
  exit 1
fi

printf 'Starting dev server in %s\n\n' "$PROJECT_DIR"
"$NPM_BIN" run dev || {
  status=$?
  printf '\nDev server exited with status %s\n' "$status"
  printf 'Press Enter to close...\n'
  read dummy
  exit "$status"
}
