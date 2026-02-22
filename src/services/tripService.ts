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
  // Initial availability note from the trip creator (when dateStatus === 'poll')
  availability?: Record<string, string>
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
    availability: input.availability ?? {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

// ─── Update availability ──────────────────────────────────────────────────────

export async function updateMyAvailability(
  tripId: string,
  userId: string,
  dates: string,
): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId), {
    [`availability.${userId}`]: dates,
    updatedAt: serverTimestamp(),
  })
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
