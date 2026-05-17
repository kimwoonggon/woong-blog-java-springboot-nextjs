'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logoutWithCsrf } from '@/lib/api/auth'

export function AdminLogoutButton() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogout = async () => {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      const redirectUrl = await logoutWithCsrf('/')
      window.location.assign(redirectUrl)
    } catch {
      setIsSubmitting(false)
    }
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      aria-label="Logout"
      data-testid="admin-logout-button"
      disabled={isSubmitting}
      onClick={handleLogout}
      className="gap-2"
    >
      <LogOut aria-hidden="true" size={14} />
      {isSubmitting ? 'Logging out...' : 'Logout'}
    </Button>
  )
}
