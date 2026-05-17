import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { HtmlComponent } from './HtmlComponent'

export const HtmlBlock = Node.create({
    name: 'htmlBlock',

    group: 'block',

    atom: true,

    draggable: true,

    addAttributes() {
        return {
            html: {
                default: '',
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'html-snippet',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['html-snippet', mergeAttributes(HTMLAttributes)]
    },

    addNodeView() {
        return ReactNodeViewRenderer(HtmlComponent)
    },
})
