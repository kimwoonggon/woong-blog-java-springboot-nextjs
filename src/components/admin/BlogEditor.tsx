"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AuthoringCapabilityHints } from '@/components/admin/AuthoringCapabilityHints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { TiptapEditor } from '@/components/admin/TiptapEditor'
import { AIFixDialog } from '@/components/admin/AIFixDialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle } from 'lucide-react'
import { fetchWithCsrf } from '@/lib/api/auth'
import { getBrowserApiBaseUrl } from '@/lib/api/browser'
import { normalizeBlogHtmlForSave } from '@/lib/content/blog-content'
import { revalidatePublicPathsAfterMutation } from '@/lib/public-revalidation-client'
import { getBlogPublicRevalidationPaths } from '@/lib/public-revalidation-paths'
import { sanitizeAdminSaveError } from '@/lib/admin-save-error'
import { toast } from 'sonner'

interface Blog {
    id?: string
    title?: string
    excerpt?: string
    slug?: string
    tags?: string[]
    published?: boolean
    content?: { html?: string }
    publishedAt?: string | null
    updatedAt?: string
}

interface BlogEditorProps {
    initialBlog?: Blog
    inlineMode?: boolean
    onSaved?: () => void
    inlineReturnTo?: string
}

function resolveReturnTo(requestedReturnTo: string | null, fallback = '/admin/blog') {
    if (!requestedReturnTo) {
        return fallback
    }

    if (!requestedReturnTo.startsWith('/') || requestedReturnTo.startsWith('//')) {
        return fallback
    }

    return requestedReturnTo
}

function normalizeTagsInput(tags: string) {
    return tags.split(',').map((tag) => tag.trim()).filter(Boolean)
}

function normalizeBlogSnapshotHtml(html: string) {
    const normalized = normalizeBlogHtmlForSave(html)
    if (!normalized) {
        return ''
    }

    const collapsed = normalized
        .replace(/<(p|div)>\s*(?:<br\s*\/?>|&nbsp;|\u00A0|\s)*<\/\1>/gi, '')
        .trim()

    return collapsed
}

function plainTextFromHtml(html: string) {
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;|\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function buildBlogSnapshot({
    title,
    excerpt,
    tags,
    published,
    html,
}: {
    title: string
    excerpt: string
    tags: string
    published: boolean
    html: string
}) {
    return JSON.stringify({
        title: title.trim(),
        excerpt: excerpt.trim(),
        tags: normalizeTagsInput(tags),
        published,
        html: normalizeBlogSnapshotHtml(html),
    })
}

function clearBeforeUnloadWarning() {
    if (typeof window !== 'undefined') {
        window.onbeforeunload = null
    }
}

export function BlogEditor({ initialBlog, inlineMode = false, onSaved, inlineReturnTo }: BlogEditorProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const isEditing = Boolean(initialBlog?.id)
    const defaultPublished = initialBlog?.published ?? true
    const requestedReturnTo = inlineReturnTo ?? searchParams.get('returnTo')
    const returnTo = resolveReturnTo(requestedReturnTo)
    const [title, setTitle] = useState(initialBlog?.title || '')
    const [excerpt, setExcerpt] = useState(initialBlog?.excerpt || '')
    const [tagsInput, setTagsInput] = useState(initialBlog?.tags?.join(', ') || '')
    const [published, setPublished] = useState(defaultPublished)
    const [html, setHtml] = useState<string>(initialBlog?.content?.html || '')
    const [isSaving, setIsSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
    const saveBlogRef = useRef<() => Promise<void>>(async () => {})
    const acceptedInitialEditorChangeRef = useRef(false)

    const initialSnapshot = buildBlogSnapshot({
        title: initialBlog?.title || '',
        excerpt: initialBlog?.excerpt || '',
        tags: initialBlog?.tags?.join(', ') || '',
        published: defaultPublished,
        html: initialBlog?.content?.html || '',
    })
    const [savedSnapshot, setSavedSnapshot] = useState(initialSnapshot)
    const currentSnapshot = buildBlogSnapshot({
        title,
        excerpt,
        tags: tagsInput,
        published,
        html,
    })
    const hasUnsavedChanges = isDirty || savedSnapshot !== currentSnapshot
    const isSaveDisabled = isSaving || !hasUnsavedChanges || !title.trim()

    useEffect(() => {
        setSavedSnapshot(initialSnapshot)
        setIsDirty(false)
        acceptedInitialEditorChangeRef.current = false
    }, [initialSnapshot])

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Not yet'
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const saveBlog = useCallback(async () => {
        const tags = normalizeTagsInput(tagsInput)
        const apiBaseUrl = getBrowserApiBaseUrl()
        const normalizedHtml = normalizeBlogHtmlForSave(html)
        const payload = {
            title,
            excerpt: excerpt.trim(),
            tags,
            published,
            contentJson: JSON.stringify({ html: normalizedHtml }),
        }

        setIsSaving(true)
        setSaveError(null)

        try {
            const response = await fetchWithCsrf(
                isEditing && initialBlog?.id
                    ? `${apiBaseUrl}/admin/blogs/${encodeURIComponent(initialBlog.id)}`
                    : `${apiBaseUrl}/admin/blogs`,
                {
                    method: isEditing ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            )

            if (!response.ok) {
                const message = await response.text()
                const safeMessage = sanitizeAdminSaveError(
                    message,
                    'Blog post could not be saved. Please retry after the backend is healthy.',
                )
                setSaveError(safeMessage)
                toast.error(safeMessage)
                return
            }

            const result = await response.json().catch(() => null) as { id?: string; slug?: string } | null
            const nextSlug = result?.slug ?? initialBlog?.slug ?? null
            await revalidatePublicPathsAfterMutation(getBlogPublicRevalidationPaths(nextSlug, initialBlog?.slug))
            const nextSnapshot = buildBlogSnapshot({
                title,
                excerpt,
                tags: tagsInput,
                published,
                html: normalizedHtml,
            })

            toast.success(isEditing ? 'Blog post updated successfully' : 'Blog post created successfully')
            setSaveError(null)
            setSavedSnapshot(nextSnapshot)
            setIsDirty(false)
            clearBeforeUnloadWarning()
            onSaved?.()
            if (normalizedHtml !== html) {
                setHtml(normalizedHtml)
            }

            if (inlineMode) {
                if (requestedReturnTo && returnTo !== '/admin/blog') {
                    router.push(returnTo)
                    return
                }

                const relatedPage = searchParams.get('relatedPage')
                const relatedPageQuery = relatedPage ? `?relatedPage=${encodeURIComponent(relatedPage)}` : ''

                if (!isEditing && pathname === '/blog') {
                    const currentPageSize = searchParams.get('pageSize')
                    const destination = currentPageSize
                        ? `/blog?page=1&pageSize=${encodeURIComponent(currentPageSize)}`
                        : '/blog?page=1'

                    router.push(destination)
                    router.refresh()
                    return
                }

                if (isEditing && pathname.startsWith('/blog/')) {
                    if (nextSlug) {
                        router.replace(`/blog/${encodeURIComponent(nextSlug)}${relatedPageQuery}`)
                        router.refresh()
                    } else {
                        router.refresh()
                    }
                    return
                }

                router.refresh()
                return
            }

            router.push(returnTo)
        } finally {
            setIsSaving(false)
        }
    }, [
        excerpt,
        html,
        initialBlog?.id,
        initialBlog?.slug,
        inlineMode,
        isEditing,
        pathname,
        published,
        router,
        requestedReturnTo,
        returnTo,
        searchParams,
        tagsInput,
        title,
        onSaved,
    ])

    saveBlogRef.current = saveBlog

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isSaveShortcut = (event.metaKey || event.ctrlKey)
                && (event.key.toLowerCase() === 's' || event.code === 'KeyS')

            if (!isSaveShortcut || event.defaultPrevented) {
                return
            }

            event.preventDefault()

            if (isSaving || !title.trim() || !hasUnsavedChanges) {
                return
            }

            void saveBlogRef.current()
        }

        window.addEventListener('keydown', handleKeyDown, { capture: true })
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true })
        }
    }, [hasUnsavedChanges, isSaving, title])

    useEffect(() => {
        if (!hasUnsavedChanges) {
            window.onbeforeunload = null
            return
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault()
            event.returnValue = ''
            return ''
        }

        window.onbeforeunload = handleBeforeUnload

        return () => {
            if (window.onbeforeunload === handleBeforeUnload) {
                window.onbeforeunload = null
            }
        }
    }, [hasUnsavedChanges])

    const requestBack = () => {
        if (hasUnsavedChanges) {
            setShowUnsavedDialog(true)
            return
        }

        router.back()
    }

    return (
        <>
        <form
            className="max-w-5xl space-y-8"
            onSubmit={(event) => {
                event.preventDefault()
                void saveBlog()
            }}
        >
            <div className="grid gap-6 rounded-2xl border border-border/80 bg-card p-6 shadow-sm md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                        id="title"
                        name="title"
                        required
                        value={title}
                        onChange={(event) => {
                            setTitle(event.target.value)
                            setIsDirty(true)
                            setSaveError(null)
                        }}
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea
                        id="excerpt"
                        name="excerpt"
                        placeholder="A brief summary of the post (used in previews and SEO)…"
                        value={excerpt}
                        onChange={(event) => {
                            setExcerpt(event.target.value.slice(0, 200))
                            setIsDirty(true)
                            setSaveError(null)
                        }}
                        rows={2}
                        maxLength={200}
                        className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">{excerpt.length}/200</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                        id="tags"
                        name="tags"
                        value={tagsInput}
                        onChange={(event) => {
                            setTagsInput(event.target.value)
                            setIsDirty(true)
                            setSaveError(null)
                        }}
                    />
                </div>
                <div className="flex items-end">
                    <div className="flex items-center space-x-2 rounded-full border bg-muted/40 px-3 py-2">
                        <Checkbox
                            id="published"
                            name="published"
                            checked={published}
                            onCheckedChange={(value) => {
                                setPublished(Boolean(value))
                                setIsDirty(true)
                                setSaveError(null)
                            }}
                        />
                        <Label htmlFor="published" className="cursor-pointer text-sm">Published</Label>
                    </div>
                </div>

                <div className="flex flex-wrap gap-6 pt-2 md:col-span-2">
                    <div className="space-y-1">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Visibility</span>
                        <p className="font-mono text-sm text-foreground">
                            {isEditing ? formatDate(initialBlog?.publishedAt ?? undefined) : 'Publishes immediately'}
                        </p>
                    </div>
                    {initialBlog?.updatedAt && (
                        <div className="space-y-1">
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Modified</span>
                            <p className="font-mono text-sm text-foreground">
                                {formatDate(initialBlog.updatedAt)}
                            </p>
                        </div>
                    )}
                    {!isEditing && (
                        <div className="rounded-xl border border-border/80 bg-muted/50 px-4 py-3 text-sm text-muted-foreground md:ml-auto">
                            New posts go live immediately. Toggle &apos;Published&apos; off to save as draft.
                        </div>
                    )}
                </div>
            </div>

            <div
                data-testid="blog-editor-workspace"
                className="min-w-0 max-w-full resize-x space-y-4 overflow-auto rounded-2xl border border-border/80 bg-card p-6 shadow-sm md:min-w-[42rem]"
            >
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-medium">Content</h3>
                    <div className="flex items-center gap-2">
                        <AIFixDialog content={html} onApply={setHtml} />
                    </div>
                </div>
                <AuthoringCapabilityHints />
                <TiptapEditor
                    content={html}
                    onChange={(nextHtml) => {
                        const nextSnapshot = buildBlogSnapshot({
                            title,
                            excerpt,
                            tags: tagsInput,
                            published,
                            html: nextHtml,
                        })

                        const initialEditorText = plainTextFromHtml(initialBlog?.content?.html || '')
                        const nextEditorText = plainTextFromHtml(nextHtml)
                        if (
                            isEditing
                            && !acceptedInitialEditorChangeRef.current
                            && !isDirty
                            && initialEditorText === nextEditorText
                        ) {
                            acceptedInitialEditorChangeRef.current = true
                            setHtml(nextHtml)
                            setSavedSnapshot(nextSnapshot)
                            setIsDirty(false)
                            return
                        }

                        acceptedInitialEditorChangeRef.current = true
                        setHtml(nextHtml)
                        setIsDirty(nextSnapshot !== savedSnapshot)
                        if (nextSnapshot !== savedSnapshot) {
                            setSaveError(null)
                        }
                    }}
                />
            </div>

            <div className="flex flex-col gap-3 border-t pt-8 sm:flex-row sm:items-center sm:justify-end">
                {saveError ? (
                    <p
                        role="alert"
                        aria-live="polite"
                        data-testid="admin-blog-form-error"
                        className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:mr-auto sm:max-w-xl"
                    >
                        {saveError}
                    </p>
                ) : null}
                {!inlineMode && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            requestBack()
                        }}
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={isSaveDisabled}
                    className="px-8 font-medium"
                >
                    {isSaving ? 'Saving…' : isEditing ? 'Update Post' : 'Create Post'}
                </Button>
            </div>
        </form>
        <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
            <DialogContent data-testid="admin-unsaved-dialog">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
                        Unsaved changes
                    </DialogTitle>
                    <DialogDescription>
                        Leave this editor and discard the changes you have not saved yet.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowUnsavedDialog(false)}>
                        Keep editing
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                            clearBeforeUnloadWarning()
                            setShowUnsavedDialog(false)
                            router.back()
                        }}
                    >
                        Discard changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}
