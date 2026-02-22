import type { Timestamp } from 'firebase/firestore'

// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  displayName: string
  photoURL: string | null
  createdAt: Timestamp
  lastActive: Timestamp
  pushNotificationsEnabled: boolean
  emailNotificationsEnabled: boolean
  fcmToken: string | null
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export type TripPhase = 'planning' | 'booking' | 'finalized'
export type TripType = 'solo' | 'group'
export type DestinationStatus = 'decided' | 'tbd'
export type DateStatus = 'decided' | 'poll' | 'flexible'

export interface Trip {
  id: string
  name: string
  destination: string | null
  destinationStatus: DestinationStatus
  dates: string | null
  dateStatus: DateStatus
  tripType: TripType
  estimatedSize: number | null
  ownerId: string
  coLeadIds: string[]
  memberIds: string[]
  phase: TripPhase
  budget: number | null
  currency: string
  // userId → array of selected date ranges, used when dateStatus === 'poll'
  availability: Record<string, Array<{ start: string; end: string }>>
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Destinations ─────────────────────────────────────────────────────────────

export interface Destination {
  id: string
  name: string
  googlePlaceId: string | null
  description: string
  addedBy: string
  votes: Record<string, 1 | 2 | 3>
  status: 'voting' | 'finalized'
  createdAt: Timestamp
}

// ─── Date Options ─────────────────────────────────────────────────────────────

export interface DateOption {
  id: string
  startDate: Timestamp
  endDate: Timestamp
  availability: Record<string, boolean>
  votes: Record<string, boolean>
  status: 'polling' | 'voting' | 'finalized'
  createdAt: Timestamp
}

// ─── Places ───────────────────────────────────────────────────────────────────

export interface Place {
  id: string
  googlePlaceId: string
  name: string
  address: string
  lat: number
  lng: number
  photoUrl: string | null
  rating: number | null
  priceLevel: number | null
  hours: string | null
  website: string | null
  dayNumber: number
  order: number
  notes: string
  addedBy: string
  createdAt: Timestamp
}

// ─── Activities ───────────────────────────────────────────────────────────────

export type ActivityStatus = 'in' | 'out' | 'maybe'

export interface Activity {
  id: string
  placeId: string
  name: string
  startTime: string | null
  duration: number | null
  cost: number | null
  costPer: 'person' | 'group'
  participants: Record<string, ActivityStatus>
  notes: string
  dayNumber: number
  createdAt: Timestamp
}

// ─── Accommodations ───────────────────────────────────────────────────────────

export type AccommodationType = 'hotel' | 'airbnb' | 'vrbo' | 'hostel' | 'other'
export type VoteStatus = 'voting' | 'approved' | 'rejected'

export interface Accommodation {
  id: string
  name: string
  type: AccommodationType
  address: string
  checkIn: Timestamp
  checkOut: Timestamp
  totalCost: number
  bookingUrl: string | null
  confirmationNumber: string | null
  imageUrl: string | null
  description: string | null
  previewFetched: boolean
  votingRequired: boolean
  votes: Record<string, boolean>
  status: VoteStatus
  approvalThreshold: number
  splitAmong: string[]
  notes: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Transportation ───────────────────────────────────────────────────────────

export type TransportType = 'flight' | 'rental-car' | 'shuttle' | 'train' | 'other'
export type TransportStatus = 'voting' | 'approved' | 'booked'

export interface Transportation {
  id: string
  type: TransportType
  isShared: boolean
  name: string
  departureTime: Timestamp | null
  arrivalTime: Timestamp | null
  from: string
  to: string
  cost: number
  userId: string | null
  splitAmong: string[]
  votingRequired: boolean
  votes: Record<string, boolean>
  status: TransportStatus
  confirmationNumber: string | null
  notes: string
  createdAt: Timestamp
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export type ExpenseCategory = 'accommodation' | 'transport' | 'food' | 'activity' | 'other'
export type SplitMethod = 'equal' | 'custom' | 'percentage'

export interface Expense {
  id: string
  description: string
  amount: number
  currency: string
  category: ExpenseCategory
  paidBy: string
  splitAmong: string[]
  splitMethod: SplitMethod
  splits: Record<string, number>
  paidStatus: Record<string, boolean>
  date: Timestamp
  notes: string
  createdAt: Timestamp
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export type CommentContextType = 'trip' | 'activity' | 'place' | 'expense' | null

export interface Comment {
  id: string
  userId: string
  text: string
  mentions: string[]
  contextType: CommentContextType
  contextId: string | null
  createdAt: Timestamp
  editedAt: Timestamp | null
  isResolved: boolean
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = 'mention' | 'vote_deadline' | 'payment_due' | 'trip_update'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  triggeredBy: string
  commentId: string | null
  contextType: string | null
  contextId: string | null
  message: string
  read: boolean
  createdAt: Timestamp
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export type InviteRole = 'member' | 'co-lead'
export type InviteStatus = 'pending' | 'accepted' | 'declined'

export interface Invite {
  id: string
  email: string
  role: InviteRole
  invitedBy: string
  status: InviteStatus
  token: string
  expiresAt: Timestamp
  createdAt: Timestamp
}
