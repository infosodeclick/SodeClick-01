import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "./ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { rabbitAPI, rabbitHelpers } from "../services/rabbitAPI"
import settingsAPI from "../services/settingsAPI"
import { membershipAPI } from "../services/membershipAPI"
import { paymentAPI } from "../services/paymentAPI"

import { 
  ArrowLeft, 
  Smartphone, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Crown,
  Star,
  QrCode,
  Lock,
  Zap,
  Copy,
  RefreshCw,
  Timer
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface PaymentData {
  payment_id?: string;
  transaction_id?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  planId?: string;
  planTier?: string;
  planName?: string;
  userId?: string;
  status?: string;
  createdAt?: Date;
  expiryTime?: Date;
  qr_image?: string;
  qr_image_url?: string;
  qr_code_url?: string;
  vendor_qr_code?: string;
  url?: string;
  short_url?: string;
  transaction_url?: string;
  timeRemaining?: number;
  debug?: {
    hasQrImage?: boolean;
    hasQrCodeUrl?: boolean;
    hasVendorQrCode?: boolean;
    qrImageLength?: number;
    qrCodeUrlLength?: number;
    vendorQrCodeLength?: number;
  };
}

const PaymentGateway = ({ plan, onBack, onSuccess, onCancel }) => {
  const { user } = useAuth()
  const [processing, setProcessing] = useState(false)
  const [qrData, setQrData] = useState<PaymentData | null>(null)
  
  
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [timeRemaining, setTimeRemaining] = useState(300000) // 5 นาที
  const [currentTransaction, setCurrentTransaction] = useState<PaymentData | null>(null)
  const paymentCheckIntervalRef = useRef<number | null>(null)
  const paymentCheckAttemptsRef = useRef(0)
  const paymentStatusRef = useRef('pending')
  const [bypassMode, setBypassMode] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)

  // useRef สำหรับ QR Code element
  const qrCodeRef = useRef<HTMLDivElement>(null)
  const paymentFinalizedRef = useRef(false)
  const lastPaymentResultRef = useRef<any>(null)

  // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  // ระดับชั้นและราคาที่ตรงกัน (ใช้เป็น fallback เท่านั้น)
  const tierPricing = {
    member: { amount: 0, currency: 'THB', name: 'สมาชิกฟรี' },
    silver: { amount: 20, currency: 'THB', name: 'Silver Member' },
    gold: { amount: 50, currency: 'THB', name: 'Gold Member' },
    vip: { amount: 100, currency: 'THB', name: 'VIP Member' },
    vip1: { amount: 150, currency: 'THB', name: 'VIP 1' },
    vip2: { amount: 300, currency: 'THB', name: 'VIP 2' },
    diamond: { amount: 500, currency: 'THB', name: 'Diamond Member' },
    platinum: { amount: 1000, currency: 'THB', name: 'Platinum Member' },
    coin_package: { amount: plan?.price || 0, currency: 'THB', name: plan?.name || 'แพ็กเกจเหรียญ' }
  }

  // Timer สำหรับ QR Code - หมดอายุใน 5 นาที
  useEffect(() => {
    if (qrData && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1000) {
            setPaymentStatus('expired')
            return 0
          }
          return prev - 1000
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [qrData]) // ใช้ qrData เป็น dependency เพื่อให้ timer เริ่มเมื่อมี QR code

  // ไม่ใช้ Auto Polling - ให้ผู้ใช้กดตรวจสอบสถานะเอง
  // useEffect(() => {
  //   if (qrData && paymentStatus === 'pending') {
  //     const interval = setInterval(async () => {
  //       try {
  //         // ใช้ rabbitAPI service
  //         const data = await rabbitAPI.checkPaymentStatus(qrData.payment_id)
  //         
  //         console.log('🔍 Payment status check:', data)
  //         
  //         if (data.status === 'completed') {
  //           setPaymentStatus('completed')
  //           
  //           // สร้าง transaction data สำหรับ PaymentSuccess
  //           const successData = {
  //             ...currentTransaction,
  //             paymentMethod: 'rabbit_gateway',
  //             timestamp: new Date().toISOString(),
  //             status: 'completed',
  //             transactionId: data.payment_id,
  //             amount: data.amount,
  //             currency: data.currency,
  //             tier: plan.tier // เพิ่ม tier สำหรับการอัพเกรดสมาชิก
  //           }
  //           
  //           console.log('🎉 Payment completed! Sending success data:', successData)
  //           onSuccess && onSuccess(successData)
  //           clearInterval(interval)
  //         } else if (data.status === 'failed') {
  //           setPaymentStatus('failed')
  //           clearInterval(interval)
  //         } else if (data.status === 'expired') {
  //           setPaymentStatus('expired')
  //           clearInterval(interval)
  //         }
  //       } catch (error) {
  //         console.error('Error checking payment status:', error)
  //       }
  //     }, 5000) // ตรวจสอบทุก 5 วินาที
  //     
  //     return () => clearInterval(interval)
  //   }
  // }, [paymentStatus, onSuccess]) // ลบ qrData ออกเพื่อไม่ให้ re-run เมื่อ qrData เปลี่ยน


  // ตรวจสอบและโหลด QR data จาก localStorage เมื่อ component mount
  useEffect(() => {
    const qrKey = `qr-${plan.id}-${user?._id || user?.id}`
    const savedQRData = localStorage.getItem(qrKey)
    
    if (savedQRData) {
      try {
        const parsedData = JSON.parse(savedQRData)
        setQrData(parsedData)
        setPaymentStatus(parsedData.status || 'pending')
        setTimeRemaining(parsedData.timeRemaining || 300000)
      } catch (error) {
        console.error('Error parsing saved QR data:', error)
        localStorage.removeItem(qrKey)
      }
    } else {
      // ลบ QR data เก่าเมื่อไม่มี saved data
      setQrData(null)
      setPaymentStatus('idle')
      setTimeRemaining(0)
    }
    
    // สร้าง QR ใหม่ทันทีเมื่อเข้ามาหน้า (Auto Generate)
    if (!processing) {
      checkBypassMode()
    }
  }, [plan?.id, plan?.tier]) // เพิ่ม plan.tier เป็น dependency ด้วย

  // Auto scroll ทันทีเมื่อเข้ามาหน้า Payment (ไม่รอ QR Code)
  useEffect(() => {
    // เลื่อนลงล่างสุดทันทีเมื่อเข้ามาหน้า
    const scrollToBottom = () => {
      // ใช้ window.innerHeight + window.scrollY เพื่อให้แน่ใจว่าเลื่อนไปสุดจอ
      const scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      )
      
      // เลื่อนไปยังตำแหน่งที่สูงที่สุด
      window.scrollTo({
        top: scrollHeight,
        left: 0,
        behavior: 'smooth'
      })
    }
    
    // เลื่อนครั้งเดียวหลังจาก 1000ms
    setTimeout(scrollToBottom, 1000)
  }, []) // รันครั้งเดียวเมื่อเข้ามาหน้า

  // ตรวจสอบ bypass mode
  const checkBypassMode = async () => {
    try {
      // ตรวจสอบการตั้งค่า bypass จาก API (จะ sync กับ localStorage อัตโนมัติ)
      const result = await settingsAPI.checkPaymentBypassStatus()

      console.log(`🔄 Payment bypass mode from ${result.source}:`, result.enabled)

      if (result.enabled) {
        setBypassMode(true)
        bypassPayment()
      } else {
        setBypassMode(false)
        createRabbitPayment()
      }
    } catch (error) {
      console.error('Error checking bypass mode:', error)

      // Fallback ไปใช้ localStorage ถ้า API ไม่พร้อมใช้งาน
      const bypassEnabled = localStorage.getItem('payment_bypass_enabled') === 'true'
      console.log('💳 Fallback to localStorage - Normal payment mode:', bypassEnabled)

      if (bypassEnabled) {
        setBypassMode(true)
        bypassPayment()
      } else {
        setBypassMode(false)
        createRabbitPayment()
      }
    }
  }

  // Bypass payment (สำหรับการทดสอบหรือ admin)
  // แก้ไขให้เรียก backend API เหมือนการชำระเงินจริง เพื่อให้ผลลัพธ์สอดคล้องกัน
  const bypassPayment = async () => {
    try {
      setProcessing(true)

      console.log('🔄 Bypass payment mode activated for:', {
        planTier: plan.tier,
        planName: plan.name,
        userId: user?._id || user?.id
      })

      // ตาม RABBIT_GATEWAY_INTEGRATION_SUMMARY.md line 501-507
      const pricing = tierPricing[plan.tier] || tierPricing.vip
      const orderId = rabbitHelpers.generateOrderId()

      // สำหรับ coin package ใช้ plan.price โดยตรง
      const amount = plan.tier === 'coin_package' ? plan.price : pricing.amount

      // สร้าง transaction data สำหรับ bypass
      const transaction = {
        id: `bypass-${Date.now()}`,
        transactionId: `bypass-${Date.now()}`,
        orderId: orderId,
        amount: amount,
        currency: 'THB',
        planId: plan.id || plan._id,
        planTier: plan.tier,
        planName: plan.name,
        userId: user?._id || user?.id,
        status: 'completed',
        createdAt: new Date(),
        expiryTime: new Date(Date.now() + 5 * 60 * 1000) // 5 นาที
      }

      setCurrentTransaction(transaction)

      // สร้าง payment result แบบ bypass (เหมือน Rabbit Gateway response)
      const pseudoResult = {
        payment_id: transaction.transactionId,
        transaction_id: transaction.transactionId,
        amount: amount,
        currency: 'THB',
        orderId: orderId,
        status: 'completed'
      }

      lastPaymentResultRef.current = pseudoResult
      setPaymentStatus('completed')

      console.log('✅ Bypass payment transaction created, calling finalizePayment...')

      // เรียก finalizePayment() เหมือนการชำระเงินจริง
      // finalizePayment จะจัดการการเรียก backend API และอัพเดตข้อมูลให้เอง
      await finalizePayment(pseudoResult)

      console.log('✅ Bypass payment completed successfully')

    } catch (error) {
      console.error('❌ Error in bypass payment:', error)
      setPaymentStatus('error')
      setFinalizeError(error?.message || 'เกิดข้อผิดพลาดในการชำระเงินแบบ bypass')
    } finally {
      setProcessing(false)
    }
  }

  // สร้าง Rabbit Payment
  const createRabbitPayment = async () => {
    setProcessing(true)
    paymentFinalizedRef.current = false
    lastPaymentResultRef.current = null
    
    try {
      
      // ตาม RABBIT_GATEWAY_INTEGRATION_SUMMARY.md line 501-507
      const pricing = tierPricing[plan.tier] || tierPricing.vip
      const orderId = rabbitHelpers.generateOrderId()
      
      // สำหรับ coin package ใช้ plan.price โดยตรง
      const amount = plan.tier === 'coin_package' ? plan.price : pricing.amount
      
      // ใช้ rabbitAPI service ตาม RABBIT_GATEWAY_INTEGRATION_SUMMARY.md
      const result = await rabbitAPI.createPayment({
        orderId: orderId,
        amount: amount
      })
      
      
      // ตาม RABBIT_GATEWAY_INTEGRATION_SUMMARY.md line 512-525
      const transaction = {
        id: result.payment_id,
        transactionId: result.transaction_id,
        orderId: orderId,
        amount: result.amount, // ใช้ result.amount ที่ backend ส่งมา (เป็นบาทแล้ว)
        currency: result.currency || 'THB',
        planId: plan.id,
        planTier: plan.tier,
        planName: plan.name,
        userId: user?._id,
        status: result.status || 'pending',
        createdAt: new Date(),
        expiryTime: new Date(result.expire_at)
      }
      
      
      setCurrentTransaction(transaction)
      
      // ตาม RABBIT_GATEWAY_INTEGRATION_SUMMARY.md line 528-541
      const qrDataToSave = {
        payment_id: result.payment_id,
        transaction_id: result.transaction_id,
        orderId: orderId,
        amount: result.amount, // ใช้ result.amount ที่ backend ส่งมา (เป็นบาทแล้ว)
        currency: result.currency || 'THB',
        qr_image: result.qr_image || result.qr_image_url || result.qr_code_url,
        vendor_qr_code: result.vendor_qr_code,
        qr_code: result.qr_code,
        expiryTime: new Date(result.expire_at),
        url: result.url || result.transaction_url,
        short_url: result.short_url,
        transaction_url: result.transaction_url,
        status: 'pending',
        timeRemaining: 5 * 60 * 1000 // 5 นาที
      }
      
      setQrData(qrDataToSave)
      setTimeRemaining(5 * 60 * 1000) // 5 นาที
      setPaymentStatus('pending')
      
      // บันทึก QR data ลง localStorage
      const qrKey = `qr-${plan.id}-${user?._id || user?.id}`
      localStorage.setItem(qrKey, JSON.stringify(qrDataToSave))
      
      
    } catch (error: unknown) {
      console.error('Rabbit QR Code generation failed:', error)
      setPaymentStatus('error')
      
      // แสดงข้อความ error ที่เป็นประโยชน์
      if (error instanceof Error && error.message.includes('ไม่สามารถเชื่อมต่อ Rabbit Gateway ได้')) {
      }
    } finally {
      setProcessing(false)
    }
  }


  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    // แสดง notification หรือ toast
  }

  const refreshQR = () => {
    if (paymentCheckIntervalRef.current) {
      clearInterval(paymentCheckIntervalRef.current)
      paymentCheckIntervalRef.current = null
    }
    paymentFinalizedRef.current = false
    lastPaymentResultRef.current = null
    setFinalizeError(null)
    // ล้าง localStorage และ state ก่อนสร้าง QR ใหม่
    const qrKey = `qr-${plan.id}-${user?._id || user?.id}`
    localStorage.removeItem(qrKey)
    setQrData(null)
    setPaymentStatus('pending')
    setTimeRemaining(300000)
    setProcessing(true) // ตั้งค่า processing เป็น true เพื่อให้ปุ่มหมุน
    createRabbitPayment()
  }

  const finalizePayment = useCallback(
    async (paymentResult: any) => {
      const userId = user?._id || user?.id

      if (!userId) {
        console.warn('⚠️ Cannot finalize payment: missing user id')
        return
      }

      if (!paymentResult?.payment_id) {
        console.warn('⚠️ Cannot finalize payment: missing payment identifier', paymentResult)
        return
      }

      if (paymentFinalizedRef.current) {
        return
      }

      paymentFinalizedRef.current = true
      setFinalizeError(null)
      setIsFinalizing(true)

      try {
        const amountValue =
          paymentResult.amount ??
          (typeof plan.price === 'object' ? plan.price?.amount : plan.price) ??
          currentTransaction?.amount ??
          0
        const currencyValue =
          paymentResult.currency ||
          (typeof plan.price === 'object' ? plan.price?.currency : undefined) ||
          currentTransaction?.currency ||
          'THB'

        let backendResponse

        if (plan.tier === 'coin_package') {
          backendResponse = await paymentAPI.confirmPayment({
            transactionId: paymentResult.payment_id,
            paymentReference: paymentResult.payment_id,
            amount: amountValue,
            bankId: 'rabbit_gateway',
            planId: plan.id || plan._id,
            planTier: plan.tier,
            planName: plan.name,
            userId,
          })
        } else {
          backendResponse = await membershipAPI.upgradeMembership({
            userId,
            tier: plan.tier,
            paymentMethod: 'rabbit_gateway',
            transactionId: paymentResult.payment_id,
            amount: amountValue,
            currency: currencyValue,
          })
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('refreshUserData'))
        }

        const backendData = backendResponse?.data
        const upgradeResult = backendData?.data?.upgradeResult

        console.log('✅ Payment confirmation API called:', {
          planTier: plan.tier,
          backendResponse: backendData?.success,
          upgradeResult: upgradeResult ? {
            coins: upgradeResult.coins,
            totalCoins: upgradeResult.totalCoins,
            votePoints: upgradeResult.votePoints,
            totalVotePoints: upgradeResult.totalVotePoints
          } : null
        })

        // ดึงข้อมูล membership ใหม่จาก API เป็นหลัก (ไม่พึ่ง upgradeResult มากเกินไป)
        let coinsAwarded = 0
        let votePointsAwarded = 0
        let syncedUser: any = null

        try {
          const membershipResponse = await membershipAPI.getUserMembership(userId)
          const membershipPayload = membershipResponse?.data

          if (!membershipPayload?.success) {
            console.warn('⚠️ Failed to fetch membership data:', membershipPayload)
          }

          if (membershipPayload?.success && membershipPayload?.data) {
            const membershipInfo = membershipPayload.data

            // ใช้ข้อมูลจาก upgradeResult เป็น fallback ถ้า membershipInfo ไม่มี
            if (upgradeResult) {
              coinsAwarded = upgradeResult.coins ?? upgradeResult.totalCoins ?? 0
              votePointsAwarded = upgradeResult.votePoints ?? upgradeResult.totalVotePoints ?? 0
            }

            let currentUserSnapshot: any = {}
            try {
              currentUserSnapshot = JSON.parse(localStorage.getItem('user') || '{}')
            } catch (parseError) {
              console.warn('⚠️ Failed to parse localStorage user data:', parseError)
              currentUserSnapshot = {}
            }

            // ใช้ข้อมูลจาก membershipInfo เป็นหลัก (ข้อมูลล่าสุดจาก backend)
            syncedUser = {
              ...currentUserSnapshot,
              coins: membershipInfo.coins ?? currentUserSnapshot.coins ?? 0,
              votePoints: membershipInfo.votePoints ?? currentUserSnapshot.votePoints ?? 0,
              isVerified: membershipInfo.isVerified ?? currentUserSnapshot.isVerified ?? false,
              membership: {
                ...(currentUserSnapshot.membership || {}),
                tier: membershipInfo.membershipTier ?? currentUserSnapshot.membership?.tier ?? 'member',
                startDate: membershipInfo.membershipStartDate ?? currentUserSnapshot.membership?.startDate,
                endDate: membershipInfo.membershipExpiry ?? currentUserSnapshot.membership?.endDate,
                planId: membershipInfo.planId ?? currentUserSnapshot.membership?.planId,
              },
            }

            console.log('✅ Synced user data from server:', {
              coins: syncedUser.coins,
              votePoints: syncedUser.votePoints,
              membershipTier: syncedUser.membership?.tier,
              isVerified: syncedUser.isVerified,
              coinsBefore: currentUserSnapshot.coins,
              votePointsBefore: currentUserSnapshot.votePoints
            })

            // Validation: ตรวจสอบว่าข้อมูลถูกต้อง
            if (typeof syncedUser.coins !== 'number' || syncedUser.coins < 0) {
              console.warn('⚠️ Invalid coins value:', syncedUser.coins)
              syncedUser.coins = currentUserSnapshot.coins ?? 0
            }

            if (typeof syncedUser.votePoints !== 'number' || syncedUser.votePoints < 0) {
              console.warn('⚠️ Invalid votePoints value:', syncedUser.votePoints)
              syncedUser.votePoints = currentUserSnapshot.votePoints ?? 0
            }

            if (typeof window !== 'undefined' && window.updateAuthContext) {
              window.updateAuthContext(syncedUser)
            } else if (syncedUser) {
              localStorage.setItem('user', JSON.stringify(syncedUser))
            }
          } else {
            console.warn('⚠️ Membership response data is invalid:', membershipPayload)
          }
        } catch (syncError) {
          console.error('❌ Failed to refresh membership data after payment:', syncError)
          // Fallback: ใช้ข้อมูลจาก upgradeResult ถ้า sync ล้มเหลว
          if (upgradeResult) {
            coinsAwarded = upgradeResult.coins ?? upgradeResult.totalCoins ?? 0
            votePointsAwarded = upgradeResult.votePoints ?? upgradeResult.totalVotePoints ?? 0
            console.log('⚠️ Using upgradeResult as fallback:', { coinsAwarded, votePointsAwarded })
          }
        }
 
        const baseTransaction = currentTransaction
          ? { ...currentTransaction }
          : {
              orderId: paymentResult.orderId,
              amount: amountValue,
              currency: currencyValue,
              planId: plan.id || plan._id,
              planTier: plan.tier,
              planName: plan.name,
              userId,
            }

        const successData = {
          ...baseTransaction,
          paymentMethod: 'rabbit_gateway',
          timestamp: new Date().toISOString(),
          status: 'completed',
          transactionId: paymentResult.payment_id,
          amount: paymentResult.amount ?? baseTransaction.amount,
          currency: currencyValue,
          tier: plan.tier,
          plan,
          backendData,
          coinsAwarded,
          votePointsAwarded,
          syncedUser,
        }

        onSuccess && onSuccess(successData)
      } catch (error: any) {
        console.error('❌ Error finalizing payment:', error)
        paymentFinalizedRef.current = false
        const message =
          error?.response?.data?.message ||
          error?.message ||
          'เกิดข้อผิดพลาดในการบันทึกผลการชำระเงิน กรุณาลองใหม่'
        setFinalizeError(message)
      } finally {
        setIsFinalizing(false)
      }
    },
    [currentTransaction, onSuccess, plan, user],
  )

  // ฟังก์ชันตรวจสอบสถานะการชำระเงินแบบ manual
  const checkPaymentStatus = useCallback(async () => {
    if (!qrData || !qrData.payment_id) {
      return
    }

    try {
      const data = await rabbitAPI.checkPaymentStatus(qrData.payment_id)

      if (data.status === 'completed') {
        setPaymentStatus('completed')
        lastPaymentResultRef.current = data
        await finalizePayment(data)
      } else if (data.status === 'failed') {
        setPaymentStatus('failed')
      } else if (data.status === 'expired') {
        setPaymentStatus('expired')
      } else {
      }
    } catch (error) {
      console.error('❌ Error checking payment status:', error)
    }
  }, [qrData, finalizePayment])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (paymentCheckIntervalRef.current) {
        clearInterval(paymentCheckIntervalRef.current)
        paymentCheckIntervalRef.current = null
      }
      // ไม่ล้าง localStorage เพื่อให้ QR data ยังคงอยู่เมื่อกลับมาหน้านี้
    }
  }, [])

  useEffect(() => {
    paymentStatusRef.current = paymentStatus
  }, [paymentStatus])

  useEffect(() => {
    if (paymentStatusRef.current === 'pending' && qrData?.payment_id && !paymentCheckIntervalRef.current) {
      paymentCheckAttemptsRef.current = 0
      paymentCheckIntervalRef.current = window.setInterval(async () => {
        paymentCheckAttemptsRef.current += 1
        try {
          await checkPaymentStatus()
        } catch (error) {
          console.error('❌ Auto check payment failed:', error)
        }

        if (
          paymentStatusRef.current !== 'pending' ||
          paymentCheckAttemptsRef.current >= 60
        ) {
          if (paymentCheckIntervalRef.current) {
            clearInterval(paymentCheckIntervalRef.current)
            paymentCheckIntervalRef.current = null
          }
        }
      }, 5000)
    }

    if (paymentStatusRef.current !== 'pending' && paymentCheckIntervalRef.current) {
      clearInterval(paymentCheckIntervalRef.current)
      paymentCheckIntervalRef.current = null
    }
  }, [paymentStatus, qrData?.payment_id, checkPaymentStatus])

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getStatusMessage = (status) => {
    switch (status) {
      case 'pending':
        return 'รอการชำระเงิน'
      case 'completed':
        return 'ชำระเงินสำเร็จ'
      case 'failed':
        return 'การชำระเงินล้มเหลว'
      case 'expired':
        return 'QR Code หมดอายุ'
      case 'error':
        return 'เกิดข้อผิดพลาด'
      default:
        return 'ไม่ทราบสถานะ'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600'
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'expired':
        return 'text-gray-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <AlertCircle className="h-4 w-4" />
      case 'expired':
        return <Timer className="h-4 w-4" />
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-violet-50 to-blue-50 p-2">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับ
            </Button>

            {/* Admin Controls - แสดงเฉพาะ admin */}
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button
                  variant={bypassMode ? "default" : "outline"}
                  size="sm"
                  onClick={async () => {
                    const newBypassMode = !bypassMode

                    try {
                      // บันทึกการตั้งค่าไปยัง API
                      const result = await settingsAPI.updatePaymentBypassSettings(
                        newBypassMode,
                        newBypassMode ? 'เปิดใช้งานจาก Payment Gateway' : 'ปิดใช้งานจาก Payment Gateway'
                      )

                      if (result.success) {
                        setBypassMode(newBypassMode)

                        if (newBypassMode) {
                          // ถ้าเปิด bypass mode ให้เรียก bypass payment ทันที
                          bypassPayment()
                        }
                      }
                    } catch (error) {
                      console.error('Error toggling bypass mode:', error)
                      // Fallback ไปใช้ localStorage
                      setBypassMode(newBypassMode)
                      localStorage.setItem('payment_bypass_enabled', newBypassMode.toString())

                      if (newBypassMode) {
                        bypassPayment()
                      }
                    }
                  }}
                  className={`text-xs ${bypassMode ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
                >
                  <Shield className="h-3 w-3 mr-1" />
                  {bypassMode ? 'ปิด Bypass' : 'เปิด Bypass'}
                </Button>

                {/* ปุ่มรีเซ็ตเหรียญสำหรับทดสอบ */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('รีเซ็ตเหรียญและโหวตของผู้ใช้เป็น 0?')) {
                      const resetUser = {
                        ...user,
                        coins: 0,
                        votePoints: 0,
                        membership: { tier: 'member' }
                      }
                      localStorage.setItem('user', JSON.stringify(resetUser))
                      if (window.updateAuthContext) {
                        window.updateAuthContext(resetUser)
                      }
                      console.log('🔄 Reset user coins and vote points to 0')
                      // Note: This is a dev function, no notification needed
                    }
                  }}
                  className="text-xs bg-red-500 text-white hover:bg-red-600"
                >
                  🔄 รีเซ็ต
                </Button>
              </div>
            )}
          </div>
          
              <div className="text-center">
            <h1 className="text-2xl font-bold gradient-text mb-1">
              🐇 Rabbit Payment Gateway
              {bypassMode && (
                <span className="ml-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded-full">
                  BYPASS MODE
                </span>
              )}
              </h1>
            <p className="text-slate-600 text-sm">
              {bypassMode ? 'โหมดทดสอบ - ไม่ต้องชำระเงินจริง' : 'ชำระเงินอย่างปลอดภัยและรวดเร็ว'}
              </p>

            {/* แสดงข้อมูลผู้ใช้ปัจจุบันสำหรับการทดสอบ - ซ่อนแล้ว */}
            {false && user && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-slate-600">เหรียญ</div>
                    <div className="font-bold text-amber-600">{user.coins?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-slate-600">โหวต</div>
                    <div className="font-bold text-purple-600">{user.votePoints?.toLocaleString() || 0}</div>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <div className="text-slate-600">ระดับสมาชิก</div>
                  <div className="font-bold text-pink-600">
                    {user.membership?.tier === 'diamond' ? '💎 Diamond' :
                     user.membership?.tier === 'gold' ? '🥇 Gold' :
                     user.membership?.tier === 'silver' ? '🥈 Silver' : '🆓 Member'}
                  </div>
                </div>

                {/* ปุ่มทดสอบการเพิ่มเหรียญด้วยตนเอง */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const testUser = { ...user, coins: (user.coins || 0) + 1000, votePoints: (user.votePoints || 0) + 100 }
                        localStorage.setItem('user', JSON.stringify(testUser))
                        if (window.updateAuthContext) {
                          window.updateAuthContext(testUser)
                        }
                        console.log('🧪 Manual test: Added 1000 coins and 100 vote points')
                        // Note: This is a dev function, no notification needed
                      }}
                      className="text-xs"
                    >
                      🧪 เพิ่มเหรียญทดสอบ
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const currentUserData = localStorage.getItem('user')
                        console.log('🔍 Current localStorage user data:', currentUserData ? JSON.parse(currentUserData) : 'No data')
                        // Note: This is a dev function, no notification needed
                      }}
                      className="text-xs"
                    >
                      🔍 ดูข้อมูล localStorage
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Payment Details */}
          <Card className="modern-card shadow-xl border border-white/30 overflow-hidden backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-br from-green-50/90 via-emerald-50/90 to-teal-50/90 backdrop-blur-xl border-b border-white/30 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <QrCode className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-1">
                      🐇 Rabbit Gateway
                    </CardTitle>
                    <p className="text-xs text-slate-600 flex items-center">
                      <Lock className="h-3 w-3 mr-1 text-green-500" />
                      ระบบชำระเงินที่ปลอดภัย
                    </p>
                  </div>
                </div>
              </div>
              </CardHeader>
            <CardContent className="space-y-4">
              {/* Rabbit Gateway Features Banner */}
              <div className="relative overflow-hidden p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">🐇 Rabbit Gateway</h3>
                      <p className="text-white/90 text-xs">ระบบชำระเงินที่ปลอดภัย รวดเร็ว และสะดวกสบาย</p>
                    </div>
                    <div className="hidden sm:block">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <QrCode className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-white/90">
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      <span className="text-xs">ปลอดภัย 100%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      <span className="text-xs">รวดเร็ว</span>
                </div>
                    <div className="flex items-center gap-1">
                      <Smartphone className="h-3 w-3" />
                      <span className="text-xs">QR Code</span>
                          </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-xs">ยืนยันอัตโนมัติ</span>
                      </div>
                  </div>
                  </div>
                </div>

              {/* Plan Details */}
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/50">
                <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  แพ็กเกจที่เลือก
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-slate-200/50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                        {plan.tier === 'coin_package' ? (
                          <span className="text-white text-lg">🪙</span>
                        ) : (
                          <Star className="h-4 w-4 text-white" />
                        )}
                      </div>
                    <div>
                        <h4 className="font-semibold text-slate-800 text-sm">{plan.name}</h4>
                        <p className="text-xs text-slate-600">
                          {plan.tier === 'coin_package' ? 'แพ็กเกจเหรียญ' : plan.tier.toUpperCase()}
                        </p>
                        {plan.tier === 'coin_package' && plan.rewards && (
                          <p className="text-xs text-slate-500 mt-1">
                            {plan.rewards.coins?.toLocaleString()} เหรียญ + {plan.rewards.votePoints?.toLocaleString()} คะแนนโหวต
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-slate-800">
                        ฿{plan.tier === 'coin_package' ? plan.price : (tierPricing[plan.tier]?.amount || 0)}
                        </div>
                      <div className="text-xs text-slate-600">THB</div>
                    </div>
                  </div>
                </div>
          </div>

              {/* Payment Status */}
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/50">
                <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Timer className="h-4 w-4 text-blue-500" />
                  สถานะการชำระเงิน
                </h3>
                
                {qrData ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-slate-200/50">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          paymentStatus === 'completed' ? 'bg-green-500' :
                          paymentStatus === 'failed' ? 'bg-red-500' :
                          paymentStatus === 'expired' ? 'bg-gray-500' :
                          'bg-yellow-500'
                        }`}>
                          {getStatusIcon(paymentStatus)}
                    </div>
                        <div>
                          <h4 className="font-semibold text-slate-800 text-sm">
                            {getStatusMessage(paymentStatus)}
                          </h4>
                          <p className="text-xs text-slate-600">
                            Order ID: {qrData.orderId}
                          </p>
                  </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-base font-bold ${getStatusColor(paymentStatus)}`}>
                          {paymentStatus === 'pending' && timeRemaining > 0 ? formatTime(timeRemaining) : ''}
                          </div>
                        <div className="text-xs text-slate-600">
                          {paymentStatus === 'pending' ? 'เวลาที่เหลือ' : 'สถานะ'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-4">
                    <div className="text-center">
                      <Loader2 className="h-6 w-6 text-blue-500 mx-auto mb-2 animate-spin" />
                      <p className="text-sm text-slate-600">กำลังสร้าง QR Code...</p>
                    </div>
                  </div>
                )}
                
                {isFinalizing && paymentStatus === 'completed' && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    กำลังบันทึกข้อมูลการชำระเงินและอัปเดตสิทธิพิเศษของคุณ...
                  </div>
                )}

                {finalizeError && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 space-y-3">
                    <p>{finalizeError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (lastPaymentResultRef.current) {
                          finalizePayment(lastPaymentResultRef.current)
                        }
                      }}
                      className="text-red-600 border-red-300 hover:bg-red-100"
                      disabled={isFinalizing}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      ลองบันทึกอีกครั้ง
                    </Button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    onClick={onCancel}
                    variant="outline"
                    className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    ยกเลิก
                  </Button>
                </div>
                
                {/* ปุ่มตรวจสอบสถานะการชำระเงิน (เฉพาะเมื่อมี QR Code แล้ว) */}
                {qrData && paymentStatus === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={checkPaymentStatus}
                      className="flex-1 modern-button bg-blue-500 hover:bg-blue-600"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      ตรวจสอบสถานะ
                    </Button>
                    
                    <Button
                      onClick={refreshQR}
                      disabled={processing}
                      variant="outline"
                      className="flex-1 border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      <RefreshCw 
                        className="h-4 w-4 mr-2" 
                        style={processing ? { animation: 'spin 1s linear infinite' } : {}}
                      />
                      สร้าง QR ใหม่
                    </Button>
                  </div>
                )}
                
                
              </div>
            </CardContent>
          </Card>

          {/* QR Code Display */}
          <Card className="modern-card shadow-xl border border-white/30 overflow-hidden backdrop-blur-lg" ref={qrCodeRef}>
            <CardHeader className="bg-gradient-to-br from-blue-50/90 via-indigo-50/90 to-purple-50/90 backdrop-blur-xl border-b border-white/30 py-3">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-blue-500" />
                QR Code สำหรับชำระเงิน
              </CardTitle>
              <p className="text-xs text-slate-600">
                สแกน QR Code ด้วยแอปธนาคารของคุณ
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {processing ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 text-blue-500 mb-3 animate-spin" />
                  <h3 className="text-base font-semibold text-slate-800 mb-2">
                    กำลังสร้าง QR Code...
                        </h3>
                  <p className="text-slate-600 text-center text-sm">
                    กรุณารอสักครู่ ระบบกำลังสร้าง QR Code สำหรับการชำระเงิน
                  </p>
                      </div>
              ) : !qrData ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-12 w-12 text-blue-500 mb-3 animate-spin" />
                  <h3 className="text-base font-semibold text-slate-800 mb-2">
                    กำลังสร้าง QR Code...
                        </h3>
                  <p className="text-slate-600 text-center text-sm">
                    กรุณารอสักครู่ ระบบกำลังสร้าง QR Code สำหรับการชำระเงิน
                  </p>
                      </div>
              ) : qrData ? (
                <div className="space-y-4">
                  
                  {/* QR Code Image */}
                  <div className="flex justify-center">
                    <div className="relative">
                      {/* แสดง QR Image ถ้ามี */}
                      {(qrData.qr_image || qrData.qr_image_url || qrData.qr_code_url) && (
                        <img
                          src={qrData.qr_image || qrData.qr_image_url || qrData.qr_code_url}
                          alt="QR Code for Payment"
                          className="w-48 h-48 border-2 border-white rounded-xl shadow-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            // แสดง fallback div
                            const fallbackDiv = target.parentElement?.querySelector('.qr-fallback') as HTMLElement;
                            if (fallbackDiv) {
                              fallbackDiv.style.display = 'flex';
                            }
                          }}
                        />
                      )}
                      
                      {/* Fallback: แสดง vendor QR code หรือข้อความ */}
                      <div 
                        className="qr-fallback w-48 h-48 border-2 border-white rounded-xl shadow-lg bg-white flex items-center justify-center"
                        style={{ display: (qrData.qr_image || qrData.qr_image_url || qrData.qr_code_url) ? 'none' : 'flex' }}
                      >
                        {qrData.vendor_qr_code ? (
                          <div className="text-center p-3">
                            <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-600 mb-1">QR Code String:</p>
                            <p className="text-xs text-gray-500 break-all font-mono">
                              {qrData.vendor_qr_code.substring(0, 30)}...
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              ใช้แอปธนาคารสแกน QR Code นี้
                            </p>
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(qrData.vendor_qr_code)}
                                className="text-xs"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy QR String
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-600">ไม่มี QR Code</p>
                            <p className="text-xs text-gray-500 mt-1">กรุณาลองใหม่อีกครั้ง</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Overlay สำหรับ QR Code หมดอายุ */}
                      {paymentStatus === 'expired' && (
                        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                          <div className="text-white text-center">
                            <Timer className="h-6 w-6 mx-auto mb-1" />
                            <p className="font-semibold text-sm">QR Code หมดอายุ</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Power By Text */}
                  <div className="text-center mt-4">
                    <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-lg shadow-lg">
                      <p className="text-sm text-white font-bold">
                        Power By <span className="text-yellow-300 font-extrabold">DevNid</span> & <span className="text-pink-300 font-extrabold">Kao</span>
                      </p>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-200/50">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">จำนวนเงิน:</span>
                        <span className="font-semibold text-slate-800">
                          ฿{qrData.amount} {qrData.currency}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-slate-200/50">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600">Order ID:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-slate-800">
                            {qrData.orderId}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(qrData.orderId)}
                            className="h-4 w-4 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
                  <h3 className="text-base font-semibold text-slate-800 mb-2">
                    ไม่สามารถสร้าง QR Code ได้
                  </h3>
                  <p className="text-slate-600 text-center mb-3 text-sm">
                    เกิดข้อผิดพลาดในการสร้าง QR Code
                  </p>
                  
                  {/* แสดงข้อความ setup instructions */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 max-w-sm">
                    <h4 className="font-semibold text-yellow-800 mb-2 text-sm">🔧 การตั้งค่า Rabbit Gateway</h4>
                    <div className="text-xs text-yellow-700 space-y-1">
                      <p>1. ไปที่ Rabbit Gateway Dashboard</p>
                      <p>2. สร้าง Application และรับ Application ID</p>
                      <p>3. รับ Public Key และ Secret Key</p>
                      <p>4. ตั้งค่าในไฟล์ backend/env.development</p>
                      <p>5. รีสตาร์ท server</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={createRabbitPayment}
                    disabled={processing}
                    className="modern-button bg-blue-500 hover:bg-blue-600"
                  >
                    <RefreshCw 
                      className="h-4 w-4 mr-2" 
                      style={processing ? { animation: 'spin 1s linear infinite' } : {}}
                    />
                    ลองใหม่
                  </Button>
                </div>
              )}
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}

export default PaymentGateway