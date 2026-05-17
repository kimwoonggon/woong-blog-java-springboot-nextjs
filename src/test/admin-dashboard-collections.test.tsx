import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AdminDashboardCollections } from '@/components/admin/AdminDashboardCollections'
import type { BlogAdminItem } from '@/lib/api/blogs'
import type { WorkAdminItem } from '@/lib/api/works'

vi.mock('@/hooks/useResponsivePageSize', () => ({
  useResponsivePageSize: vi.fn(() => 1),
}))

describe('AdminDashboardCollections', () => {
  it('renders empty states when no works or blog posts exist', () => {
    render(<AdminDashboardCollections works={[]} blogs={[]} />)

    expect(screen.getByText('No works found.')).toBeInTheDocument()
    expect(screen.getByText('No blog posts found.')).toBeInTheDocument()
    expect(screen.getAllByText('1 / 1')).toHaveLength(2)
  })

  it('paginates works and blog posts independently and renders branch-specific metadata', () => {
    render(
      <AdminDashboardCollections
        works={[
          {
            id: 'work-1',
            title: 'Work one',
            slug: 'work-one',
            excerpt: 'work excerpt',
            category: 'platform',
            tags: [],
            published: true,
            publishedAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 'work-2',
            title: 'Work two',
            slug: 'work-two',
            excerpt: '',
            category: '',
            tags: [],
            published: false,
          },
        ]}
        blogs={[
          {
            id: 'blog-1',
            title: 'Blog one',
            slug: 'blog-one',
            excerpt: 'blog excerpt',
            tags: ['alpha'],
            published: true,
            publishedAt: '2024-01-02T00:00:00.000Z',
          },
          {
            id: 'blog-2',
            title: 'Blog two',
            slug: 'blog-two',
            excerpt: '',
            tags: [],
            published: false,
          },
        ]}
      />,
    )

    expect(screen.getByText('Work one')).toBeInTheDocument()
    expect(screen.getByText('platform')).toBeInTheDocument()
    expect(screen.getByText('Blog one')).toBeInTheDocument()
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getAllByText('Published')).toHaveLength(2)

    const nextButtons = screen.getAllByRole('button', { name: '다음' })
    fireEvent.click(nextButtons[0])
    fireEvent.click(nextButtons[1])

    expect(screen.getByText('Work two')).toBeInTheDocument()
    expect(screen.getByText('Uncategorized')).toBeInTheDocument()
    expect(screen.getByText('Blog two')).toBeInTheDocument()
    expect(screen.getByText('No tags')).toBeInTheDocument()
    expect(screen.getAllByText('Draft')).toHaveLength(2)
    expect(screen.getAllByText('—')).toHaveLength(2)

    const previousButtons = screen.getAllByRole('button', { name: '이전' })
    fireEvent.click(previousButtons[0])
    fireEvent.click(previousButtons[1])

    expect(screen.getByText('Work one')).toBeInTheDocument()
    expect(screen.getByText('Blog one')).toBeInTheDocument()
  })

  it('filters works and blog posts by title independently', () => {
    render(
      <AdminDashboardCollections
        works={[
          { id: 'work-1', title: 'Alpha Work', slug: 'work-one', excerpt: 'work excerpt', category: 'platform', tags: [], published: true, publishedAt: '2024-01-01T00:00:00.000Z' },
          { id: 'work-2', title: 'Beta Work', slug: 'work-two', excerpt: '', category: '', tags: [], published: false },
        ]}
        blogs={[
          { id: 'blog-1', title: 'Alpha Blog', slug: 'blog-one', excerpt: 'blog excerpt', tags: ['alpha'], published: true, publishedAt: '2024-01-02T00:00:00.000Z' },
          { id: 'blog-2', title: 'Beta Blog', slug: 'blog-two', excerpt: '', tags: [], published: false },
        ]}
      />,
    )

    fireEvent.change(screen.getByLabelText('Works title search'), { target: { value: 'beta' } })
    expect(screen.getByText('Beta Work')).toBeInTheDocument()
    expect(screen.queryByText('Alpha Work')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Blog Posts title search'), { target: { value: 'beta' } })
    expect(screen.getByText('Beta Blog')).toBeInTheDocument()
    expect(screen.queryByText('Alpha Blog')).not.toBeInTheDocument()
  })

  it('renders fallback dates for malformed dashboard collection dates', () => {
    const { container } = render(
      <AdminDashboardCollections
        works={[
          { id: 'work-1', title: 'Malformed Work Date', slug: 'work-one', excerpt: '', category: 'platform', tags: [], published: true, publishedAt: 'not-a-date' },
        ]}
        blogs={[
          { id: 'blog-1', title: 'Malformed Blog Date', slug: 'blog-one', excerpt: '', tags: [], published: true, publishedAt: 'not-a-date' },
        ]}
      />,
    )

    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(container.textContent).not.toMatch(/Invalid Date|RangeError|undefined|null/i)
  })

  it('renders safe dashboard text and edit links for malformed collection values', () => {
    const malformedWork = {
      id: null,
      title: null,
      slug: '',
      excerpt: '',
      category: null,
      tags: null,
      published: true,
      publishedAt: null,
    } as unknown as WorkAdminItem
    const malformedBlog = {
      id: null,
      title: null,
      slug: '',
      excerpt: '',
      tags: null,
      published: false,
      publishedAt: null,
    } as unknown as BlogAdminItem

    const { container } = render(
      <AdminDashboardCollections works={[malformedWork]} blogs={[malformedBlog]} />,
    )

    expect(screen.getByText('Untitled work')).toBeInTheDocument()
    expect(screen.getByText('Untitled blog post')).toBeInTheDocument()
    expect(screen.getByText('Uncategorized')).toBeInTheDocument()
    expect(screen.getByText('No tags')).toBeInTheDocument()
    expect(screen.getByTestId('works-card-link')).toHaveAttribute(
      'href',
      '/admin/works?returnTo=%2Fadmin%2Fdashboard',
    )
    expect(screen.getByTestId('blog-posts-card-link')).toHaveAttribute(
      'href',
      '/admin/blog?returnTo=%2Fadmin%2Fdashboard',
    )
    expect(container.textContent).not.toMatch(/undefined|null/i)
  })
})
