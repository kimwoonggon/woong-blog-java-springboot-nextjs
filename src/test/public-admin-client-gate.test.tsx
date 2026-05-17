import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PublicAdminClientGate, resetPublicAdminClientSessionForTests } from '@/components/admin/PublicAdminClientGate'

describe('PublicAdminClientGate', () => {
  afterEach(() => {
    resetPublicAdminClientSessionForTests()
    vi.unstubAllGlobals()
  })

  it('shows admin affordances after the browser session confirms admin role', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ authenticated: true, role: 'admin' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch)

    render(
      <PublicAdminClientGate>
        <button type="button">Admin edit</button>
      </PublicAdminClientGate>,
    )

    expect(await screen.findByRole('button', { name: 'Admin edit' })).toBeInTheDocument()
  })

  it('keeps admin affordances hidden for anonymous visitors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch)

    render(
      <PublicAdminClientGate>
        <button type="button">Admin edit</button>
      </PublicAdminClientGate>,
    )

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    }))
    expect(screen.queryByRole('button', { name: 'Admin edit' })).not.toBeInTheDocument()
  })

  it('keeps admin affordances hidden for authenticated non-admin visitors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ authenticated: true, role: 'author' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch)

    render(
      <PublicAdminClientGate>
        <button type="button">Admin edit</button>
      </PublicAdminClientGate>,
    )

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    }))
    expect(screen.queryByRole('button', { name: 'Admin edit' })).not.toBeInTheDocument()
  })

  it('keeps admin affordances hidden when the browser session check fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response('unauthorized', { status: 401 }),
    ) as typeof fetch)

    render(
      <PublicAdminClientGate>
        <button type="button">Admin edit</button>
      </PublicAdminClientGate>,
    )

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Admin edit' })).not.toBeInTheDocument()
  })

  it('keeps public content visible and admin affordances hidden when the session request rejects', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('SQLSTATE 08006 stack trace from WoongBlog.Api status 500')
    })
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    const { container } = render(
      <main>
        <h1>Public article</h1>
        <PublicAdminClientGate>
          <button type="button">Admin edit</button>
        </PublicAdminClientGate>
      </main>,
    )

    expect(screen.getByRole('heading', { name: 'Public article' })).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    }))
    expect(screen.queryByRole('button', { name: 'Admin edit' })).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/SQLSTATE|stack trace|WoongBlog\.Api|status 500|undefined|null/i)
  })

  it('keeps admin affordances hidden for malformed session payloads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ authenticated: true, role: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch)

    render(
      <PublicAdminClientGate>
        <button type="button">Admin edit</button>
      </PublicAdminClientGate>,
    )

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Admin edit' })).not.toBeInTheDocument()
  })

  it('deduplicates browser session checks when a public page has multiple admin gates', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ authenticated: true, role: 'admin' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    render(
      <>
        <PublicAdminClientGate>
          <button type="button">Manage studies</button>
        </PublicAdminClientGate>
        <PublicAdminClientGate>
          <button type="button">Create study</button>
        </PublicAdminClientGate>
      </>,
    )

    expect(await screen.findByRole('button', { name: 'Manage studies' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Create study' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('deduplicates rejected browser session checks across multiple admin gates', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('network down')
    })
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    render(
      <>
        <PublicAdminClientGate>
          <button type="button">Manage studies</button>
        </PublicAdminClientGate>
        <PublicAdminClientGate>
          <button type="button">Create study</button>
        </PublicAdminClientGate>
      </>,
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('button', { name: 'Manage studies' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create study' })).not.toBeInTheDocument()
  })

  it('allows tests to reset cached public admin session state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ authenticated: true, role: 'admin' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ authenticated: true, role: 'author' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    const first = render(
      <PublicAdminClientGate>
        <button type="button">Admin edit</button>
      </PublicAdminClientGate>,
    )
    expect(await screen.findByRole('button', { name: 'Admin edit' })).toBeInTheDocument()
    first.unmount()

    resetPublicAdminClientSessionForTests()

    render(
      <PublicAdminClientGate>
        <button type="button">Admin edit</button>
      </PublicAdminClientGate>,
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('button', { name: 'Admin edit' })).not.toBeInTheDocument()
  })
})
