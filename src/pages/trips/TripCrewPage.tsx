import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, X, Shield, User, Loader2, MapPin, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { subscribeToTrip, getUserProfiles, removeMember, updateMemberRole, type MemberProfile } from '@/services/tripService'
import { useAuthStore } from '@/stores/authStore'
import type { Trip } from '@/types'
import { cn } from '@/lib/utils'

export default function TripCrewPage() {
    const { tripId } = useParams<{ tripId: string }>()
    const navigate = useNavigate()
    const user = useAuthStore((s) => s.user)
    const [trip, setTrip] = useState<Trip | null>(null)
    const [members, setMembers] = useState<MemberProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)

    useEffect(() => {
        if (!tripId) return
        return subscribeToTrip(tripId, (t) => {
            setTrip(t)
            setLoading(false)
        })
    }, [tripId])

    useEffect(() => {
        if (!trip) return
        getUserProfiles(trip.memberIds).then(profiles => {
            // Add mock members for visualization if solo
            if (profiles.length <= 1) {
                const mocks: MemberProfile[] = [
                    { id: 'mock1', displayName: 'Sarah Chen', photoURL: 'https://i.pravatar.cc/150?u=mock1', email: 'sarah@example.com', homeCity: 'London', homeLat: 51.5074, homeLng: -0.1278 },
                    { id: 'mock2', displayName: 'Marcus Vance', photoURL: 'https://i.pravatar.cc/150?u=mock2', email: 'marcus@example.com', homeCity: 'New York', homeLat: 40.7128, homeLng: -74.0060 },
                    { id: 'mock3', displayName: 'Elena Rossi', photoURL: 'https://i.pravatar.cc/150?u=mock3', email: 'elena@example.com', homeCity: 'Rome', homeLat: 41.9028, homeLng: 12.4964 },
                    { id: 'mock4', displayName: 'Jack Thompson', photoURL: 'https://i.pravatar.cc/150?u=mock4', email: 'jack@example.com', homeCity: 'Berlin', homeLat: 52.5200, homeLng: 13.4050 },
                ]
                setMembers([...profiles, ...mocks])
            } else {
                setMembers(profiles)
            }
        })
    }, [trip])

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!trip) return <div>Trip not found</div>

    const isOwner = user?.uid === trip.ownerId
    const isHost = isOwner || trip.coLeadIds.includes(user?.uid ?? '')

    async function handleRemove(uid: string) {
        if (!window.confirm('Are you sure you want to remove this traveler?')) return
        setUpdating(uid)
        try {
            await removeMember(trip!.id, uid)
        } finally {
            setUpdating(null)
        }
    }

    async function handleToggleRole(uid: string, currentRole: string) {
        setUpdating(uid)
        try {
            const nextRole = currentRole === 'Host' ? 'traveler' : 'host'
            await updateMemberRole(trip!.id, uid, nextRole)
        } finally {
            setUpdating(null)
        }
    }

    return (
        <div className="max-w-4xl mx-auto py-6 relative">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Trip Crew</h1>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                        Manage who's on board for {trip.name}.
                    </p>
                </div>
                {isHost && (
                    <Button
                        className="rounded-xl font-black h-11 px-6 shadow-lg shadow-primary/20 gap-2"
                        onClick={() => navigate(`/trips/${tripId}`)}
                    >
                        <Plus className="h-4 w-4" />
                        Invite Crew
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {members.map((m) => {
                    const mRole = m.id === trip.ownerId ? 'Owner' : trip.coLeadIds.includes(m.id) ? 'Host' : 'Traveler'
                    const canManage = isHost && m.id !== trip.ownerId && m.id !== user?.uid

                    return (
                        <Card key={m.id} className="p-4 sm:p-5 border-white/40 dark:border-white/10 glass rounded-2xl group transition-all hover:bg-white/40 dark:hover:bg-white/5">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl border-2 border-white dark:border-slate-800 shadow-md overflow-hidden shrink-0">
                                    {m.photoURL ? (
                                        <img src={m.photoURL} className="h-full w-full object-cover" alt={m.displayName} />
                                    ) : (
                                        <div className="h-full w-full premium-gradient flex items-center justify-center text-white font-black text-xl">
                                            {m.displayName[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="font-black text-base truncate">{m.displayName}</h3>
                                        {m.id === user?.uid && <span className="text-primary font-black text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">You</span>}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm",
                                            mRole === 'Owner' ? "bg-amber-100 text-amber-700 border border-amber-200" :
                                                mRole === 'Host' ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                                                    "bg-slate-100 text-slate-600 border border-slate-200"
                                        )}>
                                            {mRole === 'Owner' ? <Shield className="h-2.5 w-2.5" /> : mRole === 'Host' ? <Plus className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                                            {mRole}
                                        </span>
                                        {m.homeCity && (
                                            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-primary/5 text-primary border border-primary/10 flex items-center gap-1.5">
                                                <MapPin className="h-2.5 w-2.5" />
                                                Cruising from {m.homeCity}
                                            </span>
                                        )}
                                        {/* Mock responded status */}
                                        {(m.id.startsWith('mock') || (trip.availability && trip.availability[m.id])) && (
                                            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                                                <CheckCircle2 className="h-2.5 w-2.5" />
                                                Responded
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {canManage && (
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        {updating === m.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        ) : (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 px-3 rounded-xl font-bold text-[10px] uppercase tracking-wider"
                                                    onClick={() => handleToggleRole(m.id, mRole)}
                                                >
                                                    {mRole === 'Host' ? 'Make Traveler' : 'Make Host'}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                                                    onClick={() => handleRemove(m.id)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>
                    )
                })}
            </div>

        </div>
    )
}
