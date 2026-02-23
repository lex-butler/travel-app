import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Expense, Settlement } from '@/types'

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function subscribeToExpenses(
  tripId: string,
  callback: (expenses: Expense[]) => void,
): () => void {
  const q = query(
    collection(db, 'trips', tripId, 'expenses'),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense))
  })
}

export function subscribeToSettlements(
  tripId: string,
  callback: (settlements: Settlement[]) => void,
): () => void {
  const q = query(
    collection(db, 'trips', tripId, 'settlements'),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Settlement))
  })
}

// ─── Expense CRUD ─────────────────────────────────────────────────────────────

export async function addExpense(
  tripId: string,
  data: Omit<Expense, 'id' | 'createdAt'>,
): Promise<void> {
  await addDoc(collection(db, 'trips', tripId, 'expenses'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function updateExpense(
  tripId: string,
  expenseId: string,
  data: Partial<Omit<Expense, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId, 'expenses', expenseId), data)
}

export async function deleteExpense(
  tripId: string,
  expenseId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'trips', tripId, 'expenses', expenseId))
}

// ─── Settlement CRUD ──────────────────────────────────────────────────────────

export async function addSettlement(
  tripId: string,
  data: Omit<Settlement, 'id' | 'createdAt'>,
): Promise<void> {
  await addDoc(collection(db, 'trips', tripId, 'settlements'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function deleteSettlement(
  tripId: string,
  settlementId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'trips', tripId, 'settlements', settlementId))
}

// ─── Split helpers ────────────────────────────────────────────────────────────

/** Round to 2 decimal places, with remainder assigned to first uid */
export function calcEqualSplits(
  amount: number,
  uids: string[],
): Record<string, number> {
  if (uids.length === 0) return {}
  const base = Math.floor((amount / uids.length) * 100) / 100
  const remainder = Math.round((amount - base * uids.length) * 100) / 100
  return Object.fromEntries(
    uids.map((uid, i) => [uid, i === 0 ? base + remainder : base]),
  )
}

export function calcPercentageSplits(
  amount: number,
  percentages: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(percentages).map(([uid, pct]) => [
      uid,
      Math.round((amount * pct) / 100 * 100) / 100,
    ]),
  )
}

// ─── Balance calculation ──────────────────────────────────────────────────────

/**
 * Calculate net balances across all expenses and settlements.
 * Positive = this person is owed money.
 * Negative = this person owes money.
 */
export function calcNetBalances(
  expenses: Expense[],
  settlements: Settlement[],
  memberIds: string[],
): Record<string, number> {
  const balances: Record<string, number> = {}
  for (const uid of memberIds) balances[uid] = 0

  for (const expense of expenses) {
    const payer = expense.paidBy
    for (const [uid, share] of Object.entries(expense.splits)) {
      if (uid === payer) continue
      balances[payer] = (balances[payer] ?? 0) + share
      balances[uid] = (balances[uid] ?? 0) - share
    }
  }

  for (const s of settlements) {
    balances[s.from] = (balances[s.from] ?? 0) + s.amount
    balances[s.to] = (balances[s.to] ?? 0) - s.amount
  }

  // Round to avoid floating-point noise
  return Object.fromEntries(
    Object.entries(balances).map(([uid, b]) => [uid, Math.round(b * 100) / 100]),
  )
}

export interface Debt {
  from: string
  to: string
  amount: number
}

/**
 * Greedy debt simplification — returns the minimum set of transactions
 * needed to settle all debts.
 */
export function simplifyDebts(
  balances: Record<string, number>,
  memberIds: string[],
): Debt[] {
  const creditors: Array<{ id: string; amount: number }> = []
  const debtors: Array<{ id: string; amount: number }> = []

  for (const uid of memberIds) {
    const b = balances[uid] ?? 0
    if (b > 0.005) creditors.push({ id: uid, amount: b })
    else if (b < -0.005) debtors.push({ id: uid, amount: -b })
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const debts: Debt[] = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount)
    debts.push({
      from: debtors[i].id,
      to: creditors[j].id,
      amount: Math.round(amount * 100) / 100,
    })
    debtors[i].amount -= amount
    creditors[j].amount -= amount
    if (debtors[i].amount < 0.005) i++
    if (creditors[j].amount < 0.005) j++
  }

  return debts
}
