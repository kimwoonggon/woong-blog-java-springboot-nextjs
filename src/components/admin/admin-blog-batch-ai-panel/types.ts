import type { BlogAiBatchJobListPayload } from '@/lib/api/admin-ai'

export const savedSystemPromptKey = 'admin-ai-blog-batch-system-prompt'

export type BatchAiProvider = 'openai' | 'azure' | 'codex'

export type BatchSelectionMode = 'selected' | 'range' | 'date'

export type JobCounts = Pick<
  BlogAiBatchJobListPayload,
  'runningCount' | 'queuedCount' | 'completedCount' | 'failedCount' | 'cancelledCount'
>
