import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Backpack, Plus, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  subscribeToPackingItems, addPackingItem, togglePackingItem, deletePackingItem,
} from '@/services/packingService'
import { useAuthStore } from '@/stores/authStore'
import type { PackingItem, PackingCategory } from '@/types'

// ─── Category config ───────────────────────────────────────────────────────────

const CATEGORIES: { value: PackingCategory; emoji: string; color: string }[] = [
  { value: 'Clothing',    emoji: '👕', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { value: 'Toiletries',  emoji: '🧴', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  { value: 'Electronics', emoji: '🔌', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { value: 'Documents',   emoji: '📄', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { value: 'Essentials',  emoji: '🎒', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  { value: 'Other',       emoji: '📦', color: 'bg-slate-500/10 text-slate-500' },
]

function getCategoryConfig(cat: PackingCategory) {
  return CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[5]
}

// ─── Category group ────────────────────────────────────────────────────────────

function CategoryGroup({
  category, items, tripId,
}: {
  category: PackingCategory
  items: PackingItem[]
  tripId: string
}) {
  const [collapsed, setCollapsed] = useState(false)
  const config = getCategoryConfig(category)
  const checkedCount = items.filter((i) => i.checked).length

  async function handleToggle(item: PackingItem) {
    await togglePackingItem(tripId, item.id, !item.checked)
  }

  async function handleDelete(item: PackingItem, e: React.MouseEvent) {
    e.stopPropagation()
    await deletePackingItem(tripId, item.id)
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 px-1 py-1 group"
      >
        <span className={cn('text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full', config.color)}>
          {config.emoji} {category}
        </span>
        <span className="text-[10px] text-muted-foreground font-bold">
          {checkedCount}/{items.length}
        </span>
        <div className="flex-1 h-px bg-white/20" />
        {collapsed
          ? <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
          : <ChevronUp className="h-3 w-3 text-muted-foreground/50" />}
      </button>

      {!collapsed && (
        <div className="space-y-1.5 pl-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 glass border border-white/30 rounded-xl px-4 py-2.5 group/item cursor-pointer hover:bg-white/40 transition-colors"
              onClick={() => handleToggle(item)}
            >
              {/* Custom checkbox */}
              <div className={cn(
                'h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                item.checked
                  ? 'border-emerald-500 bg-emerald-500'
                  : 'border-muted-foreground/30'
              )}>
                {item.checked && (
                  <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className={cn(
                'flex-1 text-sm font-bold transition-all',
                item.checked ? 'line-through text-muted-foreground/50' : 'text-foreground'
              )}>
                {item.text}
              </span>
              <button
                onClick={(e) => handleDelete(item, e)}
                className="opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PackingListPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const user = useAuthStore((s) => s.user)
  const [items, setItems] = useState<PackingItem[]>([])
  const [text, setText] = useState('')
  const [category, setCategory] = useState<PackingCategory>('Essentials')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!tripId) return
    return subscribeToPackingItems(tripId, setItems)
  }, [tripId])

  async function handleAdd() {
    if (!tripId || !user || !text.trim()) return
    setAdding(true)
    try {
      await addPackingItem(tripId, { text: text.trim(), category, addedBy: user.uid })
      setText('')
      inputRef.current?.focus()
    } finally {
      setAdding(false)
    }
  }

  // Group items by category, maintaining category order
  const grouped = CATEGORIES.reduce<Record<PackingCategory, PackingItem[]>>(
    (acc, c) => { acc[c.value] = items.filter((i) => i.category === c.value); return acc },
    {} as Record<PackingCategory, PackingItem[]>,
  )

  const total = items.length
  const checked = items.filter((i) => i.checked).length
  const progress = total > 0 ? (checked / total) * 100 : 0

  return (
    <div className="pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Backpack className="h-6 w-6 text-primary" />
          Packing List
        </h1>
        {total > 0 && (
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {checked} / {total} packed
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-2 rounded-full bg-white/30 dark:bg-slate-700 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              progress === 100 ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-primary'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Add item */}
      <Card className="p-5 glass border-white/40 rounded-3xl space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Add Item</p>

        {/* Category picker */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black border-2 transition-all',
                category === c.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-white/30 bg-white/30 dark:bg-white/5 text-muted-foreground'
              )}
            >
              {c.emoji} {c.value}
            </button>
          ))}
        </div>

        {/* Text input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={`e.g. ${category === 'Clothing' ? 'Waterproof jacket' : category === 'Documents' ? 'Passport' : category === 'Electronics' ? 'Phone charger' : 'Sunscreen'}`}
            className="rounded-xl h-11 flex-1"
          />
          <Button
            onClick={handleAdd}
            disabled={adding || !text.trim()}
            className="rounded-xl h-11 px-4 font-black"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </Card>

      {/* Items by category */}
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-40 text-center">
          <div className="h-16 w-16 rounded-3xl premium-gradient text-white flex items-center justify-center mb-4">
            <Backpack className="h-8 w-8" />
          </div>
          <p className="font-black text-sm uppercase tracking-widest">Nothing packed yet</p>
          <p className="text-xs font-medium mt-1">Add your first item above to get started</p>
        </div>
      ) : (
        <div className="space-y-5">
          {CATEGORIES.map((c) =>
            grouped[c.value].length > 0 ? (
              <CategoryGroup
                key={c.value}
                category={c.value}
                items={grouped[c.value]}
                tripId={tripId!}
              />
            ) : null
          )}
        </div>
      )}

      {/* All packed celebration */}
      {total > 0 && checked === total && (
        <div className="text-center py-6 animate-fade-in">
          <p className="text-2xl font-black text-emerald-500">All packed! ✈️</p>
          <p className="text-xs text-muted-foreground mt-1">You're ready to go</p>
        </div>
      )}

      {/* Future AI placeholder */}
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-white/30 px-5 py-4 opacity-50">
        <span className="text-lg">✨</span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest">AI Packing Suggestions</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Weather & destination-aware recommendations — coming soon</p>
        </div>
      </div>
    </div>
  )
}
