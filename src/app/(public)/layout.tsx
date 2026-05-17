
import { Suspense } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { SkipToMainLink } from "@/components/layout/SkipToMainLink"
import { fetchPublicSiteSettingsOrFallback } from "@/lib/api/public-site-settings-fallback"

export const dynamic = 'force-dynamic'

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const siteSettings = await fetchPublicSiteSettingsOrFallback()
    const ownerName = siteSettings?.ownerName || 'Woonggon Kim'

    return (
        <div className="flex min-h-screen flex-col font-sans">
            <SkipToMainLink />
            <Suspense fallback={<div className="h-16 border-b bg-background/95 lg:h-20" />}>
                <Navbar ownerName={ownerName} />
            </Suspense>
            <main
                id="main-content"
                tabIndex={-1}
                className="safe-area-main-bottom flex-1"
            >
                {children}
            </main>
            <Footer
                ownerName={ownerName}
                facebookUrl={siteSettings?.facebookUrl || ''}
                instagramUrl={siteSettings?.instagramUrl || ''}
                twitterUrl={siteSettings?.twitterUrl || ''}
                linkedinUrl={siteSettings?.linkedInUrl || ''}
                githubUrl={siteSettings?.gitHubUrl || ''}
                className="safe-area-footer-bottom"
            />
        </div>
    )
}
