import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { BlogAiBatchJobDetail, BlogAiBatchJobItem } from '@/lib/api/admin-ai'
import { JobPreview } from '@/components/admin/admin-blog-batch-ai-panel/JobPreview'

interface JobProgressPanelProps {
  activeJob: BlogAiBatchJobDetail | null
  previewJobItem?: BlogAiBatchJobItem
  isApplyingJob: boolean
  onApplyJobResults: (jobItemIds?: string[]) => void
  onSelectJobItem: (jobItemId: string) => void
}

export function JobProgressPanel({
  activeJob,
  previewJobItem,
  isApplyingJob,
  onApplyJobResults,
  onSelectJobItem,
}: JobProgressPanelProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/10 p-3">
      {activeJob ? (
        <>
          <p data-testid="admin-blog-batch-ai-status" className="text-sm text-muted-foreground">
            {activeJob.status} · {activeJob.processedCount}/{activeJob.totalCount} processed · {activeJob.succeededCount} succeeded · {activeJob.failedCount} failed
          </p>
          {activeJob.autoApply ? (
            <p className="text-xs text-emerald-600">Auto-apply is enabled for this job. Successful results save automatically.</p>
          ) : null}
          {activeJob.status === 'completed' && !activeJob.autoApply ? (
            <Button
              size="sm"
              type="button"
              onClick={() => onApplyJobResults()}
              disabled={isApplyingJob || !activeJob.items.some((item) => item.status === 'succeeded' && !item.appliedAt)}
            >
              {isApplyingJob ? 'Applying...' : 'Apply all successful'}
            </Button>
          ) : null}
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {activeJob.items.map((item) => (
              <div key={item.jobItemId} className="rounded-xl border border-border/70 bg-background px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left font-medium"
                    onClick={() => onSelectJobItem(item.jobItemId)}
                  >
                    {item.title}
                  </button>
                  <Badge variant="secondary">{item.status}</Badge>
                </div>
                {item.error ? <p className="mt-1 text-xs text-red-500">{item.error}</p> : null}
                {item.status === 'succeeded' && !item.appliedAt && !activeJob.autoApply ? (
                  <Button size="sm" variant="outline" type="button" className="mt-2" onClick={() => onApplyJobResults([item.jobItemId])} disabled={isApplyingJob}>
                    Apply this result
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          {previewJobItem?.fixedHtml ? (
            <JobPreview fixedHtml={previewJobItem.fixedHtml} />
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Open or create a batch AI job to see progress here.</p>
      )}
    </div>
  )
}
