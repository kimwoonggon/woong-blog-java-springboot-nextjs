"use client"

export function SkipToMainLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring"
      onClick={(event) => {
        const targetId = event.currentTarget.getAttribute('href')?.slice(1)
        if (!targetId) {
          return
        }

        const target = document.getElementById(targetId)
        if (!target) {
          return
        }

        requestAnimationFrame(() => {
          target.focus()
        })
      }}
    >
      Skip to main content
    </a>
  )
}
