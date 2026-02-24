import { useState, useEffect, useRef, useCallback } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { Loader2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { checkPlacesCache, writePlacesCache } from '@/services/placesCacheService'

export interface PlaceSelection {
  placeId: string
  displayName: string
  formattedAddress: string
  lat: number
  lng: number
  photoUrl: string | null
}

interface Props {
  value: string
  onChange: (value: string) => void   // called on every keystroke (for form display)
  onSelect: (place: PlaceSelection) => void
  placeholder?: string
  className?: string
}

// Cached library reference — only loads the Maps SDK once per page session
let placesLibrary: google.maps.PlacesLibrary | null = null

async function getPlacesLibrary(): Promise<google.maps.PlacesLibrary | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  if (placesLibrary) return placesLibrary

  try {
    setOptions({ key: apiKey, v: 'weekly' })
    placesLibrary = await importLibrary('places') as google.maps.PlacesLibrary
    return placesLibrary
  } catch (err) {
    console.error('[Autocomplete] Maps load error:', err)
    return null
  }
}

export default function DestinationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'e.g. Barcelona, Spain',
  className,
}: Props) {
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [mapsReady, setMapsReady] = useState(false)

  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load Google Maps Places library on mount
  useEffect(() => {
    getPlacesLibrary().then((lib) => {
      if (!lib) return
      serviceRef.current = new lib.AutocompleteService()
      // PlacesService requires a DOM element (unused dummy div)
      const dummy = document.createElement('div')
      placesServiceRef.current = new lib.PlacesService(dummy)
      setMapsReady(true)
    })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchSuggestions = useCallback((input: string) => {
    if (!serviceRef.current || input.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }

    // Create session token on first keystroke of a new session
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
    }

    setLoading(true)
    serviceRef.current.getPlacePredictions(
      {
        input,
        types: ['(cities)'],
        sessionToken: sessionTokenRef.current,
      },
      (
        predictions: google.maps.places.AutocompletePrediction[] | null,
        status: google.maps.places.PlacesServiceStatus
      ) => {
        setLoading(false)
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions.slice(0, 5))
          setOpen(true)
        } else {
          setSuggestions([])
          setOpen(false)
        }
      }
    )
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    onChange(val)

    if (!mapsReady) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  async function handleSelect(prediction: google.maps.places.AutocompletePrediction) {
    setOpen(false)
    setSuggestions([])
    const displayName = prediction.structured_formatting.main_text
    onChange(displayName)

    // Check Firestore cache first — avoids a Places API call if already fetched
    const cached = await checkPlacesCache(prediction.place_id)
    if (cached) {
      onSelect({
        placeId: cached.place_id,
        displayName: cached.display_name,
        formattedAddress: cached.formatted_address,
        lat: cached.lat,
        lng: cached.lng,
        photoUrl: cached.photo_url,
      })
      sessionTokenRef.current = null  // session complete
      return
    }

    // Cache miss — fetch place details (closes the billing session)
    if (!placesServiceRef.current) return
    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['name', 'formatted_address', 'geometry', 'photos'],
        sessionToken: sessionTokenRef.current ?? undefined,
      },
      async (
        place: google.maps.places.PlaceResult | null,
        status: google.maps.places.PlacesServiceStatus
      ) => {
        sessionTokenRef.current = null  // session is now closed

        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return

        const lat = place.geometry?.location?.lat() ?? 0
        const lng = place.geometry?.location?.lng() ?? 0
        const photoUrl = place.photos?.[0]?.getUrl({ maxWidth: 1600 }) ?? null

        const result: PlaceSelection = {
          placeId: prediction.place_id,
          displayName: place.name ?? displayName,
          formattedAddress: place.formatted_address ?? '',
          lat,
          lng,
          photoUrl,
        }

        // Write to Firestore cache (fire-and-forget)
        writePlacesCache({
          place_id: result.placeId,
          display_name: result.displayName,
          formatted_address: result.formattedAddress,
          lat: result.lat,
          lng: result.lng,
          photo_url: result.photoUrl,
        })

        onSelect(result)
      }
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInput}
          placeholder={placeholder}
          className={cn(
            "flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm",
            "ring-offset-background placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full glass rounded-xl border border-white/20 shadow-xl overflow-hidden">
          {suggestions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()  // prevent input blur before click registers
                handleSelect(prediction)
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-sm hover:bg-white/10 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              <div>
                <span className="font-medium">
                  {prediction.structured_formatting.main_text}
                </span>
                <span className="text-muted-foreground ml-1.5 text-xs">
                  {prediction.structured_formatting.secondary_text}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
