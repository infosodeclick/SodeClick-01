// Type definitions for the application

export type PublicUser = {
  _id?: string
  firstName?: string
  lastName?: string
  nickname?: string
  age?: number
  location?: string
  profileImages?: string[]
  bio?: string
  interests?: any[]
  membership?: { tier?: string }
  gender?: string
  totalVotes?: number
  uniqueVoterCount?: number
  displayName?: string
  username?: string
  isBlurred?: boolean
  likeCount?: number
  mainProfileImageIndex?: number
}

export type FeaturedProfile = {
  id?: string | number
  name: string
  age?: number
  location?: string
  distance?: string
  bio?: string
  interests: string[]
  images: string[]
  verified?: boolean
  online?: boolean
  lastActive?: string
  height?: string
  education?: string
  job?: string
  lifestyle?: string
  lookingFor?: string
  languages?: string[]
  personality?: string
  membershipTier?: string
  membership?: { tier?: string }
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  occupation?: string
  weight?: string
  relationshipStatus?: string
}

export type PaymentState = {
  planId: string
  planName: string
  amount: number
  currency: string
  description: string
  targetUserId?: string
  imageId?: string
  targetUserName?: string
  currentCoins?: number
}

export type FilterState = {
  ageRange: [number, number]
  location: string
  interests: string[]
  gender: string
  membershipTier: string
  lookingFor?: string
  province?: string
  ageMin?: number
  ageMax?: number
  relationship?: string
  otherRelationship?: string
  distanceKm?: number
  lat?: number
  lng?: number
}

export type TabType = 'discover' | 'matches' | 'messages' | 'stream' | 'ranking' | 'membership' | 'profile' | 'payment'

export type ChatViewType = 'list' | 'chat'

export type ChatType = 'public' | 'private' | 'quick'

export type ViewType = 'main' | 'payment' | 'success'

export type ModalActionType = 'chat' | 'like' | 'profile' | null

export type AlertType = 'error' | 'warning' | 'success'

export type ProfileAlert = {
  message: string
  type: AlertType
}

export type PaymentDetails = {
  planId: string
  planName: string
  amount: number
  currency: string
  description: string
}

export type Filters = {
  ageRange: [number, number]
  location: string
  interests: string[]
  gender: string
  membershipTier: string
}

export type Notification = {
  _id: string
  type: string
  message: string
  recipientId: string
  createdAt: string
  read: boolean
}
