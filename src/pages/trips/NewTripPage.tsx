import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, MapPin, Calendar, Users, Loader2, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTrip } from '@/services/tripService'
import { useAuthStore } from '@/stores/authStore'
import type { Trip } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardData {
  name: string
  destinationStatus: Trip['destinationStatus']
  destination: string
  dateStatus: Trip['dateStatus']
  dates: string
  myAvailability: string
  tripType: Trip['tripType']
  estimatedSize: string
}

const INITIAL: WizardData = {
  name: '',
  destinationStatus: 'tbd',
  destination: '',
  dateStatus: 'flexible',
  dates: '',
  myAvailability: '',
  tripType: 'group',
  estimatedSize: '',
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < current ? 'bg-primary w-6' : i === current ? 'bg-primary w-8' : 'bg-muted w-6'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Option card ──────────────────────────────────────────────────────────────

function OptionCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border-2 p-4 text-left transition-all flex items-start justify-between gap-3 ${
        selected
          ? 'border-primary bg-primary/8 shadow-sm'
          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
      }`}
    >
      <div className="flex-1">{children}</div>
      <div className="shrink-0 mt-0.5">
        {selected ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/40" />
        )}
      </div>
    </button>
  )
}

// ─── Step 0: Who's coming? ────────────────────────────────────────────────────

function StepWho({
  data,
  onChange,
}: {
  data: WizardData
  onChange: (patch: Partial<WizardData>) => void
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">Who's coming?</h2>
        <p className="text-muted-foreground">Solo adventure or a group trip?</p>
      </div>

      <div className="space-y-2">
        <Label>Trip type</Label>
        <div className="space-y-2">
          <OptionCard
            selected={data.tripType === 'solo'}
            onClick={() =>
              onChange({
                tripType: 'solo',
                estimatedSize: '',
                // If they were going to poll, reset to flexible since solo has no group to poll
                dateStatus: data.dateStatus === 'poll' ? 'flexible' : data.dateStatus,
              })
            }
          >
            <p className="font-medium">Just me</p>
            <p className="text-sm text-muted-foreground mt-0.5">Solo trip</p>
          </OptionCard>

          <OptionCard
            selected={data.tripType === 'group'}
            onClick={() => onChange({ tripType: 'group' })}
          >
            <p className="font-medium">Group trip</p>
            <p className="text-sm text-muted-foreground mt-0.5">Multiple people traveling together</p>
          </OptionCard>
        </div>
      </div>

      {data.tripType === 'group' && (
        <div className="space-y-2">
          <Label htmlFor="group-size">Estimated group size (optional)</Label>
          <Input
            id="group-size"
            type="number"
            min="2"
            max="100"
            placeholder="e.g. 6"
            value={data.estimatedSize}
            onChange={(e) => onChange({ estimatedSize: e.target.value })}
          />
        </div>
      )}
    </div>
  )
}

// ─── Step 1: Where are you going? ────────────────────────────────────────────

function StepWhere({
  data,
  onChange,
  error,
}: {
  data: WizardData
  onChange: (patch: Partial<WizardData>) => void
  error: string
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">Where are you going?</h2>
        <p className="text-muted-foreground">Name your trip and pick a destination.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="trip-name">Trip name</Label>
        <Input
          id="trip-name"
          placeholder="e.g. Summer in Europe"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          autoFocus
        />
      </div>

      <div className="space-y-3">
        <Label>Destination</Label>
        <div className="space-y-2">
          <OptionCard
            selected={data.destinationStatus === 'decided'}
            onClick={() => onChange({ destinationStatus: 'decided' })}
          >
            <p className="font-medium">I know where we're going</p>
            <p className="text-sm text-muted-foreground mt-0.5">Destination is already decided</p>
          </OptionCard>

          {data.destinationStatus === 'decided' && (
            <Input
              placeholder="e.g. Barcelona, Spain"
              value={data.destination}
              onChange={(e) => onChange({ destination: e.target.value })}
              autoFocus
            />
          )}

          <OptionCard
            selected={data.destinationStatus === 'tbd'}
            onClick={() => onChange({ destinationStatus: 'tbd', destination: '' })}
          >
            <p className="font-medium">Not sure yet</p>
            <p className="text-sm text-muted-foreground mt-0.5">We'll vote or decide later</p>
          </OptionCard>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

// ─── Step 2: When are you going? ─────────────────────────────────────────────

function StepWhen({
  data,
  onChange,
  error,
}: {
  data: WizardData
  onChange: (patch: Partial<WizardData>) => void
  error: string
}) {
  const isSolo = data.tripType === 'solo'

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">When are you going?</h2>
        <p className="text-muted-foreground">Set your dates or figure them out later.</p>
      </div>

      <div className="space-y-2">
        <Label>Dates</Label>
        <div className="space-y-2">
          <OptionCard
            selected={data.dateStatus === 'decided'}
            onClick={() => onChange({ dateStatus: 'decided' })}
          >
            <p className="font-medium">Dates are set</p>
            <p className="text-sm text-muted-foreground mt-0.5">We know exactly when</p>
          </OptionCard>

          {data.dateStatus === 'decided' && (
            <Input
              placeholder="e.g. July 14 – July 21, 2025"
              value={data.dates}
              onChange={(e) => onChange({ dates: e.target.value })}
              autoFocus
            />
          )}

          {!isSolo && (
            <OptionCard
              selected={data.dateStatus === 'poll'}
              onClick={() => onChange({ dateStatus: 'poll', dates: '' })}
            >
              <p className="font-medium">Find availability</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Everyone marks when they're free — the best overlap gets highlighted
              </p>
            </OptionCard>
          )}

          {data.dateStatus === 'poll' && (
            <div className="space-y-1.5 pt-1 px-1">
              <Label htmlFor="my-availability">Your available dates (optional)</Label>
              <Input
                id="my-availability"
                placeholder="e.g. June 1–15, July 10–20"
                value={data.myAvailability}
                onChange={(e) => onChange({ myAvailability: e.target.value })}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                You'll invite your group after creating the trip — they can add their dates too.
              </p>
            </div>
          )}

          <OptionCard
            selected={data.dateStatus === 'flexible'}
            onClick={() => onChange({ dateStatus: 'flexible', dates: '' })}
          >
            <p className="font-medium">Flexible</p>
            <p className="text-sm text-muted-foreground mt-0.5">We'll figure it out</p>
          </OptionCard>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STEP_ICONS = [Users, MapPin, Calendar]
const TOTAL_STEPS = 3

export default function NewTripPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>(INITIAL)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function onChange(patch: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...patch }))
    setError('')
  }

  function validate(): boolean {
    if (step === 1) {
      if (!data.name.trim()) {
        setError('Please give your trip a name.')
        return false
      }
      if (data.destinationStatus === 'decided' && !data.destination.trim()) {
        setError('Please enter a destination or choose "Not sure yet".')
        return false
      }
    }
    if (step === 2) {
      if (data.dateStatus === 'decided' && !data.dates.trim()) {
        setError('Please enter your dates or choose another option.')
        return false
      }
    }
    return true
  }

  function handleNext() {
    if (!validate()) return
    setStep((s) => s + 1)
  }

  async function handleCreate() {
    if (!user) return
    if (!validate()) return
    setSubmitting(true)
    try {
      const availability: Record<string, string> = {}
      if (data.dateStatus === 'poll' && data.myAvailability.trim()) {
        availability[user.uid] = data.myAvailability.trim()
      }

      const tripId = await createTrip({
        name: data.name.trim(),
        destination: data.destinationStatus === 'decided' ? data.destination.trim() : null,
        destinationStatus: data.destinationStatus,
        dates: data.dateStatus === 'decided' ? data.dates.trim() : null,
        dateStatus: data.dateStatus,
        tripType: data.tripType,
        estimatedSize: data.estimatedSize ? parseInt(data.estimatedSize, 10) : null,
        ownerId: user.uid,
        availability,
      })
      navigate(`/trips/${tripId}`, { replace: true })
    } catch {
      setError('Failed to create trip. Please try again.')
      setSubmitting(false)
    }
  }

  const StepIcon = STEP_ICONS[step]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <StepIcon className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            Step {step + 1} of {TOTAL_STEPS}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <StepIndicator current={step} total={TOTAL_STEPS} />
          <button
            type="button"
            onClick={() => navigate('/trips')}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {step === 0 && <StepWho data={data} onChange={onChange} />}
          {step === 1 && <StepWhere data={data} onChange={onChange} error={error} />}
          {step === 2 && <StepWhen data={data} onChange={onChange} error={error} />}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t px-4 py-4">
        <div className="mx-auto flex w-full max-w-md justify-between gap-3">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS - 1 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create trip'
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
