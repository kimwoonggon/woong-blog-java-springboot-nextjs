import { Button } from '@/components/ui/button'
import type { BlogWorkspaceRecord } from './types'
import { formatTimestamp } from './utils'

interface DocumentInfoSidebarProps {
    activeBlog: BlogWorkspaceRecord
    isSavingMeta: boolean
    metaDirty: boolean
    title: string
    onSaveMetadata: () => Promise<void>
}

export function DocumentInfoSidebar({
    activeBlog,
    isSavingMeta,
    metaDirty,
    onSaveMetadata,
    title,
}: DocumentInfoSidebarProps) {
    return (
        <aside data-testid="notion-doc-info" className="space-y-4 rounded-2xl border border-border/80 bg-muted/20 p-4">
            <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Document info</p>
                <dl className="mt-3 space-y-3 text-sm">
                    <div>
                        <dt className="text-muted-foreground">Published</dt>
                        <dd>{formatTimestamp(activeBlog.publishedAt)}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Last updated</dt>
                        <dd>{formatTimestamp(activeBlog.updatedAt)}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Slug</dt>
                        <dd className="break-all">{activeBlog.slug}</dd>
                    </div>
                </dl>
            </div>

            <Button
                type="button"
                onClick={() => void onSaveMetadata()}
                disabled={isSavingMeta || !metaDirty || !title.trim()}
                className="w-full"
            >
                {isSavingMeta ? 'Saving post settings...' : 'Save Post Settings'}
            </Button>
            <p className="text-xs text-muted-foreground">
                Members list stays out of this modernization pass for now; this view is intentionally blog-first and content-first.
            </p>
        </aside>
    )
}
