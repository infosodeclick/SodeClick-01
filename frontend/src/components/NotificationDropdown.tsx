import React from 'react'
import { Bell, X } from 'lucide-react'
import { NotificationItem } from './NotificationItem'
import type { Notification } from '../types'

interface NotificationDropdownProps {
  notifications: Notification[]
  unreadCount: number
  isOpen: boolean
  onClose: () => void
  onClearAll: () => void
  onNotificationClick: (notification: Notification) => void
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  isOpen,
  onClose,
  onClearAll,
  onNotificationClick
}) => {
  if (!isOpen) return null

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">การแจ้งเตือน</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ล้างทั้งหมด
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>ไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          notifications.map((notification) => {
            // Debug logging
            if (notification.type === 'report_created' || notification.type?.includes('report')) {
              console.log('📋 [NotificationDropdown] Rendering report notification:', {
                _id: notification._id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                hasData: !!notification.data,
                dataKeys: notification.data ? Object.keys(notification.data) : []
              });
            }
            
            return (
              <NotificationItem
                key={notification._id || `notification-${Date.now()}-${Math.random()}`}
                notification={notification}
                onClick={onNotificationClick}
              />
            );
          })
        )}
      </div>
    </div>
  )
}
