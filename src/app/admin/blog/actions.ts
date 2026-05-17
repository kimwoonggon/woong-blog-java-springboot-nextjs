
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { parseHtmlFormContent, readCommaSeparatedFormData, readFormDataString } from '@/lib/admin/form-data'
import { getServerApiBaseUrl, getServerCookieHeader } from '@/lib/api/server'

export async function createBlog(formData: FormData) {
    const title = readFormDataString(formData, 'title')
    const excerpt = readFormDataString(formData, 'excerpt')
    const tags = readCommaSeparatedFormData(formData, 'tags').filter(Boolean)
    const published = formData.get('published') === 'on'
    const content = parseHtmlFormContent(readFormDataString(formData, 'content'))
    const apiBaseUrl = await getServerApiBaseUrl()
    const cookieHeader = await getServerCookieHeader()

    const response = await fetch(`${apiBaseUrl}/admin/blogs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({
            title,
            excerpt,
            tags,
            published,
            contentJson: JSON.stringify({ html: content.html ?? '' }),
        }),
        cache: 'no-store',
    })

    if (!response.ok) {
        const body = await response.text()
        return { error: body || 'Failed to create blog.' }
    }

    revalidatePath('/', 'page')
    revalidatePath('/blog', 'page')
    revalidatePath('/admin/blog', 'page')
    redirect('/admin/blog')
}

export async function updateBlog(id: string, formData: FormData) {
    const title = readFormDataString(formData, 'title')
    const excerpt = readFormDataString(formData, 'excerpt')
    const tags = readCommaSeparatedFormData(formData, 'tags').filter(Boolean)
    const published = formData.get('published') === 'on'
    const content = parseHtmlFormContent(readFormDataString(formData, 'content'))
    const apiBaseUrl = await getServerApiBaseUrl()
    const cookieHeader = await getServerCookieHeader()

    const response = await fetch(`${apiBaseUrl}/admin/blogs/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({
            title,
            excerpt,
            tags,
            published,
            contentJson: JSON.stringify({ html: content.html ?? '' }),
        }),
        cache: 'no-store',
    })

    if (!response.ok) {
        const body = await response.text()
        return { error: body || 'Failed to update blog.' }
    }

    revalidatePath('/', 'page')
    revalidatePath(`/blog`, 'page')
    revalidatePath('/admin/blog', 'page')
    redirect('/admin/blog')
}

export async function deleteBlog(id: string) {
    const apiBaseUrl = await getServerApiBaseUrl()
    const cookieHeader = await getServerCookieHeader()

    const response = await fetch(`${apiBaseUrl}/admin/blogs/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: cookieHeader ? { cookie: cookieHeader } : {},
        cache: 'no-store',
    })

    if (!response.ok) {
        const body = await response.text()
        return { error: body || 'Failed to delete blog.' }
    }

    revalidatePath('/', 'page') // Home page (Recent Posts)
    revalidatePath('/blog', 'page') // Blog list
    revalidatePath('/admin/blog', 'page') // Admin list
}
