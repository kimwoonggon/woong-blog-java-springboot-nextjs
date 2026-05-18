import type { RefObject } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Work } from '@/components/admin/work-editor/types'
import { SOCIAL_SHARE_MESSAGE_KEY } from '@/components/admin/work-editor/metadata'
import { cn } from '@/lib/utils'

interface WorkGeneralSectionProps {
  sectionRef: RefObject<HTMLDivElement | null>
  active: boolean
  initialWork?: Work
  isEditing: boolean
  defaultCategory: string
  title: string
  category: string
  period: string
  tags: string
  socialShareMessage: string
  published: boolean
  formatDate: (dateString?: string | null) => string
  onTitleChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onPeriodChange: (value: string) => void
  onTagsChange: (value: string) => void
  onSocialShareMessageChange: (value: string) => void
  onPublishedChange: (value: boolean) => void
}

export function WorkGeneralSection({
  sectionRef,
  active,
  initialWork,
  isEditing,
  defaultCategory,
  title,
  category,
  period,
  tags,
  socialShareMessage,
  published,
  formatDate,
  onTitleChange,
  onCategoryChange,
  onPeriodChange,
  onTagsChange,
  onSocialShareMessageChange,
  onPublishedChange,
}: WorkGeneralSectionProps) {
  return (
    <div
      id="work-editor-general-section"
      ref={sectionRef}
      className={cn(
        'grid gap-6 rounded-2xl border border-border/80 bg-card p-6 shadow-sm md:grid-cols-2',
        active && 'ring-2 ring-primary/20',
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          name="category"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          placeholder={defaultCategory}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="period">Project Period</Label>
        <Input
          id="period"
          name="period"
          value={period}
          onChange={(event) => onPeriodChange(event.target.value)}
          placeholder="YYYY.MM - YYYY.MM"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input
          id="tags"
          name="tags"
          value={tags}
          onChange={(event) => onTagsChange(event.target.value)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="social-share-message">Share Message</Label>
        <Input
          id="social-share-message"
          name="socialShareMessage"
          value={socialShareMessage}
          onChange={(event) => onSocialShareMessageChange(event.target.value)}
          placeholder="Optional short message for link previews on /works/{slug}"
        />
        <p className="text-xs text-muted-foreground">
          Shared link descriptions use this value first. Stored in flexible metadata as <code>{SOCIAL_SHARE_MESSAGE_KEY}</code>.
        </p>
      </div>
      <div className="flex flex-wrap gap-6 pt-2 md:col-span-2">
        <div className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Visibility</span>
          <p className="font-mono text-sm text-foreground">
            {isEditing ? formatDate(initialWork?.publishedAt) : 'Publishes immediately'}
          </p>
        </div>
        {initialWork?.updatedAt && (
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Modified</span>
            <p className="font-mono text-sm text-foreground">
              {formatDate(initialWork.updatedAt)}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-2 md:ml-auto">
          <Checkbox
            id="published"
            name="published"
            checked={published}
            onCheckedChange={(value) => onPublishedChange(Boolean(value))}
          />
          <Label htmlFor="published" className="cursor-pointer text-sm">Published</Label>
        </div>
        {!isEditing && (
          <div className="rounded-xl border border-border/80 bg-muted/50 px-4 py-3 text-sm text-muted-foreground md:ml-auto">
            New works go live immediately. Staged videos attach automatically after creation.
          </div>
        )}
      </div>
    </div>
  )
}
