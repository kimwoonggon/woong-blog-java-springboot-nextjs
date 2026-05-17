import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { ThreeJsBlock } from '@/components/admin/tiptap/ThreeJsBlock'
import { HtmlBlock } from '@/components/admin/tiptap/HtmlBlock'
import { SlashCommand } from '@/components/admin/tiptap/SlashCommand'
import { suggestion } from '@/components/admin/tiptap/Commands'
import { WorkVideoEmbedBlock } from '@/components/admin/tiptap/WorkVideoEmbedBlock'
import { MermaidBlock } from '@/components/admin/tiptap/MermaidBlock'
import { ResizableImage } from '@/components/admin/tiptap/ResizableImageBlock'
import type { WorkVideo } from '@/lib/api/works'

const lowlight = createLowlight(common)

export function createTiptapExtensions({
  placeholder,
  resolveVideo,
}: {
  placeholder: string
  resolveVideo: (videoId: string) => WorkVideo | null
}) {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      codeBlock: false,
    }),
    CodeBlockLowlight.configure({
      lowlight,
      HTMLAttributes: {
        class: 'content-code-block',
      },
    }),
    ResizableImage.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class: 'max-w-full h-auto rounded-lg my-4',
      },
    }),
    Placeholder.configure({
      placeholder,
    }),
    Highlight.configure({
      multicolor: true,
    }),
    TextStyle,
    Color,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'cursor-pointer text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300',
      },
    }),
    ThreeJsBlock,
    HtmlBlock,
    WorkVideoEmbedBlock.configure({
      resolveVideo,
    }),
    MermaidBlock,
    SlashCommand.configure({
      suggestion,
    }),
  ]
}
