import { apiService } from '../config/api';

// Payment API Services
export const paymentAPI = {
  // สร้าง QR Code สำหรับการชำระเงิน
  generateQRCode: (data) => apiService.post('/api/payment/generate-qr', data),
  
  // ตรวจสอบสถานะการชำระเงิน
  checkPaymentStatus: (transactionId) => apiService.get(`/api/payment/check-payment/${transactionId}`),
  
  // ยืนยันการชำระเงิน
  confirmPayment: (data) => apiService.post('/api/payment/confirm-payment', data),
  
  // ดึงข้อมูลธนาคารทั้งหมด
  getBanks: () => apiService.get('/api/payment/banks')
};

// Helper functions สำหรับ Payment
export const paymentHelpers = {
  // จัดรูปแบบเวลาที่เหลือ
  formatTimeRemaining: (milliseconds) => {
    if (milliseconds <= 0) return 'หมดอายุแล้ว';
    
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },

  // ตรวจสอบว่า QR Code หมดอายุหรือยัง
  isQRCodeExpired: (expiryTime) => {
    if (!expiryTime) return false;
    return new Date() > new Date(expiryTime);
  },

  // สร้างข้อมูลการชำระเงินสำหรับคัดลอก
  generatePaymentInfo: (qrData, bankName) => {
    return `
ธนาคาร: ${bankName}
เลขบัญชี: ${qrData.accountNumber}
ชื่อบัญชี: ${qrData.accountName}
จำนวนเงิน: ${qrData.amount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
รหัสอ้างอิง: ${qrData.transactionId}
แพ็กเกจ: ${qrData.planName}
    `.trim();
  },

  // สร้าง QR Code payload สำหรับระบบจริง
  createQRPayload: (plan, bankId, userId) => {
    return {
      bankId: bankId,
      amount: plan.price.amount,
      planId: plan._id,
      planTier: plan.tier,
      planName: plan.name,
      userId: userId
    };
  },

  // ตรวจสอบสถานะการชำระเงินแบบ polling
  pollPaymentStatus: async (transactionId, onStatusChange, onComplete, onError) => {
    const maxAttempts = 60; // 60 ครั้ง (5 นาที)
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await paymentAPI.checkPaymentStatus(transactionId);
        
        if (response.data.success) {
          const status = response.data.data.status;
          const isExpired = response.data.data.isExpired;
          
          // เรียก callback เมื่อสถานะเปลี่ยน
          if (onStatusChange) {
            onStatusChange(status, response.data.data);
          }
          
          // ถ้าชำระเงินสำเร็จหรือหมดอายุ ให้หยุด polling
          if (status === 'completed') {
            if (onComplete) {
              onComplete(response.data.data);
            }
            return;
          }
          
          if (status === 'expired' || isExpired) {
            if (onError) {
              onError('QR Code หมดอายุแล้ว');
            }
            return;
          }
          
          // ถ้ายังไม่ครบจำนวนครั้งที่กำหนด ให้ polling ต่อ
          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(poll, 5000); // ตรวจสอบทุก 5 วินาที
          } else {
            if (onError) {
              onError('หมดเวลารอการชำระเงิน');
            }
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
        if (onError) {
          onError('เกิดข้อผิดพลาดในการตรวจสอบสถานะการชำระเงิน');
        }
      }
    };
    
    // เริ่ม polling
    poll();
  },

  // สร้าง QR Code image จาก data URL
  createQRCodeImage: (qrCodeString, options = {}) => {
    const defaultOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    // ในระบบจริงจะใช้ library เช่น qrcode.js
    // สำหรับตอนนี้จะสร้าง placeholder image
    return `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${finalOptions.width}" height="${finalOptions.width}" viewBox="0 0 ${finalOptions.width} ${finalOptions.width}">
        <rect width="${finalOptions.width}" height="${finalOptions.width}" fill="${finalOptions.color.light}"/>
        <text x="${finalOptions.width/2}" y="${finalOptions.width/2}" text-anchor="middle" dy=".3em" font-family="monospace" font-size="12" fill="${finalOptions.color.dark}">QR Code</text>
        <text x="${finalOptions.width/2}" y="${finalOptions.width/2 + 20}" text-anchor="middle" dy=".3em" font-family="monospace" font-size="8" fill="${finalOptions.color.dark}">${qrCodeString.substring(0, 20)}...</text>
      </svg>
    `)}`;
  },

  // ตรวจสอบความถูกต้องของข้อมูลการชำระเงิน
  validatePaymentData: (data) => {
    const errors = [];
    
    if (!data.bankId) {
      errors.push('กรุณาเลือกธนาคาร');
    }
    
    if (!data.amount || data.amount <= 0) {
      errors.push('จำนวนเงินไม่ถูกต้อง');
    }
    
    if (!data.planId) {
      errors.push('ไม่พบข้อมูลแพ็กเกจ');
    }
    
    if (!data.userId) {
      errors.push('ไม่พบข้อมูลผู้ใช้');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },

  // จัดรูปแบบข้อความสถานะการชำระเงิน
  getStatusMessage: (status) => {
    const messages = {
      pending: 'รอการชำระเงิน',
      completed: 'ชำระเงินสำเร็จ',
      expired: 'QR Code หมดอายุแล้ว',
      failed: 'การชำระเงินล้มเหลว',
      cancelled: 'ยกเลิกการชำระเงิน'
    };
    
    return messages[status] || 'สถานะไม่ทราบ';
  },

  // จัดรูปแบบสีสถานะการชำระเงิน
  getStatusColor: (status) => {
    const colors = {
      pending: 'text-yellow-600',
      completed: 'text-green-600',
      expired: 'text-red-600',
      failed: 'text-red-600',
      cancelled: 'text-gray-600'
    };
    
    return colors[status] || 'text-gray-600';
  },

  // จัดรูปแบบไอคอนสถานะการชำระเงิน
  getStatusIcon: (status) => {
    const icons = {
      pending: '⏳',
      completed: '✅',
      expired: '⏰',
      failed: '❌',
      cancelled: '🚫'
    };
    
    return icons[status] || '❓';
  }
};

export default paymentAPI;
