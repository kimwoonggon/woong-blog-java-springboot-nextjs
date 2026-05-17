import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicSearchForm } from '@/components/layout/PublicSearchForm'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: '',
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

function renderSearchForm({
  action = '/works',
  query = '',
}: {
  action?: '/blog' | '/works'
  query?: string
} = {}) {
  return render(
    <PublicSearchForm
      action={action}
      inputId={`${action.slice(1)}-search`}
      inputName="query"
      query={query}
      placeholder={action === '/blog' ? 'Search studies' : 'Search work'}
      inputAriaLabel={action === '/blog' ? 'Search studies' : 'Search works'}
      shouldFocusSearch={false}
      clearHref={action}
      clearLabel={action === '/blog' ? 'Clear study search' : 'Clear works search'}
      wrapperClassName="flex"
    />,
  )
}

describe('PublicSearchForm live search', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.replace.mockReset()
    mocks.searchParams = ''
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('debounces query URL updates for 300ms while preserving the existing query contract', () => {
    mocks.searchParams = 'page=3&pageSize=8&searchMode=content&focusSearch=1'
    renderSearchForm({ action: '/works' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Search works' }), {
      target: { value: 'seeded work' },
    })

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(mocks.replace).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(mocks.replace).toHaveBeenCalledWith('/works?page=1&pageSize=8&query=seeded+work', { scroll: false })
    expect(mocks.replace.mock.calls[0][0]).not.toContain('searchMode')
    expect(mocks.replace.mock.calls[0][0]).not.toContain('focusSearch')
  })

  it('submits immediately on Enter-compatible form submission', () => {
    mocks.searchParams = 'page=5&pageSize=12'
    renderSearchForm({ action: '/blog' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Search studies' }), {
      target: { value: '  seeded study  ' },
    })
    fireEvent.submit(screen.getByRole('search'))

    expect(mocks.replace).toHaveBeenCalledWith('/blog?page=1&pageSize=12&query=seeded+study', { scroll: false })

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(mocks.replace).toHaveBeenCalledTimes(1)
  })

  it('keeps the clear search link pointed at the unfiltered list route', () => {
    renderSearchForm({ action: '/works', query: 'seeded' })

    expect(screen.getByRole('link', { name: 'Clear works search' })).toHaveAttribute('href', '/works')
  })
})
