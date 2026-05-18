"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TiptapEditor } from '@/components/admin/TiptapEditor'
import { CapabilityHint } from '@/components/admin/blog-notion-workspace/CapabilityHint'
import { DocumentInfoSidebar } from '@/components/admin/blog-notion-workspace/DocumentInfoSidebar'
import { LibrarySheet } from '@/components/admin/blog-notion-workspace/LibrarySheet'
import { MetadataForm } from '@/components/admin/blog-notion-workspace/MetadataForm'
import { WorkspaceHeader } from '@/components/admin/blog-notion-workspace/WorkspaceHeader'
import type { BlogWorkspaceListItem, BlogWorkspaceRecord, SaveState } from '@/components/admin/blog-notion-workspace/types'
import { displayText, normalizeTagsInput, normalizedTags, usableId } from '@/components/admin/blog-notion-workspace/utils'
import { fetchWithCsrf } from '@/lib/api/auth'
import { getBrowserApiBaseUrl } from '@/lib/api/browser'
import { normalizeBlogHtmlForSave } from '@/lib/content/blog-content'
import { revalidatePublicPathsAfterMutation } from '@/lib/public-revalidation-client'
import { getBlogPublicRevalidationPaths } from '@/lib/public-revalidation-paths'
import { toast } from 'sonner'

interface BlogNotionWorkspaceProps {
    blogs: BlogWorkspaceListItem[]
    activeBlog: BlogWorkspaceRecord
}

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

    const dismissCapabilityHint = useCallback(() => {
        setShowCapabilityHint(false)
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('notionCapabilityHintDismissed', 'true')
        }
    }, [])

    const handleLibraryScrollPositionChange = useCallback((scrollTop: number) => {
        libraryScrollRef.current = scrollTop
    }, [])

    const handleLibraryBlogSelect = useCallback(() => {
        if (libraryScrollContainerRef.current) {
            libraryScrollRef.current = libraryScrollContainerRef.current.scrollTop
        }
        setIsLibraryOpen(false)
    }, [])

    const toggleDocInfo = useCallback(() => {
        setShowDocInfo((current) => !current)
    }, [])

    return (
        <div className="flex min-h-[calc(100vh-12rem)] flex-col md:-mx-12">
            <div className="mb-4 flex items-center gap-3 rounded-3xl border border-border/80 bg-background px-4 py-3 shadow-sm">
                <LibrarySheet
                    activeBlogId={activeBlogId}
                    activeItemRef={activeLibraryItemRef}
                    filteredBlogs={filteredBlogs}
                    isOpen={isLibraryOpen}
                    onOpenChange={setIsLibraryOpen}
                    onScrollPositionChange={handleLibraryScrollPositionChange}
                    onSearchChange={setLibrarySearch}
                    onSelectBlog={handleLibraryBlogSelect}
                    scrollContainerRef={libraryScrollContainerRef}
                    search={librarySearch}
                />
                <span className="text-sm font-medium text-muted-foreground">
                    {activeBlogTitle}
                </span>
            </div>

            <section data-testid="notion-editor-shell" className="w-full overflow-hidden rounded-3xl border border-border/80 bg-background shadow-sm">
                <WorkspaceHeader
                    activeBlogId={activeBlogId}
                    contentHtml={currentHtmlRef.current}
                    onAiApply={handleAiApply}
                    onToggleDocInfo={toggleDocInfo}
                    saveState={saveState}
                    showDocInfo={showDocInfo}
                />

                <div className={`grid gap-6 px-6 py-6 ${showDocInfo ? 'xl:grid-cols-[minmax(0,1fr)_260px]' : ''}`}>
                    <div data-testid="notion-editor-area" className="space-y-5">
                        <MetadataForm
                            onPublishedChange={setPublished}
                            onTagsInputChange={setTagsInput}
                            onTitleChange={setTitle}
                            published={published}
                            tagsInput={tagsInput}
                            title={title}
                        />

                        {showCapabilityHint && (
                            <CapabilityHint onDismiss={dismissCapabilityHint} />
                        )}

                        <TiptapEditor
                            content={editorContent}
                            onChange={handleEditorChange}
                            placeholder="Start writing. Content autosaves here while metadata stays explicit."
                        />
                    </div>

                    {showDocInfo && (
                        <DocumentInfoSidebar
                            activeBlog={activeBlog}
                            isSavingMeta={isSavingMeta}
                            metaDirty={metaDirty}
                            onSaveMetadata={saveMetadata}
                            title={title}
                        />
                    )}
                </div>
            </section>
        </div>
    )
}
