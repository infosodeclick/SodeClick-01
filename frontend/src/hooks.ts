// Custom hooks for the application

import { useState, useEffect, useCallback } from 'react'
import { API_BASE_URL } from './constants'
import type { PaymentState, FilterState } from './types'

// Hook for managing notifications
export const useNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      return
    }
    
    try {
      setIsLoadingNotifications(true)
      const token = localStorage.getItem('token')
      
      const url = `${API_BASE_URL}/api/notifications/${userId}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('❌ Expected JSON but got:', contentType, text.substring(0, 200))
        throw new Error(`Expected JSON response but got ${contentType}`)
      }
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          const fetchedNotifications = data.data.notifications || []
          const fetchedUnreadCount = data.data.unreadCount || 0
          
          setNotifications(prev => {
            // Merge notifications: รวม notifications จาก API กับ notifications ที่มีอยู่แล้ว
            const notificationMap = new Map()
            
            // เพิ่ม notifications ที่มีอยู่แล้วก่อน (prioritize real-time notifications)
            prev.forEach(n => {
              const key = n._id || `${n.type}_${n.createdAt}_${n.recipientId}`
              notificationMap.set(key, n)
            })
            
            // เพิ่ม notifications จาก API (จะไม่ overwrite ถ้ามีอยู่แล้ว)
            fetchedNotifications.forEach(n => {
              const key = n._id || `${n.type}_${n.createdAt}_${n.recipientId}`
              if (!notificationMap.has(key)) {
                notificationMap.set(key, n)
              }
            })
            
            // แปลงกลับเป็น array และเรียงตาม createdAt (ใหม่สุดก่อน)
            const mergedNotifications = Array.from(notificationMap.values()).sort((a, b) => {
              const timeA = new Date(a.createdAt || a.created_at || 0).getTime()
              const timeB = new Date(b.createdAt || b.created_at || 0).getTime()
              return timeB - timeA
            })
            
            // ตรวจสอบว่า notifications เปลี่ยนจริงหรือไม่
            if (JSON.stringify(prev) === JSON.stringify(mergedNotifications)) {
              return prev
            }
            
            return mergedNotifications
          })
          
          // อัปเดต unread count จาก merged notifications
          setNotifications(current => {
            const actualUnreadCount = current.filter(n => !n.isRead).length
            setUnreadCount(prev => prev === actualUnreadCount ? prev : actualUnreadCount)
            return current
          })
        } else {
          console.error('❌ API returned success: false:', data.message)
          setNotifications(prev => prev.length === 0 ? prev : [])
          setUnreadCount(prev => prev === 0 ? prev : 0)
        }
      } else {
        console.error('❌ Notifications API error:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error)
    } finally {
      setIsLoadingNotifications(false)
    }
  }, [userId])

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!userId) return
    
    // Get all unread notification IDs
    const unreadNotifications = notifications.filter(n => !n.isRead)
    if (unreadNotifications.length === 0) {
      // No unread notifications, just update local state
      setUnreadCount(0)
      return
    }
    
    const notificationIds = unreadNotifications.map(n => n._id)
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/api/notifications/${userId}/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          notificationIds: notificationIds
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Update local state - mark all notifications as read
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
          setUnreadCount(0)
        }
      } else {
        console.error('❌ Failed to mark notifications as read:', response.status)
      }
    } catch (error) {
      console.error('❌ Error marking notifications as read:', error)
    }
  }, [userId, notifications])

  const clearAllNotifications = useCallback(async () => {
    if (!userId) return
    
    try {
      setIsLoadingNotifications(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/api/notifications/${userId}/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Clear local state
          setNotifications([])
          setUnreadCount(0)
          // Refresh notifications to ensure consistency with backend
          await fetchNotifications()
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to clear notifications' }))
        console.error('❌ Failed to clear notifications:', errorData.message)
      }
    } catch (error) {
      console.error('❌ Error clearing notifications:', error)
    } finally {
      setIsLoadingNotifications(false)
    }
  }, [userId, fetchNotifications])

  return {
    notifications,
    setNotifications,
    unreadCount,
    setUnreadCount,
    isLoadingNotifications,
    fetchNotifications,
    markAllNotificationsAsRead,
    clearAllNotifications
  }
}

// Hook for managing purchased images
export const usePurchasedImages = (userId?: string) => {
  const [purchasedImages, setPurchasedImages] = useState<any[]>([])

  const loadPurchasedImages = useCallback(async (userId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('❌ No token found')
        return
      }
      
      const response = await fetch(`${API_BASE_URL}/api/blur/transactions/${userId}?type=purchases`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.data.transactions) {
          const purchasedImages = data.data.transactions.map((transaction: any) => ({
            profileId: transaction.imageOwner.toString(),
            imageId: transaction.imageId,
            purchasedAt: transaction.purchasedAt
          }))
          
          setPurchasedImages(purchasedImages)
          
          // อัพเดทข้อมูลผู้ใช้ใน localStorage
          const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
          const updatedUser = {
            ...currentUser,
            purchasedImages: purchasedImages
          }
          
          localStorage.setItem('user', JSON.stringify(updatedUser))
        }
      } else {
        console.error('❌ Failed to load purchased images:', response.status)
      }
    } catch (error) {
      console.error('❌ Error loading purchased images:', error)
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    
    loadPurchasedImages(userId)
  }, [userId, loadPurchasedImages])

  return {
    purchasedImages,
    setPurchasedImages,
    loadPurchasedImages
  }
}

// REMOVED: useChatState hook - All Chat functionality removed (Public & Private)

// Hook for managing profile state
export const useProfileState = () => {
  const [selectedProfile, setSelectedProfile] = useState<any>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileAlert, setProfileAlert] = useState<{message: string, type: 'error' | 'warning' | 'success'} | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showProfileDetails, setShowProfileDetails] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)

  return {
    selectedProfile,
    setSelectedProfile,
    showProfileModal,
    setShowProfileModal,
    profileAlert,
    setProfileAlert,
    activeImageIndex,
    setActiveImageIndex,
    showProfileDetails,
    setShowProfileDetails,
    profileData,
    setProfileData
  }
}

// Hook for managing payment state
export const usePaymentState = () => {
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState<PaymentState | null>(null)
  const [currentView, setCurrentView] = useState<'main' | 'payment' | 'success'>('main')
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [transactionData, setTransactionData] = useState<any>(null)

  return {
    showPaymentConfirmation,
    setShowPaymentConfirmation,
    paymentDetails,
    setPaymentDetails,
    currentView,
    setCurrentView,
    selectedPlan,
    setSelectedPlan,
    transactionData,
    setTransactionData
  }
}

// Hook for managing user data
export const useUserData = () => {
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [isLoadingAllUsers, setIsLoadingAllUsers] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreUsers, setHasMoreUsers] = useState(true)
  const [visibleCount, setVisibleCount] = useState(12)
  const [premiumUsers, setPremiumUsers] = useState<any[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  return {
    allUsers,
    setAllUsers,
    isLoadingAllUsers,
    setIsLoadingAllUsers,
    currentPage,
    setCurrentPage,
    hasMoreUsers,
    setHasMoreUsers,
    visibleCount,
    setVisibleCount,
    premiumUsers,
    setPremiumUsers,
    avatarUrl,
    setAvatarUrl
  }
}

// Hook for managing filters
export const useFilters = () => {
  const [filters, setFilters] = useState<FilterState>({
    ageRange: [18, 65],
    location: '',
    interests: [],
    gender: '',
    membershipTier: '',
    lookingFor: '',
    province: '',
    ageMin: 18,
    ageMax: 65,
    relationship: '',
    otherRelationship: '',
    distanceKm: 0,
    lat: 0,
    lng: 0
  })
  const [filtersOpen, setFiltersOpen] = useState(false)

  return {
    filters,
    setFilters,
    filtersOpen,
    setFiltersOpen
  }
}

// Hook for managing modal states
export const useModalState = () => {
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)
  // REMOVED: showNewPrivateChatModal - Private Chat functionality removed
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const [preventModalClose, setPreventModalClose] = useState(false)
  const [modalAction, setModalAction] = useState<'chat' | 'like' | 'profile' | null>(null)

  return {
    showLoginDialog,
    setShowLoginDialog,
    showCreateRoomModal,
    setShowCreateRoomModal,
    // REMOVED: showNewPrivateChatModal returns - Private Chat functionality removed
    showProfileDropdown,
    setShowProfileDropdown,
    showNotificationDropdown,
    setShowNotificationDropdown,
    preventModalClose,
    setPreventModalClose,
    modalAction,
    setModalAction
  }
}

// Hook for managing maintenance mode
export const useMaintenanceMode = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [maintenanceChecked, setMaintenanceChecked] = useState(false)
  const [hasDevAccess, setHasDevAccess] = useState(() => {
    return localStorage.getItem('devAccess') === 'true'
  })
  const [bypassMaintenance, setBypassMaintenance] = useState(() => {
    return localStorage.getItem('bypassMaintenance') === 'true'
  })

  return {
    isMaintenanceMode,
    setIsMaintenanceMode,
    maintenanceChecked,
    setMaintenanceChecked,
    hasDevAccess,
    setHasDevAccess,
    bypassMaintenance,
    setBypassMaintenance
  }
}

// Hook for managing vote state
export const useVoteState = () => {
  const [selectedVoteUser, setSelectedVoteUser] = useState<any>(null)
  const [showVoteUserProfile, setShowVoteUserProfile] = useState(false)
  const [showRankingModal, setShowRankingModal] = useState(false)

  return {
    selectedVoteUser,
    setSelectedVoteUser,
    showVoteUserProfile,
    setShowVoteUserProfile,
    showRankingModal,
    setShowRankingModal
  }
}

// Hook for managing chat countdown
export const useChatCountdown = () => {
  const [chatCountdown, setChatCountdown] = useState<number | null>(null)
  const [isStartingChat, setIsStartingChat] = useState(false)

  return {
    chatCountdown,
    setChatCountdown,
    isStartingChat,
    setIsStartingChat
  }
}

// Hook for managing liked profiles
export const useLikedProfiles = () => {
  const [likedProfiles, setLikedProfiles] = useState(new Set<string>())

  return {
    likedProfiles,
    setLikedProfiles
  }
}

// Hook for managing authentication state
export const useAuthState = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)

  return {
    isAuthenticated,
    setIsAuthenticated,
    forceUpdate,
    setForceUpdate
  }
}
