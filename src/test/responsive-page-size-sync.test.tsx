import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResponsivePageSizeSync } from '@/components/layout/ResponsivePageSizeSync'

const navigationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: '/blog',
  search: '',
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigationMocks.replace }),
  usePathname: () => navigationMocks.pathname,
  useSearchParams: () => new URLSearchParams(navigationMocks.search),
}))

describe('ResponsivePageSizeSync', () => {
  beforeEach(() => {
    navigationMocks.replace.mockClear()
    navigationMocks.pathname = '/blog'
    navigationMocks.search = ''
    window.history.replaceState(null, '', '/blog')
    window.sessionStorage.clear()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 960 })
  })

  it('adds the responsive page size when the route has no explicit pageSize', async () => {
    render(<ResponsivePageSizeSync desktopPageSize={12} tabletPageSize={8} mobilePageSize={4} />)

    await waitFor(() => {
      expect(navigationMocks.replace).toHaveBeenCalledWith('/blog?pageSize=12&page=1', { scroll: false })
    })
  })

  it('preserves an explicit pageSize so pagination tests and deep links do not get rewritten', async () => {
    navigationMocks.search = 'page=1&pageSize=2&__qaTagged=1'

    render(<ResponsivePageSizeSync desktopPageSize={12} tabletPageSize={8} mobilePageSize={4} />)

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(navigationMocks.replace).not.toHaveBeenCalled()
  })

  it('rewrites an explicit non-responsive pageSize back to the current viewport default', async () => {
    navigationMocks.pathname = '/works'
    navigationMocks.search = 'page=2&pageSize=6'

    render(<ResponsivePageSizeSync desktopPageSize={8} tabletPageSize={6} mobilePageSize={4} />)

    await waitFor(() => {
      expect(navigationMocks.replace).toHaveBeenCalledWith('/works?page=2&pageSize=8', { scroll: false })
    })
  })

  it('switches to infinite-list params below desktop when enabled', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 820 })
    navigationMocks.search = 'page=3&pageSize=12&searchMode=title&query=test'

    render(
      <ResponsivePageSizeSync
        desktopPageSize={12}
        tabletPageSize={8}
        mobilePageSize={4}
        infiniteBelowDesktop
        infinitePageSize={10}
      />,
    )

    await waitFor(() => {
      expect(navigationMocks.replace).toHaveBeenCalledWith('/blog?page=1&pageSize=10&query=test', { scroll: false })
    })
  })

  it('keeps desktop pagination params when infinite mode is enabled but viewport is desktop', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    navigationMocks.search = 'page=2&pageSize=12'

    render(
      <ResponsivePageSizeSync
        desktopPageSize={12}
        tabletPageSize={8}
        mobilePageSize={4}
        infiniteBelowDesktop
        infinitePageSize={10}
      />,
    )

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(navigationMocks.replace).not.toHaveBeenCalled()
  })

  it('does not rewrite Study infinite-list params on mobile while a browser-back reading restore is pending', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    navigationMocks.search = 'page=1&pageSize=10'
    window.history.replaceState({
      __studyFeedRestore: {
        query: '',
        loadedPageCount: 2,
        pageSize: 10,
        scrollY: 960,
        restoreOnHistoryReturn: true,
      },
    }, '', '/blog?page=1&pageSize=10')
    window.sessionStorage.setItem('woong-study-mobile-feed-state', JSON.stringify({
      query: '',
      loadedPageCount: 2,
      pageSize: 10,
      scrollY: 960,
      restoreOnHistoryReturn: true,
    }))

    render(
      <ResponsivePageSizeSync
        desktopPageSize={12}
        tabletPageSize={8}
        mobilePageSize={4}
        infiniteBelowDesktop
        infinitePageSize={10}
        skipWhenStudyRestorePending
      />,
    )

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(navigationMocks.replace).not.toHaveBeenCalled()
  })

  it('ignores stale pending Study restore state from a different search query', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    navigationMocks.search = 'page=3&pageSize=12&query=current'
    window.history.replaceState({
      __studyFeedRestore: {
        query: 'stale',
        loadedPageCount: 3,
        pageSize: 10,
        scrollY: 1280,
        restoreOnHistoryReturn: true,
      },
    }, '', '/blog?page=3&pageSize=12&query=current')
    window.sessionStorage.setItem('woong-study-mobile-feed-state', JSON.stringify({
      query: 'stale',
      loadedPageCount: 3,
      pageSize: 10,
      scrollY: 1280,
      restoreOnHistoryReturn: true,
    }))

    render(
      <ResponsivePageSizeSync
        desktopPageSize={12}
        tabletPageSize={8}
        mobilePageSize={4}
        infiniteBelowDesktop
        infinitePageSize={10}
        skipWhenStudyRestorePending
      />,
    )

    await waitFor(() => {
      expect(navigationMocks.replace).toHaveBeenCalledWith('/blog?page=1&pageSize=10&query=current', { scroll: false })
    })
  })

  it('lets desktop pagination win when a stale mobile Study restore is pending at desktop width', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    navigationMocks.search = 'page=1&pageSize=10'
    window.sessionStorage.setItem('woong-study-mobile-feed-state', JSON.stringify({
      query: '',
      loadedPageCount: 2,
      pageSize: 10,
      scrollY: 960,
      restoreOnHistoryReturn: true,
    }))

    render(
      <ResponsivePageSizeSync
        desktopPageSize={12}
        tabletPageSize={8}
        mobilePageSize={4}
        infiniteBelowDesktop
        infinitePageSize={10}
        skipWhenStudyRestorePending
      />,
    )

    await waitFor(() => {
      expect(navigationMocks.replace).toHaveBeenCalledWith('/blog?page=1&pageSize=12', { scroll: false })
    })
  })
})
