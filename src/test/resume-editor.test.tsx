import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResumeEditor } from '@/components/admin/ResumeEditor'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  fetchWithCsrf: vi.fn(),
  confirm: vi.fn(() => true),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('sonner', () => ({ toast: mocks.toast }))

vi.mock('@/lib/api/browser', () => ({
  getBrowserApiBaseUrl: () => '/api',
}))

vi.mock('@/lib/api/auth', () => ({
  fetchWithCsrf: mocks.fetchWithCsrf,
}))

describe('ResumeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchWithCsrf.mockReset()
    vi.stubGlobal('confirm', mocks.confirm)
  })

  it('renders an existing resume asset with a public download link', () => {
    render(
      <ResumeEditor
        resumeAsset={{ id: 'resume-1', bucket: 'public-resume', path: 'public-resume/resume.pdf' }}
      />,
    )

    expect(screen.getByText('public-resume/resume.pdf')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Download resume' })).toHaveAttribute('href', '/media/public-resume/resume.pdf')
    expect(screen.getByRole('link', { name: 'Download resume' })).toHaveAttribute('download')
  })

  it('ignores upload events that do not contain a file', () => {
    render(<ResumeEditor resumeAsset={null} />)

    const fileInput = document.querySelector('#resume-upload') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [] } })

    expect(mocks.fetchWithCsrf).not.toHaveBeenCalled()
  })

  it('rejects PDF-like files with invalid MIME or invalid extension before upload', async () => {
    render(<ResumeEditor resumeAsset={null} />)

    const fileInput = document.querySelector('#resume-upload') as HTMLInputElement
    fireEvent.change(fileInput, {
      target: { files: [new File(['pdf'], 'resume.txt', { type: 'application/pdf' })] },
    })

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Please upload a PDF file.')
    })

    fireEvent.change(fileInput, {
      target: { files: [new File(['not-pdf'], 'resume.pdf', { type: 'text/plain' })] },
    })

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledTimes(2)
    })
    expect(mocks.fetchWithCsrf).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })

  it('rejects empty PDF files before upload', async () => {
    render(<ResumeEditor resumeAsset={null} />)

    const fileInput = document.querySelector('#resume-upload') as HTMLInputElement
    fireEvent.change(fileInput, {
      target: { files: [new File([], 'resume.pdf', { type: 'application/pdf' })] },
    })

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Please upload a non-empty PDF file.')
    })
    expect(mocks.fetchWithCsrf).not.toHaveBeenCalled()
  })

  it('uploads a pdf, links it in site settings, and refreshes the page', async () => {
    mocks.fetchWithCsrf
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'resume-1', path: 'public-resume/resume.pdf' }),
      })
      .mockResolvedValueOnce({ ok: true })

    render(<ResumeEditor resumeAsset={null} />)

    const fileInput = document.querySelector('#resume-upload') as HTMLInputElement
    const file = new File(['pdf'], 'resume.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mocks.toast.success).toHaveBeenCalledWith('Resume uploaded and linked!', { id: 'toast-id' })
    })

    expect(mocks.fetchWithCsrf).toHaveBeenNthCalledWith(
      1,
      '/api/uploads',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    )
    expect(mocks.fetchWithCsrf).toHaveBeenNthCalledWith(
      2,
      '/api/admin/site-settings',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeAssetId: 'resume-1' }),
      }),
    )
    expect(screen.getByText('public-resume/resume.pdf')).toBeInTheDocument()
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('surfaces upload-linking failures after the binary upload succeeds', async () => {
    mocks.fetchWithCsrf
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'resume-1', path: 'public-resume/resume.pdf' }),
      })
      .mockResolvedValueOnce({ ok: false })

    render(<ResumeEditor resumeAsset={null} />)

    const fileInput = document.querySelector('#resume-upload') as HTMLInputElement
    const file = new File(['pdf'], 'resume.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Failed to link resume to settings', { id: 'toast-id' })
    })
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('sanitizes binary upload failures before linking settings', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'R2 storage binary upload failed with stack trace status 500' }),
    })

    render(<ResumeEditor resumeAsset={null} />)

    const fileInput = document.querySelector('#resume-upload') as HTMLInputElement
    const file = new File(['pdf'], 'resume.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith(
        'Resume could not be uploaded. Please retry after storage is healthy.',
        { id: 'toast-id' },
      )
    })
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringContaining('R2 storage'), expect.anything())
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringContaining('stack trace'), expect.anything())
    expect(mocks.fetchWithCsrf).toHaveBeenCalledTimes(1)
    expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(screen.getByText(/No resume uploaded yet/i)).toBeInTheDocument()
  })

  it('allows reselect retry after a failed resume upload', async () => {
    mocks.fetchWithCsrf
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'binary upload failed' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'resume-2', path: 'public-resume/retry.pdf' }),
      })
      .mockResolvedValueOnce({ ok: true })

    render(<ResumeEditor resumeAsset={null} />)

    const fileInput = document.querySelector('#resume-upload') as HTMLInputElement
    fireEvent.change(fileInput, {
      target: { files: [new File(['pdf'], 'resume.pdf', { type: 'application/pdf' })] },
    })

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('binary upload failed', { id: 'toast-id' })
    })

    fireEvent.change(fileInput, {
      target: { files: [new File(['pdf'], 'retry.pdf', { type: 'application/pdf' })] },
    })

    await waitFor(() => {
      expect(mocks.toast.success).toHaveBeenCalledWith('Resume uploaded and linked!', { id: 'toast-id' })
    })
    expect(screen.getByText('public-resume/retry.pdf')).toBeInTheDocument()
  })

  it('falls back to the generic upload error message when a non-Error rejection is thrown', async () => {
    mocks.fetchWithCsrf.mockRejectedValueOnce('unexpected failure')

    render(<ResumeEditor resumeAsset={null} />)

    const fileInput = document.querySelector('#resume-upload') as HTMLInputElement
    const file = new File(['pdf'], 'resume.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Failed to upload', { id: 'toast-id' })
    })
  })

  it('does nothing when delete is cancelled', async () => {
    mocks.confirm.mockReturnValueOnce(false)

    render(
      <ResumeEditor
        resumeAsset={{ id: 'resume-1', bucket: 'public-resume', path: 'public-resume/resume.pdf' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete resume' }))

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled()
    })
    expect(mocks.fetchWithCsrf).not.toHaveBeenCalled()
  })

  it('continues deleting the linked resume even when asset deletion fails', async () => {
    mocks.fetchWithCsrf
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'storage offline' }),
      })

    render(
      <ResumeEditor
        resumeAsset={{ id: 'resume-1', bucket: 'public-resume', path: 'public-resume/resume.pdf' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete resume' }))

    await waitFor(() => {
      expect(mocks.toast.success).toHaveBeenCalledWith('Resume removed successfully!', { id: 'toast-id' })
    })

    expect(mocks.fetchWithCsrf).toHaveBeenNthCalledWith(
      1,
      '/api/admin/site-settings',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ resumeAssetId: null }),
      }),
    )
    expect(mocks.fetchWithCsrf).toHaveBeenNthCalledWith(
      2,
      '/api/uploads?id=resume-1',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(screen.getByText(/No resume uploaded yet/i)).toBeInTheDocument()
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('surfaces site-settings update failures during delete and keeps the existing asset', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce({ ok: false })

    render(
      <ResumeEditor
        resumeAsset={{ id: 'resume-1', bucket: 'public-resume', path: 'public-resume/resume.pdf' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete resume' }))

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Failed to update site settings', { id: 'toast-id' })
    })
    expect(screen.getByText('public-resume/resume.pdf')).toBeInTheDocument()
  })

  it('falls back to the generic remove error message when delete throws a non-Error value', async () => {
    mocks.fetchWithCsrf.mockRejectedValueOnce('unexpected failure')

    render(
      <ResumeEditor
        resumeAsset={{ id: 'resume-1', bucket: 'public-resume', path: 'public-resume/resume.pdf' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete resume' }))

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Failed to remove', { id: 'toast-id' })
    })
  })
})
