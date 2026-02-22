import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'

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
