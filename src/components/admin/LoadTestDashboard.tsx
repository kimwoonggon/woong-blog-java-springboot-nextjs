"use client"

import { useEffect } from 'react'
import { AlertTriangle, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadTestResultsTable } from './load-test-dashboard/LoadTestResultsTable'
import { MetricCards } from './load-test-dashboard/MetricCards'
import { RealBackendLoadTestPanel } from './load-test-dashboard/RealBackendLoadTestPanel'
import { RunStatusCard } from './load-test-dashboard/RunStatusCard'
import { DatabasePressurePanel, RuntimeDiagnosticsPanel } from './load-test-dashboard/RuntimeDiagnosticsPanel'
import { SyntheticLoadTestPanel } from './load-test-dashboard/SyntheticLoadTestPanel'
import { useDiagnosticsPolling } from './load-test-dashboard/hooks/useDiagnosticsPolling'
import { useRealBackendRun } from './load-test-dashboard/hooks/useRealBackendRun'
import { useSyntheticLoadTestRunner } from './load-test-dashboard/hooks/useSyntheticLoadTestRunner'
import type { LoadTestDashboardProps } from './load-test-dashboard/types'

export function LoadTestDashboard({ targets, targetLoadWarning }: LoadTestDashboardProps) {
  const {
    clearDiagnostics,
    collectDiagnosticsSample,
    databaseMetricRows,
    databasePoolSummary,
    diagnosticsError,
    diagnosticsSummary,
    latestDatabaseStatus,
    runtimeHealth,
    runtimeMetricRows,
  } = useDiagnosticsPolling()

  const syntheticRun = useSyntheticLoadTestRunner({
    targets,
    clearDiagnostics,
    collectDiagnosticsSample,
  })

  const realBackendRun = useRealBackendRun({
    runnableTargets: syntheticRun.runnableTargets,
    clearDiagnostics,
  })

  const realBackendDbCommandP95Ms = realBackendRun.realBackendLatencyBreakdown?.dbCommandP95Ms
    ?? (diagnosticsSummary.dbCommandP95Available ? diagnosticsSummary.dbCommandP95Ms.current : null)
  const realBackendDbCommandP95Source = realBackendRun.realBackendLatencyBreakdown?.dbCommandP95Source
    ?? (diagnosticsSummary.dbCommandP95Available ? 'diagnostics.commandLatency.p95' : null)
  const diagnosticsSamplingActive = syntheticRun.status.phase === 'running'
    || realBackendRun.realBackendPhase === 'starting'
    || realBackendRun.realBackendPhase === 'running'
    || realBackendRun.realBackendPhase === 'stopping'

  useEffect(() => {
    if (!diagnosticsSamplingActive) {
      return undefined
    }

    void collectDiagnosticsSample()
    const interval = window.setInterval(() => {
      void collectDiagnosticsSample()
    }, 1000)

    return () => window.clearInterval(interval)
  }, [diagnosticsSamplingActive, collectDiagnosticsSample])

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
            disabled={syntheticRun.status.phase === 'running' || !syntheticRun.runnableTargets.length}
            onClick={() => void syntheticRun.runLoadTest()}
          >
            <Play aria-hidden="true" size={16} />
            Run load test
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={syntheticRun.status.phase !== 'running'}
            onClick={syntheticRun.stopLoadTest}
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
        <SyntheticLoadTestPanel
          safeConfig={syntheticRun.safeConfig}
          editableTargets={syntheticRun.editableTargets}
          onPatternChange={syntheticRun.updatePattern}
          onNumberFieldChange={syntheticRun.updateNumberField}
          onTargetPathChange={syntheticRun.updateTargetPath}
        />
        <RunStatusCard
          status={syntheticRun.status}
          safeConfig={syntheticRun.safeConfig}
          plannedScenarioCount={syntheticRun.plannedScenarioCount}
          totalPlannedRequests={syntheticRun.totalPlannedRequests}
        />
      </div>

      <RealBackendLoadTestPanel
        safeRealBackendConfig={realBackendRun.safeRealBackendConfig}
        realBackendExecutionProfile={realBackendRun.realBackendExecutionProfile}
        realBackendPayload={realBackendRun.realBackendPayload}
        realBackendPhase={realBackendRun.realBackendPhase}
        realBackendStatusText={realBackendRun.realBackendStatusText}
        realBackendRunId={realBackendRun.realBackendRunId}
        realBackendError={realBackendRun.realBackendError}
        realBackendMetricsPending={realBackendRun.realBackendMetricsPending}
        realBackendSnapshot={realBackendRun.realBackendSnapshot}
        realBackendLatencyBreakdown={realBackendRun.realBackendLatencyBreakdown}
        realBackendDbCommandP95Ms={realBackendDbCommandP95Ms}
        realBackendDbCommandP95Source={realBackendDbCommandP95Source}
        onTextFieldChange={realBackendRun.updateRealBackendTextField}
        onNumberFieldChange={realBackendRun.updateRealBackendNumberField}
        onStart={realBackendRun.startRealBackendTest}
        onStop={realBackendRun.stopRealBackendTest}
      />

      <MetricCards results={syntheticRun.results} latestHttpHealth={syntheticRun.latestHttpHealth} />

      <RuntimeDiagnosticsPanel
        runtimeHealth={runtimeHealth}
        diagnosticsError={diagnosticsError}
        runtimeMetricRows={runtimeMetricRows}
        diagnosticsSampleCount={diagnosticsSummary.sampleCount}
      />

      <DatabasePressurePanel
        latestDatabaseStatus={latestDatabaseStatus}
        runtimeHealth={runtimeHealth}
        diagnosticsError={diagnosticsError}
        databasePoolSummary={databasePoolSummary}
        databaseMetricRows={databaseMetricRows}
      />

      <LoadTestResultsTable results={syntheticRun.results} />
    </div>
  )
}
