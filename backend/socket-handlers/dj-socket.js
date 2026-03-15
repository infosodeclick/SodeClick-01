// Socket.IO logic for DirectorJoox DJ Feature
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let connectedUsers = new Map();
let currentDJ = null;
let chatMessages = []; // Store chat messages
let currentSong = {
  title: 'Summer Vibes - DJ Mix',
  artist: 'DJ Mix',
  isPlaying: false,
  timestamp: Date.now()
};

// DJ Socket authentication middleware
const authenticateDJSocket = async (socket, token) => {
  try {
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('DJ Socket authentication error:', error);
    return null;
  }
};

const setupDJSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🎧 DJ Feature - User connected: ${socket.id}`);
    
    let authenticatedUser = null;
    
    // Handle authentication
    socket.on('dj-auth', async (data) => {
      try {
        const { token } = data;
        authenticatedUser = await authenticateDJSocket(socket, token);
        
        if (!authenticatedUser) {
          console.log(`🎧 DJ Auth failed for socket: ${socket.id}`);
          socket.emit('dj-auth-error', { message: 'Authentication failed' });
          return;
        }
        
        console.log(`🎧 DJ Auth successful for user: ${authenticatedUser.username}, role: ${authenticatedUser.role}`);
        
        // Update connected user with authenticated info
        connectedUsers.set(socket.id, {
          id: socket.id,
          username: authenticatedUser.username,
          userId: authenticatedUser._id,
          role: authenticatedUser.role,
          isDJ: false,
          connectedAt: new Date()
        });
        
        socket.emit('dj-auth-success', {
          user: {
            id: authenticatedUser._id,
            username: authenticatedUser.username,
            role: authenticatedUser.role
          },
          canAccessDJ: authenticatedUser.canAccessDJMode()
        });
        
      } catch (error) {
        console.error('DJ Auth error:', error);
        socket.emit('dj-auth-error', { message: 'Authentication error' });
      }
    });
    
    // Add user to connected users (temporary until authenticated)
    if (!connectedUsers.has(socket.id)) {
      connectedUsers.set(socket.id, {
        id: socket.id,
        username: `User_${socket.id.slice(0, 6)}`,
        isDJ: false,
        connectedAt: new Date()
      });
    }

    // Send current state to new user
    socket.emit('current state', {
      currentSong,
      connectedUsers: Array.from(connectedUsers.values()),
      currentDJ,
      isDJStreaming: currentDJ !== null && currentSong.isPlaying,
      isDJActive: currentDJ !== null,
      chatMessages: chatMessages.slice(-50) // Send last 50 messages
    });

    // Broadcast updated user count
    io.emit('user count', connectedUsers.size);

    // Handle chat messages
    socket.on('chat message', (messageData) => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        // Use username from frontend if provided, otherwise fallback to user.username
        const displayUsername = messageData.username || user.username;
        
        const message = {
          id: Date.now(),
          text: messageData.text,
          username: displayUsername,
          userId: socket.id,
          timestamp: new Date().toLocaleTimeString('th-TH', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false,
            timeZone: 'Asia/Bangkok'
          }),
          isDJ: user.isDJ || messageData.isAdmin || false
        };
        
        // Add to chat messages history
        chatMessages.push(message);
        
        // Keep only last 100 messages to prevent memory issues
        if (chatMessages.length > 100) {
          chatMessages = chatMessages.slice(-100);
        }
        
        console.log(`💬 DJ Chat message from ${displayUsername}: ${messageData.text}`);
        io.emit('chat message', message);
      }
    });

    // Handle DJ mode toggle
    socket.on('toggle dj mode', (data) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      // Check if user has DJ access permission (must be authenticated with DJ role, admin, or superadmin)
      if (!authenticatedUser || !authenticatedUser.canAccessDJMode()) {
        console.log(`🎧 DJ mode toggle denied - user not authorized: ${user.username}`);
        socket.emit('dj-auth-error', { message: 'DJ access required to enter DJ mode' });
        return;
      }

      const isRequestingDJ = data?.isDJ ?? (!user.isDJ);
      
      if (isRequestingDJ) {
        // Check if another admin is already in DJ mode
        if (currentDJ && currentDJ !== socket.id) {
          console.log(`🎧 DJ mode already taken by ${currentDJ}, rejecting ${socket.id}`);
          socket.emit('dj-mode-taken');
          return;
        }
        
        user.isDJ = true;
        currentDJ = socket.id;
        console.log(`🎧 DJ mode enabled for ${user.username} (${socket.id})`);
        
        // Broadcast DJ mode status to all clients
        io.emit('dj-mode-status', {
          isActive: true,
          adminId: socket.id,
          djName: user.username
        });
      } else {
        // Exiting DJ mode
        user.isDJ = false;
        if (currentDJ === socket.id) {
          currentDJ = null;
        }
        console.log(`🎧 DJ mode disabled for ${user.username} (${socket.id})`);
        
        // Broadcast DJ mode status to all clients
        io.emit('dj-mode-status', {
          isActive: currentDJ !== null,
          adminId: currentDJ,
          djName: currentDJ ? connectedUsers.get(currentDJ)?.username : null
        });
      }
      
      // Broadcast updated user list and DJ status
      io.emit('user update', {
        users: Array.from(connectedUsers.values()),
        currentDJ
      });

      // Send updated current state with DJ status
      io.emit('current state', {
        currentSong,
        connectedUsers: Array.from(connectedUsers.values()),
        currentDJ,
        isDJStreaming: currentDJ !== null && currentSong.isPlaying,
        isDJActive: currentDJ !== null,
        chatMessages: chatMessages.slice(-50) // Send last 50 messages
      });
    });

    // Handle DJ controls
    socket.on('dj control', (control) => {
      const user = connectedUsers.get(socket.id);
      console.log(`🎛️ Received DJ control:`, { control, user: user?.username, isDJ: user?.isDJ });
      
      // Check authentication and DJ access
      if (!authenticatedUser || !authenticatedUser.canAccessDJMode()) {
        console.log(`🎛️ DJ control denied - user not authorized: ${user?.username}`);
        socket.emit('dj-auth-error', { message: 'DJ access required for controls' });
        return;
      }
      
      if (user && user.isDJ) {
        console.log(`🎛️ Processing DJ control from ${user.username}:`, control);
        
        switch (control.type) {
          case 'play':
          case 'pause':
            currentSong.isPlaying = control.type === 'play';
            currentSong.timestamp = Date.now();
            io.emit('song control', {
              type: control.type,
              isPlaying: currentSong.isPlaying,
              timestamp: currentSong.timestamp
            });
            
            // Broadcast updated streaming status
            io.emit('user update', {
              users: Array.from(connectedUsers.values()),
              currentDJ,
              isDJStreaming: currentDJ !== null && currentSong.isPlaying
            });
            break;
            
          case 'mute':
          case 'unmute':
            io.emit('audio control', {
              type: control.type,
              isMuted: control.type === 'mute'
            });
            break;
            
          case 'change song':
            console.log('🎵 Admin changing song:', control.title);
            currentSong = {
              ...currentSong,
              title: control.title || currentSong.title,
              artist: control.artist || currentSong.artist,
              timestamp: Date.now()
            };
            console.log('🎵 Broadcasting song change to all users:', currentSong);
            io.emit('song change', currentSong);
            break;
        }
      }
    });

    // Handle user typing indicator
    socket.on('typing', (isTyping) => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        socket.broadcast.emit('user typing', {
          userId: socket.id,
          username: user.username,
          isTyping
        });
      }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id);
      console.log(`👋 DJ Feature - User disconnected: ${user?.username || socket.id}`);
      
      // If DJ disconnects, remove DJ status
      if (currentDJ === socket.id) {
        currentDJ = null;
        console.log('🎧 DJ disconnected, DJ mode available');
      }
      
      connectedUsers.delete(socket.id);
      
      // Broadcast updated user count and list
      io.emit('user count', connectedUsers.size);
      io.emit('user update', {
        users: Array.from(connectedUsers.values()),
        currentDJ
      });
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // WebRTC Audio Streaming Events
    socket.on('dj-streaming-started', (data) => {
      console.log(`🎧 DJ ${socket.id} started streaming:`, data);
      
      const djData = {
        djId: socket.id,
        djName: data?.djName || connectedUsers.get(socket.id)?.username || 'DJ'
      };
      
      // Broadcast to all users including the admin who started streaming
      console.log(`🎧 Broadcasting dj-streaming-started to all users:`, djData);
      io.emit('dj-streaming-started', djData);
    });

    socket.on('dj-streaming-stopped', (data) => {
      console.log(`🎧 DJ ${socket.id} stopped streaming:`, data);
      
      const djData = {
        djId: socket.id
      };
      
      // Broadcast to all users including the admin who stopped streaming
      console.log(`🎧 Broadcasting dj-streaming-stopped to all users:`, djData);
      io.emit('dj-streaming-stopped', djData);
    });

    // User ready for stream
    socket.on('user-ready-for-stream', (data) => {
      console.log(`🎧 BACKEND: User ${socket.id} ready for stream from DJ ${data.djId}`);
      console.log(`🎧 BACKEND: Data received:`, data);
      console.log(`🎧 BACKEND: Connected users count:`, connectedUsers.size);
      
      // Check if target DJ is connected
      const targetDJ = Array.from(connectedUsers.keys()).find(userId => userId === data.djId);
      console.log(`🎧 BACKEND: Target DJ found:`, !!targetDJ, 'Target ID:', data.djId);
      
      // Forward to the specific DJ
      socket.to(data.djId).emit('user-ready-for-stream', {
        userId: socket.id,
        username: connectedUsers.get(socket.id)?.username || 'User'
      });
      
      console.log(`🎧 BACKEND: user-ready-for-stream forwarded to DJ ${data.djId}`);
    });

    // WebRTC Signaling
    socket.on('webrtc-offer', (data) => {
      console.log(`📡 WebRTC offer from ${socket.id} to ${data.targetId}`);
      console.log(`📡 Connected users: ${connectedUsers.size}`);
      
      if (data.targetId === 'broadcast') {
        // Broadcast to all listeners (non-DJ users)
        const listeners = Array.from(connectedUsers.values()).filter(user => user.id !== socket.id);
        console.log(`📡 Broadcasting to ${listeners.length} listeners:`, listeners.map(u => u.username));
        
        socket.broadcast.emit('webrtc-offer', {
          offer: data.offer,
          senderId: socket.id
        });
        console.log(`📡 Broadcasting WebRTC offer to all listeners`);
      } else {
        // Send to specific target
        socket.to(data.targetId).emit('webrtc-offer', {
          offer: data.offer,
          senderId: socket.id
        });
      }
    });

    socket.on('webrtc-answer', (data) => {
      console.log(`📡 WebRTC answer from ${socket.id} to ${data.targetId}`);
      console.log(`📡 Answer details:`, {
        targetId: data.targetId,
        answerType: data.answer.type,
        hasAnswer: !!data.answer
      });
      
      // Send answer back to the admin (targetId is the admin's socket.id)
      socket.to(data.targetId).emit('webrtc-answer', {
        answer: data.answer,
        senderId: socket.id  // This is the user who sent the answer
      });
    });

    socket.on('webrtc-ice-candidate', (data) => {
      console.log(`🧊 ICE candidate from ${socket.id} to ${data.targetId}`);
      console.log(`🧊 ICE candidate details:`, {
        targetId: data.targetId,
        hasCandidate: !!data.candidate,
        candidateType: data.candidate?.type
      });
      
      if (data.targetId === 'broadcast') {
        // Broadcast to all listeners (non-DJ users)
        console.log(`🧊 Broadcasting ICE candidate to all listeners`);
        socket.broadcast.emit('webrtc-ice-candidate', {
          candidate: data.candidate,
          senderId: socket.id
        });
      } else {
        // Send to specific target
        console.log(`🧊 Sending ICE candidate to specific user: ${data.targetId}`);
        socket.to(data.targetId).emit('webrtc-ice-candidate', {
          candidate: data.candidate,
          senderId: socket.id
        });
      }
    });
  });
};

module.exports = { setupDJSocketHandlers };

