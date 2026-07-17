#!/usr/bin/env bash
#
# railway-dev.sh
#
# Runs a local command against the Railway `development` environment, pulling all
# secrets from Railway so no .env file is needed on disk.
#
# Remaps DATABASE_URL/DIRECT_URL onto the Postgres public TCP proxy — the internal
# host only resolves inside Railway. Pins NODE_ENV=development; the deployed dev
# service runs NODE_ENV=production.
#
# Usage (from /backend):
#   ./scripts/railway-dev.sh tsx watch src/server.ts
#   ./scripts/railway-dev.sh vitest run

set -euo pipefail

exec railway run --environment development --service assemblyops -- \
  sh -c 'exec env \
    NODE_ENV=development \
    DATABASE_URL="$DATABASE_PUBLIC_URL" \
    DIRECT_URL="$DATABASE_PUBLIC_URL" \
    "$@"' _ "$@"
