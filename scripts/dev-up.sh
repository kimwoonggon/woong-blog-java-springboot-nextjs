#!/usr/bin/env bash
set -euo pipefail

DOCKER_BIN="${DOCKER_BIN:-docker}"
if ! command -v "${DOCKER_BIN}" >/dev/null 2>&1; then
  DOCKER_BIN="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
fi

APP_ENV_FILE="${APP_ENV_FILE:-.env}"
if [[ ! -f "${APP_ENV_FILE}" && -f .env.example ]]; then
  cp .env.example "${APP_ENV_FILE}"
fi

if [[ -z "${CODEX_HOME_DIR:-}" ]]; then
  if [[ -n "${HOME:-}" ]]; then
    CODEX_HOME_DIR="${HOME}/.codex"
  else
    SHELL_HOME="$(getent passwd "$(id -u)" | cut -d: -f6)"
    CODEX_HOME_DIR="${SHELL_HOME}/.codex"
  fi
fi

export CODEX_HOME_DIR
case "${CODEX_HOME_DIR}" in
  /*) ;;
  *)
    echo "CODEX_HOME_DIR must be an absolute path: ${CODEX_HOME_DIR}" >&2
    exit 1
    ;;
esac
if [[ -e "${CODEX_HOME_DIR}" && ! -d "${CODEX_HOME_DIR}" ]]; then
  echo "CODEX_HOME_DIR must be a directory: ${CODEX_HOME_DIR}" >&2
  exit 1
fi
mkdir -p "${CODEX_HOME_DIR}/plugins/cache" "${CODEX_HOME_DIR}/.tmp/plugins"
readlink -f "${CODEX_HOME_DIR}/plugins/cache" >/dev/null
readlink -f "${CODEX_HOME_DIR}/.tmp/plugins" >/dev/null

COMPOSE_ENV_FILE="$(mktemp)"
cp "${APP_ENV_FILE}" "${COMPOSE_ENV_FILE}"
if ! grep -q '^CODEX_HOME_DIR=' "${COMPOSE_ENV_FILE}"; then
  printf '\nCODEX_HOME_DIR=%s\n' "${CODEX_HOME_DIR}" >> "${COMPOSE_ENV_FILE}"
fi

cleanup() {
  rm -f "${COMPOSE_ENV_FILE}"
}
trap cleanup EXIT

if [[ -z "${POSTGRES_DATA_DIR:-}" ]]; then
  if [[ "$(pwd)" == /mnt/* ]]; then
    POSTGRES_DATA_DIR="${HOME}/.woong-blog-docker/dev/postgres"
  else
    POSTGRES_DATA_DIR="./.docker-data/dev/postgres"
  fi
fi
mkdir -p "${POSTGRES_DATA_DIR}"
export POSTGRES_DATA_DIR

backend_bind_host="${BACKEND_BIND_HOST:-127.0.0.1}"
backend_publish_port="${BACKEND_PUBLISH_PORT:-8080}"

compose_backend_running="$("${DOCKER_BIN}" compose -f docker-compose.dev.yml ps --status running --services 2>/dev/null | grep -Fx 'backend' || true)"
if [[ -z "${compose_backend_running}" && "${backend_bind_host}" == "127.0.0.1" ]]; then
  if command -v powershell.exe >/dev/null 2>&1; then
    if powershell.exe -NoProfile -Command "\$port = ${backend_publish_port}; if (Get-NetTCPConnection -LocalPort \$port -State Listen -ErrorAction SilentlyContinue) { exit 0 } exit 1" >/dev/null 2>&1; then
      cat >&2 <<EOF
Backend port ${backend_bind_host}:${backend_publish_port} is already listening on the Windows side.
Docker Desktop cannot publish the backend until that listener is removed or a different BACKEND_PUBLISH_PORT is selected.

Diagnostics:
  powershell.exe -NoProfile -Command "Get-NetTCPConnection -LocalPort ${backend_publish_port} -State Listen"
  powershell.exe -NoProfile -Command "netsh interface portproxy show all"

If the listener is a stale Windows portproxy, remove it from an elevated PowerShell:
  netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=${backend_publish_port}

Temporary local workaround:
  BACKEND_PUBLISH_PORT=18080 ./scripts/dev-up.sh
EOF
      exit 1
    fi
  elif ss -ltn "sport = :${backend_publish_port}" | grep -q LISTEN; then
    echo "Backend port ${backend_bind_host}:${backend_publish_port} is already listening. Stop that process or set BACKEND_PUBLISH_PORT." >&2
    exit 1
  fi
fi

NGINX_DEFAULT_CONF="${NGINX_DEFAULT_CONF:-./nginx/local-https.conf}" \
NGINX_BIND_HOST="${NGINX_BIND_HOST:-127.0.0.1}" \
NGINX_HTTP_PORT="${NGINX_HTTP_PORT:-3000}" \
NGINX_HTTPS_PORT="${NGINX_HTTPS_PORT:-3001}" \
BACKEND_BIND_HOST="${BACKEND_BIND_HOST:-127.0.0.1}" \
APP_ENV_FILE="${APP_ENV_FILE}" \
"${DOCKER_BIN}" compose --env-file "${COMPOSE_ENV_FILE}" -f docker-compose.dev.yml up --build -d db frontend backend nginx
