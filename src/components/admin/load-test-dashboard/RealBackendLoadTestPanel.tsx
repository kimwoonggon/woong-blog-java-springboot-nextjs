import { Gauge, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type {
  RealBackendExecutionProfile,
  RealBackendRunSnapshot,
  RealBackendStartPayload,
  RealBackendTestConfig,
} from '@/lib/load-test-dashboard'
import {
  formatBytes,
  formatMs,
  formatRealBackendPhase,
  formatTimingSource,
  numberFormatter,
  realBackendPhaseClassName,
} from './formatters'
import type {
  RealBackendNumberField,
  RealBackendRunPhase,
  RealBackendTextField,
} from './types'

type RealBackendLoadTestPanelProps = {
  safeRealBackendConfig: RealBackendTestConfig
  realBackendExecutionProfile: RealBackendExecutionProfile
  realBackendPayload: RealBackendStartPayload
  realBackendPhase: RealBackendRunPhase
  realBackendStatusText: string
  realBackendRunId: string | null
  realBackendError: string | null
  realBackendMetricsPending: boolean
  realBackendSnapshot: RealBackendRunSnapshot | null
  realBackendLatencyBreakdown: RealBackendRunSnapshot['latencyBreakdown'] | undefined
  realBackendDbCommandP95Ms: number | null | undefined
  realBackendDbCommandP95Source: string | null | undefined
  onTextFieldChange: (field: RealBackendTextField, value: string) => void
  onNumberFieldChange: (field: RealBackendNumberField, value: string) => void
  onStart: () => void | Promise<void>
  onStop: () => void | Promise<void>
}

export function RealBackendLoadTestPanel({
  safeRealBackendConfig,
  realBackendExecutionProfile,
  realBackendPayload,
  realBackendPhase,
  realBackendStatusText,
  realBackendRunId,
  realBackendError,
  realBackendMetricsPending,
  realBackendSnapshot,
  realBackendLatencyBreakdown,
  realBackendDbCommandP95Ms,
  realBackendDbCommandP95Source,
  onTextFieldChange,
  onNumberFieldChange,
  onStart,
  onStop,
}: RealBackendLoadTestPanelProps) {
  const realBackendHttpCounts = realBackendSnapshot?.httpCounts
  const realBackendTargetMetrics = realBackendSnapshot?.targetMetrics ?? []

  return (
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
              onChange={(event) => onTextFieldChange('scenario', event.target.value)}
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
              onChange={(event) => onTextFieldChange('target', event.target.value)}
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
              onChange={(event) => onTextFieldChange('runner', event.target.value)}
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
                onChange={(event) => onNumberFieldChange('rate', event.target.value)}
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
                onChange={(event) => onNumberFieldChange('peakRate', event.target.value)}
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
                onChange={(event) => onNumberFieldChange('startVUs', event.target.value)}
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
              onChange={(event) => onNumberFieldChange('durationSeconds', event.target.value)}
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
                onChange={(event) => onNumberFieldChange('maxVUs', event.target.value)}
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
            onClick={() => void onStart()}
          >
            <Play aria-hidden="true" size={16} />
            Start real backend test
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={!realBackendRunId || (realBackendPhase !== 'starting' && realBackendPhase !== 'running')}
            onClick={() => void onStop()}
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
              Application elapsed p95:{' '}
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
  )
}
