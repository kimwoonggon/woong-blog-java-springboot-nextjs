'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchWithCsrf } from '@/lib/api/auth'
import { getBrowserApiBaseUrl } from '@/lib/api/browser'
import {
  fetchAdminAiRuntimeConfigBrowser,
  getBlogAiBatchJobBrowser,
  listBlogAiBatchJobsBrowser,
  type AdminAiRuntimeConfig,
  type BlogAiBatchJobDetail,
  type BlogAiBatchJobSummary,
} from '@/lib/api/admin-ai'
import { BatchLauncherControls } from '@/components/admin/admin-blog-batch-ai-panel/BatchLauncherControls'
import {
  rankStatus,
  readApiPayload,
  resolveBlogDate,
  summarizeSelectionTitles,
  type BlogBatchCandidate,
} from '@/components/admin/admin-blog-batch-ai-panel/helpers'
import { JobProgressPanel } from '@/components/admin/admin-blog-batch-ai-panel/JobProgressPanel'
import { JobSidebar } from '@/components/admin/admin-blog-batch-ai-panel/JobSidebar'
import { PromptSettings } from '@/components/admin/admin-blog-batch-ai-panel/PromptSettings'
import {
  savedSystemPromptKey,
  type BatchAiProvider,
  type BatchSelectionMode,
  type JobCounts,
} from '@/components/admin/admin-blog-batch-ai-panel/types'
import { useBatchJobPolling } from '@/components/admin/admin-blog-batch-ai-panel/useBatchJobPolling'
import { toast } from 'sonner'

interface AdminBlogBatchAiPanelProps {
  isOpen: boolean
  selectedBlogIds: string[]
  selectedBlogTitles: string[]
  availableBlogs: BlogBatchCandidate[]
  onApplied?: () => void
}

function hasApplyFailures(job: BlogAiBatchJobDetail) {
  return job.failedCount > 0 || job.items.some((item) => item.status === 'failed' || Boolean(item.error))
}

export function AdminBlogBatchAiPanel({
  isOpen,
  selectedBlogIds,
  selectedBlogTitles,
  availableBlogs,
  onApplied,
}: AdminBlogBatchAiPanelProps) {
  const [runtimeConfig, setRuntimeConfig] = useState<AdminAiRuntimeConfig | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<BatchAiProvider>('openai')
  const [recentJobs, setRecentJobs] = useState<BlogAiBatchJobSummary[]>([])
  const [jobCounts, setJobCounts] = useState<JobCounts>({
    runningCount: 0,
    queuedCount: 0,
    completedCount: 0,
    failedCount: 0,
    cancelledCount: 0,
  })
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [activeJob, setActiveJob] = useState<BlogAiBatchJobDetail | null>(null)
  const [selectedJobItemId, setSelectedJobItemId] = useState<string | null>(null)
  const [mode, setMode] = useState<BatchSelectionMode>('selected')
  const [rangeStart, setRangeStart] = useState('1')
  const [rangeCount, setRangeCount] = useState('10')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [codexModel, setCodexModel] = useState('gpt-5.5')
  const [codexReasoningEffort, setCodexReasoningEffort] = useState('medium')
  const [customPrompt, setCustomPrompt] = useState('')
  const [savedPrompt, setSavedPrompt] = useState('')
  const promptTouchedRef = useRef(false)
  const [workerCount, setWorkerCount] = useState('2')
  const [autoApply, setAutoApply] = useState(false)
  const [isCreatingJob, setIsCreatingJob] = useState(false)
  const [isApplyingJob, setIsApplyingJob] = useState(false)
  const [isCancellingJob, setIsCancellingJob] = useState(false)
  const [isCleaningJobs, setIsCleaningJobs] = useState(false)
  const [removingJobId, setRemovingJobId] = useState<string | null>(null)

  const previewJobItem = activeJob?.items.find((item) => item.jobItemId === selectedJobItemId)
    ?? activeJob?.items.find((item) => item.fixedHtml)
  const rangeStartIndex = Math.max(1, Number(rangeStart || '1'))
  const rangeCountValue = Math.max(1, Number(rangeCount || '1'))
  const rangeBlogs = availableBlogs.slice(rangeStartIndex - 1, rangeStartIndex - 1 + rangeCountValue)
  const dateBlogs = availableBlogs.filter((blog) => {
    const effectiveDate = resolveBlogDate(blog)
    if (!effectiveDate) {
      return false
    }

    if (dateStart && effectiveDate < dateStart) {
      return false
    }

    if (dateEnd && effectiveDate > dateEnd) {
      return false
    }

    return true
  })
  const selectedIdsForJob = mode === 'range'
    ? rangeBlogs.map((blog) => blog.id)
    : mode === 'date'
      ? dateBlogs.map((blog) => blog.id)
      : selectedBlogIds
  const selectedTitlesForJob = mode === 'range'
    ? rangeBlogs.map((blog) => blog.title)
    : mode === 'date'
      ? dateBlogs.map((blog) => blog.title)
      : selectedBlogTitles
  const currentRunningJob = recentJobs.find((job) => job.status === 'running') ?? null
  const queuedJobs = recentJobs.filter((job) => job.status === 'queued')
  const selectionSummary = summarizeSelectionTitles(selectedTitlesForJob)
  const hasUnsavedPrompt = customPrompt !== savedPrompt
  const duplicateCounts = recentJobs.reduce<Record<string, number>>((acc, job) => {
    if (job.selectionKey) {
      acc[job.selectionKey] = (acc[job.selectionKey] ?? 0) + 1
    }
    return acc
  }, {})

  const loadRecentJobs = useCallback(async (nextActiveJobId?: string | null) => {
    try {
      const payload = await listBlogAiBatchJobsBrowser()
      const prioritized = [...payload.jobs].sort((left, right) => rankStatus(left.status) - rankStatus(right.status) || right.createdAt.localeCompare(left.createdAt))
      setRecentJobs(prioritized)
      setJobCounts({
        runningCount: payload.runningCount,
        queuedCount: payload.queuedCount,
        completedCount: payload.completedCount,
        failedCount: payload.failedCount,
        cancelledCount: payload.cancelledCount,
      })
      if (nextActiveJobId) {
        setActiveJobId(nextActiveJobId)
      } else if (!activeJobId && prioritized[0]) {
        setActiveJobId(prioritized[0].jobId)
      } else if (activeJobId) {
        const stillExists = prioritized.some((job) => job.jobId === activeJobId)
        if (!stillExists && prioritized[0]) {
          setActiveJobId(prioritized[0].jobId)
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load AI batch jobs')
    }
  }, [activeJobId])

  const loadJobDetail = useCallback(async (jobId: string) => {
    try {
      const job = await getBlogAiBatchJobBrowser(jobId)
      setActiveJob(job)
      if (job.items.length > 0 && !selectedJobItemId) {
        const firstPreviewable = job.items.find((item) => item.fixedHtml)
        if (firstPreviewable) {
          setSelectedJobItemId(firstPreviewable.jobItemId)
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load AI batch job')
    }
  }, [selectedJobItemId])

  useEffect(() => {
    if (!isOpen) {
      promptTouchedRef.current = false
      return
    }

    let cancelled = false
    const savedProvider = typeof window !== 'undefined' ? window.localStorage.getItem('admin-ai-provider') : null
    const savedModel = typeof window !== 'undefined' ? window.localStorage.getItem('admin-ai-codex-model') : null
    const savedReasoning = typeof window !== 'undefined' ? window.localStorage.getItem('admin-ai-codex-reasoning') : null
    const savedPrompt = typeof window !== 'undefined' ? window.localStorage.getItem(savedSystemPromptKey) : null

    void fetchAdminAiRuntimeConfigBrowser()
      .then((config) => {
        if (cancelled) {
          return
        }

        setRuntimeConfig(config)
        const availableProviders = (config.availableProviders?.length ? config.availableProviders : [config.provider]) as BatchAiProvider[]
        const preferredProvider = (savedProvider || config.provider) as BatchAiProvider
        setSelectedProvider(availableProviders.includes(preferredProvider) ? preferredProvider : availableProviders[0])
        setCodexModel(savedModel || config.codexModel || 'gpt-5.5')
        setCodexReasoningEffort(savedReasoning || config.codexReasoningEffort || 'medium')
        const prompt = savedPrompt || config.defaultBlogFixPrompt || config.defaultSystemPrompt || ''
        if (!promptTouchedRef.current) {
          setCustomPrompt(prompt)
          setSavedPrompt(prompt)
        }
        setWorkerCount(String(config.batchConcurrency || 2))
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load AI runtime config')
        }
      })

    void loadRecentJobs()

    return () => {
      cancelled = true
    }
  }, [isOpen, loadRecentJobs])

  useEffect(() => {
    if (!activeJobId) {
      setActiveJob(null)
      return
    }

    void loadJobDetail(activeJobId)
  }, [activeJobId, loadJobDetail])

  useBatchJobPolling({
    isOpen,
    activeJobId,
    activeJobStatus: activeJob?.status,
    loadRecentJobs,
    loadJobDetail,
  })

  function selectProvider(nextProvider: BatchAiProvider) {
    setSelectedProvider(nextProvider)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('admin-ai-provider', nextProvider)
    }
  }

  function selectCodexModel(nextModel: string) {
    setCodexModel(nextModel)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('admin-ai-codex-model', nextModel)
    }
  }

  function selectCodexReasoningEffort(nextReasoningEffort: string) {
    setCodexReasoningEffort(nextReasoningEffort)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('admin-ai-codex-reasoning', nextReasoningEffort)
    }
  }

  function updateCustomPrompt(value: string) {
    promptTouchedRef.current = true
    setCustomPrompt(value)
  }

  function selectJob(jobId: string) {
    setActiveJobId(jobId)
    setSelectedJobItemId(null)
  }

  function refreshJobs() {
    void loadRecentJobs(activeJobId)
    if (activeJobId) {
      void loadJobDetail(activeJobId)
    }
  }

  async function createBatchAiJob() {
    if (mode === 'date' && !dateStart && !dateEnd) {
      toast.error('Set a start date or end date before creating a date-range batch job')
      return
    }

    if (mode === 'date' && dateStart && dateEnd && dateStart > dateEnd) {
      toast.error('Start date must be before or equal to end date')
      return
    }

    if (selectedIdsForJob.length === 0) {
      toast.error('No blog posts match the current batch selection')
      return
    }

    if (customPrompt !== savedPrompt) {
      toast.error('Save the system prompt before generating an AI fix job.')
      return
    }

    setIsCreatingJob(true)
    try {
      const response = await fetchWithCsrf(
        `${getBrowserApiBaseUrl()}/admin/ai/blog-fix-batch-jobs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blogIds: selectedIdsForJob,
            all: false,
            selectionMode: mode,
            selectionLabel: mode === 'range'
              ? `range ${rangeStartIndex}-${rangeStartIndex + rangeBlogs.length - 1}`
              : mode === 'date'
                ? `date ${dateStart || 'start'} → ${dateEnd || 'end'}`
                : `${selectedIdsForJob.length} selected`,
            autoApply,
            workerCount: Number(workerCount || String(runtimeConfig?.batchConcurrency || 2)),
            provider: selectedProvider,
            codexModel,
            codexReasoningEffort,
            customPrompt: savedPrompt.trim() || undefined,
          }),
        },
      )

      const payload = await readApiPayload(response)
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create AI batch job')
      }

      const jobId = payload.jobId as string
      const reusedExisting = recentJobs.some((job) => job.jobId === jobId)
      setSelectedJobItemId(null)
      await loadRecentJobs(jobId)
      await loadJobDetail(jobId)
      toast.success(reusedExisting ? 'Existing AI batch job reopened' : 'AI batch job started')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create AI batch job')
    } finally {
      setIsCreatingJob(false)
    }
  }

  function saveSystemPrompt() {
    persistSystemPrompt(customPrompt)
    setSavedPrompt(customPrompt)
    promptTouchedRef.current = false
    toast.success('System prompt saved')
  }

  function persistSystemPrompt(value: string) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(savedSystemPromptKey, value)
    }
  }

  function resetSystemPrompt() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(savedSystemPromptKey)
    }

    const defaultPrompt = runtimeConfig?.defaultBlogFixPrompt || runtimeConfig?.defaultSystemPrompt || ''
    setCustomPrompt(defaultPrompt)
    setSavedPrompt(defaultPrompt)
    promptTouchedRef.current = false
    toast.success('System prompt reset')
  }

  async function applyJobResults(jobItemIds?: string[]) {
    if (!activeJobId) {
      return
    }

    setIsApplyingJob(true)
    try {
      const response = await fetchWithCsrf(
        `${getBrowserApiBaseUrl()}/admin/ai/blog-fix-batch-jobs/${encodeURIComponent(activeJobId)}/apply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobItemIds }),
        },
      )

      const payload = await readApiPayload(response)
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to apply AI batch results')
      }

      const appliedJob = payload as unknown as BlogAiBatchJobDetail
      setActiveJob(appliedJob)
      await loadRecentJobs(activeJobId)
      onApplied?.()
      if (hasApplyFailures(appliedJob)) {
        toast.error('AI batch results partially applied; review failed items.')
      } else {
        toast.success('AI batch results applied')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to apply AI batch results')
    } finally {
      setIsApplyingJob(false)
    }
  }

  async function cancelJob(jobId = activeJobId) {
    if (!jobId) {
      return
    }

    setIsCancellingJob(true)
    try {
      const response = await fetchWithCsrf(
        `${getBrowserApiBaseUrl()}/admin/ai/blog-fix-batch-jobs/${encodeURIComponent(jobId)}/cancel`,
        { method: 'POST' },
      )

      const payload = await readApiPayload(response)
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to cancel AI batch job')
      }

      await loadRecentJobs(jobId)
      await loadJobDetail(jobId)
      toast.success('AI batch cancellation requested')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel AI batch job')
    } finally {
      setIsCancellingJob(false)
    }
  }

  async function cancelQueuedJobs() {
    setIsCancellingJob(true)
    try {
      const response = await fetchWithCsrf(
        `${getBrowserApiBaseUrl()}/admin/ai/blog-fix-batch-jobs/cancel-queued`,
        { method: 'POST' },
      )

      const payload = await readApiPayload(response)
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to cancel queued AI batch jobs')
      }

      await loadRecentJobs()
      if (activeJobId) {
        await loadJobDetail(activeJobId)
      }
      toast.success(`Cancelled ${payload.cancelled ?? 0} queued AI job(s)`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel queued AI batch jobs')
    } finally {
      setIsCancellingJob(false)
    }
  }

  async function clearCompletedJobs() {
    setIsCleaningJobs(true)
    try {
      const response = await fetchWithCsrf(
        `${getBrowserApiBaseUrl()}/admin/ai/blog-fix-batch-jobs/clear-completed`,
        { method: 'POST' },
      )

      const payload = await readApiPayload(response)
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to clear completed AI batch jobs')
      }

      if (activeJob?.status === 'completed') {
        setActiveJobId(null)
        setActiveJob(null)
        setSelectedJobItemId(null)
      }

      await loadRecentJobs()
      toast.success(`Cleared ${payload.cleared ?? 0} completed AI job(s)`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear completed AI batch jobs')
    } finally {
      setIsCleaningJobs(false)
    }
  }

  async function removeTerminalJob(jobId: string) {
    setRemovingJobId(jobId)
    try {
      const response = await fetchWithCsrf(
        `${getBrowserApiBaseUrl()}/admin/ai/blog-fix-batch-jobs/${encodeURIComponent(jobId)}`,
        { method: 'DELETE' },
      )

      const payload = await readApiPayload(response)
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to remove AI batch job')
      }

      if (activeJobId === jobId) {
        setActiveJobId(null)
        setActiveJob(null)
        setSelectedJobItemId(null)
      }

      await loadRecentJobs()
      toast.success('AI batch job removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove AI batch job')
    } finally {
      setRemovingJobId(null)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div data-testid="admin-blog-batch-ai-panel" className="border-b border-gray-200 px-4 py-4 dark:border-gray-800">
      <BatchLauncherControls
        selectedCount={selectedIdsForJob.length}
        selectionSummary={selectionSummary}
        mode={mode}
        rangeStart={rangeStart}
        rangeCount={rangeCount}
        dateStart={dateStart}
        dateEnd={dateEnd}
        runtimeConfig={runtimeConfig}
        selectedProvider={selectedProvider}
        workerCount={workerCount}
        codexModel={codexModel}
        codexReasoningEffort={codexReasoningEffort}
        autoApply={autoApply}
        isCreatingJob={isCreatingJob}
        showCancelJob={Boolean(activeJob && ['queued', 'running'].includes(activeJob.status))}
        isCancellingJob={isCancellingJob}
        onModeChange={setMode}
        onRangeStartChange={setRangeStart}
        onRangeCountChange={setRangeCount}
        onDateStartChange={setDateStart}
        onDateEndChange={setDateEnd}
        onProviderChange={selectProvider}
        onWorkerCountChange={setWorkerCount}
        onCodexModelChange={selectCodexModel}
        onCodexReasoningEffortChange={selectCodexReasoningEffort}
        onAutoApplyChange={setAutoApply}
        onCreateJob={() => void createBatchAiJob()}
        onCancelJob={() => void cancelJob()}
      />
      <PromptSettings
        customPrompt={customPrompt}
        hasUnsavedPrompt={hasUnsavedPrompt}
        onCustomPromptChange={updateCustomPrompt}
        onResetSystemPrompt={resetSystemPrompt}
        onSaveSystemPrompt={saveSystemPrompt}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <JobSidebar
          recentJobs={recentJobs}
          jobCounts={jobCounts}
          currentRunningJob={currentRunningJob}
          queuedJobsCount={queuedJobs.length}
          activeJobId={activeJobId}
          duplicateCounts={duplicateCounts}
          runtimeBatchConcurrency={runtimeConfig?.batchConcurrency}
          isCancellingJob={isCancellingJob}
          isCleaningJobs={isCleaningJobs}
          removingJobId={removingJobId}
          onRefreshJobs={refreshJobs}
          onSelectJob={selectJob}
          onCancelJob={(jobId) => void cancelJob(jobId)}
          onCancelQueuedJobs={() => void cancelQueuedJobs()}
          onClearCompletedJobs={() => void clearCompletedJobs()}
          onRemoveTerminalJob={(jobId) => void removeTerminalJob(jobId)}
        />

        <JobProgressPanel
          activeJob={activeJob}
          previewJobItem={previewJobItem}
          isApplyingJob={isApplyingJob}
          onApplyJobResults={(jobItemIds) => void applyJobResults(jobItemIds)}
          onSelectJobItem={setSelectedJobItemId}
        />
      </div>
    </div>
  )
}
