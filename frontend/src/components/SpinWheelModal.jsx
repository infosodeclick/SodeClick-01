import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { X, Zap, Gift, Coins, Star, Heart, Trophy, Diamond, Timer } from 'lucide-react'

const SpinWheelModal = ({ isOpen, onClose, onSpin, isLoading, canSpin, userRole }) => {
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [selectedPrize, setSelectedPrize] = useState(null)
  const [hasSpun, setHasSpun] = useState(false)
  const [showPrizeResult, setShowPrizeResult] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const wheelRef = useRef(null)
  const spinTimeoutRef = useRef(null)

  // รางวัลในวงล้อ (จัดเรียงตามตำแหน่งในล้อ เริ่มจากด้านบนตามเข็มนาฬิกา)
  const prizes = [
    { id: 1, name: '200 เหรียญ', type: 'coins', amount: 200, color: '#FF6347', icon: Coins },
    { id: 2, name: '100 เหรียญ', type: 'coins', amount: 100, color: '#FFA500', icon: Coins },
    { id: 3, name: '50 เหรียญ', type: 'coins', amount: 50, color: '#FFD700', icon: Coins },
    { id: 4, name: '500 เหรียญ', type: 'coins', amount: 500, color: '#32CD32', icon: Coins },
    { id: 5, name: 'รางวัลใหญ่', type: 'grand', amount: 1, color: '#00CED1', icon: Trophy },
    { id: 6, name: '300 โหวต', type: 'votePoints', amount: 300, color: '#FF69B4', icon: Star },
    { id: 7, name: '500 เหรียญ', type: 'coins', amount: 500, color: '#FF1493', icon: Coins },
    { id: 8, name: '100 โหวต', type: 'votePoints', amount: 100, color: '#8A2BE2', icon: Star },
    { id: 9, name: '50 โหวต', type: 'votePoints', amount: 50, color: '#9370DB', icon: Star }
  ]

  const handleSpin = () => {
    if (isSpinning) return

    setIsSpinning(true)
    setSelectedPrize(null)
    setShowPrizeResult(false)
    setErrorMessage(null)

    // เพิ่มเอฟเฟกต์การสั่นของปุ่ม
    const button = document.querySelector('.spin-button')
    if (button) {
      button.classList.add('animate-pulse')
    }

    // เริ่มการหมุนแอนิเมชันก่อน (แบบสุ่ม)
    const spins = 5 + Math.random() * 3
    const randomPrize = prizes[Math.floor(Math.random() * prizes.length)]
    const prizeIndex = prizes.findIndex(p => p.id === randomPrize.id)
    const segmentAngle = 360 / prizes.length
    const prizeAngle = segmentAngle * prizeIndex + (segmentAngle / 2)
    const initialRotation = rotation + (spins * 360) + (360 - prizeAngle)

    // เริ่มการหมุน
    setRotation(initialRotation)

    // หลังจากหมุนไปแล้ว 4 วินาที ค่อยเรียก API และแสดงผล
    spinTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('🚀 Starting API call...')
        // เรียก API เพื่อได้รางวัลจริง
        const result = await onSpin()
        setHasSpun(true)
        
        console.log('🎲 API Response:', result)
        
        // ตรวจสอบว่า API ส่งข้อมูลมาหรือไม่
        if (!result) {
          throw new Error('No result from API')
        }
        
        // หารางวัลที่ได้จาก API ในรายการ prizes
        let prizeFromAPI = null
        
        if (result?.type === 'coins') {
          prizeFromAPI = prizes.find(p => p.type === 'coins' && p.amount === result.amount)
          console.log('🪙 Looking for coins prize:', result.amount, 'Found:', prizeFromAPI)
        } else if (result?.type === 'votePoints') {
          prizeFromAPI = prizes.find(p => p.type === 'votePoints' && p.amount === result.amount)
          console.log('⭐ Looking for votePoints prize:', result.amount, 'Found:', prizeFromAPI)
        } else if (result?.type === 'grand') {
          prizeFromAPI = prizes.find(p => p.type === 'grand')
          console.log('🏆 Looking for grand prize, Found:', prizeFromAPI)
        }
        
        // ถ้าไม่พบรางวัลใน prizes ให้สร้างรางวัลใหม่
        let finalPrize
        if (!prizeFromAPI) {
          console.log('⚠️ Prize not found in frontend list, creating custom prize')
          if (result?.type === 'coins') {
            finalPrize = {
              id: `custom_coins_${result.amount}`,
              name: `${result.amount} เหรียญ`,
              type: 'coins',
              amount: result.amount,
              color: '#FFD700',
              icon: Coins
            }
          } else if (result?.type === 'votePoints') {
            finalPrize = {
              id: `custom_votes_${result.amount}`,
              name: `${result.amount} โหวต`,
              type: 'votePoints',
              amount: result.amount,
              color: '#FF69B4',
              icon: Star
            }
          } else if (result?.type === 'grand') {
            finalPrize = {
              id: 'custom_grand',
              name: 'รางวัลใหญ่',
              type: 'grand',
              amount: 1,
              color: '#00CED1',
              icon: Trophy
            }
          } else {
            finalPrize = prizes[0] // fallback
          }
        } else {
          finalPrize = prizeFromAPI
        }
        
        console.log('🎯 Final prize selected:', finalPrize)
        
        // ปรับตำแหน่งวงล้อให้ตรงกับรางวัลจริง (ถ้าไม่ตรงกับที่หมุนไป)
        if (finalPrize.id !== randomPrize.id) {
          let correctPrizeIndex = prizes.findIndex(p => p.id === finalPrize.id)
          
          // ถ้าไม่พบในรายการเดิม (เป็น custom prize) ให้ใช้ตำแหน่งแรกที่ตรงกับ type และ amount
          if (correctPrizeIndex === -1) {
            if (finalPrize.type === 'coins') {
              correctPrizeIndex = prizes.findIndex(p => p.type === 'coins' && p.amount === finalPrize.amount)
            } else if (finalPrize.type === 'votePoints') {
              correctPrizeIndex = prizes.findIndex(p => p.type === 'votePoints' && p.amount === finalPrize.amount)
            } else if (finalPrize.type === 'grand') {
              correctPrizeIndex = prizes.findIndex(p => p.type === 'grand')
            }
          }
          
          // ถ้ายังไม่พบ ให้ใช้ตำแหน่งที่ใกล้เคียง
          if (correctPrizeIndex === -1) {
            correctPrizeIndex = 0 // ใช้ตำแหน่งแรก
          }
          
          const correctPrizeAngle = segmentAngle * correctPrizeIndex + (segmentAngle / 2)
          const correctRotation = rotation + (spins * 360) + (360 - correctPrizeAngle)
          
          console.log('🎯 Adjusting wheel to correct position:', correctPrizeIndex, correctPrizeAngle)
          
          // ปรับการหมุนให้หยุดที่รางวัลที่ถูกต้อง
          setRotation(correctRotation)
        }

        // แสดงรางวัลทันทีหลังจาก API สำเร็จ
        console.log('🎉 Showing prize result immediately:', finalPrize)
        
        // ปิด modal ทันทีและแสดงรางวัลในหน้าต่างแยก
        setIsSpinning(false)
        setSelectedPrize(finalPrize)
        setShowPrizeResult(true)
        setErrorMessage(null)
        
        // ปิด modal หลัก
        onClose()
        
        // ลบเอฟเฟกต์การสั่น
        const button = document.querySelector('.spin-button')
        if (button) {
          button.classList.remove('animate-pulse')
        }
        
      } catch (error) {
        console.error('🚨 Error during spin:', error)
        
        // ถ้า API ผิดพลาด ให้หยุดการหมุนและแสดง error
        setIsSpinning(false)
        
        // จัดการข้อความ error
        let errorMsg = 'ไม่สามารถหมุนวงล้อได้'
        
        if (error.response?.status === 400) {
          const responseMessage = error.response?.data?.message
          if (responseMessage === 'Spin wheel not available yet') {
            errorMsg = 'ยังไม่สามารถหมุนวงล้อได้ กรุณารอ 24 ชั่วโมง'
          } else {
            errorMsg = responseMessage || errorMsg
          }
        }
        
        // แสดง error แทนรางวัล
        setSelectedPrize(null)
        setShowPrizeResult(false)
        setErrorMessage(errorMsg)
        
        console.log('🔴 Error state set:', { errorMsg, showPrizeResult: false })
        
        // ลบเอฟเฟกต์การสั่น
        const button = document.querySelector('.spin-button')
        if (button) {
          button.classList.remove('animate-pulse')
        }
      }
    }, 4000) // เรียก API หลังหมุนไปแล้ว 4 วินาที
  }

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      // ล้าง timeout เมื่อปิด modal
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current)
      }
      
      // Reset states ทันทีเมื่อปิด modal
      console.log('🔄 Resetting modal states...')
      setIsSpinning(false)
      setSelectedPrize(null)
      setRotation(0)
      setHasSpun(false)
      setShowPrizeResult(false)
      setErrorMessage(null)
    } else {
      // เมื่อเปิด modal ใหม่ ให้ reset states ทันที
      console.log('🔄 Opening modal - resetting states...')
      setIsSpinning(false)
      setSelectedPrize(null)
      setRotation(0)
      setHasSpun(false)
      setShowPrizeResult(false)
      setErrorMessage(null)
    }
  }, [isOpen])

  // Debug useEffect เพื่อติดตาม state changes
  useEffect(() => {
    console.log('🔄 State changed:', {
      isSpinning,
      selectedPrize: selectedPrize ? { id: selectedPrize.id, name: selectedPrize.name, type: selectedPrize.type } : null,
      showPrizeResult,
      errorMessage,
      hasSpun
    })
    
    // แสดงสถานะของ popup อย่างชัดเจน
    if (showPrizeResult && selectedPrize) {
      console.log('✅ POPUP SHOULD BE VISIBLE NOW!')
      console.log('🎯 Prize details:', selectedPrize)
    } else if (errorMessage) {
      console.log('❌ ERROR MESSAGE SHOULD BE VISIBLE:', errorMessage)
    } else {
      console.log('⏳ Waiting for result...')
    }
  }, [isSpinning, selectedPrize, showPrizeResult, errorMessage, hasSpun])

  const renderWheel = () => {
    const segmentAngle = 360 / prizes.length
    const radius = 150
    const centerX = 160
    const centerY = 160

    return (
      <div className="relative w-80 h-80 mx-auto">
        {/* เอฟเฟกต์แสงรอบวงล้อเมื่อกำลังหมุน */}
        {isSpinning && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 opacity-30 animate-pulse blur-xl"></div>
        )}
        
        {/* เอฟเฟกต์แสงเพิ่มเติมเมื่อกำลังหมุน */}
        {isSpinning && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300 via-orange-300 to-red-300 opacity-20 animate-ping blur-2xl"></div>
        )}
        
        {/* เอฟเฟกต์แสงเพิ่มเติมเมื่อกำลังหมุน */}
        {isSpinning && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-200 via-orange-200 to-red-200 opacity-15 animate-ping blur-3xl"></div>
        )}
        
        {/* เข็มชี้ */}
        <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 z-20 ${
          isSpinning ? 'animate-pulse' : ''
        }`}>
          {/* จุดเชื่อมต่อ */}
          <div className={`w-3 h-3 rounded-full mx-auto mb-1 drop-shadow-lg border-2 border-white ${
            isSpinning ? 'bg-red-500 animate-pulse' : 'bg-red-600'
          }`}></div>
          
          {/* เข็มหลัก */}
          <div className={`w-0 h-0 border-l-[12px] border-r-[12px] border-t-[25px] border-l-transparent border-r-transparent drop-shadow-lg ${
            isSpinning ? 'border-t-red-500' : 'border-t-red-600'
          }`}></div>
          
          {/* เงาเข็ม */}
          <div className="absolute top-1 left-1 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[25px] border-l-transparent border-r-transparent opacity-30"></div>
        </div>

        {/* วงล้อ SVG */}
        <svg 
          ref={wheelRef}
          className={`w-full h-full transition-transform duration-5000 ease-out ${
            isSpinning ? 'animate-pulse ring-4 ring-yellow-400 ring-opacity-50' : ''
          }`}
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transitionDuration: isSpinning ? '5s' : '0s',
            transitionTimingFunction: isSpinning ? 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'ease-out'
          }}
          viewBox="0 0 320 320"
        >
          {/* วงล้อเงา */}
          <circle 
            cx={centerX + 3} 
            cy={centerY + 3} 
            r={radius} 
            fill="none" 
            stroke="rgba(0,0,0,0.2)" 
            strokeWidth="4"
          />
          
          {/* วงล้อพื้นหลัง */}
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={radius} 
            fill="none" 
            stroke="#d1d5db" 
            strokeWidth="4"
            className="drop-shadow-2xl"
          />
          
          {/* ส่วนของรางวัล */}
          {prizes.map((prize, index) => {
            const startAngle = (segmentAngle * index - 90) * (Math.PI / 180)
            const endAngle = (segmentAngle * (index + 1) - 90) * (Math.PI / 180)
            
            const x1 = centerX + radius * Math.cos(startAngle)
            const y1 = centerY + radius * Math.sin(startAngle)
            const x2 = centerX + radius * Math.cos(endAngle)
            const y2 = centerY + radius * Math.sin(endAngle)
            
            const largeArcFlag = segmentAngle > 180 ? 1 : 0
            
            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ')

            const IconComponent = prize.icon
            const textAngle = (segmentAngle * index + segmentAngle / 2 - 90) * (Math.PI / 180)
            const textRadius = radius * 0.7
            const textX = centerX + textRadius * Math.cos(textAngle)
            const textY = centerY + textRadius * Math.sin(textAngle)

            return (
              <g key={prize.id}>
                {/* เงาส่วนรางวัล */}
                <path
                  d={pathData}
                  fill={prize.color}
                  opacity="0.8"
                  transform="translate(2, 2)"
                />
                {/* ส่วนรางวัลหลัก */}
                <path
                  d={pathData}
                  fill={prize.color}
                  className={isSpinning ? 'animate-pulse' : ''}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />
                <text
                  x={textX}
                  y={textY + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-white font-bold text-xs fill-current"
                  style={{ fontSize: '10px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {prize.name}
                </text>
                <foreignObject
                  x={textX - 12}
                  y={textY - 20}
                  width="24"
                  height="24"
                >
                  <div className="flex justify-center">
                    <IconComponent className={`w-5 h-5 text-white drop-shadow ${isSpinning ? 'animate-bounce' : ''}`} />
                  </div>
                </foreignObject>
              </g>
            )
          })}
          
          {/* เงาจุดศูนย์กลาง */}
          <circle 
            cx={centerX + 2} 
            cy={centerY + 2} 
            r="32" 
            fill="white" 
            stroke="rgba(0,0,0,0.2)" 
            strokeWidth="4"
          />
          
          {/* จุดศูนย์กลาง */}
          <circle 
            cx={centerX} 
            cy={centerY} 
            r="32" 
            fill="white" 
            stroke="#d1d5db" 
            strokeWidth="4"
            className={`drop-shadow-lg ${isSpinning ? 'animate-pulse ring-2 ring-yellow-400' : ''}`}
          />
          
          {/* วงกลมในจุดศูนย์กลาง */}
          <circle 
            cx={centerX} 
            cy={centerY} 
            r="24" 
            fill="none" 
            stroke="rgba(0,0,0,0.1)" 
            strokeWidth="1"
          />
          
          <foreignObject
            x={centerX - 16}
            y={centerY - 16}
            width="32"
            height="32"
          >
            <div className="flex items-center justify-center w-full h-full">
              <Zap className={`w-8 h-8 ${isSpinning ? 'text-yellow-600 animate-spin' : 'text-yellow-500'}`} />
            </div>
          </foreignObject>
        </svg>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${showPrizeResult ? 'max-w-lg' : 'max-w-md'} backdrop-blur-md border shadow-2xl rounded-2xl p-6 ${
        isSpinning 
          ? 'bg-gradient-to-br from-yellow-50/95 to-orange-50/95 border-yellow-200 ring-4 ring-yellow-300 ring-opacity-30 animate-pulse' 
          : showPrizeResult
            ? 'bg-gradient-to-br from-green-50/95 to-emerald-50/95 border-green-200'
            : 'bg-white/95 border-white/20'
      }`}>
        <DialogHeader>
          <DialogTitle className={`text-2xl font-bold text-center mb-4 ${
            isSpinning 
              ? 'text-yellow-700 animate-pulse' 
              : 'text-gray-800'
          }`}>
            🎰 วงล้อแห่งโชคชะตา
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            หมุนวงล้อเพื่อรับรางวัลพิเศษและโบนัสต่างๆ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          
          {/* แสดง error message ถ้ามี */}
          {errorMessage && (
            <div className="text-center p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border-2 border-red-300 shadow-lg">
              <div className="text-2xl mb-3">⚠️</div>
              <div className="text-xl font-bold text-red-800 mb-2">
                ไม่สามารถหมุนวงล้อได้
              </div>
              <div className="text-lg text-red-600 mb-4">
                {errorMessage}
              </div>
              <Button
                onClick={() => {
                  setErrorMessage(null)
                  onClose()
                }}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-lg"
              >
                ตกลง
              </Button>
            </div>
          )}

          {/* แสดงวงล้อและปุ่มหมุน */}
          {!showPrizeResult ? (
            <>
              {/* วงล้อ */}
              {renderWheel()}

              {/* ปุ่มหมุน */}
              <div className="text-center">
                <Button
                  onClick={handleSpin}
                  disabled={isSpinning || isLoading || (hasSpun && userRole !== 'superadmin' && userRole !== 'admin')}
                  className={`spin-button px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ${
                    isSpinning 
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white animate-pulse ring-4 ring-yellow-300' 
                      : (hasSpun && userRole !== 'superadmin' && userRole !== 'admin')
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white'
                  }`}
                >
                  {isSpinning ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      กำลังหมุน...
                    </div>
                  ) : isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      กำลังประมวลผล...
                    </div>
                  ) : hasSpun && userRole !== 'superadmin' && userRole !== 'admin' ? (
                    <div className="flex items-center">
                      <Timer className="w-5 h-5 mr-2" />
                      หมุนแล้ววันนี้
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Zap className="w-5 h-5 mr-2" />
                      หมุนวงล้อ
                    </div>
                  )}
                </Button>
              </div>

              {/* คำแนะนำ - แสดงเฉพาะเมื่อยังไม่ได้รางวัล */}
              <div className={`text-center text-sm ${
                isSpinning ? 'text-yellow-700 animate-pulse' : 'text-gray-600'
              }`}>
                <p>💡 กดปุ่มหมุนวงล้อเพื่อรับรางวัลพิเศษ!</p>
                <p className="mt-1">
                  {(userRole === 'superadmin' || userRole === 'admin') 
                    ? '⚡ สามารถหมุนได้ไม่จำกัด' 
                    : '⏰ สามารถหมุนได้ทุก 24 ชั่วโมง'
                  }
                </p>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Prize Result Modal Component
export const PrizeResultModal = ({ isOpen, onClose, prize }) => {
  if (!prize) return null

  // หารางวัลที่ตรงกับข้อมูลจาก API
  const prizes = [
    { id: 1, name: '200 เหรียญ', type: 'coins', amount: 200, color: '#FF6347', icon: Coins },
    { id: 2, name: '100 เหรียญ', type: 'coins', amount: 100, color: '#FFA500', icon: Coins },
    { id: 3, name: '50 เหรียญ', type: 'coins', amount: 50, color: '#FFD700', icon: Coins },
    { id: 4, name: '500 เหรียญ', type: 'coins', amount: 500, color: '#32CD32', icon: Coins },
    { id: 5, name: 'รางวัลใหญ่', type: 'grand', amount: 1, color: '#00CED1', icon: Trophy },
    { id: 6, name: '300 โหวต', type: 'votePoints', amount: 300, color: '#FF69B4', icon: Star },
    { id: 7, name: '500 เหรียญ', type: 'coins', amount: 500, color: '#FF1493', icon: Coins },
    { id: 8, name: '100 โหวต', type: 'votePoints', amount: 100, color: '#8A2BE2', icon: Star },
    { id: 9, name: '50 โหวต', type: 'votePoints', amount: 50, color: '#9370DB', icon: Star }
  ]

  // หารางวัลที่ตรงกับข้อมูลจาก API
  let displayPrize = null
  if (prize.type === 'coins') {
    displayPrize = prizes.find(p => p.type === 'coins' && p.amount === prize.amount)
  } else if (prize.type === 'votePoints') {
    displayPrize = prizes.find(p => p.type === 'votePoints' && p.amount === prize.amount)
  } else if (prize.type === 'grand') {
    displayPrize = prizes.find(p => p.type === 'grand')
  }

  // ถ้าไม่พบรางวัลในรายการ ให้สร้างรางวัลใหม่
  if (!displayPrize) {
    if (prize.type === 'coins') {
      displayPrize = {
        name: `${prize.amount} เหรียญ`,
        type: 'coins',
        amount: prize.amount,
        color: '#FFD700',
        icon: Coins
      }
    } else if (prize.type === 'votePoints') {
      displayPrize = {
        name: `${prize.amount} โหวต`,
        type: 'votePoints',
        amount: prize.amount,
        color: '#FF69B4',
        icon: Star
      }
    } else if (prize.type === 'grand') {
      displayPrize = {
        name: 'รางวัลใหญ่',
        type: 'grand',
        amount: 1,
        color: '#00CED1',
        icon: Trophy
      }
    }
  }

  const IconComponent = displayPrize?.icon || Coins

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg backdrop-blur-md border shadow-2xl rounded-2xl p-6 bg-gradient-to-br from-green-50/95 to-emerald-50/95 border-green-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-4 text-gray-800">
            🎉 ยินดีด้วย!
          </DialogTitle>
        </DialogHeader>

        <div className="text-center p-8">
          {/* ข้อความแสดงความยินดี */}
          <div className="text-4xl mb-4">🎊</div>
          <div className="text-xl font-semibold text-green-600 mb-6">
            คุณได้รับรางวัล:
          </div>
          
          {/* รางวัลไอคอน */}
          <div className="flex justify-center mb-6">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg animate-bounce"
              style={{ backgroundColor: displayPrize?.color || '#FFD700' }}
            >
              <IconComponent className="w-12 h-12 text-white" />
            </div>
          </div>
          
          {/* รางวัลที่ได้รับ */}
          <div className="bg-white p-6 rounded-lg border-2 border-green-200 mb-6 shadow-lg">
            <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {displayPrize?.name || 'รางวัล'}
            </div>
            {prize.type === 'grand' && (
              <div className="text-xl text-green-600 mt-3">
                500 เหรียญ + 500 โหวต
              </div>
            )}
          </div>
          
          <div className="text-lg text-green-600 mb-8">
            รางวัลได้ถูกเพิ่มเข้าบัญชีของคุณแล้ว!
          </div>
          
          <Button
            onClick={onClose}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-12 py-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-xl"
          >
            ตกลง
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SpinWheelModal
