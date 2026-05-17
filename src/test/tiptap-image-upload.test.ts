import { afterEach, describe, expect, it, vi } from 'vitest'
import { resizeEditorImageFile } from '@/components/admin/tiptap-editor/upload'

describe('editor image upload resizing', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('downscales large editor images before upload', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 3200,
      height: 1800,
      close,
    })))

    const drawImage = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    const canvas = document.createElement('canvas')
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return canvas
      }
      return originalCreateElement(tagName)
    })
    vi.spyOn(canvas, 'getContext').mockImplementation(((contextId: string) => (
      contextId === '2d' ? { drawImage } : null
    )) as HTMLCanvasElement['getContext'])
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback: BlobCallback) => {
      callback(new Blob(['resized'], { type: 'image/webp' }))
    })

    const file = new File(['original'], 'large.jpg', { type: 'image/jpeg' })
    const result = await resizeEditorImageFile(file)

    expect(result).not.toBe(file)
    expect(result.name).toBe('large.webp')
    expect(result.type).toBe('image/webp')
    expect(canvas.width).toBe(1600)
    expect(canvas.height).toBe(900)
    expect(drawImage).toHaveBeenCalled()
    expect(close).toHaveBeenCalled()
  })
})
