function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.92) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not serialize thumbnail canvas.'))
        return
      }

      resolve(blob)
    }, type, quality)
  })
}

async function loadVideoForCanvas(sourceUrl: string) {
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.crossOrigin = 'anonymous'

  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const handleLoadedMetadata = async () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      const targetTime = duration > 0
        ? Math.min(Math.max(duration * 0.25, 0.1), Math.max(duration - 0.1, 0.1))
        : 0.1

      const handleSeeked = () => {
        cleanup()
        resolve(video)
      }

      video.addEventListener('seeked', handleSeeked, { once: true })

      try {
        video.currentTime = targetTime
      } catch {
        cleanup()
        reject(new Error('Could not seek video for thumbnail extraction.'))
      }
    }

    const handleLoadedData = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime > 0) {
        cleanup()
        resolve(video)
      }
    }

    const handleCanPlay = () => {
      if (video.currentTime > 0) {
        cleanup()
        resolve(video)
      }
    }

    const handleError = () => {
      cleanup()
      reject(new Error('Could not load video for thumbnail extraction.'))
    }

    const cleanup = () => {
      video.pause()
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)
    video.src = sourceUrl
    void video.play().catch(() => {})
  })
}

export async function extractVideoFrameThumbnailBlob(file: File) {
  if (!file.size) {
    throw new Error('The video file is empty.')
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const video = await loadVideoForCanvas(objectUrl)
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not create a 2D canvas context.')
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    return await canvasToBlob(canvas)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function fetchRemoteImageBlob(url: string, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(url)
  if (!response.ok) {
    throw new Error(`Could not fetch remote thumbnail (${response.status}).`)
  }

  return await response.blob()
}
