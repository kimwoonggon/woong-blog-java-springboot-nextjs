import { Gauge } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MAX_CONCURRENCY,
  MAX_USERS,
  type LoadTestConfig,
  type LoadTestTarget,
} from '@/lib/load-test-dashboard'
import type { LoadTestNumberField } from './types'

type SyntheticLoadTestPanelProps = {
  safeConfig: LoadTestConfig
  editableTargets: LoadTestTarget[]
  onPatternChange: (value: string) => void
  onNumberFieldChange: (field: LoadTestNumberField, value: string) => void
  onTargetPathChange: (targetId: string, value: string) => void
}

export function SyntheticLoadTestPanel({
  safeConfig,
  editableTargets,
  onPatternChange,
  onNumberFieldChange,
  onTargetPathChange,
}: SyntheticLoadTestPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge aria-hidden="true" size={18} />
          Scenario
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="load-test-pattern">Load pattern</Label>
            <select
              id="load-test-pattern"
              aria-label="Load pattern"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={safeConfig.pattern}
              onChange={(event) => onPatternChange(event.target.value)}
            >
              <option value="step">Step</option>
              <option value="soak">Soak</option>
              <option value="spike">Spike</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="load-test-start-users">Start users</Label>
            <Input
              id="load-test-start-users"
              type="number"
              min={1}
              max={MAX_USERS}
              value={safeConfig.startUsers}
              onChange={(event) => onNumberFieldChange('startUsers', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="load-test-max-users">Max users</Label>
            <Input
              id="load-test-max-users"
              type="number"
              min={1}
              max={MAX_USERS}
              value={safeConfig.maxUsers}
              onChange={(event) => onNumberFieldChange('maxUsers', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="load-test-step-users">Step users</Label>
            <Input
              id="load-test-step-users"
              type="number"
              min={1}
              max={MAX_USERS}
              value={safeConfig.stepUsers}
              onChange={(event) => onNumberFieldChange('stepUsers', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="load-test-requests-per-user">Requests per user</Label>
            <Input
              id="load-test-requests-per-user"
              type="number"
              min={1}
              max={5}
              value={safeConfig.requestsPerUser}
              onChange={(event) => onNumberFieldChange('requestsPerUser', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="load-test-concurrency">Concurrency</Label>
            <Input
              id="load-test-concurrency"
              type="number"
              min={1}
              max={MAX_CONCURRENCY}
              value={safeConfig.concurrency}
              onChange={(event) => onNumberFieldChange('concurrency', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="load-test-timeout-ms">Timeout ms</Label>
            <Input
              id="load-test-timeout-ms"
              type="number"
              min={1000}
              max={60000}
              value={safeConfig.timeoutMs}
              onChange={(event) => onNumberFieldChange('timeoutMs', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="load-test-soak-duration">Soak seconds</Label>
            <Input
              id="load-test-soak-duration"
              type="number"
              min={10}
              max={3600}
              value={safeConfig.soakDurationSeconds}
              onChange={(event) => onNumberFieldChange('soakDurationSeconds', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="load-test-spike-ramp">Spike ramp seconds</Label>
            <Input
              id="load-test-spike-ramp"
              type="number"
              min={10}
              max={3600}
              value={safeConfig.spikeRampSeconds}
              onChange={(event) => onNumberFieldChange('spikeRampSeconds', event.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Concurrency limits max in-flight HTTP requests. It does not represent real connected users or real-time connections.
        </div>
        {safeConfig.concurrency >= 500 ? (
          <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            High concurrency is browser-generated HTTP load. Actual backend concurrency can be lower due to browser, nginx, application runtime workers, and DB pool limits.
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {editableTargets.map((target) => (
            <div key={target.id} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">{target.label}</p>
                <span className="rounded-md bg-background px-2 py-1 text-xs font-medium uppercase text-muted-foreground">
                  {target.group}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                <Label htmlFor={`load-test-target-${target.id}`} className="text-xs text-muted-foreground">
                  {target.label} URL
                </Label>
                <Input
                  id={`load-test-target-${target.id}`}
                  value={target.path}
                  onChange={(event) => onTargetPathChange(target.id, event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
