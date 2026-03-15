import { useCallback } from 'react'

interface UseAppEventHandlersProps {
  user: any
  setShowProfileModal: (show: boolean) => void
  setSelectedProfile: (profile: any) => void
  setShowLoginDialog: (show: boolean) => void
  setShowPaymentModal: (show: boolean) => void
  setPaymentState: (state: any) => void
  handleProfileLike: (profileId: string) => void
  // REMOVED: canCreatePrivateChat parameter - Private Chat functionality removed
  success: (message: string) => void
  error: (message: string) => void
}

export const useAppEventHandlers = ({
  user,
  setShowProfileModal,
  setSelectedProfile,
  setShowLoginDialog,
  setShowPaymentModal,
  setPaymentState,
  handleProfileLike,
  // REMOVED: canCreatePrivateChat parameter destructure
  success,
  error
}: UseAppEventHandlersProps) => {

  // Handle profile card click
  const handleProfileClick = useCallback((profile: any) => {
    if (!user) {
      setShowLoginDialog(true)
      return
    }

    setSelectedProfile(profile)
    setShowProfileModal(true)
  }, [user, setShowProfileModal, setSelectedProfile, setShowLoginDialog])

  // Handle profile like
  const handleLikeClick = useCallback((profileId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (!user) {
      setShowLoginDialog(true)
      return
    }

    handleProfileLike(profileId)
  }, [user, handleProfileLike, setShowLoginDialog])

  // REMOVED: handleChatClick - Private Chat functionality removed
  const handleChatClick = useCallback((profile: any, event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (!user) {
      setShowLoginDialog(true)
      return
    }

    // Private chat functionality removed
    error('Chat functionality has been removed')
  }, [user, error, setShowLoginDialog])

  // Handle payment for blur
  const handlePaymentForBlur = useCallback((targetUserId: string, imageId: string) => {
    if (!user) {
      setShowLoginDialog(true)
      return
    }

    setPaymentState({
      planId: 'blur-unlock',
      planName: 'Unlock Blurred Profile',
      amount: 10,
      currency: 'THB',
      description: 'Unlock blurred profile image',
      targetUserId,
      imageId
    })
    setShowPaymentModal(true)
  }, [user, setPaymentState, setShowPaymentModal, setShowLoginDialog])

  // Handle payment for gift
  const handlePaymentForGift = useCallback((targetUserId: string, imageId: string, targetUserName: string) => {
    if (!user) {
      setShowLoginDialog(true)
      return
    }

    setPaymentState({
      planId: 'gift-send',
      planName: 'Send Gift',
      amount: 50,
      currency: 'THB',
      description: 'Send gift to user',
      targetUserId,
      imageId,
      targetUserName
    })
    setShowPaymentModal(true)
  }, [user, setPaymentState, setShowPaymentModal, setShowLoginDialog])

  // Handle payment for coins
  const handlePaymentForCoins = useCallback((currentCoins: number) => {
    if (!user) {
      setShowLoginDialog(true)
      return
    }

    setPaymentState({
      planId: 'coin-purchase',
      planName: 'Purchase Coins',
      amount: 100,
      currency: 'THB',
      description: 'Purchase coins for app usage',
      currentCoins
    })
    setShowPaymentModal(true)
  }, [user, setPaymentState, setShowPaymentModal, setShowLoginDialog])

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setShowProfileModal(false)
    setSelectedProfile(null)
  }, [setShowProfileModal, setSelectedProfile])

  // Handle payment modal close
  const handlePaymentModalClose = useCallback(() => {
    setShowPaymentModal(false)
    setPaymentState(null)
  }, [setShowPaymentModal, setPaymentState])

  return {
    handleProfileClick,
    handleLikeClick,
    handleChatClick,
    handlePaymentForBlur,
    handlePaymentForGift,
    handlePaymentForCoins,
    handleModalClose,
    handlePaymentModalClose
  }
}
