#!/bin/sh
# =============================================================================
# AssemblyOps Backend Entrypoint
# =============================================================================
#
# Applies pending Prisma migrations, then starts the API server.
#
# A failed migration aborts startup. Railway marks the deploy failed and keeps
# the previous deployment serving, so the API never boots against a schema that
# does not match the deployed code.
#
# =============================================================================

set -e

echo "Running database migrations..."
npx prisma migrate deploy
echo "Migrations complete."

echo "Starting server..."
exec node dist/server.js
