import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

function mockPublicPageShell() {
  vi.doMock('@/components/admin/PublicAdminClientGate', () => ({
    PublicAdminClientGate: () => null,
  }))
  vi.doMock('@/components/admin/InlinePageEditorSection', () => ({
    InlinePageEditorSection: () => <div data-testid="inline-page-editor" />,
  }))
  vi.doMock('@/components/content/BlockRenderer', () => ({
    BlockRenderer: ({ blocks }: { blocks: Array<{ text?: string }> }) => (
      <div data-testid="block-renderer">{blocks.map((block) => block.text).join(' ')}</div>
    ),
  }))
  vi.doMock('@/components/content/InteractiveRenderer', () => ({
    InteractiveRenderer: ({ html }: { html: string }) => <div data-testid="interactive-renderer">{html}</div>,
  }))
  vi.doMock('@/components/content/LocalQaQueryBoundary', () => ({
    LocalQaBrokenPageBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }))
}

describe('public static page error and empty states', () => {
  afterEach(() => {
    cleanup()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('renders the introduction missing-content fallback without anonymous admin affordances', async () => {
    mockPublicPageShell()
    vi.doMock('@/lib/api/pages', () => ({
      fetchPublicPageBySlug: vi.fn(async () => null),
    }))

    const IntroductionPage = (await import('@/app/(public)/introduction/page')).default
    render(await IntroductionPage())

    expect(screen.getByRole('heading', { name: 'Introduction' })).toBeInTheDocument()
    expect(screen.getByText(/Hello! I'm Woonggon Kim/i)).toBeInTheDocument()
    expect(screen.queryByTestId('inline-page-editor')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /소개글 수정|edit/i })).not.toBeInTheDocument()
  })

  it('renders the contact missing-content fallback without anonymous admin affordances', async () => {
    mockPublicPageShell()
    vi.doMock('@/lib/api/pages', () => ({
      fetchPublicPageBySlug: vi.fn(async () => null),
    }))

    const ContactPage = (await import('@/app/(public)/contact/page')).default
    render(await ContactPage())

    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'john@example.com' })).toHaveAttribute('href', 'mailto:psopen11@gmail.com')
    expect(screen.queryByTestId('inline-page-editor')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /문의글 수정|edit/i })).not.toBeInTheDocument()
  })

  it('routes introduction API failures to the public segment error boundary instead of rendering partial admin UI', async () => {
    mockPublicPageShell()
    vi.doMock('@/lib/api/pages', () => ({
      fetchPublicPageBySlug: vi.fn(async () => {
        throw new Error('Failed to load public page. Status 500. database stack trace')
      }),
    }))

    const IntroductionPage = (await import('@/app/(public)/introduction/page')).default

    await expect(IntroductionPage()).rejects.toThrow('Failed to load public page.')
  })

  it('renders public home empty lists without anonymous admin affordances or raw failure details', async () => {
    vi.doMock('@/lib/api/home', () => ({
      fetchPublicHome: vi.fn(async () => ({
        homePage: null,
        featuredWorks: [],
        recentPosts: [],
      })),
    }))
    vi.doMock('@/components/content/LocalQaQueryBoundary', () => ({
      LocalQaNoImageBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    }))

    const HomePage = (await import('@/app/(public)/page')).default
    const { container } = render(await HomePage())

    expect(screen.getByText('No featured works found.')).toBeInTheDocument()
    expect(screen.getByText('No recent posts found.')).toBeInTheDocument()
    expect(screen.queryByTestId('featured-work-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('recent-post-card')).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/admin|edit|manage|관리|수정/i)
    expect(container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  }, 15000)
})
