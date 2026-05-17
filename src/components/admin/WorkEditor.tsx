"use client"

import Image from 'next/image'
import { AlertTriangle, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AIFixDialog } from '@/components/admin/AIFixDialog'
import { TiptapEditor } from '@/components/admin/TiptapEditor'
import { WorkVideoPlayer } from '@/components/content/WorkVideoPlayer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { fetchWithCsrf } from '@/lib/api/auth'
import { getBrowserApiBaseUrl } from '@/lib/api/browser'
import { revalidatePublicPathsAfterMutation } from '@/lib/public-revalidation-client'
import { getWorkPublicRevalidationPaths } from '@/lib/public-revalidation-paths'
import { isAcceptedImageFile, isAcceptedMp4VideoFile } from '@/lib/file-validation'
import type { WorkVideo } from '@/lib/api/works'
import { extractVideoFrameThumbnailBlob, fetchRemoteImageBlob } from '@/lib/content/work-auto-thumbnail'
import {
    extractWorkVideoEmbedIds,
    getWorkVideoDisplayLabel,
    removeWorkVideoEmbedReferences,
} from '@/lib/content/work-video-embeds'
import {
    buildYouTubeThumbnailUrl,
    normalizeYouTubeVideoId,
    resolveDraftThumbnailSource,
    resolveWorkThumbnailSource,
    shouldReplaceWorkThumbnailSource,
    type WorkThumbnailSourceKind,
} from '@/lib/content/work-thumbnail-resolution'
import type {
    ThumbnailCandidate,
    StagedVideoResult,
    UploadedAssetPayload,
    UploadTargetPayload,
    VideoDraft,
    VideoInsertRequest,
    VideoMutationPayload,
    WorkEditorProps,
    WorkSaveResponsePayload,
} from '@/components/admin/work-editor/types'
import {
    buildWorkSnapshot,
    createClientId,
    getNextVideosVersion,
    getResponseError,
    inferThumbnailSourceKind,
    isPublicInlineCreateMode,
    normalizeJsonInput,
    normalizeTagsInput,
    resolveWorkSaveSlug,
    validateFlexibleMetadata,
} from '@/components/admin/work-editor/utils'
import { cn } from '@/lib/utils'
import { sanitizeAdminSaveError, sanitizeAdminUploadError } from '@/lib/admin-save-error'
import { toast } from 'sonner'

const DEFAULT_WORK_CATEGORY = 'Uncategorized'

type WorkEditorTab = 'general' | 'media' | 'content'
type VideoUploadPhase = 'uploading' | 'processing' | 'complete'
type MetadataField = {
    id: string
    key: string
    value: string
}
const SOCIAL_SHARE_MESSAGE_KEY = 'socialShareMessage'

function createMetadataField(key = '', value = ''): MetadataField {
    return {
        id: createClientId(),
        key,
        value,
    }
}

function stringifyMetadataValue(value: unknown) {
    if (typeof value === 'string') {
        return value
    }

    if (value == null) {
        return ''
    }

    if (typeof value === 'object') {
        try {
            return JSON.stringify(value)
        } catch {
            return String(value)
        }
    }

    return String(value)
}

function readSocialShareMessage(record?: Record<string, unknown> | null) {
    const value = record?.[SOCIAL_SHARE_MESSAGE_KEY]
    return typeof value === 'string' ? value : ''
}

function createMetadataFields(record?: Record<string, unknown> | null) {
    return Object.entries(record ?? {})
        .filter(([key]) => key !== SOCIAL_SHARE_MESSAGE_KEY)
        .map(([key, value]) => createMetadataField(key, stringifyMetadataValue(value)))
}

function buildMetadataJsonFromRecord(record?: Record<string, unknown> | null, socialShareMessage?: string) {
    const normalized = Object.fromEntries(
        Object.entries(record ?? {})
            .filter(([key]) => key !== SOCIAL_SHARE_MESSAGE_KEY)
            .map(([key, value]) => [key, stringifyMetadataValue(value)]),
    ) as Record<string, string>
    const normalizedShareMessage = socialShareMessage?.trim() ?? ''
    if (normalizedShareMessage) {
        normalized[SOCIAL_SHARE_MESSAGE_KEY] = normalizedShareMessage
    }

    return JSON.stringify(normalized)
}

function buildMetadataJsonFromFields(fields: MetadataField[], socialShareMessage: string) {
    const normalized = fields.reduce<Record<string, string>>((accumulator, field) => {
        const key = field.key.trim()
        if (!key || key === SOCIAL_SHARE_MESSAGE_KEY) {
            return accumulator
        }

        accumulator[key] = field.value
        return accumulator
    }, {})
    const normalizedShareMessage = socialShareMessage.trim()
    if (normalizedShareMessage) {
        normalized[SOCIAL_SHARE_MESSAGE_KEY] = normalizedShareMessage
    }

    return JSON.stringify(normalized)
}

function clearBeforeUnloadWarning() {
    if (typeof window !== 'undefined') {
        window.onbeforeunload = null
    }
}

function resolveReturnTo(requestedReturnTo: string | null, fallback = '/admin/works') {
    if (!requestedReturnTo) {
        return fallback
    }

    if (!requestedReturnTo.startsWith('/') || requestedReturnTo.startsWith('//')) {
        return fallback
    }

    return requestedReturnTo
}

function buildInlineDetailQuerySuffix(searchParams: URLSearchParams) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('returnTo')
    const nextQuery = nextParams.toString()
    return nextQuery ? `?${nextQuery}` : ''
}

export function WorkEditor({ initialWork, inlineMode = false, onSaved }: WorkEditorProps) {
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
    const [videoUploadStatus, setVideoUploadStatus] = useState<{ phase: VideoUploadPhase; message: string } | null>(null)
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
    const videoUploadStatusTimeoutRef = useRef<number | null>(null)

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

    function clearVideoUploadStatusTimeout() {
        if (videoUploadStatusTimeoutRef.current !== null) {
            window.clearTimeout(videoUploadStatusTimeoutRef.current)
            videoUploadStatusTimeoutRef.current = null
        }
    }

    function setVideoUploadPhase(phase: VideoUploadPhase, fileLabel?: string) {
        clearVideoUploadStatusTimeout()

        const message = phase === 'uploading'
            ? `${fileLabel ?? '영상'} 업로드 중...`
            : phase === 'processing'
                ? `${fileLabel ?? '영상'} 처리 중...`
                : `${fileLabel ?? '영상'} 준비 완료`

        setVideoUploadStatus({ phase, message })

        if (phase === 'complete') {
            videoUploadStatusTimeoutRef.current = window.setTimeout(() => {
                setVideoUploadStatus(null)
                videoUploadStatusTimeoutRef.current = null
            }, 2400)
        }
    }

    useEffect(() => {
        setSavedSnapshot(initialSnapshot)
    }, [initialSnapshot])

    useEffect(() => {
        return () => {
            clearVideoUploadStatusTimeout()
        }
    }, [])

    const syncVideos = (payload: VideoMutationPayload) => {
        const nextVersion = getNextVideosVersion(payload, videosVersion)
        const nextVideos = Array.isArray(payload.videos) ? payload.videos : videos

        setVideosVersion(nextVersion)
        setVideos(nextVideos)
    }

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

    async function uploadAssetFile(file: File, bucket: string) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bucket', bucket)

        const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/uploads`, {
            method: 'POST',
            body: formData,
        })

        const payload = await response.json() as UploadedAssetPayload & { error?: string }
        if (!response.ok) {
            throw new Error(payload.error || 'Upload failed')
        }

        return payload
    }

    async function uploadGeneratedThumbnail(blob: Blob, fileName: string) {
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' })
        return await uploadAssetFile(file, 'work-thumbnails')
    }

    function applyThumbnailSelection(asset: UploadedAssetPayload, sourceKind: WorkThumbnailSourceKind) {
        setThumbnailAssetId(asset.id)
        setThumbnailUrl(asset.url)
        setThumbnailSourceKind(sourceKind)
    }

    async function tryAutoGenerateThumbnailFromUploadedVideo(file: File, applySelection = true) {
        const thumbnailBlob = await extractVideoFrameThumbnailBlob(file)
        const uploadedThumbnail = await uploadGeneratedThumbnail(
            thumbnailBlob,
            `${file.name.replace(/\.[^.]+$/, '') || 'video'}-thumbnail.jpg`,
        )
        if (applySelection) {
            applyThumbnailSelection(uploadedThumbnail, 'uploaded-video')
        }
        return uploadedThumbnail
    }

    async function tryAutoGenerateThumbnailFromYouTube(videoId: string, applySelection = true) {
        const thumbnailBlob = await fetchRemoteImageBlob(buildYouTubeThumbnailUrl(videoId))
        const uploadedThumbnail = await uploadGeneratedThumbnail(thumbnailBlob, `${videoId}-thumbnail.jpg`)
        if (applySelection) {
            applyThumbnailSelection(uploadedThumbnail, 'youtube')
        }
        return uploadedThumbnail
    }

    async function tryAutoGenerateThumbnailFromSavedVideo(video: WorkVideo) {
        if (video.sourceType === 'youtube') {
            return await tryAutoGenerateThumbnailFromYouTube(video.sourceKey)
        }

        if (!video.playbackUrl || video.playbackUrl.toLowerCase().includes('.m3u8') || video.mimeType === 'application/vnd.apple.mpegurl') {
            return null
        }

        const response = await fetch(video.playbackUrl)
        if (!response.ok) {
            throw new Error('Failed to fetch the saved video for thumbnail regeneration.')
        }

        const blob = await response.blob()
        const file = new File([blob], video.originalFileName || `${video.id}.mp4`, { type: video.mimeType || 'video/mp4' })
        return await tryAutoGenerateThumbnailFromUploadedVideo(file)
    }

    async function maybeApplyAutoThumbnailForCandidate(candidate: ThumbnailCandidate, applySelection = true) {
        if (!shouldReplaceWorkThumbnailSource(thumbnailSourceKind, candidate.kind)) {
            return null
        }

        setIsAutoGeneratingThumbnail(true)

        try {
            if (candidate.kind === 'uploaded-video' && candidate.file) {
                return await tryAutoGenerateThumbnailFromUploadedVideo(candidate.file, applySelection)
            }

            if (candidate.kind === 'youtube' && candidate.youtubeVideoId) {
                return await tryAutoGenerateThumbnailFromYouTube(candidate.youtubeVideoId, applySelection)
            }

            return null
        } catch (error) {
            if (applySelection && candidate.kind === 'youtube') {
                setThumbnailSourceKind('youtube')
                setThumbnailUrl(buildYouTubeThumbnailUrl(candidate.youtubeVideoId ?? ''))
            }

            throw error
        } finally {
            setIsAutoGeneratingThumbnail(false)
        }
    }

    async function persistThumbnailSelectionForWork(workId: string, nextThumbnailAssetId: string) {
        const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(workId)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(buildWorkMutationPayload(nextThumbnailAssetId)),
        })

        if (!response.ok) {
            throw new Error(await getResponseError(response, 'Failed to persist the generated thumbnail.'))
        }

        return await response.json().catch(() => null) as { id?: string; slug?: string; Slug?: string } | null
    }

    async function persistThumbnailSelectionAndRevalidate(workId: string, nextThumbnailAssetId: string) {
        const responsePayload = await persistThumbnailSelectionForWork(workId, nextThumbnailAssetId)
        const nextSlug = resolveWorkSaveSlug({
            payload: responsePayload,
            title,
            initialSlug: initialWork?.slug,
        })

        await revalidatePublicPathsAfterMutation(getWorkPublicRevalidationPaths(nextSlug, initialWork?.slug))
        return responsePayload
    }

    async function uploadWorkImage(
        event: React.ChangeEvent<HTMLInputElement>,
        target: 'thumbnail' | 'icon'
    ) {
        const file = event.target.files?.[0]
        if (!file) return

        if (!isAcceptedImageFile(file)) {
            toast.error(`Please upload an image file for ${target}.`)
            event.target.value = ''
            return
        }

        setUploadingTarget(target)

        try {
            const payload = await uploadAssetFile(file, target === 'thumbnail' ? 'work-thumbnails' : 'work-icons')

            if (target === 'thumbnail') {
                setThumbnailAssetId(payload.id)
                setThumbnailUrl(payload.url)
                setThumbnailSourceKind('manual')
            } else {
                setIconAssetId(payload.id)
                setIconUrl(payload.url)
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Upload failed'
            const safeMessage = sanitizeAdminUploadError(
                message,
                `${target === 'thumbnail' ? 'Thumbnail' : 'Icon'} could not be uploaded. Please retry after storage is healthy.`
            )
            toast.error(`Failed to upload ${target}: ${safeMessage}`)
        } finally {
            setUploadingTarget(null)
            event.target.value = ''
        }
    }

    async function regenerateThumbnailFallbackForCurrentWork() {
        const nextSource = resolveWorkThumbnailSource({
            thumbnailAssetId: null,
            videos,
            html,
        })

        setThumbnailSourceKind(nextSource.kind)
        setThumbnailUrl(nextSource.kind === 'content-image' ? nextSource.imageUrl ?? '' : '')

        if (nextSource.video) {
            const uploadedThumbnail = await tryAutoGenerateThumbnailFromSavedVideo(nextSource.video)
            if (uploadedThumbnail) {
                if (initialWork?.id) {
                    await persistThumbnailSelectionAndRevalidate(initialWork.id, uploadedThumbnail.id)
                }
                return
            }
        }
    }

    async function removeWorkImage(target: 'thumbnail' | 'icon') {
        if (target === 'thumbnail') {
            setThumbnailAssetId('')
            setThumbnailUrl('')
            try {
                await regenerateThumbnailFallbackForCurrentWork()
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to regenerate the fallback thumbnail.'
                toast.error(sanitizeAdminUploadError(message, 'Thumbnail could not be regenerated. Please retry after storage is healthy.'))
            }
            return
        }

        setIconAssetId('')
        setIconUrl('')
    }

    function addYouTubeDraft() {
        const trimmed = youtubeUrlInput.trim()
        if (!trimmed) {
            toast.error('Paste a YouTube URL or video ID first.')
            return
        }

        if (!normalizeYouTubeVideoId(trimmed)) {
            toast.error('Enter a valid YouTube URL or video ID.')
            return
        }

        if (isEditing) {
            void addYouTubeForExistingWork(trimmed)
            return
        }

        setStagedVideos((current) => [...current, {
            tempId: createClientId(),
            kind: 'youtube',
            label: trimmed,
            youtubeUrl: trimmed,
        }])
        setYoutubeUrlInput('')
    }

    function handleStageHlsVideoFile(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return

        if (!isAcceptedMp4VideoFile(file)) {
            toast.error('Please upload an MP4 video file.')
            event.target.value = ''
            return
        }

        if (isEditing) {
            void uploadHlsVideoForExistingWork(file)
            event.target.value = ''
            return
        }

        setStagedVideos((current) => [...current, {
            tempId: createClientId(),
            kind: 'file',
            label: file.name,
            uploadMode: 'hls',
            file,
        }])
        event.target.value = ''
    }

    function moveStagedVideo(tempId: string, direction: -1 | 1) {
        setStagedVideos((current) => {
            const index = current.findIndex((item) => item.tempId === tempId)
            if (index < 0) return current

            const nextIndex = index + direction
            if (nextIndex < 0 || nextIndex >= current.length) return current

            const next = [...current]
            const [item] = next.splice(index, 1)
            next.splice(nextIndex, 0, item)
            return next
        })
    }

    function reorderStagedVideoToIndex(tempId: string, targetIndex: number) {
        setStagedVideos((current) => {
            const index = current.findIndex((item) => item.tempId === tempId)
            if (index < 0 || targetIndex < 0 || targetIndex >= current.length || index === targetIndex) {
                return current
            }

            const next = [...current]
            const [item] = next.splice(index, 1)
            next.splice(targetIndex, 0, item)
            return next
        })
    }

    function removeStagedVideo(tempId: string) {
        setStagedVideos((current) => current.filter((item) => item.tempId !== tempId))
    }

    async function addYouTubeForExistingWork(youtubeUrlOrId: string) {
        if (!initialWork?.id) return

        setIsVideoBusy(true)

        try {
            const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(initialWork.id)}/videos/youtube`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    youtubeUrlOrId,
                    expectedVideosVersion: videosVersion,
                }),
            })

            if (!response.ok) {
                throw new Error(await getResponseError(response, 'Failed to add YouTube video.'))
            }

            const payload = await response.json() as VideoMutationPayload
            syncVideos(payload)
            setHasPersistedVideoChanges(true)
            setYoutubeUrlInput('')
            const normalizedVideoId = normalizeYouTubeVideoId(youtubeUrlOrId)
            if (normalizedVideoId) {
                try {
                    const uploadedThumbnail = await maybeApplyAutoThumbnailForCandidate({ kind: 'youtube', youtubeVideoId: normalizedVideoId }, false)
                    if (uploadedThumbnail) {
                        await persistThumbnailSelectionAndRevalidate(initialWork.id, uploadedThumbnail.id)
                        applyThumbnailSelection(uploadedThumbnail, 'youtube')
                    }
                } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Failed to auto-generate a YouTube thumbnail.')
                }
            }
            refreshInlinePublicWorkIfNeeded()
            toast.success('YouTube video added.')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to add YouTube video.')
        } finally {
            setIsVideoBusy(false)
        }
    }

    async function requestUploadTarget(workId: string, file: File, expectedVersion: number) {
        const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(workId)}/videos/upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileName: file.name,
                contentType: file.type,
                size: file.size,
                expectedVideosVersion: expectedVersion,
            }),
        })

        if (!response.ok) {
            throw new Error(await getResponseError(response, 'Failed to prepare a video upload.'))
        }

        return await response.json() as UploadTargetPayload
    }

    async function uploadToTarget(workId: string, file: File, target: UploadTargetPayload) {
        if (target.uploadMethod === 'PUT') {
            let response: Response
            try {
                response = await fetch(target.uploadUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': file.type,
                    },
                    body: file,
                })
            } catch {
                throw new Error('Browser upload to Cloudflare R2 failed. Check bucket CORS for Origin, PUT, and Content-Type.')
            }

            if (!response.ok) {
                throw new Error(await getResponseError(response, 'Failed to upload the video file.'))
            }

            return
        }

        const formData = new FormData()
        formData.append('file', file)

        const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(workId)}/videos/upload?uploadSessionId=${encodeURIComponent(target.uploadSessionId)}`, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            throw new Error(await getResponseError(response, 'Failed to upload the video file.'))
        }
    }

    async function confirmVideoUpload(workId: string, uploadSessionId: string, expectedVersion: number) {
        const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(workId)}/videos/confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uploadSessionId,
                expectedVideosVersion: expectedVersion,
            }),
        })

        if (!response.ok) {
            throw new Error(await getResponseError(response, 'Failed to confirm the video upload.'))
        }

        return await response.json() as VideoMutationPayload
    }

    async function uploadHlsVideo(workId: string, file: File, expectedVersion: number) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('expectedVideosVersion', String(expectedVersion))

        const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(workId)}/videos/hls-job`, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            throw new Error(await getResponseError(response, 'Failed to process the video as HLS.'))
        }

        return await response.json() as VideoMutationPayload
    }

    async function uploadHlsVideoForExistingWork(file: File) {
        if (!initialWork?.id) return

        setIsVideoBusy(true)
        setVideoUploadPhase('uploading', file.name)
        const processingPhaseTimer = window.setTimeout(() => {
            setVideoUploadPhase('processing', file.name)
        }, 700)
        let thumbnailError: unknown = null
        const uploadedThumbnailPromise = maybeApplyAutoThumbnailForCandidate({ kind: 'uploaded-video', file }, false)
            .catch((error: unknown) => {
                thumbnailError = error
                return null
            })

        try {
            const payload = await uploadHlsVideo(initialWork.id, file, videosVersion)
            syncVideos(payload)
            setHasPersistedVideoChanges(true)
            const uploadedThumbnail = await uploadedThumbnailPromise
            if (thumbnailError) {
                toast.error(thumbnailError instanceof Error ? thumbnailError.message : 'Failed to auto-generate a video thumbnail.')
            }
            if (uploadedThumbnail) {
                await persistThumbnailSelectionAndRevalidate(initialWork.id, uploadedThumbnail.id)
                applyThumbnailSelection(uploadedThumbnail, 'uploaded-video')
            }
            refreshInlinePublicWorkIfNeeded()
            window.clearTimeout(processingPhaseTimer)
            setVideoUploadPhase('complete', file.name)
            toast.success('HLS video uploaded.')
        } catch (error) {
            await uploadedThumbnailPromise
            window.clearTimeout(processingPhaseTimer)
            setVideoUploadStatus(null)
            const message = error instanceof Error ? error.message : 'Failed to upload HLS video.'
            toast.error(sanitizeAdminUploadError(message, 'Video could not be uploaded. Please retry after storage is healthy.'))
        } finally {
            setIsVideoBusy(false)
        }
    }

    async function removeSavedVideo(videoId: string) {
        if (!initialWork?.id) return

        if (embeddedVideoIdSet.has(videoId)) {
            toast.error('Remove this video from the body before deleting it.')
            return
        }

        setIsVideoBusy(true)

        try {
            const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(initialWork.id)}/videos/${encodeURIComponent(videoId)}?expectedVideosVersion=${videosVersion}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error(await getResponseError(response, 'Failed to remove video.'))
            }

            syncVideos(await response.json() as VideoMutationPayload)
            setHasPersistedVideoChanges(true)
            refreshInlinePublicWorkIfNeeded()
            toast.success('Video removed.')
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove video.'
            toast.error(sanitizeAdminUploadError(message, 'Video could not be removed. Please retry after the backend is healthy.'))
        } finally {
            setIsVideoBusy(false)
        }
    }

    async function reorderSavedVideo(videoId: string, direction: -1 | 1) {
        if (!initialWork?.id) return

        const index = videos.findIndex((video) => video.id === videoId)
        const nextIndex = index + direction
        if (index < 0 || nextIndex < 0 || nextIndex >= videos.length) {
            return
        }

        const reordered = [...videos]
        const [item] = reordered.splice(index, 1)
        reordered.splice(nextIndex, 0, item)

        setIsVideoBusy(true)

        try {
            const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(initialWork.id)}/videos/order`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderedVideoIds: reordered.map((video) => video.id),
                    expectedVideosVersion: videosVersion,
                }),
            })

            if (!response.ok) {
                throw new Error(await getResponseError(response, 'Failed to reorder videos.'))
            }

            syncVideos(await response.json() as VideoMutationPayload)
            setHasPersistedVideoChanges(true)
            refreshInlinePublicWorkIfNeeded()
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to reorder videos.'
            toast.error(sanitizeAdminUploadError(message, 'Video order could not be saved. Please retry after the backend is healthy.'))
        } finally {
            setIsVideoBusy(false)
        }
    }

    async function reorderSavedVideoToIndex(videoId: string, targetIndex: number) {
        if (!initialWork?.id) return

        const index = videos.findIndex((video) => video.id === videoId)
        if (index < 0 || targetIndex < 0 || targetIndex >= videos.length || index === targetIndex) {
            return
        }

        const reordered = [...videos]
        const [item] = reordered.splice(index, 1)
        reordered.splice(targetIndex, 0, item)

        setIsVideoBusy(true)

        try {
            const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(initialWork.id)}/videos/order`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderedVideoIds: reordered.map((video) => video.id),
                    expectedVideosVersion: videosVersion,
                }),
            })

            if (!response.ok) {
                throw new Error(await getResponseError(response, 'Failed to reorder videos.'))
            }

            syncVideos(await response.json() as VideoMutationPayload)
            setHasPersistedVideoChanges(true)
            refreshInlinePublicWorkIfNeeded()
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to reorder videos.'
            toast.error(sanitizeAdminUploadError(message, 'Video order could not be saved. Please retry after the backend is healthy.'))
        } finally {
            setIsVideoBusy(false)
        }
    }

    async function addStagedYoutubeVideo(workId: string, draft: VideoDraft, currentVersion: number): Promise<StagedVideoResult> {
        const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(workId)}/videos/youtube`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                youtubeUrlOrId: draft.youtubeUrl,
                expectedVideosVersion: currentVersion,
            }),
        })

        if (!response.ok) {
            throw new Error(await getResponseError(response, `Failed to add YouTube video: ${draft.label}`))
        }

        const payload = await response.json() as VideoMutationPayload
        return {
            currentVersion: getNextVideosVersion(payload, currentVersion + 1),
            latestPayload: payload,
        }
    }

    async function addStagedUploadedVideo(workId: string, draft: VideoDraft, currentVersion: number): Promise<StagedVideoResult> {
        if (!draft.file) {
            return {
                currentVersion,
                latestPayload: null,
            }
        }

        const payload = draft.uploadMode === 'hls'
            ? await uploadHlsVideo(workId, draft.file, currentVersion)
            : await (async () => {
                const target = await requestUploadTarget(workId, draft.file!, currentVersion)
                await uploadToTarget(workId, draft.file!, target)
                return await confirmVideoUpload(workId, target.uploadSessionId, currentVersion)
            })()

        return {
            currentVersion: getNextVideosVersion(payload, currentVersion + 1),
            latestPayload: payload,
        }
    }

    async function processStagedVideos(workId: string) {
        let currentVersion = 0
        let latestPayload: VideoMutationPayload | null = null

        for (const draft of stagedVideos) {
            if (draft.kind === 'youtube' && draft.youtubeUrl) {
                const result = await addStagedYoutubeVideo(workId, draft, currentVersion)
                currentVersion = result.currentVersion
                latestPayload = result.latestPayload
                continue
            }

            if (draft.kind === 'file' && draft.file) {
                setVideoUploadPhase('uploading', draft.label)
                const processingPhaseTimer = window.setTimeout(() => {
                    setVideoUploadPhase('processing', draft.label)
                }, 700)
                try {
                    const result = await addStagedUploadedVideo(workId, draft, currentVersion)
                    window.clearTimeout(processingPhaseTimer)
                    setVideoUploadPhase('complete', draft.label)
                    currentVersion = result.currentVersion
                    latestPayload = result.latestPayload
                } catch (error) {
                    window.clearTimeout(processingPhaseTimer)
                    setVideoUploadStatus(null)
                    throw error
                }
            }
        }

        return {
            latestPayload,
            currentVersion,
        }
    }

    async function submitWorkPayload(payload: ReturnType<typeof buildWorkMutationPayload>) {
        const apiBaseUrl = getBrowserApiBaseUrl()
        const response = await fetchWithCsrf(
            isEditing && initialWork?.id
                ? `${apiBaseUrl}/admin/works/${encodeURIComponent(initialWork.id)}`
                : `${apiBaseUrl}/admin/works`,
            {
                method: isEditing ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            }
        )

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
        return await response.json().catch(() => null) as WorkSaveResponsePayload | null
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

    function insertSavedVideoIntoBody(videoId: string) {
        if (embeddedVideoIdSet.has(videoId)) {
            toast.error('This video is already placed in the body.')
            return
        }

        insertVideoNonceRef.current += 1
        setInsertVideoRequest({ videoId, nonce: insertVideoNonceRef.current })
    }

    function removeSavedVideoFromBody(videoId: string) {
        if (!embeddedVideoIdSet.has(videoId)) {
            return
        }

        setHtml((current) => removeWorkVideoEmbedReferences(current, videoId))
        toast.success('Inline video removed from the body.')
    }

    function handleVideoInsertHandled(result: { inserted: boolean; reason?: 'duplicate' | 'missing' }) {
        setInsertVideoRequest(null)

        if (result.inserted) {
            toast.success('Video inserted into the body.')
            return
        }

        if (result.reason === 'duplicate') {
            toast.error('This video is already placed in the body.')
            return
        }

        if (result.reason === 'missing') {
            toast.error('This video is no longer available in the saved video list.')
        }
    }

    return (
        <div className="space-y-8 max-w-4xl">
            <div
                id="work-editor-general-section"
                ref={generalSectionRef}
                className={cn(
                    'grid gap-6 rounded-2xl border border-border/80 bg-card p-6 shadow-sm md:grid-cols-2',
                    activeTab === 'general' && 'ring-2 ring-primary/20',
                )}
            >
                <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                        id="title"
                        name="title"
                        required
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value)
                            setSaveError(null)
                        }}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                        id="category"
                        name="category"
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value)
                            setSaveError(null)
                        }}
                        placeholder={DEFAULT_WORK_CATEGORY}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="period">Project Period</Label>
                    <Input
                        id="period"
                        name="period"
                        value={period}
                        onChange={(e) => {
                            setPeriod(e.target.value)
                            setSaveError(null)
                        }}
                        placeholder="YYYY.MM - YYYY.MM"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                        id="tags"
                        name="tags"
                        value={tags}
                        onChange={(e) => {
                            setTags(e.target.value)
                            setSaveError(null)
                        }}
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="social-share-message">Share Message</Label>
                    <Input
                        id="social-share-message"
                        name="socialShareMessage"
                        value={socialShareMessage}
                        onChange={(event) => {
                            setSocialShareMessage(event.target.value)
                            setSaveError(null)
                        }}
                        placeholder="Optional short message for link previews on /works/{slug}"
                    />
                    <p className="text-xs text-muted-foreground">
                        Shared link descriptions use this value first. Stored in flexible metadata as <code>socialShareMessage</code>.
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
                                {formatDate(initialWork?.updatedAt)}
                            </p>
                        </div>
                    )}
                    <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-2 md:ml-auto">
                        <Checkbox
                            id="published"
                            name="published"
                            checked={published}
                            onCheckedChange={(value) => {
                                setPublished(Boolean(value))
                                setSaveError(null)
                            }}
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

            <div className="sticky top-4 z-10 rounded-2xl border border-border/80 bg-background/95 p-2 shadow-sm backdrop-blur-sm">
                <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Work editor sections">
                    {([
                        { value: 'general', label: 'General' },
                        { value: 'media', label: 'Media & Videos' },
                        { value: 'content', label: 'Content' },
                    ] as const).map((tab) => (
                        <Button
                            key={tab.value}
                            type="button"
                            role="tab"
                            variant={activeTab === tab.value ? 'secondary' : 'ghost'}
                            aria-selected={activeTab === tab.value}
                            aria-controls={`work-editor-${tab.value}-section`}
                            className="justify-center"
                            onClick={() => scrollToTab(tab.value)}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </div>
            </div>

            <div
                id="work-editor-media-section"
                ref={mediaSectionRef}
                className={cn(
                    'space-y-6 rounded-2xl border border-border/80 bg-card p-6 shadow-sm',
                    activeTab === 'media' && 'ring-2 ring-primary/20',
                )}
            >
                <div className="space-y-4 rounded-2xl border border-border/80 bg-background p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-medium">Flexible Metadata</h3>
                            <p className="text-sm text-muted-foreground">
                                Add structured key/value fields without editing raw JSON.
                            </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addMetadataField}>
                            <Plus size={14} />
                            Add Field
                        </Button>
                    </div>
                    {metadataFields.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                            No metadata fields yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {metadataFields.map((field, index) => (
                                <div key={field.id} className="flex flex-col gap-2 md:flex-row">
                                    <div className="space-y-2 md:w-1/3">
                                        <Label htmlFor={`metadata-key-${field.id}`}>Key</Label>
                                        <Input
                                            id={`metadata-key-${field.id}`}
                                            placeholder="e.g. role…"
                                            value={field.key}
                                            onChange={(event) => updateMetadataField(field.id, { key: event.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 md:flex-1">
                                        <Label htmlFor={`metadata-value-${field.id}`}>Value</Label>
                                        <Input
                                            id={`metadata-value-${field.id}`}
                                            placeholder="e.g. Lead Frontend Engineer…"
                                            value={field.value}
                                            onChange={(event) => updateMetadataField(field.id, { value: event.target.value })}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Remove metadata field ${index + 1}`}
                                            onClick={() => removeMetadataField(field.id)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-4 rounded-2xl border border-border/80 bg-background p-5">
                    <div>
                        <h3 className="text-lg font-medium">Work Media</h3>
                        <p className="text-sm text-muted-foreground">
                            Upload thumbnail and icon images for this work.
                        </p>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-3">
                            <Label htmlFor="work-thumbnail-upload">Thumbnail Image</Label>
                            <div className="relative h-40 overflow-hidden rounded-md border border-border bg-muted">
                                {effectiveThumbnailPreviewUrl ? (
                                    <Image
                                        src={effectiveThumbnailPreviewUrl}
                                        alt="Work thumbnail preview"
                                        fill
                                        unoptimized
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                        No thumbnail uploaded
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground" data-testid="work-thumbnail-source">
                                {thumbnailSourceKind === 'manual'
                                    ? 'Thumbnail source: manual'
                                    : thumbnailSourceKind === 'uploaded-video'
                                        ? 'Thumbnail source: uploaded video'
                                        : thumbnailSourceKind === 'youtube'
                                            ? 'Thumbnail source: YouTube'
                                            : thumbnailSourceKind === 'content-image'
                                                ? 'Thumbnail source: content image'
                                                : 'Thumbnail source: none'}
                            </p>
                            <div className="rounded-xl border border-dashed border-border/80 bg-muted/50 p-4">
                                <p className="mb-2 text-sm font-medium text-foreground">Thumbnail</p>
                                <p className="mb-3 text-xs text-muted-foreground">
                                    Recommended size: 800 × 600px
                                </p>
                                <Input
                                    id="work-thumbnail-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => void uploadWorkImage(event, 'thumbnail')}
                                    disabled={uploadingTarget !== null}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        void removeWorkImage('thumbnail')
                                    }}
                                    disabled={!thumbnailAssetId}
                                >
                                    Remove Thumbnail
                                </Button>
                                {uploadingTarget === 'thumbnail' && (
                                    <span className="text-sm text-muted-foreground">Uploading…</span>
                                )}
                                {isAutoGeneratingThumbnail && (
                                    <span className="text-sm text-muted-foreground">Generating thumbnail…</span>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="work-icon-upload">Icon Image</Label>
                            <div className="relative h-40 overflow-hidden rounded-md border border-border bg-muted">
                                {iconUrl ? (
                                    <Image
                                        src={iconUrl}
                                        alt="Work icon preview"
                                        fill
                                        unoptimized
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                        No icon uploaded
                                    </div>
                                )}
                            </div>
                            <div className="rounded-xl border border-dashed border-border/80 bg-muted/50 p-4">
                                <p className="mb-2 text-sm font-medium text-foreground">Icon</p>
                                <p className="mb-3 text-xs text-muted-foreground">
                                    Square image recommended.
                                </p>
                                <Input
                                    id="work-icon-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => void uploadWorkImage(event, 'icon')}
                                    disabled={uploadingTarget !== null}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => removeWorkImage('icon')}
                                    disabled={!iconUrl}
                                >
                                    Remove Icon
                                </Button>
                                {uploadingTarget === 'icon' && (
                                    <span className="text-sm text-muted-foreground">Uploading…</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-border/80 bg-background p-5">
                    <div>
                        <h3 className="text-lg font-medium">Work Videos</h3>
                        <p className="text-sm text-muted-foreground">
                            {isEditing
                                ? 'Add YouTube links or upload MP4 files. Video changes save immediately.'
                                : usesPublicInlineCreateFlow
                                    ? "Stage videos before saving. They'll be attached automatically."
                                    : "Stage videos before saving. They'll be attached after the work is created."}
                        </p>
                    </div>
                    {isEditing && (
                        <div className="rounded-xl border border-border/80 bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                            Videos save immediately. Use Update Work for text, metadata, thumbnail, or icon changes.
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                        <div className="space-y-2">
                            <Label htmlFor="youtube-video-input">YouTube URL or ID</Label>
                            <Input
                                id="youtube-video-input"
                                value={youtubeUrlInput}
                                onChange={(event) => setYoutubeUrlInput(event.target.value)}
                                placeholder="https://youtu.be/… or dQw4w9WgXcQ"
                                disabled={isVideoBusy}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addYouTubeDraft}
                            disabled={isVideoBusy || !youtubeUrlInput.trim() || (!isEditing && stagedVideos.length >= 10)}
                        >
                            Add YouTube Video
                        </Button>
                    </div>

                    <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/40 p-4">
                        <Label htmlFor="work-video-upload">Upload MP4 Video as HLS</Label>
                        <Input
                            id="work-video-upload"
                            type="file"
                            accept="video/mp4,.mp4"
                            onChange={handleStageHlsVideoFile}
                            disabled={isVideoBusy || (!isEditing && stagedVideos.length >= 10)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Creates an m3u8 playlist from the original MP4 without downscaling. Use H.264/AAC MP4 files for browser playback.
                        </p>
                        {videoUploadStatus ? (
                            <p
                                data-testid="work-video-upload-status"
                                className={cn(
                                    'text-xs font-medium',
                                    videoUploadStatus.phase === 'complete'
                                        ? 'text-emerald-600'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {videoUploadStatus.message}
                            </p>
                        ) : null}
                    </div>

                    {isEditing ? (
                        <div className="space-y-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Saved videos version {videosVersion}
                            </p>
                            {videos.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                                    No videos attached yet.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {videos.map((video, index) => (
                                        <div
                                            key={video.id}
                                            data-testid="saved-video-card"
                                            draggable={!isVideoBusy}
                                            onDragStart={(event) => {
                                                event.dataTransfer.setData('text/saved-video-id', video.id)
                                                event.dataTransfer.effectAllowed = 'move'
                                            }}
                                            onDragOver={(event) => {
                                                event.preventDefault()
                                                event.dataTransfer.dropEffect = 'move'
                                            }}
                                            onDrop={(event) => {
                                                event.preventDefault()
                                                const sourceId = event.dataTransfer.getData('text/saved-video-id')
                                                if (sourceId) {
                                                    void reorderSavedVideoToIndex(sourceId, index)
                                                }
                                            }}
                                            className="space-y-3 rounded-xl border border-border/70 p-4"
                                        >
                                            {embeddedVideoIdSet.has(video.id) && (
                                                <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100">
                                                    Placed in body. Remove it from the body before deleting the saved video.
                                                </div>
                                            )}
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium">{getWorkVideoDisplayLabel(video)}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {video.sourceType.toUpperCase()} · order {video.sortOrder + 1} · {embeddedVideoIdSet.has(video.id) ? 'Placed in body' : 'Not placed'}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="default"
                                                        onClick={() => insertSavedVideoIntoBody(video.id)}
                                                        disabled={isVideoBusy || embeddedVideoIdSet.has(video.id)}
                                                    >
                                                        Insert Into Body
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => removeSavedVideoFromBody(video.id)}
                                                        disabled={isVideoBusy || !embeddedVideoIdSet.has(video.id)}
                                                    >
                                                        Remove From Body
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={`Move ${getWorkVideoDisplayLabel(video)} up`}
                                                        title="Move Up"
                                                        onClick={() => void reorderSavedVideo(video.id, -1)}
                                                        disabled={isVideoBusy || index === 0}
                                                    >
                                                        <ChevronUp />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={`Move ${getWorkVideoDisplayLabel(video)} down`}
                                                        title="Move Down"
                                                        onClick={() => void reorderSavedVideo(video.id, 1)}
                                                        disabled={isVideoBusy || index === videos.length - 1}
                                                    >
                                                        <ChevronDown />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={`Remove ${getWorkVideoDisplayLabel(video)}`}
                                                        title="Remove Video"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => void removeSavedVideo(video.id)}
                                                        disabled={isVideoBusy}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </div>
                                            </div>
                                            <WorkVideoPlayer video={video} />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {orphanEmbeddedVideoIds.length > 0 && (
                                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
                                    Body references missing videos: {orphanEmbeddedVideoIds.join(', ')}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {stagedVideos.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                                    No staged videos yet.
                                </div>
                            ) : (
                                stagedVideos.map((video, index) => (
                                    <div
                                        key={video.tempId}
                                        data-testid="staged-video-card"
                                        draggable
                                        onDragStart={(event) => {
                                            event.dataTransfer.setData('text/staged-video-id', video.tempId)
                                            event.dataTransfer.effectAllowed = 'move'
                                        }}
                                        onDragOver={(event) => {
                                            event.preventDefault()
                                            event.dataTransfer.dropEffect = 'move'
                                        }}
                                        onDrop={(event) => {
                                            event.preventDefault()
                                            const sourceId = event.dataTransfer.getData('text/staged-video-id')
                                            if (sourceId) {
                                                reorderStagedVideoToIndex(sourceId, index)
                                            }
                                        }}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-4"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">{video.label}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {video.kind === 'youtube' ? 'YouTube draft' : video.uploadMode === 'hls' ? 'HLS MP4 draft' : 'MP4 draft'} · order {index + 1}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Move ${video.label} up`}
                                                title="Move Up"
                                                onClick={() => moveStagedVideo(video.tempId, -1)}
                                                disabled={index === 0}
                                            >
                                                <ChevronUp />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Move ${video.label} down`}
                                                title="Move Down"
                                                onClick={() => moveStagedVideo(video.tempId, 1)}
                                                disabled={index === stagedVideos.length - 1}
                                            >
                                                <ChevronDown />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Remove ${video.label}`}
                                                title="Remove Video"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => removeStagedVideo(video.tempId)}
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div
                id="work-editor-content-section"
                ref={contentSectionRef}
                className={cn(
                    'space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-sm',
                    activeTab === 'content' && 'ring-2 ring-primary/20',
                )}
            >
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium">Content (HTML/Text)</h3>
                    <div className="flex items-center gap-2">
                        <AIFixDialog
                            content={html}
                            onApply={setHtml}
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
                    onChange={(nextHtml) => {
                        setHtml(nextHtml)
                        setSaveError(null)
                    }}
                    placeholder="Describe the project story and place saved videos inline where they belong…"
                    workVideos={videos}
                    insertVideoEmbedRequest={insertVideoRequest}
                    onVideoInsertHandled={handleVideoInsertHandled}
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

            <div className="flex flex-col gap-3 border-t pt-8 sm:flex-row sm:items-center sm:justify-end">
                {saveError ? (
                    <p role="alert" aria-live="polite" data-testid="admin-work-form-error" className="text-sm text-red-600 sm:mr-auto">
                        {saveError}
                    </p>
                ) : null}
                {!inlineMode && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            if (hasUnsavedChanges) {
                                setShowUnsavedDialog(true)
                                return
                            }
                            router.push(returnTo)
                        }}
                    >
                        Cancel
                    </Button>
                )}

                {isEditing ? (
                    <Button
                        type="button"
                        onClick={() => void saveWork('default')}
                        disabled={isSaving || (!isDirty && !hasPersistedVideoChanges) || !title.trim()}
                        className="px-8 font-medium"
                    >
                        {isSaving ? 'Saving…' : 'Update Work'}
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={() => void saveWork(primarySaveMode)}
                        disabled={isSaving || !isDirty || !title.trim()}
                        className="px-8 font-medium"
                    >
                        {isSaving ? 'Creating…' : hasStagedVideos ? 'Create with Videos' : 'Create Work'}
                    </Button>
                )}
            </div>
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
                                router.push(returnTo)
                            }}
                        >
                            Discard changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
