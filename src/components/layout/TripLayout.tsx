import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { useTripStore } from '@/stores/tripStore'
import { getTripById } from '@/services/tripService'

export default function TripLayout() {
    const { tripId } = useParams<{ tripId: string }>()
    const location = useLocation()
    const activeTrip = useTripStore((s) => s.activeTrip)
    const [fallbackName, setFallbackName] = useState<string | null>(null)

    // Overview already shows trip name in the hero — skip label there
    const isOverview = location.pathname === `/trips/${tripId}`
    const displayName = activeTrip?.name ?? fallbackName

    // Fetch trip name if we navigated directly to a sub-page (no active trip in store)
    useEffect(() => {
        if (!tripId || activeTrip) return
        getTripById(tripId).then(t => setFallbackName(t?.name ?? null))
    }, [tripId, activeTrip])

    return (
        <div className="flex flex-col gap-6">
            {!isOverview && tripId && displayName && (
                <Link
                    to={`/trips/${tripId}`}
                    className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-fit"
                >
                    {displayName}
                </Link>
            )}

            <main className="animate-fade-in">
                <Outlet />
            </main>
        </div>
    )
}
