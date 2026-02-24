/**
 * Background Photo Waterfall
 *
 * Priority order (stops at first success):
 * 1. Google Places photo (photoUrl captured during autocomplete — no extra API call)
 * 2. Unsplash search fallback
 * 3. CSS gradient fallback (always succeeds)
 *
 * Custom uploads are handled separately via the "Change Background" button on TripDetailPage.
 */

export interface BackgroundResult {
  url: string
  attribution: string | null
}

// Deterministic gradient fallback — maps first char of destination name to one of 8 gradients
const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
]

function gradientFallback(displayName: string): BackgroundResult {
  const idx = displayName.charCodeAt(0) % GRADIENTS.length
  return { url: GRADIENTS[idx], attribution: null }
}

async function tryUnsplash(displayName: string): Promise<BackgroundResult | null> {
  const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
  if (!key) return null

  try {
    const query = encodeURIComponent(displayName)
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    )
    if (!res.ok) return null
    const json = await res.json()
    const photo = json.results?.[0]
    if (!photo) return null

    return {
      url: photo.urls.regular,
      attribution: `Photo by ${photo.user.name} on Unsplash`,
    }
  } catch (err) {
    console.error('[Background] Unsplash error:', err)
    return null
  }
}

/**
 * Fetch the best available background for a trip destination.
 *
 * @param photoUrl  URL captured from Google Places photo during autocomplete (may be null)
 * @param displayName  Trip destination name, used for Unsplash search
 */
export async function fetchTripBackground(
  photoUrl: string | null,
  displayName: string
): Promise<BackgroundResult> {
  // Step 1: Google Places photo (already fetched during autocomplete — free reuse)
  if (photoUrl) {
    return { url: photoUrl, attribution: null }
  }

  // Step 2: Unsplash fallback
  const unsplash = await tryUnsplash(displayName)
  if (unsplash) return unsplash

  // Step 3: Gradient fallback (always succeeds)
  return gradientFallback(displayName)
}
