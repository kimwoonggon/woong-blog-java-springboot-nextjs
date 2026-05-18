import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_REAL_BACKEND_TEST_CONFIG,
  buildRealBackendStartPayload,
  describeRealBackendExecutionProfile,
  sanitizeRealBackendTestConfig,
  summarizeRealBackendRunSnapshot,
  type LoadTestTarget,
  type RealBackendTestConfig,
} from '@/lib/load-test-dashboard'
import { fetchWithCsrf } from '@/lib/api/auth'
import {
  formatRealBackendPhase,
  inputNumberValue,
  normalizeRealBackendPhase,
} from '../formatters'
import type {
  RealBackendNumberField,
  RealBackendRunPhase,
  RealBackendTextField,
} from '../types'

type UseRealBackendRunOptions = {
  runnableTargets: LoadTestTarget[]
  clearDiagnostics: () => void
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

export function useRealBackendRun({
  runnableTargets,
  clearDiagnostics,
}: UseRealBackendRunOptions) {
  const [realBackendConfig, setRealBackendConfig] = useState<RealBackendTestConfig>(DEFAULT_REAL_BACKEND_TEST_CONFIG)
  const [realBackendRunId, setRealBackendRunId] = useState<string | null>(null)
  const [realBackendPhase, setRealBackendPhase] = useState<RealBackendRunPhase>('idle')
  const [realBackendSnapshot, setRealBackendSnapshot] = useState<ReturnType<typeof summarizeRealBackendRunSnapshot> | null>(null)
  const [realBackendError, setRealBackendError] = useState<string | null>(null)
  const realBackendPollTimerRef = useRef<number | null>(null)

  const safeRealBackendConfig = useMemo(
    () => sanitizeRealBackendTestConfig(realBackendConfig),
    [realBackendConfig],
  )
  const realBackendExecutionProfile = useMemo(
    () => describeRealBackendExecutionProfile(safeRealBackendConfig),
    [safeRealBackendConfig],
  )
  const realBackendPayload = useMemo(
    () => buildRealBackendStartPayload(safeRealBackendConfig, runnableTargets),
    [runnableTargets, safeRealBackendConfig],
  )

  const realBackendStatusText = realBackendSnapshot?.status ?? formatRealBackendPhase(realBackendPhase)
  const realBackendLatencyBreakdown = realBackendSnapshot?.latencyBreakdown
  const realBackendMetricsPending = realBackendSnapshot?.metricsPending
    ?? (!!realBackendRunId && (realBackendPhase === 'starting' || realBackendPhase === 'running'))

  function updateRealBackendTextField(field: RealBackendTextField, value: string) {
    setRealBackendConfig((current) => sanitizeRealBackendTestConfig({
      ...current,
      [field]: value,
    }))
  }

  function updateRealBackendNumberField(field: RealBackendNumberField, value: string) {
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
    clearDiagnostics()
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

  useEffect(() => () => {
    if (realBackendPollTimerRef.current !== null) {
      window.clearTimeout(realBackendPollTimerRef.current)
      realBackendPollTimerRef.current = null
    }
  }, [])

  return {
    realBackendConfig,
    realBackendError,
    realBackendExecutionProfile,
    realBackendLatencyBreakdown,
    realBackendMetricsPending,
    realBackendPayload,
    realBackendPhase,
    realBackendRunId,
    realBackendSnapshot,
    realBackendStatusText,
    safeRealBackendConfig,
    startRealBackendTest,
    stopRealBackendTest,
    updateRealBackendNumberField,
    updateRealBackendTextField,
  }
}
