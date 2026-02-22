import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, MapPin, Calendar, Users, Loader2, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
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
  tripType: Trip['tripType']
  estimatedSize: string
}

const INITIAL: WizardData = {
  name: '',
  destinationStatus: 'tbd',
  destination: '',
  dateStatus: 'flexible',
  dates: '',
  tripType: 'group',
  estimatedSize: '',
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 rounded-full transition-all duration-500",
            i < current
              ? "bg-primary w-3 opacity-40"
              : i === current
                ? "bg-primary w-6 shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]"
                : "bg-muted w-3"
          )}
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
      className={cn(
        "w-full rounded-xl border border-white/40 p-4 text-left transition-all duration-300 flex items-center justify-between gap-4 group",
        selected
          ? "border-primary bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary/10"
          : "glass hover:border-primary/30 hover:bg-white/40 dark:hover:bg-white/5"
      )}
    >
      <div className="flex-1">{children}</div>
      <div className={cn(
        "shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
        selected ? "border-primary bg-primary text-white scale-105" : "border-muted-foreground/20"
      )}>
        {selected && <CheckCircle2 className="h-3 w-3" />}
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
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-1">
        <h2 className="text-2xl font-black tracking-tight">Who's coming?</h2>
        <p className="text-sm text-muted-foreground font-medium">Solo adventure or a group trip?</p>
      </div>

      <div className="space-y-3">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Trip type</Label>
        <div className="space-y-2.5">
          <OptionCard
            selected={data.tripType === 'solo'}
            onClick={() =>
              onChange({
                tripType: 'solo',
                estimatedSize: '',
                dateStatus: data.dateStatus === 'poll' ? 'flexible' : data.dateStatus,
              })
            }
          >
            <div>
              <p className="font-bold text-base">Just me</p>
              <p className="text-xs text-muted-foreground">Solo wanderlust</p>
            </div>
          </OptionCard>

          <OptionCard
            selected={data.tripType === 'group'}
            onClick={() => onChange({ tripType: 'group' })}
          >
            <div>
              <p className="font-bold text-base">Group trip</p>
              <p className="text-xs text-muted-foreground">The whole squad</p>
            </div>
          </OptionCard>
        </div>
      </div>

      {data.tripType === 'group' && (
        <div className="space-y-2 animate-fade-in">
          <Label htmlFor="group-size" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
            Estimated group size (optional)
          </Label>
          <Input
            id="group-size"
            type="number"
            min="2"
            max="100"
            placeholder="e.g. 6"
            value={data.estimatedSize}
            onChange={(e) => onChange({ estimatedSize: e.target.value })}
            className="h-11 rounded-xl glass border-white/40 focus:ring-primary/20 transition-all font-bold text-base"
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
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-1">
        <h2 className="text-2xl font-black tracking-tight">Where to?</h2>
        <p className="text-sm text-muted-foreground font-medium">Name your journey and pick a destination.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="trip-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Trip name</Label>
        <Input
          id="trip-name"
          placeholder="e.g. Summer in Europe"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          autoFocus
          className="h-11 rounded-xl glass border-white/40 focus:ring-primary/20 transition-all font-bold text-base"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Destination</Label>
        <div className="space-y-2.5">
          <OptionCard
            selected={data.destinationStatus === 'decided'}
            onClick={() => onChange({ destinationStatus: 'decided' })}
          >
            <div>
              <p className="font-bold text-base">I know the spot</p>
              <p className="text-xs text-muted-foreground">Destination is already decided</p>
            </div>
          </OptionCard>

          {data.destinationStatus === 'decided' && (
            <div className="animate-scale-in">
              <Input
                placeholder="e.g. Barcelona, Spain"
                value={data.destination}
                onChange={(e) => onChange({ destination: e.target.value })}
                autoFocus
                className="h-11 rounded-xl glass bg-white/40 dark:bg-white/5 border-primary/20 focus:ring-primary/20 font-bold text-base"
              />
            </div>
          )}

          <OptionCard
            selected={data.destinationStatus === 'tbd'}
            onClick={() => onChange({ destinationStatus: 'tbd', destination: '' })}
          >
            <div>
              <p className="font-bold text-base">Not sure yet</p>
              <p className="text-xs text-muted-foreground">We'll vote or decide later</p>
            </div>
          </OptionCard>
        </div>
      </div>

      {error && (
        <p className="text-[11px] font-bold text-destructive bg-destructive/5 px-4 py-2 rounded-xl border border-destructive/10 animate-fade-in">
          {error}
        </p>
      )}
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
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-1">
        <h2 className="text-2xl font-black tracking-tight">When?</h2>
        <p className="text-sm text-muted-foreground font-medium">Set your dates or figure them out later.</p>
      </div>

      <div className="space-y-3">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Dates</Label>
        <div className="space-y-2.5">
          <OptionCard
            selected={data.dateStatus === 'decided'}
            onClick={() => onChange({ dateStatus: 'decided' })}
          >
            <div>
              <p className="font-bold text-base">Dates are set</p>
              <p className="text-xs text-muted-foreground">We know exactly when</p>
            </div>
          </OptionCard>

          {data.dateStatus === 'decided' && (
            <div className="animate-scale-in">
              <Input
                placeholder="e.g. July 14 – July 21"
                value={data.dates}
                onChange={(e) => onChange({ dates: e.target.value })}
                autoFocus
                className="h-11 rounded-xl glass bg-white/40 dark:bg-white/5 border-primary/20 focus:ring-primary/20 font-bold text-base"
              />
            </div>
          )}

          {!isSolo && (
            <OptionCard
              selected={data.dateStatus === 'poll'}
              onClick={() => onChange({ dateStatus: 'poll', dates: '' })}
            >
              <div>
                <p className="font-bold text-base">Find availability</p>
                <p className="text-xs text-muted-foreground">
                  Everyone marks when they're free
                </p>
              </div>
            </OptionCard>
          )}

          <OptionCard
            selected={data.dateStatus === 'flexible'}
            onClick={() => onChange({ dateStatus: 'flexible', dates: '' })}
          >
            <div>
              <p className="font-bold text-base">Flexible</p>
              <p className="text-xs text-muted-foreground">TBD</p>
            </div>
          </OptionCard>
        </div>
      </div>

      {error && (
        <p className="text-[11px] font-bold text-destructive bg-destructive/5 px-4 py-2 rounded-xl border border-destructive/10 animate-fade-in">
          {error}
        </p>
      )}
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
      const tripId = await createTrip({
        name: data.name.trim(),
        destination: data.destinationStatus === 'decided' ? data.destination.trim() : null,
        destinationStatus: data.destinationStatus,
        dates: data.dateStatus === 'decided' ? data.dates.trim() : null,
        dateStatus: data.dateStatus,
        tripType: data.tripType,
        estimatedSize: data.estimatedSize ? parseInt(data.estimatedSize, 10) : null,
        ownerId: user.uid,
      })
      navigate(`/trips/${tripId}`, { replace: true })
    } catch {
      setError('Failed to create trip. Please try again.')
      setSubmitting(false)
    }
  }

  const StepIcon = STEP_ICONS[step]

  return (
    <div className="relative min-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 h-[400px] w-[400px] bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto w-full animate-slide-down">
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl premium-gradient text-white shadow-lg shadow-primary/10">
            <StepIcon className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Step {step + 1} of {TOTAL_STEPS}
            </span>
            <StepIndicator current={step} total={TOTAL_STEPS} />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (step > 0 && !window.confirm('Leave trip creation? Your progress will be lost.')) return
            navigate('/trips')
          }}
          className="rounded-xl h-9 w-9 text-muted-foreground hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-6 sm:py-12">
        <div className="w-full max-w-sm">
          {step === 0 && <StepWho data={data} onChange={onChange} />}
          {step === 1 && <StepWhere data={data} onChange={onChange} error={error} />}
          {step === 2 && <StepWhen data={data} onChange={onChange} error={error} />}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 sm:py-10 max-w-2xl mx-auto w-full animate-slide-up">
        <div className="flex items-center justify-between gap-4">
          {step > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
              className="rounded-xl h-10 px-6 font-bold"
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS - 1 ? (
            <Button
              onClick={handleNext}
              className="rounded-xl h-10 px-8 font-black shadow-lg shadow-primary/10 group"
            >
              Continue
              <Circle className="ml-2 h-1.5 w-1.5 fill-current opacity-40 transition-transform group-hover:scale-125" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-xl h-10 px-8 font-black shadow-lg shadow-primary/10"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Launch Trip'
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
