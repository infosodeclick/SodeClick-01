import { API_BASE_URL, PREMIUM_TIER_ORDER } from '../constants'

export const profileAPI = {
  // Fetch all users for discover
  fetchAllUsers: async (page = 1, limit = 50) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/profile/discover?page=${page}&limit=${limit}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return {
          success: true,
          data: {
            users: data.data.users || [],
            pagination: data.data.pagination || {}
          }
        };
      } else {
        return { success: false, error: data.message || 'Unknown error' };
      }
    } catch (error) {
      console.error('❌ Error fetching all users:', error);
      return { success: false, error: error.message };
    }
  },

  // Fetch premium users
  fetchPremiumUsers: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/profile/premium?limit=50`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data && data.data.users) {
        const users = data.data.users || [];
        const sorted = users
          .sort((a: any, b: any) => {
            const ai = PREMIUM_TIER_ORDER.indexOf((a?.membership?.tier || '') as string);
            const bi = PREMIUM_TIER_ORDER.indexOf((b?.membership?.tier || '') as string);
            return ai - bi;
          })
          .slice(0, 50);
        
        return { success: true, data: sorted };
      } else {
        return { success: false, error: data.message || 'Unknown error' };
      }
    } catch (error) {
      console.error('❌ Error fetching premium users:', error);
      return { success: false, error: error.message };
    }
  },

  // Like profile
  likeProfile: async (profileId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false, error: 'No token found' };
      }

      const response = await fetch(`${API_BASE_URL}/api/profile/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profileId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: data.success, data: data.data, error: data.message };
    } catch (error) {
      console.error('❌ Error liking profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Load avatar
  loadAvatar: async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false, error: 'No token found' };
      }

      const response = await fetch(`${API_BASE_URL}/api/profile/${userId}/avatar`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: data.success, data: data.data, error: data.message };
    } catch (error) {
      console.error('❌ Error loading avatar:', error);
      return { success: false, error: error.message };
    }
  },

  // Update online status
  updateOnlineStatus: async (isOnline: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false, error: 'No token found' };
      }

      const response = await fetch(`${API_BASE_URL}/api/profile/online-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isOnline })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: data.success, error: data.message };
    } catch (error) {
      console.error('❌ Error updating online status:', error);
      return { success: false, error: error.message };
    }
  }
}
