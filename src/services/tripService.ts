import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Trip } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateTripInput {
  name: string
  destination: string | null
  destinationStatus: Trip['destinationStatus']
  dates: string | null
  dateStatus: Trip['dateStatus']
  tripType: Trip['tripType']
  estimatedSize: number | null
  ownerId: string
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createTrip(input: CreateTripInput): Promise<string> {
  const ref = await addDoc(collection(db, 'trips'), {
    name: input.name,
    destination: input.destination,
    destinationStatus: input.destinationStatus,
    dates: input.dates,
    dateStatus: input.dateStatus,
    tripType: input.tripType,
    estimatedSize: input.estimatedSize,
    ownerId: input.ownerId,
    coLeadIds: [],
    memberIds: [input.ownerId],
    phase: 'planning',
    budget: null,
    currency: 'USD',
    availability: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

// ─── Update availability ──────────────────────────────────────────────────────

export interface DateRange {
  start: string  // ISO date string e.g. '2025-06-01'
  end: string    // ISO date string e.g. '2025-06-15'
}

export async function updateMyAvailability(
  tripId: string,
  userId: string,
  ranges: DateRange[],
): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId), {
    [`availability.${userId}`]: ranges,
    updatedAt: serverTimestamp(),
  })
}

// ─── User profiles ────────────────────────────────────────────────────────────

export interface MemberProfile {
  id: string
  displayName: string
  photoURL: string | null
  email: string
}

export async function getUserProfiles(userIds: string[]): Promise<MemberProfile[]> {
  if (userIds.length === 0) return []
  const snaps = await Promise.all(userIds.map((id) => getDoc(doc(db, 'users', id))))
  return snaps
    .filter((s) => s.exists())
    .map((s) => ({ id: s.id, ...(s.data() as Omit<MemberProfile, 'id'>) }))
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getUserTrips(userId: string): Promise<Trip[]> {
  const q = query(
    collection(db, 'trips'),
    where('memberIds', 'array-contains', userId),
    orderBy('updatedAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Trip)
}

export async function getTripById(tripId: string): Promise<Trip | null> {
  const snap = await getDoc(doc(db, 'trips', tripId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Trip
}

// ─── Real-time subscription ───────────────────────────────────────────────────

export function subscribeToTrip(
  tripId: string,
  callback: (trip: Trip | null) => void,
): () => void {
  return onSnapshot(doc(db, 'trips', tripId), (snap) => {
    if (!snap.exists()) {
      callback(null)
      return
    }
    callback({ id: snap.id, ...snap.data() } as Trip)
  })
}
