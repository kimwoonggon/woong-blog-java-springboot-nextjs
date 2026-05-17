"use client"

import { useRef } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'

function parseDimension(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  return null
}

function clampDimension(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function ResizableImageComponent(props: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const width = parseDimension(props.node.attrs.width)
  const height = parseDimension(props.node.attrs.height)

  function selectImage() {
    const position = typeof props.getPos === 'function' ? props.getPos() : null
    if (typeof position === 'number') {
      props.editor.commands.setNodeSelection(position)
    }
  }

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    const image = imageRef.current
    if (!image) {
      return
    }

    selectImage()

    const rect = image.getBoundingClientRect()
    const startX = event.clientX
    const startWidth = rect.width || width || 320
    const startHeight = rect.height || height || Math.round(startWidth * 0.5625)
    const aspectRatio = startHeight / startWidth
    const parentWidth = image.parentElement?.parentElement?.clientWidth ?? 960
    const maxWidth = Math.max(160, parentWidth)

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = clampDimension(startWidth + moveEvent.clientX - startX, 120, maxWidth)
      props.updateAttributes({
        width: Math.round(nextWidth),
        height: Math.round(nextWidth * aspectRatio),
      })
    }

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  return (
    <NodeViewWrapper
      as="figure"
      data-testid="tiptap-resizable-image"
      className={`group my-6 inline-block max-w-full rounded-lg ${props.selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
      draggable
      onClick={selectImage}
    >
      <div className="relative inline-block max-w-full rounded-lg border border-transparent group-hover:border-border">
        {/* eslint-disable-next-line @next/next/no-img-element -- Tiptap node views must render the persisted editor img element directly. */}
        <img
          ref={imageRef}
          src={props.node.attrs.src}
          alt={props.node.attrs.alt ?? ''}
          title={props.node.attrs.title ?? undefined}
          width={width ?? undefined}
          height={height ?? undefined}
          className="block h-auto max-w-full rounded-lg"
          draggable={false}
        />
        <button
          type="button"
          aria-label="Resize image"
          data-testid="tiptap-image-resize-handle"
          className="absolute bottom-1 right-1 hidden h-5 w-5 cursor-nwse-resize rounded-sm border border-background bg-primary shadow-sm group-hover:block group-focus-within:block"
          contentEditable={false}
          onPointerDown={startResize}
        />
      </div>
    </NodeViewWrapper>
  )
}
