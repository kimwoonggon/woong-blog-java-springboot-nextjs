"use client"

import { useEffect, useId, useState } from 'react'
import { cn } from '@/lib/utils'

interface MermaidModule {
  initialize: (config: {
    startOnLoad: boolean
    securityLevel?: string
    theme?: string
    themeVariables?: Record<string, string | number | boolean>
    fontFamily?: string
  }) => void
  render: (id: string, definition: string) => Promise<{ svg: string }>
}

interface MermaidRendererProps {
  code: string
  className?: string
}

type MermaidThemeMode = 'light' | 'dark'

const centeredMermaidClassName = 'mermaid-diagram-shell my-6 overflow-x-auto p-4 text-center [&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-full'

const lightThemeVariables = {
  background: '#f6f8fa',
  primaryColor: '#ffffff',
  primaryTextColor: '#1f2328',
  primaryBorderColor: '#d0d7de',
  secondaryColor: '#ddf4ff',
  secondaryTextColor: '#1f2328',
  secondaryBorderColor: '#54aeef',
  tertiaryColor: '#f6f8fa',
  tertiaryTextColor: '#1f2328',
  tertiaryBorderColor: '#d0d7de',
  textColor: '#1f2328',
  titleColor: '#1f2328',
  lineColor: '#57606a',
  edgeLabelBackground: '#ffffff',
  clusterBkg: '#f6f8fa',
  clusterBorder: '#d0d7de',
  noteBkgColor: '#fff8c5',
  noteTextColor: '#1f2328',
  noteBorderColor: '#d4a72c',
}

const darkThemeVariables = {
  background: '#0d1117',
  primaryColor: '#161b22',
  primaryTextColor: '#e6edf3',
  primaryBorderColor: '#30363d',
  secondaryColor: '#1f6feb',
  secondaryTextColor: '#ffffff',
  secondaryBorderColor: '#388bfd',
  tertiaryColor: '#161b22',
  tertiaryTextColor: '#e6edf3',
  tertiaryBorderColor: '#30363d',
  textColor: '#e6edf3',
  titleColor: '#e6edf3',
  lineColor: '#8b949e',
  edgeLabelBackground: '#0d1117',
  clusterBkg: '#161b22',
  clusterBorder: '#30363d',
  noteBkgColor: '#2d333b',
  noteTextColor: '#e6edf3',
  noteBorderColor: '#8b949e',
}

function getThemeMode(): MermaidThemeMode {
  if (typeof document === 'undefined') {
    return 'light'
  }

  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function getThemeVariables(themeMode: MermaidThemeMode) {
  return themeMode === 'dark' ? darkThemeVariables : lightThemeVariables
}

export function MermaidRenderer({ code, className }: MermaidRendererProps) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [themeMode, setThemeMode] = useState<MermaidThemeMode>(() => getThemeMode())
  const reactId = useId().replace(/:/g, '-')

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const updateThemeMode = () => {
      setThemeMode(getThemeMode())
    }
    const observer = new MutationObserver(updateThemeMode)

    updateThemeMode()
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const diagram = code.trim()

    if (!diagram) {
      setSvg(null)
      setError(null)
      return
    }

    let cancelled = false
    setSvg(null)
    setError(null)

    const renderDiagram = async () => {
      try {
        const mod = await import('mermaid')
        const mermaid = (mod.default ?? mod) as MermaidModule

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: getThemeVariables(themeMode),
          fontFamily: 'inherit',
        })

        const result = await mermaid.render(`mermaid-${reactId}`, diagram)

        if (!cancelled) {
          setSvg(result.svg)
          setError(null)
        }
      } catch (renderError) {
        if (!cancelled) {
          setSvg(null)
          setError(renderError instanceof Error ? renderError.message : 'Mermaid rendering failed.')
        }
      }
    }

    void renderDiagram()

    return () => {
      cancelled = true
    }
  }, [code, reactId, themeMode])

  if (error) {
    return (
      <pre data-testid="mermaid-renderer" className={cn(centeredMermaidClassName, className)}>
        <code>{code}</code>
      </pre>
    )
  }

  if (!svg) {
    return (
      <div data-testid="mermaid-renderer" className={cn(centeredMermaidClassName, className)}>
        <span className="text-sm text-muted-foreground">Rendering Mermaid diagram…</span>
      </div>
    )
  }

  return (
    <div
      data-testid="mermaid-renderer"
      className={cn(centeredMermaidClassName, className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
