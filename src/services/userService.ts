import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { PaymentMethod } from '@/types'

export async function updateUserHomeCity(
  userId: string,
  city: string,
  lat: number,
  lng: number,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    homeCity: city,
    homeLat: lat,
    homeLng: lng,
  })
}

export async function updatePaymentMethods(
  userId: string,
  methods: PaymentMethod[],
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { paymentMethods: methods })
}

export async function getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return []
  return (snap.data().paymentMethods as PaymentMethod[]) ?? []
}
