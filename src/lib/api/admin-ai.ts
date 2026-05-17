import { getBrowserApiBaseUrl } from '@/lib/api/browser'

export interface AdminAiRuntimeConfig {
  provider: string
  availableProviders: string[]
  defaultModel: string
  codexModel: string
  codexReasoningEffort: string
  allowedCodexModels: string[]
  allowedCodexReasoningEfforts: string[]
  batchConcurrency: number
  batchCompletedRetentionDays: number
  defaultSystemPrompt: string
  defaultBlogFixPrompt?: string
  defaultWorkEnrichPrompt?: string
}

export interface BlogAiBatchJobSummary {
  jobId: string
  status: string
  selectionMode: string
  selectionLabel: string
  selectionKey: string
  autoApply: boolean
  workerCount?: number | null
  totalCount: number
  processedCount: number
  succeededCount: number
  failedCount: number
  provider: string
  model: string
  reasoningEffort?: string | null
  customPrompt?: string | null
  createdAt: string
  startedAt?: string | null
  finishedAt?: string | null
  cancelRequested: boolean
}

export interface BlogAiBatchJobItem {
  jobItemId: string
  blogId: string
  title: string
  status: string
  fixedHtml?: string | null
  error?: string | null
  provider?: string | null
  model?: string | null
  reasoningEffort?: string | null
  appliedAt?: string | null
}

export interface BlogAiBatchJobDetail extends BlogAiBatchJobSummary {
  items: BlogAiBatchJobItem[]
}

export interface BlogAiBatchJobListPayload {
  jobs: BlogAiBatchJobSummary[]
  runningCount: number
  queuedCount: number
  completedCount: number
  failedCount: number
  cancelledCount: number
}

export async function fetchAdminAiRuntimeConfigBrowser() {
  const response = await fetch(`${getBrowserApiBaseUrl()}/admin/ai/runtime-config`, {
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Failed to load AI runtime config.')
  }

  return response.json() as Promise<AdminAiRuntimeConfig>
}

export async function listBlogAiBatchJobsBrowser() {
  const response = await fetch(`${getBrowserApiBaseUrl()}/admin/ai/blog-fix-batch-jobs`, {
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Failed to load AI batch jobs.')
  }

  const payload = await response.json() as Partial<BlogAiBatchJobListPayload>
  return {
    jobs: payload.jobs ?? [],
    runningCount: payload.runningCount ?? 0,
    queuedCount: payload.queuedCount ?? 0,
    completedCount: payload.completedCount ?? 0,
    failedCount: payload.failedCount ?? 0,
    cancelledCount: payload.cancelledCount ?? 0,
  } satisfies BlogAiBatchJobListPayload
}

export async function getBlogAiBatchJobBrowser(jobId: string) {
  const response = await fetch(`${getBrowserApiBaseUrl()}/admin/ai/blog-fix-batch-jobs/${encodeURIComponent(jobId)}`, {
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Failed to load AI batch job.')
  }

  return response.json() as Promise<BlogAiBatchJobDetail>
}
