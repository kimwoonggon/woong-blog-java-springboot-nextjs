import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminLogoutButton } from '@/app/admin/AdminLogoutButton'

const mocks = vi.hoisted(() => ({
  logoutWithCsrf: vi.fn(),
}))

vi.mock('@/lib/api/auth', () => ({
  logoutWithCsrf: mocks.logoutWithCsrf,
}))

describe('AdminLogoutButton', () => {
  let originalLocation: Location
  let assignMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mocks.logoutWithCsrf.mockReset()
    originalLocation = window.location
    assignMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign: assignMock },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('calls logoutWithCsrf with root redirect target', async () => {
    mocks.logoutWithCsrf.mockRejectedValueOnce(new Error('test'))

    render(<AdminLogoutButton />)
    fireEvent.click(screen.getByTestId('admin-logout-button'))

    await waitFor(() => {
      expect(mocks.logoutWithCsrf).toHaveBeenCalledWith('/')
    })
  })

  it('redirects only after a successful logout response', async () => {
    mocks.logoutWithCsrf.mockResolvedValueOnce('/signed-out')

    render(<AdminLogoutButton />)
    fireEvent.click(screen.getByTestId('admin-logout-button'))

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith('/signed-out')
    })
  })

  it('prevents duplicate submissions while sign out is pending', async () => {
    let rejectPromise: ((reason?: unknown) => void) | undefined
    const pending = new Promise<string>((_, reject) => {
      rejectPromise = reject
    })
    mocks.logoutWithCsrf.mockReturnValueOnce(pending)

    render(<AdminLogoutButton />)
    const button = screen.getByTestId('admin-logout-button')
    fireEvent.click(button)
    fireEvent.click(button)

    expect(mocks.logoutWithCsrf).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()

    rejectPromise?.(new Error('test'))
    await waitFor(() => expect(button).not.toBeDisabled())
  })

  it('preserves the signed-in UI after logout failure and does not claim success', async () => {
    mocks.logoutWithCsrf.mockRejectedValueOnce(new Error('logout failed'))

    render(<AdminLogoutButton />)
    const button = screen.getByTestId('admin-logout-button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })

    expect(button).toHaveTextContent('Logout')
    expect(button).not.toHaveTextContent('Logging out...')
    expect(assignMock).not.toHaveBeenCalled()
  })
})
