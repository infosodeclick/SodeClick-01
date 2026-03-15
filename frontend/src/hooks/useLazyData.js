import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook สำหรับ lazy loading และ caching ข้อมูล
 * @param {Function} fetchFunction - ฟังก์ชันสำหรับดึงข้อมูล
 * @param {Array} dependencies - dependencies array สำหรับ useEffect
 * @param {Object} options - ตัวเลือกเพิ่มเติม
 * @returns {Object} { data, loading, error, refetch, invalidateCache }
 */
export const useLazyData = (fetchFunction, dependencies = [], options = {}) => {
  const {
    enabled = true,
    cacheKey = null,
    staleTime = 5 * 60 * 1000, // 5 นาที
    cacheTime = 30 * 60 * 1000, // 30 นาที
    retryCount = 1, // ลดเหลือ 1 ครั้ง เพื่อป้องกันการ retry ซ้ำ
    retryDelay = 1000, // เพิ่มเป็น 1000ms เพื่อให้มีเวลาเพียงพอ
    backgroundRefresh = true, // เปิดใช้ background refresh
    onSuccess = null,
    onError = null
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true); // เริ่มต้นเป็น true เพื่อแสดง loading
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false); // เพิ่ม state สำหรับติดตาม retry
  const [lastFetchTime, setLastFetchTime] = useState(null);
  
  const retryCountRef = useRef(0);
  const cacheRef = useRef(new Map());

  // ตรวจสอบว่า cache ยังใช้ได้หรือไม่
  const isCacheValid = useCallback((key) => {
    if (!key || !cacheRef.current.has(key)) return false;
    
    const cached = cacheRef.current.get(key);
    const now = Date.now();
    
    return (now - cached.timestamp) < staleTime;
  }, [staleTime]);

  // ดึงข้อมูลจาก cache
  const getCachedData = useCallback((key) => {
    if (!key || !cacheRef.current.has(key)) return null;
    
    const cached = cacheRef.current.get(key);
    const now = Date.now();
    
    // ถ้า cache หมดอายุแล้ว ให้ลบออก
    if ((now - cached.timestamp) > cacheTime) {
      cacheRef.current.delete(key);
      return null;
    }
    
    return cached.data;
  }, [cacheTime]);

  // บันทึกข้อมูลลง cache
  const setCachedData = useCallback((key, data) => {
    if (!key) return;
    
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now()
    });
  }, []);

  // ฟังก์ชันดึงข้อมูลหลัก
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled || !fetchFunction) return;

    const key = cacheKey || JSON.stringify(dependencies);
    
    // ถ้าไม่บังคับให้รีเฟรช และ cache ยังใช้ได้ ให้ใช้ข้อมูลจาก cache
    if (!forceRefresh && isCacheValid(key)) {
      const cachedData = getCachedData(key);
      if (cachedData) {
        setData(cachedData);
        setError(null);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction();
      
      // ตรวจสอบว่า result มีข้อมูลหรือไม่
      if (result && (result.data || result.success !== false)) {
        // ตรวจสอบเพิ่มเติมว่าข้อมูลมีเนื้อหาหรือไม่
        if (result.data && typeof result.data === 'object' && Object.keys(result.data).length === 0) {
          console.warn('⚠️ Empty data object received:', result);
          setData(null);
          setError(new Error('ข้อมูลที่ได้รับเป็นค่าว่าง'));
          return;
        }
        
        setData(result);
        setError(null);
        setIsRetrying(false);
        setLastFetchTime(Date.now());
        setCachedData(key, result);
        retryCountRef.current = 0;
        
        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        // ถ้าไม่มีข้อมูล ให้ตั้งค่าเป็น null และ retry
        setData(null);
        
        // Retry logic สำหรับกรณีที่ไม่มีข้อมูล
        if (retryCountRef.current < retryCount) {
          retryCountRef.current++;
          setIsRetrying(true);
          const delay = Math.min(retryDelay * Math.pow(1.2, retryCountRef.current - 1), 1500);
          console.log(`🔄 Retrying profile fetch (${retryCountRef.current}/${retryCount}) in ${delay}ms`);
          setTimeout(() => {
            fetchData(forceRefresh);
          }, delay);
          return;
        } else {
          // ถ้า retry หมดแล้ว ให้แสดง error
          console.log('❌ Profile fetch failed after all retries');
          setIsRetrying(false);
          setError(new Error('ไม่พบข้อมูล'));
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      
      // Retry logic - ปรับปรุงให้เร็วขึ้น
      if (retryCountRef.current < retryCount) {
        retryCountRef.current++;
        setIsRetrying(true);
        // ใช้ exponential backoff แต่เริ่มต้นเร็วกว่าเดิม
        const delay = Math.min(retryDelay * Math.pow(1.2, retryCountRef.current - 1), 1500);
        console.log(`🔄 Retrying profile fetch after error (${retryCountRef.current}/${retryCount}) in ${delay}ms`);
        setTimeout(() => {
          fetchData(forceRefresh);
        }, delay);
        return;
      }
      
      // ตั้งค่า error เฉพาะเมื่อ retry หมดแล้ว
      setIsRetrying(false);
      setError(err);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, fetchFunction, dependencies, cacheKey, isCacheValid, getCachedData, setCachedData, retryCount, retryDelay, onSuccess, onError]);

  // ฟังก์ชันรีเฟรชข้อมูล
  const refetch = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // ฟังก์ชันลบ cache
  const invalidateCache = useCallback((key = null) => {
    if (key) {
      cacheRef.current.delete(key);
    } else {
      cacheRef.current.clear();
    }
  }, []);

  // ฟังก์ชันอัปเดตข้อมูลโดยไม่ต้องดึงใหม่
  const updateData = useCallback((newData) => {
    setData(newData);
    const key = cacheKey || JSON.stringify(dependencies);
    setCachedData(key, newData);
  }, [cacheKey, dependencies, setCachedData]);

  // Effect สำหรับดึงข้อมูลเมื่อ dependencies เปลี่ยน
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Background refresh effect
  useEffect(() => {
    if (!backgroundRefresh || !data || !lastFetchTime) return;

    const refreshInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime;
      
      // ถ้าข้อมูลเก่ากว่า 80% ของ staleTime ให้ทำ background refresh
      if (timeSinceLastFetch > (staleTime * 0.8)) {
        console.log(`🔄 Background refresh for ${cacheKey || 'data'}`);
        fetchData(true); // force refresh แต่ไม่แสดง loading
      }
    }, Math.min(staleTime / 2, 2 * 60 * 1000)); // ตรวจสอบทุก 2 นาที หรือครึ่งหนึ่งของ staleTime

    return () => clearInterval(refreshInterval);
  }, [backgroundRefresh, data, lastFetchTime, staleTime, cacheKey, fetchData]);

  return {
    data,
    loading,
    error,
    isRetrying,
    refetch,
    invalidateCache,
    updateData,
    lastFetchTime,
    isStale: lastFetchTime ? (Date.now() - lastFetchTime) > staleTime : true
  };
};

/**
 * Hook สำหรับ infinite scroll
 * @param {Function} fetchFunction - ฟังก์ชันสำหรับดึงข้อมูล
 * @param {Object} options - ตัวเลือกเพิ่มเติม
 * @returns {Object} { data, loading, error, loadMore, hasMore, reset }
 */
export const useInfiniteScroll = (fetchFunction, options = {}) => {
  const {
    pageSize = 20,
    enabled = true,
    cacheKey = null
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const cacheRef = useRef(new Map());

  const loadMore = useCallback(async () => {
    if (!enabled || !hasMore || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction(page, pageSize);
      
      if (page === 1) {
        setData(result.data || result);
      } else {
        setData(prev => [...prev, ...(result.data || result)]);
      }
      
      setHasMore(result.hasMore !== false && (result.data || result).length === pageSize);
      setPage(prev => prev + 1);
    } catch (err) {
      console.error('Error loading more data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [enabled, hasMore, loading, page, pageSize, fetchFunction]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    cacheRef.current.clear();
  }, []);

  useEffect(() => {
    if (enabled) {
      loadMore();
    }
  }, [enabled]);

  return {
    data,
    loading,
    error,
    loadMore,
    hasMore,
    reset
  };
};

/**
 * Hook สำหรับ optimistic updates
 * @param {Function} updateFunction - ฟังก์ชันสำหรับอัปเดตข้อมูล
 * @param {Function} rollbackFunction - ฟังก์ชันสำหรับ rollback
 * @returns {Object} { update, loading, error }
 */
export const useOptimisticUpdate = (updateFunction, rollbackFunction) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = useCallback(async (optimisticData, actualData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await updateFunction(actualData);
      return result;
    } catch (err) {
      console.error('Error updating data:', err);
      setError(err);
      
      if (rollbackFunction) {
        rollbackFunction(optimisticData);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [updateFunction, rollbackFunction]);

  return {
    update,
    loading,
    error
  };
};
