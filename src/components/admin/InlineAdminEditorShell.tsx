"use client"

import { useState } from 'react'
import { ChevronDown, ChevronUp, PencilLine } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InlineAdminEditorShellProps {
  triggerLabel: string
  title: string
  description?: string
  backLabel?: string
  actions?: React.ReactNode
  open?: boolean
  onOpenChange?: (next: boolean) => void
  children: React.ReactNode
}

export function InlineAdminEditorShell({
  triggerLabel,
  title,
  description,
  backLabel = '뒤로가기',
  actions,
  open,
  onOpenChange,
  children,
}: InlineAdminEditorShellProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = typeof open === 'boolean'
  const resolvedOpen = isControlled ? open : internalOpen

  const setOpen = (next: boolean | ((value: boolean) => boolean)) => {
    const current = resolvedOpen
    const value = typeof next === 'function' ? next(current) : next

    if (!isControlled) {
      setInternalOpen(value)
    }

    onOpenChange?.(value)
  }

  return (
    <section className="mt-6 space-y-4 rounded-3xl border border-border/80 bg-card/90 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {actions}
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-full"
            onClick={() => setOpen((value) => !value)}
          >
            <PencilLine className="h-4 w-4" />
            {triggerLabel}
            {resolvedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {resolvedOpen && (
            <Button
              type="button"
              variant="ghost"
              className="gap-2 rounded-full text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              {backLabel}
            </Button>
          )}
        </div>
      </div>

      {resolvedOpen && (
        <div className="rounded-2xl border border-border/80 bg-background p-4 shadow-sm">
          {children}
        </div>
      )}
    </section>
  )
}
