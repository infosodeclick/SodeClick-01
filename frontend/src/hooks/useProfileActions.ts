import { useState, useCallback } from 'react'
import { profileAPI } from '../services/profileAPI'
import { showWebappNotification } from '../utils'

export const useProfileActions = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const likeProfile = useCallback(async (profileId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const result = await profileAPI.likeProfile(profileId)
      
      if (result.success) {
        showWebappNotification('ส่งใจให้แล้ว! ❤️', 'success')
        return { success: true, data: result.data }
      } else {
        showWebappNotification(result.error || 'ไม่สามารถส่งใจได้', 'error')
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMsg = err.message || 'เกิดข้อผิดพลาด'
      showWebappNotification(errorMsg, 'error')
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateOnlineStatus = useCallback(async (isOnline: boolean) => {
    try {
      const result = await profileAPI.updateOnlineStatus(isOnline)
      
      if (result.success) {
        console.log(`✅ Online status updated: ${isOnline ? 'online' : 'offline'}`)
        return { success: true }
      } else {
        console.error('❌ Failed to update online status:', result.error)
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('❌ Error updating online status:', err)
      return { success: false, error: err.message }
    }
  }, [])

  const loadAvatar = useCallback(async (userId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const result = await profileAPI.loadAvatar(userId)
      
      if (result.success && result.data) {
        return { success: true, data: result.data }
      } else {
        setError(result.error || 'Failed to load avatar')
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to load avatar'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    error,
    likeProfile,
    updateOnlineStatus,
    loadAvatar
  }
}
