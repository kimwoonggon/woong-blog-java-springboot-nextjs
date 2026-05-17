import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/admin/PublicAdminClientGate', () => ({
  PublicAdminClientGate: () => null,
}))

vi.mock('@/components/admin/InlineAdminEditorShell', () => ({
  InlineAdminEditorShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/admin/ResumeEditor', () => ({
  ResumeEditor: () => <div data-testid="resume-editor" />,
}))

vi.mock('@/components/content/LocalQaQueryBoundary', () => ({
  LocalQaEmptyResumeBoundary: ({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) => (
    <>{children ?? fallback}</>
  ),
}))

describe('Resume PDF viewer SSR isolation', () => {
  afterEach(() => {
    cleanup()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('does not import react-pdf when loading the ResumePdfViewer wrapper module', async () => {
    vi.doMock('react-pdf', () => {
      throw new Error('react-pdf should not be imported during resume server render')
    })

    const resumePdfViewerModule = await import('@/components/content/ResumePdfViewer')

    expect(resumePdfViewerModule.ResumePdfViewer).toBeTypeOf('function')
  })

  it('renders a safe public empty state when no resume PDF exists', async () => {
    vi.doMock('@/lib/api/site-settings', () => ({
      fetchResume: vi.fn(async () => null),
    }))
    vi.doMock('@/components/content/ResumePdfViewer', () => ({
      ResumePdfViewer: ({ url }: { url: string }) => <div data-testid="resume-pdf-viewer">{url}</div>,
    }))

    const ResumePage = (await import('@/app/(public)/resume/page')).default
    render(await ResumePage())

    expect(screen.getByRole('heading', { name: 'Resume' })).toBeInTheDocument()
    expect(screen.getByText('Resume unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Download PDF/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('resume-pdf-viewer')).not.toBeInTheDocument()
    expect(screen.queryByText(/이력서 PDF 업로드|resume-editor/i)).not.toBeInTheDocument()
  }, 15_000)

  it('renders the same safe public empty state when the resume fetch fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.doMock('@/lib/api/site-settings', () => ({
      fetchResume: vi.fn(async () => {
        throw new Error('Failed to load public resume. Status 500. stack trace')
      }),
    }))
    vi.doMock('@/components/content/ResumePdfViewer', () => ({
      ResumePdfViewer: ({ url }: { url: string }) => <div data-testid="resume-pdf-viewer">{url}</div>,
    }))

    const ResumePage = (await import('@/app/(public)/resume/page')).default
    render(await ResumePage())

    expect(screen.getByRole('heading', { name: 'Resume' })).toBeInTheDocument()
    expect(screen.getByText('Resume unavailable')).toBeInTheDocument()
    expect(screen.queryByText(/Status 500|stack trace/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Download PDF/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('resume-pdf-viewer')).not.toBeInTheDocument()
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load public resume.', expect.any(Error))
  }, 15_000)
})
