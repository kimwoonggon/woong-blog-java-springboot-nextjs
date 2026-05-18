import { RefreshCcw, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { BlogAiBatchJobSummary } from '@/lib/api/admin-ai'
import type { JobCounts } from '@/components/admin/admin-blog-batch-ai-panel/types'

interface JobSidebarProps {
  recentJobs: BlogAiBatchJobSummary[]
  jobCounts: JobCounts
  currentRunningJob: BlogAiBatchJobSummary | null
  queuedJobsCount: number
  activeJobId: string | null
  duplicateCounts: Record<string, number>
  runtimeBatchConcurrency?: number
  isCancellingJob: boolean
  isCleaningJobs: boolean
  removingJobId: string | null
  onRefreshJobs: () => void
  onSelectJob: (jobId: string) => void
  onCancelJob: (jobId: string) => void
  onCancelQueuedJobs: () => void
  onClearCompletedJobs: () => void
  onRemoveTerminalJob: (jobId: string) => void
}

export function JobSidebar({
  recentJobs,
  jobCounts,
  currentRunningJob,
  queuedJobsCount,
  activeJobId,
  duplicateCounts,
  runtimeBatchConcurrency,
  isCancellingJob,
  isCleaningJobs,
  removingJobId,
  onRefreshJobs,
  onSelectJob,
  onCancelJob,
  onCancelQueuedJobs,
  onClearCompletedJobs,
  onRemoveTerminalJob,
}: JobSidebarProps) {
  return (
    <aside className="space-y-3 rounded-2xl border border-border/80 bg-muted/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Recent AI jobs</p>
          <p className="text-xs text-muted-foreground">Refresh on demand while you browse the blog list.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            running {jobCounts.runningCount} · queued {jobCounts.queuedCount} · completed {jobCounts.completedCount} · failed {jobCounts.failedCount} · cancelled {jobCounts.cancelledCount}
          </p>
          {currentRunningJob ? (
            <p className="mt-1 text-xs text-amber-600" data-testid="admin-blog-current-running-job">
              Running now: {currentRunningJob.selectionLabel || currentRunningJob.jobId}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={onRefreshJobs}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh jobs
          </Button>
          {queuedJobsCount > 0 ? (
            <Button size="sm" variant="outline" type="button" onClick={onCancelQueuedJobs} disabled={isCancellingJob}>
              {isCancellingJob ? 'Cancelling queued...' : `Cancel queued (${queuedJobsCount})`}
            </Button>
          ) : null}
          {jobCounts.completedCount > 0 ? (
            <Button size="sm" variant="outline" type="button" onClick={onClearCompletedJobs} disabled={isCleaningJobs}>
              {isCleaningJobs ? 'Clearing completed...' : `Clear completed (${jobCounts.completedCount})`}
            </Button>
          ) : null}
        </div>
      </div>
      {recentJobs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No AI jobs yet.</p>
      ) : recentJobs.map((job) => (
        <div
          key={job.jobId}
          onClick={() => onSelectJob(job.jobId)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onSelectJob(job.jobId)
            }
          }}
          role="button"
          tabIndex={0}
          className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
            activeJobId === job.jobId ? 'border-primary/40 bg-primary/5' : 'border-border/80 hover:bg-muted/30'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium uppercase">{job.status}</span>
            <div className="flex items-center gap-2">
              {job.selectionKey && duplicateCounts[job.selectionKey] > 1 ? (
                <Badge variant="secondary">duplicate x{duplicateCounts[job.selectionKey]}</Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">{job.processedCount}/{job.totalCount}</span>
              {['completed', 'failed', 'cancelled'].includes(job.status) ? (
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  className="h-7 w-7"
                  aria-label={`Remove ${job.status} job`}
                  disabled={removingJobId === job.jobId}
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemoveTerminalJob(job.jobId)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {job.selectionLabel || job.selectionMode} · {job.provider} · workers {job.workerCount ?? runtimeBatchConcurrency ?? 2} · {job.model}{job.reasoningEffort ? ` · ${job.reasoningEffort}` : ''}{job.autoApply ? ' · auto-apply' : ''}
          </p>
          {['queued', 'running'].includes(job.status) ? (
            <Button
              size="sm"
              variant="outline"
              type="button"
              className="mt-2"
              onClick={(event) => {
                event.stopPropagation()
                onCancelJob(job.jobId)
              }}
            >
              Cancel queued/running
            </Button>
          ) : null}
        </div>
      ))}
    </aside>
  )
}
