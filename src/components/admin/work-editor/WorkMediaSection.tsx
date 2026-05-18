import type { ChangeEvent, RefObject } from 'react'
import type { WorkVideo } from '@/lib/api/works'
import type { WorkThumbnailSourceKind } from '@/lib/content/work-thumbnail-resolution'
import { cn } from '@/lib/utils'
import { MetadataFields } from '@/components/admin/work-editor/MetadataFields'
import { WorkMediaAssets } from '@/components/admin/work-editor/WorkMediaAssets'
import { WorkVideoManager } from '@/components/admin/work-editor/WorkVideoManager'
import type { MetadataField } from '@/components/admin/work-editor/metadata'
import type { VideoDraft } from '@/components/admin/work-editor/types'
import type { VideoUploadStatus } from '@/components/admin/work-editor/useVideoUploadStatus'

interface WorkMediaSectionProps {
  sectionRef: RefObject<HTMLDivElement | null>
  active: boolean
  metadataFields: MetadataField[]
  effectiveThumbnailPreviewUrl: string
  thumbnailSourceKind: WorkThumbnailSourceKind
  thumbnailAssetId: string
  iconUrl: string
  uploadingTarget: 'thumbnail' | 'icon' | null
  isAutoGeneratingThumbnail: boolean
  isEditing: boolean
  usesPublicInlineCreateFlow: boolean
  youtubeUrlInput: string
  stagedVideos: VideoDraft[]
  videos: WorkVideo[]
  videosVersion: number
  isVideoBusy: boolean
  videoUploadStatus: VideoUploadStatus | null
  embeddedVideoIdSet: Set<string>
  orphanEmbeddedVideoIds: string[]
  onAddMetadataField: () => void
  onUpdateMetadataField: (fieldId: string, nextField: Partial<Pick<MetadataField, 'key' | 'value'>>) => void
  onRemoveMetadataField: (fieldId: string) => void
  onUploadWorkImage: (event: ChangeEvent<HTMLInputElement>, target: 'thumbnail' | 'icon') => void
  onRemoveWorkImage: (target: 'thumbnail' | 'icon') => void
  onYoutubeUrlInputChange: (value: string) => void
  onAddYouTubeDraft: () => void
  onStageHlsVideoFile: (event: ChangeEvent<HTMLInputElement>) => void
  onMoveStagedVideo: (tempId: string, direction: -1 | 1) => void
  onReorderStagedVideoToIndex: (tempId: string, targetIndex: number) => void
  onRemoveStagedVideo: (tempId: string) => void
  onInsertSavedVideoIntoBody: (videoId: string) => void
  onRemoveSavedVideoFromBody: (videoId: string) => void
  onRemoveSavedVideo: (videoId: string) => void
  onReorderSavedVideo: (videoId: string, direction: -1 | 1) => void
  onReorderSavedVideoToIndex: (videoId: string, targetIndex: number) => void
}

export function WorkMediaSection({
  sectionRef,
  active,
  metadataFields,
  effectiveThumbnailPreviewUrl,
  thumbnailSourceKind,
  thumbnailAssetId,
  iconUrl,
  uploadingTarget,
  isAutoGeneratingThumbnail,
  isEditing,
  usesPublicInlineCreateFlow,
  youtubeUrlInput,
  stagedVideos,
  videos,
  videosVersion,
  isVideoBusy,
  videoUploadStatus,
  embeddedVideoIdSet,
  orphanEmbeddedVideoIds,
  onAddMetadataField,
  onUpdateMetadataField,
  onRemoveMetadataField,
  onUploadWorkImage,
  onRemoveWorkImage,
  onYoutubeUrlInputChange,
  onAddYouTubeDraft,
  onStageHlsVideoFile,
  onMoveStagedVideo,
  onReorderStagedVideoToIndex,
  onRemoveStagedVideo,
  onInsertSavedVideoIntoBody,
  onRemoveSavedVideoFromBody,
  onRemoveSavedVideo,
  onReorderSavedVideo,
  onReorderSavedVideoToIndex,
}: WorkMediaSectionProps) {
  return (
    <div
      id="work-editor-media-section"
      ref={sectionRef}
      className={cn(
        'space-y-6 rounded-2xl border border-border/80 bg-card p-6 shadow-sm',
        active && 'ring-2 ring-primary/20',
      )}
    >
      <MetadataFields
        fields={metadataFields}
        onAddField={onAddMetadataField}
        onUpdateField={onUpdateMetadataField}
        onRemoveField={onRemoveMetadataField}
      />
      <WorkMediaAssets
        effectiveThumbnailPreviewUrl={effectiveThumbnailPreviewUrl}
        thumbnailSourceKind={thumbnailSourceKind}
        thumbnailAssetId={thumbnailAssetId}
        iconUrl={iconUrl}
        uploadingTarget={uploadingTarget}
        isAutoGeneratingThumbnail={isAutoGeneratingThumbnail}
        onUploadWorkImage={onUploadWorkImage}
        onRemoveWorkImage={onRemoveWorkImage}
      />
      <WorkVideoManager
        isEditing={isEditing}
        usesPublicInlineCreateFlow={usesPublicInlineCreateFlow}
        youtubeUrlInput={youtubeUrlInput}
        stagedVideos={stagedVideos}
        videos={videos}
        videosVersion={videosVersion}
        isVideoBusy={isVideoBusy}
        videoUploadStatus={videoUploadStatus}
        embeddedVideoIdSet={embeddedVideoIdSet}
        orphanEmbeddedVideoIds={orphanEmbeddedVideoIds}
        onYoutubeUrlInputChange={onYoutubeUrlInputChange}
        onAddYouTubeDraft={onAddYouTubeDraft}
        onStageHlsVideoFile={onStageHlsVideoFile}
        onMoveStagedVideo={onMoveStagedVideo}
        onReorderStagedVideoToIndex={onReorderStagedVideoToIndex}
        onRemoveStagedVideo={onRemoveStagedVideo}
        onInsertSavedVideoIntoBody={onInsertSavedVideoIntoBody}
        onRemoveSavedVideoFromBody={onRemoveSavedVideoFromBody}
        onRemoveSavedVideo={onRemoveSavedVideo}
        onReorderSavedVideo={onReorderSavedVideo}
        onReorderSavedVideoToIndex={onReorderSavedVideoToIndex}
      />
    </div>
  )
}
