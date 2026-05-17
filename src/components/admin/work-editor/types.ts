import type { WorkVideo } from '@/lib/api/works'
import type { WorkThumbnailSourceKind } from '@/lib/content/work-thumbnail-resolution'

export interface Work {
  id?: string
  title?: string
  excerpt?: string
  slug?: string
  category?: string
  tags?: string[]
  published?: boolean
  publishedAt?: string | null
  updatedAt?: string
  content?: { html?: string }
  period?: string | null
  all_properties?: Record<string, unknown>
  thumbnail_asset_id?: string | null
  icon_asset_id?: string | null
  thumbnail_url?: string
  icon_url?: string
  videos_version?: number
  videos?: WorkVideo[]
}

export interface WorkEditorProps {
  initialWork?: Work
  inlineMode?: boolean
  onSaved?: (result: { id?: string; slug?: string | null; isEditing: boolean }) => void
}

export interface VideoDraft {
  tempId: string
  kind: 'youtube' | 'file'
  label: string
  uploadMode?: 'legacy' | 'hls'
  youtubeUrl?: string
  file?: File
}

export interface VideoMutationPayload {
  videos_version?: number
  videosVersion?: number
  videos?: WorkVideo[]
}

export interface UploadTargetPayload {
  uploadSessionId: string
  uploadMethod: 'PUT' | 'POST'
  uploadUrl: string
  storageKey: string
}

export interface VideoInsertRequest {
  videoId: string
  nonce: number
}

export interface UploadedAssetPayload {
  id: string
  url: string
  path?: string
}

export interface WorkSaveResponsePayload {
  id?: string
  slug?: string
  Slug?: string
}

export interface StagedVideoResult {
  currentVersion: number
  latestPayload: VideoMutationPayload | null
}

export type ThumbnailCandidate = {
  kind: WorkThumbnailSourceKind
  file?: File
  youtubeVideoId?: string
}
