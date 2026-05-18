import type {
  LoadTestHealthStatus,
  LoadTestScenarioResult,
} from '@/lib/load-test-dashboard'
import type {
  RealBackendRunPhase,
  RuntimeMetricRow,
} from './types'

export const numberFormatter = new Intl.NumberFormat('en-US')

export function scenarioResultKey(result: Pick<LoadTestScenarioResult, 'targetId' | 'userCount'>) {
  return `${result.targetId}:${result.userCount}`
}

export function upsertScenarioResult(
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

export function formatMs(value: number) {
  return `${numberFormatter.format(value)} ms`
}

export function formatPercent(value: number) {
  return `${numberFormatter.format(value)}%`
}

export function formatDurationMs(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function formatScenarioState(state: LoadTestScenarioResult['state']) {
  if (state === 'running') {
    return 'Running'
  }

  if (state === 'stopped') {
    return 'Stopped'
  }

  return 'Completed'
}

export function formatRealBackendPhase(phase: RealBackendRunPhase) {
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

export function normalizeRealBackendPhase(rawStatus: string, fallback: RealBackendRunPhase): RealBackendRunPhase {
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

export function inputNumberValue(value: string) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

export function formatBytes(value: number) {
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

export function formatTrendValue(metric: 'bytes' | 'number' | 'ms' | 'percent', value: number) {
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

export function formatMetricRowValue(row: RuntimeMetricRow, value: number) {
  return row.available === false ? 'unavailable' : formatTrendValue(row.metric, value)
}

export function formatMetricRowTrend(row: RuntimeMetricRow) {
  if (row.available === false) {
    return 'peak unavailable · delta unavailable'
  }

  return `peak ${formatTrendValue(row.metric, row.trend.peak)} · delta ${formatTrendValue(row.metric, row.trend.delta)}`
}

export function formatTimingSource(source?: string | null) {
  return source ? ` · ${source}` : ''
}

export function statusClassName(status: LoadTestHealthStatus) {
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

export function realBackendPhaseClassName(phase: RealBackendRunPhase) {
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
