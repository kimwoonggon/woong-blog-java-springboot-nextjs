"use client"

import { useSearchParams } from 'next/navigation'

function isLocalBrowserHost() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

function PublicPageErrorFallback() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Public pages</p>
      <h2 className="text-3xl font-semibold text-foreground">This page could not be loaded.</h2>
      <p className="max-w-2xl text-sm text-muted-foreground">
        The public content request failed. Retry once the backend is healthy.
      </p>
      <button
        type="button"
        className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Retry
      </button>
    </div>
  )
}

export function LocalQaBrokenPageBoundary({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()

  if (searchParams.get('__qaBroken') === '1' && isLocalBrowserHost()) {
    return <PublicPageErrorFallback />
  }

  return <>{children}</>
}

export function LocalQaEmptyResumeBoundary({
  fallback,
  children,
}: {
  fallback: React.ReactNode
  children: React.ReactNode
}) {
  const searchParams = useSearchParams()

  if (searchParams.get('__qaEmpty') === '1' && isLocalBrowserHost()) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export function LocalQaNoImageBoundary({
  fallback,
  children,
}: {
  fallback: React.ReactNode
  children: React.ReactNode
}) {
  const searchParams = useSearchParams()

  if (searchParams.get('__qaNoImage') === '1' && isLocalBrowserHost()) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
