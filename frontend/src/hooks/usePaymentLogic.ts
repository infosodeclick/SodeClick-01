import { useState, useCallback } from 'react'

interface PaymentState {
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

interface UsePaymentLogicProps {
  user: any
  success: (message: string) => void
  error: (message: string) => void
}

export const usePaymentLogic = ({ user, success, error }: UsePaymentLogicProps) => {
  const [paymentState, setPaymentState] = useState<PaymentState | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Handle payment for profile blur
  const handlePaymentForBlur = useCallback((targetUserId: string, imageId: string) => {
    console.log('💳 Starting payment process for blur:', { targetUserId, imageId })
    
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
  }, [])

  // Handle payment for gift
  const handlePaymentForGift = useCallback((targetUserId: string, imageId: string, targetUserName: string) => {
    console.log('💳 Starting payment process for gift:', { targetUserId, imageId, targetUserName })
    
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
  }, [])

  // Handle payment for coins
  const handlePaymentForCoins = useCallback((currentCoins: number) => {
    console.log('💳 Starting payment process for coins:', { currentCoins })
    
    setPaymentState({
      planId: 'coin-purchase',
      planName: 'Purchase Coins',
      amount: 100,
      currency: 'THB',
      description: 'Purchase coins for app usage',
      currentCoins
    })
    setShowPaymentModal(true)
  }, [])

  // Process payment
  const processPayment = useCallback(async () => {
    if (!paymentState || !user) return

    setIsProcessingPayment(true)
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${baseUrl}/api/payment/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: paymentState.planId,
          amount: paymentState.amount,
          currency: paymentState.currency,
          targetUserId: paymentState.targetUserId,
          imageId: paymentState.imageId,
          targetUserName: paymentState.targetUserName,
          currentCoins: paymentState.currentCoins
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Payment processed successfully:', result)
        
        success('Payment processed successfully!')
        
        // Update user coins if applicable
        if (result.data?.coinsAdded && window.updateAuthContext) {
          const updatedUser = {
            ...user,
            coins: (user.coins || 0) + result.data.coinsAdded
          }
          window.updateAuthContext(updatedUser)
        }
        
        // Close payment modal
        setShowPaymentModal(false)
        setPaymentState(null)
        
        // Refresh user data
        window.dispatchEvent(new CustomEvent('refreshUserData'))
        
      } else {
        const errorData = await response.json()
        console.error('❌ Payment failed:', errorData)
        error(errorData.message || 'Payment failed. Please try again.')
      }
    } catch (err) {
      console.error('❌ Payment error:', err)
      error('Payment failed. Please try again.')
    } finally {
      setIsProcessingPayment(false)
    }
  }, [paymentState, user, success, error])

  // Cancel payment
  const cancelPayment = useCallback(() => {
    setShowPaymentModal(false)
    setPaymentState(null)
    setIsProcessingPayment(false)
  }, [])

  return {
    paymentState,
    showPaymentModal,
    isProcessingPayment,
    handlePaymentForBlur,
    handlePaymentForGift,
    handlePaymentForCoins,
    processPayment,
    cancelPayment,
    setShowPaymentModal
  }
}
