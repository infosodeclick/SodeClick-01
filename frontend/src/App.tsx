import { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react'

// Import separated modules
import type { 
  PublicUser, 
  FeaturedProfile, 
  TabType
} from './types'

import { 
  PREMIUM_TIER_ORDER
} from './constants'

// Chat utilities removed
// import { removeDuplicateChatsFromArray, isSocketReady } from './utils'

import { 
  useNotifications, 
  // useChatState, // REMOVED - Chat functionality
  useProfileState, 
  usePaymentState, 
  useUserData, 
  useFilters, 
  useModalState, 
  useMaintenanceMode, 
  useVoteState, 
  // useChatCountdown, // REMOVED - Chat functionality
  useLikedProfiles, 
  useAuthState 
} from './hooks'
// import { useSocketManagement } from './hooks/useSocketManagement' // REMOVED - Chat functionality
// import socketManager from './services/socketManager' // REMOVED - Chat functionality

import { Button } from './components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar'
import { Badge } from './components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import { Dialog, DialogContent, DialogTitle, DialogDescription, VisuallyHidden } from './components/ui/dialog'
import LoginModal from './components/LoginModal'
import { DataCacheProvider } from './hooks/useGlobalCache'
import { useRealTimeUpdate, useNotificationUpdates } from './hooks/useRealTimeUpdates'
import { getProfileImageUrl, getMainProfileImage } from './utils/profileImageUtils'
import autoRefreshManager from './services/autoRefreshManager'
import browserNotificationManager from './utils/browserNotifications'
// import { chatAPI } from './services/chatAPI' // REMOVED - Chat functionality
import { userAPI } from './services/userAPI'
import Chat from './components/Chat'

// Loading component for Suspense fallbacks
const LoadingSpinner = ({ size = 'h-8 w-8' }: { size?: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className={`animate-spin rounded-full border-b-2 border-pink-500 ${size}`}></div>
  </div>
)

// Lazy load heavy components with type assertions
const MembershipDashboard = lazy(() => import('./components/MembershipDashboard.jsx')) as any
const MembershipPlans = lazy(() => import('./components/MembershipPlans.jsx')) as any
const CoinShop = lazy(() => import('./components/CoinShop.jsx')) as any
const PaymentWithAnimation = lazy(() => import('./components/PaymentWithAnimation.tsx'))
const PaymentSuccess = lazy(() => import('./components/PaymentSuccess.tsx')) as any
const UserProfile = lazy(() => import('./components/UserProfile.jsx')) as any
// REMOVED: Chat components
// const ChatRoomList = lazy(() => import('./components/ChatRoomList.jsx')) as any
// const RealTimeChat = lazy(() => import('./components/RealTimeChat.jsx')) as any
// const CreatePrivateRoomModal = lazy(() => import('./components/CreatePrivateRoomModal.jsx')) as any
const AIMatchingSystem = lazy(() => import('./components/AIMatchingSystem.jsx')) as any
// const PrivateChatList = lazy(() => import('./components/PrivateChatList.jsx')) as any
// const PrivateChat = lazy(() => import('./components/PrivateChat.jsx')) as any
// const NewPrivateChatModal = lazy(() => import('./components/NewPrivateChatModal.jsx')) as any
const HeartVote = lazy(() => import('./components/HeartVote.jsx')) as any
const VoteRanking = lazy(() => import('./components/VoteRanking.jsx')) as any
const VoteRankingMini = lazy(() => import('./components/VoteRankingMini.jsx')) as any
const DJPage = lazy(() => import('./components/DJPage.jsx')) as any
import ErrorBoundary from './components/ErrorBoundary.jsx'
const TopVotedCarousel = lazy(() => import('./components/TopVotedCarousel.jsx')) as any
import { useAuth } from './contexts/AuthContext'
// REMOVED: Unused imports
// import { membershipAPI } from './services/membershipAPI'
// import { paymentAPI } from './services/paymentAPI'
import { useToast, ToastProvider } from './components/ui/toast'
import MaintenanceMode from './components/MaintenanceMode'
import ReportModal from './components/ReportModal'
import { io } from 'socket.io-client'
// import { usePrivateChat } from './hooks/usePrivateChat' // ใช้ระบบเดิมก่อน

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faSearch, 
  faHeart, 
  faComments, 
  faUser, 
  faGem,
  faBell,
  faShoppingCart,
  faHeadphones
} from '@fortawesome/free-solid-svg-icons'

import { 
  Heart, 
  Search, 
  MessageCircle, 
  User, 
  Settings, 
  LogIn, 
  ChevronRight, 
  Filter, 
  MapPin, 
  Calendar, 
  Utensils, 
  Sparkles,
  CheckCircle,
  X,
  ArrowLeft,
  Users,
  Crown,
  RefreshCw,
  Briefcase,
  Languages,
  GraduationCap,
  Building,
  PawPrint,
  Dumbbell,
  Wine,
  Cigarette,
  Church,
  Baby,
  Star,
  Coins,
  Trophy,
  AlertTriangle,
  Clock,
  XCircle,
  Flag
} from 'lucide-react'


function App() {
  const { user, login, logout } = useAuth()
  const { success, error, warning } = useToast()
  const { updateNotification } = useNotificationUpdates()
  
  // Socket.IO connection สำหรับ notifications
  const socketRef = useRef(null)

  const { 
    notifications, 
    setNotifications, 
    unreadCount, 
    setUnreadCount, 
    isLoadingNotifications, 
    fetchNotifications, 
    markAllNotificationsAsRead,
    clearAllNotifications 
  } = useNotifications(user?._id)

  // REMOVED: Chat state
  // const { 
  //   chatView,
  //   setChatView,
  //   selectedRoomId,
  //   setSelectedRoomId,
  //   privateChatView,
  //   setPrivateChatView,
  //   selectedPrivateChat,
  //   setSelectedPrivateChat,
  //   privateChats,
  //   setPrivateChats,
  //   chatRooms,
  //   setChatRooms,
  //   chatType,
  //   setChatType
  // } = useChatState()

  const {
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
  } = useProfileState()

  const {
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
  } = usePaymentState()

  const {
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
  } = useUserData()

  const {
    filters,
    setFilters,
    filtersOpen,
    setFiltersOpen
  } = useFilters()

  const [showReportModal, setShowReportModal] = useState(false)

  const {
    showLoginDialog,
    setShowLoginDialog,
    // REMOVED: showCreateRoomModal, setShowCreateRoomModal - Chat functionality removed
    // REMOVED: showNewPrivateChatModal state (Chat functionality removed)
    showProfileDropdown,
    setShowProfileDropdown,
    showNotificationDropdown,
    setShowNotificationDropdown,
    preventModalClose,
    setPreventModalClose,
    modalAction,
    setModalAction
  } = useModalState()


  const {
    isMaintenanceMode,
    setIsMaintenanceMode,
    maintenanceChecked,
    setMaintenanceChecked,
    hasDevAccess,
    setHasDevAccess,
    bypassMaintenance,
    setBypassMaintenance
  } = useMaintenanceMode()

  const {
    selectedVoteUser,
    setSelectedVoteUser,
    showVoteUserProfile,
    setShowVoteUserProfile,
    showRankingModal,
    setShowRankingModal
  } = useVoteState()

  // REMOVED: Chat typing indicators and message handlers
  // const [typingUsers, setTypingUsers] = useState<{[chatId: string]: string[]}>({});
  // const handleTypingStart = (chatId: string, userId: string, username: string) => { ... }
  // const handleTypingStop = (chatId: string, userId: string) => { ... }
  // const handlePrivateChatMessage = (data: any) => { ... }

  // REMOVED: Chat countdown
  // const { 
  //   chatCountdown,
  //   setChatCountdown,
  //   isStartingChat,
  //   setIsStartingChat
  // } = useChatCountdown()

  const {
    likedProfiles,
    setLikedProfiles
  } = useLikedProfiles()

  const {
    isAuthenticated,
    setIsAuthenticated,
    forceUpdate,
    setForceUpdate
  } = useAuthState()


  const [activeTab, setActiveTab] = useState<TabType>('discover')
  const [chatWithUserId, setChatWithUserId] = useState<string | null>(null)
  
  // Handle Google OAuth callback URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const loginSuccess = urlParams.get('login_success');
    const authError = urlParams.get('error');
    
    
    if (token && loginSuccess === 'true') {
      
      // Decode JWT token to get user info
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Create user object from token payload
        const userData = {
          _id: payload.id,
          email: payload.email,
          username: payload.username,
          token: token
        };
        
        
          // Store token and user data
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userData));
          
          // อัปเดตข้อมูลผู้ใช้ในฐานข้อมูลให้ตรงกับ localStorage
        
        // Call login function
        login(userData);
        setIsAuthenticated(true);
        
        // Show success message
        success('เข้าสู่ระบบด้วย Google สำเร็จ!');
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Refresh user data
        setTimeout(async () => {
          try {
            const result = await userAPI.fetchLikedUsers(user._id);
            if (result.success && result.data) {
              setLikedProfiles(new Set(result.data));
            }
          } catch (error) {
            console.error('❌ Error loading liked users:', error);
          }
          // REMOVED: fetchPrivateChats() - Chat functionality removed
          if (activeTab === 'discover') {
            window.dispatchEvent(new CustomEvent('refreshUserData'));
          }
          window.dispatchEvent(new CustomEvent('refreshPremiumUsers'));
        }, 100);
        
        // รีเฟรชหน้าเว็บอัตโนมัติเมื่อล็อกอินด้วย Google
        setTimeout(() => {
          window.location.reload()
        }, 500);
        
      } catch (err) {
        console.error('❌ Error processing Google OAuth token:', err);
        error('เกิดข้อผิดพลาดในการประมวลผลข้อมูลการเข้าสู่ระบบ');
      }
    } else if (authError) {
      console.error('❌ Google OAuth error:', authError);
      const reason = urlParams.get('reason');
      
      if (authError === 'auth_failed') {
        if (reason === 'callback_error') {
          error('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google');
        } else {
          error('การเข้าสู่ระบบด้วย Google ล้มเหลว');
        }
      } else {
        error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Real-time event handlers
  useRealTimeUpdate('userLoggedIn', () => {
    // อัปเดต UI โดยไม่ต้องรีเฟรชหน้าเว็บ
    success('เข้าสู่ระบบสำเร็จ');
    
    // อัปเดต state ทันที
    setIsAuthenticated(true);
    
    // รีเฟรชข้อมูลผู้ใช้ในหน้าแรกหลังจาก login (ใช้ setTimeout เพื่อหลีกเลี่ยง performance warning)
    if (activeTab === 'discover') {
      // ใช้ setTimeout เพื่อให้ UI อัปเดตก่อน แล้วค่อยโหลดข้อมูล
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshUserData'));
      }, 100);
    }
    
      // อัปเดตข้อมูลที่เกี่ยวข้อง
      setTimeout(async () => {
        // โหลดข้อมูล liked users
        try {
          const result = await userAPI.fetchLikedUsers(user._id);
          if (result.success && result.data) {
            setLikedProfiles(new Set(result.data));
          }
        } catch (error) {
          console.error('❌ Error loading liked users:', error);
        }
        // โหลดข้อมูลแชทส่วนตัว
        // REMOVED: fetchPrivateChats() - Chat functionality removed;
        // โหลดข้อมูลห้องแชทสาธารณะ
        // REMOVED: fetchChatRooms() - Chat functionality removed;
        // รีเฟรชข้อมูล Premium users
        window.dispatchEvent(new CustomEvent('refreshPremiumUsers'));
      }, 200);
  });

  useRealTimeUpdate('userLoggedOut', () => {
    // อัปเดต UI โดยไม่ต้องรีเฟรชหน้าเว็บ
    success('ออกจากระบบสำเร็จ');
    
    // อัปเดต state ทันที
    setIsAuthenticated(false);
    
    // ล้างข้อมูลที่เกี่ยวข้อง
    setLikedProfiles(new Set());
    // REMOVED: setPrivateChats([]) - Chat functionality removed
    setSelectedProfile(null);
    setShowProfileModal(false);
    
    // ล้าง localStorage
    localStorage.removeItem('likedUsers');
    // REMOVED: localStorage.removeItem('privateChats') - Chat functionality removed
  });

  useRealTimeUpdate('profileImageUpdated', (data) => {
    // อัปเดต avatar ใน header โดยไม่ต้องรีเฟรชหน้าเว็บ
    const avatarElement = document.querySelector('[data-avatar-user-id]');
    if (avatarElement && data.userId === user?._id) {
      // Trigger re-render ของ avatar component
      window.dispatchEvent(new CustomEvent('avatarUpdate', { detail: data }));
    }
  });

  // ตั้งค่า currentUserId สำหรับ browser notifications และ initialize socket สำหรับ notifications
  useEffect(() => {
    if (user?._id) {
      window.currentUserId = user._id;
      
      // ขอสิทธิ์แจ้งเตือนจากผู้ใช้เมื่อ login (เฉพาะครั้งแรก)
      const supportsNotification = typeof window !== 'undefined' && 'Notification' in window;
      if (supportsNotification && Notification.permission === 'default') {
        browserNotificationManager.requestPermission().catch(err => {
          console.error('❌ Error requesting notification permission:', err);
        });
      } else if (!supportsNotification) {
        console.log('⚠️ Notifications are not supported on this device/browser');
      }
      
      // Initialize Socket.IO connection สำหรับ notifications
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const socketUrl = API_BASE_URL;
      
      console.log('🔌 [App.tsx] Initializing socket for notifications:', socketUrl);
      
      socketRef.current = io(socketUrl, {
        transports: ['polling', 'websocket'],
        upgrade: true,
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        withCredentials: true,
        query: {
          userId: user._id,
          timestamp: Date.now()
        },
        autoConnect: true
      });
      
      const socket = socketRef.current;
      
      socket.on('connect', () => {
        console.log('✅ [App.tsx] Socket connected for notifications:', socket.id);
        console.log('✅ [App.tsx] User ID:', user._id);
        console.log('✅ [App.tsx] User role:', user.role);
        console.log('✅ [App.tsx] Token exists:', !!localStorage.getItem('token'));
        
        // สร้าง socketManager สำหรับ components อื่นๆ ใช้
        window.socketManager = {
          socket: socket,
          connect: () => socket.connect(),
          disconnect: () => socket.disconnect(),
          emit: (event: string, data?: any) => socket.emit(event, data)
        };
        
        // Dispatch event เพื่อแจ้ง components ว่า socket พร้อมแล้ว
        window.dispatchEvent(new CustomEvent('socketReady', { detail: { socket } }));
        
        // Join user room เพื่อรับ notifications (retry if MongoDB not ready)
        const joinUserRoom = () => {
          console.log('🔔 [App.tsx] Emitting join-user-room event:', {
            userId: user._id,
            tokenExists: !!localStorage.getItem('token')
          });
          socket.emit('join-user-room', {
            userId: user._id,
            token: localStorage.getItem('token')
          });
        };
        
        // Try immediately
        joinUserRoom();
        
        // Also listen for retry signal from server
        socket.on('retry-join-user-room', (data) => {
          console.log('🔄 [App.tsx] Retrying join-user-room:', data);
          setTimeout(() => {
            joinUserRoom();
          }, 1000);
        });
      });
      
      socket.on('user-room-joined', (data) => {
        console.log('✅ [App.tsx] User room joined:', data);
        console.log('✅ [App.tsx] User room name should be: user_' + user._id);
      });
      
      socket.on('error', (error) => {
        console.error('❌ [App.tsx] Socket error:', error);
        console.error('❌ [App.tsx] Error message:', error.message);
        console.error('❌ [App.tsx] Error details:', error);
        
        // If error is about database, retry after delay
        if (error.message && error.message.includes('Database temporarily unavailable')) {
          console.log('🔄 [App.tsx] Database unavailable, will retry join-user-room in 2 seconds');
          setTimeout(() => {
            socket.emit('join-user-room', {
              userId: user._id,
              token: localStorage.getItem('token')
            });
          }, 2000);
        }
      });
      
      socket.on('newNotification', (notification) => {
        console.log('🔔 [App.tsx] Socket: Received newNotification from socket:', notification);
        console.log('🔔 [App.tsx] Socket: Notification type:', notification.type);
        console.log('🔔 [App.tsx] Socket: Notification recipientId:', notification.recipientId);
        console.log('🔔 [App.tsx] Socket: Current user ID:', user._id);
        console.log('🔔 [App.tsx] Socket: Notification title:', notification.title);
        console.log('🔔 [App.tsx] Socket: Notification message:', notification.message);
        console.log('🔔 [App.tsx] Socket: Notification data:', notification.data);
        console.log('🔔 [App.tsx] Socket: Full notification object:', JSON.stringify(notification, null, 2));
        
        // ตรวจสอบว่าเป็น notification สำหรับผู้ใช้ปัจจุบันหรือไม่
        const recipientId = notification.recipientId?.toString();
        const userId = user._id?.toString();
        
        console.log('🔔 [App.tsx] Socket: Comparing recipientId:', recipientId, 'with userId:', userId);
        
        if (recipientId && recipientId !== userId) {
          console.log('⏭️ [App.tsx] Socket: Notification not for current user, ignoring');
          return;
        }
        
        console.log('✅ [App.tsx] Socket: Notification is for current user, dispatching custom event');
        
        // Dispatch custom event เพื่อให้ useRealTimeUpdate ทำงาน
        // ตรวจสอบว่า notification.data มีข้อมูลครบหรือไม่
        console.log('🔔 [App.tsx] Socket: Preparing to dispatch custom event');
        console.log('🔔 [App.tsx] Socket: Notification.data before dispatch:', JSON.stringify(notification.data, null, 2));
        
        // ตรวจสอบและแปลง createdAt เป็น Date object ถ้ายังไม่ใช่
        const notificationToDispatch = {
          ...notification,
          createdAt: notification.createdAt ? (notification.createdAt instanceof Date ? notification.createdAt : new Date(notification.createdAt)) : new Date(),
          // ตรวจสอบว่า data ถูกส่งมาหรือไม่
          data: notification.data || {}
        };
        
        console.log('🔔 [App.tsx] Socket: Notification.data after processing:', JSON.stringify(notificationToDispatch.data, null, 2));
        
        window.dispatchEvent(new CustomEvent('newNotification', {
          detail: notificationToDispatch
        }));
        
        console.log('✅ [App.tsx] Socket: Custom event dispatched');
      });
      
      socket.on('disconnect', (reason) => {
        console.log('❌ [App.tsx] Socket disconnected:', reason);
      });
      
      socket.on('connect_error', (err) => {
        console.error('❌ [App.tsx] Socket connection error:', err);
      });
      
      // Cleanup เมื่อ component unmount หรือ user เปลี่ยน
      return () => {
        if (socketRef.current) {
          console.log('🔌 [App.tsx] Disconnecting socket');
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    } else {
      // ถ้าไม่มี user ให้ disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, [user?._id]);

  useRealTimeUpdate('newNotification', (notification) => {
    console.log('🔔 [App.tsx] useRealTimeUpdate: New notification received:', notification);
    console.log('🔔 [App.tsx] useRealTimeUpdate: Notification type:', notification.type);
    console.log('🔔 [App.tsx] useRealTimeUpdate: Notification message:', notification.message);
    console.log('🔔 [App.tsx] useRealTimeUpdate: Notification recipientId:', notification.recipientId);
    console.log('🔔 [App.tsx] useRealTimeUpdate: Current user ID:', user?._id);
    console.log('🔔 [App.tsx] useRealTimeUpdate: Notification data:', notification.data);
    console.log('🔔 [App.tsx] useRealTimeUpdate: Full notification object:', JSON.stringify(notification, null, 2));
    
    // ตรวจสอบว่าเป็น notification สำหรับผู้ใช้ปัจจุบันหรือไม่
    // แปลงเป็น string เพื่อเปรียบเทียบ
    const recipientId = notification.recipientId?.toString();
    const userId = user?._id?.toString();
    
    console.log('🔔 [App.tsx] useRealTimeUpdate: Comparing recipientId:', recipientId, 'with userId:', userId);
    
    if (recipientId && recipientId !== userId) {
      console.log('⏭️ [App.tsx] useRealTimeUpdate: Notification not for current user, ignoring');
      return;
    }
    
    console.log('✅ [App.tsx] useRealTimeUpdate: Notification is for current user, updating state');
    
    // ตรวจสอบและแปลง createdAt เป็น Date object ถ้ายังไม่ใช่
    const processedNotification = {
      ...notification,
      createdAt: notification.createdAt ? (notification.createdAt instanceof Date ? notification.createdAt : new Date(notification.createdAt)) : new Date()
    };
    
    // สร้าง key สำหรับ notification เพื่อตรวจสอบว่าแสดง toast แล้วหรือยัง
    const notificationKey = processedNotification._id || `${processedNotification.type}_${processedNotification.createdAt}_${processedNotification.recipientId}`;
    
    // อัปเดต notifications state
    setNotifications(prev => {
      // ตรวจสอบว่า notification นี้มีอยู่แล้วหรือไม่ (ป้องกัน duplicate)
      const exists = prev.some(n => n._id === processedNotification._id || (n.type === processedNotification.type && n.data?.reportId === processedNotification.data?.reportId));
      if (exists) {
        console.log('⚠️ [App.tsx] useRealTimeUpdate: Notification already exists, skipping');
        return prev;
      }
      
      const newNotifications = [processedNotification, ...prev];
      console.log('🔔 [App.tsx] useRealTimeUpdate: Updated notifications count:', newNotifications.length);
      console.log('🔔 [App.tsx] useRealTimeUpdate: First notification:', newNotifications[0]);
      return newNotifications;
    });
    
    // อัปเดต unread count (เฉพาะถ้า notification ยังไม่ได้อ่าน)
    if (!processedNotification.isRead) {
      setUnreadCount(prev => {
        const newCount = prev + 1;
        console.log('🔔 [App.tsx] useRealTimeUpdate: Updated unread count:', newCount);
        return newCount;
      });
    }
    
    updateNotification(processedNotification);
    
    // แสดง toast notification เฉพาะเมื่อ:
    // 1. Notification ยังไม่ได้อ่าน (isRead = false)
    // 2. ยังไม่เคยแสดง toast สำหรับ notification นี้
    if (!processedNotification.isRead && !notificationHistory.current.has(notificationKey)) {
      // เพิ่ม notification key เข้าไปใน history เพื่อป้องกันการแสดงซ้ำ
      notificationHistory.current.add(notificationKey);
      
      // จำกัดขนาดของ history (เก็บแค่ 50 รายการล่าสุด)
      if (notificationHistory.current.size > 50) {
        const oldest = Array.from(notificationHistory.current).sort()[0];
        notificationHistory.current.delete(oldest);
      }
      
      // แสดง toast notification
      success(processedNotification.message || processedNotification.title || 'มีการแจ้งเตือนใหม่');
      console.log('🔔 [App.tsx] useRealTimeUpdate: Showing toast notification for:', notificationKey);
    } else {
      console.log('⏭️ [App.tsx] useRealTimeUpdate: Skipping toast notification (already read or already shown):', notificationKey);
    }
  }, [user?._id, setNotifications, setUnreadCount, updateNotification, success]);

  
  // Function to handle Learn More button click - scrolls to specific Premium section
  const handleLearnMoreClick = () => {
    setActiveTab('membership')
    
    // Scroll to benefits comparison table after switching to membership tab
    setTimeout(() => {
      // Try to find the benefits comparison table first
      const benefitsComparisonTable = document.getElementById('benefits-comparison-table') as HTMLElement
      if (benefitsComparisonTable) {
        benefitsComparisonTable.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        })
      } else {
        // Fallback to membership comparison section
        const membershipComparison = document.getElementById('membership-comparison') as HTMLElement
        if (membershipComparison) {
          membershipComparison.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        } else {
          // Fallback to membership content if comparison section not found
          const membershipContent = document.getElementById('membership-content') as HTMLElement
          if (membershipContent) {
            membershipContent.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            })
          }
        }
      }
    }, 400) // Longer delay to ensure membership content is fully rendered
  }

  // Function to handle vote user profile navigation
  const handleVoteUserProfileClick = (userData: any) => {
    
    if (!userData || !userData._id) {
      console.error('❌ Invalid userData:', userData)
      return
    }
    
    
    // สร้างข้อมูลโปรไฟล์ในรูปแบบที่ handleViewProfile ต้องการ
    const profileData = {
      id: userData._id,
      name: userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'ไม่ระบุชื่อ',
      age: userData.age || (userData.dateOfBirth ? new Date().getFullYear() - new Date(userData.dateOfBirth).getFullYear() : 'N/A'),
      location: userData.location || 'ไม่ระบุ',
      distance: 'Popular Vote',
      bio: userData.bio || '',
      interests: Array.isArray(userData.interests)
        ? userData.interests.map((it: any) => it?.category || it?.name || `${it}`).filter(Boolean)
        : [],
      images: userData.profileImages || [], // ใช้ profileImages เดิม
      verified: userData.isVerified || false,
      online: userData.isOnline || false,
      lastActive: userData.lastActive,
      membershipTier: userData.membership?.tier || userData.membershipTier || 'member',
      membership: {
        tier: userData.membership?.tier || userData.membershipTier || 'member'
      }
    }
    
    
    // ใช้ handleViewProfile ที่มีการตรวจสอบสิทธิ์แทนการเปิด modal โดยตรง
    handleViewProfile(profileData);
  }

  // Function to close vote user profile
  const handleCloseVoteUserProfile = () => {
    setSelectedVoteUser(null)
    setShowVoteUserProfile(false)
  }

  // Function to handle tab change with immediate scroll behavior
  const handleTabChange = (newTab: 'discover' | 'matches' | 'messages' | 'membership' | 'profile' | 'payment') => {
    setActiveTab(newTab)
    
    // REMOVED: Special handling for messages tab (25 lines - Chat functionality removed)
    
    // Special scroll behavior for matches tab
    if (newTab === 'matches') {
      setTimeout(() => {
        // Try to find the matches content area by ID first
        const matchesContent = document.getElementById('matches-content') as HTMLElement
        if (matchesContent) {
          matchesContent.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        } else {
          // Fallback to tab navigation if matches content not found
          const tabNavigation = document.querySelector('[role="tablist"]') as HTMLElement
          if (tabNavigation) {
            tabNavigation.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            })
          }
        }
      }, 200) // Longer delay to ensure matches content is fully rendered
    } else if (newTab === 'membership') {
      // For membership tab - just switch tab without scrolling to specific section
      // This allows normal tab navigation without auto-scrolling
      setTimeout(() => {
        const tabNavigation = document.querySelector('[role="tablist"]') as HTMLElement
        if (tabNavigation) {
          tabNavigation.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        }
      }, 100)
    } else {
      // Default scroll behavior for other tabs
      setTimeout(() => {
        const tabNavigation = document.querySelector('[role="tablist"]') as HTMLElement
        if (tabNavigation) {
          tabNavigation.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        }
      }, 100) // Small delay to ensure tab content is rendered
    }
  }
  // Additional state that's not covered by custom hooks
  // const [isFetchingPrivateChats, setIsFetchingPrivateChats] = useState(false) // REMOVED: Chat state
  const notificationHistory = useRef(new Set<string>())
  
  // Debug wrapper for setShowProfileModal
  const setShowProfileModalDebug = (value: boolean) => {
    setShowProfileModal(value);
  }

  // ฟังก์ชันโหลดข้อมูล liked users จาก backend
  
  // Polling for new notifications
  useEffect(() => {
    if (!user?._id) return
    
    // Fetch initial notifications
    fetchNotifications()
    
    // Set up polling every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [user?._id, fetchNotifications])


  // Listen for real-time notification updates from auto refresh
  useEffect(() => {
    const handleNotificationsUpdated = (event: CustomEvent) => {
      const { notifications: fetchedNotifications } = event.detail;
      console.log('🔄 [App.tsx] Received notifications update from auto refresh:', fetchedNotifications?.length, 'items');
      
      if (fetchedNotifications && Array.isArray(fetchedNotifications)) {
        setNotifications(prev => {
          // Merge notifications: รวม notifications จาก API กับ notifications ที่มีอยู่แล้ว
          // ใช้ _id หรือ createdAt เป็น key เพื่อตรวจสอบ duplicate
          const notificationMap = new Map();
          
          // เพิ่ม notifications ที่มีอยู่แล้วก่อน (prioritize real-time notifications)
          prev.forEach(n => {
            const key = n._id || `${n.type}_${n.createdAt}_${n.recipientId}`;
            notificationMap.set(key, n);
          });
          
          // เพิ่ม notifications จาก API (จะไม่ overwrite ถ้ามีอยู่แล้ว)
          fetchedNotifications.forEach(n => {
            const key = n._id || `${n.type}_${n.createdAt}_${n.recipientId}`;
            if (!notificationMap.has(key)) {
              notificationMap.set(key, n);
            }
          });
          
          // แปลงกลับเป็น array และเรียงตาม createdAt (ใหม่สุดก่อน)
          const mergedNotifications = Array.from(notificationMap.values()).sort((a, b) => {
            const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
            const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
            return timeB - timeA;
          });
          
          console.log('🔄 [App.tsx] Merged notifications:', {
            prevCount: prev.length,
            fetchedCount: fetchedNotifications.length,
            mergedCount: mergedNotifications.length
          });
          
          // ตรวจสอบว่า notifications เปลี่ยนจริงหรือไม่
          if (JSON.stringify(prev) === JSON.stringify(mergedNotifications)) {
            return prev; // ไม่เปลี่ยน state ถ้าเหมือนเดิม
          }
          
          return mergedNotifications;
        });
        
        // อัปเดต unread count จาก merged notifications
        setNotifications(current => {
          const unreadCount = current.filter(n => !n.isRead).length;
          setUnreadCount(prev => prev === unreadCount ? prev : unreadCount);
          return current;
        });
      }
    };

    window.addEventListener('notificationsUpdated', handleNotificationsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdated as EventListener);
    };
  }, [setNotifications, setUnreadCount])

  // Listen for navigation messages from privacy policy page
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'navigate') {
        // console.log('🔗 Received navigation message from privacy policy:', event.data);
        
        // กลับไปหน้าหลัก (ค้นหา)
        if (event.data.tab === 'discover') {
          setActiveTab('discover');
          handleTabChange('discover');
        } else if (event.data.route === '/') {
          setActiveTab('discover');
          handleTabChange('discover');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [])

  // Start auto refresh for notifications when user is logged in
  useEffect(() => {
    if (!user?._id) return;

    // console.log('🚀 App: Starting notification auto refresh for user:', user._id);
    
    // Start notification refresh only (not full chat refresh)
    autoRefreshManager.startRefresh('notifications', () => {
      autoRefreshManager.refreshNotifications(user._id);
    }, 'normal');

    return () => {
      // Stop notification refresh when component unmounts
      autoRefreshManager.stopRefresh('notifications');
    };
  }, [user?._id])

  // Mark all notifications as read when notification dropdown is opened
  useEffect(() => {
    if (showNotificationDropdown && unreadCount > 0 && markAllNotificationsAsRead) {
      markAllNotificationsAsRead()
    }
  }, [showNotificationDropdown, unreadCount, markAllNotificationsAsRead])
  
  // Format time ago
  const formatTimeAgo = (timestamp: string | Date) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'เมื่อสักครู่'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`
    return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`
  }
  
  // Render notification item
  const renderNotificationItem = (notification: any) => {
    const { type, data, createdAt, isRead, title, message } = notification
    
    const handleNotificationClick = async () => {
      // Mark notification as read
      if (!isRead) {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/notifications/${user?._id}/mark-read`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              notificationIds: [notification._id],
              notificationType: type // ส่งประเภทแจ้งเตือนไปด้วย
            })
          })
          
          if (response.ok) {
            // สำหรับทุกประเภทการแจ้งเตือน ให้ mark เป็น read (ไม่ลบออก)
            setNotifications(prev => prev.map(n => 
              n._id === notification._id ? { ...n, isRead: true } : n
            ))
            setUnreadCount(prev => Math.max(0, prev - 1))
          }
        } catch (error) {
          console.error('Error marking notification as read:', error)
        }
      }
      
      // REMOVED: private_message and public_chat_reply notification handlers - All Chat functionality removed
      
      // Handle report notifications - navigate to admin dashboard and open report
      if (type === 'report_created' || type === 'report_response' || type === 'report_status_update' || type === 'report_assigned' || type === 'report_priority_update') {
        if (data?.reportId) {
          // ตรวจสอบว่าเป็น admin/mod/support หรือไม่
          if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'mod' || user?.role === 'support') {
            // เก็บ reportId ใน sessionStorage เพื่อให้ AdminDashboard เปิด report detail
            sessionStorage.setItem('openReportId', data.reportId.toString());
            // ปิด notifications dropdown
            setShowNotificationDropdown(false);
            // Navigate ไปยัง admin dashboard
            window.location.href = '/admin?view=reports';
          } else {
            // ถ้าไม่ใช่ admin ให้แสดงข้อความ
            warning('คุณไม่มีสิทธิ์เข้าถึงรายงานนี้');
            setShowNotificationDropdown(false);
          }
        } else {
          console.error('❌ Report notification missing reportId:', notification);
          warning('ไม่พบข้อมูลรายงาน');
          setShowNotificationDropdown(false);
        }
        return;
      }
      
      if (type === 'profile_like' || type === 'profile_star') {
        // ไปหน้าโปรไฟล์ของผู้ที่กดไลค์/ดาว
        if (data.voterId) {
          const profileData = {
            id: data.voterId,
            name: data.voterName || 'Unknown User',
            images: data.voterProfileImage ? [data.voterProfileImage] : [],
            verified: false,
            online: false,
            membershipTier: 'member'
          }
          
          handleViewProfile(profileData)
        }
        
        // ปิด notifications dropdown
        setShowNotificationDropdown(false)
      } else if (type === 'blur_payment') {
        // ไปหน้าโปรไฟล์ของผู้ที่ซื้อภาพ
        if (data.buyerId) {
          const profileData = {
            id: data.buyerId,
            name: data.buyerName || 'Unknown User',
            images: data.buyerProfileImage ? [data.buyerProfileImage] : [],
            verified: false,
            online: false,
            membershipTier: 'member'
          }
          
          handleViewProfile(profileData)
        }
        
        // ปิด notifications dropdown
        setShowNotificationDropdown(false)
      } else if (type === 'wheel_prize') {
        // ไปหน้า premium/membership เพื่อดูรางวัล
        setActiveTab('membership')
        
        // ปิด notifications dropdown
        setShowNotificationDropdown(false)
      }
    }
    
    if (type === 'private_message') {
      return (
        <div 
          key={notification._id} 
          className={`px-4 py-3 border-b border-gray-100 ${!isRead ? 'bg-blue-50' : ''}`}
        >
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              {data?.senderProfileImage && !data.senderProfileImage.startsWith('data:image/svg+xml') ? (
                <img 
                  src={getProfileImageUrl(data.senderProfileImage, data.senderId)}
                  alt={data.senderName || 'User'}
                  className="w-10 h-10 object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{title || 'ข้อความใหม่'}</p>
              <p className="text-xs text-gray-500">{message || `${data.senderName} ส่งข้อความมา`}</p>
              {data.messageContent && (
                <p className="text-xs text-gray-400 mt-1 truncate">{data.messageContent}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
            </div>
            {!isRead && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
          </div>
        </div>
      )
    }
    
    if (type === 'profile_like') {
      return (
        <div 
          key={notification._id} 
          onClick={handleNotificationClick}
          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-pink-50' : ''}`}
        >
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              {data.voterProfileImage && !data.voterProfileImage.startsWith('data:image/svg+xml') ? (
                <img 
                  src={getProfileImageUrl(data.voterProfileImage, data.voterId)}
                  alt={data.voterName}
                  className="w-10 h-10 object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <Heart className="h-5 w-5 text-pink-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{title || 'คุณได้รับไลค์'}</p>
              <p className="text-xs text-gray-500">{message || 'คุณได้รับ ❤️'}</p>
              <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
            </div>
            {!isRead && <div className="w-2 h-2 bg-pink-500 rounded-full"></div>}
          </div>
        </div>
      )
    }

    if (type === 'profile_star') {
      return (
        <div 
          key={notification._id} 
          onClick={handleNotificationClick}
          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-yellow-50' : ''}`}
        >
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              {data.voterProfileImage && !data.voterProfileImage.startsWith('data:image/svg+xml') ? (
                <img 
                  src={getProfileImageUrl(data.voterProfileImage, data.voterId)}
                  alt={data.voterName}
                  className="w-10 h-10 object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{title || 'คุณได้รับดาว'}</p>
              <p className="text-xs text-gray-500">{message || 'คุณได้รับ ⭐'}</p>
              <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
            </div>
            {!isRead && <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>}
          </div>
        </div>
      )
    }

    if (type === 'public_chat_reply') {
      return (
        <div 
          key={notification._id} 
          onClick={handleNotificationClick}
          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-green-50' : ''}`}
        >
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              {data.senderProfileImage && !data.senderProfileImage.startsWith('data:image/svg+xml') ? (
                <img 
                  src={getProfileImageUrl(data.senderProfileImage, data.senderId)}
                  alt={data.senderName}
                  className="w-10 h-10 object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{title || 'มีคนตอบกลับข้อความคุณ'}</p>
              <p className="text-xs text-gray-500">{message || `${data.senderName} ตอบกลับข้อความของคุณ`}</p>
              {data.messageContent && (
                <p className="text-xs text-gray-400 mt-1 truncate">{data.messageContent}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
            </div>
            {!isRead && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
          </div>
        </div>
      )
    }

    if (type === 'blur_payment') {
      return (
        <div 
          key={notification._id} 
          onClick={handleNotificationClick}
          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-purple-50' : ''}`}
        >
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              {data.buyerProfileImage && !data.buyerProfileImage.startsWith('data:image/svg+xml') ? (
                <img 
                  src={getProfileImageUrl(data.buyerProfileImage, data.buyerId)}
                  alt={data.buyerName}
                  className="w-10 h-10 object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Coins className="h-5 w-5 text-purple-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{title || 'คุณได้รับเหรียญ'}</p>
              <p className="text-xs text-gray-500">{message || `${data.buyerName} จ่ายเหรียญเพื่อดูภาพของคุณ`}</p>
              <p className="text-xs text-purple-600 mt-1 font-medium">+{data.amount?.toLocaleString()} เหรียญ</p>
              <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
            </div>
            {!isRead && <div className="w-2 h-2 bg-purple-500 rounded-full"></div>}
          </div>
        </div>
      )
    }

    if (type === 'wheel_prize') {
      return (
        <div 
          key={notification._id} 
          onClick={handleNotificationClick}
          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-orange-50' : ''}`}
        >
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Trophy className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{title || 'รางวัลจากหมุนวงล้อ'}</p>
              <p className="text-xs text-gray-500">{message || 'คุณได้รับรางวัลจากหมุนวงล้อ'}</p>
              {data.amount && (
                <p className="text-xs text-orange-600 mt-1 font-medium">
                  {data.prizeType === 'coins' ? `+${data.amount} เหรียญ` : 
                   data.prizeType === 'votePoints' ? `+${data.amount} โหวต` : 
                   'รางวัลใหญ่'}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
            </div>
            {!isRead && <div className="w-2 h-2 bg-orange-500 rounded-full"></div>}
          </div>
        </div>
      )
    }

    // Report notifications
    if (type === 'report_created' || type === 'report_response' || type === 'report_status_update' || type === 'report_assigned' || type === 'report_priority_update') {
      const getReportIcon = () => {
        if (type === 'report_response') return <MessageCircle className="h-5 w-5 text-blue-600" />
        if (type === 'report_status_update') {
          if (data?.status === 'resolved' || data?.status === 'closed') return <CheckCircle className="h-5 w-5 text-green-600" />
          if (data?.status === 'rejected') return <XCircle className="h-5 w-5 text-red-600" />
          return <Clock className="h-5 w-5 text-yellow-600" />
        }
        if (type === 'report_assigned') return <Star className="h-5 w-5 text-purple-600" />
        if (type === 'report_priority_update') return <Flag className="h-5 w-5 text-orange-600" />
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      }

      const getReportBgColor = () => {
        if (type === 'report_response') return 'bg-blue-50'
        if (type === 'report_status_update') {
          if (data?.status === 'resolved' || data?.status === 'closed') return 'bg-green-50'
          if (data?.status === 'rejected') return 'bg-red-50'
          return 'bg-yellow-50'
        }
        if (type === 'report_assigned') return 'bg-purple-50'
        if (type === 'report_priority_update') return 'bg-orange-50'
        return 'bg-red-50'
      }

      const reportTitle = data?.reportTitle || data?.title || null
      const category = data?.category || null
      const categoryName = data?.categoryName || 
        (category === 'membership_upgrade' ? 'อัพเกรดแล้ว tier ไม่ขึ้น' :
         category === 'user_harassment' ? 'บล็อก user ที่มากวน' :
         category === 'payment_issue' ? 'ปัญหาการชำระเงิน' :
         category === 'technical_issue' ? 'ปัญหาทางเทคนิค' :
         category === 'bug_report' ? 'รายงาน bug' :
         category === 'feature_request' ? 'ขอฟีเจอร์ใหม่' :
         category === 'account_issue' ? 'ปัญหาบัญชี' :
         category === 'other' ? 'อื่นๆ' : category)
      const priority = data?.priority || null
      const priorityName = data?.priorityName || 
        (priority === 'low' ? 'ต่ำ' :
         priority === 'medium' ? 'ปานกลาง' :
         priority === 'high' ? 'สูง' :
         priority === 'urgent' ? 'ด่วน' : priority)
      const reportedBy = data?.reportedBy || null

      return (
        <div 
          key={notification._id} 
          onClick={handleNotificationClick}
          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? getReportBgColor() : ''}`}
        >
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              <div className={`w-10 h-10 ${getReportBgColor()} rounded-full flex items-center justify-center`}>
                {getReportIcon()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{title || 'รายงานปัญหา'}</p>
              <p className="text-xs text-gray-500">{message || 'มีรายงานปัญหาใหม่'}</p>
              
              {/* แสดงรายละเอียด report */}
              {reportTitle && (
                <p className="text-xs text-gray-600 mt-1 font-medium truncate">
                  หัวข้อ: {reportTitle}
                </p>
              )}
              
              {categoryName && (
                <p className="text-xs text-gray-500 mt-1">
                  ประเภท: {categoryName}
                </p>
              )}
              
              {priorityName && (
                <p className="text-xs text-gray-500 mt-1">
                  ความสำคัญ: {priorityName}
                </p>
              )}
              
              {reportedBy && (
                <p className="text-xs text-gray-500 mt-1">
                  จาก: {reportedBy.displayName || reportedBy.username || 'ผู้ใช้'}
                </p>
              )}
              
              <p className="text-xs text-blue-600 mt-2 font-medium cursor-pointer hover:underline">
                คลิกเพื่อดูรายละเอียด →
              </p>
              
              <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
            </div>
            {!isRead && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
          </div>
        </div>
      )
    }
    
    return null
  }
  

  // REMOVED: fetchChatRooms function

  // REMOVED: fetchPrivateChats function (Chat functionality removed)


  // REMOVED: updateRecipientChatList function (Chat functionality removed)

  // REMOVED: createPrivateChat function (Chat functionality removed)

  // REMOVED: removeDuplicateMessages function (Chat functionality removed)

  // REMOVED: fetchMessages function (Chat functionality removed)

  // Check maintenance mode status
  const checkMaintenanceMode = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/maintenance/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const isMaintenance = data.data?.isMaintenanceMode || false;
        setIsMaintenanceMode(isMaintenance);
        
        // Clear bypass flag if maintenance mode is off
        if (!isMaintenance) {
          localStorage.removeItem('bypassMaintenance');
          setBypassMaintenance(false);
        }
      } else {
        console.error('Maintenance mode check failed:', response.status);
        setIsMaintenanceMode(false);
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
      // Default to false if check fails
      setIsMaintenanceMode(false);
    } finally {
      setMaintenanceChecked(true);
    }
  };

  // Handle dev access to maintenance mode
  const handleDevAccess = (code: string) => {
    if (code === 'DEV2025LOVE') {
      setHasDevAccess(true);
      localStorage.setItem('devAccess', 'true');
      showWebappNotification('เข้าสู่ระบบในโหมด Developer สำเร็จ! คุณสามารถเข้าถึงระบบได้แล้ว แต่หน้า Maintenance Mode ยังคงแสดงอยู่', 'success');
    }
  };

  // Check authentication on mount
  useEffect(() => {
    
    // Check maintenance mode first
    checkMaintenanceMode();
    
    // Check bypass maintenance flag
    const bypassFlag = localStorage.getItem('bypassMaintenance') === 'true';
    setBypassMaintenance(bypassFlag);
    
    
    if (user) {
      setIsAuthenticated(true)
      // โหลดข้อมูล liked users เมื่อผู้ใช้เข้าสู่ระบบแล้ว
      const loadLikedUsers = async () => {
        try {
          const result = await userAPI.fetchLikedUsers(user._id);
          if (result.success && result.data) {
            setLikedProfiles(new Set(result.data));
          }
        } catch (error) {
          console.error('❌ Error loading liked users:', error);
        }
      };
      loadLikedUsers();
      // โหลดข้อมูลห้องแชทสาธารณะ
      // REMOVED: fetchChatRooms() - Chat functionality removed

  // ดึงข้อมูลแชทส่วนตัวจาก API
  // REMOVED: fetchPrivateChats() - Chat functionality removed
    } else {
      setIsAuthenticated(false)
      console.log('👤 User not logged in, skipping chat restoration');
    }
  }, [user])

  // REMOVED: useEffect for saving chats to localStorage (29 lines - Chat functionality removed)

  // REMOVED: useEffect for loading chats from localStorage (18 lines - Chat functionality removed)

  // REMOVED: useEffect for loading chats immediately on mount (44 lines - Chat functionality removed)

  // REMOVED: useEffect for loading chats on page load (23 lines - Chat functionality removed)

  // REMOVED: useEffect for loading chats on activeTab change (57 lines - Chat functionality removed)

  // จัดการข้อความที่ได้รับจาก Socket
  // Removed duplicate listener - handled in the main private chat useEffect below


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // ไม่ให้ปิด modal ถ้ากำลังป้องกันการปิด
      if (preventModalClose) {
        console.log('🔒 Preventing modal close due to preventModalClose flag');
        return;
      }
      
      if (showProfileDropdown) {
        const target = event.target as HTMLElement
        if (!target.closest('.profile-dropdown-container')) {
          setShowProfileDropdown(false)
        }
      }
      
      if (showNotificationDropdown) {
        const target = event.target as HTMLElement
        if (!target.closest('.notification-dropdown-container')) {
          setShowNotificationDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileDropdown, showNotificationDropdown, preventModalClose])

  // Load Premium Members for Discover tab (from backend only) - แก้ไขให้ใช้ข้อมูลโหวตจากแหล่งเดียวกันกับ Top Vote
  useEffect(() => {
    // ฟังก์ชันสำหรับโหลด Premium Members
    const loadPremiumMembers = async () => {
      console.log('🔄 Loading premium members...');
      try {
        const result = await userAPI.loadPremium();
        if (result.success && result.data) {
          // ใช้ค่าจาก API โดยตรง (ไม่ต้องตั้งเป็น 0)
          const usersWithVotes = result.data.map((user: any) => ({
            ...user,
            totalVotes: user.totalVotes || 0,
            uniqueVoterCount: user.uniqueVoterCount || 0
          }));
          
          const sorted = usersWithVotes
            .filter((u: any) => {
              const currentUserId = user?._id || user?.id;
              const userId = u._id || u.id;
              return currentUserId !== userId;
            })
            .sort((a: any, b: any) => {
              const ai = PREMIUM_TIER_ORDER.indexOf((a?.membership?.tier || '') as string);
              const bi = PREMIUM_TIER_ORDER.indexOf((b?.membership?.tier || '') as string);
              return ai - bi;
            })
            .slice(0, 50);
          
          console.log('✅ Premium members loaded:', sorted.length, 'users');
          console.log('📊 Premium members vote stats:', sorted.map((u: any) => ({ 
            name: u.nickname || u.username, 
            totalVotes: u.totalVotes 
          })));
          setPremiumUsers(sorted);
        } else {
          console.warn('⚠️ Failed to load premium members:', result.error);
        }
      } catch (error) {
        console.error('❌ Error loading premium users:', error);
      }
    };

    // เพิ่มการจัดการ event refreshPremiumUsers
    const handleRefreshPremiumUsers = async () => {
      console.log('🔄 Event received: refreshPremiumUsers');
      await loadPremiumMembers();
    };
    
    // โหลด Premium Members เมื่อ component mount หรือเมื่อเข้าหน้า Discover
    // แก้ไข: โหลดแม้ว่าจะยังไม่ได้ล็อกอิน (user อาจเป็น null)
    // โหลดเมื่อเข้าหน้า Discover หรือเมื่อ user เปลี่ยน (เพื่อ filter ตัวเองออกเมื่อล็อกอิน)
    if (activeTab === 'discover') {
      console.log('🔄 Loading premium members (discover tab)...');
      loadPremiumMembers();
    }
    
    window.addEventListener('refreshPremiumUsers', handleRefreshPremiumUsers);
    
    return () => { 
      window.removeEventListener('refreshPremiumUsers', handleRefreshPremiumUsers);
    }
  }, [user, activeTab]) // เพิ่ม user และ activeTab เป็น dependency เพื่อให้โหลดใหม่เมื่อ user หรือ tab เปลี่ยน

  // โหลดข้อมูลห้องแชทเมื่อเข้าหน้าแชท
  useEffect(() => {
    if (user && activeTab === 'messages') {
      console.log('🔄 เข้าหน้าแชท - โหลดข้อมูลห้องแชท...');
      // REMOVED: fetchChatRooms() - Chat functionality removed;
    }
  }, [user, activeTab]);

  useEffect(() => {
    const handleUserDataUpdated = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      console.log('🔄 App received userDataUpdated event:', detail);
      setForceUpdate(prev => prev + 1);
    };

    window.addEventListener('userDataUpdated', handleUserDataUpdated);
    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdated);
    };
  }, [setForceUpdate]);

  // โหลด Premium Members เมื่อ forceUpdate เปลี่ยน
  useEffect(() => {
    if (user && forceUpdate) {
      console.log('🔄 Force update detected - reloading premium members...');
      const loadPremiumMembers = async () => {
        try {
          const result = await userAPI.loadPremium();
          if (result.success && result.data) {
            // ใช้ค่าจาก API โดยตรง (ไม่ต้องตั้งเป็น 0)
            const usersWithVotes = result.data.map((user: any) => ({
              ...user,
              totalVotes: user.totalVotes || 0,
              uniqueVoterCount: user.uniqueVoterCount || 0
            }));
            
            const sorted = usersWithVotes
              .filter((u: any) => {
                const currentUserId = user?._id || user?.id;
                const userId = u._id || u.id;
                return currentUserId !== userId;
              })
              .sort((a: any, b: any) => {
                const ai = PREMIUM_TIER_ORDER.indexOf((a?.membership?.tier || '') as string);
                const bi = PREMIUM_TIER_ORDER.indexOf((b?.membership?.tier || '') as string);
                return ai - bi;
              })
              .slice(0, 50);
            
            setPremiumUsers(sorted);
          }
        } catch (error) {
          console.error('❌ Error reloading premium users:', error);
        }
      };
      
      loadPremiumMembers();
    }
  }, [user, forceUpdate])

  // REMOVED: useEffect for auto-selecting chat room - All Chat functionality removed

  // Function to fetch premium users (extracted from useEffect)
  // const fetchPremiumUsers = async () => {
  //   try {
  //     const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  //     const token = localStorage.getItem('token');
  //     
  //     const res = await fetch(`${base}/api/profile/premium?limit=50`, {
  //       headers: {
  //         'Content-Type': 'application/json',
  //         ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  //       }
  //     })
  //     if (!res.ok) return
  //     const data = await res.json()
  //     const users: PublicUser[] = data?.data?.users || []
  //     // Ensure final ordering and cap
  //     const sorted = users
  //       .sort((a: PublicUser, b: PublicUser) => {
  //         const ai = premiumTierOrder.indexOf((a?.membership?.tier || '') as string)
  //         const bi = premiumTierOrder.indexOf((b?.membership?.tier || '') as string)
  //         return ai - bi
  //       })
  //       .slice(0, 50)
  //     setPremiumUsers(sorted)
  //   } catch (_) {
  //     // ignore errors for this section
  //   }
  // }

  // Helper function for webapp notification with duplicate prevention
  const showWebappNotification = (message: string, type: 'warning' | 'error' | 'success' = 'warning') => {
    // สร้าง unique key สำหรับ notification
    const notificationKey = `${message}_${type}_${Date.now()}`;
    
    // ตรวจสอบว่า notification นี้แสดงไปแล้วหรือไม่ใน 3 วินาทีที่ผ่านมา
    const now = Date.now();
    const recentNotifications = Array.from(notificationHistory.current).filter(key => {
      const timestamp = parseInt(key.split('_').pop() || '0');
      return now - timestamp < 3000; // 3 วินาที
    });
    
    const isDuplicate = recentNotifications.some(key => 
      key.startsWith(`${message}_${type}_`)
    );
    
    if (isDuplicate) {
      console.log('🔔 Duplicate notification prevented:', { message, type });
      return;
    }
    
    // เพิ่ม notification ลงใน history
    notificationHistory.current.add(notificationKey);
    
    // ลบ notification เก่าออกจาก history (เก็บแค่ 10 รายการล่าสุด)
    if (notificationHistory.current.size > 10) {
      const oldest = Array.from(notificationHistory.current).sort()[0];
      notificationHistory.current.delete(oldest);
    }
    
    console.log('🔔 Showing notification:', { message, type });
    // Use toast notification
    switch (type) {
      case 'success':
        success(message);
        break;
      case 'error':
        error(message);
        break;
      case 'warning':
      default:
        warning(message);
        break;
    }
  };

  // Load all users for Discover Amazing People section
  // โหลดข้อมูลผู้ใช้เมื่อเข้าหน้า Discover
  useEffect(() => {
    if (activeTab !== 'discover' || isLoadingAllUsers) return;

    const loadDiscoverUsers = async () => {
      try {
        setIsLoadingAllUsers(true);
        console.log('🔄 Loading discover users...');
        
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${base}/api/profile/discover?limit=50`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            console.log(`✅ Loaded ${data.data.users.length} discover users`);
            setAllUsers(data.data.users || []);
            // Handle pagination if available, otherwise assume no more pages
            if (data.data.pagination) {
              setHasMoreUsers(data.data.pagination.page < data.data.pagination.pages);
            } else {
              setHasMoreUsers(false);
            }
            setCurrentPage(1);
            setVisibleCount(Math.min(12, data.data.users.length));
          }
        } else {
          console.error('❌ Failed to load discover users:', response.status);
        }
      } catch (error) {
        console.error('❌ Error loading discover users:', error);
      } finally {
        setIsLoadingAllUsers(false);
      }
    };

    // โหลดข้อมูลเมื่อเข้าหน้า Discover
    loadDiscoverUsers();
  }, [activeTab]);

  // อัปเดตสถานะ online/offline แบบ real-time สำหรับ Discover tab
  useEffect(() => {
    if (activeTab !== 'discover') return;

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // ดึงข้อมูลผู้ใช้ที่ออนไลน์ล่าสุด
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/users/online-status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const onlineUsers = result.data.onlineUsers || [];
            console.log(`🟢 Found ${onlineUsers.length} online users for Discover`);
            
            // อัปเดตสถานะ online ใน allUsers
            setAllUsers(prevUsers => 
              prevUsers.map(user => {
                const isOnline = onlineUsers.some(onlineUser => 
                  onlineUser._id === user._id
                );
                
                return {
                  ...user,
                  isOnline: isOnline,
                  lastActive: (user as any).lastActive
                };
              })
            );
          }
        }
      } catch (error) {
        console.error('❌ Error updating online status for Discover:', error);
      }
    }, 10000); // อัปเดตทุก 10 วินาที

    return () => clearInterval(interval);
  }, [activeTab])


  
  
  // ตั้งค่า avatarUrl จาก user.profileImages เมื่อ user login หรือ user data มี profileImages
  useEffect(() => {
    if (user && (user.profileImages || user.images)) {
      const profileImages = user.profileImages || user.images || [];
      const userId = user._id || user.id;
      const mainImageIndex = user.mainProfileImageIndex || 0;
      
      if (profileImages.length > 0) {
        try {
          const imageUrl = getMainProfileImage(profileImages, mainImageIndex, userId);
          if (imageUrl) {
            console.log('🖼️ Setting avatarUrl from user profileImages:', imageUrl);
            setAvatarUrl(imageUrl);
          } else {
            console.log('🖼️ No valid image URL found, clearing avatarUrl');
            setAvatarUrl(null);
          }
        } catch (error) {
          console.error('❌ Error setting avatarUrl from user profileImages:', error);
          setAvatarUrl(null);
        }
      } else {
        console.log('🖼️ No profile images available, clearing avatarUrl');
        setAvatarUrl(null);
      }
    } else if (!user) {
      // Clear avatarUrl when user logs out
      setAvatarUrl(null);
    }
  }, [user?.profileImages, user?.images, user?.mainProfileImageIndex, user?._id, user?.id]);

  // ฟัง event เมื่อมีการอัปเดตรูปโปรไฟล์
  useEffect(() => {
    const handleProfileImageUpdate = (event: CustomEvent) => {
      const { userId, profileImages } = event.detail;
      if (user?._id === userId || user?.id === userId) {
        const mainImageIndex = event.detail.mainProfileImageIndex || 0;
        const img = profileImages?.[mainImageIndex];
        console.log('🎯 App.tsx event update');
              if (img && typeof img === 'string' && !img.startsWith('data:image/svg+xml')) {
          const avatarUrl = getProfileImageUrl(img, userId)
          setAvatarUrl(avatarUrl);
        } else {
          setAvatarUrl(null);
        }
      }
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
    };
  }, [user]);

  // ฟัง event สำหรับการอัปเดตสเตตัสข้อความ (เพิ่ม debouncing)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const handleMessageStatusUpdate = (event: CustomEvent) => {
      // Clear previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Debounce the handler
      timeoutId = setTimeout(() => {
        const { messageId, status } = event.detail;
        console.log('📬 Message status update event:', { messageId, status });
        // handleMessageStatusUpdate(messageId, status);
      }, 100); // 100ms debounce
    };

    window.addEventListener('message-status-update', handleMessageStatusUpdate as EventListener);
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('message-status-update', handleMessageStatusUpdate as EventListener);
    };
  }, []); // REMOVED: selectedPrivateChat dependency - Chat functionality removed
  
  // ฟังก์ชันจัดการการกดหัวใจใน profile modal
  const handleProfileLike = async (profileId: string) => {
    console.log('🔍 handleProfileLike called with profileId:', profileId);
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ ไม่มี token - กรุณาเข้าสู่ระบบก่อน');
      return;
    }

    const isCurrentlyLiked = likedProfiles.has(profileId);
    console.log('📊 Current like status:', isCurrentlyLiked);

    try {
      console.log('🚀 Sending API request...');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/matching/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          userId: profileId
        })
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ API Response:', result);
        console.log(isCurrentlyLiked ? 'ยกเลิกไลค์เรียบร้อยแล้ว!' : 'ส่งไลค์เรียบร้อยแล้ว!');
        
        // อัปเดตสถานะการกดหัวใจใน local state
        setLikedProfiles(prev => {
          const newSet = new Set(prev);
          if (isCurrentlyLiked) {
            newSet.delete(profileId); // ลบออกถ้ากดซ้ำ
          } else {
            newSet.add(profileId); // เพิ่มถ้ากดครั้งแรก
          }
          console.log('🔄 Updated likedProfiles:', Array.from(newSet));
          return newSet;
        });

        // อัปเดตจำนวนการกดไลค์แบบ real-time
        setAllUsers(prevUsers => {
          return prevUsers.map(user => {
            if (user._id === profileId) {
              // ใช้ข้อมูลจาก API response แทนการคำนวณเอง
              return {
                ...user,
                likeCount: result.data?.likeCount || (user as any).likeCount || 0
              };
            }
            return user;
          });
        });

        // ส่ง event เพื่อให้หน้า Matches อัปเดตด้วย
        console.log('📤 App.tsx sending like-status-changed event:', {
          profileId,
          isLiked: !isCurrentlyLiked,
          likeCount: result.data?.likeCount || 0
        });
        window.dispatchEvent(new CustomEvent('like-status-changed', {
          detail: {
            profileId,
            isLiked: !isCurrentlyLiked,
            likeCount: result.data?.likeCount || 0
          }
        }));
      } else {
        const error = await response.json();
        console.error('❌ API Error:', error.message || 'เกิดข้อผิดพลาดในการจัดการไลค์');
      }
    } catch (error) {
      console.error('❌ Network Error:', error);
    }
  };

  // REMOVED: canCreatePrivateChat function - Chat functionality removed

  // ฟังก์ชันตรวจสอบ Role สำหรับการดูโปรไฟล์
  const canViewProfile = (currentUserTier: string, targetUserTier: string) => {
    const tierHierarchy = {
      'member': 0,
      'silver': 1,
      'gold': 2,
      'vip': 3,
      'vip1': 4,
      'vip2': 5,
      'diamond': 6,
      'platinum': 7
    };
    
    const currentLevel = (tierHierarchy as any)[currentUserTier] || 0;
    const targetLevel = (tierHierarchy as any)[targetUserTier] || 0;
    
    console.log('🔍 canViewProfile check:', { 
      currentUserTier, 
      targetUserTier, 
      currentLevel, 
      targetLevel, 
      canView: currentLevel >= targetLevel,
      rule: 'Role ที่สูงกว่าสามารถดูโปรไฟล์ของ Role ที่ต่ำกว่าได้เสมอ'
    });
    
    // Role ที่สูงกว่าสามารถดูโปรไฟล์ของ Role ที่ต่ำกว่าได้เสมอ
    // Role ที่ต่ำกว่าไม่สามารถดูโปรไฟล์ของ Role ที่สูงกว่าได้
    return currentLevel >= targetLevel;
  };

  // Helper function to safely display data that might be an object
  const safeDisplay = (data: any) => {
    if (data === null || data === undefined) return '';
    if (typeof data === 'string' || typeof data === 'number') return data;
    if (typeof data === 'object') {
      // Handle specific object types
      if (data.level !== undefined) {
        return data.level || 'ไม่ระบุ';
      }
      if (data.category) {
        return data.category;
      }
      if (data.name) {
        return data.name;
      }
      // For other objects, try to find a meaningful value
      if (data.value) return data.value;
      if (data.text) return data.text;
      if (data.label) return data.label;
      // If no meaningful value found, return empty string
      return '';
    }
    return String(data);
  };

  // Helper function to format interests data
  const formatInterests = (interests: any[]) => {
    if (!interests || !Array.isArray(interests)) return [];
    
    return interests.map(interest => {
      if (typeof interest === 'string') return interest;
      if (typeof interest === 'object' && interest.category) {
        return interest.category;
      }
      return String(interest);
    }).filter(Boolean);
  };

  // Helper function to translate gender to Thai
  const translateGender = (gender: string) => {
    const genderMap: { [key: string]: string } = {
      'male': 'ชาย',
      'female': 'หญิง',
      'other': 'อื่นๆ',
      'non-binary': 'ไม่ระบุเพศ',
      'prefer-not-to-say': 'ไม่ระบุ'
    };
    return genderMap[gender?.toLowerCase()] || gender || 'ยังไม่ระบุ';
  };

  // Helper function to translate relationship preference to Thai
  const translateRelationship = (relationship: string) => {
    const relationshipMap: { [key: string]: string } = {
      'serious': 'ความสัมพันธ์จริงจัง',
      'casual': 'ความสัมพันธ์แบบสบายๆ',
      'friendship': 'เพื่อน',
      'dating': 'เดท',
      'marriage': 'แต่งงาน',
      'not-sure': 'ยังไม่แน่ใจ',
      'friends-with-benefits': 'เพื่อนที่มีประโยชน์',
      'long-term': 'ความสัมพันธ์ระยะยาว',
      'short-term': 'ความสัมพันธ์ระยะสั้น',
      'female': 'หญิง',
      'male': 'ชาย',
      'any': 'ทุกเพศ',
      'both': 'ทั้งสองเพศ',
      'other': 'อื่นๆ'
    };
    return relationshipMap[relationship?.toLowerCase()] || relationship || 'ยังไม่ระบุ';
  };


  // ฟังก์ชันจัดการการจ่ายเหรียญเพื่อดูรูปเบลอ
  const handleBlurPayment = async (targetUserId: string, targetUserName: string, imageId?: string) => {
    try {
      // ตรวจสอบข้อมูลพื้นฐาน
      if (!targetUserId || !targetUserName) {
        showWebappNotification('ข้อมูลโปรไฟล์ไม่ครบถ้วน');
        return;
      }
      
      if (!imageId || imageId === 'unknown') {
        showWebappNotification('ไม่พบข้อมูลรูปภาพที่ต้องการซื้อ');
        return;
      }

      // ตรวจสอบว่าซื้อรูปนี้แล้วหรือยัง
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const hasAlreadyPurchased = currentUser.purchasedImages?.some((purchased: any) => 
        purchased.profileId === targetUserId && purchased.imageId === imageId
      );

      if (hasAlreadyPurchased) {
        showWebappNotification('คุณได้ซื้อรูปนี้แล้ว');
        return;
      }
      
      // ตรวจสอบ token
      const token = localStorage.getItem('token');
      if (!token) {
        showWebappNotification('กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      // ดึงข้อมูลเหรียญล่าสุดจาก API
      console.log('💰 Checking user coins before payment...');
      
      try {
        const userResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!userResponse.ok) {
          throw new Error(`Failed to fetch user data: ${userResponse.status}`);
        }
        
        const userData = await userResponse.json();
        const userCoins = userData.data?.user?.coins || 0;
        
        console.log('💰 Current user coins:', userCoins);
        console.log('💰 Full user data:', userData);
        
        if (userCoins < 10000) {
          showWebappNotification(`เหรียญไม่เพียงพอ ต้องการ 10,000 เหรียญ (ปัจจุบัน: ${userCoins.toLocaleString()})`);
          return;
        }
      } catch (error) {
        console.error('❌ Error fetching user coins:', error);
        showWebappNotification('ไม่สามารถตรวจสอบยอดเหรียญได้');
        return;
      }

      // ดึงข้อมูลเหรียญอีกครั้งสำหรับ confirmation
      const userResponse2 = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const userData2 = await userResponse2.json();
      const currentCoins = userData2.data?.user?.coins || 0;
      
      // แสดง confirmation modal
      setPaymentDetails({
        planId: 'blur-image',
        planName: 'Unblur Image',
        amount: 10,
        currency: 'coins',
        description: 'Unblur image for viewing',
        targetUserId,
        targetUserName,
        currentCoins,
        imageId: imageId || 'unknown' // ใช้ imageId ที่ส่งมา หรือค่า default
      });
      setShowPaymentConfirmation(true);

    } catch (error) {
      console.error('Error preparing blur payment:', error);
      showWebappNotification('❌ เกิดข้อผิดพลาดในการเตรียมข้อมูล');
    }
  };

  // ฟังก์ชันโหลดข้อมูลการซื้อรูปจาก API
  const loadPurchasedImages = useCallback(async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No token found');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/blur/transactions/${userId}?type=purchases`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data.transactions) {
          // แปลงข้อมูล transactions เป็นรูปแบบ purchasedImages
          const purchasedImages = data.data.transactions.map((transaction: any) => ({
            profileId: transaction.imageOwner.toString(),
            imageId: transaction.imageId,
            purchasedAt: transaction.purchasedAt
          }));
          
          // อัพเดทข้อมูลผู้ใช้ใน localStorage
          const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
          const updatedUser = {
            ...currentUser,
            purchasedImages: purchasedImages
          };
          
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } else {
        console.error('❌ Failed to load purchased images:', response.status);
      }
    } catch (error) {
      console.error('❌ Error loading purchased images:', error);
    }
  }, []);

  // Load purchased images when user data is available
  useEffect(() => {
    if (!user?._id) return
    
    loadPurchasedImages(user._id)
  }, [user?._id]);

  // ฟังก์ชันจ่ายเงินจริงหลังจากยืนยัน
  const confirmBlurPayment = async () => {
    console.log('🟢 confirmBlurPayment function called');
    if (!paymentDetails) {
      console.log('❌ No payment details');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showWebappNotification('กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      // ไม่ปิด payment confirmation modal ทันที ให้แสดงสถานะ loading
      showWebappNotification('⏳ กำลังดำเนินการจ่ายเหรียญ...', 'warning');
      
      // ป้องกันไม่ให้ modal ปิดในระหว่างจ่ายเหรียญ
      setPreventModalClose(true);

      // ตรวจสอบข้อมูลก่อนส่ง
      if (!paymentDetails?.targetUserId || !paymentDetails?.imageId) {
        showWebappNotification('ข้อมูลการจ่ายเงินไม่ครบถ้วน');
        return;
      }
      
      console.log('💳 Sending payment request:', {
        targetUserId: paymentDetails.targetUserId,
        imageId: paymentDetails.imageId,
        amount: 10000,
        url: `${import.meta.env.VITE_API_BASE_URL}/api/blur/pay`
      });

      // เรียก API เพื่อจ่ายเหรียญ
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/blur/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: paymentDetails.targetUserId,
          imageId: paymentDetails.imageId,
          amount: 10000
        })
      });

      // ตรวจสอบ response status
      if (!response.ok) {
        console.error('❌ API Response Error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        
        if (response.status === 404) {
          showWebappNotification('ไม่พบ API endpoint กรุณาติดต่อผู้ดูแลระบบ');
          return;
        }
        
        const errorResult = await response.json().catch(() => ({ message: 'Unknown error' }));
        showWebappNotification(`❌ เกิดข้อผิดพลาด: ${errorResult.message || 'ไม่สามารถเชื่อมต่อได้'}`);
        return;
      }
      
      const result = await response.json();
      
      console.log('💳 Payment response:', {
        status: response.status,
        ok: response.ok,
        result
      });

      if (result.success) {
        // อัพเดทข้อมูลผู้ใช้ใน localStorage
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const targetUserId = paymentDetails?.targetUserId;
        const targetUserName = paymentDetails?.targetUserName;
        
        // ตรวจสอบว่าได้จ่ายให้คนนี้แล้วหรือไม่
        // const alreadyPurchased = currentUser.blurImagePurchases?.some((id: any) => 
        //   id?.toString() === targetUserId?.toString()
        // );
        
        // เพิ่มข้อมูลการซื้อรูปเฉพาะ
        // บันทึกเฉพาะรูปที่ซื้อจริง
        const purchasedImage = {
          profileId: targetUserId,
          imageId: result.data.imageId || 'unknown',
          purchasedAt: new Date().toISOString()
        };
        
        const updatedUser = { 
          ...currentUser, 
          coins: result.data.remainingCoins,
          purchasedImages: [...(currentUser.purchasedImages || []), purchasedImage]
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        console.log('✅ Payment successful, updated user coins:', updatedUser.coins);
        console.log('✅ Updated purchasedImages:', updatedUser.purchasedImages);
        
        // แสดงข้อความสำเร็จ
        showWebappNotification(`✅ จ่ายเหรียญสำเร็จ! คุณสามารถดูรูปของ ${targetUserName} ได้แล้ว`);
        
        // อัพเดทข้อมูลการซื้อรูปใน localStorage ทันที
        const updatedPurchasedImages = [...(currentUser.purchasedImages || []), purchasedImage];
        const updatedUserWithPurchases = {
          ...updatedUser,
          purchasedImages: updatedPurchasedImages
        };
        localStorage.setItem('user', JSON.stringify(updatedUserWithPurchases));

        // โหลดข้อมูลการซื้อรูปใหม่จาก API เพื่อให้แน่ใจว่าข้อมูลเป็นปัจจุบัน
        await loadPurchasedImages(currentUser._id || currentUser.id);
        
        // อัพเดท selectedProfile เพื่อให้รูปภาพแสดงไม่เบลอทันที
        if (selectedProfile && selectedProfile.id === targetUserId) {
          console.log('🔄 Updating selectedProfile to trigger re-render');
          // บังคับให้ React re-render โดยการสร้าง object ใหม่
          setSelectedProfile(prevProfile => {
            if (!prevProfile) return null;
            return {
              ...prevProfile,
              // เพิ่ม timestamp เพื่อบังคับให้ re-render
              _paymentUpdated: Date.now(),
              // อัพเดทข้อมูลการซื้อ
              _purchasedImages: updatedUser.purchasedImages
            };
          });
          
          console.log('✅ Profile updated, staying in profile modal');
        } else {
          console.log('❌ No selectedProfile or ID mismatch:', { 
            selectedProfileId: selectedProfile?.id, 
            targetUserId,
            hasSelectedProfile: !!selectedProfile
          });
        }
        
        // ไม่รีโหลดหน้า ยังคงอยู่ในโปรไฟล์เดิม
        
        // ปิด payment confirmation modal หลังจากใช้งานข้อมูลเสร็จ
        console.log('🔄 Closing payment confirmation modal');
        setShowPaymentConfirmation(false);
        setPaymentDetails(null);
        
        // อัพเดท localStorage เพื่อให้ข้อมูลเป็นปัจจุบัน
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // บังคับให้ re-render UI เพื่อแสดงภาพทันที
        setTimeout(() => {
          setForceUpdate(prev => prev + 1);
        }, 100);
        
        console.log('✅ Payment confirmation modal closed, profile modal should remain open');
        
        // ปิดการป้องกันการปิด modal หลังจ่ายเหรียญเสร็จ
        setTimeout(() => {
          setPreventModalClose(false);
          console.log('🔒 Ensuring profile modal stays open after payment');
          if (!showProfileModal) {
            console.log('🔄 Re-opening profile modal that was accidentally closed');
            setShowProfileModalDebug(true);
          }
        }, 200);
        
      } else {
        console.error('❌ Payment failed:', result);
        showWebappNotification(`❌ ${result.message || 'เกิดข้อผิดพลาดในการจ่ายเหรียญ'}`);
        
        // ปิดการป้องกันการปิด modal เมื่อจ่ายเงินไม่สำเร็จ
        setPreventModalClose(false);
        
        // แสดงรายละเอียดข้อผิดพลาด
        if (result.data) {
          console.log('💰 Payment failure details:', {
            currentCoins: result.data.currentCoins,
            required: result.data.required
          });
        }
      }

    } catch (error) {
      console.error('Error paying for blur image:', error);
      showWebappNotification('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setPaymentDetails(null);
    }
  };

  // ฟังก์ชันยกเลิกการจ่ายเหรียญ
  const cancelBlurPayment = () => {
    console.log('🔴 cancelBlurPayment function called');
    
    // ปิดการป้องกันการปิด modal เมื่อยกเลิกการจ่ายเงิน
    setPreventModalClose(false);
    
    setShowPaymentConfirmation(false);
    setPaymentDetails(null);
    showWebappNotification('ยกเลิกการจ่ายเหรียญแล้ว', 'warning');
  };

  // ฟังก์ชันเปิด Profile Modal
  const openProfileModal = (profileData: any) => {
    setSelectedProfile(profileData)
    setShowProfileModal(true)
  }

  // ฟังก์ชันจัดการการดูโปรไฟล์
  const handleViewProfile = async (profileData: any) => {
    if (!user) {
      console.error('❌ ไม่มีผู้ใช้ที่เข้าสู่ระบบ');
      setProfileAlert({ message: 'กรุณาเข้าสู่ระบบก่อน', type: 'error' });
      setTimeout(() => setProfileAlert(null), 3000);
      return;
    }
    
    // ตรวจสอบ Role ก่อนดูโปรไฟล์
    const currentUserTier = user.membership?.tier || 'member';
    const targetUserTier = profileData.membershipTier || 'member';
    
    console.log('🔍 Profile access check:', {
      currentUser: user.username || user.email,
      currentUserTier,
      targetUser: profileData.name,
      targetUserTier,
      profileData
    });
    
    if (!canViewProfile(currentUserTier, targetUserTier)) {
      console.log('🚫 Cannot view profile - Role restriction:', { currentUserTier, targetUserTier });
      showWebappNotification('ไม่สามารถดูโปรไฟล์ที่ระดับสูงกว่าได้');
      return;
    }
    
    console.log('👤 Viewing profile details:', profileData.name);
    
    // เปิด profile modal โดยตรง
    openProfileModal(profileData);
  };

  // REMOVED: saveChatsToStorage (35 lines - Chat functionality removed)

  // REMOVED: loadChatsFromStorage (54 lines - Chat functionality removed)

  // REMOVED: createUserObject (20 lines - Chat functionality removed, no longer used)

  // REMOVED: findExistingChat (28 lines - Chat functionality removed)

  // REMOVED: removeDuplicateChats (40 lines - Chat functionality removed)

  // REMOVED: handleStartPrivateChat (112 lines - Chat functionality removed)

  // REMOVED: loadChatHistoryAndUpdateState (72 lines - Chat functionality removed)

  // REMOVED: handleSelectPrivateChat (25 lines - Chat functionality removed)

  // REMOVED: handleBackToPrivateChatList (55 lines - Chat functionality removed)


  // REMOVED: handleDeletePrivateChat (74 lines - Chat functionality removed)




  // REMOVED: handleSendPrivateMessage (650 lines - Chat functionality removed)
  
  const handleBackToMain = () => {
    setCurrentView('main')
    setSelectedPlan(null)
    setTransactionData(null)
    handleTabChange('membership') // กลับไปที่ membership tab
  }

  // ฟังก์ชันกลับหน้าหลัก (Home)
  const handleGoToHome = () => {
    setCurrentView('main')
    setSelectedPlan(null)
    setTransactionData(null)
    handleTabChange('discover') // กลับไปที่ discover tab (หน้าค้นหา)
    // REMOVED: Chat state resets - All Chat functionality removed
  }

  // ฟังก์ชัน Navigate to Payment
  const handleNavigateToPayment = (plan: any) => {
    setSelectedPlan(plan)
    setCurrentView('payment')
    handleTabChange('membership')
  }

  // ฟังก์ชัน Handle Payment Success
  const handlePaymentSuccess = (transactionData: any) => {
    setTransactionData(transactionData)
    setCurrentView('success')
    // Refresh user data to update membership
    if (user) {
      // Trigger user data refresh
      setForceUpdate(prev => prev + 1)
    }
  }

  // ฟังก์ชัน Handle Logout
  const handleLogout = () => {
    logout()
    setActiveTab('discover')
    setCurrentView('main')
    // ข้อความแจ้งเตือนจะแสดงจาก useRealTimeUpdate('userLoggedOut') แล้ว
  }

  // ฟังก์ชัน Handle Login Success
  const handleLoginSuccess = () => {
    setShowLoginDialog(false)
    success('เข้าสู่ระบบสำเร็จ')
    // Refresh user data
    setForceUpdate(prev => prev + 1)
    // รีเฟรชหน้าเว็บอัตโนมัติเมื่อล็อกอิน
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }
  
  // Set up global payment navigation
  useEffect(() => {
    ;(window as any).navigateToPayment = handleNavigateToPayment
    const handlePaymentEvent = (event: any) => {
      handleNavigateToPayment(event.detail.plan)
    }
    window.addEventListener('navigateToPayment', handlePaymentEvent)
    return () => {
      window.removeEventListener('navigateToPayment', handlePaymentEvent)
      delete (window as any).navigateToPayment
    }
  }, [])

  // Set up global profile modal function
  useEffect(() => {
    ;(window as any).openProfileModal = openProfileModal
    return () => {
      delete (window as any).openProfileModal
    }
  }, [openProfileModal])
  
  // REMOVED: handleSelectRoom and handleBackToRoomList - All Chat functionality removed
  

  
  // Show maintenance mode if active (always show if maintenance is on, regardless of dev access)
  // But allow bypass if user has bypassMaintenance flag
  if (maintenanceChecked && isMaintenanceMode && !bypassMaintenance) {
    return <MaintenanceMode onDevAccess={handleDevAccess} hasDevAccess={hasDevAccess} />
  }

  // Show loading while checking maintenance mode
  if (!maintenanceChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-slate-800">กำลังตรวจสอบสถานะระบบ...</h1>
        </div>
      </div>
    )
  }

  // Render different views based on current state
  if (currentView === 'payment' && selectedPlan) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="h-32 w-32" /></div>}>
        <PaymentWithAnimation
          plan={selectedPlan}
          onBack={handleBackToMain}
          onSuccess={handlePaymentSuccess}
          onCancel={handleBackToMain}
        />
      </Suspense>
    )
  }
  
  if (currentView === 'success' && transactionData && selectedPlan) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="h-32 w-32" /></div>}>
        <PaymentSuccess
          transactionData={transactionData}
          plan={selectedPlan}
          onContinue={handleBackToMain}
        />
      </Suspense>
    )
  }
  
  return (
    <div className="min-h-screen relative overflow-hidden pt-12 sm:pt-16 pb-16 sm:pb-20">
      {/* Mobile-Optimized Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-4 w-48 h-48 sm:top-20 sm:left-10 sm:w-96 sm:h-96 bg-gradient-to-br from-pink-300/20 to-violet-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-8 w-40 h-40 sm:top-60 sm:right-20 sm:w-80 sm:h-80 bg-gradient-to-br from-blue-300/15 to-cyan-300/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-36 h-36 sm:bottom-32 sm:left-1/4 sm:w-72 sm:h-72 bg-gradient-to-br from-orange-300/20 to-pink-300/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-40 right-1/3 w-32 h-32 sm:bottom-60 sm:right-1/3 sm:w-64 sm:h-64 bg-gradient-to-br from-purple-300/25 to-indigo-300/25 rounded-full blur-3xl animate-pulse delay-3000"></div>
      </div>
      {/* Mobile-Optimized Floating Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 text-2xl sm:text-4xl opacity-20 animate-float">✨</div>
        <div className="absolute top-1/3 right-1/4 text-3xl sm:text-5xl opacity-15 animate-float delay-1000">💫</div>
        <div className="absolute bottom-1/3 left-1/3 text-4xl sm:text-6xl opacity-10 animate-float delay-2000">🌟</div>
        <div className="absolute bottom-1/4 right-1/3 text-2xl sm:text-3xl opacity-25 animate-float delay-3000">💖</div>
        <div className="absolute top-1/2 left-1/6 text-2xl sm:text-4xl opacity-20 animate-float delay-4000">🎉</div>
        <div className="absolute top-3/4 right-1/6 text-3xl sm:text-5xl opacity-15 animate-float delay-5000">🌈</div>
      </div>
      
      {/* Mobile-First Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-lg">
        <div className="px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-12 sm:h-16">
            {/* Logo - Mobile Optimized */}
            <button 
              onClick={handleGoToHome}
              className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-pink-500 via-rose-500 to-violet-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg heart-beat">
                <Heart className="h-4 w-4 sm:h-6 sm:w-6 text-white" fill="white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl sm:text-2xl font-bold gradient-text">sodeclick</span>
                <div className="text-xs text-gray-600 -mt-1">Find Your Love ✨</div>
              </div>
              <div className="sm:hidden">
                <span className="text-lg font-bold gradient-text">sodeclick</span>
              </div>
            </button>
            
            {/* Mobile User Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {!isAuthenticated ? (
                <>
                  {/* Mobile Login Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowLoginDialog(true)}
                    className="md:hidden border-pink-300 text-pink-600 hover:bg-pink-50 hover:border-pink-400 transition-colors"
                  >
                    เข้าสู่ระบบ
                  </Button>
                  
                  {/* Desktop Login Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      console.log('🖥️ Desktop Login Button Clicked');
                      setShowLoginDialog(true);
                    }}
                    className="hidden md:flex border-pink-300 text-pink-600 hover:bg-pink-50 hover:border-pink-400 transition-colors"
                  >
                    เข้าสู่ระบบ
                  </Button>
                </>
              ) : (
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {/* Desktop: Show full user info */}
                  <div className="hidden sm:flex items-center space-x-1 sm:space-x-2">
                    <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                      <AvatarImage src={avatarUrl || undefined} alt="profile" />
                      <AvatarFallback className="text-xs sm:text-sm">{user?.firstName?.[0] || user?.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-700">สวัสดี, {user?.displayName || user?.firstName}</span>
                  </div>
                  
                  {/* Mobile: Show profile icon with user info and dropdown */}
                  <div className="sm:hidden relative profile-dropdown-container">
                    <Button 
                      variant="ghost" 
                      className="flex items-center space-x-2 px-2 py-1 rounded-lg hover:bg-gray-50"
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={avatarUrl || undefined} alt="profile" />
                        <AvatarFallback className="text-xs">{user?.firstName?.[0] || user?.username?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-900">{user?.firstName}</span>
                    </Button>
                    
                    {/* Dropdown Menu */}
                    {showProfileDropdown && (
                      <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px] z-50">
                        <div className="px-3 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">{user?.displayName || user?.firstName}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                        
                        <button
                          onClick={() => {
                            setShowReportModal(true)
                            setShowProfileDropdown(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          แจ้งปัญหา
                        </button>
                        
                        {(user?.role === 'admin' || user?.role === 'superadmin') && (
                          <button
                            onClick={() => {
                              window.location.href = '/admin'
                              setShowProfileDropdown(false)
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Admin
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            handleLogout()
                            setShowProfileDropdown(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          ออกจากระบบ
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Desktop: Show admin and logout buttons */}
                  <div className="flex items-center space-x-2">
                    {/* Desktop Notification Bell Button */}
                    <div className="relative notification-dropdown-container">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                        className="relative p-2 hover:bg-gray-50 transition-colors"
                      >
                        <FontAwesomeIcon 
                          icon={faBell} 
                          className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 hover:text-pink-600 transition-colors" 
                        />
                        {/* Notification Badge - Show only when there are unread notifications */}
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                            {unreadCount}
                          </span>
                        )}
                      </Button>
                      
                      {/* Desktop Notification Dropdown */}
                      {showNotificationDropdown && (
                        <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[280px] sm:min-w-[320px] z-50 max-h-96 overflow-y-auto">
                          <div className="px-4 py-2 border-b border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-900">การแจ้งเตือน</h3>
                          </div>
                          
                          {/* Real-time Notifications */}
                          {isLoadingNotifications ? (
                            <div className="px-4 py-8 text-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600 mx-auto"></div>
                              <p className="text-xs text-gray-500 mt-2">กำลังโหลด...</p>
                            </div>
                          ) : notifications.length > 0 ? (
                            notifications.map(renderNotificationItem)
                          ) : (
                            <div className="px-4 py-8 text-center">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <FontAwesomeIcon icon={faBell} className="h-6 w-6 text-gray-400" />
                              </div>
                              <p className="text-sm text-gray-500">ยังไม่มีการแจ้งเตือน</p>
                            </div>
                          )}
                          
                          {notifications.length > 0 && (
                            <div className="px-4 py-2 border-t border-gray-100 flex gap-2">
                              <button 
                                onClick={fetchNotifications}
                                className="flex-1 text-center text-sm text-pink-600 hover:text-pink-700 font-medium"
                              >
                                รีเฟรช
                              </button>
                              <button 
                                onClick={clearAllNotifications}
                                className="flex-1 text-center text-sm text-red-600 hover:text-red-700 font-medium"
                              >
                                ล้างทั้งหมด
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowReportModal(true)}
                      className="hidden sm:flex text-amber-600 border-amber-200 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      แจ้งปัญหา
                    </Button>
                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.location.href = '/admin'}
                        className="hidden sm:flex text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Admin
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleLogout} 
                      className="hidden sm:flex border-pink-200 text-pink-600 hover:bg-pink-50 hover:border-pink-300 transition-colors"
                    >
                      ออกจากระบบ
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {/* Mobile-First App Interface */}
      <section className="px-1 sm:px-4 lg:px-8 py-1 sm:py-16 md:py-20 relative z-10 pb-10 sm:pb-24">
        <div className="modern-card rounded-xl sm:rounded-3xl shadow-2xl overflow-hidden">
          <Tabs defaultValue="discover" value={activeTab} onValueChange={handleTabChange}>
            {/* Discover Tab - Mobile First */}
            <TabsContent value="discover" className="p-1 sm:p-6 lg:p-8">
              {/* Mobile-First Hero Section - Only for Discover Tab */}
              <section className="py-8 sm:py-12 md:py-16 lg:py-24">
                <div className="px-3 sm:px-4 lg:px-8">
                  <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
                    <div className="space-y-6 sm:space-y-8">
                      <div className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 rounded-full glass-effect border border-white/30 text-pink-600 text-xs sm:text-sm font-semibold shadow-lg">
                        <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span>Thailand's #1 Dating Platform 🇹🇭</span>
                      </div>
                      <div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-4 sm:mb-6 md:mb-8 gradient-text">
                          Find Your<br />
                          Perfect Match ✨
                        </h1>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 md:mb-10 leading-relaxed max-w-lg">
                          Join thousands of verified singles creating meaningful connections. Your love story starts here.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        <Button 
                          size="lg" 
                          onClick={() => handleTabChange('discover')}
                          className="modern-button text-sm sm:text-base md:text-lg px-6 py-4 sm:px-8 sm:py-5 md:px-10 md:py-6 rounded-xl sm:rounded-2xl font-bold shadow-2xl hover:shadow-pink-300/50 hover:scale-105 transform transition-all duration-300"
                        >
                          <Heart className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-2 sm:mr-3" fill="white" />
                          Start Dating Now
                        </Button>
                        <Button 
                          variant="outline" 
                          size="lg"
                          onClick={handleLearnMoreClick}
                          className="border-2 border-pink-300/50 text-pink-600 hover:bg-pink-50/80 px-6 py-4 sm:px-8 sm:py-5 md:px-10 md:py-6 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base md:text-lg transition-all duration-300 hover:scale-105 glass-effect"
                        >
                          <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-2 sm:mr-3" />
                          Learn More
                        </Button>
                      </div>
                    </div>
                    {/* Top Voted Users Carousel */}
                    <div className="relative flex justify-center lg:justify-end items-center">
                      <div className="w-full max-w-xs">
                        <Suspense fallback={
                          <div className="w-full max-w-xs mx-auto h-[500px] bg-gradient-to-br from-pink-100 to-purple-100 rounded-3xl flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                          </div>
                        }>
                          <ErrorBoundary>
                            <TopVotedCarousel />
                          </ErrorBoundary>
                        </Suspense>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Mobile-First Advanced Filters Section */}
              <div className="mb-3 sm:mb-8 modern-card rounded-xl sm:rounded-3xl shadow-2xl border border-white/30 overflow-hidden backdrop-blur-lg">
                {/* Mobile-First Filter Header */}
                <div className="bg-gradient-to-br from-pink-50/90 via-violet-50/90 to-blue-50/90 backdrop-blur-xl p-2 sm:p-6 lg:p-8 border-b border-white/30">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-pink-500 via-rose-500 to-violet-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl transform rotate-3 hover:rotate-6 transition-all duration-300">
                          <Filter className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-pink-600 via-rose-600 to-violet-600 bg-clip-text text-transparent">
                          ตัวกรองขั้นสูง ✨
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 mt-1 font-medium">ค้นหาคู่แท้ของคุณด้วยฟิลเตอร์ที่ตรงใจ 💕</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiltersOpen(v => !v)}
                      className="flex items-center gap-2 sm:gap-3 hover:bg-white/60 transition-all duration-300 rounded-xl sm:rounded-2xl px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 text-gray-700 font-semibold border-2 border-transparent hover:border-pink-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base lg:text-lg"
                    >
                      <span>{filtersOpen ? '🔼 ซ่อน' : '🔽 เปิด'}</span>
                      <ChevronRight className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 transition-all duration-500 ${filtersOpen ? 'rotate-90 text-pink-600' : 'text-gray-500'}`} />
                    </Button>
                  </div>
                </div>
                {filtersOpen && (
                  <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-sm border-t border-white/50">
                    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
                      {/* Mobile-First Basic Filters */}
                      <div className="relative">
                        <div className="absolute -left-2 sm:-left-4 top-0 w-1 h-full bg-gradient-to-b from-pink-500 to-violet-500 rounded-full"></div>
                        <h4 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 pl-3 sm:pl-4">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <User className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-white" />
                          </div>
                          <span className="text-sm sm:text-base lg:text-lg">ข้อมูลพื้นฐาน</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 pl-3 sm:pl-4">
                          <div className="space-y-2 sm:space-y-3">
                            <label className="text-xs sm:text-sm font-bold text-gray-700 flex items-center gap-1 sm:gap-2">
                              <span className="text-pink-500 text-sm sm:text-lg">👥</span>
                              <span>เพศ</span>
                            </label>
                            <select
                              value={filters.gender}
                              onChange={e => setFilters(f => ({...f, gender: e.target.value}))}
                              className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium text-sm sm:text-base"
                            >
                              <option value="">✨ ทั้งหมด</option>
                              <option value="male">👨 ชาย</option>
                              <option value="female">👩 หญิง</option>
                              <option value="other">🌈 อื่นๆ</option>
                            </select>
                          </div>
                          <div className="space-y-2 sm:space-y-3">
                            <label className="text-xs sm:text-sm font-bold text-gray-700 flex items-center gap-1 sm:gap-2">
                              <span className="text-violet-500 text-sm sm:text-lg">🔍</span>
                              <span>กำลังมองหา</span>
                            </label>
                            <select
                              value={filters.lookingFor || ''}
                              onChange={e => setFilters(f => ({...f, lookingFor: e.target.value}))}
                              className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium text-sm sm:text-base"
                            >
                              <option value="">✨ ทั้งหมด</option>
                              <option value="male">👨 ชาย</option>
                              <option value="female">👩 หญิง</option>
                              <option value="both">💕 ทั้งคู่</option>
                            </select>
                          </div>
                          <div className="space-y-2 sm:space-y-3">
                            <label className="text-xs sm:text-sm font-bold text-gray-700 flex items-center gap-1 sm:gap-2">
                              <span className="text-green-500 text-sm sm:text-lg">📍</span>
                              <span>จังหวัด</span>
                            </label>
                            <select
                              value={filters.province || ''}
                              onChange={e => setFilters(f => ({...f, province: e.target.value}))}
                              className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium text-sm sm:text-base"
                            >
                              <option value="">🗺️ ทุกจังหวัด</option>
                              {[
                                'กระบี่','กรุงเทพมหานคร','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น','จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่','ตรัง','ตราด','ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์','นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา','พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่','ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์','หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี'
                              ].sort((a,b)=>a.localeCompare(b,'th')).map(p => (
                                <option key={p} value={p}>📍 {p}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Age Range */}
                      <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                        <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3 pl-4">
                          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-white" />
                          </div>
                          ช่วงอายุ
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pl-4">
                          <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                              <span className="text-orange-500 text-lg">🎂</span>
                              อายุต่ำสุด
                            </label>
                            <input
                              type="number"
                              min={18}
                              max={100}
                              value={filters.ageMin || ''}
                              onChange={e => setFilters(f => ({...f, ageMin: Number(e.target.value)}))}
                              className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium"
                              placeholder="18 ปี"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                              <span className="text-red-500 text-lg">🎉</span>
                              อายุมากสุด
                            </label>
                            <input
                              type="number"
                              min={18}
                              max={100}
                              value={filters.ageMax || ''}
                              onChange={e => setFilters(f => ({...f, ageMax: Number(e.target.value)}))}
                              className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium"
                              placeholder="100 ปี"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Relationship & Distance */}
                      <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-pink-500 to-purple-500 rounded-full"></div>
                        <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3 pl-4">
                          <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl flex items-center justify-center">
                            <Heart className="h-5 w-5 text-white" />
                          </div>
                          ความสัมพันธ์ & ระยะทาง
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pl-4">
                          <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                              <span className="text-pink-500 text-lg">💕</span>
                              ความสัมพันธ์ที่ต้องการ
                            </label>
                            <select
                              value={filters.relationship || ''}
                              onChange={e => setFilters(f => ({...f, relationship: e.target.value}))}
                              className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium"
                            >
                              <option value="">💫 เลือกประเภทความสัมพันธ์</option>
                              <option value="fwd">🎯 FWD</option>
                              <option value="overnight">🌙 ค้างคืน</option>
                              <option value="temporary">⏰ ชั่วคราว</option>
                              <option value="other">✨ อื่นๆ</option>
                            </select>
                          </div>
                          {filters.relationship === 'other' && (
                            <div className="space-y-3">
                              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <span className="text-purple-500 text-lg">💭</span>
                                ระบุความสัมพันธ์ที่ต้องการ
                              </label>
                              <input
                                value={filters.otherRelationship || ''}
                                onChange={e => setFilters(f => ({...f, otherRelationship: e.target.value}))}
                                className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium"
                                placeholder="💬 ระบุความสัมพันธ์ที่ต้องการ..."
                              />
                            </div>
                          )}
                          <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                              <span className="text-blue-500 text-lg">📏</span>
                              ระยะทาง (กิโลเมตร)
                            </label>
                            <input
                              type="number"
                              value={filters.distanceKm || ''}
                              onChange={e => setFilters(f => ({...f, distanceKm: parseFloat(e.target.value) || 0}))}
                              className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium"
                              placeholder="🎯 เช่น 50 กม."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Location Coordinates */}
                      <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full"></div>
                        <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3 pl-4">
                          <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-white" />
                          </div>
                          พิกัดตำแหน่ง
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pl-4">
                          <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                              <span className="text-cyan-500 text-lg">🌐</span>
                              ละติจูด (Latitude)
                            </label>
                            <input
                              value={filters.lat || ''}
                              onChange={e => setFilters(f => ({...f, lat: parseFloat(e.target.value) || 0}))}
                              className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium"
                              placeholder="🗺️ เช่น 13.7563"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                              <span className="text-teal-500 text-lg">🗺️</span>
                              ลองจิจูด (Longitude)
                            </label>
                            <input
                              value={filters.lng || ''}
                              onChange={e => setFilters(f => ({...f, lng: parseFloat(e.target.value) || 0}))}
                              className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium"
                              placeholder="📍 เช่น 100.5018"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-6 justify-center pt-8 border-t-2 border-gradient-to-r from-pink-200 to-violet-200">
                        <Button
                          onClick={async () => {
                            // Show loading state
                            setIsLoadingAllUsers(true)
                            
                            const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                            const params = new URLSearchParams()
                            
                            // Add filters to params
                            if (filters.gender) params.set('gender', filters.gender)
                            if (filters.lookingFor) params.set('lookingFor', filters.lookingFor)
                            if (filters.province) params.set('province', filters.province)
                            if (filters.ageMin && filters.ageMin > 0) params.set('ageMin', String(filters.ageMin))
                            if (filters.ageMax && filters.ageMax > 0) params.set('ageMax', String(filters.ageMax))
                            
                            // Handle relationship filter
                            if (filters.relationship) {
                              if (filters.relationship === 'other' && filters.otherRelationship) {
                                params.set('relationship', filters.otherRelationship)
                              } else {
                                params.set('relationship', filters.relationship)
                              }
                            }
                            
                            // Handle distance filter
                            if (filters.distanceKm && filters.lat && filters.lng) {
                              params.set('distanceKm', String(filters.distanceKm))
                              params.set('lat', String(filters.lat))
                              params.set('lng', String(filters.lng))
                            }
                            
                            params.set('page', '1')
                            params.set('limit', '50') // เพิ่มจำนวนผลลัพธ์
                            
                            try {
                              console.log('🔍 Searching with filters:', Object.fromEntries(params))
                              
                              const res = await fetch(`${base}/api/profile/search?${params.toString()}`, {
                                headers: { 
                                  'Content-Type': 'application/json', 
                                  ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}) 
                                }
                              })
                              
                              if (!res.ok) {
                                throw new Error(`HTTP error! status: ${res.status}`)
                              }
                              
                              const data = await res.json()
                              console.log('📊 Search results:', data)
                              console.log('📊 Like counts from Discover search:', data?.data?.users?.map((u: any) => ({ id: u._id, likeCount: u.likeCount })));
                              
                              if (data.success) {
                                const users: PublicUser[] = data?.data?.users || []
                                console.log(`✅ Found ${users.length} users`)
                                
                                setAllUsers(users)
                                setCurrentPage(1)
                                
                                // Filter for allowed tiers
                                const allowed = ['member','silver','gold','vip','vip1','vip2']
                                const allowedUsers = users.filter(u => allowed.includes((u?.membership?.tier || 'member') as string))
                                const allowedLen = allowedUsers.length
                                
                                setVisibleCount(allowedLen)
                                setHasMoreUsers(allowedLen > 8)
                                
                                // Show success message
                                if (allowedLen > 0) {
                                  showWebappNotification(`✅ พบผู้ใช้ ${allowedLen} คนที่ตรงกับเงื่อนไขของคุณ!`, 'success')
                                } else {
                                  showWebappNotification('❌ ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข กรุณาลองปรับตัวกรองใหม่', 'warning')
                                }
                              } else {
                                console.error('❌ Search failed:', data.message)
                                showWebappNotification(`❌ การค้นหาล้มเหลว: ${data.message}`, 'error')
                              }
                            } catch (error: any) {
                              console.error('❌ Search error:', error)
                              showWebappNotification(`❌ เกิดข้อผิดพลาดในการค้นหา: ${error.message}`, 'error')
                            } finally {
                              setIsLoadingAllUsers(false)
                            }
                          }}
                          className={`flex items-center gap-4 px-10 py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-violet-600 text-white hover:from-pink-600 hover:via-rose-600 hover:to-violet-700 transition-all duration-300 shadow-2xl hover:shadow-pink-500/50 font-bold text-lg transform hover:scale-110 hover:-translate-y-1 ${isLoadingAllUsers ? 'opacity-75 cursor-not-allowed' : ''}`}
                          disabled={isLoadingAllUsers}
                        >
                          {isLoadingAllUsers ? (
                            <>
                              <RefreshCw className="h-6 w-6 animate-spin" />
                              🔄 กำลังค้นหา...
                            </>
                          ) : (
                            <>
                              <Search className="h-6 w-6" />
                              🔍 ค้นหาด้วยตัวกรอง
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={async () => {
                            // Reset filters
                            setFilters({ 
                              ageRange: [18, 100],
                              location: '',
                              interests: [],
                              gender: '',
                              membershipTier: '',
                              lookingFor: '', 
                              province: '', 
                              ageMin: 18,
                              ageMax: 100,
                              relationship: '', 
                              otherRelationship: '', 
                              distanceKm: 0, 
                              lat: 0, 
                              lng: 0 
                            })
                            
                            // Show loading state
                            setIsLoadingAllUsers(true)
                            
                            const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                            
                            try {
                              console.log('🔄 Resetting filters and reloading users...')
                              
                              const res = await fetch(`${base}/api/profile/all?limit=50&page=1`, {
                                headers: { 
                                  'Content-Type': 'application/json', 
                                  ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}) 
                                }
                              })
                              
                              if (!res.ok) {
                                throw new Error(`HTTP error! status: ${res.status}`)
                              }
                              
                              const data = await res.json()
                              console.log('📊 Reset results:', data)
                              console.log('📊 Like counts from Discover API:', data?.data?.users?.map((u: any) => ({ id: u._id, likeCount: u.likeCount })));
                              
                              if (data.success) {
                                const users: PublicUser[] = data?.data?.users || []
                                console.log(`✅ Reset: Found ${users.length} users`)
                                
                                setAllUsers(users)
                                setCurrentPage(1)
                                
                                // Filter for allowed tiers
                                const allowed = ['member','silver','gold','vip','vip1','vip2']
                                const allowedUsers = users.filter(u => allowed.includes((u?.membership?.tier || 'member') as string))
                                const allowedLen = allowedUsers.length
                                
                                setVisibleCount(allowedLen)
                                setHasMoreUsers(allowedLen > 8)
                                
                                showWebappNotification(`✅ รีเซ็ตตัวกรองเรียบร้อย! แสดงผู้ใช้ ${allowedLen} คน`, 'success')
                              } else {
                                console.error('❌ Reset failed:', data.message)
                                showWebappNotification(`❌ การรีเซ็ตล้มเหลว: ${data.message}`, 'error')
                              }
                            } catch (error: any) {
                              console.error('❌ Reset error:', error)
                              showWebappNotification(`❌ เกิดข้อผิดพลาดในการรีเซ็ต: ${error.message}`, 'error')
                            } finally {
                              setIsLoadingAllUsers(false)
                            }
                          }}
                          className={`flex items-center gap-3 px-8 py-4 rounded-2xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-base transform hover:scale-105 ${isLoadingAllUsers ? 'opacity-75 cursor-not-allowed' : ''}`}
                          disabled={isLoadingAllUsers}
                        >
                          {isLoadingAllUsers ? (
                            <>
                              <RefreshCw className="h-6 w-6 animate-spin" />
                              🔄 กำลังรีเซ็ต...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-6 w-6" />
                              🗑️ ล้างตัวกรองทั้งหมด
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Vote Rankings Section */}
              <div className="mb-8 sm:mb-10">
                <div className="flex justify-center">
                  <div className="w-full max-w-md">
                    <Suspense fallback={<div className="animate-pulse bg-gray-200 h-48 rounded-lg"></div>}>
                      <ErrorBoundary>
                        <VoteRankingMini 
                          voteType="popularity_combined" 
                          limit={5} 
                          onUserProfileClick={handleVoteUserProfileClick}
                          onNavigateToRanking={() => setShowRankingModal(true)}
                        />
                      </ErrorBoundary>
                    </Suspense>
                  </div>
                </div>
              </div>

              {/* Mobile-First Premium Member Exclusive */}
              <div className="mb-8 sm:mb-10">
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-amber-500 via-pink-500 to-violet-600 bg-clip-text text-transparent flex items-center">
                    <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl">Premium</span>
                    <Crown className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 ml-2 sm:ml-3 text-amber-500" />
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 sm:mt-2">สมาชิกระดับพรีเมียมคัดสรร • เรียงตามระดับสมาชิก</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                  {premiumUsers.length > 0 ? premiumUsers.map((u: PublicUser, idx: number) => {
                    // ใช้ utility function เพื่อสร้าง image URL ที่ถูกต้อง - รองรับรูปเบลอ
                    const mainImageIndex = (u as any)?.mainProfileImageIndex || 0;
                    const mainImage = u?.profileImages?.[mainImageIndex];
                    const displayName = u?.nickname || `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || 'Premium User'
                    const tier: string = (u?.membership?.tier || 'member') as string
                    
                    // ตรวจสอบว่าเป็นรูปเบลอหรือไม่และยังไม่ได้จ่ายเหรียญ
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    const profileId = (u as any)?._id?.toString();
                    const mainImageId = (mainImage as any)?._id?.toString() || 'main_image';
                    
                    // ตรวจสอบการซื้อรูปเฉพาะ - เฉพาะรูปนี้เท่านั้น
                    const hasPaidForMainImage = currentUser.purchasedImages?.some((purchased: any) => 
                      purchased.profileId === profileId && purchased.imageId === mainImageId
                    );
                    
                    // ตรวจสอบว่าเป็นรูปเบลอและยังไม่ได้จ่ายเหรียญ
                    const isMainImageBlurred = typeof mainImage === 'object' && (mainImage as any)?.isBlurred && !hasPaidForMainImage;
                    
                    // Debug สำหรับรูปหลัก
                    if (typeof mainImage === 'object' && (mainImage as any)?.isBlurred) {
                      console.log('🔍 Main image blur check:', {
                        profileId,
                        mainImageId,
                        isBlurred: (mainImage as any)?.isBlurred,
                        hasPaidForMainImage,
                        isMainImageBlurred,
                        forceUpdate, // เพิ่ม forceUpdate เพื่อติดตามการ re-render
                        matchingPurchases: currentUser.purchasedImages?.filter((purchased: any) => 
                          purchased.profileId === profileId && purchased.imageId === mainImageId
                        )
                      });
                    }
                    
                    const imageUrl = getMainProfileImage(
                      u?.profileImages || [], 
                      mainImageIndex, 
                      u._id || (u as any)?.id
                    )
                    const tierColors: Record<string, string> = {
                      platinum: 'from-purple-500 to-pink-500',
                      diamond: 'from-blue-500 to-cyan-500',
                      vip2: 'from-red-500 to-orange-500',
                      vip1: 'from-orange-500 to-yellow-500',
                      vip: 'from-purple-400 to-pink-400',
                      gold: 'from-yellow-500 to-amber-500',
                      silver: 'from-gray-400 to-slate-400'
                    }
                    const badgeGradient = tierColors[tier] || 'from-gray-300 to-gray-400'
                    return (
                      <div
                        key={u._id || idx}
                        className="modern-card rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl hover:shadow-xl sm:hover:shadow-2xl hover:shadow-pink-100/50 transition-all duration-500 hover:-translate-y-1 sm:hover:-translate-y-2 cursor-pointer group"
                        onClick={() => {
                          const token = localStorage.getItem('token');
                          if (!token) {
                            showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                            return
                          }
                          
                          const modalProfile: FeaturedProfile = {
                            id: u._id,
                            name: displayName,
                            age: u?.age,
                            location: u?.location || 'Thailand',
                            distance: 'Premium',
                            bio: u?.bio || '',
                            interests: Array.isArray(u?.interests)
                              ? u.interests.map((it: any) => it?.category || it?.name || `${it}`).filter(Boolean)
                              : [],
                            images: (u?.profileImages || []).filter((img: any) => {
                              const imgPath = typeof img === 'string' ? img : img?.url || '';
                              return !imgPath.startsWith('data:image/svg+xml');
                            }),
                            verified: false,
                            online: (u as any)?.isOnline || false,
                            lastActive: (u as any)?.lastActive,
                            membershipTier: u?.membership?.tier || 'member',
                            membership: {
                              tier: u?.membership?.tier || 'member'
                            }
                          };
                          
                          // ใช้ handleViewProfile ที่มีการตรวจสอบสิทธิ์
                          handleViewProfile(modalProfile);
                        }}
                      >
                        <div className="h-48 sm:h-60 md:h-72 overflow-hidden relative">
                          {imageUrl ? (
                            <>
                              <img
                                src={imageUrl}
                                alt={displayName}
                                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isMainImageBlurred ? 'filter blur-md' : ''}`}
                                style={{
                                  ...(isMainImageBlurred && { 
                                    filter: 'blur(12px)',
                                    transition: 'filter 0.3s ease'
                                  })
                                }}
                                onError={(e) => {
                                  console.error('❌ Premium user image failed to load:', {
                                    imageUrl: mainImage,
                                    userId: u._id || (u as any)?.id,
                                    username: u?.nickname || u?.firstName
                                  });
                                  
                                  // ลองใช้รูปภาพอื่นในโปรไฟล์
                                  const target = e.target as HTMLImageElement;
                                  const profileImages = u?.profileImages || [];
                                  const currentIndex = profileImages.findIndex(img => 
                                    img === mainImage
                                  );
                                  
                                  if (currentIndex !== -1 && currentIndex < profileImages.length - 1) {
                                    // ลองรูปภาพถัดไป
                                    const nextImage = profileImages[currentIndex + 1];
                                    if (nextImage && nextImage !== mainImage) {
                                      console.log('🔄 Trying next premium user image:', nextImage);
                                      target.src = nextImage;
                                      return;
                                    }
                                  }
                                  
                                  // หากไม่มีรูปภาพอื่น ให้ซ่อนรูปภาพและแสดง placeholder
                                  target.style.display = 'none';
                                  
                                  // แสดง placeholder หรือ gradient background
                                  const placeholder = document.createElement('div');
                                  placeholder.className = 'w-full h-full bg-gradient-to-br from-pink-400 to-violet-400 flex items-center justify-center text-white';
                                  placeholder.innerHTML = `
                                    <div class="text-center">
                                      <div class="text-4xl font-bold mb-2">
                                        ${(u?.firstName?.charAt(0) || u?.nickname?.charAt(0) || 'U')}
                                      </div>
                                      <div class="text-sm opacity-75">รูปภาพไม่พร้อมใช้งาน</div>
                                    </div>
                                  `;
                                  target.parentNode?.appendChild(placeholder);
                                }}
                              />
                              {/* Overlay สำหรับรูปเบลอ */}
                              {isMainImageBlurred && (
                                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                                  <div className="w-10 h-10 text-white opacity-60">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                      <path d="M12 6c3.79 0 7.17 2.13 8.82 5.5-.59 1.22-1.42 2.27-2.41 3.12l1.41 1.41c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65C10.66 6.09 11.32 6 12 6zm-1.07 1.14L13 9.21c.57.25 1.03.71 1.28 1.28l2.07 2.07c.08-.34.14-.7.14-1.07C16.5 9.01 14.48 7 12 7c-.37 0-.72.05-1.07.14zM2.01 3.87l2.68 2.68C3.06 7.83 1.77 9.53 1 11.5 2.73 15.89 7 19 12 19c1.52 0 2.98-.29 4.32-.82l3.42 3.42 1.41-1.41L3.42 2.46 2.01 3.87zm7.5 7.5l2.61 2.61c-.04.01-.08.02-.12.02-1.38 0-2.5-1.12-2.5-2.5 0-.05.01-.08.01-.13zm-3.4-3.4l1.75 1.75c-.23.55-.36 1.15-.36 1.78 0 2.48 2.02 4.5 4.5 4.5.63 0 1.23-.13 1.77-.36l.98.98c-.88.24-1.8.38-2.75.38-3.79 0-7.17-2.13-8.82-5.5.7-1.43 1.72-2.61 2.93-3.53z"/>
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : null}
                          
                          {/* Fallback element สำหรับรูปภาพที่โหลดไม่ได้ */}
                          <div className={`absolute inset-0 ${(u as any).isOnline ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-gray-600 to-gray-700'} flex items-center justify-center text-white text-2xl font-bold hidden`}>
                            <User className="h-12 w-12" />
                          </div>
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                          <div className="absolute top-2 sm:top-4 left-2 sm:left-4">
                            <div className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${badgeGradient} shadow-xl border border-white/10`}>{tier.toUpperCase()}</div>
                          </div>
                          {/* Vote Score Display - Top Right */}
                          <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
                            <HeartVote
                              candidateId={u._id || (u as any)?.id}
                              candidateGender={u?.gender || 'male'}
                              candidateDisplayName={displayName}
                              isOwnProfile={false}
                              className=""
                              // ส่งข้อมูลโหวตจากแหล่งเดียวกันกับ Top Vote
                              totalVotes={u.totalVotes || 0}
                              uniqueVoterCount={u.uniqueVoterCount || 0}
                              // ไม่ส่ง hasVoted เพื่อให้ HeartVote ตรวจสอบเอง
                            />
                          </div>
                          
                          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 text-white">
                            <div className="flex justify-between items-end">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold truncate">{displayName}{u?.age ? `, ${u.age}` : ''}</h3>
                                {u?.location && (
                                  <div className="flex items-center text-white/90 text-xs sm:text-sm">
                                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    <span className="truncate">{u.location}</span>
                                  </div>
                                )}
                              </div>
                              <div className="ml-2 flex gap-1 sm:gap-2">
                                {/* Profile Details Button */}
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className={`rounded-full transition-all duration-300 hover:scale-110 h-8 w-8 sm:h-10 sm:w-10 ${
                                    (u as any).isOnline 
                                      ? 'text-green-300 hover:text-green-200 hover:bg-green-400/40 shadow-green-400/50 shadow-lg' 
                                      : 'text-gray-500 hover:text-gray-400 hover:bg-gray-500/20'
                                  }`}
                                  onClick={(e: any) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    const token = localStorage.getItem('token');
                                    if (!token) {
                                      showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                                      return
                                    }
                                    
                                    // สร้างข้อมูลโปรไฟล์และใช้ handleViewProfile ที่มีการตรวจสอบสิทธิ์
                                    const modalProfile: FeaturedProfile = {
                                      id: u._id,
                                      name: displayName,
                                      age: u?.age,
                                      location: u?.location || 'Thailand',
                                      distance: 'Premium',
                                      bio: u?.bio || '',
                                      interests: Array.isArray(u?.interests)
                                        ? u.interests.map((it: any) => it?.category || it?.name || `${it}`).filter(Boolean)
                                        : [],
                                      images: (u?.profileImages || []).filter((img: any) => {
                                        const imgPath = typeof img === 'string' ? img : img?.url || '';
                                        return !imgPath.startsWith('data:image/svg+xml');
                                      }),
                                      verified: false,
                                      online: (u as any)?.isOnline || false,
                                      lastActive: (u as any)?.lastActive,
                                      membershipTier: u?.membership?.tier || 'member',
                                      membership: {
                                        tier: u?.membership?.tier || 'member'
                                      }
                                    };
                                    
                                    // ใช้ handleViewProfile ที่มีการตรวจสอบสิทธิ์
                                    handleViewProfile(modalProfile);
                                  }}
                                >
                                  <User className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                                </Button>
                                
                                {/* Heart Button */}
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className={`rounded-full transition-all duration-300 hover:scale-110 h-8 w-8 sm:h-10 sm:w-10 ${
                                    likedProfiles.has(u._id || '')
                                      ? 'text-red-500'
                                      : 'text-white hover:text-pink-300 hover:bg-white/20'
                                  }`}
                                  onClick={(e: any) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    const token = localStorage.getItem('token');
                                    if (!token) {
                                      showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                                      return
                                    }
                                    
                                    const userId = u._id || '';
                                    handleProfileLike(userId);
                                  }}
                                >
                                  <Heart className={`h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 ${
                                    likedProfiles.has(u._id || '') ? 'fill-current' : ''
                                  }`} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                      <Crown className="h-16 w-16 text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">ไม่มีสมาชิก Premium ในขณะนี้</h3>
                      <p className="text-sm text-gray-500 mb-4">กำลังโหลดข้อมูลสมาชิก Premium...</p>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                    </div>
                  )}
                </div>
              </div>
              {/* Mobile-First Discover Amazing People */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 mt-8 sm:mt-12 gap-4">
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text mb-1 sm:mb-2">Discover Amazing People ✨</h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    Find your perfect match from verified member singles 
                    {!isLoadingAllUsers && allUsers.length > 0 && (
                      <span className="ml-1 sm:ml-2 text-pink-600 font-semibold text-xs sm:text-sm">
                        (สุ่มแสดง {allUsers.length} คน)
                      </span>
                    )}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsLoadingAllUsers(true)
                    setCurrentPage(1)
                    setHasMoreUsers(true)
                    // Trigger reload
                    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                    fetch(`${base}/api/profile/discover?limit=50`, {
                      headers: {
                        'Content-Type': 'application/json',
                        ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                      }
                    })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success) {
                        setAllUsers(data.data.users)
                        setHasMoreUsers(data.data.pagination.page < data.data.pagination.pages)
                        setCurrentPage(1)
                      }
                    })
                    .catch(() => {})
                    .finally(() => setIsLoadingAllUsers(false))
                  }}
                  disabled={isLoadingAllUsers}
                  className="flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2"
                >
                  <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isLoadingAllUsers ? 'animate-spin' : ''}`} />
                  รีเฟรช
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                {isLoadingAllUsers ? (
                  // Loading skeleton
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="modern-card rounded-2xl overflow-hidden shadow-xl animate-pulse">
                      <div className="h-72 bg-gray-200"></div>
                      <div className="p-6">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded mb-4"></div>
                        <div className="flex gap-2">
                          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                          <div className="h-6 bg-gray-200 rounded-full w-14"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : allUsers.length > 0 ? (
                  allUsers
                    .filter(u => {
                      // กรองผู้ใช้ปัจจุบันออก
                      const currentUserId = user?._id || user?.id;
                      const userId = u._id || (u as any)?.id;
                      return currentUserId !== userId;
                    })
                    .slice(0, visibleCount)
                    .map(user => {
                    // ใช้ utility function เพื่อสร้าง image URL ที่ถูกต้อง
                    const profileImage = getMainProfileImage(
                      user?.profileImages || [], 
                      (user as any)?.mainProfileImageIndex, 
                      user._id || (user as any)?.id
                    )
                    
                    // const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                    
                    
                    const displayName = user.nickname || `${user.firstName || ''} ${user.lastName || ''}`.trim() || (user as any).username || 'Unknown'
                    const age = user.age || 'N/A'
                    const location = user.location || 'Unknown'
                    const bio = user.bio || 'No bio available'
                    const interests = user.interests?.map(i => i.category || i) || []
                    
                    // Debug: ตรวจสอบ isOnline status (แสดงเฉพาะคนที่ออนไลน์)
                    if ((user as any).isOnline) {
                      console.log(`🟢 User ${displayName} is ONLINE:`, {
                        isOnline: (user as any).isOnline,
                        lastActive: (user as any).lastActive,
                        userId: user._id
                      });
                    }
                    
                    return (
                      <div key={user._id} className="modern-card rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-pink-100/50 transition-all duration-500 hover:-translate-y-2 cursor-pointer group floating-hearts"                         onClick={() => {
                          console.log('🖱️ Discover card clicked:', displayName);
                          
                          const token = localStorage.getItem('token');
                          if (!token) {
                            showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                            return
                          }
                          
                          const profileData = {
                            id: user._id,
                            name: displayName,
                            age: parseInt(String(age)) || 0,
                            location: location,
                            bio: bio,
                            interests: interests,
                            images: user.profileImages && user.profileImages.length > 0
                              ? user.profileImages.filter(img => 
                                  typeof img === 'string' && !img.startsWith('data:image/svg+xml')
                                ).map(img => 
                                  getProfileImageUrl(img, user._id || (user as any).id)
                                )
                              : [],
                            verified: (user as any).isVerified,
                            online: (user as any).isOnline || false,
                            lastActive: (user as any).lastActive,
                            membershipTier: user.membership?.tier || 'member'
                          };
                          
                          
                          // ใช้ handleViewProfile ที่มีการตรวจสอบสิทธิ์
                          handleViewProfile(profileData);
                        }}>
                        <div className="h-48 sm:h-60 md:h-72 overflow-hidden relative">
                          {profileImage && !profileImage.startsWith('data:image/svg+xml') ? (
                            <img 
                              src={profileImage} 
                              alt={displayName} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              onError={(e) => {
                                // Only log error if it's not a Google profile image (which should work)
                                if (!profileImage.includes('googleusercontent.com') && !profileImage.includes('google.com')) {
                                  console.error('❌ Homepage image failed to load:', {
                                    imageUrl: profileImage,
                                    userId: user._id || (user as any).id,
                                    username: (user as any).username,
                                    originalImageName: user.profileImages?.[(user as any).mainProfileImageIndex || 0]
                                  });
                                } else {
                                  console.warn('⚠️ Google profile image failed to load, this might be a temporary issue:', profileImage);
                                }
                                
                                // ซ่อนรูปและแสดง fallback ทันที
                                (e.target as HTMLImageElement).style.display = 'none';
                                const fallbackElement = (e.target as HTMLImageElement).nextElementSibling;
                                if (fallbackElement) {
                                  fallbackElement.classList.remove('hidden');
                                }
                                
                                // ลองโหลดรูปอื่นถ้ามี (เฉพาะเมื่อรูปหลักล้มเหลว)
                                const otherImages = user.profileImages?.slice(1) || []
                                if (otherImages.length > 0 && !(e.target as HTMLImageElement).dataset.retried) {
                                  const nextImage = otherImages[0]
                                  let nextImageUrl = nextImage
                                  
                                  // แก้ไขชื่อไฟล์ถ้าจำเป็น
                                  if (!nextImage.startsWith('http') && !nextImage.startsWith('data:')) {
                                    const hasExtension = /\.(jpg|jpeg|png|gif|webp)$/i.test(nextImage)
                                    if (!hasExtension) {
                                      nextImageUrl = `${nextImage}.jpg`
                                    }
                                    nextImageUrl = getProfileImageUrl(nextImageUrl, selectedProfile?.id?.toString() || '')
                                  }
                                  
                                  console.log('🔄 Trying next image:', nextImageUrl)
                                  ;(e.target as HTMLImageElement).src = nextImageUrl
                                  ;(e.target as HTMLImageElement).dataset.retried = 'true'
                                }
                              }}
                              onLoad={() => {
                                console.log('✅ Homepage image loaded successfully:', {
                                  imageUrl: profileImage,
                                  userId: user._id || (user as any).id,
                                  username: (user as any).username
                                });
                              }}
                            />
                          ) : (
                            // แสดง gradient background สำหรับกรณีที่ไม่มีรูปภาพ
                            <div className="w-full h-full bg-gradient-to-br from-pink-400 to-violet-400 flex items-center justify-center text-white">
                              <span className="text-4xl font-bold">
                                {(user as any).firstName?.charAt(0) || (user as any).username?.charAt(0) || 'U'}
                              </span>
                            </div>
                          )}
                          
                          {/* Fallback element สำหรับรูปภาพที่โหลดไม่ได้ */}
                          <div className={`absolute inset-0 bg-gradient-to-br from-pink-400 to-violet-400 flex items-center justify-center text-white text-2xl font-bold hidden`}>
                            <span className="text-4xl font-bold">
                              {(user as any).firstName?.charAt(0) || (user as any).username?.charAt(0) || 'U'}
                            </span>
                          </div>
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                          
                          {/* Membership Tier Badge */}
                          {user.membership?.tier && (
                            <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                              <Badge className={`text-xs ${
                                user.membership.tier === 'platinum' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                user.membership.tier === 'diamond' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                user.membership.tier === 'vip2' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                                user.membership.tier === 'vip1' ? 'bg-gradient-to-r from-orange-500 to-yellow-500' :
                                user.membership.tier === 'vip' ? 'bg-gradient-to-r from-purple-400 to-pink-400' :
                                user.membership.tier === 'gold' ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                                user.membership.tier === 'silver' ? 'bg-gradient-to-r from-gray-400 to-slate-400' :
                                'bg-gradient-to-r from-gray-300 to-gray-400'
                              } text-white shadow-lg`}>
                                {/* แสดงคำเต็มเมื่อหน้าต่างกว้าง */}
                                <span className="hidden lg:block">
                                  {user.membership.tier === 'platinum' ? 'PLATINUM' :
                                   user.membership.tier === 'diamond' ? 'DIAMOND' :
                                   user.membership.tier === 'vip2' ? 'VIP2' :
                                   user.membership.tier === 'vip1' ? 'VIP1' :
                                   user.membership.tier === 'vip' ? 'VIP' :
                                   user.membership.tier === 'gold' ? 'GOLD' :
                                   user.membership.tier === 'silver' ? 'SILVER' :
                                   'MEMBER'}
                                </span>
                                {/* แสดงไอคอนเมื่อหน้าต่างแคบ (โหมดคอมพิวเตอร์) */}
                                <span className="lg:hidden">
                                  {user.membership.tier === 'platinum' ? '💎' :
                                   user.membership.tier === 'diamond' ? '💠' :
                                   user.membership.tier === 'vip2' ? '👑' :
                                   user.membership.tier === 'vip1' ? '👑' :
                                   user.membership.tier === 'vip' ? '👑' :
                                   user.membership.tier === 'gold' ? '🥇' :
                                   user.membership.tier === 'silver' ? '🥈' :
                                   '👤'}
                                </span>
                              </Badge>
                            </div>
                          )}
                          
                          {/* Vote Score Display - Top Right */}
                          <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
                            <HeartVote
                              candidateId={user._id || (user as any)?.id}
                              candidateGender={user?.gender || 'male'}
                              candidateDisplayName={displayName}
                              isOwnProfile={false}
                              className=""
                            />
                          </div>
                          
                          
                          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 text-white">
                            <div className="flex justify-between items-end">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm sm:text-base md:text-lg font-bold truncate text-white">{displayName}, {age}</h3>
                                <div className="flex items-center text-white/90 text-xs sm:text-sm">
                                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                  <span className="truncate">{location}</span>
                                </div>
                              </div>
                              <div className="ml-2 flex gap-1 sm:gap-2">
                                {/* Profile Details Button */}
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className={`rounded-full transition-all duration-300 hover:scale-110 h-8 w-8 sm:h-10 sm:w-10 ${
                                    (user as any).isOnline 
                                      ? 'text-green-300 hover:text-green-200 hover:bg-green-400/40 shadow-green-400/50 shadow-lg' 
                                      : 'text-gray-500 hover:text-gray-400 hover:bg-gray-500/20'
                                  }`}
                                  onClick={async (e: any) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    const token = localStorage.getItem('token');
                                    if (!token) {
                                      showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                                      return
                                    }
                                    
                                    try {
                                      // เรียก API เพื่อดึงข้อมูลโปรไฟล์เต็ม
                                      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                                      const response = await fetch(`${baseUrl}/api/profile/${user._id}`, {
                                        headers: {
                                          'Authorization': `Bearer ${token}`,
                                          'Content-Type': 'application/json'
                                        }
                                      });
                                      
                                      if (!response.ok) {
                                        throw new Error('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                                      }
                                      
                                      const result = await response.json();
                                      if (!result.success) {
                                        throw new Error(result.message || 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                                      }
                                      
                                      const fullProfile = result.data.profile;
                                      
                                      // สร้าง profile data object ที่ครบถ้วน
                                      const profileData = {
                                        id: fullProfile._id,
                                        name: fullProfile.nickname || `${fullProfile.firstName || ''} ${fullProfile.lastName || ''}`.trim() || displayName,
                                        age: fullProfile.age || parseInt(String(age)) || 0,
                                        location: fullProfile.location || location,
                                        bio: fullProfile.bio || bio,
                                        interests: Array.isArray(fullProfile.interests)
                                          ? fullProfile.interests.map((it: any) => it?.category || it?.name || `${it}`).filter(Boolean)
                                          : interests,
                                        images: (fullProfile.profileImages || []).filter(img => 
                                          typeof img === 'string' && !img.startsWith('data:image/svg+xml')
                                        ).map(img => 
                                          getProfileImageUrl(img, fullProfile._id)
                                        ),
                                        verified: fullProfile.isVerified || false,
                                        online: fullProfile.isOnline || false,
                                        lastActive: fullProfile.lastActive,
                                        membershipTier: fullProfile.membership?.tier || 'member',
                                        // ข้อมูลโปรไฟล์เต็ม
                                        username: fullProfile.username || '',
                                        firstName: fullProfile.firstName || '',
                                        lastName: fullProfile.lastName || '',
                                        email: fullProfile.email || '',
                                        phone: fullProfile.phone || '',
                                        birthDate: fullProfile.birthDate || '',
                                        gender: fullProfile.gender || '',
                                        lookingFor: fullProfile.lookingFor || '',
                                        education: fullProfile.education || '',
                                        occupation: fullProfile.occupation || '',
                                        height: fullProfile.height || '',
                                        weight: fullProfile.weight || '',
                                        relationshipStatus: fullProfile.relationshipStatus || '',
                                        smoking: fullProfile.smoking || '',
                                        drinking: fullProfile.drinking || '',
                                        exercise: fullProfile.exercise || '',
                                        languages: fullProfile.languages || [],
                                        hobbies: fullProfile.hobbies || [],
                                        profileVideos: fullProfile.profileVideos || [],
                                        religion: fullProfile.religion || '',
                                        pets: fullProfile.pets || '',
                                        children: fullProfile.children || '',
                                        wantChildren: fullProfile.wantChildren || ''
                                      };
                                      
                                      console.log('🎯 Discover: Opening full profile modal with complete data:', profileData);
                                      
                                      // เปิด profile modal พร้อมข้อมูลเต็ม
                                      openProfileModal(profileData);
                                      
                                    } catch (error) {
                                      console.error('Error loading full profile:', error);
                                      showWebappNotification('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                                    }
                                  }}
                                >
                                  <User className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                                </Button>
                                
                                {/* Heart Button */}
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className={`rounded-full transition-all duration-300 hover:scale-110 h-8 w-8 sm:h-10 sm:w-10 ${
                                    likedProfiles.has(user._id || '')
                                      ? 'text-red-500'
                                      : 'text-white hover:text-pink-300 hover:bg-white/20'
                                  }`}
                                  onClick={(e: any) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    const token = localStorage.getItem('token');
                                    if (!token) {
                                      showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                                      return
                                    }
                                    
                                    const userId = user._id || '';
                                    handleProfileLike(userId);
                                  }}
                                >
                                  <Heart className={`h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 ${
                                    likedProfiles.has(user._id || '') ? 'fill-current' : ''
                                  }`} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">ไม่พบผู้ใช้ในระบบ</p>
                    <p className="text-gray-400 text-sm">อาจเป็นเพราะยังไม่มีผู้ใช้อื่นในระบบ หรือเกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                    <Button 
                      onClick={() => {
                        setIsLoadingAllUsers(true)
                        setCurrentPage(1)
                        setHasMoreUsers(true)
                        // Trigger reload
                        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                        fetch(`${base}/api/profile/discover?limit=50`, {
                          headers: {
                            'Content-Type': 'application/json',
                            ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                          }
                        })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success) {
                            setAllUsers(data.data.users)
                            setHasMoreUsers(data.data.pagination.page < data.data.pagination.pages)
                            setCurrentPage(1)
                          }
                        })
                        .catch(() => {})
                        .finally(() => setIsLoadingAllUsers(false))
                      }}
                      disabled={isLoadingAllUsers}
                      className="mt-4 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingAllUsers ? 'animate-spin' : ''}`} />
                      ลองใหม่
                    </Button>
                  </div>
                )}
                
                {/* Load More Button */}
                {!isLoadingAllUsers && allUsers.length > 0 && visibleCount < allUsers.length && (
                  <div className="col-span-full text-center py-8">
                    <Button
                      onClick={() => {
                        const nextCount = Math.min(visibleCount + 12, allUsers.length)
                        setVisibleCount(nextCount)
                        console.log(`📊 Loading more cards: ${visibleCount} → ${nextCount} (total: ${allUsers.length})`)
                      }}
                      disabled={false}
                      variant="outline"
                      size="lg"
                      className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {false ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          กำลังโหลด...
                        </>
                      ) : (
                        <>
                          <Users className="w-5 h-5 mr-2" />
                          โหลดต่อ
                        </>
                      )}
                    </Button>
                    {(() => {
                      const allowed = ['member','silver','gold','vip','vip1','vip2']
                      const filteredLen = allUsers.filter(u => allowed.includes((u?.membership?.tier || 'member') as string)).length
                      return hasMoreUsers || visibleCount < filteredLen
                    })() && (
                      <p className="text-gray-500 text-sm mt-2">
                        หน้า {currentPage} • โหลดเพิ่ม 20 คนต่อครั้ง
                      </p>
                    )}
                  </div>
                )}
                
                {/* No More Users */}
                {!isLoadingAllUsers && allUsers.length > 0 && !hasMoreUsers && (
                  <div className="col-span-full text-center py-8">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-green-700 font-semibold">แสดงครบทุกคนแล้ว!</p>
                      <p className="text-green-600 text-sm">คุณได้ดูผู้ใช้ทั้งหมดที่สุ่มแสดงแล้ว - กดปุ่มรีเฟรชเพื่อสุ่มใหม่</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Mobile-First Matches Tab */}
            <TabsContent value="matches" id="matches-content" className="p-1 sm:p-6">
              {!isAuthenticated ? (
                <div className="text-center py-8 sm:py-12">
                  <Users className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">กรุณาเข้าสู่ระบบเพื่อใช้งาน AI Matching</p>
                  <Button onClick={() => setShowLoginDialog(true)} className="text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3">
                    เข้าสู่ระบบ
                  </Button>
                </div>
              ) : (
                <AIMatchingSystem currentUser={user} />
              )}
            </TabsContent>
            {/* Mobile-First Messages Tab */}
            <TabsContent value="messages" className="p-0 h-[calc(100vh-6rem)] min-h-[600px]">
              {!isAuthenticated ? (
                <div className="text-center py-8 sm:py-12">
                  <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">กรุณาเข้าสู่ระบบเพื่อใช้งานแชท</p>
                  <Button onClick={() => setShowLoginDialog(true)} className="text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3">
                    เข้าสู่ระบบ
                  </Button>
                </div>
              ) : (
                <Suspense fallback={<LoadingSpinner />}>
                  <Chat openChatWithUserId={chatWithUserId} onChatOpened={() => setChatWithUserId(null)} />
                </Suspense>
              )}
            </TabsContent>
            {/* Mobile-First Stream Tab */}
            <TabsContent value="stream" className="p-0">
              <Suspense fallback={<LoadingSpinner />}>
                <DJPage />
              </Suspense>
            </TabsContent>
            {/* Mobile-First Ranking Tab */}
            <TabsContent value="ranking" className="p-0">
              <Suspense fallback={<LoadingSpinner />}>
                <VoteRanking onUserProfileClick={handleVoteUserProfileClick} />
              </Suspense>
            </TabsContent>
            {/* Mobile-First Membership Tab */}
            <TabsContent value="membership" id="membership-content" className="p-1 sm:p-6">
              <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                {/* Premium Tabs Navigation */}
                <Tabs defaultValue="dashboard" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white border rounded-lg p-1 h-auto mb-6">
                    <TabsTrigger 
                      value="dashboard"
                      className="text-xs sm:text-sm py-2 px-1 sm:px-3 rounded-md data-[state=active]:bg-pink-500 data-[state=active]:text-white"
                    >
                      <FontAwesomeIcon icon={faGem} className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">แดชบอร์ด</span>
                      <span className="sm:hidden">แดชบอร์ด</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="shop"
                      className="text-xs sm:text-sm py-2 px-1 sm:px-3 rounded-md data-[state=active]:bg-pink-500 data-[state=active]:text-white"
                    >
                      <FontAwesomeIcon icon={faShoppingCart} className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">ร้านค้า</span>
                      <span className="sm:hidden">ร้านค้า</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Dashboard Tab Content */}
                  <TabsContent value="dashboard" className="space-y-4 sm:space-y-6 lg:space-y-8">
                    <Suspense fallback={<LoadingSpinner />}>
                      <MembershipDashboard userId={user?._id} />
                    </Suspense>
                    <div id="membership-comparison" className="border-t border-slate-200 pt-4 sm:pt-6 lg:pt-8">
                      <Suspense fallback={<LoadingSpinner />}>
                        <MembershipPlans currentUserId={user?._id} currentTier={user?.membership?.tier || 'member'} />
                      </Suspense>
                    </div>
                  </TabsContent>

                  {/* Shop Tab Content */}
                  <TabsContent value="shop" className="space-y-4 sm:space-y-6">
                    <Suspense fallback={<LoadingSpinner />}>
                      <CoinShop 
                        userId={user?._id} 
                        onNavigateToPayment={(plan) => {
                          // Navigate to payment page
                          setSelectedPlan(plan);
                          setCurrentView('payment');
                        }}
                      />
                    </Suspense>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
            {/* Mobile-First Profile Tab */}
            <TabsContent value="profile" className="p-1 sm:p-6">
              {showVoteUserProfile && selectedVoteUser ? (
                <div className="space-y-4">
                  {/* Header with back button */}
                  <div className="flex items-center space-x-3 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCloseVoteUserProfile}
                      className="flex items-center space-x-2"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>กลับ</span>
                    </Button>
                    <h2 className="text-lg font-semibold text-gray-800">
                      โปรไฟล์ของ {selectedVoteUser.displayName || selectedVoteUser.username || 'ผู้ใช้'}
                    </h2>
                  </div>
                  
                  {/* User Profile Component */}
                  <Suspense fallback={<LoadingSpinner />}>
                    <UserProfile
                      userId={selectedVoteUser._id || selectedVoteUser.id}
                      isOwnProfile={false}
                    />
                  </Suspense>
                </div>
              ) : isAuthenticated && user ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <UserProfile
                    userId={user._id || user.id}
                    isOwnProfile={true}
                  />
                </Suspense>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์</p>
                  <Button onClick={() => setShowLoginDialog(true)} className="text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3">
                    เข้าสู่ระบบ
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Mobile-First Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200/50 shadow-lg">
        <div className="max-w-md mx-auto">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="w-full justify-between bg-transparent h-12 sm:h-16 p-0">
              <TabsTrigger 
                value="discover" 
                className="flex-1 h-full data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 rounded-none text-gray-500 data-[state=active]:border-t-2 data-[state=active]:border-pink-700 transition-all duration-300 flex flex-col items-center justify-center space-y-0.5 sm:space-y-1"
              >
                <FontAwesomeIcon 
                  icon={faSearch} 
                  className={`h-3 w-3 sm:h-5 sm:w-5 transition-all duration-300 ${activeTab === 'discover' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
                  style={activeTab === 'discover' ? { color: '#be185d' } : {}} 
                />
                <span className="text-xs font-medium">ค้นหา</span>
              </TabsTrigger>
              <TabsTrigger 
                value="matches" 
                className="flex-1 h-full data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 rounded-none text-gray-500 data-[state=active]:border-t-2 data-[state=active]:border-pink-700 transition-all duration-300 flex flex-col items-center justify-center space-y-0.5 sm:space-y-1"
              >
                <FontAwesomeIcon 
                  icon={faHeart} 
                  className={`h-5 w-5 transition-all duration-300 ${activeTab === 'matches' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
                  style={activeTab === 'matches' ? { color: '#be185d' } : {}} 
                />
                <span className="text-xs font-medium">แมท</span>
              </TabsTrigger>
              <TabsTrigger 
                value="messages" 
                className="flex-1 h-full data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 rounded-none text-gray-500 data-[state=active]:border-t-2 data-[state=active]:border-pink-700 transition-all duration-300 flex flex-col items-center justify-center space-y-0.5 sm:space-y-1"
              >
                <FontAwesomeIcon 
                  icon={faComments} 
                  className={`h-5 w-5 transition-all duration-300 ${activeTab === 'messages' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
                  style={activeTab === 'messages' ? { color: '#be185d' } : {}} 
                />
                <span className="text-xs font-medium">แชท</span>
              </TabsTrigger>
              <TabsTrigger 
                value="stream" 
                className="flex-1 h-full data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 rounded-none text-gray-500 data-[state=active]:border-t-2 data-[state=active]:border-pink-700 transition-all duration-300 flex flex-col items-center justify-center space-y-0.5 sm:space-y-1"
              >
                <FontAwesomeIcon 
                  icon={faHeadphones} 
                  className={`h-5 w-5 transition-all duration-300 ${activeTab === 'stream' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
                  style={activeTab === 'stream' ? { color: '#be185d' } : {}} 
                />
                <span className="text-xs font-medium">ดีเจ</span>
              </TabsTrigger>
              <TabsTrigger 
                value="membership" 
                className="flex-1 h-full data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 rounded-none text-gray-500 data-[state=active]:border-t-2 data-[state=active]:border-pink-700 transition-all duration-300 flex flex-col items-center justify-center space-y-0.5 sm:space-y-1"
              >
                <FontAwesomeIcon 
                  icon={faGem} 
                  className={`h-5 w-5 transition-all duration-300 ${activeTab === 'membership' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
                  style={activeTab === 'membership' ? { color: '#be185d' } : {}} 
                />
                <span className="text-xs font-medium">พรีเมียม</span>
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="flex-1 h-full data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 rounded-none text-gray-500 data-[state=active]:border-t-2 data-[state=active]:border-pink-700 transition-all duration-300 flex flex-col items-center justify-center space-y-0.5 sm:space-y-1"
              >
                <FontAwesomeIcon 
                  icon={faUser} 
                  className={`h-5 w-5 transition-all duration-300 ${activeTab === 'profile' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
                  style={activeTab === 'profile' ? { color: '#be185d' } : {}} 
                />
                <span className="text-xs font-medium">โปรไฟล์</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gradient-to-r from-pink-100 via-violet-100 to-pink-100 border-t border-pink-300/30 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-5 h-5 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full flex items-center justify-center shadow-lg">
                <Heart className="h-3 w-3 text-white" fill="white" />
              </div>
              <a 
                href="https://devnid.xyz/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-base font-bold bg-gradient-to-r from-pink-600 via-violet-600 to-pink-600 bg-clip-text text-transparent hover:from-pink-700 hover:via-violet-700 hover:to-pink-700 transition-all duration-300 cursor-pointer transform hover:scale-105"
              >
                Power By DevKao & DevMax © {new Date().getFullYear()} V.2.9.3
              </a>
            </div>
            
            {/* Contact Email */}
            <div>
              <p className="text-sm text-gray-600">
                Contact us: infosodeclick@gmail.com
              </p>
            </div>
            
            {/* Privacy Policy Link */}
            <div>
              <a 
                href="/privacy-policy.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-purple-600 transition-colors duration-300 underline hover:no-underline"
              >
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Profile Image Modal */}
      {selectedProfile && (
        <Dialog open={showProfileModal} onOpenChange={setShowProfileModalDebug}>
          <DialogContent 
            className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] h-[80vh] max-w-[400px] max-h-[600px] sm:w-[500px] sm:h-[700px] bg-white backdrop-blur-md border border-gray-200 shadow-2xl rounded-none sm:rounded-xl p-0 overflow-hidden"
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 50
            }}
          >
            <VisuallyHidden>
              <DialogTitle>Profile of {selectedProfile.name}</DialogTitle>
              <DialogDescription>
                View profile images for {selectedProfile.name}, age {selectedProfile.age} from {selectedProfile.location}
              </DialogDescription>
            </VisuallyHidden>
            {/* Image Container */}
            <div className="relative w-full h-full">
              {/* Full Size Image */}
              {(() => {
                // Get images from images field
                const images = selectedProfile.images || [];
                const currentImage = images[activeImageIndex];
                
                // Handle both string and object image formats
                const imagePath = typeof currentImage === 'string' ? currentImage : (currentImage as any)?.url || '';
                const isBlurred = typeof currentImage === 'object' && (currentImage as any)?.isBlurred;
                
                // ตรวจสอบว่าผู้ใช้จ่ายเหรียญเพื่อดูรูปนี้แล้วหรือไม่
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                const profileId = selectedProfile?.id?.toString();
                const imageId = (currentImage as any)?._id?.toString() || `image_${activeImageIndex}`;
                
                // ตรวจสอบการซื้อรูปเฉพาะ - เฉพาะรูปนี้เท่านั้น
                const hasPaidForThisImage = currentUser.purchasedImages?.some((purchased: any) => 
                  purchased.profileId === profileId && purchased.imageId === imageId
                );
                
                // รูปจะเบลอเมื่อ: เป็นรูปที่ตั้งค่าเบลอ และยังไม่ได้จ่ายเหรียญสำหรับรูปนี้
                const finalIsBlurred = isBlurred && !hasPaidForThisImage;
                
                console.log('🔍 Modal image blur check:', {
                  activeImageIndex,
                  imagePath,
                  isBlurred,
                  hasPaidForThisImage,
                  finalIsBlurred,
                  profileId: selectedProfile?.id,
                  imageId,
                  purchasedImages: currentUser.purchasedImages,
                  currentImage,
                  selectedProfile,
                  allImages: selectedProfile.images,
                  forceUpdate, // เพิ่ม forceUpdate เพื่อติดตามการ re-render
                  matchingPurchases: currentUser.purchasedImages?.filter((purchased: any) => 
                    purchased.profileId === profileId && purchased.imageId === imageId
                  )
                });
                
                if (images.length > 0 && imagePath && !imagePath.startsWith('data:image/svg+xml')) {
                  // Use getProfileImageUrl to ensure correct URL
                  const imageUrl = getProfileImageUrl(imagePath, selectedProfile.id?.toString());
                  return (
                    <div className="relative w-full h-full">
                      <img
                        src={imageUrl}
                        alt={selectedProfile.name}
                        className={`w-full h-full object-cover ${finalIsBlurred ? 'filter blur-lg' : ''}`}
                        style={{
                          ...(finalIsBlurred && { 
                            filter: 'blur(16px)',
                            transition: 'filter 0.3s ease'
                          })
                        }}
                        onError={(e) => {
                          console.error('❌ Profile modal image failed to load:', {
                            imageUrl: imageUrl,
                            originalImage: currentImage,
                            profileId: selectedProfile.id
                          });
                          
                          // ลองใช้รูปภาพอื่นในโปรไฟล์
                          const target = e.target as HTMLImageElement;
                          const profileImages = selectedProfile?.images || [];
                          const currentIndex = profileImages.findIndex(img => 
                            img === currentImage || img === imageUrl
                          );
                          
                          if (currentIndex !== -1 && currentIndex < profileImages.length - 1) {
                            // ลองรูปภาพถัดไป
                            const nextImage = profileImages[currentIndex + 1];
                            if (nextImage && nextImage !== currentImage) {
                              console.log('🔄 Trying next profile image:', nextImage);
                              target.src = nextImage;
                              return;
                            }
                          }
                          
                          // หากไม่มีรูปภาพอื่น ให้ซ่อนรูปภาพและแสดง placeholder
                          target.style.display = 'none';
                          
                          // แสดง placeholder หรือ gradient background
                          const placeholder = document.createElement('div');
                          placeholder.className = 'w-full h-full bg-gradient-to-br from-pink-400 to-violet-400 flex items-center justify-center text-white';
                          placeholder.innerHTML = `
                            <div class="text-center">
                              <div class="text-4xl font-bold mb-2">
                                ${(selectedProfile?.firstName?.charAt(0) || selectedProfile?.username?.charAt(0) || 'U')}
                              </div>
                              <div class="text-sm opacity-75">รูปภาพไม่พร้อมใช้งาน</div>
                            </div>
                          `;
                          target.parentNode?.appendChild(placeholder);
                        }}
                        onLoad={() => {
                          console.log('✅ Profile modal image loaded successfully:', {
                            imageUrl: imageUrl,
                            originalImage: currentImage,
                            profileId: selectedProfile.id
                          });
                        }}
                      />
                      {/* Overlay สำหรับรูปเบลอ */}
                      {finalIsBlurred && (
                        <div className="absolute inset-0 bg-black bg-opacity-30 flex flex-col items-center justify-center">
                          <div className="w-16 h-16 text-white opacity-60 mb-4">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                              <path d="M12 6c3.79 0 7.17 2.13 8.82 5.5-.59 1.22-1.42 2.27-2.41 3.12l1.41 1.41c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65C10.66 6.09 11.32 6 12 6zm-1.07 1.14L13 9.21c.57.25 1.03.71 1.28 1.28l2.07 2.07c.08-.34.14-.7.14-1.07C16.5 9.01 14.48 7 12 7c-.37 0-.72.05-1.07.14zM2.01 3.87l2.68 2.68C3.06 7.83 1.77 9.53 1 11.5 2.73 15.89 7 19 12 19c1.52 0 2.98-.29 4.32-.82l3.42 3.42 1.41-1.41L3.42 2.46 2.01 3.87zm7.5 7.5l2.61 2.61c-.04.01-.08.02-.12.02-1.38 0-2.5-1.12-2.5-2.5 0-.05.01-.08.01-.13zm-3.4-3.4l1.75 1.75c-.23.55-.36 1.15-.36 1.78 0 2.48 2.02 4.5 4.5 4.5.63 0 1.23-.13 1.77-.36l.98.98c-.88.24-1.8.38-2.75.38-3.79 0-7.17-2.13-8.82-5.5.7-1.43 1.72-2.61 2.93-3.53z"/>
                            </svg>
                          </div>
                          
                          {/* ปุ่มจ่ายเหรียญ */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              const token = localStorage.getItem('token');
                              if (!token) {
                                showWebappNotification('กรุณาเข้าสู่ระบบก่อน');
                                return;
                              }
                              
                              // Handle blur payment - ส่ง imageId ของรูปที่กำลังแสดง
                              const currentImage = images[activeImageIndex];
                              const currentImageId = (currentImage as any)?._id?.toString() || `image_${activeImageIndex}`;
                              const targetUserId = selectedProfile?.id?.toString() || (selectedProfile as any)?._id?.toString() || '';
                              
                              console.log('🔍 Blur payment debug:', {
                                selectedProfile,
                                targetUserId,
                                currentImageId,
                                currentImage,
                                images: images.length
                              });
                              
                              if (!targetUserId) {
                                showWebappNotification('ไม่พบ ID ของโปรไฟล์ กรุณาลองใหม่');
                                return;
                              }
                              
                              // ตรวจสอบข้อมูลเพิ่มเติมก่อนส่ง
                              if (!currentImage) {
                                showWebappNotification('ไม่พบรูปภาพที่ต้องการซื้อ');
                                return;
                              }
                              
                              // ตรวจสอบว่ารูปนี้เบลอจริงหรือไม่
                              const isImageBlurred = typeof currentImage === 'object' && (currentImage as any)?.isBlurred;
                              if (!isImageBlurred) {
                                showWebappNotification('รูปภาพนี้ไม่ได้ตั้งค่าเบลอ');
                                return;
                              }
                              
                              console.log('✅ Validation passed, proceeding with payment');
                              handleBlurPayment(targetUserId, selectedProfile?.name || '', currentImageId);
                            }}
                            className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105 flex items-center gap-2"
                          >
                            <span className="text-xl">💰</span>
                            <div className="text-center">
                              <div className="text-sm">ดูรูปนี้</div>
                              <div className="text-xs opacity-90">10,000 เหรียญ</div>
                            </div>
                          </button>
                          
                          <p className="text-white text-xs mt-2 opacity-80 text-center">
                            จ่ายเฉพาะรูปนี้ • ดูได้ตลอด
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
              {(() => {
                // Show fallback if no image is displayed
                const images = selectedProfile.images || [];
                const currentImage = images[activeImageIndex];
                const imagePath = typeof currentImage === 'string' ? currentImage : (currentImage as any)?.url || '';
                const hasValidImage = images.length > 0 && imagePath && !imagePath.startsWith('data:image/svg+xml');
                
                if (!hasValidImage) {
                  return (
                    /* Fallback when no image */
                    <div className="w-full h-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
                      <div className="text-center text-white">
                        <User className="h-24 w-24 mx-auto mb-4 opacity-80" />
                        <h3 className="text-2xl font-bold mb-2">{selectedProfile.name}</h3>
                        <p className="text-lg opacity-90">ไม่มีรูปภาพ</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Control Buttons - ต้องอยู่นอก image container */}
            <button
              onClick={() => {
                // ไม่ให้ปิด modal ถ้ากำลังป้องกันการปิด
                if (preventModalClose) {
                  console.log('🔒 Preventing modal close due to preventModalClose flag (X button)');
                  showWebappNotification('กรุณารอการดำเนินการให้เสร็จสิ้นก่อน');
                  return;
                }
                
                setShowProfileModalDebug(false);
                setModalAction(null);
                setShowProfileDetails(false);
                setProfileData(null);
                setProfileAlert(null);
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full p-2 sm:p-3 transition-colors"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Back Button (when showing profile details) */}
            {showProfileDetails && (
              <button
                onClick={() => {
                  setShowProfileDetails(false);
                  setProfileData(null);
                  setProfileAlert(null);
                }}
                className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full p-2 sm:p-3 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
              
            {/* Fixed Profile Info Overlay - ล็อคที่ขอบล่างของ Modal Container (ไม่ใช่ภาพ) */}
            <div className="absolute bottom-0 left-0 right-0 h-48 sm:h-52 z-20 pointer-events-none">
                {/* Background overlay for better text visibility - ซ่อนเมื่อแสดงรายละเอียดโปรไฟล์ */}
                {!showProfileDetails && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent"></div>
                )}
                
                {/* Content positioned at very bottom - ล็อคตำแหน่งไม่ให้เลื่อนตามความสูงของภาพ */}
                <div className="absolute bottom-4 left-4 right-4 text-white pointer-events-auto">
                  {/* Alert Message */}
                  {profileAlert && (
                    <div className={`mb-2 sm:mb-3 md:mb-4 p-2 sm:p-3 rounded-lg flex items-center justify-between ${
                      profileAlert.type === 'error' ? 'bg-red-500/90 text-white' :
                      profileAlert.type === 'success' ? 'bg-green-500/90 text-white' :
                      'bg-yellow-500/90 text-white'
                    }`}>
                      <span className="text-xs sm:text-sm font-medium">{profileAlert.message}</span>
                      <button 
                        onClick={() => setProfileAlert(null)}
                        className="ml-1 sm:ml-2 text-white/80 hover:text-white"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  )}
                  
                  {/* Profile Info - ซ่อนเมื่อแสดงรายละเอียดโปรไฟล์ */}
                  {!showProfileDetails && (
                    <>
                      <div className="flex justify-between items-end mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold mb-1 text-white" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)'}}>{selectedProfile.name}, {selectedProfile.age}</h3>
                          <div className="flex items-center text-white text-base" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'}}>
                            <MapPin className="h-5 w-5 mr-2" />
                            <span className="truncate">{selectedProfile.location}</span>
                            <span className="mx-2">•</span>
                            <div className="flex items-center">
                              {selectedProfile.membershipTier === 'platinum' && <Crown className="h-5 w-5 mr-2 text-purple-300" />}
                              {selectedProfile.membershipTier === 'diamond' && <Crown className="h-5 w-5 mr-2 text-blue-300" />}
                              {selectedProfile.membershipTier === 'gold' && <Crown className="h-5 w-5 mr-2 text-yellow-300" />}
                              {selectedProfile.membershipTier === 'silver' && <Crown className="h-5 w-5 mr-2 text-gray-300" />}
                              {selectedProfile.membershipTier === 'vip' && <Crown className="h-5 w-5 mr-2 text-pink-300" />}
                              {selectedProfile.membershipTier === 'vip1' && <Crown className="h-5 w-5 mr-2 text-orange-300" />}
                              {selectedProfile.membershipTier === 'vip2' && <Crown className="h-5 w-5 mr-2 text-red-300" />}
                              <span className="capitalize text-base">{selectedProfile.membershipTier || 'Member'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bio Section */}
                      {selectedProfile.bio && selectedProfile.bio !== 'No bio available' ? (
                        <div className="mb-1">
                          <h4 className="text-base font-semibold mb-1 text-white" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'}}>เกี่ยวกับฉัน</h4>
                          <p className="text-base text-white leading-relaxed line-clamp-1" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'}}>{selectedProfile.bio}</p>
                        </div>
                      ) : (
                        <div className="mb-1">
                          <h4 className="text-base font-semibold mb-1 text-white" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'}}>เกี่ยวกับฉัน</h4>
                          <p className="text-base text-white leading-relaxed line-clamp-1" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'}}>ยังไม่มีข้อมูลเกี่ยวกับฉัน</p>
                        </div>
                      )}
                      
                      {/* Interests Section */}
{/* Interests section hidden as requested */}
                    </>
                  )}
                  
                  
                  {/* Image Indicators */}
                  {(() => {
                    const images = selectedProfile.images || [];
                    return images.length > 1 && (
                      <div className="flex justify-center space-x-2 mb-1">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setActiveImageIndex(index)}
                            className={`w-3 h-3 rounded-full transition-all ${
                              index === activeImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    );
                  })()}
                  
                  {/* Action Icons - ซ่อนเมื่อแสดงรายละเอียดโปรไฟล์ */}
                  {!showProfileDetails && (
                    <div className="flex justify-center items-center gap-4 mt-4">
                      {/* Chat Icon button */}
                      <button
                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 bg-blue-500 hover:bg-blue-600 text-white border border-blue-600"
                        onClick={async () => {
                          console.log('💬 Chat with profile:', selectedProfile.name);
                          
                          const token = localStorage.getItem('token');
                          if (!token) {
                            showWebappNotification('กรุณาเข้าสู่ระบบก่อน');
                            return;
                          }
                          
                          const profileId = selectedProfile.id?.toString() || (selectedProfile as any)?._id?.toString() || '';
                          if (!profileId) {
                            showWebappNotification('ไม่พบ ID ของโปรไฟล์');
                            return;
                          }
                          
                          // ปิด modal
                          setShowProfileModalDebug(false);
                          
                          // ตั้งค่า user ID สำหรับเปิดแชท
                          setChatWithUserId(profileId);
                          
                          // เปลี่ยนไปที่ messages tab
                          setActiveTab('messages');
                        }}
                      >
                        <MessageCircle className="h-6 w-6" />
                      </button>
                      
                      {/* Heart Icon */}
                      <button
                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 ${
                          likedProfiles.has(selectedProfile.id?.toString() || '')
                            ? 'bg-red-500 text-white scale-110 border border-red-600'
                            : 'bg-pink-500 hover:bg-pink-600 text-white border border-pink-600'
                        }`}
                        onClick={() => {
                          console.log('💖 Like profile:', selectedProfile.name);
                          const profileId = selectedProfile.id?.toString() || '';
                          handleProfileLike(profileId);
                        }}
                      >
                        <Heart className={`h-6 w-6 ${
                          likedProfiles.has(selectedProfile.id?.toString() || '') ? 'fill-current' : ''
                        }`} />
                      </button>
                      
                      {/* Profile Details Icon */}
                      <button
                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 bg-purple-500 hover:bg-purple-600 text-white border border-purple-600"
                        onClick={async () => {
                          console.log('👤 View profile details:', selectedProfile.name);
                          
                          const token = localStorage.getItem('token');
                          if (!token) {
                            showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                            return
                          }
                          
                          try {
                            // เรียก API เพื่อดึงข้อมูลโปรไฟล์เต็ม
                            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                            const response = await fetch(`${baseUrl}/api/profile/${selectedProfile.id}`, {
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              }
                            });
                            
                            if (!response.ok) {
                              throw new Error('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                            }
                            
                            const result = await response.json();
                            if (!result.success) {
                              throw new Error(result.message || 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                            }
                            
                            const fullProfile = result.data.profile;
                            
                            // สร้าง profile data object ที่ครบถ้วน
                            const profileData = {
                              id: fullProfile._id,
                              name: fullProfile.nickname || `${fullProfile.firstName || ''} ${fullProfile.lastName || ''}`.trim() || selectedProfile.name,
                              age: fullProfile.age || selectedProfile.age,
                              location: fullProfile.location || selectedProfile.location,
                              bio: fullProfile.bio || selectedProfile.bio,
                              interests: Array.isArray(fullProfile.interests)
                                ? fullProfile.interests.map((it: any) => it?.category || it?.name || `${it}`).filter(Boolean)
                                : selectedProfile.interests || [],
                              images: (fullProfile.profileImages || []).filter(img => 
                                typeof img === 'string' && !img.startsWith('data:image/svg+xml')
                              ).map(img => 
                                getProfileImageUrl(img, fullProfile._id)
                              ),
                              verified: fullProfile.isVerified || false,
                              online: fullProfile.isOnline || false,
                              lastActive: fullProfile.lastActive,
                              membershipTier: fullProfile.membership?.tier || 'member',
                              // ข้อมูลโปรไฟล์เต็ม
                              username: fullProfile.username || '',
                              firstName: fullProfile.firstName || '',
                              lastName: fullProfile.lastName || '',
                              email: fullProfile.email || '',
                              phone: fullProfile.phone || '',
                              birthDate: fullProfile.birthDate || '',
                              gender: fullProfile.gender || '',
                              lookingFor: fullProfile.lookingFor || '',
                              education: fullProfile.education || '',
                              occupation: fullProfile.occupation || '',
                              height: fullProfile.height || '',
                              weight: fullProfile.weight || '',
                              relationshipStatus: fullProfile.relationshipStatus || '',
                              smoking: fullProfile.smoking || '',
                              drinking: fullProfile.drinking || '',
                              exercise: fullProfile.exercise || '',
                              languages: fullProfile.languages || [],
                              hobbies: fullProfile.hobbies || [],
                              profileVideos: fullProfile.profileVideos || [],
                              religion: fullProfile.religion || '',
                              pets: fullProfile.pets || '',
                              children: fullProfile.children || '',
                              wantChildren: fullProfile.wantChildren || ''
                            };
                            
                            console.log('🎯 Modal: Loaded full profile details:', profileData);
                            
                            // แสดงรายละเอียดใน modal เดิม
                            setModalAction('profile');
                            setProfileData(profileData);
                            setShowProfileDetails(true);
                            
                          } catch (error) {
                            console.error('Error loading full profile:', error);
                            showWebappNotification('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                          }
                        }}
                      >
                        <User className="h-6 w-6" />
                      </button>
                    </div>
                  )}
                  
                  {/* Action Result Display */}
                    {modalAction === 'like' && (
                      <div className="mt-2 mb-2 p-3 bg-black/40 backdrop-blur-sm rounded-xl border border-white/30">
                        <div className="text-center text-white">
                          <Heart className="h-5 w-5 mx-auto mb-2 text-red-400 fill-current" />
                          <p className="text-base font-medium">ส่งหัวใจให้ {selectedProfile.name}</p>
                          <p className="text-sm text-white/80 mt-1">💖 หวังว่าจะได้เจอกัน!</p>
                        </div>
                      </div>
                    )}
                  
                  {/* REMOVED: Chat Countdown Display - Chat functionality removed */}
                </div>
            </div>
              
              {/* Full Profile Details View */}
              {showProfileDetails && (
                <div className="absolute inset-0 bg-gradient-to-br from-pink-50/95 via-violet-50/95 to-blue-50/95 backdrop-blur-md overflow-y-auto">
                  {/* Background Elements */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-10 left-4 w-48 h-48 sm:top-20 sm:left-10 sm:w-96 sm:h-96 bg-gradient-to-br from-pink-300/20 to-violet-300/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute top-40 right-8 w-40 h-40 sm:top-60 sm:right-20 sm:w-80 sm:h-80 bg-gradient-to-br from-blue-300/15 to-cyan-300/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    <div className="absolute bottom-20 left-1/4 w-36 h-36 sm:bottom-32 sm:left-1/4 sm:w-72 sm:h-72 bg-gradient-to-br from-orange-300/20 to-pink-300/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
                    <div className="absolute bottom-40 right-1/3 w-32 h-32 sm:bottom-60 sm:right-1/3 sm:w-64 sm:h-64 bg-gradient-to-br from-purple-300/25 to-indigo-300/25 rounded-full blur-3xl animate-pulse delay-3000"></div>
                  </div>
                  {/* Floating Elements */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 text-2xl sm:text-4xl opacity-20 animate-float">✨</div>
                    <div className="absolute top-1/3 right-1/4 text-3xl sm:text-5xl opacity-15 animate-float delay-1000">💫</div>
                    <div className="absolute bottom-1/3 left-1/3 text-4xl sm:text-6xl opacity-10 animate-float delay-2000">🌟</div>
                    <div className="absolute bottom-1/4 right-1/3 text-2xl sm:text-3xl opacity-25 animate-float delay-3000">💖</div>
                    <div className="absolute top-1/2 left-1/6 text-2xl sm:text-4xl opacity-20 animate-float delay-4000">🎉</div>
                    <div className="absolute top-3/4 right-1/6 text-3xl sm:text-5xl opacity-15 animate-float delay-5000">🌈</div>
                  </div>
                  
                  <div className="relative p-6 sm:p-8 text-gray-800 space-y-6">
                    {/* Loading State */}
                    {false && (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                        <span className="ml-3 text-gray-600">กำลังโหลดข้อมูลโปรไฟล์...</span>
                      </div>
                    )}
                    
                    {/* Profile Data */}
                    {(profileData || selectedProfile) && (() => {
                      // Create a unified profile object with all available data
                      const unifiedProfile = {
                        ...selectedProfile,
                        ...profileData,
                        // Ensure images field is available - prioritize profileData
                        profileImages: profileData?.profileImages || profileData?.images || selectedProfile?.images || [],
                        images: profileData?.images || profileData?.profileImages || selectedProfile?.images || [],
                        // Ensure basic fields are always available
                        name: profileData?.name || selectedProfile?.name || 'ไม่ระบุชื่อ',
                        age: profileData?.age || selectedProfile?.age || null,
                        location: profileData?.location || selectedProfile?.location || null,
                        bio: profileData?.bio || selectedProfile?.bio || null,
                        membership: profileData?.membership || selectedProfile?.membership || { tier: 'member' }
                      };
                      
                      
                      return (
                      <>
                        {/* Profile Header */}
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <div className="relative">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                              {(() => {
                                // ใช้ utility function เพื่อสร้าง profile image URL ที่ถูกต้อง
                                const profileImageUrl = getMainProfileImage(
                                  unifiedProfile.profileImages || [], 
                                  unifiedProfile.mainProfileImageIndex, 
                                  unifiedProfile.id
                                )
                                
                                return profileImageUrl ? (
                                  <img 
                                    src={profileImageUrl}
                                    alt="Profile"
                                    className="w-full h-full rounded-full object-cover object-center"
                                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                    onError={(e) => {
                                      console.error('❌ Profile modal image failed to load:', {
                                        imageUrl: profileImageUrl,
                                        originalImage: unifiedProfile.profileImages[0],
                                        profileId: unifiedProfile.id
                                      });
                                      
                                      // ลองใช้รูปภาพอื่นในโปรไฟล์
                                      const target = e.target as HTMLImageElement;
                                      const profileImages = unifiedProfile?.profileImages || [];
                                      const currentIndex = profileImages.findIndex(img => 
                                        img === profileImageUrl || img === unifiedProfile.profileImages[0]
                                      );
                                      
                                      if (currentIndex !== -1 && currentIndex < profileImages.length - 1) {
                                        // ลองรูปภาพถัดไป
                                        const nextImage = profileImages[currentIndex + 1];
                                        if (nextImage && nextImage !== profileImageUrl) {
                                          console.log('🔄 Trying next profile modal image:', nextImage);
                                          target.src = nextImage;
                                          return;
                                        }
                                      }
                                      
                                      // หากไม่มีรูปภาพอื่น ให้ซ่อนรูปภาพและแสดง fallback
                                      target.style.display = 'none';
                                      ((target.nextSibling as HTMLElement)).style.display = 'flex';
                                    }}
                                    onLoad={() => {
                                      console.log('✅ Profile modal image loaded successfully:', {
                                        imageUrl: profileImageUrl,
                                        originalImage: unifiedProfile.profileImages[0],
                                        profileId: unifiedProfile.id
                                      });
                                    }}
                                  />
                                ) : null
                              })()}
                              <div className={`absolute inset-0 w-full h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold ${(() => {
                                const profileImageUrl = getMainProfileImage(
                                  unifiedProfile.profileImages || [], 
                                  unifiedProfile.mainProfileImageIndex, 
                                  unifiedProfile.id
                                )
                                return profileImageUrl && !profileImageUrl.startsWith('data:image/svg+xml') ? 'hidden' : ''
                              })()}`}>
                                <User className="h-10 w-10 sm:h-12 sm:w-12" />
                              </div>
                            </div>
                            {unifiedProfile.membership?.tier && unifiedProfile.membership.tier !== 'member' && (
                              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs shadow-lg">
                                <Crown className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-1">
                              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                                {unifiedProfile.nickname || unifiedProfile.name || `${unifiedProfile.firstName || ''} ${unifiedProfile.lastName || ''}`.trim() || (unifiedProfile as any).username || 'ไม่ระบุชื่อ'}
                              </h1>
                              {unifiedProfile.membership?.tier && (
                                <Badge className={`bg-gradient-to-r ${
                                  unifiedProfile.membership.tier === 'platinum' ? 'from-purple-500 to-pink-500' :
                                  unifiedProfile.membership.tier === 'diamond' ? 'from-blue-500 to-cyan-500' :
                                  unifiedProfile.membership.tier === 'vip2' ? 'from-red-500 to-orange-500' :
                                  unifiedProfile.membership.tier === 'vip1' ? 'from-orange-500 to-yellow-500' :
                                  unifiedProfile.membership.tier === 'vip' ? 'from-purple-400 to-pink-400' :
                                  unifiedProfile.membership.tier === 'gold' ? 'from-yellow-500 to-amber-500' :
                                  unifiedProfile.membership.tier === 'silver' ? 'from-gray-400 to-slate-400' :
                                  'from-gray-300 to-gray-400'
                                } text-white text-xs`}>
                                  {/* แสดงคำเต็มเมื่อหน้าต่างกว้าง */}
                                  <span className="hidden lg:flex items-center">
                                    <Crown className="h-3 w-3 mr-1" />
                                    {unifiedProfile.membership.tier === 'platinum' ? 'PLATINUM' :
                                     unifiedProfile.membership.tier === 'diamond' ? 'DIAMOND' :
                                     unifiedProfile.membership.tier === 'vip2' ? 'VIP2' :
                                     unifiedProfile.membership.tier === 'vip1' ? 'VIP1' :
                                     unifiedProfile.membership.tier === 'vip' ? 'VIP' :
                                     unifiedProfile.membership.tier === 'gold' ? 'GOLD' :
                                     unifiedProfile.membership.tier === 'silver' ? 'SILVER' :
                                     'MEMBER'}
                                  </span>
                                  {/* แสดงไอคอนเมื่อหน้าต่างแคบ (โหมดคอมพิวเตอร์) */}
                                  <span className="lg:hidden">
                                    {unifiedProfile.membership.tier === 'platinum' ? '💎' :
                                     unifiedProfile.membership.tier === 'diamond' ? '💠' :
                                     unifiedProfile.membership.tier === 'vip2' ? '👑' :
                                     unifiedProfile.membership.tier === 'vip1' ? '👑' :
                                     unifiedProfile.membership.tier === 'vip' ? '👑' :
                                     unifiedProfile.membership.tier === 'gold' ? '🥇' :
                                     unifiedProfile.membership.tier === 'silver' ? '🥈' :
                                     '👤'}
                                  </span>
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-600">
                              {unifiedProfile.location && (
                                <span className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {unifiedProfile.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                    
                        {/* Bio Section */}
                        {unifiedProfile.bio && (
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800">เกี่ยวกับฉัน</h3>
                            <p className="text-gray-600 leading-relaxed">{unifiedProfile.bio}</p>
                          </div>
                        )}
                        
                        {/* Interests Section */}
                        {unifiedProfile.interests && unifiedProfile.interests.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800">ความสนใจ</h3>
                            <div className="flex flex-wrap gap-2">
                              {formatInterests(unifiedProfile.interests).map((interest: string, index: number) => (
                                <Badge key={index} variant="secondary" className="px-3 py-1 bg-white/80 text-gray-700 border-gray-300 shadow-sm">
                                  {interest}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Images Section */}
                        {unifiedProfile.profileImages && unifiedProfile.profileImages.length > 1 && !unifiedProfile.profileImages.every(img => typeof img === 'string' && img.startsWith('data:image/svg+xml')) && (
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800">รูปภาพ</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              {unifiedProfile.profileImages.slice(1).filter(img => typeof img === 'string' && !img.startsWith('data:image/svg+xml')).map((image: string, index: number) => {
                                // สร้าง image URL ที่ถูกต้อง
                                let imageUrl = image
                                if (!image.startsWith('http') && !image.startsWith('data:')) {
                                  // const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                                  imageUrl = getProfileImageUrl(image, unifiedProfile.id)
                                }
                                
                                return (
                                <div key={`${unifiedProfile.id}-${index}`} className="aspect-square rounded-lg overflow-hidden shadow-lg">
                                  <img 
                                    src={imageUrl}
                                    alt={`${unifiedProfile.nickname || unifiedProfile.firstName} ${index + 2}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error('❌ Profile modal gallery image failed to load:', {
                                        imageUrl: imageUrl,
                                        originalImage: image,
                                        profileId: unifiedProfile.id
                                      });
                                      
                                      // ลองใช้รูปภาพอื่นในโปรไฟล์
                                      const target = e.target as HTMLImageElement;
                                      const profileImages = unifiedProfile?.profileImages || [];
                                      const currentIndex = profileImages.findIndex(img => 
                                        img === imageUrl || img === image
                                      );
                                      
                                      if (currentIndex !== -1 && currentIndex < profileImages.length - 1) {
                                        // ลองรูปภาพถัดไป
                                        const nextImage = profileImages[currentIndex + 1];
                                        if (nextImage && nextImage !== imageUrl) {
                                          console.log('🔄 Trying next gallery image:', nextImage);
                                          target.src = nextImage;
                                          return;
                                        }
                                      }
                                      
                                      // หากไม่มีรูปภาพอื่น ให้ซ่อนรูปภาพและแสดง placeholder
                                      target.style.display = 'none';
                                      
                                      // แสดง placeholder หรือ gradient background
                                      const placeholder = document.createElement('div');
                                      placeholder.className = 'w-full h-full bg-gradient-to-br from-pink-400 to-violet-400 flex items-center justify-center text-white';
                                      placeholder.innerHTML = `
                                        <div class="text-center">
                                          <div class="text-2xl font-bold mb-1">
                                            ${(unifiedProfile?.firstName?.charAt(0) || unifiedProfile?.username?.charAt(0) || 'U')}
                                          </div>
                                          <div class="text-xs opacity-75">รูปภาพไม่พร้อมใช้งาน</div>
                                        </div>
                                      `;
                                      target.parentNode?.appendChild(placeholder);
                                    }}
                                    onLoad={() => {
                                      console.log('✅ Profile modal gallery image loaded successfully:', {
                                        imageUrl: imageUrl,
                                        originalImage: image,
                                        profileId: unifiedProfile.id
                                      });
                                    }}
                                  />
                                </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Basic Information - Always show */}
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">ข้อมูลพื้นฐาน</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <Calendar className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-gray-700">อายุ</span>
                                <p className="text-sm text-gray-600 mt-1">{unifiedProfile.age ? `${unifiedProfile.age} ปี` : 'ไม่ระบุ'}</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-gray-700">ที่อยู่</span>
                                <p className="text-sm text-gray-600 mt-1">{unifiedProfile.location || 'ไม่ระบุ'}</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <div className={`h-5 w-5 rounded-full mt-0.5 flex-shrink-0 ${unifiedProfile.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-gray-700">สถานะ</span>
                                <p className="text-sm text-gray-600 mt-1">{unifiedProfile.online ? 'ออนไลน์' : 'ออฟไลน์'}</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <User className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-gray-700">สมาชิก</span>
                                <p className="text-sm text-gray-600 mt-1">{unifiedProfile.membership?.tier || 'Member'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional Profile Information */}
                        <div className="space-y-6">
                          {/* Personal Information */}
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">ข้อมูลส่วนตัว</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <User className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">เพศ</span>
                                  <p className="text-sm text-gray-600 mt-1">{translateGender(unifiedProfile.gender)}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <GraduationCap className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">การศึกษา</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.education) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Briefcase className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">อาชีพ</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.occupation) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Church className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">ศาสนา</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.religion) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Languages className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">ภาษา</span>
                                  <p className="text-sm text-gray-600 mt-1">{unifiedProfile.languages ? (Array.isArray(unifiedProfile.languages) ? unifiedProfile.languages.join(', ') : safeDisplay(unifiedProfile.languages)) : 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Lifestyle Information */}
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">ไลฟ์สไตล์</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Cigarette className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">สูบบุหรี่</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.smoking) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Wine className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">ดื่มแอลกอฮอล์</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.drinking) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Dumbbell className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">ออกกำลังกาย</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.exercise) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Utensils className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">อาหาร</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.diet) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Additional Information */}
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">ข้อมูลเพิ่มเติม</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Heart className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">ความสัมพันธ์ที่ต้องการ</span>
                                  <p className="text-sm text-gray-600 mt-1">{translateRelationship(safeDisplay(unifiedProfile.lookingFor))}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <PawPrint className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">สัตว์เลี้ยง</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.pets) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Building className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">ที่อยู่อาศัย</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.livingSituation) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Baby className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">ต้องการมีลูก</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.wantChildren) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                      )})()}
                    
                    {/* No Data State */}
                    {!(profileData || selectedProfile) && (
                      <div className="text-center py-12">
                        <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600">ไม่สามารถโหลดข้อมูลโปรไฟล์ได้</p>
                      </div>
                    )}
                    
                    
                  </div>
                </div>
              )}
          </DialogContent>
        </Dialog>
      )}
      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
      
      {/* REMOVED: CreatePrivateRoomModal - Chat functionality removed */}
      {/* REMOVED: New Private Chat Modal (10 lines - Chat functionality removed) */}

      {/* Payment Confirmation Modal */}
      {showPaymentConfirmation && paymentDetails && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4" 
          style={{ zIndex: 100 }}
          onClick={(e) => {
            // กดพื้นหลังเพื่อปิด modal
            if (e.target === e.currentTarget) {
              cancelBlurPayment();
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4">
              <div className="flex items-center justify-center text-white">
                <div className="text-2xl mr-3">💰</div>
                <h3 className="text-xl font-bold">ยืนยันการจ่ายเหรียญ</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-lg font-semibold text-gray-800 mb-2">
                  ต้องการดูรูปเบลอของ
                </div>
                <div className="text-xl font-bold text-pink-600 mb-4">
                  {paymentDetails?.targetUserName}
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">จำนวนที่จ่าย:</span>
                    <span className="font-bold text-red-600 text-lg">10,000 เหรียญ</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">เหรียญปัจจุบัน:</span>
                    <span className="font-semibold text-green-600">
                      {paymentDetails?.currentCoins?.toLocaleString() || '0'} เหรียญ
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">เหรียญหลังจ่าย:</span>
                      <span className="font-bold text-blue-600 text-lg">
                        {((paymentDetails?.currentCoins || 0) - 10000).toLocaleString()} เหรียญ
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center justify-center mb-1">
                    <span className="text-blue-600 mr-1">ℹ️</span>
                    <span className="font-medium">จ่ายเฉพาะรูปนี้</span>
                  </div>
                  <div className="text-xs">
                    หลังจากจ่ายแล้วจะสามารถดูรูปนี้ได้ตลอด รูปอื่นๆ ต้องจ่ายแยกต่างหาก
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔴 Cancel button clicked');
                    cancelBlurPayment();
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔴 Cancel button mousedown');
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔴 Cancel button touchstart');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors duration-200 cursor-pointer relative"
                  style={{ pointerEvents: 'auto', zIndex: 1000 }}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🟢 Confirm button clicked');
                    // Throttle the click handler
                    if (Date.now() - (window.lastBlurClickTime || 0) < 500) {
                      console.log('🚫 Blur payment click throttled');
                      return;
                    }
                    window.lastBlurClickTime = Date.now();
                    confirmBlurPayment();
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🟢 Confirm button mousedown');
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🟢 Confirm button touchstart');
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg cursor-pointer relative"
                  style={{ pointerEvents: 'auto', zIndex: 1000 }}
                >
                  ยืนยันจ่าย
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ranking Modal */}
      <Dialog open={showRankingModal} onOpenChange={setShowRankingModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRankingModal(false)}
                className="flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                ปิด
              </Button>
            </div>
            
            <Suspense fallback={<LoadingSpinner />}>
              <VoteRanking onUserProfileClick={handleVoteUserProfileClick} />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast Container */}
      
    </div>
  )
}

// Wrapper component ที่มี DataCacheProvider
const AppWithProviders = () => {
  return (
    <ToastProvider>
      <DataCacheProvider>
        <App />
      </DataCacheProvider>
    </ToastProvider>
  );
};

export default AppWithProviders