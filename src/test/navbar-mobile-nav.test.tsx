import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Navbar } from '@/components/layout/Navbar'

const mocks = vi.hoisted(() => ({
  pathname: '/',
  searchParams: '',
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: ({ testId = 'theme-toggle' }: { testId?: string }) => <button type="button" data-testid={testId}>Theme</button>,
}))

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))

describe('Navbar mobile controls', () => {
  beforeEach(() => {
    mocks.pathname = '/'
    mocks.searchParams = ''
    mocks.push.mockReset()
    document.body.innerHTML = ''
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
      font: '',
      measureText: () => ({ width: 0 }),
    } as unknown as ReturnType<typeof HTMLCanvasElement.prototype.getContext>))
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders six mobile bottom tabs and sets aria-current on the active page', () => {
    mocks.pathname = '/works'
    render(<Navbar ownerName="Woong" />)

    const bottomNav = screen.getByTestId('mobile-bottom-nav')
    const navQueries = within(bottomNav)

    expect(bottomNav).toBeInTheDocument()
    expect(navQueries.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(navQueries.getByRole('link', { name: 'Intro' })).toHaveAttribute('href', '/introduction')
    expect(navQueries.getByRole('link', { name: 'Works' })).toHaveAttribute('href', '/works')
    expect(navQueries.getByRole('link', { name: 'Study' })).toHaveAttribute('href', '/blog')
    expect(navQueries.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact')
    expect(navQueries.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/resume')
    expect(navQueries.getByRole('link', { name: 'Works' })).toHaveAttribute('aria-current', 'page')
  })

  it('opens the study search row when the mobile search button is used on /blog', async () => {
    mocks.pathname = '/blog'

    render(<Navbar ownerName="Woong" />)

    fireEvent.click(screen.getByRole('button', { name: 'Open search' }))

    const searchInput = screen.getByRole('textbox', { name: 'Search studies' })
    expect(searchInput).toBeInTheDocument()
    await waitFor(() => {
      expect(document.activeElement).toBe(searchInput)
    })
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('opens the works search row when the mobile search button is used on /works', async () => {
    mocks.pathname = '/works'

    render(<Navbar ownerName="Woong" />)

    fireEvent.click(screen.getByRole('button', { name: 'Open search' }))

    const searchInput = screen.getByRole('textbox', { name: 'Search works' })
    expect(searchInput).toBeInTheDocument()
    await waitFor(() => {
      expect(document.activeElement).toBe(searchInput)
    })
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('routes to /blog with focusSearch when mobile search is used outside blog/works', () => {
    mocks.pathname = '/contact'
    render(<Navbar ownerName="Woong" />)

    fireEvent.click(screen.getByRole('button', { name: 'Open search' }))

    expect(mocks.push).toHaveBeenCalledWith('/blog?focusSearch=1')
  })

  it('opens the mobile search row automatically from the focusSearch query parameter', () => {
    mocks.pathname = '/blog'
    mocks.searchParams = 'focusSearch=1'

    render(<Navbar ownerName="Woong" />)

    expect(screen.getByRole('textbox', { name: 'Search studies' })).toBeInTheDocument()
  })
})
