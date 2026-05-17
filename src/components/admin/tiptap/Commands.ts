import { ReactRenderer } from '@tiptap/react'
import { Editor, Range } from '@tiptap/core'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import { CommandList, CommandListRef, type CommandIconName, type CommandItem } from './CommandList'

interface CommandProps {
    editor: Editor
    range: Range
}

interface SuggestionItem extends CommandItem {
    shortcuts: string[]
    icon: CommandIconName
    command: (props: CommandProps) => void
}

export const suggestion = {
    items: ({ query }: { query: string }) => {
        const items: SuggestionItem[] = [
            {
                title: 'Heading 1',
                description: 'Big section heading.',
                shortcuts: ['h1', '1'],
                icon: 'h1',
                command: ({ editor, range }: CommandProps) => {
                    editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
                },
            },
            {
                title: 'Heading 2',
                description: 'Medium section heading.',
                shortcuts: ['h2', '2'],
                icon: 'h2',
                command: ({ editor, range }: CommandProps) => {
                    editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
                },
            },
            {
                title: 'Heading 3',
                description: 'Small section heading.',
                shortcuts: ['h3', '3'],
                icon: 'h3',
                command: ({ editor, range }: CommandProps) => {
                    editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
                },
            },
            {
                title: 'Bullet List',
                description: 'Create a simple bulleted list.',
                shortcuts: ['ul', 'l'],
                icon: 'ul',
                command: ({ editor, range }: CommandProps) => {
                    editor.chain().focus().deleteRange(range).toggleBulletList().run()
                },
            },
            {
                title: 'Numbered List',
                description: 'Create a list with numbering.',
                shortcuts: ['ol', 'n'],
                icon: 'ol',
                command: ({ editor, range }: CommandProps) => {
                    editor.chain().focus().deleteRange(range).toggleOrderedList().run()
                },
            },
            {
                title: 'Blockquote',
                description: 'Capture a quotation.',
                shortcuts: ['q', 'b'],
                icon: 'quote',
                command: ({ editor, range }: CommandProps) => {
                    editor.chain().focus().deleteRange(range).toggleBlockquote().run()
                },
            },
            {
                title: 'Code Block',
                description: 'Insert code snippet (Javascript, HTML, CSS, etc.)',
                shortcuts: ['c', 's'],
                icon: 'code',
                command: ({ editor, range }: CommandProps) => {
                    editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
                },
            },
            {
                title: '3D Model',
                description: 'Insert an interactive 3D rotating cube.',
                shortcuts: ['3', 'm'],
                icon: '3d',
                command: ({ editor, range }: CommandProps) => {
                    editor.chain().focus().deleteRange(range).insertContent({ type: 'threeJsBlock' }).run()
                },
            },
            {
                title: 'HTML Widget',
                description: 'Insert custom HTML code.',
                shortcuts: ['h', 'c', 'w'],
                icon: 'code',
                command: ({ editor, range }: CommandProps) => {
                    editor.chain().focus().deleteRange(range).insertContent({ type: 'htmlBlock' }).run()
                },
            },
            {
                title: 'Mermaid Diagram',
                description: 'Insert an editable Mermaid diagram block.',
                shortcuts: ['m', 'd'],
                icon: 'mermaid',
                command: ({ editor, range }: CommandProps) => {
                    editor.chain().focus().deleteRange(range).insertContent({ type: 'mermaidBlock' }).run()
                },
            },
        ]

        return items.filter((item) => {
            const queryLower = query.toLowerCase()
            return (
                item.title.toLowerCase().includes(queryLower) ||
                item.shortcuts.some((shortcut) => shortcut.toLowerCase().startsWith(queryLower))
            )
        })

    },

    render: () => {
        let component: ReactRenderer
        let popup: TippyInstance[]

        return {
            onStart: (props: { editor: Editor; clientRect: () => DOMRect }) => {
                component = new ReactRenderer(CommandList, {
                    props,
                    editor: props.editor,
                })

                if (!props.clientRect) {
                    return
                }

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                })
            },

            onUpdate(props: { editor: Editor; clientRect: () => DOMRect }) {
                component.updateProps(props)

                if (!props.clientRect) {
                    return
                }

                popup[0].setProps({
                    getReferenceClientRect: props.clientRect,
                })
            },

            onKeyDown(props: { event: KeyboardEvent }) {
                if (props.event.key === 'Escape') {
                    popup[0].hide()
                    return true
                }

                return (component.ref as CommandListRef)?.onKeyDown(props)
            },

            onExit() {
                popup[0].destroy()
                component.destroy()
            },
        }
    },
}
