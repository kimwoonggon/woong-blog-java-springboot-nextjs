"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, Gauge, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DEFAULT_LOAD_TEST_CONFIG,
  DEFAULT_REAL_BACKEND_TEST_CONFIG,
  appendLoadTestCacheBust,
  buildRealBackendStartPayload,
  buildDiagnosticsSnapshotSummary,
  buildSoakUserTimeline,
  buildSpikeUserTimeline,
  buildUserSteps,
  describeRealBackendExecutionProfile,
  estimatePatternRequestCount,
  evaluateHttpScenarioHealth,
  evaluateRuntimeDiagnosticsHealth,
  isRuntimeDiagnosticsPayload,
  MAX_CONCURRENCY,
  MAX_USERS,
  runWithConcurrency,
  sanitizeRealBackendTestConfig,
  sanitizeLoadTestConfig,
  summarizeRealBackendRunSnapshot,
  summarizeLoadTestSamples,
  type LoadTestConfig,
  type LoadTestHealthStatus,
  type LoadTestSample,
  type LoadTestScenarioResult,
  type LoadTestTarget,
  type RealBackendRunSnapshot,
  type RealBackendTestConfig,
  type RuntimeDiagnosticsPayload,
  type RuntimeMetricTrend,
} from '@/lib/load-test-dashboard'
import { fetchWithCsrf } from '@/lib/api/auth'

type LoadTestDashboardProps = {
  targets: LoadTestTarget[]
  targetLoadWarning?: string | null
}

type LoadTestStatus = {
  phase: 'idle' | 'running' | 'completed' | 'stopped'
  currentLabel: string
  completedRequests: number
  totalRequests: number
  currentInFlight: number
  peakInFlight: number
  elapsedMs: number
}

type RuntimeMetricRow = {
  label: string
  trend: RuntimeMetricTrend
  metric: 'bytes' | 'number' | 'ms' | 'percent'
  available?: boolean
}

type RealBackendRunPhase = 'idle' | 'starting' | 'running' | 'stopping' | 'completed' | 'stopped' | 'failed'

const numberFormatter = new Intl.NumberFormat('en-US')

function scenarioResultKey(result: Pick<LoadTestScenarioResult, 'targetId' | 'userCount'>) {
  return `${result.targetId}:${result.userCount}`
}

function upsertScenarioResult(
  current: LoadTestScenarioResult[],
  nextResult: LoadTestScenarioResult,
) {
  const nextKey = scenarioResultKey(nextResult)
  const existingIndex = current.findIndex((result) => scenarioResultKey(result) === nextKey)

  if (existingIndex === -1) {
    return [...current, nextResult]
  }

  return current.map((result, index) => index === existingIndex ? nextResult : result)
}

function formatMs(value: number) {
  return `${numberFormatter.format(value)} ms`
}

function formatPercent(value: number) {
  return `${numberFormatter.format(value)}%`
}

function formatDurationMs(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function formatScenarioState(state: LoadTestScenarioResult['state']) {
  if (state === 'running') {
    return 'Running'
  }

  if (state === 'stopped') {
    return 'Stopped'
  }

  return 'Completed'
}

function formatRealBackendPhase(phase: RealBackendRunPhase) {
  if (phase === 'starting') {
    return 'Starting'
  }

  if (phase === 'running') {
    return 'Running'
  }

  if (phase === 'stopping') {
    return 'Stopping'
  }

  if (phase === 'completed') {
    return 'Completed'
  }

  if (phase === 'stopped') {
    return 'Stopped'
  }

  if (phase === 'failed') {
    return 'Failed'
  }

  return 'Idle'
}

function normalizeRealBackendPhase(rawStatus: string, fallback: RealBackendRunPhase): RealBackendRunPhase {
  const normalized = rawStatus.trim().toLowerCase()

  if (normalized.includes('fail') || normalized.includes('error')) {
    return 'failed'
  }

  if (normalized.includes('stop') || normalized.includes('cancel')) {
    return 'stopped'
  }

  if (normalized.includes('complete') || normalized.includes('success') || normalized.includes('finish')) {
    return 'completed'
  }

  if (normalized.includes('queue')) {
    return 'starting'
  }

  if (normalized.includes('run') || normalized.includes('start') || normalized.includes('progress')) {
    return 'running'
  }

  return fallback
}

function inputNumberValue(value: string) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function formatBytes(value: number) {
  if (!value) {
    return '0 B'
  }

  const units = ['B', 'KiB', 'MiB', 'GiB']
  let unitIndex = 0
  let scaled = value

  while (scaled >= 1024 && unitIndex < units.length - 1) {
    scaled /= 1024
    unitIndex += 1
  }

  return `${numberFormatter.format(Math.round(scaled * 10) / 10)} ${units[unitIndex]}`
}

function formatTrendValue(metric: 'bytes' | 'number' | 'ms' | 'percent', value: number) {
  if (metric === 'bytes') {
    return formatBytes(value)
  }

  if (metric === 'ms') {
    return formatMs(value)
  }

  if (metric === 'percent') {
    return formatPercent(value)
  }

  return numberFormatter.format(value)
}

function formatMetricRowValue(row: RuntimeMetricRow, value: number) {
  return row.available === false ? 'unavailable' : formatTrendValue(row.metric, value)
}

function formatMetricRowTrend(row: RuntimeMetricRow) {
  if (row.available === false) {
    return 'peak unavailable · delta unavailable'
  }

  return `peak ${formatTrendValue(row.metric, row.trend.peak)} · delta ${formatTrendValue(row.metric, row.trend.delta)}`
}

function formatTimingSource(source?: string | null) {
  return source ? ` · ${source}` : ''
}

function statusClassName(status: LoadTestHealthStatus) {
  if (status === 'green') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100'
  }

  if (status === 'yellow') {
    return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100'
  }

  if (status === 'red') {
    return 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100'
  }

  return 'border-border bg-muted/40 text-muted-foreground'
}

function realBackendPhaseClassName(phase: RealBackendRunPhase) {
  if (phase === 'failed') {
    return statusClassName('red')
  }

  if (phase === 'running' || phase === 'starting' || phase === 'stopping') {
    return statusClassName('yellow')
  }

  if (phase === 'completed') {
    return statusClassName('green')
  }

  return statusClassName('unavailable')
}

async function measureLoadTestRequest(
  target: LoadTestTarget,
  runId: string,
  requestIndex: number,
  userCount: number,
  timeoutMs: number,
  registerController: (controller: AbortController) => void,
  unregisterController: (controller: AbortController) => void,
): Promise<LoadTestSample> {
  const controller = new AbortController()
  const started = performance.now()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  registerController(controller)

  try {
    const response = await fetch(appendLoadTestCacheBust(target.path, runId, requestIndex, userCount), {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    })
    await response.text()

    return {
      ok: response.ok,
      status: response.status,
      durationMs: performance.now() - started,
    }
  } catch (error) {
    return {
      ok: false,
      durationMs: performance.now() - started,
      error: error instanceof Error ? error.message : 'Request failed',
    }
  } finally {
    window.clearTimeout(timeout)
    unregisterController(controller)
  }
}

export function LoadTestDashboard({ targets, targetLoadWarning }: LoadTestDashboardProps) {
  const [config, setConfig] = useState<LoadTestConfig>(DEFAULT_LOAD_TEST_CONFIG)
  const [realBackendConfig, setRealBackendConfig] = useState<RealBackendTestConfig>(DEFAULT_REAL_BACKEND_TEST_CONFIG)
  const [realBackendRunId, setRealBackendRunId] = useState<string | null>(null)
  const [realBackendPhase, setRealBackendPhase] = useState<RealBackendRunPhase>('idle')
  const [realBackendSnapshot, setRealBackendSnapshot] = useState<RealBackendRunSnapshot | null>(null)
  const [realBackendError, setRealBackendError] = useState<string | null>(null)
  const [editableTargets, setEditableTargets] = useState<LoadTestTarget[]>(targets)
  const [results, setResults] = useState<LoadTestScenarioResult[]>([])
  const [diagnosticsSamples, setDiagnosticsSamples] = useState<RuntimeDiagnosticsPayload[]>([])
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null)
  const [status, setStatus] = useState<LoadTestStatus>({
    phase: 'idle',
    currentLabel: '',
    completedRequests: 0,
    totalRequests: 0,
    currentInFlight: 0,
    peakInFlight: 0,
    elapsedMs: 0,
  })
  const cancelledRef = useRef(false)
  const controllersRef = useRef(new Set<AbortController>())
  const realBackendPollTimerRef = useRef<number | null>(null)
  const runStartedAtRef = useRef<number | null>(null)
  const inFlightRef = useRef(0)
  const peakInFlightRef = useRef(0)

  const safeConfig = useMemo(() => sanitizeLoadTestConfig(config), [config])
  const safeRealBackendConfig = useMemo(() => sanitizeRealBackendTestConfig(realBackendConfig), [realBackendConfig])
  const realBackendExecutionProfile = useMemo(
    () => describeRealBackendExecutionProfile(safeRealBackendConfig),
    [safeRealBackendConfig],
  )
  const userSteps = useMemo(() => buildUserSteps(safeConfig), [safeConfig])
  const runnableTargets = useMemo(
    () => editableTargets
      .map((target) => ({ ...target, path: target.path.trim() }))
      .filter((target) => target.path.length > 0),
    [editableTargets],
  )
  const requestCountPerTarget = useMemo(() => estimatePatternRequestCount(safeConfig), [safeConfig])
  const totalPlannedRequests = useMemo(() => runnableTargets.length * requestCountPerTarget, [requestCountPerTarget, runnableTargets.length])
  const plannedScenarioCount = useMemo(
    () => (safeConfig.pattern === 'step' ? userSteps.length * runnableTargets.length : runnableTargets.length),
    [safeConfig.pattern, runnableTargets.length, userSteps.length],
  )
  const latestResult = results.at(-1)
  const realBackendDiagnosticsSamples = realBackendSnapshot?.diagnostics ?? []
  const effectiveDiagnosticsSamples = diagnosticsSamples.length ? diagnosticsSamples : realBackendDiagnosticsSamples
  const latestDiagnosticsSample = effectiveDiagnosticsSamples.at(-1)
  const latestHttpHealth = latestResult ? evaluateHttpScenarioHealth(latestResult) : { status: 'unavailable' as const, reason: 'No HTTP result yet.' }
  const diagnosticsSummary = useMemo(() => buildDiagnosticsSnapshotSummary(effectiveDiagnosticsSamples), [effectiveDiagnosticsSamples])
  const runtimeHealth = useMemo(() => evaluateRuntimeDiagnosticsHealth(diagnosticsSummary), [diagnosticsSummary])
  const runtimeMetricRows: RuntimeMetricRow[] = useMemo(() => [
    { label: 'Memory', trend: diagnosticsSummary.memoryBytes, metric: 'bytes' },
    { label: 'Memory limit', trend: diagnosticsSummary.memoryLimitBytes, metric: 'bytes', available: diagnosticsSummary.memoryLimitAvailable },
    { label: 'CPU visible', trend: diagnosticsSummary.processorCount, metric: 'number' },
    { label: 'CPU quota', trend: diagnosticsSummary.cpuQuotaCores, metric: 'number', available: diagnosticsSummary.cpuQuotaAvailable },
    { label: 'GC heap', trend: diagnosticsSummary.gcHeapBytes, metric: 'bytes' },
    { label: 'Gen2 GC', trend: diagnosticsSummary.gen2Collections, metric: 'number' },
    { label: 'Time in GC', trend: diagnosticsSummary.timeInGcPercent, metric: 'percent' },
    { label: 'ThreadPool workers', trend: diagnosticsSummary.threadPoolWorkerThreads, metric: 'number' },
    { label: 'ThreadPool queue', trend: diagnosticsSummary.threadPoolQueueLength, metric: 'number' },
    { label: 'ThreadPool completed', trend: diagnosticsSummary.threadPoolCompletedWorkItemCount, metric: 'number' },
    { label: 'DB latency', trend: diagnosticsSummary.databaseLatencyMs, metric: 'ms' },
    { label: 'DB timeouts', trend: diagnosticsSummary.databaseTimeoutCount, metric: 'number' },
  ], [diagnosticsSummary])
  const databaseMetricRows: RuntimeMetricRow[] = useMemo(() => [
    { label: 'DB command P95', trend: diagnosticsSummary.dbCommandP95Ms, metric: 'ms', available: diagnosticsSummary.dbCommandP95Available },
    { label: 'DB command P99', trend: diagnosticsSummary.dbCommandP99Ms, metric: 'ms', available: diagnosticsSummary.dbCommandP99Available },
    { label: 'DB connection open P95', trend: diagnosticsSummary.dbConnectionOpenP95Ms, metric: 'ms', available: diagnosticsSummary.dbConnectionOpenP95Available },
    { label: 'Slow queries', trend: diagnosticsSummary.dbSlowQueryCount, metric: 'number' },
    { label: 'DB errors', trend: diagnosticsSummary.dbErrorCount, metric: 'number' },
    { label: 'DbContext pool', trend: diagnosticsSummary.dbContextPoolSize, metric: 'number', available: diagnosticsSummary.dbContextPoolAvailable },
    { label: 'Npgsql min pool', trend: diagnosticsSummary.dbNpgsqlMinimumPoolSize, metric: 'number', available: diagnosticsSummary.dbNpgsqlPoolConfigured },
    { label: 'Npgsql max pool', trend: diagnosticsSummary.dbNpgsqlMaximumPoolSize, metric: 'number', available: diagnosticsSummary.dbNpgsqlPoolConfigured },
    { label: 'Open connections', trend: diagnosticsSummary.dbOpenConnections, metric: 'number' },
    { label: 'Active connections', trend: diagnosticsSummary.dbActiveConnections, metric: 'number' },
    { label: 'Idle connections', trend: diagnosticsSummary.dbIdleConnections, metric: 'number' },
    { label: 'Idle in transaction', trend: diagnosticsSummary.dbIdleInTransactionConnections, metric: 'number' },
  ], [diagnosticsSummary])
  const avgP95 = results.length
    ? results.reduce((sum, result) => sum + result.p95Ms, 0) / results.length
    : 0
  const totalFailures = results.reduce((sum, result) => sum + result.failureCount, 0)
  const totalHttp5xx = results.reduce((sum, result) => sum + result.http5xxCount, 0)
  const totalStatus429 = results.reduce((sum, result) => sum + result.status429Count, 0)
  const totalStatus503 = results.reduce((sum, result) => sum + result.status503Count, 0)
  const totalTimeouts = results.reduce((sum, result) => sum + result.timeoutCount, 0)
  const totalAborts = results.reduce((sum, result) => sum + result.abortedCount, 0)
  const latestDatabaseStatus = latestDiagnosticsSample?.database.status ?? 'unavailable'
  const latestDatabasePool = latestDiagnosticsSample?.database.pool
  const databasePoolSummary = latestDatabasePool
    ? `DB connection counts are estimated from pg_stat_activity. DbContext pool ${numberFormatter.format(latestDatabasePool.dbContextPoolSize)} · Npgsql max ${latestDatabasePool.npgsqlMaximumPoolSize === null ? 'unavailable' : numberFormatter.format(latestDatabasePool.npgsqlMaximumPoolSize)} · source ${latestDatabasePool.npgsqlPoolLimitSource}.`
    : 'DB connection counts are estimated from pg_stat_activity. Npgsql pool settings are read from the running backend configuration.'
  const realBackendStatusText = realBackendSnapshot?.status ?? formatRealBackendPhase(realBackendPhase)
  const realBackendLatencyBreakdown = realBackendSnapshot?.latencyBreakdown
  const realBackendDbCommandP95Ms = realBackendLatencyBreakdown?.dbCommandP95Ms
    ?? (diagnosticsSummary.dbCommandP95Available ? diagnosticsSummary.dbCommandP95Ms.current : null)
  const realBackendDbCommandP95Source = realBackendLatencyBreakdown?.dbCommandP95Source
    ?? (diagnosticsSummary.dbCommandP95Available ? 'diagnostics.commandLatency.p95' : null)
  const realBackendHttpCounts = realBackendSnapshot?.httpCounts
  const realBackendTargetMetrics = realBackendSnapshot?.targetMetrics ?? []
  const realBackendMetricsPending = realBackendSnapshot?.metricsPending
    ?? (!!realBackendRunId && (realBackendPhase === 'starting' || realBackendPhase === 'running'))
  const diagnosticsSamplingActive = status.phase === 'running'
    || realBackendPhase === 'starting'
    || realBackendPhase === 'running'
    || realBackendPhase === 'stopping'
  const realBackendPayload = useMemo(
    () => buildRealBackendStartPayload(safeRealBackendConfig, runnableTargets),
    [runnableTargets, safeRealBackendConfig],
  )

  function updateNumberField(field: keyof LoadTestConfig, value: string) {
    setConfig((current) => sanitizeLoadTestConfig({
      ...current,
      [field]: inputNumberValue(value),
    }))
  }

  function updatePattern(value: string) {
    setConfig((current) => sanitizeLoadTestConfig({
      ...current,
      pattern: value === 'soak' || value === 'spike' ? value : 'step',
    }))
  }

  function updateTargetPath(targetId: string, value: string) {
    setEditableTargets((current) => current.map((target) => target.id === targetId ? { ...target, path: value } : target))
  }

  function updateRealBackendTextField(field: 'scenario' | 'target' | 'runner', value: string) {
    setRealBackendConfig((current) => sanitizeRealBackendTestConfig({
      ...current,
      [field]: value,
    }))
  }

  function updateRealBackendNumberField(field: 'rate' | 'peakRate' | 'durationSeconds' | 'maxVUs' | 'startVUs', value: string) {
    setRealBackendConfig((current) => sanitizeRealBackendTestConfig({
      ...current,
      [field]: inputNumberValue(value),
    }))
  }

  function clearRealBackendPollingTimer() {
    if (realBackendPollTimerRef.current !== null) {
      window.clearTimeout(realBackendPollTimerRef.current)
      realBackendPollTimerRef.current = null
    }
  }

  function registerController(controller: AbortController) {
    controllersRef.current.add(controller)
  }

  function unregisterController(controller: AbortController) {
    controllersRef.current.delete(controller)
  }

  function handleInFlightChange(inFlight: number) {
    inFlightRef.current = inFlight
    peakInFlightRef.current = Math.max(peakInFlightRef.current, inFlight)
  }

  function syncRunStatus(extra: Partial<LoadTestStatus> = {}) {
    setStatus((current) => {
      const elapsedMs = runStartedAtRef.current === null
        ? current.elapsedMs
        : performance.now() - runStartedAtRef.current

      return {
        ...current,
        ...extra,
        currentInFlight: inFlightRef.current,
        peakInFlight: peakInFlightRef.current,
        elapsedMs,
      }
    })
  }

  function resolveRealBackendRunId(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      return null
    }

    const asRunId = (value: unknown) => {
      if (typeof value === 'string' && value.trim().length) {
        return value
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value)
      }
      return null
    }

    const record = payload as Record<string, unknown>
    const directRunId = asRunId(record.runId) ?? asRunId(record.id)
    if (directRunId) {
      return directRunId
    }
    if (record.run && typeof record.run === 'object' && record.run !== null) {
      const nested = record.run as Record<string, unknown>
      const nestedRunId = asRunId(nested.id) ?? asRunId(nested.runId)
      if (nestedRunId) {
        return nestedRunId
      }
    }

    return null
  }

  function resolveRealBackendStatus(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      return null
    }

    const record = payload as Record<string, unknown>
    const directStatus = typeof record.status === 'string' && record.status.trim().length ? record.status : null
    if (directStatus) {
      return directStatus
    }

    if (record.run && typeof record.run === 'object' && record.run !== null) {
      const nested = record.run as Record<string, unknown>
      return typeof nested.status === 'string' && nested.status.trim().length ? nested.status : null
    }

    return null
  }

  async function pollRealBackendRun(currentRunId: string) {
    try {
      const [statusResponse, metricsResponse] = await Promise.all([
        fetch(`/api/admin/load-tests/real/${encodeURIComponent(currentRunId)}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        }),
        fetch(`/api/admin/load-tests/real/${encodeURIComponent(currentRunId)}/metrics`, {
          cache: 'no-store',
          credentials: 'same-origin',
        }),
      ])

      const statusPayload: unknown = statusResponse.ok ? await statusResponse.json() : null
      const metricsPayload: unknown = metricsResponse.ok ? await metricsResponse.json() : null

      if (!statusResponse.ok && !metricsResponse.ok) {
        throw new Error(`Real backend run poll failed (${statusResponse.status}/${metricsResponse.status})`)
      }

      const snapshot = summarizeRealBackendRunSnapshot(currentRunId, statusPayload, metricsPayload)
      setRealBackendSnapshot(snapshot)
      setRealBackendError(null)

      const nextPhase = normalizeRealBackendPhase(snapshot.status, 'running')
      setRealBackendPhase(nextPhase)
      if (nextPhase === 'completed' || nextPhase === 'stopped' || nextPhase === 'failed') {
        clearRealBackendPollingTimer()
        return
      }

      clearRealBackendPollingTimer()
      realBackendPollTimerRef.current = window.setTimeout(() => {
        void pollRealBackendRun(currentRunId)
      }, 1500)
    } catch (error) {
      clearRealBackendPollingTimer()
      setRealBackendPhase('failed')
      setRealBackendError(error instanceof Error ? error.message : 'Real backend run polling failed')
    }
  }

  async function startRealBackendTest() {
    if (realBackendPhase === 'starting' || realBackendPhase === 'running' || realBackendPhase === 'stopping') {
      return
    }

    const nextConfig = safeRealBackendConfig
    const nextPayload = realBackendPayload
    setRealBackendConfig(nextConfig)
    setRealBackendError(null)
    setRealBackendPhase('starting')
    setRealBackendSnapshot(null)
    setRealBackendRunId(null)
    setDiagnosticsSamples([])
    setDiagnosticsError(null)
    clearRealBackendPollingTimer()

    try {
      const response = await fetchWithCsrf('/api/admin/load-tests/real/start', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(nextPayload),
      })

      if (!response.ok) {
        throw new Error(`Real backend start failed with ${response.status}`)
      }

      const payload: unknown = await response.json()
      const runId = resolveRealBackendRunId(payload)
      if (!runId) {
        throw new Error('Real backend start response did not include runId')
      }

      setRealBackendRunId(runId)
      const initialStatus = resolveRealBackendStatus(payload) ?? 'running'
      const initialSnapshot = summarizeRealBackendRunSnapshot(runId, payload, null)
      setRealBackendSnapshot(initialSnapshot)
      setRealBackendPhase(normalizeRealBackendPhase(initialStatus, 'starting'))
      if (initialSnapshot.status === 'completed' || initialSnapshot.status === 'failed' || initialSnapshot.status === 'stopped') {
        return
      }

      void pollRealBackendRun(runId)
    } catch (error) {
      setRealBackendPhase('failed')
      setRealBackendError(error instanceof Error ? error.message : 'Real backend test start failed')
    }
  }

  async function stopRealBackendTest() {
    if (!realBackendRunId || (realBackendPhase !== 'running' && realBackendPhase !== 'starting')) {
      return
    }

    setRealBackendPhase('stopping')
    setRealBackendError(null)
    clearRealBackendPollingTimer()

    try {
      const response = await fetchWithCsrf(`/api/admin/load-tests/real/${encodeURIComponent(realBackendRunId)}/stop`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`Real backend stop failed with ${response.status}`)
      }

      void pollRealBackendRun(realBackendRunId)
    } catch (error) {
      setRealBackendPhase('failed')
      setRealBackendError(error instanceof Error ? error.message : 'Real backend test stop failed')
    }
  }

  async function collectDiagnosticsSample() {
    try {
      const response = await fetch('/api/admin/load-test/diagnostics', {
        cache: 'no-store',
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error(`Diagnostics request failed with ${response.status}`)
      }

      const payload: unknown = await response.json()
      if (!isRuntimeDiagnosticsPayload(payload)) {
        throw new Error('Diagnostics payload shape is unsupported')
      }

      setDiagnosticsError(null)
      setDiagnosticsSamples((current) => [...current.slice(-59), payload])
    } catch (error) {
      setDiagnosticsError(error instanceof Error ? error.message : 'Diagnostics unavailable')
    }
  }

  useEffect(() => {
    if (!diagnosticsSamplingActive) {
      return undefined
    }

    void collectDiagnosticsSample()
    const interval = window.setInterval(() => {
      void collectDiagnosticsSample()
    }, 1000)

    return () => window.clearInterval(interval)
  }, [diagnosticsSamplingActive])

  useEffect(() => () => {
    if (realBackendPollTimerRef.current !== null) {
      window.clearTimeout(realBackendPollTimerRef.current)
      realBackendPollTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (status.phase !== 'running') {
      return undefined
    }

    const interval = window.setInterval(() => {
      syncRunStatus()
    }, 250)

    return () => window.clearInterval(interval)
  }, [status.phase])

  async function runScenario(
    target: LoadTestTarget,
    runId: string,
    timelineUsers: number[],
    displayUserCount: number,
    baseCompletedRequests: number,
  ) {
    const requestCount = timelineUsers.reduce((sum, users) => sum + (users * safeConfig.requestsPerUser), 0)
    const samples: LoadTestSample[] = []
    let nextRequestIndex = 0
    let scenarioCompletedRequests = 0

    function publishScenarioResult(state: NonNullable<LoadTestScenarioResult['state']>) {
      const result = {
        ...summarizeLoadTestSamples(target, displayUserCount, samples),
        plannedRequestCount: requestCount,
        state,
      }
      setResults((current) => upsertScenarioResult(current, result))
      return result
    }

    publishScenarioResult('running')

    for (const [timelineIndex, userCount] of timelineUsers.entries()) {
      if (cancelledRef.current) {
        break
      }

      const tickStarted = performance.now()
      const batchRequestCount = userCount * safeConfig.requestsPerUser
      const tasks = Array.from({ length: batchRequestCount }, () => {
        const requestIndex = nextRequestIndex
        nextRequestIndex += 1
        return () => measureLoadTestRequest(
          target,
          runId,
          requestIndex,
          userCount,
          safeConfig.timeoutMs,
          registerController,
          unregisterController,
        )
      })

      const batchSamples = await runWithConcurrency(tasks, safeConfig.concurrency, {
        onInFlightChange: handleInFlightChange,
      })
      samples.push(...batchSamples)
      scenarioCompletedRequests += batchSamples.length

      syncRunStatus({
        completedRequests: baseCompletedRequests + scenarioCompletedRequests,
        currentLabel: `${target.label} · ${numberFormatter.format(userCount)} users`,
      })
      publishScenarioResult(cancelledRef.current ? 'stopped' : 'running')

      if (timelineUsers.length > 1 && timelineIndex < timelineUsers.length - 1) {
        const elapsedMs = performance.now() - tickStarted
        const delayMs = Math.max(0, 1000 - elapsedMs)
        if (delayMs > 0) {
          await new Promise((resolve) => {
            window.setTimeout(resolve, delayMs)
          })
        }
      }
    }

    syncRunStatus({
      completedRequests: baseCompletedRequests + scenarioCompletedRequests,
    })
    return publishScenarioResult(cancelledRef.current ? 'stopped' : 'completed')
  }

  async function runLoadTest() {
    if (!runnableTargets.length || status.phase === 'running') {
      return
    }

    cancelledRef.current = false
    inFlightRef.current = 0
    peakInFlightRef.current = 0
    runStartedAtRef.current = performance.now()
    const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    setResults([])
    setDiagnosticsSamples([])
    setDiagnosticsError(null)
    setStatus({
      phase: 'running',
      currentLabel: 'Starting',
      completedRequests: 0,
      totalRequests: totalPlannedRequests,
      currentInFlight: 0,
      peakInFlight: 0,
      elapsedMs: 0,
    })

    let completedRequests = 0

    for (const target of runnableTargets) {
      if (cancelledRef.current) {
        syncRunStatus({ phase: 'stopped', currentLabel: 'Stopped', completedRequests })
        runStartedAtRef.current = null
        return
      }

      if (safeConfig.pattern === 'step') {
        for (const userCount of userSteps) {
          if (cancelledRef.current) {
            syncRunStatus({ phase: 'stopped', currentLabel: 'Stopped', completedRequests })
            runStartedAtRef.current = null
            return
          }

          syncRunStatus({
            currentLabel: `${target.label} · ${numberFormatter.format(userCount)} users`,
            completedRequests,
          })

          const result = await runScenario(target, runId, [userCount], userCount, completedRequests)
          completedRequests += result.requestCount
          setResults((current) => upsertScenarioResult(current, result))
          syncRunStatus({ completedRequests })
        }
        continue
      }

      const timelineUsers = safeConfig.pattern === 'soak'
        ? buildSoakUserTimeline(safeConfig)
        : buildSpikeUserTimeline(safeConfig)

      syncRunStatus({
        currentLabel: `${target.label} · ${numberFormatter.format(timelineUsers[0] ?? safeConfig.maxUsers)} users`,
        completedRequests,
      })

      const result = await runScenario(target, runId, timelineUsers, safeConfig.maxUsers, completedRequests)
      completedRequests += result.requestCount
      setResults((current) => upsertScenarioResult(current, result))
      syncRunStatus({ completedRequests })

      if (cancelledRef.current) {
        syncRunStatus({ phase: 'stopped', currentLabel: 'Stopped', completedRequests })
        runStartedAtRef.current = null
        return
      }
    }

    syncRunStatus({ phase: 'completed', currentLabel: 'Completed', completedRequests })
    runStartedAtRef.current = null
    await collectDiagnosticsSample()
  }

  function stopLoadTest() {
    cancelledRef.current = true
    controllersRef.current.forEach((controller) => controller.abort())
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Load Test Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Measure synthetic HTTP read latency while sampling backend runtime and DB pressure.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="gap-2"
            disabled={status.phase === 'running' || !runnableTargets.length}
            onClick={() => void runLoadTest()}
          >
            <Play aria-hidden="true" size={16} />
            Run load test
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={status.phase !== 'running'}
            onClick={stopLoadTest}
          >
            <Square aria-hidden="true" size={16} />
            Stop
          </Button>
        </div>
      </div>

      {targetLoadWarning ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{targetLoadWarning}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge aria-hidden="true" size={18} />
              Scenario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="load-test-pattern">Load pattern</Label>
                <select
                  id="load-test-pattern"
                  aria-label="Load pattern"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={safeConfig.pattern}
                  onChange={(event) => updatePattern(event.target.value)}
                >
                  <option value="step">Step</option>
                  <option value="soak">Soak</option>
                  <option value="spike">Spike</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="load-test-start-users">Start users</Label>
                <Input
                  id="load-test-start-users"
                  type="number"
                  min={1}
                  max={MAX_USERS}
                  value={safeConfig.startUsers}
                  onChange={(event) => updateNumberField('startUsers', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="load-test-max-users">Max users</Label>
                <Input
                  id="load-test-max-users"
                  type="number"
                  min={1}
                  max={MAX_USERS}
                  value={safeConfig.maxUsers}
                  onChange={(event) => updateNumberField('maxUsers', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="load-test-step-users">Step users</Label>
                <Input
                  id="load-test-step-users"
                  type="number"
                  min={1}
                  max={MAX_USERS}
                  value={safeConfig.stepUsers}
                  onChange={(event) => updateNumberField('stepUsers', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="load-test-requests-per-user">Requests per user</Label>
                <Input
                  id="load-test-requests-per-user"
                  type="number"
                  min={1}
                  max={5}
                  value={safeConfig.requestsPerUser}
                  onChange={(event) => updateNumberField('requestsPerUser', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="load-test-concurrency">Concurrency</Label>
                <Input
                  id="load-test-concurrency"
                  type="number"
                  min={1}
                  max={MAX_CONCURRENCY}
                  value={safeConfig.concurrency}
                  onChange={(event) => updateNumberField('concurrency', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="load-test-timeout-ms">Timeout ms</Label>
                <Input
                  id="load-test-timeout-ms"
                  type="number"
                  min={1000}
                  max={60000}
                  value={safeConfig.timeoutMs}
                  onChange={(event) => updateNumberField('timeoutMs', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="load-test-soak-duration">Soak seconds</Label>
                <Input
                  id="load-test-soak-duration"
                  type="number"
                  min={10}
                  max={3600}
                  value={safeConfig.soakDurationSeconds}
                  onChange={(event) => updateNumberField('soakDurationSeconds', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="load-test-spike-ramp">Spike ramp seconds</Label>
                <Input
                  id="load-test-spike-ramp"
                  type="number"
                  min={10}
                  max={3600}
                  value={safeConfig.spikeRampSeconds}
                  onChange={(event) => updateNumberField('spikeRampSeconds', event.target.value)}
                />
              </div>
            </div>
            <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Concurrency limits max in-flight HTTP requests. It does not represent real connected users or real-time connections.
            </div>
            {safeConfig.concurrency >= 500 ? (
              <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                High concurrency is browser-generated HTTP load. Actual backend concurrency can be lower due to browser, nginx, ASP.NET Core, ThreadPool, and DB pool limits.
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {editableTargets.map((target) => (
                <div key={target.id} className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{target.label}</p>
                    <span className="rounded-md bg-background px-2 py-1 text-xs font-medium uppercase text-muted-foreground">
                      {target.group}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <Label htmlFor={`load-test-target-${target.id}`} className="text-xs text-muted-foreground">
                      {target.label} URL
                    </Label>
                    <Input
                      id={`load-test-target-${target.id}`}
                      value={target.path}
                      onChange={(event) => updateTargetPath(target.id, event.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity aria-hidden="true" size={18} />
              Run Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Current</p>
              <p className="mt-1 min-h-6 font-medium text-foreground" data-testid="load-test-live-status">
                {status.phase} · {status.currentLabel || 'Idle'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Requests</p>
              <p className="mt-1 font-medium text-foreground">
                {numberFormatter.format(status.completedRequests)} / {numberFormatter.format(status.totalRequests || totalPlannedRequests)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pattern</p>
              <p className="mt-1 font-medium text-foreground">{safeConfig.pattern}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Concurrency</p>
              <p className="mt-1 font-medium text-foreground">
                configured {numberFormatter.format(safeConfig.concurrency)} · observed peak {numberFormatter.format(status.peakInFlight)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                in-flight now {numberFormatter.format(status.currentInFlight)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Elapsed</p>
              <p className="mt-1 font-medium text-foreground">{formatDurationMs(status.elapsedMs)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Planned scenarios</p>
              <p className="mt-1 font-medium text-foreground">
                {numberFormatter.format(plannedScenarioCount)} scenarios · {numberFormatter.format(totalPlannedRequests)} requests
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {safeConfig.pattern === 'soak'
                  ? `Soak repeats requests for ${numberFormatter.format(safeConfig.soakDurationSeconds)} seconds at ${numberFormatter.format(safeConfig.maxUsers)} users.`
                  : safeConfig.pattern === 'spike'
                    ? `Spike ramps from ${numberFormatter.format(safeConfig.startUsers)} to ${numberFormatter.format(safeConfig.maxUsers)} users over ${numberFormatter.format(safeConfig.spikeRampSeconds)} seconds.`
                    : 'Step increases users by the configured interval.'}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min(100, ((status.completedRequests / (status.totalRequests || totalPlannedRequests || 1)) * 100))}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="real-backend-test-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge aria-hidden="true" size={18} />
            Real Backend Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Browser Test uses browser-generated fetch load.
            Real Backend Test runs the selected Work/Study target URLs through an external load runner and displays its results in this UI.
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="real-backend-scenario">Scenario</Label>
              <select
                id="real-backend-scenario"
                aria-label="Real backend scenario"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={safeRealBackendConfig.scenario}
                onChange={(event) => updateRealBackendTextField('scenario', event.target.value)}
              >
                <option value="public-api-rps">public-api-rps</option>
                <option value="public-api-spike">public-api-spike</option>
                <option value="public-api-soak">public-api-soak</option>
                <option value="public-api-stress">public-api-stress</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="real-backend-target">Target</Label>
              <select
                id="real-backend-target"
                aria-label="Real backend target"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={safeRealBackendConfig.target}
                onChange={(event) => updateRealBackendTextField('target', event.target.value)}
              >
                <option value="public-api-mix">public-api-mix</option>
                <option value="public-works-only">public-works-only</option>
                <option value="public-blogs-only">public-blogs-only</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="real-backend-runner">Runner</Label>
              <select
                id="real-backend-runner"
                aria-label="Real backend runner"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={safeRealBackendConfig.runner}
                onChange={(event) => updateRealBackendTextField('runner', event.target.value)}
              >
                <option value="k6">k6</option>
                <option value="fake">fake</option>
              </select>
            </div>
            {realBackendExecutionProfile.showRate ? (
              <div className="space-y-2">
                <Label htmlFor="real-backend-rate">{realBackendExecutionProfile.rateLabel}</Label>
                <Input
                  id="real-backend-rate"
                  type="number"
                  min={1}
                  max={100000}
                  value={safeRealBackendConfig.rate}
                  onChange={(event) => updateRealBackendNumberField('rate', event.target.value)}
                />
              </div>
            ) : null}
            {realBackendExecutionProfile.showPeakRate ? (
              <div className="space-y-2">
                <Label htmlFor="real-backend-peak-rate">Peak RPS</Label>
                <Input
                  id="real-backend-peak-rate"
                  type="number"
                  min={1}
                  max={100000}
                  value={safeRealBackendConfig.peakRate}
                  onChange={(event) => updateRealBackendNumberField('peakRate', event.target.value)}
                />
              </div>
            ) : null}
            {realBackendExecutionProfile.showStartVUs ? (
              <div className="space-y-2">
                <Label htmlFor="real-backend-start-vus">Start VUs</Label>
                <Input
                  id="real-backend-start-vus"
                  type="number"
                  min={1}
                  max={safeRealBackendConfig.maxVUs}
                  value={safeRealBackendConfig.startVUs}
                  onChange={(event) => updateRealBackendNumberField('startVUs', event.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="real-backend-duration">{realBackendExecutionProfile.durationLabel}</Label>
              <Input
                id="real-backend-duration"
                type="number"
                min={1}
                max={3600}
                value={safeRealBackendConfig.durationSeconds}
                onChange={(event) => updateRealBackendNumberField('durationSeconds', event.target.value)}
              />
            </div>
            {realBackendExecutionProfile.showMaxVUs ? (
              <div className="space-y-2">
                <Label htmlFor="real-backend-max-vus">{realBackendExecutionProfile.maxVUsLabel}</Label>
                <Input
                  id="real-backend-max-vus"
                  type="number"
                  min={1}
                  max={10000}
                  value={safeRealBackendConfig.maxVUs}
                  onChange={(event) => updateRealBackendNumberField('maxVUs', event.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground" data-testid="real-backend-execution-profile">
            <p className="font-medium text-foreground">{realBackendExecutionProfile.modeLabel}</p>
            <p className="mt-1">{realBackendExecutionProfile.summary}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="gap-2"
              disabled={realBackendPhase === 'starting' || realBackendPhase === 'running' || realBackendPhase === 'stopping'}
              onClick={() => void startRealBackendTest()}
            >
              <Play aria-hidden="true" size={16} />
              Start real backend test
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={!realBackendRunId || (realBackendPhase !== 'starting' && realBackendPhase !== 'running')}
              onClick={() => void stopRealBackendTest()}
            >
              <Square aria-hidden="true" size={16} />
              Stop real backend test
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">Real target URLs</p>
            <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
              {realBackendPayload.targets.length ? realBackendPayload.targets.map((target) => (
                <div key={target.id} className="rounded-md border border-border bg-background px-3 py-2">
                  <p className="font-medium text-foreground">{target.label}</p>
                  <p className="mt-1 break-all">{target.path}</p>
                </div>
              )) : (
                <p>No runnable real backend targets are configured.</p>
              )}
            </div>
          </div>

          <div className={`rounded-lg border p-3 text-sm ${realBackendPhaseClassName(realBackendPhase)}`} data-testid="real-backend-live-status">
            <p className="font-medium">
              {formatRealBackendPhase(realBackendPhase)} · {realBackendStatusText}
            </p>
            <p className="mt-1 text-xs">
              Run ID {realBackendRunId ?? 'not started'}
            </p>
            {realBackendError ? (
              <p className="mt-1 text-xs">{realBackendError}</p>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{realBackendStatusText}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Requests</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {realBackendMetricsPending ? 'summary pending' : numberFormatter.format(realBackendSnapshot?.requests ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Latency</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {realBackendMetricsPending ? 'summary pending' : formatMs(realBackendSnapshot?.latencyMs ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Throughput</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {realBackendMetricsPending ? 'summary pending' : `${numberFormatter.format(realBackendSnapshot?.throughputRps ?? 0)} rps`}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">HTTP counts</p>
              {realBackendMetricsPending ? (
                <p className="mt-2 text-sm font-semibold text-foreground">summary pending</p>
              ) : (
                <>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    total {numberFormatter.format(realBackendHttpCounts?.total ?? 0)} · ok {numberFormatter.format(realBackendHttpCounts?.success ?? 0)} · failed {numberFormatter.format(realBackendHttpCounts?.failed ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    2xx {numberFormatter.format(realBackendHttpCounts?.status2xx ?? 0)} · 3xx {numberFormatter.format(realBackendHttpCounts?.status3xx ?? 0)} · 4xx {numberFormatter.format(realBackendHttpCounts?.status4xx ?? 0)} · 5xx {numberFormatter.format(realBackendHttpCounts?.status5xx ?? 0)}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4" data-testid="real-backend-latency-breakdown">
            <p className="text-sm font-medium text-foreground">Latency breakdown</p>
            {realBackendMetricsPending ? (
              <p className="mt-2 text-sm text-muted-foreground">
                k6 summary pending; latency breakdown will appear after the runner publishes metrics.
              </p>
            ) : realBackendLatencyBreakdown?.available ? (
              <div className="mt-2 grid gap-2 text-sm text-foreground sm:grid-cols-2 xl:grid-cols-5">
                <p>min {realBackendLatencyBreakdown.minMs === null ? '—' : formatMs(realBackendLatencyBreakdown.minMs)}</p>
                <p>p50 {realBackendLatencyBreakdown.p50Ms === null ? '—' : formatMs(realBackendLatencyBreakdown.p50Ms)}</p>
                <p>p95 {realBackendLatencyBreakdown.p95Ms === null ? '—' : formatMs(realBackendLatencyBreakdown.p95Ms)}</p>
                <p>p99 {realBackendLatencyBreakdown.p99Ms === null ? '—' : formatMs(realBackendLatencyBreakdown.p99Ms)}</p>
                <p>max {realBackendLatencyBreakdown.maxMs === null ? '—' : formatMs(realBackendLatencyBreakdown.maxMs)}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {realBackendLatencyBreakdown?.reason ?? 'Latency breakdown is unavailable for this run.'}
              </p>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-muted/20 p-4" data-testid="real-backend-target-summary">
            <p className="text-sm font-medium text-foreground">Real backend target summary</p>
            <table className="mt-3 w-full min-w-[1040px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3">URL</th>
                  <th className="py-2 pr-3">Requests</th>
                  <th className="py-2 pr-3">P95</th>
                  <th className="py-2 pr-3">DB P95</th>
                  <th className="py-2 pr-3">DB Cmds</th>
                  <th className="py-2 pr-3">Payload P95</th>
                  <th className="py-2 pr-3">Receive P95</th>
                  <th className="py-2 pr-3">HTTP</th>
                </tr>
              </thead>
              <tbody>
                {realBackendTargetMetrics.length ? realBackendTargetMetrics.map((target) => (
                  <tr key={target.targetId} className="border-t border-border">
                    <td className="py-2 pr-3 font-medium text-foreground">{target.targetLabel}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      <span className="break-all">{target.targetPath}</span>
                    </td>
                    <td className="py-2 pr-3 text-foreground">
                      {numberFormatter.format(target.successCount)} / {numberFormatter.format(target.requestCount)}
                    </td>
                    <td className="py-2 pr-3 text-foreground">{formatMs(target.p95Ms)}</td>
                    <td className="py-2 pr-3 text-foreground">
                      {target.dbCommandElapsedP95Ms === null ? '—' : formatMs(target.dbCommandElapsedP95Ms)}
                    </td>
                    <td className="py-2 pr-3 text-foreground">
                      {target.dbCommandCountP95 === null ? '—' : numberFormatter.format(target.dbCommandCountP95)}
                    </td>
                    <td className="py-2 pr-3 text-foreground">
                      {target.responseBytesP95 === null ? '—' : formatBytes(target.responseBytesP95)}
                    </td>
                    <td className="py-2 pr-3 text-foreground">
                      {target.receiveP95Ms === null ? '—' : formatMs(target.receiveP95Ms)}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      2xx {numberFormatter.format(target.statusCounts['2xx'] ?? 0)} · 4xx {numberFormatter.format(target.statusCounts['4xx'] ?? 0)} · 5xx {numberFormatter.format(target.statusCounts['5xx'] ?? 0)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="py-4 text-muted-foreground" colSpan={7}>
                      {realBackendMetricsPending ? 'Runner summary pending; target metrics will appear after k6 publishes metrics.' : 'No real backend target metrics yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4" data-testid="real-backend-component-breakdown">
            <p className="text-sm font-medium text-foreground">Client · nginx · app · db</p>
            <div className="mt-2 grid gap-2 text-sm text-foreground sm:grid-cols-2">
              <p>
                client p95:{' '}
                {realBackendMetricsPending
                  ? 'summary pending'
                  : realBackendLatencyBreakdown?.p95Ms !== null && realBackendLatencyBreakdown?.p95Ms !== undefined
                  ? formatMs(realBackendLatencyBreakdown.p95Ms)
                  : realBackendSnapshot?.latencyMs
                    ? formatMs(realBackendSnapshot.latencyMs)
                    : 'unavailable'}
              </p>
              <p>
                nginx request_time p95:{' '}
                {realBackendMetricsPending
                  ? 'summary pending'
                  : realBackendLatencyBreakdown?.nginxRequestTimeP95Ms !== null && realBackendLatencyBreakdown?.nginxRequestTimeP95Ms !== undefined
                  ? formatMs(realBackendLatencyBreakdown.nginxRequestTimeP95Ms)
                  : 'unavailable'}
              </p>
              <p>
                nginx upstream p95:{' '}
                {realBackendMetricsPending
                  ? 'summary pending'
                  : realBackendLatencyBreakdown?.nginxUpstreamP95Ms !== null && realBackendLatencyBreakdown?.nginxUpstreamP95Ms !== undefined
                  ? `${formatMs(realBackendLatencyBreakdown.nginxUpstreamP95Ms)}${formatTimingSource(realBackendLatencyBreakdown.nginxUpstreamSource)}`
                  : 'unavailable'}
              </p>
              <p>
                ASP.NET app elapsed p95:{' '}
                {realBackendMetricsPending
                  ? 'summary pending'
                  : realBackendLatencyBreakdown?.appElapsedP95Ms !== null && realBackendLatencyBreakdown?.appElapsedP95Ms !== undefined
                  ? formatMs(realBackendLatencyBreakdown.appElapsedP95Ms)
                  : (realBackendLatencyBreakdown?.appElapsedReason ?? 'unavailable')}
              </p>
              <p>
                db command p95:{' '}
                {realBackendMetricsPending
                  ? 'summary pending'
                  : realBackendDbCommandP95Ms !== null && realBackendDbCommandP95Ms !== undefined
                  ? `${formatMs(realBackendDbCommandP95Ms)}${formatTimingSource(realBackendDbCommandP95Source)}`
                  : 'unavailable'}
              </p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Component timing uses runner, proxy, app, and diagnostics metrics when present; missing sources remain unavailable.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Latest P95</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{latestResult ? formatMs(latestResult.p95Ms) : '—'}</p>
            <p className="mt-1 text-xs text-muted-foreground">{latestResult?.targetLabel ?? 'No run yet'}</p>
            <p className={`mt-3 rounded-md border px-2 py-1 text-xs font-medium ${statusClassName(latestHttpHealth.status)}`}>
              HTTP {latestHttpHealth.status}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average P95</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{results.length ? formatMs(Math.round(avgP95)) : '—'}</p>
            <p className="mt-1 text-xs text-muted-foreground" data-testid="load-test-result-count">
              {numberFormatter.format(results.length)} scenarios
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Failures</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{numberFormatter.format(totalFailures)}</p>
            <p className="mt-1 text-xs text-muted-foreground">HTTP failures and aborted requests</p>
            <p className="mt-2 text-xs text-muted-foreground">
              5xx {numberFormatter.format(totalHttp5xx)} · 429 {numberFormatter.format(totalStatus429)} · 503 {numberFormatter.format(totalStatus503)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              timeout {numberFormatter.format(totalTimeouts)} · abort {numberFormatter.format(totalAborts)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="load-test-runtime-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity aria-hidden="true" size={18} />
            Backend runtime
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`rounded-lg border p-3 text-sm ${statusClassName(runtimeHealth.status)}`}>
            <p className="font-medium">Runtime {runtimeHealth.status}</p>
            <p className="mt-1 text-xs">{diagnosticsError ?? runtimeHealth.reason}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {runtimeMetricRows.map((row) => (
              <div key={row.label} className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">{row.label}</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{formatMetricRowValue(row, row.trend.current)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMetricRowTrend(row)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {numberFormatter.format(diagnosticsSummary.sampleCount)} diagnostics samples collected from the ASP.NET Core backend.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="load-test-database-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge aria-hidden="true" size={18} />
            Database pressure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`rounded-lg border p-3 text-sm ${statusClassName(
            latestDatabaseStatus === 'error'
              ? 'red'
              : latestDatabaseStatus === 'available'
                ? runtimeHealth.status
                : 'unavailable',
          )}`}>
            <p className="font-medium">Database {latestDatabaseStatus}</p>
            <p className="mt-1 text-xs">
              {diagnosticsError ?? databasePoolSummary}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {databaseMetricRows.map((row) => (
              <div key={row.label} className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">{row.label}</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{formatMetricRowValue(row, row.trend.current)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMetricRowTrend(row)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table data-testid="load-test-summary-table" className="w-full min-w-[840px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Target</th>
                  <th className="py-3 pr-4 font-medium">State</th>
                  <th className="py-3 pr-4 font-medium">Users</th>
                  <th className="py-3 pr-4 font-medium">Requests</th>
                  <th className="py-3 pr-4 font-medium">Error rate</th>
                  <th className="py-3 pr-4 font-medium">P50</th>
                  <th className="py-3 pr-4 font-medium">P95</th>
                  <th className="py-3 pr-4 font-medium">Avg</th>
                  <th className="py-3 pr-4 font-medium">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.length ? results.map((result) => (
                  <tr key={`${result.targetId}-${result.userCount}`}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-foreground">{result.targetLabel}</p>
                      <p className="break-all text-xs text-muted-foreground">{result.targetPath}</p>
                    </td>
                    <td className="py-3 pr-4">{formatScenarioState(result.state)}</td>
                    <td className="py-3 pr-4">{numberFormatter.format(result.userCount)}</td>
                    <td className="py-3 pr-4">
                      {numberFormatter.format(result.requestCount)}
                      {result.plannedRequestCount ? ` / ${numberFormatter.format(result.plannedRequestCount)}` : ''}
                    </td>
                    <td className="py-3 pr-4">{formatPercent(result.errorRate)}</td>
                    <td className="py-3 pr-4">{formatMs(result.p50Ms)}</td>
                    <td className="py-3 pr-4">{formatMs(result.p95Ms)}</td>
                    <td className="py-3 pr-4">{formatMs(result.avgMs)}</td>
                    <td className="py-3 pr-4">{formatMs(result.maxMs)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td className="py-6 text-muted-foreground" colSpan={9}>
                      No load-test results yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
