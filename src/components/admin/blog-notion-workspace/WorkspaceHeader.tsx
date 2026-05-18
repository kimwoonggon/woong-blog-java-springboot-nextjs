import Link from 'next/link'
import { AIFixDialog } from '@/components/admin/AIFixDialog'
import { Button } from '@/components/ui/button'
import type { SaveState } from './types'

interface WorkspaceHeaderProps {
    activeBlogId: string | null
    contentHtml: string
    saveState: SaveState
    showDocInfo: boolean
    onAiApply: (nextHtml: string) => void
    onToggleDocInfo: () => void
}

export function WorkspaceHeader({
    activeBlogId,
    contentHtml,
    onAiApply,
    onToggleDocInfo,
    saveState,
    showDocInfo,
}: WorkspaceHeaderProps) {
    return (
        <div className="border-b border-border/80 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Blog Notion View</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Content autosaves after a short pause. Press Ctrl+S to save content and post settings immediately.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        data-testid="notion-doc-info-toggle"
                        variant="outline"
                        size="sm"
                        onClick={onToggleDocInfo}
                    >
                        {showDocInfo ? 'Hide Info' : 'Show Info'}
                    </Button>
                    <SaveStateBadge saveState={saveState} />
                    <AIFixDialog content={contentHtml} onApply={onAiApply} />
                    <Link href={activeBlogId ? `/admin/blog/${activeBlogId}` : '/admin/blog'}>
                        <Button variant="outline">Open full editor</Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}

function SaveStateBadge({ saveState }: { saveState: SaveState }) {
    return (
        <span
            data-testid="notion-save-state"
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                saveState === 'saving'
                    ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200'
                    : saveState === 'saved'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
                        : saveState === 'error'
                            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200'
                            : 'border-border text-muted-foreground'
            }`}
        >
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Error' : 'Waiting'}
        </span>
    )
}
