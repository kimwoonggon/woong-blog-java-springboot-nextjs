"use client"

import { Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { WorkVideo } from '@/lib/api/works'

interface WorkVideoPlayerProps {
  video: WorkVideo
  allowDesktopResize?: boolean
}

const hlsMimeType = 'application/vnd.apple.mpegurl'
const defaultAspectRatio = 16 / 9
export const timelinePreviewDisplayScale = 0.42
const previewBottomOffsetPx = 52
const previewHorizontalInsetPx = 16

interface TimelinePreviewCue {
  start: number
  end: number
  x: number
  y: number
  width: number
  height: number
}

type DesktopSizeMode = 'fit' | 'wide' | 'theater'

function parseTimestampToSeconds(value: string) {
  const [clock, millisecondsRaw] = value.trim().split('.')
  const parts = clock.split(':').map((item) => Number.parseInt(item, 10))
  const milliseconds = Number.parseInt(millisecondsRaw ?? '0', 10)
  if (parts.some((item) => Number.isNaN(item)) || Number.isNaN(milliseconds)) {
    return Number.NaN
  }

  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2] + (milliseconds / 1000)
  }

  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1] + (milliseconds / 1000)
  }

  return Number.NaN
}

function resolvePreviewCue(cues: TimelinePreviewCue[], time: number) {
  return cues.find((cue) => time >= cue.start && time <= cue.end) ?? null
}

function formatTimeLabel(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return '0:00'
  }

  const totalSeconds = Math.floor(value)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}:${String(remainingMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function parseTimelinePreviewVtt(payload: string) {
  const cues: TimelinePreviewCue[] = []
  const blocks = payload.split(/\r?\n\r?\n/g)

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    const timingLine = lines.find((line) => line.includes('-->'))
    if (!timingLine) {
      continue
    }

    const [rawStart, rawEnd] = timingLine.split('-->').map((line) => line.trim())
    const start = parseTimestampToSeconds(rawStart)
    const end = parseTimestampToSeconds(rawEnd)
    const xywhLine = lines.find((line) => line.includes('#xywh='))
    if (!xywhLine || Number.isNaN(start) || Number.isNaN(end)) {
      continue
    }

    const xywhSegment = xywhLine.split('#xywh=')[1] ?? ''
    const [x, y, width, height] = xywhSegment.split(',').map((item) => Number.parseInt(item, 10))
    if ([x, y, width, height].some((item) => Number.isNaN(item)) || width <= 0 || height <= 0) {
      continue
    }

    cues.push({ start, end, x, y, width, height })
  }

  return cues
}

function desktopSizeClass(sizeMode: DesktopSizeMode, allowDesktopResize: boolean) {
  if (!allowDesktopResize) {
    return ''
  }

  if (sizeMode === 'wide') {
    return 'lg:w-[min(100vw-8rem,72rem)] lg:max-w-none lg:relative lg:left-1/2 lg:-translate-x-1/2'
  }

  if (sizeMode === 'theater') {
    return 'lg:w-[min(100vw-4rem,86rem)] lg:max-w-none lg:relative lg:left-1/2 lg:-translate-x-1/2'
  }

  return ''
}

export function WorkVideoPlayer({ video, allowDesktopResize = false }: WorkVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [aspectRatio, setAspectRatio] = useState(() => {
    if (typeof video.width === 'number' && typeof video.height === 'number' && video.width > 0 && video.height > 0) {
      return video.width / video.height
    }

    return defaultAspectRatio
  })
  const [duration, setDuration] = useState(video.durationSeconds ?? 0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [previewCues, setPreviewCues] = useState<TimelinePreviewCue[]>([])
  const [previewTime, setPreviewTime] = useState<number | null>(null)
  const [previewLeft, setPreviewLeft] = useState(0)
  const [previewCue, setPreviewCue] = useState<TimelinePreviewCue | null>(null)
  const [desktopSizeMode, setDesktopSizeMode] = useState<DesktopSizeMode>(allowDesktopResize ? 'wide' : 'fit')
  const [canUseDesktopPreview, setCanUseDesktopPreview] = useState(false)
  const [playbackError, setPlaybackError] = useState(false)
  const isHlsVideo = useMemo(() => {
    return video.sourceType === 'hls'
      || video.mimeType === hlsMimeType
      || video.playbackUrl?.toLowerCase().endsWith('.m3u8') === true
  }, [video.mimeType, video.playbackUrl, video.sourceType])
  const supportsTimelinePreview = useMemo(() => {
    return video.sourceType !== 'youtube'
      && Boolean(video.timelinePreviewSpriteUrl)
      && Boolean(video.timelinePreviewVttUrl)
  }, [video.sourceType, video.timelinePreviewSpriteUrl, video.timelinePreviewVttUrl])
  const previewSpriteSize = useMemo(() => {
    if (previewCues.length === 0) {
      return { width: 0, height: 0 }
    }

    return previewCues.reduce((accumulator, cue) => ({
      width: Math.max(accumulator.width, cue.x + cue.width),
      height: Math.max(accumulator.height, cue.y + cue.height),
    }), { width: 0, height: 0 })
  }, [previewCues])

  function clearPreview() {
    setPreviewCue(null)
    setPreviewTime(null)
  }

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setCanUseDesktopPreview(false)
      return
    }

    const hoverQuery = window.matchMedia('(hover: hover)')
    const pointerQuery = window.matchMedia('(pointer: fine)')
    const syncPreference = () => {
      setCanUseDesktopPreview(window.innerWidth >= 1024 && hoverQuery.matches && pointerQuery.matches)
    }

    syncPreference()
    hoverQuery.addEventListener?.('change', syncPreference)
    pointerQuery.addEventListener?.('change', syncPreference)
    window.addEventListener('resize', syncPreference)

    return () => {
      hoverQuery.removeEventListener?.('change', syncPreference)
      pointerQuery.removeEventListener?.('change', syncPreference)
      window.removeEventListener('resize', syncPreference)
    }
  }, [])

  useEffect(() => {
    if (!isHlsVideo || !video.playbackUrl) {
      return
    }

    const element = videoRef.current
    if (!element) {
      return
    }

    if (element.canPlayType(hlsMimeType)) {
      element.src = video.playbackUrl
      return () => {
        element.removeAttribute('src')
      }
    }

    let disposed = false
    let hls: { loadSource: (source: string) => void; attachMedia: (media: HTMLMediaElement) => void; destroy: () => void } | null = null

    void import('hls.js').then(({ default: Hls }) => {
      if (disposed || !Hls.isSupported()) {
        if (!disposed) {
          setPlaybackError(true)
        }
        return
      }

      hls = new Hls()
      hls.loadSource(video.playbackUrl!)
      hls.attachMedia(element)
    }).catch(() => {
      if (!disposed) {
        setPlaybackError(true)
      }
    })

    return () => {
      disposed = true
      hls?.destroy()
    }
  }, [isHlsVideo, video.playbackUrl])

  useEffect(() => {
    setPlaybackError(false)
  }, [video.id, video.playbackUrl])

  useEffect(() => {
    setAspectRatio(() => {
      if (typeof video.width === 'number' && typeof video.height === 'number' && video.width > 0 && video.height > 0) {
        return video.width / video.height
      }

      return defaultAspectRatio
    })
    setDuration(video.durationSeconds ?? 0)
  }, [video.durationSeconds, video.height, video.width])

  useEffect(() => {
    clearPreview()
  }, [
    canUseDesktopPreview,
    desktopSizeMode,
    video.id,
    video.playbackUrl,
    video.timelinePreviewSpriteUrl,
    video.timelinePreviewVttUrl,
  ])

  useEffect(() => {
    if (!supportsTimelinePreview || !video.timelinePreviewVttUrl || !canUseDesktopPreview) {
      setPreviewCues([])
      return
    }

    let cancelled = false

    void fetch(video.timelinePreviewVttUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error('timeline preview vtt fetch failed')
        }

        return response.text()
      })
      .then((text) => {
        if (!cancelled) {
          const cues = parseTimelinePreviewVtt(text)
          setPreviewCues(cues)
          if ((!Number.isFinite(duration) || duration <= 0) && cues.length > 0) {
            setDuration(cues[cues.length - 1].end)
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewCues([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [canUseDesktopPreview, duration, supportsTimelinePreview, video.timelinePreviewVttUrl])

  function syncMetadata(element: HTMLVideoElement) {
    if (element.videoWidth > 0 && element.videoHeight > 0) {
      setAspectRatio(element.videoWidth / element.videoHeight)
    }

    if (Number.isFinite(element.duration) && element.duration > 0) {
      setDuration(element.duration)
    }
  }

  function updatePreview(clientX: number, clientY: number) {
    if (!supportsTimelinePreview || !canUseDesktopPreview || previewCues.length === 0 || duration <= 0 || !video.timelinePreviewSpriteUrl) {
      clearPreview()
      return
    }

    const frameRect = frameRef.current?.getBoundingClientRect()
    if (!frameRect || frameRect.width <= 0 || frameRect.height <= 0) {
      clearPreview()
      return
    }

    const lowerBandHeight = Math.min(96, Math.max(56, frameRect.height * 0.22))
    const lowerBandTop = frameRect.bottom - lowerBandHeight
    if (clientY < lowerBandTop || clientY > frameRect.bottom) {
      clearPreview()
      return
    }

    const inset = Math.min(previewHorizontalInsetPx, frameRect.width / 4)
    const controlLeft = frameRect.left + inset
    const controlWidth = Math.max(1, frameRect.width - (inset * 2))
    const offsetX = Math.max(0, Math.min(clientX - controlLeft, controlWidth))
    const percent = offsetX / controlWidth
    const targetTime = percent * duration
    const cue = resolvePreviewCue(previewCues, targetTime)

    if (!cue) {
      clearPreview()
      return
    }

    const rawPreviewLeft = inset + offsetX
    const previewHalfWidth = (cue.width * timelinePreviewDisplayScale) / 2
    const nextPreviewLeft = frameRect.width > (previewHalfWidth * 2)
      ? Math.max(previewHalfWidth, Math.min(rawPreviewLeft, frameRect.width - previewHalfWidth))
      : frameRect.width / 2

    setPreviewCue(cue)
    setPreviewTime(targetTime)
    setPreviewLeft(nextPreviewLeft)
  }

  async function togglePlayback() {
    if (!videoRef.current) {
      return
    }

    if (videoRef.current.paused) {
      await videoRef.current.play().catch(() => undefined)
      return
    }

    videoRef.current.pause()
  }

  if (video.sourceType === 'youtube') {
    return (
      <div
        data-testid="work-video-player"
        data-size-mode="fit"
        className="mx-auto w-full"
      >
        <div
          className="relative w-full overflow-hidden rounded-xl border border-border/70 bg-black"
          style={{
            aspectRatio: String(defaultAspectRatio),
            maxHeight: 'clamp(16rem, 72vh, 42rem)',
          }}
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.sourceKey}?playsinline=1&rel=0`}
            title={video.originalFileName ?? `YouTube video ${video.sourceKey}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    )
  }

  const canHandleFramePreview = canUseDesktopPreview && supportsTimelinePreview
  const isPreviewReady = canHandleFramePreview && previewCues.length > 0
  const unavailableMessage = 'Video is still processing or unavailable.'

  if (!video.playbackUrl) {
    return (
      <div
        data-testid="work-video-player"
        data-size-mode={desktopSizeMode}
        data-preview-ready="false"
        className={`mx-auto w-full ${desktopSizeClass(desktopSizeMode, allowDesktopResize)}`}
      >
        <div
          data-testid="work-video-frame"
          data-work-video-frame="true"
          role="status"
          className="flex w-full items-center justify-center rounded-xl border border-border/70 bg-muted px-4 py-12 text-center text-sm text-muted-foreground"
          style={{
            aspectRatio: String(aspectRatio),
            maxHeight: 'clamp(16rem, 72vh, 42rem)',
          }}
        >
          {unavailableMessage}
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="work-video-player"
      data-size-mode={desktopSizeMode}
      data-preview-ready={isPreviewReady ? 'true' : 'false'}
      className={`mx-auto w-full ${desktopSizeClass(desktopSizeMode, allowDesktopResize)}`}
    >
      {allowDesktopResize ? (
        <div className="mb-3 hidden items-center justify-end gap-2 lg:flex">
          <button
            type="button"
            data-testid="work-video-size-fit"
            onClick={() => setDesktopSizeMode('fit')}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${desktopSizeMode === 'fit' ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground hover:bg-muted'}`}
          >
            Fit
          </button>
          <button
            type="button"
            data-testid="work-video-size-wide"
            onClick={() => setDesktopSizeMode('wide')}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${desktopSizeMode === 'wide' ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground hover:bg-muted'}`}
          >
            Wide
          </button>
          <button
            type="button"
            data-testid="work-video-size-theater"
            onClick={() => setDesktopSizeMode('theater')}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${desktopSizeMode === 'theater' ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground hover:bg-muted'}`}
          >
            Theater
          </button>
        </div>
      ) : null}

      <div
        ref={frameRef}
        data-testid="work-video-frame"
        data-work-video-frame="true"
        className="relative w-full overflow-hidden rounded-xl border border-border/70 bg-black"
        onMouseMove={(event) => updatePreview(event.clientX, event.clientY)}
        onMouseLeave={() => clearPreview()}
        style={{
          aspectRatio: String(aspectRatio),
          maxHeight: allowDesktopResize
            ? desktopSizeMode === 'theater'
              ? 'clamp(20rem, 84vh, 56rem)'
              : desktopSizeMode === 'wide'
                ? 'clamp(18rem, 80vh, 50rem)'
                : 'clamp(16rem, 72vh, 42rem)'
            : 'clamp(16rem, 72vh, 42rem)',
        }}
      >
        <video
          ref={videoRef}
          controls
          preload="metadata"
          playsInline
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          onLoadedMetadata={(event) => syncMetadata(event.currentTarget)}
          onDurationChange={(event) => syncMetadata(event.currentTarget)}
          onPlay={() => {
            clearPreview()
            setIsPlaying(true)
          }}
          onPause={() => setIsPlaying(false)}
          onSeeking={() => clearPreview()}
          onError={() => setPlaybackError(true)}
          onContextMenu={(event) => event.preventDefault()}
          className="h-full w-full bg-black"
        >
          {!isHlsVideo ? <source src={video.playbackUrl ?? undefined} type={video.mimeType ?? 'video/mp4'} /> : null}
        </video>

        {!isPlaying ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <button
              type="button"
              data-testid="work-video-center-play"
              aria-label="Play video"
              onClick={() => void togglePlayback()}
              className="pointer-events-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur transition-colors hover:bg-black/70"
            >
              <Play className="h-7 w-7 translate-x-[2px]" />
            </button>
          </div>
        ) : null}

        {previewCue && previewTime !== null ? (
          <div
            data-testid="work-video-timeline-preview"
            className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-md border border-border/80 bg-black/90 p-1"
            style={{
              left: previewLeft,
              bottom: `${previewBottomOffsetPx}px`,
            }}
          >
            {video.timelinePreviewSpriteUrl ? (
              <div
                style={{
                  width: `${previewCue.width * timelinePreviewDisplayScale}px`,
                  height: `${previewCue.height * timelinePreviewDisplayScale}px`,
                  backgroundImage: `url(${video.timelinePreviewSpriteUrl})`,
                  backgroundPosition: `-${previewCue.x * timelinePreviewDisplayScale}px -${previewCue.y * timelinePreviewDisplayScale}px`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: `${previewSpriteSize.width * timelinePreviewDisplayScale}px ${previewSpriteSize.height * timelinePreviewDisplayScale}px`,
                }}
              />
            ) : null}
            <p className="mt-1 text-center text-[11px] tabular-nums text-white/90">
              {formatTimeLabel(previewTime)}
            </p>
          </div>
        ) : null}
        {playbackError ? (
          <div className="absolute inset-x-3 bottom-3 z-30 rounded-md border border-red-200 bg-background/95 px-3 py-2 text-sm text-red-700 shadow-sm dark:border-red-900/60 dark:text-red-300" role="alert">
            Video playback is unavailable.
          </div>
        ) : null}
      </div>
    </div>
  )
}
