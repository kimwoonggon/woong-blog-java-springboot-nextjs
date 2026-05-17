import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ThreeJsComponent } from './ThreeJsComponent'

export const ThreeJsBlock = Node.create({
    name: 'threeJsBlock',

    group: 'block',

    atom: true,

    draggable: true,

    addAttributes() {
        return {
            height: {
                default: 300,
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'three-js-block',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['three-js-block', mergeAttributes(HTMLAttributes)]
    },

    addNodeView() {
        return ReactNodeViewRenderer(ThreeJsComponent)
    },
})
