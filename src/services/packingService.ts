import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { PackingItem } from '@/types'

export function subscribeToPackingItems(
  tripId: string,
  callback: (items: PackingItem[]) => void,
): () => void {
  const q = query(
    collection(db, 'trips', tripId, 'packing_items'),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PackingItem))
  })
}

export async function addPackingItem(
  tripId: string,
  data: { text: string; category: PackingItem['category']; addedBy: string },
): Promise<void> {
  await addDoc(collection(db, 'trips', tripId, 'packing_items'), {
    ...data,
    checked: false,
    createdAt: serverTimestamp(),
  })
}

export async function togglePackingItem(
  tripId: string,
  itemId: string,
  checked: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId, 'packing_items', itemId), { checked })
}

export async function deletePackingItem(tripId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'trips', tripId, 'packing_items', itemId))
}
