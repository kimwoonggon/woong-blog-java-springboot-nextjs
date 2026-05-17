import type { WorkDetail } from '@/lib/api/works'
import { buildYouTubeThumbnailUrl, normalizeYouTubeVideoId } from '@/lib/content/work-thumbnail-resolution'
import { createPublicMetadata } from '@/lib/seo'

function resolveYouTubeThumbnail(sourceKey: string) {
    const videoId = normalizeYouTubeVideoId(sourceKey)
    return videoId ? buildYouTubeThumbnailUrl(videoId) : null
}

function resolveWorkMetadataImage(work: WorkDetail | null) {
    if (!work) {
        return null
    }

    if (work.thumbnailUrl) {
        return work.thumbnailUrl
    }

    const youtubeVideo = work.videos.find((video) => video.sourceType === 'youtube' && video.sourceKey)
    return youtubeVideo ? resolveYouTubeThumbnail(youtubeVideo.sourceKey) : null
}

function resolveWorkMetadataDescription(work: WorkDetail | null) {
    if (!work) {
        return ''
    }

    const shareMessage = work.socialShareMessage?.trim()
    return shareMessage ? shareMessage : work.excerpt
}

function buildWorkMetadataPath(slug: string) {
    const cleanedSlug = slug.trim()
    return cleanedSlug ? `/works/${encodeURIComponent(cleanedSlug)}` : '/works'
}

export function buildWorkDetailMetadata(work: WorkDetail) {
    return createPublicMetadata({
        title: work.title,
        description: resolveWorkMetadataDescription(work),
        path: buildWorkMetadataPath(work.slug),
        type: 'article',
        images: resolveWorkMetadataImage(work),
    })
}
