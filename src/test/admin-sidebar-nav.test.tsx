import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminSidebarNav } from '@/components/admin/AdminSidebarNav'

const mocks = vi.hoisted(() => ({
  pathname: '/admin/dashboard',
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  }) => <a href={href} {...props}>{children}</a>,
}))

describe('AdminSidebarNav', () => {
  beforeEach(() => {
    mocks.pathname = '/admin/dashboard'
  })

  it('marks only the most specific admin navigation item active', () => {
    mocks.pathname = '/admin/blog/notion'

    render(<AdminSidebarNav />)

    expect(screen.getByRole('link', { name: 'Blog Notion View' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Blog' })).not.toHaveAttribute('aria-current')
  })

  it('does not mark sibling prefix routes active', () => {
    mocks.pathname = '/admin/blogger'

    render(<AdminSidebarNav />)

    expect(screen.getByRole('link', { name: 'Blog' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('keeps section child routes active for their parent navigation item', () => {
    mocks.pathname = '/admin/works/work-1'

    render(<AdminSidebarNav />)

    expect(screen.getByRole('link', { name: 'Works' })).toHaveAttribute('aria-current', 'page')
  })

  it('exposes the load-test dashboard navigation item', () => {
    mocks.pathname = '/admin/load-test'

    render(<AdminSidebarNav />)

    expect(screen.getByRole('link', { name: 'Load Test' })).toHaveAttribute('href', '/admin/load-test')
    expect(screen.getByRole('link', { name: 'Load Test' })).toHaveAttribute('aria-current', 'page')
  })
})
