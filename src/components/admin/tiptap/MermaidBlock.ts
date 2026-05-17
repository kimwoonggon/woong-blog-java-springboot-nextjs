import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { MermaidComponent } from './MermaidComponent'

export const MermaidBlock = Node.create({
  name: 'mermaidBlock',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      code: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-code') ?? '',
        renderHTML: (attributes) => ({
          'data-code': attributes.code,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'mermaid-block',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['mermaid-block', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidComponent)
  },
})
