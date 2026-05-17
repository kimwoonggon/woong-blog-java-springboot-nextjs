#!/usr/bin/env bash
set -euo pipefail
trap 'echo "prod-real-load-steps failed at line ${LINENO}" >&2' ERR

K6_BIN="${K6_BIN:-k6}"
CURL_BIN="${CURL_BIN:-curl}"
BASE_URL="${BASE_URL:-https://woonglab.com}"
RATES="${RATES:-200 300 400 500}"
DURATION_SECONDS="${DURATION_SECONDS:-30}"
MAX_VUS="${MAX_VUS:-500}"
PRE_ALLOCATED_VUS="${PRE_ALLOCATED_VUS:-100}"
LIST_PAGE_SIZE="${LIST_PAGE_SIZE:-12}"
WORK_READ_PATH="${WORK_READ_PATH:-}"
STUDY_READ_PATH="${STUDY_READ_PATH:-}"
OUTPUT_DIR="${OUTPUT_DIR:-backend/reports/prod-real-load-steps-$(date -u +%Y%m%dT%H%M%SZ)/loadtest}"
ADMIN_COOKIE_FILE="${ADMIN_COOKIE_FILE:-}"
CURL_INSECURE="${CURL_INSECURE:-0}"
FAIL_RATE_LIMIT="${FAIL_RATE_LIMIT:-0.001}"
P95_LIMIT_MS="${P95_LIMIT_MS:-800}"

info() {
  printf '[prod-real-load-steps] %s\n' "$*"
}

fail() {
  printf '[prod-real-load-steps] ERROR: %s\n' "$*" >&2
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
  local url="$1"
  case "${url}" in
    http://*|https://*) printf '%s' "${url%/}" ;;
    *) fail "BASE_URL must start with http:// or https://" ;;
  esac
}

validate_public_read_path() {
  local name="$1"
  local value="$2"
  if [[ -z "${value}" ]]; then
    fail "WORK_READ_PATH and STUDY_READ_PATH are required; pass real current public read targets instead of relying on seeded defaults"
  fi

  case "${value}" in
    /api/public/works/*|/api/public/blogs/*|http://*|https://*) ;;
    *) fail "${name} must be a public Work/Study API path or absolute URL" ;;
  esac
}

reject_seed_or_fixture_read_path() {
  local name="$1"
  local value="$2"
  local lowered="${value,,}"
  case "${lowered}" in
    *seed*|*fixture*)
      fail "${name} must be a real public target, not seed/fixture: ${value}"
      ;;
  esac
}

require_positive_int "DURATION_SECONDS" "${DURATION_SECONDS}"
require_positive_int "MAX_VUS" "${MAX_VUS}"
require_positive_int "PRE_ALLOCATED_VUS" "${PRE_ALLOCATED_VUS}"
require_positive_int "LIST_PAGE_SIZE" "${LIST_PAGE_SIZE}"

if [[ "${LIST_PAGE_SIZE}" != "12" ]]; then
  fail "LIST_PAGE_SIZE must remain 12 for the realistic public list target"
fi

BASE_URL="$(normalize_base_url "${BASE_URL}")"
validate_public_read_path "WORK_READ_PATH" "${WORK_READ_PATH}"
validate_public_read_path "STUDY_READ_PATH" "${STUDY_READ_PATH}"
reject_seed_or_fixture_read_path "WORK_READ_PATH" "${WORK_READ_PATH}"
reject_seed_or_fixture_read_path "STUDY_READ_PATH" "${STUDY_READ_PATH}"

if ! command -v "${K6_BIN}" >/dev/null 2>&1; then
  fail "k6 executable not found: ${K6_BIN}"
fi

if [[ -n "${ADMIN_COOKIE_FILE}" && ! -f "${ADMIN_COOKIE_FILE}" ]]; then
  fail "ADMIN_COOKIE_FILE does not exist: ${ADMIN_COOKIE_FILE}"
fi

mkdir -p "${OUTPUT_DIR}"
K6_SCRIPT_PATH="${OUTPUT_DIR}/public-api-real-mix-k6.js"
AGGREGATE_JSON="${OUTPUT_DIR}/prod-real-load-steps-summary.json"
AGGREGATE_MD="${OUTPUT_DIR}/prod-real-load-steps-summary.md"

cat > "${K6_SCRIPT_PATH}" <<'K6SCRIPT'
import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const baseUrl = (__ENV.BASE_URL || 'https://woonglab.com').replace(/\/+$/, '');
const rate = Number.parseInt(__ENV.RATE || '200', 10);
const durationSeconds = Number.parseInt(__ENV.DURATION_SECONDS || '30', 10);
const maxVus = Number.parseInt(__ENV.MAX_VUS || '500', 10);
const preAllocatedVUs = Number.parseInt(__ENV.PRE_ALLOCATED_VUS || '100', 10);
const listPageSize = Number.parseInt(__ENV.LIST_PAGE_SIZE || '12', 10);
const workReadPath = __ENV.WORK_READ_PATH;
const studyReadPath = __ENV.STUDY_READ_PATH;
const summaryPath = __ENV.K6_STEP_SUMMARY_PATH || '/tmp/prod-real-load-step-summary.json';
const summaryTrendStats = ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max', 'count'];

const targets = [
  { key: 'work_list', label: 'Work list', path: `/api/public/works?page=1&pageSize=${listPageSize}` },
  { key: 'work_read', label: 'Work read', path: workReadPath },
  { key: 'study_list', label: 'Study list', path: `/api/public/blogs?page=1&pageSize=${listPageSize}` },
  { key: 'study_read', label: 'Study read', path: studyReadPath },
];

const targetMetrics = {};
for (const target of targets) {
  targetMetrics[target.key] = {
    requests: new Counter(`target_${target.key}_requests`),
    failed: new Counter(`target_${target.key}_failed`),
    duration: new Trend(`target_${target.key}_duration`, true),
    responseBytes: new Trend(`target_${target.key}_response_bytes`, true),
    receiving: new Trend(`target_${target.key}_receiving`, true),
    appElapsed: new Trend(`target_${target.key}_app_elapsed`, true),
    nginxRequest: new Trend(`target_${target.key}_nginx_request`, true),
    nginxUpstream: new Trend(`target_${target.key}_nginx_upstream`, true),
  };
}

export const options = {
  summaryTrendStats,
  scenarios: {
    public_api_real_mix: {
      executor: 'constant-arrival-rate',
      rate,
      timeUnit: '1s',
      duration: `${durationSeconds}s`,
      preAllocatedVUs,
      maxVUs: maxVus,
    },
  },
};

export default function runPublicApiRealMix() {
  const target = targets[(__ITER + __VU - 1) % targets.length];
  const metrics = targetMetrics[target.key];
  const response = http.get(appendIdentity(buildUrl(target.path)), {
    tags: { target: target.key },
    headers: { 'Accept-Encoding': 'gzip' },
  });
  const ok = response.status >= 200 && response.status < 500;

  metrics.requests.add(1);
  metrics.duration.add(response.timings.duration);
  metrics.responseBytes.add(resolveResponseBodyBytes(response));
  metrics.receiving.add(response.timings.receiving);
  if (!ok) {
    metrics.failed.add(1);
  }

  recordOptionalHeaderMetric(response, 'X-App-Elapsed-Ms', metrics.appElapsed, 1);
  recordOptionalHeaderMetric(response, 'X-Nginx-Request-Time', metrics.nginxRequest, 1000);
  recordOptionalHeaderMetric(response, ['X-Nginx-Upstream-Response-Time', 'X-Nginx-Upstream-Time'], metrics.nginxUpstream, 1000);
  check(response, { 'status is < 500': () => ok }, { target: target.key });
}

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${baseUrl}${path}`;
}

function appendIdentity(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}__k6Vu=${__VU}&__k6Iter=${__ITER}`;
}

function metricValue(data, name, stat) {
  const metric = data.metrics[name];
  if (!metric) return null;
  const values = metric.values || metric;
  return Object.prototype.hasOwnProperty.call(values, stat) ? values[stat] : null;
}

function targetSummary(data, target) {
  return {
    label: target.label,
    path: target.path,
    requests: metricValue(data, `target_${target.key}_requests`, 'count') || 0,
    failed: metricValue(data, `target_${target.key}_failed`, 'count') || 0,
    p95Ms: metricValue(data, `target_${target.key}_duration`, 'p(95)'),
    p99Ms: metricValue(data, `target_${target.key}_duration`, 'p(99)'),
    responseBytesP95: metricValue(data, `target_${target.key}_response_bytes`, 'p(95)'),
    receiveP95Ms: metricValue(data, `target_${target.key}_receiving`, 'p(95)'),
    appElapsedP95Ms: metricValue(data, `target_${target.key}_app_elapsed`, 'p(95)'),
    nginxRequestP95Ms: metricValue(data, `target_${target.key}_nginx_request`, 'p(95)'),
    nginxUpstreamP95Ms: metricValue(data, `target_${target.key}_nginx_upstream`, 'p(95)'),
  };
}

function maxNullable(values) {
  const numeric = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? Math.max(...numeric) : null;
}

function resolveResponseBodyBytes(response) {
  const headerValue = response.headers['Content-Length'] || response.headers['content-length'];
  const contentLength = Number.parseInt(headerValue || '', 10);
  if (Number.isFinite(contentLength) && contentLength >= 0) {
    return contentLength;
  }

  if (typeof response.body === 'string') {
    return response.body.length;
  }

  if (response.body && Number.isFinite(response.body.byteLength)) {
    return response.body.byteLength;
  }

  return 0;
}

function parseTimingHeader(raw, multiplier) {
  if (!raw) return null;
  const values = String(raw)
    .split(/[,:]/)
    .map((part) => Number.parseFloat(part.trim()))
    .filter((value) => Number.isFinite(value));

  return values.length ? values.reduce((sum, value) => sum + value, 0) * multiplier : null;
}

function recordOptionalHeaderMetric(response, headerNames, trend, multiplier) {
  const names = Array.isArray(headerNames) ? headerNames : [headerNames];
  for (const headerName of names) {
    const value = parseTimingHeader(response.headers[headerName] || response.headers[headerName.toLowerCase()], multiplier);
    if (value !== null) {
      trend.add(value);
      return true;
    }
  }

  return false;
}

export function handleSummary(data) {
  const targetsSummary = Object.fromEntries(targets.map((target) => [target.key, targetSummary(data, target)]));
  const targetValues = Object.values(targetsSummary);
  const summary = {
    rate,
    baseUrl,
    durationSeconds,
    maxVUs: maxVus,
    preAllocatedVUs,
    listPageSize,
    targets: targetsSummary,
    http: {
      requests: metricValue(data, 'http_reqs', 'count') || 0,
      rps: metricValue(data, 'http_reqs', 'rate') || 0,
      failedRate: metricValue(data, 'http_req_failed', 'rate') || 0,
      failedCount: metricValue(data, 'http_req_failed', 'passes') || 0,
      durationP95Ms: metricValue(data, 'http_req_duration', 'p(95)'),
      durationP99Ms: metricValue(data, 'http_req_duration', 'p(99)'),
      durationMaxMs: metricValue(data, 'http_req_duration', 'max'),
      droppedIterations: metricValue(data, 'dropped_iterations', 'count') || 0,
      vusMax: metricValue(data, 'vus_max', 'max'),
    },
    timing: {
      appElapsedP95Ms: maxNullable(targetValues.map((target) => target.appElapsedP95Ms)),
      nginxRequestP95Ms: maxNullable(targetValues.map((target) => target.nginxRequestP95Ms)),
      nginxUpstreamP95Ms: maxNullable(targetValues.map((target) => target.nginxUpstreamP95Ms)),
      responseBytesP95: maxNullable(targetValues.map((target) => target.responseBytesP95)),
      receiveP95Ms: maxNullable(targetValues.map((target) => target.receiveP95Ms)),
    },
  };

  return {
    stdout: JSON.stringify(summary, null, 2) + '\n',
    [summaryPath]: JSON.stringify(summary, null, 2),
  };
}
K6SCRIPT

info "output dir: ${OUTPUT_DIR}"
info "base url: ${BASE_URL}"
info "rates: ${RATES}"
info "targets: /api/public/works?page=1&pageSize=12, ${WORK_READ_PATH}, /api/public/blogs?page=1&pageSize=12, ${STUDY_READ_PATH}"

for rate in ${RATES}; do
  require_positive_int "rate" "${rate}"
  step_summary="${OUTPUT_DIR}/step-${rate}rps-summary.json"
  raw_summary="${OUTPUT_DIR}/step-${rate}rps-k6-raw.json"
  diagnostics_after="${OUTPUT_DIR}/step-${rate}rps-diagnostics-after.json"

  info "running ${rate} rps for ${DURATION_SECONDS}s"
  BASE_URL="${BASE_URL}" \
    RATE="${rate}" \
    DURATION_SECONDS="${DURATION_SECONDS}" \
    MAX_VUS="${MAX_VUS}" \
    PRE_ALLOCATED_VUS="${PRE_ALLOCATED_VUS}" \
    LIST_PAGE_SIZE="${LIST_PAGE_SIZE}" \
    WORK_READ_PATH="${WORK_READ_PATH}" \
    STUDY_READ_PATH="${STUDY_READ_PATH}" \
    K6_STEP_SUMMARY_PATH="${step_summary}" \
    "${K6_BIN}" run --summary-export "${raw_summary}" "${K6_SCRIPT_PATH}" >/dev/null

  [[ -f "${step_summary}" ]] || fail "k6 did not write step summary: ${step_summary}"

  if [[ -n "${ADMIN_COOKIE_FILE}" ]]; then
    curl_args=(-fsS -b "${ADMIN_COOKIE_FILE}" -o "${diagnostics_after}")
    if [[ "${CURL_INSECURE}" == "1" ]]; then
      curl_args=(-k "${curl_args[@]}")
    fi
    "${CURL_BIN}" "${curl_args[@]}" "${BASE_URL}/api/admin/load-test/diagnostics" >/dev/null
  fi
done

node - "${OUTPUT_DIR}" "${BASE_URL}" "${FAIL_RATE_LIMIT}" "${P95_LIMIT_MS}" >"${AGGREGATE_JSON}" <<'NODE'
const fs = require('node:fs')
const path = require('node:path')

const [outputDir, baseUrl, failRateLimitRaw, p95LimitRaw] = process.argv.slice(2)
const failRateLimit = Number(failRateLimitRaw)
const p95LimitMs = Number(p95LimitRaw)

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function maybeReadJson(filePath) {
  return fs.existsSync(filePath) ? readJson(filePath) : null
}

function round(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10) / 10 : null
}

function max(values) {
  const numbers = values.filter((value) => typeof value === 'number' && Number.isFinite(value))
  return numbers.length ? Math.max(...numbers) : null
}

function getTargetValues(step, key) {
  return Object.values(step.targets || {})
    .map((target) => target[key])
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
}

function attachDiagnostics(step) {
  const diagnostics = maybeReadJson(path.join(outputDir, `step-${step.rate}rps-diagnostics-after.json`))
  const database = diagnostics?.database
  const db = database ? {
    commandP95Ms: round(database.commandLatency?.p95Ms),
    commandP99Ms: round(database.commandLatency?.p99Ms),
    commandSampleCount: database.commandLatency?.sampleCount ?? null,
    connectionOpenP95Ms: round(database.connectionOpenLatency?.p95Ms),
    connectionOpenSampleCount: database.connectionOpenLatency?.sampleCount ?? null,
    openConnections: database.postgresConnections?.openConnections ?? null,
    activeConnections: database.postgresConnections?.activeConnections ?? null,
    npgsqlMaximumPoolSize: database.pool?.npgsqlMaximumPoolSize ?? null,
  } : null

  return {
    ...step,
    http: {
      ...step.http,
      failedRate: round(step.http?.failedRate ?? 0),
      durationP95Ms: round(step.http?.durationP95Ms),
      durationP99Ms: round(step.http?.durationP99Ms),
      durationMaxMs: round(step.http?.durationMaxMs),
    },
    timing: {
      ...step.timing,
      appElapsedP95Ms: round(step.timing?.appElapsedP95Ms),
      nginxRequestP95Ms: round(step.timing?.nginxRequestP95Ms),
      nginxUpstreamP95Ms: round(step.timing?.nginxUpstreamP95Ms),
      responseBytesP95: round(step.timing?.responseBytesP95 ?? max(getTargetValues(step, 'responseBytesP95'))),
      receiveP95Ms: round(step.timing?.receiveP95Ms ?? max(getTargetValues(step, 'receiveP95Ms'))),
    },
    database: db,
  }
}

const stepFiles = fs.readdirSync(outputDir)
  .filter((name) => /^step-\d+rps-summary\.json$/.test(name))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))

const steps = stepFiles.map((file) => attachDiagnostics(readJson(path.join(outputDir, file))))
const cleanSteps = steps.filter((step) =>
  (step.http?.failedRate ?? 0) < failRateLimit
  && (step.http?.droppedIterations ?? 0) === 0
  && (step.http?.durationP95Ms ?? Number.POSITIVE_INFINITY) <= p95LimitMs)
const firstSaturated = steps.find((step) => !cleanSteps.includes(step))
const cleanCeilingRps = cleanSteps.length ? Math.max(...cleanSteps.map((step) => step.rate)) : 0
const firstSaturationRate = firstSaturated?.rate ?? null

function resolveNextFocus() {
  if (!firstSaturated) {
    return 'increase-rate-or-extend-soak'
  }

  const saturatedDb = firstSaturated.database
  if ((firstSaturated.http?.failedCount ?? 0) > 0
    || (firstSaturated.http?.droppedIterations ?? 0) > 0
    || (saturatedDb?.connectionOpenP95Ms ?? 0) >= 50
    || (saturatedDb?.activeConnections ?? 0) >= Math.max(1, Math.floor((saturatedDb?.npgsqlMaximumPoolSize ?? 40) * 0.8))) {
    return 'db-pool-or-resource-pressure'
  }

  if ((firstSaturated.timing?.responseBytesP95 ?? 0) >= 65536
    && (firstSaturated.timing?.receiveP95Ms ?? 0) >= 20) {
    return 'payload-or-network-transfer'
  }

  if ((firstSaturated.timing?.appElapsedP95Ms ?? 0) >= (firstSaturated.http?.durationP95Ms ?? 0) * 0.75) {
    return 'app-cpu-or-serialization'
  }

  return 'measure-more'
}

const aggregate = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  failRateLimit,
  p95LimitMs,
  cleanCeilingRps,
  firstSaturationRate,
  nextFocus: resolveNextFocus(),
  steps,
}

process.stdout.write(JSON.stringify(aggregate, null, 2))
NODE

node - "${AGGREGATE_JSON}" >"${AGGREGATE_MD}" <<'NODE'
const fs = require('node:fs')
const summary = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))

function value(input, suffix = '') {
  if (input === null || input === undefined) return 'unavailable'
  return `${input}${suffix}`
}

const lines = [
  '# Production Real Load Steps Summary',
  '',
  `- Base URL: ${summary.baseUrl}`,
  `- Clean ceiling RPS: ${summary.cleanCeilingRps}`,
  `- First saturation rate: ${value(summary.firstSaturationRate, ' rps')}`,
  `- Next focus: ${summary.nextFocus}`,
  '',
  '| Rate | RPS | p95 | fail rate | dropped | bytes p95 | receive p95 | app p95 | nginx p95 | DB cmd p95 | DB open p95 |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
]

for (const step of summary.steps) {
  lines.push(`| ${step.rate} | ${value(step.http?.rps)} | ${value(step.http?.durationP95Ms, ' ms')} | ${value(step.http?.failedRate)} | ${value(step.http?.droppedIterations)} | ${value(step.timing?.responseBytesP95, ' B')} | ${value(step.timing?.receiveP95Ms, ' ms')} | ${value(step.timing?.appElapsedP95Ms, ' ms')} | ${value(step.timing?.nginxRequestP95Ms, ' ms')} | ${value(step.database?.commandP95Ms, ' ms')} | ${value(step.database?.connectionOpenP95Ms, ' ms')} |`)
}

lines.push('')
lines.push('Interpretation: keep pageSize=12 and real read targets. Use this result to choose the next code slice instead of changing test targets or adding cache.')

process.stdout.write(`${lines.join('\n')}\n`)
NODE

info "aggregate json: ${AGGREGATE_JSON}"
info "aggregate markdown: ${AGGREGATE_MD}"
info "PASS"
