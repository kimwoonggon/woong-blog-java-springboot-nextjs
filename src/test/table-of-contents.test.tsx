import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TableOfContents, slugifyHeading } from '@/components/content/TableOfContents'
import { WorkTableOfContentsRail } from '@/components/content/WorkTableOfContentsRail'

beforeEach(() => {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root = null
    readonly rootMargin = '0px'
    readonly thresholds = [0]
    disconnect() {}
    observe() {}
    takeRecords() { return [] }
    unobserve() {}
  }

  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('slugifyHeading', () => {
  it('normalizes heading copy into stable slugs', () => {
    expect(slugifyHeading('Why Seed Data Matters')).toBe('why-seed-data-matters')
    expect(slugifyHeading('운영 관점의 이점')).toBe('운영-관점의-이점')
  })

  it('appends suffixes for duplicate headings', () => {
    const usedSlugs = new Map<string, number>()

    expect(slugifyHeading('Highlights', usedSlugs)).toBe('highlights')
    expect(slugifyHeading('Highlights', usedSlugs)).toBe('highlights-2')
  })

  it('keeps TOC shell visible with a fallback message when no headings exist', async () => {
    document.body.innerHTML = '<article id="toc-empty-content"><p>No headings yet.</p></article>'

    render(<TableOfContents contentRootId="toc-empty-content" />)

    await waitFor(() => {
      expect(screen.getByTestId('blog-toc')).toBeInTheDocument()
    })
    expect(screen.getByTestId('blog-toc-empty')).toHaveTextContent('No sections yet')
  })

  it('collects h1, h2, and h3 headings including hash-prefixed titles', async () => {
    document.body.innerHTML = `
      <article id="toc-rich-content">
        <h1># Overview</h1>
        <h2>Details</h2>
        <h3>Sub details</h3>
      </article>
    `

    render(<TableOfContents contentRootId="toc-rich-content" />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: '# Overview' })).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sub details' })).toBeInTheDocument()
  })

  it('renders a custom title and test id for work detail TOCs', async () => {
    document.body.innerHTML = '<article id="toc-work-content"><h2>Overview</h2></article>'

    render(<TableOfContents contentRootId="toc-work-content" title="On This Work" testId="work-toc" />)

    await waitFor(() => {
      expect(screen.getByText('On This Work')).toBeInTheDocument()
    })
    expect(screen.getByTestId('work-toc')).toBeInTheDocument()
  })

  it('keeps collapse controls accessible while leaving summary copy in the rail', async () => {
    document.body.innerHTML = `
      <article id="toc-collapsible-content">
        <h2>First Section</h2>
        <h2>Second Section</h2>
      </article>
    `

    render(<TableOfContents contentRootId="toc-collapsible-content" />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'First Section' })).toBeInTheDocument()
    })

    const list = screen.getByRole('list')
    const collapseButton = screen.getByRole('button', { name: 'Collapse' })
    expect(list.id).toBeTruthy()
    expect(collapseButton).toHaveAttribute('aria-controls', list.id)

    fireEvent.click(collapseButton)

    expect(collapseButton).toHaveTextContent('Expand')
    expect(collapseButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'First Section' })).not.toBeInTheDocument()
    expect(screen.getByTestId('blog-toc-collapsed-summary')).toHaveTextContent('2 sections hidden')
  })

  it('leaves sticky positioning and internal scrolling to page-level wrappers', async () => {
    document.body.innerHTML = '<article id="toc-generic-content"><h2>Overview</h2></article>'

    render(<TableOfContents contentRootId="toc-generic-content" />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument()
    })

    const toc = screen.getByTestId('blog-toc')
    expect(toc).not.toHaveAttribute('data-range-state')
    expect(toc.className).not.toContain('sticky')
    expect(toc.className).not.toContain('overflow-y-auto')
  })

  it('tracks the configured sticky range state in the Works rail wrapper', async () => {
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
      writable: true,
    })

    document.body.innerHTML = `
      <div id="work-toc-start"></div>
      <article id="toc-range-content">
        <h2>Overview</h2>
      </article>
      <div id="work-toc-end"></div>
    `

    const start = document.getElementById('work-toc-start')
    const end = document.getElementById('work-toc-end')

    Object.defineProperty(start, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 480 - window.scrollY,
        bottom: 520 - window.scrollY,
        left: 0,
        right: 0,
        width: 0,
        height: 40,
        x: 0,
        y: 480 - window.scrollY,
        toJSON: () => ({}),
      }),
    })

    Object.defineProperty(end, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 1320 - window.scrollY,
        bottom: 1360 - window.scrollY,
        left: 0,
        right: 0,
        width: 0,
        height: 40,
        x: 0,
        y: 1320 - window.scrollY,
        toJSON: () => ({}),
      }),
    })

    render(
      <WorkTableOfContentsRail
        contentRootId="toc-range-content"
        title="On This Work"
        rangeStartId="work-toc-start"
        rangeEndId="work-toc-end"
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('work-toc-rail')).toHaveAttribute('data-range-state', 'before')
    })

    window.scrollY = 600
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('work-toc-rail')).toHaveAttribute('data-range-state', 'active')
    })

    window.scrollY = 1400
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('work-toc-rail')).toHaveAttribute('data-range-state', 'after')
    })

    expect(screen.getByTestId('work-toc').className).not.toContain('overflow-y-auto')
  })

  it('moves the Works rail below an overlapping wide video frame', async () => {
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 600,
      writable: true,
    })

    document.body.innerHTML = `
      <div id="work-toc-start"></div>
      <article id="toc-video-overlap-content">
        <h2>Overview</h2>
        <div data-work-video-frame="true"></div>
      </article>
      <div id="work-toc-end"></div>
    `

    const start = document.getElementById('work-toc-start')
    const end = document.getElementById('work-toc-end')
    const videoFrame = document.querySelector('[data-work-video-frame="true"]')

    Object.defineProperty(start, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    })

    Object.defineProperty(end, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 1600,
        bottom: 1600,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 1600,
        toJSON: () => ({}),
      }),
    })

    Object.defineProperty(videoFrame, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 80,
        bottom: 360,
        left: 720,
        right: 1280,
        width: 560,
        height: 280,
        x: 720,
        y: 80,
        toJSON: () => ({}),
      }),
    })

    render(
      <WorkTableOfContentsRail
        contentRootId="toc-video-overlap-content"
        title="On This Work"
        rangeStartId="work-toc-start"
        rangeEndId="work-toc-end"
      />,
    )

    const rail = screen.getByTestId('work-toc-rail')
    Object.defineProperty(rail, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 112,
        bottom: 312,
        left: 900,
        right: 1180,
        width: 280,
        height: 200,
        x: 900,
        y: 112,
        toJSON: () => ({}),
      }),
    })

    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    await waitFor(() => {
      expect(rail).toHaveAttribute('data-video-overlap', 'true')
      expect(rail).toHaveStyle({ transform: 'translateY(264px)' })
    })
  })
})
