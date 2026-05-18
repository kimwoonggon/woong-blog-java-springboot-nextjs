import type { ChangeEvent } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { WorkVideoPlayer } from '@/components/content/WorkVideoPlayer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WorkVideo } from '@/lib/api/works'
import { getWorkVideoDisplayLabel } from '@/lib/content/work-video-embeds'
import { cn } from '@/lib/utils'
import type { VideoDraft } from '@/components/admin/work-editor/types'
import type { VideoUploadStatus } from '@/components/admin/work-editor/useVideoUploadStatus'

interface WorkVideoManagerProps {
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

export function WorkVideoManager({
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
}: WorkVideoManagerProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-background p-5">
      <div>
        <h3 className="text-lg font-medium">Work Videos</h3>
        <p className="text-sm text-muted-foreground">
          {isEditing
            ? 'Add YouTube links or upload MP4 files. Video changes save immediately.'
            : usesPublicInlineCreateFlow
              ? "Stage videos before saving. They'll be attached automatically."
              : "Stage videos before saving. They'll be attached after the work is created."}
        </p>
      </div>
      {isEditing && (
        <div className="rounded-xl border border-border/80 bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Videos save immediately. Use Update Work for text, metadata, thumbnail, or icon changes.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="youtube-video-input">YouTube URL or ID</Label>
          <Input
            id="youtube-video-input"
            value={youtubeUrlInput}
            onChange={(event) => onYoutubeUrlInputChange(event.target.value)}
            placeholder="https://youtu.be/… or dQw4w9WgXcQ"
            disabled={isVideoBusy}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onAddYouTubeDraft}
          disabled={isVideoBusy || !youtubeUrlInput.trim() || (!isEditing && stagedVideos.length >= 10)}
        >
          Add YouTube Video
        </Button>
      </div>

      <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/40 p-4">
        <Label htmlFor="work-video-upload">Upload MP4 Video as HLS</Label>
        <Input
          id="work-video-upload"
          type="file"
          accept="video/mp4,.mp4"
          onChange={onStageHlsVideoFile}
          disabled={isVideoBusy || (!isEditing && stagedVideos.length >= 10)}
        />
        <p className="text-xs text-muted-foreground">
          Creates an m3u8 playlist from the original MP4 without downscaling. Use H.264/AAC MP4 files for browser playback.
        </p>
        {videoUploadStatus ? (
          <p
            data-testid="work-video-upload-status"
            className={cn(
              'text-xs font-medium',
              videoUploadStatus.phase === 'complete'
                ? 'text-emerald-600'
                : 'text-muted-foreground',
            )}
          >
            {videoUploadStatus.message}
          </p>
        ) : null}
      </div>

      {isEditing ? (
        <SavedVideoList
          videos={videos}
          videosVersion={videosVersion}
          isVideoBusy={isVideoBusy}
          embeddedVideoIdSet={embeddedVideoIdSet}
          orphanEmbeddedVideoIds={orphanEmbeddedVideoIds}
          onInsertSavedVideoIntoBody={onInsertSavedVideoIntoBody}
          onRemoveSavedVideoFromBody={onRemoveSavedVideoFromBody}
          onRemoveSavedVideo={onRemoveSavedVideo}
          onReorderSavedVideo={onReorderSavedVideo}
          onReorderSavedVideoToIndex={onReorderSavedVideoToIndex}
        />
      ) : (
        <StagedVideoList
          stagedVideos={stagedVideos}
          onMoveStagedVideo={onMoveStagedVideo}
          onReorderStagedVideoToIndex={onReorderStagedVideoToIndex}
          onRemoveStagedVideo={onRemoveStagedVideo}
        />
      )}
    </div>
  )
}

interface SavedVideoListProps {
  videos: WorkVideo[]
  videosVersion: number
  isVideoBusy: boolean
  embeddedVideoIdSet: Set<string>
  orphanEmbeddedVideoIds: string[]
  onInsertSavedVideoIntoBody: (videoId: string) => void
  onRemoveSavedVideoFromBody: (videoId: string) => void
  onRemoveSavedVideo: (videoId: string) => void
  onReorderSavedVideo: (videoId: string, direction: -1 | 1) => void
  onReorderSavedVideoToIndex: (videoId: string, targetIndex: number) => void
}

function SavedVideoList({
  videos,
  videosVersion,
  isVideoBusy,
  embeddedVideoIdSet,
  orphanEmbeddedVideoIds,
  onInsertSavedVideoIntoBody,
  onRemoveSavedVideoFromBody,
  onRemoveSavedVideo,
  onReorderSavedVideo,
  onReorderSavedVideoToIndex,
}: SavedVideoListProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Saved videos version {videosVersion}
      </p>
      {videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
          No videos attached yet.
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((video, index) => (
            <div
              key={video.id}
              data-testid="saved-video-card"
              draggable={!isVideoBusy}
              onDragStart={(event) => {
                event.dataTransfer.setData('text/saved-video-id', video.id)
                event.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(event) => {
                event.preventDefault()
                const sourceId = event.dataTransfer.getData('text/saved-video-id')
                if (sourceId) {
                  onReorderSavedVideoToIndex(sourceId, index)
                }
              }}
              className="space-y-3 rounded-xl border border-border/70 p-4"
            >
              {embeddedVideoIdSet.has(video.id) && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100">
                  Placed in body. Remove it from the body before deleting the saved video.
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{getWorkVideoDisplayLabel(video)}</p>
                  <p className="text-xs text-muted-foreground">
                    {video.sourceType.toUpperCase()} · order {video.sortOrder + 1} · {embeddedVideoIdSet.has(video.id) ? 'Placed in body' : 'Not placed'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => onInsertSavedVideoIntoBody(video.id)}
                    disabled={isVideoBusy || embeddedVideoIdSet.has(video.id)}
                  >
                    Insert Into Body
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onRemoveSavedVideoFromBody(video.id)}
                    disabled={isVideoBusy || !embeddedVideoIdSet.has(video.id)}
                  >
                    Remove From Body
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${getWorkVideoDisplayLabel(video)} up`}
                    title="Move Up"
                    onClick={() => onReorderSavedVideo(video.id, -1)}
                    disabled={isVideoBusy || index === 0}
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${getWorkVideoDisplayLabel(video)} down`}
                    title="Move Down"
                    onClick={() => onReorderSavedVideo(video.id, 1)}
                    disabled={isVideoBusy || index === videos.length - 1}
                  >
                    <ChevronDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${getWorkVideoDisplayLabel(video)}`}
                    title="Remove Video"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onRemoveSavedVideo(video.id)}
                    disabled={isVideoBusy}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <WorkVideoPlayer video={video} />
            </div>
          ))}
        </div>
      )}
      {orphanEmbeddedVideoIds.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
          Body references missing videos: {orphanEmbeddedVideoIds.join(', ')}
        </div>
      )}
    </div>
  )
}

interface StagedVideoListProps {
  stagedVideos: VideoDraft[]
  onMoveStagedVideo: (tempId: string, direction: -1 | 1) => void
  onReorderStagedVideoToIndex: (tempId: string, targetIndex: number) => void
  onRemoveStagedVideo: (tempId: string) => void
}

function StagedVideoList({
  stagedVideos,
  onMoveStagedVideo,
  onReorderStagedVideoToIndex,
  onRemoveStagedVideo,
}: StagedVideoListProps) {
  return (
    <div className="space-y-4">
      {stagedVideos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
          No staged videos yet.
        </div>
      ) : (
        stagedVideos.map((video, index) => (
          <div
            key={video.tempId}
            data-testid="staged-video-card"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('text/staged-video-id', video.tempId)
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => {
              event.preventDefault()
              const sourceId = event.dataTransfer.getData('text/staged-video-id')
              if (sourceId) {
                onReorderStagedVideoToIndex(sourceId, index)
              }
            }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-4"
          >
            <div>
              <p className="text-sm font-medium">{video.label}</p>
              <p className="text-xs text-muted-foreground">
                {video.kind === 'youtube' ? 'YouTube draft' : video.uploadMode === 'hls' ? 'HLS MP4 draft' : 'MP4 draft'} · order {index + 1}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${video.label} up`}
                title="Move Up"
                onClick={() => onMoveStagedVideo(video.tempId, -1)}
                disabled={index === 0}
              >
                <ChevronUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${video.label} down`}
                title="Move Down"
                onClick={() => onMoveStagedVideo(video.tempId, 1)}
                disabled={index === stagedVideos.length - 1}
              >
                <ChevronDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${video.label}`}
                title="Remove Video"
                className="text-destructive hover:text-destructive"
                onClick={() => onRemoveStagedVideo(video.tempId)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
