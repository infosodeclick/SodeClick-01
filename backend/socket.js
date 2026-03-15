// Socket.IO instance manager
// This module prevents circular dependencies between server.js and route files

let io = null;

/**
 * Initialize the Socket.IO instance
 * @param {Object} socketInstance - The Socket.IO instance from server.js
 */
function initializeSocket(socketInstance) {
  io = socketInstance;
}

/**
 * Get the Socket.IO instance
 * @returns {Object|null} - The Socket.IO instance or null if not initialized
 */
function getSocketInstance() {
  return io;
}

/**
 * Check if Socket.IO is initialized
 * @returns {boolean} - True if initialized, false otherwise
 */
function isSocketInitialized() {
  return io !== null;
}

module.exports = {
  initializeSocket,
  getSocketInstance,
  isSocketInitialized
};
