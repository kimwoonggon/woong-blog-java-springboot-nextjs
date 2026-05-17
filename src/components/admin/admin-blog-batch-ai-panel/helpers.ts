export interface BlogBatchCandidate {
  id: string
  title: string
  publishedAt?: string | null
  updatedAt?: string | null
}

export type ApiPayload = Record<string, unknown> & {
  error?: string
  jobId?: string
  cancelled?: number
  cleared?: number
}

export function rankStatus(status: string) {
  switch (status) {
    case 'running':
      return 0
    case 'queued':
      return 1
    case 'completed':
      return 2
    case 'failed':
      return 3
    case 'cancelled':
      return 4
    default:
      return 5
  }
}

export function resolveBlogDate(blog: BlogBatchCandidate) {
  const value = blog.publishedAt ?? blog.updatedAt ?? null
  return value ? value.slice(0, 10) : null
}

export function summarizeSelectionTitles(titles: string[]) {
  if (titles.length === 0) {
    return ''
  }

  if (titles.length <= 5) {
    return titles.join(' · ')
  }

  return `${titles.slice(0, 5).join(' · ')} · +${titles.length - 5} more`
}

export async function readApiPayload(response: Response): Promise<ApiPayload> {
  const text = await response.text()
  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text) as ApiPayload
  } catch {
    return { error: text }
  }
}
