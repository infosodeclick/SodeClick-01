import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import MembershipCard from './MembershipCard'
import { membershipAPI } from '../services/membershipAPI'
import { RefreshCw, Crown, Sparkles, AlertTriangle } from 'lucide-react'
import { useToast } from './ui/toast'

const MembershipPlans = ({ currentUserId, currentTier: initialTier = 'member' }) => {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(null)
  const [error, setError] = useState(null)
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [currentTier, setCurrentTier] = useState(initialTier)
  const { warning } = useToast()

  // Update currentTier when initialTier prop changes or user data updates
  useEffect(() => {
    setCurrentTier(initialTier)
  }, [initialTier])

  // Listen for user data updates (e.g., after tier upgrade)
  useEffect(() => {
    const handleUserDataUpdated = (event) => {
      const updatedUser = event.detail
      console.log('🔄 [MembershipPlans] User data updated event received:', updatedUser)
      
      if (updatedUser?.membership?.tier && updatedUser.membership.tier !== currentTier) {
        console.log('🔄 [MembershipPlans] Tier changed, updating UI...')
        console.log('   Old tier:', currentTier)
        console.log('   New tier:', updatedUser.membership.tier)
        setCurrentTier(updatedUser.membership.tier)
      }
    }

    const handleRefreshUserData = () => {
      console.log('🔄 [MembershipPlans] Refresh user data event received')
      // Get latest tier from localStorage
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}')
        if (userData?.membership?.tier) {
          setCurrentTier(userData.membership.tier)
        }
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }

    window.addEventListener('userDataUpdated', handleUserDataUpdated)
    window.addEventListener('refreshUserData', handleRefreshUserData)

    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdated)
      window.removeEventListener('refreshUserData', handleRefreshUserData)
    }
  }, [currentTier])

  // ดึงแพ็กเกจสมาชิก
  const fetchPlans = async () => {
    try {
      setLoading(true)
      const response = await membershipAPI.getPlans()
      setPlans(response.data.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching membership plans:', err)
      setError(err.response?.data?.message || 'ไม่สามารถดึงข้อมูลแพ็กเกจได้')
    } finally {
      setLoading(false)
    }
  }

  // ฟังก์ชันตรวจสอบระดับสมาชิก
  const getTierLevel = (tier) => {
    const tierLevels = {
      'member': 0,
      'silver': 1,
      'gold': 2,
      'vip': 3,
      'vip1': 4,
      'vip2': 5,
      'diamond': 6,
      'platinum': 7
    }
    return tierLevels[tier] || 0
  }

  // ฟังก์ชันตรวจสอบว่ากำลังจะ downgrade หรือไม่
  const isDowngrade = (selectedTier) => {
    const currentLevel = getTierLevel(currentTier)
    const selectedLevel = getTierLevel(selectedTier)
    return selectedLevel < currentLevel
  }

  // ฟังก์ชันแปลงชื่อระดับสมาชิกเป็นภาษาไทย
  const getTierDisplayName = (tier) => {
    const tierNames = {
      'member': 'สมาชิกฟรี',
      'silver': 'Silver',
      'gold': 'Gold',
      'vip': 'VIP',
      'vip1': 'VIP 1',
      'vip2': 'VIP 2',
      'diamond': 'Diamond',
      'platinum': 'Platinum'
    }
    return tierNames[tier] || tier
  }

  // อัพเกรดสมาชิก - ไปหน้าชำระเงิน
  const handleUpgrade = async (plan) => {
    if (!currentUserId) {
      warning('กรุณาเข้าสู่ระบบก่อนอัพเกรดสมาชิก')
      return
    }

    // ตรวจสอบว่ากำลังจะ downgrade หรือไม่
    if (isDowngrade(plan.tier)) {
      setSelectedPlan(plan)
      setShowDowngradeConfirm(true)
      return
    }

    // ถ้าไม่ใช่ downgrade ให้ดำเนินการปกติ
    proceedWithUpgrade(plan)
  }

  // ฟังก์ชันดำเนินการอัพเกรดจริง
  const proceedWithUpgrade = async (plan) => {
    // Trigger callback to parent component to navigate to payment page
    if (typeof window !== 'undefined' && window.navigateToPayment) {
      window.navigateToPayment(plan)
    } else {
      // Fallback - emit custom event
      const event = new CustomEvent('navigateToPayment', { 
        detail: { plan, userId: currentUserId } 
      })
      window.dispatchEvent(event)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <RefreshCw className="h-12 w-12 text-pink-500 mr-4" />
          <div className="absolute inset-0 w-12 h-12 border-4 border-pink-200 rounded-full"></div>
        </div>
        <div className="mt-6 text-center">
          <span className="text-xl font-semibold gradient-text">Loading Premium Plans...</span>
          <div className="flex items-center justify-center mt-2">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-violet-400 rounded-full flex items-center justify-center mr-3 heart-beat">
              <Crown className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={fetchPlans} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          ลองใหม่
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header - Compact */}
      <div className="text-center">
        <div className="inline-flex items-center px-4 py-2 rounded-full glass-effect border border-white/30 text-pink-600 text-sm font-bold mb-4 shadow-lg">
          <Crown className="h-4 w-4 mr-2" />
          <span>เลือกแพ็กเกจสมาชิก 👑</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-3">
          Upgrade to Premium
        </h1>
        <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          เลือกแพ็กเกจที่เหมาะกับคุณ เพื่อปลดล็อกฟีเจอร์พิเศษและเพิ่มประสบการณ์การหาคู่ที่ดีที่สุด ✨
        </p>
      </div>

      {/* Popular Plans Highlight - Compact */}
      <div className="relative overflow-hidden modern-card rounded-2xl p-4 text-center shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-500 to-violet-500"></div>
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-8 -translate-x-8"></div>
        
        <div className="relative z-10 text-white">
          <div className="flex items-center justify-center mb-2">
            <Sparkles className="h-5 w-5 mr-2" />
            <span className="text-lg font-bold">Most Popular Plans 🔥</span>
          </div>
          <p className="text-pink-100 mb-3 text-sm">
            Gold & VIP Members get the best dating experience with premium features!
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <div className="glass-effect rounded-lg px-3 py-1 text-xs font-semibold">
              <Sparkles className="inline h-3 w-3 mr-1" />
              Full Features
            </div>
            <div className="glass-effect rounded-lg px-3 py-1 text-xs font-semibold">
              🎁 Bonus Rewards
            </div>
            <div className="glass-effect rounded-lg px-3 py-1 text-xs font-semibold">
              👑 VIP Status
            </div>
            <div className="glass-effect rounded-lg px-3 py-1 text-xs font-semibold">
              💎 Premium Support
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid - Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {plans
          .filter(plan => plan.tier !== 'test') // กรอง test tier ออก
          .map((plan) => (
            <MembershipCard
              key={plan.tier}
              plan={plan}
              isCurrentTier={plan.tier === currentTier}
              onUpgrade={handleUpgrade}
              isLoading={upgrading === plan.tier}
            />
          ))}
      </div>

      {/* Benefits Comparison - Premium Design */}
      <div id="benefits-comparison-table" className="relative overflow-hidden bg-gradient-to-br from-white via-pink-50/30 to-violet-50/30 backdrop-blur-md rounded-3xl p-6 md:p-8 border-2 border-pink-200/50 shadow-2xl">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-400/20 to-violet-400/20 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-rose-400/20 to-pink-400/20 rounded-full blur-3xl translate-y-24 -translate-x-24"></div>
        
        <div className="relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full text-white text-sm font-bold mb-3 shadow-lg">
              <Sparkles className="h-4 w-4" />
              <span>เปรียบเทียบสิทธิประโยชน์</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-pink-600 via-rose-600 to-violet-600 bg-clip-text text-transparent mb-2">
              รายละเอียดสมาชิก
            </h2>
            <p className="text-gray-600 text-sm md:text-base">ดูสิทธิประโยชน์ของแต่ละแพ็กเกจ</p>
          </div>
          
          <div className="overflow-x-auto rounded-2xl border-2 border-pink-100/50 shadow-inner bg-white/60 backdrop-blur-sm">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gradient-to-r from-pink-500 via-rose-500 to-violet-500">
                  <th className="text-left py-5 px-5 text-white font-bold text-sm md:text-base sticky left-0 bg-gradient-to-r from-pink-500 to-violet-500 z-20 shadow-lg border-r-2 border-white/20">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>ฟีเจอร์</span>
                    </div>
                  </th>
                  <th className="text-center py-5 px-4 text-white font-semibold text-sm md:text-base bg-gradient-to-b from-white/10 to-transparent">Member</th>
                  <th className="text-center py-5 px-4 text-white font-semibold text-sm md:text-base bg-gradient-to-b from-white/10 to-transparent">Silver</th>
                  <th className="text-center py-5 px-4 text-yellow-200 font-bold text-sm md:text-base bg-gradient-to-b from-yellow-300/20 to-transparent">Gold</th>
                  <th className="text-center py-5 px-4 text-purple-200 font-bold text-sm md:text-base bg-gradient-to-b from-purple-300/20 to-transparent">VIP</th>
                  <th className="text-center py-5 px-4 text-pink-200 font-bold text-sm md:text-base bg-gradient-to-b from-pink-300/20 to-transparent">VIP 1</th>
                  <th className="text-center py-5 px-4 text-amber-200 font-bold text-sm md:text-base bg-gradient-to-b from-amber-300/20 to-transparent">VIP 2</th>
                  <th className="text-center py-5 px-4 text-cyan-200 font-bold text-sm md:text-base bg-gradient-to-b from-cyan-300/20 to-transparent">Diamond</th>
                  <th className="text-center py-5 px-4 text-indigo-200 font-bold text-sm md:text-base bg-gradient-to-b from-indigo-300/20 to-transparent">Platinum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-100/50">
                <tr className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-violet-50/50 transition-all duration-200 group">
                  <td className="py-4 px-5 font-bold text-gray-800 sticky left-0 bg-white/95 backdrop-blur-sm z-10 shadow-lg border-r-2 border-pink-100 group-hover:bg-white transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💬</span>
                      <span className="text-sm md:text-base">แชทรายวัน</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-700 font-medium">10 คน</td>
                  <td className="text-center py-4 px-4 text-gray-700 font-medium">30 คน</td>
                  <td className="text-center py-4 px-4 text-yellow-600 font-bold">60 คน</td>
                  <td className="text-center py-4 px-4 text-purple-600 font-bold">120 คน</td>
                  <td className="text-center py-4 px-4 text-pink-600 font-bold">180 คน</td>
                  <td className="text-center py-4 px-4 text-amber-600 font-bold">300 คน</td>
                  <td className="text-center py-4 px-4 text-cyan-600 font-bold">500 คน</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      ∞ ไม่จำกัด
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-violet-50/50 transition-all duration-200 group">
                  <td className="py-4 px-5 font-bold text-gray-800 sticky left-0 bg-white/95 backdrop-blur-sm z-10 shadow-lg border-r-2 border-pink-100 group-hover:bg-white transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📸</span>
                      <span className="text-sm md:text-base">อัพโหลดรูป</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-700 font-medium">3 รูป</td>
                  <td className="text-center py-4 px-4 text-gray-700 font-medium">30 รูป</td>
                  <td className="text-center py-4 px-4 text-yellow-600 font-bold">50 รูป</td>
                  <td className="text-center py-4 px-4 text-purple-600 font-bold">100 รูป</td>
                  <td className="text-center py-4 px-4 text-pink-600 font-bold">150 รูป</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      ∞ ไม่จำกัด
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      ∞ ไม่จำกัด
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      ∞ ไม่จำกัด
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-violet-50/50 transition-all duration-200 group">
                  <td className="py-4 px-5 font-bold text-gray-800 sticky left-0 bg-white/95 backdrop-blur-sm z-10 shadow-lg border-r-2 border-pink-100 group-hover:bg-white transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎬</span>
                      <span className="text-sm md:text-base">อัพโหลดวิดีโอ</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-700 font-medium">1 คลิป</td>
                  <td className="text-center py-4 px-4 text-gray-700 font-medium">10 คลิป</td>
                  <td className="text-center py-4 px-4 text-yellow-600 font-bold">25 คลิป</td>
                  <td className="text-center py-4 px-4 text-purple-600 font-bold">50 คลิป</td>
                  <td className="text-center py-4 px-4 text-pink-600 font-bold">75 คลิป</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      ∞ ไม่จำกัด
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      ∞ ไม่จำกัด
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      ∞ ไม่จำกัด
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-gradient-to-r hover:from-yellow-50/50 hover:to-amber-50/50 transition-all duration-200 group bg-gradient-to-r from-yellow-50/30 to-amber-50/30">
                  <td className="py-4 px-5 font-bold text-gray-800 sticky left-0 bg-yellow-50/95 backdrop-blur-sm z-10 shadow-lg border-r-2 border-yellow-200 group-hover:bg-yellow-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💰</span>
                      <span className="text-sm md:text-base">โบนัสรายวัน</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-700 font-medium">500 เหรียญ</td>
                  <td className="text-center py-4 px-4 text-gray-700 font-medium">1,000 เหรียญ</td>
                  <td className="text-center py-4 px-4 text-yellow-600 font-bold">3,000 เหรียญ</td>
                  <td className="text-center py-4 px-4 text-purple-600 font-bold">8,000 เหรียญ</td>
                  <td className="text-center py-4 px-4 text-pink-600 font-bold">15,000 เหรียญ</td>
                  <td className="text-center py-4 px-4 text-amber-600 font-bold">30,000 เหรียญ</td>
                  <td className="text-center py-4 px-4 text-cyan-600 font-bold">50,000 เหรียญ</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      🎁 100,000 เหรียญ
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-violet-50/50 transition-all duration-200 group">
                  <td className="py-4 px-5 font-bold text-gray-800 sticky left-0 bg-white/95 backdrop-blur-sm z-10 shadow-lg border-r-2 border-pink-100 group-hover:bg-white transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">❤️</span>
                      <span className="text-sm md:text-base">คะแนนโหวต</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-400 font-medium">-</td>
                  <td className="text-center py-4 px-4 text-gray-700 font-medium">200</td>
                  <td className="text-center py-4 px-4 text-yellow-600 font-bold">500</td>
                  <td className="text-center py-4 px-4 text-purple-600 font-bold">1,000</td>
                  <td className="text-center py-4 px-4 text-pink-600 font-bold">1,500</td>
                  <td className="text-center py-4 px-4 text-amber-600 font-bold">3,000</td>
                  <td className="text-center py-4 px-4 text-cyan-600 font-bold">5,000</td>
                  <td className="text-center py-4 px-4 text-indigo-600 font-bold">15,000</td>
                </tr>
                <tr className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-violet-50/50 transition-all duration-200 group">
                  <td className="py-4 px-5 font-bold text-gray-800 sticky left-0 bg-white/95 backdrop-blur-sm z-10 shadow-lg border-r-2 border-pink-100 group-hover:bg-white transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎥</span>
                      <span className="text-sm md:text-base">วิดีโอโปรไฟล์</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-400 font-medium">-</td>
                  <td className="text-center py-4 px-4 text-gray-400 font-medium">-</td>
                  <td className="text-center py-4 px-4 text-yellow-600 font-bold">1</td>
                  <td className="text-center py-4 px-4 text-purple-600 font-bold">3</td>
                  <td className="text-center py-4 px-4 text-pink-600 font-bold">5</td>
                  <td className="text-center py-4 px-4 text-amber-600 font-bold">10</td>
                  <td className="text-center py-4 px-4 text-cyan-600 font-bold">15</td>
                  <td className="text-center py-4 px-4 text-indigo-600 font-bold">15</td>
                </tr>
                <tr className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-violet-50/50 transition-all duration-200 group">
                  <td className="py-4 px-5 font-bold text-gray-800 sticky left-0 bg-white/95 backdrop-blur-sm z-10 shadow-lg border-r-2 border-pink-100 group-hover:bg-white transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📌</span>
                      <span className="text-sm md:text-base">ปักหมุดโพสต์</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4 text-purple-600 font-bold">1</td>
                  <td className="text-center py-4 px-4 text-pink-600 font-bold">3</td>
                  <td className="text-center py-4 px-4 text-amber-600 font-bold">5</td>
                  <td className="text-center py-4 px-4 text-cyan-600 font-bold">20</td>
                  <td className="text-center py-4 px-4 text-indigo-600 font-bold">20</td>
                </tr>
                <tr className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-violet-50/50 transition-all duration-200 group">
                  <td className="py-4 px-5 font-bold text-gray-800 sticky left-0 bg-white/95 backdrop-blur-sm z-10 shadow-lg border-r-2 border-pink-100 group-hover:bg-white transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔒</span>
                      <span className="text-sm md:text-base">เบลอรูปภาพ</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4 text-purple-600 font-bold">3</td>
                  <td className="text-center py-4 px-4 text-pink-600 font-bold">5</td>
                  <td className="text-center py-4 px-4 text-amber-600 font-bold">10</td>
                  <td className="text-center py-4 px-4 text-cyan-600 font-bold">15</td>
                  <td className="text-center py-4 px-4 text-indigo-600 font-bold">15</td>
                </tr>
                <tr className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-violet-50/50 transition-all duration-200 group">
                  <td className="py-4 px-5 font-bold text-gray-800 sticky left-0 bg-white/95 backdrop-blur-sm z-10 shadow-lg border-r-2 border-pink-100 group-hover:bg-white transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💬</span>
                      <span className="text-sm md:text-base">สร้างห้องแชท</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4 text-purple-600 font-bold">10</td>
                  <td className="text-center py-4 px-4 text-pink-600 font-bold">20</td>
                  <td className="text-center py-4 px-4 text-amber-600 font-bold">30</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      ∞ ไม่จำกัด
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      ∞ ไม่จำกัด
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-violet-50/50 transition-all duration-200 group">
                  <td className="py-4 px-5 font-bold text-gray-800 sticky left-0 bg-white/95 backdrop-blur-sm z-10 shadow-lg border-r-2 border-pink-100 group-hover:bg-white transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      <span className="text-sm md:text-base">ติ๊กยืนยัน</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg shadow-md">✓</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg shadow-md">✓</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg shadow-md">✓</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg shadow-md">✓</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg shadow-md">✓</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg shadow-md">✓</span>
                  </td>
                </tr>
                <tr className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-violet-50/50 transition-all duration-200 group">
                  <td className="py-4 px-5 font-bold text-gray-800 sticky left-0 bg-white/95 backdrop-blur-sm z-10 shadow-lg border-r-2 border-pink-100 group-hover:bg-white transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👁️</span>
                      <span className="text-sm md:text-base">ซ่อนสถานะออนไลน์</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg shadow-md">✓</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg shadow-md">✓</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg shadow-md">✓</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg shadow-md">✓</span>
                  </td>
                </tr>
                <tr className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-violet-50/50 transition-all duration-200 group">
                  <td className="py-4 px-5 font-bold text-gray-800 sticky left-0 bg-white/95 backdrop-blur-sm z-10 shadow-lg border-r-2 border-pink-100 group-hover:bg-white transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📁</span>
                      <span className="text-sm md:text-base">อัพโหลดสื่อไม่จำกัด</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      ✓
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      ✓
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      ✓
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-violet-50/50 transition-all duration-200 group">
                  <td className="py-4 px-5 font-bold text-gray-800 sticky left-0 bg-white/95 backdrop-blur-sm z-10 shadow-lg border-r-2 border-pink-100 group-hover:bg-white transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💸</span>
                      <span className="text-sm md:text-base">โอนเหรียญ</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">✕</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      ✓
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full text-xs md:text-sm shadow-md">
                      ✓
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-gradient-to-r hover:from-yellow-50/50 hover:to-amber-50/50 transition-all duration-200 group bg-gradient-to-r from-yellow-50/30 to-amber-50/30">
                  <td className="py-4 px-5 font-bold text-gray-800 sticky left-0 bg-yellow-50/95 backdrop-blur-sm z-10 shadow-lg border-r-2 border-yellow-200 group-hover:bg-yellow-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎁</span>
                      <span className="text-sm md:text-base">โบนัสทันที</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-400 font-medium">-</td>
                  <td className="text-center py-4 px-4 text-gray-400 font-medium">-</td>
                  <td className="text-center py-4 px-4 text-gray-400 font-medium">-</td>
                  <td className="text-center py-4 px-4 text-gray-400 font-medium">-</td>
                  <td className="text-center py-4 px-4 text-gray-400 font-medium">-</td>
                  <td className="text-center py-4 px-4 text-gray-400 font-medium">-</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-white font-bold rounded-xl text-sm md:text-base shadow-lg animate-pulse">
                      🎁 100,000
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-white font-bold rounded-xl text-sm md:text-base shadow-lg animate-pulse">
                      🎁 100,000
                    </span>
                  </td>
                </tr>
            </tbody>
          </table>
        </div>
        </div>
      </div>

      {/* FAQ Section - Compact */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 text-center">
          คำถามที่พบบ่อย
        </h2>
        
        <div className="space-y-3">
          <div className="border-l-4 border-pink-500 pl-3">
            <h3 className="font-semibold text-slate-800 mb-1 text-sm">การชำระเงินปลอดภัยหรือไม่?</h3>
            <p className="text-slate-600 text-xs">
              เรามีระบบความปลอดภัยระดับสูง เข้ารหัสข้อมูลการชำระเงินทุกขั้นตอน และไม่เก็บข้อมูลบัตรเครดิตของคุณ
            </p>
          </div>
          
          <div className="border-l-4 border-blue-500 pl-3">
            <h3 className="font-semibold text-slate-800 mb-1 text-sm">สามารถยกเลิกสมาชิกได้หรือไม่?</h3>
            <p className="text-slate-600 text-xs">
              สมาชิกจะหมดอายุตามระยะเวลาที่กำหนด ไม่มีการต่ออายุอัตโนมัติ คุณสามารถใช้สิทธิ์ได้จนถึงวันหมดอายุ
            </p>
          </div>
          
          <div className="border-l-4 border-green-500 pl-3">
            <h3 className="font-semibold text-slate-800 mb-1 text-sm">เหรียญและคะแนนโหวตหมดอายุหรือไม่?</h3>
            <p className="text-slate-600 text-xs">
              เหรียญและคะแนนโหวตที่ได้รับจะไม่หมดอายุ คุณสามารถใช้ได้ตลอดแม้สมาชิกจะหมดอายุแล้ว
            </p>
          </div>
        </div>
      </div>

      {/* Downgrade Confirmation Dialog */}
      <Dialog open={showDowngradeConfirm} onOpenChange={setShowDowngradeConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg font-bold text-orange-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              ยืนยันการปรับระดับสมาชิก
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              คุณกำลังจะปรับระดับสมาชิกจากระดับที่สูงกว่าไปเป็นระดับที่ต่ำกว่า
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">ระดับปัจจุบัน:</span>
                <span className="text-sm font-bold text-orange-600">
                  {getTierDisplayName(currentTier)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">ระดับที่เลือก:</span>
                <span className="text-sm font-bold text-blue-600">
                  {selectedPlan ? getTierDisplayName(selectedPlan.tier) : ''}
                </span>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ การปรับระดับลงจะทำให้คุณสูญเสียสิทธิประโยชน์บางอย่างที่ได้รับจากระดับปัจจุบัน
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-gray-800 mb-4">
                คุณต้องการปรับระดับสมาชิกจริงหรือไม่?
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDowngradeConfirm(false)}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                setShowDowngradeConfirm(false)
                if (selectedPlan) {
                  proceedWithUpgrade(selectedPlan)
                }
              }}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              ยืนยัน
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MembershipPlans
