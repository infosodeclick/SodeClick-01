/**
 * Auto Refresh Manager - ระบบรีเฟรชอัตโนมัติที่ไม่ให้ผู้ใช้รู้สึก
 * ออกแบบมาให้ทำงานอย่างมีประสิทธิภาพและไม่กินทรัพยากรเครื่องมากเกินไป
 */

class AutoRefreshManager {
  constructor() {
    this.intervals = new Map(); // เก็บ interval IDs สำหรับแต่ละประเภทการรีเฟรช
    this.workers = new Map(); // เก็บ Web Workers
    this.isVisible = true; // สถานะการมองเห็นหน้าเว็บ
    this.isActive = false; // สถานะการทำงานของระบบ
    this.lastActivity = Date.now(); // เวลาล่าสุดที่มีการใช้งาน
    this.idleThreshold = 30000; // 30 วินาทีสำหรับ idle detection
    this.serviceWorker = null; // เก็บ Service Worker registration
    this.stats = {
      totalRefreshes: 0,
      successfulRefreshes: 0,
      failedRefreshes: 0,
      lastRefreshTime: null
    };

    this.setupVisibilityAPI();
    this.setupActivityDetection();
    this.setupServiceWorker();
  }

  /**
   * ตั้งค่าระบบตรวจสอบการมองเห็นหน้าเว็บ
   * เมื่อผู้ใช้ไม่มองหน้าเว็บ จะลดความถี่ในการรีเฟรชเพื่อประหยัดทรัพยากร
   */
  setupVisibilityAPI() {
    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;

      if (this.isVisible) {
        // เมื่อกลับมาที่หน้าเว็บ ให้รีเฟรชข้อมูลทันที
        console.log('🔄 Tab became visible, refreshing data...');
        this.forceRefresh('immediate');
      } else {
        // เมื่อออกจากหน้าเว็บ ให้ลดความถี่การรีเฟรช
        console.log('😴 Tab became hidden, reducing refresh frequency');
        this.adjustRefreshFrequency('slow');
      }
    });
  }

  /**
   * ตั้งค่าระบบตรวจสอบการใช้งานของผู้ใช้
   * เมื่อผู้ใช้ไม่ได้ใช้งานนาน จะลดความถี่การรีเฟรช
   */
  setupActivityDetection() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    events.forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivity = Date.now();
        if (!this.isActive) {
          this.adjustRefreshFrequency('normal');
        }
      }, true);
    });

    // ตรวจสอบ idle status ทุก 10 วินาที
    setInterval(() => {
      const now = Date.now();
      const isIdle = (now - this.lastActivity) > this.idleThreshold;

      if (isIdle && this.isActive) {
        console.log('😴 User idle detected, reducing refresh frequency');
        this.adjustRefreshFrequency('slow');
      } else if (!isIdle && this.isActive) {
        this.adjustRefreshFrequency('normal');
      }
    }, 10000);
  }

  /**
   * ตั้งค่า Service Worker สำหรับการทำงานใน background
   */
  async setupServiceWorker() {
    // ปิด Service Worker ชั่วคราวเพื่อหลีกเลี่ยง MIME type issues และ fetch errors
    console.log('ℹ️ Service Worker temporarily disabled to avoid MIME type issues and fetch errors');
    this.serviceWorker = null;
    return;
    
    // Service Worker code is commented out to prevent fetch errors
    // This will be re-enabled when Service Worker files are properly configured
  }

  /**
   * จัดการข้อความจาก Service Worker
   */
  handleServiceWorkerMessage(data) {
    if (data.type === 'CHAT_MESSAGES_UPDATED') {
      this.stats.totalRefreshes++;
      this.stats.lastRefreshTime = Date.now();

      window.dispatchEvent(new CustomEvent('chatMessagesUpdated', {
        detail: data.data
      }));
    } else if (data.type === 'ONLINE_USERS_UPDATED') {
      window.dispatchEvent(new CustomEvent('onlineUsersUpdated', {
        detail: data.data
      }));
    } else if (data.type === 'NOTIFICATIONS_UPDATED') {
      window.dispatchEvent(new CustomEvent('notificationsUpdated', {
        detail: data.data
      }));
    }
  }

  /**
   * ปรับความถี่ในการรีเฟรชตามสถานะการใช้งาน
   */
  adjustRefreshFrequency(mode) {
    const frequencies = {
      immediate: 100,      // ทันที (เมื่อกลับมาที่หน้าเว็บ)
      fast: 1000,         // เร็ว (1 วินาที)
      normal: 5000,       // ปกติ (5 วินาที)
      slow: 15000,        // ช้า (15 วินาที)
      background: 30000   // พื้นหลัง (30 วินาที)
    };

    Object.keys(frequencies).forEach(key => {
      if (this.intervals.has(key)) {
        clearInterval(this.intervals.get(key));
        this.intervals.delete(key);
      }
    });

    if (mode !== 'stop') {
      const interval = setInterval(() => {
        this.performRefresh(mode);
      }, frequencies[mode]);

      this.intervals.set(mode, interval);
    }
  }

  /**
   * เริ่มระบบ auto refresh สำหรับแชท
   */
  async startChatRefresh(roomId, userId) {
    console.log('🚀 Starting auto refresh for chat:', roomId);

    this.isActive = true;
    this.adjustRefreshFrequency('normal');

    // รีเฟรชข้อมูลแชท
    this.startRefresh('chat-messages', () => this.refreshChatMessages(roomId, userId), 'normal');

    // รีเฟรชข้อมูลผู้ใช้ออนไลน์
    this.startRefresh('online-users', () => this.refreshOnlineUsers(roomId, userId), 'slow');

    // รีเฟรชการแจ้งเตือน
    this.startRefresh('notifications', () => this.refreshNotifications(userId), 'slow');

    // รีเฟรชข้อมูลห้องแชท
    this.startRefresh('room-info', () => this.refreshRoomInfo(roomId), 'background');

    // เริ่ม Service Worker สำหรับ background refresh ถ้ามีการลงทะเบียนสำเร็จ
    if (this.serviceWorker && this.serviceWorker.active) {
      this.serviceWorker.active.postMessage({
        type: 'START_AUTO_REFRESH',
        userId,
        roomId
      });
      console.log('🚀 Started Service Worker background refresh');
    } else {
      console.log('🔧 Service Worker not available, using main thread refresh only');
    }
  }

  /**
   * หยุดระบบ auto refresh
   */
  stopChatRefresh() {
    console.log('⏹️ Stopping auto refresh');

    this.isActive = false;
    this.adjustRefreshFrequency('stop');

    // ล้าง intervals ทั้งหมด
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();

    // หยุด Service Worker ถ้ามีการลงทะเบียนสำเร็จ
    if (this.serviceWorker && this.serviceWorker.active) {
      this.serviceWorker.active.postMessage({
        type: 'STOP_AUTO_REFRESH'
      });
      console.log('⏹️ Stopped Service Worker background refresh');
    }
  }

  /**
   * เริ่มการรีเฟรชสำหรับประเภทข้อมูลที่กำหนด
   */
  startRefresh(type, callback, frequency = 'normal') {
    if (this.intervals.has(type)) {
      clearInterval(this.intervals.get(type));
    }

    const interval = setInterval(() => {
      if (this.shouldRefresh(type)) {
        callback();
      }
    }, this.getFrequencyForType(type, frequency));

    this.intervals.set(type, interval);
    console.log(`🚀 Started refresh for type: ${type} with frequency: ${frequency}`);
  }

  /**
   * หยุดการรีเฟรชสำหรับประเภทข้อมูลที่กำหนด
   */
  stopRefresh(type) {
    if (this.intervals.has(type)) {
      clearInterval(this.intervals.get(type));
      this.intervals.delete(type);
      console.log(`⏹️ Stopped refresh for type: ${type}`);
    }
  }

  /**
   * ตรวจสอบว่าควรทำการรีเฟรชหรือไม่
   */
  shouldRefresh(type) {
    // ไม่รีเฟรชถ้าผู้ใช้ออกห่างจากหน้าเว็บนานเกินไป
    if (!this.isVisible && (Date.now() - this.lastActivity) > 300000) { // 5 นาที
      return false;
    }

    // ไม่รีเฟรชถ้าผู้ใช้ไม่ได้ใช้งานนานเกินไป
    if ((Date.now() - this.lastActivity) > 600000) { // 10 นาที
      return false;
    }

    return true;
  }

  /**
   * กำหนดความถี่สำหรับแต่ละประเภทข้อมูล
   */
  getFrequencyForType(type, baseFrequency) {
    const multipliers = {
      'chat-messages': 1,     // ข้อความแชท - รีเฟรชบ่อยที่สุด
      'online-users': 3,      // ผู้ใช้ออนไลน์ - รีเฟรชปานกลาง
      'notifications': 2,     // การแจ้งเตือน - รีเฟรชปานกลาง
      'room-info': 6         // ข้อมูลห้อง - รีเฟรชน้อยที่สุด
    };

    const baseFrequencies = {
      immediate: 100,
      fast: 1000,
      normal: 5000,
      slow: 15000,
      background: 30000
    };

    return baseFrequencies[baseFrequency] * (multipliers[type] || 1);
  }

  /**
   * ดำเนินการรีเฟรชข้อมูล
   */
  performRefresh(mode) {
    // ไม่ต้องทำอะไรพิเศษ เพียงแค่ให้ interval ทำงานต่อไป
    // แต่ละ interval จะเรียก callback ที่กำหนดไว้แล้ว
  }

  /**
   * รีเฟรชข้อมูลแชท
   */
  async refreshChatMessages(roomId, userId) {
    this.stats.totalRefreshes++;

    try {
      console.log('🔄 Auto refresh: Refreshing chat messages for room:', roomId);

      const token = localStorage.getItem('token');
      
      // เพิ่ม timeout และ error handling ที่ดีขึ้น
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/messages/${roomId}?userId=${userId}&limit=10`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      console.log('🔄 Auto refresh: API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔄 Auto refresh: API response data:', data);

        if (data.success) {
          this.stats.successfulRefreshes++;
          this.stats.lastRefreshTime = Date.now();

          console.log('🔄 Auto refresh: Dispatching chat messages update event');

          // ส่ง event ให้ component อัปเดตข้อมูล
          window.dispatchEvent(new CustomEvent('chatMessagesUpdated', {
            detail: { roomId, messages: data.data.messages, source: 'main-thread' }
          }));

          console.log('✅ Auto refresh: Chat messages updated successfully');
        } else {
          this.stats.failedRefreshes++;
          console.error('❌ Auto refresh: API returned error:', data);
        }
      } else {
        this.stats.failedRefreshes++;
        console.error('❌ Auto refresh: API request failed with status:', response.status);

        // ถ้าเป็น 401 Unauthorized แสดงว่า token หมดอายุ
        if (response.status === 401) {
          console.log('🔄 Auto refresh: Token expired, should redirect to login');
          // สามารถ dispatch event เพื่อให้ component จัดการกับ token expiry ได้
          window.dispatchEvent(new CustomEvent('authTokenExpired', {
            detail: { source: 'auto-refresh' }
          }));
        }
      }
    } catch (error) {
      this.stats.failedRefreshes++;
      
      if (error.name === 'AbortError') {
        console.warn('🔄 Auto refresh: Request timeout for chat messages - skipping this refresh');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.warn('🔄 Auto refresh: Network error for chat messages - server may be offline');
      } else {
        console.error('❌ Auto refresh: Error refreshing chat messages:', error);
      }
    }
  }

  /**
   * รีเฟรชข้อมูลผู้ใช้ออนไลน์
   */
  async refreshOnlineUsers(roomId, userId) {
    this.stats.totalRefreshes++;

    try {
      const token = localStorage.getItem('token');
      
      // เพิ่ม timeout และ error handling ที่ดีขึ้น
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chatroom/${roomId}/online-users?userId=${userId}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.stats.successfulRefreshes++;
          this.stats.lastRefreshTime = Date.now();

          window.dispatchEvent(new CustomEvent('onlineUsersUpdated', {
            detail: { roomId, onlineUsers: data.data.onlineUsers, onlineCount: data.data.onlineCount, source: 'main-thread' }
          }));
        }
      } else {
        this.stats.failedRefreshes++;

        // ถ้าเป็น 401 Unauthorized แสดงว่า token หมดอายุ
        if (response.status === 401) {
          console.log('🔄 Auto refresh: Token expired for online users, should redirect to login');
          window.dispatchEvent(new CustomEvent('authTokenExpired', {
            detail: { source: 'auto-refresh' }
          }));
        }
      }
    } catch (error) {
      this.stats.failedRefreshes++;
      
      if (error.name === 'AbortError') {
        console.warn('🔄 Auto refresh: Request timeout for online users - skipping this refresh');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.warn('🔄 Auto refresh: Network error for online users - server may be offline');
      } else {
        console.error('Error refreshing online users:', error);
      }
    }
  }

  /**
   * รีเฟรชการแจ้งเตือน
   */
  async refreshNotifications(userId) {
    this.stats.totalRefreshes++;

    try {
      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/notifications/${userId}?limit=5`;
      const token = localStorage.getItem('token');
      
      console.log('🔄 Auto refresh: Fetching notifications from:', url);
      console.log('🔄 Auto refresh: User ID:', userId);
      console.log('🔄 Auto refresh: Token exists:', !!token);

      // เพิ่ม timeout และ error handling ที่ดีขึ้น
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('🔄 Auto refresh: Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔄 Auto refresh: Notifications response:', data);
        
        if (data.success) {
          this.stats.successfulRefreshes++;
          this.stats.lastRefreshTime = Date.now();

          const notifications = data.data.notifications || [];
          console.log('🔄 Auto refresh: Dispatching notifications update:', notifications.length, 'items');

          window.dispatchEvent(new CustomEvent('notificationsUpdated', {
            detail: { notifications, source: 'auto-refresh' }
          }));
        } else {
          console.error('🔄 Auto refresh: API returned success: false:', data.message);
          this.stats.failedRefreshes++;
        }
      } else {
        console.error('🔄 Auto refresh: API error:', response.status, response.statusText);
        this.stats.failedRefreshes++;
      }
    } catch (error) {
      this.stats.failedRefreshes++;
      
      if (error.name === 'AbortError') {
        console.warn('🔄 Auto refresh: Request timeout - skipping this refresh');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.warn('🔄 Auto refresh: Network error - server may be offline');
      } else {
        console.error('🔄 Auto refresh: Error refreshing notifications:', error);
      }
    }
  }

  /**
   * รีเฟรชข้อมูลห้องแชท
   */
  async refreshRoomInfo(roomId) {
    this.stats.totalRefreshes++;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chatroom/${roomId}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.stats.successfulRefreshes++;
          this.stats.lastRefreshTime = Date.now();

          window.dispatchEvent(new CustomEvent('roomInfoUpdated', {
            detail: { roomId, roomInfo: data.data }
          }));
        }
      } else {
        this.stats.failedRefreshes++;

        // ถ้าเป็น 401 Unauthorized แสดงว่า token หมดอายุ
        if (response.status === 401) {
          console.log('🔄 Auto refresh: Token expired for room info, should redirect to login');
          window.dispatchEvent(new CustomEvent('authTokenExpired', {
            detail: { source: 'auto-refresh' }
          }));
        }
      }
    } catch (error) {
      this.stats.failedRefreshes++;
      console.error('Error refreshing room info:', error);
    }
  }

  /**
   * บังคับรีเฟรชข้อมูลทั้งหมด
   */
  forceRefresh(mode = 'normal') {
    console.log('🔄 Force refresh triggered');
    this.adjustRefreshFrequency(mode);

    // รีเฟรชข้อมูลทั้งหมดทันที
    setTimeout(() => {
      this.adjustRefreshFrequency('normal');
    }, 100);
  }

  /**
   * ดึงสถิติการทำงานของระบบ
   */
  getStats() {
    const now = Date.now();
    const uptime = now - (this.startTime || now);

    return {
      // สถานะการทำงาน
      isActive: this.isActive,
      isVisible: this.isVisible,
      lastActivity: new Date(this.lastActivity).toISOString(),
      uptime: Math.floor(uptime / 1000),

      // การทำงานของระบบ
      activeIntervals: this.intervals.size,
      activeWorkers: this.workers.size,
      serviceWorkerSupported: !!this.serviceWorker,
      serviceWorkerActive: this.serviceWorker?.active ? true : false,

      // สถิติการรีเฟรช
      refreshStats: {
        ...this.stats,
        successRate: this.stats.totalRefreshes > 0 ?
          Math.round((this.stats.successfulRefreshes / this.stats.totalRefreshes) * 100) : 0,
        averageRefreshTime: this.calculateAverageRefreshTime()
      },

      // ประสิทธิภาพการทำงาน
      idleTime: now - this.lastActivity,
      memoryUsage: this.getMemoryUsage(),

      // ข้อมูลเครือข่าย
      networkInfo: this.getNetworkInfo(),

      // สถานะการปรับความถี่
      currentFrequency: this.getCurrentFrequency()
    };
  }

  /**
   * คำนวณเวลารีเฟรชเฉลี่ย
   */
  calculateAverageRefreshTime() {
    if (this.refreshTimes && this.refreshTimes.length > 0) {
      const sum = this.refreshTimes.reduce((a, b) => a + b, 0);
      return Math.round(sum / this.refreshTimes.length);
    }
    return 0;
  }

  /**
   * ดึงข้อมูลเครือข่าย
   */
  getNetworkInfo() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }

  /**
   * ดึงความถี่ปัจจุบันที่กำลังทำงานอยู่
   */
  getCurrentFrequency() {
    const modes = ['immediate', 'fast', 'normal', 'slow', 'background'];
    for (const mode of modes) {
      if (this.intervals.has(mode)) {
        return mode;
      }
    }
    return 'stopped';
  }

  /**
   * รีเซ็ตสถิติการทำงาน
   */
  resetStats() {
    this.stats = {
      totalRefreshes: 0,
      successfulRefreshes: 0,
      failedRefreshes: 0,
      lastRefreshTime: null
    };
    this.refreshTimes = [];
    console.log('📊 Auto refresh stats reset');
  }

  /**
   * ดึงข้อมูลการใช้หน่วยความจำ
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }
}

// สร้าง instance เดียวเพื่อใช้ร่วมกัน
const autoRefreshManager = new AutoRefreshManager();

export default autoRefreshManager;
