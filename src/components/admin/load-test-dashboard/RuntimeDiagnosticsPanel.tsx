import { Activity, Gauge } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LoadTestHealth } from '@/lib/load-test-dashboard'
import {
  formatMetricRowTrend,
  formatMetricRowValue,
  numberFormatter,
  statusClassName,
} from './formatters'
import type { RuntimeMetricRow } from './types'

type RuntimeDiagnosticsPanelProps = {
  runtimeHealth: LoadTestHealth
  diagnosticsError: string | null
  runtimeMetricRows: RuntimeMetricRow[]
  diagnosticsSampleCount: number
}

type DatabasePressurePanelProps = {
  latestDatabaseStatus: 'available' | 'unavailable' | 'error'
  runtimeHealth: LoadTestHealth
  diagnosticsError: string | null
  databasePoolSummary: string
  databaseMetricRows: RuntimeMetricRow[]
}

export function RuntimeDiagnosticsPanel({
  runtimeHealth,
  diagnosticsError,
  runtimeMetricRows,
  diagnosticsSampleCount,
}: RuntimeDiagnosticsPanelProps) {
  return (
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
        <MetricGrid rows={runtimeMetricRows} />
        <p className="text-xs text-muted-foreground">
          {numberFormatter.format(diagnosticsSampleCount)} diagnostics samples collected from the backend runtime.
        </p>
      </CardContent>
    </Card>
  )
}

export function DatabasePressurePanel({
  latestDatabaseStatus,
  runtimeHealth,
  diagnosticsError,
  databasePoolSummary,
  databaseMetricRows,
}: DatabasePressurePanelProps) {
  return (
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
        <MetricGrid rows={databaseMetricRows} />
      </CardContent>
    </Card>
  )
}

function MetricGrid({ rows }: { rows: RuntimeMetricRow[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {rows.map((row) => (
        <div key={row.label} className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">{row.label}</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{formatMetricRowValue(row, row.trend.current)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatMetricRowTrend(row)}
          </p>
        </div>
      ))}
    </div>
  )
}
