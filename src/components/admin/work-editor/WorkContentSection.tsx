import type { RefObject } from 'react'
import { AIFixDialog } from '@/components/admin/AIFixDialog'
import { TiptapEditor } from '@/components/admin/TiptapEditor'
import type { WorkVideo } from '@/lib/api/works'
import { cn } from '@/lib/utils'
import type { VideoInsertRequest } from '@/components/admin/work-editor/types'

interface WorkContentSectionProps {
  sectionRef: RefObject<HTMLDivElement | null>
  active: boolean
  html: string
  title: string
  videos: WorkVideo[]
  isEditing: boolean
  shouldContinueInlinePlacement: boolean
  insertVideoRequest: VideoInsertRequest | null
  orphanEmbeddedVideoIds: string[]
  onHtmlChange: (nextHtml: string) => void
  onVideoInsertHandled: (result: { inserted: boolean; reason?: 'duplicate' | 'missing' }) => void
}

export function WorkContentSection({
  sectionRef,
  active,
  html,
  title,
  videos,
  isEditing,
  shouldContinueInlinePlacement,
  insertVideoRequest,
  orphanEmbeddedVideoIds,
  onHtmlChange,
  onVideoInsertHandled,
}: WorkContentSectionProps) {
  return (
    <div
      id="work-editor-content-section"
      ref={sectionRef}
      className={cn(
        'space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-sm',
        active && 'ring-2 ring-primary/20',
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">Content (HTML/Text)</h3>
        <div className="flex items-center gap-2">
          <AIFixDialog
            content={html}
            onApply={onHtmlChange}
            apiEndpoint="/api/admin/ai/work-enrich"
            title="AI Enrich"
            extraBodyParams={{ title }}
          />
        </div>
      </div>
      <div className="rounded-xl border border-border/80 bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        Write the project description shown on the public site.
      </div>
      {shouldContinueInlinePlacement && isEditing && videos.length > 0 && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100">
          Videos were saved. Continue by placing them inline inside the body wherever they should appear.
        </div>
      )}
      <TiptapEditor
        content={html}
        onChange={onHtmlChange}
        placeholder="Describe the project story and place saved videos inline where they belong…"
        workVideos={videos}
        insertVideoEmbedRequest={insertVideoRequest}
        onVideoInsertHandled={onVideoInsertHandled}
      />
      {orphanEmbeddedVideoIds.length > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Some inline video references no longer exist in the saved list. Remove those inline blocks before publishing.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Use the saved video cards above to place each video inline inside the story.
      </p>
    </div>
  )
}
