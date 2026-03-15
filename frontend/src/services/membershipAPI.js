import { apiService } from '../config/api';

// Membership API Services
export const membershipAPI = {
  // ดึงแพ็กเกจสมาชิกทั้งหมด
  getPlans: () => apiService.get('/api/membership/plans'),
  
  // ดึงข้อมูลสมาชิกของผู้ใช้
  getUserMembership: (userId) => apiService.get(`/api/membership/user/${userId}`),
  
  // อัพเกรดสมาชิก
  upgradeMembership: (data) => apiService.post('/api/upgrade-simple', data),
  
  // รับโบนัสรายวัน
  claimDailyBonus: (userId) => apiService.post('/api/membership/daily-bonus', { userId }),
  
  // หมุนวงล้อของขวัญ
  spinWheel: (userId) => apiService.post('/api/membership/spin-wheel', { userId }),
  
  // โอนเหรียญ
  transferCoins: (fromUserId, toUserId, amount) => 
    apiService.post('/api/membership/transfer-coins', { fromUserId, toUserId, amount }),
  
  // ตรวจสอบสิทธิ์การทำ action
  checkAction: (userId, action) => apiService.get(`/api/membership/check-action/${userId}/${action}`)
};

// Helper functions สำหรับ UI
export const membershipHelpers = {
  // แปลงชื่อ tier เป็นภาษาไทย
  getTierName: (tier) => {
    const names = {
      member: 'สมาชิก',
      silver: 'Silver Member',
      gold: 'Gold Member',
      vip: 'VIP Member',
      vip1: 'VIP 1',
      vip2: 'VIP 2',
      diamond: 'Diamond Member',
      platinum: 'Platinum Member'
    };
    return names[tier] || tier;
  },

  // แปลงชื่อ tier สำหรับแสดงในแชท (English format)
  getTierDisplayName: (tier) => {
    const names = {
      member: 'MEMBER',
      silver: 'SILVER',
      gold: 'GOLD',
      vip: 'VIP',
      vip1: 'VIP1',
      vip2: 'VIP2',
      diamond: 'DIAMOND',
      platinum: 'PLATINUM'
    };
    return names[tier] || 'MEMBER';
  },
  
  // ได้สีของ tier
  getTierColor: (tier) => {
    const colors = {
      member: 'text-slate-600',
      silver: 'text-slate-500',
      gold: 'text-yellow-500',
      vip: 'text-purple-500',
      vip1: 'text-pink-500',
      vip2: 'text-amber-500',
      diamond: 'text-cyan-500',
      platinum: 'text-indigo-500'
    };
    return colors[tier] || 'text-gray-500';
  },
  
  // ได้ gradient ของ tier
  getTierGradient: (tier) => {
    const gradients = {
      member: 'from-slate-400 to-slate-600',
      silver: 'from-slate-300 to-slate-500',
      gold: 'from-yellow-400 to-yellow-600',
      vip: 'from-purple-400 to-purple-600',
      vip1: 'from-pink-400 to-purple-600',
      vip2: 'from-amber-400 to-orange-600',
      diamond: 'from-cyan-400 to-blue-600',
      platinum: 'from-indigo-400 to-purple-600'
    };
    return gradients[tier] || 'from-gray-400 to-gray-600';
  },
  
  // ได้ไอคอนของ tier
  getTierIcon: (tier) => {
    const icons = {
      member: '👤',
      silver: '🥈',
      gold: '🥇',
      vip: '👑',
      vip1: '💎',
      vip2: '⭐',
      diamond: '💎',
      platinum: '🏆'
    };
    return icons[tier] || '👤';
  },
  
  // แปลงจำนวนเงินเป็นรูปแบบที่อ่านง่าย
  formatPrice: (amount, currency = 'THB') => {
    if (amount === 0) return 'ฟรี';
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },
  
  // แปลงจำนวนเหรียญเป็นรูปแบบที่อ่านง่าย
  formatCoins: (amount) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toLocaleString();
  },
  
  // คำนวณเวลาที่เหลือ
  getTimeRemaining: (expiryDate, tier = 'member') => {
    if (!expiryDate) {
      // สำหรับ member tier ที่ไม่มีวันหมดอายุ
      if (tier === 'member') {
        return 'ไม่มีวันหมดอายุ';
      }
      return 'หมดอายุแล้ว';
    }
    
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry - now;
    
    if (diff <= 0) return 'หมดอายุแล้ว';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `เหลือ ${days} วัน ${hours} ชั่วโมง`;
    } else if (hours > 0) {
      return `เหลือ ${hours} ชั่วโมง ${minutes} นาที`;
    } else if (minutes > 0) {
      return `เหลือ ${minutes} นาที`;
    }
    
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `เหลือ ${seconds} วินาที`;
  },

  // คำนวณเวลาที่เหลือแบบละเอียด (สำหรับการนับถอยหลัง)
  getTimeRemainingDetailed: (expiryDate, tier = 'member') => {
    if (!expiryDate) {
      if (tier === 'member') {
        return { text: 'ไม่มีวันหมดอายุ', isExpired: false };
      }
      return { text: 'หมดอายุแล้ว', isExpired: true };
    }
    
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry - now;
    
    if (diff <= 0) {
      return { text: 'หมดอายุแล้ว', isExpired: true };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    let text = '';
    if (days > 0) {
      text = `เหลือ ${days} วัน ${hours} ชั่วโมง`;
    } else if (hours > 0) {
      text = `เหลือ ${hours} ชั่วโมง ${minutes} นาที`;
    } else if (minutes > 0) {
      text = `เหลือ ${minutes} นาที ${seconds} วินาที`;
    } else {
      text = `เหลือ ${seconds} วินาที`;
    }
    
    return { text, isExpired: false, diff };
  },

  // ได้ระยะเวลาสมาชิกตาม tier
  getMembershipDuration: (tier, isExpired = false) => {
    if (isExpired) {
      return 'หมดอายุแล้ว';
    }

    const durations = {
      member: '365 วัน (ฟรี)',
      silver: '7 วัน',
      gold: '15 วัน',
      vip: '30 วัน (1 เดือน)',
      vip1: '30 วัน (1 เดือน)',
      vip2: '30 วัน (1 เดือน)',
      diamond: '30 วัน (1 เดือน)',
      platinum: '30 วัน (1 เดือน)'
    };
    return durations[tier] || 'ไม่ระบุ';
  },
  
  // ตรวจสอบว่า tier นี้มีฟีเจอร์อะไรบ้าง
  hasFeature: (tier, feature) => {
    const tierFeatures = {
      member: [],
      silver: [],
      gold: ['profileVideo', 'verificationBadge', 'specialFrame'],
      vip: ['profileVideo', 'verificationBadge', 'specialFrame', 'pinPosts', 'blurImages', 'createChatRooms'],
      vip1: ['profileVideo', 'verificationBadge', 'specialFrame', 'pinPosts', 'blurImages', 'createChatRooms', 'hideOnlineStatus'],
      vip2: ['profileVideo', 'verificationBadge', 'specialFrame', 'pinPosts', 'blurImages', 'createChatRooms', 'hideOnlineStatus', 'unlimitedMedia'],
      diamond: ['profileVideo', 'verificationBadge', 'specialFrame', 'pinPosts', 'blurImages', 'createChatRooms', 'hideOnlineStatus', 'unlimitedMedia', 'transferCoins'],
      platinum: ['profileVideo', 'verificationBadge', 'specialFrame', 'pinPosts', 'blurImages', 'createChatRooms', 'hideOnlineStatus', 'unlimitedMedia', 'transferCoins', 'unlimited']
    };

    return tierFeatures[tier]?.includes(feature) || false;
  }
};

export default membershipAPI;
