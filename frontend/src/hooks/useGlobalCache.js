import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';

/**
 * Context สำหรับจัดการ global state และ cache
 */
export const DataCacheContext = React.createContext();

export const DataCacheProvider = ({ children }) => {
  const cacheRef = useRef(new Map());
  const subscribersRef = useRef(new Map());

  // บันทึกข้อมูลลง cache
  const setCache = useCallback((key, data, options = {}) => {
    const { ttl = 30 * 60 * 1000 } = options; // 30 นาที default
    
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // แจ้งเตือน subscribers
    const subscribers = subscribersRef.current.get(key);
    if (subscribers) {
      subscribers.forEach(callback => callback(data));
    }
  }, []);

  // ดึงข้อมูลจาก cache
  const getCache = useCallback((key) => {
    const cached = cacheRef.current.get(key);
    if (!cached) return null;

    const now = Date.now();
    if ((now - cached.timestamp) > cached.ttl) {
      cacheRef.current.delete(key);
      return null;
    }

    return cached.data;
  }, []);

  // ลบข้อมูลจาก cache
  const removeCache = useCallback((key) => {
    cacheRef.current.delete(key);
    
    // แจ้งเตือน subscribers
    const subscribers = subscribersRef.current.get(key);
    if (subscribers) {
      subscribers.forEach(callback => callback(null));
    }
  }, []);

  // ล้าง cache ทั้งหมด
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    subscribersRef.current.clear();
  }, []);

  // Subscribe ต่อการเปลี่ยนแปลงข้อมูล
  const subscribe = useCallback((key, callback) => {
    if (!subscribersRef.current.has(key)) {
      subscribersRef.current.set(key, new Set());
    }
    subscribersRef.current.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = subscribersRef.current.get(key);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          subscribersRef.current.delete(key);
        }
      }
    };
  }, []);

  const value = {
    setCache,
    getCache,
    removeCache,
    clearCache,
    subscribe
  };

  return React.createElement(DataCacheContext.Provider, { value }, children);
};

/**
 * Hook สำหรับใช้ global cache
 */
export const useGlobalCache = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useGlobalCache must be used within DataCacheProvider');
  }
  return context;
};

/**
 * Hook สำหรับ subscribe ต่อการเปลี่ยนแปลงข้อมูล
 */
export const useCacheSubscription = (key, initialData = null) => {
  const { getCache, subscribe } = useGlobalCache();
  const [data, setData] = useState(() => getCache(key) || initialData);

  useEffect(() => {
    const unsubscribe = subscribe(key, setData);
    return unsubscribe;
  }, [key, subscribe]);

  return data;
};
