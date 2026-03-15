import React, { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import voteAPI, { voteHelpers } from '../services/voteAPI';
import { useToast } from './ui/toast';
import './HeartVote.css';

const HeartVote = ({ 
  candidateId, 
  candidateGender = 'male',
  candidateDisplayName = 'ผู้ใช้',
  isOwnProfile = false,
  className = '',
  // เพิ่ม props สำหรับข้อมูลโหวตที่ส่งมาจาก parent
  totalVotes: propTotalVotes = null,
  uniqueVoterCount: propUniqueVoterCount = null,
  hasVoted: propHasVoted = null
}) => {
  const [voteStatus, setVoteStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const { success, error: showError } = useToast();
  const retryTimeoutRef = useRef(null);
  const handleSocketReadyRef = useRef(null);

  // กำหนดประเภทการโหวตตามเพศ
  const voteType = voteHelpers.getVoteTypeByGender(candidateGender);
  
  // ดึงข้อมูล user ปัจจุบัน
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const voterId = currentUser._id || currentUser.id;
  const isLoggedIn = !!(voterId && token);

  // Debug logs (simplified)
  console.log('🗳️ HeartVote:', { candidateId, voteType, voterId, isLoggedIn });

  // ดึงสถานะการโหวต
  const fetchVoteStatus = async () => {
    try {
      // ถ้ามี propTotalVotes แล้ว ให้ดึงเฉพาะ hasVoted เท่านั้น ไม่ต้องอัปเดต totalVotes
      const isOnlyFetchingHasVoted = propTotalVotes !== null && propTotalVotes !== undefined;
      
      if (!isOnlyFetchingHasVoted) {
        setLoading(true);
      }
      console.log('🔄 Fetching vote status for:', { candidateId, voterId, voteType, isOnlyFetchingHasVoted });
      
      const response = await voteAPI.getVoteStatus(candidateId, voterId, voteType);
      console.log('✅ Vote status response:', response);
      
      // ถ้ามี propTotalVotes แล้ว ให้เก็บเฉพาะ hasVoted และ uniqueVoters ไม่ให้ override totalVotes
      if (isOnlyFetchingHasVoted && response.data?.voteStats) {
        setVoteStatus({
          ...response.data,
          voteStats: {
            ...response.data.voteStats,
            // ใช้ totalVotes จาก props ไม่ต้องอัปเดต
            [voteType]: {
              ...response.data.voteStats[voteType],
              totalVotes: propTotalVotes // ใช้ค่าจาก props
            }
          }
        });
      } else {
        setVoteStatus(response.data);
      }
    } catch (error) {
      console.error('❌ Error fetching vote status:', error);
      // Set fallback data
      const fallbackVotes = propTotalVotes !== null && propTotalVotes !== undefined ? propTotalVotes : 0;
      setVoteStatus({
        voteStats: {
          [voteType]: { totalVotes: fallbackVotes, uniqueVoters: 0 }
        },
        hasVoted: false
      });
    } finally {
      setLoading(false);
    }
  };

  // จัดการการกดดาว
  const handleStarClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!isLoggedIn) {
      showError('กรุณาเข้าสู่ระบบเพื่อโหวต');
      return;
    }

    if (isOwnProfile) {
      showError('ไม่สามารถโหวตให้ตัวเองได้');
      return;
    }

    if (voting) return;

    try {
      setVoting(true);
      
      const response = await voteAPI.toggleVote(voterId, candidateId, voteType);
      
      if (response.success) {
        await fetchVoteStatus();
        
        if (voteStatus?.hasVoted) {
          success('ยกเลิกการโหวตสำเร็จ');
        } else {
          success(`โหวตให้ ${candidateDisplayName} สำเร็จ! ⭐`);
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
      showError(error.message || 'ไม่สามารถโหวตได้');
    } finally {
      setVoting(false);
    }
  };

  // ดึงข้อมูลเมื่อ component mount - ข้ามการเรียก API หากมีข้อมูลจาก props
  useEffect(() => {
    if (candidateId && propTotalVotes === null) {
      // ไม่มีข้อมูลจาก props ให้ดึงจาก API
      fetchVoteStatus();
    } else if (propTotalVotes !== null) {
      // หากมีข้อมูล totalVotes จาก props ให้ตั้ง loading เป็น false ทันที
      setLoading(false);
      // ดึง hasVoted status เท่านั้น โดยไม่ต้องอัปเดต voteStats
      if (voterId) {
        fetchVoteStatus();
      } else {
        // ถ้าไม่ได้ login ก็ไม่ต้องดึง hasVoted
        setLoading(false);
      }
    }
  }, [candidateId, voterId, voteType, propTotalVotes]);

  // Real-time vote updates
  useEffect(() => {
    const handleVoteUpdate = (data) => {
      console.log('📡 Received vote-updated event:', data);
      
      // ตรวจสอบว่าเป็นคะแนนโหวตของผู้ใช้คนนี้หรือไม่
      if (data.candidateId === candidateId) {
        console.log('🔄 Updating vote status for candidate:', candidateId);
        
        // อัปเดต voteStatus state
        setVoteStatus(prevStatus => ({
          ...prevStatus,
          voteStats: data.voteStats,
          hasVoted: data.action === 'cast' ? 
            (data.voter?.id === voterId) : 
            (prevStatus?.hasVoted && data.voter?.id !== voterId)
        }));
        
        // อัปเดต totalVotes จาก props หากมี
        if (propTotalVotes !== null && data.voteStats && data.voteStats[voteType]) {
          // ไม่ต้องอัปเดต propTotalVotes เพราะมันมาจาก parent
          // แต่เราสามารถ log เพื่อ debug ได้
          console.log('📊 Vote stats updated:', data.voteStats[voteType]);
        }
      }
    };

    // ใช้ global socketManager แทนการสร้าง connection ใหม่
    const setupSocketListener = () => {
      if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
        console.log('🔌 HeartVote - Setting up socket listener on existing socket:', window.socketManager.socket.id);
        window.socketManager.socket.on('vote-updated', handleVoteUpdate);
        return true;
      }
      return false;
    };

    // ลองตั้งค่า listener ทันที
    let listenerSetup = setupSocketListener();
    
    // ถ้า socket ยังไม่พร้อม ให้รอ event 'socketReady' แทนการ polling
    if (!listenerSetup) {
      handleSocketReadyRef.current = () => {
        if (setupSocketListener()) {
          if (handleSocketReadyRef.current) {
            window.removeEventListener('socketReady', handleSocketReadyRef.current);
            handleSocketReadyRef.current = null;
          }
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
        }
      };
      
      window.addEventListener('socketReady', handleSocketReadyRef.current);
      
      // Timeout fallback หลังจาก 10 วินาที
      retryTimeoutRef.current = setTimeout(() => {
        if (handleSocketReadyRef.current) {
          window.removeEventListener('socketReady', handleSocketReadyRef.current);
          handleSocketReadyRef.current = null;
        }
        // ลองอีกครั้งก่อน timeout
        setupSocketListener();
      }, 10000);
    }

    // Cleanup
    return () => {
      if (window.socketManager && window.socketManager.socket) {
        window.socketManager.socket.off('vote-updated', handleVoteUpdate);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (handleSocketReadyRef.current) {
        window.removeEventListener('socketReady', handleSocketReadyRef.current);
      }
    };
  }, [candidateId, voterId]);

  // ดึงข้อมูลคะแนนโหวต - ใช้ข้อมูลจาก props ก่อน หากไม่มีจึงเรียก API
  const voteStats = voteStatus?.voteStats?.[voteType] || { totalVotes: 0, uniqueVoters: 0 };
  const hasVoted = propHasVoted !== null ? propHasVoted : (voteStatus?.hasVoted || false);
  // ใช้ propTotalVotes เสมอเมื่อมี ให้ propTotalVotes มีลำดับความสำคัญสูงสุด
  const totalVotes = propTotalVotes !== null && propTotalVotes !== undefined ? propTotalVotes : (voteStats.totalVotes || 0);
  
  // Debug logging สำหรับ hasVoted
  console.log('🔍 hasVoted Debug:', {
    propHasVoted,
    voteStatusHasVoted: voteStatus?.hasVoted,
    finalHasVoted: hasVoted,
    voterId,
    candidateId
  });

  // Debug logging
  console.log('🔍 HeartVote Debug:', {
    candidateId,
    voteType,
    loading,
    voteStatus,
    voteStats,
    totalVotes,
    hasVoted,
    propTotalVotes,
    propHasVoted,
    usingProps: propTotalVotes !== null
  });


  // Check if this is a compact display (for card overlay)
  const isCompact = className.includes('bg-black/50') || className.includes('backdrop-blur');

  // Show loading state
  if (loading) {
    return (
      <div className="heart-vote-loading">
        <div className="heart-vote-loading-spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (isCompact) {
    return (
      <div className="heart-vote-compact">
        <button
          onClick={handleStarClick}
          disabled={voting || isOwnProfile || !isLoggedIn}
          className="heart-vote-star"
          title={
            isOwnProfile 
              ? 'ไม่สามารถโหวตให้ตัวเองได้' 
              : !isLoggedIn 
                ? 'กรุณาเข้าสู่ระบบเพื่อโหวต'
                : hasVoted 
                  ? 'คลิกเพื่อยกเลิกการโหวต' 
                  : 'คลิกเพื่อโหวต'
          }
        >
          <Star 
            style={{
              width: '16px',
              height: '16px',
              color: hasVoted ? '#eab308' : '#9ca3af',
              fill: hasVoted ? 'currentColor' : 'none'
            }}
          />
        </button>

        <span className="heart-vote-count">
          {totalVotes > 0 ? voteHelpers.formatVoteCount(totalVotes) : '0'}
        </span>
      </div>
    );
  }

  return (
    <div className="heart-vote-normal">
      <button
        onClick={handleStarClick}
        disabled={voting || isOwnProfile || !isLoggedIn}
        className="heart-vote-star"
        title={
          isOwnProfile 
            ? 'ไม่สามารถโหวตให้ตัวเองได้' 
            : !isLoggedIn 
              ? 'กรุณาเข้าสู่ระบบเพื่อโหวต'
              : hasVoted 
                ? 'คลิกเพื่อยกเลิกการโหวต' 
                : 'คลิกเพื่อโหวต'
        }
      >
        <Star 
          style={{
            width: '32px',
            height: '32px',
            color: hasVoted ? '#eab308' : '#9ca3af',
            fill: hasVoted ? 'currentColor' : 'none'
          }}
        />
      </button>

      <span className="heart-vote-count-normal">
        {totalVotes > 0 ? voteHelpers.formatVoteCount(totalVotes) : '0'}
      </span>
    </div>
  );
};

export default HeartVote;