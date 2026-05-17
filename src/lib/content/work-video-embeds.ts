import type { WorkVideo } from '@/lib/api/works'

export const WORK_VIDEO_EMBED_TAG = 'work-video-embed'

function createWorkVideoEmbedRegex() {
  return /<work-video-embed\b([^>]*)>(?:<\/work-video-embed>)?/gi
}

export interface WorkVideoContentSegment {
  type: 'html' | 'video'
  html?: string
  videoId?: string
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function extractAttribute(attributes: string, attributeName: string) {
  const pattern = new RegExp(`${attributeName}=(["'])(.*?)\\1`, 'i')
  const match = pattern.exec(attributes)
  return match?.[2] ?? null
}

export function getWorkVideoDisplayLabel(video: Pick<WorkVideo, 'sourceType' | 'sourceKey' | 'originalFileName'>) {
  if (video.sourceType === 'youtube') {
    return `YouTube ${video.sourceKey}`
  }

  return video.originalFileName || video.sourceKey
}

export function buildWorkVideoEmbedMarkup(videoId: string) {
  return `<${WORK_VIDEO_EMBED_TAG} data-video-id="${escapeHtmlAttribute(videoId)}"></${WORK_VIDEO_EMBED_TAG}>`
}

export function extractWorkVideoEmbedIds(html: string) {
  const ids: string[] = []

  for (const match of html.matchAll(createWorkVideoEmbedRegex())) {
    const videoId = extractAttribute(match[1] ?? '', 'data-video-id')
    if (videoId) {
      ids.push(videoId)
    }
  }

  return ids
}

export function hasWorkVideoEmbeds(html: string) {
  return extractWorkVideoEmbedIds(html).length > 0
}

export function isWorkVideoEmbedded(html: string, videoId: string) {
  return extractWorkVideoEmbedIds(html).includes(videoId)
}

export function removeWorkVideoEmbedReferences(html: string, videoId: string) {
  return html.replace(createWorkVideoEmbedRegex(), (match, attributes) => {
    const embeddedVideoId = extractAttribute(attributes ?? '', 'data-video-id')
    return embeddedVideoId === videoId ? '' : match
  })
}

export function splitWorkVideoEmbedContent(html: string): WorkVideoContentSegment[] {
  const segments: WorkVideoContentSegment[] = []
  let lastIndex = 0

  for (const match of html.matchAll(createWorkVideoEmbedRegex())) {
    const start = match.index ?? 0
    const end = start + match[0].length

    if (start > lastIndex) {
      segments.push({ type: 'html', html: html.slice(lastIndex, start) })
    }

    const videoId = extractAttribute(match[1] ?? '', 'data-video-id')
    if (videoId) {
      segments.push({ type: 'video', videoId })
    }

    lastIndex = end
  }

  if (lastIndex < html.length) {
    segments.push({ type: 'html', html: html.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: 'html', html }]
}
