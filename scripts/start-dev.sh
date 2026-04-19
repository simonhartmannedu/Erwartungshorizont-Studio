#!/bin/sh

set -eu

NPM_BIN="/usr/bin/npm"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

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
