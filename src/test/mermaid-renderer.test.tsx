import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MermaidRenderer } from '@/components/content/MermaidRenderer'

const mermaidMocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(async () => ({
    svg: '<svg id="mermaid-test" width="640" height="320"><g></g></svg>',
  })),
}))

vi.mock('mermaid', () => ({
  default: mermaidMocks,
}))

describe('MermaidRenderer', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    mermaidMocks.initialize.mockClear()
    mermaidMocks.render.mockClear()
  })

  it('centers rendered diagrams with overflow-safe SVG rules', async () => {
    const { container } = render(<MermaidRenderer code="flowchart TD\n  A --> B" />)

    await waitFor(() => {
      expect(container.querySelector('svg#mermaid-test')).toBeInTheDocument()
    })

    const wrapper = screen.getByTestId('mermaid-renderer')
    expect(wrapper.className).toContain('mermaid-diagram-shell')
    expect(wrapper.className).toContain('overflow-x-auto')
    expect(wrapper.className).toContain('text-center')
    expect(wrapper.className).toContain('[&_svg]:mx-auto')
    expect(wrapper.className).toContain('[&_svg]:block')
    expect(wrapper.className).toContain('[&_svg]:max-w-full')
  })

  it('keeps centering rules when callers provide a custom className', async () => {
    render(<MermaidRenderer code="flowchart LR\n  A --> B" className="my-custom-mermaid" />)

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-renderer')).toBeInTheDocument()
    })

    const wrapper = screen.getByTestId('mermaid-renderer')
    expect(wrapper.className).toContain('my-custom-mermaid')
    expect(wrapper.className).toContain('[&_svg]:mx-auto')
  })

  it('initializes Mermaid with GitHub-readable light theme variables', async () => {
    render(<MermaidRenderer code="flowchart TD\n  A --> B" />)

    await waitFor(() => {
      expect(mermaidMocks.initialize).toHaveBeenCalled()
    })

    expect(mermaidMocks.initialize).toHaveBeenCalledWith(expect.objectContaining({
      theme: 'base',
      themeVariables: expect.objectContaining({
        background: '#f6f8fa',
        primaryTextColor: '#1f2328',
        lineColor: '#57606a',
      }),
    }))
  })

  it('initializes Mermaid with GitHub-readable dark theme variables', async () => {
    document.documentElement.classList.add('dark')

    render(<MermaidRenderer code="flowchart TD\n  A --> B" />)

    await waitFor(() => {
      expect(mermaidMocks.initialize).toHaveBeenCalled()
    })

    expect(mermaidMocks.initialize).toHaveBeenCalledWith(expect.objectContaining({
      theme: 'base',
      themeVariables: expect.objectContaining({
        background: '#0d1117',
        primaryTextColor: '#e6edf3',
        lineColor: '#8b949e',
      }),
    }))
  })
})
