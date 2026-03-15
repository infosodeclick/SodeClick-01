import React, { useState, useEffect } from 'react';
import { Trophy, Heart, Users, Crown, Medal, Award, Star } from 'lucide-react';
import { getMainProfileImageGuest } from '../utils/profileImageUtils';
import { useToast } from './ui/toast';
import { voteHelpers } from '../services/voteAPI';

const Top5Ranking = ({ 
  voteType = 'popularity_combined',
  className = '',
  onUserProfileClick = null
}) => {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState({});
  const { warning } = useToast();
  
  // Check if user is logged in
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const isLoggedIn = !!((currentUser._id || currentUser.id) && token);

  // สร้างสี avatar ตามชื่อผู้ใช้
  const getAvatarColor = (name) => {
    const colors = [
      'from-red-500 to-pink-500',
      'from-blue-500 to-indigo-500', 
      'from-green-500 to-teal-500',
      'from-purple-500 to-violet-500',
      'from-orange-500 to-red-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-purple-500',
      'from-teal-500 to-cyan-500',
      'from-yellow-500 to-orange-500',
      'from-violet-500 to-purple-500'
    ];
    const index = (name || '').charCodeAt(0) % colors.length;
    return colors[index];
  };

  // ดึงข้อมูลอันดับ
  const fetchRanking = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/vote/ranking?voteType=${voteType}&limit=5&sortBy=totalVotes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const rankingData = result.data.rankings || [];
        
        // ใช้ข้อมูลรูปภาพจาก vote API โดยตรง
        const profilesMap = {};
        rankingData.forEach(item => {
          if (item.candidateId) {
            profilesMap[item.candidateId] = {
              userId: item.candidateId,
              profileImages: item.profileImages || [],
              mainProfileImageIndex: 0
            };
          }
        });
        
        setUserProfiles(profilesMap);
        setRanking(rankingData);
      } else {
        setRanking([]);
      }
    } catch (error) {
      console.error('Error fetching top 3 ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลเมื่อ component mount
  useEffect(() => {
    fetchRanking();
  }, [voteType]);

  // Real-time vote updates
  useEffect(() => {
    const handleVoteUpdate = (data) => {
      if (data.voteType === voteType) {
        fetchRanking();
      }
    };

    const setupSocketListener = () => {
      if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
        window.socketManager.socket.on('vote-updated', handleVoteUpdate);
        return true;
      } else {
        return false;
      }
    };

    let listenerSetup = setupSocketListener();
    
    if (!listenerSetup) {
      const retryInterval = setInterval(() => {
        if (setupSocketListener()) {
          clearInterval(retryInterval);
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(retryInterval);
      }, 10000);
    }

    return () => {
      if (window.socketManager && window.socketManager.socket) {
        window.socketManager.socket.off('vote-updated', handleVoteUpdate);
      }
    };
  }, [voteType]);

  // Get rank styling
  const getRankStyling = (index) => {
    const rank = index + 1;
    if (rank === 1) {
      return {
        container: "bg-gradient-to-br from-yellow-100 via-amber-50 to-yellow-100 border-2 border-yellow-300 shadow-2xl",
        profile: "border-4 border-yellow-400 shadow-2xl",
        badge: "bg-gradient-to-r from-yellow-500 to-amber-500 shadow-xl",
        icon: "text-yellow-600",
        glow: "shadow-yellow-200"
      };
    } else if (rank === 2) {
      return {
        container: "bg-gradient-to-br from-gray-100 via-slate-50 to-gray-100 border-2 border-gray-300 shadow-xl",
        profile: "border-3 border-gray-400 shadow-xl",
        badge: "bg-gradient-to-r from-gray-500 to-slate-500 shadow-lg",
        icon: "text-gray-600",
        glow: "shadow-gray-200"
      };
    } else if (rank === 3) {
      return {
        container: "bg-gradient-to-br from-amber-100 via-orange-50 to-amber-100 border-2 border-amber-300 shadow-xl",
        profile: "border-3 border-amber-400 shadow-xl",
        badge: "bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg",
        icon: "text-amber-600",
        glow: "shadow-amber-200"
      };
    } else if (rank === 4) {
      return {
        container: "bg-gradient-to-br from-blue-100 via-indigo-50 to-blue-100 border-2 border-blue-300 shadow-xl",
        profile: "border-3 border-blue-400 shadow-xl",
        badge: "bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg",
        icon: "text-blue-600",
        glow: "shadow-blue-200"
      };
    } else if (rank === 5) {
      return {
        container: "bg-gradient-to-br from-purple-100 via-violet-50 to-purple-100 border-2 border-purple-300 shadow-xl",
        profile: "border-3 border-purple-400 shadow-xl",
        badge: "bg-gradient-to-r from-purple-500 to-violet-500 shadow-lg",
        icon: "text-purple-600",
        glow: "shadow-purple-200"
      };
    }
    return {};
  };

  // Get rank icon
  const getRankIcon = (index) => {
    const rank = index + 1;
    if (rank === 1) {
      return (
        <div className="relative animate-float">
          <Crown className="h-8 w-8 text-yellow-600 animate-pulse" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full animate-pulse"></div>
        </div>
      );
    } else if (rank === 2) {
      return <Medal className="h-7 w-7 text-gray-600 animate-pulse" />;
    } else if (rank === 3) {
      return <Award className="h-7 w-7 text-amber-600 animate-pulse" />;
    } else if (rank === 4) {
      return <Trophy className="h-7 w-7 text-blue-600 animate-pulse" />;
    } else if (rank === 5) {
      return <Star className="h-7 w-7 text-purple-600 animate-pulse" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-purple-50 via-pink-50 to-white rounded-xl p-6 shadow-lg border border-purple-100 ${className}`}>
        <div className="flex items-center justify-center space-x-2 mb-6">
          <Trophy className="h-8 w-8 text-amber-500 animate-spin" />
          <h3 className="font-bold text-gray-800 text-xl">กำลังโหลด...</h3>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={`loading-${i}`} className="animate-pulse bg-gray-200 rounded-xl p-4 h-20"></div>
          ))}
        </div>
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-purple-50 via-pink-50 to-white rounded-xl p-6 shadow-lg border border-purple-100 ${className}`}>
        <div className="flex items-center justify-center space-x-2 mb-6">
          <div className="relative">
            <Trophy className="h-8 w-8 text-amber-500 animate-bounce" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
          </div>
          <h3 className="font-bold text-gray-800 text-xl">
            🏆 Popular Vote
          </h3>
        </div>
        
        <div className="text-center space-y-4">
          <div className="animate-bounce">
            <p className="text-gray-600 font-medium text-lg">
              ยังไม่มีข้อมูลการโหวต
            </p>
          </div>
          <p className="text-sm text-gray-500 animate-pulse">
            เริ่มต้นโหวตเพื่อดูอันดับความนิยม
          </p>
          
          {/* Decorative elements */}
          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-3 h-3 bg-pink-400 rounded-full animate-ping" style={{animationDelay: '0s'}}></div>
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
            <div className="w-3 h-3 bg-amber-400 rounded-full animate-ping" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-purple-50 via-pink-50 to-white rounded-xl p-4 shadow-lg border border-purple-100 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-center space-x-2 mb-6">
        <div className="relative">
          <Trophy className="h-10 w-10 text-amber-500 animate-bounce" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
        </div>
        <h3 className="font-bold text-gray-800 text-2xl">
          🏆 Top 5 Popular Vote
        </h3>
      </div>

      {/* Top 5 Rankings */}
      <div className="space-y-4">
        {ranking.map((item, index) => {
          const totalVotes = item.totalVotes || 0;
          const uniqueVoters = item.uniqueVoterCount || 0;
          const styling = getRankStyling(index);
          const rank = index + 1;

          return (
            <div
              key={item.candidateId || `ranking-${index}`}
              className={`${styling.container} ${styling.glow} rounded-2xl p-4 transition-all duration-700 hover:scale-105 hover:shadow-2xl cursor-pointer transform animate-fadeInUp`}
              style={{
                animationDelay: `${index * 0.3}s`,
              }}
              onClick={() => {
                if (!isLoggedIn) {
                  warning('กรุณาเข้าสู่ระบบก่อน');
                  return;
                }
                
                // Navigate to user profile
                if (onUserProfileClick && item) {
                  onUserProfileClick(item);
                } else {
                  // Default navigation to profile page
                  const profileUrl = `/profile/${item._id || item.candidateId}`;
                  window.location.href = profileUrl;
                }
              }}
            >
              <div className="flex items-center space-x-4">
                {/* Rank Icon */}
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12">
                  {getRankIcon(index)}
                </div>

                {/* Profile Image */}
                <div className="flex-shrink-0">
                  <div className={`w-16 h-16 rounded-full overflow-hidden ${styling.profile} bg-gray-100 transition-all duration-500 hover:scale-110 hover:rotate-3`}>
                    {(() => {
                      const userProfile = userProfiles[item.candidateId];
                      const profileImages = userProfile?.profileImages || [];
                      const mainProfileImageIndex = userProfile?.mainProfileImageIndex || 0;
                      
                      const mainImage = getMainProfileImageGuest(profileImages, mainProfileImageIndex, item.candidateId, item.gender);
                      
                      if (mainImage && mainImage.trim() !== '' && !mainImage.startsWith('data:image/svg+xml')) {
                        return (
                          <img
                            src={mainImage}
                            alt={item.displayName || item.username || 'ผู้ใช้'}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const parentDiv = e.target.parentElement;
                              if (parentDiv) {
                                const userName = item.displayName || item.username || '?';
                                const avatarColor = getAvatarColor(userName);
                                parentDiv.innerHTML = `
                                  <div class="w-full h-full bg-gradient-to-br ${avatarColor} flex items-center justify-center">
                                    <span class="text-white font-bold text-2xl drop-shadow-lg">
                                      ${String(userName).charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                `;
                              }
                            }}
                          />
                        );
                      } else {
                        return (
                          <div className={`w-full h-full bg-gradient-to-br ${getAvatarColor(item.displayName || item.username)} flex items-center justify-center`}>
                            <span className="text-white font-bold text-2xl drop-shadow-lg">
                              {String(item.displayName || item.username || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-lg font-bold text-gray-900 truncate">
                      {item.displayName || item.username || 'ผู้ใช้ไม่ระบุชื่อ'}
                    </h4>
                    {/* Online Status Indicator */}
                    <div className={`h-2 w-2 rounded-full ${item.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} 
                         title={item.isOnline ? 'ออนไลน์' : 'ออฟไลน์'}></div>
                    {item.membership?.tier && item.membership.tier !== 'member' && (
                      <Crown className="h-4 w-4 text-amber-500 animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <span className="flex items-center space-x-1">
                      <Users className="h-3 w-3 text-blue-500" />
                      <span>{uniqueVoters.toLocaleString()} คนโหวต</span>
                    </span>
                  </div>
                </div>

                {/* Vote Score Badge */}
                <div className="flex-shrink-0">
                  <div className={`${styling.badge} text-white px-4 py-3 rounded-xl shadow-xl transform transition-all duration-500 hover:scale-110 hover:rotate-2`}>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {voteHelpers.formatVoteCount(totalVotes)}
                      </div>
                      <div className="text-xs opacity-90">
                        คะแนน
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more indicator */}
      {ranking.length > 0 && (
        <div className="text-center mt-6">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-500 animate-pulse">
            <Star className="h-4 w-4 text-amber-500" />
            <span>อันดับความนิยม 5 อันดับสูงสุด</span>
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Top5Ranking;
