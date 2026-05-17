"use client"

import React, { useState } from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { Code, Eye, Edit3 } from 'lucide-react'
import { sanitizeHtml } from '@/lib/content/html-sanitizer'

export const HtmlComponent = (props: NodeViewProps) => {
    const [html, setHtml] = useState(props.node.attrs.html || '')
    const [isEditing, setIsEditing] = useState(!props.node.attrs.html)
    const isSelected = props.selected

    const updateHtml = (newHtml: string) => {
        setHtml(newHtml)
        props.updateAttributes({ html: newHtml })
    }

    return (
        <NodeViewWrapper className={`html-block my-8 relative group ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-b-0 border-gray-200 dark:border-gray-700 rounded-t-lg">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <Code size={14} />
                    <span>HTML Widget</span>
                </div>
                <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1.5 px-2 py-0.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    {isEditing ? (
                        <>
                            <Eye size={12} />
                            <span>Preview</span>
                        </>
                    ) : (
                        <>
                            <Edit3 size={12} />
                            <span>Edit Code</span>
                        </>
                    )}
                </button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg overflow-hidden bg-white dark:bg-gray-950 min-h-[100px]">
                {isEditing ? (
                    <textarea
                        value={html}
                        onChange={(e) => updateHtml(e.target.value)}
                        placeholder="Paste your HTML code here..."
                        className="w-full h-48 p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 focus:outline-none resize-y"
                        spellCheck={false}
                    />
                ) : (
                    <div className="p-4 overflow-auto">
                        {html ? (
                            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
                        ) : (
                            <div className="text-gray-400 text-sm italic">Empty widget. Click Edit to add HTML.</div>
                        )}
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    )
}
