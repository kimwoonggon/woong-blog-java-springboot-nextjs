import type { WorkVideo } from '@/lib/api/works'

export type WorkThumbnailSourceKind =
  | 'manual'
  | 'uploaded-video'
  | 'youtube'
  | 'content-image'
  | 'none'

export interface WorkThumbnailResolution {
  kind: WorkThumbnailSourceKind
  video?: WorkVideo
  imageUrl?: string
}

export interface WorkVideoDraftLike {
  kind: 'youtube' | 'file'
  youtubeUrl?: string
  file?: File
}

const THUMBNAIL_PRIORITY: Record<WorkThumbnailSourceKind, number> = {
  manual: 4,
  'uploaded-video': 3,
  youtube: 2,
  'content-image': 1,
  none: 0,
}

function normalizeString(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

export function getWorkThumbnailSourcePriority(kind: WorkThumbnailSourceKind) {
  return THUMBNAIL_PRIORITY[kind]
}

export function shouldReplaceWorkThumbnailSource(
  currentKind: WorkThumbnailSourceKind,
  nextKind: WorkThumbnailSourceKind,
) {
  if (currentKind === 'manual') {
    return false
  }

  return getWorkThumbnailSourcePriority(nextKind) > getWorkThumbnailSourcePriority(currentKind)
}

export function buildYouTubeThumbnailUrl(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

export function normalizeYouTubeVideoId(value: string) {
  const trimmed = normalizeString(value)
  if (!trimmed) {
    return null
  }

  const isValidVideoId = (candidate: string | null | undefined) =>
    candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null

  const directId = isValidVideoId(trimmed)
  if (directId) {
    return directId
  }

  const urlCandidate = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\//i.test(trimmed)
    ? trimmed
    : null
  if (urlCandidate) {
    try {
      const url = new URL(urlCandidate.startsWith('http') ? urlCandidate : `https://${urlCandidate}`)
      const hostname = url.hostname.toLowerCase()

      if (hostname === 'youtu.be') {
        const [videoId] = url.pathname.split('/').filter(Boolean)
        return isValidVideoId(videoId)
      }

      if (
        hostname === 'youtube.com'
        || hostname === 'www.youtube.com'
        || hostname === 'm.youtube.com'
        || hostname === 'youtube-nocookie.com'
        || hostname === 'www.youtube-nocookie.com'
      ) {
        const watchVideoId = isValidVideoId(url.searchParams.get('v'))
        if (watchVideoId) {
          return watchVideoId
        }

        const pathParts = url.pathname.split('/').filter(Boolean)
        if (pathParts[0] === 'embed' || pathParts[0] === 'shorts') {
          return isValidVideoId(pathParts[1])
        }
      }
    } catch {
      return null
    }
  }

  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(trimmed)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

export function extractFirstContentImageUrl(html: string) {
  const match = /<img\b[^>]*\bsrc=(["'])(.*?)\1/i.exec(html)
  return match?.[2] ?? null
}

export function selectPreferredSavedVideoForThumbnail(videos: WorkVideo[]) {
  const sortedVideos = [...videos].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }

    return (left.createdAt ?? '').localeCompare(right.createdAt ?? '')
  })

  const preferredUploadedVideo = sortedVideos.find((video) => video.sourceType !== 'youtube')
  return preferredUploadedVideo ?? sortedVideos.find((video) => video.sourceType === 'youtube') ?? null
}

export function resolveWorkThumbnailSource(params: {
  thumbnailAssetId?: string | null
  videos?: WorkVideo[]
  html?: string
}) : WorkThumbnailResolution {
  if (normalizeString(params.thumbnailAssetId)) {
    return { kind: 'manual' }
  }

  const preferredVideo = selectPreferredSavedVideoForThumbnail(params.videos ?? [])
  if (preferredVideo) {
    return {
      kind: preferredVideo.sourceType === 'youtube' ? 'youtube' : 'uploaded-video',
      video: preferredVideo,
    }
  }

  const contentImageUrl = extractFirstContentImageUrl(params.html ?? '')
  if (contentImageUrl) {
    return { kind: 'content-image', imageUrl: contentImageUrl }
  }

  return { kind: 'none' }
}

export function resolveDraftThumbnailSource(drafts: WorkVideoDraftLike[]) {
  const preferredUploadedVideo = drafts.find((draft) => draft.kind === 'file' && draft.file)
  if (preferredUploadedVideo?.file) {
    return {
      kind: 'uploaded-video' as const,
      file: preferredUploadedVideo.file,
    }
  }

  const preferredYouTube = drafts.find((draft) => draft.kind === 'youtube' && draft.youtubeUrl)
  const videoId = normalizeYouTubeVideoId(preferredYouTube?.youtubeUrl ?? '')
  if (videoId) {
    return {
      kind: 'youtube' as const,
      youtubeVideoId: videoId,
    }
  }

  return { kind: 'none' as const }
}
