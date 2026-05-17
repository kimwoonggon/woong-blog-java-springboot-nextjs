"use client"

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, X } from 'lucide-react'
import { AIFixDialog } from '@/components/admin/AIFixDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { TiptapEditor } from '@/components/admin/TiptapEditor'
import { fetchWithCsrf } from '@/lib/api/auth'
import { getBrowserApiBaseUrl } from '@/lib/api/browser'
import { normalizeBlogHtmlForSave } from '@/lib/content/blog-content'
import { revalidatePublicPathsAfterMutation } from '@/lib/public-revalidation-client'
import { getBlogPublicRevalidationPaths } from '@/lib/public-revalidation-paths'
import { toast } from 'sonner'

interface BlogWorkspaceListItem {
    id: string
    title: string
    slug: string
    published: boolean
    publishedAt?: string | null
    updatedAt?: string
    tags?: string[]
}

interface BlogWorkspaceRecord extends BlogWorkspaceListItem {
    excerpt: string
    content: { html: string }
}

interface BlogNotionWorkspaceProps {
    blogs: BlogWorkspaceListItem[]
    activeBlog: BlogWorkspaceRecord
}

function normalizeTagsInput(tags: string) {
    return tags.split(',').map((tag) => tag.trim()).filter(Boolean)
}

function formatTimestamp(value?: string | null) {
    if (!value) {
        return '—'
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return '—'
    }

    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function displayText(value: unknown, fallback: string) {
    return typeof value === 'string' && value.trim() ? value : fallback
}

function usableId(value: unknown) {
    return typeof value === 'string' && value.trim() ? value : null
}

function normalizedTags(value: unknown) {
    return Array.isArray(value)
        ? value.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0).map((tag) => tag.trim())
        : []
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
const AUTOSAVE_DEBOUNCE_MS = 1_000
const AUTOSAVE_REVALIDATION_THROTTLE_MS = 25_000

export function BlogNotionWorkspace({ blogs, activeBlog }: BlogNotionWorkspaceProps) {
    const [isLibraryOpen, setIsLibraryOpen] = useState(false)
    const [librarySearch, setLibrarySearch] = useState('')
    const [showCapabilityHint, setShowCapabilityHint] = useState(true)
    const [showDocInfo, setShowDocInfo] = useState(true)
    const activeBlogId = usableId(activeBlog.id)
    const activeBlogTitle = displayText(activeBlog.title, 'Untitled post')
    const activeBlogTags = normalizedTags(activeBlog.tags)
    const [title, setTitle] = useState(activeBlogTitle)
    const [tagsInput, setTagsInput] = useState(activeBlogTags.join(', '))
    const [published, setPublished] = useState(activeBlog.published)
    const [editorContent, setEditorContent] = useState(activeBlog.content.html ?? '')
    const [saveState, setSaveState] = useState<SaveState>('idle')
    const [isSavingMeta, setIsSavingMeta] = useState(false)
    const currentHtmlRef = useRef(activeBlog.content.html ?? '')
    const autosaveTimerRef = useRef<number | null>(null)
    const lastSavedRef = useRef({
        title: activeBlogTitle,
        tags: activeBlogTags,
        published: activeBlog.published,
        html: activeBlog.content.html ?? '',
    })
    const skipAutosaveRef = useRef(true)
    const libraryScrollRef = useRef(0)
    const libraryScrollContainerRef = useRef<HTMLDivElement | null>(null)
    const activeLibraryItemRef = useRef<HTMLDivElement | null>(null)
    const lastAutosaveRevalidationAtRef = useRef(0)
    const pendingAutosaveRevalidationTimerRef = useRef<number | null>(null)

    const clearPendingAutosaveRevalidation = useCallback(() => {
        if (pendingAutosaveRevalidationTimerRef.current !== null) {
            window.clearTimeout(pendingAutosaveRevalidationTimerRef.current)
            pendingAutosaveRevalidationTimerRef.current = null
        }
    }, [])

    const clearAutosaveTimer = useCallback(() => {
        if (autosaveTimerRef.current !== null) {
            window.clearTimeout(autosaveTimerRef.current)
            autosaveTimerRef.current = null
        }
    }, [])

    const runImmediateRevalidation = useCallback(async (slug: string) => {
        await revalidatePublicPathsAfterMutation(getBlogPublicRevalidationPaths(slug))
        lastAutosaveRevalidationAtRef.current = Date.now()
    }, [])

    const scheduleAutosaveRevalidation = useCallback((slug: string) => {
        const now = Date.now()
        const elapsed = now - lastAutosaveRevalidationAtRef.current
        const remaining = AUTOSAVE_REVALIDATION_THROTTLE_MS - elapsed

        if (remaining <= 0 && pendingAutosaveRevalidationTimerRef.current === null) {
            lastAutosaveRevalidationAtRef.current = now
            void revalidatePublicPathsAfterMutation(getBlogPublicRevalidationPaths(slug)).catch(() => {})
            return
        }

        if (pendingAutosaveRevalidationTimerRef.current !== null) {
            return
        }

        pendingAutosaveRevalidationTimerRef.current = window.setTimeout(() => {
            pendingAutosaveRevalidationTimerRef.current = null
            lastAutosaveRevalidationAtRef.current = Date.now()
            void revalidatePublicPathsAfterMutation(getBlogPublicRevalidationPaths(slug)).catch(() => {})
        }, Math.max(remaining, 0))
    }, [])

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setShowCapabilityHint(window.localStorage.getItem('notionCapabilityHintDismissed') !== 'true')
        }
    }, [])

    useEffect(() => {
        setIsLibraryOpen(false)
        clearPendingAutosaveRevalidation()
        lastAutosaveRevalidationAtRef.current = 0
        const nextTitle = displayText(activeBlog.title, 'Untitled post')
        const nextTags = normalizedTags(activeBlog.tags)
        setTitle(nextTitle)
        setTagsInput(nextTags.join(', '))
        setPublished(activeBlog.published)
        setEditorContent(activeBlog.content.html ?? '')
        setSaveState('idle')
        currentHtmlRef.current = activeBlog.content.html ?? ''
        clearAutosaveTimer()
        lastSavedRef.current = {
            title: nextTitle,
            tags: nextTags,
            published: activeBlog.published,
            html: activeBlog.content.html ?? '',
        }
        skipAutosaveRef.current = true
    }, [activeBlog, clearAutosaveTimer, clearPendingAutosaveRevalidation])

    useEffect(() => {
        return () => {
            clearAutosaveTimer()
            clearPendingAutosaveRevalidation()
        }
    }, [clearAutosaveTimer, clearPendingAutosaveRevalidation])

    const saveDocument = useCallback(async ({
        useDraftMetadata = false,
        revalidateImmediately = false,
        showSuccessToast = false,
    }: {
        useDraftMetadata?: boolean
        revalidateImmediately?: boolean
        showSuccessToast?: boolean
    } = {}) => {
        clearAutosaveTimer()
        const nextTitle = (useDraftMetadata ? title : lastSavedRef.current.title).trim()
        if (!nextTitle) {
            return false
        }

        const nextTags = useDraftMetadata ? normalizeTagsInput(tagsInput) : lastSavedRef.current.tags
        const nextPublished = useDraftMetadata ? published : lastSavedRef.current.published
        const normalizedHtml = normalizeBlogHtmlForSave(currentHtmlRef.current)

        setSaveState('saving')

        const response = await fetchWithCsrf(
            `${getBrowserApiBaseUrl()}/admin/blogs/${encodeURIComponent(activeBlogId ?? activeBlog.id)}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: nextTitle,
                    tags: nextTags,
                    published: nextPublished,
                    contentJson: JSON.stringify({ html: normalizedHtml }),
                }),
            },
        )

        if (!response.ok) {
            const message = await response.text()
            throw new Error(message || 'Save failed')
        }

        lastSavedRef.current = {
            title: nextTitle,
            tags: nextTags,
            published: nextPublished,
            html: normalizedHtml,
        }
        currentHtmlRef.current = normalizedHtml
        if (normalizedHtml !== editorContent) {
            setEditorContent(normalizedHtml)
        }

        if (revalidateImmediately) {
            clearPendingAutosaveRevalidation()
            await runImmediateRevalidation(activeBlog.slug)
        } else {
            scheduleAutosaveRevalidation(activeBlog.slug)
        }

        setSaveState('saved')
        if (showSuccessToast) {
            toast.success('Blog details saved')
        }

        return true
    }, [
        activeBlog.id,
        activeBlogId,
        activeBlog.slug,
        clearAutosaveTimer,
        clearPendingAutosaveRevalidation,
        editorContent,
        published,
        runImmediateRevalidation,
        scheduleAutosaveRevalidation,
        tagsInput,
        title,
    ])

    const handleEditorChange = useCallback((nextHtml: string) => {
        currentHtmlRef.current = nextHtml

        if (nextHtml === lastSavedRef.current.html) {
            clearAutosaveTimer()
            return
        }

        clearAutosaveTimer()
        autosaveTimerRef.current = window.setTimeout(() => {
            void saveDocument().catch((error) => {
                setSaveState('error')
                toast.error(error instanceof Error ? error.message : 'Autosave failed')
            }).finally(() => {
                autosaveTimerRef.current = null
            })
        }, AUTOSAVE_DEBOUNCE_MS)
    }, [clearAutosaveTimer, saveDocument])

    const handleAiApply = useCallback((nextHtml: string) => {
        setEditorContent(nextHtml)
        handleEditorChange(nextHtml)
    }, [handleEditorChange])

    useEffect(() => {
        if (skipAutosaveRef.current) {
            skipAutosaveRef.current = false
        }
    }, [])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') {
                return
            }

            event.preventDefault()
            if (isSavingMeta) {
                return
            }

            setIsSavingMeta(true)
            void saveDocument({
                useDraftMetadata: true,
                revalidateImmediately: true,
                showSuccessToast: true,
            }).catch((error) => {
                setSaveState('error')
                toast.error(error instanceof Error ? error.message : 'Failed to save metadata')
            }).finally(() => {
                setIsSavingMeta(false)
            })
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isSavingMeta, saveDocument])

    const metaDirty = useMemo(() => (
        title.trim() !== lastSavedRef.current.title
        || published !== lastSavedRef.current.published
        || JSON.stringify(normalizeTagsInput(tagsInput)) !== JSON.stringify(lastSavedRef.current.tags)
    ), [published, tagsInput, title])
    const filteredBlogs = useMemo(() => {
        const normalizedQuery = librarySearch.trim().toLowerCase()
        if (!normalizedQuery) {
            return blogs
        }

        return blogs.filter((blog) => displayText(blog.title, 'Untitled post').toLowerCase().includes(normalizedQuery))
    }, [blogs, librarySearch])

    useEffect(() => {
        if (!isLibraryOpen) {
            return
        }

        const frame = window.requestAnimationFrame(() => {
            if (libraryScrollContainerRef.current) {
                if (libraryScrollRef.current > 0) {
                    libraryScrollContainerRef.current.scrollTop = libraryScrollRef.current
                } else {
                    activeLibraryItemRef.current?.scrollIntoView({ block: 'center' })
                }
            }
        })

        return () => {
            window.cancelAnimationFrame(frame)
        }
    }, [filteredBlogs.length, isLibraryOpen])

    async function saveMetadata() {
        setIsSavingMeta(true)

        try {
            await saveDocument({
                useDraftMetadata: true,
                revalidateImmediately: true,
                showSuccessToast: true,
            })
        } catch (error) {
            setSaveState('error')
            toast.error(error instanceof Error ? error.message : 'Failed to save metadata')
        } finally {
            setIsSavingMeta(false)
        }
    }

    return (
        <div className="flex min-h-[calc(100vh-12rem)] flex-col md:-mx-12">
            <div className="mb-4 flex items-center gap-3 rounded-3xl border border-border/80 bg-background px-4 py-3 shadow-sm">
                <Sheet open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
                    <SheetTrigger asChild>
                        <Button data-testid="notion-library-trigger" variant="outline" size="sm" className="gap-2">
                            <FileText size={16} />
                            Library
                        </Button>
                    </SheetTrigger>
                    <SheetContent
                        side="left"
                        className="w-80 p-0 sm:max-w-none"
                        showCloseButton={false}
                    >
                        <div data-testid="notion-library-sheet" className="flex h-full flex-col overflow-hidden bg-background">
                            <SheetTitle className="sr-only">Blog library</SheetTitle>
                            <SheetDescription className="sr-only">Select a blog document to edit in Notion view.</SheetDescription>
                            <div className="border-b border-border/80 px-5 py-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Blog library</p>
                                        <p className="text-xs text-muted-foreground">Select a document and stage posts for future batch actions.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="border-b border-border/80 bg-background/95 p-3 backdrop-blur-sm">
                                <Input
                                    placeholder="Search posts..."
                                    value={librarySearch}
                                    onChange={(event) => setLibrarySearch(event.target.value)}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div
                                ref={libraryScrollContainerRef}
                                className="space-y-2 overflow-y-auto p-3"
                                onScroll={(event) => {
                                    libraryScrollRef.current = event.currentTarget.scrollTop
                                }}
                            >
                                {filteredBlogs.map((blog) => {
                                    const blogId = usableId(blog.id)
                                    const blogTitle = displayText(blog.title, 'Untitled post')
                                    const blogTags = normalizedTags(blog.tags)
                                    const isActive = blogId !== null && blogId === activeBlogId

                                    return (
                                        <div
                                            key={blogId ?? `blog-${blogTitle}`}
                                            ref={isActive ? activeLibraryItemRef : undefined}
                                            className={`rounded-2xl border px-4 py-3 transition ${
                                                isActive
                                                    ? 'border-primary/40 bg-primary/5 shadow-sm'
                                                    : 'border-transparent hover:border-border hover:bg-muted/40'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <Link
                                                        href={blogId ? `/admin/blog/notion?id=${encodeURIComponent(blogId)}` : '/admin/blog/notion'}
                                                        data-testid="notion-blog-list-item"
                                                        className="block min-w-0"
                                                        onClick={() => {
                                                            if (libraryScrollContainerRef.current) {
                                                                libraryScrollRef.current = libraryScrollContainerRef.current.scrollTop
                                                            }
                                                            setIsLibraryOpen(false)
                                                        }}
                                                    >
                                                        <p className="line-clamp-2 text-sm font-medium text-gray-900 underline-offset-4 hover:underline dark:text-gray-100">
                                                            {blogTitle}
                                                        </p>
                                                    </Link>
                                                    <Badge variant="secondary" className={blog.published === true ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'}>
                                                        {blog.published === true ? 'Published' : 'Draft'}
                                                    </Badge>
                                                </div>
                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    Updated {formatTimestamp(blog.updatedAt ?? blog.publishedAt)}
                                                </p>
                                                {blogTags.length ? (
                                                    <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                                                        {blogTags.join(' · ')}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
                <span className="text-sm font-medium text-muted-foreground">
                    {activeBlogTitle}
                </span>
            </div>

            <section data-testid="notion-editor-shell" className="w-full overflow-hidden rounded-3xl border border-border/80 bg-background shadow-sm">
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
                                onClick={() => setShowDocInfo((current) => !current)}
                            >
                                {showDocInfo ? 'Hide Info' : 'Show Info'}
                            </Button>
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
                            <AIFixDialog content={currentHtmlRef.current} onApply={handleAiApply} />
                            <Link href={activeBlogId ? `/admin/blog/${activeBlogId}` : '/admin/blog'}>
                                <Button variant="outline">Open full editor</Button>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className={`grid gap-6 px-6 py-6 ${showDocInfo ? 'xl:grid-cols-[minmax(0,1fr)_260px]' : ''}`}>
                    <div data-testid="notion-editor-area" className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="notion-blog-title">Title</Label>
                                <Input
                                    id="notion-blog-title"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notion-blog-tags">Tags</Label>
                                <Input
                                    id="notion-blog-tags"
                                    value={tagsInput}
                                    onChange={(event) => setTagsInput(event.target.value)}
                                    placeholder="react, portfolio, notes"
                                />
                            </div>
                            <div className="flex items-end">
                                <div className="flex items-center space-x-2 rounded-2xl border border-border/80 px-4 py-3">
                                    <Checkbox
                                        id="notion-blog-published"
                                        checked={published}
                                        onCheckedChange={(value) => setPublished(Boolean(value))}
                                    />
                                    <Label htmlFor="notion-blog-published" className="cursor-pointer">Published</Label>
                                </div>
                            </div>
                        </div>

                        {showCapabilityHint && (
                            <div
                                data-testid="tiptap-capability-hint"
                                className="flex items-start gap-2 rounded-2xl border border-dashed border-sky-300 bg-sky-50/70 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/20 dark:text-sky-100"
                            >
                                <span className="flex-1">
                                    Reuse the existing Tiptap stack here: Type <span className="font-medium">/</span> for commands, insert <span className="font-medium">code blocks</span> for snippets, drag/drop or paste images directly into the canvas, and keep HTML / 3D blocks available through the existing toolbar controls.
                                </span>
                                <button
                                    type="button"
                                    aria-label="Close hint"
                                    className="rounded p-0.5 transition hover:bg-sky-100/80 dark:hover:bg-sky-900/50"
                                    onClick={() => {
                                        setShowCapabilityHint(false)
                                        if (typeof window !== 'undefined') {
                                            window.localStorage.setItem('notionCapabilityHintDismissed', 'true')
                                        }
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        <TiptapEditor
                            content={editorContent}
                            onChange={handleEditorChange}
                            placeholder="Start writing. Content autosaves here while metadata stays explicit."
                        />
                    </div>

                    {showDocInfo && (
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
                            onClick={() => void saveMetadata()}
                            disabled={isSavingMeta || !metaDirty || !title.trim()}
                            className="w-full"
                        >
                            {isSavingMeta ? 'Saving post settings...' : 'Save Post Settings'}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Members list stays out of this modernization pass for now; this view is intentionally blog-first and content-first.
                        </p>
                    </aside>
                    )}
                </div>
            </section>
        </div>
    )
}
