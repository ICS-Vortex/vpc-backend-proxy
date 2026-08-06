#!/bin/sh
# Deploy DCS LUA HTTP API (backend-proxy) to development VPS via PM2 release symlink.

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

APP_NAME="${APP_NAME:-dcs-lua-api-dev}"
WORKSPACE_DIR="${WORKSPACE_DIR:-$PROJECT_DIR}"
DEPLOY_ROOT="${DEPLOY_ROOT:-$PROJECT_DIR/.deploy/dev}"
RELEASES_DIR="${RELEASES_DIR:-$DEPLOY_ROOT/releases}"
CURRENT_LINK="${CURRENT_LINK:-$DEPLOY_ROOT/current}"
PM2_ECOSYSTEM_FILE="${PM2_ECOSYSTEM_FILE:-$PROJECT_DIR/ecosystem.dev.config.js}"
BACKEND_PROXY_ENV_FILE="${BACKEND_PROXY_ENV_FILE:-$CURRENT_LINK/.env}"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-$WORKSPACE_DIR/../backend/.env}"
LOGS_DIR="${LOGS_DIR:-$WORKSPACE_DIR/logs}"
BACKEND_PROXY_ENV_SOURCE="${BACKEND_PROXY_ENV_SOURCE:-/etc/virpil/backend-proxy/.env.development}"
RELEASES_TO_KEEP="${RELEASES_TO_KEEP:-3}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
NEW_RELEASE="$RELEASES_DIR/$TIMESTAMP"
PREVIOUS_RELEASE=""

if [ -L "$CURRENT_LINK" ]; then
  PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK")"
fi

mkdir -p "$RELEASES_DIR"
mkdir -p "$NEW_RELEASE"
mkdir -p "$LOGS_DIR"

rsync -a \
  --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude "dist" \
  --exclude "coverage" \
  --exclude ".idea" \
  --exclude ".deploy" \
  "$WORKSPACE_DIR"/ "$NEW_RELEASE"/

cd "$NEW_RELEASE"

if [ -f "$BACKEND_PROXY_ENV_SOURCE" ]; then
  cp "$BACKEND_PROXY_ENV_SOURCE" .env
  chmod 600 .env
fi

npm ci
npm run build
npm prune --omit=dev

ln -sfn "$NEW_RELEASE" "$CURRENT_LINK"

restart_pm2() {
  export WORKSPACE_DIR
  export CURRENT_LINK
  export DEPLOY_ROOT
  export BACKEND_PROXY_ENV_FILE
  export BACKEND_ENV_FILE
  export LOGS_DIR

  if [ -f "$PM2_ECOSYSTEM_FILE" ]; then
    pm2 startOrRestart "$PM2_ECOSYSTEM_FILE" --only "$APP_NAME" --update-env
    return
  fi

  if ! pm2 restart "$APP_NAME" --update-env; then
    echo "PM2 process '$APP_NAME' was not restarted. Provide PM2_ECOSYSTEM_FILE or create the process first." >&2
    return 1
  fi
}

if ! restart_pm2; then
  if [ -n "$PREVIOUS_RELEASE" ] && [ -d "$PREVIOUS_RELEASE" ]; then
    ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_LINK"
    restart_pm2 || true
  fi

  echo "Deployment failed. Previous release restored." >&2
  exit 1
fi

pm2 save

find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d | sort | head -n -"$RELEASES_TO_KEEP" | xargs -r rm -rf
