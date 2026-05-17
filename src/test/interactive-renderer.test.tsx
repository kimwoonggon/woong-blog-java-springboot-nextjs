import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { buildWorkVideoEmbedMarkup } from '@/lib/content/work-video-embeds'

let InteractiveRenderer: typeof import('@/components/content/InteractiveRenderer').InteractiveRenderer

vi.mock('@/components/content/ThreeJsScene', () => ({
  ThreeJsScene: ({ height }: { height?: number }) => (
    <div data-testid="three-js-scene">{height}</div>
  ),
}))

vi.mock('@/components/content/WorkVideoPlayer', () => ({
  WorkVideoPlayer: ({
    video,
    allowDesktopResize,
  }: {
    video: { sourceType: string; sourceKey: string }
    allowDesktopResize?: boolean
  }) => (
    video.sourceType === 'youtube'
      ? <iframe title="YouTube video" src={`https://www.youtube-nocookie.com/embed/${video.sourceKey}`} />
      : <video title="Work video" data-allow-desktop-resize={allowDesktopResize ? 'true' : 'false'} />
  ),
}))

vi.mock('@/components/content/MermaidRenderer', () => ({
  MermaidRenderer: ({ code }: { code: string }) => (
    <div data-testid="mermaid-renderer">{code}</div>
  ),
}))

describe('InteractiveRenderer', () => {
  beforeAll(async () => {
    ;({ InteractiveRenderer } = await import('@/components/content/InteractiveRenderer'))
  })

  it('renders inline work video embeds between html segments', () => {
    render(
      <InteractiveRenderer
        html={`<p>Before</p>${buildWorkVideoEmbedMarkup('video-1')}<p>After</p>`}
        workVideos={[
          {
            id: 'video-1',
            sourceType: 'youtube',
            sourceKey: 'dQw4w9WgXcQ',
            sortOrder: 0,
          },
        ]}
      />,
    )

    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(screen.getByText('After')).toBeInTheDocument()
    expect(screen.getByTitle(/YouTube video/i)).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  it('skips unknown inline video references on public render', () => {
    const { container } = render(
      <InteractiveRenderer
        html={`<p>Before</p>${buildWorkVideoEmbedMarkup('missing-video')}`}
        workVideos={[]}
      />,
    )

    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('video')).toBeNull()
  })

  it('forwards works-detail uploaded video presentation to inline uploaded videos only', () => {
    render(
      <InteractiveRenderer
        html={[
          '<p>Before</p>',
          buildWorkVideoEmbedMarkup('local-video'),
          buildWorkVideoEmbedMarkup('youtube-video'),
          '<p>After</p>',
        ].join('')}
        enableWorksDetailUploadedVideoPresentation
        workVideos={[
          {
            id: 'local-video',
            sourceType: 'hls',
            sourceKey: 'local:videos/work-1/hls/master.m3u8',
            sortOrder: 0,
          },
          {
            id: 'youtube-video',
            sourceType: 'youtube',
            sourceKey: 'dQw4w9WgXcQ',
            sortOrder: 1,
          },
        ]}
      />,
    )

    expect(screen.getByTitle('Work video')).toHaveAttribute('data-allow-desktop-resize', 'true')
    expect(screen.getByTitle(/YouTube video/i)).toBeInTheDocument()
  })

  it('removes script tags, event handlers, and javascript urls from raw html', () => {
    const { container } = render(
      <InteractiveRenderer
        html={'<p onclick="window.evil=true">Safe</p><script>window.evil=true</script><a href="javascript:alert(1)">bad</a><img src="javascript:alert(1)" onerror="alert(1)" />'}
      />,
    )

    expect(screen.getByText('Safe')).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('p')).not.toHaveAttribute('onclick')
    expect(container.querySelector('a')).not.toHaveAttribute('href')
    expect(container.querySelector('img')).not.toHaveAttribute('src')
    expect(container.querySelector('img')).not.toHaveAttribute('onerror')
  })

  it('renders mermaid blocks client-side without dropping surrounding prose', () => {
    render(
      <InteractiveRenderer
        html={'<p>Intro</p><mermaid-block data-code="graph TD;\nA--&gt;B;"></mermaid-block><p>Outro</p>'}
      />,
    )

    expect(screen.getByText('Intro')).toBeInTheDocument()
    expect(screen.getByText('Outro')).toBeInTheDocument()
    expect(screen.getByTestId('mermaid-renderer')).toHaveTextContent('graph TD;')
    expect(screen.getByTestId('mermaid-renderer')).toHaveTextContent('A-->B;')
  })

  it('parses mermaid data-code values that contain raw arrow characters', () => {
    render(
      <InteractiveRenderer
        html={'<p>Intro</p><mermaid-block data-code="flowchart TD\n  Work[Work Detail] --> Diagram[Mermaid SVG]"></mermaid-block><p>Outro</p>'}
      />,
    )

    expect(screen.getByText('Intro')).toBeInTheDocument()
    expect(screen.getByText('Outro')).toBeInTheDocument()
    expect(screen.getByTestId('mermaid-renderer')).toHaveTextContent('Work[Work Detail] --> Diagram[Mermaid SVG]')
  })

  it('keeps language-mermaid code blocks as regular code', () => {
    render(
      <InteractiveRenderer
        html={'<p>Intro</p><pre><code class="language-mermaid">sequenceDiagram\nUser-&gt;&gt;Frontend: Login</code></pre><p>Outro</p>'}
      />,
    )

    expect(screen.getByText('Intro')).toBeInTheDocument()
    expect(screen.getByText('Outro')).toBeInTheDocument()
    expect(screen.queryByTestId('mermaid-renderer')).not.toBeInTheDocument()
    expect(screen.getByText(/sequenceDiagram/)).toBeInTheDocument()
  })

  it('keeps block code, inline code, Korean text, and multiline whitespace in rendered prose', () => {
    const { container } = render(
      <InteractiveRenderer
        html={'<p>Use <code>inlineValue</code> outside.</p><pre><code>const message = "안녕하세요";\nconsole.log(message);</code></pre>'}
      />,
    )

    const prose = container.querySelector('.prose')
    const pre = container.querySelector('pre')
    const blockCode = container.querySelector('pre code')
    const inlineCode = container.querySelector('p code')

    expect(prose).toBeTruthy()
    expect(pre).toBeTruthy()
    expect(blockCode?.textContent).toBe('const message = "안녕하세요";\nconsole.log(message);')
    expect(inlineCode?.textContent).toBe('inlineValue')
    expect(inlineCode?.closest('pre')).toBeNull()
  })

  it('keeps paragraph-wrapped mermaid fences as regular prose', () => {
    render(
      <InteractiveRenderer
        html={'<p>Intro</p><p>```mermaid</p><p>sequenceDiagram</p><p>User-&gt;&gt;Frontend: Login</p><p>```</p><p>Outro</p>'}
      />,
    )

    expect(screen.getByText('Intro')).toBeInTheDocument()
    expect(screen.getByText('Outro')).toBeInTheDocument()
    expect(screen.queryByTestId('mermaid-renderer')).not.toBeInTheDocument()
    expect(screen.getByText('```mermaid')).toBeInTheDocument()
  })
})
