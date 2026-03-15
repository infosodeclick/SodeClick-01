import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { MessageCircle, Users, User, Plus, Send, Search, Image as ImageIcon, ArrowLeft, Loader2, AlertCircle, Circle, X, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import { getProfileImageUrl } from '../utils/profileImageUtils';

const getEmbedDataFromUrl = (rawUrl) => {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase();

    const buildEmbed = ({ embedUrl, provider, providerLabel, type = 'iframe', title }) => ({
      embedUrl,
      provider,
      providerLabel,
      originalUrl: rawUrl,
      type,
      title: title || `${providerLabel || provider} video`
    });

    // YouTube
    if (hostname.includes('youtube.com') || hostname === 'youtu.be') {
      let videoId = '';
      if (hostname === 'youtu.be') {
        videoId = url.pathname.split('/').filter(Boolean)[0] || '';
      } else {
        if (url.searchParams.get('v')) {
          videoId = url.searchParams.get('v');
        } else if (url.pathname.startsWith('/embed/')) {
          videoId = url.pathname.split('/').filter(Boolean)[1] || '';
        } else if (url.pathname.startsWith('/shorts/')) {
          videoId = url.pathname.split('/').filter(Boolean)[1] || '';
        }
      }
      if (videoId) {
        return buildEmbed({
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          provider: 'youtube',
          providerLabel: 'YouTube'
        });
      }
    }

    // TikTok
    if (hostname.includes('tiktok.com')) {
      const match = rawUrl.match(/\/video\/(\d+)/);
      const videoId = match ? match[1] : null;
      if (videoId) {
        return buildEmbed({
          embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
          provider: 'tiktok',
          providerLabel: 'TikTok'
        });
      }
    }

    // Facebook
    if (
      hostname.includes('facebook.com') ||
      hostname.includes('fb.watch') ||
      hostname === 'fb.com'
    ) {
      return buildEmbed({
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(rawUrl)}&show_text=false&width=500`,
        provider: 'facebook',
        providerLabel: 'Facebook'
      });
    }

    // Vimeo
    if (hostname.includes('vimeo.com')) {
      const segments = url.pathname.split('/').filter(Boolean);
      const videoId = segments.find((segment) => /^\d+$/.test(segment));
      if (videoId) {
        return buildEmbed({
          embedUrl: `https://player.vimeo.com/video/${videoId}`,
          provider: 'vimeo',
          providerLabel: 'Vimeo'
        });
      }
    }

    // Dailymotion
    if (hostname.includes('dailymotion.com')) {
      const match = rawUrl.match(/video\/([a-zA-Z0-9]+)/);
      const videoId = match ? match[1] : null;
      if (videoId) {
        return buildEmbed({
          embedUrl: `https://www.dailymotion.com/embed/video/${videoId}`,
          provider: 'dailymotion',
          providerLabel: 'Dailymotion'
        });
      }
    }

    // Direct video file
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.m3u8', '.mov'];
    const lowerUrl = rawUrl.toLowerCase();
    if (videoExtensions.some((ext) => lowerUrl.split('?')[0].endsWith(ext))) {
      return {
        embedUrl: rawUrl,
        provider: 'direct-video',
        providerLabel: 'ไฟล์วิดีโอ',
        originalUrl: rawUrl,
        type: 'video',
        title: 'Video file'
      };
    }
  } catch (error) {
    console.warn('⚠️ Unable to parse URL for embed:', rawUrl, error);
  }
  return null;
};

const detectEmbedsInText = (text) => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = [...text.matchAll(urlRegex)].map((match) => match[0]);
  const embeds = matches
    .map((url) => getEmbedDataFromUrl(url))
    .filter((embed) => embed !== null);
  const unique = [];
  const seen = new Set();
  embeds.forEach((embed) => {
    if (!seen.has(embed.embedUrl)) {
      seen.add(embed.embedUrl);
      unique.push(embed);
    }
  });
  return unique;
};

const renderTextWithLinks = (text, isCurrentUserMessage) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const elements = [];
  let lastIndex = 0;
  text.replace(urlRegex, (match, _p1, offset) => {
    if (offset > lastIndex) {
      elements.push({ type: 'text', value: text.slice(lastIndex, offset) });
    }
    elements.push({ type: 'link', value: match });
    lastIndex = offset + match.length;
    return match;
  });
  if (lastIndex < text.length) {
    elements.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return elements.map((element, index) => {
    if (element.type === 'link') {
      return (
        <a
          key={`link-${index}`}
          href={element.value}
          target="_blank"
          rel="noopener noreferrer"
          className={`${isCurrentUserMessage ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-500'} underline break-all`}
        >
          {element.value}
        </a>
      );
    }
    return (
      <React.Fragment key={`text-${index}`}>
        {element.value}
      </React.Fragment>
    );
  });
};

const sortMessagesByCreatedAt = (messages = []) =>
  [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

const VideoEmbed = React.memo(
  ({ embed, isCurrentUserMessage }) => {
    const containerBase =
      'mt-2 overflow-hidden rounded-lg border shadow-sm';
    const containerClass = isCurrentUserMessage
      ? `${containerBase} border-blue-200 bg-blue-700/40`
      : `${containerBase} border-gray-200 bg-gray-50`;

    if (embed.type === 'video') {
      return (
        <div className={containerClass}>
          <video
            src={embed.embedUrl}
            controls
            className="w-full max-h-80 bg-black"
          >
            <track kind="captions" />
          </video>
          <a
            href={embed.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-black/70 text-xs text-white px-3 py-2 text-center hover:bg-black/80"
          >
            เปิดไฟล์วิดีโอในแท็บใหม่
          </a>
        </div>
      );
    }

    const shouldUseIframe = embed.provider !== 'facebook';

    return (
      <div className={containerClass}>
        {shouldUseIframe ? (
          <div
            className={`relative w-full ${
              embed.provider === 'tiktok' ? 'aspect-[9/16]' : ''
            }`}
            style={embed.provider === 'tiktok' ? undefined : { paddingBottom: '56.25%', height: 0 }}
          >
            <iframe
              src={embed.embedUrl}
              title={embed.title}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-6 px-4 text-center bg-black text-white">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white shadow">
              <span className="text-2xl font-bold">f</span>
            </div>
            <div className="text-sm font-medium">
              วิดีโอนี้ไม่สามารถเล่นในแชทได้
            </div>
            <div className="text-xs text-white/70">
              คลิกปุ่มด้านล่างเพื่อเปิดบน Facebook
            </div>
          </div>
        )}
        <a
          href={embed.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white/70 text-xs text-blue-600 px-3 py-2 text-center hover:bg-white"
        >
          เปิดบน {embed.providerLabel || 'ลิงก์ต้นทาง'}
        </a>
      </div>
    );
  },
  (prev, next) =>
    prev.embed.embedUrl === next.embed.embedUrl &&
    prev.embed.type === next.embed.type &&
    prev.isCurrentUserMessage === next.isCurrentUserMessage
);

const ChatMessageBubble = React.memo(
  ({ msg, currentUserId, onImageClick }) => {
    const isCurrentUser = msg.sender?._id === currentUserId;
    const senderName = msg.sender?.displayName || msg.sender?.username || 'Unknown';
    const senderAvatar = (senderName[0] || '👤').toUpperCase();

    const profileImages = msg.sender?.profileImages || [];
    const profileImageUrl = profileImages.length > 0
      ? getProfileImageUrl(profileImages[0], msg.sender?._id)
      : null;

    const imageUrl = msg.imageUrl || msg.fileInfo?.fileUrl || msg.fileUrl;
    const mimeType = msg.fileInfo?.mimeType || '';
    const isImageMessage = msg.messageType === 'image' || (imageUrl && mimeType.startsWith('image/'));
    const messageContent = (msg.content || msg.text || '').toString();
    const shouldShowContent = messageContent && messageContent !== '[image]' && messageContent !== '[file]';

    const embeds = React.useMemo(() => {
      if (msg.messageType !== 'text') return [];
      return detectEmbedsInText(messageContent);
    }, [msg.messageType, messageContent]);

    const formatTime = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    };

    return (
      <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3 sm:mb-4`}>
        <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[85%] sm:max-w-md lg:max-w-lg`}>
          {!isCurrentUser && (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs sm:text-sm font-bold mr-2 flex-shrink-0 overflow-hidden relative">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={senderName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="w-full h-full flex items-center justify-center" style={{ display: profileImageUrl ? 'none' : 'flex' }}>
                {senderAvatar}
              </div>
            </div>
          )}
          <div
            className={`px-3 py-2 sm:px-4 sm:py-2 rounded-2xl ${
              isCurrentUser
                ? 'bg-blue-500 text-white rounded-br-md'
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
            }`}
          >
            {!isCurrentUser && (
              <p className="text-xs text-gray-600 mb-1">{senderName}</p>
            )}
            {msg.isDeleted ? (
              <div className={`text-sm ${isCurrentUser ? 'text-blue-100' : 'text-gray-500 italic'}`}>
                {msg.deletedBy ? 'ถูกลบโดยผู้ดูแลระบบ' : 'ข้อความนี้ถูกลบแล้ว'}
              </div>
            ) : (
              <div className="space-y-2">
                {isImageMessage && imageUrl && (
                  <img
                    src={imageUrl}
                    alt="รูปภาพจากแชท"
                    className="rounded-xl max-h-72 sm:max-h-80 object-cover cursor-pointer"
                    onClick={() => onImageClick?.(imageUrl, `ภาพจาก ${senderName}`)}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                {shouldShowContent && (
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {renderTextWithLinks(messageContent, isCurrentUser)}
                  </p>
                )}
                {embeds.map((embed) => (
                  <VideoEmbed
                    key={`${embed.provider}-${embed.embedUrl}`}
                    embed={embed}
                    isCurrentUserMessage={isCurrentUser}
                  />
                ))}
              </div>
            )}
            <p className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
              {formatTime(msg.createdAt)}
            </p>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) => {
    const prevFileUrl = prev.msg.fileInfo?.fileUrl || prev.msg.imageUrl || prev.msg.fileUrl;
    const nextFileUrl = next.msg.fileInfo?.fileUrl || next.msg.imageUrl || next.msg.fileUrl;
    return (
      prev.currentUserId === next.currentUserId &&
      prev.msg._id === next.msg._id &&
      prev.msg.content === next.msg.content &&
      prev.msg.messageType === next.msg.messageType &&
      prevFileUrl === nextFileUrl &&
      prev.msg.isDeleted === next.msg.isDeleted &&
      prev.msg.deletedBy === next.msg.deletedBy &&
      prev.msg.updatedAt === next.msg.updatedAt &&
      prev.onImageClick === next.onImageClick
    );
  }
);

const Chat = ({ openChatWithUserId = null, onChatOpened = null }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('public');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState({});
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [viewerImageUrl, setViewerImageUrl] = useState(null);
  const [viewerImageAlt, setViewerImageAlt] = useState('');
  const handleOpenImageViewer = useCallback((url, alt) => {
    setViewerImageUrl(url);
    setViewerImageAlt(alt || 'รูปภาพในแชท');
  }, []);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const joinedRoomRef = useRef(null);
  
  // Chat room list
  const [communityRooms, setCommunityRooms] = useState([]);
  const [privateUsers, setPrivateUsers] = useState([]);
  const [privateRooms, setPrivateRooms] = useState({}); // Map of userId -> room data
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Connection & Loading states
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  
  // Membership limits
  const [dailyLimits, setDailyLimits] = useState(null);
  const [currentUsage, setCurrentUsage] = useState(null);

  // Create room modal
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomIsPaid, setNewRoomIsPaid] = useState(false);
  const [newRoomEntryFee, setNewRoomEntryFee] = useState('');
  
  // Payment confirmation modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingRoom, setPendingRoom] = useState(null);
  const [paymentEntryFee, setPaymentEntryFee] = useState(0);

  const getUserIdString = useCallback((target) => {
    if (!target) return null;
    if (typeof target === 'string') return target;

    const candidates = [
      target._id,
      target.id,
      target.userId,
      target.user?._id,
      target.user?.id
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      if (typeof candidate === 'string') return candidate;
      if (typeof candidate === 'number') return candidate.toString();
      if (typeof candidate === 'object' && typeof candidate.toString === 'function') {
        const converted = candidate.toString();
        if (converted && converted !== '[object Object]') {
          return converted;
        }
      }
    }
    return null;
  }, []);

  const getRoomIdString = useCallback((roomData, fallbackRoomId = null) => {
    if (!roomData && !fallbackRoomId) return null;
    if (typeof roomData === 'string') return roomData;
    if (typeof fallbackRoomId === 'string') return fallbackRoomId;

    const candidates = [
      roomData?._id,
      roomData?.id,
      roomData?.roomId,
      fallbackRoomId
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      if (typeof candidate === 'string') return candidate;
      if (typeof candidate === 'number') return candidate.toString();
      if (typeof candidate === 'object' && typeof candidate.toString === 'function') {
        const converted = candidate.toString();
        if (converted && converted !== '[object Object]') {
          return converted;
        }
      }
    }
    return null;
  }, []);

  const dedupeUsers = useCallback((users = []) => {
    const seen = new Set();
    return users.filter((user) => {
      const id = getUserIdString(user);
      if (!id) {
        return true;
      }
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }, [getUserIdString]);

  const upsertPrivateUser = useCallback((userData) => {
    if (!userData) return;
    setPrivateUsers((prev) => {
      const userId = getUserIdString(userData);
      const existingUser = userId
        ? prev.find((u) => getUserIdString(u) === userId)
        : null;

      const resolvedRoomId = getRoomIdString(
        userData?.room || userData?.roomId,
        userData?.roomId || existingUser?.roomId
      );

      const normalizedUser = userId
        ? {
            ...existingUser,
            ...userData,
            _id: userData._id || existingUser?._id || userId,
            id: userData.id || existingUser?.id || userId,
            roomId: resolvedRoomId || existingUser?.roomId || null
          }
        : { ...existingUser, ...userData };

      const baseList = userId
        ? prev.filter((u) => getUserIdString(u) !== userId)
        : prev.slice();

      return dedupeUsers([...baseList, normalizedUser]);
    });
  }, [dedupeUsers, getUserIdString]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTab, selectedRoom, selectedPrivateUser]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!user) return;

    console.log('🔌 Connecting to Socket.IO...');
    // Use API_BASE_URL explicitly, fallback to window.location.origin if not available
    const socketUrl = API_BASE_URL || window.location.origin;
    console.log('🔌 Socket.IO URL:', socketUrl);
    console.log('🔌 API_BASE_URL:', API_BASE_URL);
    console.log('🔌 window.location.origin:', window.location.origin);
    
    socketRef.current = io(socketUrl, {
      // ใช้ polling ก่อน แล้ว fallback ไป websocket เมื่อพร้อม
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: false, // ให้ลอง upgrade ทุกครั้ง
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // ลอง reconnect ไม่จำกัด
      forceNew: false,
      withCredentials: true,
      // เพิ่ม query parameters สำหรับ debugging
      query: {
        userId: user._id,
        timestamp: Date.now()
      },
      // เพิ่ม autoConnect: true เพื่อให้เชื่อมต่ออัตโนมัติ
      autoConnect: true
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
      console.log('✅ Socket.IO transport:', socket.io.engine.transport.name);
      console.log('✅ Socket.IO ready:', socket.connected);
      setIsConnected(true);
      setError(null);
      
      // Join public room by default
      console.log('🔌 [Chat.jsx] Joining public room on connect...');
      socket.emit('join-room', {
        roomId: 'public',
        userId: user._id,
        token: localStorage.getItem('token'),
      });
      
      // ถ้าอยู่ใน community room ให้ join room นั้นด้วย
      if (activeTab === 'community' && selectedRoom) {
        const roomId = selectedRoom._id ? 
          (typeof selectedRoom._id === 'string' ? selectedRoom._id : selectedRoom._id.toString()) :
          (selectedRoom.id ? 
            (typeof selectedRoom.id === 'string' ? selectedRoom.id : selectedRoom.id.toString()) : 
            null);
        
        if (roomId) {
          console.log('🔌 [Chat.jsx] Also joining community room on connect:', roomId);
          socket.emit('join-room', {
            roomId: roomId,
            userId: user._id,
            token: localStorage.getItem('token'),
          });
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      setIsConnected(false);
      
      // ถ้า disconnect เพราะ ping timeout หรือ transport error ให้ reconnect
      if (reason === 'transport close' || reason === 'ping timeout') {
        console.log('🔄 Attempting to reconnect...');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        type: error.type,
        description: error.description
      });
      setIsConnected(false);
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('✅ Socket.IO reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setError(null);
      
      // Rejoin rooms after reconnection - ใช้วิธีเดียวกับที่ใช้ใน useEffect
      if (activeTab === 'public') {
        console.log('🔌 [Chat.jsx] Rejoining public room after reconnect');
        socket.emit('join-room', {
          roomId: 'public',
          userId: user._id,
          token: localStorage.getItem('token'),
        });
      } else if (activeTab === 'community' && selectedRoom) {
        // Normalize room ID ให้ตรงกับที่ใช้ในที่อื่น
        const roomId = selectedRoom._id ? 
          (typeof selectedRoom._id === 'string' ? selectedRoom._id : selectedRoom._id.toString()) :
          (selectedRoom.id ? 
            (typeof selectedRoom.id === 'string' ? selectedRoom.id : selectedRoom.id.toString()) : 
            null);
        
        if (roomId) {
          console.log('🔌 [Chat.jsx] Rejoining community room after reconnect:', roomId);
          socket.emit('join-room', {
            roomId: roomId,
            userId: user._id,
            token: localStorage.getItem('token'),
          });
        }
      }
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnection attempt', attemptNumber);
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ Socket.IO reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Socket.IO reconnection failed');
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณารีเฟรชหน้า');
    });

    // Listen for room messages
    socket.on('room-message', (data) => {
      console.log('📨 [Chat.jsx] ========== RECEIVED ROOM-MESSAGE ==========');
      console.log('📨 [Chat.jsx] Message ID:', data._id);
      console.log('📨 [Chat.jsx] Chat Room:', data.chatRoom);
      console.log('📨 [Chat.jsx] Chat Room Type:', typeof data.chatRoom);
      console.log('📨 [Chat.jsx] Sender:', data.sender?.displayName || data.sender?.username);
      console.log('📨 [Chat.jsx] Sender ID:', data.sender?._id);
      console.log('📨 [Chat.jsx] Current User ID:', user?._id);
      console.log('📨 [Chat.jsx] Content:', data.content?.substring(0, 50));
      console.log('📨 [Chat.jsx] Message Type:', data.messageType);
      console.log('📨 [Chat.jsx] Full data:', JSON.stringify(data, null, 2));
      // Use current activeTab from state, not from closure
      handleNewMessage(data, user?._id);
    });

    // Listen for auto-join-room event (for direct messages)
    socket.on('auto-join-room', async (data) => {
      console.log('🔔 [Chat.jsx] Received auto-join-room event:', data);
      if (data.roomId && socketRef.current && isConnected) {
        console.log('🔌 [Chat.jsx] Auto-joining room:', data.roomId);
        socketRef.current.emit('join-room', {
          roomId: data.roomId,
          userId: user._id,
          token: localStorage.getItem('token'),
        });
      }
    });

    // Listen for socket errors
    socket.on('error', (error) => {
      console.error('❌ Socket.IO error:', error);
      setError(error.message || 'เกิดข้อผิดพลาด');
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        console.log('🔌 Disconnecting Socket.IO...');
        socket.disconnect();
      }
    };
  }, [user]);

  // Load public messages and community rooms on mount
  useEffect(() => {
    if (!user) return;
    loadPublicMessages();
    loadCommunityRooms();
    // Load private rooms when user is available
    loadPrivateRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load private rooms when switching to private tab
  useEffect(() => {
    if (activeTab === 'private' && user) {
      loadPrivateRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadPublicMessages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/chat/rooms/public/messages`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const data = await response.json();
      if (data.success && data.messages) {
        const orderedMessages = sortMessagesByCreatedAt(data.messages);
        setMessages((prev) => ({
          ...prev,
          public: orderedMessages,
        }));
      }
    } catch (err) {
      console.error('Error loading public messages:', err);
      setError('ไม่สามารถโหลดข้อความได้');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCommunityRooms = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/rooms`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const data = await response.json();
      if (data.success && data.rooms) {
        setCommunityRooms(data.rooms);
        return data.rooms;
      }
    } catch (err) {
      console.error('Error loading community rooms:', err);
    }
    return [];
  };

  // Load private chat rooms
  const loadPrivateRooms = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/rooms/direct`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const data = await response.json();
      if (data.success && data.rooms) {
        // Update privateUsers list with room data (including lastMessage and hasUnreadMessage)
        const usersWithRoomData = data.rooms.map(room => ({
          ...room.otherUser,
          lastMessage: room.lastMessage,
          hasUnreadMessage: room.hasUnreadMessage,
          roomId: getRoomIdString(room.roomId || room._id)
        }));
        setPrivateUsers(dedupeUsers(usersWithRoomData));
        
        // Update privateRooms map
        setPrivateRooms(prev => {
          const updated = { ...prev };
          data.rooms.forEach(room => {
            const userId = getUserIdString(room.otherUser);
            const resolvedRoomId = getRoomIdString(room.roomId || room._id);
            if (userId && resolvedRoomId) {
              updated[userId] = {
                ...room,
                _id: resolvedRoomId,
                id: resolvedRoomId,
                roomId: resolvedRoomId
              };
            }
          });
          return updated;
        });
        
        return data.rooms;
      }
    } catch (err) {
      console.error('Error loading private rooms:', err);
    }
    return [];
  };

  // Create or get direct room with a user
  const createOrGetDirectRoom = async (targetUserId) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/chat/rooms/direct/${targetUserId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success && data.room) {
        const normalizedRoomId = getRoomIdString(data.room);

        // Store room data
        if (targetUserId && normalizedRoomId) {
          setPrivateRooms(prev => ({
            ...prev,
            [targetUserId]: {
              ...data.room,
              _id: normalizedRoomId,
              id: normalizedRoomId,
              roomId: normalizedRoomId
            }
          }));
        }
        
        // Update or insert user in privateUsers list with latest room info
        if (data.otherUser || normalizedRoomId) {
          const userPayload = data.otherUser
            ? {
                ...data.otherUser,
                roomId: normalizedRoomId || data.otherUser.roomId
              }
            : {
                _id: targetUserId,
                id: targetUserId,
                roomId: normalizedRoomId
              };
          upsertPrivateUser(userPayload);
        }
        
        // Join room via Socket.IO
        if (socketRef.current && isConnected) {
          const roomId = getRoomIdString(data.room);
          socketRef.current.emit('join-room', {
            roomId: roomId,
            userId: user._id,
            token: localStorage.getItem('token'),
          });
        }
        
        return data.room;
      } else {
        setError(data.message || 'ไม่สามารถสร้างห้องแชทได้');
        return null;
      }
    } catch (err) {
      console.error('Error creating/getting direct room:', err);
      setError('เกิดข้อผิดพลาดในการสร้างห้องแชท');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle opening chat with specific user from external source (e.g., profile modal)
  useEffect(() => {
    if (openChatWithUserId && user) {
      const openChatWithUser = async () => {
        try {
          console.log('💬 [Chat.jsx] Opening chat with user:', openChatWithUserId);
          
          // Switch to private tab
          setActiveTab('private');
          
          // Create or get direct room
          const response = await fetch(`${API_BASE_URL}/api/chat/rooms/direct/${openChatWithUserId}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          });
          
          const data = await response.json();
          if (data.success && data.room) {
            const room = data.room;
            const normalizedRoomId = getRoomIdString(room);
            
            // Store room data
            if (openChatWithUserId && normalizedRoomId) {
              setPrivateRooms(prev => ({
                ...prev,
                [openChatWithUserId]: {
                  ...room,
                  _id: normalizedRoomId,
                  id: normalizedRoomId,
                  roomId: normalizedRoomId
                }
              }));
            }
            
            // Use otherUser from response if available, otherwise fetch user info
            let targetUser = data.otherUser;
            
            if (!targetUser) {
              // Fetch user info if not in response
              try {
                const userResponse = await fetch(`${API_BASE_URL}/api/users/${openChatWithUserId}`, {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                  },
                });
                
                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  if (userData.success && userData.user) {
                    targetUser = userData.user;
                  }
                }
              } catch (err) {
                console.error('Error fetching user info:', err);
              }
            }
            
            // Update privateUsers list - add user if not exists
            if (targetUser) {
              const userWithRoom = normalizedRoomId
                ? { ...targetUser, roomId: normalizedRoomId }
                : targetUser;

              upsertPrivateUser(userWithRoom);
              // Set the user as selected
              setSelectedPrivateUser(userWithRoom);
            }
            
            setShowSidebar(false);
            
            // Load messages for this room
            const roomId = normalizedRoomId;
            if (roomId) {
              loadRoomMessages(roomId);
              
              // Join room via Socket.IO if connected
              if (socketRef.current && isConnected) {
                socketRef.current.emit('join-room', {
                  roomId: roomId,
                  userId: user._id,
                  token: localStorage.getItem('token'),
                });
                joinedRoomRef.current = roomId;
              }
            }
            
            // Call callback to reset the prop
            if (onChatOpened) {
              onChatOpened();
            }
          } else {
            console.error('Failed to create/get direct room:', data.message);
            if (onChatOpened) {
              onChatOpened();
            }
          }
        } catch (err) {
          console.error('Error opening chat with user:', err);
          if (onChatOpened) {
            onChatOpened();
          }
        }
      };
      
      openChatWithUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openChatWithUserId, user]);

  // Debounced search function
  useEffect(() => {
    if (activeTab !== 'private') {
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const searchUsers = async (query) => {
      try {
        setIsSearching(true);
        const response = await fetch(`${API_BASE_URL}/api/chat/users/search?query=${encodeURIComponent(query)}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        const data = await response.json();
        if (data.success && data.users) {
          setSearchResults(data.users);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Error searching users:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeTab]);

  const handleNewMessage = (data, currentUserId = user?._id) => {
    console.log('🔍 [Chat.jsx] handleNewMessage called with data:', data);
    console.log('🔍 [Chat.jsx] Current User ID (from param):', currentUserId);
    console.log('🔍 [Chat.jsx] Current User ID (from state):', user?._id);
    console.log('🔍 [Chat.jsx] Sender ID:', data.sender?._id);
    
    // Normalize roomId to string for consistent key usage
    // ใช้ toString() เพื่อให้แน่ใจว่าเป็น string เสมอ
    let roomId = getRoomIdString(data.chatRoom, data.roomId);
    
    console.log('🔍 [Chat.jsx] Normalized roomId:', roomId);
    
    if (!roomId) {
      console.warn('⚠️ [Chat.jsx] Received message without chatRoom:', data);
      return;
    }

    const newMessage = {
      _id: data._id || Date.now().toString(),
      content: data.content,
      sender: data.sender,
      messageType: data.messageType || 'text',
      imageUrl: data.imageUrl || data.fileInfo?.fileUrl || data.fileUrl,
      createdAt: data.createdAt || new Date(),
      chatRoom: roomId,
      isDeleted: data.isDeleted || false,
      deletedBy: data.deletedBy || null
    };

    console.log('📨 [Chat.jsx] Received room-message:', {
      roomId,
      messageId: newMessage._id,
      content: newMessage.content?.substring(0, 50),
      sender: data.sender?.displayName || data.sender?.username
    });

    // Check if this is from the current user (use parameter to avoid closure issues)
    const senderId = data.sender?._id?.toString();
    const userId = currentUserId?.toString() || user?._id?.toString();
    const isFromCurrentUser = senderId === userId;
    
    console.log('🔍 [Chat.jsx] User comparison:', {
      senderId,
      userId,
      isFromCurrentUser,
      senderIdType: typeof senderId,
      userIdType: typeof userId
    });

    setMessages((prev) => {
      // ตรวจสอบ roomId ทั้งแบบตรงและแบบ normalize
      // เพราะอาจมี roomId ที่เป็น ObjectId string หรือ plain string
      const existingMessages = prev[roomId] || [];
      
      // Check if message already exists by ID
      const existsById = existingMessages.some((msg) => {
        if (!msg._id || !newMessage._id) return false;
        return msg._id.toString() === newMessage._id.toString();
      });
      
      if (existsById) {
        console.log('⚠️ [Chat.jsx] Message already exists, skipping:', newMessage._id);
        return prev;
      }
      
      // Check if this is from the current user and matches an optimistic message
      if (isFromCurrentUser) {
        // Find optimistic message with matching content and recent timestamp (within 5 seconds)
        const now = new Date();
        const optimisticIndex = existingMessages.findIndex((msg) => {
          // Check if it's a temp message (starts with 'temp_')
          const isTempMessage = msg._id && msg._id.toString().startsWith('temp_');
          if (!isTempMessage) return false;
          
          // Check if content matches
          const contentMatches = msg.content === newMessage.content;
          
          // Check if timestamp is recent (within 5 seconds)
          const msgTime = new Date(msg.createdAt);
          const timeDiff = Math.abs(now - msgTime);
          const isRecent = timeDiff < 5000; // 5 seconds
          
          return contentMatches && isRecent;
        });
        
        // If found optimistic message, replace it with the real one
        if (optimisticIndex !== -1) {
          console.log('✅ [Chat.jsx] Replacing optimistic message with real message');
          const updatedMessages = [...existingMessages];
          updatedMessages[optimisticIndex] = newMessage;
          return {
            ...prev,
            [roomId]: sortMessagesByCreatedAt(updatedMessages),
          };
        }
      }
      
      // Otherwise, add as new message
      console.log('✅ [Chat.jsx] Adding new message to room:', roomId);
      console.log('✅ [Chat.jsx] Current messages count:', existingMessages.length);
      console.log('✅ [Chat.jsx] New message:', newMessage);
      const updatedMessages = [...existingMessages, newMessage];
      console.log('✅ [Chat.jsx] Updated messages count:', updatedMessages.length);
      
      return {
        ...prev,
        [roomId]: sortMessagesByCreatedAt(updatedMessages),
      };
    });
    
    // Check if this is a private room message (ObjectId, not 'public' or 'community')
    const isPrivateRoom = roomId !== 'public' && roomId !== 'community' && 
                         /^[0-9a-fA-F]{24}$/.test(roomId);
    
    // Check if message is from another user (not current user)
    const isFromOtherUser = !isFromCurrentUser;
    
    console.log('🔍 [Chat.jsx] Private room check:', {
      roomId,
      isPrivateRoom,
      isFromCurrentUser,
      isFromOtherUser,
      senderId: data.sender?._id?.toString(),
      currentUserId: user?._id?.toString()
    });
    
    // If this is a private message, update the private rooms list immediately
    if (isPrivateRoom) {
      console.log('✅ [Chat.jsx] This is a private room message, updating list...');
      // Use setTimeout to ensure state updates happen after setMessages
      setTimeout(() => {
        // Get current state values using functional updates
        setPrivateRooms(currentRooms => {
          console.log('🔍 [Chat.jsx] Current privateRooms:', Object.keys(currentRooms).length, 'rooms');
          console.log('🔍 [Chat.jsx] Looking for roomId:', roomId);
          
          // Find the room and user in privateRooms
          const roomEntry = Object.entries(currentRooms).find(([userId, room]) => {
            const rId = getRoomIdString(room);
            const matches = rId === roomId;
            if (matches) {
              console.log('✅ [Chat.jsx] Found room entry:', { userId, roomId: rId });
            }
            return matches;
          });
          
          if (roomEntry) {
            const [targetUserId, roomData] = roomEntry;
            console.log('✅ [Chat.jsx] Room found in privateRooms:', { targetUserId, roomData });
            
            // Update lastMessage content
            let lastMessageContent = null;
            if (newMessage.messageType === 'image' || newMessage.messageType === 'file') {
              lastMessageContent = '📎 ส่งไฟล์';
            } else if (newMessage.content) {
              lastMessageContent = newMessage.content;
            }
            
            console.log('📝 [Chat.jsx] Updating lastMessage:', {
              lastMessageContent,
              hasUnreadMessage: isFromOtherUser,
              targetUserId
            });
            
            // Update privateRooms map
            const updatedRooms = {
              ...currentRooms,
              [targetUserId]: {
                ...roomData,
                _id: getRoomIdString(roomData) || roomId,
                id: getRoomIdString(roomData) || roomId,
                roomId: getRoomIdString(roomData) || roomId,
                lastMessage: lastMessageContent,
                hasUnreadMessage: isFromOtherUser,
                lastMessageAt: new Date()
              }
            };
            
            // Update privateUsers list separately
            setPrivateUsers(currentUsers => {
              console.log('👥 [Chat.jsx] Current privateUsers:', currentUsers.length, 'users');
              const updatedUsers = currentUsers.map(u => {
                const uId = getUserIdString(u);
                if (uId === targetUserId) {
                  console.log('✅ [Chat.jsx] Updating user in list:', {
                    userId: uId,
                    lastMessage: lastMessageContent,
                    hasUnreadMessage: isFromOtherUser
                  });
                  return {
                    ...u,
                    lastMessage: lastMessageContent,
                    hasUnreadMessage: isFromOtherUser // Mark as unread if from another user
                  };
                }
                return u;
              });
              console.log('✅ [Chat.jsx] Updated privateUsers:', updatedUsers.length, 'users');
              return dedupeUsers(updatedUsers);
            });
            
            console.log('✅ [Chat.jsx] Private rooms list updated successfully');
            return updatedRooms;
          } else {
            // If room not found in privateRooms, reload the list
            console.log('⚠️ [Chat.jsx] Room not found in privateRooms, reloading list...');
            console.log('🔍 [Chat.jsx] Available roomIds:', Object.entries(currentRooms).map(([uid, r]) => ({
              userId: uid,
              roomId: r._id?.toString() || r.id?.toString()
            })));
            loadPrivateRooms();
            return currentRooms;
          }
        });
      }, 100);
    } else {
      console.log('ℹ️ [Chat.jsx] Not a private room message, skipping list update');
    }
    
    console.log('✅ [Chat.jsx] handleNewMessage completed for room:', roomId);
    
    // Scroll to bottom - จะ scroll เมื่อ component re-render และ roomId ตรงกับห้องที่กำลังดู
    setTimeout(scrollToBottom, 100);
  };

  const handleImageButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = (event) => {
    const fileList = event.target.files;
    const file = fileList && fileList[0];
    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('กรุณาเลือกไฟล์รูปภาพ (JPEG, PNG, GIF, WebP)');
      event.target.value = '';
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 10MB');
      event.target.value = '';
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedImageFile(file);
    setImagePreviewUrl(previewUrl);
    setError(null);
  };

  const clearSelectedImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openDeletePrivateChat = (userInfo, roomInfo) => {
    if (!userInfo) return;
    const roomId = getRoomIdString(roomInfo, userInfo?.roomId);
    const userId = getUserIdString(userInfo);
    if (!roomId || !userId) return;

    const fullName = userInfo.displayName ||
      (userInfo.firstName && userInfo.lastName
        ? `${userInfo.firstName} ${userInfo.lastName}`
        : userInfo.firstName || userInfo.lastName || userInfo.username || 'ผู้ใช้');

    setUserToDelete({
      userId,
      roomId,
      name: fullName
    });
    setShowSidebar(true);
  };

  const closeDeletePrivateChat = () => {
    if (isDeletingRoom) return;
    setUserToDelete(null);
  };

  const handleDeletePrivateChat = async () => {
    if (!userToDelete?.roomId) return;

    try {
      setIsDeletingRoom(true);
      const response = await fetch(`${API_BASE_URL}/api/chat/rooms/direct/${userToDelete.roomId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const deletedUserId = userToDelete.userId;
        const deletedRoomId = userToDelete.roomId;

        setPrivateUsers((prev) =>
          prev.filter(
            (u) => (u._id?.toString() || u.id?.toString()) !== deletedUserId
          )
        );

        setPrivateRooms((prev) => {
          const updated = { ...prev };
          delete updated[deletedUserId];
          return updated;
        });

        setMessages((prev) => {
          if (!deletedRoomId) return prev;
          const updated = { ...prev };
          delete updated[deletedRoomId];
          return updated;
        });

        setSelectedPrivateUser((prevSelected) => {
          if (!prevSelected) return prevSelected;
          const selectedId = prevSelected._id?.toString() || prevSelected.id?.toString();
          return selectedId === deletedUserId ? null : prevSelected;
        });

        setUserToDelete(null);
        await loadPrivateRooms();
      } else {
        setError(data.message || 'ไม่สามารถลบแชทได้');
      }
    } catch (err) {
      console.error('Error deleting private chat:', err);
      setError('เกิดข้อผิดพลาดในการลบห้องแชท');
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const handleSendMessage = async () => {
    if (isSendingMessage) {
      return;
    }

    if ((!message.trim() && !selectedImageFile) || !socketRef.current || !user) {
      console.warn('⚠️ [Chat.jsx] Cannot send message:', {
        hasMessage: !!message.trim(),
        hasImage: !!selectedImageFile,
        hasSocket: !!socketRef.current,
        hasUser: !!user,
        socketConnected: socketRef.current?.connected
      });
      return;
    }

    const tempId = `temp_${Date.now()}`;
    let chatRoomId;
    
    if (activeTab === 'public') {
      chatRoomId = 'public';
    } else if (activeTab === 'community' && selectedRoom) {
      // Normalize room ID to string - ใช้วิธีเดียวกับที่ใช้ในที่อื่น
      chatRoomId = selectedRoom._id ? 
        (typeof selectedRoom._id === 'string' ? selectedRoom._id : selectedRoom._id.toString()) :
        (selectedRoom.id ? 
          (typeof selectedRoom.id === 'string' ? selectedRoom.id : selectedRoom.id.toString()) : 
          null);
    } else if (activeTab === 'private' && selectedPrivateUser) {
      const userId = getUserIdString(selectedPrivateUser);
      const fallbackRoomId = getRoomIdString(null, selectedPrivateUser.roomId);
      // Get room ID from privateRooms, or create room if not exists
      const room = userId ? privateRooms[userId] : null;
      if (room) {
        chatRoomId = getRoomIdString(room, fallbackRoomId);
      } else if (fallbackRoomId) {
        chatRoomId = fallbackRoomId;
      } else if (userId) {
        // Create room first
        const newRoom = await createOrGetDirectRoom(userId);
        if (newRoom) {
          chatRoomId = getRoomIdString(newRoom);
        } else {
          setError('ไม่สามารถสร้างห้องแชทได้');
          return;
        }
      } else {
        setError('ไม่พบผู้ใช้เป้าหมาย');
        return;
      }
    }
    
    chatRoomId = getRoomIdString(chatRoomId);
    
    if (!chatRoomId) {
      console.error('❌ [Chat.jsx] No chatRoomId found:', { activeTab, selectedRoom, selectedPrivateUser });
      setError('กรุณาเลือกห้องแชทหรือผู้ใช้');
      return;
    }
    
    setIsSendingMessage(true);
    setError(null);

    console.log('📤 [Chat.jsx] ========== SENDING MESSAGE ==========');
    console.log('📤 [Chat.jsx] Room ID:', chatRoomId);
    console.log('📤 [Chat.jsx] Active Tab:', activeTab);
    console.log('📤 [Chat.jsx] Selected Room:', selectedRoom);
    console.log('📤 [Chat.jsx] Socket Connected:', socketRef.current?.connected);
    console.log('📤 [Chat.jsx] Socket ID:', socketRef.current?.id);
    console.log('📤 [Chat.jsx] Message Content:', message.trim().substring(0, 50));
    console.log('📤 [Chat.jsx] Temp ID:', tempId);

    let uploadedFileData = null;

    if (selectedImageFile) {
      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedImageFile);

        const uploadResponse = await fetch(`${API_BASE_URL}/api/chat/upload-file`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadResult.success || !uploadResult.data?.fileUrl) {
          throw new Error(uploadResult.message || 'ไม่สามารถอัปโหลดรูปภาพได้');
        }

        uploadedFileData = uploadResult.data;
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        setError(uploadError.message || 'ไม่สามารถอัปโหลดรูปภาพได้');
        setIsUploadingImage(false);
        setIsSendingMessage(false);
        return;
      } finally {
        setIsUploadingImage(false);
      }
    }

    try {
      // Send message via Socket.IO
      const trimmedMessage = message.trim();
      const messageTypeToSend = selectedImageFile ? 'image' : 'text';
      const contentToSend = trimmedMessage || (selectedImageFile ? '[image]' : '');

      const messageData = {
        content: contentToSend,
        senderId: user._id,
        chatRoomId: chatRoomId,
        messageType: messageTypeToSend,
        tempId: tempId,
        token: localStorage.getItem('token'),
      };

      if (selectedImageFile && uploadedFileData) {
        messageData.fileUrl = uploadedFileData.fileUrl;
        messageData.imageUrl = uploadedFileData.fileUrl;
        messageData.fileName = uploadedFileData.fileName;
        messageData.fileSize = uploadedFileData.fileSize;
        messageData.fileType = uploadedFileData.mimeType;
      }
      
      console.log('📤 [Chat.jsx] Emitting send-message event:', messageData);
      socketRef.current.emit('send-message', messageData);
      console.log('✅ [Chat.jsx] send-message event emitted');

      // Optimistically add message
      const optimisticMessage = {
        _id: tempId,
        content: contentToSend,
        sender: {
          _id: user._id,
          displayName: user.displayName || user.username,
          username: user.username,
          profileImages: user.profileImages || [],
        },
        messageType: messageTypeToSend,
        createdAt: new Date(),
        chatRoom: chatRoomId,
      };

      if (selectedImageFile && uploadedFileData) {
        optimisticMessage.imageUrl = uploadedFileData.fileUrl;
        optimisticMessage.fileInfo = {
          fileUrl: uploadedFileData.fileUrl,
          fileName: uploadedFileData.fileName,
          fileSize: uploadedFileData.fileSize,
          mimeType: uploadedFileData.mimeType,
        };
      }

      setMessages((prev) => {
        const roomMessages = prev[chatRoomId] || [];
        return {
          ...prev,
          [chatRoomId]: sortMessagesByCreatedAt([...roomMessages, optimisticMessage]),
        };
      });

      setMessage('');
      if (selectedImageFile) {
        clearSelectedImage();
      }
      setTimeout(scrollToBottom, 100);
      
      // Reload private rooms list after sending message to update lastMessageAt
      if (activeTab === 'private') {
        setTimeout(() => {
          loadPrivateRooms();
        }, 500);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('ไม่สามารถส่งข้อความได้');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const getCurrentMessages = () => {
    if (activeTab === 'public') {
      return messages.public || [];
    } else if (activeTab === 'community' && selectedRoom) {
      // Normalize room ID to string for consistent lookup
      // ใช้วิธีเดียวกับที่ใช้ใน handleNewMessage เพื่อให้แน่ใจว่า roomId ตรงกัน
      const roomId = selectedRoom._id ? 
        (typeof selectedRoom._id === 'string' ? selectedRoom._id : selectedRoom._id.toString()) :
        (selectedRoom.id ? 
          (typeof selectedRoom.id === 'string' ? selectedRoom.id : selectedRoom.id.toString()) : 
          null);
      
      if (!roomId) return [];
      
      // ตรวจสอบทั้ง roomId โดยตรงและ normalize แล้ว
      const roomMessages = messages[roomId] || [];
      console.log('📋 [Chat.jsx] getCurrentMessages for room:', roomId, 'found', roomMessages.length, 'messages');
      return roomMessages;
    } else if (activeTab === 'private' && selectedPrivateUser) {
      const userId = getUserIdString(selectedPrivateUser);
      const room = userId ? privateRooms[userId] : null;
      const roomId = getRoomIdString(room, selectedPrivateUser.roomId);
      if (roomId) {
        return messages[roomId] || [];
      }
      return [];
    }
    return [];
  };

  // Load messages for selected room
  useEffect(() => {
    if (selectedRoom && activeTab === 'community') {
      // Normalize room ID to string - ใช้ toString() เพื่อให้แน่ใจว่าเป็น string
      const roomId = selectedRoom._id ? 
        (typeof selectedRoom._id === 'string' ? selectedRoom._id : selectedRoom._id.toString()) :
        (selectedRoom.id ? 
          (typeof selectedRoom.id === 'string' ? selectedRoom.id : selectedRoom.id.toString()) : 
          null);
      
      if (roomId) {
        console.log('🔌 [Chat.jsx] ========== SELECTED ROOM ==========');
        console.log('🔌 [Chat.jsx] Room ID:', roomId);
        console.log('🔌 [Chat.jsx] Selected Room Object:', selectedRoom);
        console.log('🔌 [Chat.jsx] Socket Ref:', !!socketRef.current);
        console.log('🔌 [Chat.jsx] Socket Connected:', isConnected);
        console.log('🔌 [Chat.jsx] Socket ID:', socketRef.current?.id);
        
        loadRoomMessages(roomId);
        
        // Join room via Socket.IO if connected (always join via socket for real-time)
        if (socketRef.current) {
          if (isConnected) {
            if (joinedRoomRef.current === roomId) {
              console.log('ℹ️ [Chat.jsx] Already joined community room, skipping:', roomId);
            } else {
              console.log('🔌 [Chat.jsx] ========== JOINING ROOM ==========');
              console.log('🔌 [Chat.jsx] Room ID:', roomId);
              console.log('🔌 [Chat.jsx] User ID:', user._id);
              console.log('🔌 [Chat.jsx] Socket Connected:', socketRef.current.connected);
              console.log('🔌 [Chat.jsx] Socket ID:', socketRef.current.id);
              
              socketRef.current.emit('join-room', {
                roomId: roomId,
                userId: user._id,
                token: localStorage.getItem('token'),
              });
              joinedRoomRef.current = roomId;
              
              console.log('✅ [Chat.jsx] join-room event emitted');
              
              setTimeout(() => {
                if (socketRef.current) {
                  const rooms = Array.from(socketRef.current.rooms || []);
                  console.log('🔍 [Chat.jsx] Socket rooms after join:', rooms);
                  console.log('🔍 [Chat.jsx] Is in room?', rooms.includes(roomId));
                }
              }, 1000);
            }
          } else {
            console.log('⏳ [Chat.jsx] Socket not connected yet, will join when connected');
            const checkConnection = setInterval(() => {
              if (socketRef.current && socketRef.current.connected) {
                console.log('🔌 [Chat.jsx] Socket connected, joining room:', roomId);
                if (joinedRoomRef.current !== roomId) {
                  socketRef.current.emit('join-room', {
                    roomId: roomId,
                    userId: user._id,
                    token: localStorage.getItem('token'),
                  });
                  joinedRoomRef.current = roomId;
                }
                clearInterval(checkConnection);
              }
            }, 500);
            
            setTimeout(() => clearInterval(checkConnection), 10000);
          }
        } else {
          console.error('❌ [Chat.jsx] Socket ref is null, cannot join room');
        }
      } else {
        console.error('❌ [Chat.jsx] Room ID is null, cannot join room');
      }
    } else if (selectedPrivateUser && activeTab === 'private') {
      // Load messages for private room
      const userId = getUserIdString(selectedPrivateUser);
      const room = userId ? privateRooms[userId] : null;
      const roomId = getRoomIdString(room, selectedPrivateUser.roomId);
      if (roomId) {
        if (room) {
          console.log('🔌 [Chat.jsx] Loading messages and joining private room:', roomId);
          loadRoomMessages(roomId);
          
          // Join room via Socket.IO if connected
          if (socketRef.current) {
            if (isConnected) {
              if (joinedRoomRef.current === roomId) {
                console.log('ℹ️ [Chat.jsx] Already joined private room, skipping:', roomId);
              } else {
                console.log('🔌 [Chat.jsx] Joining private room via socket (connected):', roomId);
                socketRef.current.emit('join-room', {
                  roomId: roomId,
                  userId: user._id,
                  token: localStorage.getItem('token'),
                });
                joinedRoomRef.current = roomId;
              }
            } else {
              const checkConnection = setInterval(() => {
                if (socketRef.current && socketRef.current.connected) {
                  console.log('🔌 [Chat.jsx] Socket connected, joining private room:', roomId);
                  if (joinedRoomRef.current !== roomId) {
                    socketRef.current.emit('join-room', {
                      roomId: roomId,
                      userId: user._id,
                      token: localStorage.getItem('token'),
                    });
                    joinedRoomRef.current = roomId;
                  }
                  clearInterval(checkConnection);
                }
              }, 500);
              
              setTimeout(() => clearInterval(checkConnection), 10000);
            }
          }
        } else if (selectedPrivateUser.roomId) {
          // Room entry missing but we know the roomId (e.g., opened from profile card)
          console.log('⚠️ [Chat.jsx] Room data missing, loading messages via fallback roomId:', roomId);
          loadRoomMessages(roomId);
        }
      }
    } else if (activeTab === 'community' && !selectedRoom) {
      if (joinedRoomRef.current && joinedRoomRef.current !== 'public') {
        joinedRoomRef.current = null;
      }
    } else if (activeTab === 'private' && !selectedPrivateUser) {
      if (joinedRoomRef.current && joinedRoomRef.current !== 'public') {
        joinedRoomRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom, selectedPrivateUser, activeTab, isConnected, privateRooms]);

  const loadRoomMessages = async (roomId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/rooms/${roomId}/messages`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const data = await response.json();
      if (data.success && data.messages) {
        // Normalize roomId to string for consistent key usage
        const normalizedRoomId = getRoomIdString(roomId);
        if (!normalizedRoomId) return;
        const orderedMessages = sortMessagesByCreatedAt(data.messages);
        setMessages((prev) => ({
          ...prev,
          [normalizedRoomId]: orderedMessages,
        }));
      }
    } catch (err) {
      console.error('Error loading room messages:', err);
    }
  };

  const handleJoinRoom = async (room) => {
    try {
      console.log('🔌 [Chat.jsx] ========== HANDLE JOIN ROOM ==========');
      console.log('🔌 [Chat.jsx] Room:', room);
      console.log('🔌 [Chat.jsx] Socket Connected:', socketRef.current?.connected);
      console.log('🔌 [Chat.jsx] Socket ID:', socketRef.current?.id);
      
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/chat/rooms/${room._id}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      console.log('🔌 [Chat.jsx] Join room API response:', data);
      
      if (data.success) {
        console.log('✅ [Chat.jsx] Join room API success, setting selected room');
        setSelectedRoom(room);
        setShowSidebar(false); // Close sidebar on both mobile and desktop
        
        // Join room via socket immediately after API success
        const roomId = room._id ? 
          (typeof room._id === 'string' ? room._id : room._id.toString()) :
          (room.id ? 
            (typeof room.id === 'string' ? room.id : room.id.toString()) : 
            null);
        
        if (roomId && socketRef.current) {
          if (socketRef.current.connected) {
            console.log('🔌 [Chat.jsx] Joining room via socket immediately:', roomId);
            socketRef.current.emit('join-room', {
              roomId: roomId,
              userId: user._id,
              token: localStorage.getItem('token'),
            });
            console.log('✅ [Chat.jsx] join-room event emitted from handleJoinRoom');
          } else {
            console.warn('⚠️ [Chat.jsx] Socket not connected, will join when connected');
          }
        }
      } else if (data.requiresPayment) {
        // Show payment modal
        setPendingRoom(room);
        setPaymentEntryFee(data.entryFee || room.entryFee || 0);
        setShowPaymentModal(true);
      } else {
        setError(data.message || 'ไม่สามารถเข้าร่วมห้องได้');
      }
    } catch (err) {
      console.error('Error joining room:', err);
      setError('เกิดข้อผิดพลาดในการเข้าร่วมห้อง');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!pendingRoom) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/chat/rooms/${pendingRoom._id}/confirm-payment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setShowPaymentModal(false);
        setPendingRoom(null);
        setSelectedRoom(pendingRoom);
        setShowSidebar(false);
        // Update user coins if returned
        if (data.coinsRemaining !== undefined && user) {
          user.coins = data.coinsRemaining;
        }
      } else {
        setError(data.message || 'ไม่สามารถจ่ายเงินได้');
      }
    } catch (err) {
      console.error('Error confirming payment:', err);
      setError('เกิดข้อผิดพลาดในการจ่ายเงิน');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e?.preventDefault();
    
    // Prevent double submission
    if (isLoading) {
      return;
    }

    if (!newRoomName.trim()) {
      setError('กรุณากรอกชื่อห้อง');
      return;
    }

    // Validate paid room entry fee
    if (newRoomIsPaid && (!newRoomEntryFee || parseInt(newRoomEntryFee) < 1)) {
      setError('กรุณาระบุค่าเข้าห้องที่ถูกต้อง (ขั้นต่ำ 1 เหรียญ)');
      return;
    }

    try {
      setIsLoading(true);
      setError(null); // Clear previous errors
      const response = await fetch(`${API_BASE_URL}/api/chat/rooms`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newRoomName,
          description: newRoomDescription,
          isPaidRoom: newRoomIsPaid,
          entryFee: newRoomIsPaid ? parseInt(newRoomEntryFee) : 0,
        }),
      });
      
      const data = await response.json();
      if (data.success && data.room) {
        // Close modal and reset form FIRST before async operations
        setShowCreateRoomModal(false);
        setNewRoomName('');
        setNewRoomDescription('');
        setNewRoomIsPaid(false);
        setNewRoomEntryFee('');
        
        // Reload rooms list and set selected room
        try {
          await loadCommunityRooms();
          // Set selected room and join
          setSelectedRoom(data.room);
          setShowSidebar(false);
        } catch (reloadError) {
          console.error('Error reloading rooms:', reloadError);
          // Even if reload fails, we still want to set the selected room
          setSelectedRoom(data.room);
          setShowSidebar(false);
        }
      } else {
        setError(data.message || 'ไม่สามารถสร้างห้องได้');
      }
    } catch (err) {
      console.error('Error creating room:', err);
      setError('เกิดข้อผิดพลาดในการสร้างห้อง');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if should show date separator
  const shouldShowDateSeparator = (currentMsg, previousMsg) => {
    if (!previousMsg) return true; // First message
    
    const currentDate = new Date(currentMsg.createdAt);
    const previousDate = new Date(previousMsg.createdAt);
    
    // Check if different day
    return (
      currentDate.getDate() !== previousDate.getDate() ||
      currentDate.getMonth() !== previousDate.getMonth() ||
      currentDate.getFullYear() !== previousDate.getFullYear()
    );
  };

  // Format date in Thai style (25-มิ.ย.-68)
  const formatThaiDate = (date) => {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.getMonth();
    const year = (d.getFullYear() + 543) % 100; // Convert to Buddhist Era (พ.ศ.) and get last 2 digits
    
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    
    return `${day}-${thaiMonths[month]}-${year}`;
  };

  const getCurrentTitle = () => {
    if (activeTab === 'public') return 'สาธารณะ';
    if (activeTab === 'community' && selectedRoom) return selectedRoom.name;
    if (activeTab === 'private' && selectedPrivateUser) {
      return selectedPrivateUser.displayName || 
             (selectedPrivateUser.firstName && selectedPrivateUser.lastName 
               ? `${selectedPrivateUser.firstName} ${selectedPrivateUser.lastName}` 
               : selectedPrivateUser.username) || 
             'Unknown';
    }
    return '';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">กรุณาเข้าสู่ระบบเพื่อใช้งานแชท</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Connection Status & Error Banner */}
      {!isConnected && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2 flex-shrink-0">
          <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
          <span className="text-sm text-yellow-800">กำลังเชื่อมต่อ...</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-800">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex">
          {/* Tab Navigation */}
          <button
            onClick={() => {
              setActiveTab('public');
              setSelectedRoom(null);
              setSelectedPrivateUser(null);
              setShowSidebar(false);
              joinedRoomRef.current = 'public';
            }}
            className={`flex-1 py-3 sm:py-4 px-2 sm:px-6 text-center font-medium transition-colors ${
              activeTab === 'public'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <MessageCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-xs sm:text-base">สาธารณะ</span>
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('community');
              setSelectedRoom(null);
              setSelectedPrivateUser(null);
              setShowSidebar(true);
              joinedRoomRef.current = null;
            }}
            className={`flex-1 py-3 sm:py-4 px-2 sm:px-6 text-center font-medium transition-colors ${
              activeTab === 'community'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <Users size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-xs sm:text-base">คอมมูนิตี้</span>
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('private');
              setSelectedRoom(null);
              setSelectedPrivateUser(null);
              setShowSidebar(true);
              joinedRoomRef.current = null;
            }}
            className={`flex-1 py-3 sm:py-4 px-2 sm:px-6 text-center font-medium transition-colors ${
              activeTab === 'private'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <User size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-xs sm:text-base">ส่วนตัว</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar for Community and Private tabs */}
        {(activeTab === 'community' || activeTab === 'private') && (
          <>
            {/* Mobile Overlay */}
            {showSidebar && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                onClick={() => setShowSidebar(false)}
              />
            )}
            {/* Sidebar */}
            <div className={`
              ${showSidebar ? 'absolute' : 'hidden'}
              md:relative md:flex
              z-50 w-full md:w-80 bg-white border-r border-gray-200 flex flex-col h-full
            `}>
              <div className="p-3 sm:p-4 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-2 md:mb-0">
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder={activeTab === 'community' ? 'ค้นหาห้องแชท...' : 'ค้นหาผู้ใช้ (ชื่อ, username, email)...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={14} />
                    )}
                  </div>
                </div>
              </div>
            
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'community' ? (
                <div className="p-2">
                  <button 
                    onClick={() => setShowCreateRoomModal(true)}
                    className="w-full flex items-center justify-between p-2 sm:p-3 hover:bg-gray-50 rounded-lg mb-2"
                  >
                    <span className="text-pink-600 font-medium text-sm sm:text-base">สร้างห้องใหม่</span>
                    <Plus size={14} className="sm:w-4 sm:h-4 text-pink-600" />
                  </button>
                  {communityRooms.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      ยังไม่มีห้องแชท
                    </div>
                  ) : (
                    communityRooms.map(room => (
                      <div
                        key={room.id || room._id}
                        onClick={() => handleJoinRoom(room)}
                        className={`p-2 sm:p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                          selectedRoom?.id === room.id || selectedRoom?._id === room._id
                            ? 'bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-200'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-800 text-sm sm:text-base">{room.name}</div>
                          {room.isPaidRoom && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                              💰 {room.entryFee}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {room.description || ''}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="p-2">
                  {searchQuery.trim() ? (
                    // Show search results
                    searchResults.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        {isSearching ? 'กำลังค้นหา...' : 'ไม่พบผู้ใช้ที่ค้นหา'}
                      </div>
                    ) : (
                      searchResults.map((user, index) => {
                        const profileImages = user.profileImages || [];
                        const profileImageUrl = profileImages.length > 0 
                          ? getProfileImageUrl(profileImages[0], user._id)
                          : null;
                        const avatarText = (user.displayName || user.username || 'U')[0].toUpperCase();
                        
                        return (
                          <div
                            key={`${userId || 'user'}-${index}`}
                            onClick={async () => {
                              const userId = getUserIdString(user);
                              if (!userId) {
                                console.warn('⚠️ [Chat.jsx] Unable to determine userId from search result', user);
                                return null;
                              }
                              // Create or get direct room
                              const room = await createOrGetDirectRoom(userId);
                              if (room) {
                                const normalizedRoomId = room._id?.toString() || room.id?.toString();
                                const selectedUser = normalizedRoomId
                                  ? { ...user, roomId: normalizedRoomId }
                                  : user;
                                upsertPrivateUser(selectedUser);
                                setSelectedPrivateUser(selectedUser);
                                setShowSidebar(false);
                                setSearchQuery('');
                                setSearchResults([]);
                                // Load messages for this room
                                const roomId = room._id?.toString() || room.id?.toString();
                                if (roomId) {
                                  loadRoomMessages(roomId);
                                }
                              }
                            }}
                            className={`flex items-center p-2 sm:p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                              selectedPrivateUser?.id === user.id || selectedPrivateUser?._id === user._id
                                ? 'bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-200'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold mr-2 sm:mr-3 text-xs sm:text-base flex-shrink-0 overflow-hidden relative">
                              {profileImageUrl ? (
                                <img 
                                  src={profileImageUrl}
                                  alt={user.displayName || user.username}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className="w-full h-full flex items-center justify-center" style={{ display: profileImageUrl ? 'none' : 'flex' }}>
                                {avatarText}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-medium text-gray-800 text-sm sm:text-base truncate">
                                  {user.displayName || `${user.firstName} ${user.lastName}` || user.username}
                                </div>
                                {user.isOnline && (
                                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {user.username && '@' + user.username}
                                {user.email && user.email !== user.username && ` • ${user.email}`}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )
                  ) : (
                    // Show existing private users list
                    privateUsers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        ยังไม่มีผู้ใช้แชทส่วนตัว
                      </div>
                    ) : (
                    privateUsers.map((user, index) => {
                        const userId = getUserIdString(user);
                        if (!userId) {
                          return null;
                        }
                        const room = privateRooms[userId];
                        const profileImages = user.profileImages || [];
                        const profileImageUrl = profileImages.length > 0 
                          ? getProfileImageUrl(profileImages[0], user._id)
                          : null;
                        const avatarText = (user.displayName || user.username || 'U')[0].toUpperCase();
                        const displayName =
                          user.displayName ||
                          (user.username ? user.username : (user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.firstName || user.lastName || 'ผู้ใช้'));
                        const fallbackRoomId = typeof user.roomId === 'object'
                          ? user.roomId?.toString?.()
                          : user.roomId;
                        const roomId = room?._id?.toString() || room?.id?.toString() || fallbackRoomId;
                        const roomForDeletion = roomId ? (room || { _id: roomId, id: roomId }) : null;
                        
                        return (
                          <div
                            key={`${userId || 'private-user'}-${index}`}
                            onClick={async () => {
                              // Ensure room exists
                              if (!room) {
                                const newRoom = await createOrGetDirectRoom(userId);
                                if (!newRoom) {
                                  return;
                                }
                              }
                              setSelectedPrivateUser(user);
                              setShowSidebar(false);
                              
                              // Mark messages as read when opening chat
                              if (user.hasUnreadMessage && room) {
                                const currentRoomId = room._id?.toString() || room.id?.toString();
                                if (currentRoomId) {
                                  try {
                                    await fetch(`${API_BASE_URL}/api/chat/rooms/${currentRoomId}/mark-read`, {
                                      method: 'POST',
                                      headers: {
                                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                                        'Content-Type': 'application/json',
                                      },
                                    });
                                    // Reload rooms to update unread status
                                    setTimeout(() => {
                                      loadPrivateRooms();
                                    }, 300);
                                  } catch (err) {
                                    console.error('Error marking messages as read:', err);
                                  }
                                }
                              }
                            }}
                            className={`relative flex items-center p-2 sm:p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                              selectedPrivateUser?.id === user.id || selectedPrivateUser?._id === user._id
                                ? 'bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-200'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            {/* Unread message indicator - shifted left to avoid delete button */}
                            {user.hasUnreadMessage && (
                              <div className="absolute top-2 right-10 z-10">
                                <Circle className="w-3 h-3 fill-pink-500 text-pink-500" />
                              </div>
                            )}

                            {roomId && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeletePrivateChat(user, roomForDeletion);
                                }}
                                className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-white text-red-500 border border-red-200 hover:bg-red-50 flex items-center justify-center shadow"
                                title="ลบแชทส่วนตัว"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                            
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold mr-2 sm:mr-3 text-xs sm:text-base flex-shrink-0 overflow-hidden relative">
                              {profileImageUrl ? (
                                <img 
                                  src={profileImageUrl}
                                  alt={displayName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className="w-full h-full flex items-center justify-center" style={{ display: profileImageUrl ? 'none' : 'flex' }}>
                                {avatarText}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-medium text-gray-800 text-sm sm:text-base truncate">{displayName}</div>
                                {user.isOnline && (
                                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {user.username && '@' + user.username}
                              </div>
                              {/* Last message - third line */}
                              {user.lastMessage && (
                                <div className="text-xs text-gray-400 truncate mt-0.5">
                                  {user.lastMessage.length > 40 
                                    ? user.lastMessage.substring(0, 40) + '...' 
                                    : user.lastMessage}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              )}
            </div>
          </div>
          </>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          {activeTab !== 'public' && (selectedRoom || selectedPrivateUser) && (
            <div className="bg-white border-b border-gray-200 p-3 sm:p-4 flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedRoom(null);
                  setSelectedPrivateUser(null);
                  setShowSidebar(true);
                  joinedRoomRef.current = null;
                }}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 truncate">{getCurrentTitle()}</h2>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gradient-to-b from-white to-pink-50">
            {activeTab === 'public' || (activeTab === 'community' && selectedRoom) || (activeTab === 'private' && selectedPrivateUser) ? (
              <div className="w-full">
                {(() => {
                  const currentMessages = getCurrentMessages();
                  return currentMessages.map((msg, index) => {
                    const previousMsg = currentMessages[index - 1];
                    const showDateSeparator = shouldShowDateSeparator(msg, previousMsg);
                    
                    return (
                      <React.Fragment key={msg._id}>
                        {showDateSeparator && (
                          <div className="flex justify-center my-4">
                            <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-200">
                              <span className="text-xs font-medium text-gray-600">
                                {formatThaiDate(msg.createdAt)}
                              </span>
                            </div>
                          </div>
                        )}
                        <ChatMessageBubble
                          msg={msg}
                          currentUserId={user?._id}
                          onImageClick={handleOpenImageViewer}
                        />
                      </React.Fragment>
                    );
                  });
                })()}
      {viewerImageUrl && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setViewerImageUrl(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewerImageUrl(null)}
              className="absolute -top-10 right-0 bg-white/90 hover:bg-white text-gray-800 text-sm px-3 py-1.5 rounded-full shadow"
            >
              ปิด x
            </button>
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
              <img
                src={viewerImageUrl}
                alt={viewerImageAlt || 'รูปภาพในแชท'}
                className="w-full h-auto max-h-[80vh] object-contain bg-black"
              />
            </div>
          </div>
        </div>
      )}

                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500 px-4">
                  <MessageCircle size={48} className="mx-auto mb-4 text-gray-300 sm:w-16 sm:h-16" />
                  <p className="text-base sm:text-lg font-medium">
                    {activeTab === 'community' 
                      ? 'เลือกห้องแชทเพื่อเริ่มสนทนา' 
                      : 'เลือกผู้ใช้เพื่อเริ่มแชทส่วนตัว'}
                  </p>
                  {(activeTab === 'community' || activeTab === 'private') && (
                    <button
                      onClick={() => setShowSidebar(true)}
                      className="mt-4 md:hidden px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                    >
                      ดูรายการ
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          {(activeTab === 'public' || (activeTab === 'community' && selectedRoom) || (activeTab === 'private' && selectedPrivateUser)) && (
            <div className="bg-white border-t border-gray-200 p-3 sm:p-4">
              <div className="max-w-4xl mx-auto space-y-3">
                {imagePreviewUrl && (
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="relative">
                      <img
                        src={imagePreviewUrl}
                        alt="ตัวอย่างรูปภาพที่จะแนบ"
                        className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={clearSelectedImage}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-gray-700 shadow flex items-center justify-center hover:text-red-500"
                        title="ยกเลิกรูปภาพ"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                      <p className="font-medium text-gray-700 break-all">
                        {selectedImageFile?.name || 'รูปภาพที่เลือก'}
                      </p>
                      {selectedImageFile?.size ? (
                        <p>
                          ขนาดไฟล์ประมาณ{' '}
                          {selectedImageFile.size >= 1024 * 1024
                            ? `${(selectedImageFile.size / (1024 * 1024)).toFixed(2)} MB`
                            : `${(selectedImageFile.size / 1024).toFixed(1)} KB`}
                        </p>
                      ) : null}
                      {isUploadingImage && (
                        <p className="flex items-center gap-1 text-pink-500">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          กำลังอัปโหลดรูปภาพ...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Attach Image Button */}
                  <button
                    onClick={handleImageButtonClick}
                    disabled={isUploadingImage || isSendingMessage}
                    className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title="แนบรูปภาพ"
                  >
                    {isUploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImageIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  
                  {/* Message Input */}
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (selectedImageFile) {
                          return;
                        }
                        handleSendMessage();
                      }
                    }}
                    placeholder={selectedImageFile ? 'เพิ่มคำบรรยายรูปภาพ (ไม่บังคับ)...' : 'พิมพ์ข้อความ...'}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                    disabled={isUploadingImage}
                  />
                  
                  {/* Send Button */}
                  <button
                    onClick={handleSendMessage}
                    disabled={( !message.trim() && !selectedImageFile ) || isSendingMessage || isUploadingImage}
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {isSendingMessage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send size={18} className="sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">สร้างห้องแชทใหม่</h3>
              <form onSubmit={handleCreateRoom}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อห้อง <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="กรุณากรอกชื่อห้อง"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    คำอธิบาย
                  </label>
                  <textarea
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                    placeholder="กรุณากรอกคำอธิบายห้อง (ไม่บังคับ)"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                  />
                </div>

                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRoomIsPaid}
                      onChange={(e) => setNewRoomIsPaid(e.target.checked)}
                      className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                    />
                    <span className="text-sm font-medium text-gray-700">ห้องแชทแบบจ่ายเงิน</span>
                  </label>
                </div>

                {newRoomIsPaid && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ค่าเข้าห้อง (เหรียญ) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={newRoomEntryFee}
                      onChange={(e) => setNewRoomEntryFee(e.target.value)}
                      placeholder="เช่น 100"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                      required={newRoomIsPaid}
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateRoomModal(false);
                      setNewRoomName('');
                      setNewRoomDescription('');
                      setNewRoomIsPaid(false);
                      setNewRoomEntryFee('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'กำลังสร้าง...' : 'สร้างห้อง'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Private Chat Confirmation */}
      {userToDelete && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={closeDeletePrivateChat}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-2">ยืนยันการลบแชทส่วนตัว</h3>
            <p className="text-sm text-gray-600">
              คุณต้องการลบแชทส่วนตัวกับ{' '}
              <span className="font-semibold text-gray-800">{userToDelete.name}</span>{' '}
              หรือไม่? ข้อความทั้งหมดในห้องแชทนี้จะถูกลบถาวรและไม่สามารถกู้คืนได้
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeDeletePrivateChat}
                disabled={isDeletingRoom}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeletePrivateChat}
                disabled={isDeletingRoom}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeletingRoom ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {showPaymentModal && pendingRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 sm:p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">ยืนยันการจ่ายค่าเข้าห้อง</h3>
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  ห้อง: <span className="font-semibold">{pendingRoom.name}</span>
                </p>
                <p className="text-gray-700 mb-2">
                  ค่าเข้าห้อง: <span className="font-semibold text-pink-600">{paymentEntryFee} เหรียญ</span>
                </p>
                {user && (
                  <p className="text-gray-700 mb-2">
                    เหรียญที่มี: <span className="font-semibold">{user.coins || 0} เหรียญ</span>
                  </p>
                )}
                {user && user.coins < paymentEntryFee && (
                  <p className="text-red-600 text-sm mt-2">
                    ⚠️ เหรียญไม่พอ คุณต้องมีอย่างน้อย {paymentEntryFee} เหรียญ
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPendingRoom(null);
                    setPaymentEntryFee(0);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={isLoading || (user && user.coins < paymentEntryFee)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'กำลังดำเนินการ...' : `ยืนยันจ่าย ${paymentEntryFee} เหรียญ`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
