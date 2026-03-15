import { useCallback } from 'react'
import { showWebappNotification } from '../utils'
import { userAPI } from '../services/userAPI'
import { profileAPI } from '../services/profileAPI'
import { membershipAPI } from '../services/membershipAPI'

export const useEventHandlers = (
  user: any,
  setAllUsers: (users: any[]) => void,
  setHasMoreUsers: (hasMore: boolean) => void,
  setCurrentPage: (page: number) => void,
  setVisibleCount: (count: number) => void,
  setIsLoadingAllUsers: (loading: boolean) => void,
  setPremiumUsers: (users: any[]) => void,
  setAvatarUrl: (url: string | null) => void,
  success: (message: any) => void
) => {
  // Handle refresh user data event
  const handleRefreshUserData = useCallback(() => {
    console.log('🔄 Event received: refreshUserData');

    const refreshAuthUser = async () => {
      try {
        const currentUserId = user?._id || user?.id;
        const updateAuthContext = (window as any)?.updateAuthContext;
        if (!currentUserId || typeof updateAuthContext !== 'function') {
          return;
        }

        const response = await membershipAPI.getUserMembership(currentUserId);
        const payload = response?.data;

        if (payload?.success && payload?.data) {
          const membershipData = payload.data;

          const updatedUser = {
            ...(user || {}),
            coins: membershipData.coins ?? user?.coins ?? 0,
            votePoints: membershipData.votePoints ?? user?.votePoints ?? 0,
            isVerified: membershipData.isVerified ?? user?.isVerified ?? false,
            membership: {
              ...(user?.membership || {}),
              tier: membershipData.membershipTier ?? user?.membership?.tier ?? 'member',
              startDate: membershipData.membershipStartDate ?? user?.membership?.startDate ?? null,
              endDate: membershipData.membershipExpiry ?? user?.membership?.endDate ?? null,
              planId: membershipData.planId ?? user?.membership?.planId ?? null
            }
          };

          updateAuthContext(updatedUser);
        }
      } catch (error) {
        console.error('❌ Error refreshing auth user from membership API:', error);
      }
    };

    refreshAuthUser();

    if (window.requestIdleCallback) {
      window.requestIdleCallback(async () => {
        try {
          setIsLoadingAllUsers(true);
          const result = await userAPI.loadAllUsers(1, 50);
          
          if (result.success && result.data) {
            const filteredUsers = result.data.users.filter((u: any) => {
              const currentUserId = user?._id || user?.id;
              const userId = u._id || u.id;
              return currentUserId !== userId;
            });
            
            setAllUsers(filteredUsers);
            setHasMoreUsers(result.data.pagination.page < result.data.pagination.pages);
            setCurrentPage(1);
            setVisibleCount(filteredUsers.length);
          }
        } catch (error) {
          console.error('❌ Error refreshing user data:', error);
        } finally {
          setIsLoadingAllUsers(false);
        }
      });
    } else {
      setTimeout(async () => {
        try {
          setIsLoadingAllUsers(true);
          const result = await userAPI.loadAllUsers(1, 50);
          
          if (result.success && result.data) {
            const filteredUsers = result.data.users.filter((u: any) => {
              const currentUserId = user?._id || user?.id;
              const userId = u._id || u.id;
              return currentUserId !== userId;
            });
            
            setAllUsers(filteredUsers);
            setHasMoreUsers(result.data.pagination.page < result.data.pagination.pages);
            setCurrentPage(1);
            setVisibleCount(filteredUsers.length);
          }
        } catch (error) {
          console.error('❌ Error refreshing user data:', error);
        } finally {
          setIsLoadingAllUsers(false);
        }
      }, 0);
    }
  }, [user, setAllUsers, setHasMoreUsers, setCurrentPage, setVisibleCount, setIsLoadingAllUsers]);

  // Handle user upgraded event
  const handleUserUpgraded = useCallback((event: any) => {
    const upgradeData = event.detail;
    console.log('🎉 User upgraded event received:', upgradeData);

    if (upgradeData.userId === user?._id || upgradeData.userId === user?.id) {
      // Update user data in AuthContext
      if (window.updateAuthContext) {
        const updatedUser = { ...user };

        if (upgradeData.tier) {
          updatedUser.membership = {
            ...updatedUser.membership,
            tier: upgradeData.tier
          };
        }

        if (upgradeData.coinsAdded) {
          updatedUser.coins = (updatedUser.coins || 0) + upgradeData.coinsAdded;
        }

        if (upgradeData.votePointsAdded) {
          updatedUser.votePoints = (updatedUser.votePoints || 0) + upgradeData.votePointsAdded;
        }

        window.updateAuthContext(updatedUser);
        console.log('✅ AuthContext updated with upgrade data');
      }

      // Show success notification
      success({
        title: 'อัพเกรดสำเร็จ! 🎉',
        description: `ยินดีด้วย! คุณได้รับสิทธิพิเศษของ ${upgradeData.tier} แล้ว`
      });
    }
  }, [user, success]);

  // Handle membership updated event
  const handleMembershipUpdated = useCallback((event: any) => {
    const membershipData = event.detail;
    console.log('👑 Membership updated event received:', membershipData);

    if (membershipData.userId === user?._id || membershipData.userId === user?.id) {
      if (window.updateAuthContext) {
        const updatedUser = {
          ...user,
          membership: {
            ...user.membership,
            tier: membershipData.newTier
          }
        };
        window.updateAuthContext(updatedUser);
      }
    }
  }, [user]);

  // Handle profile like
  const handleProfileLike = useCallback(async (profileId: string) => {
    try {
      const result = await profileAPI.likeProfile(profileId);
      
      if (result.success) {
        showWebappNotification('ส่งใจให้แล้ว! ❤️', 'success');
        return { success: true, data: result.data };
      } else {
        showWebappNotification(result.error || 'ไม่สามารถส่งใจได้', 'error');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMsg = error.message || 'เกิดข้อผิดพลาด';
      showWebappNotification(errorMsg, 'error');
      return { success: false, error: errorMsg };
    }
  }, []);

  // Handle view profile
  const handleViewProfile = useCallback(async (profileData: any) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showWebappNotification('กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      // Check if user can view profile based on membership tier
      const canView = canViewProfile(user?.membership?.tier || 'member', profileData.membershipTier || 'member');
      
      if (!canView) {
        showWebappNotification('คุณไม่มีสิทธิ์ดูโปรไฟล์นี้ กรุณาอัพเกรดสมาชิก');
        return;
      }

      // Set profile data and show modal
      setSelectedProfile(profileData);
      setShowProfileModal(true);
      setProfileAlert(null);
      setActiveImageIndex(0);
      setShowProfileDetails(false);
      setProfileData(null);
    } catch (error) {
      console.error('❌ Error viewing profile:', error);
      showWebappNotification('เกิดข้อผิดพลาดในการดูโปรไฟล์', 'error');
    }
  }, [user]);

  return {
    handleRefreshUserData,
    handleUserUpgraded,
    handleMembershipUpdated,
    handleProfileLike,
    handleViewProfile
  };
};
