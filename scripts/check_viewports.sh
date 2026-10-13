#!/bin/sh
# Repeatable viewport check. No package install and no site build.
# Usage: scripts/check_viewports.sh [sweep|full|clicks|all]
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
BASE=${BASE_URL:-http://127.0.0.1:8877}
MODE=${1:-sweep}
exec node "$ROOT/scripts/viewport_audit.mjs" --base "$BASE" --mode "$MODE"
