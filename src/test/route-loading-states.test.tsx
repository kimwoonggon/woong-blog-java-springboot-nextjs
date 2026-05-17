import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

function expectSkeletonOnly(container: HTMLElement) {
  expect(container.querySelector('.animate-pulse')).toBeTruthy()
  expect(container.querySelector('[role="alert"]')).toBeNull()
  expect(container.querySelector('[role="status"]')).toBeNull()
  expect(container.textContent).not.toMatch(/stack|trace|exception|sqlstate|status 500|npgsql|woongblog\.api/i)
}

describe('route loading states', () => {
  it('renders public loading skeletons without stack traces or admin affordances', async () => {
    const PublicSegmentLoading = (await import('@/app/(public)/loading')).default
    const PublicBlogDetailLoading = (await import('@/app/(public)/blog/[slug]/loading')).default

    const { container, rerender } = render(<PublicSegmentLoading />)

    expectSkeletonOnly(container)
    expect(container.textContent).not.toMatch(/admin|edit|manage|관리|수정/i)

    rerender(<PublicBlogDetailLoading />)

    expectSkeletonOnly(container)
    expect(container.textContent).not.toMatch(/admin|edit|manage|관리|수정/i)
  })

  it('renders admin loading skeletons without raw error details', async () => {
    const AdminSegmentLoading = (await import('@/app/admin/loading')).default
    const AdminDashboardLoading = (await import('@/app/admin/dashboard/loading')).default

    const { container, rerender } = render(<AdminSegmentLoading />)

    expectSkeletonOnly(container)

    rerender(<AdminDashboardLoading />)

    expectSkeletonOnly(container)
  })
})
