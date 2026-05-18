import { useCallback, useMemo, useState } from 'react'
import {
  buildDiagnosticsSnapshotSummary,
  evaluateRuntimeDiagnosticsHealth,
  isRuntimeDiagnosticsPayload,
  type RuntimeDiagnosticsPayload,
} from '@/lib/load-test-dashboard'
import { numberFormatter } from '../formatters'
import type { RuntimeMetricRow } from '../types'

type UseDiagnosticsPollingOptions = {
  fallbackSamples?: RuntimeDiagnosticsPayload[]
}

export function useDiagnosticsPolling({
  fallbackSamples = [],
}: UseDiagnosticsPollingOptions = {}) {
  const [diagnosticsSamples, setDiagnosticsSamples] = useState<RuntimeDiagnosticsPayload[]>([])
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null)

  const clearDiagnostics = useCallback(() => {
    setDiagnosticsSamples([])
    setDiagnosticsError(null)
  }, [])

  const collectDiagnosticsSample = useCallback(async () => {
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
  }, [])

  const effectiveDiagnosticsSamples = diagnosticsSamples.length ? diagnosticsSamples : fallbackSamples
  const latestDiagnosticsSample = effectiveDiagnosticsSamples.at(-1)
  const diagnosticsSummary = useMemo(
    () => buildDiagnosticsSnapshotSummary(effectiveDiagnosticsSamples),
    [effectiveDiagnosticsSamples],
  )
  const runtimeHealth = useMemo(() => evaluateRuntimeDiagnosticsHealth(diagnosticsSummary), [diagnosticsSummary])

  const runtimeMetricRows: RuntimeMetricRow[] = useMemo(() => [
    { label: 'Memory', trend: diagnosticsSummary.memoryBytes, metric: 'bytes' },
    { label: 'Memory limit', trend: diagnosticsSummary.memoryLimitBytes, metric: 'bytes', available: diagnosticsSummary.memoryLimitAvailable },
    { label: 'CPU visible', trend: diagnosticsSummary.processorCount, metric: 'number' },
    { label: 'CPU quota', trend: diagnosticsSummary.cpuQuotaCores, metric: 'number', available: diagnosticsSummary.cpuQuotaAvailable },
    { label: 'GC heap', trend: diagnosticsSummary.gcHeapBytes, metric: 'bytes' },
    { label: 'Gen2 GC', trend: diagnosticsSummary.gen2Collections, metric: 'number' },
    { label: 'Time in GC', trend: diagnosticsSummary.timeInGcPercent, metric: 'percent' },
    { label: 'Runtime workers', trend: diagnosticsSummary.threadPoolWorkerThreads, metric: 'number' },
    { label: 'Runtime queue', trend: diagnosticsSummary.threadPoolQueueLength, metric: 'number' },
    { label: 'Runtime completed', trend: diagnosticsSummary.threadPoolCompletedWorkItemCount, metric: 'number' },
    { label: 'DB latency', trend: diagnosticsSummary.databaseLatencyMs, metric: 'ms' },
    { label: 'DB timeouts', trend: diagnosticsSummary.databaseTimeoutCount, metric: 'number' },
  ], [diagnosticsSummary])

  const databaseMetricRows: RuntimeMetricRow[] = useMemo(() => [
    { label: 'DB command P95', trend: diagnosticsSummary.dbCommandP95Ms, metric: 'ms', available: diagnosticsSummary.dbCommandP95Available },
    { label: 'DB command P99', trend: diagnosticsSummary.dbCommandP99Ms, metric: 'ms', available: diagnosticsSummary.dbCommandP99Available },
    { label: 'DB connection open P95', trend: diagnosticsSummary.dbConnectionOpenP95Ms, metric: 'ms', available: diagnosticsSummary.dbConnectionOpenP95Available },
    { label: 'Slow queries', trend: diagnosticsSummary.dbSlowQueryCount, metric: 'number' },
    { label: 'DB errors', trend: diagnosticsSummary.dbErrorCount, metric: 'number' },
    { label: 'JDBC pool size', trend: diagnosticsSummary.dbContextPoolSize, metric: 'number', available: diagnosticsSummary.dbContextPoolAvailable },
    { label: 'JDBC min pool', trend: diagnosticsSummary.dbNpgsqlMinimumPoolSize, metric: 'number', available: diagnosticsSummary.dbNpgsqlPoolConfigured },
    { label: 'JDBC max pool', trend: diagnosticsSummary.dbNpgsqlMaximumPoolSize, metric: 'number', available: diagnosticsSummary.dbNpgsqlPoolConfigured },
    { label: 'Open connections', trend: diagnosticsSummary.dbOpenConnections, metric: 'number' },
    { label: 'Active connections', trend: diagnosticsSummary.dbActiveConnections, metric: 'number' },
    { label: 'Idle connections', trend: diagnosticsSummary.dbIdleConnections, metric: 'number' },
    { label: 'Idle in transaction', trend: diagnosticsSummary.dbIdleInTransactionConnections, metric: 'number' },
  ], [diagnosticsSummary])

  const latestDatabaseStatus = latestDiagnosticsSample?.database.status ?? 'unavailable'
  const latestDatabasePool = latestDiagnosticsSample?.database.pool
  const databasePoolSummary = latestDatabasePool
    ? `DB connection counts are estimated from pg_stat_activity. JDBC pool size ${numberFormatter.format(latestDatabasePool.dbContextPoolSize)} · JDBC max ${latestDatabasePool.npgsqlMaximumPoolSize === null ? 'unavailable' : numberFormatter.format(latestDatabasePool.npgsqlMaximumPoolSize)} · source ${latestDatabasePool.npgsqlPoolLimitSource}.`
    : 'DB connection counts are estimated from pg_stat_activity. JDBC pool settings are read from the running backend configuration.'

  return {
    clearDiagnostics,
    collectDiagnosticsSample,
    databaseMetricRows,
    databasePoolSummary,
    diagnosticsError,
    diagnosticsSamples,
    diagnosticsSummary,
    latestDatabaseStatus,
    runtimeHealth,
    runtimeMetricRows,
  }
}
