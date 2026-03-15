import { apiService } from '../config/api';

// Shop API Services
export const shopAPI = {
  // ดึงแพ็กเกจเหรียญทั้งหมด
  getCoinPackages: () => apiService.get('/api/shop/packages'),
  
  // ซื้อแพ็กเกจเหรียญ
  purchaseCoinPackage: (data) => apiService.post('/api/shop/purchase', data),
  
  // ดูประวัติการซื้อ
  getPurchaseHistory: (userId) => apiService.get(`/api/shop/purchase-history/${userId}`)
};

// Helper functions สำหรับ Shop
export const shopHelpers = {
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
  
  // แปลงจำนวนคะแนนโหวตเป็นรูปแบบที่อ่านง่าย
  formatVotePoints: (amount) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toLocaleString();
  },
  
  // คำนวณโบนัสเหรียญ
  calculateBonus: (baseCoins, bonusPercentage) => {
    return Math.floor(baseCoins * (bonusPercentage / 100));
  },
  
  // คำนวณเหรียญรวม (รวมโบนัส)
  calculateTotalCoins: (baseCoins, bonusPercentage) => {
    const bonus = shopHelpers.calculateBonus(baseCoins, bonusPercentage);
    return baseCoins + bonus;
  },
  
  // ได้สีของแพ็กเกจตามราคา
  getPackageColor: (price) => {
    if (price >= 1000) return 'from-purple-500 to-indigo-600';
    if (price >= 500) return 'from-pink-500 to-rose-600';
    if (price >= 300) return 'from-blue-500 to-cyan-600';
    if (price >= 150) return 'from-green-500 to-emerald-600';
    if (price >= 100) return 'from-yellow-500 to-orange-600';
    if (price >= 50) return 'from-teal-500 to-green-600';
    return 'from-slate-500 to-gray-600';
  },
  
  // ได้ไอคอนของแพ็กเกจตามราคา
  getPackageIcon: (price) => {
    if (price >= 1000) return '💎';
    if (price >= 500) return '👑';
    if (price >= 300) return '⭐';
    if (price >= 150) return '🌟';
    if (price >= 100) return '✨';
    if (price >= 50) return '💫';
    return '🪙';
  },
  
  // ตรวจสอบว่าแพ็กเกจนี้เป็น popular หรือไม่
  isPopularPackage: (packageData) => {
    return packageData.badges?.isPopular || false;
  },
  
  // ตรวจสอบว่าแพ็กเกจนี้เป็น best value หรือไม่
  isBestValuePackage: (packageData) => {
    return packageData.badges?.isBestValue || false;
  },
  
  // คำนวณมูลค่าต่อเหรียญ (THB per coin)
  calculateValuePerCoin: (price, totalCoins) => {
    if (totalCoins === 0) return 0;
    return (price / totalCoins) * 1000; // THB per 1000 coins
  },
  
  // เรียงลำดับแพ็กเกจตามมูลค่า
  sortPackagesByValue: (packages) => {
    return packages.sort((a, b) => {
      const valueA = shopHelpers.calculateValuePerCoin(a.price, a.rewards.coins);
      const valueB = shopHelpers.calculateValuePerCoin(b.price, b.rewards.coins);
      return valueA - valueB; // เรียงจากมูลค่าดีที่สุด
    });
  }
};

export default shopAPI;
