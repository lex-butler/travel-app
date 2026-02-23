import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Flame, CheckCircle2, Loader2, List, Home, Compass, Trash2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { subscribeToDestinations, addDestination, castVote, removeVote, lockDestination, deleteDestination, updateComment } from '@/services/destinationService'
import { subscribeToTrip, getUserProfiles, type MemberProfile } from '@/services/tripService'
import { updateUserHomeCity } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'
import type { Trip, Destination } from '@/types'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'

// Fix for default marker icons in Leaflet with React
// @ts-expect-error — _getIconUrl is an internal Leaflet method not in types
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const VOTE_LABELS: Record<1 | 2 | 3, string> = { 1: '😐', 2: '👍', 3: '🔥' }
const VOTE_TITLES: Record<1 | 2 | 3, string> = { 1: 'Could go', 2: 'Like it', 3: 'Love it!' }

interface NominatimResult {
    place_id: number
    display_name: string
    lat: string
    lon: string
}

// ── Travel time estimation ──────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function fmtHours(h: number): string {
    if (h < 1) return `${Math.round(h * 60)}m`
    const hrs = Math.floor(h)
    const mins = Math.round((h - hrs) * 60)
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

interface TravelEst { icon: string; duration: string }

function getTravelTimes(homeLat: number, homeLng: number, destLat: number, destLng: number): TravelEst[] {
    const km = haversineKm(homeLat, homeLng, destLat, destLng)
    const out: TravelEst[] = []
    if (km < 1800) out.push({ icon: '🚗', duration: fmtHours(km / 80) })
    if (km > 50 && km < 1200) out.push({ icon: '🚂', duration: fmtHours(km / 160 + 0.5) })
    if (km > 200) out.push({ icon: '✈️', duration: fmtHours(Math.max(km / 800 + 2, 2.5)) })
    return out
}

// ── Map controller — pans to selected dest, fits all markers on load ────────

function MapController({ destinations, profiles, selectedId }: {
    destinations: Destination[]
    profiles: MemberProfile[]
    selectedId: string | null
}) {
    const map = useMap()

    // Force Leaflet to remeasure the container after flex layout settles.
    // Without this, tiles only render for a portion of the container and
    // fitBounds computes against the wrong viewport size.
    useEffect(() => {
        const t = setTimeout(() => map.invalidateSize(), 50)
        return () => clearTimeout(t)
    }, [map])

    useEffect(() => {
        if (!selectedId) return
        const dest = destinations.find(d => d.id === selectedId)
        if (dest?.lat && dest?.lng) {
            map.setView([dest.lat, dest.lng], Math.max(map.getZoom(), 5), { animate: true })
        }
    }, [selectedId, destinations, map])

    useEffect(() => {
        const points: L.LatLng[] = []
        destinations.forEach(d => { if (d.lat && d.lng) points.push(L.latLng(d.lat, d.lng)) })
        profiles.forEach(p => { if (p.homeLat && p.homeLng) points.push(L.latLng(p.homeLat, p.homeLng)) })
        if (points.length === 0) return
        if (points.length === 1) { map.setView(points[0], 6); return }
        map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 8 })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [destinations.length, profiles.length, map])

    return null
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/)
    return (parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function makeCrewIcon(initials: string) {
    return L.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:8px;font-family:sans-serif">${initials}</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
    })
}

function NominatimInput({
    value,
    onChange,
    onSelect,
    placeholder,
    disabled,
    className,
}: {
    value: string
    onChange: (val: string) => void
    onSelect: (name: string, lat: number, lng: number) => void
    placeholder?: string
    disabled?: boolean
    className?: string
}) {
    const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const q = e.target.value
        onChange(q)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (q.length < 2) { setSuggestions([]); return }
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
                    { headers: { 'Accept-Language': 'en' } },
                )
                setSuggestions(await res.json())
            } catch { setSuggestions([]) }
        }, 400)
    }

    function handleSelect(s: NominatimResult) {
        const parts = s.display_name.split(',')
        onSelect(parts.slice(0, 3).join(',').trim(), parseFloat(s.lat), parseFloat(s.lon))
        setSuggestions([])
    }

    return (
        <div className={cn('relative', className)}>
            <Input
                value={value}
                onChange={handleChange}
                onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                placeholder={placeholder ?? 'Search a place…'}
                disabled={disabled}
                className="rounded-xl border-border bg-background focus-visible:ring-primary/30 text-sm font-medium h-11 w-full"
            />
            {suggestions.length > 0 && (
                <div className="absolute top-full mt-2 left-0 right-0 z-[2000] glass rounded-2xl border-white/40 shadow-2xl overflow-hidden animate-scale-in">
                    {suggestions.map((s) => (
                        <button
                            key={s.place_id}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent onBlur from hiding suggestions before click
                                handleSelect(s);
                            }}
                            className="w-full text-left px-4 py-3 text-[11px] font-black uppercase tracking-tight hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-3 border-b border-white/10 last:border-0"
                        >
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate">{s.display_name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function TripDestinationsPage() {
    const { tripId } = useParams<{ tripId: string }>()
    const user = useAuthStore((s) => s.user)
    const [trip, setTrip] = useState<Trip | null>(null)
    const [destinations, setDestinations] = useState<Destination[]>([])
    const [profiles, setProfiles] = useState<MemberProfile[]>([])
    const [newName, setNewName] = useState('')
    const [newLat, setNewLat] = useState<number | null>(null)
    const [newLng, setNewLng] = useState<number | null>(null)
    const [adding, setAdding] = useState(false)
    const [locking, setLocking] = useState<string | null>(null)
    const [view, setView] = useState<'split' | 'map' | 'list'>('split')
    const [homeCityInput, setHomeCityInput] = useState('')
    const [savingHome, setSavingHome] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [commentText, setCommentText] = useState('')
    const [savingComment, setSavingComment] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)

    const [mockDests, setMockDests] = useState<Destination[]>([])

    useEffect(() => {
        if (!tripId) return
        const unsubTrip = subscribeToTrip(tripId, setTrip)
        const unsubDests = subscribeToDestinations(tripId, (data) => {
            if (data.length === 0) {
                // Inject sample data for visualization
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mockTs = { seconds: 0, nanoseconds: 0 } as any
                const samples: Destination[] = [
                    { id: 'd1', name: 'Tokyo, Japan', addedBy: 'mock1', votes: { 'mock1': 3, 'mock2': 2, 'mock3': 3 }, status: 'voting', createdAt: mockTs, googlePlaceId: 'mock1', description: '', lat: 35.6762, lng: 139.6503, comments: {} },
                    { id: 'd2', name: 'Lisbon, Portugal', addedBy: 'mock2', votes: { 'mock1': 2, 'mock2': 3, 'mock3': 1 }, status: 'voting', createdAt: mockTs, googlePlaceId: 'mock2', description: '', lat: 38.7223, lng: -9.1393, comments: {} },
                    { id: 'd3', name: 'Iceland', addedBy: 'mock3', votes: { 'mock1': 1, 'mock2': 1, 'mock3': 3 }, status: 'voting', createdAt: mockTs, googlePlaceId: 'mock3', description: '', lat: 64.1265, lng: -21.8174, comments: {} },
                ]
                setMockDests(samples)
            } else {
                setMockDests([])
            }
            setDestinations(data)
        })
        return () => {
            unsubTrip()
            unsubDests()
        }
    }, [tripId])

    useEffect(() => {
        if (!trip) return
        getUserProfiles(trip.memberIds).then(profiles => {
            if (profiles.length <= 1) {
                const mocks: MemberProfile[] = [
                    { id: 'mock1', displayName: 'Sarah Chen', photoURL: 'https://i.pravatar.cc/150?u=mock1', email: 'sarah@example.com', homeCity: 'London', homeLat: 51.5074, homeLng: -0.1278 },
                    { id: 'mock2', displayName: 'Marcus Vance', photoURL: 'https://i.pravatar.cc/150?u=mock2', email: 'marcus@example.com', homeCity: 'New York', homeLat: 40.7128, homeLng: -74.0060 },
                    { id: 'mock3', displayName: 'Elena Rossi', photoURL: 'https://i.pravatar.cc/150?u=mock3', email: 'elena@example.com', homeCity: 'Rome', homeLat: 41.9028, homeLng: 12.4964 },
                    { id: 'mock4', displayName: 'Jack Thompson', photoURL: 'https://i.pravatar.cc/150?u=mock4', email: 'jack@example.com', homeCity: 'Berlin', homeLat: 52.5200, homeLng: 13.4050 },
                ]
                setProfiles([...profiles, ...mocks])
            } else {
                setProfiles(profiles)
            }
        })
    }, [trip])


    if (!trip) return <div className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>

    const displayDests = destinations.length > 0 ? destinations : mockDests

    const sorted = [...displayDests].sort((a, b) => {
        const scoreA = Object.values(a.votes).reduce((s, v) => s + v, 0)
        const scoreB = Object.values(b.votes).reduce((s, v) => s + v, 0)
        return scoreB - scoreA
    })

    const isHost = user?.uid === trip.ownerId || trip.coLeadIds.includes(user?.uid ?? '')
    const myProfile = user ? profiles.find(p => p.id === user.uid) : null

    async function handleAdd() {
        if (!user || !newName.trim()) return
        setAdding(true)
        try {
            await addDestination(trip!.id, user.uid, newName.trim(), newLat ?? undefined, newLng ?? undefined)
            setNewName(''); setNewLat(null); setNewLng(null)
        } finally {
            setAdding(false)
        }
    }

    async function handleSaveHome(name: string, lat: number, lng: number) {
        if (!user) return
        setSavingHome(true)
        try {
            await updateUserHomeCity(user.uid, name, lat, lng)
            setHomeCityInput('')
        } finally { setSavingHome(false) }
    }

    async function handleVote(dest: Destination, vote: 1 | 2 | 3) {
        if (!user) return
        const current = dest.votes[user.uid]
        if (current === vote) {
            await removeVote(trip!.id, dest.id, user.uid)
        } else {
            await castVote(trip!.id, dest.id, user.uid, vote)
        }
    }

    async function handleLock(dest: Destination) {
        setLocking(dest.id)
        try {
            await lockDestination(trip!.id, dest.id, dest.name)
        } finally {
            setLocking(null)
        }
    }

    async function handleSaveComment(dest: Destination) {
        if (!user || !commentText.trim()) return
        setSavingComment(dest.id)
        try {
            await updateComment(trip!.id, dest.id, user.uid, commentText.trim())
        } finally {
            setSavingComment(null)
        }
    }

    async function handleDelete(dest: Destination) {
        setDeleting(dest.id)
        try {
            await deleteDestination(trip!.id, dest.id)
            if (selectedId === dest.id) setSelectedId(null)
        } finally {
            setDeleting(null)
        }
    }

    function handleSelect(destId: string) {
        if (selectedId === destId) {
            setSelectedId(null)
        } else {
            setSelectedId(destId)
            const dest = displayDests.find(d => d.id === destId)
            setCommentText(user ? (dest?.comments[user.uid] ?? '') : '')
        }
    }

    function getAddedBy(uid: string) {
        const p = profiles.find(p => p.id === uid)
        return p ? p.displayName.split(' ')[0] : 'Someone'
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] pb-6">

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
                {/* Left Side: Destination List & Entry */}
                <div className="flex-1 flex flex-col min-h-0 order-2 lg:order-1">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                            <MapPin className="h-6 w-6 text-primary" />
                            Pick Your Destination
                        </h1>
                        <div className="flex items-center rounded-xl bg-primary/5 border border-primary/10 p-1 lg:hidden">
                            <button onClick={() => setView('list')} className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all", view !== 'map' ? "bg-white text-primary shadow-sm" : "text-muted-foreground")}>List</button>
                            <button onClick={() => setView('map')} className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all", view === 'map' ? "bg-white text-primary shadow-sm" : "text-muted-foreground")}>Map</button>
                        </div>
                    </div>

                    <Card className="flex-1 flex flex-col border-white/40 dark:border-white/10 glass rounded-3xl overflow-hidden shadow-xl shadow-primary/5 bg-white/40">
                        {/* Suggest input */}
                        <div className="p-5 border-b border-white/20 bg-primary/5 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Suggest a destination</p>
                            <div className="space-y-3">
                                <NominatimInput
                                    value={newName}
                                    onChange={(val) => { setNewName(val); setNewLat(null); setNewLng(null) }}
                                    onSelect={(name, lat, lng) => { setNewName(name); setNewLat(lat); setNewLng(lng) }}
                                    placeholder="e.g. Kyoto, Japan or Amalfi Coast"
                                    disabled={adding}
                                />
                                <Button
                                    onClick={handleAdd}
                                    disabled={adding || !newName.trim()}
                                    className="w-full rounded-xl h-11 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/10 transition-all active:scale-[0.98]"
                                >
                                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add to List'}
                                </Button>
                            </div>
                        </div>

                        {/* Scrollable List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                            {sorted.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-40">
                                    <div className="h-16 w-16 rounded-3xl premium-gradient text-white flex items-center justify-center mb-4">
                                        <Compass className="h-8 w-8" />
                                    </div>
                                    <p className="font-black text-sm uppercase tracking-widest">No suggestions yet</p>
                                    <p className="text-xs font-medium mt-1">Start the battle! Search a place above.</p>
                                </div>
                            ) : (
                                sorted.map((dest, idx) => {
                                    const score = Object.values(dest.votes).reduce((s, v) => s + v, 0)
                                    const myVote = user ? dest.votes[user.uid] : undefined
                                    const isFinalized = dest.status === 'finalized'
                                    const isSelected = selectedId === dest.id

                                    return (
                                        <div
                                            key={dest.id}
                                            onClick={() => handleSelect(dest.id)}
                                            className={cn(
                                                "group p-4 rounded-2xl border transition-all animate-slide-up cursor-pointer relative overflow-hidden",
                                                isFinalized
                                                    ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30"
                                                    : isSelected
                                                        ? "bg-primary/10 border-primary/50 ring-2 ring-primary/20 shadow-lg shadow-primary/5"
                                                        : "border-white/50 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20"
                                            )}
                                            style={{ animationDelay: `${idx * 0.05}s` }}
                                        >
                                            {isSelected && !isFinalized && (
                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                                            )}
                                            {isFinalized && (
                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                                            )}
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        {isFinalized && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                                        <h3 className="font-black text-sm truncate uppercase tracking-tight">{dest.name}</h3>
                                                    </div>
                                                    <p className="text-[9px] font-black text-muted-foreground mt-0.5 uppercase tracking-widest">
                                                        Suggested by {getAddedBy(dest.addedBy)}
                                                    </p>
                                                    {myProfile?.homeLat && myProfile?.homeLng && dest.lat && dest.lng && (
                                                        <div className="flex items-center gap-1.5 mt-1.5">
                                                            {getTravelTimes(myProfile.homeLat!, myProfile.homeLng!, dest.lat, dest.lng).map(t => (
                                                                <span key={t.icon} className="flex items-center gap-0.5 text-[9px] font-bold text-muted-foreground bg-white/70 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-white/40 dark:border-white/10">
                                                                    {t.icon} {t.duration}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {score > 0 && (
                                                    <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[10px] font-black shadow-sm">
                                                        <Flame className="h-3 w-3" />
                                                        {score}
                                                    </div>
                                                )}
                                            </div>

                                            {isSelected && (
                                                <div className="space-y-3 pt-2 animate-scale-in origin-top">
                                                    {/* Vote breakdown — who voted what */}
                                                    {Object.keys(dest.votes).length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {Object.entries(dest.votes).map(([uid, v]) => {
                                                                const p = profiles.find(pr => pr.id === uid)
                                                                return (
                                                                    <div key={uid} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-800 border border-white/40 text-[10px] font-bold">
                                                                        <span>{VOTE_LABELS[v]}</span>
                                                                        <span className="text-muted-foreground">{p ? p.displayName.split(' ')[0] : 'Someone'}</span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Vote buttons */}
                                                    <div className="flex items-center gap-2">
                                                        {([1, 2, 3] as const).map(v => (
                                                            <button
                                                                key={v}
                                                                onClick={(e) => { e.stopPropagation(); handleVote(dest, v) }}
                                                                disabled={isFinalized}
                                                                className={cn(
                                                                    "flex-1 py-1.5 rounded-xl text-sm border-2 transition-all active:scale-90",
                                                                    myVote === v
                                                                        ? "bg-primary border-primary text-white shadow-md font-bold"
                                                                        : "bg-white/40 dark:bg-slate-800 border-white/40 hover:border-primary/30"
                                                                )}
                                                                title={VOTE_TITLES[v]}
                                                            >
                                                                {VOTE_LABELS[v]}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Comments */}
                                                    <div className="space-y-2 pt-1 border-t border-white/20" onClick={e => e.stopPropagation()}>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                                            <MessageCircle className="h-3 w-3" /> Notes
                                                        </p>
                                                        {Object.entries(dest.comments).filter(([, text]) => text.trim()).map(([uid, text]) => {
                                                            const p = profiles.find(pr => pr.id === uid)
                                                            return (
                                                                <div key={uid} className="text-[11px] leading-snug">
                                                                    <span className="font-black">{p ? p.displayName.split(' ')[0] : 'Someone'}: </span>
                                                                    <span className="text-muted-foreground">{text}</span>
                                                                </div>
                                                            )
                                                        })}
                                                        {user && !isFinalized && (
                                                            <div className="flex gap-2">
                                                                <input
                                                                    value={commentText}
                                                                    onChange={e => setCommentText(e.target.value)}
                                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveComment(dest) } }}
                                                                    placeholder="Add a note…"
                                                                    className="flex-1 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleSaveComment(dest)}
                                                                    disabled={savingComment === dest.id || !commentText.trim()}
                                                                    className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0"
                                                                >
                                                                    {savingComment === dest.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Host actions + delete */}
                                                    <div className="flex gap-2">
                                                        {isHost && !isFinalized && (
                                                            <Button
                                                                onClick={(e) => { e.stopPropagation(); handleLock(dest) }}
                                                                disabled={locking === dest.id}
                                                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-10 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                                                            >
                                                                {locking === dest.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                                <span className="ml-2">Finalize</span>
                                                            </Button>
                                                        )}
                                                        {(user && (dest.addedBy === user.uid || isHost) && !isFinalized) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(dest) }}
                                                                disabled={deleting === dest.id}
                                                                className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                                                            >
                                                                {deleting === dest.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Side: Map View */}
                <div className={cn(
                    "lg:w-[50%] flex flex-col order-1 lg:order-2",
                    view === 'list' && "hidden lg:flex",
                    view === 'map' && "flex h-[400px] lg:h-auto"
                )}>
                    <Card className="flex-1 rounded-3xl border-white/40 dark:border-white/10 overflow-hidden shadow-2xl relative bg-slate-100 dark:bg-slate-900">
                        <MapContainer
                            center={[20, 0]}
                            zoom={2}
                            style={{ height: '100%', width: '100%', zIndex: 0 }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            <MapController
                                destinations={displayDests}
                                profiles={profiles}
                                selectedId={selectedId}
                            />

                            {/* Home cities */}
                            {profiles.filter(p => p.homeLat && p.homeLng).map(p => (
                                <Marker
                                    key={p.id}
                                    position={[p.homeLat!, p.homeLng!]}
                                    icon={makeCrewIcon(getInitials(p.displayName))}
                                >
                                    <Popup>
                                        <div className="p-1">
                                            <p className="text-[10px] font-black uppercase">{p.displayName.split(' ')[0]}'s home</p>
                                            <p className="text-[9px] text-muted-foreground">{p.homeCity}</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}

                            {/* Destinations */}
                            {displayDests.map((d) => d.lat && d.lng ? (
                                <Marker
                                    key={d.id}
                                    position={[d.lat, d.lng]}
                                    eventHandlers={{ click: () => setSelectedId(d.id) }}
                                >
                                    <Popup>
                                        <div className="p-1">
                                            <h4 className="font-black text-sm uppercase">{d.name}</h4>
                                            <p className="text-[9px] font-bold text-primary">Votes: {Object.values(d.votes).reduce((s, v) => s + v, 0)}</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            ) : null)}
                        </MapContainer>

                        {/* Set Home City Prompt */}
                        {user && !myProfile?.homeCity && (
                            <div className="absolute top-4 left-4 right-4 z-[1500] animate-slide-down">
                                <Card className="glass border-primary/30 p-5 shadow-2xl bg-white/95 dark:bg-slate-900/95 rounded-[1.5rem] ring-4 ring-primary/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <Home className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-widest text-primary leading-none">Where is your base?</p>
                                            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Entering your home city helps the crew find the best midpoint.</p>
                                        </div>
                                    </div>
                                    <NominatimInput
                                        value={homeCityInput}
                                        onChange={setHomeCityInput}
                                        onSelect={handleSaveHome}
                                        placeholder="Start typing your city..."
                                        disabled={savingHome}
                                    />
                                </Card>
                            </div>
                        )}

                        {/* Floating Nav Button for Mobile */}
                        <div className="absolute top-4 right-4 z-[1000] lg:hidden">
                            <Button size="icon" className="rounded-full h-10 w-10 glass shadow-xl" onClick={() => setView('split')}>
                                <List className="h-5 w-5" />
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
