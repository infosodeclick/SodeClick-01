import { useState } from 'react'
import LovePaymentAnimation from './LovePaymentAnimation'
import PaymentGateway from './PaymentGateway'

interface PaymentWithAnimationProps {
  plan: any
  onBack: () => void
  onSuccess: (data: any) => void
  onCancel: () => void
}

const PaymentWithAnimation = ({ plan, onBack, onSuccess, onCancel }: PaymentWithAnimationProps) => {
  const [showAnimation, setShowAnimation] = useState(true)

  const handleAnimationComplete = () => {
    setShowAnimation(false)
    // ไม่ต้องเลื่อนที่นี่ เพราะ PaymentGateway จะเลื่อนเอง
  }

  if (showAnimation) {
    return <LovePaymentAnimation onComplete={handleAnimationComplete} duration={2000} />
  }

  return (
    <PaymentGateway
      plan={plan}
      onBack={onBack}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  )
}

export default PaymentWithAnimation
