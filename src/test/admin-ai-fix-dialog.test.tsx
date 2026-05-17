import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AIFixDialog } from '@/components/admin/AIFixDialog'

const mocks = vi.hoisted(() => ({
  fetchWithCsrf: vi.fn(),
  fetchAdminAiRuntimeConfigBrowser: vi.fn(),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/lib/api/auth', () => ({
  fetchWithCsrf: mocks.fetchWithCsrf,
}))

vi.mock('@/lib/api/admin-ai', () => ({
  fetchAdminAiRuntimeConfigBrowser: mocks.fetchAdminAiRuntimeConfigBrowser,
}))

vi.mock('@/components/admin/TiptapEditor', () => ({
  TiptapEditor: ({ content }: { content: string }) => <div data-testid="mock-tiptap">{content}</div>,
}))

vi.mock('sonner', () => ({ toast: mocks.toast }))

function makeJsonResponse(payload: unknown, ok = true, status = ok ? 200 : 400) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('AIFixDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()

    mocks.fetchAdminAiRuntimeConfigBrowser.mockResolvedValue({
      provider: 'codex',
      availableProviders: ['openai', 'codex'],
      defaultModel: 'gpt-5.4',
      codexModel: 'gpt-5.4',
      codexReasoningEffort: 'medium',
      allowedCodexModels: ['gpt-5.4'],
      allowedCodexReasoningEfforts: ['low', 'medium', 'high'],
      batchConcurrency: 2,
      batchCompletedRetentionDays: 14,
      defaultSystemPrompt: 'Default blog system prompt',
      defaultBlogFixPrompt: 'Default blog system prompt',
      defaultWorkEnrichPrompt: 'Work prompt for {title}',
    })
    mocks.fetchWithCsrf.mockResolvedValue(makeJsonResponse({ fixedHtml: '<p>fixed</p>' }))
  })

  it('prefills and sends the editable custom system prompt', async () => {
    render(<AIFixDialog content="<p>draft</p>" onApply={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'AI Content Fixer' }))

    await waitFor(() => {
      expect(screen.getByLabelText('AI system prompt')).toHaveValue('Default blog system prompt')
    })

    fireEvent.change(screen.getByLabelText('AI system prompt'), {
      target: { value: 'Apply this single-fix prompt.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save prompt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start AI Fix' }))

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenCalled()
    })

    const [, request] = mocks.fetchWithCsrf.mock.calls[0] as [string, { body: string }]
    expect(JSON.parse(request.body)).toMatchObject({
      html: '<p>draft</p>',
      provider: 'codex',
      codexModel: 'gpt-5.4',
      codexReasoningEffort: 'medium',
      customPrompt: 'Apply this single-fix prompt.',
    })
    expect(window.localStorage.getItem('admin-ai-blog-fix-system-prompt')).toBe('Apply this single-fix prompt.')
  })

  it('requires saving prompt edits before generating', async () => {
    render(<AIFixDialog content="<p>draft</p>" onApply={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'AI Content Fixer' }))

    await waitFor(() => {
      expect(screen.getByLabelText('AI system prompt')).toHaveValue('Default blog system prompt')
    })

    fireEvent.change(screen.getByLabelText('AI system prompt'), {
      target: { value: 'Unsaved prompt.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start AI Fix' }))

    expect(mocks.toast.error).toHaveBeenCalledWith('Save the system prompt before generating an AI fix.')
    expect(mocks.fetchWithCsrf).not.toHaveBeenCalled()
  })

  it('shows OpenAI and Codex provider options when the runtime config allows both', async () => {
    mocks.fetchAdminAiRuntimeConfigBrowser.mockResolvedValueOnce({
      provider: 'openai',
      availableProviders: ['openai', 'codex'],
      defaultModel: 'gpt-4.1',
      codexModel: 'gpt-5.4',
      codexReasoningEffort: 'medium',
      allowedCodexModels: ['gpt-5.4'],
      allowedCodexReasoningEfforts: ['low', 'medium', 'high'],
      batchConcurrency: 2,
      batchCompletedRetentionDays: 14,
      defaultSystemPrompt: 'Default blog system prompt',
      defaultBlogFixPrompt: 'Default blog system prompt',
      defaultWorkEnrichPrompt: 'Work prompt for {title}',
    })

    render(<AIFixDialog content="<p>draft</p>" onApply={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'AI Content Fixer' }))

    const providerSelect = await screen.findByLabelText('AI provider')
    expect(providerSelect).toHaveValue('openai')
    expect(screen.getByRole('option', { name: 'OPENAI' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'CODEX' })).toBeInTheDocument()
  })

  it('keeps a safe fallback UI when runtime config fails to load', async () => {
    mocks.fetchAdminAiRuntimeConfigBrowser.mockRejectedValueOnce(new Error('Runtime config unavailable.'))

    render(<AIFixDialog content="<p>draft stays local</p>" onApply={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'AI Content Fixer' }))

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Runtime config unavailable.')
    })

    expect(screen.getByLabelText('AI system prompt')).toHaveValue('')
    expect(screen.getByText('openai')).toBeInTheDocument()
    expect(screen.getByText('draft stays local')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start AI Fix' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Apply Changes' })).not.toBeInTheDocument()
    expect(mocks.fetchWithCsrf).not.toHaveBeenCalled()
  })

  it('does not crash when runtime config is malformed and falls back to defaults', async () => {
    mocks.fetchAdminAiRuntimeConfigBrowser.mockResolvedValueOnce({
      availableProviders: undefined,
      provider: undefined,
      defaultModel: undefined,
      codexModel: undefined,
      codexReasoningEffort: undefined,
      allowedCodexModels: undefined,
      allowedCodexReasoningEfforts: undefined,
      batchConcurrency: undefined,
      batchCompletedRetentionDays: undefined,
      defaultSystemPrompt: undefined,
      defaultBlogFixPrompt: undefined,
      defaultWorkEnrichPrompt: undefined,
    })

    render(<AIFixDialog content="<p>malformed config draft</p>" onApply={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'AI Content Fixer' }))

    await waitFor(() => {
      expect(screen.getByLabelText('AI system prompt')).toHaveValue('')
    })

    expect(screen.getByText('openai')).toBeInTheDocument()
    expect(screen.queryByLabelText('AI provider')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Codex model')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start AI Fix' })).toBeEnabled()
  })

  it('falls back to the configured provider when the provider list is empty', async () => {
    mocks.fetchAdminAiRuntimeConfigBrowser.mockResolvedValueOnce({
      provider: 'codex',
      availableProviders: [],
      defaultModel: 'gpt-5.4',
      codexModel: 'gpt-5.4-mini',
      codexReasoningEffort: 'high',
      allowedCodexModels: ['gpt-5.4-mini'],
      allowedCodexReasoningEfforts: ['high'],
      batchConcurrency: 2,
      batchCompletedRetentionDays: 14,
      defaultSystemPrompt: 'Fallback prompt',
      defaultBlogFixPrompt: 'Fallback prompt',
      defaultWorkEnrichPrompt: 'Work prompt for {title}',
    })

    render(<AIFixDialog content="<p>draft</p>" onApply={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'AI Content Fixer' }))

    await waitFor(() => {
      expect(screen.getByText('codex')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('AI system prompt')).toHaveValue('Fallback prompt')
    expect(screen.getByLabelText('Model')).toHaveValue('gpt-5.4-mini')
    expect(screen.getByLabelText('Reasoning')).toHaveValue('high')
  })

  it('saves and restores the custom system prompt', async () => {
    render(<AIFixDialog content="<p>draft</p>" onApply={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'AI Content Fixer' }))

    await waitFor(() => {
      expect(screen.getByLabelText('AI system prompt')).toHaveValue('Default blog system prompt')
    })

    fireEvent.change(screen.getByLabelText('AI system prompt'), {
      target: { value: 'Saved single prompt.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save prompt' }))

    expect(window.localStorage.getItem('admin-ai-blog-fix-system-prompt')).toBe('Saved single prompt.')
    expect(mocks.toast.success).toHaveBeenCalledWith('System prompt saved')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'AI Content Fixer' }))

    await waitFor(() => {
      expect(screen.getByLabelText('AI system prompt')).toHaveValue('Saved single prompt.')
    })
  })

  it('shows a timeout error, preserves the original draft, and lets the user retry', async () => {
    mocks.fetchWithCsrf
      .mockResolvedValueOnce(makeJsonResponse({ error: 'Gateway timeout' }, false, 504))
      .mockResolvedValueOnce(makeJsonResponse({ fixedHtml: '<p>fixed on retry</p>' }))

    render(<AIFixDialog content="<p>draft before timeout</p>" onApply={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'AI Content Fixer' }))

    await waitFor(() => {
      expect(screen.getByLabelText('AI system prompt')).toHaveValue('Default blog system prompt')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Start AI Fix' }))

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('AI fix timed out while waiting for the backend response. Please retry.')
    })

    expect(screen.getByText('draft before timeout')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-tiptap')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply Changes' })).not.toBeInTheDocument()
    expect(mocks.toast.success).not.toHaveBeenCalledWith('AI changes applied successfully')

    fireEvent.click(screen.getByRole('button', { name: 'Start AI Fix' }))

    await waitFor(() => {
      expect(screen.getByTestId('mock-tiptap')).toHaveTextContent('fixed on retry')
    })

    expect(screen.getByRole('button', { name: 'Apply Changes' })).toBeVisible()
    expect(mocks.fetchWithCsrf).toHaveBeenCalledTimes(2)
  })

  it('shows a backend AI error without exposing stale apply controls', async () => {
    const onApply = vi.fn()
    mocks.fetchWithCsrf.mockResolvedValueOnce(makeJsonResponse({ error: 'AI provider unavailable' }, false, 500))

    render(<AIFixDialog content="<p>draft before backend error</p>" onApply={onApply} />)

    fireEvent.click(screen.getByRole('button', { name: 'AI Content Fixer' }))

    await waitFor(() => {
      expect(screen.getByLabelText('AI system prompt')).toHaveValue('Default blog system prompt')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Start AI Fix' }))

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('AI provider unavailable')
    })

    expect(screen.getByText('draft before backend error')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply Changes' })).not.toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalledWith('AI changes applied successfully')
  })

  it('keeps the edited prompt when AI Enrich generates a fix', async () => {
    render(
      <AIFixDialog
        content="<p>work draft</p>"
        onApply={vi.fn()}
        apiEndpoint="/api/admin/ai/work-enrich"
        title="AI Enrich"
        extraBodyParams={{ title: 'Work title' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'AI Enrich' }))

    await waitFor(() => {
      expect(screen.getByLabelText('AI system prompt')).toHaveValue('Work prompt for Work title')
    })

    fireEvent.change(screen.getByLabelText('AI system prompt'), {
      target: { value: 'Saved enrich prompt.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save prompt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start AI Fix' }))

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenCalled()
    })

    const [, request] = mocks.fetchWithCsrf.mock.calls[0] as [string, { body: string }]
    expect(JSON.parse(request.body)).toMatchObject({
      html: '<p>work draft</p>',
      title: 'Work title',
      customPrompt: 'Saved enrich prompt.',
    })
    expect(window.localStorage.getItem('admin-ai-work-enrich-system-prompt')).toBe('Saved enrich prompt.')
    expect(screen.getByLabelText('AI system prompt')).toHaveValue('Saved enrich prompt.')
  })

  it('keeps work enrich safe after a mocked failure and applies a retried result', async () => {
    const onApply = vi.fn()
    mocks.fetchWithCsrf
      .mockResolvedValueOnce(makeJsonResponse({ error: 'Work enrich failed safely' }, false, 500))
      .mockResolvedValueOnce(makeJsonResponse({ fixedHtml: '<p>enriched work retry</p>' }))

    render(
      <AIFixDialog
        content="<p>work draft before enrich</p>"
        onApply={onApply}
        apiEndpoint="/api/admin/ai/work-enrich"
        title="AI Enrich"
        extraBodyParams={{ title: 'Retryable work' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'AI Enrich' }))

    await waitFor(() => {
      expect(screen.getByLabelText('AI system prompt')).toHaveValue('Work prompt for Retryable work')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Start AI Fix' }))

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Work enrich failed safely')
    })

    expect(screen.getByText('work draft before enrich')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply Changes' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Start AI Fix' }))

    await waitFor(() => {
      expect(screen.getByTestId('mock-tiptap')).toHaveTextContent('enriched work retry')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Apply Changes' }))

    expect(onApply).toHaveBeenCalledWith('<p>enriched work retry</p>')
    expect(mocks.toast.success).toHaveBeenCalledWith('AI changes applied successfully')
  })
})
