import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { PlacesCache } from '@/types'

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

/**
 * Check the Firestore places cache for a given placeId.
 * Returns cached data if it exists and is less than 30 days old.
 */
export async function checkPlacesCache(placeId: string): Promise<PlacesCache | null> {
  try {
    const ref = doc(db, 'places_cache', placeId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null

    const data = snap.data() as PlacesCache
    const cachedAt = data.cached_at?.toMillis?.() ?? 0
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null

    return data
  } catch (err) {
    console.error('[PlacesCache] read error:', err)
    return null
  }
}

/**
 * Write a place result to the Firestore cache.
 */
export async function writePlacesCache(
  data: Omit<PlacesCache, 'cached_at'>
): Promise<void> {
  try {
    const ref = doc(db, 'places_cache', data.place_id)
    await setDoc(ref, { ...data, cached_at: serverTimestamp() })
  } catch (err) {
    console.error('[PlacesCache] write error:', err)
  }
}
