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
import type { Accommodation } from '@/types'

// ─── Subscription ─────────────────────────────────────────────────────────────

export function subscribeToAccommodations(
  tripId: string,
  callback: (accommodations: Accommodation[]) => void,
): () => void {
  const q = query(
    collection(db, 'trips', tripId, 'accommodations'),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Accommodation))
  })
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function addAccommodation(
  tripId: string,
  userId: string,
  data: Omit<Accommodation, 'id' | 'createdAt' | 'updatedAt' | 'votes' | 'status' | 'addedBy'>,
): Promise<void> {
  await addDoc(collection(db, 'trips', tripId, 'accommodations'), {
    ...data,
    addedBy: userId,
    votes: {},
    status: 'voting',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateAccommodation(
  tripId: string,
  accomId: string,
  data: Partial<Omit<Accommodation, 'id' | 'createdAt' | 'addedBy'>>,
): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId, 'accommodations', accomId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteAccommodation(
  tripId: string,
  accomId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'trips', tripId, 'accommodations', accomId))
}

// ─── Voting ───────────────────────────────────────────────────────────────────

export async function castAccomVote(
  tripId: string,
  accomId: string,
  userId: string,
): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId, 'accommodations', accomId), {
    [`votes.${userId}`]: true,
    updatedAt: serverTimestamp(),
  })
}

export async function removeAccomVote(
  tripId: string,
  accomId: string,
  userId: string,
): Promise<void> {
  const { deleteField } = await import('firebase/firestore')
  await updateDoc(doc(db, 'trips', tripId, 'accommodations', accomId), {
    [`votes.${userId}`]: deleteField(),
    updatedAt: serverTimestamp(),
  })
}

// ─── Status ───────────────────────────────────────────────────────────────────

export async function approveAccommodation(
  tripId: string,
  accomId: string,
): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId, 'accommodations', accomId), {
    status: 'approved',
    updatedAt: serverTimestamp(),
  })
}

export async function rejectAccommodation(
  tripId: string,
  accomId: string,
): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId, 'accommodations', accomId), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  })
}
