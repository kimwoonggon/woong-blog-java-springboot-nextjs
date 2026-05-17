import { resolveWorkThumbnailSource, type WorkThumbnailSourceKind } from '@/lib/content/work-thumbnail-resolution'
import type {
  VideoMutationPayload,
  Work,
  WorkSaveResponsePayload,
} from './types'

export function normalizeTagsInput(tags: string) {
  return tags.split(',').map((tag) => tag.trim()).filter(Boolean)
}

export function normalizeTextInput(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

export function createClientId() {
  const cryptoApi = globalThis.crypto
  const randomUuid = cryptoApi?.randomUUID

  if (typeof randomUuid === 'function') {
    return randomUuid.call(cryptoApi)
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function normalizeJsonInput(value: string) {
  if (!value.trim()) {
    return '{}'
  }

  try {
    return JSON.stringify(JSON.parse(value))
  } catch {
    return value.trim()
  }
}

export function buildWorkSnapshot({
  title,
  category,
  period,
  tags,
  published,
  html,
  allProperties,
  thumbnailAssetId,
  iconAssetId,
}: {
  title: string
  category: string
  period: string
  tags: string
  published: boolean
  html: string
  allProperties: string
  thumbnailAssetId: string
  iconAssetId: string
}) {
  return JSON.stringify({
    title: title.trim(),
    category: category.trim(),
    period: period.trim(),
    tags: normalizeTagsInput(tags),
    published,
    html: html.trim(),
    allProperties: normalizeJsonInput(allProperties),
    thumbnailAssetId: normalizeTextInput(thumbnailAssetId),
    iconAssetId: normalizeTextInput(iconAssetId),
  })
}

export function isPublicInlineCreateMode(params: {
  inlineMode: boolean
  isEditing: boolean
  hasOnSaved: boolean
}) {
  return params.inlineMode && !params.isEditing && params.hasOnSaved
}

export async function getResponseError(response: Response, fallback: string) {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    if (payload?.error) {
      return payload.error
    }
  }

  const text = await response.text().catch(() => '')
  return text || fallback
}

export function buildWorkSlugFallback(title: string) {
  const slug = title.trim().toLowerCase().replace(/\s+/g, '-')
  const normalized = slug
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || null
}

export function inferThumbnailSourceKind(initialWork?: Work): WorkThumbnailSourceKind {
  if (initialWork?.thumbnail_asset_id) {
    return 'manual'
  }

  return resolveWorkThumbnailSource({
    thumbnailAssetId: initialWork?.thumbnail_asset_id,
    videos: initialWork?.videos ?? [],
    html: initialWork?.content?.html ?? '',
  }).kind
}

export function getNextVideosVersion(payload: VideoMutationPayload, fallback: number) {
  if (typeof payload.videos_version === 'number') {
    return payload.videos_version
  }

  if (typeof payload.videosVersion === 'number') {
    return payload.videosVersion
  }

  return fallback
}

export function resolveWorkSaveSlug({
  payload,
  title,
  initialSlug,
}: {
  payload: WorkSaveResponsePayload | null
  title: string
  initialSlug?: string | null
}) {
  return payload?.slug ?? payload?.Slug ?? buildWorkSlugFallback(title) ?? initialSlug ?? null
}

export function validateFlexibleMetadata(allProperties: string) {
  if (!allProperties) {
    return true
  }

  JSON.parse(allProperties)
  return true
}
