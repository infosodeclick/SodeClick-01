import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncUserFromServer = async (currentUser) => {
    try {
      const storedUser = currentUser || JSON.parse(localStorage.getItem('user') || '{}');
      const userId = storedUser?._id || storedUser?.id || user?._id || user?.id;
      const token = localStorage.getItem('token');
      const API_BASE_URL = (import.meta?.env?.VITE_API_BASE_URL) || 'http://localhost:5000';

      if (!userId || !token) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/membership/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('⚠️ Failed to sync user data from server:', response.status);
        return;
      }

      const payload = await response.json();

      if (payload?.success && payload?.data) {
        const membershipData = payload.data;
        const updatedUser = {
          ...(storedUser || {}),
          coins: membershipData.coins ?? storedUser?.coins ?? 0,
          votePoints: membershipData.votePoints ?? storedUser?.votePoints ?? 0,
          isVerified: membershipData.isVerified ?? storedUser?.isVerified ?? false,
          membership: {
            ...(storedUser?.membership || {}),
            tier: membershipData.membershipTier ?? storedUser?.membership?.tier ?? 'member',
            startDate: membershipData.membershipStartDate ?? storedUser?.membership?.startDate ?? null,
            endDate: membershipData.membershipExpiry ?? storedUser?.membership?.endDate ?? null,
            planId: membershipData.planId ?? storedUser?.membership?.planId ?? null
          }
        };

        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: updatedUser }));
        console.log('✅ Synced user data from server');
      }
    } catch (error) {
      console.error('❌ Error syncing user data from server:', error);
    }
  };

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        
        // Check for invalid user IDs (old deleted users)
        const invalidUserIds = [
          '68c13cb085d17f0b0d4584bc', // Old kao user ID
          '68bd5debcf52bbadcf865456', // test user
          '68bd5f2ecf52bbadcf86595d', // user_829394452
          '68bd7531cf52bbadcf865b67', // K.nampetch
          '68bdaa833750baa9df62c22d'  // Achi
          // Removed '68bdab749a77b0ed80649af6' - admin user should be valid
        ];
        
        if (invalidUserIds.includes(parsedUser._id)) {
          // console.log('🚨 Invalid user ID detected, clearing session:', parsedUser._id);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        } else {
          setUser(parsedUser);
          syncUserFromServer(parsedUser);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
    const handleRefreshUserDataEvent = () => {
      syncUserFromServer();
    };
    
    // Handle storage changes from other tabs (sync login/logout across tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user') {
        // ถ้ามีการเปลี่ยนแปลง token หรือ user จาก tab อื่น
        const newToken = localStorage.getItem('token');
        const newUserData = localStorage.getItem('user');
        
        if (newToken && newUserData) {
          // มีการ login ใน tab อื่น - อัปเดต state
          try {
            const parsedUser = JSON.parse(newUserData);
            setUser(parsedUser);
            console.log('🔄 Synced login from another tab');
            syncUserFromServer(parsedUser);
          } catch (error) {
            console.error('Error parsing user data from storage event:', error);
          }
        } else {
          // มีการ logout ใน tab อื่น - logout tab นี้ด้วย
          setUser(null);
          console.log('🔄 Synced logout from another tab');
          window.location.reload();
        }
      }
    };
    
    // Handle browser close/refresh - update online status to false
    const handleBeforeUnload = (event) => {
      const token = localStorage.getItem('token');
      if (token) {
        // ใช้ fetch with keepalive เพื่อส่ง Authorization header ได้ถูกต้อง
        // sendBeacon ไม่รองรับ custom headers ดังนั้นใช้ fetch with keepalive แทน
        const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/logout`;
        
        fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({}),
          keepalive: true // สำคัญ! ทำให้ request ทำงานต่อแม้ page ปิด
        }).catch(err => {
          console.error('❌ Failed to logout on beforeunload:', err);
        });
      }
      
      // Disconnect socket ก่อนปิดหน้าเว็บ (สำคัญมาก!)
      if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
        try {
          window.socketManager.socket.disconnect();
          console.log('🔌 Socket disconnected on beforeunload');
        } catch (err) {
          console.error('❌ Error disconnecting socket on beforeunload:', err);
        }
      }
    };
    
    // เพิ่ม handler สำหรับ pagehide (น่าเชื่อถือกว่า beforeunload)
    const handlePageHide = (event) => {
      const token = localStorage.getItem('token');
      if (token) {
        // ใช้ fetch with keepalive สำหรับ pagehide
        const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/logout`;
        
        fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({}),
          keepalive: true
        }).catch(err => {
          console.error('❌ Failed to logout on pagehide:', err);
        });
      }
      
      // Disconnect socket
      if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
        try {
          window.socketManager.socket.disconnect();
          console.log('🔌 Socket disconnected on pagehide');
        } catch (err) {
          console.error('❌ Error disconnecting socket on pagehide:', err);
        }
      }
    };
    
    // เพิ่ม handler สำหรับ visibility change เพื่อตรวจจับเมื่อปิด tab
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const token = localStorage.getItem('token');
        if (token) {
          // เมื่อ tab ถูกซ่อน (อาจจะปิด) ให้อัพเดทสถานะ lastActive
          // console.log('📴 Tab hidden, updating lastActive');
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide); // เพิ่ม pagehide listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('refreshUserData', handleRefreshUserDataEvent);

    // Handle token expiry events from auto refresh manager
    const handleAuthTokenExpired = (event) => {
      console.log('🚨 Auth token expired detected:', event.detail);
      logout();
    };

    window.addEventListener('authTokenExpired', handleAuthTokenExpired);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide); // เพิ่ม cleanup สำหรับ pagehide
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('refreshUserData', handleRefreshUserDataEvent);
      window.removeEventListener('authTokenExpired', handleAuthTokenExpired);
      
      // Disconnect socket เมื่อ component unmount
      if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
        try {
          window.socketManager.socket.disconnect();
          console.log('🔌 Socket disconnected on component unmount');
        } catch (err) {
          console.error('❌ Error disconnecting socket on unmount:', err);
        }
      }
    };
  }, []);


  const login = (userData) => {
    console.log('🔍 AuthContext login called with:', userData);
    const userToSet = userData.user || userData;
    console.log('🔍 User to set:', userToSet);
    console.log('🔍 User ID in userToSet:', userToSet._id || userToSet.id || userToSet.userId);
    
    // Check email verification status
    if (userToSet.email && !userToSet.emailVerified && userToSet.emailVerified !== undefined) {
      console.warn('⚠️ User email not verified:', userToSet.email);
      // Don't prevent login, but store the status
    }
    
    setUser(userToSet);
    localStorage.setItem('token', userData.token || userData.data?.token);
    localStorage.setItem('user', JSON.stringify(userToSet));
    window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: userToSet }));
    
    // Send login event
    window.dispatchEvent(new CustomEvent('userLoggedIn', { 
      detail: { user: userData.user || userData } 
    }));
    
    console.log('✅ Login successful, user state updated');
  };

  const logout = () => {
    console.log('🚪 Logging out...');
    const token = localStorage.getItem('token');
    
    // อัพเดท online status เป็น false
    if (token) {
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).then(() => {
        console.log('✅ Logout: Online status updated to false');
      }).catch((err) => {
        console.error('❌ Logout: Failed to update online status:', err);
      });
    }
    
    // ล้างข้อมูลและส่ง event
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
    
    // รีเฟรชหน้าเว็บอัตโนมัติเมื่อล็อกเอาต์
    console.log('🔄 Refreshing page after logout');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Function to validate current user and force logout if invalid
  const validateUser = async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) return true;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.log('🚨 User validation failed, logging out');
        logout();
        return false;
      }

      const data = await response.json();
      if (!data.success) {
        console.log('🚨 User validation failed, logging out');
        logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ User validation error:', error);
      logout();
      return false;
    }
  };


  // Function to update user data (for coin/vote updates)
  const updateUserData = (updatedUser) => {
    console.log('🔄 AuthContext: Updating user data:', updatedUser)
    setUser(updatedUser)

    // Also update localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser))
    window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: updatedUser }))
  };

  // Expose updateUserData globally for components that need it
  useEffect(() => {
    window.updateAuthContext = updateUserData
    return () => {
      delete window.updateAuthContext
    }
  }, [])

  const value = {
    user,
    login,
    logout,
    validateUser,
    loading,
    updateUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
