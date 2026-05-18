import { Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LoadTestConfig } from '@/lib/load-test-dashboard'
import {
  formatDurationMs,
  numberFormatter,
} from './formatters'
import type { LoadTestStatus } from './types'

type RunStatusCardProps = {
  status: LoadTestStatus
  safeConfig: LoadTestConfig
  plannedScenarioCount: number
  totalPlannedRequests: number
}

export function RunStatusCard({
  status,
  safeConfig,
  plannedScenarioCount,
  totalPlannedRequests,
}: RunStatusCardProps) {
  return (
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
  )
}
