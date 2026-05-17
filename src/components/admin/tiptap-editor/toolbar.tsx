import * as Popover from '@radix-ui/react-popover'
import { forwardRef, useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Box,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Undo,
  X,
  Workflow,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function EditorToolbar({
  editor,
  editable,
  addImage,
}: {
  editor: Editor
  editable: boolean
  addImage: () => void
}) {
  if (!editable) {
    return null
  }

  return (
    <>
      <div
        data-testid="tiptap-toolbar"
        className="sticky top-0 z-20 flex flex-wrap items-center gap-1 border-b border-border bg-background/95 px-3 py-2 backdrop-blur-sm"
      >
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo size={18} />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={18} />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
          active={editor.isActive('highlight')}
          title="Highlight"
        >
          <Highlighter size={18} />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Code size={18} />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton onClick={addImage} title="Insert Image">
          <ImageIcon size={18} />
        </ToolbarButton>
        <EditorLinkControl
          editor={editor}
          title="Add Link"
          trigger={(props) => (
            <ToolbarButton
              {...props}
              active={editor.isActive('link')}
              title="Add Link"
            >
              <LinkIcon size={18} />
            </ToolbarButton>
          )}
        />

        <div className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton
          onClick={() => editor.chain().focus().insertContent({ type: 'threeJsBlock' }).run()}
          title="Insert 3D Model"
        >
          <Box size={18} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().insertContent({ type: 'htmlBlock' }).run()}
          title="Insert HTML Widget"
        >
          <Code size={18} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().insertContent({ type: 'mermaidBlock' }).run()}
          title="Insert Mermaid Diagram"
        >
          <Workflow size={18} />
        </ToolbarButton>
      </div>
      <div
        data-testid="tiptap-toolbar-hint"
        className="border-b border-dashed border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground"
      >
        Type <span className="font-semibold">/</span> for commands, use <span className="font-semibold">Code Block</span> for snippets, and drag/drop or paste images directly into the editor. HTML widgets, Mermaid diagrams, and 3D blocks stay available from the toolbar.
      </div>
    </>
  )
}

export function EditorFormattingBubble({
  editor,
  editable,
}: {
  editor: Editor
  editable: boolean
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!editable) {
      return
    }

    const syncVisibility = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        setIsVisible(false)
        return
      }

      const anchorNode = selection.anchorNode
      const focusNode = selection.focusNode
      const editorElement = editor.view.dom
      const containsSelection = Boolean(anchorNode && focusNode)
        && editorElement.contains(anchorNode)
        && editorElement.contains(focusNode)

      setIsVisible(containsSelection)
    }
    const handleBlur = () => setIsVisible(false)
    const editorElement = editor.view.dom

    editor.on('selectionUpdate', syncVisibility)
    editor.on('transaction', syncVisibility)
    editor.on('blur', handleBlur)
    document.addEventListener('selectionchange', syncVisibility)
    editorElement.addEventListener('mouseup', syncVisibility)
    editorElement.addEventListener('keyup', syncVisibility)

    return () => {
      editor.off('selectionUpdate', syncVisibility)
      editor.off('transaction', syncVisibility)
      editor.off('blur', handleBlur)
      document.removeEventListener('selectionchange', syncVisibility)
      editorElement.removeEventListener('mouseup', syncVisibility)
      editorElement.removeEventListener('keyup', syncVisibility)
    }
  }, [editable, editor])

  if (!editable) {
    return null
  }

  if (!isVisible) {
    return null
  }

  return (
    <div
      data-testid="editor-formatting-bubble"
      className="sticky top-2 z-20 mx-auto mb-2 flex w-fit items-center gap-1 rounded-lg border border-border bg-popover px-2 py-1 text-popover-foreground shadow-xl"
    >
      <BubbleButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold"
      >
        <Bold size={16} />
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic"
      >
        <Italic size={16} />
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough size={16} />
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
        active={editor.isActive('highlight')}
        title="Highlight"
      >
        <Highlighter size={16} />
      </BubbleButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <BubbleButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 size={16} />
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={16} />
      </BubbleButton>
      <EditorLinkControl
        editor={editor}
        title="Add Link"
        trigger={(props) => (
          <BubbleButton
            {...props}
            active={editor.isActive('link')}
            title="Add Link"
          >
            <LinkIcon size={16} />
          </BubbleButton>
        )}
      />
    </div>
  )
}

function EditorLinkControl({
  editor,
  title,
  trigger,
}: {
  editor: Editor
  title: string
  trigger: (props: { onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void }) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const applyLink = () => {
    const nextUrl = linkUrl.trim()

    if (nextUrl.length === 0) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: nextUrl }).run()
    }

    setOpen(false)
  }

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinkUrl('')
    setOpen(false)
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setLinkUrl(editor.getAttributes('link').href ?? '')
        }
        setOpen(nextOpen)
      }}
    >
      <Popover.Trigger asChild>
        {trigger({
          onMouseDown: (event) => {
            event.preventDefault()
          },
        })}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          data-testid="tiptap-link-popover"
          className="z-50 w-72 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none"
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="tiptap-link-url" className="text-xs font-medium text-muted-foreground">
                URL
              </label>
              <input
                id="tiptap-link-url"
                name="linkUrl"
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://…"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    applyLink()
                  }
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              {editor.isActive('link') ? (
                <button
                  type="button"
                  onClick={removeLink}
                  className="inline-flex h-8 items-center rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Remove
                </button>
              ) : null}
              <button
                type="button"
                onClick={applyLink}
                className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Apply
              </button>
            </div>
          </div>
          <Popover.Close
            aria-label={`Close ${title}`}
            className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X size={14} />
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

const ToolbarButton = forwardRef<HTMLButtonElement, {
  children: React.ReactNode
  onClick?: () => void
  onMouseDown?: (event: React.MouseEvent<HTMLButtonElement>) => void
  active?: boolean
  disabled?: boolean
  title?: string
}>(function ToolbarButton({
  children,
  onClick,
  onMouseDown,
  active,
  disabled,
  title,
}, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseDown={onMouseDown}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        'rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active && 'bg-accent text-accent-foreground',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {children}
    </button>
  )
})

ToolbarButton.displayName = 'ToolbarButton'

const BubbleButton = forwardRef<HTMLButtonElement, {
  children: React.ReactNode
  onClick?: () => void
  onMouseDown?: (event: React.MouseEvent<HTMLButtonElement>) => void
  active?: boolean
  title?: string
}>(function BubbleButton({
  children,
  onClick,
  onMouseDown,
  active,
  title,
}, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseDown={onMouseDown}
      title={title}
      aria-label={title}
      className={cn(
        'rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active && 'bg-accent text-accent-foreground',
      )}
    >
      {children}
    </button>
  )
})

BubbleButton.displayName = 'BubbleButton'
