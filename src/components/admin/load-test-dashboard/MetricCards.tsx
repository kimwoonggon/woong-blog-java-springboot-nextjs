import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  LoadTestHealth,
  LoadTestScenarioResult,
} from '@/lib/load-test-dashboard'
import {
  formatMs,
  numberFormatter,
  statusClassName,
} from './formatters'

type MetricCardsProps = {
  results: LoadTestScenarioResult[]
  latestHttpHealth: LoadTestHealth
}

export function MetricCards({ results, latestHttpHealth }: MetricCardsProps) {
  const latestResult = results.at(-1)
  const avgP95 = results.length
    ? results.reduce((sum, result) => sum + result.p95Ms, 0) / results.length
    : 0
  const totalFailures = results.reduce((sum, result) => sum + result.failureCount, 0)
  const totalHttp5xx = results.reduce((sum, result) => sum + result.http5xxCount, 0)
  const totalStatus429 = results.reduce((sum, result) => sum + result.status429Count, 0)
  const totalStatus503 = results.reduce((sum, result) => sum + result.status503Count, 0)
  const totalTimeouts = results.reduce((sum, result) => sum + result.timeoutCount, 0)
  const totalAborts = results.reduce((sum, result) => sum + result.abortedCount, 0)

  return (
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
  )
}
