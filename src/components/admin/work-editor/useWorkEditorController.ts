import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { revalidatePublicPathsAfterMutation } from '@/lib/public-revalidation-client'
import { getWorkPublicRevalidationPaths } from '@/lib/public-revalidation-paths'
import type { WorkVideo } from '@/lib/api/works'
import { extractWorkVideoEmbedIds } from '@/lib/content/work-video-embeds'
import {
    buildYouTubeThumbnailUrl,
    resolveDraftThumbnailSource,
    resolveWorkThumbnailSource,
    type WorkThumbnailSourceKind,
} from '@/lib/content/work-thumbnail-resolution'
import type {
    VideoDraft,
    VideoInsertRequest,
    WorkEditorTab,
    WorkEditorProps,
    WorkSaveResponsePayload,
} from '@/components/admin/work-editor/types'
import {
    buildWorkSnapshot,
    getResponseError,
    inferThumbnailSourceKind,
    isPublicInlineCreateMode,
    normalizeJsonInput,
    normalizeTagsInput,
    resolveWorkSaveSlug,
    validateFlexibleMetadata,
} from '@/components/admin/work-editor/utils'
import {
    buildInlineDetailQuerySuffix,
    clearBeforeUnloadWarning,
    resolveReturnTo,
} from '@/components/admin/work-editor/navigation'
import {
    buildMetadataJsonFromFields,
    buildMetadataJsonFromRecord,
    createMetadataField,
    createMetadataFields,
    readSocialShareMessage,
    type MetadataField,
} from '@/components/admin/work-editor/metadata'
import { useVideoUploadStatus } from '@/components/admin/work-editor/useVideoUploadStatus'
import {
    readWorkSaveResponsePayload,
    saveWorkPayload,
    type WorkMutationPayload,
} from '@/components/admin/work-editor/workEditorApi'
import { createWorkMediaHandlers } from '@/components/admin/work-editor/workMediaHandlers'
import { createWorkVideoHandlers } from '@/components/admin/work-editor/workVideoHandlers'
import { sanitizeAdminSaveError, sanitizeAdminUploadError } from '@/lib/admin-save-error'
import { toast } from 'sonner'

const DEFAULT_WORK_CATEGORY = 'Uncategorized'

export function useWorkEditorController({ initialWork, inlineMode = false, onSaved }: WorkEditorProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const isEditing = Boolean(initialWork?.id)
    const defaultPublished = initialWork?.published ?? true
    const requestedReturnTo = searchParams.get('returnTo')
    const returnTo = resolveReturnTo(requestedReturnTo)

    const [title, setTitle] = useState(initialWork?.title || '')
    const [category, setCategory] = useState(initialWork?.category || DEFAULT_WORK_CATEGORY)
    const [period, setPeriod] = useState(initialWork?.period || '')
    const [tags, setTags] = useState(initialWork?.tags?.join(', ') || '')
    const [published, setPublished] = useState(defaultPublished)
    const [html, setHtml] = useState(initialWork?.content?.html || '')
    const initialSocialShareMessage = readSocialShareMessage(initialWork?.all_properties)
    const [socialShareMessage, setSocialShareMessage] = useState(initialSocialShareMessage)
    const [metadataFields, setMetadataFields] = useState<MetadataField[]>(() => createMetadataFields(initialWork?.all_properties))
    const [thumbnailAssetId, setThumbnailAssetId] = useState(initialWork?.thumbnail_asset_id || '')
    const [thumbnailUrl, setThumbnailUrl] = useState(initialWork?.thumbnail_url || '')
    const [iconAssetId, setIconAssetId] = useState(initialWork?.icon_asset_id || '')
    const [iconUrl, setIconUrl] = useState(initialWork?.icon_url || '')
    const [thumbnailSourceKind, setThumbnailSourceKind] = useState<WorkThumbnailSourceKind>(() => inferThumbnailSourceKind(initialWork))
    const [videosVersion, setVideosVersion] = useState(initialWork?.videos_version || 0)
    const [videos, setVideos] = useState<WorkVideo[]>(initialWork?.videos || [])
    const [stagedVideos, setStagedVideos] = useState<VideoDraft[]>([])
    const [youtubeUrlInput, setYoutubeUrlInput] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
    const [uploadingTarget, setUploadingTarget] = useState<'thumbnail' | 'icon' | null>(null)
    const [isVideoBusy, setIsVideoBusy] = useState(false)
    const { videoUploadStatus, setVideoUploadStatus, setVideoUploadPhase } = useVideoUploadStatus()
    const [hasPersistedVideoChanges, setHasPersistedVideoChanges] = useState(false)
    const [isAutoGeneratingThumbnail, setIsAutoGeneratingThumbnail] = useState(false)
    const [insertVideoRequest, setInsertVideoRequest] = useState<VideoInsertRequest | null>(null)
    const [activeTab, setActiveTab] = useState<WorkEditorTab>('content')
    const shouldContinueInlinePlacement = searchParams.get('videoInline') === '1'
    const generalSectionRef = useRef<HTMLDivElement | null>(null)
    const mediaSectionRef = useRef<HTMLDivElement | null>(null)
    const contentSectionRef = useRef<HTMLDivElement | null>(null)
    const saveWorkRef = useRef<(mode: 'default' | 'with-videos') => Promise<void>>(async () => {})
    const insertVideoNonceRef = useRef(0)
    const usesPublicInlineCreateFlow = isPublicInlineCreateMode({
        inlineMode,
        isEditing,
        hasOnSaved: Boolean(onSaved),
    })
    const embeddedVideoIds = useMemo(() => extractWorkVideoEmbedIds(html), [html])
    const embeddedVideoIdSet = useMemo(() => new Set(embeddedVideoIds), [embeddedVideoIds])
    const orphanEmbeddedVideoIds = useMemo(
        () => embeddedVideoIds.filter((videoId, index) => embeddedVideoIds.indexOf(videoId) === index && !videos.some((video) => video.id === videoId)),
        [embeddedVideoIds, videos],
    )
    const resolvedThumbnailSource = useMemo(
        () => resolveWorkThumbnailSource({ thumbnailAssetId, videos, html }),
        [thumbnailAssetId, videos, html],
    )
    const effectiveThumbnailPreviewUrl = useMemo(() => {
        if (thumbnailUrl) {
            return thumbnailUrl
        }

        if (resolvedThumbnailSource.kind === 'youtube' && resolvedThumbnailSource.video) {
            return buildYouTubeThumbnailUrl(resolvedThumbnailSource.video.sourceKey)
        }

        if (resolvedThumbnailSource.kind === 'content-image') {
            return resolvedThumbnailSource.imageUrl ?? ''
        }

        return ''
    }, [resolvedThumbnailSource, thumbnailUrl])
    const allProperties = useMemo(
        () => buildMetadataJsonFromFields(metadataFields, socialShareMessage),
        [metadataFields, socialShareMessage],
    )
    const initialAllProperties = buildMetadataJsonFromRecord(initialWork?.all_properties, initialSocialShareMessage)

    const initialSnapshot = buildWorkSnapshot({
        title: initialWork?.title || '',
        category: initialWork?.category || DEFAULT_WORK_CATEGORY,
        period: initialWork?.period || '',
        tags: initialWork?.tags?.join(', ') || '',
        published: defaultPublished,
        html: initialWork?.content?.html || '',
        allProperties: initialAllProperties,
        thumbnailAssetId: initialWork?.thumbnail_asset_id || '',
        iconAssetId: initialWork?.icon_asset_id || '',
    })
    const [savedSnapshot, setSavedSnapshot] = useState(initialSnapshot)
    const currentSnapshot = buildWorkSnapshot({
        title,
        category,
        period,
        tags,
        published,
        html,
        allProperties,
        thumbnailAssetId,
        iconAssetId,
    })
    const hasStagedVideos = stagedVideos.length > 0
    const hasUnsavedChanges = savedSnapshot !== currentSnapshot || (!isEditing && hasStagedVideos)
    const isDirty = hasUnsavedChanges
    const currentQuerySuffix = buildInlineDetailQuerySuffix(searchParams)
    const primarySaveMode: 'default' | 'with-videos' = !isEditing && hasStagedVideos ? 'with-videos' : 'default'

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return 'Not yet'
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    useEffect(() => {
        setSavedSnapshot(initialSnapshot)
    }, [initialSnapshot])

    function navigateInlineWorkAfterSave(nextSlug: string | null, editing: boolean) {
        if (!inlineMode) {
            return false
        }

        if (!editing && pathname === '/works') {
            return false
        }

        if (editing && pathname.startsWith('/works/')) {
            if (requestedReturnTo && returnTo !== '/admin/works') {
                router.push(returnTo)
                return true
            }

            if (nextSlug) {
                router.replace(`/works/${encodeURIComponent(nextSlug)}${currentQuerySuffix}`)
                router.refresh()
            } else {
                router.refresh()
            }
            return true
        }

        return false
    }

    function refreshInlinePublicWorkIfNeeded() {
        if (!inlineMode || !pathname.startsWith('/works/')) {
            return
        }

        router.refresh()
    }

    function buildWorkMutationPayload(nextThumbnailAssetId: string = thumbnailAssetId, nextIconAssetId: string = iconAssetId) {
        const normalizedTags = normalizeTagsInput(tags)

        return {
            title,
            category: category.trim() || DEFAULT_WORK_CATEGORY,
            period,
            tags: normalizedTags,
            published,
            contentJson: JSON.stringify({ html }),
            allPropertiesJson: normalizeJsonInput(allProperties),
            thumbnailAssetId: nextThumbnailAssetId || null,
            iconAssetId: nextIconAssetId || null,
        }
    }

    function scrollToTab(tab: WorkEditorTab) {
        const nextSection = tab === 'general'
            ? generalSectionRef.current
            : tab === 'media'
                ? mediaSectionRef.current
                : contentSectionRef.current

        setActiveTab(tab)
        nextSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    function addMetadataField() {
        setMetadataFields((current) => [...current, createMetadataField()])
    }

    function updateMetadataField(fieldId: string, nextField: Partial<Pick<MetadataField, 'key' | 'value'>>) {
        setMetadataFields((current) => current.map((field) => (
            field.id === fieldId
                ? { ...field, ...nextField }
                : field
        )))
    }

    function removeMetadataField(fieldId: string) {
        setMetadataFields((current) => current.filter((field) => field.id !== fieldId))
    }

    const {
        applyThumbnailSelection,
        maybeApplyAutoThumbnailForCandidate,
        persistThumbnailSelectionForWork,
        persistThumbnailSelectionAndRevalidate,
        uploadWorkImage,
        removeWorkImage,
    } = createWorkMediaHandlers({
        initialWork,
        title,
        videos,
        html,
        thumbnailSourceKind,
        buildWorkMutationPayload,
        setThumbnailAssetId,
        setThumbnailUrl,
        setIconAssetId,
        setIconUrl,
        setThumbnailSourceKind,
        setUploadingTarget,
        setIsAutoGeneratingThumbnail,
    })

    const {
        syncVideos,
        addYouTubeDraft,
        handleStageHlsVideoFile,
        moveStagedVideo,
        reorderStagedVideoToIndex,
        removeStagedVideo,
        removeSavedVideo,
        reorderSavedVideo,
        reorderSavedVideoToIndex,
        processStagedVideos,
        insertSavedVideoIntoBody,
        removeSavedVideoFromBody,
        handleVideoInsertHandled,
    } = createWorkVideoHandlers({
        initialWork,
        isEditing,
        videos,
        videosVersion,
        stagedVideos,
        youtubeUrlInput,
        embeddedVideoIdSet,
        setVideosVersion,
        setVideos,
        setStagedVideos,
        setYoutubeUrlInput,
        setIsVideoBusy,
        setHasPersistedVideoChanges,
        setInsertVideoRequest,
        setHtml,
        setVideoUploadStatus,
        setVideoUploadPhase,
        insertVideoNonceRef,
        refreshInlinePublicWorkIfNeeded,
        maybeApplyAutoThumbnailForCandidate,
        persistThumbnailSelectionAndRevalidate,
        applyThumbnailSelection,
    })

    async function submitWorkPayload(payload: WorkMutationPayload) {
        const response = await saveWorkPayload({
            isEditing,
            workId: initialWork?.id,
            payload,
        })

        if (!response.ok) {
            const message = sanitizeAdminSaveError(
                await getResponseError(response, 'Failed to save work.'),
                'Work could not be saved. Please retry after the backend is healthy.',
            )
            setSaveError(message)
            toast.error(message)
            return null
        }

        setSaveError(null)
        return await readWorkSaveResponsePayload(response)
    }

    function finishInlineSave(responsePayload: WorkSaveResponsePayload | null, nextSlug: string | null, editing: boolean) {
        if (!inlineMode) {
            return false
        }

        if (!editing && usesPublicInlineCreateFlow && onSaved) {
            onSaved({ id: responsePayload?.id, slug: nextSlug, isEditing: false })
            return true
        }

        if (navigateInlineWorkAfterSave(nextSlug, editing)) {
            onSaved?.({ id: responsePayload?.id, slug: nextSlug, isEditing: editing })
            return true
        }

        if (onSaved) {
            onSaved({ id: responsePayload?.id, slug: nextSlug, isEditing: editing })
            return true
        }

        router.refresh()
        return true
    }

    function finishUpdateSave(responsePayload: WorkSaveResponsePayload | null, nextSlug: string | null) {
        setHasPersistedVideoChanges(false)
        setSavedSnapshot(currentSnapshot)
        clearBeforeUnloadWarning()
        setSaveError(null)
        toast.success('Work updated successfully')
        if (finishInlineSave(responsePayload, nextSlug, true)) {
            return
        }

        router.push(returnTo)
    }

    function finishCreateSave(responsePayload: WorkSaveResponsePayload | null, nextSlug: string | null) {
        setSavedSnapshot(currentSnapshot)
        clearBeforeUnloadWarning()
        setSaveError(null)
        toast.success('Work created successfully')
        if (finishInlineSave(responsePayload, nextSlug, false)) {
            return
        }

        router.push(returnTo)
    }

    async function handleCreatedWorkWithVideos(responsePayload: WorkSaveResponsePayload, nextSlug: string | null) {
        if (!responsePayload.id) {
            finishCreateSave(responsePayload, nextSlug)
            return
        }

        try {
            const stagedResult = await processStagedVideos(responsePayload.id)
            if (stagedResult.latestPayload) {
                syncVideos(stagedResult.latestPayload)
            }

            const stagedThumbnailCandidate = resolveDraftThumbnailSource(stagedVideos)
            if (stagedThumbnailCandidate.kind !== 'none') {
                try {
                    const uploadedThumbnail = await maybeApplyAutoThumbnailForCandidate(stagedThumbnailCandidate)
                    if (uploadedThumbnail) {
                        await persistThumbnailSelectionForWork(responsePayload.id, uploadedThumbnail.id)
                    }
                } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Failed to auto-generate a work thumbnail.')
                }
            }

            toast.success('Work and videos created successfully')
            await revalidatePublicPathsAfterMutation(getWorkPublicRevalidationPaths(nextSlug, initialWork?.slug))
            if (finishInlineSave(responsePayload, nextSlug, false)) {
                return
            }

            router.push(`/admin/works/${responsePayload.id}?videoInline=1`)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Work was created, but some videos failed to attach.'
            toast.error(sanitizeAdminUploadError(message, 'Work was created, but some videos could not be uploaded. Please retry after storage is healthy.'))
            router.push(`/admin/works/${responsePayload.id}`)
        }
    }

    async function saveWork(mode: 'default' | 'with-videos' = 'default') {
        try {
            validateFlexibleMetadata(allProperties)
        } catch {
            setSaveError('Invalid JSON in Flexible Metadata field')
            toast.error('Invalid JSON in Flexible Metadata field')
            return
        }

        setIsSaving(true)
        setSaveError(null)

        try {
            if (isEditing && !isDirty && hasPersistedVideoChanges) {
                const nextSlug = initialWork?.slug ?? resolveWorkSaveSlug({
                    payload: null,
                    title,
                    initialSlug: initialWork?.slug,
                })
                await revalidatePublicPathsAfterMutation(getWorkPublicRevalidationPaths(nextSlug, initialWork?.slug))
                finishUpdateSave(null, nextSlug)
                return
            }

            const responsePayload = await submitWorkPayload(buildWorkMutationPayload())
            if (!responsePayload) {
                return
            }

            const nextSlug = resolveWorkSaveSlug({
                payload: responsePayload,
                title,
                initialSlug: initialWork?.slug,
            })

            if (isEditing) {
                await revalidatePublicPathsAfterMutation(getWorkPublicRevalidationPaths(nextSlug, initialWork?.slug))
                finishUpdateSave(responsePayload, nextSlug)
                return
            }

            if (mode === 'with-videos' && stagedVideos.length > 0) {
                await handleCreatedWorkWithVideos(responsePayload, nextSlug)
                return
            }

            await revalidatePublicPathsAfterMutation(getWorkPublicRevalidationPaths(nextSlug, initialWork?.slug))
            finishCreateSave(responsePayload, nextSlug)
        } finally {
            setIsSaving(false)
        }
    }

    saveWorkRef.current = saveWork

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isSaveShortcut = (event.metaKey || event.ctrlKey)
                && (event.key.toLowerCase() === 's' || event.code === 'KeyS')

            if (!isSaveShortcut || event.defaultPrevented) {
                return
            }

            event.preventDefault()

            const saveDisabled = isEditing
                ? isSaving || (!isDirty && !hasPersistedVideoChanges) || !title.trim()
                : isSaving || !isDirty || !title.trim()

            if (saveDisabled) {
                return
            }

            void saveWorkRef.current(primarySaveMode)
        }

        window.addEventListener('keydown', handleKeyDown, { capture: true })
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true })
        }
    }, [hasPersistedVideoChanges, isDirty, isEditing, isSaving, primarySaveMode, title])

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

    return {
        generalSectionProps: {
            sectionRef: generalSectionRef,
            active: activeTab === 'general',
            initialWork,
            isEditing,
            defaultCategory: DEFAULT_WORK_CATEGORY,
            title,
            category,
            period,
            tags,
            socialShareMessage,
            published,
            formatDate,
            onTitleChange: (value: string) => {
                setTitle(value)
                setSaveError(null)
            },
            onCategoryChange: (value: string) => {
                setCategory(value)
                setSaveError(null)
            },
            onPeriodChange: (value: string) => {
                setPeriod(value)
                setSaveError(null)
            },
            onTagsChange: (value: string) => {
                setTags(value)
                setSaveError(null)
            },
            onSocialShareMessageChange: (value: string) => {
                setSocialShareMessage(value)
                setSaveError(null)
            },
            onPublishedChange: (value: boolean) => {
                setPublished(value)
                setSaveError(null)
            },
        },
        tabsProps: {
            activeTab,
            onSelectTab: scrollToTab,
        },
        mediaSectionProps: {
            sectionRef: mediaSectionRef,
            active: activeTab === 'media',
            metadataFields,
            effectiveThumbnailPreviewUrl,
            thumbnailSourceKind,
            thumbnailAssetId,
            iconUrl,
            uploadingTarget,
            isAutoGeneratingThumbnail,
            isEditing,
            usesPublicInlineCreateFlow,
            youtubeUrlInput,
            stagedVideos,
            videos,
            videosVersion,
            isVideoBusy,
            videoUploadStatus,
            embeddedVideoIdSet,
            orphanEmbeddedVideoIds,
            onAddMetadataField: addMetadataField,
            onUpdateMetadataField: updateMetadataField,
            onRemoveMetadataField: removeMetadataField,
            onUploadWorkImage: (event: ChangeEvent<HTMLInputElement>, target: 'thumbnail' | 'icon') => {
                void uploadWorkImage(event, target)
            },
            onRemoveWorkImage: (target: 'thumbnail' | 'icon') => {
                void removeWorkImage(target)
            },
            onYoutubeUrlInputChange: setYoutubeUrlInput,
            onAddYouTubeDraft: addYouTubeDraft,
            onStageHlsVideoFile: handleStageHlsVideoFile,
            onMoveStagedVideo: moveStagedVideo,
            onReorderStagedVideoToIndex: reorderStagedVideoToIndex,
            onRemoveStagedVideo: removeStagedVideo,
            onInsertSavedVideoIntoBody: insertSavedVideoIntoBody,
            onRemoveSavedVideoFromBody: removeSavedVideoFromBody,
            onRemoveSavedVideo: (videoId: string) => {
                void removeSavedVideo(videoId)
            },
            onReorderSavedVideo: (videoId: string, direction: -1 | 1) => {
                void reorderSavedVideo(videoId, direction)
            },
            onReorderSavedVideoToIndex: (videoId: string, targetIndex: number) => {
                void reorderSavedVideoToIndex(videoId, targetIndex)
            },
        },
        contentSectionProps: {
            sectionRef: contentSectionRef,
            active: activeTab === 'content',
            html,
            title,
            videos,
            isEditing,
            shouldContinueInlinePlacement,
            insertVideoRequest,
            orphanEmbeddedVideoIds,
            onHtmlChange: (nextHtml: string) => {
                setHtml(nextHtml)
                setSaveError(null)
            },
            onVideoInsertHandled: handleVideoInsertHandled,
        },
        saveBarProps: {
            saveError,
            inlineMode,
            isEditing,
            isSaving,
            isDirty,
            hasPersistedVideoChanges,
            hasStagedVideos,
            title,
            onCancel: () => {
                if (hasUnsavedChanges) {
                    setShowUnsavedDialog(true)
                    return
                }
                router.push(returnTo)
            },
            onSave: () => {
                void saveWork(primarySaveMode)
            },
        },
        unsavedDialogProps: {
            open: showUnsavedDialog,
            onOpenChange: setShowUnsavedDialog,
            onDiscard: () => {
                clearBeforeUnloadWarning()
                setShowUnsavedDialog(false)
                router.push(returnTo)
            },
        },
    }
}
