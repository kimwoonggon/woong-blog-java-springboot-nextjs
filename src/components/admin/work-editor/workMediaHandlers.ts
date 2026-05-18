import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type { WorkVideo } from '@/lib/api/works'
import { revalidatePublicPathsAfterMutation } from '@/lib/public-revalidation-client'
import { getWorkPublicRevalidationPaths } from '@/lib/public-revalidation-paths'
import { isAcceptedImageFile } from '@/lib/file-validation'
import { extractVideoFrameThumbnailBlob, fetchRemoteImageBlob } from '@/lib/content/work-auto-thumbnail'
import {
  buildYouTubeThumbnailUrl,
  resolveWorkThumbnailSource,
  shouldReplaceWorkThumbnailSource,
  type WorkThumbnailSourceKind,
} from '@/lib/content/work-thumbnail-resolution'
import { sanitizeAdminUploadError } from '@/lib/admin-save-error'
import { toast } from 'sonner'
import type { ThumbnailCandidate, UploadedAssetPayload, Work } from '@/components/admin/work-editor/types'
import { resolveWorkSaveSlug } from '@/components/admin/work-editor/utils'
import {
  persistWorkThumbnailSelection,
  uploadGeneratedWorkThumbnail,
  uploadWorkAssetFile,
  type WorkMutationPayload,
} from '@/components/admin/work-editor/workEditorApi'

interface WorkMediaHandlersParams {
  initialWork?: Work
  title: string
  videos: WorkVideo[]
  html: string
  thumbnailSourceKind: WorkThumbnailSourceKind
  buildWorkMutationPayload: (nextThumbnailAssetId?: string, nextIconAssetId?: string) => WorkMutationPayload
  setThumbnailAssetId: Dispatch<SetStateAction<string>>
  setThumbnailUrl: Dispatch<SetStateAction<string>>
  setIconAssetId: Dispatch<SetStateAction<string>>
  setIconUrl: Dispatch<SetStateAction<string>>
  setThumbnailSourceKind: Dispatch<SetStateAction<WorkThumbnailSourceKind>>
  setUploadingTarget: Dispatch<SetStateAction<'thumbnail' | 'icon' | null>>
  setIsAutoGeneratingThumbnail: Dispatch<SetStateAction<boolean>>
}

export function createWorkMediaHandlers({
  initialWork,
  title,
  videos,
  html,
  thumbnailSourceKind,
  buildWorkMutationPayload,
  setThumbnailAssetId,
  setThumbnailUrl,
  setIconAssetId,
  setIconUrl,
  setThumbnailSourceKind,
  setUploadingTarget,
  setIsAutoGeneratingThumbnail,
}: WorkMediaHandlersParams) {
  function applyThumbnailSelection(asset: UploadedAssetPayload, sourceKind: WorkThumbnailSourceKind) {
    setThumbnailAssetId(asset.id)
    setThumbnailUrl(asset.url)
    setThumbnailSourceKind(sourceKind)
  }

  async function tryAutoGenerateThumbnailFromUploadedVideo(file: File, applySelection = true) {
    const thumbnailBlob = await extractVideoFrameThumbnailBlob(file)
    const uploadedThumbnail = await uploadGeneratedWorkThumbnail(
      thumbnailBlob,
      `${file.name.replace(/\.[^.]+$/, '') || 'video'}-thumbnail.jpg`,
    )
    if (applySelection) {
      applyThumbnailSelection(uploadedThumbnail, 'uploaded-video')
    }
    return uploadedThumbnail
  }

  async function tryAutoGenerateThumbnailFromYouTube(videoId: string, applySelection = true) {
    const thumbnailBlob = await fetchRemoteImageBlob(buildYouTubeThumbnailUrl(videoId))
    const uploadedThumbnail = await uploadGeneratedWorkThumbnail(thumbnailBlob, `${videoId}-thumbnail.jpg`)
    if (applySelection) {
      applyThumbnailSelection(uploadedThumbnail, 'youtube')
    }
    return uploadedThumbnail
  }

  async function tryAutoGenerateThumbnailFromSavedVideo(video: WorkVideo) {
    if (video.sourceType === 'youtube') {
      return await tryAutoGenerateThumbnailFromYouTube(video.sourceKey)
    }

    if (!video.playbackUrl || video.playbackUrl.toLowerCase().includes('.m3u8') || video.mimeType === 'application/vnd.apple.mpegurl') {
      return null
    }

    const response = await fetch(video.playbackUrl)
    if (!response.ok) {
      throw new Error('Failed to fetch the saved video for thumbnail regeneration.')
    }

    const blob = await response.blob()
    const file = new File([blob], video.originalFileName || `${video.id}.mp4`, { type: video.mimeType || 'video/mp4' })
    return await tryAutoGenerateThumbnailFromUploadedVideo(file)
  }

  async function maybeApplyAutoThumbnailForCandidate(candidate: ThumbnailCandidate, applySelection = true) {
    if (!shouldReplaceWorkThumbnailSource(thumbnailSourceKind, candidate.kind)) {
      return null
    }

    setIsAutoGeneratingThumbnail(true)

    try {
      if (candidate.kind === 'uploaded-video' && candidate.file) {
        return await tryAutoGenerateThumbnailFromUploadedVideo(candidate.file, applySelection)
      }

      if (candidate.kind === 'youtube' && candidate.youtubeVideoId) {
        return await tryAutoGenerateThumbnailFromYouTube(candidate.youtubeVideoId, applySelection)
      }

      return null
    } catch (error) {
      if (applySelection && candidate.kind === 'youtube') {
        setThumbnailSourceKind('youtube')
        setThumbnailUrl(buildYouTubeThumbnailUrl(candidate.youtubeVideoId ?? ''))
      }

      throw error
    } finally {
      setIsAutoGeneratingThumbnail(false)
    }
  }

  async function persistThumbnailSelectionForWork(workId: string, nextThumbnailAssetId: string) {
    return await persistWorkThumbnailSelection({
      workId,
      payload: buildWorkMutationPayload(nextThumbnailAssetId),
    })
  }

  async function persistThumbnailSelectionAndRevalidate(workId: string, nextThumbnailAssetId: string) {
    const responsePayload = await persistThumbnailSelectionForWork(workId, nextThumbnailAssetId)
    const nextSlug = resolveWorkSaveSlug({
      payload: responsePayload,
      title,
      initialSlug: initialWork?.slug,
    })

    await revalidatePublicPathsAfterMutation(getWorkPublicRevalidationPaths(nextSlug, initialWork?.slug))
    return responsePayload
  }

  async function uploadWorkImage(
    event: ChangeEvent<HTMLInputElement>,
    target: 'thumbnail' | 'icon',
  ) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isAcceptedImageFile(file)) {
      toast.error(`Please upload an image file for ${target}.`)
      event.target.value = ''
      return
    }

    setUploadingTarget(target)

    try {
      const payload = await uploadWorkAssetFile(file, target === 'thumbnail' ? 'work-thumbnails' : 'work-icons')

      if (target === 'thumbnail') {
        setThumbnailAssetId(payload.id)
        setThumbnailUrl(payload.url)
        setThumbnailSourceKind('manual')
      } else {
        setIconAssetId(payload.id)
        setIconUrl(payload.url)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      const safeMessage = sanitizeAdminUploadError(
        message,
        `${target === 'thumbnail' ? 'Thumbnail' : 'Icon'} could not be uploaded. Please retry after storage is healthy.`,
      )
      toast.error(`Failed to upload ${target}: ${safeMessage}`)
    } finally {
      setUploadingTarget(null)
      event.target.value = ''
    }
  }

  async function regenerateThumbnailFallbackForCurrentWork() {
    const nextSource = resolveWorkThumbnailSource({
      thumbnailAssetId: null,
      videos,
      html,
    })

    setThumbnailSourceKind(nextSource.kind)
    setThumbnailUrl(nextSource.kind === 'content-image' ? nextSource.imageUrl ?? '' : '')

    if (nextSource.video) {
      const uploadedThumbnail = await tryAutoGenerateThumbnailFromSavedVideo(nextSource.video)
      if (uploadedThumbnail) {
        if (initialWork?.id) {
          await persistThumbnailSelectionAndRevalidate(initialWork.id, uploadedThumbnail.id)
        }
      }
    }
  }

  async function removeWorkImage(target: 'thumbnail' | 'icon') {
    if (target === 'thumbnail') {
      setThumbnailAssetId('')
      setThumbnailUrl('')
      try {
        await regenerateThumbnailFallbackForCurrentWork()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to regenerate the fallback thumbnail.'
        toast.error(sanitizeAdminUploadError(message, 'Thumbnail could not be regenerated. Please retry after storage is healthy.'))
      }
      return
    }

    setIconAssetId('')
    setIconUrl('')
  }

  return {
    applyThumbnailSelection,
    maybeApplyAutoThumbnailForCandidate,
    persistThumbnailSelectionForWork,
    persistThumbnailSelectionAndRevalidate,
    uploadWorkImage,
    removeWorkImage,
  }
}
