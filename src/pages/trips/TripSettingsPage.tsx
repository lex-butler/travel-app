import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  subscribeToTrip,
  updateTrip,
  archiveTrip,
  unarchiveTrip,
} from '@/services/tripService'
import { useAuthStore } from '@/stores/authStore'
import { useTripStore } from '@/stores/tripStore'
import type { Trip } from '@/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Trip name is required'),
  destination: z.string().optional(),
  destinationStatus: z.enum(['decided', 'tbd']),
  dates: z.string().optional(),
  dateStatus: z.enum(['decided', 'poll', 'flexible']),
  tripType: z.enum(['solo', 'group']),
  estimatedSize: z.string().optional(),
  phase: z.enum(['planning', 'booking', 'finalized']),
  budget: z.string().optional(),
  currency: z.string().min(1),
})

type FormData = z.infer<typeof schema>

// ─── Toggle group helper ───────────────────────────────────────────────────────

function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="flex gap-1 p-1 glass rounded-xl border border-white/30 w-fit">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
            value === opt.value
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripSettingsPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { setActiveTrip } = useTripStore()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const watchedTripType = watch('tripType')
  const watchedDestStatus = watch('destinationStatus')
  const watchedDateStatus = watch('dateStatus')

  useEffect(() => {
    if (!tripId) return
    return subscribeToTrip(tripId, (data) => {
      setTrip(data)
      setActiveTrip(data)
      setLoading(false)
      if (data) {
        reset({
          name: data.name,
          destination: data.destination ?? '',
          destinationStatus: data.destinationStatus,
          dates: data.dates ?? '',
          dateStatus: data.dateStatus,
          tripType: data.tripType,
          estimatedSize: data.estimatedSize != null ? String(data.estimatedSize) : '',
          phase: data.phase,
          budget: data.budget != null ? String(data.budget) : '',
          currency: data.currency,
        })
      }
    })
  }, [tripId, setActiveTrip, reset])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!trip) return <div>Trip not found.</div>

  const isOwnerOrColead =
    user &&
    (trip.ownerId === user.uid || trip.coLeadIds.includes(user.uid))

  if (!isOwnerOrColead) {
    return (
      <div className="text-center py-20">
        <p className="font-black text-xl mb-2">Access Denied</p>
        <p className="text-muted-foreground text-sm">Only the trip organiser can edit settings.</p>
      </div>
    )
  }

  async function onSubmit(data: FormData) {
    if (!tripId) return
    setSaving(true)
    try {
      await updateTrip(tripId, {
        name: data.name,
        destination: data.destination || null,
        destinationStatus: data.destinationStatus,
        dates: data.dates || null,
        dateStatus: data.dateStatus,
        tripType: data.tripType,
        estimatedSize: data.estimatedSize ? parseInt(data.estimatedSize, 10) : null,
        phase: data.phase,
        budget: data.budget ? parseFloat(data.budget) : null,
        currency: data.currency,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleArchiveToggle() {
    if (!tripId || !trip) return
    const action = trip.archived ? 'unarchive' : 'archive'
    if (!window.confirm(`Are you sure you want to ${action} this trip?`)) return
    setArchiving(true)
    try {
      if (trip.archived) {
        await unarchiveTrip(tripId)
      } else {
        await archiveTrip(tripId)
        navigate('/trips')
      }
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Trip Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Edit the details for <strong>{trip.name}</strong>.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Trip Name */}
        <Card className="p-6 border-white/40 glass rounded-2xl space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Basic Info</h2>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest">Trip Name</Label>
            <Input
              id="name"
              {...register('name')}
              className="rounded-xl border-white/30"
              placeholder="e.g. Amalfi Coast Retreat"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Trip Type</Label>
            <ToggleGroup
              value={watchedTripType}
              onChange={(v) => setValue('tripType', v, { shouldDirty: true })}
              options={[
                { value: 'group', label: 'Group' },
                { value: 'solo', label: 'Solo' },
              ]}
            />
          </div>

          {watchedTripType === 'group' && (
            <div className="space-y-2">
              <Label htmlFor="estimatedSize" className="text-xs font-black uppercase tracking-widest">Estimated Group Size</Label>
              <Input
                id="estimatedSize"
                type="number"
                min={2}
                {...register('estimatedSize')}
                className="rounded-xl border-white/30 w-32"
                placeholder="e.g. 6"
              />
            </div>
          )}
        </Card>

        {/* Destination */}
        <Card className="p-6 border-white/40 glass rounded-2xl space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Destination</h2>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Status</Label>
            <ToggleGroup
              value={watchedDestStatus}
              onChange={(v) => setValue('destinationStatus', v, { shouldDirty: true })}
              options={[
                { value: 'decided', label: 'Decided' },
                { value: 'tbd', label: 'TBD' },
              ]}
            />
          </div>

          {watchedDestStatus === 'decided' && (
            <div className="space-y-2">
              <Label htmlFor="destination" className="text-xs font-black uppercase tracking-widest">Location</Label>
              <Input
                id="destination"
                {...register('destination')}
                className="rounded-xl border-white/30"
                placeholder="e.g. Positano, Italy"
              />
            </div>
          )}
        </Card>

        {/* Dates */}
        <Card className="p-6 border-white/40 glass rounded-2xl space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Dates</h2>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Status</Label>
            <ToggleGroup
              value={watchedDateStatus}
              onChange={(v) => setValue('dateStatus', v, { shouldDirty: true })}
              options={[
                { value: 'decided', label: 'Decided' },
                { value: 'poll', label: 'Polling' },
                { value: 'flexible', label: 'Flexible' },
              ]}
            />
          </div>

          {watchedDateStatus === 'decided' && (
            <div className="space-y-2">
              <Label htmlFor="dates" className="text-xs font-black uppercase tracking-widest">Date Range</Label>
              <Input
                id="dates"
                {...register('dates')}
                className="rounded-xl border-white/30"
                placeholder="e.g. Sept 5 – 12, 2025"
              />
            </div>
          )}
        </Card>

        {/* Planning Status */}
        <Card className="p-6 border-white/40 glass rounded-2xl space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Planning Status</h2>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Phase</Label>
            <ToggleGroup
              value={watch('phase')}
              onChange={(v) => setValue('phase', v, { shouldDirty: true })}
              options={[
                { value: 'planning', label: 'Planning' },
                { value: 'booking', label: 'Booking' },
                { value: 'finalized', label: 'Finalized' },
              ]}
            />
          </div>
        </Card>

        {/* Budget */}
        <Card className="p-6 border-white/40 glass rounded-2xl space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Budget</h2>

          <div className="flex gap-3">
            <div className="space-y-2 w-24">
              <Label htmlFor="currency" className="text-xs font-black uppercase tracking-widest">Currency</Label>
              <Input
                id="currency"
                {...register('currency')}
                className="rounded-xl border-white/30"
                placeholder="USD"
                maxLength={4}
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="budget" className="text-xs font-black uppercase tracking-widest">Total Budget</Label>
              <Input
                id="budget"
                type="number"
                min={0}
                {...register('budget')}
                className="rounded-xl border-white/30"
                placeholder="e.g. 5000"
              />
            </div>
          </div>
        </Card>

        {/* Save */}
        <div className="flex items-center gap-4">
          <Button
            type="submit"
            disabled={saving || !isDirty}
            className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          {saved && (
            <p className="text-xs font-black text-emerald-500 uppercase tracking-widest animate-fade-in">
              Saved!
            </p>
          )}
        </div>
      </form>

      {/* Danger Zone */}
      <Card className="p-6 border-destructive/20 bg-destructive/[0.02] rounded-2xl space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-destructive">Danger Zone</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold">{trip.archived ? 'Unarchive this trip' : 'Archive this trip'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {trip.archived
                ? 'Move this trip back to your active trips.'
                : 'Remove this trip from your active list. You can unarchive it later.'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleArchiveToggle}
            disabled={archiving}
            className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 font-black text-[10px] uppercase tracking-widest h-10 px-5 shrink-0 gap-2"
          >
            {archiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            {trip.archived ? 'Unarchive' : 'Archive'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
