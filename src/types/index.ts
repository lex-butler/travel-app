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
  homeCity: string | null
  homeLat: number | null
  homeLng: number | null
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
  imageUrl?: string
  imageAttribution?: string | null     // Attribution text required for Unsplash images
  // Structured destination data — populated when user selects via Places autocomplete
  destinationPlaceId?: string | null
  destinationLat?: number | null
  destinationLng?: number | null
  destinationFormattedAddress?: string | null
  // userId → array of selected date ranges, used when dateStatus === 'poll'
  availability: Record<string, Array<{ start: string; end: string }>>
  archived?: boolean
  completed?: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Places Cache ──────────────────────────────────────────────────────────────

export interface PlacesCache {
  place_id: string
  display_name: string
  formatted_address: string
  lat: number
  lng: number
  photo_url: string | null
  cached_at: Timestamp
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
  lat: number | null
  lng: number | null
  comments: Record<string, string>  // userId → comment text
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
  checkIn: string          // ISO date string YYYY-MM-DD
  checkOut: string         // ISO date string YYYY-MM-DD
  totalCost: number
  bookingUrl: string | null
  confirmationNumber: string | null
  imageUrl: string | null
  description: string | null
  previewFetched: boolean
  addedBy: string          // userId who suggested this option
  votingRequired: boolean
  votes: Record<string, boolean>  // userId → true (👍 want this)
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

// ─── Settlements ──────────────────────────────────────────────────────────────

export interface Settlement {
  id: string
  from: string       // userId who pays
  to: string         // userId who receives
  amount: number
  currency: string
  note: string
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

// ─── Packing List ─────────────────────────────────────────────────────────────

export type PackingCategory = 'Clothing' | 'Toiletries' | 'Electronics' | 'Documents' | 'Essentials' | 'Other'

export interface PackingItem {
  id: string
  text: string
  checked: boolean
  category: PackingCategory
  addedBy: string
  createdAt: Timestamp
}
