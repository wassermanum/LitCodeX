#!/usr/bin/env bash
set -euo pipefail

if [ -f package.json ]; then
  export PATH="$(pwd)/node_modules/.bin:$PATH"
fi

if [ -n "${DATABASE_URL:-}" ]; then
  echo "🛠 Running database migrations..."
  npx prisma migrate deploy
  echo "📚 Loading literature catalog..."
  node scripts/loadLiterature.js
else
  echo "⚠️ DATABASE_URL is not set; skipping migrations and catalog import." >&2
fi

exec "$@"
