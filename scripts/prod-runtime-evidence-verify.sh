#!/usr/bin/env bash
set -euo pipefail
trap 'echo "prod-runtime-evidence-verify failed at line ${LINENO}" >&2' ERR

EVIDENCE_INPUT="${1:-${EVIDENCE_DIR:-}}"
EXPECTED_MAIN_SHA="${EXPECTED_MAIN_SHA:-}"
EXPECTED_BACKEND_IMAGE_DIGEST="${EXPECTED_BACKEND_IMAGE_DIGEST:-}"
EXPECTED_FRONTEND_IMAGE_DIGEST="${EXPECTED_FRONTEND_IMAGE_DIGEST:-}"
FAIL_RATE_LIMIT="${FAIL_RATE_LIMIT:-0.001}"
DROPPED_ITERATION_LIMIT="${DROPPED_ITERATION_LIMIT:-0}"

fail() {
  echo "[prod-runtime-evidence-verify] ERROR: $*" >&2
  exit 1
}

info() {
  echo "[prod-runtime-evidence-verify] $*"
}

require_file() {
  local label="$1"
  local path="$2"
  if [[ ! -f "${path}" ]]; then
    fail "${label} does not exist: ${path}"
  fi
}

require_log_line() {
  local log_path="$1"
  local label="$2"
  local pattern="$3"
  if ! grep -Eq "${pattern}" "${log_path}"; then
    fail "preflight log is missing ${label}"
  fi
}

find_known_tarball() {
  local dir="$1"
  if [[ -f "${dir}/production-runtime-evidence.tar.gz" ]]; then
    printf '%s\n' "${dir}/production-runtime-evidence.tar.gz"
    return 0
  fi
  if [[ -f "${dir}/current-main-preflight-load-evidence.tgz" ]]; then
    printf '%s\n' "${dir}/current-main-preflight-load-evidence.tgz"
    return 0
  fi
  return 1
}

has_preflight_log() {
  local dir="$1"
  [[ -f "${dir}/prod-runtime-preflight.log" || -f "${dir}/current-main-preflight.log" ]]
}

find_evidence_root() {
  local root="$1"
  if [[ -f "${root}/production-runtime-evidence-manifest.json" || -f "${root}/current-main-evidence-manifest.json" ]]; then
    printf '%s\n' "${root}"
    return 0
  fi

  local manifest_path
  manifest_path="$(
    find "${root}" -maxdepth 3 -type f \
      \( -name production-runtime-evidence-manifest.json -o -name current-main-evidence-manifest.json \) \
      -print | head -n 1
  )"

  if [[ -z "${manifest_path}" ]]; then
    fail "evidence manifest does not exist under: ${root}"
  fi

  dirname "${manifest_path}"
}

if [[ -z "${EVIDENCE_INPUT}" ]]; then
  fail "EVIDENCE_DIR or first argument is required"
fi

WORK_DIR=""
cleanup() {
  if [[ -n "${WORK_DIR}" && -d "${WORK_DIR}" ]]; then
    rm -rf "${WORK_DIR}"
  fi
}
trap cleanup EXIT

EVIDENCE_DIR="${EVIDENCE_INPUT%/}"
if [[ -f "${EVIDENCE_INPUT}" ]]; then
  WORK_DIR="$(mktemp -d)"
  tar -xzf "${EVIDENCE_INPUT}" -C "${WORK_DIR}"
  EVIDENCE_DIR="${WORK_DIR}"
elif [[ -d "${EVIDENCE_DIR}" ]] && ! has_preflight_log "${EVIDENCE_DIR}" && tarball_path="$(find_known_tarball "${EVIDENCE_DIR}")"; then
  WORK_DIR="$(mktemp -d)"
  tar -xzf "${tarball_path}" -C "${WORK_DIR}"
  EVIDENCE_DIR="${WORK_DIR}"
elif [[ ! -d "${EVIDENCE_DIR}" ]]; then
  fail "EVIDENCE_DIR does not exist: ${EVIDENCE_INPUT}"
fi

EVIDENCE_DIR="$(find_evidence_root "${EVIDENCE_DIR}")"

if [[ -f "${EVIDENCE_DIR}/production-runtime-evidence-manifest.json" ]]; then
  EVIDENCE_FORMAT="production-runtime"
  PREFLIGHT_LOG="${EVIDENCE_DIR}/prod-runtime-preflight.log"
  MANIFEST_JSON="${EVIDENCE_DIR}/production-runtime-evidence-manifest.json"
  SUMMARY_MD="${EVIDENCE_DIR}/production-runtime-evidence-summary.md"
elif [[ -f "${EVIDENCE_DIR}/current-main-evidence-manifest.json" ]]; then
  EVIDENCE_FORMAT="current-main"
  PREFLIGHT_LOG="${EVIDENCE_DIR}/current-main-preflight.log"
  MANIFEST_JSON="${EVIDENCE_DIR}/current-main-evidence-manifest.json"
  SUMMARY_MD=""
else
  fail "unsupported evidence manifest format in: ${EVIDENCE_DIR}"
fi

REAL_LOAD_JSON="${EVIDENCE_DIR}/prod-real-load-steps-summary.json"
REAL_LOAD_MD="${EVIDENCE_DIR}/prod-real-load-steps-summary.md"
HLS_SMOKE_JSON=""
if [[ -f "${EVIDENCE_DIR}/hls-smoke-summary.json" ]]; then
  HLS_SMOKE_JSON="${EVIDENCE_DIR}/hls-smoke-summary.json"
fi

require_file "$(basename "${PREFLIGHT_LOG}")" "${PREFLIGHT_LOG}"
require_file "prod-real-load-steps-summary.json" "${REAL_LOAD_JSON}"
require_file "prod-real-load-steps-summary.md" "${REAL_LOAD_MD}"
require_file "$(basename "${MANIFEST_JSON}")" "${MANIFEST_JSON}"
if [[ -n "${SUMMARY_MD}" ]]; then
  require_file "production-runtime-evidence-summary.md" "${SUMMARY_MD}"
fi

require_log_line "${PREFLIGHT_LOG}" "PASS" '\[prod-runtime-preflight\] PASS'
require_log_line "${PREFLIGHT_LOG}" "nginx timing" 'nginx request_time header: available'
require_log_line "${PREFLIGHT_LOG}" "app timing" 'app elapsed header: available'
require_log_line "${PREFLIGHT_LOG}" "gzip public response" 'gzip public response: available'
require_log_line "${PREFLIGHT_LOG}" "public Work list contract" 'public Work list contract: current'
require_log_line "${PREFLIGHT_LOG}" "public Work detail contract" 'public Work detail contract: current'

node - "${MANIFEST_JSON}" "${REAL_LOAD_JSON}" "${EXPECTED_MAIN_SHA}" "${EXPECTED_BACKEND_IMAGE_DIGEST}" "${EXPECTED_FRONTEND_IMAGE_DIGEST}" "${FAIL_RATE_LIMIT}" "${DROPPED_ITERATION_LIMIT}" "${HLS_SMOKE_JSON}" <<'NODE'
const fs = require('node:fs')

const [
  manifestPath,
  realLoadPath,
  expectedMainSha,
  expectedBackendDigest,
  expectedFrontendDigest,
  failRateLimitRaw,
  droppedIterationLimitRaw,
  hlsSmokePath,
] = process.argv.slice(2)

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const realLoad = JSON.parse(fs.readFileSync(realLoadPath, 'utf8'))
const failRateLimit = Number(failRateLimitRaw)
const droppedIterationLimit = Number(droppedIterationLimitRaw)
const allowedNextFocusValues = new Set([
  'increase-rate-or-extend-soak',
  'db-pool-or-resource-pressure',
  'payload-or-network-transfer',
  'app-cpu-or-serialization',
  'measure-more',
])
const nextFocusRecommendedSlices = new Map([
  ['db-pool-or-resource-pressure', 'db-index-optimization'],
  ['payload-or-network-transfer', 'public-detail-serialization-body-optimization'],
  ['app-cpu-or-serialization', 'public-detail-serialization-body-optimization'],
  ['increase-rate-or-extend-soak', 'increase-rate-or-extend-soak'],
  ['measure-more', 'measure-more'],
])

function fail(message) {
  console.error(`[prod-runtime-evidence-verify] ERROR: ${message}`)
  process.exit(1)
}

function requireEqual(label, actual, expected) {
  if (expected && String(actual || '') !== expected) {
    fail(`${label} mismatch: expected ${expected}, got ${actual || 'missing'}`)
  }
}

function valuesFromTargets(targets) {
  return Object.entries(targets || {}).map(([key, value]) => ({
    key,
    path: String(value?.path || ''),
  }))
}

function isBackendDirectUrl(value) {
  try {
    const url = new URL(value)
    return /^(backend|localhost|127\.0\.0\.1)$/i.test(url.hostname)
  } catch {
    return false
  }
}

function isPublicDetailTarget(value, kind) {
  const prefix = kind === 'work' ? '/api/public/works/' : '/api/public/blogs/'
  if (String(value || '').startsWith(prefix)) {
    return true
  }

  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !isBackendDirectUrl(value) && url.pathname.startsWith(prefix)
  } catch {
    return false
  }
}

function readOptionalJson(path) {
  if (!path) {
    return null
  }

  return JSON.parse(fs.readFileSync(path, 'utf8'))
}

function isFatalHlsSmokeResult(summary) {
  if (!summary) {
    return false
  }

  const status = String(summary.status ?? summary.result ?? '').toLowerCase()
  const message = String(summary.message ?? summary.error ?? summary.reason ?? '').toLowerCase()

  return summary.fatal === true
    || ['failed', 'failure', 'error'].includes(status)
    || message.includes('failed to process hls')
}

requireEqual('main SHA', manifest.mainSha, expectedMainSha)
const backendDigest = manifest.images?.backendDigest ?? manifest.backendDigest
const frontendDigest = manifest.images?.frontendDigest ?? manifest.frontendDigest
requireEqual('backend image digest', backendDigest, expectedBackendDigest)
requireEqual('frontend image digest', frontendDigest, expectedFrontendDigest)

const manifestHasLegacyPreflightPass = manifest.preflight?.passed === true
const manifestHasCurrentMainPreflightLog = typeof manifest.preflightLog === 'string' && manifest.preflightLog.length > 0
if (!manifestHasLegacyPreflightPass && !manifestHasCurrentMainPreflightLog) {
  fail('manifest must include preflight.passed=true or preflightLog')
}

const manifestBaseUrl = manifest.realLoad?.baseUrl ?? manifest.baseUrl
if (manifestBaseUrl && !String(manifestBaseUrl).match(/^https:\/\//i)) {
  fail('manifest baseUrl must use public HTTPS origin')
}

const manifestListPageSize = manifest.realLoad?.listPageSize ?? manifest.listPageSize
if (manifestListPageSize !== undefined && Number(manifestListPageSize) !== 12) {
  fail('manifest must use listPageSize=12')
}

if (!String(realLoad.baseUrl || '').match(/^https:\/\//i)) {
  fail('real load summary baseUrl must use public HTTPS origin')
}

if (String(realLoad.baseUrl || '').match(/^https?:\/\/(backend|127\.0\.0\.1|localhost)(?::\d+)?/i)) {
  fail('real load summary baseUrl bypasses public nginx origin')
}

if (!Array.isArray(realLoad.steps) || realLoad.steps.length === 0) {
  fail('real load summary has no steps')
}

if (typeof realLoad.nextFocus !== 'string' || realLoad.nextFocus.length === 0) {
  fail('real load summary nextFocus is required')
}

if (!allowedNextFocusValues.has(realLoad.nextFocus)) {
  fail(`real load summary nextFocus is unknown: ${realLoad.nextFocus}`)
}

const hlsSmoke = readOptionalJson(hlsSmokePath)
const recommendedSlice = isFatalHlsSmokeResult(hlsSmoke)
  ? 'hls-fatal-fix'
  : nextFocusRecommendedSlices.get(realLoad.nextFocus)

const summaryListPageSize = Number(realLoad.listPageSize ?? 12)
if (summaryListPageSize !== 12) {
  fail('real load summary must use listPageSize=12')
}

for (const [index, step] of realLoad.steps.entries()) {
  const listPageSize = Number(step.listPageSize ?? realLoad.listPageSize)
  if (listPageSize !== 12) {
    fail(`step ${index + 1} must use listPageSize=12`)
  }

  const targets = valuesFromTargets(step.targets)
  if (targets.length === 0) {
    fail(`step ${index + 1} has no targets`)
  }

  for (const target of targets) {
    if (/seed|fixture/i.test(target.path)) {
      fail(`step ${index + 1} contains seed/fixture target: ${target.path}`)
    }
  }

  const workList = targets.find((target) => target.key === 'work_list')?.path
  const studyList = targets.find((target) => target.key === 'study_list')?.path
  const workRead = targets.find((target) => target.key === 'work_read')?.path
  const studyRead = targets.find((target) => target.key === 'study_read')?.path

  if (workList !== '/api/public/works?page=1&pageSize=12') {
    fail(`step ${index + 1} work_list must be /api/public/works?page=1&pageSize=12`)
  }
  if (studyList !== '/api/public/blogs?page=1&pageSize=12') {
    fail(`step ${index + 1} study_list must be /api/public/blogs?page=1&pageSize=12`)
  }
  if (!isPublicDetailTarget(workRead, 'work')) {
    fail(`step ${index + 1} work_read must be a public Work detail path or HTTPS URL`)
  }
  if (!isPublicDetailTarget(studyRead, 'study')) {
    fail(`step ${index + 1} study_read must be a public Study detail path or HTTPS URL`)
  }

  const failedRate = Number(step.http?.failedRate ?? 0)
  const droppedIterations = Number(step.http?.droppedIterations ?? 0)
  if (failedRate > failRateLimit) {
    fail(`step ${index + 1} failedRate ${failedRate} exceeds ${failRateLimit}`)
  }
  if (droppedIterations > droppedIterationLimit) {
    fail(`step ${index + 1} droppedIterations ${droppedIterations} exceeds ${droppedIterationLimit}`)
  }
}

console.log(`[prod-runtime-evidence-verify] recommendedSlice=${recommendedSlice}`)
NODE

info "evidence: ${EVIDENCE_INPUT}"
info "format: ${EVIDENCE_FORMAT}"
info "main SHA: ${EXPECTED_MAIN_SHA:-not checked}"
info "PASS"
