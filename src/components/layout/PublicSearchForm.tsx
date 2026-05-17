'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Search, X } from 'lucide-react'

interface PublicSearchFormProps {
  action: '/blog' | '/works'
  inputId: string
  inputName: string
  query: string
  placeholder: string
  inputAriaLabel: string
  shouldFocusSearch: boolean
  clearHref: '/blog' | '/works'
  clearLabel: string
  wrapperClassName?: string
}

const LIVE_SEARCH_DEBOUNCE_MS = 300

function buildLiveSearchHref(action: '/blog' | '/works', inputName: string, value: string, currentSearchParams: URLSearchParams) {
  const params = new URLSearchParams(currentSearchParams.toString())
  const trimmedValue = value.trim()

  params.set('page', '1')
  params.delete('searchMode')
  params.delete('focusSearch')

  if (trimmedValue) {
    params.set(inputName, trimmedValue)
  } else {
    params.delete(inputName)
  }

  const queryString = params.toString()
  return queryString ? `${action}?${queryString}` : action
}

export function PublicSearchForm({
  action,
  inputId,
  inputName,
  query,
  placeholder,
  inputAriaLabel,
  shouldFocusSearch,
  clearHref,
  clearLabel,
  wrapperClassName,
}: PublicSearchFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchParamsKey = searchParams.toString()
  const [inputValue, setInputValue] = useState(query)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const hasMountedRef = useRef(false)
  const debounceTimerRef = useRef<number | null>(null)

  const focusInput = () => {
    inputRef.current?.focus({ preventScroll: true })
    inputRef.current?.select()
  }

  useEffect(() => {
    if (!shouldFocusSearch) {
      return
    }

    window.requestAnimationFrame(focusInput)
  }, [shouldFocusSearch])

  useEffect(() => {
    setInputValue(query)
  }, [query])

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

    if (inputValue.trim() === query.trim()) {
      return
    }

    debounceTimerRef.current = window.setTimeout(() => {
      router.replace(buildLiveSearchHref(action, inputName, inputValue, new URLSearchParams(searchParamsKey)), { scroll: false })
      debounceTimerRef.current = null
    }, LIVE_SEARCH_DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [action, inputName, inputValue, query, router, searchParamsKey])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    router.replace(buildLiveSearchHref(action, inputName, inputValue, new URLSearchParams(searchParamsKey)), { scroll: false })
  }

  return (
    <form action={action} method="get" role="search" onSubmit={handleSubmit} className={wrapperClassName ?? 'hidden items-center gap-2 lg:flex'}>
      <label htmlFor={inputId} className="sr-only">{inputAriaLabel}</label>
      <div className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-3 transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          id={inputId}
          name={inputName}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground lg:w-56"
        />
      </div>

      <button
        type="submit"
        aria-label={inputAriaLabel}
        title={inputAriaLabel}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-foreground p-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>
      {query ? (
        <Link
          href={clearHref}
          aria-label={clearLabel}
          title={clearLabel}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Clear
        </Link>
      ) : null}
    </form>
  )
}
