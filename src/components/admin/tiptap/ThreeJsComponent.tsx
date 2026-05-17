"use client"

import React, { useState } from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'

import { ThreeJsScene } from '../../content/ThreeJsScene'

export const ThreeJsComponent = (props: NodeViewProps) => {
    const [height, setHeight] = useState(props.node.attrs.height || 300)
    const isSelected = props.selected

    const updateHeight = (newHeight: number) => {
        setHeight(newHeight)
        props.updateAttributes({ height: newHeight })
    }

    return (
        <NodeViewWrapper className={`three-js-block my-8 relative group ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
            <ThreeJsScene height={height} />

            {/* Height adjustment handle */}
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-400 rounded-full cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity mb-1 z-10"
                onMouseDown={(e) => {
                    const startY = e.pageY
                    const startHeight = height

                    const onMouseMove = (moveEvent: MouseEvent) => {
                        const currentHeight = startHeight + (moveEvent.pageY - startY)
                        updateHeight(Math.max(200, Math.min(600, currentHeight)))
                    }

                    const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove)
                        document.removeEventListener('mouseup', onMouseUp)
                    }

                    document.addEventListener('mousemove', onMouseMove)
                    document.addEventListener('mouseup', onMouseUp)
                }}
            />

            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                3D Model (Three.js)
            </div>
        </NodeViewWrapper>
    )
}
