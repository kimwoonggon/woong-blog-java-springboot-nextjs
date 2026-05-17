import type { MutableRefObject } from 'react'
import type { Editor } from '@tiptap/react'
import { buildWorkVideoEmbedMarkup, isWorkVideoEmbedded } from '@/lib/content/work-video-embeds'
import type { WorkVideo } from '@/lib/api/works'

export function handleVideoInsertRequest({
  editor,
  insertVideoEmbedRequest,
  lastHandledInsertNonce,
  workVideosRef,
  onVideoInsertHandled,
}: {
  editor: Editor | null
  insertVideoEmbedRequest: { videoId: string; nonce: number } | null
  lastHandledInsertNonce: MutableRefObject<number | null>
  workVideosRef: MutableRefObject<WorkVideo[]>
  onVideoInsertHandled?: (result: { inserted: boolean; reason?: 'duplicate' | 'missing' }) => void
}) {
  if (!editor || !insertVideoEmbedRequest) {
    return
  }

  if (lastHandledInsertNonce.current === insertVideoEmbedRequest.nonce) {
    return
  }

  lastHandledInsertNonce.current = insertVideoEmbedRequest.nonce
  const targetVideo = workVideosRef.current.find((video) => video.id === insertVideoEmbedRequest.videoId)

  if (!targetVideo) {
    onVideoInsertHandled?.({ inserted: false, reason: 'missing' })
    return
  }

  const currentHtml = editor.getHTML()
  if (isWorkVideoEmbedded(currentHtml, targetVideo.id)) {
    onVideoInsertHandled?.({ inserted: false, reason: 'duplicate' })
    return
  }

  editor
    .chain()
    .focus()
    .insertContent(buildWorkVideoEmbedMarkup(targetVideo.id))
    .run()

  onVideoInsertHandled?.({ inserted: true })
}
