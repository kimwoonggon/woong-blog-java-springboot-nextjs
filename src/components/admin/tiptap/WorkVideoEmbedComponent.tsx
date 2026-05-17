"use client"

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Film } from 'lucide-react'
import { WorkVideoPlayer } from '@/components/content/WorkVideoPlayer'
import { getWorkVideoDisplayLabel } from '@/lib/content/work-video-embeds'
import type { WorkVideoEmbedExtensionOptions } from './WorkVideoEmbedBlock'

export function WorkVideoEmbedComponent(props: NodeViewProps) {
  const extensionOptions = props.extension.options as WorkVideoEmbedExtensionOptions
  const video = extensionOptions.resolveVideo(props.node.attrs.videoId)

  return (
    <NodeViewWrapper
      className={`my-6 rounded-2xl border border-border/70 bg-card p-4 ${props.selected ? 'ring-2 ring-brand-orange' : ''}`}
      data-video-id={props.node.attrs.videoId}
      data-testid="work-video-embed-node"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <Film className="h-4 w-4" />
        <span>Inline Video</span>
      </div>

      {video ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {getWorkVideoDisplayLabel(video)} · {video.sourceType.toUpperCase()}
          </p>
          <WorkVideoPlayer video={video} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-amber-400/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
          Missing work video reference: {props.node.attrs.videoId}
        </div>
      )}
    </NodeViewWrapper>
  )
}
