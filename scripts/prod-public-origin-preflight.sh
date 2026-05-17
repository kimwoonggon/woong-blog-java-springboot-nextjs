#!/usr/bin/env bash
set -euo pipefail
trap 'echo "prod-public-origin-preflight failed at line ${LINENO}" >&2' ERR

CURL_BIN="${CURL_BIN:-curl}"
BASE_URL="${BASE_URL:-https://woonglab.com}"
WORK_READ_PATH="${WORK_READ_PATH:-}"
STUDY_READ_PATH="${STUDY_READ_PATH:-}"
LIST_PAGE_SIZE="${LIST_PAGE_SIZE:-12}"
CURL_INSECURE="${CURL_INSECURE:-0}"
OUTPUT_DIR="${OUTPUT_DIR:-}"

tmp_dir="$(mktemp -d)"
persist_raw_evidence() {
  if [[ -n "${OUTPUT_DIR}" && -d "${tmp_dir}" ]]; then
    mkdir -p "${OUTPUT_DIR}" 2>/dev/null || return 0
    find "${tmp_dir}" -maxdepth 1 -type f -exec cp {} "${OUTPUT_DIR}/" \; 2>/dev/null || true
  fi
}

cleanup() {
  persist_raw_evidence
  rm -rf "${tmp_dir}"
}
trap cleanup EXIT

info() {
  printf '[prod-public-origin-preflight] %s\n' "$*"
}

fail() {
  printf '[prod-public-origin-preflight] FAIL: %s\n' "$*" >&2
  exit 1
}

require_positive_int() {
  local name="$1"
  local value="$2"
  if ! [[ "${value}" =~ ^[0-9]+$ ]] || [[ "${value}" -le 0 ]]; then
    fail "${name} must be a positive integer"
  fi
}

normalize_base_url() {
  local value="$1"
  case "${value}" in
    http://*|https://*) printf '%s' "${value%/}" ;;
    *) fail "BASE_URL must start with http:// or https://" ;;
  esac
}

resolve_public_url() {
  local value="$1"
  case "${value}" in
    http://*|https://*) printf '%s' "${value}" ;;
    /*) printf '%s%s' "${BASE_URL}" "${value}" ;;
    *) fail "public target path must be absolute or start with /" ;;
  esac
}

validate_public_read_path() {
  local name="$1"
  local value="$2"
  local expected_prefix="$3"
  if [[ -z "${value}" ]]; then
    fail "WORK_READ_PATH and STUDY_READ_PATH are required"
  fi

  case "${value}" in
    "${expected_prefix}"*) ;;
    http://*|https://*)
      if [[ "${value}" != *"${expected_prefix}"* ]]; then
        fail "${name} must target ${expected_prefix}"
      fi
      ;;
    *) fail "${name} must start with ${expected_prefix} or use an absolute URL targeting that path" ;;
  esac
}

reject_seed_or_fixture_read_path() {
  local name="$1"
  local value="$2"
  local lowered="${value,,}"
  case "${lowered}" in
    *seed*|*fixture*) fail "${name} must be a real public target, not seed/fixture: ${value}" ;;
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
  status="$(${CURL_BIN} "${curl_base_args[@]}" "$@" -D "${headers_file}" -o "${body_file}" -w "%{http_code}" "${url}")" \
    || fail "${label} request failed"

  if [[ ! "${status}" =~ ^2[0-9][0-9]$ ]]; then
    fail "${label} returned HTTP ${status}"
  fi
}

require_timing_headers() {
  local label="$1"
  local headers_file="$2"
  local app_elapsed
  local nginx_request_time
  app_elapsed="$(header_value "${headers_file}" "X-App-Elapsed-Ms")"
  nginx_request_time="$(header_value "${headers_file}" "X-Nginx-Request-Time")"

  if [[ -z "${app_elapsed}" ]]; then
    fail "${label} missing X-App-Elapsed-Ms"
  fi
  if [[ -z "${nginx_request_time}" ]]; then
    fail "${label} missing X-Nginx-Request-Time"
  fi
}

require_app_elapsed_header() {
  local label="$1"
  local headers_file="$2"
  local app_elapsed
  app_elapsed="$(header_value "${headers_file}" "X-App-Elapsed-Ms")"

  if [[ -z "${app_elapsed}" ]]; then
    fail "${label} missing X-App-Elapsed-Ms"
  fi
}

require_gzip_header() {
  local label="$1"
  local headers_file="$2"
  local content_encoding
  content_encoding="$(header_value "${headers_file}" "Content-Encoding")"
  if [[ "${content_encoding,,}" != "gzip" ]]; then
    fail "${label} missing gzip Content-Encoding (got: ${content_encoding:-unavailable})"
  fi
}

compact_json() {
  tr -d '\n\r\t ' < "$1"
}

require_json_key() {
  local label="$1"
  local body_file="$2"
  local key="$3"
  if ! compact_json "${body_file}" | grep -q "\"${key}\":"; then
    fail "${label} missing JSON key: ${key}"
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

require_page_size_12() {
  local label="$1"
  local body_file="$2"
  if ! compact_json "${body_file}" | grep -q '"pageSize":12'; then
    fail "${label} does not report pageSize=12"
  fi
}

if ! command -v "${CURL_BIN}" >/dev/null 2>&1; then
  fail "curl executable not found: ${CURL_BIN}"
fi

require_positive_int "LIST_PAGE_SIZE" "${LIST_PAGE_SIZE}"
if [[ "${LIST_PAGE_SIZE}" != "12" ]]; then
  fail "LIST_PAGE_SIZE must remain 12 for realistic public list probes"
fi

BASE_URL="$(normalize_base_url "${BASE_URL}")"
validate_public_read_path "WORK_READ_PATH" "${WORK_READ_PATH}" "/api/public/works/"
validate_public_read_path "STUDY_READ_PATH" "${STUDY_READ_PATH}" "/api/public/blogs/"
reject_seed_or_fixture_read_path "WORK_READ_PATH" "${WORK_READ_PATH}"
reject_seed_or_fixture_read_path "STUDY_READ_PATH" "${STUDY_READ_PATH}"

curl_base_args=(-sS)
if [[ "${CURL_INSECURE}" == "1" || "${BASE_URL}" == https://localhost* || "${BASE_URL}" == https://127.0.0.1* ]]; then
  curl_base_args+=(-k)
fi

health_headers="${tmp_dir}/health.headers"
health_body="${tmp_dir}/health.body"
works_headers="${tmp_dir}/works.headers"
works_body="${tmp_dir}/works.body"
blogs_headers="${tmp_dir}/blogs.headers"
blogs_body="${tmp_dir}/blogs.body"
work_detail_headers="${tmp_dir}/work-detail.headers"
work_detail_body="${tmp_dir}/work-detail.body"
study_detail_headers="${tmp_dir}/study-detail.headers"
study_detail_body="${tmp_dir}/study-detail.body"

request "health" "${BASE_URL}/api/health" "${health_headers}" "${health_body}"
request "public Work list" "${BASE_URL}/api/public/works?page=1&pageSize=12" "${works_headers}" "${works_body}" --compressed -H "Accept-Encoding: gzip"
request "public Study list" "${BASE_URL}/api/public/blogs?page=1&pageSize=12" "${blogs_headers}" "${blogs_body}" --compressed -H "Accept-Encoding: gzip"
request "public Work detail" "$(resolve_public_url "${WORK_READ_PATH}")" "${work_detail_headers}" "${work_detail_body}" --compressed -H "Accept-Encoding: gzip"
request "public Study detail" "$(resolve_public_url "${STUDY_READ_PATH}")" "${study_detail_headers}" "${study_detail_body}" --compressed -H "Accept-Encoding: gzip"

require_app_elapsed_header "health" "${health_headers}"
require_timing_headers "public Work list" "${works_headers}"
require_timing_headers "public Study list" "${blogs_headers}"
require_timing_headers "public Work detail" "${work_detail_headers}"
require_timing_headers "public Study detail" "${study_detail_headers}"
info "nginx request_time header: available"
info "app elapsed header: available"

require_gzip_header "public Work list" "${works_headers}"
require_gzip_header "public Study list" "${blogs_headers}"
require_gzip_header "public Work detail" "${work_detail_headers}"
require_gzip_header "public Study detail" "${study_detail_headers}"
info "gzip public responses: available"

require_page_size_12 "public Work list" "${works_body}"
require_page_size_12 "public Study list" "${blogs_body}"
reject_json_keys "public Work list" "${works_body}" iconUrl period contentJson originalFileName fileSize createdAt
reject_json_keys "public Work detail" "${work_detail_body}" iconUrl contentJson originalFileName fileSize createdAt
require_json_key "public Work detail" "${work_detail_body}" content
require_json_key "public Study detail" "${study_detail_body}" content
reject_json_keys "public Study detail" "${study_detail_body}" contentJson originalFileName fileSize

info "Work list contract: current"
info "Study list contract: current"
info "Work detail contract: current"
info "Study detail contract: current"
info "targets: /api/public/works?page=1&pageSize=12, ${WORK_READ_PATH}, /api/public/blogs?page=1&pageSize=12, ${STUDY_READ_PATH}"

if [[ -n "${OUTPUT_DIR}" ]]; then
  mkdir -p "${OUTPUT_DIR}"
  cp "${health_headers}" "${OUTPUT_DIR}/health.headers.txt"
  cp "${works_headers}" "${OUTPUT_DIR}/public-works.headers.txt"
  cp "${blogs_headers}" "${OUTPUT_DIR}/public-blogs.headers.txt"
  cp "${work_detail_headers}" "${OUTPUT_DIR}/public-work-detail.headers.txt"
  cp "${study_detail_headers}" "${OUTPUT_DIR}/public-study-detail.headers.txt"
  cp "${works_body}" "${OUTPUT_DIR}/public-works.json"
  cp "${blogs_body}" "${OUTPUT_DIR}/public-blogs.json"
  cp "${work_detail_body}" "${OUTPUT_DIR}/public-work-detail.json"
  cp "${study_detail_body}" "${OUTPUT_DIR}/public-study-detail.json"
  info "raw evidence: ${OUTPUT_DIR}"
fi

info "PASS"
