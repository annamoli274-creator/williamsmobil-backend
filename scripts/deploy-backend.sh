#!/usr/bin/env bash
set -euo pipefail

# Deploy backend to Railway using RAILWAY_TOKEN env var.
# Do NOT hardcode tokens. Export RAILWAY_TOKEN in your environment or CI secrets.

if [ -z "${RAILWAY_TOKEN-}" ]; then
  echo "RAILWAY_TOKEN is not set. Export it and re-run." >&2
  exit 1
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "Railway CLI not installed. Installing..."
  npm install -g @railway/cli || npm install -g railway || true
fi

# Attempt login and deploy
railway login --apiKey "$RAILWAY_TOKEN" || true
railway up --yes || true
