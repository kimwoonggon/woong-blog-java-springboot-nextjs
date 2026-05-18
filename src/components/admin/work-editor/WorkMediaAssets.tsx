import Image from 'next/image'
import type { ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WorkThumbnailSourceKind } from '@/lib/content/work-thumbnail-resolution'

interface WorkMediaAssetsProps {
  effectiveThumbnailPreviewUrl: string
  thumbnailSourceKind: WorkThumbnailSourceKind
  thumbnailAssetId: string
  iconUrl: string
  uploadingTarget: 'thumbnail' | 'icon' | null
  isAutoGeneratingThumbnail: boolean
  onUploadWorkImage: (event: ChangeEvent<HTMLInputElement>, target: 'thumbnail' | 'icon') => void
  onRemoveWorkImage: (target: 'thumbnail' | 'icon') => void
}

function thumbnailSourceLabel(sourceKind: WorkThumbnailSourceKind) {
  if (sourceKind === 'manual') {
    return 'Thumbnail source: manual'
  }

  if (sourceKind === 'uploaded-video') {
    return 'Thumbnail source: uploaded video'
  }

  if (sourceKind === 'youtube') {
    return 'Thumbnail source: YouTube'
  }

  if (sourceKind === 'content-image') {
    return 'Thumbnail source: content image'
  }

  return 'Thumbnail source: none'
}

export function WorkMediaAssets({
  effectiveThumbnailPreviewUrl,
  thumbnailSourceKind,
  thumbnailAssetId,
  iconUrl,
  uploadingTarget,
  isAutoGeneratingThumbnail,
  onUploadWorkImage,
  onRemoveWorkImage,
}: WorkMediaAssetsProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-background p-5">
      <div>
        <h3 className="text-lg font-medium">Work Media</h3>
        <p className="text-sm text-muted-foreground">
          Upload thumbnail and icon images for this work.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="work-thumbnail-upload">Thumbnail Image</Label>
          <div className="relative h-40 overflow-hidden rounded-md border border-border bg-muted">
            {effectiveThumbnailPreviewUrl ? (
              <Image
                src={effectiveThumbnailPreviewUrl}
                alt="Work thumbnail preview"
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No thumbnail uploaded
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground" data-testid="work-thumbnail-source">
            {thumbnailSourceLabel(thumbnailSourceKind)}
          </p>
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/50 p-4">
            <p className="mb-2 text-sm font-medium text-foreground">Thumbnail</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Recommended size: 800 × 600px
            </p>
            <Input
              id="work-thumbnail-upload"
              type="file"
              accept="image/*"
              onChange={(event) => onUploadWorkImage(event, 'thumbnail')}
              disabled={uploadingTarget !== null}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onRemoveWorkImage('thumbnail')}
              disabled={!thumbnailAssetId}
            >
              Remove Thumbnail
            </Button>
            {uploadingTarget === 'thumbnail' && (
              <span className="text-sm text-muted-foreground">Uploading…</span>
            )}
            {isAutoGeneratingThumbnail && (
              <span className="text-sm text-muted-foreground">Generating thumbnail…</span>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <Label htmlFor="work-icon-upload">Icon Image</Label>
          <div className="relative h-40 overflow-hidden rounded-md border border-border bg-muted">
            {iconUrl ? (
              <Image
                src={iconUrl}
                alt="Work icon preview"
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No icon uploaded
              </div>
            )}
          </div>
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/50 p-4">
            <p className="mb-2 text-sm font-medium text-foreground">Icon</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Square image recommended.
            </p>
            <Input
              id="work-icon-upload"
              type="file"
              accept="image/*"
              onChange={(event) => onUploadWorkImage(event, 'icon')}
              disabled={uploadingTarget !== null}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onRemoveWorkImage('icon')}
              disabled={!iconUrl}
            >
              Remove Icon
            </Button>
            {uploadingTarget === 'icon' && (
              <span className="text-sm text-muted-foreground">Uploading…</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
