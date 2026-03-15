// Utility functions for the application

import { TIER_HIERARCHY, GENDER_MAP, RELATIONSHIP_MAP } from './constants'

// Time formatting utilities
export const formatTimeAgo = (timestamp: string | Date): string => {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'เมื่อสักครู่'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`
  return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`
}

// REMOVED: canCreatePrivateChat - Chat functionality removed

export const canViewProfile = (currentUserTier: string, targetUserTier: string): boolean => {
  const currentLevel = (TIER_HIERARCHY as any)[currentUserTier] || 0
  const targetLevel = (TIER_HIERARCHY as any)[targetUserTier] || 0
  
  console.log('🔍 canViewProfile check:', { 
    currentUserTier, 
    targetUserTier, 
    currentLevel, 
    targetLevel, 
    canView: currentLevel >= targetLevel,
    rule: 'Role ที่สูงกว่าสามารถดูโปรไฟล์ของ Role ที่ต่ำกว่าได้เสมอ'
  })
  
  return currentLevel >= targetLevel
}

// Data formatting utilities
export const safeDisplay = (data: any): string => {
  if (data === null || data === undefined) return ''
  if (typeof data === 'string' || typeof data === 'number') return String(data)
  if (typeof data === 'object') {
    // Handle specific object types
    if (data.level !== undefined) {
      return data.level || 'ไม่ระบุ'
    }
    if (data.category) {
      return data.category
    }
    if (data.name) {
      return data.name
    }
    // For other objects, try to find a meaningful value
    if (data.value) return data.value
    if (data.text) return data.text
    if (data.label) return data.label
    // If no meaningful value found, return empty string
    return ''
  }
  return String(data)
}

export const formatInterests = (interests: any[]): string[] => {
  if (!interests || !Array.isArray(interests)) return []
  
  return interests.map(interest => {
    if (typeof interest === 'string') return interest
    if (typeof interest === 'object' && interest.category) {
      return interest.category
    }
    return String(interest)
  }).filter(Boolean)
}

// Translation utilities
export const translateGender = (gender: string): string => {
  return GENDER_MAP[gender?.toLowerCase()] || gender || 'ยังไม่ระบุ'
}

export const translateRelationship = (relationship: string): string => {
  return RELATIONSHIP_MAP[relationship?.toLowerCase()] || relationship || 'ยังไม่ระบุ'
}

// Chat utilities
export const removeDuplicateChatsFromArray = (chats: any[]): any[] => {
  const uniqueChats = chats.filter(chat => {
    // ตรวจสอบว่ามี chat.id หรือไม่
    if (!chat.id) return false
    
    // ตรวจสอบความซ้ำซ้อนโดยใช้ chat.id
    const isDuplicate = chats.findIndex(c => c.id === chat.id) !== chats.indexOf(chat)
    
    return !isDuplicate
  })
  
  return uniqueChats
}

export const removeDuplicateMessages = (messages: any[]): any[] => {
  return messages.filter((msg: any, index: number, arr: any[]) => {
    // ตรวจสอบความซ้ำซ้อนโดยใช้ _id และ content
    const duplicateByContent = arr.findIndex(m => {
      return m._id === msg._id || 
             (m.content === msg.content && 
              m.senderId === msg.senderId && 
              Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 1000)
    })
    
    return duplicateByContent === index
  })
}

// Socket utilities
export const isSocketReady = (): boolean => {
  const socket = (window as any).socket
  return socket && socket.connected
}

// REMOVED: saveChatsToStorage and loadChatsFromStorage - Chat functionality removed

// User object creation utilities
export const createUserObject = (profileData: any): any => {
  return {
    _id: profileData._id || profileData.id,
    displayName: profileData.displayName || profileData.name || `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim(),
    firstName: profileData.firstName,
    lastName: profileData.lastName,
    profileImages: profileData.profileImages || profileData.images || [],
    age: profileData.age,
    location: profileData.location,
    bio: profileData.bio,
    interests: profileData.interests || [],
    membership: profileData.membership,
    gender: profileData.gender,
    online: profileData.online,
    lastActive: profileData.lastActive
  }
}

// REMOVED: findExistingChat - Chat functionality removed

// Notification utilities
export const showWebappNotification = (
  message: string, 
  type: 'warning' | 'error' | 'success' = 'warning',
  notificationHistory: Set<string>
): void => {
  const notificationKey = `${message}_${type}_${Date.now()}`
  
  // ตรวจสอบว่าแสดง notification นี้ไปแล้วหรือยัง
  if (notificationHistory.has(notificationKey)) {
    return
  }
  
  // เพิ่ม notification ใหม่
  notificationHistory.add(notificationKey)
  
  // ลบ notification เก่าที่เกิน 10 รายการ
  if (notificationHistory.size > 10) {
    const oldest = Array.from(notificationHistory).sort()[0]
    notificationHistory.delete(oldest)
  }
  
  // แสดง notification
  console.log(`🔔 ${type.toUpperCase()}: ${message}`)
}

// API utilities
export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token')
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

export const handleApiError = (error: any, defaultMessage: string = 'เกิดข้อผิดพลาด'): string => {
  console.error('API Error:', error)
  
  if (error.message) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  return defaultMessage
}

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9]{10}$/
  return phoneRegex.test(phone.replace(/\D/g, ''))
}

// String utilities
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export const capitalizeFirst = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Array utilities
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const getRandomItems = <T>(array: T[], count: number): T[] => {
  const shuffled = shuffleArray(array)
  return shuffled.slice(0, count)
}
