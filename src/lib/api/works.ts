import { getPublicServerApiBaseUrl } from '@/lib/api/public-server'
import { throwPublicApiError } from '@/lib/api/public-errors'
import { PUBLIC_CONTENT_TAGS, publicContentFetchInit } from '@/lib/api/public-cache'
import type { BlogContentPayload } from '@/lib/content/blog-content'

export interface WorkVideo {
  id: string
  sourceType: 'youtube' | 'local' | 'r2' | 'hls'
  sourceKey: string
  playbackUrl?: string | null
  originalFileName?: string | null
  mimeType?: string | null
  fileSize?: number | null
  width?: number | null
  height?: number | null
  durationSeconds?: number | null
  timelinePreviewVttUrl?: string | null
  timelinePreviewSpriteUrl?: string | null
  sortOrder: number
  createdAt?: string
}

export interface WorkListItem {
  id: string
  slug: string
  title: string
  excerpt: string
  category: string
  tags: string[]
  thumbnailUrl?: string
  publishedAt?: string | null
}

export interface PagedWorksPayload {
  items: WorkListItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface PublicWorkSearchParams {
  query?: string
  legacySearchMode?: 'title' | 'content' | string | null
}

export interface WorkAdminItem extends WorkListItem {
  period?: string | null
  published: boolean
  createdAt?: string
  updatedAt?: string
}

export interface WorkDetail extends WorkListItem {
  period?: string | null
  content?: BlogContentPayload
  contentJson?: string
  socialShareMessage?: string | null
  videosVersion: number
  videos: WorkVideo[]
}

export interface WorkDetailContext {
  newer: WorkListItem | null
  older: WorkListItem | null
  related: WorkListItem[]
}

async function buildAdminHeaders(): Promise<Record<string, string>> {
  const { getServerCookieHeader } = await import('@/lib/api/server')
  const cookieHeader = await getServerCookieHeader()
  if (!cookieHeader) {
    return {}
  }

  return { cookie: cookieHeader }
}

function ensureRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message)
  }

  return value as Record<string, unknown>
}

function parseWorkVideo(value: unknown): WorkVideo {
  const record = ensureRecord(value, 'Work video payload must be an object.')
  const id = typeof record.id === 'string' ? record.id : ''
  const sourceType = typeof record.sourceType === 'string' ? record.sourceType : ''
  const sourceKey = typeof record.sourceKey === 'string' ? record.sourceKey : ''
  const sortOrder = typeof record.sortOrder === 'number' ? record.sortOrder : Number.NaN

  if (!id || !sourceType || !sourceKey || Number.isNaN(sortOrder)) {
    throw new Error('Work video payload is malformed.')
  }

  return {
    id,
    sourceType: sourceType as WorkVideo['sourceType'],
    sourceKey,
    playbackUrl: typeof record.playbackUrl === 'string' || record.playbackUrl === null ? record.playbackUrl : null,
    originalFileName: typeof record.originalFileName === 'string' || record.originalFileName === null ? record.originalFileName : null,
    mimeType: typeof record.mimeType === 'string' || record.mimeType === null ? record.mimeType : null,
    fileSize: typeof record.fileSize === 'number' || record.fileSize === null ? record.fileSize : null,
    width: typeof record.width === 'number'
      ? record.width
      : typeof record.videoWidth === 'number'
        ? record.videoWidth
        : null,
    height: typeof record.height === 'number'
      ? record.height
      : typeof record.videoHeight === 'number'
        ? record.videoHeight
        : null,
    durationSeconds: typeof record.durationSeconds === 'number'
      ? record.durationSeconds
      : typeof record.duration_seconds === 'number'
        ? record.duration_seconds
        : null,
    timelinePreviewVttUrl: typeof record.timelinePreviewVttUrl === 'string' || record.timelinePreviewVttUrl === null
      ? record.timelinePreviewVttUrl
      : typeof record.timeline_preview_vtt_url === 'string' || record.timeline_preview_vtt_url === null
        ? record.timeline_preview_vtt_url
        : null,
    timelinePreviewSpriteUrl: typeof record.timelinePreviewSpriteUrl === 'string' || record.timelinePreviewSpriteUrl === null
      ? record.timelinePreviewSpriteUrl
      : typeof record.timeline_preview_sprite_url === 'string' || record.timeline_preview_sprite_url === null
        ? record.timeline_preview_sprite_url
        : null,
    sortOrder,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
  }
}

function parseVideosField(record: Record<string, unknown>): WorkVideo[] {
  if (!('videos' in record)) {
    return []
  }

  if (!Array.isArray(record.videos)) {
    throw new Error('Work videos payload must be an array when present.')
  }

  return record.videos.map(parseWorkVideo)
}

function parseVideosVersion(record: Record<string, unknown>): number {
  if (typeof record.videosVersion === 'number') {
    return record.videosVersion
  }

  if (typeof record.videos_version === 'number') {
    return record.videos_version
  }

  return 0
}

function parseWorkDetailPayload(payload: unknown): WorkDetail {
  const record = ensureRecord(payload, 'Work detail payload is malformed.')
  const content = record.content && typeof record.content === 'object' && !Array.isArray(record.content)
    ? record.content as Record<string, unknown>
    : {}

  return {
    id: String(record.id ?? ''),
    slug: String(record.slug ?? ''),
    title: String(record.title ?? ''),
    excerpt: String(record.excerpt ?? ''),
    content: {
      html: typeof content.html === 'string' ? content.html : undefined,
      markdown: typeof content.markdown === 'string' ? content.markdown : undefined,
    },
    contentJson: typeof record.contentJson === 'string' ? record.contentJson : undefined,
    socialShareMessage: typeof record.socialShareMessage === 'string' || record.socialShareMessage === null
      ? record.socialShareMessage
      : typeof record.social_share_message === 'string' || record.social_share_message === null
        ? record.social_share_message
        : null,
    category: String(record.category ?? ''),
    period: typeof record.period === 'string' || record.period === null ? record.period : null,
    tags: Array.isArray(record.tags) ? record.tags.map((tag) => String(tag)) : [],
    thumbnailUrl: typeof record.thumbnailUrl === 'string' ? record.thumbnailUrl : undefined,
    publishedAt: typeof record.publishedAt === 'string' || record.publishedAt === null ? record.publishedAt : null,
    videosVersion: parseVideosVersion(record),
    videos: parseVideosField(record),
  }
}

export interface AdminWorkDetailPayload {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  period?: string | null
  tags: string[]
  published: boolean
  publishedAt?: string | null
  updatedAt?: string
  content: { html: string }
  all_properties: Record<string, unknown>
  thumbnail_asset_id?: string | null
  icon_asset_id?: string | null
  thumbnail_url?: string
  icon_url?: string
  videos_version: number
  videos: WorkVideo[]
}

function parseAdminWorkDetailPayload(payload: unknown): AdminWorkDetailPayload {
  const record = ensureRecord(payload, 'Admin work detail payload is malformed.')
  const contentRecord = ensureRecord(record.content ?? {}, 'Admin work content payload is malformed.')
  const allProperties = record.all_properties && typeof record.all_properties === 'object' && !Array.isArray(record.all_properties)
    ? record.all_properties as Record<string, unknown>
    : {}

  return {
    id: String(record.id ?? ''),
    title: String(record.title ?? ''),
    slug: String(record.slug ?? ''),
    excerpt: String(record.excerpt ?? ''),
    category: String(record.category ?? ''),
    period: typeof record.period === 'string' || record.period === null ? record.period : null,
    tags: Array.isArray(record.tags) ? record.tags.map((tag) => String(tag)) : [],
    published: Boolean(record.published),
    publishedAt: typeof record.publishedAt === 'string' || record.publishedAt === null ? record.publishedAt : null,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
    content: { html: String(contentRecord.html ?? '') },
    all_properties: allProperties,
    thumbnail_asset_id: typeof record.thumbnail_asset_id === 'string' || record.thumbnail_asset_id === null ? record.thumbnail_asset_id : null,
    icon_asset_id: typeof record.icon_asset_id === 'string' || record.icon_asset_id === null ? record.icon_asset_id : null,
    thumbnail_url: typeof record.thumbnail_url === 'string' ? record.thumbnail_url : undefined,
    icon_url: typeof record.icon_url === 'string' ? record.icon_url : undefined,
    videos_version: parseVideosVersion(record),
    videos: parseVideosField(record),
  }
}

export async function fetchPublicWorks(page = 1, pageSize = 6, searchParams?: PublicWorkSearchParams) {
  const apiBaseUrl = await getPublicServerApiBaseUrl()
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  if (searchParams?.query?.trim()) {
    params.set('query', searchParams.query.trim())
    if (searchParams.legacySearchMode === 'content' || searchParams.legacySearchMode === 'title') {
      params.set('searchMode', searchParams.legacySearchMode)
    }
  }

  const response = await fetch(`${apiBaseUrl}/public/works?${params.toString()}`, {
    ...publicContentFetchInit([PUBLIC_CONTENT_TAGS.works]),
  })
  if (!response.ok) {
    await throwPublicApiError(response, 'Failed to load public works.')
  }
  return response.json() as Promise<PagedWorksPayload>
}

export async function fetchAllPublicWorks(pageSize = 100) {
  const firstPage = await fetchPublicWorks(1, pageSize)
  const items = [...firstPage.items]

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const nextPage = await fetchPublicWorks(page, pageSize)
    items.push(...nextPage.items)
  }

  return items
}

export async function fetchPublicWorkContext(slug: string, limit = 9) {
  const apiBaseUrl = await getPublicServerApiBaseUrl()
  const params = new URLSearchParams({ limit: String(limit) })
  const response = await fetch(`${apiBaseUrl}/public/works/${encodeURIComponent(slug)}/context?${params.toString()}`, {
    ...publicContentFetchInit([PUBLIC_CONTENT_TAGS.works, PUBLIC_CONTENT_TAGS.work(slug)]),
  })
  if (response.status === 404) return null
  if (!response.ok) {
    await throwPublicApiError(response, `Failed to load public work context '${slug}'.`)
  }
  return response.json() as Promise<WorkDetailContext>
}

export async function fetchPublicWorkBySlug(slug: string) {
  const apiBaseUrl = await getPublicServerApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/public/works/${encodeURIComponent(slug)}`, {
    ...publicContentFetchInit([PUBLIC_CONTENT_TAGS.works, PUBLIC_CONTENT_TAGS.work(slug)]),
  })
  if (response.status === 404) return null
  if (!response.ok) {
    await throwPublicApiError(response, `Failed to load public work '${slug}'.`)
  }
  return parseWorkDetailPayload(await response.json())
}

export async function fetchAdminWorks() {
  const { getServerApiBaseUrl } = await import('@/lib/api/server')
  const apiBaseUrl = await getServerApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/admin/works`, {
    cache: 'no-store',
    headers: await buildAdminHeaders(),
  })
  if (!response.ok) throw new Error('Failed to load admin works.')
  return response.json() as Promise<WorkAdminItem[]>
}

export async function fetchAdminWorkById(id: string) {
  const { getServerApiBaseUrl } = await import('@/lib/api/server')
  const apiBaseUrl = await getServerApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/admin/works/${encodeURIComponent(id)}`, {
    cache: 'no-store',
    headers: await buildAdminHeaders(),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Failed to load the requested work item.')
  return parseAdminWorkDetailPayload(await response.json())
}
