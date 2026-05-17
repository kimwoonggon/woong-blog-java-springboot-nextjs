
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Facebook, Instagram, Twitter, Linkedin, Github } from 'lucide-react'
import { fetchWithCsrf } from '@/lib/api/auth'
import { getBrowserApiBaseUrl } from '@/lib/api/browser'
import { revalidatePublicPathsAfterMutation } from '@/lib/public-revalidation-client'
import { getSiteSettingsPublicRevalidationPaths } from '@/lib/public-revalidation-paths'

interface SiteSettings {
    owner_name: string
    tagline: string
    facebook_url?: string
    instagram_url?: string
    twitter_url?: string
    linkedin_url?: string
    github_url?: string
}

interface SiteSettingsEditorProps {
    initialSettings: SiteSettings
}

export function SiteSettingsEditor({ initialSettings }: SiteSettingsEditorProps) {
    const router = useRouter()
    const [ownerName, setOwnerName] = useState(initialSettings.owner_name || 'John Doe')
    const [tagline, setTagline] = useState(initialSettings.tagline || 'Creative Technologist')
    const [facebookUrl, setFacebookUrl] = useState(initialSettings.facebook_url || '')
    const [instagramUrl, setInstagramUrl] = useState(initialSettings.instagram_url || '')
    const [twitterUrl, setTwitterUrl] = useState(initialSettings.twitter_url || '')
    const [linkedinUrl, setLinkedinUrl] = useState(initialSettings.linkedin_url || '')
    const [githubUrl, setGithubUrl] = useState(initialSettings.github_url || '')
    const [isSaving, setIsSaving] = useState(false)

    async function handleSave() {
        setIsSaving(true)

        try {
            const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/site-settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ownerName: ownerName,
                    tagline,
                    facebookUrl: facebookUrl,
                    instagramUrl: instagramUrl,
                    twitterUrl: twitterUrl,
                    linkedInUrl: linkedinUrl,
                    githubUrl: githubUrl,
                }),
            })

            if (response.ok) {
                await revalidatePublicPathsAfterMutation(getSiteSettingsPublicRevalidationPaths())
                router.refresh()
                alert('Site settings saved successfully!')
            } else {
                alert('Failed to save settings')
            }
        } catch (error) {
            console.error('Save error:', error)
            alert('Failed to save settings')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6 rounded-lg border border-border bg-card p-6 text-card-foreground">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">Site Settings</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        These settings are used across the entire site (Navbar, Footer, Page Title)
                    </p>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            {/* Basic Settings */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="ownerName">Site Owner Name</Label>
                    <Input
                        id="ownerName"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Your Name"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline / Role</Label>
                    <Input
                        id="tagline"
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="Creative Technologist"
                    />
                </div>
            </div>

            {/* Social Media Links */}
            <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Social Media Links</h3>
                <p className="text-sm text-gray-500 mb-4">
                    These links appear in the footer. Leave empty to hide the icon.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="facebookUrl" className="flex items-center gap-2">
                            <Facebook size={16} /> Facebook URL
                        </Label>
                        <Input
                            id="facebookUrl"
                            value={facebookUrl}
                            onChange={(e) => setFacebookUrl(e.target.value)}
                            placeholder="https://facebook.com/yourpage"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="instagramUrl" className="flex items-center gap-2">
                            <Instagram size={16} /> Instagram URL
                        </Label>
                        <Input
                            id="instagramUrl"
                            value={instagramUrl}
                            onChange={(e) => setInstagramUrl(e.target.value)}
                            placeholder="https://instagram.com/yourhandle"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="twitterUrl" className="flex items-center gap-2">
                            <Twitter size={16} /> Twitter URL
                        </Label>
                        <Input
                            id="twitterUrl"
                            value={twitterUrl}
                            onChange={(e) => setTwitterUrl(e.target.value)}
                            placeholder="https://twitter.com/yourhandle"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
                            <Linkedin size={16} /> LinkedIn URL
                        </Label>
                        <Input
                            id="linkedinUrl"
                            value={linkedinUrl}
                            onChange={(e) => setLinkedinUrl(e.target.value)}
                            placeholder="https://linkedin.com/in/yourprofile"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="githubUrl" className="flex items-center gap-2">
                            <Github size={16} /> GitHub URL
                        </Label>
                        <Input
                            id="githubUrl"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            placeholder="https://github.com/yourusername"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
