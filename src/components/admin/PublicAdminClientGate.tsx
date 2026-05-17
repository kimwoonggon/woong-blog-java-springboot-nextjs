"use client"

import { useEffect, useState } from 'react'

interface BrowserSession {
  authenticated?: boolean
  role?: string
}

interface PublicAdminClientGateProps {
  children: React.ReactNode
}

let canShowAdminAffordancePromise: Promise<boolean> | null = null
let canShowAdminAffordanceCache: boolean | null = null

function canShowAdminAffordance(session: BrowserSession | null) {
  return session?.authenticated === true && session.role === 'admin'
}

async function loadCanShowAdminAffordance() {
  if (canShowAdminAffordanceCache !== null) {
    return canShowAdminAffordanceCache
  }

  canShowAdminAffordancePromise ??= fetch('/api/auth/session', {
    credentials: 'include',
    cache: 'no-store',
  })
    .then(async (response) => {
      if (!response.ok) {
        return false
      }

      const session = await response.json() as BrowserSession
      return canShowAdminAffordance(session)
    })
    .catch(() => false)
    .then((canShow) => {
      canShowAdminAffordanceCache = canShow
      return canShow
    })

  return canShowAdminAffordancePromise
}

export function resetPublicAdminClientSessionForTests() {
  canShowAdminAffordancePromise = null
  canShowAdminAffordanceCache = null
}

export function PublicAdminClientGate({ children }: PublicAdminClientGateProps) {
  const [canShow, setCanShow] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      const nextCanShow = await loadCanShowAdminAffordance()
      if (!cancelled) {
        setCanShow(nextCanShow)
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  return canShow ? <>{children}</> : null
}
