import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_LOAD_TEST_CONFIG,
  appendLoadTestCacheBust,
  buildSoakUserTimeline,
  buildSpikeUserTimeline,
  buildUserSteps,
  estimatePatternRequestCount,
  evaluateHttpScenarioHealth,
  runWithConcurrency,
  sanitizeLoadTestConfig,
  summarizeLoadTestSamples,
  type LoadTestConfig,
  type LoadTestSample,
  type LoadTestScenarioResult,
  type LoadTestTarget,
} from '@/lib/load-test-dashboard'
import {
  inputNumberValue,
  numberFormatter,
  upsertScenarioResult,
} from '../formatters'
import type {
  LoadTestNumberField,
  LoadTestStatus,
} from '../types'

type UseSyntheticLoadTestRunnerOptions = {
  targets: LoadTestTarget[]
  clearDiagnostics: () => void
  collectDiagnosticsSample: () => Promise<void>
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

export function useSyntheticLoadTestRunner({
  targets,
  clearDiagnostics,
  collectDiagnosticsSample,
}: UseSyntheticLoadTestRunnerOptions) {
  const [config, setConfig] = useState<LoadTestConfig>(DEFAULT_LOAD_TEST_CONFIG)
  const [editableTargets, setEditableTargets] = useState<LoadTestTarget[]>(targets)
  const [results, setResults] = useState<LoadTestScenarioResult[]>([])
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
  const runStartedAtRef = useRef<number | null>(null)
  const inFlightRef = useRef(0)
  const peakInFlightRef = useRef(0)

  const safeConfig = useMemo(() => sanitizeLoadTestConfig(config), [config])
  const userSteps = useMemo(() => buildUserSteps(safeConfig), [safeConfig])
  const runnableTargets = useMemo(
    () => editableTargets
      .map((target) => ({ ...target, path: target.path.trim() }))
      .filter((target) => target.path.length > 0),
    [editableTargets],
  )
  const requestCountPerTarget = useMemo(() => estimatePatternRequestCount(safeConfig), [safeConfig])
  const totalPlannedRequests = useMemo(
    () => runnableTargets.length * requestCountPerTarget,
    [requestCountPerTarget, runnableTargets.length],
  )
  const plannedScenarioCount = useMemo(
    () => (safeConfig.pattern === 'step' ? userSteps.length * runnableTargets.length : runnableTargets.length),
    [safeConfig.pattern, runnableTargets.length, userSteps.length],
  )
  const latestResult = results.at(-1)
  const latestHttpHealth = latestResult
    ? evaluateHttpScenarioHealth(latestResult)
    : { status: 'unavailable' as const, reason: 'No HTTP result yet.' }

  function updateNumberField(field: LoadTestNumberField, value: string) {
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
    clearDiagnostics()
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

  useEffect(() => {
    if (status.phase !== 'running') {
      return undefined
    }

    const interval = window.setInterval(() => {
      syncRunStatus()
    }, 250)

    return () => window.clearInterval(interval)
  }, [status.phase])

  return {
    editableTargets,
    latestHttpHealth,
    plannedScenarioCount,
    results,
    runLoadTest,
    runnableTargets,
    safeConfig,
    status,
    stopLoadTest,
    totalPlannedRequests,
    updateNumberField,
    updatePattern,
    updateTargetPath,
  }
}
