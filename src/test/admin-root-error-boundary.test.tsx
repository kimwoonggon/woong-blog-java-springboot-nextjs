import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AdminSegmentError from '@/app/admin/error'

describe('AdminSegmentError', () => {
  it('renders safe fallback copy without leaking raw backend details', () => {
    const reset = vi.fn()

    const { container } = render(
      <AdminSegmentError
        error={new Error('SQLSTATE 08006 stack trace from WoongBlog.Api status 500')}
        reset={reset}
      />,
    )

    expect(screen.getByText('The admin workspace could not be loaded.')).toBeInTheDocument()
    expect(screen.getByText('Retry after the session and backend are healthy.')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/SQLSTATE|stack|trace|status 500|WoongBlog\.Api|undefined|null/i)

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(reset).toHaveBeenCalledTimes(1)
  })
})
