import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from './ui/button'
import { membershipAPI, membershipHelpers } from '../services/membershipAPI'
import { useToast } from './ui/toast'
import SpinWheelModal, { PrizeResultModal } from './SpinWheelModal'
import voteAPI, { voteHelpers } from '../services/voteAPI'
import { 
  Crown, 
  Coins, 
  Gift, 
  MessageCircle, 
  Image, 
  Video, 
  RefreshCw, 
  TrendingUp,
  Calendar,
  Star,
  Vote,
  Zap,
  Award,
  Timer
} from 'lucide-react'

const MembershipDashboard = ({ userId }) => {
  const [membershipData, setMembershipData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [error, setError] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [showSpinWheel, setShowSpinWheel] = useState(false)
  const retryTimeoutRef = useRef(null)
  const handleSocketReadyRef = useRef(null)
  const [showPrizeResult, setShowPrizeResult] = useState(false)
  const [wonPrize, setWonPrize] = useState(null)
  const [voteData, setVoteData] = useState({ totalVotes: 0, uniqueVoterCount: 0 }) // เพิ่ม state สำหรับข้อมูลโหวต
  const { success, error: showError } = useToast()

  // ฟังก์ชันสำหรับดึงข้อมูลผู้ใช้ล่าสุดจาก localStorage
  const getCurrentUserData = useCallback(() => {
    try {
      const userData = localStorage.getItem('user')
      return userData ? JSON.parse(userData) : null
    } catch (e) {
      console.error('Error parsing user data from localStorage:', e)
      return null
    }
  }, [])

  // ฟังก์ชันสำหรับดึงข้อมูลโหวตจาก VoteTransaction collection
  const fetchVoteData = useCallback(async () => {
    if (!userId) return

    try {
      console.log('🔄 Fetching vote data for user:', userId)
      const response = await voteAPI.getVoteStatus(userId, null, 'popularity_combined')
      
      if (response.success && response.data?.voteStats) {
        const voteStats = response.data.voteStats
        const totalVotes = voteStats.popularity_combined?.totalVotes || 0
        const uniqueVoterCount = voteStats.popularity_combined?.uniqueVoters || 0
        
        console.log('✅ Vote data fetched:', { totalVotes, uniqueVoterCount })
        setVoteData({ totalVotes, uniqueVoterCount })
      }
    } catch (error) {
      console.error('❌ Error fetching vote data:', error)
    }
  }, [userId])

  // อัปเดตข้อมูลเหรียญและโหวตแบบเรียลไทม์
  useEffect(() => {
    const updateUserData = () => {
      if (membershipData) {
        const currentUserData = getCurrentUserData()
        if (currentUserData) {
          const updatedData = {
            ...membershipData,
            coins: currentUserData.coins || membershipData.coins,
            votePoints: currentUserData.votePoints || membershipData.votePoints
          }

          // อัปเดตเฉพาะถ้ามีการเปลี่ยนแปลง
          if (updatedData.coins !== membershipData.coins || updatedData.votePoints !== membershipData.votePoints) {
            console.log('🔄 Updating membership data with latest user data:', {
              oldCoins: membershipData.coins,
              newCoins: updatedData.coins,
              oldVotePoints: membershipData.votePoints,
              newVotePoints: updatedData.votePoints
            })
            setMembershipData(updatedData)
          }
        }
      }
    }

    // ตรวจสอบทุก 1 วินาที
    const interval = setInterval(updateUserData, 1000)
    return () => clearInterval(interval)
  }, [membershipData, getCurrentUserData])

  // อัปเดตข้อมูลโหวตแบบ real-time เมื่อมีการโหวตหรือหมุนวงล้อ
  useEffect(() => {
    const handleVoteUpdate = (data) => {
      console.log('📡 MembershipDashboard - Received vote-updated event:', data)
      
      // ตรวจสอบว่าเป็นคะแนนโหวตของผู้ใช้คนนี้หรือไม่
      if (data.candidateId === userId) {
        console.log('🔄 Updating vote data for current user:', userId)
        fetchVoteData() // ดึงข้อมูลโหวตใหม่
      }
    }

    // ใช้ global socketManager แทนการสร้าง connection ใหม่
    const setupSocketListener = () => {
      if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
        console.log('🔌 MembershipDashboard - Setting up socket listener on existing socket:', window.socketManager.socket.id)
        window.socketManager.socket.on('vote-updated', handleVoteUpdate)
        return true
      }
      return false
    }

    // ลองตั้งค่า listener ทันที
    let listenerSetup = setupSocketListener()
    
    // ถ้า socket ยังไม่พร้อม ให้รอ event 'socketReady' แทนการ polling
    if (!listenerSetup) {
      handleSocketReadyRef.current = () => {
        if (setupSocketListener()) {
          if (handleSocketReadyRef.current) {
            window.removeEventListener('socketReady', handleSocketReadyRef.current)
            handleSocketReadyRef.current = null
          }
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current)
            retryTimeoutRef.current = null
          }
        }
      }
      
      window.addEventListener('socketReady', handleSocketReadyRef.current)
      
      // Timeout fallback หลังจาก 30 วินาที
      retryTimeoutRef.current = setTimeout(() => {
        if (handleSocketReadyRef.current) {
          window.removeEventListener('socketReady', handleSocketReadyRef.current)
          handleSocketReadyRef.current = null
        }
        // ลองอีกครั้งก่อน timeout
        setupSocketListener()
      }, 30000)
    }

    // Cleanup
    return () => {
      if (window.socketManager && window.socketManager.socket) {
        window.socketManager.socket.off('vote-updated', handleVoteUpdate)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (handleSocketReadyRef.current) {
        window.removeEventListener('socketReady', handleSocketReadyRef.current)
      }
    }
  }, [userId, fetchVoteData])

  // ดึงข้อมูลโหวตเมื่อ component mount
  useEffect(() => {
    fetchVoteData()
  }, [fetchVoteData])

  // ดึงข้อมูลสมาชิกพร้อม retry mechanism
  const fetchMembershipData = useCallback(async (retryCount = 0) => {
    if (!userId) {
      setLoading(false)
      setError('กรุณาเข้าสู่ระบบก่อน')
      return
    }

    try {
      setLoading(true)

      // ดึงข้อมูลจาก localStorage ก่อน (ข้อมูลล่าสุด)
      const localStorageUser = localStorage.getItem('user')
      let localUserData = null
      if (localStorageUser) {
        try {
          localUserData = JSON.parse(localStorageUser)
        } catch (e) {
          console.error('Error parsing localStorage user data:', e)
        }
      }

      // ดึงข้อมูลจาก API
      const response = await membershipAPI.getUserMembership(userId)
      const apiData = response.data.data

      // ใช้ข้อมูลจาก API เป็นหลัก (ไม่ใช้ localStorage แทน)
      // เพราะข้อมูลจาก API เป็นข้อมูลล่าสุดจากฐานข้อมูล
      console.log('🔄 Fetched membership data from API:', {
        coins: apiData.coins,
        votePoints: apiData.votePoints,
        membershipTier: apiData.membershipTier,
        localCoins: localUserData?.coins,
        localVotePoints: localUserData?.votePoints
      })

      // อัพเดต localStorage ด้วยข้อมูลจาก API เพื่อให้ sync
      if (localUserData && apiData) {
        const syncedUser = {
          ...localUserData,
          coins: apiData.coins ?? localUserData.coins ?? 0,
          votePoints: apiData.votePoints ?? localUserData.votePoints ?? 0,
          membership: {
            ...(localUserData.membership || {}),
            tier: apiData.membershipTier ?? localUserData.membership?.tier
          }
        }
        localStorage.setItem('user', JSON.stringify(syncedUser))
        
        // อัพเดต AuthContext ด้วยข้อมูลที่ sync แล้ว
        if (typeof window !== 'undefined' && window.updateAuthContext) {
          window.updateAuthContext(syncedUser)
        }
      }

      setMembershipData(apiData)
      setError(null)
    } catch (err) {
      console.error('Error fetching membership data:', err)
      
      // Retry mechanism สำหรับ network errors
      if (retryCount < 3 && (err.code === 'ECONNABORTED' || err.message.includes('timeout'))) {
        console.log(`🔄 Retrying membership data fetch (attempt ${retryCount + 1}/3)...`)
        setTimeout(() => {
          fetchMembershipData(retryCount + 1)
        }, 2000 * (retryCount + 1)) // Exponential backoff
        return
      }
      
      setError(err.response?.data?.message || 'ไม่สามารถดึงข้อมูลสมาชิกได้')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // รับโบนัสรายวัน
  const claimDailyBonus = async () => {
    try {
      setActionLoading(prev => ({ ...prev, dailyBonus: true }))
      
      // ดึงข้อมูลเหรียญปัจจุบันก่อน
      const currentUserData = getCurrentUserData()
      const oldCoins = currentUserData?.coins || 0
      
      const response = await membershipAPI.claimDailyBonus(userId)
      
      if (response.data.success && response.data.data) {
        const bonusAmount = response.data.data.bonusAmount
        const totalCoins = response.data.data.totalCoins // ใช้ข้อมูลจาก API response โดยตรง
        
        if (totalCoins === undefined || totalCoins === null) {
          console.warn('⚠️ totalCoins is undefined, using fallback calculation')
          // Fallback: คำนวณจาก oldCoins + bonusAmount ถ้า API ไม่ส่ง totalCoins มา
          const fallbackCoins = (oldCoins || 0) + (bonusAmount || 0)
          console.warn('⚠️ Using fallback calculation:', { oldCoins, bonusAmount, fallbackCoins })
        }
        
        // ใช้ข้อมูลจาก API response เป็นหลัก (ไม่ใช้ fallback ถ้า API ส่งมาถูกต้อง)
        const finalCoins = totalCoins !== undefined && totalCoins !== null ? totalCoins : ((oldCoins || 0) + (bonusAmount || 0))
        
        console.log('✅ Daily bonus claimed:', {
          oldCoins,
          bonusAmount,
          totalCoinsFromAPI: totalCoins,
          finalCoins,
          apiResponse: response.data.data
        })
        
        // อัพเดต localStorage ด้วยข้อมูลจาก API
        if (currentUserData) {
          const updatedUser = {
            ...currentUserData,
            coins: finalCoins
          }
          localStorage.setItem('user', JSON.stringify(updatedUser))
          
          // อัพเดต AuthContext ถ้ามี
          if (typeof window !== 'undefined' && window.updateAuthContext) {
            window.updateAuthContext(updatedUser)
          }
          
          // อัพเดต state ทันที
          setMembershipData(prev => ({
            ...prev,
            coins: finalCoins
          }))
        }
        
        // อัพเดตข้อมูลใหม่จาก API (เพื่อให้แน่ใจว่าข้อมูลตรงกัน)
        await fetchMembershipData()
        
        // แสดงข้อความสำเร็จ
        success(`ได้รับโบนัส ${bonusAmount.toLocaleString()} เหรียญแล้ว! (รวม ${finalCoins.toLocaleString()} เหรียญ)`)
      }
    } catch (err) {
      console.error('Error claiming daily bonus:', err)
      showError(err.response?.data?.message || 'ไม่สามารถรับโบนัสได้')
    } finally {
      setActionLoading(prev => ({ ...prev, dailyBonus: false }))
    }
  }

  // เปิด modal วงล้อหมุน
  const openSpinWheel = () => {
    setShowSpinWheel(true)
  }

  // หมุนวงล้อของขวัญ
  const spinWheel = async () => {
    try {
      setActionLoading(prev => ({ ...prev, spinWheel: true }))
      
      // ดึงข้อมูลปัจจุบันก่อน
      const currentUserData = getCurrentUserData()
      const oldCoins = currentUserData?.coins || 0
      const oldVotePoints = currentUserData?.votePoints || 0
      
      const response = await membershipAPI.spinWheel(userId)
      
      if (response.data.success && response.data.data) {
        const prize = response.data.data.prize
        const totalCoins = response.data.data.totalCoins
        const totalVotePoints = response.data.data.totalVotePoints
        
        // อัพเดต localStorage และ UI ทันทีโดยใช้ข้อมูลจาก API response
        if (currentUserData) {
          let updatedUser = { ...currentUserData }
          
          // ใช้ข้อมูลจาก API response โดยตรงเพื่อให้แน่ใจว่าข้อมูลตรงกับ backend
          if (totalCoins !== undefined) {
            updatedUser.coins = totalCoins
          }
          if (totalVotePoints !== undefined) {
            updatedUser.votePoints = totalVotePoints
          }
          
          console.log('✅ Spin wheel reward:', {
            prize,
            oldCoins,
            oldVotePoints,
            newCoins: totalCoins,
            newVotePoints: totalVotePoints
          })
          
          localStorage.setItem('user', JSON.stringify(updatedUser))
          
          // อัพเดต AuthContext ถ้ามี
          if (typeof window !== 'undefined' && window.updateAuthContext) {
            window.updateAuthContext(updatedUser)
          }
          
          // อัพเดต state ทันที
          setMembershipData(prev => ({
            ...prev,
            coins: totalCoins !== undefined ? totalCoins : prev.coins,
            votePoints: totalVotePoints !== undefined ? totalVotePoints : prev.votePoints
          }))
          
          // อัพเดตข้อมูลโหวตถ้าเป็น votePoints หรือ grand
          if (prize.type === 'votePoints' || prize.type === 'grand') {
            setTimeout(() => {
              fetchVoteData()
            }, 500)
          }
        }
        
        // อัพเดตข้อมูลใหม่จาก API (เพื่อให้แน่ใจว่าข้อมูลตรงกัน)
        await fetchMembershipData()
        
        // แสดงรางวัลที่ได้
        setWonPrize(prize)
        setShowPrizeResult(true)
        
        // แสดงข้อความสำเร็จ
        if (prize.type === 'grand') {
          success(`ยินดีด้วย! คุณได้รับรางวัลใหญ่: ${prize.coins.toLocaleString()} เหรียญ + ${prize.votePoints.toLocaleString()} โหวต`)
        } else if (prize.type === 'coins') {
          success(`ยินดีด้วย! คุณได้รับ ${prize.amount.toLocaleString()} เหรียญ (รวม ${(oldCoins + prize.amount).toLocaleString()} เหรียญ)`)
        } else if (prize.type === 'votePoints') {
          success(`ยินดีด้วย! คุณได้รับ ${prize.amount.toLocaleString()} โหวต`)
        }
        
        return prize
      }
    } catch (err) {
      console.error('Error spinning wheel:', err)
      
      // ไม่แสดง error message ที่นี่ เพราะ SpinWheelModal จะจัดการเอง
      // แต่จะโยน error ต่อเพื่อให้ SpinWheelModal จัดการ
      throw err
    } finally {
      setActionLoading(prev => ({ ...prev, spinWheel: false }))
    }
  }

  // การนับถอยหลัง
  useEffect(() => {
    if (!membershipData?.membershipExpiry || membershipData?.membershipTier === 'member') {
      setTimeRemaining(membershipHelpers.getTimeRemaining(membershipData?.membershipExpiry, membershipData?.membershipTier))
      return
    }

    const updateTimeRemaining = () => {
      const result = membershipHelpers.getTimeRemainingDetailed(membershipData.membershipExpiry, membershipData.membershipTier)
      setTimeRemaining(result.text)
      
      // ถ้าหมดอายุแล้ว ให้รีเฟรชข้อมูล
      if (result.isExpired) {
        fetchMembershipData()
      }
    }

    // อัพเดตทันที
    updateTimeRemaining()

    // อัพเดตทุกวินาที
    const interval = setInterval(updateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [membershipData?.membershipExpiry, membershipData?.membershipTier, fetchMembershipData])

  useEffect(() => {
    fetchMembershipData()
  }, [userId])

  // Listen for user data updates (e.g., after tier upgrade)
  useEffect(() => {
    const handleUserDataUpdated = (event) => {
      const updatedUser = event.detail;
      console.log('🔄 [MembershipDashboard] User data updated event received:', {
        coins: updatedUser?.coins,
        votePoints: updatedUser?.votePoints,
        membershipTier: updatedUser?.membership?.tier,
        isVerified: updatedUser?.isVerified
      });
      
      // If membership tier, coins, or votePoints changed, refetch membership data
      if (updatedUser) {
        // ตรวจสอบว่า membershipData ไม่เป็น null ก่อน
        if (!membershipData) {
          console.log('🔄 [MembershipDashboard] membershipData is null, fetching membership data...');
          fetchMembershipData();
          return;
        }

        const tierChanged = updatedUser.membership?.tier && membershipData.membershipTier && 
                           updatedUser.membership.tier !== membershipData.membershipTier;
        const coinsChanged = updatedUser.coins !== undefined && updatedUser.coins !== membershipData.coins;
        const votePointsChanged = updatedUser.votePoints !== undefined && updatedUser.votePoints !== membershipData.votePoints;
        
        if (tierChanged || coinsChanged || votePointsChanged) {
          console.log('🔄 [MembershipDashboard] Data changed, refetching membership data...', {
            tierChanged: tierChanged ? { before: membershipData.membershipTier, after: updatedUser.membership.tier } : false,
            coinsChanged: coinsChanged ? { before: membershipData.coins, after: updatedUser.coins } : false,
            votePointsChanged: votePointsChanged ? { before: membershipData.votePoints, after: updatedUser.votePoints } : false
          });
          fetchMembershipData();
        }
      }
    };

    const handleRefreshUserData = () => {
      console.log('🔄 [MembershipDashboard] Refresh user data event received');
      fetchMembershipData();
    };

    window.addEventListener('userDataUpdated', handleUserDataUpdated);
    window.addEventListener('refreshUserData', handleRefreshUserData);

    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdated);
      window.removeEventListener('refreshUserData', handleRefreshUserData);
    };
  }, [fetchMembershipData, membershipData?.membershipTier])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 text-pink-500 mr-3" />
        <span className="text-lg text-slate-600">กำลังโหลดข้อมูลสมาชิก...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={fetchMembershipData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          ลองใหม่
        </Button>
      </div>
    )
  }

  const { membershipTier, membershipExpiry, coins, votePoints, dailyUsage, limits, isActive, totalSpinWheelVotePoints } = membershipData

  return (
    <div className="space-y-6">
      {/* Information Banner - Elegant Design */}
      <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800 text-sm md:text-base">ข้อมูลเหรียญและโหวตอัปเดตแบบเรียลไทม์</p>
            <p className="text-xs md:text-sm text-gray-500 mt-1">ข้อมูลจะอัปเดตอัตโนมัติเมื่อมีการเปลี่ยนแปลง</p>
          </div>
        </div>
      </div>

      {/* Elegant Membership Status Card */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br ${membershipHelpers.getTierGradient(membershipTier)} flex items-center justify-center text-2xl md:text-3xl shadow-lg`}>
              {membershipHelpers.getTierIcon(membershipTier)}
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {membershipHelpers.getTierName(membershipTier)}
              </h2>
              {(() => {
                // ตรวจสอบการหมดอายุโดยตรงจากข้อมูล
                const now = new Date();
                const expiry = membershipExpiry ? new Date(membershipExpiry) : null;
                const isExpired = expiry && now >= expiry;
                
                if (membershipTier === 'member') {
                  return (
                    <>
                      <div className="flex items-center text-gray-500 mb-1">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span className="font-medium text-sm">ไม่มีวันหมดอายุ</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        ระยะเวลา: {membershipHelpers.getMembershipDuration(membershipTier)}
                      </div>
                    </>
                  );
                } else if (isExpired) {
                  return (
                    <>
                      <div className="flex items-center text-red-600 mb-1">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span className="font-semibold text-sm">หมดอายุแล้ว</span>
                      </div>
                      <div className="text-xs text-red-500">
                        สมาชิกหมดอายุแล้ว - เปลี่ยนเป็น Member ธรรมดา
                      </div>
                    </>
                  );
                } else {
                  return (
                    <>
                      <div className="flex items-center text-gray-700 mb-1">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span className="font-semibold text-sm">
                          {timeRemaining || membershipHelpers.getTimeRemaining(membershipExpiry, membershipTier)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        ระยะเวลา: {membershipHelpers.getMembershipDuration(membershipTier)}
                      </div>
                    </>
                  );
                }
              })()}
            </div>
          </div>
          
          <div className="w-full md:w-auto">
            <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold ${
              isActive 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {isActive ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>ใช้งานได้</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  <span>หมดอายุ</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Elegant Coins and Points Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-sm">
                  <Coins className="h-6 w-6 text-white" />
                </div>
                <span className="text-gray-700 font-semibold">เหรียญ</span>
              </div>
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {membershipHelpers.formatCoins(coins)}
            </div>
            {!membershipData.canClaimDailyBonus && (
              <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm">
                <Timer className="h-4 w-4" />
                <span>รอ 24 ชั่วโมง</span>
              </div>
            )}
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-sm">
                  <Vote className="h-6 w-6 text-white" />
                </div>
                <span className="text-gray-700 font-semibold">คะแนนโหวต</span>
              </div>
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {voteHelpers.formatVoteCount(voteData.totalVotes || 0)}
            </div>
            {(!membershipData.canSpinWheel && membershipData.role !== 'superadmin' && membershipData.role !== 'admin') && (
              <div className="mt-3 flex items-center gap-2 text-purple-600 text-sm">
                <Zap className="h-4 w-4" />
                <span>รอ 24 ชั่วโมง</span>
              </div>
            )}
          </div>
        </div>

        {/* Spin Wheel Vote Points */}
        {totalSpinWheelVotePoints > 0 && (
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 mb-6 border border-yellow-200 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center shadow-sm">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-gray-700 font-semibold text-sm">คะแนนโหวตจากวงล้อ</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {totalSpinWheelVotePoints.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Elegant Daily Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={claimDailyBonus}
            disabled={actionLoading.dailyBonus || !membershipData.canClaimDailyBonus}
            className="bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold px-6 py-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-center gap-3">
              {actionLoading.dailyBonus ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Gift className="h-5 w-5" />
              )}
              <span>{membershipData.canClaimDailyBonus ? `รับโบนัส ${limits.dailyBonus?.toLocaleString()}` : 'รอ 24 ชม.'}</span>
            </div>
          </Button>
          
          <Button
            onClick={openSpinWheel}
            disabled={actionLoading.spinWheel || (!membershipData.canSpinWheel && membershipData.role !== 'superadmin' && membershipData.role !== 'admin')}
            className="bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold px-6 py-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-center gap-3">
              {actionLoading.spinWheel ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Zap className="h-5 w-5" />
              )}
              <span>{(membershipData.role === 'superadmin' || membershipData.role === 'admin') ? 'หมุนวงล้อ (ไม่จำกัด)' : (membershipData.canSpinWheel ? 'หมุนวงล้อ' : 'รอ 24 ชม.')}</span>
            </div>
          </Button>
        </div>

        {/* Timer Display */}
        {(!membershipData.canClaimDailyBonus || (!membershipData.canSpinWheel && membershipData.role !== 'superadmin' && membershipData.role !== 'admin')) && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Timer className="h-4 w-4" />
              <span>
                {!membershipData.canClaimDailyBonus && !membershipData.canSpinWheel && membershipData.role !== 'superadmin' && membershipData.role !== 'admin'
                  ? 'รอ 24 ชั่วโมงเพื่อรับโบนัสและหมุนวงล้ออีกครั้ง'
                  : !membershipData.canClaimDailyBonus 
                    ? 'รอ 24 ชั่วโมงเพื่อรับโบนัสอีกครั้ง'
                    : (membershipData.role !== 'superadmin' && membershipData.role !== 'admin') ? 'รอ 24 ชั่วโมงเพื่อหมุนวงล้ออีกครั้ง' : ''
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Elegant Daily Usage Stats */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900">
            การใช้งานวันนี้
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Chat Usage */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <span className="text-gray-700 font-medium text-sm">แชท</span>
              </div>
              <span className="text-gray-900 font-bold text-sm">
                {limits.dailyChats === -1 ? 'ไม่จำกัด' : `${dailyUsage.chatCount}/${limits.dailyChats}`}
              </span>
            </div>
            {limits.dailyChats !== -1 && (
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min((dailyUsage.chatCount / limits.dailyChats) * 100, 100)}%` 
                  }}
                />
              </div>
            )}
          </div>

          {/* Image Upload Usage */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Image className="h-4 w-4 text-white" />
                </div>
                <span className="text-gray-700 font-medium text-sm">รูปภาพ</span>
              </div>
              <span className="text-gray-900 font-bold text-sm">
                {limits.dailyImages === -1 ? 'ไม่จำกัด' : `${dailyUsage.imageUploadCount}/${limits.dailyImages}`}
              </span>
            </div>
            {limits.dailyImages !== -1 && (
              <div className="w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min((dailyUsage.imageUploadCount / limits.dailyImages) * 100, 100)}%` 
                  }}
                />
              </div>
            )}
          </div>

          {/* Video Upload Usage */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Video className="h-4 w-4 text-white" />
                </div>
                <span className="text-gray-700 font-medium text-sm">วิดีโอ</span>
              </div>
              <span className="text-gray-900 font-bold text-sm">
                {limits.dailyVideos === -1 ? 'ไม่จำกัด' : `${dailyUsage.videoUploadCount}/${limits.dailyVideos}`}
              </span>
            </div>
            {limits.dailyVideos !== -1 && (
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min((dailyUsage.videoUploadCount / limits.dailyVideos) * 100, 100)}%` 
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Elegant Membership Benefits */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
            <Award className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900">
            สิทธิประโยชน์ของคุณ
          </h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all duration-300">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div className="text-gray-600 text-sm mb-1">แชทรายวัน</div>
              <div className="text-gray-900 font-bold text-lg">
                {limits.dailyChats === -1 ? 'ไม่จำกัด' : `${limits.dailyChats} คน`}
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100 hover:border-green-300 hover:shadow-md transition-all duration-300">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Image className="h-6 w-6 text-white" />
              </div>
              <div className="text-gray-600 text-sm mb-1">อัพโหลดรูป</div>
              <div className="text-gray-900 font-bold text-lg">
                {limits.dailyImages === -1 ? 'ไม่จำกัด' : `${limits.dailyImages} รูป`}
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all duration-300">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Video className="h-6 w-6 text-white" />
              </div>
              <div className="text-gray-600 text-sm mb-1">อัพโหลดวิดีโอ</div>
              <div className="text-gray-900 font-bold text-lg">
                {limits.dailyVideos === -1 ? 'ไม่จำกัด' : `${limits.dailyVideos} คลิป`}
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all duration-300">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div className="text-gray-600 text-sm mb-1">หมุนวงล้อ</div>
              <div className="text-gray-900 font-bold text-lg">
                {(() => {
                  const spinInterval = limits.spinInterval;
                  if (spinInterval === -1) return 'ไม่จำกัด';
                  const hours = Math.floor(spinInterval / (1000 * 60 * 60));
                  const minutes = Math.floor((spinInterval % (1000 * 60 * 60)) / (1000 * 60));
                  if (hours > 0) {
                    return minutes > 0 ? `ทุก ${hours} ชม` : `ทุก ${hours} ชม`;
                  } else {
                    return `ทุก ${minutes} นาที`;
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

             {/* Spin Wheel Modal */}
       <SpinWheelModal
         isOpen={showSpinWheel}
         onClose={() => setShowSpinWheel(false)}
         onSpin={spinWheel}
         isLoading={actionLoading.spinWheel}
         canSpin={membershipData?.canSpinWheel}
         userRole={membershipData?.role}
       />
       
       {/* Prize Result Modal */}
       <PrizeResultModal
         isOpen={showPrizeResult}
         onClose={() => {
           setShowPrizeResult(false)
           setWonPrize(null)
         }}
         prize={wonPrize}
       />
    </div>
  )
}

export default MembershipDashboard
