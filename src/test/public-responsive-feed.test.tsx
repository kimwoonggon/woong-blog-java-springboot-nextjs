import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicResponsiveFeed } from '@/components/content/PublicResponsiveFeed'

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => <img src={src} alt={alt} {...props} />,
}))

const studyRestoreStorageKey = 'woong-study-mobile-feed-state'

type ViewportMode = 'mobile' | 'tablet' | 'desktop'

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = '0px'
  readonly thresholds = [0]
  private readonly callback: IntersectionObserverCallback
  private observedTarget: Element | null = null

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    mockIntersectionObservers.push(this)
  }

  disconnect() {}

  observe(target: Element) {
    this.observedTarget = target
  }

  takeRecords() {
    return []
  }

  trigger(isIntersecting: boolean) {
    if (!this.observedTarget) {
      throw new Error('No observed target is registered for this intersection observer.')
    }

    this.callback([{
      isIntersecting,
      target: this.observedTarget,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRatio: isIntersecting ? 1 : 0,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: 0,
    }], this)
  }

  unobserve() {}
}

const mockIntersectionObservers: MockIntersectionObserver[] = []

function setViewportMode(mode: ViewportMode) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('max-width: 767px')
      ? mode === 'mobile'
      : query.includes('max-width: 1023px')
        ? mode !== 'desktop'
        : false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    media: query,
    onchange: null,
  })))
}

function buildBlogItems(prefix: string, count: number, start = 1, overrides?: Partial<{
  excerpt: string
  tags: string[]
}>) {
  return Array.from({ length: count }, (_, index) => {
    const number = start + index
    return {
      id: `${prefix}-${number}`,
      slug: `${prefix}-${number}`,
      title: `${prefix} title ${number}`,
      excerpt: overrides?.excerpt ?? `${prefix} excerpt ${number}`,
      tags: overrides?.tags ?? ['tag'],
      publishedAt: '2026-04-23T00:00:00.000Z',
    }
  })
}

function buildWorkItems(prefix: string, count: number, start = 1) {
  return Array.from({ length: count }, (_, index) => {
    const number = start + index
    return {
      id: `${prefix}-${number}`,
      slug: `${prefix}-${number}`,
      title: `${prefix} work ${number}`,
      excerpt: `${prefix} excerpt ${number}`,
      category: 'Video',
      tags: ['work'],
      publishedAt: '2026-04-23T00:00:00.000Z',
      thumbnailUrl: null,
    }
  })
}

describe('PublicResponsiveFeed', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    mockIntersectionObservers.length = 0
    sessionStorage.clear()
    window.history.replaceState(null, '', '/blog?page=1&pageSize=10')
  })

  it('auto-fetches the next page on mobile when the sentinel enters view', async () => {
    setViewportMode('mobile')

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      items: buildBlogItems('study', 10, 11),
      page: 2,
      pageSize: 10,
      totalItems: 20,
      totalPages: 2,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    render(
      <PublicResponsiveFeed
        kind="blog"
        query=""
        desktopPayload={{ items: buildBlogItems('desktop', 3), page: 1, pageSize: 12, totalItems: 3, totalPages: 1 }}
        mobileInitialPayload={{ items: buildBlogItems('study', 10, 1), page: 1, pageSize: 10, totalItems: 20, totalPages: 2 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12')}
      />,
    )

    expect(screen.getByTestId('blog-responsive-feed')).toHaveAttribute('data-feed-mode', 'auto-infinite')
    expect(screen.queryByTestId('blog-load-more')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('blog-card')).toHaveLength(10)

    const observer = mockIntersectionObservers.at(-1)
    expect(observer).toBeTruthy()
    observer?.trigger(true)

    await waitFor(() => {
      expect(screen.getAllByTestId('blog-card')).toHaveLength(20)
    })
  })

  it('auto-fetches Works on mobile and stops at the end without rendering Load more', async () => {
    setViewportMode('mobile')

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      items: buildWorkItems('work', 2, 11),
      page: 2,
      pageSize: 10,
      totalItems: 12,
      totalPages: 2,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    render(
      <PublicResponsiveFeed
        kind="works"
        query=""
        desktopPayload={{ items: buildWorkItems('desktop', 3), page: 1, pageSize: 8, totalItems: 3, totalPages: 1 }}
        mobileInitialPayload={{ items: buildWorkItems('work', 10, 1), page: 1, pageSize: 10, totalItems: 12, totalPages: 2 }}
        desktopReturnTo={encodeURIComponent('/works?page=1&pageSize=8')}
      />,
    )

    expect(screen.getByTestId('works-responsive-feed')).toHaveAttribute('data-feed-mode', 'auto-infinite')
    expect(screen.queryByTestId('works-load-more')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('work-card')).toHaveLength(10)

    mockIntersectionObservers.at(-1)?.trigger(true)

    await waitFor(() => {
      expect(screen.getAllByTestId('work-card')).toHaveLength(12)
      expect(screen.queryByTestId('works-load-sentinel')).not.toBeInTheDocument()
      expect(screen.getByText('End of list')).toBeInTheDocument()
    })
  })

  it('keeps manual Load more on tablet and does not auto-fetch until clicked', async () => {
    setViewportMode('tablet')

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock as typeof fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      items: buildBlogItems('tablet', 10, 11),
      page: 2,
      pageSize: 10,
      totalItems: 20,
      totalPages: 2,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    render(
      <PublicResponsiveFeed
        kind="blog"
        query=""
        desktopPayload={{ items: buildBlogItems('desktop', 3), page: 1, pageSize: 12, totalItems: 3, totalPages: 1 }}
        mobileInitialPayload={{ items: buildBlogItems('tablet', 10, 1), page: 1, pageSize: 10, totalItems: 20, totalPages: 2 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12')}
      />,
    )

    expect(screen.getByTestId('blog-responsive-feed')).toHaveAttribute('data-feed-mode', 'load-more')
    expect(screen.getByTestId('blog-load-more')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('blog-load-more'))

    await waitFor(() => {
      expect(screen.getAllByTestId('blog-card')).toHaveLength(20)
    })
  })

  it('keeps desktop pagination mode unchanged', () => {
    setViewportMode('desktop')

    render(
      <PublicResponsiveFeed
        kind="blog"
        query=""
        desktopPayload={{ items: buildBlogItems('desktop', 3), page: 2, pageSize: 12, totalItems: 36, totalPages: 3 }}
        mobileInitialPayload={{ items: buildBlogItems('mobile', 10), page: 1, pageSize: 10, totalItems: 10, totalPages: 1 }}
        desktopReturnTo={encodeURIComponent('/blog?page=2&pageSize=12')}
      />,
    )

    expect(screen.getByTestId('blog-responsive-feed')).toHaveAttribute('data-feed-mode', 'pagination')
    expect(screen.getAllByTestId('blog-card')).toHaveLength(3)
    expect(screen.queryByTestId('blog-load-more')).not.toBeInTheDocument()
    expect(screen.queryByTestId('blog-load-sentinel')).not.toBeInTheDocument()
  })

  it('renders public blog empty states without admin affordances or raw failure details', () => {
    setViewportMode('desktop')

    const { container } = render(
      <PublicResponsiveFeed
        kind="blog"
        query=""
        desktopPayload={{ items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 1 }}
        mobileInitialPayload={{ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12')}
      />,
    )

    expect(screen.getByText('No blog posts found.')).toBeInTheDocument()
    expect(screen.queryByTestId('blog-card')).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/admin|edit|manage|관리|수정/i)
    expect(container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  })

  it('uses safe fallback labels for invalid public feed dates', () => {
    setViewportMode('desktop')

    const invalidBlogItem = {
      ...buildBlogItems('invalid-study', 1)[0],
      publishedAt: 'not-a-date',
    }
    const invalidWorkItem = {
      ...buildWorkItems('invalid-work', 1)[0],
      publishedAt: 'not-a-date',
    }

    const { container, rerender } = render(
      <PublicResponsiveFeed
        kind="blog"
        query=""
        desktopPayload={{ items: [invalidBlogItem], page: 1, pageSize: 12, totalItems: 1, totalPages: 1 }}
        mobileInitialPayload={{ items: [invalidBlogItem], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12')}
      />,
    )

    expect(screen.getByText('Unknown Date')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/Invalid Date|RangeError/i)

    rerender(
      <PublicResponsiveFeed
        kind="works"
        query=""
        desktopPayload={{ items: [invalidWorkItem], page: 1, pageSize: 8, totalItems: 1, totalPages: 1 }}
        mobileInitialPayload={{ items: [invalidWorkItem], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }}
        desktopReturnTo={encodeURIComponent('/works?page=1&pageSize=8')}
      />,
    )

    expect(screen.getByText('Unknown Date')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/Invalid Date|RangeError/i)
  })

  it('renders public works empty states without admin affordances or raw failure details', () => {
    setViewportMode('desktop')

    const { container } = render(
      <PublicResponsiveFeed
        kind="works"
        query=""
        desktopPayload={{ items: [], page: 1, pageSize: 8, totalItems: 0, totalPages: 1 }}
        mobileInitialPayload={{ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 }}
        desktopReturnTo={encodeURIComponent('/works?page=1&pageSize=8')}
      />,
    )

    expect(screen.getByText('No works found.')).toBeInTheDocument()
    expect(screen.queryByTestId('work-card')).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/admin|edit|manage|관리|수정/i)
    expect(container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  })

  it('keeps existing public items and shows a safe message when tablet load-more fails', async () => {
    setViewportMode('tablet')

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock as typeof fetch)
    fetchMock.mockRejectedValueOnce(new Error('SQLSTATE 08006 stack trace from WoongBlog.Api status 500'))

    const { container } = render(
      <PublicResponsiveFeed
        kind="blog"
        query=""
        desktopPayload={{ items: buildBlogItems('desktop', 3), page: 1, pageSize: 12, totalItems: 3, totalPages: 1 }}
        mobileInitialPayload={{ items: buildBlogItems('study', 2, 1), page: 1, pageSize: 10, totalItems: 4, totalPages: 2 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12')}
      />,
    )

    fireEvent.click(screen.getByTestId('blog-load-more'))

    await waitFor(() => {
      expect(screen.getAllByTestId('blog-card')).toHaveLength(2)
      expect(screen.getByRole('status')).toHaveTextContent('Failed to load more items.')
    })

    expect(screen.getByText('study title 1')).toBeInTheDocument()
    expect(screen.getByText('study title 2')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
    expect(container.textContent).not.toMatch(/\b(undefined|null)\b/i)
  })

  it('renders public empty search results without leaking raw details', () => {
    setViewportMode('desktop')

    const blogResult = render(
      <PublicResponsiveFeed
        kind="blog"
        query="missing-study"
        desktopPayload={{ items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 1 }}
        mobileInitialPayload={{ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12&query=missing-study')}
      />,
    )

    expect(screen.getByText('No studies found.')).toBeInTheDocument()
    expect(screen.queryByTestId('blog-card')).not.toBeInTheDocument()
    expect(blogResult.container.textContent).not.toMatch(/admin|edit|manage|관리|수정/i)
    expect(blogResult.container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
    expect(blogResult.container.textContent).not.toMatch(/\b(undefined|null)\b/i)

    blogResult.unmount()

    const worksResult = render(
      <PublicResponsiveFeed
        kind="works"
        query="missing-work"
        desktopPayload={{ items: [], page: 1, pageSize: 8, totalItems: 0, totalPages: 1 }}
        mobileInitialPayload={{ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 }}
        desktopReturnTo={encodeURIComponent('/works?page=1&pageSize=8&query=missing-work')}
      />,
    )

    expect(screen.getByText('No matching works found.')).toBeInTheDocument()
    expect(screen.queryByTestId('work-card')).not.toBeInTheDocument()
    expect(worksResult.container.textContent).not.toMatch(/admin|edit|manage|관리|수정/i)
    expect(worksResult.container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
    expect(worksResult.container.textContent).not.toMatch(/\b(undefined|null)\b/i)
  })

  it('drops appended and failed-load state when the search query changes', async () => {
    setViewportMode('tablet')

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock as typeof fetch)
    fetchMock.mockRejectedValueOnce(new Error('backend stack trace'))

    const { rerender } = render(
      <PublicResponsiveFeed
        kind="blog"
        query="one"
        desktopPayload={{ items: buildBlogItems('desktop', 3), page: 1, pageSize: 12, totalItems: 3, totalPages: 1 }}
        mobileInitialPayload={{ items: buildBlogItems('one', 2, 1), page: 1, pageSize: 10, totalItems: 4, totalPages: 2 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12&query=one')}
      />,
    )

    fireEvent.click(screen.getByTestId('blog-load-more'))

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    rerender(
      <PublicResponsiveFeed
        kind="blog"
        query="two"
        desktopPayload={{ items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 1 }}
        mobileInitialPayload={{ items: buildBlogItems('two', 1, 1), page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12&query=two')}
      />,
    )

    await waitFor(() => {
      expect(screen.queryByText('one title 1')).not.toBeInTheDocument()
      expect(screen.queryByText('one title 2')).not.toBeInTheDocument()
      expect(screen.getByText('two title 1')).toBeInTheDocument()
      expect(screen.queryByText('Failed to load more items.')).not.toBeInTheDocument()
      expect(screen.queryByText('backend stack trace')).not.toBeInTheDocument()
    })
  })

  it('ignores stale mobile Study restore state from a different query', async () => {
    setViewportMode('mobile')

    window.history.replaceState({
      __studyFeedRestore: {
        query: 'old-query',
        loadedPageCount: 3,
        pageSize: 10,
        scrollY: 960,
        restoreOnHistoryReturn: true,
      },
    }, '', '/blog?page=1&pageSize=10&query=new-query')
    sessionStorage.setItem(studyRestoreStorageKey, JSON.stringify({
      query: 'old-query',
      loadedPageCount: 3,
      pageSize: 10,
      scrollY: 960,
      restoreOnHistoryReturn: true,
    }))

    const scrollToSpy = vi.fn()
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollToSpy,
      writable: true,
    })

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    render(
      <PublicResponsiveFeed
        kind="blog"
        query="new-query"
        desktopPayload={{ items: buildBlogItems('desktop', 3), page: 1, pageSize: 12, totalItems: 3, totalPages: 1 }}
        mobileInitialPayload={{ items: buildBlogItems('new', 2, 1), page: 1, pageSize: 10, totalItems: 2, totalPages: 1 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12&query=new-query')}
      />,
    )

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.getAllByTestId('blog-card')).toHaveLength(2)
    expect(screen.getByText('new title 1')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  it('serializes mobile Study restore state into history and session storage', async () => {
    setViewportMode('mobile')

    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock as typeof fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      items: buildBlogItems('study', 10, 11),
      page: 2,
      pageSize: 10,
      totalItems: 20,
      totalPages: 2,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 640,
      writable: true,
    })

    render(
      <PublicResponsiveFeed
        kind="blog"
        query="restore"
        desktopPayload={{ items: buildBlogItems('desktop', 3), page: 1, pageSize: 12, totalItems: 3, totalPages: 1 }}
        mobileInitialPayload={{ items: buildBlogItems('study', 10, 1), page: 1, pageSize: 10, totalItems: 20, totalPages: 2 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12&query=restore')}
      />,
    )

    act(() => {
      mockIntersectionObservers.at(-1)?.trigger(true)
    })

    await waitFor(() => {
      expect(screen.getAllByTestId('blog-card')).toHaveLength(20)
    })

    await waitFor(() => {
      const rawState = sessionStorage.getItem(studyRestoreStorageKey)
      expect(rawState).toBeTruthy()

      const parsedState = JSON.parse(rawState ?? '{}') as {
        loadedPageCount: number
      }

      expect(parsedState.loadedPageCount).toBe(2)
    })

    fireEvent.scroll(window)

    await waitFor(() => {
      const rawState = sessionStorage.getItem(studyRestoreStorageKey)
      expect(rawState).toBeTruthy()

      const parsedState = JSON.parse(rawState ?? '{}') as {
        query: string
        loadedPageCount: number
        pageSize: number
        scrollY: number
      }

      expect(parsedState).toMatchObject({
        query: 'restore',
        loadedPageCount: 2,
        pageSize: 10,
        scrollY: 640,
      })
      expect(replaceStateSpy).toHaveBeenCalled()
    })
  })

  it('restores appended mobile Study pages and exact scroll position on browser back', async () => {
    setViewportMode('mobile')

    const scrollToSpy = vi.fn()
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollToSpy,
      writable: true,
    })

    window.history.replaceState({
      __studyFeedRestore: {
        query: '',
        loadedPageCount: 2,
        pageSize: 10,
        scrollY: 480,
      },
    }, '', '/blog?page=1&pageSize=10')
    sessionStorage.setItem(studyRestoreStorageKey, JSON.stringify({
      query: '',
      loadedPageCount: 2,
      pageSize: 10,
      scrollY: 480,
    }))

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock as typeof fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      items: buildBlogItems('study', 10, 11),
      page: 2,
      pageSize: 10,
      totalItems: 20,
      totalPages: 2,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    render(
      <PublicResponsiveFeed
        kind="blog"
        query=""
        desktopPayload={{ items: buildBlogItems('desktop', 3), page: 1, pageSize: 12, totalItems: 3, totalPages: 1 }}
        mobileInitialPayload={{ items: buildBlogItems('study', 10, 1), page: 1, pageSize: 10, totalItems: 20, totalPages: 2 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12')}
      />,
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('blog-card')).toHaveLength(20)
    })
    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledTimes(2)
    })
    expect(scrollToSpy).toHaveBeenNthCalledWith(1, 0, 480)
    expect(scrollToSpy).toHaveBeenNthCalledWith(2, 0, 480)
  })

  it('keeps desktop Study pagination layout when returning at desktop width with stale mobile restore state', async () => {
    setViewportMode('desktop')

    const scrollToSpy = vi.fn()
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollToSpy,
      writable: true,
    })

    window.history.replaceState(null, '', '/blog?page=1&pageSize=12')
    sessionStorage.setItem(studyRestoreStorageKey, JSON.stringify({
      query: '',
      loadedPageCount: 2,
      pageSize: 10,
      scrollY: 720,
      restoreOnHistoryReturn: true,
    }))

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock as typeof fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      items: buildBlogItems('study', 10, 11),
      page: 2,
      pageSize: 10,
      totalItems: 20,
      totalPages: 2,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    render(
      <PublicResponsiveFeed
        kind="blog"
        query=""
        desktopPayload={{ items: buildBlogItems('desktop', 3), page: 1, pageSize: 12, totalItems: 36, totalPages: 3 }}
        mobileInitialPayload={{ items: buildBlogItems('study', 10, 1), page: 1, pageSize: 10, totalItems: 20, totalPages: 2 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12')}
      />,
    )

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.getByTestId('blog-responsive-feed')).toHaveAttribute('data-feed-mode', 'pagination')
    expect(screen.getByTestId('blog-grid')).not.toHaveAttribute('data-feed-layout')
    expect(screen.getAllByTestId('blog-card')).toHaveLength(3)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByTestId('blog-load-more')).not.toBeInTheDocument()
    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  it('keeps fresh desktop navigation on normal pagination when only stale Study session state exists', () => {
    setViewportMode('desktop')

    sessionStorage.setItem(studyRestoreStorageKey, JSON.stringify({
      query: '',
      loadedPageCount: 2,
      pageSize: 10,
      scrollY: 720,
      restoreOnHistoryReturn: false,
    }))

    render(
      <PublicResponsiveFeed
        kind="blog"
        query=""
        desktopPayload={{ items: buildBlogItems('desktop', 3), page: 1, pageSize: 12, totalItems: 36, totalPages: 3 }}
        mobileInitialPayload={{ items: buildBlogItems('study', 10, 1), page: 1, pageSize: 10, totalItems: 20, totalPages: 2 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12')}
      />,
    )

    expect(screen.getByTestId('blog-responsive-feed')).toHaveAttribute('data-feed-mode', 'pagination')
    expect(screen.getAllByTestId('blog-card')).toHaveLength(3)
  })

  it('uses the built-in xl breakpoint for the desktop Study grid', () => {
    setViewportMode('desktop')

    render(
      <PublicResponsiveFeed
        kind="blog"
        query=""
        desktopPayload={{ items: buildBlogItems('desktop', 12), page: 1, pageSize: 12, totalItems: 12, totalPages: 1 }}
        mobileInitialPayload={{ items: buildBlogItems('mobile', 10), page: 1, pageSize: 10, totalItems: 10, totalPages: 1 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12')}
      />,
    )

    const grid = screen.getByTestId('blog-grid')
    expect(grid).toHaveClass('md:grid-cols-2')
    expect(grid).toHaveClass('xl:grid-cols-3')
    expect(grid.className).not.toContain('min-[1200px]:grid-cols-3')
  })

  it('renders multiple saved tags and hides the summary block when the saved excerpt is blank', () => {
    setViewportMode('desktop')

    render(
      <PublicResponsiveFeed
        kind="blog"
        query=""
        desktopPayload={{
          items: [
            ...buildBlogItems('blank', 1, 1, { excerpt: '', tags: ['alpha', 'beta', 'gamma'] }),
            ...buildBlogItems('filled', 1, 2, { excerpt: 'Saved summary', tags: ['delta', 'epsilon'] }),
          ],
          page: 1,
          pageSize: 12,
          totalItems: 2,
          totalPages: 1,
        }}
        mobileInitialPayload={{ items: buildBlogItems('mobile', 10), page: 1, pageSize: 10, totalItems: 10, totalPages: 1 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12')}
      />,
    )

    const cards = screen.getAllByTestId('blog-card')
    expect(within(cards[0]).getByText('alpha')).toBeInTheDocument()
    expect(within(cards[0]).getByText('beta')).toBeInTheDocument()
    expect(within(cards[0]).getByText('gamma')).toBeInTheDocument()
    expect(cards[0].querySelector('p')).toBeNull()
    expect(within(cards[1]).getByText('Saved summary')).toBeInTheDocument()
  })

  it('resets to page-1 items when the query changes', () => {
    setViewportMode('mobile')

    const { rerender } = render(
      <PublicResponsiveFeed
        kind="blog"
        query="one"
        desktopPayload={{ items: buildBlogItems('desktop', 3), page: 1, pageSize: 12, totalItems: 3, totalPages: 1 }}
        mobileInitialPayload={{ items: buildBlogItems('one', 2), page: 1, pageSize: 10, totalItems: 2, totalPages: 1 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12&query=one')}
      />,
    )

    expect(screen.getByText('one title 1')).toBeInTheDocument()

    rerender(
      <PublicResponsiveFeed
        kind="blog"
        query="two"
        desktopPayload={{ items: buildBlogItems('desktop', 3), page: 1, pageSize: 12, totalItems: 3, totalPages: 1 }}
        mobileInitialPayload={{ items: buildBlogItems('two', 2), page: 1, pageSize: 10, totalItems: 2, totalPages: 1 }}
        desktopReturnTo={encodeURIComponent('/blog?page=1&pageSize=12&query=two')}
      />,
    )

    expect(screen.queryByText('one title 1')).not.toBeInTheDocument()
    expect(screen.getByText('two title 1')).toBeInTheDocument()
  })
})
