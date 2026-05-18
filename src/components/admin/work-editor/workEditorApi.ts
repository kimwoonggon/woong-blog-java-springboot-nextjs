import { fetchWithCsrf } from '@/lib/api/auth'
import { getBrowserApiBaseUrl } from '@/lib/api/browser'
import {
  getResponseError,
} from '@/components/admin/work-editor/utils'
import type {
  UploadedAssetPayload,
  UploadTargetPayload,
  VideoMutationPayload,
  WorkSaveResponsePayload,
} from '@/components/admin/work-editor/types'

export type WorkMutationPayload = {
  title: string
  category: string
  period: string
  tags: string[]
  published: boolean
  contentJson: string
  allPropertiesJson: string
  thumbnailAssetId: string | null
  iconAssetId: string | null
}

export async function uploadWorkAssetFile(file: File, bucket: string) {
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

export async function uploadGeneratedWorkThumbnail(blob: Blob, fileName: string) {
  const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' })
  return await uploadWorkAssetFile(file, 'work-thumbnails')
}

export async function saveWorkPayload({
  isEditing,
  workId,
  payload,
}: {
  isEditing: boolean
  workId?: string
  payload: WorkMutationPayload
}) {
  const apiBaseUrl = getBrowserApiBaseUrl()
  const response = await fetchWithCsrf(
    isEditing && workId
      ? `${apiBaseUrl}/admin/works/${encodeURIComponent(workId)}`
      : `${apiBaseUrl}/admin/works`,
    {
      method: isEditing ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  )

  return response
}

export async function persistWorkThumbnailSelection({
  workId,
  payload,
}: {
  workId: string
  payload: WorkMutationPayload
}) {
  const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(workId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await getResponseError(response, 'Failed to persist the generated thumbnail.'))
  }

  return await response.json().catch(() => null) as { id?: string; slug?: string; Slug?: string } | null
}

export async function addWorkYouTubeVideo({
  workId,
  youtubeUrlOrId,
  expectedVideosVersion,
}: {
  workId: string
  youtubeUrlOrId: string
  expectedVideosVersion: number
}) {
  const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(workId)}/videos/youtube`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      youtubeUrlOrId,
      expectedVideosVersion,
    }),
  })

  if (!response.ok) {
    throw new Error(await getResponseError(response, 'Failed to add YouTube video.'))
  }

  return await response.json() as VideoMutationPayload
}

export async function requestWorkVideoUploadTarget({
  workId,
  file,
  expectedVersion,
}: {
  workId: string
  file: File
  expectedVersion: number
}) {
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

export async function uploadWorkVideoToTarget(workId: string, file: File, target: UploadTargetPayload) {
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

export async function confirmWorkVideoUpload({
  workId,
  uploadSessionId,
  expectedVersion,
}: {
  workId: string
  uploadSessionId: string
  expectedVersion: number
}) {
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

export async function uploadWorkHlsVideo(workId: string, file: File, expectedVersion: number) {
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

export async function removeWorkSavedVideo({
  workId,
  videoId,
  expectedVideosVersion,
}: {
  workId: string
  videoId: string
  expectedVideosVersion: number
}) {
  const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(workId)}/videos/${encodeURIComponent(videoId)}?expectedVideosVersion=${expectedVideosVersion}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(await getResponseError(response, 'Failed to remove video.'))
  }

  return await response.json() as VideoMutationPayload
}

export async function reorderWorkSavedVideos({
  workId,
  orderedVideoIds,
  expectedVideosVersion,
}: {
  workId: string
  orderedVideoIds: string[]
  expectedVideosVersion: number
}) {
  const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(workId)}/videos/order`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderedVideoIds,
      expectedVideosVersion,
    }),
  })

  if (!response.ok) {
    throw new Error(await getResponseError(response, 'Failed to reorder videos.'))
  }

  return await response.json() as VideoMutationPayload
}

export async function readWorkSaveResponsePayload(response: Response) {
  return await response.json().catch(() => null) as WorkSaveResponsePayload | null
}
