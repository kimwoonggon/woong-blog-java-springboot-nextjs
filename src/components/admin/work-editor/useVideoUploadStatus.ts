import { useEffect, useRef, useState } from 'react'

export type VideoUploadPhase = 'uploading' | 'processing' | 'complete'

export type VideoUploadStatus = {
  phase: VideoUploadPhase
  message: string
}

export function useVideoUploadStatus() {
  const [videoUploadStatus, setVideoUploadStatus] = useState<VideoUploadStatus | null>(null)
  const videoUploadStatusTimeoutRef = useRef<number | null>(null)

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
    return () => {
      clearVideoUploadStatusTimeout()
    }
  }, [])

  return {
    videoUploadStatus,
    setVideoUploadStatus,
    setVideoUploadPhase,
  }
}
