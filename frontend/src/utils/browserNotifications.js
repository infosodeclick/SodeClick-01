/**
 * Browser Notification Utility
 * จัดการการแจ้งเตือนผ่าน OS notifications
 */

class BrowserNotificationManager {
  constructor() {
    this.permission = 'default'; // 'default', 'granted', 'denied'
    this.checkPermission();
  }

  /**
   * ตรวจสอบสถานะสิทธิ์แจ้งเตือน
   */
  checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
      console.log('🔔 Notification permission:', this.permission);
    } else {
      console.warn('⚠️ Browser does not support notifications');
    }
  }

  /**
   * ขอสิทธิ์แจ้งเตือนจากผู้ใช้
   * @returns {Promise<string>} 'granted', 'denied', หรือ 'default'
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('⚠️ Browser does not support notifications');
      return 'unsupported';
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      console.warn('❌ Notification permission denied by user');
      this.permission = 'denied';
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      console.log('🔔 Permission result:', permission);
      
      if (permission === 'granted') {
        // แสดงแจ้งเตือนทดสอบ
        this.showTestNotification();
      }
      
      return permission;
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return 'error';
    }
  }

  /**
   * แสดงแจ้งเตือนทดสอบ
   */
  showTestNotification() {
    if (Notification.permission === 'granted') {
      new Notification('🎉 การแจ้งเตือนพร้อมใช้งานแล้ว!', {
        body: 'คุณจะได้รับการแจ้งเตือนเมื่อมีข้อความใหม่',
        icon: '/SodeClick Logo love.png',
        badge: '/SodeClick Logo love.png'
      });
    }
  }

  /**
   * แสดงแจ้งเตือน
   * @param {string} title - หัวข้อแจ้งเตือน
   * @param {Object} options - ตัวเลือกการแจ้งเตือน
   */
  showNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('⚠️ Cannot show notification: permission not granted');
      return null;
    }

    if (!('Notification' in window)) {
      console.warn('⚠️ Browser does not support notifications');
      return null;
    }

    const defaultOptions = {
      body: '',
      icon: '/SodeClick Logo love.png',
      badge: '/SodeClick Logo love.png',
      tag: 'default', // ใช้แทนข้อความเก่าถ้ามี tag เดียวกัน
      requireInteraction: false, // ให้แจ้งเตือนหายอัตโนมัติ
      silent: false,
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);
      
      // จัดการ click event - เปิดเว็บเมื่อคลิกแจ้งเตือน
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
      };

      // ปิดแจ้งเตือนอัตโนมัติหลังจาก 5 วินาที (ถ้า requireInteraction = false)
      if (!defaultOptions.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('❌ Error showing notification:', error);
      return null;
    }
  }

  /**
   * แจ้งเตือนข้อความใหม่จาก Public Chat
   * @param {Object} message - ข้อมูลข้อความ
   */
  notifyPublicChatMessage(message) {
    const senderName = message.sender?.displayName || message.sender?.username || 'ผู้ใช้';
    const content = message.content || 'ข้อความใหม่';
    
    // ตรวจสอบว่าเป็นข้อความจากผู้อื่นหรือไม่
    if (message.sender?._id === window.currentUserId) {
      console.log('📨 Skipping notification for own message');
      return;
    }

    this.showNotification('💬 ข้อความใหม่จาก Public Chat', {
      body: `${senderName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
      icon: message.sender?.profileImages?.[0] || '/SodeClick Logo love.png',
      tag: 'public-chat',
      data: {
        type: 'public-chat',
        roomId: message.chatRoom,
        senderId: message.sender?._id
      }
    });
  }

  /**
   * แจ้งเตือนข้อความส่วนตัวใหม่
   * @param {Object} message - ข้อมูลข้อความ
   */
  notifyPrivateMessage(message, senderInfo) {
    const senderName = senderInfo?.displayName || senderInfo?.username || 'ผู้ใช้';
    const content = message.content || 'ข้อความใหม่';
    
    this.showNotification('💌 ข้อความส่วนตัวใหม่', {
      body: `${senderName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
      icon: senderInfo?.profileImages?.[0] || '/SodeClick Logo love.png',
      tag: 'private-chat',
      requireInteraction: true, // ให้แจ้งเตือนไม่หายเองสำหรับข้อความส่วนตัว
      data: {
        type: 'private-chat',
        chatId: message.chatRoom,
        senderId: message.sender?._id
      }
    });
  }

  /**
   * ปิดแจ้งเตือนทั้งหมด
   */
  closeAll() {
    // Note: Notification.close() ไม่สามารถปิดแจ้งเตือนจาก instance อื่นได้
    // แต่สามารถจำกัดจำนวนแจ้งเตือนด้วย tag
    console.log('🔔 All notifications will close automatically');
  }
}

// สร้าง instance เดียว
const browserNotificationManager = new BrowserNotificationManager();

export default browserNotificationManager;
