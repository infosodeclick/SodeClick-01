import { useState, useEffect } from 'react'
import { Heart, CreditCard, Shield, CheckCircle } from 'lucide-react'

interface LovePaymentAnimationProps {
  onComplete: () => void
  duration?: number // ในหน่วยมิลลิวินาที
}

const LovePaymentAnimation = ({ onComplete, duration = 2000 }: LovePaymentAnimationProps) => {
  const [isVisible, setIsVisible] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const steps = [
      { delay: 0, text: 'กำลังเตรียมระบบ...' },
      { delay: 500, text: 'กำลังสร้าง QR Code...' },
      { delay: 1000, text: 'กำลังตรวจสอบความปลอดภัย...' },
      { delay: 1500, text: 'พร้อมชำระเงิน!' }
    ]

    steps.forEach((step, index) => {
      setTimeout(() => {
        setCurrentStep(index)
      }, step.delay)
    })

    setTimeout(() => {
      setIsVisible(false)
      onComplete()
    }, duration)
  }, [duration, onComplete])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      {/* Clean Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50/30 via-white to-rose-50/30"></div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-sm mx-auto px-8">
        {/* Icon Container */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            {/* Main Icon */}
            <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
              {currentStep === 0 && <Heart className="w-12 h-12 text-white" />}
              {currentStep === 1 && <CreditCard className="w-12 h-12 text-white" />}
              {currentStep === 2 && <Shield className="w-12 h-12 text-white" />}
              {currentStep === 3 && <CheckCircle className="w-12 h-12 text-white" />}
            </div>
            
            {/* Progress Ring */}
            <div className="absolute inset-0">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-pink-200"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  className="text-pink-500 transition-all duration-500 ease-out"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - (currentStep + 1) / 4)}`}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-800">
            💕 Love Payment 💕
          </h1>
          
          {/* Step Text */}
          <div className="min-h-[2rem] flex items-center justify-center">
            <p className="text-lg text-gray-600 font-medium transition-all duration-300">
              {currentStep === 0 && 'กำลังเตรียมระบบ...'}
              {currentStep === 1 && 'กำลังสร้าง QR Code...'}
              {currentStep === 2 && 'กำลังตรวจสอบความปลอดภัย...'}
              {currentStep === 3 && 'พร้อมชำระเงิน!'}
            </p>
          </div>
          
          {/* Progress Steps */}
          <div className="flex justify-center space-x-2">
            {[0, 1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  step <= currentStep 
                    ? 'bg-pink-500 scale-110' 
                    : 'bg-pink-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Subtle Background Hearts */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-8 left-8 text-pink-200 opacity-30">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <div className="absolute top-12 right-12 text-rose-200 opacity-30">
            <Heart className="w-4 h-4 fill-current" />
          </div>
          <div className="absolute bottom-16 left-12 text-pink-200 opacity-30">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div className="absolute bottom-8 right-8 text-rose-200 opacity-30">
            <Heart className="w-6 h-6 fill-current" />
          </div>
        </div>
      </div>

    </div>
  )
}

export default LovePaymentAnimation
