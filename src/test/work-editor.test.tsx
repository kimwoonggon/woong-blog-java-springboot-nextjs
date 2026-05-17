import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkEditor } from '@/components/admin/WorkEditor'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  pathname: '/admin/works/new',
  searchParams: 'returnTo=%2Fadmin%2Fworks',
  fetchWithCsrf: vi.fn(),
  extractVideoFrameThumbnailBlob: vi.fn(),
  fetchRemoteImageBlob: vi.fn(),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace, refresh: mocks.refresh, back: mocks.back }),
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => <img src={src} alt={alt} {...props} />,
}))

vi.mock('sonner', () => ({ toast: mocks.toast }))

vi.mock('@/lib/api/browser', () => ({
  getBrowserApiBaseUrl: () => '/api',
}))

vi.mock('@/lib/api/auth', () => ({
  fetchWithCsrf: mocks.fetchWithCsrf,
}))

vi.mock('@/lib/content/work-auto-thumbnail', () => ({
  extractVideoFrameThumbnailBlob: mocks.extractVideoFrameThumbnailBlob,
  fetchRemoteImageBlob: mocks.fetchRemoteImageBlob,
}))

vi.mock('@/components/content/WorkVideoPlayer', () => ({
  WorkVideoPlayer: ({ video }: { video: { sourceType?: string } }) => (
    <div
      data-testid="mock-work-video-player"
      title={video.sourceType === 'youtube' ? 'YouTube video' : 'Uploaded video'}
    />
  ),
}))

vi.mock('@/components/admin/TiptapEditor', async () => {
  const React = await import('react')

  return {
    TiptapEditor: ({
      content,
      onChange,
      workVideos = [],
      insertVideoEmbedRequest,
      onVideoInsertHandled,
    }: {
      content: string
      onChange: (value: string) => void
      workVideos?: Array<{ id: string }>
      insertVideoEmbedRequest?: { videoId: string; nonce: number } | null
      onVideoInsertHandled?: (result: { inserted: boolean; reason?: 'duplicate' | 'missing' }) => void
    }) => {
      React.useEffect(() => {
        if (!insertVideoEmbedRequest) {
          return
        }

        const videoExists = workVideos.some((video) => video.id === insertVideoEmbedRequest.videoId)
        if (!videoExists) {
          onVideoInsertHandled?.({ inserted: false, reason: 'missing' })
          return
        }

        if (content.includes(`data-video-id="${insertVideoEmbedRequest.videoId}"`)) {
          onVideoInsertHandled?.({ inserted: false, reason: 'duplicate' })
          return
        }

        onChange(`${content}<work-video-embed data-video-id="${insertVideoEmbedRequest.videoId}"></work-video-embed>`)
        onVideoInsertHandled?.({ inserted: true })
      }, [content, insertVideoEmbedRequest, onChange, onVideoInsertHandled, workVideos])

      return (
        <textarea
          aria-label="Mock work content"
          value={content}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    },
  }
})

function okJson(payload: unknown) {
  return {
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => payload,
    text: async () => '',
  }
}

function errorJson(error: string, status = 400) {
  return {
    ok: false,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ error }),
    text: async () => JSON.stringify({ error }),
  }
}

function hlsMutationPayload() {
  return {
    videos_version: 1,
    videos: [{
      id: 'video-1',
      sourceType: 'hls',
      sourceKey: 'local:videos/work-1/video-1/hls/master.m3u8',
      playbackUrl: '/media/videos/work-1/video-1/hls/master.m3u8',
      mimeType: 'application/vnd.apple.mpegurl',
      sortOrder: 0,
    }],
  }
}

function existingWork(overrides: Record<string, unknown> = {}) {
  return {
    id: 'work-1',
    title: 'Existing work',
    category: 'platform',
    tags: [],
    published: true,
    content: { html: '<p>Existing</p>' },
    all_properties: {},
    videos_version: 0,
    videos: [],
    ...overrides,
  }
}

function youtubeVideo(id: string, sourceKey: string, sortOrder: number) {
  return {
    id,
    sourceType: 'youtube' as const,
    sourceKey,
    sortOrder,
  }
}

describe('WorkEditor', () => {
  const changeContent = (value: string) => {
    fireEvent.change(screen.getByLabelText('Mock work content'), {
      target: { value },
    })
  }

  const addMetadataField = (key: string, value: string) => {
    fireEvent.click(screen.getByRole('button', { name: /Add Field/i }))
    fireEvent.change(screen.getAllByLabelText('Key')[0], { target: { value: key } })
    fireEvent.change(screen.getAllByLabelText('Value')[0], { target: { value } })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchWithCsrf.mockReset()
    mocks.extractVideoFrameThumbnailBlob.mockReset()
    mocks.fetchRemoteImageBlob.mockReset()
    mocks.pathname = '/admin/works/new'
    mocks.searchParams = 'returnTo=%2Fadmin%2Fworks'
    vi.stubGlobal('fetch', vi.fn())
    mocks.extractVideoFrameThumbnailBlob.mockResolvedValue(new Blob(['thumb'], { type: 'image/jpeg' }))
    mocks.fetchRemoteImageBlob.mockResolvedValue(new Blob(['thumb'], { type: 'image/jpeg' }))
    mocks.fetchWithCsrf.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({}),
      text: async () => '',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('surfaces HLS processing errors when the backend rejects a video upload', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce({
      ok: false,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'MP4 must be H.264/AAC compatible for copy-mode HLS.' }),
      text: async () => JSON.stringify({ error: 'MP4 must be H.264/AAC compatible for copy-mode HLS.' }),
    })

    render(
      <WorkEditor
        initialWork={{
          id: 'work-1',
          title: 'Existing work',
          category: 'platform',
          tags: [],
          published: true,
          content: { html: '<p>Existing</p>' },
          all_properties: {},
          videos_version: 0,
          videos: [],
        }}
      />,
    )

    const fileInput = screen.getByLabelText('Upload MP4 Video as HLS')
    const file = new File(['\x00\x00\x00\x18ftypmp42'], 'demo.mp4', { type: 'video/mp4' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('MP4 must be H.264/AAC compatible for copy-mode HLS.')
    })
  })

  it('shows staged HLS upload progress text while an uploaded video is being prepared', async () => {
    mocks.fetchWithCsrf.mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      return okJson(hlsMutationPayload()) as Response
    })

    render(
      <WorkEditor
        initialWork={{
          id: 'work-1',
          title: 'Existing work',
          category: 'platform',
          tags: [],
          published: true,
          thumbnail_asset_id: 'thumb-manual',
          thumbnail_url: '/media/work-thumbnails/existing.jpg',
          content: { html: '<p>Existing</p>' },
          all_properties: {},
          videos_version: 0,
          videos: [],
        }}
      />,
    )

    const fileInput = screen.getByLabelText('Upload MP4 Video as HLS')
    const file = new File(['\x00\x00\x00\x18ftypmp42'], 'demo.mp4', { type: 'video/mp4' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(screen.getByTestId('work-video-upload-status')).toHaveTextContent('demo.mp4 업로드 중...')

    await waitFor(() => {
      expect(screen.getByTestId('work-video-upload-status')).toHaveTextContent('demo.mp4 처리 중...')
    })

    await waitFor(() => {
      expect(screen.getByTestId('work-video-upload-status')).toHaveTextContent('demo.mp4 준비 완료')
    })
  }, 5000)

  it('accepts flexible metadata through structured key/value inputs', async () => {
    render(<WorkEditor />)

    expect(screen.queryByLabelText('Flexible Metadata (JSON)')).not.toBeInTheDocument()
    addMetadataField('role', 'Lead Frontend Engineer')
    expect(screen.getAllByLabelText('Key')[0]).toHaveValue('role')
    expect(screen.getAllByLabelText('Value')[0]).toHaveValue('Lead Frontend Engineer')
  })

  it('creates a work and normalizes tags and metadata before returning to the list', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 'work-1', slug: 'work-title' }),
      text: async () => '',
    })

    render(<WorkEditor />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Work title' } })
    fireEvent.change(screen.getByLabelText('Project Period'), { target: { value: '2024.01 - 2024.03' } })
    fireEvent.change(screen.getByLabelText('Tags (comma separated)'), {
      target: { value: 'alpha, beta ,, gamma ' },
    })
    addMetadataField('score', '1')
    changeContent('<p>Hello</p>')

    fireEvent.click(screen.getByRole('button', { name: /Create Work/i }))

    await waitFor(() => {
      expect(mocks.toast.success).toHaveBeenCalledWith('Work created successfully')
    })

    expect(mocks.fetchWithCsrf).toHaveBeenCalledWith(
      '/api/admin/works',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Work title',
          category: 'Uncategorized',
          period: '2024.01 - 2024.03',
          tags: ['alpha', 'beta', 'gamma'],
          published: true,
          contentJson: JSON.stringify({ html: '<p>Hello</p>' }),
          allPropertiesJson: JSON.stringify({ score: '1' }),
          thumbnailAssetId: null,
          iconAssetId: null,
        }),
      }),
    )
    expect(mocks.push).toHaveBeenCalledWith('/admin/works')
  })

  it('sanitizes technical save failures without clearing work input', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce(errorJson('SQLSTATE 08006 stack trace from WoongBlog.Api status 500', 500))

    render(<WorkEditor />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Work draft' } })
    fireEvent.change(screen.getByLabelText('Project Period'), { target: { value: '2024.01 - 2024.03' } })
    changeContent('<p>Work body should stay</p>')
    fireEvent.click(screen.getByRole('button', { name: /Create Work/i }))

    expect(await screen.findByTestId('admin-work-form-error')).toHaveTextContent(
      'Work could not be saved. Please retry after the backend is healthy.',
    )
    expect(mocks.toast.error).toHaveBeenCalledWith('Work could not be saved. Please retry after the backend is healthy.')
    expect(screen.getByLabelText('Title')).toHaveValue('Work draft')
    expect(screen.getByLabelText('Project Period')).toHaveValue('2024.01 - 2024.03')
    expect(screen.getByLabelText('Mock work content')).toHaveValue('<p>Work body should stay</p>')
  })

  it('stores share message under all_properties.socialShareMessage when saving', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce(okJson({ id: 'work-share', slug: 'work-share' }))

    render(<WorkEditor />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Share-ready work' } })
    fireEvent.change(screen.getByLabelText('Share Message'), { target: { value: 'This message should be used for sharing.' } })
    changeContent('<p>Share-ready body</p>')

    fireEvent.click(screen.getByRole('button', { name: /Create Work/i }))

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/admin/works',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Share-ready work',
            category: 'Uncategorized',
            period: '',
            tags: [],
            published: true,
            contentJson: JSON.stringify({ html: '<p>Share-ready body</p>' }),
            allPropertiesJson: JSON.stringify({ socialShareMessage: 'This message should be used for sharing.' }),
            thumbnailAssetId: null,
            iconAssetId: null,
          }),
        }),
      )
    })
  })

  it('allows save completion after video-only edits on an existing work', async () => {
    mocks.fetchWithCsrf
      .mockResolvedValueOnce(okJson(hlsMutationPayload()))
      .mockResolvedValueOnce(okJson({ id: 'thumb-1', url: '/media/work-thumbnails/thumb-1.jpg' }))
      .mockResolvedValueOnce(okJson({ id: 'work-1', slug: 'existing-work' }))

    render(
      <WorkEditor
        initialWork={{
          id: 'work-1',
          title: 'Existing work',
          slug: 'existing-work',
          category: 'platform',
          tags: [],
          published: true,
          content: { html: '<p>Existing</p>' },
          all_properties: {},
          videos_version: 0,
          videos: [],
        }}
      />,
    )

    const saveButton = screen.getByRole('button', { name: /Update Work/i })
    expect(saveButton).toBeDisabled()

    const fileInput = screen.getByLabelText('Upload MP4 Video as HLS')
    const file = new File(['\x00\x00\x00\x18ftypmp42'], 'demo.mp4', { type: 'video/mp4' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(saveButton).toBeEnabled()
    })

    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/admin/works')
    })
    expect(mocks.toast.success).toHaveBeenCalledWith('Work updated successfully')
  })

  it('stages create-time videos and runs create-plus-attach flow', async () => {
    mocks.fetchWithCsrf
      .mockResolvedValueOnce(okJson({ id: 'work-1', slug: 'work-title' }))
      .mockResolvedValueOnce(okJson(hlsMutationPayload()))
      .mockResolvedValueOnce(okJson({ id: 'thumb-1', url: '/media/work-thumbnails/thumb-1.jpg' }))
      .mockResolvedValueOnce(okJson({ id: 'work-1', slug: 'work-title' }))

    render(<WorkEditor />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Work title' } })
    changeContent('<p>Hello</p>')

    const fileInput = screen.getByLabelText('Upload MP4 Video as HLS')
    const file = new File(['\x00\x00\x00\x18ftypmp42'], 'demo.mp4', { type: 'video/mp4' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(screen.getByText('demo.mp4')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Create Work/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create with Videos/i })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: /Create with Videos/i }))

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenNthCalledWith(
        2,
        '/api/admin/works/work-1/videos/hls-job',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    expect(mocks.fetchWithCsrf).toHaveBeenNthCalledWith(
      3,
      '/api/uploads',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    )
    expect(mocks.fetchWithCsrf).toHaveBeenNthCalledWith(
      4,
      '/api/admin/works/work-1',
      expect.objectContaining({ method: 'PUT' }),
    )
    expect(mocks.toast.success).toHaveBeenCalledWith('Work and videos created successfully')
    expect(mocks.push).toHaveBeenCalledWith('/admin/works/work-1?videoInline=1')
  })

  it('stages create-time videos when crypto.randomUUID is unavailable', async () => {
    const originalCrypto = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {},
    })

    try {
      render(<WorkEditor />)

      fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Fallback ID Work' } })
      changeContent('<p>Fallback ID body</p>')
      fireEvent.change(screen.getByLabelText('YouTube URL or ID'), { target: { value: 'dQw4w9WgXcQ' } })
      fireEvent.click(screen.getByRole('button', { name: /Add YouTube Video/i }))

      expect(screen.getByText('dQw4w9WgXcQ')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Create with Videos/i })).toBeEnabled()
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: originalCrypto,
      })
    }
  })

  it('rejects an invalid YouTube URL without staging a video', () => {
    render(<WorkEditor />)

    fireEvent.change(screen.getByLabelText('YouTube URL or ID'), { target: { value: 'not a youtube url' } })
    fireEvent.click(screen.getByRole('button', { name: /Add YouTube Video/i }))

    expect(mocks.toast.error).toHaveBeenCalledWith('Enter a valid YouTube URL or video ID.')
    expect(mocks.fetchWithCsrf).not.toHaveBeenCalled()
    expect(screen.queryByTestId('staged-video-card')).not.toBeInTheDocument()
    expect(screen.getByLabelText('YouTube URL or ID')).toHaveValue('not a youtube url')
    expect(screen.queryByRole('button', { name: /Create with Videos/i })).not.toBeInTheDocument()
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })

  it('surfaces backend YouTube validation errors without clearing editor state', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce(errorJson('Invalid YouTube URL.', 400))

    render(<WorkEditor initialWork={existingWork()} />)

    changeContent('<p>Edited body</p>')
    fireEvent.change(screen.getByLabelText('YouTube URL or ID'), { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } })
    fireEvent.click(screen.getByRole('button', { name: /Add YouTube Video/i }))

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Invalid YouTube URL.')
    })

    expect(screen.queryByTestId('mock-work-video-player')).not.toBeInTheDocument()
    expect(screen.getByLabelText('YouTube URL or ID')).toHaveValue('https://youtu.be/dQw4w9WgXcQ')
    expect(screen.getByLabelText('Mock work content')).toHaveValue('<p>Edited body</p>')
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })

  it('surfaces duplicate YouTube conflicts without adding a video', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce(errorJson('This YouTube video is already attached.', 409))

    render(<WorkEditor initialWork={existingWork({ videos_version: 4 })} />)

    fireEvent.change(screen.getByLabelText('YouTube URL or ID'), { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } })
    fireEvent.click(screen.getByRole('button', { name: /Add YouTube Video/i }))

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('This YouTube video is already attached.')
    })

    expect(mocks.fetchWithCsrf).toHaveBeenCalledWith(
      '/api/admin/works/work-1/videos/youtube',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          youtubeUrlOrId: 'https://youtu.be/dQw4w9WgXcQ',
          expectedVideosVersion: 4,
        }),
      }),
    )
    expect(screen.queryByTestId('mock-work-video-player')).not.toBeInTheDocument()
    expect(screen.getByLabelText('YouTube URL or ID')).toHaveValue('https://youtu.be/dQw4w9WgXcQ')
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })

  it('loads an existing work editor with metadata and video controls when crypto.randomUUID is unavailable', () => {
    const originalCrypto = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID: undefined },
    })

    try {
      render(
        <WorkEditor
          initialWork={{
            id: 'work-1',
            title: 'Existing work',
            slug: 'existing-work',
            category: 'platform',
            tags: ['video'],
            published: true,
            content: { html: '<p>Existing body</p>' },
            all_properties: {
              role: 'Lead',
              socialShareMessage: 'Share this work',
            },
            videos_version: 0,
            videos: [],
          }}
        />,
      )

      expect(screen.getByDisplayValue('Existing work')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Lead')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Share this work')).toBeInTheDocument()
      expect(screen.getByLabelText('Upload MP4 Video as HLS')).toBeInTheDocument()
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: originalCrypto,
      })
    }
  })

  it('uses onSaved instead of redirecting for public inline text-only create', async () => {
    const onSaved = vi.fn()

    mocks.fetchWithCsrf.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 'work-1', slug: 'inline-work-title' }),
      text: async () => '',
    })

    render(<WorkEditor inlineMode onSaved={onSaved} />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Inline Work Title' } })
    changeContent('<p>Hello</p>')
    fireEvent.click(screen.getByRole('button', { name: /Create Work/i }))

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith({
        id: 'work-1',
        slug: 'inline-work-title',
        isEditing: false,
      })
    })

    expect(mocks.push).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('uses onSaved instead of redirecting for public inline create with staged videos', async () => {
    const onSaved = vi.fn()

    mocks.fetchWithCsrf
      .mockResolvedValueOnce(okJson({ id: 'work-1', slug: 'inline-video-work' }))
      .mockResolvedValueOnce(okJson(hlsMutationPayload()))
      .mockResolvedValueOnce(okJson({ id: 'thumb-1', url: '/media/work-thumbnails/thumb-1.jpg' }))
      .mockResolvedValueOnce(okJson({ id: 'work-1', slug: 'inline-video-work' }))

    render(<WorkEditor inlineMode onSaved={onSaved} />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Inline video work' } })
    changeContent('<p>Hello</p>')
    const fileInput = screen.getByLabelText('Upload MP4 Video as HLS')
    const file = new File(['\x00\x00\x00\x18ftypmp42'], 'demo.mp4', { type: 'video/mp4' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    fireEvent.click(screen.getByRole('button', { name: /Create with Videos/i }))

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith({
        id: 'work-1',
        slug: 'inline-video-work',
        isEditing: false,
      })
    })

    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('ignores unsafe public inline work returnTo paths after edit save', async () => {
    mocks.pathname = '/works/existing-work'
    mocks.searchParams = 'returnTo=%2F%2Fevil.example'
    mocks.fetchWithCsrf.mockResolvedValueOnce(okJson({ id: 'work-1', slug: 'updated-work' }))

    render(
      <WorkEditor
        inlineMode
        initialWork={existingWork({
          slug: 'existing-work',
          title: 'Existing work',
        })}
      />,
    )

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated work' } })
    changeContent('<p>Updated inline body</p>')
    fireEvent.click(screen.getByRole('button', { name: /Update Work/i }))

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/admin/works/work-1',
        expect.objectContaining({ method: 'PUT' }),
      )
    })

    expect(mocks.push).not.toHaveBeenCalledWith('//evil.example')
    expect(mocks.replace).toHaveBeenCalledWith('/works/updated-work')
    expect(mocks.refresh).toHaveBeenCalled()
    expect(screen.getByLabelText('Title')).toHaveValue('Updated work')
    expect(screen.getByLabelText('Mock work content')).toHaveValue('<p>Updated inline body</p>')
  })

  it('preserves inline work edits and does not navigate on sanitized save failure', async () => {
    mocks.pathname = '/works/existing-work'
    mocks.searchParams = 'returnTo=%2Fworks%3Fpage%3D2'
    mocks.fetchWithCsrf.mockResolvedValueOnce(errorJson('SQLSTATE 08006 stack trace status 500', 500))

    render(
      <WorkEditor
        inlineMode
        initialWork={existingWork({
          slug: 'existing-work',
          title: 'Existing work',
        })}
      />,
    )

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Failed inline work' } })
    changeContent('<p>Draft survives</p>')
    fireEvent.click(screen.getByRole('button', { name: /Update Work/i }))

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Work could not be saved. Please retry after the backend is healthy.')
    })
    expect(mocks.push).not.toHaveBeenCalled()
    expect(mocks.replace).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Title')).toHaveValue('Failed inline work')
    expect(screen.getByLabelText('Mock work content')).toHaveValue('<p>Draft survives</p>')
  })

  it('uploads a thumbnail preview and lets the user remove it', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 'thumb-1', url: '/media/thumb-1.png' }),
      text: async () => '',
    })

    render(<WorkEditor />)

    const thumbnailInput = screen.getByLabelText('Thumbnail Image')
    const file = new File(['thumb'], 'thumb.png', { type: 'image/png' })
    fireEvent.change(thumbnailInput, { target: { files: [file] } })

    await waitFor(() => {
    expect(screen.getByRole('img', { name: 'Work thumbnail preview' })).toBeInTheDocument()
    })

    expect(mocks.fetchWithCsrf).toHaveBeenCalledWith(
      '/api/uploads',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Remove Thumbnail/i }))
    expect(screen.queryByRole('img', { name: 'Work thumbnail preview' })).not.toBeInTheDocument()
  })

  it('rejects invalid thumbnail files without clearing form state or uploading', async () => {
    render(<WorkEditor />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Media validation work' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'media' } })
    addMetadataField('role', 'Lead')
    changeContent('<p>Keep this body</p>')

    const thumbnailInput = screen.getByLabelText('Thumbnail Image')
    const file = new File(['plain text'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(thumbnailInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Please upload an image file for thumbnail.')
    })
    expect(mocks.fetchWithCsrf).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Title')).toHaveValue('Media validation work')
    expect(screen.getByLabelText('Category')).toHaveValue('media')
    expect(screen.getAllByLabelText('Value')[0]).toHaveValue('Lead')
    expect(screen.getByLabelText('Mock work content')).toHaveValue('<p>Keep this body</p>')
    expect(screen.queryByRole('img', { name: 'Work thumbnail preview' })).not.toBeInTheDocument()
  })

  it('sanitizes thumbnail upload failures without clearing title/body/metadata', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce(errorJson('Cloudflare R2 storage offline stack trace status 500', 500))

    render(<WorkEditor />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Upload failure work' } })
    addMetadataField('role', 'Owner')
    changeContent('<p>Still here</p>')

    const thumbnailInput = screen.getByLabelText('Thumbnail Image')
    const file = new File(['thumb'], 'thumb.png', { type: 'image/png' })
    fireEvent.change(thumbnailInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith(
        'Failed to upload thumbnail: Thumbnail could not be uploaded. Please retry after storage is healthy.',
      )
    })
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringContaining('Cloudflare'))
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringContaining('stack trace'))
    expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Title')).toHaveValue('Upload failure work')
    expect(screen.getAllByLabelText('Value')[0]).toHaveValue('Owner')
    expect(screen.getByLabelText('Mock work content')).toHaveValue('<p>Still here</p>')
    expect(screen.queryByRole('img', { name: 'Work thumbnail preview' })).not.toBeInTheDocument()
  })

  it('uploads an icon preview and lets the user remove it', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce(okJson({ id: 'icon-1', url: '/media/icon-1.png' }))

    render(<WorkEditor />)

    const iconInput = screen.getByLabelText('Icon Image')
    const file = new File(['icon'], 'icon.png', { type: 'image/png' })
    fireEvent.change(iconInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Work icon preview' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Remove Icon/i }))
    expect(screen.queryByRole('img', { name: 'Work icon preview' })).not.toBeInTheDocument()
  })

  it('rejects invalid icon files without uploading or showing success', async () => {
    render(<WorkEditor />)

    const iconInput = screen.getByLabelText('Icon Image')
    const file = new File(['plain text'], 'icon.txt', { type: 'text/plain' })
    fireEvent.change(iconInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Please upload an image file for icon.')
    })
    expect(mocks.fetchWithCsrf).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(screen.queryByRole('img', { name: 'Work icon preview' })).not.toBeInTheDocument()
  })

  it('sanitizes icon upload failures without replacing the existing preview', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce(errorJson('S3 bucket upload exception status 500', 500))

    render(
      <WorkEditor
        initialWork={{
          id: 'work-1',
          title: 'Existing work',
          category: 'platform',
          tags: [],
          published: true,
          content: { html: '<p>Existing</p>' },
          all_properties: {},
          icon_asset_id: 'icon-existing',
          icon_url: '/media/work-icons/existing.png',
          videos_version: 0,
          videos: [],
        }}
      />,
    )

    const iconInput = screen.getByLabelText('Icon Image')
    const file = new File(['icon'], 'icon.png', { type: 'image/png' })
    fireEvent.change(iconInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith(
        'Failed to upload icon: Icon could not be uploaded. Please retry after storage is healthy.',
      )
    })
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringContaining('S3 bucket'))
    expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(screen.getByRole('img', { name: 'Work icon preview' })).toHaveAttribute('src', '/media/work-icons/existing.png')
  })

  it('rejects unsupported video files before staging or uploading', async () => {
    render(<WorkEditor />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Video validation work' } })
    changeContent('<p>Video draft body</p>')

    const fileInput = screen.getByLabelText('Upload MP4 Video as HLS')
    const file = new File(['mov'], 'demo.mov', { type: 'video/quicktime' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Please upload an MP4 video file.')
    })
    expect(screen.queryByTestId('staged-video-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('work-video-upload-status')).not.toBeInTheDocument()
    expect(mocks.fetchWithCsrf).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Title')).toHaveValue('Video validation work')
    expect(screen.getByLabelText('Mock work content')).toHaveValue('<p>Video draft body</p>')
  })

  it('adds a YouTube video for an existing work', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        videos_version: 3,
        videos: [{
          id: 'video-1',
          sourceType: 'youtube',
          sourceKey: 'dQw4w9WgXcQ',
          playbackUrl: null,
          originalFileName: null,
          mimeType: null,
          fileSize: null,
          sortOrder: 0,
          createdAt: '2026-04-10T00:00:00.000Z',
        }],
      }),
      text: async () => '',
    })

    render(
      <WorkEditor
        initialWork={{
          id: 'work-1',
          title: 'Existing work',
          category: 'platform',
          tags: [],
          published: true,
          content: { html: '<p>Existing</p>' },
          all_properties: {},
          videos_version: 2,
          videos: [],
        }}
      />,
    )

    fireEvent.change(screen.getByLabelText('YouTube URL or ID'), { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } })
    fireEvent.click(screen.getByRole('button', { name: /Add YouTube Video/i }))

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/admin/works/work-1/videos/youtube',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            youtubeUrlOrId: 'https://youtu.be/dQw4w9WgXcQ',
            expectedVideosVersion: 2,
          }),
        }),
      )
    })

    expect(mocks.toast.success).toHaveBeenCalledWith('YouTube video added.')
    await waitFor(() => {
      expect(screen.getByTestId('mock-work-video-player')).toHaveAttribute('title', 'YouTube video')
    })
  })

  it('auto-generates a thumbnail from an uploaded video when there is no explicit thumbnail', async () => {
    mocks.fetchWithCsrf
      .mockResolvedValueOnce(okJson(hlsMutationPayload()))
      .mockResolvedValueOnce(okJson({ id: 'thumb-1', url: '/media/work-thumbnails/thumb-1.jpg' }))

    render(
      <WorkEditor
        initialWork={{
          id: 'work-1',
          title: 'Existing work',
          category: 'platform',
          tags: [],
          published: true,
          content: { html: '<p>Existing</p>' },
          all_properties: {},
          videos_version: 0,
          videos: [],
        }}
      />,
    )

    const fileInput = screen.getByLabelText('Upload MP4 Video as HLS')
    const file = new File(['\x00\x00\x00\x18ftypmp42'], 'demo.mp4', { type: 'video/mp4' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenNthCalledWith(
        2,
        '/api/uploads',
        expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
      )
    })

    expect(mocks.extractVideoFrameThumbnailBlob).toHaveBeenCalledWith(file)
    expect(screen.getByTestId('work-thumbnail-source')).toHaveTextContent('uploaded video')
    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Work thumbnail preview' })).toHaveAttribute('src', '/media/work-thumbnails/thumb-1.jpg')
    })
  })

  it('does not mark create-time HLS upload complete when attaching the staged video fails', async () => {
    mocks.fetchWithCsrf
      .mockResolvedValueOnce(okJson({ id: 'work-1', slug: 'work-title' }))
      .mockResolvedValueOnce(errorJson('Failed to prepare HLS job.', 500))

    render(<WorkEditor />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Work title' } })
    changeContent('<p>Hello</p>')
    const fileInput = screen.getByLabelText('Upload MP4 Video as HLS')
    const file = new File(['\x00\x00\x00\x18ftypmp42'], 'demo.mp4', { type: 'video/mp4' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    fireEvent.click(screen.getByRole('button', { name: /Create with Videos/i }))

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Failed to prepare HLS job.')
    })

    await new Promise((resolve) => setTimeout(resolve, 800))

    expect(screen.queryByTestId('work-video-upload-status')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-work-video-player')).not.toBeInTheDocument()
    expect(mocks.toast.success).not.toHaveBeenCalledWith('Work and videos created successfully')
    expect(mocks.push).toHaveBeenCalledWith('/admin/works/work-1')
  }, 7000)

  it('sanitizes existing-work HLS upload failures and clears transient upload status', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce(errorJson('Cloudflare R2 CORS stack trace status 500', 500))

    render(
      <WorkEditor
        initialWork={{
          id: 'work-1',
          title: 'Existing work',
          category: 'platform',
          tags: [],
          published: true,
          content: { html: '<p>Existing</p>' },
          all_properties: {},
          videos_version: 0,
          videos: [],
        }}
      />,
    )

    const fileInput = screen.getByLabelText('Upload MP4 Video as HLS')
    const file = new File(['\x00\x00\x00\x18ftypmp42'], 'demo.mp4', { type: 'video/mp4' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith(
        'Video could not be uploaded. Please retry after storage is healthy.',
      )
    })
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringContaining('Cloudflare'))
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringContaining('stack trace'))
    expect(screen.queryByTestId('work-video-upload-status')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-work-video-player')).not.toBeInTheDocument()
  })

  it('persists auto-generated uploaded-video thumbnails immediately for existing works', async () => {
    mocks.fetchWithCsrf
      .mockResolvedValueOnce(okJson(hlsMutationPayload()))
      .mockResolvedValueOnce(okJson({ id: 'thumb-1', url: '/media/work-thumbnails/thumb-1.jpg' }))
      .mockResolvedValueOnce(okJson({ id: 'work-1', slug: 'existing-work' }))
      .mockResolvedValueOnce(okJson({}))

    render(
      <WorkEditor
        initialWork={{
          id: 'work-1',
          title: 'Existing work',
          category: 'platform',
          tags: [],
          published: true,
          content: { html: '<p>Existing</p>' },
          all_properties: {},
          videos_version: 0,
          videos: [],
        }}
      />,
    )

    const fileInput = screen.getByLabelText('Upload MP4 Video as HLS')
    const file = new File(['\x00\x00\x00\x18ftypmp42'], 'demo.mp4', { type: 'video/mp4' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenNthCalledWith(
        3,
        '/api/admin/works/work-1',
        expect.objectContaining({ method: 'PUT' }),
      )
    })
    expect(mocks.fetchWithCsrf).toHaveBeenCalledWith(
      '/revalidate-public',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ paths: ['/', '/works', '/works/existing-work'] }),
      }),
    )
    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Work thumbnail preview' })).toHaveAttribute('src', '/media/work-thumbnails/thumb-1.jpg')
    })
  })

  it('renders explicit copy that videos save immediately in edit mode', () => {
    render(
      <WorkEditor
        initialWork={{
          id: 'work-1',
          title: 'Existing work',
          category: 'platform',
          tags: [],
          published: true,
          content: { html: '<p>Existing</p>' },
          all_properties: {},
          videos_version: 0,
          videos: [],
        }}
      />,
    )

    expect(screen.getByText(/Videos save immediately\./i)).toBeInTheDocument()
  })

  it('does not auto-generate a thumbnail when an explicit thumbnail already exists', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        videos_version: 3,
        videos: [{
          id: 'video-1',
          sourceType: 'youtube',
          sourceKey: 'dQw4w9WgXcQ',
          sortOrder: 0,
        }],
      }),
      text: async () => '',
    })

    render(
      <WorkEditor
        initialWork={{
          id: 'work-1',
          title: 'Existing work',
          category: 'platform',
          tags: [],
          published: true,
          content: { html: '<p>Existing</p>' },
          all_properties: {},
          thumbnail_asset_id: 'thumb-manual',
          thumbnail_url: '/media/work-thumbnails/manual.jpg',
          videos_version: 2,
          videos: [],
        }}
      />,
    )

    fireEvent.change(screen.getByLabelText('YouTube URL or ID'), { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } })
    fireEvent.click(screen.getByRole('button', { name: /Add YouTube Video/i }))

    await waitFor(() => {
      expect(mocks.toast.success).toHaveBeenCalledWith('YouTube video added.')
    })

    expect(mocks.fetchRemoteImageBlob).not.toHaveBeenCalled()
    expect(screen.getByTestId('work-thumbnail-source')).toHaveTextContent('manual')
  })

  it('surfaces reorder conflicts for existing videos', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce({
      ok: false,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'Videos changed. Refresh and retry.' }),
      text: async () => '',
    })

    render(
      <WorkEditor
        initialWork={{
          id: 'work-1',
          title: 'Existing work',
          category: 'platform',
          tags: [],
          published: true,
          content: { html: '<p>Existing</p>' },
          all_properties: {},
          videos_version: 2,
          videos: [
            youtubeVideo('video-1', 'dQw4w9WgXcQ', 0),
            youtubeVideo('video-2', '9bZkp7q19f0', 1),
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Move YouTube dQw4w9WgXcQ down/i }))

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/admin/works/work-1/videos/order',
        expect.objectContaining({ method: 'PUT' }),
      )
      expect(mocks.toast.error).toHaveBeenCalledWith('Videos changed. Refresh and retry.')
    })

    const cards = screen.getAllByTestId('saved-video-card')
    expect(cards[0]).toHaveTextContent('YouTube dQw4w9WgXcQ')
    expect(cards[1]).toHaveTextContent('YouTube 9bZkp7q19f0')
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })

  it('keeps a saved video visible after sanitized delete failure and allows a retry to succeed', async () => {
    mocks.fetchWithCsrf
      .mockResolvedValueOnce(errorJson('SQLSTATE 23503 stack trace status 500', 500))
      .mockResolvedValueOnce(okJson({ videos_version: 3, videos: [] }))

    render(
      <WorkEditor
        initialWork={existingWork({
          videos_version: 2,
          videos: [youtubeVideo('video-1', 'dQw4w9WgXcQ', 0)],
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Remove YouTube dQw4w9WgXcQ/i }))

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Video could not be removed. Please retry after the backend is healthy.')
    })
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringContaining('SQLSTATE'))
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringContaining('stack trace'))

    expect(screen.getByTestId('saved-video-card')).toHaveTextContent('YouTube dQw4w9WgXcQ')
    expect(mocks.toast.success).not.toHaveBeenCalledWith('Video removed.')

    fireEvent.click(screen.getByRole('button', { name: /Remove YouTube dQw4w9WgXcQ/i }))

    await waitFor(() => {
      expect(mocks.toast.success).toHaveBeenCalledWith('Video removed.')
    })
    expect(screen.queryByTestId('saved-video-card')).not.toBeInTheDocument()
  })

  it('sanitizes technical reorder failures without changing the rendered order', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce(errorJson('WoongBlog.Api stack trace status 500', 500))

    render(
      <WorkEditor
        initialWork={existingWork({
          videos_version: 2,
          videos: [
            youtubeVideo('video-1', 'dQw4w9WgXcQ', 0),
            youtubeVideo('video-2', '9bZkp7q19f0', 1),
          ],
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Move YouTube dQw4w9WgXcQ down/i }))

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Video order could not be saved. Please retry after the backend is healthy.')
    })
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringContaining('WoongBlog.Api'))
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringContaining('stack trace'))

    const cards = screen.getAllByTestId('saved-video-card')
    expect(cards[0]).toHaveTextContent('YouTube dQw4w9WgXcQ')
    expect(cards[1]).toHaveTextContent('YouTube 9bZkp7q19f0')
  })

  it('renders stable empty and single-video reorder states', () => {
    render(<WorkEditor initialWork={existingWork()} />)

    expect(screen.getByText('No videos attached yet.')).toBeInTheDocument()

    cleanup()
    vi.clearAllMocks()

    render(
      <WorkEditor
        initialWork={existingWork({
          videos: [youtubeVideo('video-1', 'dQw4w9WgXcQ', 0)],
        })}
      />,
    )

    expect(screen.getByRole('button', { name: /Move YouTube dQw4w9WgXcQ up/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Move YouTube dQw4w9WgXcQ down/i })).toBeDisabled()
    expect(mocks.fetchWithCsrf).not.toHaveBeenCalled()
  })

  it('surfaces thumbnail regeneration failure without falsely saving rich media changes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('missing', { status: 404 })))

    render(
      <WorkEditor
        initialWork={existingWork({
          thumbnail_asset_id: 'thumb-manual',
          thumbnail_url: '/media/work-thumbnails/manual.jpg',
          videos: [{
            id: 'video-local',
            sourceType: 'local',
            sourceKey: 'videos/work-1/demo.mp4',
            playbackUrl: '/media/videos/work-1/demo.mp4',
            originalFileName: 'demo.mp4',
            mimeType: 'video/mp4',
            sortOrder: 0,
          }],
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Remove Thumbnail/i }))

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Failed to fetch the saved video for thumbnail regeneration.')
    })

    expect(screen.getByTestId('work-thumbnail-source')).toHaveTextContent('uploaded video')
    expect(screen.queryByRole('img', { name: 'Work thumbnail preview' })).not.toBeInTheDocument()
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })

  it('sanitizes thumbnail regeneration upload failures without falsely saving rich media changes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('video', { status: 200 })))
    mocks.fetchWithCsrf.mockResolvedValueOnce(errorJson('Cloudflare R2 storage stack trace status 500', 500))

    render(
      <WorkEditor
        initialWork={existingWork({
          thumbnail_asset_id: 'thumb-manual',
          thumbnail_url: '/media/work-thumbnails/manual.jpg',
          videos: [{
            id: 'video-local',
            sourceType: 'local',
            sourceKey: 'videos/work-1/demo.mp4',
            playbackUrl: '/media/videos/work-1/demo.mp4',
            originalFileName: 'demo.mp4',
            mimeType: 'video/mp4',
            sortOrder: 0,
          }],
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Remove Thumbnail/i }))

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Thumbnail could not be regenerated. Please retry after storage is healthy.')
    })
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringContaining('Cloudflare'))
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringContaining('stack trace'))
    expect(screen.getByTestId('work-thumbnail-source')).toHaveTextContent('uploaded video')
    expect(screen.queryByRole('img', { name: 'Work thumbnail preview' })).not.toBeInTheDocument()
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })

  it('inserts a saved video into the body and marks it as placed', async () => {
    render(
      <WorkEditor
        initialWork={{
          id: 'work-1',
          title: 'Existing work',
          category: 'platform',
          tags: [],
          published: true,
          content: { html: '<p>Existing</p>' },
          all_properties: {},
          videos_version: 2,
          videos: [
            {
              id: 'video-1',
              sourceType: 'youtube',
              sourceKey: 'dQw4w9WgXcQ',
              sortOrder: 0,
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Insert Into Body' }))

    await waitFor(() => {
      expect(mocks.toast.success).toHaveBeenCalledWith('Video inserted into the body.')
    })

    expect(screen.getByLabelText('Mock work content')).toHaveValue('<p>Existing</p><work-video-embed data-video-id="video-1"></work-video-embed>')
    expect(screen.getByText(/Placed in body\. Remove it from the body before deleting the saved video\./i)).toBeInTheDocument()
  })

  it('blocks deleting a video that is still placed in the body', async () => {
    render(
      <WorkEditor
        initialWork={{
          id: 'work-1',
          title: 'Existing work',
          category: 'platform',
          tags: [],
          published: true,
          content: { html: '<p>Existing</p><work-video-embed data-video-id="video-1"></work-video-embed>' },
          all_properties: {},
          videos_version: 2,
          videos: [
            {
              id: 'video-1',
              sourceType: 'youtube',
              sourceKey: 'dQw4w9WgXcQ',
              sortOrder: 0,
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Remove YouTube dQw4w9WgXcQ/i }))

    expect(mocks.toast.error).toHaveBeenCalledWith('Remove this video from the body before deleting it.')
    expect(mocks.fetchWithCsrf).not.toHaveBeenCalled()
  })
})
