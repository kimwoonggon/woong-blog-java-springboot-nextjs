import type {
  LoadTestConfig,
  LoadTestTarget,
  RuntimeMetricTrend,
} from '@/lib/load-test-dashboard'

export type LoadTestDashboardProps = {
  targets: LoadTestTarget[]
  targetLoadWarning?: string | null
}

export type LoadTestStatus = {
  phase: 'idle' | 'running' | 'completed' | 'stopped'
  currentLabel: string
  completedRequests: number
  totalRequests: number
  currentInFlight: number
  peakInFlight: number
  elapsedMs: number
}

export type RuntimeMetricRow = {
  label: string
  trend: RuntimeMetricTrend
  metric: 'bytes' | 'number' | 'ms' | 'percent'
  available?: boolean
}

export type RealBackendRunPhase = 'idle' | 'starting' | 'running' | 'stopping' | 'completed' | 'stopped' | 'failed'

export type LoadTestNumberField = keyof LoadTestConfig

export type RealBackendTextField = 'scenario' | 'target' | 'runner'

export type RealBackendNumberField = 'rate' | 'peakRate' | 'durationSeconds' | 'maxVUs' | 'startVUs'
