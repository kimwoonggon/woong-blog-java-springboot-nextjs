import { Button } from '@/components/ui/button'
import { getLocalAdminLoginUrl, getLoginUrl } from '@/lib/api/auth'
import { fetchServerSession } from '@/lib/api/server'
import { ShieldCheck } from 'lucide-react'
import { redirect } from 'next/navigation'

interface LoginPageProps {
    searchParams?: Promise<{ error?: string; returnUrl?: string }>
}

function resolveSafeReturnUrl(returnUrl: string | undefined) {
    if (!returnUrl || !returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
        return '/admin'
    }

    return returnUrl
}

function getLoginErrorMessage(error: string | undefined) {
    if (error === 'admin_only') {
        return 'This admin area is restricted to accounts explicitly allowed as administrators.'
    }

    if (error) {
        return 'Sign-in could not be completed. Please try again.'
    }

    return null
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const showLocalAdminShortcut = process.env.ENABLE_LOCAL_ADMIN_SHORTCUT === 'true'
    const resolvedSearchParams = await searchParams
    const returnUrl = resolveSafeReturnUrl(resolvedSearchParams?.returnUrl)
    const errorMessage = getLoginErrorMessage(resolvedSearchParams?.error)
    const session = await fetchServerSession().catch(() => null)

    if (session?.authenticated && session.role === 'admin') {
        redirect(returnUrl)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
                <div className="text-center">
                    <h1 className="text-2xl font-bold tracking-tight">Admin Login</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to manage your portfolio content.
                    </p>
                </div>
                {errorMessage ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                        {errorMessage}
                    </div>
                ) : null}
                <div className="mt-8">
                    <Button asChild className="w-full" size="lg">
                        <a href={getLoginUrl(returnUrl)}>Sign in with Google</a>
                    </Button>
                </div>
                {showLocalAdminShortcut ? (
                    <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            <div className="space-y-2">
                                <p className="font-medium text-emerald-900 dark:text-emerald-100">
                                    Local development shortcut
                                </p>
                                <p className="text-emerald-800/80 dark:text-emerald-200/80">
                                    If Google login does not resolve to an admin role locally, use the seeded local admin session shortcut.
                                </p>
                                <Button asChild variant="outline" className="w-full border-emerald-300 bg-white hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900/50">
                                    <a href={getLocalAdminLoginUrl(returnUrl)}>Continue as Local Admin</a>
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    )
}
