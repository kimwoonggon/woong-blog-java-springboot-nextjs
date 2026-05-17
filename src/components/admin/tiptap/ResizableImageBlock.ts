import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ResizableImageComponent } from './ResizableImageComponent'

function parseDimensionAttribute(value: string | null) {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export const ResizableImage = Image.extend({
  inline() {
    return false
  },

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => parseDimensionAttribute(element.getAttribute('width')),
        renderHTML: (attributes) => (attributes.width ? { width: attributes.width } : {}),
      },
      height: {
        default: null,
        parseHTML: (element) => parseDimensionAttribute(element.getAttribute('height')),
        renderHTML: (attributes) => (attributes.height ? { height: attributes.height } : {}),
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  },
})
