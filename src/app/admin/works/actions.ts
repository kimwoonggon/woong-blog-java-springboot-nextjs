
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
    parseHtmlFormContent,
    parseJsonRecord,
    readCommaSeparatedFormData,
    readFormDataString,
} from '@/lib/admin/form-data'
import { getServerApiBaseUrl, getServerCookieHeader } from '@/lib/api/server'

export async function createWork(formData: FormData) {
    const title = readFormDataString(formData, 'title')
    const category = readFormDataString(formData, 'category')
    const period = readFormDataString(formData, 'period')
    const tags = readCommaSeparatedFormData(formData, 'tags')
    const published = formData.get('published') === 'on'
    const content = parseHtmlFormContent(readFormDataString(formData, 'content'))
    const allProperties = parseJsonRecord(readFormDataString(formData, 'all_properties'))
    const apiBaseUrl = await getServerApiBaseUrl()
    const cookieHeader = await getServerCookieHeader()

    const response = await fetch(`${apiBaseUrl}/admin/works`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({
            title,
            category,
            period,
            tags,
            published,
            contentJson: JSON.stringify({ html: content.html ?? '' }),
            allPropertiesJson: JSON.stringify(allProperties),
        }),
        cache: 'no-store',
    })

    if (!response.ok) {
        const body = await response.text()
        return { error: body || 'Failed to create work.' }
    }

    revalidatePath('/', 'page')
    revalidatePath('/works', 'page')
    revalidatePath('/admin/works', 'page')
    redirect('/admin/works')
}

export async function updateWork(id: string, formData: FormData) {
    const title = readFormDataString(formData, 'title')
    const category = readFormDataString(formData, 'category')
    const period = readFormDataString(formData, 'period')
    const tags = readCommaSeparatedFormData(formData, 'tags')
    const published = formData.get('published') === 'on'
    const content = parseHtmlFormContent(readFormDataString(formData, 'content'))
    const allProperties = parseJsonRecord(readFormDataString(formData, 'all_properties'))
    const apiBaseUrl = await getServerApiBaseUrl()
    const cookieHeader = await getServerCookieHeader()

    const response = await fetch(`${apiBaseUrl}/admin/works/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({
            title,
            category,
            period,
            tags,
            published,
            contentJson: JSON.stringify({ html: content.html ?? '' }),
            allPropertiesJson: JSON.stringify(allProperties),
        }),
        cache: 'no-store',
    })

    if (!response.ok) {
        const body = await response.text()
        return { error: body || 'Failed to update work.' }
    }

    revalidatePath('/', 'page')
    revalidatePath('/works', 'page')
    revalidatePath('/admin/works', 'page')
    redirect('/admin/works')
}

export async function deleteWork(id: string) {
    const apiBaseUrl = await getServerApiBaseUrl()
    const cookieHeader = await getServerCookieHeader()

    const response = await fetch(`${apiBaseUrl}/admin/works/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: cookieHeader ? { cookie: cookieHeader } : {},
        cache: 'no-store',
    })

    if (!response.ok) {
        const body = await response.text()
        return { error: body || 'Failed to delete work.' }
    }

    revalidatePath('/', 'page') // Home page (Featured Works)
    revalidatePath('/works', 'page') // Works list
    revalidatePath('/admin/works', 'page') // Admin list
}
