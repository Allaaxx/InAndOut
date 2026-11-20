#!/bin/sh
set -e

echo "Applying database migrations..."
node_modules/.bin/prisma migrate deploy

echo "Starting API..."
exec node --import tsx src/server/main/server.ts
