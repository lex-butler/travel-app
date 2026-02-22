import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Destination } from '@/types'

// ─── Real-time subscription ───────────────────────────────────────────────────

export function subscribeToDestinations(
  tripId: string,
  callback: (destinations: Destination[]) => void,
): () => void {
  const q = query(
    collection(db, 'trips', tripId, 'destinations'),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Destination))
  })
}

// ─── Add ─────────────────────────────────────────────────────────────────────

export async function addDestination(
  tripId: string,
  userId: string,
  name: string,
  lat?: number,
  lng?: number,
): Promise<void> {
  await addDoc(collection(db, 'trips', tripId, 'destinations'), {
    name: name.trim(),
    googlePlaceId: null,
    description: '',
    addedBy: userId,
    votes: {},
    status: 'voting',
    lat: lat ?? null,
    lng: lng ?? null,
    comments: {},
    createdAt: serverTimestamp(),
  })
}

// ─── Vote ─────────────────────────────────────────────────────────────────────

export async function castVote(
  tripId: string,
  destId: string,
  userId: string,
  vote: 1 | 2 | 3,
): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId, 'destinations', destId), {
    [`votes.${userId}`]: vote,
  })
}

export async function removeVote(
  tripId: string,
  destId: string,
  userId: string,
): Promise<void> {
  // Firestore deleteField via dynamic key requires FieldValue import
  const { deleteField } = await import('firebase/firestore')
  await updateDoc(doc(db, 'trips', tripId, 'destinations', destId), {
    [`votes.${userId}`]: deleteField(),
  })
}

// ─── Comment ──────────────────────────────────────────────────────────────────

export async function updateComment(
  tripId: string,
  destId: string,
  userId: string,
  text: string,
): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId, 'destinations', destId), {
    [`comments.${userId}`]: text,
  })
}

// ─── Lock ─────────────────────────────────────────────────────────────────────

export async function lockDestination(
  tripId: string,
  destId: string,
  name: string,
): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, 'trips', tripId), {
      destination: name,
      destinationStatus: 'decided',
      updatedAt: serverTimestamp(),
    }),
    updateDoc(doc(db, 'trips', tripId, 'destinations', destId), {
      status: 'finalized',
    }),
  ])
}
