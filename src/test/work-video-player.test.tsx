import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseTimelinePreviewVtt, timelinePreviewDisplayScale, WorkVideoPlayer } from '@/components/content/WorkVideoPlayer'

const hlsMocks = vi.hoisted(() => ({
  attachMedia: vi.fn(),
  destroy: vi.fn(),
  isSupported: vi.fn(() => true),
  loadSource: vi.fn(),
  constructor: vi.fn(),
}))

vi.mock('hls.js', () => {
  hlsMocks.constructor.mockImplementation(function MockHls() {
    return {
      attachMedia: hlsMocks.attachMedia,
      destroy: hlsMocks.destroy,
      loadSource: hlsMocks.loadSource,
    }
  })

  return {
    default: Object.assign(hlsMocks.constructor, {
      isSupported: hlsMocks.isSupported,
    }),
  }
})

describe('WorkVideoPlayer', () => {
  function stubDesktopPreviewEnvironment() {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('hover: hover') || query.includes('pointer: fine'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      media: query,
      onchange: null,
    })))
  }

  function stubTouchPreviewEnvironment() {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      media: query,
      onchange: null,
    })))
  }

  beforeEach(() => {
    hlsMocks.attachMedia.mockClear()
    hlsMocks.constructor.mockClear()
    hlsMocks.destroy.mockClear()
    hlsMocks.isSupported.mockClear()
    hlsMocks.isSupported.mockReturnValue(true)
    hlsMocks.loadSource.mockClear()
    stubDesktopPreviewEnvironment()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders YouTube videos with the nocookie embed domain', () => {
    render(
      <WorkVideoPlayer
        video={{
          id: 'video-1',
          sourceType: 'youtube',
          sourceKey: 'dQw4w9WgXcQ',
          sortOrder: 0,
        }}
      />,
    )

    expect(screen.getByTitle(/YouTube video/i)).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?playsinline=1&rel=0')
  })

  it('renders uploaded videos with a native video source', () => {
    const { container } = render(
      <WorkVideoPlayer
        video={{
          id: 'video-2',
          sourceType: 'local',
          sourceKey: 'videos/work-1/demo.mp4',
          playbackUrl: '/media/videos/work-1/demo.mp4',
          mimeType: 'video/mp4',
          sortOrder: 0,
        }}
      />,
    )

    expect(container.querySelector('video')).toBeTruthy()
  })

  it('restores native controls while reducing direct download affordances', () => {
    const { container } = render(
      <WorkVideoPlayer
        video={{
          id: 'video-guarded',
          sourceType: 'hls',
          sourceKey: 'local:videos/work-1/hls/master.m3u8',
          playbackUrl: '/media/videos/work-1/hls/master.m3u8',
          mimeType: 'application/vnd.apple.mpegurl',
          sortOrder: 0,
        }}
      />,
    )

    const video = container.querySelector('video')
    expect(video).toHaveAttribute('controls')
    expect(video).toHaveAttribute('controlsList', 'nodownload noremoteplayback')
    expect(video).toHaveAttribute('disablePictureInPicture')
  })

  it('shows a safe unavailable state for an HLS video that has no playable URL yet', () => {
    const { container } = render(
      <WorkVideoPlayer
        video={{
          id: 'video-processing',
          sourceType: 'hls',
          sourceKey: 'local:videos/work-1/video-processing/hls/master.m3u8',
          playbackUrl: null,
          mimeType: 'application/vnd.apple.mpegurl',
          sortOrder: 0,
        }}
      />,
    )

    expect(container.querySelector('video')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Video is still processing or unavailable.')
    expect(screen.queryByTestId('work-video-center-play')).not.toBeInTheDocument()
  })

  it('shows a safe unavailable state for incomplete uploaded video data', () => {
    const { container } = render(
      <WorkVideoPlayer
        video={{
          id: 'video-incomplete',
          sourceType: 'local',
          sourceKey: 'videos/work-1/incomplete.mp4',
          playbackUrl: null,
          mimeType: 'video/mp4',
          sortOrder: 0,
        }}
      />,
    )

    expect(container.querySelector('video')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Video is still processing or unavailable.')
    expect(screen.queryByText(/TypeError|Cannot read|stack/i)).not.toBeInTheDocument()
  })

  it('uses native HLS playback when the browser supports it', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably')

    const { container } = render(
      <WorkVideoPlayer
        video={{
          id: 'video-3',
          sourceType: 'hls',
          sourceKey: 'local:videos/work-1/hls/master.m3u8',
          playbackUrl: '/media/videos/work-1/hls/master.m3u8',
          mimeType: 'application/vnd.apple.mpegurl',
          sortOrder: 0,
        }}
      />,
    )

    const video = container.querySelector('video')
    await waitFor(() => expect(video).toHaveAttribute('src', '/media/videos/work-1/hls/master.m3u8'))
    expect(hlsMocks.constructor).not.toHaveBeenCalled()
  })

  it('lazily attaches hls.js when native HLS playback is unavailable', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('')

    const { container } = render(
      <WorkVideoPlayer
        video={{
          id: 'video-4',
          sourceType: 'hls',
          sourceKey: 'r2:videos/work-1/hls/master.m3u8',
          playbackUrl: 'https://cdn.example.com/videos/work-1/hls/master.m3u8',
          mimeType: 'application/vnd.apple.mpegurl',
          sortOrder: 0,
        }}
      />,
    )

    const video = container.querySelector('video')
    await waitFor(() => expect(hlsMocks.loadSource).toHaveBeenCalledWith('https://cdn.example.com/videos/work-1/hls/master.m3u8'))
    expect(hlsMocks.attachMedia).toHaveBeenCalledWith(video)
  })

  it('parses timeline preview VTT cues', () => {
    const cues = parseTimelinePreviewVtt(`WEBVTT

00:00:00.000 --> 00:00:05.000
timeline-sprite.jpg#xywh=0,0,320,180
`)

    expect(cues).toHaveLength(1)
    expect(cues[0]).toMatchObject({
      start: 0,
      end: 5,
      x: 0,
      y: 0,
      width: 320,
      height: 180,
    })
  })

  it('shows a center play overlay while paused and hides it after playback starts', async () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(async () => undefined)
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)

    const { container } = render(
      <WorkVideoPlayer
        video={{
          id: 'video-overlay',
          sourceType: 'local',
          sourceKey: 'videos/work-1/demo.mp4',
          playbackUrl: '/media/videos/work-1/demo.mp4',
          mimeType: 'video/mp4',
          sortOrder: 0,
        }}
      />,
    )

    const video = container.querySelector('video') as HTMLVideoElement
    expect(screen.getByTestId('work-video-center-play')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('work-video-center-play'))
    expect(playSpy).toHaveBeenCalledTimes(1)

    fireEvent.play(video)
    await waitFor(() => {
      expect(screen.queryByTestId('work-video-center-play')).not.toBeInTheDocument()
    })

    fireEvent.pause(video)
    expect(pauseSpy).not.toHaveBeenCalled()
    expect(screen.getByTestId('work-video-center-play')).toBeInTheDocument()
  })

  it('shows a smaller desktop-only hover preview when preview assets are available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`WEBVTT

00:00:00.000 --> 00:00:05.000
timeline-sprite.jpg#xywh=0,0,320,180
`, { status: 200 })))

    const { container } = render(
      <WorkVideoPlayer
        video={{
          id: 'video-preview',
          sourceType: 'hls',
          sourceKey: 'local:videos/work-1/hls/master.m3u8',
          playbackUrl: '/media/videos/work-1/hls/master.m3u8',
          mimeType: 'application/vnd.apple.mpegurl',
          durationSeconds: 20,
          timelinePreviewSpriteUrl: '/media/videos/work-1/hls/timeline-sprite.jpg',
          timelinePreviewVttUrl: '/media/videos/work-1/hls/timeline.vtt',
          sortOrder: 0,
        }}
      />,
    )

    const video = container.querySelector('video') as HTMLVideoElement
    Object.defineProperty(video, 'duration', { configurable: true, value: 20 })

    fireEvent.durationChange(video)

    const frame = screen.getByTestId('work-video-frame')
    Object.defineProperty(frame, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: 200,
        left: 0,
        height: 120,
        bottom: 120,
        top: 0,
        right: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    })
    expect(screen.queryByTestId('work-video-preview-region')).not.toBeInTheDocument()
    expect(frame.className).not.toContain('cursor-ew-resize')

    await waitFor(() => {
      fireEvent.mouseMove(frame, {
        clientX: 40,
        clientY: 100,
      })
      expect(screen.getByTestId('work-video-timeline-preview')).toBeInTheDocument()
    })

    const bubble = screen.getByTestId('work-video-timeline-preview')
    const previewImage = bubble.querySelector('div')
    expect(previewImage).toBeTruthy()

    const previewElement = previewImage as HTMLDivElement
    const width = Number.parseFloat(previewElement.style.width)
    const height = Number.parseFloat(previewElement.style.height)
    const [backgroundWidth, backgroundHeight] = previewElement.style.backgroundSize
      .split(' ')
      .map((value) => Number.parseFloat(value))

    expect(width).toBeCloseTo(320 * timelinePreviewDisplayScale, 4)
    expect(height).toBeCloseTo(180 * timelinePreviewDisplayScale, 4)
    expect(backgroundWidth).toBeCloseTo(width, 4)
    expect(backgroundHeight).toBeCloseTo(height, 4)
  })

  it('clears the preview bubble on pointer leave, playback start, seeking, and source changes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`WEBVTT

00:00:00.000 --> 00:00:05.000
timeline-sprite.jpg#xywh=0,0,320,180
`, { status: 200 })))

    const initialVideo = {
      id: 'video-preview-clear',
      sourceType: 'hls' as const,
      sourceKey: 'local:videos/work-1/hls/master.m3u8',
      playbackUrl: '/media/videos/work-1/hls/master.m3u8',
      mimeType: 'application/vnd.apple.mpegurl',
      durationSeconds: 20,
      timelinePreviewSpriteUrl: '/media/videos/work-1/hls/timeline-sprite.jpg',
      timelinePreviewVttUrl: '/media/videos/work-1/hls/timeline.vtt',
      sortOrder: 0,
    }

    const { container, rerender } = render(<WorkVideoPlayer video={initialVideo} />)

    const video = container.querySelector('video') as HTMLVideoElement
    Object.defineProperty(video, 'duration', { configurable: true, value: 20 })
    fireEvent.durationChange(video)

    const frame = screen.getByTestId('work-video-frame')
    Object.defineProperty(frame, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: 200,
        left: 0,
        height: 120,
        bottom: 120,
        top: 0,
        right: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    })
    expect(screen.queryByTestId('work-video-preview-region')).not.toBeInTheDocument()

    await waitFor(() => {
      fireEvent.mouseMove(frame, { clientX: 40, clientY: 96 })
      expect(screen.getByTestId('work-video-timeline-preview')).toBeInTheDocument()
    })

    fireEvent.mouseLeave(frame)
    await waitFor(() => {
      expect(screen.queryByTestId('work-video-timeline-preview')).not.toBeInTheDocument()
    })

    fireEvent.mouseMove(frame, { clientX: 40, clientY: 96 })
    await waitFor(() => {
      expect(screen.getByTestId('work-video-timeline-preview')).toBeInTheDocument()
    })

    fireEvent.play(video)
    await waitFor(() => {
      expect(screen.queryByTestId('work-video-timeline-preview')).not.toBeInTheDocument()
    })

    fireEvent.mouseMove(frame, { clientX: 40, clientY: 96 })
    await waitFor(() => {
      expect(screen.getByTestId('work-video-timeline-preview')).toBeInTheDocument()
    })

    fireEvent.seeking(video)
    await waitFor(() => {
      expect(screen.queryByTestId('work-video-timeline-preview')).not.toBeInTheDocument()
    })

    rerender(
      <WorkVideoPlayer
        video={{
          ...initialVideo,
          id: 'video-preview-cleared-next',
          playbackUrl: '/media/videos/work-2/hls/master.m3u8',
          timelinePreviewSpriteUrl: null,
          timelinePreviewVttUrl: null,
        }}
      />,
    )

    await waitFor(() => {
      expect(screen.queryByTestId('work-video-timeline-preview')).not.toBeInTheDocument()
    })
  })

  it('disables timeline preview on touch/mobile environments', async () => {
    stubTouchPreviewEnvironment()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`WEBVTT

00:00:00.000 --> 00:00:05.000
timeline-sprite.jpg#xywh=0,0,320,180
`, { status: 200 })))

    render(
      <WorkVideoPlayer
        video={{
          id: 'video-touch-preview',
          sourceType: 'hls',
          sourceKey: 'local:videos/work-1/hls/master.m3u8',
          playbackUrl: '/media/videos/work-1/hls/master.m3u8',
          mimeType: 'application/vnd.apple.mpegurl',
          durationSeconds: 20,
          timelinePreviewSpriteUrl: '/media/videos/work-1/hls/timeline-sprite.jpg',
          timelinePreviewVttUrl: '/media/videos/work-1/hls/timeline.vtt',
          sortOrder: 0,
        }}
      />,
    )

    await waitFor(() => {
      expect(screen.queryByTestId('work-video-preview-region')).not.toBeInTheDocument()
    })
    expect(screen.queryByTestId('work-video-timeline-preview')).not.toBeInTheDocument()
  })

  it('supports desktop resize modes when enabled', () => {
    render(
      <WorkVideoPlayer
        video={{
          id: 'video-size',
          sourceType: 'local',
          sourceKey: 'videos/work-1/demo.mp4',
          playbackUrl: '/media/videos/work-1/demo.mp4',
          mimeType: 'video/mp4',
          sortOrder: 0,
        }}
        allowDesktopResize
      />,
    )

    const player = screen.getByTestId('work-video-player')
    expect(player).toHaveAttribute('data-size-mode', 'wide')

    fireEvent.click(screen.getByTestId('work-video-size-fit'))
    expect(player).toHaveAttribute('data-size-mode', 'fit')

    fireEvent.click(screen.getByTestId('work-video-size-theater'))
    expect(player).toHaveAttribute('data-size-mode', 'theater')
  })
})
