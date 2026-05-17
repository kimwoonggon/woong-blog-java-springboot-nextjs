"use client"

import { useEffect, useState } from 'react'
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react'
import { Workflow } from 'lucide-react'
import { MermaidRenderer } from '@/components/content/MermaidRenderer'

export function MermaidComponent(props: NodeViewProps) {
  const [code, setCode] = useState(props.node.attrs.code || '')
  const isSelected = props.selected

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setCode(props.node.attrs.code || '')
      }
    })

    return () => {
      cancelled = true
    }
  }, [props.node.attrs.code])

  const updateCode = (nextCode: string) => {
    setCode(nextCode)
    props.updateAttributes({ code: nextCode })
  }

  return (
    <NodeViewWrapper className={`mermaid-block my-8 relative group ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-border bg-muted/60 px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Workflow size={14} />
          <span>Mermaid Diagram</span>
        </div>
        <span className="text-[11px] text-muted-foreground">Edit the diagram text below.</span>
      </div>

      <div className="overflow-hidden rounded-b-lg border border-border bg-background">
        <textarea
          value={code}
          onChange={(event) => updateCode(event.target.value)}
          placeholder={`graph TD;\n  A-->B;`}
          className="min-h-40 w-full resize-y border-b border-border bg-muted/30 p-4 font-mono text-sm focus:outline-none"
          spellCheck={false}
        />

        <div className="border-t border-border bg-card p-4">
          {code.trim() ? (
            <MermaidRenderer code={code} />
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              Empty diagram. Add Mermaid syntax to preview the rendered chart.
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  )
}
