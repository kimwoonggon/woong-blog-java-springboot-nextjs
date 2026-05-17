"use client"

import { useEffect, useId, useMemo, useState } from 'react'

interface TableOfContentsProps {
  contentRootId: string
  title?: string
  testId?: string
}

interface HeadingItem {
  id: string
  text: string
  level: 1 | 2 | 3
}

function normalizeSlugPart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function slugifyHeading(text: string, usedSlugs?: Map<string, number>) {
  const baseSlug = normalizeSlugPart(text) || 'section'
  if (!usedSlugs) {
    return baseSlug
  }

  const seenCount = usedSlugs.get(baseSlug) ?? 0
  usedSlugs.set(baseSlug, seenCount + 1)
  return seenCount === 0 ? baseSlug : `${baseSlug}-${seenCount + 1}`
}

function collectHeadings(root: HTMLElement) {
  const usedSlugs = new Map<string, number>()
  const headings = Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3'))

  return headings
    .map((heading) => {
      const text = heading.textContent?.trim() ?? ''
      if (!text) {
        return null
      }

      const level = heading.tagName === 'H1' ? 1 : heading.tagName === 'H2' ? 2 : 3
      const id = heading.id || slugifyHeading(text, usedSlugs)
      heading.id = id

      return { id, text, level } satisfies HeadingItem
    })
    .filter((item): item is HeadingItem => item !== null)
}

export function TableOfContents({
  contentRootId,
  title = 'On This Page',
  testId = 'blog-toc',
}: TableOfContentsProps) {
  const listId = useId()
  const [items, setItems] = useState<HeadingItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const root = document.getElementById(contentRootId)
    if (!root) {
      return
    }
    let observer: IntersectionObserver | null = null
    const frame = window.requestAnimationFrame(() => {
      const nextItems = collectHeadings(root)
      setItems(nextItems)
      setActiveId(nextItems[0]?.id ?? '')

      if (nextItems.length === 0) {
        return
      }

      observer = new IntersectionObserver(
        (entries) => {
          const visibleHeading = entries
            .filter((entry) => entry.isIntersecting)
            .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0]

          if (visibleHeading?.target instanceof HTMLElement) {
            setActiveId(visibleHeading.target.id)
          }
        },
        {
          rootMargin: '0px 0px -70% 0px',
          threshold: [0, 1],
        },
      )

      nextItems.forEach((item) => {
        const heading = document.getElementById(item.id)
        if (heading) {
          observer?.observe(heading)
        }
      })
    })

    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [contentRootId])

  const renderedItems = useMemo(() => items, [items])
  const hasItems = renderedItems.length > 0
  const hiddenSectionCopy = renderedItems.length === 1 ? '1 section hidden.' : `${renderedItems.length} sections hidden.`

  return (
    <nav
      aria-label="Table of contents"
      data-testid={testId}
      className="w-full min-w-0 rounded-2xl border border-border/80 bg-white px-3.5 py-4 shadow-sm transition-all dark:bg-card"
    >
      <div className="mb-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-2">
        <p className="min-w-0 break-words pt-2 text-xs font-semibold uppercase leading-snug tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          disabled={!hasItems}
          className="min-h-10 min-w-[4.25rem] shrink-0 whitespace-nowrap rounded-full border border-border/80 px-2.5 py-2 text-center text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-expanded={!collapsed}
          aria-controls={hasItems ? listId : undefined}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
      {hasItems && !collapsed ? (
        <ol id={listId} className="min-w-0 space-y-2 text-sm">
          {renderedItems.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={[
                  'block w-full min-w-0 rounded-xl px-3 py-2 leading-snug transition-colors [overflow-wrap:anywhere]',
                  item.level === 3 ? 'ml-5 text-muted-foreground' : item.level === 2 ? 'font-medium' : 'font-semibold',
                  activeId === item.id
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                ].join(' ')}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ol>
      ) : null}
      {hasItems && collapsed ? (
        <p data-testid={`${testId}-collapsed-summary`} className="min-w-0 rounded-xl border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
          {hiddenSectionCopy}
        </p>
      ) : null}
      {!hasItems ? (
        <p data-testid="blog-toc-empty" className="min-w-0 rounded-xl border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
          No sections yet. This page does not include headings.
        </p>
      ) : null}
    </nav>
  )
}
