import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Star, Users, Crown, Medal, Award, TrendingUp, Filter, Search, Loader2 } from 'lucide-react';
import voteRankingAPI from '../services/voteRankingAPI';
import { useToast } from './ui/toast';
import { getMainProfileImage } from '../utils/profileImageUtils';
import { voteHelpers } from '../services/voteAPI';

const VoteRanking = ({ onUserProfileClick = null }) => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('totalVotes');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const { error: showError } = useToast();
  
  // Check if user is logged in
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const isLoggedIn = !!((currentUser._id || currentUser.id) && token);

  const fetchRankings = async (page = 1, sort = sortBy, search = searchQuery, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      console.log('🔍 Fetching rankings with search:', search);
      
      const response = await voteRankingAPI.getVoteRankings({
        page,
        limit: 10,
        voteType: 'popularity_combined',
        sortBy: sort,
        search: search || undefined
      });

      if (response.success && response.data) {
        const rankingData = response.data.rankings || [];
        
        console.log('📊 Received rankings data:', rankingData.length, 'items');
        console.log('📊 Search query was:', search);
        
        if (append) {
          setRankings(prev => [...prev, ...rankingData]);
        } else {
          setRankings(rankingData);
        }
        
        setPagination(response.data.pagination || {});
        setHasMore(response.data.pagination?.hasMore || false);
        setStats({
          totalUsers: response.data.stats?.totalUsers || 0,
          voteType: response.data.stats?.voteType || 'popularity_combined',
          sortBy: sortBy
        });
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
      showError('ไม่สามารถดึงข้อมูลคะแนนโหวตได้');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    if (searchInput !== searchQuery) {
      setIsSearching(true);
    }
    
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchQuery(searchInput);
      }
      setIsSearching(false);
    }, 300); // 300ms delay for better responsiveness

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
    setRankings([]);
    fetchRankings(1, sortBy, searchQuery, false);
  }, [sortBy, searchQuery]);

  // Real-time vote updates
  useEffect(() => {
    const handleVoteUpdate = (data) => {
      console.log('📡 VoteRanking - Received vote-updated event:', data);
      
      // รีเฟรชข้อมูลอันดับเมื่อมีการโหวต
      if (data.voteType === 'popularity_combined' || 
          data.voteType === 'popularity_male' || 
          data.voteType === 'popularity_female') {
        console.log('🔄 VoteRanking - Refreshing rankings due to vote update');
        setCurrentPage(1);
        setRankings([]);
        fetchRankings(1, sortBy, searchQuery, false);
      }
    };

    // ใช้ global socketManager
    const setupSocketListener = () => {
      if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
        console.log('🔌 VoteRanking - Setting up socket listener on existing socket:', window.socketManager.socket.id);
        window.socketManager.socket.on('vote-updated', handleVoteUpdate);
        return true;
      } else {
        console.log('⚠️ VoteRanking - Socket not ready, will retry...');
        return false;
      }
    };

    // ลองตั้งค่า listener ทันที
    let listenerSetup = setupSocketListener();
    
    // ถ้า socket ยังไม่พร้อม ให้รอและลองใหม่
    if (!listenerSetup) {
      const retryInterval = setInterval(() => {
        if (setupSocketListener()) {
          clearInterval(retryInterval);
        }
      }, 1000);

      // หยุดการลองใหม่หลังจาก 10 วินาที
      setTimeout(() => {
        clearInterval(retryInterval);
      }, 10000);
    }

    // Cleanup
    return () => {
      if (window.socketManager && window.socketManager.socket) {
        window.socketManager.socket.off('vote-updated', handleVoteUpdate);
      }
    };
  }, [sortBy, searchQuery]);

  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
  };

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchRankings(nextPage, sortBy, searchQuery, true);
    }
  }, [currentPage, sortBy, searchQuery, loadingMore, hasMore]);

  const getRankIcon = (rank) => {
    if (!rank) return <span className="text-sm font-bold text-gray-600">#-</span>;
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-bold text-gray-600">#{rank}</span>;
  };

  const getMembershipBadge = (membership) => {
    if (!membership || !membership.tier) return null;
    
    const tierColors = {
      'platinum': 'bg-gradient-to-r from-gray-100 to-gray-300 text-gray-800',
      'diamond': 'bg-gradient-to-r from-blue-100 to-blue-300 text-blue-800',
      'vip2': 'bg-gradient-to-r from-purple-100 to-purple-300 text-purple-800',
      'vip1': 'bg-gradient-to-r from-indigo-100 to-indigo-300 text-indigo-800',
      'vip': 'bg-gradient-to-r from-violet-100 to-violet-300 text-violet-800',
      'gold': 'bg-gradient-to-r from-yellow-100 to-yellow-300 text-yellow-800',
      'silver': 'bg-gradient-to-r from-gray-100 to-gray-300 text-gray-800',
      'member': 'bg-gradient-to-r from-green-100 to-green-300 text-green-800'
    };

    const tierNames = {
      'platinum': 'PLATINUM',
      'diamond': 'DIAMOND',
      'vip2': 'VIP2',
      'vip1': 'VIP1',
      'vip': 'VIP',
      'gold': 'GOLD',
      'silver': 'SILVER',
      'member': 'MEMBER'
    };

    return (
      <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${tierColors[membership.tier] || tierColors.member}`}>
        {tierNames[membership.tier] || 'MEMBER'}
      </span>
    );
  };

  // ใช้ voteHelpers.formatVoteCount แทนการสร้าง function เอง

  const getProfileImage = (user) => {
    if (!user || !user.profileImages || user.profileImages.length === 0) {
      return null;
    }
    
    // ใช้ getMainProfileImage เหมือน Popular Vote
    const mainImageIndex = user?.mainProfileImageIndex || 0;
    const imageUrl = getMainProfileImage(
      user.profileImages, 
      mainImageIndex, 
      user._id || user.candidateId
    );
    
    return imageUrl || null;
  };

  if (loading && (!rankings || rankings.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูลคะแนนโหวต...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-3 py-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <Trophy className="w-8 h-8 text-yellow-500 mr-2" />
            <h1 className="text-2xl font-bold text-gray-800">Popular Vote</h1>
          </div>
          <p className="text-gray-600 text-sm">รายการคะแนนโหวตความนิยม</p>
          
          {stats && stats.totalUsers && (
            <div className="mt-3 flex justify-center items-center">
              <div className="flex items-center text-gray-600 text-sm">
                <Users className="w-4 h-4 mr-1" />
                <span>ผู้เข้าร่วม: {stats.totalUsers} คน</span>
              </div>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-3 mb-4">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-500 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            )}
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อหรือ email..."
              value={searchInput}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Sort Options */}
        <div className="bg-white rounded-lg shadow-md p-3 mb-4">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700 font-medium text-sm">เรียงตาม:</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleSortChange('totalVotes')}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  sortBy === 'totalVotes'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Star className="w-3 h-3 inline mr-1" />
                คะแนนรวม
              </button>
              <button
                onClick={() => handleSortChange('uniqueVoters')}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  sortBy === 'uniqueVoters'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Users className="w-3 h-3 inline mr-1" />
                จำนวนผู้โหวต
              </button>
            </div>
          </div>
        </div>

        {/* Rankings List */}
        <div className="space-y-3">
          {rankings && rankings.length > 0 ? rankings.map((user, index) => {
            // Check if this is current user's profile
            const currentUserId = currentUser._id || currentUser.id;
            const isCurrentUser = currentUserId && (
              currentUserId === user._id || 
              currentUserId === user.candidateId
            );

            return (
              <div
                key={user.candidateId}
                className={`bg-white rounded-lg shadow-md p-3 transition-all ${
                  isCurrentUser ? 'cursor-default' : 'hover:shadow-lg cursor-pointer'
                } ${
                  user.rank <= 3 ? 'ring-2 ring-yellow-200' : ''
                }`}
                onClick={() => {
                  // Check if this is current user's profile
                  if (isCurrentUser) {
                    return; // Do nothing for current user
                  }
                  
                  if (!isLoggedIn) {
                    showError('กรุณาเข้าสู่ระบบก่อน');
                    return;
                  }
                  
                  // ใช้ onUserProfileClick ที่มีการตรวจสอบสิทธิ์ตามระดับสมาชิก
                  if (onUserProfileClick && user) {
                    onUserProfileClick(user);
                  } else {
                    showError('ไม่สามารถเข้าถึงโปรไฟล์ได้');
                  }
                }}
              >
              <div className="flex items-center space-x-3">
                {/* Rank */}
                <div className="flex-shrink-0">
                  {getRankIcon(user.rank)}
                </div>

                {/* Profile Image */}
                <div className="flex-shrink-0">
                  {getProfileImage(user) ? (
                    <img
                      src={getProfileImage(user)}
                      alt={user.displayName || user.username}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                      {(user.displayName || user.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-base font-bold text-gray-800 truncate">
                      {user.displayName || `${user.firstName} ${user.lastName}` || user.username}
                    </h3>
                    {/* Current User Indicator */}
                    {isCurrentUser && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                        คุณ
                      </span>
                    )}
                    {getMembershipBadge(user.membership)}
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-gray-600">
                    <div className="flex items-center">
                      <Star className="w-3 h-3 mr-1 text-yellow-500" />
                      <span className="font-medium">{voteHelpers.formatVoteCount(user.totalVotes)} คะแนน</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-3 h-3 mr-1 text-blue-500" />
                      <span>{user.uniqueVoterCount} คนโหวต</span>
                    </div>
                    {user.isOnline && (
                      <div className="flex items-center text-green-600">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                        <span className="text-xs">ออนไลน์</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vote Score Badge */}
                <div className="flex-shrink-0">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-2 rounded-lg shadow-md">
                    <div className="text-center">
                      <div className="text-sm font-bold">
                        {voteHelpers.formatVoteCount(user.totalVotes)}
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
          }) : (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">ยังไม่มีข้อมูลคะแนนโหวต</h3>
              <p className="text-gray-500">เริ่มต้นโหวตให้เพื่อนๆ เพื่อดูอันดับคะแนนโหวต</p>
            </div>
          )}
        </div>

        {/* Load More Button */}
        {hasMore && rankings.length > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังโหลด...</span>
                </>
              ) : (
                <span>โหลดเพิ่มเติม</span>
              )}
            </button>
          </div>
        )}

        {/* No More Data */}
        {!hasMore && rankings.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">แสดงข้อมูลครบทั้งหมดแล้ว</p>
          </div>
        )}

        {/* Loading for pagination */}
        {loading && rankings && rankings.length > 0 && (
          <div className="text-center mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoteRanking;