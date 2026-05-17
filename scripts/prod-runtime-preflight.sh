#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

DOCKER_BIN="${DOCKER_BIN:-docker}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
APP_ENV_FILE="${APP_ENV_FILE:-.env.prod}"
BASE_URL="${BASE_URL:-}"
REQUIRE_ADMIN_DIAGNOSTICS="${REQUIRE_ADMIN_DIAGNOSTICS:-0}"
ADMIN_COOKIE_FILE="${ADMIN_COOKIE_FILE:-}"
CURL_INSECURE="${CURL_INSECURE:-0}"
REQUIRE_PUBLIC_WORK_VIDEO_CONTRACT="${REQUIRE_PUBLIC_WORK_VIDEO_CONTRACT:-0}"
WORK_READ_PATH="${WORK_READ_PATH:-}"

compose=("${DOCKER_BIN}" compose --env-file "${APP_ENV_FILE}" -f "${COMPOSE_FILE}")
tmp_dir="$(mktemp -d)"

cleanup() {
  rm -rf "${tmp_dir}"
}
trap cleanup EXIT

fail() {
  echo "[prod-runtime-preflight] FAIL: $*" >&2
  exit 1
}

info() {
  echo "[prod-runtime-preflight] $*"
}

extract_yaml_value() {
  local key="$1"
  awk -v key="${key}" '
    $1 == key ":" {
      $1 = ""
      sub(/^[[:space:]]+/, "")
      gsub(/^"|"$/, "")
      print
      exit
    }
  '
}

extract_env_value() {
  local key="$1"
  awk -F= -v key="${key}" '$1 == key { print substr($0, length(key) + 2); exit }'
}

is_backend_direct_url() {
  local value="$1"
  [[ "${value}" == "http://127.0.0.1:8080"* \
    || "${value}" == "http://localhost:8080"* \
    || "${value}" == "http://backend:8080"* ]]
}

resolve_public_url() {
  local value="$1"
  case "${value}" in
    http://*|https://*) printf '%s' "${value}" ;;
    /*) printf '%s%s' "${BASE_URL%/}" "${value}" ;;
    *) fail "public probe path must be absolute or start with /" ;;
  esac
}

validate_public_work_read_path() {
  local value="$1"
  case "${value}" in
    /api/public/works/*|http://*|https://*) ;;
    *) fail "WORK_READ_PATH must be a public Work detail API path or absolute URL" ;;
  esac
}

header_value() {
  local file="$1"
  local name="$2"
  awk -v name="${name}" '
    BEGIN { IGNORECASE = 1 }
    index($0, name ":") == 1 {
      sub(/^[^:]*:[[:space:]]*/, "")
      gsub(/\r/, "")
      print
      exit
    }
  ' "${file}"
}

request() {
  local label="$1"
  local url="$2"
  local headers_file="$3"
  local body_file="$4"
  shift 4

  local status
  status="$(curl "${curl_base_args[@]}" "$@" -D "${headers_file}" -o "${body_file}" -w "%{http_code}" "${url}")" \
    || fail "${label} request failed"

  if [[ ! "${status}" =~ ^2[0-9][0-9]$ ]]; then
    fail "${label} returned HTTP ${status}"
  fi
}

extract_json_number() {
  local file="$1"
  local key="$2"
  tr -d '\n\r ' < "${file}" \
    | sed -n "s/.*\"${key}\":\\([0-9][0-9.]*\\).*/\\1/p"
}

compact_json() {
  tr -d '\n\r\t ' < "$1"
}

require_json_page_size_12() {
  local label="$1"
  local body_file="$2"
  if ! compact_json "${body_file}" | grep -q '"pageSize":12'; then
    fail "${label} does not report pageSize=12"
  fi
}

reject_json_keys() {
  local label="$1"
  local body_file="$2"
  shift 2
  local compacted
  compacted="$(compact_json "${body_file}")"
  local key
  for key in "$@"; do
    if grep -q "\"${key}\":" <<<"${compacted}"; then
      fail "${label} still exposes stale field: ${key}"
    fi
  done
}

compose_config="$("${compose[@]}" config 2>/dev/null)" \
  || fail "docker compose config failed for ${COMPOSE_FILE}"

configured_load_base_url="$(printf '%s\n' "${compose_config}" | extract_yaml_value "LOAD_TESTING_BASE_URL" | head -n 1)"
if [[ -n "${configured_load_base_url}" ]] && is_backend_direct_url "${configured_load_base_url}"; then
  fail "LOAD_TESTING_BASE_URL resolves to backend-direct; use nginx/public origin instead"
fi

if [[ -z "${BASE_URL}" ]]; then
  BASE_URL="${configured_load_base_url:-https://woonglab.com}"
fi

if [[ -z "${BASE_URL}" ]]; then
  fail "BASE_URL is empty"
fi

if is_backend_direct_url "${BASE_URL}"; then
  fail "BASE_URL is backend-direct; preflight must probe through nginx/public origin"
fi

curl_base_args=(-sS)
if [[ "${CURL_INSECURE}" == "1" || "${BASE_URL}" == https://localhost* || "${BASE_URL}" == https://127.0.0.1* ]]; then
  curl_base_args+=(-k)
fi

running_services="$("${compose[@]}" ps --status running --services 2>/dev/null \
  || "${compose[@]}" ps --services 2>/dev/null \
  || true)"
for service in backend frontend nginx db; do
  if ! grep -qx "${service}" <<<"${running_services}"; then
    fail "required service is not running: ${service}"
  fi
done
info "required services: backend frontend nginx db"

backend_env="$("${compose[@]}" exec -T backend printenv 2>/dev/null || true)"
backend_load_base_url="$(printf '%s\n' "${backend_env}" | extract_env_value "LOAD_TESTING_BASE_URL")"
backend_environment="$(printf '%s\n' "${backend_env}" | extract_env_value "SPRING_PROFILES_ACTIVE")"
postgres_max_pool_size="$(printf '%s\n' "${backend_env}" | extract_env_value "SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE")"
if [[ -z "${postgres_max_pool_size}" ]]; then
  postgres_max_pool_size="$(printf '%s\n' "${backend_env}" | extract_env_value "POSTGRES_MAX_POOL_SIZE")"
fi

if [[ -z "${backend_load_base_url}" ]]; then
  fail "backend LOAD_TESTING_BASE_URL is not visible in container env"
fi
if is_backend_direct_url "${backend_load_base_url}"; then
  fail "backend LOAD_TESTING_BASE_URL is backend-direct; load tests would bypass nginx timing"
fi
if [[ "${backend_environment}" != "prod" ]]; then
  fail "backend SPRING_PROFILES_ACTIVE is ${backend_environment:-unavailable}, expected prod"
fi

info "LOAD_TESTING_BASE_URL=${backend_load_base_url}"
info "SPRING_PROFILES_ACTIVE=${backend_environment}"
if [[ -n "${postgres_max_pool_size}" ]]; then
  info "SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=${postgres_max_pool_size}"
fi

resource_report="$("${compose[@]}" exec -T backend sh -lc '
processor_count="$(getconf _NPROCESSORS_ONLN 2>/dev/null || nproc 2>/dev/null || echo unavailable)"
memory_max="$(cat /sys/fs/cgroup/memory.max 2>/dev/null || cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null || echo unavailable)"
cpu_max="$(cat /sys/fs/cgroup/cpu.max 2>/dev/null || echo unavailable)"
printf "processor_count=%s\n" "${processor_count}"
printf "memory_max=%s\n" "${memory_max}"
printf "cpu_max=%s\n" "${cpu_max}"
' 2>/dev/null || true)"

processor_count="$(printf '%s\n' "${resource_report}" | extract_env_value "processor_count")"
memory_max="$(printf '%s\n' "${resource_report}" | extract_env_value "memory_max")"
if [[ -z "${processor_count}" || "${processor_count}" == "unavailable" ]]; then
  fail "backend processor count is unavailable from inside the container"
fi
if [[ -z "${memory_max}" || "${memory_max}" == "unavailable" ]]; then
  fail "backend memory cgroup limit is unavailable from inside the container"
fi
printf '%s\n' "${resource_report}" | while IFS= read -r line; do
  [[ -n "${line}" ]] && info "${line}"
done

health_headers="${tmp_dir}/health.headers"
health_body="${tmp_dir}/health.body"
public_headers="${tmp_dir}/public.headers"
public_body="${tmp_dir}/public.body"

request "health" "${BASE_URL%/}/api/health" "${health_headers}" "${health_body}"
request "public works gzip" "${BASE_URL%/}/api/public/works?page=1&pageSize=12" "${public_headers}" "${public_body}" -H "Accept-Encoding: gzip"

app_elapsed="$(header_value "${public_headers}" "X-App-Elapsed-Ms")"
nginx_request_time="$(header_value "${public_headers}" "X-Nginx-Request-Time")"
nginx_upstream_time="$(header_value "${public_headers}" "X-Nginx-Upstream-Time")"
gzip_encoding="$(header_value "${public_headers}" "Content-Encoding")"

if [[ -z "${app_elapsed}" ]]; then
  app_elapsed="$(header_value "${health_headers}" "X-App-Elapsed-Ms")"
fi
if [[ -z "${nginx_request_time}" ]]; then
  fail "X-Nginx-Request-Time header is missing; traffic may bypass nginx or nginx config is stale"
fi
if [[ -z "${app_elapsed}" ]]; then
  fail "X-App-Elapsed-Ms header is missing; app timing middleware may be stale"
fi
if [[ "${gzip_encoding,,}" != "gzip" ]]; then
  fail "gzip response compression is missing for public JSON"
fi

info "nginx request_time header: available (${nginx_request_time})"
if [[ -n "${nginx_upstream_time}" && "${nginx_upstream_time}" != "-" ]]; then
  info "nginx upstream header: available (${nginx_upstream_time})"
else
  info "nginx upstream header: unavailable; k6 runner fallback may be used"
fi
info "app elapsed header: available (${app_elapsed})"
info "gzip public response: available"

require_json_page_size_12 "public Work list" "${public_body}"
reject_json_keys "public Work list" "${public_body}" iconUrl period contentJson originalFileName fileSize createdAt
info "public Work list contract: current"

if [[ "${REQUIRE_PUBLIC_WORK_VIDEO_CONTRACT}" == "1" ]]; then
  if [[ -z "${WORK_READ_PATH}" ]]; then
    fail "REQUIRE_PUBLIC_WORK_VIDEO_CONTRACT=1 requires WORK_READ_PATH with a real public Work detail that has at least one video"
  fi

  validate_public_work_read_path "${WORK_READ_PATH}"
  work_contract_headers="${tmp_dir}/work-contract.headers"
  work_contract_body="${tmp_dir}/work-contract.body"
  request "public Work detail contract" \
    "$(resolve_public_url "${WORK_READ_PATH}")" \
    "${work_contract_headers}" \
    "${work_contract_body}"

  if ! grep -Eq '"videos"[[:space:]]*:[[:space:]]*\[[[:space:]]*\{' "${work_contract_body}"; then
    fail "public Work video contract verification requires a Work detail response with at least one video"
  fi

  if grep -Eq '"(originalFileName|fileSize|createdAt|iconUrl)"[[:space:]]*:' "${work_contract_body}"; then
    fail "public Work payload still exposes stale hidden/admin-only fields; deploy the current runtime before load testing"
  fi

  info "public Work detail contract: current"
else
  info "public Work detail contract: skipped (set REQUIRE_PUBLIC_WORK_VIDEO_CONTRACT=1 with WORK_READ_PATH to require stale-runtime detection)"
fi

if [[ "${REQUIRE_ADMIN_DIAGNOSTICS}" == "1" ]]; then
  if [[ -z "${ADMIN_COOKIE_FILE}" || ! -f "${ADMIN_COOKIE_FILE}" ]]; then
    fail "REQUIRE_ADMIN_DIAGNOSTICS=1 requires ADMIN_COOKIE_FILE with an authenticated admin session"
  fi

  diagnostics_headers="${tmp_dir}/diagnostics.headers"
  diagnostics_body="${tmp_dir}/diagnostics.body"
  request "admin diagnostics" \
    "${BASE_URL%/}/api/admin/load-test/diagnostics" \
    "${diagnostics_headers}" \
    "${diagnostics_body}" \
    -b "${ADMIN_COOKIE_FILE}"

  command_samples="$(extract_json_number "${diagnostics_body}" "sampleCount" | head -n 1)"
  diagnostics_pool_size="$(extract_json_number "${diagnostics_body}" "npgsqlMaximumPoolSize" | head -n 1)"
  if [[ -z "${command_samples}" || "${command_samples}" == "0" ]]; then
    fail "admin diagnostics did not expose DB command latency samples after public traffic"
  fi

  info "db command samples: ${command_samples}"
  if [[ -n "${diagnostics_pool_size}" ]]; then
    info "npgsql max pool: ${diagnostics_pool_size}"
  fi
else
  info "admin diagnostics: skipped (set REQUIRE_ADMIN_DIAGNOSTICS=1 with ADMIN_COOKIE_FILE to require DB sample verification)"
fi

info "PASS"
