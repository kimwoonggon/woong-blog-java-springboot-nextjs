"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { isHtmlPageContent } from '@/lib/content/page-content'
import { fetchWithCsrf } from '@/lib/api/auth'
import { sanitizeAdminSaveError } from '@/lib/admin-save-error'
import { toast } from 'sonner'
import { getBrowserApiBaseUrl } from '@/lib/api/browser'
import { revalidatePublicPathsAfterMutation } from '@/lib/public-revalidation-client'
import { getPagePublicRevalidationPaths } from '@/lib/public-revalidation-paths'

interface Page {
    id: string
    title: string
    slug: string
    content: unknown
}

interface PageEditorProps {
    page: Page
    inlineMode?: boolean
    onSaved?: () => void
}

const MAX_PAGE_TITLE_LENGTH = 200

export function PageEditor({ page, inlineMode = false, onSaved }: PageEditorProps) {
    const router = useRouter()
    const [title, setTitle] = useState(page.title || '')
    const [titleDirty, setTitleDirty] = useState(false)
    const [html, setHtml] = useState(
        isHtmlPageContent(page.content) ? page.content.html : ''
    )
    const [isSaving, setIsSaving] = useState(false)

    async function savePage() {
        setIsSaving(true)
        const toastId = toast.loading('Saving changes...')

        try {
            const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/pages`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: page.id,
                    title: titleDirty ? title : title.slice(0, MAX_PAGE_TITLE_LENGTH),
                    contentJson: JSON.stringify({ html }),
                }),
            })

            if (!response.ok) {
                const message = await response.text()
                const safeMessage = sanitizeAdminSaveError(
                    message,
                    'Page could not be saved. Please retry after the backend is healthy.',
                )
                toast.error(`Error saving page: ${safeMessage}`, { id: toastId })
            } else {
                await revalidatePublicPathsAfterMutation(getPagePublicRevalidationPaths(page.slug))
                toast.success('Page updated successfully!', { id: toastId })
                router.refresh()
                onSaved?.()
            }
        } catch (err) {
            console.error('Fatal save error:', err)
            toast.error('A fatal error occurred while saving.', { id: toastId })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="max-w-4xl space-y-8 rounded-md border border-border bg-card p-6 text-card-foreground">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold capitalize">{inlineMode ? `${page.slug} Inline Editor` : `${page.slug} Page`}</h2>
                <Button type="button" onClick={savePage} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <div className="space-y-2">
                <Label htmlFor={`title-${page.id}`}>Title</Label>
                <Input
                    id={`title-${page.id}`}
                    name="title"
                    required
                    value={title}
                    onChange={(e) => {
                        setTitleDirty(true)
                        setTitle(e.target.value)
                    }}
                />
            </div>

            <div className="space-y-4">
                <Label htmlFor={`content-${page.id}`}>Content (HTML/Text)</Label>
                <Textarea
                    id={`content-${page.id}`}
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    className="min-h-[260px] font-mono text-sm"
                    placeholder="<p>Write page content here...</p>"
                />
                <p className="text-sm text-gray-500">
                    This editor is simplified to keep admin page save/readback stable during migration.
                </p>
            </div>
        </div>
    )
}
