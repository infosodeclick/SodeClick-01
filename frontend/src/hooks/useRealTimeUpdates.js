import { useEffect, useCallback, useRef } from 'react';
import { useGlobalCache } from './useGlobalCache';

/**
 * Hook สำหรับจัดการ real-time updates
 * @param {string} eventName - ชื่อ event ที่ต้องการ listen
 * @param {Function} handler - ฟังก์ชันจัดการ event
 * @param {Array} dependencies - dependencies array
 */
export const useRealTimeUpdate = (eventName, handler, dependencies = []) => {
  const handlerRef = useRef(handler);
  
  // อัปเดต handler ref เมื่อ dependencies เปลี่ยน
  useEffect(() => {
    handlerRef.current = handler;
  }, dependencies);

  useEffect(() => {
    const eventHandler = (event) => {
      handlerRef.current(event.detail);
    };

    window.addEventListener(eventName, eventHandler);
    
    return () => {
      window.removeEventListener(eventName, eventHandler);
    };
  }, [eventName]);
};

/**
 * Hook สำหรับจัดการ notifications แบบ real-time
 */
export const useNotificationUpdates = () => {
  const { setCache, getCache } = useGlobalCache();

  const updateNotification = useCallback((notification) => {
    const cacheKey = 'notifications';
    const existingNotifications = getCache(cacheKey) || [];
    
    // เพิ่ม notification ใหม่ที่ต้นรายการ
    const updatedNotifications = [notification, ...existingNotifications];
    
    // จำกัดจำนวน notifications ที่แสดง (เช่น 50 รายการล่าสุด)
    const limitedNotifications = updatedNotifications.slice(0, 50);
    
    setCache(cacheKey, limitedNotifications, { ttl: 10 * 60 * 1000 }); // 10 นาที
  }, [setCache, getCache]);

  const markAsRead = useCallback((notificationId) => {
    const cacheKey = 'notifications';
    const notifications = getCache(cacheKey) || [];
    
    const updatedNotifications = notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, isRead: true }
        : notification
    );
    
    setCache(cacheKey, updatedNotifications, { ttl: 10 * 60 * 1000 });
  }, [setCache, getCache]);

  const clearAllNotifications = useCallback(() => {
    const cacheKey = 'notifications';
    setCache(cacheKey, [], { ttl: 10 * 60 * 1000 });
  }, [setCache]);

  return {
    updateNotification,
    markAsRead,
    clearAllNotifications
  };
};

/**
 * Hook สำหรับจัดการ chat messages แบบ real-time
 */
export const useChatUpdates = () => {
  const { setCache, getCache } = useGlobalCache();

  const addMessage = useCallback((roomId, message) => {
    const cacheKey = `chat_${roomId}`;
    const existingMessages = getCache(cacheKey) || [];
    
    // เพิ่ม message ใหม่
    const updatedMessages = [...existingMessages, message];
    
    setCache(cacheKey, updatedMessages, { ttl: 30 * 60 * 1000 }); // 30 นาที
  }, [setCache, getCache]);

  const updateMessage = useCallback((roomId, messageId, updates) => {
    const cacheKey = `chat_${roomId}`;
    const messages = getCache(cacheKey) || [];
    
    const updatedMessages = messages.map(message => 
      message.id === messageId 
        ? { ...message, ...updates }
        : message
    );
    
    setCache(cacheKey, updatedMessages, { ttl: 30 * 60 * 1000 });
  }, [setCache, getCache]);

  const deleteMessage = useCallback((roomId, messageId) => {
    const cacheKey = `chat_${roomId}`;
    const messages = getCache(cacheKey) || [];
    
    const updatedMessages = messages.filter(message => message.id !== messageId);
    
    setCache(cacheKey, updatedMessages, { ttl: 30 * 60 * 1000 });
  }, [setCache, getCache]);

  return {
    addMessage,
    updateMessage,
    deleteMessage
  };
};

/**
 * Hook สำหรับจัดการ user status แบบ real-time
 */
export const useUserStatusUpdates = () => {
  const { setCache, getCache } = useGlobalCache();

  const updateUserStatus = useCallback((userId, status) => {
    const cacheKey = `user_status_${userId}`;
    setCache(cacheKey, status, { ttl: 5 * 60 * 1000 }); // 5 นาที
  }, [setCache]);

  const getUserStatus = useCallback((userId) => {
    const cacheKey = `user_status_${userId}`;
    return getCache(cacheKey);
  }, [getCache]);

  return {
    updateUserStatus,
    getUserStatus
  };
};

/**
 * Hook สำหรับจัดการ profile updates แบบ real-time
 */
export const useProfileUpdates = () => {
  const { setCache, getCache } = useGlobalCache();

  const updateProfile = useCallback((userId, profileData) => {
    const cacheKey = `profile_${userId}`;
    setCache(cacheKey, profileData, { ttl: 10 * 60 * 1000 }); // 10 นาที
  }, [setCache]);

  const invalidateProfileCache = useCallback((userId) => {
    const cacheKey = `profile_${userId}`;
    // ลบ cache เพื่อบังคับให้ดึงข้อมูลใหม่
    setCache(cacheKey, null, { ttl: 0 });
  }, [setCache]);

  return {
    updateProfile,
    invalidateProfileCache
  };
};
