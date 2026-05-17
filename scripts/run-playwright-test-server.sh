#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_HTTP_PORT="${PLAYWRIGHT_TEST_HTTP_PORT:-3000}"
TEST_HTTPS_PORT="${PLAYWRIGHT_TEST_HTTPS_PORT:-3443}"
TEST_BACKEND_PORT="${PLAYWRIGHT_TEST_BACKEND_PORT:-8081}"
BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:${TEST_HTTP_PORT}}"

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 1
fi

cleanup() {
  cd "${ROOT_DIR}"
  docker compose down --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

cd "${ROOT_DIR}"
export NGINX_HTTP_PORT="${TEST_HTTP_PORT}"
export NGINX_HTTPS_PORT="${TEST_HTTPS_PORT}"
export BACKEND_HOST_PORT="${TEST_BACKEND_PORT}"
export NGINX_BIND_HOST="${NGINX_BIND_HOST:-127.0.0.1}"
export BACKEND_BIND_HOST="${BACKEND_BIND_HOST:-127.0.0.1}"
export NGINX_DEFAULT_CONF="${NGINX_DEFAULT_CONF:-./nginx/default.conf}"
docker compose up --build -d db backend frontend nginx

for _ in $(seq 1 120); do
  if curl -fsS "${BASE_URL}/login" >/dev/null 2>&1 && curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
    break
  fi

  sleep 2
done

if ! curl -fsS "${BASE_URL}/login" >/dev/null 2>&1 || ! curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
  echo "Playwright test server did not become ready at ${BASE_URL} within 240 seconds." >&2
  exit 1
fi

PLAYWRIGHT_EXTERNAL_SERVER="${PLAYWRIGHT_EXTERNAL_SERVER:-1}" \
PLAYWRIGHT_BASE_URL="${BASE_URL}" \
  "$@"
