import { useEffect, useState } from 'react'
import { Cloud, Sun, CloudRain, CloudSnow, Wind, AlertTriangle, ExternalLink, Thermometer } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Trip } from '@/types'

// ─── WMO Weather Code → icon + label ─────────────────────────────────────────

function getWeatherIcon(code: number): { Icon: React.ElementType; label: string } {
  if (code === 0) return { Icon: Sun, label: 'Clear' }
  if (code <= 3) return { Icon: Cloud, label: 'Cloudy' }
  if (code <= 67) return { Icon: CloudRain, label: 'Rain' }
  if (code <= 77) return { Icon: CloudSnow, label: 'Snow' }
  if (code <= 82) return { Icon: CloudRain, label: 'Showers' }
  if (code <= 99) return { Icon: Wind, label: 'Storm' }
  return { Icon: Cloud, label: 'Cloudy' }
}

// ─── Travel advisory level helpers ───────────────────────────────────────────

const ADVISORY_LEVELS: Record<number, { label: string; color: string; bgColor: string }> = {
  1: { label: 'Normal Precautions', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
  2: { label: 'Increased Caution', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' },
  3: { label: 'Reconsider Travel', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20' },
  4: { label: 'Do Not Travel', color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20' },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeatherDay {
  date: string
  maxTemp: number
  minTemp: number
  code: number
}

interface AdvisoryInfo {
  level: number
  country: string
  countryCode: string
  advisoryText: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeatherAdvisoryWidget({ trip }: { trip: Trip }) {
  const [weather, setWeather] = useState<WeatherDay[] | null>(null)
  const [advisory, setAdvisory] = useState<AdvisoryInfo | null>(null)
  const [weatherError, setWeatherError] = useState(false)

  const lat = trip.destinationLat
  const lng = trip.destinationLng

  // Extract country from formattedAddress (last comma-separated token)
  const country = trip.destinationFormattedAddress
    ? trip.destinationFormattedAddress.split(',').pop()?.trim() ?? null
    : null

  // Fetch weather from Open-Meteo (free, no API key)
  useEffect(() => {
    if (!lat || !lng) return
    let cancelled = false

    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min&forecast_days=3&timezone=auto`
    )
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        const days: WeatherDay[] = (json.daily?.time ?? []).map((date: string, i: number) => ({
          date,
          maxTemp: Math.round(json.daily.temperature_2m_max[i]),
          minTemp: Math.round(json.daily.temperature_2m_min[i]),
          code: json.daily.weathercode[i],
        }))
        setWeather(days)
      })
      .catch(() => { if (!cancelled) setWeatherError(true) })

    return () => { cancelled = true }
  }, [lat, lng])

  // Fetch travel advisory from US State Dept (free, no API key)
  useEffect(() => {
    if (!country) return
    let cancelled = false

    fetch('https://travel.state.gov/content/dam/travel/advisory-data/travel_advisories.json')
      .then((r) => r.json())
      .then((json: { graph: { name: string; country_code: string; advisory_level: number; message: string }[] }) => {
        if (cancelled) return
        const countryLower = country.toLowerCase()
        const match = json.graph?.find(
          (c) => c.name.toLowerCase().includes(countryLower) || countryLower.includes(c.name.toLowerCase())
        )
        if (match) {
          setAdvisory({
            level: match.advisory_level,
            country: match.name,
            countryCode: match.country_code,
            advisoryText: match.message,
          })
        }
      })
      .catch(() => { /* silently skip advisory if fetch fails */ })

    return () => { cancelled = true }
  }, [country])

  // Don't render if no location data and no useful info
  if (!lat || !lng) return null
  if (!weather && !advisory && weatherError) return null

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Travel advisory banner — only for level 3+ */}
      {advisory && advisory.level >= 3 && (
        <div className={cn(
          'flex items-start gap-3 px-4 py-3 rounded-2xl border',
          ADVISORY_LEVELS[advisory.level]?.bgColor ?? 'bg-amber-500/10 border-amber-500/20'
        )}>
          <AlertTriangle className={cn('h-4 w-4 shrink-0 mt-0.5', ADVISORY_LEVELS[advisory.level]?.color)} />
          <div className="flex-1 min-w-0">
            <p className={cn('text-[11px] font-black uppercase tracking-wider', ADVISORY_LEVELS[advisory.level]?.color)}>
              Level {advisory.level} — {ADVISORY_LEVELS[advisory.level]?.label}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
              {advisory.advisoryText || `Check the US State Dept advisory for ${advisory.country}.`}
            </p>
          </div>
          <a
            href={`https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/${advisory.countryCode.toLowerCase()}-travel-advisory.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
            title="View full advisory"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
          </a>
        </div>
      )}

      {/* Weather + advisory pill row */}
      {(weather || (advisory && advisory.level < 3)) && (
        <div className="flex flex-wrap items-center gap-2">
          {/* 3-day forecast pills */}
          {weather?.map((day) => {
            const { Icon } = getWeatherIcon(day.code)
            const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
            return (
              <div
                key={day.date}
                className="flex items-center gap-1.5 glass border border-white/40 rounded-xl px-3 py-1.5 text-[10px] font-bold"
              >
                <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-muted-foreground">{dayLabel}</span>
                <span className="text-foreground">{day.maxTemp}°</span>
                <span className="text-muted-foreground/60">{day.minTemp}°</span>
              </div>
            )
          })}

          {/* Advisory pill — for level 1 or 2 (non-banner) */}
          {advisory && advisory.level < 3 && (
            <a
              href={`https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/${advisory.countryCode.toLowerCase()}-travel-advisory.html`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold border transition-opacity hover:opacity-80',
                ADVISORY_LEVELS[advisory.level]?.bgColor,
                ADVISORY_LEVELS[advisory.level]?.color,
              )}
            >
              <Thermometer className="h-3.5 w-3.5 shrink-0" />
              {advisory.country} · L{advisory.level} {ADVISORY_LEVELS[advisory.level]?.label}
              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
