import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LoadTestScenarioResult } from '@/lib/load-test-dashboard'
import {
  formatMs,
  formatPercent,
  formatScenarioState,
  numberFormatter,
} from './formatters'

type LoadTestResultsTableProps = {
  results: LoadTestScenarioResult[]
}

export function LoadTestResultsTable({ results }: LoadTestResultsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table data-testid="load-test-summary-table" className="w-full min-w-[840px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-4 font-medium">Target</th>
                <th className="py-3 pr-4 font-medium">State</th>
                <th className="py-3 pr-4 font-medium">Users</th>
                <th className="py-3 pr-4 font-medium">Requests</th>
                <th className="py-3 pr-4 font-medium">Error rate</th>
                <th className="py-3 pr-4 font-medium">P50</th>
                <th className="py-3 pr-4 font-medium">P95</th>
                <th className="py-3 pr-4 font-medium">Avg</th>
                <th className="py-3 pr-4 font-medium">Max</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.length ? results.map((result) => (
                <tr key={`${result.targetId}-${result.userCount}`}>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-foreground">{result.targetLabel}</p>
                    <p className="break-all text-xs text-muted-foreground">{result.targetPath}</p>
                  </td>
                  <td className="py-3 pr-4">{formatScenarioState(result.state)}</td>
                  <td className="py-3 pr-4">{numberFormatter.format(result.userCount)}</td>
                  <td className="py-3 pr-4">
                    {numberFormatter.format(result.requestCount)}
                    {result.plannedRequestCount ? ` / ${numberFormatter.format(result.plannedRequestCount)}` : ''}
                  </td>
                  <td className="py-3 pr-4">{formatPercent(result.errorRate)}</td>
                  <td className="py-3 pr-4">{formatMs(result.p50Ms)}</td>
                  <td className="py-3 pr-4">{formatMs(result.p95Ms)}</td>
                  <td className="py-3 pr-4">{formatMs(result.avgMs)}</td>
                  <td className="py-3 pr-4">{formatMs(result.maxMs)}</td>
                </tr>
              )) : (
                <tr>
                  <td className="py-6 text-muted-foreground" colSpan={9}>
                    No load-test results yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
