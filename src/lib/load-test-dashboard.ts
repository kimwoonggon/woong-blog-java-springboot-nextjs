export type LoadTestGroup = 'work' | 'study'
export type LoadTestPattern = 'step' | 'soak' | 'spike'
export type LoadTestHealthStatus = 'green' | 'yellow' | 'red' | 'unavailable'

export type LoadTestTarget = {
  id: string
  label: string
  path: string
  group: LoadTestGroup
}

export type LoadTestConfig = {
  pattern: LoadTestPattern
  startUsers: number
  maxUsers: number
  stepUsers: number
  requestsPerUser: number
  concurrency: number
  timeoutMs: number
  soakDurationSeconds: number
  spikeRampSeconds: number
}

export type RealBackendTestConfig = {
  scenario: string
  target: string
  runner: string
  rate: number
  peakRate: number
  durationSeconds: number
  maxVUs: number
  startVUs: number
}

export type RealBackendExecutionProfile = {
  modeLabel: string
  summary: string
  rateLabel: string
  maxVUsLabel: string
  durationLabel: string
  showRate: boolean
  showPeakRate: boolean
  showStartVUs: boolean
  showMaxVUs: boolean
}

export type LoadTestSample = {
  ok: boolean
  durationMs: number
  status?: number
  error?: string
}

export type LoadTestFailureBreakdown = {
  http5xxCount: number
  status429Count: number
  status503Count: number
  timeoutCount: number
  abortedCount: number
}

export type LoadTestScenarioResult = {
  targetId: string
  targetLabel: string
  targetPath: string
  group: LoadTestGroup
  state?: 'running' | 'completed' | 'stopped'
  userCount: number
  plannedRequestCount?: number
  requestCount: number
  successCount: number
  failureCount: number
  errorRate: number
  minMs: number
  avgMs: number
  p50Ms: number
  p95Ms: number
  maxMs: number
  http5xxCount: number
  status429Count: number
  status503Count: number
  timeoutCount: number
  abortedCount: number
}

export type LoadTestTargetInput = {
  workSlugs?: string[]
  blogSlugs?: string[]
}

export type LoadTestHealth = {
  status: LoadTestHealthStatus
  reason: string
}

export type RuntimeDiagnosticsPayload = {
  timestamp: string
  process: {
    memoryBytes: number
    processorCount: number
    memoryLimitBytes?: number | null
    cpuQuotaCores?: number | null
  }
  gc: {
    heapSizeBytes: number
    gen0Collections: number
    gen1Collections: number
    gen2Collections: number
    timeInGcPercent: number | null
  }
  threadPool: {
    workerThreads: number
    pendingWorkItemCount: number
    completedWorkItemCount: number | null
    availableWorkerThreads: number
    maxWorkerThreads: number
  }
  database: {
    status: 'available' | 'unavailable' | 'error'
    latencyMs: number | null
    openConnections: number | null
    activeConnections: number | null
    idleConnections: number | null
    idleInTransactionConnections?: number | null
    commandLatency?: {
      sampleCount: number
      p50Ms: number | null
      p95Ms: number | null
      p99Ms: number | null
    }
    connectionOpenLatency?: {
      sampleCount: number
      p50Ms: number | null
      p95Ms: number | null
      p99Ms: number | null
    }
    slowQueryCount?: number
    recentSlowQueries?: Array<{
      capturedAt: string
      durationMs: number
      sqlPreview: string
      errorCategory?: string | null
    }>
    timeoutCount: number
    errorCount?: number
    errorCategory?: string | null
    error?: string | null
    pool?: {
      databaseProvider: string
      dbContextPoolSize: number
      npgsqlMinimumPoolSize: number | null
      npgsqlMaximumPoolSize: number | null
      npgsqlPoolLimitSource: string
    }
  }
}

export type RuntimeMetricTrend = {
  current: number
  peak: number
  delta: number
}

export type RuntimeDiagnosticsSummary = {
  sampleCount: number
  status: 'available' | 'unavailable'
  memoryBytes: RuntimeMetricTrend
  memoryLimitBytes: RuntimeMetricTrend
  processorCount: RuntimeMetricTrend
  cpuQuotaCores: RuntimeMetricTrend
  memoryLimitAvailable: boolean
  cpuQuotaAvailable: boolean
  gcHeapBytes: RuntimeMetricTrend
  gen2Collections: RuntimeMetricTrend
  timeInGcPercent: RuntimeMetricTrend
  threadPoolWorkerThreads: RuntimeMetricTrend
  threadPoolQueueLength: RuntimeMetricTrend
  threadPoolCompletedWorkItemCount: RuntimeMetricTrend
  databaseLatencyMs: RuntimeMetricTrend
  databaseTimeoutCount: RuntimeMetricTrend
  dbCommandP95Ms: RuntimeMetricTrend
  dbCommandP99Ms: RuntimeMetricTrend
  dbConnectionOpenP95Ms: RuntimeMetricTrend
  dbCommandP95Available: boolean
  dbCommandP99Available: boolean
  dbConnectionOpenP95Available: boolean
  dbSlowQueryCount: RuntimeMetricTrend
  dbErrorCount: RuntimeMetricTrend
  dbOpenConnections: RuntimeMetricTrend
  dbActiveConnections: RuntimeMetricTrend
  dbIdleConnections: RuntimeMetricTrend
  dbIdleInTransactionConnections: RuntimeMetricTrend
  dbContextPoolSize: RuntimeMetricTrend
  dbNpgsqlMinimumPoolSize: RuntimeMetricTrend
  dbNpgsqlMaximumPoolSize: RuntimeMetricTrend
  dbContextPoolAvailable: boolean
  dbNpgsqlPoolConfigured: boolean
}

export type RealBackendLatencyBreakdown = {
  available: boolean
  reason: string | null
  source?: string | null
  minMs: number | null
  p50Ms: number | null
  p95Ms: number | null
  p99Ms: number | null
  maxMs: number | null
  appElapsedP95Ms?: number | null
  appElapsedReason?: string | null
  appElapsedSource?: string | null
  nginxRequestTimeP95Ms?: number | null
  nginxRequestP95Source?: string | null
  nginxUpstreamP95Ms?: number | null
  nginxUpstreamSource?: string | null
  dbCommandP95Ms?: number | null
  dbCommandP95Source?: string | null
}

export type RealBackendHttpCounts = {
  total: number
  success: number
  failed: number
  status2xx: number
  status3xx: number
  status4xx: number
  status5xx: number
}

export type RealBackendTargetMetric = {
  targetId: string
  targetLabel: string
  targetPath: string
  group: LoadTestGroup
  requestCount: number
  successCount: number
  failureCount: number
  p95Ms: number
  responseBytesP95: number | null
  receiveP95Ms: number | null
  dbCommandElapsedP95Ms: number | null
  dbCommandCountP95: number | null
  statusCounts: Record<string, number>
}

export type RealBackendStartPayload = RealBackendTestConfig & {
  targets: LoadTestTarget[]
}

export type RealBackendRunSnapshot = {
  runId: string
  status: string
  metricsPending: boolean
  requests: number
  throughputRps: number
  latencyMs: number
  latencyBreakdown: RealBackendLatencyBreakdown
  httpCounts: RealBackendHttpCounts
  targetMetrics: RealBackendTargetMetric[]
  diagnostics: RuntimeDiagnosticsPayload[]
}

export const DEFAULT_LOAD_TEST_CONFIG: LoadTestConfig = {
  pattern: 'step',
  startUsers: 100,
  maxUsers: 1000,
  stepUsers: 100,
  requestsPerUser: 1,
  concurrency: 25,
  timeoutMs: 10_000,
  soakDurationSeconds: 300,
  spikeRampSeconds: 60,
}

export const DEFAULT_REAL_BACKEND_TEST_CONFIG: RealBackendTestConfig = {
  scenario: 'public-api-rps',
  target: 'public-api-mix',
  runner: 'k6',
  rate: 10,
  peakRate: 20,
  durationSeconds: 30,
  maxVUs: 10,
  startVUs: 1,
}

const MIN_USERS = 1
export const MAX_USERS = 10_000
const MIN_TIMEOUT_MS = 1000
const MAX_TIMEOUT_MS = 60_000
export const MAX_CONCURRENCY = 1_000
const MAX_REQUESTS_PER_USER = 5
const MIN_PATTERN_SECONDS = 10
const MAX_PATTERN_SECONDS = 60 * 60
const MAX_REAL_BACKEND_RATE = 100_000
const MAX_REAL_BACKEND_DURATION_SECONDS = 60 * 60
const MAX_REAL_BACKEND_VUS = 10_000

export const LOAD_TEST_THRESHOLDS = {
  http: {
    greenP95Ms: 300,
    redP95Ms: 800,
    greenErrorRatePercent: 0.1,
    redErrorRatePercent: 1,
  },
  runtime: {
    redThreadPoolQueueDelta: 20,
    yellowGen2Delta: 1,
    redGen2Delta: 5,
    yellowTimeInGcPercent: 5,
    redTimeInGcPercent: 10,
    yellowMemoryGrowthBytes: 128 * 1024 * 1024,
    redMemoryGrowthBytes: 512 * 1024 * 1024,
  },
  database: {
    yellowLatencyMs: 100,
    redLatencyMs: 250,
    redErrorCount: 1,
  },
} as const

function toInteger(value: unknown, fallback: number) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? Math.trunc(numberValue) : fallback
}

function normalizeRealBackendStatus(rawStatus: string) {
  const normalized = rawStatus.trim().toLowerCase()

  if (normalized.includes('queued') || normalized.includes('queue')) {
    return 'queued'
  }

  if (normalized.includes('complete') || normalized.includes('success') || normalized.includes('finish')) {
    return 'completed'
  }

  if (normalized.includes('fail') || normalized.includes('error')) {
    return 'failed'
  }

  if (normalized.includes('stop') || normalized.includes('cancel')) {
    return 'stopped'
  }

  if (normalized.includes('run')) {
    return 'running'
  }

  return normalized || 'unknown'
}

export function summarizeLoadTestFailureBreakdown(samples: LoadTestSample[]): LoadTestFailureBreakdown {
  return samples.reduce<LoadTestFailureBreakdown>((summary, sample) => {
    const status = sample.status ?? 0
    if (status >= 500) {
      summary.http5xxCount += 1
    }
    if (status === 429) {
      summary.status429Count += 1
    }
    if (status === 503) {
      summary.status503Count += 1
    }
    const lowerError = sample.error?.toLowerCase() ?? ''
    if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
      summary.timeoutCount += 1
    }
    if (lowerError.includes('abort')) {
      summary.abortedCount += 1
    }
    return summary
  }, {
    http5xxCount: 0,
    status429Count: 0,
    status503Count: 0,
    timeoutCount: 0,
    abortedCount: 0,
  })
}

function sanitizeLoadTestPattern(value: unknown): LoadTestPattern {
  return value === 'soak' || value === 'spike' || value === 'step' ? value : DEFAULT_LOAD_TEST_CONFIG.pattern
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function roundMetric(value: number) {
  return Math.round(value * 10) / 10
}

export function sanitizeLoadTestConfig(config: Partial<LoadTestConfig>): LoadTestConfig {
  const startUsers = clamp(toInteger(config.startUsers, DEFAULT_LOAD_TEST_CONFIG.startUsers), MIN_USERS, MAX_USERS)
  const maxUsers = clamp(toInteger(config.maxUsers, DEFAULT_LOAD_TEST_CONFIG.maxUsers), startUsers, MAX_USERS)

  return {
    pattern: sanitizeLoadTestPattern(config.pattern),
    startUsers,
    maxUsers,
    stepUsers: clamp(toInteger(config.stepUsers, DEFAULT_LOAD_TEST_CONFIG.stepUsers), 1, MAX_USERS),
    requestsPerUser: clamp(toInteger(config.requestsPerUser, DEFAULT_LOAD_TEST_CONFIG.requestsPerUser), 1, MAX_REQUESTS_PER_USER),
    concurrency: clamp(toInteger(config.concurrency, DEFAULT_LOAD_TEST_CONFIG.concurrency), 1, MAX_CONCURRENCY),
    timeoutMs: clamp(toInteger(config.timeoutMs, DEFAULT_LOAD_TEST_CONFIG.timeoutMs), MIN_TIMEOUT_MS, MAX_TIMEOUT_MS),
    soakDurationSeconds: clamp(toInteger(config.soakDurationSeconds, DEFAULT_LOAD_TEST_CONFIG.soakDurationSeconds), MIN_PATTERN_SECONDS, MAX_PATTERN_SECONDS),
    spikeRampSeconds: clamp(toInteger(config.spikeRampSeconds, DEFAULT_LOAD_TEST_CONFIG.spikeRampSeconds), MIN_PATTERN_SECONDS, MAX_PATTERN_SECONDS),
  }
}

function trimString(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  return trimmed.length ? trimmed : fallback
}

function numberWithCommas(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

export function sanitizeRealBackendTestConfig(config: Partial<RealBackendTestConfig>): RealBackendTestConfig {
  const scenario = trimString(config.scenario, DEFAULT_REAL_BACKEND_TEST_CONFIG.scenario)
  const rate = clamp(toInteger(config.rate, DEFAULT_REAL_BACKEND_TEST_CONFIG.rate), 1, MAX_REAL_BACKEND_RATE)
  const maxVUs = clamp(toInteger(config.maxVUs, DEFAULT_REAL_BACKEND_TEST_CONFIG.maxVUs), 1, MAX_REAL_BACKEND_VUS)
  const peakRate = clamp(toInteger(config.peakRate, DEFAULT_REAL_BACKEND_TEST_CONFIG.peakRate), 1, MAX_REAL_BACKEND_RATE)

  return {
    scenario,
    target: trimString(config.target, DEFAULT_REAL_BACKEND_TEST_CONFIG.target),
    runner: trimString(config.runner, DEFAULT_REAL_BACKEND_TEST_CONFIG.runner),
    rate,
    peakRate: scenario === 'public-api-spike' ? Math.max(rate, peakRate) : peakRate,
    durationSeconds: clamp(
      toInteger(config.durationSeconds, DEFAULT_REAL_BACKEND_TEST_CONFIG.durationSeconds),
      1,
      MAX_REAL_BACKEND_DURATION_SECONDS,
    ),
    maxVUs,
    startVUs: clamp(toInteger(config.startVUs, DEFAULT_REAL_BACKEND_TEST_CONFIG.startVUs), 1, maxVUs),
  }
}

export function describeRealBackendExecutionProfile(config: Partial<RealBackendTestConfig>): RealBackendExecutionProfile {
  const safeConfig = sanitizeRealBackendTestConfig(config)
  const duration = `${numberWithCommas(safeConfig.durationSeconds)} seconds`

  if (safeConfig.scenario === 'public-api-spike') {
    return {
      modeLabel: 'Spike arrival rate',
      summary: `Spike arrival rate: ${numberWithCommas(safeConfig.rate)} rps -> ${numberWithCommas(safeConfig.peakRate)} rps -> ${numberWithCommas(safeConfig.rate)} rps over ${duration}. Max VUs cap is runner capacity; concurrency is observed, not configured directly.`,
      rateLabel: 'Base RPS',
      maxVUsLabel: 'Max VUs cap',
      durationLabel: 'Duration seconds',
      showRate: true,
      showPeakRate: true,
      showStartVUs: false,
      showMaxVUs: true,
    }
  }

  if (safeConfig.scenario === 'public-api-soak') {
    return {
      modeLabel: 'Soak VUs',
      summary: `Soak VUs: hold ${numberWithCommas(safeConfig.maxVUs)} VUs for ${duration}. Request rate is produced by those VUs and measured from the runner.`,
      rateLabel: 'Target RPS',
      maxVUsLabel: 'VUs',
      durationLabel: 'Duration seconds',
      showRate: false,
      showPeakRate: false,
      showStartVUs: false,
      showMaxVUs: true,
    }
  }

  if (safeConfig.scenario === 'public-api-stress') {
    return {
      modeLabel: 'Stress VUs',
      summary: `Stress VUs: ramp ${numberWithCommas(safeConfig.startVUs)} VUs -> ${numberWithCommas(safeConfig.maxVUs)} VUs -> ${numberWithCommas(safeConfig.startVUs)} VUs over ${duration}. Throughput and concurrency are measured from the run.`,
      rateLabel: 'Target RPS',
      maxVUsLabel: 'Max VUs',
      durationLabel: 'Duration seconds',
      showRate: false,
      showPeakRate: false,
      showStartVUs: true,
      showMaxVUs: true,
    }
  }

  return {
    modeLabel: 'Constant arrival rate',
    summary: `Constant arrival rate: ${numberWithCommas(safeConfig.rate)} rps for ${duration}. Max VUs cap is runner capacity; concurrency is observed, not configured directly.`,
    rateLabel: 'Target RPS',
    maxVUsLabel: 'Max VUs cap',
    durationLabel: 'Duration seconds',
    showRate: true,
    showPeakRate: false,
    showStartVUs: false,
    showMaxVUs: true,
  }
}

function filterRealBackendTargets(targets: LoadTestTarget[], selectedTarget: string) {
  if (selectedTarget === 'public-works-only') {
    return targets.filter((target) => target.group === 'work')
  }

  if (selectedTarget === 'public-blogs-only') {
    return targets.filter((target) => target.group === 'study')
  }

  return targets
}

export function buildRealBackendStartPayload(
  config: Partial<RealBackendTestConfig>,
  targets: LoadTestTarget[],
): RealBackendStartPayload {
  const safeConfig = sanitizeRealBackendTestConfig(config)
  const runnableTargets = filterRealBackendTargets(targets, safeConfig.target)
    .map((target) => ({
      ...target,
      path: target.path.trim(),
    }))
    .filter((target) => target.path.length > 0)

  return {
    ...safeConfig,
    targets: runnableTargets,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readNumberFromRecord(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return null
}

function readStringFromRecord(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length) {
      return value
    }
  }

  return null
}

function readAppElapsedSourceFromRecord(record: Record<string, unknown>) {
  const direct = readNumberFromRecord(record, ['appElapsedP95Ms', 'appElapsedMs', 'appElapsed'])
  if (direct !== null) {
    return {
      value: roundMetric(direct),
      source: 'appElapsed',
    }
  }

  const appRecord = isRecord(record.app) ? record.app : null
  if (appRecord) {
    const fromApp = readNumberFromRecord(appRecord, ['appElapsedP95Ms', 'appElapsedMs', 'appElapsed', 'p95Ms', 'p95'])
    if (fromApp !== null) {
      return {
        value: roundMetric(fromApp),
        source: 'app.elapsed',
      }
    }
  }

  const nestedLatency = isRecord(record.latencyBreakdown) ? record.latencyBreakdown : null
  if (nestedLatency && isRecord(nestedLatency.app)) {
    const fromNestedApp = readNumberFromRecord(nestedLatency.app, ['p95Ms', 'p95', 'appElapsedP95Ms', 'appElapsedMs', 'appElapsed'])
    if (fromNestedApp !== null) {
      return {
        value: roundMetric(fromNestedApp),
        source: 'latencyBreakdown.app',
      }
    }
  }

  return null
}

function readNginxRequestTimeSourceFromRecord(record: Record<string, unknown>) {
  const sourceValues = readNumberFromRecord(record, ['nginxRequestTimeP95Ms', 'requestTimeP95Ms', 'request_time_p95', 'requestTimeP95'])
  if (sourceValues !== null) {
    return {
      value: roundMetric(sourceValues),
      source: 'nginx.request_time',
    }
  }

  return null
}

function readNginxUpstreamSourceFromRecord(record: Record<string, unknown>) {
  const sourceValues = readNumberFromRecord(record, ['nginxUpstreamP95Ms', 'upstreamResponseTimeP95Ms', 'upstream_response_time_p95', 'upstreamP95'])
  if (sourceValues !== null) {
    const source = readStringFromRecord(record, ['nginxUpstreamP95Source', 'nginxUpstreamSource', 'upstreamResponseTimeP95Source'])
    return {
      value: roundMetric(sourceValues),
      source: source ?? 'nginx.upstream',
    }
  }

  return null
}

function resolveAppElapsedFromPayloads(payloads: unknown[]) {
  const candidates: Array<{ record: Record<string, unknown>, source: string }> = []

  for (const payload of payloads) {
    if (!isRecord(payload)) {
      continue
    }

    const status = isRecord(payload.status) ? payload.status : null
    if (status) {
      const statusMetrics = isRecord(status.metrics) ? status.metrics : null
      if (statusMetrics) {
        if (isRecord(statusMetrics.latencyBreakdown)) {
          candidates.push({ record: statusMetrics.latencyBreakdown, source: 'status.metrics.latencyBreakdown' })
        }
      }

      if (isRecord(status.latencyBreakdown)) {
        candidates.push({ record: status.latencyBreakdown, source: 'status.latencyBreakdown' })
      }
    }

    const metrics = isRecord(payload.metrics) ? payload.metrics : null
    if (isRecord(metrics)) {
      candidates.push({ record: metrics, source: 'metrics' })

      if (isRecord(metrics.latencyBreakdown)) {
        candidates.push({ record: metrics.latencyBreakdown, source: 'metrics.latencyBreakdown' })
      }
    }

    if (isRecord(payload.latencyBreakdown)) {
      candidates.push({ record: payload.latencyBreakdown, source: 'payload.latencyBreakdown' })
    }
  }

  for (const candidate of candidates) {
    const appElapsed = readAppElapsedSourceFromRecord(candidate.record)
    if (appElapsed) {
      return {
        value: appElapsed.value,
        reason: null,
        source: candidate.source,
      }
    }
  }

  return null
}

function resolveNginxRequestTimeFromPayloads(payloads: unknown[]) {
  for (const payload of payloads) {
    if (!isRecord(payload)) {
      continue
    }

    const status = isRecord(payload.status) ? payload.status : null
    const statusMetrics = status && isRecord(status.metrics) ? status.metrics : null
    const candidateRecords: Array<{ record: Record<string, unknown>, source: string }> = []

    if (statusMetrics) {
      candidateRecords.push({ record: statusMetrics, source: 'status.metrics' })
    }

    if (status && isRecord(status.latencyBreakdown)) {
      candidateRecords.push({ record: status.latencyBreakdown, source: 'status.latencyBreakdown' })
    }

    if (isRecord(payload.metrics)) {
      candidateRecords.push({ record: payload.metrics, source: 'metrics' })
    }

    if (isRecord(payload.latencyBreakdown)) {
      candidateRecords.push({ record: payload.latencyBreakdown, source: 'payload.latencyBreakdown' })
    }

    for (const candidate of candidateRecords) {
      const valueSource = readNginxRequestTimeSourceFromRecord(candidate.record)
      if (valueSource) {
        return {
          value: valueSource.value,
          source: `${candidate.source}:${valueSource.source}`,
        }
      }
    }
  }

  return null
}

function resolveNginxUpstreamFromPayloads(payloads: unknown[]) {
  for (const payload of payloads) {
    if (!isRecord(payload)) {
      continue
    }

    const status = isRecord(payload.status) ? payload.status : null
    const statusMetrics = status && isRecord(status.metrics) ? status.metrics : null
    const candidateRecords: Array<{ record: Record<string, unknown>, source: string }> = []

    if (statusMetrics) {
      candidateRecords.push({ record: statusMetrics, source: 'status.metrics' })
    }

    if (status && isRecord(status.latencyBreakdown)) {
      candidateRecords.push({ record: status.latencyBreakdown, source: 'status.latencyBreakdown' })
    }

    if (isRecord(payload.metrics)) {
      candidateRecords.push({ record: payload.metrics, source: 'metrics' })
    }

    if (isRecord(payload.latencyBreakdown)) {
      candidateRecords.push({ record: payload.latencyBreakdown, source: 'payload.latencyBreakdown' })
    }

    for (const candidate of candidateRecords) {
      const valueSource = readNginxUpstreamSourceFromRecord(candidate.record)
      if (valueSource) {
        return {
          value: valueSource.value,
          source: `${candidate.source}:${valueSource.source}`,
        }
      }
    }
  }

  return null
}

function inferRealBackendStatusFromPayloads(payloads: unknown[]) {
  for (const payload of payloads) {
    if (!isRecord(payload)) {
      continue
    }

    const status = readStringFromRecord(payload, ['status', 'state', 'phase'])
    if (status) {
      return status
    }
  }

  return 'unknown'
}

function resolveLatencyRecord(payloads: unknown[]) {
  for (const payload of payloads) {
    if (!isRecord(payload)) {
      continue
    }

    const candidates = [
      payload.latencyBreakdown,
      payload.latency,
      payload.latencies,
      payload.metrics,
      isRecord(payload.metrics) ? payload.metrics.latencyBreakdown : null,
      isRecord(payload.metrics) ? payload.metrics.latency : null,
      isRecord(payload.result) ? payload.result.latencyBreakdown : null,
      isRecord(payload.result) ? payload.result.latency : null,
    ]

    for (const candidate of candidates) {
      if (isRecord(candidate)) {
        return candidate
      }
    }
  }

  return null
}

function mergeHttpCounts(payloads: unknown[]) {
  const summary: RealBackendHttpCounts = {
    total: 0,
    success: 0,
    failed: 0,
    status2xx: 0,
    status3xx: 0,
    status4xx: 0,
    status5xx: 0,
  }

  for (const payload of payloads) {
    if (!isRecord(payload)) {
      continue
    }

    const record = (isRecord(payload.httpCounts) ? payload.httpCounts : null)
      ?? (isRecord(payload.http) ? payload.http : null)
      ?? (isRecord(payload.counts) ? payload.counts : null)
      ?? (isRecord(payload.statusCounts) ? payload.statusCounts : null)

    if (!record) {
      continue
    }

    summary.total = readNumberFromRecord(record, ['total', 'requests', 'requestCount']) ?? summary.total
    summary.success = readNumberFromRecord(record, ['success', 'ok', 'status2xx', '2xx']) ?? summary.success
    summary.failed = readNumberFromRecord(record, ['failed', 'errors']) ?? summary.failed
    summary.status2xx = readNumberFromRecord(record, ['status2xx', 'ok', '2xx']) ?? summary.status2xx
    summary.status3xx = readNumberFromRecord(record, ['status3xx', '3xx']) ?? summary.status3xx
    summary.status4xx = readNumberFromRecord(record, ['status4xx', '4xx']) ?? summary.status4xx
    summary.status5xx = readNumberFromRecord(record, ['status5xx', 'http5xx', '5xx']) ?? summary.status5xx
  }

  if (!summary.failed) {
    summary.failed = summary.status4xx + summary.status5xx
  }

  if (!summary.success) {
    summary.success = summary.status2xx + summary.status3xx
  }

  if (!summary.total) {
    summary.total = summary.success + summary.failed
  }

  return summary
}

function readStatusCounts(record: unknown): Record<string, number> {
  if (!isRecord(record)) {
    return {}
  }

  return Object.entries(record).reduce<Record<string, number>>((counts, [key, value]) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      counts[key] = value
    }
    return counts
  }, {})
}

function readTargetMetricsFromRecord(record: Record<string, unknown>) {
  const rawTargets = Array.isArray(record.targetMetrics)
    ? record.targetMetrics
    : Array.isArray(record.targets)
      ? record.targets
      : []

  return rawTargets.filter(isRecord).map((target): RealBackendTargetMetric | null => {
    const targetId = readStringFromRecord(target, ['targetId', 'id'])
    const targetLabel = readStringFromRecord(target, ['targetLabel', 'label'])
    const targetPath = readStringFromRecord(target, ['targetPath', 'path'])
    const group = readStringFromRecord(target, ['group'])

    if (!targetId || !targetLabel || !targetPath || (group !== 'work' && group !== 'study')) {
      return null
    }

    const requestCount = readNumberFromRecord(target, ['requestCount', 'requests', 'totalRequests']) ?? 0
    const failureCount = readNumberFromRecord(target, ['failureCount', 'failedRequests', 'failed']) ?? 0
    const successCount = readNumberFromRecord(target, ['successCount', 'successfulRequests', 'success'])
      ?? Math.max(0, requestCount - failureCount)
    const p95Ms = readNumberFromRecord(target, ['p95Ms', 'p95', 'latencyMs']) ?? 0
    const responseBytesP95 = readNumberFromRecord(target, [
      'responseBytesP95',
      'responseBodyBytesP95',
      'payloadBytesP95',
      'bodyBytesP95',
    ])
    const receiveP95Ms = readNumberFromRecord(target, [
      'receiveP95Ms',
      'receivingP95Ms',
      'responseReceiveP95Ms',
      'receiveMsP95',
    ])
    const dbCommandElapsedP95Ms = readNumberFromRecord(target, [
      'dbCommandElapsedP95Ms',
      'dbCommandP95Ms',
      'databaseCommandElapsedP95Ms',
      'dbElapsedP95Ms',
    ])
    const dbCommandCountP95 = readNumberFromRecord(target, [
      'dbCommandCountP95',
      'databaseCommandCountP95',
      'dbCommandsP95',
    ])

    return {
      targetId,
      targetLabel,
      targetPath,
      group,
      requestCount,
      successCount,
      failureCount,
      p95Ms: roundMetric(p95Ms),
      responseBytesP95: responseBytesP95 === null ? null : roundMetric(responseBytesP95),
      receiveP95Ms: receiveP95Ms === null ? null : roundMetric(receiveP95Ms),
      dbCommandElapsedP95Ms: dbCommandElapsedP95Ms === null ? null : roundMetric(dbCommandElapsedP95Ms),
      dbCommandCountP95: dbCommandCountP95 === null ? null : roundMetric(dbCommandCountP95),
      statusCounts: readStatusCounts(target.statusCounts),
    }
  }).filter((target): target is RealBackendTargetMetric => target !== null)
}

function extractRealBackendTargetMetrics(payloads: unknown[]) {
  for (const payload of payloads) {
    if (!isRecord(payload)) {
      continue
    }

    const targetMetrics = readTargetMetricsFromRecord(payload)
    if (targetMetrics.length) {
      return targetMetrics
    }
  }

  return []
}

function inferRequests(payloads: unknown[]) {
  for (const payload of payloads) {
    if (!isRecord(payload)) {
      continue
    }

    const requests = readNumberFromRecord(payload, ['requests', 'requestCount', 'totalRequests', 'completedRequests'])
    if (requests !== null) {
      return requests
    }
  }

  return 0
}

function inferThroughput(payloads: unknown[]) {
  for (const payload of payloads) {
    if (!isRecord(payload)) {
      continue
    }

    const throughput = readNumberFromRecord(payload, [
      'throughputRps',
      'currentRps',
      'averageRps',
      'rps',
      'requestsPerSecond',
      'throughput',
    ])
    if (throughput !== null) {
      return roundMetric(throughput)
    }
  }

  return 0
}

function inferLatency(payloads: unknown[]) {
  for (const payload of payloads) {
    if (!isRecord(payload)) {
      continue
    }

    const latency = readNumberFromRecord(payload, [
      'latencyMs',
      'avgLatencyMs',
      'averageLatencyMs',
      'latency',
      'p95Ms',
      'p50Ms',
    ])
    if (latency !== null) {
      return roundMetric(latency)
    }
  }

  return 0
}

export function extractRealBackendLatencyBreakdown(...payloads: unknown[]): RealBackendLatencyBreakdown {
  const statusText = inferRealBackendStatusFromPayloads(payloads)
  const normalizedStatus = normalizeRealBackendStatus(statusText)
  const statusAwareReason = normalizedStatus && normalizedStatus !== 'unknown'
    ? `Latency breakdown is unavailable for this run. Current status: ${normalizedStatus}.`
    : 'Latency breakdown is unavailable for this run.'
  const latency = resolveLatencyRecord(payloads)
  if (!latency) {
    return {
      available: false,
      reason: statusAwareReason,
      source: null,
      minMs: null,
      p50Ms: null,
      p95Ms: null,
      p99Ms: null,
      maxMs: null,
      appElapsedP95Ms: null,
      appElapsedReason: normalizedStatus !== 'unknown'
        ? `ASP.NET app elapsed p95 is unavailable for status ${normalizedStatus}.`
        : 'ASP.NET app elapsed p95 is unavailable.',
      appElapsedSource: null,
      nginxRequestTimeP95Ms: null,
      nginxRequestP95Source: null,
      nginxUpstreamP95Ms: null,
      nginxUpstreamSource: null,
      dbCommandP95Ms: null,
      dbCommandP95Source: null,
    }
  }

  const minMs = readNumberFromRecord(latency, ['minMs', 'min'])
  const p50Ms = readNumberFromRecord(latency, ['p50Ms', 'p50'])
  const p95Ms = readNumberFromRecord(latency, ['p95Ms', 'p95'])
  const p99Ms = readNumberFromRecord(latency, ['p99Ms', 'p99'])
  const maxMs = readNumberFromRecord(latency, ['maxMs', 'max'])
  const hasValues = [minMs, p50Ms, p95Ms, p99Ms, maxMs].some((value) => value !== null)

  const appElapsed = resolveAppElapsedFromPayloads(payloads)
  const nginxRequestTime = resolveNginxRequestTimeFromPayloads(payloads)
  const nginxUpstream = resolveNginxUpstreamFromPayloads(payloads)
  const appElapsedFallbackReason = normalizedStatus !== 'unknown'
    ? `ASP.NET app elapsed p95 is unavailable for status ${normalizedStatus}.`
    : 'ASP.NET app elapsed p95 is unavailable.'

  if (!hasValues) {
    return {
      available: false,
      reason: statusAwareReason,
      source: null,
      minMs: null,
      p50Ms: null,
      p95Ms: null,
      p99Ms: null,
      maxMs: null,
      appElapsedP95Ms: appElapsed?.value ?? null,
      appElapsedReason: appElapsed ? null : appElapsedFallbackReason,
      appElapsedSource: appElapsed ? appElapsed.source : null,
      nginxRequestTimeP95Ms: nginxRequestTime?.value ?? null,
      nginxRequestP95Source: nginxRequestTime ? nginxRequestTime.source : null,
      nginxUpstreamP95Ms: nginxUpstream?.value ?? null,
      nginxUpstreamSource: nginxUpstream ? nginxUpstream.source : null,
      dbCommandP95Ms: null,
      dbCommandP95Source: null,
    }
  }

  return {
    available: true,
    reason: null,
    source: 'latencyBreakdown',
    minMs: minMs === null ? null : roundMetric(minMs),
    p50Ms: p50Ms === null ? null : roundMetric(p50Ms),
    p95Ms: p95Ms === null ? null : roundMetric(p95Ms),
    p99Ms: p99Ms === null ? null : roundMetric(p99Ms),
    maxMs: maxMs === null ? null : roundMetric(maxMs),
    appElapsedP95Ms: appElapsed?.value ?? null,
    appElapsedReason: appElapsed ? null : appElapsedFallbackReason,
    appElapsedSource: appElapsed ? appElapsed.source : null,
    nginxRequestTimeP95Ms: nginxRequestTime?.value ?? null,
    nginxRequestP95Source: nginxRequestTime ? nginxRequestTime.source : null,
    nginxUpstreamP95Ms: nginxUpstream?.value ?? null,
    nginxUpstreamSource: nginxUpstream ? nginxUpstream.source : null,
    dbCommandP95Ms: null,
    dbCommandP95Source: null,
  }
}

export function summarizeRealBackendRunSnapshot(runId: string, statusPayload: unknown, metricsPayload: unknown): RealBackendRunSnapshot {
  const statusRecord = isRecord(statusPayload) ? statusPayload : {}
  const metricsRecord = isRecord(metricsPayload) ? metricsPayload : {}
  const metricPoints = Array.isArray(metricsRecord.metrics)
    ? metricsRecord.metrics.filter(isRecord)
    : []
  const diagnostics = extractRealBackendDiagnostics(metricsRecord, metricPoints)
  const latestMetricPoint = metricPoints.at(-1) ?? null
  const status = readStringFromRecord(statusRecord, ['status', 'state', 'phase'])
    ?? readStringFromRecord(metricsRecord, ['status', 'state', 'phase'])
    ?? inferRealBackendStatusFromPayloads([statusRecord, metricsRecord])

  const normalizedStatus = normalizeRealBackendStatus(status)
  const payloads = latestMetricPoint
    ? [latestMetricPoint, metricsRecord, statusRecord]
    : [metricsRecord, statusRecord]
  const httpCounts = mergeHttpCounts(payloads)
  const requests = inferRequests(payloads) || httpCounts.total
  const targetMetrics = extractRealBackendTargetMetrics(payloads)
  const metricsPending = (normalizedStatus === 'queued' || normalizedStatus === 'running')
    && requests === 0
    && httpCounts.total === 0
    && targetMetrics.length === 0
  const pendingLatencyBreakdown: RealBackendLatencyBreakdown = {
    available: false,
    reason: 'k6 summary pending; runner metrics will appear after the first summary point is available.',
    source: null,
    minMs: null,
    p50Ms: null,
    p95Ms: null,
    p99Ms: null,
    maxMs: null,
    appElapsedP95Ms: null,
    appElapsedReason: 'k6 summary pending; ASP.NET app elapsed p95 is not available yet.',
    appElapsedSource: null,
    nginxRequestTimeP95Ms: null,
    nginxRequestP95Source: null,
    nginxUpstreamP95Ms: null,
    nginxUpstreamSource: null,
    dbCommandP95Ms: null,
    dbCommandP95Source: null,
  }
  const latencyBreakdown = metricsPending
    ? pendingLatencyBreakdown
    : withDiagnosticsDbCommandP95(
      extractRealBackendLatencyBreakdown(metricsRecord, statusRecord),
      diagnostics,
    )

  return {
    runId,
    status: normalizedStatus,
    metricsPending,
    requests,
    throughputRps: inferThroughput(payloads),
    latencyMs: inferLatency(payloads),
    latencyBreakdown,
    httpCounts,
    targetMetrics,
    diagnostics,
  }
}

function extractRealBackendDiagnostics(
  metricsRecord: Record<string, unknown>,
  metricPoints: Record<string, unknown>[],
): RuntimeDiagnosticsPayload[] {
  const directDiagnostics = Array.isArray(metricsRecord.diagnostics)
    ? metricsRecord.diagnostics.filter(isRuntimeDiagnosticsPayload)
    : []

  if (directDiagnostics.length) {
    return directDiagnostics
  }

  return metricPoints
    .map((metricPoint) => metricPoint.diagnostics)
    .filter(isRuntimeDiagnosticsPayload)
}

export function buildUserSteps(config: LoadTestConfig) {
  const safeConfig = sanitizeLoadTestConfig(config)

  if (safeConfig.pattern === 'soak' || safeConfig.pattern === 'spike') {
    return [safeConfig.maxUsers]
  }

  const steps: number[] = []

  for (let users = safeConfig.startUsers; users <= safeConfig.maxUsers; users += safeConfig.stepUsers) {
    steps.push(users)
  }

  if (steps.at(-1) !== safeConfig.maxUsers) {
    steps.push(safeConfig.maxUsers)
  }

  return steps
}

export function buildSoakUserTimeline(config: LoadTestConfig) {
  const safeConfig = sanitizeLoadTestConfig(config)
  return Array.from({ length: safeConfig.soakDurationSeconds }, () => safeConfig.maxUsers)
}

export function buildSpikeUserTimeline(config: LoadTestConfig) {
  const safeConfig = sanitizeLoadTestConfig(config)
  const duration = safeConfig.spikeRampSeconds

  if (duration <= 1) {
    return [safeConfig.maxUsers]
  }

  const timeline: number[] = []
  for (let second = 0; second < duration; second += 1) {
    const progress = second / (duration - 1)
    const users = Math.round(safeConfig.startUsers + ((safeConfig.maxUsers - safeConfig.startUsers) * progress))
    timeline.push(clamp(users, safeConfig.startUsers, safeConfig.maxUsers))
  }

  timeline[timeline.length - 1] = safeConfig.maxUsers
  return timeline
}

export function estimatePatternRequestCount(config: LoadTestConfig) {
  const safeConfig = sanitizeLoadTestConfig(config)
  const requestsPerUser = safeConfig.requestsPerUser

  if (safeConfig.pattern === 'soak') {
    return buildSoakUserTimeline(safeConfig).reduce((sum, users) => sum + (users * requestsPerUser), 0)
  }

  if (safeConfig.pattern === 'spike') {
    return buildSpikeUserTimeline(safeConfig).reduce((sum, users) => sum + (users * requestsPerUser), 0)
  }

  return buildUserSteps(safeConfig).reduce((sum, users) => sum + (users * requestsPerUser), 0)
}

export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
  options?: {
    onInFlightChange?: (inFlight: number) => void
  },
) {
  const safeConcurrency = Math.max(1, Math.trunc(concurrency))

  if (!tasks.length) {
    options?.onInFlightChange?.(0)
    return [] as T[]
  }

  const results = new Array<T>(tasks.length)
  let nextIndex = 0
  let activeCount = 0

  return await new Promise<T[]>((resolve, reject) => {
    const launchNext = () => {
      if (nextIndex >= tasks.length && activeCount === 0) {
        resolve(results)
        return
      }

      while (activeCount < safeConcurrency && nextIndex < tasks.length) {
        const taskIndex = nextIndex
        nextIndex += 1
        activeCount += 1
        options?.onInFlightChange?.(activeCount)

        void tasks[taskIndex]()
          .then((result) => {
            results[taskIndex] = result
          })
          .catch((error) => {
            reject(error)
          })
          .finally(() => {
            activeCount -= 1
            options?.onInFlightChange?.(activeCount)
            launchNext()
          })
      }
    }

    launchNext()
  })
}

export function buildLoadTestTargets({ workSlugs = [], blogSlugs = [] }: LoadTestTargetInput): LoadTestTarget[] {
  const targets: LoadTestTarget[] = [
    { id: 'works-list', label: 'Work list', path: '/api/public/works?page=1&pageSize=12', group: 'work' },
  ]

  const firstWorkSlug = workSlugs.find(Boolean)
  if (firstWorkSlug) {
    targets.push({ id: 'work-read', label: 'Work read', path: `/api/public/works/${encodeURIComponent(firstWorkSlug)}`, group: 'work' })
  }

  targets.push({ id: 'study-list', label: 'Study list', path: '/api/public/blogs?page=1&pageSize=12', group: 'study' })

  const firstBlogSlug = blogSlugs.find(Boolean)
  if (firstBlogSlug) {
    targets.push({ id: 'study-read', label: 'Study read', path: `/api/public/blogs/${encodeURIComponent(firstBlogSlug)}`, group: 'study' })
  }

  return targets
}

export function percentile(values: number[], percentileRank: number) {
  if (!values.length) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentileRank / 100) * sorted.length) - 1
  return sorted[clamp(index, 0, sorted.length - 1)]
}

export function summarizeLoadTestSamples(
  target: LoadTestTarget,
  userCount: number,
  samples: LoadTestSample[],
): LoadTestScenarioResult {
  const durations = samples.map((sample) => sample.durationMs)
  const successCount = samples.filter((sample) => sample.ok).length
  const requestCount = samples.length
  const failureCount = requestCount - successCount
  const totalDuration = durations.reduce((sum, duration) => sum + duration, 0)
  const failureBreakdown = summarizeLoadTestFailureBreakdown(samples)

  return {
    targetId: target.id,
    targetLabel: target.label,
    targetPath: target.path,
    group: target.group,
    userCount,
    requestCount,
    successCount,
    failureCount,
    errorRate: requestCount ? roundMetric((failureCount / requestCount) * 100) : 0,
    minMs: durations.length ? roundMetric(Math.min(...durations)) : 0,
    avgMs: durations.length ? roundMetric(totalDuration / durations.length) : 0,
    p50Ms: roundMetric(percentile(durations, 50)),
    p95Ms: roundMetric(percentile(durations, 95)),
    maxMs: durations.length ? roundMetric(Math.max(...durations)) : 0,
    http5xxCount: failureBreakdown.http5xxCount,
    status429Count: failureBreakdown.status429Count,
    status503Count: failureBreakdown.status503Count,
    timeoutCount: failureBreakdown.timeoutCount,
    abortedCount: failureBreakdown.abortedCount,
  }
}

export function appendLoadTestCacheBust(path: string, runId: string, requestIndex: number, userCount = 1) {
  const separator = path.includes('?') ? '&' : '?'
  const safeUserCount = Math.max(1, Math.trunc(userCount))
  const virtualUser = (requestIndex % safeUserCount) + 1
  const iteration = Math.floor(requestIndex / safeUserCount) + 1

  return `${path}${separator}__loadTestRun=${encodeURIComponent(runId)}&__loadTestUser=${virtualUser}&__loadTestRequest=${requestIndex}&__loadTestIteration=${iteration}`
}

export function evaluateHttpScenarioHealth(result: Pick<LoadTestScenarioResult, 'p95Ms' | 'errorRate'>): LoadTestHealth {
  if (result.errorRate >= LOAD_TEST_THRESHOLDS.http.redErrorRatePercent || result.p95Ms >= LOAD_TEST_THRESHOLDS.http.redP95Ms) {
    return { status: 'red', reason: 'HTTP error rate or p95 latency is above the red threshold.' }
  }

  if (result.errorRate >= LOAD_TEST_THRESHOLDS.http.greenErrorRatePercent || result.p95Ms >= LOAD_TEST_THRESHOLDS.http.greenP95Ms) {
    return { status: 'yellow', reason: 'HTTP p95 latency or error rate needs review.' }
  }

  return { status: 'green', reason: 'HTTP p95 latency and error rate are within the initial target.' }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

export function isRuntimeDiagnosticsPayload(value: unknown): value is RuntimeDiagnosticsPayload {
  if (!isObject(value) || typeof value.timestamp !== 'string') {
    return false
  }

  const process = value.process
  const gc = value.gc
  const threadPool = value.threadPool
  const database = value.database

  if (
    !isObject(process)
    || !isFiniteNumber(process.memoryBytes)
    || !isFiniteNumber(process.processorCount)
    || (process.memoryLimitBytes !== undefined && !isNullableFiniteNumber(process.memoryLimitBytes))
    || (process.cpuQuotaCores !== undefined && !isNullableFiniteNumber(process.cpuQuotaCores))
  ) {
    return false
  }

  if (
    !isObject(gc)
    || !isFiniteNumber(gc.heapSizeBytes)
    || !isFiniteNumber(gc.gen0Collections)
    || !isFiniteNumber(gc.gen1Collections)
    || !isFiniteNumber(gc.gen2Collections)
    || !isNullableFiniteNumber(gc.timeInGcPercent)
  ) {
    return false
  }

  if (
    !isObject(threadPool)
    || !isFiniteNumber(threadPool.workerThreads)
    || !isFiniteNumber(threadPool.pendingWorkItemCount)
    || !isNullableFiniteNumber(threadPool.completedWorkItemCount)
    || !isFiniteNumber(threadPool.availableWorkerThreads)
    || !isFiniteNumber(threadPool.maxWorkerThreads)
  ) {
    return false
  }

  if (!isObject(database)) {
    return false
  }

  const databaseStatus = database.status
  const commandLatency = database.commandLatency
  const connectionOpenLatency = database.connectionOpenLatency
  const slowQueryCount = database.slowQueryCount
  const errorCount = database.errorCount
  const pool = database.pool

  const isLatencyShape = (value: unknown) => {
    if (!isObject(value)) {
      return false
    }

    return isFiniteNumber(value.sampleCount)
      && isNullableFiniteNumber(value.p50Ms)
      && isNullableFiniteNumber(value.p95Ms)
      && isNullableFiniteNumber(value.p99Ms)
  }

  const areSlowSamplesValid = !database.recentSlowQueries
    || (Array.isArray(database.recentSlowQueries)
      && database.recentSlowQueries.every((sample) => isObject(sample)
        && typeof sample.capturedAt === 'string'
        && isFiniteNumber(sample.durationMs)
        && typeof sample.sqlPreview === 'string'
      ))
  const isPoolValid = pool === undefined
    || (isObject(pool)
      && typeof pool.databaseProvider === 'string'
      && isFiniteNumber(pool.dbContextPoolSize)
      && isNullableFiniteNumber(pool.npgsqlMinimumPoolSize)
      && isNullableFiniteNumber(pool.npgsqlMaximumPoolSize)
      && typeof pool.npgsqlPoolLimitSource === 'string')

  return (databaseStatus === 'available' || databaseStatus === 'unavailable' || databaseStatus === 'error')
    && isNullableFiniteNumber(database.latencyMs)
    && isNullableFiniteNumber(database.openConnections)
    && isNullableFiniteNumber(database.activeConnections)
    && isNullableFiniteNumber(database.idleConnections)
    && isNullableFiniteNumber(database.idleInTransactionConnections)
    && isFiniteNumber(database.timeoutCount)
    && (commandLatency === undefined || isLatencyShape(commandLatency))
    && (connectionOpenLatency === undefined || isLatencyShape(connectionOpenLatency))
    && (slowQueryCount === undefined || isFiniteNumber(slowQueryCount))
    && (errorCount === undefined || isFiniteNumber(errorCount))
    && areSlowSamplesValid
    && isPoolValid
}

function emptyTrend(): RuntimeMetricTrend {
  return { current: 0, peak: 0, delta: 0 }
}

function summarizeTrend(values: number[]): RuntimeMetricTrend {
  if (!values.length) {
    return emptyTrend()
  }

  const first = values[0] ?? 0
  const current = values.at(-1) ?? first
  return {
    current: roundMetric(current),
    peak: roundMetric(Math.max(...values)),
    delta: roundMetric(current - first),
  }
}

function summarizeOptionalTrend(values: Array<number | null | undefined>) {
  const availableValues = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  return {
    trend: summarizeTrend(availableValues),
    available: availableValues.length > 0,
  }
}

function readDatabaseLatencyValue(
  snapshot: RuntimeDiagnosticsPayload,
  latencyKey: 'commandLatency' | 'connectionOpenLatency',
  valueKey: 'p95Ms' | 'p99Ms',
) {
  const latency = snapshot.database[latencyKey]
  if (!latency || latency.sampleCount <= 0) {
    return null
  }

  const value = latency[valueKey]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function summarizeAvailableTrend(
  snapshots: RuntimeDiagnosticsPayload[],
  latencyKey: 'commandLatency' | 'connectionOpenLatency',
  valueKey: 'p95Ms' | 'p99Ms',
) {
  const values = snapshots
    .map((snapshot) => readDatabaseLatencyValue(snapshot, latencyKey, valueKey))
    .filter((value): value is number => value !== null)

  return {
    trend: summarizeTrend(values),
    available: values.length > 0,
  }
}

function withDiagnosticsDbCommandP95(
  breakdown: RealBackendLatencyBreakdown,
  diagnostics: RuntimeDiagnosticsPayload[],
): RealBackendLatencyBreakdown {
  if (breakdown.dbCommandP95Ms !== null && breakdown.dbCommandP95Ms !== undefined) {
    return breakdown
  }

  const summary = buildDiagnosticsSnapshotSummary(diagnostics)
  if (!summary.dbCommandP95Available) {
    return breakdown
  }

  return {
    ...breakdown,
    dbCommandP95Ms: summary.dbCommandP95Ms.current,
    dbCommandP95Source: 'diagnostics.commandLatency.p95',
  }
}

export function buildDiagnosticsSnapshotSummary(snapshots: RuntimeDiagnosticsPayload[]): RuntimeDiagnosticsSummary {
  if (!snapshots.length) {
    return {
      sampleCount: 0,
      status: 'unavailable',
      memoryBytes: emptyTrend(),
      memoryLimitBytes: emptyTrend(),
      processorCount: emptyTrend(),
      cpuQuotaCores: emptyTrend(),
      memoryLimitAvailable: false,
      cpuQuotaAvailable: false,
      gcHeapBytes: emptyTrend(),
      gen2Collections: emptyTrend(),
      timeInGcPercent: emptyTrend(),
      threadPoolWorkerThreads: emptyTrend(),
      threadPoolQueueLength: emptyTrend(),
      threadPoolCompletedWorkItemCount: emptyTrend(),
      databaseLatencyMs: emptyTrend(),
      databaseTimeoutCount: emptyTrend(),
      dbCommandP95Ms: emptyTrend(),
      dbCommandP99Ms: emptyTrend(),
      dbConnectionOpenP95Ms: emptyTrend(),
      dbCommandP95Available: false,
      dbCommandP99Available: false,
      dbConnectionOpenP95Available: false,
      dbSlowQueryCount: emptyTrend(),
      dbErrorCount: emptyTrend(),
      dbOpenConnections: emptyTrend(),
      dbActiveConnections: emptyTrend(),
      dbIdleConnections: emptyTrend(),
      dbIdleInTransactionConnections: emptyTrend(),
      dbContextPoolSize: emptyTrend(),
      dbNpgsqlMinimumPoolSize: emptyTrend(),
      dbNpgsqlMaximumPoolSize: emptyTrend(),
      dbContextPoolAvailable: false,
      dbNpgsqlPoolConfigured: false,
    }
  }

  const dbCommandP95 = summarizeAvailableTrend(snapshots, 'commandLatency', 'p95Ms')
  const dbCommandP99 = summarizeAvailableTrend(snapshots, 'commandLatency', 'p99Ms')
  const dbConnectionOpenP95 = summarizeAvailableTrend(snapshots, 'connectionOpenLatency', 'p95Ms')
  const memoryLimit = summarizeOptionalTrend(snapshots.map((snapshot) => snapshot.process.memoryLimitBytes))
  const cpuQuota = summarizeOptionalTrend(snapshots.map((snapshot) => snapshot.process.cpuQuotaCores))
  const dbContextPoolSize = summarizeOptionalTrend(snapshots.map((snapshot) => snapshot.database.pool?.dbContextPoolSize))
  const dbNpgsqlMinimumPoolSize = summarizeOptionalTrend(snapshots.map((snapshot) => snapshot.database.pool?.npgsqlMinimumPoolSize))
  const dbNpgsqlMaximumPoolSize = summarizeOptionalTrend(snapshots.map((snapshot) => snapshot.database.pool?.npgsqlMaximumPoolSize))

  return {
    sampleCount: snapshots.length,
    status: 'available',
    memoryBytes: summarizeTrend(snapshots.map((snapshot) => snapshot.process.memoryBytes)),
    memoryLimitBytes: memoryLimit.trend,
    processorCount: summarizeTrend(snapshots.map((snapshot) => snapshot.process.processorCount)),
    cpuQuotaCores: cpuQuota.trend,
    memoryLimitAvailable: memoryLimit.available,
    cpuQuotaAvailable: cpuQuota.available,
    gcHeapBytes: summarizeTrend(snapshots.map((snapshot) => snapshot.gc.heapSizeBytes)),
    gen2Collections: summarizeTrend(snapshots.map((snapshot) => snapshot.gc.gen2Collections)),
    timeInGcPercent: summarizeTrend(snapshots.map((snapshot) => snapshot.gc.timeInGcPercent ?? 0)),
    threadPoolWorkerThreads: summarizeTrend(snapshots.map((snapshot) => snapshot.threadPool.workerThreads)),
    threadPoolQueueLength: summarizeTrend(snapshots.map((snapshot) => snapshot.threadPool.pendingWorkItemCount)),
    threadPoolCompletedWorkItemCount: summarizeTrend(snapshots.map((snapshot) => snapshot.threadPool.completedWorkItemCount ?? 0)),
    databaseLatencyMs: summarizeTrend(snapshots.map((snapshot) => snapshot.database.latencyMs ?? 0)),
    databaseTimeoutCount: summarizeTrend(snapshots.map((snapshot) => snapshot.database.timeoutCount)),
    dbCommandP95Ms: dbCommandP95.trend,
    dbCommandP99Ms: dbCommandP99.trend,
    dbConnectionOpenP95Ms: dbConnectionOpenP95.trend,
    dbCommandP95Available: dbCommandP95.available,
    dbCommandP99Available: dbCommandP99.available,
    dbConnectionOpenP95Available: dbConnectionOpenP95.available,
    dbSlowQueryCount: summarizeTrend(snapshots.map((snapshot) => snapshot.database.slowQueryCount ?? 0)),
    dbErrorCount: summarizeTrend(snapshots.map((snapshot) => snapshot.database.errorCount ?? 0)),
    dbOpenConnections: summarizeTrend(snapshots.map((snapshot) => snapshot.database.openConnections ?? 0)),
    dbActiveConnections: summarizeTrend(snapshots.map((snapshot) => snapshot.database.activeConnections ?? 0)),
    dbIdleConnections: summarizeTrend(snapshots.map((snapshot) => snapshot.database.idleConnections ?? 0)),
    dbIdleInTransactionConnections: summarizeTrend(snapshots.map((snapshot) => snapshot.database.idleInTransactionConnections ?? 0)),
    dbContextPoolSize: dbContextPoolSize.trend,
    dbNpgsqlMinimumPoolSize: dbNpgsqlMinimumPoolSize.trend,
    dbNpgsqlMaximumPoolSize: dbNpgsqlMaximumPoolSize.trend,
    dbContextPoolAvailable: dbContextPoolSize.available,
    dbNpgsqlPoolConfigured: dbNpgsqlMaximumPoolSize.available,
  }
}

export function evaluateRuntimeDiagnosticsHealth(summaryOrSnapshots: RuntimeDiagnosticsSummary | RuntimeDiagnosticsPayload[]): LoadTestHealth {
  const summary = Array.isArray(summaryOrSnapshots)
    ? buildDiagnosticsSnapshotSummary(summaryOrSnapshots)
    : summaryOrSnapshots

  if (summary.sampleCount === 0 || summary.status === 'unavailable') {
    return { status: 'unavailable', reason: 'Runtime diagnostics have not been collected yet.' }
  }

  if (
    summary.databaseTimeoutCount.current > 0
    || summary.dbErrorCount.current >= LOAD_TEST_THRESHOLDS.database.redErrorCount
    || summary.threadPoolQueueLength.delta >= LOAD_TEST_THRESHOLDS.runtime.redThreadPoolQueueDelta
    || summary.gen2Collections.delta >= LOAD_TEST_THRESHOLDS.runtime.redGen2Delta
    || summary.timeInGcPercent.current >= LOAD_TEST_THRESHOLDS.runtime.redTimeInGcPercent
    || summary.memoryBytes.delta >= LOAD_TEST_THRESHOLDS.runtime.redMemoryGrowthBytes
    || summary.databaseLatencyMs.current >= LOAD_TEST_THRESHOLDS.database.redLatencyMs
  ) {
    return { status: 'red', reason: 'Runtime or DB pressure crossed a red threshold.' }
  }

  if (
    summary.gen2Collections.delta >= LOAD_TEST_THRESHOLDS.runtime.yellowGen2Delta
    || summary.timeInGcPercent.current >= LOAD_TEST_THRESHOLDS.runtime.yellowTimeInGcPercent
    || summary.memoryBytes.delta >= LOAD_TEST_THRESHOLDS.runtime.yellowMemoryGrowthBytes
    || summary.databaseLatencyMs.current >= LOAD_TEST_THRESHOLDS.database.yellowLatencyMs
  ) {
    return { status: 'yellow', reason: 'Runtime or DB pressure needs review.' }
  }

  return { status: 'green', reason: 'Runtime and DB diagnostics are within the initial target.' }
}
