/**
 * Enhanced API service with caching, retry logic, and request deduplication
 */
class EnhancedAPIService {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.retryCount = 2; // ลดจาก 3 เป็น 2
    this.retryDelay = 500; // ลดจาก 1000ms เป็น 500ms
    this.baseURL = '/api'; // เพิ่ม base URL
    this.requestCounter = new Map(); // เพิ่มตัวนับ request
    this.lastRequestTime = new Map(); // เก็บเวลา request ล่าสุด
    this.backgroundRefreshQueue = new Set(); // เพิ่ม queue สำหรับ background refresh
  }

  /**
   * สร้าง cache key จาก URL และ options
   */
  createCacheKey(url, options = {}) {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * ตรวจสอบว่า cache ยังใช้ได้หรือไม่
   */
  isCacheValid(cacheKey, maxAge = 5 * 60 * 1000) { // 5 นาที default
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    
    const now = Date.now();
    const isValid = (now - cached.timestamp) < maxAge;
    
    // ถ้า cache ใกล้หมดอายุ (80% ของเวลา) ให้เตรียม background refresh
    const isNearExpiry = (now - cached.timestamp) > (maxAge * 0.8);
    if (isValid && isNearExpiry && !this.backgroundRefreshQueue.has(cacheKey)) {
      this.backgroundRefreshQueue.add(cacheKey);
      // จะทำ background refresh ในภายหลัง
    }
    
    return isValid;
  }

  /**
   * ดึงข้อมูลจาก cache
   */
  getFromCache(cacheKey) {
    const cached = this.cache.get(cacheKey);
    return cached ? cached.data : null;
  }

  /**
   * บันทึกข้อมูลลง cache
   */
  setCache(cacheKey, data, maxAge = 5 * 60 * 1000) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      maxAge
    });
  }

  /**
   * ลบ cache ที่หมดอายุ
   */
  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if ((now - value.timestamp) > value.maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Retry logic สำหรับ failed requests
   */
  async retryRequest(url, options, attempt = 1) {
    try {
      const response = await fetch(url, options);
      
      // ไม่ retry สำหรับ 401 (Unauthorized) และ 403 (Forbidden)
      if (response.status === 401 || response.status === 403) {
        return response; // ส่งคืน response ให้ caller จัดการเอง
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      if (attempt < this.retryCount && !error.message.includes('401') && !error.message.includes('403')) {
        console.log(`Retry attempt ${attempt} for ${url}`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        return this.retryRequest(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * ตรวจสอบการเรียก API บ่อยเกินไป (Rate Limiting) - ปรับปรุงให้เร็วขึ้น
   */
  checkRateLimit(url, minInterval = 500) { // ลดจาก 1000ms เป็น 500ms
    const now = Date.now();
    const lastTime = this.lastRequestTime.get(url) || 0;
    
    // แยก rate limit ตาม endpoint - ลดเวลาทุก endpoint
    let customInterval = minInterval;
    if (url.includes('/profile/')) {
      customInterval = 300; // ลดจาก 800ms เป็น 300ms สำหรับ profile
    } else if (url.includes('/messages')) {
      customInterval = 500; // ลดจาก 800ms เป็น 500ms สำหรับ messages
    } else if (url.includes('/conversations') || url.includes('/unread')) {
      customInterval = 600; // ลดจาก 1000ms เป็น 600ms สำหรับ conversations/unread
    }
    
    if (now - lastTime < customInterval) {
      // ไม่แสดง warning ใน console เพื่อลด noise
      // console.debug(`⚠️ Rate limit: Request to ${url} too soon. Min interval: ${customInterval}ms`);
      return false;
    }
    
    this.lastRequestTime.set(url, now);
    return true;
  }

  /**
   * Enhanced fetch with caching, deduplication, and retry logic
   */
  async enhancedFetch(url, options = {}) {
    const method = options.method || 'GET';
    const cacheKey = this.createCacheKey(url, options);
    
    // ตรวจสอบ rate limit สำหรับ GET requests - ลดเวลาเริ่มต้น
    if (method === 'GET' && !this.checkRateLimit(url, 300)) {
      // ถ้าเรียกบ่อยเกินไป ให้ใช้ cache หรือ pending request
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`Rate limited - returning cache for ${url}`);
        return cachedData;
      }
      
      // ถ้าไม่มี cache ให้รอ pending request
      if (this.pendingRequests.has(cacheKey)) {
        console.log(`Rate limited - waiting for pending request: ${url}`);
        return this.pendingRequests.get(cacheKey);
      }
    }
    
    // ถ้าเป็น GET request และ cache ยังใช้ได้ ให้ใช้ข้อมูลจาก cache
    if (method === 'GET' && this.isCacheValid(cacheKey)) {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`Cache hit for ${url}`);
        // ตรวจสอบว่าข้อมูลใน cache มีข้อมูลหรือไม่
        if (cachedData.data && Object.keys(cachedData.data).length > 0) {
          return cachedData;
        } else {
          console.warn(`⚠️ Cache contains empty data for ${url}, fetching fresh data`);
          // ลบ cache ที่มีข้อมูลว่างเปล่า
          this.cache.delete(cacheKey);
        }
      }
    }

    // ถ้ามี request เดียวกันกำลังรันอยู่ ให้รอผลลัพธ์
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`Deduplicating request for ${url}`);
      return this.pendingRequests.get(cacheKey);
    }

    // สร้าง promise สำหรับ request นี้
    const requestPromise = this.makeRequest(url, options, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * เพิ่ม default headers รวมถึง authorization
   */
  getDefaultHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    // เพิ่ม authorization token ถ้ามี
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * สร้าง full URL
   */
  createFullURL(url) {
    // ถ้า URL เริ่มต้นด้วย http หรือ https แสดงว่าเป็น absolute URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // ใช้ API_BASE_URL จาก environment variable
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    
    // ถ้า url เริ่มต้นด้วย / แล้ว ให้เพิ่ม apiBaseUrl
    if (url.startsWith('/')) {
      return `${apiBaseUrl}${url}`;
    }
    
    // ถ้าไม่เริ่มต้นด้วย / ให้เพิ่ม / ก่อน
    return `${apiBaseUrl}/${url}`;
  }

  /**
   * ทำการ request จริง
   */
  async makeRequest(url, options, cacheKey) {
    try {
      const fullURL = this.createFullURL(url);
      const defaultHeaders = this.getDefaultHeaders();
      const finalOptions = {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers
        }
      };

      const response = await this.retryRequest(fullURL, finalOptions);
      
      // Handle 401/403 responses
      if (response.status === 401 || response.status === 403) {
        // ไม่แสดง warning สำหรับ 403 เพราะอาจเป็นเรื่องปกติ
        if (response.status === 401) {
          console.warn(`⚠️ ${response.status} response from ${fullURL}`);
        } else {
          // ไม่แสดง log สำหรับ 403 เพื่อลด noise ใน console
          // console.log(`ℹ️ ${response.status} response from ${fullURL} (this may be normal)`);
        }
        return {
          success: false,
          error: response.status === 401 ? 'Authentication required' : 'Access forbidden',
          status: response.status,
          data: null
        };
      }
      
      // ตรวจสอบ content type ก่อน parse JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error(`Non-JSON response from ${fullURL}:`, text);
        return {
          success: false,
          error: `Expected JSON response but got ${contentType}`,
          status: response.status,
          data: text
        };
      }

      const data = await response.json();

      console.log('📥 EnhancedAPI received response:', {
        url: fullURL,
        status: response.status,
        success: data.success,
        hasData: !!data.data,
        dataKeys: data.data ? Object.keys(data.data) : [],
        hasProfile: !!(data.data && data.data.profile),
        profileKeys: data.data && data.data.profile ? Object.keys(data.data.profile) : []
      });

      // บันทึกผลลัพธ์ลง cache สำหรับ GET requests
      if (options.method === 'GET' || !options.method) {
        // ตรวจสอบว่าข้อมูลมีเนื้อหาหรือไม่ก่อนบันทึกลง cache
        if (data.data && Object.keys(data.data).length > 0) {
          this.setCache(cacheKey, data);
        } else {
          console.warn(`⚠️ Not caching empty data for ${url}`);
        }
      }

      return {
        success: data.success !== false, // ถ้า data.success เป็น false ให้ return false
        data: data,
        status: response.status
      };
    } catch (error) {
      console.error(`Request failed for ${url}:`, error);
      
      // Handle 401 errors gracefully
      if (error.message && error.message.includes('401')) {
        console.warn(`⚠️ Authorization failed for ${url} - may need login`);
        return {
          success: false,
          error: 'Authentication required',
          status: 401,
          data: null
        };
      }
      
      return {
        success: false,
        error: error.message || 'Request failed',
        status: 500,
        data: null
      };
    }
  }

  /**
   * ลบ cache สำหรับ URL ที่เกี่ยวข้อง
   */
  invalidateCache(urlPattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(urlPattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * ล้าง cache ทั้งหมด
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * ตั้งค่า retry options
   */
  setRetryOptions(retryCount, retryDelay) {
    this.retryCount = retryCount;
    this.retryDelay = retryDelay;
  }

  /**
   * GET request wrapper
   */
  async get(url, options = {}) {
    return this.enhancedFetch(url, { ...options, method: 'GET' });
  }

  /**
   * POST request wrapper
   */
  async post(url, data, options = {}) {
    return this.enhancedFetch(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        ...options.headers
      }
    });
  }

  /**
   * PUT request wrapper
   */
  async put(url, data, options = {}) {
    return this.enhancedFetch(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        ...options.headers
      }
    });
  }

  /**
   * DELETE request wrapper
   */
  async delete(url, options = {}) {
    return this.enhancedFetch(url, { ...options, method: 'DELETE' });
  }

  /**
   * Background refresh สำหรับ cache ที่ใกล้หมดอายุ
   */
  async processBackgroundRefresh() {
    if (this.backgroundRefreshQueue.size === 0) return;
    
    const refreshPromises = [];
    const keysToProcess = Array.from(this.backgroundRefreshQueue);
    this.backgroundRefreshQueue.clear();
    
    for (const cacheKey of keysToProcess) {
      // แยก URL จาก cache key
      const [method, url] = cacheKey.split(':', 2);
      if (method === 'GET') {
        refreshPromises.push(
          this.enhancedFetch(url, { method: 'GET' })
            .catch(err => console.warn(`Background refresh failed for ${url}:`, err))
        );
      }
    }
    
    if (refreshPromises.length > 0) {
      console.log(`🔄 Processing ${refreshPromises.length} background refreshes`);
      await Promise.allSettled(refreshPromises);
    }
  }

  /**
   * Preload ข้อมูลที่คาดว่าจะใช้
   */
  async preloadData(urls) {
    const preloadPromises = urls.map(url => 
      this.get(url).catch(err => console.warn(`Preload failed for ${url}:`, err))
    );
    
    console.log(`🚀 Preloading ${urls.length} resources`);
    return Promise.allSettled(preloadPromises);
  }
}

// สร้าง instance เดียวสำหรับใช้ทั่วทั้งแอป
const enhancedAPI = new EnhancedAPIService();

// ทำความสะอาด cache และ background refresh ทุก 3 นาที
setInterval(() => {
  enhancedAPI.cleanExpiredCache();
  enhancedAPI.processBackgroundRefresh();
}, 3 * 60 * 1000); // ลดจาก 5 นาที เป็น 3 นาที

export default enhancedAPI;
