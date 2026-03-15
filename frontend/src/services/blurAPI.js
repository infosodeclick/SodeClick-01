const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

class BlurAPI {
  // ดูรูปที่เบลอของผู้ใช้
  async getBlurredImages(userId, viewerId = null) {
    try {
      console.log('🔒 BlurAPI: Getting blurred images for user:', userId);
      
      const url = new URL(`${API_BASE_URL}/api/blur/user/${userId}`);
      if (viewerId) {
        url.searchParams.append('viewerId', viewerId);
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔒 BlurAPI: Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get blurred images');
      }
      
      const data = await response.json();
      console.log('🔒 BlurAPI: Blurred images data:', data);
      
      return data;
    } catch (error) {
      console.error('❌ BlurAPI: Error getting blurred images:', error);
      throw error;
    }
  }

  // ซื้อรูปที่เบลอ (จ่าย 10,000 เหรียญ)
  async purchaseBlurredImage(buyerId, imageOwnerId, imageId) {
    try {
      console.log('💰 BlurAPI: Purchasing blurred image:', {
        buyerId,
        imageOwnerId,
        imageId
      });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('ไม่พบ token สำหรับการยืนยันตัวตน');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/blur/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: imageOwnerId,
          imageId: imageId,
          amount: 10000
        })
      });
      
      console.log('💰 BlurAPI: Purchase response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to purchase image');
      }
      
      const data = await response.json();
      console.log('💰 BlurAPI: Purchase successful:', data);
      
      return data;
    } catch (error) {
      console.error('❌ BlurAPI: Error purchasing image:', error);
      throw error;
    }
  }

  // ดูประวัติการซื้อ/ขายรูปเบลอ
  async getBlurTransactions(userId, type = 'all') {
    try {
      console.log('📊 BlurAPI: Getting blur transactions for user:', userId, 'type:', type);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('ไม่พบ token สำหรับการยืนยันตัวตน');
      }
      
      const url = new URL(`${API_BASE_URL}/api/blur/transactions/${userId}`);
      if (type !== 'all') {
        url.searchParams.append('type', type);
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📊 BlurAPI: Transactions response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get transactions');
      }
      
      const data = await response.json();
      console.log('📊 BlurAPI: Transactions data:', data);
      
      return data;
    } catch (error) {
      console.error('❌ BlurAPI: Error getting transactions:', error);
      throw error;
    }
  }

  // ตรวจสอบว่าซื้อรูปนี้แล้วหรือยัง
  async checkImagePurchased(buyerId, imageOwnerId, imageId) {
    try {
      const transactions = await this.getBlurTransactions(buyerId, 'purchases');
      
      const purchased = transactions.data.some(transaction => 
        transaction.imageOwner === imageOwnerId && 
        transaction.imageId === imageId &&
        transaction.status === 'completed'
      );
      
      return purchased;
    } catch (error) {
      console.error('❌ BlurAPI: Error checking if image purchased:', error);
      return false;
    }
  }
}

export default new BlurAPI();
