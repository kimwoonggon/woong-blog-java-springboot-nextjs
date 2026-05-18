import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { AdminAiRuntimeConfig } from '@/lib/api/admin-ai'
import type { BatchAiProvider, BatchSelectionMode } from '@/components/admin/admin-blog-batch-ai-panel/types'

interface BatchLauncherControlsProps {
  selectedCount: number
  selectionSummary: string
  mode: BatchSelectionMode
  rangeStart: string
  rangeCount: string
  dateStart: string
  dateEnd: string
  runtimeConfig: AdminAiRuntimeConfig | null
  selectedProvider: BatchAiProvider
  workerCount: string
  codexModel: string
  codexReasoningEffort: string
  autoApply: boolean
  isCreatingJob: boolean
  showCancelJob: boolean
  isCancellingJob: boolean
  onModeChange: (mode: BatchSelectionMode) => void
  onRangeStartChange: (value: string) => void
  onRangeCountChange: (value: string) => void
  onDateStartChange: (value: string) => void
  onDateEndChange: (value: string) => void
  onProviderChange: (provider: BatchAiProvider) => void
  onWorkerCountChange: (value: string) => void
  onCodexModelChange: (value: string) => void
  onCodexReasoningEffortChange: (value: string) => void
  onAutoApplyChange: (value: boolean) => void
  onCreateJob: () => void
  onCancelJob: () => void
}

export function BatchLauncherControls({
  selectedCount,
  selectionSummary,
  mode,
  rangeStart,
  rangeCount,
  dateStart,
  dateEnd,
  runtimeConfig,
  selectedProvider,
  workerCount,
  codexModel,
  codexReasoningEffort,
  autoApply,
  isCreatingJob,
  showCancelJob,
  isCancellingJob,
  onModeChange,
  onRangeStartChange,
  onRangeCountChange,
  onDateStartChange,
  onDateEndChange,
  onProviderChange,
  onWorkerCountChange,
  onCodexModelChange,
  onCodexReasoningEffortChange,
  onAutoApplyChange,
  onCreateJob,
  onCancelJob,
}: BatchLauncherControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-sm">
        <p className="font-medium">{selectedCount} selected</p>
        <p className="text-xs text-muted-foreground">
          {selectedCount === 0
            ? 'Select blog rows to create a batch job.'
            : selectionSummary}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
        <Label htmlFor="batch-mode">Mode</Label>
        <select
          id="batch-mode"
          value={mode}
          onChange={(event) => onModeChange(event.target.value as BatchSelectionMode)}
          className="bg-transparent text-sm outline-none"
        >
          <option value="selected">Selected rows</option>
          <option value="range">Range</option>
          <option value="date">Date range</option>
        </select>
        {mode === 'range' ? (
          <>
            <Label htmlFor="batch-range-start">Start</Label>
            <input
              id="batch-range-start"
              aria-label="Batch range start"
              value={rangeStart}
              onChange={(event) => onRangeStartChange(event.target.value)}
              className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
            />
            <Label htmlFor="batch-range-count">Count</Label>
            <input
              id="batch-range-count"
              aria-label="Batch range count"
              value={rangeCount}
              onChange={(event) => onRangeCountChange(event.target.value)}
              className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
            />
          </>
        ) : null}
        {mode === 'date' ? (
          <>
            <Label htmlFor="batch-date-start">Start date</Label>
            <input
              id="batch-date-start"
              aria-label="Batch date start"
              type="date"
              value={dateStart}
              onChange={(event) => onDateStartChange(event.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            />
            <Label htmlFor="batch-date-end">End date</Label>
            <input
              id="batch-date-end"
              aria-label="Batch date end"
              type="date"
              value={dateEnd}
              onChange={(event) => onDateEndChange(event.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            />
            <span className="text-xs text-muted-foreground">publishedAt, fallback updatedAt</span>
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
        <span className="text-xs text-muted-foreground">Provider</span>
        {(runtimeConfig?.availableProviders?.length ?? 0) > 1 ? (
          <select
            aria-label="Batch AI provider"
            value={selectedProvider}
            onChange={(event) => onProviderChange(event.target.value as BatchAiProvider)}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            {(runtimeConfig?.availableProviders || []).map((provider) => (
              <option key={provider} value={provider}>
                {provider.toUpperCase()}
              </option>
            ))}
          </select>
        ) : (
          <span data-testid="admin-blog-batch-ai-provider" className="font-medium uppercase">{selectedProvider ?? runtimeConfig?.provider ?? 'loading'}</span>
        )}
        {selectedProvider === 'codex' ? (
          <>
            <Label htmlFor="batch-worker-count">Workers</Label>
            <input
              id="batch-worker-count"
              aria-label="Batch worker count"
              type="number"
              min={1}
              max={8}
              value={workerCount}
              onChange={(event) => onWorkerCountChange(event.target.value)}
              className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
            />
            <span className="text-xs text-muted-foreground">default {runtimeConfig?.batchConcurrency ?? 2}</span>
            <Label htmlFor="list-codex-model" className="sr-only">Codex model</Label>
            <select
              id="list-codex-model"
              aria-label="Blog batch codex model"
              value={codexModel}
              onChange={(event) => onCodexModelChange(event.target.value)}
              className="bg-transparent text-sm outline-none"
            >
              {(runtimeConfig?.allowedCodexModels || []).map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <Label htmlFor="list-codex-reasoning" className="sr-only">Codex reasoning</Label>
            <select
              id="list-codex-reasoning"
              aria-label="Blog batch codex reasoning"
              value={codexReasoningEffort}
              onChange={(event) => onCodexReasoningEffortChange(event.target.value)}
              className="bg-transparent text-sm outline-none"
            >
              {(runtimeConfig?.allowedCodexReasoningEfforts || []).map((effort) => (
                <option key={effort} value={effort}>{effort}</option>
              ))}
            </select>
            <label className="ml-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoApply}
                onChange={(event) => onAutoApplyChange(event.target.checked)}
              />
              <span>Auto-apply successful results</span>
            </label>
          </>
        ) : null}
      </div>
      <Button type="button" onClick={onCreateJob} disabled={selectedCount === 0 || isCreatingJob}>
        {isCreatingJob ? 'Creating job...' : 'Generate AI Fix job'}
      </Button>
      {showCancelJob ? (
        <Button type="button" variant="outline" onClick={onCancelJob} disabled={isCancellingJob}>
          {isCancellingJob ? 'Cancelling...' : 'Cancel job'}
        </Button>
      ) : null}
    </div>
  )
}
