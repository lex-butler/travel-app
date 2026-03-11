import {
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'

const googleProvider = new GoogleAuthProvider()

// Upsert the user document in Firestore after any sign-in
async function upsertUserDoc(uid: string, data: { email: string; displayName: string; photoURL: string | null }) {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    await setDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      pushNotificationsEnabled: false,
      emailNotificationsEnabled: true,
      fcmToken: null,
    })
  } else {
    await setDoc(ref, { lastActive: serverTimestamp(), ...data }, { merge: true })
  }
}

// Sign in with Google via popup (works on all platforms including iOS Safari 14.5+).
// Popup is more reliable than redirect on iOS because Safari's ITP can clear
// the IndexedDB credential store between a redirect and return, silently
// breaking getRedirectResult().
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  const { uid, email, displayName, photoURL } = result.user
  await upsertUserDoc(uid, {
    email: email ?? '',
    displayName: displayName ?? 'Traveler',
    photoURL,
  })
  return result.user
}

// No-op: kept for any in-flight redirect sessions from before the popup migration.
export async function handleGoogleRedirectResult() {
  const result = await getRedirectResult(auth)
  if (result) {
    const { uid, email, displayName, photoURL } = result.user
    await upsertUserDoc(uid, {
      email: email ?? '',
      displayName: displayName ?? 'Traveler',
      photoURL,
    })
  }
}

export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(result.user, { displayName })
  await upsertUserDoc(result.user.uid, { email, displayName, photoURL: null })
  return result.user
}

export async function signOut() {
  await firebaseSignOut(auth)
}
