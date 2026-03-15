// Constants for the application

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export const PREMIUM_TIER_ORDER = ['platinum', 'diamond']

export const TIER_HIERARCHY = {
  'free': 0,
  'basic': 1,
  'premium': 2,
  'gold': 3,
  'platinum': 4,
  'diamond': 5
}

export const GENDER_MAP: { [key: string]: string } = {
  'male': 'ชาย',
  'female': 'หญิง',
  'other': 'อื่นๆ',
  'prefer_not_to_say': 'ไม่ระบุ'
}

export const RELATIONSHIP_MAP: { [key: string]: string } = {
  'single': 'โสด',
  'in_relationship': 'มีแฟน',
  'married': 'แต่งงานแล้ว',
  'divorced': 'หย่าร้าง',
  'widowed': 'หม้าย',
  'separated': 'แยกกันอยู่',
  'complicated': 'ซับซ้อน',
  'open_relationship': 'ความสัมพันธ์แบบเปิด',
  'polyamorous': 'หลายคน',
  'prefer_not_to_say': 'ไม่ระบุ'
}

export const INTEREST_ICONS: { [key: string]: string } = {
  'music': '🎵',
  'travel': '✈️',
  'food': '🍕',
  'sports': '⚽',
  'art': '🎨',
  'technology': '💻',
  'fashion': '👗',
  'photography': '📸',
  'reading': '📚',
  'movies': '🎬',
  'gaming': '🎮',
  'fitness': '💪',
  'cooking': '👨‍🍳',
  'dancing': '💃',
  'nature': '🌿',
  'animals': '🐕',
  'cars': '🚗',
  'books': '📖',
  'coffee': '☕',
  'wine': '🍷'
}

export const DEFAULT_FILTERS = {
  ageRange: [18, 65] as [number, number],
  location: '',
  interests: [] as string[],
  gender: '',
  membershipTier: ''
}

export const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  LIKE: 'like',
  MATCH: 'match',
  SYSTEM: 'system',
  MEMBERSHIP: 'membership',
  PAYMENT: 'payment'
}

export const CHAT_TYPES = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  QUICK: 'quick'
} as const

export const VIEW_TYPES = {
  MAIN: 'main',
  PAYMENT: 'payment',
  SUCCESS: 'success'
} as const

export const TAB_TYPES = {
  DISCOVER: 'discover',
  MATCHES: 'matches',
  MESSAGES: 'messages',
  STREAM: 'stream',
  RANKING: 'ranking',
  MEMBERSHIP: 'membership',
  PROFILE: 'profile',
  PAYMENT: 'payment'
} as const

export const MODAL_ACTIONS = {
  CHAT: 'chat',
  LIKE: 'like',
  PROFILE: 'profile',
  NULL: null
} as const

export const ALERT_TYPES = {
  ERROR: 'error',
  WARNING: 'warning',
  SUCCESS: 'success'
} as const

export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  USERS_PER_PAGE: 12,
  NOTIFICATIONS_LIMIT: 20
}

export const TIMEOUTS = {
  NOTIFICATION_FETCH: 30000,
  SOCKET_RECONNECT: 5000,
  CHAT_COUNTDOWN: 3000,
  REFRESH_DELAY: 100
}

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  LIKED_USERS: 'likedUsers',
  // REMOVED: PRIVATE_CHATS - Private Chat functionality removed
  BYPASS_MAINTENANCE: 'bypassMaintenance'
}

export const ELEMENT_IDS = {
  BENEFITS_COMPARISON_TABLE: 'benefits-comparison-table',
  MEMBERSHIP_COMPARISON: 'membership-comparison',
  MEMBERSHIP_CONTENT: 'membership-content',
  MATCHES_CONTENT: 'matches-content',
  TAB_NAVIGATION: '[role="tablist"]'
}
