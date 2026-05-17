import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InlinePageEditorSection } from '@/components/admin/InlinePageEditorSection'

vi.mock('@/components/admin/PageEditor', () => ({
  PageEditor: ({ onSaved }: { onSaved?: () => void }) => (
    <div>
      <p>Mock page editor</p>
      <button type="button" onClick={() => onSaved?.()}>
        Complete page save
      </button>
    </div>
  ),
}))

describe('InlinePageEditorSection', () => {
  it('closes the inline shell after the page editor reports save completion', () => {
    render(
      <InlinePageEditorSection
        triggerLabel="소개글 수정"
        title="Introduction Inline Editor"
        description="현재 페이지를 벗어나지 않고 소개글을 바로 수정합니다."
        page={{
          id: 'page-1',
          title: 'Introduction',
          slug: 'introduction',
          content: { html: '<p>Hello</p>' },
        }}
      />,
    )

    expect(screen.queryByText('Mock page editor')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /소개글 수정/i }))
    expect(screen.getByText('Mock page editor')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Complete page save/i }))

    expect(screen.queryByText('Mock page editor')).not.toBeInTheDocument()
  })
})
