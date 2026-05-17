import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetPublicAdminClientSessionForTests } from '@/components/admin/PublicAdminClientGate'
import { PublicBlogListAdminCreate } from '@/components/admin/PublicBlogListAdminCreate'
import { PublicWorksListAdminCreate } from '@/components/admin/PublicWorksListAdminCreate'

vi.mock('@/components/admin/InlineBlogEditorSection', () => ({
  InlineBlogEditorSection: ({ afterSaveHref, triggerLabel }: { afterSaveHref?: string; triggerLabel?: string }) => (
    <button type="button">{triggerLabel ?? 'Blog create'}: {afterSaveHref}</button>
  ),
}))

vi.mock('@/components/admin/PublicWorksInlineCreateShell', () => ({
  PublicWorksInlineCreateShell: () => <button type="button">새 작업 쓰기</button>,
}))

describe('public list admin create affordances', () => {
  afterEach(() => {
    resetPublicAdminClientSessionForTests()
    vi.unstubAllGlobals()
  })

  it('shows public Blog and Works create affordances for admins with stable labels', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ authenticated: true, role: 'admin' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch)

    render(
      <>
        <PublicBlogListAdminCreate afterSaveHref="/blog?page=2&pageSize=12" />
        <PublicWorksListAdminCreate />
      </>,
    )

    expect(await screen.findByRole('button', { name: '새 글 쓰기: /blog?page=2&pageSize=12' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: '새 작업 쓰기' })).toBeInTheDocument()
    expect(screen.queryByText(/undefined|null/i)).not.toBeInTheDocument()
  })

  it('hides public list create affordances for anonymous visitors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch)

    render(
      <>
        <PublicBlogListAdminCreate afterSaveHref="/blog" />
        <PublicWorksListAdminCreate />
      </>,
    )

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /새 글 쓰기/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /새 작업 쓰기/i })).not.toBeInTheDocument()
  })

  it('hides public list create affordances when the session check fails without leaking raw details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('WoongBlog.Api stack trace status 500')
    }) as typeof fetch)

    const { container } = render(
      <main>
        <h1>Public list</h1>
        <PublicBlogListAdminCreate afterSaveHref="/blog" />
        <PublicWorksListAdminCreate />
      </main>,
    )

    expect(screen.getByRole('heading', { name: 'Public list' })).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /새 글 쓰기/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /새 작업 쓰기/i })).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/WoongBlog\.Api|stack trace|status 500|undefined|null/i)
  })
})
