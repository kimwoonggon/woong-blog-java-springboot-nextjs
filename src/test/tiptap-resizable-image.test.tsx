import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ResizableImageComponent } from '@/components/admin/tiptap/ResizableImageComponent'

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ as = 'div', children, ...props }: { as?: string; children: React.ReactNode }) =>
    React.createElement(as, props, children),
}))

describe('ResizableImageComponent', () => {
  it('selects the image node and persists resized dimensions', () => {
    const updateAttributes = vi.fn()
    const setNodeSelection = vi.fn()
    const props = {
      node: {
        attrs: {
          src: '/media/editor-image.png',
          alt: 'Editor image',
          title: null,
          width: 300,
          height: 150,
        },
      },
      selected: false,
      editor: { commands: { setNodeSelection } },
      getPos: () => 5,
      updateAttributes,
    // The component reads only these NodeViewProps fields in this test.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    render(<ResizableImageComponent {...props} />)

    const image = screen.getByRole('img', { name: 'Editor image' })
    vi.spyOn(image, 'getBoundingClientRect').mockReturnValue({
      width: 300,
      height: 150,
      x: 0,
      y: 0,
      top: 0,
      right: 300,
      bottom: 150,
      left: 0,
      toJSON: () => ({}),
    })

    const editorWrapper = screen.getByTestId('tiptap-resizable-image')
    Object.defineProperty(editorWrapper, 'clientWidth', {
      configurable: true,
      value: 640,
    })

    fireEvent.pointerDown(screen.getByTestId('tiptap-image-resize-handle'), { clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 250 })
    fireEvent.pointerUp(window)

    expect(setNodeSelection).toHaveBeenCalledWith(5)
    expect(updateAttributes).toHaveBeenCalledWith({ width: 450, height: 225 })
  })
})
