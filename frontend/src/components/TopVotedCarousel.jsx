import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { getMainProfileImage, getMainProfileImageGuest } from '../utils/profileImageUtils';
import voteAPI, { voteHelpers } from '../services/voteAPI';

// Get profile image URL
const getImageUrl = (userData) => {
  // userData is from ranking API, structure: { _id, username, profileImages, ... }
  if (!userData) {
    console.debug('ℹ️ No user data found');
    return null;
  }
  
  if (userData.profileImages && userData.profileImages.length > 0) {
    // ใช้ guest mode function ที่รองรับ fallback
    const imageUrl = getMainProfileImageGuest(
      userData.profileImages, 
      userData.mainProfileImageIndex || 0, 
      userData._id || userData.candidateId,
      userData.gender
    );
    return imageUrl;
  }
  
  // User ไม่มีรูปภาพ - จะแสดง avatar แทน (ไม่ใช่ error)
  // renderProfileImage จะจัดการแสดง avatar อัตโนมัติ
  return null;
};

const TopVotedCarousel = () => {
  const [topVotedUsers, setTopVotedUsers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState(new Set()); // Track failed images
  const autoScrollRef = useRef(null);

  // Handle image error safely
  const handleImageError = (userId) => {
    setImageErrors(prev => new Set([...prev, userId]));
  };

  // Render profile image with fallback
  const renderProfileImage = (userData) => {
    const userId = userData._id || userData.candidateId;
    const hasImageError = imageErrors.has(userId);
    const imageUrl = getImageUrl(userData);
    
    // ถ้ามี error หรือไม่มีรูป ให้แสดง avatar
    if (hasImageError || !imageUrl) {
      return (
        <div className={`w-full h-full ${userData?.isOnline ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-gray-600 to-gray-700'} flex items-center justify-center`}>
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg">
            <span className="text-5xl font-bold text-gray-600">
              {userData?.displayName?.[0] || userData?.username?.[0] || '?'}
            </span>
          </div>
        </div>
      );
    }

    // แสดงรูปปกติ
    return (
      <img
        src={imageUrl}
        alt={userData?.displayName || userData?.username}
        className="w-full h-full object-cover"
        onError={() => handleImageError(userId)}
        loading="lazy"
      />
    );
  };

  // Fetch top voted users using the same API as Popular Vote
  const fetchTopVotedUsers = async () => {
    try {
      setLoading(true);
      
      // ใช้ vote ranking API โดยตรง
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/vote/ranking?voteType=popularity_combined&limit=3&sortBy=totalVotes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.data && result.data.rankings) {
        const rankingData = result.data.rankings;
        setTopVotedUsers(rankingData);
      } else {
        console.warn('⚠️ TopVotedCarousel - No ranking data found:', result);
        setTopVotedUsers([]);
      }
    } catch (error) {
      console.error('❌ TopVotedCarousel - Error fetching top voted users:', error);
      setTopVotedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll functionality
  const startAutoScroll = () => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
    }
    
    autoScrollRef.current = setInterval(() => {
      setCurrentIndex(prevIndex => 
        prevIndex >= topVotedUsers.length - 1 ? 0 : prevIndex + 1
      );
    }, 7000); // 7 seconds
  };

  const stopAutoScroll = () => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
    }
  };

  // Navigation functions
  const goToPrevious = () => {
    stopAutoScroll();
    setCurrentIndex(prevIndex => 
      prevIndex <= 0 ? topVotedUsers.length - 1 : prevIndex - 1
    );
    setTimeout(startAutoScroll, 1000); // Restart auto-scroll after 1 second
  };

  const goToNext = () => {
    stopAutoScroll();
    setCurrentIndex(prevIndex => 
      prevIndex >= topVotedUsers.length - 1 ? 0 : prevIndex + 1
    );
    setTimeout(startAutoScroll, 1000); // Restart auto-scroll after 1 second
  };

  // Initialize
  useEffect(() => {
    fetchTopVotedUsers();
  }, []);

  // Start auto-scroll when data is loaded
  useEffect(() => {
    if (topVotedUsers.length > 0) {
      startAutoScroll();
    }
    
    return () => stopAutoScroll();
  }, [topVotedUsers]);

  // Real-time vote updates (same as VoteRanking component)
  useEffect(() => {
    const handleVoteUpdate = (data) => {
      console.log('🔄 TopVotedCarousel - Vote update received:', data);
      
      // ตรวจสอบว่าเป็นประเภทการโหวตที่เรากำลังแสดงหรือไม่
      if (data.voteType === 'popularity_combined' || 
          data.voteType === 'popularity_male' || 
          data.voteType === 'popularity_female') {
        console.log('🔄 TopVotedCarousel - Refreshing ranking due to vote update');
        // รีเฟรชข้อมูลอันดับ
        fetchTopVotedUsers();
      }
    };

    // ใช้ global socketManager แทนการสร้าง connection ใหม่
    const setupSocketListener = () => {
      if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
        window.socketManager.socket.on('vote-updated', handleVoteUpdate);
        return true;
      }
      return false;
    };

    // ลองตั้งค่า listener ทันที
    let listenerSetup = setupSocketListener();
    
    // ถ้า socket ยังไม่พร้อม ให้รอและลองใหม่
    if (!listenerSetup) {
      const retryInterval = setInterval(() => {
        if (setupSocketListener()) {
          clearInterval(retryInterval);
        }
      }, 2000); // เพิ่ม interval เป็น 2 วินาที

      // หยุดการลองใหม่หลังจาก 30 วินาที
      setTimeout(() => {
        clearInterval(retryInterval);
      }, 30000);
    }

    // Cleanup
    return () => {
      if (window.socketManager && window.socketManager.socket) {
        window.socketManager.socket.off('vote-updated', handleVoteUpdate);
      }
    };
  }, []);


  if (loading) {
    return (
      <div className="relative w-full max-w-xs mx-auto h-[500px] bg-gradient-to-br from-pink-100 to-purple-100 rounded-3xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (topVotedUsers.length === 0) {
    return (
      <div className="relative w-full max-w-xs mx-auto h-[500px] bg-gradient-to-br from-pink-100 to-purple-100 rounded-3xl flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-gray-600 font-medium mb-2">ยังไม่มีข้อมูลการโหวต</p>
          <p className="text-gray-500 text-sm">เริ่มต้นโหวตเพื่อดูอันดับความนิยม</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto h-[500px]">
      {/* Render 3 stacked cards */}
      {topVotedUsers.slice(0, 3).map((userData, index) => {
        // Calculate which card should be shown based on currentIndex
        const cardPosition = (index - currentIndex + topVotedUsers.length) % topVotedUsers.length;
        const isActive = cardPosition === 0;
        const isNext = cardPosition === 1;
        const isPrevious = cardPosition === 2;
        
        let zIndex, scale, translateY, translateX, opacity;
        
        if (isActive) {
          zIndex = 30;
          scale = 1;
          translateY = 0;
          translateX = 0;
          opacity = 1;
        } else if (isNext) {
          zIndex = 20;
          scale = 0.95;
          translateY = 10;
          translateX = 15;
          opacity = 0.8;
        } else {
          zIndex = 10;
          scale = 0.9;
          translateY = 20;
          translateX = -15;
          opacity = 0.6;
        }

        return (
          <div
            key={userData.user?.id || index}
            className="absolute inset-0 transition-all duration-700 ease-in-out"
            style={{
              zIndex,
              transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
              opacity
            }}
          >
            {isActive ? (
              // Active card with full content
              <div 
                className="w-full h-full overflow-hidden shadow-2xl bg-gradient-to-br from-pink-50 to-purple-50 !rounded-[32px]"
                style={{ 
                  borderRadius: '32px !important',
                  clipPath: 'inset(0 round 32px)'
                }}
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  {renderProfileImage(userData)}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  {/* User Info */}
                  <div className="text-white mb-4">
                    <h3 className="text-xl font-bold mb-2">
                      {userData?.displayName || userData?.username}
                    </h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm opacity-90">อันดับ #{userData.rank}</span>
                      <span className="text-sm opacity-75">•</span>
                      <span className="text-sm opacity-90">{userData?.gender === 'male' ? '👨 ชาย' : '👩 หญิง'}</span>
                    </div>
                  </div>

                  {/* Vote Count Badge */}
                  <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full flex items-center space-x-2 shadow-lg">
                    <Heart className="h-4 w-4 text-pink-500" fill="currentColor" />
                    <span className="text-sm font-bold text-gray-800">
                      {voteHelpers.formatVoteCount(userData?.totalVotes || 0)} votes
                    </span>
                  </div>
                  
                </div>
              </div>
            ) : (
              // Inactive card - completely invisible, no border
              <div className="w-full h-full bg-transparent">
                {/* No content for inactive cards - completely hidden */}
              </div>
            )}
          </div>
        );
      })}


      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-4 z-40 flex space-x-2">
        {topVotedUsers.slice(0, 3).map((_, index) => (
          <button
            key={index}
            onClick={() => {
              stopAutoScroll();
              setCurrentIndex(index);
              setTimeout(startAutoScroll, 1000);
            }}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-white shadow-lg scale-125'
                : 'bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>

      {/* Loading Indicator for Image Transitions */}
      <div className="absolute top-4 right-4 z-40">
        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default TopVotedCarousel;
