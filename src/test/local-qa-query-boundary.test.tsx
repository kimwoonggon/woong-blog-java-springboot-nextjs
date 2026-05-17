import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalQaBrokenPageBoundary, LocalQaEmptyResumeBoundary, LocalQaNoImageBoundary } from '@/components/content/LocalQaQueryBoundary'

const navigationMocks = vi.hoisted(() => ({
  search: '',
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigationMocks.search),
}))

describe('local QA query boundaries', () => {
  beforeEach(() => {
    navigationMocks.search = ''
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new URL('http://127.0.0.1:3000/introduction'),
    })
  })

  it('shows the public page fallback only for local broken-page QA requests', () => {
    navigationMocks.search = '__qaBroken=1'

    render(
      <LocalQaBrokenPageBoundary>
        <p>Published introduction</p>
      </LocalQaBrokenPageBoundary>,
    )

    expect(screen.getByRole('heading', { name: 'This page could not be loaded.' })).toBeInTheDocument()
    expect(screen.queryByText('Published introduction')).not.toBeInTheDocument()
  })

  it('keeps production hosts on the published content even if a QA flag is present', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new URL('https://woonglab.com/introduction?__qaBroken=1'),
    })
    navigationMocks.search = '__qaBroken=1'

    render(
      <LocalQaBrokenPageBoundary>
        <p>Published introduction</p>
      </LocalQaBrokenPageBoundary>,
    )

    expect(screen.getByText('Published introduction')).toBeInTheDocument()
  })

  it('uses the local empty resume fallback for resume QA requests', () => {
    navigationMocks.search = '__qaEmpty=1'

    render(
      <LocalQaEmptyResumeBoundary fallback={<p>Empty resume</p>}>
        <a href="/resume.pdf">Download PDF</a>
      </LocalQaEmptyResumeBoundary>,
    )

    expect(screen.getByText('Empty resume')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Download PDF' })).not.toBeInTheDocument()
  })

  it('uses the local no-image fallback for image QA requests', () => {
    navigationMocks.search = '__qaNoImage=1'

    render(
      <LocalQaNoImageBoundary fallback={<p>No image placeholder</p>}>
        <div role="img" aria-label="Profile" />
      </LocalQaNoImageBoundary>,
    )

    expect(screen.getByText('No image placeholder')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Profile' })).not.toBeInTheDocument()
  })
})
