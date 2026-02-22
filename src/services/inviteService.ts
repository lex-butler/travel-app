import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Trip } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

// Trip snapshot stored inside the invite so recipients can view it without auth
export interface InviteTripSnapshot {
  name: string
  destination: string | null
  destinationStatus: Trip['destinationStatus']
  dates: string | null
  dateStatus: Trip['dateStatus']
  memberCount: number
}

export interface InviteData {
  id: string
  tripId: string
  trip: InviteTripSnapshot
  invitedBy: string
  invitedByName: string
  role: 'member' | 'co-lead'
  status: 'pending' | 'accepted' | 'declined'
  expiresAt: Timestamp
  createdAt: Timestamp
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createInviteLink(
  trip: Trip,
  invitedBy: string,
  invitedByName: string,
): Promise<string> {
  const token = crypto.randomUUID()
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 days

  const tripSnapshot: InviteTripSnapshot = {
    name: trip.name,
    destination: trip.destination,
    destinationStatus: trip.destinationStatus,
    dates: trip.dates,
    dateStatus: trip.dateStatus,
    memberCount: trip.memberIds.length,
  }

  await setDoc(doc(db, 'invites', token), {
    tripId: trip.id,
    trip: tripSnapshot,
    invitedBy,
    invitedByName,
    role: 'member',
    status: 'pending',
    expiresAt,
    createdAt: serverTimestamp(),
  })

  return token
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getInviteByToken(token: string): Promise<InviteData | null> {
  const snap = await getDoc(doc(db, 'invites', token))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as InviteData
}

// ─── Accept ───────────────────────────────────────────────────────────────────

export async function acceptInvite(token: string, userId: string): Promise<string> {
  const invite = await getInviteByToken(token)
  if (!invite) throw new Error('Invite not found')
  if (invite.invitedBy === userId) throw new Error('You cannot accept your own invite.')
  if (invite.status !== 'pending') throw new Error('This invite has already been used.')

  const now = Timestamp.now()
  if (now.seconds > invite.expiresAt.seconds) throw new Error('This invite has expired.')

  await Promise.all([
    updateDoc(doc(db, 'trips', invite.tripId), {
      memberIds: arrayUnion(userId),
    }),
    updateDoc(doc(db, 'invites', token), {
      status: 'accepted',
    }),
  ])

  return invite.tripId
}
