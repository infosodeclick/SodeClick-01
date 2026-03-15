import { apiService } from '../config/api';

// Rabbit Gateway Configuration
const RABBIT_CONFIG = {
  apiUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  createQR: '/create-qr',
  callback: '/payment/callback',
  // Rabbit Gateway specific configuration
  rabbitApiUrl: import.meta.env.VITE_RABBIT_API_URL || 'https://api.pgw.rabbit.co.th',
  applicationId: import.meta.env.VITE_RABBIT_APPLICATION_ID || '',
  publicKey: import.meta.env.VITE_RABBIT_PUBLIC_KEY || '',
  companyId: import.meta.env.VITE_RABBIT_COMPANY_ID || '',
  apiKey: import.meta.env.VITE_RABBIT_API_KEY || ''
};

// Rabbit Gateway API Services
export const rabbitAPI = {
  // สร้างการชำระเงินใหม่
  createPayment: async (paymentData) => {
    try {
      const response = await fetch(`${RABBIT_CONFIG.apiUrl}${RABBIT_CONFIG.createQR}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: paymentData.orderId,
          amount: paymentData.amount
        })
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error('Rabbit createPayment error:', error);
      throw error;
    }
  },

  // ตรวจสอบสถานะการชำระเงิน
  checkPaymentStatus: async (paymentId) => {
    try {
      const response = await fetch(`${RABBIT_CONFIG.apiUrl}/api/payment/check-status/${paymentId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check payment status');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Rabbit checkPaymentStatus error:', error);
      throw error;
    }
  },

  // ยกเลิกการชำระเงิน
  cancelPayment: async (paymentId) => {
    try {
      const response = await fetch(`${RABBIT_CONFIG.apiUrl}/api/payment/cancel/${paymentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error('Rabbit cancelPayment error:', error);
      throw error;
    }
  },

  // ดึงข้อมูลธนาคาร
  getBanks: async () => {
    try {
      const response = await fetch(`${RABBIT_CONFIG.apiUrl}/api/payment/banks`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get banks');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Rabbit getBanks error:', error);
      throw error;
    }
  }
};

// Rabbit Gateway Helper Functions
export const rabbitHelpers = {
  // สร้าง Order ID
  generateOrderId: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `ORD_${timestamp}_${random}`;
  },

  // สร้าง Payment ID
  generatePaymentId: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `PAY_${timestamp}_${random}`;
  },

  // ตรวจสอบสถานะการชำระเงินแบบ Polling
  pollPaymentStatus: (paymentId, onStatusChange, onSuccess, onError) => {
    const interval = setInterval(async () => {
      try {
        const result = await rabbitAPI.checkPaymentStatus(paymentId);
        
        if (result.status === 'completed') {
          clearInterval(interval);
          onSuccess && onSuccess(result);
        } else if (result.status === 'failed') {
          clearInterval(interval);
          onError && onError(new Error('Payment failed'));
        } else {
          onStatusChange && onStatusChange(result.status);
        }
      } catch (error) {
        clearInterval(interval);
        onError && onError(error);
      }
    }, 5000); // ตรวจสอบทุก 5 วินาที

    return interval;
  },

  // แปลงสถานะเป็นข้อความภาษาไทย
  getStatusMessage: (status) => {
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
  },

  // แปลงสถานะเป็นสี
  getStatusColor: (status) => {
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
  },

  // แปลงสถานะเป็นไอคอน
  getStatusIcon: (status) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      case 'expired':
        return '⏰'
      case 'error':
        return '⚠️'
      default:
        return '❓'
    }
  },

  // จัดรูปแบบเวลา
  formatTime: (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },

  // ตรวจสอบว่า QR Code หมดอายุหรือไม่
  isExpired: (expiryTime) => {
    return new Date() > new Date(expiryTime);
  },

  // คำนวณเวลาที่เหลือ
  getTimeRemaining: (expiryTime) => {
    const now = new Date();
    const expiry = new Date(expiryTime);
    const remaining = expiry.getTime() - now.getTime();
    return Math.max(0, remaining);
  },

  // Debug logging
  debugLog: (message, type = 'info', data = null) => {
    const timestamp = new Date().toLocaleString('th-TH');
    const prefix = `[${timestamp}] [Rabbit]`;
    
    switch (type) {
      case 'error':
        console.error(`${prefix} ❌ ${message}`, data);
        break;
      case 'warning':
        console.warn(`${prefix} ⚠️ ${message}`, data);
        break;
      case 'success':
        console.log(`${prefix} ✅ ${message}`, data);
        break;
      default:
        console.log(`${prefix} ℹ️ ${message}`, data);
    }
  }
};

export default rabbitAPI;
