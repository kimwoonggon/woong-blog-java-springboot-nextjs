import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InlineWorkEditorSection } from '@/components/admin/InlineWorkEditorSection'

const mocks = vi.hoisted(() => ({
  deleteAdminWork: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
  }),
}))

vi.mock('@/lib/api/admin-mutations', () => ({
  deleteAdminWork: mocks.deleteAdminWork,
}))

vi.mock('sonner', () => ({
  toast: mocks.toast,
}))

vi.mock('@/components/admin/WorkEditor', () => ({
  WorkEditor: ({ onSaved }: { onSaved?: () => void }) => (
    <div>
      <p>Mock work editor</p>
      <button type="button" onClick={() => onSaved?.()}>
        Complete work save
      </button>
    </div>
  ),
}))

describe('InlineWorkEditorSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.deleteAdminWork.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('closes the inline shell after the editor reports save completion', () => {
    render(
      <InlineWorkEditorSection
        initialWork={{
          id: 'work-1',
          title: 'Saved work',
        }}
        afterDeleteHref="/works"
      />,
    )

    expect(screen.queryByText('Mock work editor')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /작업 수정/i }))
    expect(screen.getByText('Mock work editor')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Complete work save/i }))

    expect(screen.queryByText('Mock work editor')).not.toBeInTheDocument()
  })

  it('deletes the work and returns to the requested page', async () => {
    render(
      <InlineWorkEditorSection
        initialWork={{
          id: 'work-1',
          title: 'Deleted work',
          slug: 'deleted-work',
        }}
        afterDeleteHref="/works?page=2&pageSize=8"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => {
      expect(mocks.deleteAdminWork).toHaveBeenCalledWith('work-1', 'deleted-work')
    })
    expect(mocks.push).toHaveBeenCalledWith('/works?page=2&pageSize=8')
    expect(mocks.refresh).toHaveBeenCalled()
    expect(mocks.toast.success).toHaveBeenCalledWith('Work deleted')
  })

  it('sanitizes technical delete failures and leaves the inline work action retryable', async () => {
    mocks.deleteAdminWork.mockRejectedValueOnce(
      new Error('SQLSTATE 23503 stack trace at WoongBlog.Api.Modules.Works status 500'),
    )

    render(
      <InlineWorkEditorSection
        initialWork={{
          id: 'work-1',
          title: 'Technical delete work',
          slug: 'technical-delete-work',
        }}
        afterDeleteHref="/works?page=2&pageSize=8"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => {
      expect(mocks.deleteAdminWork).toHaveBeenCalledWith('work-1', 'technical-delete-work')
    })
    expect(mocks.toast.error).toHaveBeenCalledWith('Work could not be deleted. Please retry after the backend is healthy.')
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringMatching(/SQLSTATE|stack trace|WoongBlog\.Api|status 500/i))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '삭제' })).toBeEnabled()
    })
    expect(mocks.push).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })
})
