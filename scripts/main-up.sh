#!/usr/bin/env bash
set -euo pipefail

DOCKER_BIN="${DOCKER_BIN:-docker}"
if ! command -v "${DOCKER_BIN}" >/dev/null 2>&1; then
  DOCKER_BIN="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
fi

APP_ENV_FILE="${APP_ENV_FILE:-.env.prod.local}"

if [[ "$(pwd)" == /mnt/* ]]; then
  DEFAULT_POSTGRES_DATA_DIR="${HOME}/.woong-blog-docker/prod/postgres"
else
  DEFAULT_POSTGRES_DATA_DIR="./.docker-data/prod/postgres"
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
if [[ -e "${CODEX_HOME_DIR}" && ! -d "${CODEX_HOME_DIR}" ]]; then
  echo "CODEX_HOME_DIR must be a directory: ${CODEX_HOME_DIR}" >&2
  exit 1
fi
mkdir -p "${CODEX_HOME_DIR}"

COMPOSE_ENV_FILE="$(mktemp)"

if [[ ! -f "${APP_ENV_FILE}" ]]; then
  cat > "${APP_ENV_FILE}" <<'EOF'
FRONTEND_IMAGE=local/woong-blog-frontend:main
BACKEND_IMAGE=local/woong-blog-springboot-backend:main
APP_ENV_FILE=.env.prod.local
NGINX_DEFAULT_CONF=./nginx/prod-bootstrap.conf
NGINX_BIND_HOST=127.0.0.1
NEXT_PUBLIC_SITE_URL=http://localhost
CERTBOT_WWW_DIR=./certbot/www
LETSENCRYPT_DIR=./certbot/conf
POSTGRES_DB=portfolio
POSTGRES_USER=portfolio
POSTGRES_PASSWORD=portfolio
POSTGRES_DATA_DIR=${DEFAULT_POSTGRES_DATA_DIR}
LOAD_TESTING_BASE_URL=http://localhost
APP_AUTH_ENABLED=false
PROXY_KNOWN_NETWORK=172.16.0.0/12
EOF
fi

cp "${APP_ENV_FILE}" "${COMPOSE_ENV_FILE}"
if ! grep -q '^CODEX_HOME_DIR=' "${COMPOSE_ENV_FILE}"; then
  printf '\nCODEX_HOME_DIR=%s\n' "${CODEX_HOME_DIR}" >> "${COMPOSE_ENV_FILE}"
fi

cleanup() {
  rm -f "${COMPOSE_ENV_FILE}"
}
trap cleanup EXIT

mkdir -p certbot/www certbot/conf/live/current
if [[ -z "${POSTGRES_DATA_DIR:-}" ]]; then
  POSTGRES_DATA_DIR="${DEFAULT_POSTGRES_DATA_DIR}"
fi
mkdir -p "${POSTGRES_DATA_DIR}"
export POSTGRES_DATA_DIR
sed -i '/^POSTGRES_DATA_DIR=/d' "${COMPOSE_ENV_FILE}"
printf 'POSTGRES_DATA_DIR=%s\n' "${POSTGRES_DATA_DIR}" >> "${COMPOSE_ENV_FILE}"
"${DOCKER_BIN}" build -f Dockerfile -t local/woong-blog-frontend:main .
"${DOCKER_BIN}" build -f backend/Dockerfile -t local/woong-blog-springboot-backend:main .
"${DOCKER_BIN}" compose --env-file "${COMPOSE_ENV_FILE}" -f docker-compose.prod.yml up -d db frontend backend nginx
