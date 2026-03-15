import React from 'react'
import { MessageCircle, Heart, Star, Coins, Trophy, AlertTriangle, CheckCircle, XCircle, Clock, Flag } from 'lucide-react'
import { formatTimeAgo } from '../utils'
import { getProfileImageUrl } from '../utils/profileImageUtils'
import type { Notification } from '../types'

interface NotificationItemProps {
  notification: Notification
  onClick: (notification: Notification) => void
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onClick 
}) => {
  const { _id, type, title, message, data, isRead, createdAt } = notification

  // Debug logging for report notifications
  if (type === 'report_created' || type === 'report_response' || type === 'report_status_update' || type === 'report_assigned' || type === 'report_priority_update') {
    console.log('📋 [NotificationItem] Report notification received:', {
      _id,
      type,
      title,
      message,
      hasData: !!data,
      data: data,
      dataType: typeof data,
      dataKeys: data ? Object.keys(data) : [],
      isRead,
      createdAt,
      fullNotification: JSON.stringify(notification, null, 2)
    })
    
    // ถ้าไม่มี data หรือ data เป็น undefined/null ให้แสดง warning
    if (!data) {
      console.error('❌ [NotificationItem] WARNING: No data object in report notification!');
      console.error('❌ [NotificationItem] Full notification:', notification);
    } else if (typeof data !== 'object') {
      console.error('❌ [NotificationItem] WARNING: data is not an object!', typeof data, data);
    }
  }

  const handleClick = () => {
    onClick(notification)
  }

  if (type === 'private_message') {
    return (
      <div 
        key={_id} 
        onClick={handleClick}
        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-blue-50' : ''}`}
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
        key={_id} 
        onClick={handleClick}
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
        key={_id} 
        onClick={handleClick}
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
        key={_id} 
        onClick={handleClick}
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
        key={_id} 
        onClick={handleClick}
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
        key={_id} 
        onClick={handleClick}
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

    const getReportDotColor = () => {
      if (type === 'report_response') return 'bg-blue-500'
      if (type === 'report_status_update') {
        if (data?.status === 'resolved' || data?.status === 'closed') return 'bg-green-500'
        if (data?.status === 'rejected') return 'bg-red-500'
        return 'bg-yellow-500'
      }
      if (type === 'report_assigned') return 'bg-purple-500'
      if (type === 'report_priority_update') return 'bg-orange-500'
      return 'bg-red-500'
    }

    // แสดงรายละเอียดจาก data หรือ fallback
    const reportTitle = data?.reportTitle || data?.title || null
    const category = data?.category || null
    const priority = data?.priority || null
    const reportedBy = data?.reportedBy || null
    const adminResponse = data?.adminResponse || null
    const reportId = data?.reportId || null

    // Debug: แสดงข้อมูลทั้งหมดที่ได้รับ
    console.log('📋 [NotificationItem] Rendering report notification with data:', {
      reportTitle,
      category,
      priority,
      reportedBy,
      adminResponse,
      reportId,
      fullData: data
    });

    return (
      <div 
        key={_id} 
        onClick={handleClick}
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
            
            {/* แสดงรายละเอียด report - แสดงทุกอย่างที่มี */}
            {reportTitle && (
              <p className="text-xs text-gray-600 mt-1 font-medium truncate">
                หัวข้อ: {reportTitle}
              </p>
            )}
            
            {category && (
              <p className="text-xs text-gray-500 mt-1">
                ประเภท: {data?.categoryName || 
                  (category === 'membership_upgrade' ? 'อัพเกรดแล้ว tier ไม่ขึ้น' :
                   category === 'user_harassment' ? 'บล็อก user ที่มากวน' :
                   category === 'payment_issue' ? 'ปัญหาการชำระเงิน' :
                   category === 'technical_issue' ? 'ปัญหาทางเทคนิค' :
                   category === 'bug_report' ? 'รายงาน bug' :
                   category === 'feature_request' ? 'ขอฟีเจอร์ใหม่' :
                   category === 'account_issue' ? 'ปัญหาบัญชี' :
                   category === 'other' ? 'อื่นๆ' : category)}
              </p>
            )}
            
            {priority && (
              <p className="text-xs text-gray-500 mt-1">
                ความสำคัญ: {
                  priority === 'low' ? 'ต่ำ' :
                  priority === 'medium' ? 'ปานกลาง' :
                  priority === 'high' ? 'สูง' :
                  priority === 'urgent' ? 'ด่วน' : priority
                }
              </p>
            )}
            
            {reportedBy && (
              <p className="text-xs text-gray-500 mt-1">
                จาก: {reportedBy.displayName || reportedBy.username || 'ผู้ใช้'}
              </p>
            )}
            
            {adminResponse && (
              <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                {adminResponse}
              </p>
            )}
            
            {/* Debug: แสดงข้อมูล data ทั้งหมดถ้าไม่มีรายละเอียด */}
            {data && !reportTitle && !category && !priority && !reportedBy && (
              <div className="text-xs text-gray-400 mt-1 space-y-1">
                <p className="italic font-medium text-red-500">⚠️ ไม่พบรายละเอียด - ข้อมูลที่มี:</p>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32 border border-red-200">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )}
            
            {/* แสดงข้อมูลทั้งหมดที่ได้รับ (สำหรับ debug) */}
            {!data && (
              <div className="text-xs text-red-500 mt-1 space-y-1">
                <p className="font-medium">⚠️ ไม่มีข้อมูล data ใน notification</p>
                <p className="text-gray-400">Notification object: {JSON.stringify({ type, title, message, _id }).substring(0, 150)}</p>
              </div>
            )}
            
            {/* แสดง link หรือ hint ให้คลิกเพื่อดูรายละเอียด */}
            {reportId && (
              <p className="text-xs text-blue-600 mt-2 font-medium cursor-pointer hover:underline">
                คลิกเพื่อดูรายละเอียด →
              </p>
            )}
            
            <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
          </div>
          {!isRead && <div className={`w-2 h-2 ${getReportDotColor()} rounded-full`}></div>}
        </div>
      </div>
    )
  }
  
  // Default fallback for unknown notification types
  return (
    <div 
      key={_id} 
      onClick={handleClick}
      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-gray-50' : ''}`}
    >
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-gray-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{title || 'การแจ้งเตือน'}</p>
          <p className="text-xs text-gray-500">{message || 'มีการแจ้งเตือนใหม่'}</p>
          {data && Object.keys(data).length > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              {JSON.stringify(data, null, 2).substring(0, 100)}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
        </div>
        {!isRead && <div className="w-2 h-2 bg-gray-500 rounded-full"></div>}
      </div>
    </div>
  )
}
