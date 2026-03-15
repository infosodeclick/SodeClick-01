/**
 * Global DJ Audio Manager
 * Manages audio playback that persists across navigation
 */
class DJAudioManager {
  constructor() {
    this.listenerAudioRef = null;
    this.peerConnectionRef = null;
    this.socketRef = null;
    this.isListening = false;
    this.listeningStatus = 'idle';
    this.djStream = null;
    this.userMuted = false;
    this.userVolume = 0.8;
    this.isPlaying = false;
    this.listeners = new Set(); // Callbacks for state updates
  }

  /**
   * Initialize the audio manager
   */
  init() {
    if (!this.listenerAudioRef) {
      this.listenerAudioRef = new Audio();
      this.listenerAudioRef.muted = false;
      this.listenerAudioRef.volume = this.userVolume;
      this.listenerAudioRef.autoplay = true;
      this.listenerAudioRef.crossOrigin = 'anonymous';
      this.listenerAudioRef.preload = 'auto';
      this.listenerAudioRef.controls = false;
      
      // Keep audio playing even when page is hidden
      this.listenerAudioRef.addEventListener('pause', () => {
        // Prevent pausing when component unmounts
        if (this.isListening && this.listenerAudioRef.srcObject) {
          this.listenerAudioRef.play().catch(err => {
            console.log('Audio play prevented:', err);
          });
        }
      });
    }
  }

  /**
   * Set socket reference
   */
  setSocket(socket) {
    this.socketRef = socket;
  }

  /**
   * Set DJ stream data
   */
  setDjStream(streamData) {
    this.djStream = streamData;
    this.notifyListeners();
  }

  /**
   * Start listening to DJ stream
   */
  async startListening() {
    try {
      console.log('🎧 [AudioManager] Starting to listen to DJ stream...');
      this.init();
      
      this.listeningStatus = 'connecting';
      this.isListening = true;
      this.notifyListeners();
      
      // Request connection from DJ if socket and stream are available
      if (this.socketRef && this.djStream && this.djStream.djId) {
        console.log('📡 [AudioManager] Requesting connection from DJ:', this.djStream.djId);
        this.socketRef.emit('user-ready-for-stream', {
          userId: this.socketRef.id,
          djId: this.djStream.djId
        });
      }
      
      console.log('✅ [AudioManager] Listening setup completed');
    } catch (error) {
      console.error('❌ [AudioManager] Failed to start listening:', error);
      this.listeningStatus = 'error';
      this.notifyListeners();
    }
  }

  /**
   * Stop listening to DJ stream
   * Note: This pauses the audio but doesn't destroy it, so it can resume later
   */
  stopListening() {
    console.log('🎧 [AudioManager] Stopping DJ stream listening...');
    this.isListening = false;
    this.listeningStatus = 'idle';
    
    // Don't pause or clear the audio - keep it playing in background
    // Only pause if explicitly requested (e.g., user clicks stop)
    
    if (this.peerConnectionRef) {
      try {
        if (this.peerConnectionRef instanceof RTCPeerConnection) {
          // Don't close the connection - keep it alive
          // peerConnectionRef.current.close();
        }
      } catch (error) {
        console.log('⚠️ [AudioManager] Error handling peer connection:', error);
      }
    }
    
    this.notifyListeners();
  }

  /**
   * Handle WebRTC offer from DJ
   */
  async handleWebRTCOffer(data) {
    try {
      console.log('📡 [AudioManager] Handling WebRTC offer from DJ...');
      
      // Clear any existing connection timeout
      if (this.peerConnectionRef && this.peerConnectionRef.connectionTimeout) {
        clearTimeout(this.peerConnectionRef.connectionTimeout);
      }
      
      // Create new peer connection
      this.peerConnectionRef = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });

      this.peerConnectionRef.queuedIceCandidates = [];

      // Set up connection state monitoring
      this.peerConnectionRef.onconnectionstatechange = () => {
        console.log('🔗 [AudioManager] WebRTC connection state:', this.peerConnectionRef.connectionState);
        if (this.peerConnectionRef.connectionState === 'connected') {
          console.log('✅ [AudioManager] WebRTC connection established');
          this.listeningStatus = 'streaming';
          this.isPlaying = true;
          this.notifyListeners();
        } else if (this.peerConnectionRef.connectionState === 'failed') {
          console.log('❌ [AudioManager] WebRTC connection failed');
          this.listeningStatus = 'error';
          this.notifyListeners();
        }
      };
      
      this.peerConnectionRef.oniceconnectionstatechange = () => {
        console.log('🧊 [AudioManager] ICE connection state:', this.peerConnectionRef.iceConnectionState);
        if (this.peerConnectionRef.iceConnectionState === 'connected' || 
            this.peerConnectionRef.iceConnectionState === 'completed') {
          console.log('✅ [AudioManager] ICE connection established');
        } else if (this.peerConnectionRef.iceConnectionState === 'failed') {
          console.log('❌ [AudioManager] ICE connection failed');
          this.listeningStatus = 'error';
          this.notifyListeners();
        }
      };

      // Handle incoming audio track
      this.peerConnectionRef.ontrack = (event) => {
        console.log('🎵 [AudioManager] Received audio track from DJ');
        if (event.streams && event.streams[0]) {
          this.init();
          this.listenerAudioRef.srcObject = event.streams[0];
          this.listenerAudioRef.muted = this.userMuted;
          this.listenerAudioRef.volume = this.userMuted ? 0 : this.userVolume;
          
          this.listenerAudioRef.play()
            .then(() => {
              console.log('✅ [AudioManager] Audio playback started');
              this.listeningStatus = 'streaming';
              this.isPlaying = true;
              this.notifyListeners();
            })
            .catch(error => {
              console.error('❌ [AudioManager] Failed to play audio:', error);
              this.listeningStatus = 'error';
              this.notifyListeners();
            });
        }
      };

      // Set remote description
      await this.peerConnectionRef.setRemoteDescription(data.offer);

      // Process queued ICE candidates
      if (this.peerConnectionRef.queuedIceCandidates) {
        for (const candidate of this.peerConnectionRef.queuedIceCandidates) {
          await this.peerConnectionRef.addIceCandidate(candidate);
        }
        this.peerConnectionRef.queuedIceCandidates = [];
      }

      // Create and send answer
      const answer = await this.peerConnectionRef.createAnswer();
      await this.peerConnectionRef.setLocalDescription(answer);

      if (this.socketRef) {
        this.socketRef.emit('webrtc-answer', {
          answer: answer,
          targetId: data.senderId
        });
        console.log('📡 [AudioManager] Sent WebRTC answer to DJ');
      }
    } catch (error) {
      console.error('❌ [AudioManager] Error handling WebRTC offer:', error);
      this.listeningStatus = 'error';
      this.notifyListeners();
    }
  }

  /**
   * Handle WebRTC ICE candidate
   */
  async handleIceCandidate(candidate) {
    if (!this.peerConnectionRef) {
      console.log('⚠️ [AudioManager] No peer connection, queueing ICE candidate');
      return;
    }

    try {
      if (this.peerConnectionRef.remoteDescription) {
        await this.peerConnectionRef.addIceCandidate(candidate);
        console.log('🧊 [AudioManager] Added ICE candidate');
      } else {
        // Queue the candidate if remote description is not set yet
        if (!this.peerConnectionRef.queuedIceCandidates) {
          this.peerConnectionRef.queuedIceCandidates = [];
        }
        this.peerConnectionRef.queuedIceCandidates.push(candidate);
        console.log('🧊 [AudioManager] Queued ICE candidate');
      }
    } catch (error) {
      console.error('❌ [AudioManager] Error adding ICE candidate:', error);
    }
  }

  /**
   * Toggle user mute
   */
  toggleMute() {
    this.userMuted = !this.userMuted;
    if (this.listenerAudioRef) {
      this.listenerAudioRef.muted = this.userMuted;
      this.listenerAudioRef.volume = this.userMuted ? 0 : this.userVolume;
    }
    this.notifyListeners();
  }

  /**
   * Set user volume
   */
  setVolume(volume) {
    this.userVolume = Math.max(0, Math.min(1, volume));
    if (this.listenerAudioRef && !this.userMuted) {
      this.listenerAudioRef.volume = this.userVolume;
    }
    this.notifyListeners();
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isListening: this.isListening,
      listeningStatus: this.listeningStatus,
      djStream: this.djStream,
      userMuted: this.userMuted,
      userVolume: this.userVolume,
      isPlaying: this.isPlaying
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('❌ [AudioManager] Error in listener callback:', error);
      }
    });
  }

  /**
   * Force restart connection
   */
  async forceRestart() {
    console.log('🔄 [AudioManager] Force restarting connection...');
    
    // Close existing connection
    if (this.peerConnectionRef) {
      try {
        if (this.peerConnectionRef instanceof RTCPeerConnection) {
          this.peerConnectionRef.close();
        }
      } catch (error) {
        console.log('⚠️ [AudioManager] Error closing peer connection:', error);
      }
      this.peerConnectionRef = null;
    }
    
    // Clear audio source but keep element
    if (this.listenerAudioRef) {
      this.listenerAudioRef.srcObject = null;
    }
    
    // Wait a bit then restart
    setTimeout(async () => {
      await this.startListening();
    }, 500);
  }

  /**
   * Cleanup (only call when truly shutting down)
   */
  cleanup() {
    console.log('🧹 [AudioManager] Cleaning up...');
    
    if (this.listenerAudioRef) {
      this.listenerAudioRef.pause();
      this.listenerAudioRef.srcObject = null;
      this.listenerAudioRef = null;
    }
    
    if (this.peerConnectionRef) {
      try {
        if (this.peerConnectionRef instanceof RTCPeerConnection) {
          this.peerConnectionRef.close();
        }
      } catch (error) {
        console.log('⚠️ [AudioManager] Error closing peer connection:', error);
      }
      this.peerConnectionRef = null;
    }
    
    this.isListening = false;
    this.listeningStatus = 'idle';
    this.djStream = null;
    this.listeners.clear();
  }
}

// Create singleton instance
const djAudioManager = new DJAudioManager();

export default djAudioManager;

