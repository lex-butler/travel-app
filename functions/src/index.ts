import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { parse } from 'node-html-parser'

admin.initializeApp()

export interface UrlPreviewResult {
  title: string | null
  image: string | null
  description: string | null
  siteName: string | null
}

export const getUrlPreview = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to fetch URL previews')
  }

  const { url } = request.data as { url: unknown }

  if (!url || typeof url !== 'string') {
    throw new HttpsError('invalid-argument', 'A valid URL string is required')
  }

  // Validate URL format
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol')
    }
  } catch {
    throw new HttpsError('invalid-argument', 'URL must be a valid http/https URL')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TripSync/1.0; +https://tripsync.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return { title: null, image: null, description: null, siteName: parsedUrl.hostname }
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      return { title: null, image: null, description: null, siteName: parsedUrl.hostname }
    }

    const html = await response.text()
    const root = parse(html)

    const getMeta = (prop: string): string | null =>
      root.querySelector(`meta[property="${prop}"]`)?.getAttribute('content')?.trim() ||
      root.querySelector(`meta[name="${prop}"]`)?.getAttribute('content')?.trim() ||
      null

    const title = getMeta('og:title') ?? root.querySelector('title')?.text?.trim() ?? null
    const image = getMeta('og:image') ?? null
    const description = getMeta('og:description') ?? getMeta('description') ?? null
    const siteName = getMeta('og:site_name') ?? parsedUrl.hostname

    return { title, image, description, siteName } satisfies UrlPreviewResult
  } catch (err) {
    clearTimeout(timeout)
    if ((err as Error).name === 'AbortError') {
      throw new HttpsError('deadline-exceeded', 'URL fetch timed out')
    }
    // Don't throw — return nulls so the form still works in manual mode
    return { title: null, image: null, description: null, siteName: parsedUrl.hostname }
  }
})
