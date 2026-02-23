import { httpsCallable } from 'firebase/functions'
import { fns } from '@/config/firebase'

export interface UrlPreview {
  title: string | null
  image: string | null
  description: string | null
  siteName: string | null
}

export async function fetchUrlPreview(url: string): Promise<UrlPreview> {
  const getUrlPreview = httpsCallable<{ url: string }, UrlPreview>(fns, 'getUrlPreview')
  const result = await getUrlPreview({ url })
  return result.data
}
