import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useToast } from './ui/toast';
import { getProfileImageUrl } from '../utils/profileImageUtils';
import { membershipHelpers } from '../services/membershipAPI';
import HeartVote from './HeartVote';
import {
  Heart, 
  MessageCircle, 
  MapPin, 
  Loader2,
  Filter,
  RefreshCw,
  Users,
  Zap,
  X,
  Check,
  Sliders,
  User,
  Calendar,
  CheckCircle,
  Crown,
  Phone,
  Mail,
  GraduationCap,
  Briefcase,
  Home,
  Baby,
  Cigarette,
  Wine,
  Dumbbell,
  Languages,
  Heart as HeartIcon,
  PawPrint,
  Building,
  ArrowLeft
} from 'lucide-react';

const AIMatchingSystem = ({ currentUser }) => {
  const { success, error: showError, warning } = useToast();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Profile Details Modal States
  const [showProfileDetailsModal, setShowProfileDetailsModal] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  
  // Default filters (ไม่ใช้ GPS และระยะทาง)
  const defaultFilters = {
    minAge: 18,
    maxAge: 60,
    gender: 'all',
    lookingFor: 'all',
    onlineOnly: false,
    hasPhoto: false,
    membershipTier: 'all',
    interests: [],
    lifestyle: {
      smoking: 'all',
      drinking: 'all',
      exercise: 'all'
    }
  };

  const [tempFilters, setTempFilters] = useState(defaultFilters);
  const [filters, setFilters] = useState(defaultFilters);
  const [likedUsers, setLikedUsers] = useState(new Set());

  // Function to handle profile like
  const handleProfileLike = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        warning('กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/profile/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: userId })
      });

      const data = await response.json();
      
      if (data.success) {
        setLikedUsers(prev => {
          const newSet = new Set(prev);
          if (newSet.has(userId)) {
            newSet.delete(userId);
            success('ยกเลิกการไลค์แล้ว');
          } else {
            newSet.add(userId);
            success('ไลค์สำเร็จ!');
          }
          return newSet;
        });
      } else {
        warning(data.message || 'ไม่สามารถไลค์ได้');
      }
    } catch (error) {
      console.error('Error liking profile:', error);
      warning('เกิดข้อผิดพลาดในการไลค์');
    }
  };

  // Function to send message
  const sendMessage = (userId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      warning('กรุณาเข้าสู่ระบบก่อน');
      return;
    }

    // REMOVED: Private chat functionality removed
    warning('ระบบแชทถูกลบออกแล้ว');
  };

  // Function to open profile details modal
  const openProfileDetailsModal = (match) => {
    const profileData = {
      id: match.id || match._id,
      name: match.name || 'ไม่ระบุชื่อ',
      age: match.age || null,
      location: match.location || null,
      bio: match.bio || null,
      interests: match.interests?.map(i => typeof i === 'string' ? i : i.category || i.items || 'Interest') || [],
      profileImages: match.profileImages || [],
      verified: match.isVerified || false,
      online: match.isActive || false,
      lastActive: match.lastActive,
      membership: {
        tier: match.membershipTier || 'member'
      },
      // Detailed information
      username: match.username || null,
      firstName: match.firstName || null,
      lastName: match.lastName || null,
      email: match.email || null,
      phone: match.phone || null,
      birthDate: match.birthDate || null,
      gender: match.gender || null,
      lookingFor: match.lookingFor || null,
      education: match.education || null,
      occupation: match.occupation || null,
      height: match.height || null,
      weight: match.weight || null,
      relationshipStatus: match.relationshipStatus || null,
      smoking: match.smoking || null,
      drinking: match.drinking || null,
      exercise: match.exercise || null,
      languages: match.languages || [],
      hobbies: match.hobbies || [],
      profileVideos: match.profileVideos || [],
      religion: match.religion || null,
      pets: match.pets || null,
      children: match.children || null,
      wantChildren: match.wantChildren || null
    };
    
    setSelectedUserProfile(profileData);
    setShowProfileDetailsModal(true);
  };

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    console.log('Token exists:', !!token);
    console.log('User exists:', !!user);
    if (!token || !user) {
      // showError('กรุณาเข้าสู่ระบบก่อน'); // ลบการแจ้งเตือน
      console.error('กรุณาเข้าสู่ระบบก่อน');
    }
  }, []);

  // ฟังก์ชันนับจำนวน filter ที่ใช้
  const countActiveFilters = () => {
    let count = 0;
    if (tempFilters.maxDistance !== 50) count++;
    if (tempFilters.minAge !== 18) count++;
    if (tempFilters.maxAge !== 60) count++;
    if (tempFilters.gender !== 'all') count++;
    if (tempFilters.lookingFor !== 'all') count++;
    if (tempFilters.onlineOnly) count++;
    if (tempFilters.hasPhoto) count++;
    if (tempFilters.membershipTier !== 'all') count++;
    if (tempFilters.interests.length > 0) count++;
    if (tempFilters.lifestyle.smoking !== 'all') count++;
    if (tempFilters.lifestyle.drinking !== 'all') count++;
    if (tempFilters.lifestyle.exercise !== 'all') count++;
    return count;
  };

  // ฟังก์ชันใช้ตัวกรอง
  const applyFilters = () => {
    console.log('🎯 Applying filters:', tempFilters);
    setFilters({ ...tempFilters });
    setFilterCount(countActiveFilters());
    setShowFilterModal(false);
    setPage(1);
    setMatches([]);
    // Will trigger useEffect to refetch
  };

  // ฟังก์ชันรีเซ็ตตัวกรอง
  const resetFilters = () => {
    console.log('🔄 Resetting filters');
    setTempFilters(defaultFilters);
  };

  // ฟังก์ชันเปิด Filter Modal
  const handleOpenFilterModal = () => {
    console.log('🎛️ Opening filter modal');
    setShowFilterModal(true);
  };

  // Watch for filter changes
  useEffect(() => {
    if (userLocation) {
      setPage(1);
      setMatches([]);
      fetchMatches(1, false);
    }
  }, [filters]);

  // ฟังก์ชันดึงข้อมูลผู้ใช้
  const fetchMatches = async (pageNum = 1, append = false, refreshMode = false) => {
    if (!userLocation) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      // showError('กรุณาเข้าสู่ระบบก่อน'); // ลบการแจ้งเตือน
      console.error('กรุณาเข้าสู่ระบบก่อน');
      return;
    }

    if (append) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      // สร้าง query parameters (ไม่ใช้ GPS แล้ว)
      const queryParams = new URLSearchParams({
        page: pageNum,
        limit: 10,
        minAge: filters.minAge,
        maxAge: filters.maxAge,
        refreshMode: refreshMode.toString()
      });

      // เพิ่มตัวกรองเพิ่มเติม (ไม่ใช้ GPS และระยะทาง)
      if (filters.gender !== 'all') queryParams.append('gender', filters.gender);
      if (filters.lookingFor !== 'all') queryParams.append('lookingFor', filters.lookingFor);
      if (filters.onlineOnly) queryParams.append('onlineOnly', 'true');
      if (filters.hasPhoto) queryParams.append('hasPhoto', 'true');
      if (filters.membershipTier !== 'all') queryParams.append('membershipTier', filters.membershipTier);
      if (filters.interests.length > 0) queryParams.append('interests', filters.interests.join(','));
      if (filters.lifestyle.smoking !== 'all') queryParams.append('smoking', filters.lifestyle.smoking);
      if (filters.lifestyle.drinking !== 'all') queryParams.append('drinking', filters.lifestyle.drinking);
      if (filters.lifestyle.exercise !== 'all') queryParams.append('exercise', filters.lifestyle.exercise);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const apiUrl = `${baseUrl}/api/matching/ai-matches?${queryParams.toString()}`;
      console.log('🔍 Calling API:', apiUrl);
      console.log('🔑 Token exists:', !!token);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 Response status:', response.status);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        if (response.status === 401) {
          console.error('❌ Authentication failed - กรุณาเข้าสู่ระบบใหม่');
          showError('กรุณาเข้าสู่ระบบใหม่');
          return;
        }
        
        const contentType = response.headers.get('content-type');
        let errorText;
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorText = errorData.message || JSON.stringify(errorData);
        } else {
          errorText = await response.text();
          console.error('⚠️ Server returned non-JSON response:', errorText.substring(0, 200));
        }
        
        console.error('❌ API Error:', `HTTP ${response.status}: ${errorText}`);
        showError(`เกิดข้อผิดพลาด: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await response.text();
        console.error('❌ Server returned non-JSON response:', errorText.substring(0, 200));
        showError('เซิร์ฟเวอร์ตอบกลับข้อมูลในรูปแบบที่ไม่ถูกต้อง');
        throw new Error('Server returned invalid response format');
      }

      const data = await response.json();
      
      console.log('API Response:', data);
      console.log('Matches:', data.data?.matches);
      console.log('📊 Like counts from API:', data.data?.matches?.map(m => ({ id: m.id || m._id, likeCount: m.likeCount })));
      
      // 🔍 Debug: ตรวจสอบ profileImages ที่ API ส่งมา
      console.log('🖼️ Debug profileImages from API:', data.data?.matches?.map(m => ({
        id: m.id || m._id,
        name: m.displayName || m.firstName,
        profileImages: m.profileImages,
        imageCount: m.profileImages?.length || 0,
        firstImage: m.profileImages?.[0]
      })));
      
      // ดึงข้อมูล likeCount แยก
      const matches = data.data?.matches || [];
      const userIds = matches.map(m => m.id || m._id);
      const likeCountMap = await fetchLikeCounts(userIds);
      
      // รวมข้อมูล likeCount เข้ากับ matches
      const matchesWithLikeCounts = matches.map(match => ({
        ...match,
        likeCount: likeCountMap[match.id || match._id] || 0
      }));
      
      console.log('📊 Matches with like counts:', matchesWithLikeCounts.map(m => ({ id: m.id || m._id, likeCount: m.likeCount })));
      
      if (append) {
        setMatches(prev => [...prev, ...matchesWithLikeCounts]);
      } else {
        setMatches(matchesWithLikeCounts);
      }
      
      setHasMore(data.data?.pagination?.hasMore !== false);
      setTotalUsers(data.data?.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching matches:', error);
      if (!append) {
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้');
      }
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // ฟังก์ชันดึงข้อมูล likeCount สำหรับ matches
  const fetchLikeCounts = async (userIds) => {
    const token = localStorage.getItem('token');
    if (!token || !userIds.length) return {};

    try {
      console.log('🔄 โหลดข้อมูล likeCount สำหรับ matches...');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/profile/members-with-likes?limit=100&page=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Like counts data:', data);
        
        const likeCountMap = {};
        if (data.data?.users) {
          data.data.users.forEach(user => {
            if (userIds.includes(user._id)) {
              likeCountMap[user._id] = user.likeCount || 0;
            }
          });
        }
        
        console.log('📊 Like count map:', likeCountMap);
        return likeCountMap;
      } else {
        console.error('❌ Failed to fetch like counts');
        return {};
      }
    } catch (error) {
      console.error('❌ Error fetching like counts:', error);
      return {};
    }
  };
  const fetchLikedStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      console.log('🔄 โหลดสถานะการกดหัวใจ...');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/matching/liked-users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Liked users data:', data);
        const likedUserIds = new Set(data.data || []);
        setLikedUsers(likedUserIds);
        console.log('🔄 Updated likedUsers:', Array.from(likedUserIds));
      } else {
        console.error('❌ Failed to fetch liked status');
      }
    } catch (error) {
      console.error('❌ Error fetching liked status:', error);
    }
  };

  // ฟังก์ชันรีเฟรช
  const refreshMatches = () => {
    setPage(1);
    setMatches([]);
    setHasMore(true);
    fetchMatches(1, false, true); // ส่ง refreshMode = true
    fetchLikedStatus(); // โหลดสถานะการกดหัวใจด้วย
  };

  // ฟังก์ชันโหลดเพิ่มเติม
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMatches(nextPage, true);
  };


  // ฟังก์ชันไลค์
  const likeMatch = async (userId) => {
    console.log('🔍 likeMatch called with userId:', userId);
    
    const token = localStorage.getItem('token');
    if (!token) {
      // showError('กรุณาเข้าสู่ระบบก่อน'); // ลบการแจ้งเตือน
      console.error('❌ ไม่มี token - กรุณาเข้าสู่ระบบก่อน');
      return;
    }

    const isCurrentlyLiked = likedUsers.has(userId);
    console.log('📊 Current like status:', isCurrentlyLiked);

    try {
      console.log('🚀 Sending API request...');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/matching/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          matchId: userId,
          action: isCurrentlyLiked ? 'unlike' : 'like' // ส่ง action เพื่อบอกว่าจะ like หรือ unlike
        })
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ API Response:', result);
        // success('ส่งไลค์เรียบร้อยแล้ว!'); // ลบการแจ้งเตือน
        console.log(isCurrentlyLiked ? 'ยกเลิกไลค์เรียบร้อยแล้ว!' : 'ส่งไลค์เรียบร้อยแล้ว!');
        
        // อัปเดตสถานะการกดหัวใจใน local state
        setLikedUsers(prev => {
          const newSet = new Set(prev);
          if (isCurrentlyLiked) {
            newSet.delete(userId); // ลบออกถ้ากดซ้ำ
          } else {
            newSet.add(userId); // เพิ่มถ้ากดครั้งแรก
          }
          console.log('🔄 Updated likedUsers:', Array.from(newSet));
          return newSet;
        });

        // อัปเดตจำนวนการกดไลค์แบบ real-time
        setMatches(prevMatches => {
          return prevMatches.map(match => {
            if (match.id === userId || match._id === userId) {
              // ใช้ข้อมูลจาก API response แทนการคำนวณเอง
              return {
                ...match,
                likeCount: result.data?.likeCount || match.likeCount || 0
              };
            }
            return match;
          });
        });

        // ส่ง event เพื่อให้หน้า Discover อัปเดตด้วย
        console.log('📤 AIMatchingSystem sending like-status-changed event:', {
          profileId: userId,
          isLiked: !isCurrentlyLiked,
          likeCount: result.data?.likeCount || 0
        });
        window.dispatchEvent(new CustomEvent('like-status-changed', {
          detail: {
            profileId: userId,
            isLiked: !isCurrentlyLiked,
            likeCount: result.data?.likeCount || 0
          }
        }));
      } else {
        const error = await response.json();
        // showError(error.message || 'เกิดข้อผิดพลาดในการส่งไลค์'); // ลบการแจ้งเตือน
        console.error('❌ API Error:', error.message || 'เกิดข้อผิดพลาดในการจัดการไลค์');
      }
    } catch (error) {
      console.error('❌ Network Error:', error);
      showError('เกิดข้อผิดพลาดในการส่งไลค์');
    }
  };

  // Initialize component
  useEffect(() => {
    console.log('🚀 AI Matching System initialized');
    setUserLocation({ lat: 13.7563, lng: 100.5018 }); // Default Bangkok location
  }, []);



  // Fetch matches when location is available
  useEffect(() => {
    if (userLocation) {
      fetchMatches(1, false);
      fetchLikedStatus(); // โหลดสถานะการกดหัวใจด้วย
    }
  }, [userLocation]);

  // อัปเดตสถานะ online/offline แบบ real-time ทุกๆ 10 วินาที
  useEffect(() => {
    console.log('🔄 Setting up online status interval...');
    
    // อัปเดตทันทีเมื่อ component mount
    const updateOnlineStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('⚠️ No token found, skipping online status update');
          return;
        }

        console.log('🔍 Fetching online status...');
        
        // ดึงข้อมูลผู้ใช้ที่ออนไลน์ล่าสุด
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/users/online-status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Online status response:', result);
          
          if (result.success && result.data) {
            const onlineUsers = result.data.onlineUsers || [];
            console.log(`🟢 Found ${onlineUsers.length} online users:`, onlineUsers.map(u => ({
              id: u._id,
              name: u.displayName || u.username
            })));
            
            // อัปเดตสถานะ online ใน matches
            setMatches(prevMatches => {
              console.log(`📊 Updating online status for ${prevMatches.length} matches`);
              
              const updated = prevMatches.map(match => {
                const matchId = match._id || match.id;
                const isOnline = onlineUsers.some(onlineUser => 
                  onlineUser._id === matchId
                );
                
                if (isOnline !== match.isOnline) {
                  console.log(`🔄 User ${matchId} status changed: ${match.isOnline} -> ${isOnline}`);
                }
                
                return {
                  ...match,
                  isOnline: isOnline,
                  lastActive: match.lastActive
                };
              });
              
              console.log(`✅ Updated ${updated.filter(m => m.isOnline).length} users as online`);
              return updated;
            });
          }
        } else {
          console.error('❌ Failed to fetch online status:', response.status);
        }
      } catch (error) {
        console.error('❌ Error updating online status:', error);
      }
    };
    
    // อัปเดตทันที
    updateOnlineStatus();
    
    // ตั้ง interval
    const interval = setInterval(updateOnlineStatus, 10000);
    console.log('✅ Online status interval set up (every 10s)');

    return () => {
      console.log('🧹 Clearing online status interval');
      clearInterval(interval);
    };
  }, []);

  // ฟัง event เมื่อมีการเปลี่ยนแปลงสถานะการกดไลค์
  useEffect(() => {
    const handler = (event) => {
      console.log('🎯 AIMatchingSystem received like-status-changed event:', event.detail);
      const { profileId, isLiked } = event.detail;
      
      // อัปเดตสถานะการกดไลค์ในหน้า Matches
      setLikedUsers(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(profileId);
        } else {
          newSet.delete(profileId);
        }
        console.log('🔄 Updated likedUsers:', Array.from(newSet));
        return newSet;
      });

      // อัปเดตจำนวนการกดไลค์ในหน้า Matches
      setMatches(prevMatches => {
        console.log('📊 Previous matches:', prevMatches.map(m => ({ id: m.id || m._id, likeCount: m.likeCount })));
        const updatedMatches = prevMatches.map(match => {
          if (match.id === profileId || match._id === profileId) {
            // ใช้ข้อมูลจาก event แทนการคำนวณเอง
            console.log(`🔄 Updating match ${match.id || match._id}: ${match.likeCount} -> ${event.detail.likeCount}`);
            return {
              ...match,
              likeCount: event.detail.likeCount
            };
          }
          return match;
        });
        console.log('📊 Updated matches:', updatedMatches.map(m => ({ id: m.id || m._id, likeCount: m.likeCount })));
        return updatedMatches;
      });
    };
    
    window.addEventListener('like-status-changed', handler);
    return () => window.removeEventListener('like-status-changed', handler);
  }, []);

  // Check if user is authenticated
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">กรุณาเข้าสู่ระบบก่อน</p>
          <p className="text-gray-400 text-sm">คุณต้องเข้าสู่ระบบเพื่อดู AI Matches</p>
          <Button 
            className="mt-4 bg-pink-500 hover:bg-pink-600"
            onClick={() => {
              window.location.href = '/login';
            }}
          >
            เข้าสู่ระบบ
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Custom CSS for slider */}
      <style>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
          border: 3px solid white;
          transition: all 0.2s ease;
        }
        
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(236, 72, 153, 0.6);
        }
        
        .slider-thumb::-moz-range-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
          border: 3px solid white;
        }
        
        .filter-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(252,231,243,0.5));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(236, 72, 153, 0.1);
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Ensure consistent image display */
        .match-image-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .match-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transition: transform 0.3s ease;
        }
        
        .match-image:hover {
          transform: scale(1.05);
        }
        
        /* Modern Card Design - Proportional */
        .match-card {
          height: 100%;
          min-height: 360px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
        }
        
        .match-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }
        
        /* Proportional Card Design */
        @media (max-width: 640px) {
          .match-card {
            min-height: 280px;
            height: 100%;
            border-radius: 12px;
            margin: 0;
          }
          
          .match-image-container {
            height: 160px;
            flex-shrink: 0;
            border-radius: 12px 12px 0 0;
            background: #f8fafc;
          }
          
          .match-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 0.75rem;
          }
          
          .match-card:hover {
            transform: translateY(-2px);
          }
        }
        
        @media (min-width: 641px) and (max-width: 768px) {
          .match-card {
            min-height: 320px;
            border-radius: 14px;
          }
          
          .match-image-container {
            height: 180px;
          }
          
          .match-content {
            padding: 1rem;
          }
        }
        
        @media (min-width: 769px) {
          .match-card {
            min-height: 360px;
            border-radius: 16px;
          }
          
          .match-image-container {
            height: 200px;
          }
          
          .match-content {
            padding: 1.25rem;
          }
        }
        
        /* Proportional Grid Layout */
        .matches-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          grid-auto-rows: 1fr;
          padding: 0 8px;
        }
        
        @media (min-width: 640px) {
          .matches-grid {
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
            padding: 0 12px;
          }
        }
        
        @media (min-width: 1024px) {
          .matches-grid {
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 2rem;
            padding: 0;
          }
        }
        
        /* Fix for content overflow */
        .match-content {
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        /* Proportional Status Dot */
        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          position: relative;
        }
        
        @media (min-width: 640px) {
          .status-dot {
            width: 14px;
            height: 14px;
            border-width: 3px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
          }
        }
        
        /* Proportional Typography */
        @media (max-width: 640px) {
          .match-card h3 {
            font-size: 0.875rem;
            line-height: 1.25rem;
            margin-bottom: 0.25rem;
            font-weight: 600;
          }
          
          .match-card p {
            font-size: 0.75rem;
            line-height: 1.125rem;
            margin-bottom: 0.5rem;
          }
          
          .match-card .text-xs {
            font-size: 0.625rem;
            line-height: 1rem;
            margin-bottom: 0.25rem;
          }
          
          .match-card button {
            height: 2rem;
            font-size: 0.75rem;
            font-weight: 500;
          }
          
          .match-card .mb-1 {
            margin-bottom: 0.25rem;
          }
          
          .match-card .mb-2 {
            margin-bottom: 0.5rem;
          }
          
          .match-card .mb-3 {
            margin-bottom: 0.75rem;
          }
        }
      `}</style>
      
      {/* Mobile-Optimized Header */}
      <div className="bg-gradient-to-br from-pink-100 via-white to-purple-100 rounded-3xl p-4 sm:p-6 shadow-xl border border-pink-200/50 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg sm:rounded-xl text-white shadow-lg">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
              </div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl">AI Smart Matching</span>
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="bg-white px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm border border-pink-200">
                👥 {totalUsers || matches.length} คนในระบบ
              </span>
              <span className="px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm bg-green-100 text-green-700 border border-green-200">
                🚀 AI Smart Matching พร้อมใช้งาน
              </span>
            </div>
            <p className="text-gray-500 text-xs mt-2">
              💡 ระบบ AI จะค้นหาคนที่เหมาะสมกับคุณอัตโนมัติ
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshMatches}
              disabled={loading}
              className="bg-white border-pink-200 hover:bg-pink-50 hover:border-pink-300 transition-all duration-200 shadow-sm text-xs sm:text-sm px-3 sm:px-4 py-2"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎛️ Filter button clicked!');
                handleOpenFilterModal();
              }}
              type="button"
              className="relative bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-xs sm:text-sm px-3 sm:px-4 py-2"
              style={{
                pointerEvents: 'auto',
                zIndex: 50,
                position: 'relative'
              }}
            >
              <Sliders className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">ตัวกรองขั้นสูง</span>
              <span className="sm:hidden">กรอง</span>
              {filterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  {filterCount}
                </span>
              )}
            </Button>
          </div>
        </div>
        
        {/* Quick Filter Bar */}
        {filterCount > 0 && (
          <div className="mt-4 pt-4 border-t border-pink-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-600">ตัวกรองที่ใช้:</span>
              {filters.maxDistance !== 50 && (
                <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  ≤ {filters.maxDistance} กม.
                </span>
              )}
              {(filters.minAge !== 18 || filters.maxAge !== 60) && (
                <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {filters.minAge}-{filters.maxAge} ปี
                </span>
              )}
              {filters.gender !== 'all' && (
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                  {filters.gender === 'male' ? '👨 ชาย' : filters.gender === 'female' ? '👩 หญิง' : '🌈 อื่นๆ'}
                </span>
              )}
              {filters.onlineOnly && (
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  ออนไลน์เท่านั้น
                </span>
              )}
              {filters.membershipTier !== 'all' && (
                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  {filters.membershipTier === 'member' ? '👤 สมาชิก' :
                   filters.membershipTier === 'silver' ? '🥈 Silver' :
                   filters.membershipTier === 'gold' ? '🥇 Gold' :
                   filters.membershipTier === 'vip' ? '👑 VIP' :
                   filters.membershipTier === 'vip1' ? '👑 VIP1' :
                   filters.membershipTier === 'vip2' ? '👑 VIP2' :
                   filters.membershipTier === 'diamond' ? '💎 Diamond' :
                   filters.membershipTier === 'platinum' ? '💠 Platinum' : filters.membershipTier.toUpperCase()}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters(defaultFilters);
                  setTempFilters(defaultFilters);
                  setFilterCount(0);
                }}
                className="text-gray-500 hover:text-gray-700 px-2 py-1 h-auto"
              >
                <X className="h-3 w-3 mr-1" />
                ล้างทั้งหมด
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile-First Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">ผู้ใช้ทั้งหมด</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-pink-500">
                  {totalUsers || matches.length}
                </p>
              </div>
              <Users className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-pink-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">ออนไลน์</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-500">
                  {matches.filter(match => match.isOnline).length}
                </p>
              </div>
              <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-pink-500" />
            <div className="absolute inset-0 rounded-full border-2 border-pink-200"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">กำลังค้นหาคู่ที่เหมาะสม...</p>
          <p className="text-sm text-gray-500 mt-1">ระบบ AI กำลังวิเคราะห์ข้อมูลเพื่อหาคู่ที่ดีที่สุด</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && matches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-violet-100 rounded-full flex items-center justify-center mb-6">
            <Users className="h-12 w-12 text-pink-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข</h3>
          <p className="text-gray-600 text-center mb-6 max-w-md">
            ลองปรับตัวกรองหรือขยายระยะการค้นหาเพื่อพบผู้ใช้ใหม่
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowFilterModal(true)}
              className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              <Filter className="h-4 w-4 mr-2" />
              ปรับตัวกรอง
            </Button>
            <Button
              onClick={refreshMatches}
              variant="outline"
              className="border-pink-200 hover:bg-pink-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเฟรช
            </Button>
          </div>
        </div>
      )}

      {/* Matches Grid */}
      {!loading && matches.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
          {matches.map((match, index) => {
            const displayName = match.name || 'ไม่ระบุชื่อ';
            const age = match.age || 'N/A';
            const location = match.location || 'ไม่ระบุ';
            const bio = match.bio || 'ไม่มีข้อมูล';
            
            // Debug: ตรวจสอบ isOnline status ใน AI Matching (แสดงเฉพาะคนที่ออนไลน์)
            if (match.isOnline) {
              console.log(`🟢 AI Match ${displayName} is ONLINE:`, {
                isOnline: match.isOnline,
                lastActive: match.lastActive,
                userId: match._id || match.id
              });
            }
            const interests = match.interests?.map(i => typeof i === 'string' ? i : i.category || i.items || 'Interest') || [];
            
            return (
          <div
            key={match.id || match._id}
                className="modern-card rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-pink-100/50 transition-all duration-500 hover:-translate-y-2 cursor-pointer group floating-hearts"
              onClick={() => {
                  console.log('🖱️ AI Matching card clicked:', displayName);
                  
                  const token = localStorage.getItem('token');
                  if (!token) {
                    warning('กรุณาเข้าสู่ระบบก่อน');
                    return;
                  }
                  
                const profileData = {
                  id: match.id || match._id,
                    name: displayName,
                    age: parseInt(String(age)) || 0,
                    location: location,
                    bio: bio,
                    interests: interests,
                  images: match.profileImages && match.profileImages.length > 0
                    ? match.profileImages.filter(img => 
                        typeof img === 'string' && !img.startsWith('data:image/svg+xml')
                      ).map(img => 
                        getProfileImageUrl(img, match.id || match._id)
                      )
                    : [],
                  verified: match.isVerified || false,
                    online: match.isOnline || false,
                  lastActive: match.lastActive,
                    membershipTier: match.membershipTier || 'member'
                  };
                  
                  // ใช้ handleViewProfile ที่มีการตรวจสอบสิทธิ์
                  if (window.handleViewProfile) {
                    window.handleViewProfile(profileData);
                  } else if (window.openProfileModal) {
                  window.openProfileModal(profileData);
                } else {
                  console.log('Profile data:', profileData);
                  // Note: This is a fallback, should not happen in normal usage
                }
              }}
            >
                <div className="h-48 sm:h-60 md:h-72 overflow-hidden relative">
              {(() => {
                // แสดงเฉพาะรูปจริง - ไม่มี placeholder
                if (match.profileImages && match.profileImages.length > 0) {
                  const firstImage = match.profileImages[0]
                  
                  if (firstImage && typeof firstImage === 'string') {
                    let imageUrl = null
                    
                    if (firstImage.startsWith('http')) {
                      imageUrl = firstImage
                    } else {
                      imageUrl = getProfileImageUrl(firstImage, match._id)
                    }
                    
                    if (imageUrl && imageUrl !== 'undefined' && imageUrl.trim() !== '') {
                      return (
                        <img 
                          src={imageUrl} 
                          alt={displayName} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      )
                    }
                  }
                }
                
                // ไม่มีรูป - แสดง gradient background พร้อมตัวอักษรแรก
                return (
                  <div className="w-full h-full bg-gradient-to-br from-pink-400 to-violet-400 flex items-center justify-center text-white">
                    <span className="text-4xl font-bold">
                      {displayName?.charAt(0) || 'U'}
                    </span>
                  </div>
                )
              })()}
              
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  
                  {/* Membership Tier Badge */}
                  {match.membershipTier && (
                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                      <Badge className={`text-xs ${
                    match.membershipTier === 'platinum' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                    match.membershipTier === 'diamond' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                    match.membershipTier === 'vip2' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                    match.membershipTier === 'vip1' ? 'bg-gradient-to-r from-orange-500 to-yellow-500' :
                    match.membershipTier === 'vip' ? 'bg-gradient-to-r from-purple-400 to-pink-400' :
                    match.membershipTier === 'gold' ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                    match.membershipTier === 'silver' ? 'bg-gradient-to-r from-gray-400 to-slate-400' :
                    'bg-gradient-to-r from-gray-300 to-gray-400'
                      } text-white shadow-lg`}>
                        {match.membershipTier === 'platinum' ? 'PLATINUM' :
                         match.membershipTier === 'diamond' ? 'DIAMOND' :
                         match.membershipTier === 'vip2' ? 'VIP2' :
                         match.membershipTier === 'vip1' ? 'VIP1' :
                         match.membershipTier === 'vip' ? 'VIP' :
                         match.membershipTier === 'gold' ? 'GOLD' :
                         match.membershipTier === 'silver' ? 'SILVER' :
                         'MEMBER'}
                </Badge>
              </div>
                  )}
                  
                  {/* Vote Score Display - Top Right */}
                  <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
                    <HeartVote
                      candidateId={match._id || match.id}
                      candidateGender={match?.gender || 'male'}
                      candidateDisplayName={displayName}
                      isOwnProfile={false}
                      className=""
                    />
                  </div>

                  <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 text-white">
                    <div className="flex justify-between items-end">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base md:text-lg font-bold truncate text-white mb-1">{displayName}, {age}</h3>
                        <div className="flex items-center text-white/90 text-xs sm:text-sm">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="truncate">{location}</span>
                        </div>
                      </div>
                      <div className="ml-2 flex gap-1 sm:gap-2">
                        {/* Profile Details Button */}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className={`rounded-full transition-all duration-300 hover:scale-110 h-8 w-8 sm:h-10 sm:w-10 ${
                            match.isOnline 
                              ? 'text-green-300 hover:text-green-200 hover:bg-green-400/40 shadow-green-400/50 shadow-lg' 
                              : 'text-gray-500 hover:text-gray-400 hover:bg-gray-500/20'
                          }`}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const token = localStorage.getItem('token');
                            if (!token) {
                              warning('กรุณาเข้าสู่ระบบก่อน');
                              return;
                            }
                            
                            try {
                              // เรียก API เพื่อดึงข้อมูลโปรไฟล์เต็ม
                              const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                              const response = await fetch(`${baseUrl}/api/profile/${match.id || match._id}`, {
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Content-Type': 'application/json'
                                }
                              });
                              
                              if (!response.ok) {
                                throw new Error('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                              }
                              
                              const result = await response.json();
                              if (!result.success) {
                                throw new Error(result.message || 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                              }
                              
                              const fullProfile = result.data.profile;
                              
                              // สร้าง profile data object ที่ครบถ้วน
                              const profileData = {
                                id: fullProfile._id,
                                name: fullProfile.nickname || `${fullProfile.firstName || ''} ${fullProfile.lastName || ''}`.trim() || displayName,
                                age: fullProfile.age || parseInt(String(age)) || 0,
                                location: fullProfile.location || location,
                                bio: fullProfile.bio || bio,
                                interests: Array.isArray(fullProfile.interests)
                                  ? fullProfile.interests.map((it) => it?.category || it?.name || `${it}`).filter(Boolean)
                                  : interests,
                                images: (fullProfile.profileImages || []).filter(img => 
                                  typeof img === 'string' && !img.startsWith('data:image/svg+xml')
                                ).map(img =>
                                  getProfileImageUrl(img, fullProfile._id)
                                ),
                                verified: fullProfile.isVerified || false,
                                online: fullProfile.isOnline || false,
                                lastActive: fullProfile.lastActive,
                                membershipTier: fullProfile.membership?.tier || 'member',
                                // ข้อมูลโปรไฟล์เต็ม
                                username: fullProfile.username || '',
                                firstName: fullProfile.firstName || '',
                                lastName: fullProfile.lastName || '',
                                email: fullProfile.email || '',
                                phone: fullProfile.phone || '',
                                birthDate: fullProfile.birthDate || '',
                                gender: fullProfile.gender || '',
                                lookingFor: fullProfile.lookingFor || '',
                                education: fullProfile.education || '',
                                occupation: fullProfile.occupation || '',
                                height: fullProfile.height || '',
                                weight: fullProfile.weight || '',
                                relationshipStatus: fullProfile.relationshipStatus || '',
                                smoking: fullProfile.smoking || '',
                                drinking: fullProfile.drinking || '',
                                exercise: fullProfile.exercise || '',
                                languages: fullProfile.languages || [],
                                hobbies: fullProfile.hobbies || [],
                                profileVideos: fullProfile.profileVideos || [],
                                religion: fullProfile.religion || '',
                                pets: fullProfile.pets || '',
                                children: fullProfile.children || '',
                                wantChildren: fullProfile.wantChildren || ''
                              };
                              
                              console.log('🎯 AI Matching: Opening full profile modal with complete data:', profileData);
                              
                              // เปิด profile modal พร้อมข้อมูลเต็ม
                if (window.openProfileModal) {
                                window.openProfileModal(profileData, true);
                } else {
                  console.log('Profile data:', profileData);
                  // Note: This is a fallback, should not happen in normal usage
                }
                              
                            } catch (error) {
                              console.error('Error loading full profile:', error);
                              warning('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                            }
                          }}
                        >
                          <User className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                </Button>
                        
                        {/* Heart Button */}
                <Button
                          size="icon" 
                          variant="ghost" 
                          className={`rounded-full transition-all duration-300 hover:scale-110 h-8 w-8 sm:h-10 sm:w-10 ${
                    likedUsers.has(match.id || match._id)
                              ? 'text-red-500'
                              : 'text-white hover:text-pink-300 hover:bg-white/20'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                            
                            const token = localStorage.getItem('token');
                            if (!token) {
                              warning('กรุณาเข้าสู่ระบบก่อน');
                              return;
                            }
                            
                            const userId = match.id || match._id;
                            handleProfileLike(userId);
                          }}
                        >
                          <Heart className={`h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 ${
                            likedUsers.has(match.id || match._id) ? 'fill-current' : ''
                          }`} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile-First Load More Button */}
      {!loading && hasMore && matches.length > 0 && (
        <div className="flex justify-center py-6 sm:py-8">
          <Button
            size="sm"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white px-4 sm:px-6 md:px-8 py-2 sm:py-3 text-sm sm:text-base"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 animate-spin" />
                <span className="text-xs sm:text-sm">กำลังโหลด...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">โหลดเพิ่มเติม ({matches.length}/{totalUsers})</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Mobile-First No More */}
      {!hasMore && matches.length > 0 && (
        <div className="text-center py-6 sm:py-8">
          <div className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-gray-100 rounded-full">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            <p className="text-gray-600 font-medium text-sm sm:text-base">แสดงครบ {matches.length} คนแล้ว</p>
          </div>
        </div>
      )}

      {/* Mobile-First No Matches */}
      {!loading && !isLoadingMore && matches.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <Users className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <p className="text-gray-500 mb-2 text-sm sm:text-base">ไม่พบผู้ใช้ในระบบ</p>
          <p className="text-gray-400 text-xs sm:text-sm">อาจเป็นเพราะยังไม่มีผู้ใช้อื่นในระบบ หรือเกิดข้อผิดพลาดในการโหลดข้อมูล</p>
        </div>
      )}

      {/* Filter Modal */}
      <Dialog
        open={showFilterModal}
        onOpenChange={(open) => {
          console.log('🎛️ Dialog state changing:', open);
          setShowFilterModal(open);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-white via-pink-50 to-violet-50 w-[95vw] sm:w-[90vw] md:w-[80vw] lg:max-w-4xl">
          <DialogHeader className="pb-4 sm:pb-6 border-b border-pink-200">
            <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-semibold bg-gradient-to-r from-pink-600 to-violet-600 bg-clip-text text-transparent">
              <div className="p-2 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg text-white">
                <Sliders className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              ตัวกรองการค้นหาคู่
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2 text-sm sm:text-base">
              ปรับแต่งตัวกรองเพื่อค้นหาคู่ที่เหมาะสมกับคุณมากที่สุด
            </DialogDescription>
            {/* แสดงจำนวนตัวกรองที่ใช้ */}
            {countActiveFilters() > 0 && (
              <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-300 rounded-full px-4 py-2 text-sm text-pink-700 font-medium">
                <Filter className="h-4 w-4" />
                กำลังใช้ตัวกรอง {countActiveFilters()} รายการ
              </div>
            )}
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mt-4 sm:mt-6">
            {/* คอลัมน์ซ้าย - ตัวกรองพื้นฐาน */}
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-pink-100">
                
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-pink-100">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                  <Users className="h-5 w-5 text-violet-500" />
                  ข้อมูลพื้นฐาน
                </h3>
                
                {/* อายุ */}
                <div className="space-y-3 mb-6">
                  <Label className="text-sm font-medium text-gray-700">ช่วงอายุที่สนใจ</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minAge" className="text-xs text-gray-500">อายุต่ำสุด</Label>
                      <div className="relative">
                        <Input
                          id="minAge"
                          type="number"
                          min="18"
                          max="100"
                          value={tempFilters.minAge}
                          onChange={(e) => setTempFilters({...tempFilters, minAge: parseInt(e.target.value)})}
                          className="border-pink-200 focus:border-pink-400 focus:ring-pink-300"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">ปี</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxAge" className="text-xs text-gray-500">อายุสูงสุด</Label>
                      <div className="relative">
                        <Input
                          id="maxAge"
                          type="number"
                          min="18"
                          max="100"
                          value={tempFilters.maxAge}
                          onChange={(e) => setTempFilters({...tempFilters, maxAge: parseInt(e.target.value)})}
                          className="border-pink-200 focus:border-pink-400 focus:ring-pink-300"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">ปี</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* เพศ */}
                <div className="space-y-3 mb-6">
                  <Label className="text-sm font-medium text-gray-700">เพศที่ต้องการดู</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {['all', 'male', 'female', 'other'].map((gender) => (
                      <Button
                        key={gender}
                        variant={tempFilters.gender === gender ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTempFilters({...tempFilters, gender})}
                        className={`transition-all duration-200 ${
                          tempFilters.gender === gender
                            ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg scale-105'
                            : 'border-pink-200 hover:border-pink-300 hover:bg-pink-50'
                        }`}
                      >
                        {gender === 'all' ? '🌟 ทั้งหมด' :
                         gender === 'male' ? '👨 ชาย' :
                         gender === 'female' ? '👩 หญิง' : '🌈 อื่นๆ'}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* กำลังมองหา */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">กำลังมองหาเพศใด</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {['all', 'male', 'female', 'both'].map((looking) => (
                      <Button
                        key={looking}
                        variant={tempFilters.lookingFor === looking ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTempFilters({...tempFilters, lookingFor: looking})}
                        className={`transition-all duration-200 ${
                          tempFilters.lookingFor === looking
                            ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg scale-105'
                            : 'border-violet-200 hover:border-violet-300 hover:bg-violet-50'
                        }`}
                      >
                        {looking === 'all' ? '🌟 ทั้งหมด' :
                         looking === 'male' ? '👨 ชาย' :
                         looking === 'female' ? '👩 หญิง' : '💝 ทั้งสองเพศ'}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* คอลัมน์ขวา - ตัวกรองขั้นสูง */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-violet-100">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  ระดับสมาชิก
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {['all', 'member', 'silver', 'gold', 'vip', 'vip1', 'vip2', 'diamond', 'platinum'].map((tier) => (
                    <Button
                      key={tier}
                      variant={tempFilters.membershipTier === tier ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTempFilters({...tempFilters, membershipTier: tier})}
                      className={`transition-all duration-200 ${
                        tempFilters.membershipTier === tier
                          ? tier === 'platinum' ? 'bg-gradient-to-r from-gray-600 to-gray-800 text-white shadow-lg scale-105' :
                            tier === 'diamond' ? 'bg-blue-500 text-white shadow-lg scale-105' :
                            tier === 'vip2' ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-lg scale-105' :
                            tier === 'vip1' ? 'bg-gradient-to-r from-purple-500 to-purple-700 text-white shadow-lg scale-105' :
                            tier === 'vip' ? 'bg-purple-500 text-white shadow-lg scale-105' :
                            tier === 'gold' ? 'bg-yellow-500 text-white shadow-lg scale-105' :
                            tier === 'silver' ? 'bg-gray-500 text-white shadow-lg scale-105' :
                            'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg scale-105'
                          : `border-gray-200 hover:bg-gray-50 ${
                            tier === 'platinum' ? 'hover:border-gray-400 hover:bg-gray-100' :
                            tier === 'diamond' ? 'hover:border-blue-300 hover:bg-blue-50' :
                            tier === 'vip2' ? 'hover:border-purple-400 hover:bg-purple-50' :
                            tier === 'vip1' ? 'hover:border-purple-300 hover:bg-purple-50' :
                            tier === 'vip' ? 'hover:border-purple-300 hover:bg-purple-50' :
                            tier === 'gold' ? 'hover:border-yellow-300 hover:bg-yellow-50' :
                            tier === 'silver' ? 'hover:border-gray-300' : ''
                          }`
                      }`}
                    >
                      {tier === 'all' ? '🌟 ทั้งหมด' :
                       tier === 'member' ? '👤 สมาชิก' :
                       tier === 'silver' ? '🥈 Silver' :
                       tier === 'gold' ? '🥇 Gold' :
                       tier === 'vip' ? '👑 VIP' :
                       tier === 'vip1' ? '👑 VIP1' :
                       tier === 'vip2' ? '👑 VIP2' :
                       tier === 'diamond' ? '💎 Diamond' :
                       tier === 'platinum' ? '💠 Platinum' : tier}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-green-100">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                  <Zap className="h-5 w-5 text-green-500" />
                  ตัวเลือกพิเศษ
                </h3>
                
                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-green-100 hover:bg-green-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={tempFilters.onlineOnly}
                      onChange={(e) => setTempFilters({...tempFilters, onlineOnly: e.target.checked})}
                      className="w-5 h-5 text-green-600 border-green-300 rounded focus:ring-green-500"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">แสดงเฉพาะผู้ใช้ออนไลน์</span>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-blue-100 hover:bg-blue-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={tempFilters.hasPhoto}
                      onChange={(e) => setTempFilters({...tempFilters, hasPhoto: e.target.checked})}
                      className="w-5 h-5 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📸</span>
                      <span className="text-sm font-medium text-gray-700">แสดงเฉพาะผู้ใช้ที่มีรูปภาพ</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-purple-100">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                  <Heart className="h-5 w-5 text-purple-500" />
                  ไลฟ์สไตล์
                </h3>
                
                {/* สูบบุหรี่ */}
                <div className="space-y-3 mb-4">
                  <Label className="text-sm text-gray-600 flex items-center gap-2">
                    🚬 การสูบบุหรี่
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['all', 'no', 'yes', 'sometimes'].map((option) => (
                      <Button
                        key={option}
                        variant={tempFilters.lifestyle.smoking === option ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTempFilters({
                          ...tempFilters,
                          lifestyle: {...tempFilters.lifestyle, smoking: option}
                        })}
                        className={`text-xs transition-all duration-200 ${
                          tempFilters.lifestyle.smoking === option
                            ? 'bg-red-500 text-white shadow-lg scale-105'
                            : 'border-red-200 hover:border-red-300 hover:bg-red-50'
                        }`}
                      >
                        {option === 'all' ? 'ทั้งหมด' :
                         option === 'no' ? '🚭 ไม่สูบ' :
                         option === 'yes' ? '🚬 สูบ' : '💨 บางครั้ง'}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* ดื่มเหล้า */}
                <div className="space-y-3 mb-4">
                  <Label className="text-sm text-gray-600 flex items-center gap-2">
                    🍷 การดื่มเหล้า
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['all', 'no', 'yes', 'social'].map((option) => (
                      <Button
                        key={option}
                        variant={tempFilters.lifestyle.drinking === option ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTempFilters({
                          ...tempFilters,
                          lifestyle: {...tempFilters.lifestyle, drinking: option}
                        })}
                        className={`text-xs transition-all duration-200 ${
                          tempFilters.lifestyle.drinking === option
                            ? 'bg-amber-500 text-white shadow-lg scale-105'
                            : 'border-amber-200 hover:border-amber-300 hover:bg-amber-50'
                        }`}
                      >
                        {option === 'all' ? 'ทั้งหมด' :
                         option === 'no' ? '🚫 ไม่ดื่ม' :
                         option === 'yes' ? '🍷 ดื่ม' : '🎉 งานสังคม'}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* ออกกำลังกาย */}
                <div className="space-y-3">
                  <Label className="text-sm text-gray-600 flex items-center gap-2">
                    💪 การออกกำลังกาย
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['all', 'regularly', 'sometimes', 'never'].map((option) => (
                      <Button
                        key={option}
                        variant={tempFilters.lifestyle.exercise === option ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTempFilters({
                          ...tempFilters,
                          lifestyle: {...tempFilters.lifestyle, exercise: option}
                        })}
                        className={`text-xs transition-all duration-200 ${
                          tempFilters.lifestyle.exercise === option
                            ? 'bg-green-500 text-white shadow-lg scale-105'
                            : 'border-green-200 hover:border-green-300 hover:bg-green-50'
                        }`}
                      >
                        {option === 'all' ? 'ทั้งหมด' :
                         option === 'regularly' ? '🏃 สม่ำเสมอ' :
                         option === 'sometimes' ? '🚶 บางครั้ง' : '😴 ไม่ออก'}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-First ปุ่มด้านล่าง */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-pink-200">
            <Button
              variant="outline"
              onClick={resetFilters}
              className="flex-1 py-2 sm:py-3 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-sm sm:text-base"
              size="sm"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              รีเซ็ตทั้งหมด
            </Button>
            <Button
              onClick={applyFilters}
              size="sm"
              className="flex-1 py-2 sm:py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-violet-500 hover:from-pink-600 hover:via-purple-600 hover:to-violet-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-sm sm:text-base"
            >
              <Check className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              ค้นหาเลย ({totalUsers || 0} คน)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Details Modal */}
      <Dialog open={showProfileDetailsModal} onOpenChange={setShowProfileDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {selectedUserProfile && (
            <div className="relative">
              {/* Header with Background - ล็อคความสูงไม่ให้เปลี่ยนตามภาพโปรไฟล์ */}
              <div className="relative h-48 bg-gradient-to-br from-purple-500 via-pink-500 to-violet-600 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-4 left-4 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
                  <div className="absolute top-16 right-8 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                  <div className="absolute bottom-8 left-1/3 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => setShowProfileDetailsModal(false)}
                  className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                
                {/* Profile Header Info - ล็อคตำแหน่งที่ด้านล่างของ header ไม่ให้เลื่อนตามภาพโปรไฟล์ */}
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <div className="flex items-end gap-4">
                    {/* Profile Image */}
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center overflow-hidden">
                        {selectedUserProfile.profileImages && selectedUserProfile.profileImages.length > 0 ? (
                          <img 
                            src={getProfileImageUrl(selectedUserProfile.profileImages[0], selectedUserProfile.id)}
                            alt={selectedUserProfile.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-12 w-12 text-white/80" />
                        )}
                      </div>
                      {selectedUserProfile.verified && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Basic Info */}
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-white mb-1">
                        {selectedUserProfile.name}
                        {selectedUserProfile.age && `, ${selectedUserProfile.age}`}
                      </h2>
                      <div className="flex items-center gap-4 text-white/90">
                        {selectedUserProfile.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm">{selectedUserProfile.location}</span>
                          </div>
                        )}
                        <div className={`flex items-center gap-1 ${selectedUserProfile.isOnline ? 'text-green-300' : 'text-gray-300'}`}>
                          <div className={`h-2 w-2 rounded-full ${selectedUserProfile.isOnline ? 'bg-green-300 animate-pulse' : 'bg-gray-400'}`}></div>
                          <span className="text-sm">
                            {selectedUserProfile.isOnline ? 
                              `ออนไลน์ (${selectedUserProfile.lastActive ? new Date(selectedUserProfile.lastActive).toLocaleTimeString('th-TH') : 'ไม่ทราบ'})` : 
                              'ออฟไลน์'
                            }
                          </span>
                        </div>
                        {selectedUserProfile.membership.tier !== 'member' && (
                          <div className="flex items-center gap-1 text-yellow-300">
                            <Crown className="h-4 w-4" />
                            <span className="text-sm capitalize">{selectedUserProfile.membership.tier}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Bio Section */}
                {selectedUserProfile.bio && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">เกี่ยวกับฉัน</h3>
                    <p className="text-gray-600 leading-relaxed">{selectedUserProfile.bio}</p>
                  </div>
                )}
                
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">ข้อมูลพื้นฐาน</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedUserProfile.age && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">อายุ</span>
                          <p className="text-gray-600">{selectedUserProfile.age} ปี</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedUserProfile.gender && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <User className="h-5 w-5 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">เพศ</span>
                          <p className="text-gray-600">{selectedUserProfile.gender === 'male' ? 'ชาย' : selectedUserProfile.gender === 'female' ? 'หญิง' : selectedUserProfile.gender}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedUserProfile.education && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <GraduationCap className="h-5 w-5 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">การศึกษา</span>
                          <p className="text-gray-600">{selectedUserProfile.education}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedUserProfile.occupation && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Briefcase className="h-5 w-5 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">อาชีพ</span>
                          <p className="text-gray-600">{selectedUserProfile.occupation}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedUserProfile.height && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <User className="h-5 w-5 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">ส่วนสูง</span>
                          <p className="text-gray-600">{selectedUserProfile.height} ซม.</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedUserProfile.relationshipStatus && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <HeartIcon className="h-5 w-5 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">สถานะความสัมพันธ์</span>
                          <p className="text-gray-600">{selectedUserProfile.relationshipStatus}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Lifestyle Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">ไลฟ์สไตล์</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedUserProfile.smoking && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Cigarette className="h-5 w-5 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">การสูบบุหรี่</span>
                          <p className="text-gray-600">{selectedUserProfile.smoking}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedUserProfile.drinking && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Wine className="h-5 w-5 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">การดื่มแอลกอฮอล์</span>
                          <p className="text-gray-600">{selectedUserProfile.drinking}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedUserProfile.exercise && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Dumbbell className="h-5 w-5 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">การออกกำลังกาย</span>
                          <p className="text-gray-600">{selectedUserProfile.exercise}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedUserProfile.religion && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Building className="h-5 w-5 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">ศาสนา</span>
                          <p className="text-gray-600">{selectedUserProfile.religion}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Interests */}
                {selectedUserProfile.interests && selectedUserProfile.interests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">ความสนใจ</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedUserProfile.interests.map((interest, index) => (
                        <Badge key={index} variant="secondary" className="px-3 py-1 bg-purple-100 text-purple-700 border-purple-200">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Additional Information */}
                {(selectedUserProfile.pets || selectedUserProfile.children || selectedUserProfile.wantChildren) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">ข้อมูลเพิ่มเติม</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedUserProfile.pets && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <PawPrint className="h-5 w-5 text-gray-500" />
                          <div>
                            <span className="text-sm font-medium text-gray-700">สัตว์เลี้ยง</span>
                            <p className="text-gray-600">{selectedUserProfile.pets}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedUserProfile.children && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Baby className="h-5 w-5 text-gray-500" />
                          <div>
                            <span className="text-sm font-medium text-gray-700">มีลูกแล้ว</span>
                            <p className="text-gray-600">{selectedUserProfile.children}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedUserProfile.wantChildren && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Baby className="h-5 w-5 text-gray-500" />
                          <div>
                            <span className="text-sm font-medium text-gray-700">ต้องการมีลูก</span>
                            <p className="text-gray-600">{selectedUserProfile.wantChildren}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Contact Actions */}
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <Button
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => {
                      // Handle message action
                      console.log('Message user:', selectedUserProfile.name);
                      setShowProfileDetailsModal(false);
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    ส่งข้อความ
                  </Button>
                  
                  <Button
                    className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
                    onClick={() => {
                      // Handle like action
                      console.log('Like user:', selectedUserProfile.name);
                      setShowProfileDetailsModal(false);
                    }}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    ส่งหัวใจ
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIMatchingSystem;