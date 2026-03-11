import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DollarSign, Plus, Loader2, Utensils, Home, Plane, Ticket, Package,
  ChevronDown, ChevronUp, Trash2, CheckCircle2, ArrowRight, Pencil,
  ExternalLink, Copy, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  subscribeToExpenses, subscribeToSettlements,
  addExpense, updateExpense, deleteExpense, addSettlement, updateSettlementStatus,
  calcEqualSplits, calcPercentageSplits,
  calcNetBalances, simplifyDebts,
  type Debt,
} from '@/services/expenseService'
import { subscribeToTrip, getUserProfiles, type MemberProfile } from '@/services/tripService'
import { useAuthStore } from '@/stores/authStore'
import type { Trip, Expense, Settlement, ExpenseCategory, SplitMethod, PaymentMethod, PaymentMethodType } from '@/types'
import { cn } from '@/lib/utils'
import { Timestamp } from 'firebase/firestore'

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: { value: ExpenseCategory; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'food', label: 'Food & Drink', icon: Utensils, color: 'bg-amber-500/10 text-amber-600' },
  { value: 'accommodation', label: 'Accommodation', icon: Home, color: 'bg-blue-500/10 text-blue-600' },
  { value: 'transport', label: 'Transport', icon: Plane, color: 'bg-violet-500/10 text-violet-600' },
  { value: 'activity', label: 'Activity', icon: Ticket, color: 'bg-emerald-500/10 text-emerald-600' },
  { value: 'other', label: 'Other', icon: Package, color: 'bg-slate-500/10 text-slate-500' },
]

function getCategoryConfig(cat: ExpenseCategory) {
  return CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[4]
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
}

// ─── Payment method config ────────────────────────────────────────────────────

const PM_CONFIG: Record<PaymentMethodType, { label: string; emoji: string; gradient: string }> = {
  venmo:    { label: 'Venmo',     emoji: '💙', gradient: 'from-blue-500 to-blue-700' },
  cashapp:  { label: 'Cash App',  emoji: '💚', gradient: 'from-emerald-500 to-emerald-800' },
  paypal:   { label: 'PayPal',    emoji: '💛', gradient: 'from-sky-500 to-indigo-700' },
  zelle:    { label: 'Zelle',     emoji: '💜', gradient: 'from-violet-500 to-purple-800' },
  applepay: { label: 'Apple Pay', emoji: '🍎', gradient: 'from-slate-700 to-slate-900' },
  other:    { label: 'Other',     emoji: '💳', gradient: 'from-slate-500 to-slate-700' },
}

function getDeepLink(method: PaymentMethod, amount: number): string | null {
  const handle = method.handle.replace(/^[@$]/, '')
  switch (method.type) {
    case 'venmo':   return `https://venmo.com/${handle}?txn=pay&amount=${amount}&note=TripSync`
    case 'cashapp': return `https://cash.app/$${handle}/${amount}`
    case 'paypal':  return `https://paypal.me/${handle}/${amount}`
    default:        return null
  }
}

// ─── Mini avatar ─────────────────────────────────────────────────────────────

function MiniAvatar({ profile, size = 8 }: { profile: MemberProfile; size?: number }) {
  const initials = profile.displayName.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const dim = `h-${size} w-${size}`
  return (
    <div className={cn('shrink-0 rounded-full border-2 border-white/50 overflow-hidden', dim)}>
      {profile.photoURL
        ? <img src={profile.photoURL} alt={profile.displayName} className="h-full w-full object-cover" />
        : <div className="h-full w-full bg-primary/10 text-primary font-black flex items-center justify-center text-[9px]">{initials}</div>}
    </div>
  )
}

// ─── Pending Settlement Card ──────────────────────────────────────────────────

function PendingSettlementCard({ settlement, fromProfile, currency, tripId }: {
  settlement: Settlement
  fromProfile: MemberProfile | undefined
  currency: string
  tripId: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const config = settlement.paymentMethodType ? PM_CONFIG[settlement.paymentMethodType] : null
  const firstName = fromProfile?.displayName.split(' ')[0] ?? 'Someone'

  async function handleConfirm() {
    setConfirming(true)
    try {
      await updateSettlementStatus(tripId, settlement.id, 'confirmed')
      setConfirmed(true)
    } finally {
      setConfirming(false)
    }
  }

  if (confirmed) return null

  return (
    <Card className="p-4 glass border-amber-500/30 bg-amber-500/5 rounded-2xl flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {fromProfile && <MiniAvatar profile={fromProfile} size={7} />}
          <div className="min-w-0">
            <p className="text-[11px] font-black truncate">
              {firstName} paid you {formatCurrency(settlement.amount, currency)}
              {config && <span className="font-medium"> via {config.label}</span>}
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 mt-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Pending your confirmation
            </p>
          </div>
        </div>
      </div>
      <Button
        size="sm"
        onClick={handleConfirm}
        disabled={confirming}
        className="shrink-0 h-8 rounded-xl text-[10px] font-black bg-emerald-500 hover:bg-emerald-600 text-white uppercase tracking-widest"
      >
        {confirming ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm ✓'}
      </Button>
    </Card>
  )
}

// ─── Payment Sheet ────────────────────────────────────────────────────────────

function PaymentMethodRow({ method, onClick, disabled }: {
  method: PaymentMethod
  onClick: () => void
  disabled: boolean
}) {
  const config = PM_CONFIG[method.type]
  const hasLink = ['venmo', 'cashapp', 'paypal'].includes(method.type)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg transition-transform active:scale-95 text-left',
        config.gradient,
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{config.label}</p>
          <p className="font-black mt-0.5">{method.handle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.emoji}</span>
          {hasLink
            ? <ExternalLink className="h-4 w-4 opacity-60" />
            : <Copy className="h-4 w-4 opacity-60" />}
        </div>
      </div>
    </button>
  )
}

function PaymentSheet({ open, onClose, debt, toProfile, currency, tripId }: {
  open: boolean
  onClose: () => void
  debt: Debt
  toProfile: MemberProfile
  currency: string
  tripId: string
}) {
  const [paying, setPaying] = useState(false)
  const firstName = toProfile.displayName.split(' ')[0]

  async function handlePay(method: PaymentMethod) {
    setPaying(true)
    try {
      const link = getDeepLink(method, debt.amount)
      if (link) {
        window.open(link, '_blank')
      } else {
        // Zelle / Apple Pay / Other — copy handle to clipboard
        await navigator.clipboard.writeText(method.handle).catch(() => {})
      }
      await addSettlement(tripId, {
        from: debt.from,
        to: debt.to,
        amount: debt.amount,
        currency,
        note: '',
        paymentMethodType: method.type,
        status: 'pending',
        initiatedBy: debt.from,
      })
      onClose()
    } finally {
      setPaying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm glass border-white/40 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-black uppercase tracking-tight">Pay {firstName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Send <span className="font-black text-foreground">{formatCurrency(debt.amount, currency)}</span> to {firstName}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Choose method</p>
          <div className="space-y-3">
            {toProfile.paymentMethods?.map((method) => (
              <PaymentMethodRow
                key={method.id}
                method={method}
                onClick={() => handlePay(method)}
                disabled={paying}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            {['venmo', 'cashapp', 'paypal'].some(t => toProfile.paymentMethods?.some(m => m.type === t))
              ? 'Tapping a card opens the app. Copy methods show the handle.'
              : 'Handle copied to clipboard — complete the payment in your banking app.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add Expense Dialog ───────────────────────────────────────────────────────

interface AddExpenseDialogProps {
  open: boolean
  onClose: () => void
  trip: Trip
  profiles: MemberProfile[]
  currentUserId: string
  initialData?: Expense
  mode?: 'add' | 'edit'
}

function AddExpenseDialog({ open, onClose, trip, profiles, currentUserId, initialData, mode = 'add' }: AddExpenseDialogProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('food')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [splitAmong, setSplitAmong] = useState<string[]>(trip.memberIds)
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal')
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
  const [percentages, setPercentages] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Pre-fill fields when editing an existing expense
  useEffect(() => {
    if (open && mode === 'edit' && initialData) {
      setDescription(initialData.description)
      setAmount(String(initialData.amount))
      setCategory(initialData.category)
      setDate(initialData.date instanceof Object && 'toDate' in initialData.date
        ? initialData.date.toDate().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0])
      setPaidBy(initialData.paidBy)
      setSplitAmong(initialData.splitAmong)
      setSplitMethod(initialData.splitMethod ?? 'equal')
      setNotes(initialData.notes ?? '')
      // Restore custom splits if present
      if (initialData.splitMethod === 'custom') {
        const custom: Record<string, string> = {}
        for (const [uid, val] of Object.entries(initialData.splits)) custom[uid] = String(val)
        setCustomAmounts(custom)
      }
    } else if (open && mode === 'add') {
      setDescription(''); setAmount(''); setCategory('food')
      setDate(new Date().toISOString().split('T')[0])
      setPaidBy(currentUserId); setSplitAmong(trip.memberIds)
      setSplitMethod('equal'); setCustomAmounts({}); setPercentages({}); setNotes('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const amountNum = parseFloat(amount) || 0

  const equalPer = splitAmong.length > 0 ? amountNum / splitAmong.length : 0

  function toggleMember(uid: string) {
    setSplitAmong((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    )
  }

  function computeSplits(): Record<string, number> {
    if (splitMethod === 'equal') return calcEqualSplits(amountNum, splitAmong)
    if (splitMethod === 'percentage') {
      const pcts: Record<string, number> = {}
      for (const uid of splitAmong) pcts[uid] = parseFloat(percentages[uid] ?? '0') || 0
      return calcPercentageSplits(amountNum, pcts)
    }
    // custom
    const result: Record<string, number> = {}
    for (const uid of splitAmong) result[uid] = parseFloat(customAmounts[uid] ?? '0') || 0
    return result
  }

  function validate(): string | null {
    if (!description.trim()) return 'Description is required'
    if (amountNum <= 0) return 'Amount must be greater than 0'
    if (splitAmong.length === 0) return 'At least one person must split the expense'
    if (splitMethod === 'custom') {
      const sum = Object.values(customAmounts).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
      if (Math.abs(sum - amountNum) > 0.02) return `Custom amounts must sum to ${formatCurrency(amountNum, trip.currency)} (currently ${formatCurrency(sum, trip.currency)})`
    }
    if (splitMethod === 'percentage') {
      const sum = Object.values(percentages).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
      if (Math.abs(sum - 100) > 0.5) return `Percentages must sum to 100% (currently ${sum.toFixed(1)}%)`
    }
    return null
  }

  async function handleSave() {
    const error = validate()
    if (error) { alert(error); return }
    setSaving(true)
    try {
      const splits = computeSplits()
      const dateTs = Timestamp.fromDate(new Date(date + 'T12:00:00'))
      if (mode === 'edit' && initialData) {
        await updateExpense(trip.id, initialData.id, {
          description: description.trim(),
          amount: amountNum,
          currency: trip.currency,
          category,
          paidBy,
          splitAmong,
          splitMethod,
          splits,
          date: dateTs,
          notes: notes.trim(),
        })
      } else {
        await addExpense(trip.id, {
          description: description.trim(),
          amount: amountNum,
          currency: trip.currency,
          category,
          paidBy,
          splitAmong,
          splitMethod,
          splits,
          paidStatus: {},
          date: dateTs,
          notes: notes.trim(),
        })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md glass border-white/40 rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase tracking-tight">{mode === 'edit' ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">What was it?</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Dinner at La Boqueria" className="rounded-xl h-11" />
          </div>

          {/* Amount + Category */}
          <div className="flex gap-3">
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount ({trip.currency})</label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="rounded-xl h-11" />
            </div>
            <div className="space-y-1.5 w-32">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl h-11" />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all',
                    category === c.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-white/30 bg-white/40 dark:bg-white/5 text-muted-foreground',
                  )}
                >
                  <c.icon className="h-3 w-3" />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Paid by */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Paid by</label>
            <div className="flex flex-wrap gap-2">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPaidBy(p.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black border-2 transition-all',
                    paidBy === p.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-white/30 bg-white/40 dark:bg-white/5 text-muted-foreground',
                  )}
                >
                  <MiniAvatar profile={p} size={5} />
                  {p.displayName.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Split among */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Split among</label>
            <div className="flex flex-wrap gap-2">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleMember(p.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black border-2 transition-all',
                    splitAmong.includes(p.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-white/30 bg-white/40 dark:bg-white/5 text-muted-foreground opacity-50',
                  )}
                >
                  <MiniAvatar profile={p} size={5} />
                  {p.displayName.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Split method */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Split method</label>
            <div className="flex rounded-xl bg-white/30 dark:bg-white/10 p-1 gap-1">
              {(['equal', 'custom', 'percentage'] as SplitMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSplitMethod(m)}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all',
                    splitMethod === m ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  {m === 'equal' ? 'Equal' : m === 'custom' ? 'Custom' : '%'}
                </button>
              ))}
            </div>

            {splitMethod === 'equal' && splitAmong.length > 0 && (
              <p className="text-center text-[11px] font-bold text-muted-foreground">
                {formatCurrency(equalPer, trip.currency)} per person
              </p>
            )}

            {splitMethod === 'custom' && (
              <div className="space-y-2">
                {profiles.filter((p) => splitAmong.includes(p.id)).map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <MiniAvatar profile={p} size={6} />
                    <span className="flex-1 text-[11px] font-bold">{p.displayName.split(' ')[0]}</span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={customAmounts[p.id] ?? ''}
                      onChange={(e) => setCustomAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="0.00"
                      className="w-24 h-8 rounded-lg text-[11px]"
                    />
                  </div>
                ))}
              </div>
            )}

            {splitMethod === 'percentage' && (
              <div className="space-y-2">
                {profiles.filter((p) => splitAmong.includes(p.id)).map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <MiniAvatar profile={p} size={6} />
                    <span className="flex-1 text-[11px] font-bold">{p.displayName.split(' ')[0]}</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number" min="0" max="100" step="1"
                        value={percentages[p.id] ?? ''}
                        onChange={(e) => setPercentages((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="0"
                        className="w-16 h-8 rounded-lg text-[11px]"
                      />
                      <span className="text-[11px] text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notes (optional)</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Includes tip" className="rounded-xl h-11" />
          </div>

          <Button onClick={handleSave} disabled={saving || !description.trim() || !amount} className="w-full rounded-xl h-12 font-black uppercase tracking-widest text-[10px]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'edit' ? 'Save Changes' : 'Add Expense'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Expense Card ─────────────────────────────────────────────────────────────

function ExpenseCard({
  expense, profiles, currentUserId, isHost, currency, tripId, onEdit,
}: {
  expense: Expense
  profiles: MemberProfile[]
  currentUserId: string
  isHost: boolean
  currency: string
  tripId: string
  onEdit: (expense: Expense) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const cat = getCategoryConfig(expense.category)
  const payer = profiles.find((p) => p.id === expense.paidBy)
  const canDelete = expense.paidBy === currentUserId || isHost
  const canEdit = expense.paidBy === currentUserId || isHost

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this expense?')) return
    setDeleting(true)
    try { await deleteExpense(tripId, expense.id) } finally { setDeleting(false) }
  }

  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      className="group p-4 rounded-2xl border border-white/50 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', cat.color)}>
          <cat.icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm truncate uppercase tracking-tight">{expense.description}</p>
          <p className="text-[10px] font-bold text-muted-foreground">
            Paid by {payer?.displayName.split(' ')[0] ?? 'Someone'}
            {' · '}Split {expense.splitAmong.length} ways
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-black text-sm">{formatCurrency(expense.amount, currency)}</p>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-auto mt-0.5" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto mt-0.5" />}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-3 border-t border-white/20 space-y-2 animate-scale-in origin-top" onClick={(e) => e.stopPropagation()}>
          {Object.entries(expense.splits).map(([uid, share]) => {
            const p = profiles.find((pr) => pr.id === uid)
            return (
              <div key={uid} className="flex items-center gap-2 text-[11px]">
                <MiniAvatar profile={p ?? { id: uid, displayName: 'Unknown', photoURL: null, email: '', homeCity: '', homeLat: 0, homeLng: 0 }} size={6} />
                <span className="flex-1 font-bold">{p?.displayName.split(' ')[0] ?? 'Someone'}</span>
                <span className="font-black">{formatCurrency(share, currency)}</span>
                {uid === expense.paidBy && <span className="text-[9px] bg-emerald-500/10 text-emerald-600 font-black px-1.5 py-0.5 rounded-full uppercase">Paid</span>}
              </div>
            )
          })}
          {expense.notes && <p className="text-[11px] text-muted-foreground italic pt-1">{expense.notes}</p>}
          {(canEdit || canDelete) && (
            <div className="flex gap-2 mt-2">
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(expense) }}
                  className="flex-1 h-8 text-primary hover:bg-primary/10 rounded-xl text-[10px] font-black uppercase">
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
              )}
              {canDelete && (
                <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}
                  className="flex-1 h-8 text-destructive hover:bg-destructive/10 rounded-xl text-[10px] font-black uppercase">
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Trash2 className="h-3 w-3 mr-1" /> Delete</>}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [trip, setTrip] = useState<Trip | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [profiles, setProfiles] = useState<MemberProfile[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [settlingDebt, setSettlingDebt] = useState<string | null>(null)
  const [paymentSheetDebt, setPaymentSheetDebt] = useState<Debt | null>(null)

  useEffect(() => {
    if (!tripId) return
    const unsubTrip = subscribeToTrip(tripId, setTrip)
    const unsubExp = subscribeToExpenses(tripId, setExpenses)
    const unsubSet = subscribeToSettlements(tripId, setSettlements)
    return () => { unsubTrip(); unsubExp(); unsubSet() }
  }, [tripId])

  useEffect(() => {
    if (!trip) return
    getUserProfiles(trip.memberIds).then(setProfiles)
  }, [trip])

  if (!trip) return <div className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>

  const isHost = user?.uid === trip.ownerId || trip.coLeadIds.includes(user?.uid ?? '')
  const currency = trip.currency || 'USD'

  // Computed stats
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
  const perPerson = trip.memberIds.length > 0 ? totalSpent / trip.memberIds.length : 0
  const budgetProgress = trip.budget ? Math.min((totalSpent / trip.budget) * 100, 100) : null

  // Category totals
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {})

  // Balances
  const netBalances = calcNetBalances(expenses, settlements, trip.memberIds)
  const debts = simplifyDebts(netBalances, trip.memberIds)

  // Pending settlements where current user is the payee (needs confirmation)
  const pendingForMe = settlements.filter(
    (s) => s.status === 'pending' && s.to === user?.uid,
  )

  async function handleSettle(debt: Debt) {
    const key = `${debt.from}-${debt.to}`
    setSettlingDebt(key)
    try {
      await addSettlement(trip!.id, {
        from: debt.from,
        to: debt.to,
        amount: debt.amount,
        currency,
        note: '',
      })
    } finally {
      setSettlingDebt(null)
    }
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Budget
        </h1>
        <Button onClick={() => setShowAdd(true)} className="rounded-xl h-10 font-black text-[10px] uppercase tracking-widest gap-2">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full glass border border-white/30 rounded-2xl h-11 p-1">
          <TabsTrigger value="overview" className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest">Overview</TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
            Expenses {expenses.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-primary/20 text-primary rounded-full text-[9px]">{expenses.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="balances" className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
            Balances {debts.length > 0 && <span className="ml-1.5 h-2 w-2 bg-destructive rounded-full inline-block" />}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Budget progress */}
          <Card className="p-6 glass border-white/40 rounded-3xl space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Spent</p>
                <p className="text-3xl font-black tracking-tight">{formatCurrency(totalSpent, currency)}</p>
              </div>
              {trip.budget && (
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Budget</p>
                  <p className="text-xl font-black text-muted-foreground">{formatCurrency(trip.budget, currency)}</p>
                </div>
              )}
            </div>

            {budgetProgress !== null && (
              <div className="space-y-2">
                <div className="h-3 rounded-full bg-white/30 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', budgetProgress > 90 ? 'bg-destructive' : budgetProgress > 70 ? 'bg-amber-500' : 'bg-primary')}
                    style={{ width: `${budgetProgress}%` }}
                  />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground">{budgetProgress.toFixed(0)}% of budget used</p>
              </div>
            )}

            {!trip.budget && (
              <button onClick={() => navigate(`/trips/${tripId}/settings`)} className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest">
                Set a trip budget →
              </button>
            )}
          </Card>

          {/* Stats pills */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Per Person', value: formatCurrency(perPerson, currency) },
              { label: 'Expenses', value: String(expenses.length) },
              { label: 'Unsettled', value: String(debts.length) },
            ].map((stat) => (
              <Card key={stat.label} className="p-4 glass border-white/40 rounded-2xl text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-black mt-1">{stat.value}</p>
              </Card>
            ))}
          </div>

          {/* Category breakdown */}
          {expenses.length > 0 && (
            <Card className="p-5 glass border-white/40 rounded-3xl space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">By Category</p>
              {CATEGORIES.filter((c) => categoryTotals[c.value]).map((c) => {
                const catTotal = categoryTotals[c.value] ?? 0
                const pct = totalSpent > 0 ? (catTotal / totalSpent) * 100 : 0
                return (
                  <div key={c.value} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('h-6 w-6 rounded-lg flex items-center justify-center', c.color)}>
                          <c.icon className="h-3 w-3" />
                        </div>
                        <span className="text-[11px] font-black">{c.label}</span>
                      </div>
                      <span className="text-[11px] font-black">{formatCurrency(catTotal, currency)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/30 dark:bg-slate-700 overflow-hidden">
                      <div className={cn('h-full rounded-full', c.color.replace('bg-', 'bg-').replace('/10', '/60'))} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </Card>
          )}

          {expenses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <div className="h-16 w-16 rounded-3xl premium-gradient text-white flex items-center justify-center mb-4">
                <DollarSign className="h-8 w-8" />
              </div>
              <p className="font-black text-sm uppercase tracking-widest">No expenses yet</p>
              <p className="text-xs font-medium mt-1">Add your first expense to start tracking</p>
            </div>
          )}
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-3">
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <div className="h-16 w-16 rounded-3xl premium-gradient text-white flex items-center justify-center mb-4">
                <DollarSign className="h-8 w-8" />
              </div>
              <p className="font-black text-sm uppercase tracking-widest">No expenses yet</p>
              <button onClick={() => setShowAdd(true)} className="text-xs font-black text-primary mt-2 uppercase tracking-widest">Add one →</button>
            </div>
          ) : (
            expenses.map((e) => (
              <ExpenseCard
                key={e.id}
                expense={e}
                profiles={profiles}
                currentUserId={user?.uid ?? ''}
                isHost={isHost}
                currency={currency}
                tripId={trip.id}
                onEdit={(expense) => setEditingExpense(expense)}
              />
            ))
          )}
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances" className="space-y-3">
          {/* Pending confirmations — shown to payee */}
          {pendingForMe.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 px-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Waiting for your confirmation
              </p>
              {pendingForMe.map((s) => (
                <PendingSettlementCard
                  key={s.id}
                  settlement={s}
                  fromProfile={profiles.find((p) => p.id === s.from)}
                  currency={currency}
                  tripId={trip.id}
                />
              ))}
            </div>
          )}

          {/* All settled */}
          {debts.length === 0 && pendingForMe.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="font-black text-sm uppercase tracking-widest">All settled up!</p>
              <p className="text-xs font-medium text-muted-foreground mt-1">No outstanding balances</p>
            </div>
          )}

          {/* Debts list */}
          {debts.length > 0 && (
            <>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Who owes who</p>
              {debts.map((debt) => {
                const fromProfile = profiles.find((p) => p.id === debt.from)
                const toProfile = profiles.find((p) => p.id === debt.to)
                const key = `${debt.from}-${debt.to}`
                const isDebtor = debt.from === user?.uid
                const isCreditor = debt.to === user?.uid
                const hasPayeeMethods = (toProfile?.paymentMethods?.length ?? 0) > 0
                return (
                  <Card key={key} className={cn('p-4 glass border-white/40 rounded-2xl flex items-center gap-4', isDebtor && 'border-destructive/30 bg-destructive/5')}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {fromProfile && <MiniAvatar profile={fromProfile} size={9} />}
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      {toProfile && <MiniAvatar profile={toProfile} size={9} />}
                      <div className="min-w-0 ml-1">
                        <p className="text-[11px] font-black truncate">
                          {isDebtor ? 'You' : fromProfile?.displayName.split(' ')[0] ?? 'Someone'}
                          {' owes '}
                          {debt.to === user?.uid ? 'you' : toProfile?.displayName.split(' ')[0] ?? 'Someone'}
                        </p>
                        <p className="text-lg font-black text-destructive">{formatCurrency(debt.amount, currency)}</p>
                      </div>
                    </div>
                    {isDebtor && hasPayeeMethods ? (
                      <Button
                        size="sm"
                        onClick={() => setPaymentSheetDebt(debt)}
                        className="shrink-0 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >
                        Pay
                      </Button>
                    ) : (isDebtor || isCreditor) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSettle(debt)}
                        disabled={settlingDebt === key}
                        className="shrink-0 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest border-2"
                      >
                        {settlingDebt === key ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Settled'}
                      </Button>
                    ) : null}
                  </Card>
                )
              })}
            </>
          )}
        </TabsContent>
      </Tabs>

      {user && (
        <AddExpenseDialog
          open={showAdd}
          onClose={() => setShowAdd(false)}
          trip={trip}
          profiles={profiles}
          currentUserId={user.uid}
        />
      )}
      {user && editingExpense && (
        <AddExpenseDialog
          open={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          trip={trip}
          profiles={profiles}
          currentUserId={user.uid}
          initialData={editingExpense}
          mode="edit"
        />
      )}
      {paymentSheetDebt && (() => {
        const toProfile = profiles.find((p) => p.id === paymentSheetDebt.to)
        if (!toProfile) return null
        return (
          <PaymentSheet
            open={!!paymentSheetDebt}
            onClose={() => setPaymentSheetDebt(null)}
            debt={paymentSheetDebt}
            toProfile={toProfile}
            currency={currency}
            tripId={trip.id}
          />
        )
      })()}
    </div>
  )
}
