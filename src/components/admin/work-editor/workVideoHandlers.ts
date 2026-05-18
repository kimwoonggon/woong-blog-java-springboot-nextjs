import type { ChangeEvent, Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { WorkVideo } from '@/lib/api/works'
import { isAcceptedMp4VideoFile } from '@/lib/file-validation'
import { normalizeYouTubeVideoId } from '@/lib/content/work-thumbnail-resolution'
import { removeWorkVideoEmbedReferences } from '@/lib/content/work-video-embeds'
import { sanitizeAdminUploadError } from '@/lib/admin-save-error'
import { toast } from 'sonner'
import type {
  StagedVideoResult,
  ThumbnailCandidate,
  UploadedAssetPayload,
  VideoDraft,
  VideoInsertRequest,
  VideoMutationPayload,
  Work,
} from '@/components/admin/work-editor/types'
import { createClientId, getNextVideosVersion } from '@/components/admin/work-editor/utils'
import {
  addWorkYouTubeVideo,
  confirmWorkVideoUpload,
  removeWorkSavedVideo,
  reorderWorkSavedVideos,
  requestWorkVideoUploadTarget,
  uploadWorkHlsVideo,
  uploadWorkVideoToTarget,
} from '@/components/admin/work-editor/workEditorApi'
import type { WorkThumbnailSourceKind } from '@/lib/content/work-thumbnail-resolution'
import type { VideoUploadStatus } from '@/components/admin/work-editor/useVideoUploadStatus'

interface WorkVideoHandlersParams {
  initialWork?: Work
  isEditing: boolean
  videos: WorkVideo[]
  videosVersion: number
  stagedVideos: VideoDraft[]
  youtubeUrlInput: string
  embeddedVideoIdSet: Set<string>
  setVideosVersion: Dispatch<SetStateAction<number>>
  setVideos: Dispatch<SetStateAction<WorkVideo[]>>
  setStagedVideos: Dispatch<SetStateAction<VideoDraft[]>>
  setYoutubeUrlInput: Dispatch<SetStateAction<string>>
  setIsVideoBusy: Dispatch<SetStateAction<boolean>>
  setHasPersistedVideoChanges: Dispatch<SetStateAction<boolean>>
  setInsertVideoRequest: Dispatch<SetStateAction<VideoInsertRequest | null>>
  setHtml: Dispatch<SetStateAction<string>>
  setVideoUploadStatus: Dispatch<SetStateAction<VideoUploadStatus | null>>
  setVideoUploadPhase: (phase: 'uploading' | 'processing' | 'complete', fileLabel?: string) => void
  insertVideoNonceRef: MutableRefObject<number>
  refreshInlinePublicWorkIfNeeded: () => void
  maybeApplyAutoThumbnailForCandidate: (candidate: ThumbnailCandidate, applySelection?: boolean) => Promise<UploadedAssetPayload | null>
  persistThumbnailSelectionAndRevalidate: (workId: string, nextThumbnailAssetId: string) => Promise<unknown>
  applyThumbnailSelection: (asset: UploadedAssetPayload, sourceKind: WorkThumbnailSourceKind) => void
}

export function createWorkVideoHandlers({
  initialWork,
  isEditing,
  videos,
  videosVersion,
  stagedVideos,
  youtubeUrlInput,
  embeddedVideoIdSet,
  setVideosVersion,
  setVideos,
  setStagedVideos,
  setYoutubeUrlInput,
  setIsVideoBusy,
  setHasPersistedVideoChanges,
  setInsertVideoRequest,
  setHtml,
  setVideoUploadStatus,
  setVideoUploadPhase,
  insertVideoNonceRef,
  refreshInlinePublicWorkIfNeeded,
  maybeApplyAutoThumbnailForCandidate,
  persistThumbnailSelectionAndRevalidate,
  applyThumbnailSelection,
}: WorkVideoHandlersParams) {
  const syncVideos = (payload: VideoMutationPayload) => {
    const nextVersion = getNextVideosVersion(payload, videosVersion)
    const nextVideos = Array.isArray(payload.videos) ? payload.videos : videos

    setVideosVersion(nextVersion)
    setVideos(nextVideos)
  }

  function addYouTubeDraft() {
    const trimmed = youtubeUrlInput.trim()
    if (!trimmed) {
      toast.error('Paste a YouTube URL or video ID first.')
      return
    }

    if (!normalizeYouTubeVideoId(trimmed)) {
      toast.error('Enter a valid YouTube URL or video ID.')
      return
    }

    if (isEditing) {
      void addYouTubeForExistingWork(trimmed)
      return
    }

    setStagedVideos((current) => [...current, {
      tempId: createClientId(),
      kind: 'youtube',
      label: trimmed,
      youtubeUrl: trimmed,
    }])
    setYoutubeUrlInput('')
  }

  function handleStageHlsVideoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isAcceptedMp4VideoFile(file)) {
      toast.error('Please upload an MP4 video file.')
      event.target.value = ''
      return
    }

    if (isEditing) {
      void uploadHlsVideoForExistingWork(file)
      event.target.value = ''
      return
    }

    setStagedVideos((current) => [...current, {
      tempId: createClientId(),
      kind: 'file',
      label: file.name,
      uploadMode: 'hls',
      file,
    }])
    event.target.value = ''
  }

  function moveStagedVideo(tempId: string, direction: -1 | 1) {
    setStagedVideos((current) => {
      const index = current.findIndex((item) => item.tempId === tempId)
      if (index < 0) return current

      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.length) return current

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next
    })
  }

  function reorderStagedVideoToIndex(tempId: string, targetIndex: number) {
    setStagedVideos((current) => {
      const index = current.findIndex((item) => item.tempId === tempId)
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length || index === targetIndex) {
        return current
      }

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
  }

  function removeStagedVideo(tempId: string) {
    setStagedVideos((current) => current.filter((item) => item.tempId !== tempId))
  }

  async function addYouTubeForExistingWork(youtubeUrlOrId: string) {
    if (!initialWork?.id) return

    setIsVideoBusy(true)

    try {
      const payload = await addWorkYouTubeVideo({
        workId: initialWork.id,
        youtubeUrlOrId,
        expectedVideosVersion: videosVersion,
      })
      syncVideos(payload)
      setHasPersistedVideoChanges(true)
      setYoutubeUrlInput('')
      const normalizedVideoId = normalizeYouTubeVideoId(youtubeUrlOrId)
      if (normalizedVideoId) {
        try {
          const uploadedThumbnail = await maybeApplyAutoThumbnailForCandidate({ kind: 'youtube', youtubeVideoId: normalizedVideoId }, false)
          if (uploadedThumbnail) {
            await persistThumbnailSelectionAndRevalidate(initialWork.id, uploadedThumbnail.id)
            applyThumbnailSelection(uploadedThumbnail, 'youtube')
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to auto-generate a YouTube thumbnail.')
        }
      }
      refreshInlinePublicWorkIfNeeded()
      toast.success('YouTube video added.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add YouTube video.')
    } finally {
      setIsVideoBusy(false)
    }
  }

  async function uploadHlsVideoForExistingWork(file: File) {
    if (!initialWork?.id) return

    setIsVideoBusy(true)
    setVideoUploadPhase('uploading', file.name)
    const processingPhaseTimer = window.setTimeout(() => {
      setVideoUploadPhase('processing', file.name)
    }, 700)
    let thumbnailError: unknown = null
    const uploadedThumbnailPromise = maybeApplyAutoThumbnailForCandidate({ kind: 'uploaded-video', file }, false)
      .catch((error: unknown) => {
        thumbnailError = error
        return null
      })

    try {
      const payload = await uploadWorkHlsVideo(initialWork.id, file, videosVersion)
      syncVideos(payload)
      setHasPersistedVideoChanges(true)
      const uploadedThumbnail = await uploadedThumbnailPromise
      if (thumbnailError) {
        toast.error(thumbnailError instanceof Error ? thumbnailError.message : 'Failed to auto-generate a video thumbnail.')
      }
      if (uploadedThumbnail) {
        await persistThumbnailSelectionAndRevalidate(initialWork.id, uploadedThumbnail.id)
        applyThumbnailSelection(uploadedThumbnail, 'uploaded-video')
      }
      refreshInlinePublicWorkIfNeeded()
      window.clearTimeout(processingPhaseTimer)
      setVideoUploadPhase('complete', file.name)
      toast.success('HLS video uploaded.')
    } catch (error) {
      await uploadedThumbnailPromise
      window.clearTimeout(processingPhaseTimer)
      setVideoUploadStatus(null)
      const message = error instanceof Error ? error.message : 'Failed to upload HLS video.'
      toast.error(sanitizeAdminUploadError(message, 'Video could not be uploaded. Please retry after storage is healthy.'))
    } finally {
      setIsVideoBusy(false)
    }
  }

  async function removeSavedVideo(videoId: string) {
    if (!initialWork?.id) return

    if (embeddedVideoIdSet.has(videoId)) {
      toast.error('Remove this video from the body before deleting it.')
      return
    }

    setIsVideoBusy(true)

    try {
      syncVideos(await removeWorkSavedVideo({
        workId: initialWork.id,
        videoId,
        expectedVideosVersion: videosVersion,
      }))
      setHasPersistedVideoChanges(true)
      refreshInlinePublicWorkIfNeeded()
      toast.success('Video removed.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove video.'
      toast.error(sanitizeAdminUploadError(message, 'Video could not be removed. Please retry after the backend is healthy.'))
    } finally {
      setIsVideoBusy(false)
    }
  }

  async function reorderSavedVideo(videoId: string, direction: -1 | 1) {
    if (!initialWork?.id) return

    const index = videos.findIndex((video) => video.id === videoId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= videos.length) {
      return
    }

    const reordered = [...videos]
    const [item] = reordered.splice(index, 1)
    reordered.splice(nextIndex, 0, item)

    await persistSavedVideoOrder(reordered)
  }

  async function reorderSavedVideoToIndex(videoId: string, targetIndex: number) {
    if (!initialWork?.id) return

    const index = videos.findIndex((video) => video.id === videoId)
    if (index < 0 || targetIndex < 0 || targetIndex >= videos.length || index === targetIndex) {
      return
    }

    const reordered = [...videos]
    const [item] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, item)

    await persistSavedVideoOrder(reordered)
  }

  async function persistSavedVideoOrder(reordered: WorkVideo[]) {
    if (!initialWork?.id) return

    setIsVideoBusy(true)

    try {
      syncVideos(await reorderWorkSavedVideos({
        workId: initialWork.id,
        orderedVideoIds: reordered.map((video) => video.id),
        expectedVideosVersion: videosVersion,
      }))
      setHasPersistedVideoChanges(true)
      refreshInlinePublicWorkIfNeeded()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reorder videos.'
      toast.error(sanitizeAdminUploadError(message, 'Video order could not be saved. Please retry after the backend is healthy.'))
    } finally {
      setIsVideoBusy(false)
    }
  }

  async function addStagedYoutubeVideo(workId: string, draft: VideoDraft, currentVersion: number): Promise<StagedVideoResult> {
    const payload = await addWorkYouTubeVideo({
      workId,
      youtubeUrlOrId: draft.youtubeUrl ?? '',
      expectedVideosVersion: currentVersion,
    })
    return {
      currentVersion: getNextVideosVersion(payload, currentVersion + 1),
      latestPayload: payload,
    }
  }

  async function addStagedUploadedVideo(workId: string, draft: VideoDraft, currentVersion: number): Promise<StagedVideoResult> {
    if (!draft.file) {
      return {
        currentVersion,
        latestPayload: null,
      }
    }

    const payload = draft.uploadMode === 'hls'
      ? await uploadWorkHlsVideo(workId, draft.file, currentVersion)
      : await (async () => {
        const target = await requestWorkVideoUploadTarget({
          workId,
          file: draft.file!,
          expectedVersion: currentVersion,
        })
        await uploadWorkVideoToTarget(workId, draft.file!, target)
        return await confirmWorkVideoUpload({
          workId,
          uploadSessionId: target.uploadSessionId,
          expectedVersion: currentVersion,
        })
      })()

    return {
      currentVersion: getNextVideosVersion(payload, currentVersion + 1),
      latestPayload: payload,
    }
  }

  async function processStagedVideos(workId: string) {
    let currentVersion = 0
    let latestPayload: VideoMutationPayload | null = null

    for (const draft of stagedVideos) {
      if (draft.kind === 'youtube' && draft.youtubeUrl) {
        const result = await addStagedYoutubeVideo(workId, draft, currentVersion)
        currentVersion = result.currentVersion
        latestPayload = result.latestPayload
        continue
      }

      if (draft.kind === 'file' && draft.file) {
        setVideoUploadPhase('uploading', draft.label)
        const processingPhaseTimer = window.setTimeout(() => {
          setVideoUploadPhase('processing', draft.label)
        }, 700)
        try {
          const result = await addStagedUploadedVideo(workId, draft, currentVersion)
          window.clearTimeout(processingPhaseTimer)
          setVideoUploadPhase('complete', draft.label)
          currentVersion = result.currentVersion
          latestPayload = result.latestPayload
        } catch (error) {
          window.clearTimeout(processingPhaseTimer)
          setVideoUploadStatus(null)
          throw error
        }
      }
    }

    return {
      latestPayload,
      currentVersion,
    }
  }

  function insertSavedVideoIntoBody(videoId: string) {
    if (embeddedVideoIdSet.has(videoId)) {
      toast.error('This video is already placed in the body.')
      return
    }

    insertVideoNonceRef.current += 1
    setInsertVideoRequest({ videoId, nonce: insertVideoNonceRef.current })
  }

  function removeSavedVideoFromBody(videoId: string) {
    if (!embeddedVideoIdSet.has(videoId)) {
      return
    }

    setHtml((current) => removeWorkVideoEmbedReferences(current, videoId))
    toast.success('Inline video removed from the body.')
  }

  function handleVideoInsertHandled(result: { inserted: boolean; reason?: 'duplicate' | 'missing' }) {
    setInsertVideoRequest(null)

    if (result.inserted) {
      toast.success('Video inserted into the body.')
      return
    }

    if (result.reason === 'duplicate') {
      toast.error('This video is already placed in the body.')
      return
    }

    if (result.reason === 'missing') {
      toast.error('This video is no longer available in the saved video list.')
    }
  }

  return {
    syncVideos,
    addYouTubeDraft,
    handleStageHlsVideoFile,
    moveStagedVideo,
    reorderStagedVideoToIndex,
    removeStagedVideo,
    removeSavedVideo,
    reorderSavedVideo,
    reorderSavedVideoToIndex,
    processStagedVideos,
    insertSavedVideoIntoBody,
    removeSavedVideoFromBody,
    handleVideoInsertHandled,
  }
}
