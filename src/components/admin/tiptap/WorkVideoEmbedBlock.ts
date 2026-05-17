import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import type { WorkVideo } from '@/lib/api/works'
import { WorkVideoEmbedComponent } from './WorkVideoEmbedComponent'

export interface WorkVideoEmbedExtensionOptions {
  resolveVideo: (videoId: string) => WorkVideo | null
}

export const WorkVideoEmbedBlock = Node.create<WorkVideoEmbedExtensionOptions>({
  name: 'workVideoEmbed',

  group: 'block',

  atom: true,

  draggable: true,

  addOptions() {
    return {
      resolveVideo: () => null,
    }
  },

  addAttributes() {
    return {
      videoId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-video-id') ?? '',
        renderHTML: (attributes) => ({
          'data-video-id': attributes.videoId,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'work-video-embed',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['work-video-embed', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(WorkVideoEmbedComponent)
  },
})
