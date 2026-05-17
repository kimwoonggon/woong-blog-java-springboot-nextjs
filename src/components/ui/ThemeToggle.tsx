"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ThemeMode = "light" | "dark"

function CurrentThemeIcon({ theme }: { theme: ThemeMode }) {
  return theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />
}

interface ThemeToggleProps {
  className?: string
  testId?: string
  showLabel?: boolean
}

export function ThemeToggle({ className, testId = "theme-toggle", showLabel = false }: ThemeToggleProps) {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  if (!mounted) {
    return (
      <div
        aria-hidden
        className={cn(
          "h-11 rounded-full border border-border/70 bg-background/70",
          showLabel ? "w-full" : "w-11",
          className,
        )}
      />
    )
  }

  const systemTheme = theme === "system" ? (resolvedTheme ?? "light") : theme
  const currentTheme = (systemTheme === "dark" ? "dark" : "light") as ThemeMode
  const nextTheme = currentTheme === "dark" ? "light" : "dark"
  const label = currentTheme === "dark" ? "Dark mode" : "Light mode"

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      className={cn(
        "h-11 rounded-full bg-transparent hover:bg-accent",
        showLabel ? "w-full justify-between px-4" : "w-11",
        className,
      )}
      aria-label={currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={currentTheme === "dark"}
      data-testid={testId}
      onClick={() => setTheme(nextTheme)}
    >
      <span className={cn("inline-flex items-center gap-3", showLabel ? "text-sm font-medium" : undefined)}>
        <CurrentThemeIcon theme={currentTheme} />
        {showLabel ? <span>{label}</span> : null}
      </span>
      {showLabel ? <span className="text-xs text-muted-foreground">Tap to switch</span> : null}
    </Button>
  )
}
