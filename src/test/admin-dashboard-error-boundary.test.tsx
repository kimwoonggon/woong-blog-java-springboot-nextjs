import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AdminDashboardError from '@/app/admin/dashboard/error'

describe('AdminDashboardError', () => {
  it('renders a safe admin dashboard boundary message without raw backend details', () => {
    const reset = vi.fn()
    const { container } = render(
      <AdminDashboardError
        error={new Error('SQLSTATE 08006 stack trace from WoongBlog.Api status 500')}
        reset={reset}
      />,
    )

    expect(screen.getByText('Dashboard data is unavailable.')).toBeInTheDocument()
    expect(screen.getByText('Retry after the backend and session state recover.')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/SQLSTATE|stack|trace|status 500|WoongBlog\.Api|undefined|null/i)

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
