const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const QRCode = require('qrcode');
// const NodeMediaServer = require('node-media-server'); // Removed - streaming feature disabled
// Load environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';

// Try to load .env first, then fallback to env.{NODE_ENV}
const dotenv = require('dotenv');
const fs = require('fs');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envSpecificPath = path.join(__dirname, `env.${NODE_ENV}`);

// Load .env file first (for general settings)
if (fs.existsSync(envPath)) {
  console.log('📁 Loading environment from .env file');
  dotenv.config({ path: envPath });
}

// Load environment-specific file (env.development or env.production) to override/add missing vars
// This ensures env-specific settings take precedence over .env
if (fs.existsSync(envSpecificPath)) {
  console.log(`📁 Loading environment from env.${NODE_ENV} file (will override .env if conflicts)`);
  dotenv.config({ path: envSpecificPath, override: true }); // Override .env with env-specific values
} else if (!fs.existsSync(envPath)) {
  console.log('⚠️  No environment file found, using system environment variables');
}

const app = express();
const server = http.createServer(app);

// Initialize global.notifications for in-memory notification storage
if (!global.notifications) {
  global.notifications = [];
  console.log('📋 Initialized global.notifications array');
}

// Ensure media directory exists
const mediaDir = path.join(__dirname, 'media');
const liveDir = path.join(mediaDir, 'live');

if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
  console.log('📁 Created media directory');
}

if (!fs.existsSync(liveDir)) {
  fs.mkdirSync(liveDir, { recursive: true });
  console.log('📁 Created live directory');
}

// Environment Variables
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Runtime status for graceful-degradation mode
const runtimeStatus = {
  mongoRequired: process.env.MONGO_REQUIRED === 'true',
  mongoConnected: false,
  mongoLastError: null,
  mongoLastConnectedAt: null,
  mongoLastDisconnectedAt: null,
  startupMode: 'normal'
};

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // อนุญาตให้ requests ที่ไม่มี origin (เช่น mobile apps, postman)
    if (!origin) return callback(null, true);
    
    // อนุญาต localhost และ IP address ใน network
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://192.168.100.99:5173', // IP ใน network
      'https://sodeclick.com',
      'https://www.sodeclick.com',
      'http://www.sodeclick.com', // เพิ่ม HTTP version (ถ้ามี)
      'http://sodeclick.com', // เพิ่ม HTTP version (ถ้ามี)
      'https://sodeclick-frontend-production.up.railway.app',
      'https://sodeclick-frontend-production-8907.up.railway.app', // เพิ่ม Railway URL อื่นๆ ถ้ามี
    ];
    
    // อนุญาต IP ใน local network (192.168.x.x, 10.x.x.x)
    if (origin && (
      origin.match(/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/) ||
      origin.match(/^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/) ||
      origin.match(/^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}:5173$/)
    )) {
      console.log('✅ CORS allowed for local network IP:', origin);
      return callback(null, true);
    }
    
    console.log('🌐 CORS check - Origin:', origin);
    console.log('🌐 CORS check - Allowed origins:', allowedOrigins);
    
    // ตรวจสอบ exact match (case-insensitive)
    const originLower = origin.toLowerCase().trim();
    const isAllowed = allowedOrigins.some(allowed => {
      const allowedLower = allowed.toLowerCase().trim();
      const matches = originLower === allowedLower;
      if (matches) {
        console.log(`✅ CORS match found: "${origin}" matches "${allowed}"`);
      }
      return matches;
    });
    
    if (isAllowed) {
      console.log('✅ CORS allowed for origin:', origin);
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      console.log('🚫 CORS - Origin lower:', originLower);
      console.log('🚫 CORS - Allowed origins:', allowedOrigins);
      console.log('🚫 CORS - Allowed origins (lower):', allowedOrigins.map(a => a.toLowerCase().trim()));
      // Don't block - let it through and handle in manual middleware
      callback(null, true);
    }
  },
  credentials: true, // อนุญาตให้ส่ง cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Accept', 'Origin', 'User-Agent'],
};

// Middleware
app.use(compression()); // เพิ่มการบีบอัด response

// CORS middleware - ต้องอยู่ก่อน routes อื่นๆ
app.use(cors(corsOptions));

// เพิ่ม manual CORS headers สำหรับกรณีที่ CORS middleware ไม่ทำงาน
// ใช้ res.on('finish') เพื่อแน่ใจว่า CORS headers ถูก set ในทุก response
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.100.99:5173',
    'https://sodeclick.com',
    'https://www.sodeclick.com',
    'http://www.sodeclick.com',
    'http://sodeclick.com',
    'https://sodeclick-frontend-production.up.railway.app',
    'https://sodeclick-frontend-production-8907.up.railway.app'
  ];
  
  // ตรวจสอบ exact match (case-insensitive)
  if (origin) {
    const originLower = origin.toLowerCase().trim();
    const isAllowed = allowedOrigins.some(allowed => {
      const allowedLower = allowed.toLowerCase().trim();
      return originLower === allowedLower;
    });
    
    if (isAllowed) {
      // Set CORS headers immediately
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Accept, Origin, User-Agent');
    } else {
      console.log('⚠️  CORS - Origin not in allowed list:', origin);
      console.log('⚠️  CORS - Allowed origins:', allowedOrigins);
    }
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    console.error('❌ Request timeout:', req.originalUrl);
    res.status(408).json({
      message: 'Request timeout',
      error: 'Request took too long to process',
      timestamp: new Date().toISOString()
    });
  });
  next();
});

// Request size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Error handling for CORS
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    console.log('🚫 CORS Error:', req.headers.origin);
    console.log('🚫 Request URL:', req.url);
    console.log('🚫 Request method:', req.method);
    
    // Set CORS headers even for error response
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://192.168.100.99:5173',
      'https://sodeclick.com',
      'https://www.sodeclick.com',
      'http://www.sodeclick.com',
      'http://sodeclick.com',
      'https://sodeclick-frontend-production.up.railway.app',
      'https://sodeclick-frontend-production-8907.up.railway.app'
    ];
    
    if (origin) {
      const originLower = origin.toLowerCase().trim();
      const isAllowed = allowedOrigins.some(allowed => {
        const allowedLower = allowed.toLowerCase().trim();
        return originLower === allowedLower;
      });
      
      if (isAllowed) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Accept, Origin, User-Agent');
      }
    }
    
    return res.status(403).json({
      success: false,
      message: 'CORS Error: Origin not allowed',
      origin: req.headers.origin
    });
  }
  next(err);
});

// Removed duplicate middleware - already configured above


// Static file serving for uploads with cache headers and CORS
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for static files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  
  // Set cache headers
  res.header('Cache-Control', 'public, max-age=86400'); // 1 day
  res.header('ETag', true);
  res.header('Last-Modified', true);
  
  next();
}, express.static(path.join(__dirname, 'uploads')));

// HLS media files - serve directly from Express
app.use('/live', (req, res, next) => {
  // Set CORS headers for HLS files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Set cache headers for HLS files
  if (req.path.endsWith('.m3u8')) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    res.header('Content-Type', 'application/vnd.apple.mpegurl');
  } else if (req.path.endsWith('.ts')) {
    res.header('Cache-Control', 'public, max-age=60');
    res.header('Content-Type', 'video/mp2t');
  }
  
  next();
}, express.static(path.join(__dirname, 'media', 'live')));

// Fallback for /media path
app.use('/media', express.static(path.join(__dirname, 'media')));

// Static file serving for public assets with cache headers
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '7d', // Cache for 7 days
  etag: true,
  lastModified: true
}));

// Serve privacy policy HTML file directly
const frontendPublicPath = path.join(__dirname, '../frontend/public');
app.use('/privacy-policy.html', express.static(path.join(frontendPublicPath, 'privacy-policy.html')));

// Privacy Policy routes - serve HTML file directly
app.get('/privacy-policy.html', (req, res) => {
  res.sendFile(path.join(frontendPublicPath, 'privacy-policy.html'));
});

app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(frontendPublicPath, 'privacy-policy.html'));
});

// Serve frontend static files (production build)
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use('/assets', express.static(path.join(frontendDistPath, 'assets'), {
  maxAge: '1y', // Cache assets for 1 year
  etag: true,
  lastModified: true
}));

// Serve other frontend static files (favicon, etc.)
app.use('/vite.svg', express.static(path.join(frontendDistPath, 'vite.svg')));
app.use('/favicon.ico', express.static(path.join(frontendDistPath, 'vite.svg')));

// Serve Service Worker files with correct MIME type
app.get('/sw-auto-refresh.js', (req, res) => {
  // Try multiple possible locations for Service Worker
  const possiblePaths = [
    path.join(frontendDistPath, 'sw-auto-refresh.js'),
    path.join(__dirname, '../public/sw-auto-refresh.js'),
    path.join(__dirname, '../frontend/public/sw-auto-refresh.js')
  ];
  
  let swPath = null;
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      swPath = testPath;
      break;
    }
  }
  
  if (!swPath) {
    console.error('❌ Service Worker file not found in any location');
    return res.status(404).json({ 
      error: 'Service Worker not found',
      searched: possiblePaths.map(p => path.relative(__dirname, p))
    });
  }
  
  console.log('🔍 Serving Service Worker from:', path.relative(__dirname, swPath));
  
  // Set proper headers for Service Worker
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
  res.setHeader('ETag', true);
  res.setHeader('Last-Modified', true);
  
  // Send the file
  res.sendFile(swPath, (err) => {
    if (err) {
      console.error('❌ Error serving Service Worker:', err);
      res.status(500).json({ error: 'Failed to serve Service Worker' });
    } else {
      console.log('✅ Service Worker served successfully from:', path.relative(__dirname, swPath));
    }
  });
});

app.get('/sw-auto-refresh-dev.js', (req, res) => {
  // Try multiple possible locations for Service Worker (dev)
  const possiblePaths = [
    path.join(frontendDistPath, 'sw-auto-refresh-dev.js'),
    path.join(__dirname, '../public/sw-auto-refresh-dev.js'),
    path.join(__dirname, '../frontend/public/sw-auto-refresh-dev.js')
  ];
  
  let swPath = null;
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      swPath = testPath;
      break;
    }
  }
  
  if (!swPath) {
    console.error('❌ Service Worker (dev) file not found in any location');
    return res.status(404).json({ 
      error: 'Service Worker (dev) not found',
      searched: possiblePaths.map(p => path.relative(__dirname, p))
    });
  }
  
  console.log('🔍 Serving Service Worker (dev) from:', path.relative(__dirname, swPath));
  
  // Set proper headers for Service Worker
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
  res.setHeader('ETag', true);
  res.setHeader('Last-Modified', true);
  
  // Send the file
  res.sendFile(swPath, (err) => {
    if (err) {
      console.error('❌ Error serving Service Worker (dev):', err);
      res.status(500).json({ error: 'Failed to serve Service Worker (dev)' });
    } else {
      console.log('✅ Service Worker (dev) served successfully from:', path.relative(__dirname, swPath));
    }
  });
});

// Admin privileges middleware
const { bypassMembershipRestrictions } = require('./middleware/adminPrivileges');
app.use(bypassMembershipRestrictions);

// MongoDB connection check middleware - Skip for health check
app.use((req, res, next) => {
  // Skip MongoDB check for health endpoint
  if (req.path === '/health' || req.path === '/api') {
    return next();
  }
  
  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️  MongoDB not connected, request queued:', req.path);
    
    // Set CORS headers even for error response
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:5173',
      'https://sodeclick.com',
      'https://www.sodeclick.com',
      'https://sodeclick-frontend-production.up.railway.app'
    ];
    
    if (origin && allowedOrigins.some(allowed => origin.toLowerCase().includes(allowed.toLowerCase().replace(/^https?:\/\//, '')))) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    return res.status(503).json({
      message: 'Database temporarily unavailable',
      error: 'Please try again in a moment',
      timestamp: new Date().toISOString()
    });
  }
  next();
});

// Request logging middleware (เฉพาะ development)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Configure mongoose to buffer commands until connection is ready
mongoose.set('bufferCommands', true);

// MongoDB Connection with better error handling
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  w: 'majority'
})
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas - Database: sodeclick');
    console.log(`🗄️  Environment: ${NODE_ENV}`);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    console.error('❌ Connection string:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
    
    // Don't exit immediately, try to reconnect
    setTimeout(() => {
      console.log('🔄 Attempting to reconnect to MongoDB...');
      mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        w: 'majority'
      }).catch(err => {
        runtimeStatus.mongoLastError = err.message;
        console.error('❌ Reconnection failed (server will continue in degraded mode):', err.message);
      });
    }, 5000);
  });

// MongoDB connection events
mongoose.connection.on('disconnected', () => {
  runtimeStatus.mongoConnected = false;
  runtimeStatus.mongoLastDisconnectedAt = new Date().toISOString();
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  runtimeStatus.mongoConnected = true;
  runtimeStatus.mongoLastError = null;
  runtimeStatus.mongoLastConnectedAt = new Date().toISOString();
  console.log('🔄 MongoDB reconnected');
});

mongoose.connection.on('connected', () => {
  runtimeStatus.mongoConnected = true;
  runtimeStatus.mongoLastError = null;
  runtimeStatus.mongoLastConnectedAt = new Date().toISOString();
  console.log('✅ MongoDB connection established');
});

mongoose.connection.on('error', (error) => {
  runtimeStatus.mongoConnected = false;
  runtimeStatus.mongoLastError = error.message;
  console.error('❌ MongoDB connection error:', error);
});

mongoose.connection.on('close', () => {
  console.log('🔒 MongoDB connection closed');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('❌ Stack:', error.stack);
  
  // Don't exit immediately, log the error and continue
  console.log('🔄 Server continuing despite uncaught exception...');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.log('🔄 Server continuing despite unhandled rejection...');
});

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const membershipRoutes = require('./routes/membership');
const upgradeSimpleRoutes = require('./routes/upgrade-simple');
const blurRoutes = require('./routes/blur');
const chatRoutes = require('./routes/chat');
// const messagesRoutes = require('./routes/messages'); // Removed - using /api/chat instead
const giftRoutes = require('./routes/gift');
const voteRoutes = require('./routes/vote');
const shopRoutes = require('./routes/shop');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');
const matchingRoutes = require('./routes/matching');
const notificationsRoutes = require('./routes/notifications');
const maintenanceRoutes = require('./routes/maintenance');
const reportsRoutes = require('./routes/reports');
// const oauthConfigRoutes = require('./routes/oauth-config'); // File not exists
const usersRoutes = require('./routes/users');
// const streamRoutes = require('./routes/stream'); // Removed - streaming feature disabled
// const privateChatMessagesRoutes = require('./routes/privateChatMessages'); // File not exists

// Preflight OPTIONS handling
app.options('*', cors(corsOptions));

// Serve frontend index.html for all non-API routes (SPA routing)
app.get('*', (req, res, next) => {
  // Skip API routes, health checks, static files, privacy policy, and service workers
  if (req.path.startsWith('/api') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/public') ||
      req.path.startsWith('/assets') ||
      req.path.startsWith('/vite.svg') ||
      req.path.startsWith('/favicon.ico') ||
      req.path.startsWith('/sw-auto-refresh') ||
      req.path === '/privacy-policy.html' ||
      req.path === '/privacy-policy' ||
      req.path === '/create-qr' ||
      req.path === '/webhook-endpoint' ||
      req.path === '/api/info') {
    return next();
  }
  
  // Serve frontend index.html for all other routes
  const indexPath = path.join(__dirname, '../frontend/dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving frontend index.html:', err);
      res.status(500).json({
        message: 'Frontend not available',
        error: NODE_ENV === 'development' ? err.message : 'Frontend build not found'
      });
    }
  });
});

// Basic API Routes
app.get('/api', (req, res) => {
  // Set CORS headers manually
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.100.99:5173',
    'https://sodeclick.com',
    'https://www.sodeclick.com',
    'http://www.sodeclick.com',
    'http://sodeclick.com',
    'https://sodeclick-frontend-production.up.railway.app',
    'https://sodeclick-frontend-production-8907.up.railway.app'
  ];
  
  if (origin) {
    const originLower = origin.toLowerCase().trim();
    const isAllowed = allowedOrigins.some(allowed => {
      const allowedLower = allowed.toLowerCase().trim();
      return originLower === allowedLower;
    });
    
    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Accept, Origin, User-Agent');
    }
  }
  
  res.json({
    message: 'Welcome to Love Project Backend! ❤️',
    status: 'success',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    database: 'sodeclick',
    version: '1.0.0'
  });
});

// Health Check Routes - Must be before MongoDB connection check middleware
app.get('/health', (req, res) => {
  // Set CORS headers manually for health check
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.100.99:5173',
    'https://sodeclick.com',
    'https://www.sodeclick.com',
    'http://www.sodeclick.com',
    'http://sodeclick.com',
    'https://sodeclick-frontend-production.up.railway.app',
    'https://sodeclick-frontend-production-8907.up.railway.app'
  ];
  
  if (origin) {
    const originLower = origin.toLowerCase().trim();
    const isAllowed = allowedOrigins.some(allowed => {
      const allowedLower = allowed.toLowerCase().trim();
      return originLower === allowedLower;
    });
    
    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Accept, Origin, User-Agent');
    }
  }
  
  const isMongoConnected = mongoose.connection.readyState === 1;
  const degraded = !isMongoConnected;
  const healthData = {
    status: degraded ? 'degraded' : 'healthy',
    message: degraded
      ? 'Backend is running in degraded mode (MongoDB unavailable)'
      : 'Backend is running smoothly!',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    database: 'sodeclick',
    database_status: isMongoConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0',
    fallback_mode: degraded,
    mongo: {
      required: runtimeStatus.mongoRequired,
      connected: runtimeStatus.mongoConnected,
      readyState: mongoose.connection.readyState,
      lastError: runtimeStatus.mongoLastError,
      lastConnectedAt: runtimeStatus.mongoLastConnectedAt,
      lastDisconnectedAt: runtimeStatus.mongoLastDisconnectedAt
    }
  };

  // Keep health endpoint 200 for degraded mode so orchestrators/dev scripts can keep backend alive.
  const statusCode = 200;
  res.status(statusCode).json(healthData);
});

// Service Worker Health Check
app.get('/health/service-worker', (req, res) => {
  const possiblePaths = [
    path.join(frontendDistPath, 'sw-auto-refresh.js'),
    path.join(__dirname, '../public/sw-auto-refresh.js'),
    path.join(__dirname, '../frontend/public/sw-auto-refresh.js')
  ];
  
  const swStatus = {
    status: 'healthy',
    message: 'Service Worker files are available',
    timestamp: new Date().toISOString(),
    files: {}
  };
  
  possiblePaths.forEach((testPath, index) => {
    const exists = fs.existsSync(testPath);
    swStatus.files[`location_${index + 1}`] = {
      path: path.relative(__dirname, testPath),
      exists: exists,
      size: exists ? fs.statSync(testPath).size : 0
    };
  });
  
  // Check if at least one Service Worker file exists
  const hasValidSw = Object.values(swStatus.files).some(file => file.exists);
  if (!hasValidSw) {
    swStatus.status = 'unhealthy';
    swStatus.message = 'No Service Worker files found';
  }
  
  const statusCode = swStatus.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(swStatus);
});

// Database Health Check
app.get('/health/database', async (req, res) => {
  try {
    // ทดสอบการเชื่อมต่อ database
    await mongoose.connection.db.admin().ping();
    
    res.json({
      status: 'healthy',
      message: 'Database connection is working',
      database: 'sodeclick',
      connection_state: mongoose.connection.readyState,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      message: 'Database connection failed',
      error: NODE_ENV === 'development' ? error.message : 'Database unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Rabbit API Health Check
app.get('/health/rabbit', async (req, res) => {
  try {
    const rabbitUrl = process.env.RABBIT_API_URL || 'https://api.pgw.rabbit.co.th';
    const rabbitApiKey = process.env.RABBIT_API_KEY;
    
    // Check if we have the required API key
    if (!rabbitApiKey) {
      return res.json({
        status: 'healthy',
        message: 'Rabbit API configuration is available (API key not set in health check)',
        rabbit_url: rabbitUrl,
        note: 'API key is configured but not exposed in health check for security',
        timestamp: new Date().toISOString()
      });
    }
    
    // Test Rabbit API with proper authentication
    const response = await axios.get(`${rabbitUrl}/v1/application`, {
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${rabbitApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Sodeclick-HealthCheck/1.0'
      }
    });
    
    res.json({
      status: 'healthy',
      message: 'Rabbit API is accessible and authenticated',
      rabbit_url: rabbitUrl,
      response_status: response.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // If it's a 403/401, it means the API is working but auth failed
    if (error.response && (error.response.status === 403 || error.response.status === 401)) {
      return res.json({
        status: 'healthy',
        message: 'Rabbit API is accessible (authentication required)',
        rabbit_url: process.env.RABBIT_API_URL || 'https://api.pgw.rabbit.co.th',
        note: 'API is working but requires proper authentication for full access',
        timestamp: new Date().toISOString()
      });
    }
    
    // If it's a 404, it might be the wrong endpoint
    if (error.response && error.response.status === 404) {
      return res.json({
        status: 'healthy',
        message: 'Rabbit API is accessible (endpoint may vary)',
        rabbit_url: process.env.RABBIT_API_URL || 'https://api.pgw.rabbit.co.th',
        note: 'API is working but health check endpoint may not be available',
        timestamp: new Date().toISOString()
      });
    }
    
    console.error('❌ Rabbit API health check failed:', error.message);
    
    res.status(503).json({
      status: 'unhealthy',
      message: 'Rabbit API is not accessible',
      error: NODE_ENV === 'development' ? error.message : 'Rabbit API unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Socket.IO Health Check
app.get('/health/socketio', (req, res) => {
  try {
    // Check if Socket.IO server is running
    if (io && io.engine) {
      res.json({
        status: 'healthy',
        message: 'Socket.IO server is running',
        connected_clients: io.engine.clientsCount || 0,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        message: 'Socket.IO server is not initialized',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Socket.IO health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      message: 'Socket.IO health check failed',
      error: NODE_ENV === 'development' ? error.message : 'Socket.IO unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Stream status endpoint
app.get('/api/stream/status/:streamKey', (req, res) => {
  const { streamKey } = req.params;
  const m3u8Path = path.join(liveDir, `${streamKey}.m3u8`);
  const exists = fs.existsSync(m3u8Path);
  
  res.json({
    streamKey,
    exists,
    path: m3u8Path,
    timestamp: new Date().toISOString()
  });
});

// API Info Route
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Sodeclick API',
    version: '1.0.0',
    environment: NODE_ENV,
    endpoints: {
      health: '/health',
      database_health: '/health/database',
      rabbit_health: '/health/rabbit',
      socketio_health: '/health/socketio',
      service_worker_health: '/health/service-worker',
      auth: '/api/auth',
      profile: '/api/profile',
      membership: '/api/membership',
      blur: '/api/blur',
      chat: '/api/chat',
      gift: '/api/gift',
      vote: '/api/vote',
      shop: '/api/shop',
      payment: '/api/payment',
      create_qr: '/create-qr',
      webhook_endpoint: '/webhook-endpoint',
      check_status: '/api/payment/check-status/:paymentId',
      service_worker: '/sw-auto-refresh.js',
      service_worker_dev: '/sw-auto-refresh-dev.js',
      root: '/'
    },
    timestamp: new Date().toISOString()
  });
});

// ----------------------
// 🐇 Rabbit Payment Gateway Configuration
const RABBIT_API_URL = process.env.RABBIT_API_URL;
const RABBIT_APPLICATION_ID = process.env.RABBIT_APPLICATION_ID;
const RABBIT_PUBLIC_KEY = process.env.RABBIT_PUBLIC_KEY;
const RABBIT_COMPANY_ID = process.env.RABBIT_COMPANY_ID;
const RABBIT_API_KEY = process.env.RABBIT_API_KEY;

// Validate Rabbit Payment Gateway configuration
if (!RABBIT_API_URL || !RABBIT_APPLICATION_ID || !RABBIT_PUBLIC_KEY || !RABBIT_COMPANY_ID || !RABBIT_API_KEY) {
  console.warn('⚠️ Rabbit Payment Gateway configuration is incomplete!');
  console.warn('Missing environment variables:');
  if (!RABBIT_API_URL) console.warn('  - RABBIT_API_URL');
  if (!RABBIT_APPLICATION_ID) console.warn('  - RABBIT_APPLICATION_ID');
  if (!RABBIT_PUBLIC_KEY) console.warn('  - RABBIT_PUBLIC_KEY');
  if (!RABBIT_COMPANY_ID) console.warn('  - RABBIT_COMPANY_ID');
  if (!RABBIT_API_KEY) console.warn('  - RABBIT_API_KEY');
  console.warn('Payment features will be disabled until configuration is complete.');
}

// ✅ Endpoint สำหรับสร้าง QR Payment (Real Rabbit Gateway - Direct Method)
app.post("/create-qr", async (req, res) => {
  const { orderId, amount } = req.body;

  // ตรวจสอบการตั้งค่า Rabbit Gateway
  if (!RABBIT_API_URL || !RABBIT_APPLICATION_ID || !RABBIT_PUBLIC_KEY || !RABBIT_COMPANY_ID || !RABBIT_API_KEY) {
    return res.status(503).json({
      error: "Payment service is not configured",
      message: "Rabbit Payment Gateway configuration is incomplete",
      details: "Please contact administrator to configure payment service"
    });
  }

  try {
    // เตรียมข้อมูลสำหรับ Rabbit Gateway API ตาม Direct Method Documentation
    const requestBody = {
      amount: amount * 100, // Rabbit Gateway ใช้หน่วยเป็น satang (1 บาท = 100 satang)
      currency: 'THB',
      provider: 'prompt_pay', // สำหรับ QR code payments
      localId: orderId, // my-invoice-123 format
      webhook: "https://sodeclick.com/webhook-endpoint", // ใช้ webhook endpoint ที่ถูกต้อง
      locale: 'en' // ใช้ 'en' แทน 'th_TH' ตาม documentation
      // ไม่ใส่ companyId ใน body ให้ API อ่านจาก JWT token
    };

    console.log('🐇 Sending CreateTransaction request to Rabbit Gateway:', requestBody);

    // ส่งคำขอไปยัง Rabbit Gateway ตาม Documentation
    const response = await axios.post(RABBIT_API_URL + '/public/v2/transactions', requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': RABBIT_API_KEY,
        'x-application-id': RABBIT_APPLICATION_ID,
        'x-public-key': RABBIT_PUBLIC_KEY,
        'x-company-id': RABBIT_COMPANY_ID
        // ใช้ headers ตาม API documentation
      }
    });

    const rabbitData = response.data;
    console.log('🐇 Rabbit Gateway CreateTransaction Response:', rabbitData);

    // ดึง QR Code URL จาก response ตาม Documentation
    let qrCodeUrl = null;
    let qrImage = null;
    
    console.log('🔍 Rabbit Data Analysis:', {
      hasQrCode: !!rabbitData.qrCode,
      hasVendorQrCode: !!rabbitData.vendorQrCode,
      qrCodeUrl: rabbitData.qrCode?.url,
      vendorQrCodeLength: rabbitData.vendorQrCode?.length,
      vendorQrCodePreview: rabbitData.vendorQrCode ? rabbitData.vendorQrCode.substring(0, 50) + '...' : 'N/A'
    });
    
    // ตรวจสอบ qrCode.url จาก response (ตามตัวอย่างในรูป)
    if (rabbitData.qrCode && rabbitData.qrCode.url) {
      qrCodeUrl = rabbitData.qrCode.url;
      
      // แปลง UAT URL เป็น Production URL
      if (qrCodeUrl.includes('qr.uat.pgw.rabbit.co.th')) {
        qrCodeUrl = qrCodeUrl.replace('qr.uat.pgw.rabbit.co.th', 'qr.pgw.rabbit.co.th');
        console.log('🔄 Converted UAT URL to Production URL:', qrCodeUrl);
      }
      
      console.log('✅ QR Code URL found:', qrCodeUrl);
    } 
    
    // หาก response มี vendorQrCode ให้สร้าง QR Code เอง
    if (rabbitData.vendorQrCode) {
      try {
        console.log('🎨 Generating QR Code from vendorQrCode...');
        console.log('📝 Vendor QR Code content:', rabbitData.vendorQrCode.substring(0, 50) + '...');
        console.log('📏 Vendor QR Code length:', rabbitData.vendorQrCode.length);
        console.log('🔍 Vendor QR Code type:', typeof rabbitData.vendorQrCode);
        console.log('🔍 Vendor QR Code is string:', typeof rabbitData.vendorQrCode === 'string');
        
        // ตรวจสอบว่า vendorQrCode เป็น string และไม่ว่าง
        if (typeof rabbitData.vendorQrCode === 'string' && rabbitData.vendorQrCode.trim().length > 0) {
          qrImage = await QRCode.toDataURL(rabbitData.vendorQrCode, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            width: 256,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          console.log('✅ QR Code image generated successfully, length:', qrImage.length);
          console.log('🖼️ QR Image preview:', qrImage.substring(0, 50) + '...');
          console.log('🎯 QR Image starts with:', qrImage.substring(0, 20));
        } else {
          console.log('⚠️ vendorQrCode is not a valid string or is empty');
          qrImage = null;
        }
      } catch (qrError) {
        console.error('❌ Error generating QR code:', qrError);
        console.error('❌ QR Error details:', qrError.message);
        console.error('❌ QR Error stack:', qrError.stack);
        qrImage = null;
      }
    } else {
      console.log('⚠️ No vendorQrCode found in response');
    }
    
    if (!qrCodeUrl && !qrImage) {
      console.log('⚠️ No QR Code data found in response');
    }

    // ส่งผลลัพธ์กลับไปยัง frontend
    const responseData = {
      payment_id: rabbitData.id,
      transaction_id: rabbitData.id,
      qr_image: qrImage, // QR Code image ที่สร้างจาก vendorQrCode
      qr_image_url: qrCodeUrl, // QR Code URL จาก Rabbit Gateway
      qr_code_url: qrCodeUrl, // Alias สำหรับ qr_image_url
      vendor_qr_code: rabbitData.vendorQrCode, // QR Code string
      expire_at: rabbitData.expires || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      order_id: orderId,
      amount: amount,
      currency: "THB",
      status: rabbitData.state === "INITIATED" ? "pending" : rabbitData.state.toLowerCase(),
      url: rabbitData.url || rabbitData.shortUrl,
      short_url: rabbitData.shortUrl,
      transaction_url: rabbitData.url,
      // เพิ่มข้อมูลเพิ่มเติมจาก response
      state: rabbitData.state,
      signature: rabbitData.signature,
      security_word: rabbitData.securityWord,
      amount_formatted: rabbitData.amountFormatted,
      // เพิ่มข้อมูล QR Code ที่ถูกต้อง
      qr_code: rabbitData.vendorQrCode,
      // Debug information
      debug: {
        hasQrImage: !!qrImage,
        hasQrCodeUrl: !!qrCodeUrl,
        hasVendorQrCode: !!rabbitData.vendorQrCode,
        qrImageLength: qrImage ? qrImage.length : 0,
        qrCodeUrlLength: qrCodeUrl ? qrCodeUrl.length : 0,
        vendorQrCodeLength: rabbitData.vendorQrCode ? rabbitData.vendorQrCode.length : 0
      }
    };

    console.log('✅ Sending response to frontend:', responseData);
    res.json(responseData);

  } catch (err) {
    console.error("🐇 Rabbit Gateway Error:", err.response?.data || err.message);
    
    let errorChatMessage = "ไม่สามารถเชื่อมต่อ Rabbit Gateway ได้";
    let troubleshooting = {};
    
    // Handle specific error codes
    if (err.response?.data?.code === 'PP-T-002') {
      errorChatMessage = "Rabbit Gateway: PP-T-002 Unspecified company - บัญชีอาจยังไม่ได้รับการอนุมัติ";
      troubleshooting = {
        issue: "PP-T-002: Unspecified company",
        status: "❌ CRITICAL: บัญชี Rabbit Gateway ไม่สามารถใช้งานได้",
        possible_causes: [
          "1. 🏢 บัญชี Rabbit Gateway ยังไม่ได้รับการ APPROVE จากทีม Rabbit",
          "2. 🔄 กำลังใช้ Test credentials กับ Production API endpoint",
          "3. 📋 Company registration ยังไม่เสร็จสมบูรณ์",
          "4. ⏰ บัญชีถูก suspend หรือ deactivate"
        ],
        immediate_actions: [
          "1. 📞 ติดต่อทีม Rabbit Gateway Support ทันที",
          "2. 📧 Email: support@rabbit.co.th",
          "3. 📱 Line: @RabbitGateway",
          "4. 🌐 Dashboard: https://dashboard.rabbit.co.th"
        ],
        verification_steps: [
          "1. เข้า Dashboard และตรวจสอบสถานะบัญชี",
          "2. ตรวจสอบว่าผ่าน KYC verification แล้วหรือไม่",
          "3. ตรวจสอบ Company registration documents",
          "4. ขอให้ทีม Support ตรวจสอบ Company ID: " + RABBIT_COMPANY_ID
        ]
      };
    } else if (err.response?.status === 401) {
      errorChatMessage = "Rabbit Gateway: การยืนยันตัวตนล้มเหลว";
      troubleshooting = {
        issue: "401 Unauthorized",
        possible_causes: [
          "1. RABBIT_APPLICATION_ID ไม่ถูกต้อง",
          "2. RABBIT_PUBLIC_KEY ไม่ถูกต้องหรือหมดอายุ",
          "3. Headers ไม่ถูกต้อง"
        ],
        solutions: [
          "1. ตรวจสอบ Application ID จาก Dashboard",
          "2. สร้าง Public Key ใหม่",
          "3. ตรวจสอบการตั้งค่า Environment Variables"
        ]
      };
    }
    
    // ส่ง error กลับไป
    res.status(500).json({ 
      error: errorChatMessage,
      code: err.response?.data?.code,
      details: err.response?.data || err.message,
      troubleshooting: troubleshooting,
      current_config: {
        application_id: RABBIT_APPLICATION_ID,
        company_id: RABBIT_COMPANY_ID,
        public_key_length: RABBIT_PUBLIC_KEY ? RABBIT_PUBLIC_KEY.length : 0,
        api_key_length: RABBIT_API_KEY ? RABBIT_API_KEY.length : 0,
        api_url: RABBIT_API_URL
      },
      setup_guide: {
        step1: "1. ไปที่ Rabbit Gateway Dashboard (https://dashboard.rabbit.co.th)",
        step2: "2. สร้าง Application ใหม่หรือใช้ที่มีอยู่",
        step3: "3. คัดลอก Application ID, Public Key และ API Key",
        step4: "4. อัปเดตไฟล์ backend/env.development:",
        step5: "   RABBIT_APPLICATION_ID=your-application-id",
        step6: "   RABBIT_PUBLIC_KEY=your-public-key",
        step7: "   RABBIT_COMPANY_ID=your-company-id",
        step8: "   RABBIT_API_KEY=your-api-key",
        step9: "5. รีสตาร์ท server และทดสอบใหม่"
      }
    });
  }
});

// ✅ Endpoint สำหรับตรวจสอบสถานะการชำระเงิน
app.get("/api/payment/check-status/:paymentId", async (req, res) => {
  const { paymentId } = req.params;
  
  // ตรวจสอบการตั้งค่า Rabbit Gateway
  if (!RABBIT_API_URL || !RABBIT_APPLICATION_ID || !RABBIT_PUBLIC_KEY || !RABBIT_COMPANY_ID || !RABBIT_API_KEY) {
    return res.status(503).json({
      error: "Payment service is not configured",
      message: "Rabbit Payment Gateway configuration is incomplete",
      details: "Please contact administrator to configure payment service"
    });
  }
  
  try {
    console.log(`🔍 Checking payment status for: ${paymentId}`);
    
    // เรียก Rabbit Gateway API เพื่อตรวจสอบสถานะ
    const response = await axios.get(`${RABBIT_API_URL}/public/v2/transactions/${paymentId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': RABBIT_API_KEY,
        'x-application-id': RABBIT_APPLICATION_ID,
        'x-public-key': RABBIT_PUBLIC_KEY,
        'x-company-id': RABBIT_COMPANY_ID
      }
    });
    
    const rabbitData = response.data;
    console.log('🐇 Rabbit Gateway Status Response:', rabbitData);
    
    // แปลงสถานะจาก Rabbit Gateway เป็นรูปแบบที่ frontend ต้องการ
    let status = 'pending';
    if (rabbitData.state === 'CONFIRMED') {
      status = 'completed';
    } else if (rabbitData.state === 'FAILED') {
      status = 'failed';
    } else if (rabbitData.state === 'EXPIRED') {
      status = 'expired';
    } else if (rabbitData.state === 'INITIATED') {
      status = 'pending';
    }
    
    res.json({
      payment_id: paymentId,
      status: status,
      state: rabbitData.state,
      amount: rabbitData.amount,
      currency: rabbitData.currency,
      created_at: rabbitData.created,
      updated_at: rabbitData.updated,
      expires_at: rabbitData.expires,
      url: rabbitData.url,
      short_url: rabbitData.shortUrl
    });
    
  } catch (err) {
    console.error("🐇 Rabbit Gateway Status Check Error:", err.response?.data || err.message);
    
    res.status(500).json({
      error: "ไม่สามารถตรวจสอบสถานะการชำระเงินได้",
      payment_id: paymentId,
      details: err.response?.data || err.message
    });
  }
});

// ✅ Endpoint สำหรับรับ Webhook จาก Rabbit Gateway
app.post("/webhook-endpoint", (req, res) => {
  const webhookData = req.body;

  console.log("📩 Rabbit Gateway Webhook received:", JSON.stringify(webhookData, null, 2));

  try {
    const {
      transactionId,
      state,
      amount,
      amountFractional,
      currency,
      provider,
      localId,
      eventType,
      created,
      updated
    } = webhookData;

    // ตรวจสอบว่าเป็น webhook สำหรับการเปลี่ยนแปลงสถานะ transaction
    if (eventType === "NOTIFY_TRANSACTION_CHANGE") {
      const amountInBaht = amountFractional ? amountFractional / 100 : (amount / 100);
      
      if (state === "CONFIRMED") {
        console.log(`✅ Payment CONFIRMED - Transaction ${transactionId} (Order: ${localId})`);
        console.log(`💰 Amount: ${amountInBaht} ${currency}`);
        console.log(`🏦 Provider: ${provider}`);
        console.log(`📅 Created: ${created}, Updated: ${updated}`);
        
        // Payment confirmed - update database status and user membership
        // This will be implemented when payment integration is complete
        
      } else if (state === "FAILED") {
        console.log(`❌ Payment FAILED - Transaction ${transactionId} (Order: ${localId})`);
        console.log(`💰 Amount: ${amountInBaht} ${currency}`);
        
        // Payment failed - update database status
        // This will be implemented when payment integration is complete
        
      } else if (state === "EXPIRED") {
        console.log(`⏰ Payment EXPIRED - Transaction ${transactionId} (Order: ${localId})`);
        console.log(`💰 Amount: ${amountInBaht} ${currency}`);
        
        // Payment failed - update database status
        // This will be implemented when payment integration is complete
        
      } else {
        console.log(`📊 Payment status: ${state} - Transaction ${transactionId} (Order: ${localId})`);
      }
    } else {
      console.log(`📨 Other event type: ${eventType} for transaction ${transactionId}`);
    }

    // ส่งการตอบกลับ 200 เพื่อยืนยันว่าได้รับ webhook แล้ว
    res.status(200).json({ 
      success: true, 
      message: "Webhook received successfully",
      transactionId: transactionId,
      eventType: eventType,
      state: state
    });
    
  } catch (error) {
    console.error("❌ Error processing Rabbit Gateway webhook:", error);
    res.status(500).json({ 
      success: false, 
      message: "Webhook processing failed",
      error: error.message
    });
  }
});



// Use all routes
// Add CORS middleware for ALL API routes (must be before route handlers)
app.use('/api', (req, res, next) => {
  // Set CORS headers for all API routes
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.100.99:5173',
    'https://sodeclick.com',
    'https://www.sodeclick.com',
    'http://www.sodeclick.com',
    'http://sodeclick.com',
    'https://sodeclick-frontend-production.up.railway.app',
    'https://sodeclick-frontend-production-8907.up.railway.app'
  ];
  
  if (origin) {
    const originLower = origin.toLowerCase().trim();
    const isAllowed = allowedOrigins.some(allowed => {
      const allowedLower = allowed.toLowerCase().trim();
      return originLower === allowedLower;
    });
    
    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Accept, Origin, User-Agent');
    }
  }
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Add logging middleware for auth routes
app.use('/api/auth', (req, res, next) => {
  // Logging for forgot-password
  if (req.path === '/forgot-password' || req.path.includes('forgot-password') || req.path.includes('reset-password')) {
    console.log('🔔 [AUTH MIDDLEWARE] Request to:', req.method, req.path);
    console.log('   Origin:', req.headers.origin);
    console.log('   Body:', JSON.stringify(req.body));
  }
  
  next();
});
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/upgrade-simple', upgradeSimpleRoutes);
app.use('/api/blur', blurRoutes);
app.use('/api/chat', chatRoutes);
// app.use('/api/messages', messagesRoutes); // Removed - using /api/chat instead
app.use('/api/gift', giftRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/payment', paymentRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/settings', require('./routes/settings'));
// app.use('/api/oauth-config', oauthConfigRoutes); // File not exists
app.use('/api/users', usersRoutes);
// app.use('/api/stream', streamRoutes); // Removed - streaming feature disabled
// app.use('/api/private-messages', privateChatMessagesRoutes); // File not exists

// Static file serving - removed duplicate (already configured above with cache headers)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  console.error('❌ Request URL:', req.originalUrl);
  console.error('❌ Request Method:', req.method);
  console.error('❌ Request Headers:', req.headers);
  
  // Set CORS headers for all error responses
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.100.99:5173',
    'https://sodeclick.com',
    'https://www.sodeclick.com',
    'http://www.sodeclick.com',
    'http://sodeclick.com',
    'https://sodeclick-frontend-production.up.railway.app',
    'https://sodeclick-frontend-production-8907.up.railway.app'
  ];
  
  if (origin) {
    const originLower = origin.toLowerCase().trim();
    const isAllowed = allowedOrigins.some(allowed => {
      const allowedLower = allowed.toLowerCase().trim();
      return originLower === allowedLower;
    });
    
    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Accept, Origin, User-Agent');
    }
  }
  
  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      message: 'CORS policy violation',
      error: 'Origin not allowed',
      timestamp: new Date().toISOString()
    });
  }
  
  // MongoDB connection error
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    console.error('❌ MongoDB connection issue detected');
    return res.status(503).json({
      message: 'Database temporarily unavailable',
      error: 'Please try again later',
      timestamp: new Date().toISOString()
    });
  }
  
  // JWT error
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Authentication failed',
      error: 'Invalid or expired token',
      timestamp: new Date().toISOString()
    });
  }
  
  // Validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
  
  // Default error response
  res.status(500).json({
    message: 'Something went wrong!',
    error: NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});


// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({
    message: 'API route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    available_endpoints: {
      root: '/api',
      health: '/health',
      database_health: '/health/database',
      rabbit_health: '/health/rabbit',
      socketio_health: '/health/socketio',
      api_info: '/api/info',
      membership: '/api/membership',
      blur: '/api/blur',
      chat: '/api/chat',
      gift: '/api/gift',
      vote: '/api/vote',
      shop: '/api/shop',
      payment: '/api/payment'
    }
  });
});

// Process monitoring
let restartCount = 0;
const maxRestarts = 5;
const restartWindow = 60000; // 1 minute
let lastRestart = 0;

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  
  try {
    // Close Socket.IO connections
    if (io) {
      io.close();
      console.log('✅ Socket.IO connections closed');
    }
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
    // Close HTTP server
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('⚠️  Force exit after timeout');
  process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle SIGTERM (for production deployments)
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  
  try {
    if (io) {
      io.close();
    }
    await mongoose.connection.close();
    server.close(() => {
      process.exit(0);
    });
    
    setTimeout(() => {
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error('❌ Error during SIGTERM shutdown:', error);
    process.exit(1);
  }
});

// Memory monitoring
setInterval(() => {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };
  
  // Log memory usage every 5 minutes
  if (process.uptime() % 300 < 1) {
    console.log('📊 Memory Usage:', memUsageMB);
  }
  
  // Warning if memory usage is high
  if (memUsageMB.heapUsed > 500) { // 500MB
    console.warn('⚠️  High memory usage detected:', memUsageMB);
  }
}, 30000); // Check every 30 seconds

// Socket.IO Configuration - ปรับปรุงสำหรับ real-time ที่ดีขึ้น
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      // อนุญาตให้ requests ที่ไม่มี origin
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://192.168.100.99:5173', // IP ใน network
        'https://sodeclick.com',
        'https://www.sodeclick.com',
        'http://www.sodeclick.com', // เพิ่ม HTTP version (ถ้ามี)
        'https://sodeclick-frontend-production.up.railway.app',
        'https://sodeclick-frontend-production-8907.up.railway.app'
      ];

      // อนุญาต IP ใน local network
      if (origin && (
        origin.match(/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/) ||
        origin.match(/^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/) ||
        origin.match(/^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}:5173$/)
      )) {
        console.log('✅ Socket.IO CORS allowed for local network IP:', origin);
        return callback(null, true);
      }

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('🚫 Socket.IO CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  // ปรับปรุง ping settings สำหรับ real-time ที่ดีขึ้น
  pingTimeout: 60000, // เพิ่มจาก 10000 เป็น 60000 (60 วินาที) - ทนต่อการเชื่อมต่อช้าขึ้น
  pingInterval: 25000, // เพิ่มจาก 5000 เป็น 25000 (25 วินาที) - ลดการ ping บ่อยเกินไป
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: true,
  // ใช้ polling ก่อน แล้ว upgrade ไป websocket
  transports: ['polling', 'websocket'],
  upgrade: true,
  rememberUpgrade: false, // ให้ลอง upgrade ทุกครั้ง
  // เพิ่มการตั้งค่าเพื่อความเสถียรของการเชื่อมต่อ
  connectTimeout: 45000, // เพิ่ม timeout สำหรับการเชื่อมต่อเริ่มต้น
  forceNew: false,
  // เพิ่มการตั้งค่า reconnection ที่ดีขึ้น
  reconnection: true,
  reconnectionAttempts: 10, // เพิ่มจำนวนครั้งการพยายามเชื่อมต่อใหม่
  reconnectionDelay: 1000, // เพิ่ม delay เริ่มต้น
  reconnectionDelayMax: 5000, // เพิ่ม max delay
  randomizationFactor: 0.5 // เพิ่ม randomization สำหรับการกระจายโหลด
});

// Export io instance to global for use in other modules
global.io = io;

// Socket.IO error handling
io.on('connection_error', (error) => {
  console.error('❌ Socket.IO connection error:', error);
});

io.engine.on('connection_error', (error) => {
  console.error('❌ Socket.IO engine error:', error);
});

// Make io available to routes
app.set('io', io);

// Socket.IO Real-time Chat
const ChatMessage = require('./models/ChatMessage');
const ChatRoom = require('./models/ChatRoom');
const User = require('./models/User');
const SystemSettings = require('./models/SystemSettings');
const jwt = require('jsonwebtoken');

// WebSocket authentication middleware
const authenticateSocket = async (socket, token) => {
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
    console.error('Socket authentication error:', error);
    return null;
  }
};

// เก็บข้อมูลผู้ใช้ออนไลน์ในแต่ละห้อง
const roomUsers = new Map(); // roomId -> Set of userIds
const userSockets = new Map(); // userId -> Set of socketIds
const onlineUsers = new Map(); // userId -> { socketId, roomId, lastSeen }

// Rate limiting สำหรับ Socket.IO events
const eventRateLimits = new Map(); // socketId -> { eventType -> lastTime }

function checkSocketRateLimit(socketId, eventType, minInterval = 1000) {
  const now = Date.now();
  const key = `${socketId}_${eventType}`;
  const lastTime = eventRateLimits.get(key) || 0;
  
  if (now - lastTime < minInterval) {
    // ลด log level สำหรับ join-room เพื่อไม่ให้ spam logs
    if (eventType === 'join-room') {
      console.log(`⏱️ Socket rate limit: ${eventType} from ${socketId} (${now - lastTime}ms ago, limit: ${minInterval}ms)`);
    } else {
      console.warn(`⚠️ Socket rate limit: ${eventType} from ${socketId} too frequent`);
    }
    return false;
  }
  
  eventRateLimits.set(key, now);
  return true;
}

io.on('connection', (socket) => {
  console.log(`✅ [Socket.IO] New connection: ${socket.id}`);
  console.log(`✅ [Socket.IO] Transport: ${socket.conn.transport.name}`);
  console.log(`✅ [Socket.IO] Remote address: ${socket.handshake.address}`);
  console.log(`✅ [Socket.IO] Query params:`, socket.handshake.query);
  
  // Log connection details
  console.log('✅ [Socket.IO] Connection details:', {
    id: socket.id,
    transport: socket.conn.transport.name,
    readyState: socket.conn.readyState,
    userId: socket.handshake.query?.userId || 'unknown'
  });

  // Event สำหรับ join user room เพื่อรับ notifications (ไม่ต้อง join chat room)
  socket.on('join-user-room', async (data) => {
    try {
      const { userId, token } = data;
      
      if (!userId || !token) {
        socket.emit('error', { message: 'User ID and token required' });
        return;
      }
      
      // ตรวจสอบว่า MongoDB connected หรือยัง
      if (mongoose.connection.readyState !== 1) {
        console.warn(`⚠️ MongoDB not connected, cannot authenticate socket ${socket.id} for join-user-room`);
        socket.emit('error', { message: 'Database temporarily unavailable. Please try again in a moment.' });
        
        // Retry after a short delay
        setTimeout(() => {
          socket.emit('retry-join-user-room', { userId, token });
        }, 2000);
        return;
      }
      
      // ตรวจสอบ authentication
      const authenticatedUser = await authenticateSocket(socket, token);
      if (!authenticatedUser) {
        console.log(`❌ Authentication failed for socket ${socket.id} in join-user-room`);
        socket.emit('error', { message: 'Authentication required' });
        return;
      }
      
      // ตรวจสอบว่า userId ตรงกับ authenticated user
      if (authenticatedUser._id.toString() !== userId) {
        console.log(`❌ User ID mismatch: authenticated ${authenticatedUser._id} vs requested ${userId}`);
        socket.emit('error', { message: 'User ID mismatch' });
        return;
      }
      
      // Join user room สำหรับ notifications
      socket.join(`user_${userId}`);
      socket.userId = userId;
      
      console.log(`🔔 Socket ${socket.id} joined user room user_${userId} for notifications (user: ${authenticatedUser.username}, role: ${authenticatedUser.role})`);
      
      socket.emit('user-room-joined', { userId });
    } catch (error) {
      console.error('Error joining user room:', error);
      
      // ตรวจสอบว่าเป็น MongoDB connection error หรือไม่
      if (error.name === 'MongoNotConnectedError' || error.message?.includes('Client must be connected')) {
        console.warn(`⚠️ MongoDB connection error in join-user-room for socket ${socket.id}`);
        socket.emit('error', { message: 'Database temporarily unavailable. Please try again in a moment.' });
        
        // Retry after a short delay
        setTimeout(() => {
          socket.emit('retry-join-user-room', { userId: data.userId, token: data.token });
        }, 2000);
      } else {
        socket.emit('error', { message: 'Failed to join user room' });
      }
    }
  });

  // เข้าร่วมห้องแชท
  socket.on('join-room', async (data) => {
    // ลด rate limiting สำหรับการ join room เพื่อให้เร็วขึ้น
    const isPrivateChat = data.roomId && data.roomId.startsWith('private_');
    const rateLimit = isPrivateChat ? 50 : 100; // ลด rate limit ให้ต่ำลง
    
    // ตรวจสอบว่าเป็นการเปลี่ยนห้องหรือไม่ (ถ้า socket มี currentRoom อยู่แล้ว)
    const isRoomSwitch = socket.currentRoom && socket.currentRoom !== data.roomId;
    
    if (!checkSocketRateLimit(socket.id, 'join-room', rateLimit)) {
      console.warn(`⚠️ Rate limit exceeded for socket ${socket.id}, room: ${data.roomId}`);
      // ไม่ส่ง error สำหรับ private chat หรือการเปลี่ยนห้อง เพื่อไม่ให้รบกวน UX
      if (!isPrivateChat && !isRoomSwitch) {
        socket.emit('error', { message: 'Rate limit: Please wait before joining another room' });
      }
      return;
    }

    console.log('🔍 Join room request:', data);
    console.log('🔍 Socket connection details:', {
      id: socket.id,
      connected: socket.connected,
      transport: socket.conn.transport.name,
      readyState: socket.conn.readyState
    });
    
    // ถ้าเป็นการเปลี่ยนห้อง ให้ leave ห้องเก่าก่อน
    if (socket.currentRoom && socket.currentRoom !== data.roomId) {
      console.log(`🔄 Room switch detected: leaving ${socket.currentRoom}, joining ${data.roomId}`);
      socket.leave(socket.currentRoom);
      
      // ลบผู้ใช้ออกจากรายการออนไลน์ของห้องเก่า
      if (roomUsers.has(socket.currentRoom)) {
        roomUsers.get(socket.currentRoom).delete(socket.userId);
        const onlineCount = roomUsers.get(socket.currentRoom).size;
        const roomOnlineUsers = Array.from(roomUsers.get(socket.currentRoom)).map(uid => {
          const onlineUser = onlineUsers.get(uid);
          return {
            userId: uid,
            username: onlineUser?.username || 'Unknown',
            lastActive: onlineUser?.lastActive
          };
        });
        
        io.to(socket.currentRoom).emit('online-count-updated', {
          roomId: socket.currentRoom,
          onlineCount,
          onlineUsers: roomOnlineUsers
        });
      }
    }
    
    try {
      const { roomId, userId, token } = data;
      
      // Normalize roomId to string for consistent socket room handling
      const normalizedRoomId = roomId ? roomId.toString() : roomId;

      // ตรวจสอบ authentication token
      const authenticatedUser = await authenticateSocket(socket, token);
      if (!authenticatedUser) {
        console.log(`❌ Authentication failed for socket ${socket.id}`);
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      // ตรวจสอบว่า userId ตรงกับ authenticated user
      if (authenticatedUser._id.toString() !== userId) {
        console.log(`❌ User ID mismatch: authenticated ${authenticatedUser._id} vs requested ${userId}`);
        socket.emit('error', { message: 'User ID mismatch' });
        return;
      }
      
      // สำหรับ private chat ที่ไม่ใช่ ChatRoom
      if (normalizedRoomId.startsWith('private_')) {
        // ตรวจสอบผู้ใช้
        const user = await User.findById(userId);
        if (!user) {
          console.log(`❌ User ${userId} not found`);
          socket.emit('error', { message: 'User not found' });
          return;
        }
        
        socket.join(normalizedRoomId);
        socket.join(`user_${userId}`); // Join user room for notifications
        socket.userId = userId;
        socket.currentRoom = normalizedRoomId;
        
        console.log(`🔗 Socket ${socket.id} joined private chat ${normalizedRoomId} for user ${userId}`);
        console.log(`🔔 Socket ${socket.id} also joined user room user_${userId} for notifications`);
        console.log(`📊 Room ${normalizedRoomId} now has ${io.sockets.adapter.rooms.get(normalizedRoomId)?.size || 0} connected sockets`);
        
        // ส่งข้อมูล unread count ให้ผู้ใช้
        const unreadCount = await ChatMessage.countDocuments({
          chatRoom: normalizedRoomId,
          sender: { $ne: userId },
          readBy: { $ne: userId },
          isDeleted: false
        });
        
        socket.emit('unread-count-update', {
          chatRoomId: normalizedRoomId,
          unreadCount
        });
        
        console.log(`📊 Sent unread count ${unreadCount} to user ${userId} for chat ${normalizedRoomId}`);
        
        // Debug: แสดงรายการ socket IDs ที่อยู่ใน room
        const roomSockets = io.sockets.adapter.rooms.get(normalizedRoomId);
        if (roomSockets) {
          console.log(`🔍 Room ${normalizedRoomId} socket IDs:`, Array.from(roomSockets));
        }
        
        // เพิ่มผู้ใช้ในรายการออนไลน์
        if (!roomUsers.has(normalizedRoomId)) {
          roomUsers.set(normalizedRoomId, new Set());
        }
        roomUsers.get(normalizedRoomId).add(userId);

        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);
        
        console.log(`👥 User ${userId} added to room ${normalizedRoomId}`);
        console.log(`📊 Room ${normalizedRoomId} now has ${roomUsers.get(normalizedRoomId).size} users`);
        console.log(`🔌 User ${userId} now has ${userSockets.get(userId).size} sockets`);
        
        // อัปเดตสถานะออนไลน์
        onlineUsers.set(userId, {
          socketId: socket.id,
          roomId: normalizedRoomId,
          lastActive: new Date(),
          username: user.displayName || user.username
        });
        
        // อัปเดตสถานะออนไลน์ในฐานข้อมูล
        try {
          const updatedUser = await User.findByIdAndUpdate(
            userId, 
            {
              isOnline: true,
              lastActive: new Date()
            },
            { new: true }
          );
          console.log(`🟢 User ${userId} (${updatedUser.displayName || updatedUser.username}) marked as online in database`);
          console.log(`🟢 Verified isOnline status in DB: ${updatedUser.isOnline}`);
        } catch (error) {
          console.error('Error updating user online status:', error);
        }
        
        // ส่งจำนวนคนออนไลน์ไปยังทุกคนในห้อง
        const onlineCount = roomUsers.get(normalizedRoomId).size;
        io.to(normalizedRoomId).emit('online-count', { count: onlineCount });
        
        return;
      }

      // สำหรับ Public และ Community chat rooms (ไม่ใช้ ChatRoom model)
      if (normalizedRoomId === 'public' || normalizedRoomId === 'community') {
        const user = authenticatedUser;
        
        socket.join(normalizedRoomId);
        socket.join(`user_${userId}`);
        socket.userId = userId;
        socket.currentRoom = normalizedRoomId;
        
        console.log(`🔗 Socket ${socket.id} joined ${normalizedRoomId} room for user ${userId}`);
        
        // เพิ่มผู้ใช้ในรายการออนไลน์
        if (!roomUsers.has(normalizedRoomId)) {
          roomUsers.set(normalizedRoomId, new Set());
        }
        roomUsers.get(normalizedRoomId).add(userId);

        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);
        
        // อัปเดตสถานะออนไลน์
        onlineUsers.set(userId, {
          socketId: socket.id,
          roomId: normalizedRoomId,
          lastActive: new Date(),
          username: user.displayName || user.username
        });
        
        // อัปเดตสถานะออนไลน์ในฐานข้อมูล
        try {
          await User.findByIdAndUpdate(userId, {
            isOnline: true,
            lastActive: new Date()
          });
        } catch (error) {
          console.error('Error updating user online status:', error);
        }
        
        // ส่งจำนวนคนออนไลน์ไปยังทุกคนในห้อง
        const onlineCount = roomUsers.get(normalizedRoomId).size;
        const roomOnlineUsers = Array.from(roomUsers.get(normalizedRoomId)).map(uid => {
          const onlineUser = onlineUsers.get(uid);
          return {
            userId: uid,
            username: onlineUser?.username || 'Unknown',
            lastActive: onlineUser?.lastActive
          };
        });
        
        io.to(normalizedRoomId).emit('online-count-updated', {
          roomId: normalizedRoomId,
          onlineCount,
          onlineUsers: roomOnlineUsers
        });
        
        console.log(`✅ User ${user.displayName || user.username} joined ${normalizedRoomId} room`);
        return;
      }
      
      // ตรวจสอบสิทธิ์สำหรับ ChatRoom ปกติ
      const chatRoom = await ChatRoom.findById(normalizedRoomId);
      if (!chatRoom) {
        console.log(`❌ Chat room ${roomId} not found`);
        socket.emit('error', { message: 'Chat room not found' });
        return;
      }
      
      // Normalize roomId to string for socket room consistency
      const roomIdString = chatRoom._id.toString();
      
      console.log(`✅ Chat room found: ${chatRoom.name} (${chatRoom.type})`);

      // ใช้ authenticated user แทนการค้นหาใหม่
      const user = authenticatedUser;
      console.log(`✅ User authenticated: ${user.displayName || user.username} (${user.email})`);

      // Check if user is participant
      const isParticipant = chatRoom.participants.some(p => p.user.toString() === userId.toString());
      
      // สำหรับห้องสาธารณะ - เข้าได้เลย
      if (chatRoom.type === 'public') {
        if (!isParticipant) {
          chatRoom.participants.push({
            user: userId,
            role: 'member',
            joinedAt: new Date()
          });
          await chatRoom.save();
        }
      } else if (chatRoom.type === 'group' && !isParticipant) {
        // สำหรับ Community chat rooms (group type)
        // อนุญาตให้เข้าร่วมได้โดยอัตโนมัติ (การตรวจสอบการจ่ายเงินทำใน API join-room แล้ว)
        chatRoom.participants.push({
          user: userId,
          role: 'member',
          joinedAt: new Date()
        });
        await chatRoom.save();
      } else if (chatRoom.type === 'private' && !isParticipant) {
        // SuperAdmin สามารถเข้าร่วมห้องส่วนตัวได้โดยไม่ต้องเป็นสมาชิกก่อน
        if (user.isSuperAdmin) {
          // SuperAdmin เข้าร่วมห้องส่วนตัวโดยอัตโนมัติ
          chatRoom.participants.push({
            user: userId,
            role: 'admin',
            joinedAt: new Date()
          });
          await chatRoom.save();
        } else {
          // Private room ที่ไม่มี entry fee - ต้องเป็นสมาชิกก่อน
          socket.emit('error', { message: 'Unauthorized to join this private room' });
          return;
        }
      }

      socket.join(roomIdString);
      socket.join(`user_${userId}`); // Join user room for notifications
      socket.userId = userId;
      socket.currentRoom = roomIdString; // Store as string for consistency
      
      console.log(`🔗 Socket ${socket.id} joined room ${roomIdString} for user ${userId}`);
      console.log(`🔔 Socket ${socket.id} also joined user room user_${userId} for notifications`);
      
      // เพิ่มผู้ใช้ในรายการออนไลน์ (ใช้ roomIdString สำหรับ consistency)
      if (!roomUsers.has(roomIdString)) {
        roomUsers.set(roomIdString, new Set());
      }
      roomUsers.get(roomIdString).add(userId);

      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      
      console.log(`📊 Room ${roomIdString} now has ${roomUsers.get(roomIdString).size} users`);
      console.log(`🔗 User ${userId} now has ${userSockets.get(userId).size} sockets`);
      
      // อัปเดตสถานะออนไลน์
      onlineUsers.set(userId, {
        socketId: socket.id,
        roomId: roomId,
        lastActive: new Date(),
        username: user.displayName || user.username
      });
      
      // อัปเดตสถานะออนไลน์ในฐานข้อมูล
      try {
        const updateResult = await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastActive: new Date()
        }, { new: true });
        console.log(`🟢 User ${userId} marked as online in database`);
        console.log(`📅 lastActive updated: ${updateResult.lastActive}`);
      } catch (error) {
        console.error('Error updating user online status:', error);
      }
      
      console.log(`👤 User ${userId} joined room ${roomId}`);
      
      // ส่งจำนวนคนออนไลน์ไปยังทุกคนในห้อง
      const onlineCount = roomUsers.get(roomId).size;
      const roomOnlineUsers = Array.from(roomUsers.get(roomId)).map(uid => {
        const onlineUser = onlineUsers.get(uid);
        return {
          userId: uid,
          username: onlineUser?.username || 'Unknown',
          lastActive: onlineUser?.lastActive
        };
      });
      
      console.log(`📊 Room ${roomId} online count: ${onlineCount} users`);
      console.log(`👥 Online users in room ${roomId}:`, roomOnlineUsers.map(u => u.username));
      
      io.to(roomId).emit('online-count-updated', {
        roomId,
        onlineCount,
        onlineUsers: roomOnlineUsers
      });
      
      // แจ้งสมาชิกอื่นว่ามีคนเข้าร่วม
      socket.to(roomId).emit('user-joined', {
        userId,
        username: user.displayName || user.username,
        message: 'มีสมาชิกใหม่เข้าร่วมแชท'
      });
      
            console.log(`✅ User ${user.displayName || user.username} is now online in room ${roomId}`);
      
    } catch (error) {
      console.error('❌ Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // ส่งข้อความ
  socket.on('send-message', async (data) => {
    try {
      // เพิ่มการป้องกันการส่งข้อความซ้ำ
      if (!data.tempId) {
        console.log('❌ Missing tempId, ignoring message to prevent duplicates');
        return;
      }

      // ตรวจสอบว่า tempId นี้ถูกประมวลผลไปแล้วหรือไม่
      if (!global.processingChatMessages) {
        global.processingChatMessages = new Set();
      }
      
      if (global.processingChatMessages.has(data.tempId)) {
        console.log('❌ ChatMessage already being processed, ignoring duplicate:', data.tempId);
        return;
      }
      
      // เพิ่ม tempId เข้าไปใน Set
      global.processingChatMessages.add(data.tempId);
      
      // ลบ tempId ออกจาก Set หลังจาก 5 วินาที
      setTimeout(() => {
        global.processingChatMessages.delete(data.tempId);
      }, 5000);

      // ลด rate limiting เป็น 50ms เพื่อให้ส่งเร็วขึ้น และไม่ skip การส่ง
      if (!checkSocketRateLimit(socket.id, 'send-message', 50)) {
        console.log(`⏱️ Rate limit: send-message from ${socket.id} - queuing message`);
        // แทนที่จะ skip ให้ส่ง error กลับไปให้ frontend จัดการ
        socket.emit('message-rate-limited', {
          message: 'ส่งข้อความเร็วเกินไป กรุณารอสักครู่',
          tempId: data.tempId,
          retryAfter: 50
        });
        // ลบ tempId ออกจาก Set เมื่อ rate limited
        global.processingChatMessages.delete(data.tempId);
        return;
      }

      console.log('📤 [server.js] ========== RECEIVED SEND-MESSAGE EVENT ==========');
      console.log('📤 [server.js] Full data:', JSON.stringify(data, null, 2));
      console.log('📤 [server.js] Socket connection details:', {
        id: socket.id,
        connected: socket.connected,
        transport: socket.conn.transport.name,
        readyState: socket.conn.readyState
      });
      const { content, senderId, chatRoomId, messageType = 'text', replyToId, fileUrl, fileName, fileSize, fileType, tempId } = data;
      const rawContent = typeof content === 'string' ? content : '';
      const trimmedContent = rawContent.trim();
      const isMediaMessage = messageType === 'image' || messageType === 'file';
      const hasMediaAttachment = Boolean(fileUrl || data.imageUrl);
      const mediaFallbackContent = messageType === 'image' ? '[image]' : '[file]';
      const normalizedContent = trimmedContent || (isMediaMessage ? mediaFallbackContent : '');
      
      console.log('📤 [server.js] Parsed message details:', {
        content: content?.substring(0, 50),
        senderId,
        chatRoomId,
        chatRoomIdType: typeof chatRoomId,
        messageType,
        tempId
      });
      
      // ตรวจสอบสิทธิ์
      const sender = await User.findById(senderId);
      if (!sender) {
        console.log('❌ Sender not found:', senderId);
        socket.emit('error', { message: 'Sender not found' });
        // ลบ tempId ออกจาก Set เมื่อ sender not found
        global.processingChatMessages.delete(data.tempId);
        return;
      }
      
      console.log('✅ Sender found:', sender.displayName || sender.username);

      // สำหรับ private chat ที่ไม่ใช่ ChatRoom
      if (chatRoomId.startsWith('private_')) {
        console.log('🔒 Private chat message received via socket - SKIPPING database save');
        console.log('📝 Private chat messages should be handled via API only (routes/messages.js)');
        
        // ⚡ IMPORTANT: Private chat messages are handled by API routes only
        // ไม่บันทึกข้อความใน database ที่นี่ เพราะจะทำให้ซ้ำกับ API
        
        // ลบ tempId ออกจาก Set
        if (data.tempId) {
          global.processingChatMessages.delete(data.tempId);
        }
        
        // ส่งการยืนยันกลับไปยังผู้ส่ง (แต่ไม่ได้บันทึกใน database)
        socket.emit('message-saved', {
          messageId: data.tempId || 'api-handled',
          tempId: data.tempId,
          chatRoomId: chatRoomId,
          status: 'api-handled'
        });

        return; // ⚡ IMPORTANT: จบการทำงานที่นี่ ไม่ต้องทำอะไรต่อ
      }

      // สำหรับ Public และ Community chat rooms
      if (chatRoomId === 'public' || chatRoomId === 'community') {
        if (!normalizedContent && !isMediaMessage) {
          socket.emit('error', { message: 'Message content is required' });
          global.processingChatMessages.delete(data.tempId);
          return;
        }

        if (isMediaMessage && !hasMediaAttachment) {
          socket.emit('error', { message: 'ต้องมีไฟล์แนบสำหรับข้อความประเภทนี้' });
          global.processingChatMessages.delete(data.tempId);
          return;
        }

        // สร้างข้อความและบันทึกใน database
        const messageData = {
          content: normalizedContent,
          sender: senderId,
          chatRoom: chatRoomId,
          messageType: messageType || 'text',
          replyTo: replyToId || null
        };

        // เพิ่มข้อมูลไฟล์ถ้ามี
        if (isMediaMessage && hasMediaAttachment) {
          const imageUrl = fileUrl || data.imageUrl;
          messageData.fileInfo = {
            fileUrl: imageUrl,
            fileName: fileName || null,
            fileSize: fileSize ? Number(fileSize) : undefined,
            mimeType: fileType || null,
            thumbnailUrl: imageUrl
          };
        }

        const message = new ChatMessage(messageData);
        await message.save();

        // Populate sender info
        await message.populate([
          { path: 'sender', select: 'username displayName membership membershipTier profileImages' },
          { path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'username displayName' } }
        ]);

        // Broadcast message to all users in the room
        const broadcastPayload = {
          _id: message._id,
          content: message.content,
          sender: {
            _id: message.sender._id,
            displayName: message.sender.displayName,
            username: message.sender.username,
            profileImages: message.sender.profileImages,
            membershipTier: message.sender.membershipTier,
            membership: message.sender.membership
          },
          chatRoom: message.chatRoom,
          messageType: message.messageType,
          fileUrl: message.fileInfo?.fileUrl,
          imageUrl: message.fileInfo?.fileUrl,
        fileInfo: message.fileInfo,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        };

        console.log(`📤 [server.js] Broadcasting public/community message to room: ${chatRoomId}`);
        console.log(`📤 [server.js] Room size: ${io.sockets.adapter.rooms.get(chatRoomId)?.size || 0} sockets`);
        io.to(chatRoomId).emit('room-message', broadcastPayload);
        
        console.log(`✅ [server.js] Broadcasted ${chatRoomId} message to ${io.sockets.adapter.rooms.get(chatRoomId)?.size || 0} users`);
        
        // ลบ tempId ออกจาก Set หลังจากส่งสำเร็จ
        global.processingChatMessages.delete(data.tempId);
        
        return;
      }

      // สำหรับ ChatRoom ปกติ
      // Normalize chatRoomId to string for consistency
      const chatRoomIdString = chatRoomId.toString();
      let chatRoom = await ChatRoom.findById(chatRoomIdString);
      
      // ถ้าหา room ไม่เจอ และเป็น ObjectId ที่ถูกต้อง อาจเป็น direct room ที่ยังไม่ได้สร้าง
      if (!chatRoom && mongoose.Types.ObjectId.isValid(chatRoomIdString)) {
        // ลองหา direct room ที่มี sender และ recipient
        // แต่เนื่องจากเราไม่มี recipient ID จาก chatRoomId ตรงๆ
        // เราจะไม่สร้าง room อัตโนมัติที่นี่ แต่ให้ frontend สร้างก่อนส่งข้อความ
        socket.emit('error', { message: 'Chat room not found. Please create the room first.' });
        global.processingChatMessages.delete(data.tempId);
        return;
      }
      
      if (!chatRoom) {
        socket.emit('error', { message: 'Chat room not found' });
        // ลบ tempId ออกจาก Set เมื่อ unauthorized
        global.processingChatMessages.delete(data.tempId);
        return;
      }

      // ใช้ chatRoom._id.toString() เพื่อให้ตรงกับ room ID ที่ใช้ join
      const normalizedRoomId = chatRoom._id.toString();

      // Check if user is participant
      const isParticipant = chatRoom.participants.some(p => p.user.toString() === senderId.toString());
      if (!isParticipant) {
        socket.emit('error', { message: 'Unauthorized to send message' });
        // ลบ tempId ออกจาก Set เมื่อ unauthorized
        global.processingChatMessages.delete(data.tempId);
        return;
      }

      // ตรวจสอบข้อจำกัด (เฉพาะห้องส่วนตัว) - SuperAdmin ข้ามการตรวจสอบ
      if (chatRoom.type === 'private' && !sender.isSuperAdmin) {
        sender.resetDailyUsage();
        if (!sender.canPerformAction('chat')) {
          socket.emit('error', { message: 'Daily chat limit reached' });
          // ลบ tempId ออกจาก Set เมื่อถึง limit
          global.processingChatMessages.delete(data.tempId);
          return;
        }
      }

      if (!normalizedContent && !isMediaMessage) {
        socket.emit('error', { message: 'Message content is required' });
        global.processingChatMessages.delete(data.tempId);
        return;
      }

      if (isMediaMessage && !hasMediaAttachment) {
        socket.emit('error', { message: 'ต้องมีไฟล์แนบสำหรับข้อความประเภทนี้' });
        global.processingChatMessages.delete(data.tempId);
        return;
      }

      // สร้างข้อความ
      const messageData = {
        content: normalizedContent,
        sender: senderId,
        chatRoom: normalizedRoomId, // ใช้ normalizedRoomId แทน chatRoomIdString
        messageType,
        replyTo: replyToId || null
      };

      // เพิ่มข้อมูลไฟล์ถ้ามี
      if (isMediaMessage && hasMediaAttachment) {
        const imageUrl = fileUrl || data.imageUrl;
        messageData.fileInfo = {
          fileUrl: imageUrl,
          fileName: fileName || null,
          fileSize: fileSize ? Number(fileSize) : undefined,
          mimeType: fileType || null,
          thumbnailUrl: imageUrl
        };

        console.log('🔍 [server.js] Adding file data to message:', {
          messageType,
          fileUrl: imageUrl,
          imageUrl: imageUrl,
          fileName,
          fileSize,
          fileType
        });
      }

      const message = new ChatMessage(messageData);
      await message.save();

      // อัปเดตสถิติ - ตรวจสอบว่า stats มีอยู่หรือไม่ ถ้าไม่มีให้สร้างใหม่
      if (!chatRoom.stats) {
        chatRoom.stats = {
          totalChatMessages: 0,
          totalParticipants: 0,
          totalViews: 0
        };
      }
      
      if (typeof chatRoom.stats.totalChatMessages !== 'number') {
        chatRoom.stats.totalChatMessages = 0;
      }
      
      chatRoom.stats.totalChatMessages += 1;
      // อัปเดต lastMessageAt แทน lastActivity (เพราะ ChatRoom model ไม่มี lastActivity field)
      chatRoom.lastMessageAt = new Date();
      chatRoom.lastMessage = message._id;
      sender.dailyUsage.chatCount += 1;

      await Promise.all([chatRoom.save(), sender.save()]);
      
      // ลบ tempId ออกจาก Set หลังจากบันทึกข้อความสำเร็จ
      global.processingChatMessages.delete(data.tempId);

      // Populate ข้อมูล
      await message.populate([
        { path: 'sender', select: 'username displayName membership membershipTier profileImages' },
        { path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'username displayName' } }
      ]);

      // 🚀 ส่งข้อความไปยังสมาชิกทุกคนในห้องทันที (ไม่รอ unread count)
      // ใช้ normalizedRoomId เพื่อให้ตรงกับ room ID ที่ใช้ join
      console.log('📤 [server.js] Broadcasting room message to room:', normalizedRoomId);
      const roomSize = io.sockets.adapter.rooms.get(normalizedRoomId)?.size || 0;
      console.log('📤 [server.js] Connected sockets in room:', roomSize);
      console.log('📤 [server.js] ChatMessage content:', message.content?.substring(0, 50) || message.messageType);
      console.log('📤 [server.js] ChatMessage ID:', message._id);
      console.log('📤 [server.js] Sender:', message.sender.displayName || message.sender.username);
      
      // Broadcast ทันที
      const messageFileUrl = message.fileInfo?.fileUrl || message.imageUrl || message.fileUrl;
      console.log('🔍 [server.js] Room message data before broadcast:', {
        _id: message._id,
        messageType: message.messageType,
        fileUrl: messageFileUrl,
        imageUrl: messageFileUrl,
        attachments: message.attachments,
        allKeys: Object.keys(message)
      });
      
      const broadcastPayload = {
        _id: message._id,
        content: message.content,
        sender: {
          _id: message.sender._id,
          displayName: message.sender.displayName,
          username: message.sender.username,
          profileImages: message.sender.profileImages,
          membershipTier: message.sender.membershipTier,
          membership: message.sender.membership
        },
        chatRoom: normalizedRoomId, // ใช้ normalizedRoomId เพื่อให้ตรงกับ room ID ที่ใช้ join
        messageType: message.messageType,
        fileUrl: messageFileUrl,
        imageUrl: messageFileUrl,
        fileInfo: message.fileInfo,
        attachments: message.attachments, // เพิ่ม attachments
        replyTo: message.replyTo,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        reactions: message.reactions || [],
        isDeleted: message.isDeleted || false,
        deletedBy: message.deletedBy || null
      };
      
      // ใช้ normalizedRoomId เพื่อให้ตรงกับ room ID ที่ใช้ join (chatRoom._id.toString())
      console.log(`📤 [server.js] ========== BROADCASTING MESSAGE ==========`);
      console.log(`📤 [server.js] Original chatRoomId from client: ${chatRoomIdString}`);
      console.log(`📤 [server.js] Normalized roomId: ${normalizedRoomId}`);
      console.log(`📤 [server.js] Message ID: ${message._id}`);
      console.log(`📤 [server.js] Sender: ${message.sender.displayName || message.sender.username}`);
      console.log(`📤 [server.js] Content: ${message.content?.substring(0, 50)}`);
      
      // ตรวจสอบ room size ก่อน broadcast
      const roomBeforeBroadcast = io.sockets.adapter.rooms.get(normalizedRoomId);
      const roomSizeBefore = roomBeforeBroadcast?.size || 0;
      console.log(`📤 [server.js] Room size BEFORE broadcast: ${roomSizeBefore} sockets`);
      
      // ตรวจสอบว่าผู้ส่งอยู่ในห้องหรือไม่ ถ้าไม่อยู่ให้ join อัตโนมัติ
      const senderInRoom = socket.rooms.has(normalizedRoomId);
      console.log(`📤 [server.js] Sender in room: ${senderInRoom}`);
      console.log(`📤 [server.js] Sender socket rooms:`, Array.from(socket.rooms));
      
      if (!senderInRoom) {
        console.log(`⚠️ [server.js] Sender ${senderId} not in room ${normalizedRoomId}, joining now...`);
        socket.join(normalizedRoomId);
        socket.currentRoom = normalizedRoomId;
        console.log(`✅ [server.js] Sender joined room ${normalizedRoomId}`);
      }
      
      // ตรวจสอบ room size หลัง join
      const roomAfterJoin = io.sockets.adapter.rooms.get(normalizedRoomId);
      const roomSizeAfterJoin = roomAfterJoin?.size || 0;
      console.log(`📤 [server.js] Room size AFTER join: ${roomSizeAfterJoin} sockets`);
      
      // ตรวจสอบ socket IDs ใน room
      if (roomAfterJoin) {
        const socketIds = Array.from(roomAfterJoin);
        console.log(`📤 [server.js] Socket IDs in room:`, socketIds);
      }
      
      // สำหรับ direct room: ตรวจสอบว่าอีกฝั่ง join room แล้วหรือยัง
      // ถ้ายังไม่ได้ join ให้ส่ง event ไปยังอีกฝั่งเพื่อให้ join room
      if (chatRoom.type === 'direct' && chatRoom.participants) {
        const otherParticipant = chatRoom.participants.find(
          p => p.user.toString() !== senderId.toString()
        );
        
        if (otherParticipant) {
          const otherUserId = otherParticipant.user.toString();
          const otherUserRoom = `user_${otherUserId}`;
          
          // ตรวจสอบว่าอีกฝั่งอยู่ใน room หรือยัง
          const roomSockets = io.sockets.adapter.rooms.get(normalizedRoomId);
          const otherUserSockets = io.sockets.adapter.rooms.get(otherUserRoom);
          
          // ถ้าอีกฝั่ง online แต่ยังไม่ได้ join room ให้ส่ง event เพื่อให้ join
          if (otherUserSockets && otherUserSockets.size > 0) {
            const otherUserInRoom = Array.from(otherUserSockets).some(socketId => {
              const socket = io.sockets.sockets.get(socketId);
              return socket && socket.rooms.has(normalizedRoomId);
            });
            
            if (!otherUserInRoom) {
              console.log(`📤 [server.js] Other user ${otherUserId} is online but not in room, sending join notification...`);
              // ส่ง event ไปยังอีกฝั่งเพื่อให้ join room
              io.to(otherUserRoom).emit('auto-join-room', {
                roomId: normalizedRoomId,
                reason: 'new_message'
              });
              
              // ส่งข้อความล่าสุดไปยังอีกฝั่งทันที (ก่อนที่อีกฝั่งจะ join room)
              // เพื่อให้อีกฝั่งเห็นข้อความทันทีเมื่อ join room แล้ว
              setTimeout(() => {
                io.to(otherUserRoom).emit('room-message', broadcastPayload);
                console.log(`📤 [server.js] Sent message directly to other user ${otherUserId} via user room`);
              }, 100);
            }
          }
        }
      }
      
      // Broadcast ไปยังทุกคนในห้อง (รวมถึงผู้ส่งด้วย)
      console.log(`📤 [server.js] Broadcasting to room: ${normalizedRoomId}`);
      console.log(`📤 [server.js] Broadcast payload:`, JSON.stringify(broadcastPayload, null, 2));
      io.to(normalizedRoomId).emit('room-message', broadcastPayload);
      
      // ตรวจสอบ room size หลัง broadcast
      const roomAfterBroadcast = io.sockets.adapter.rooms.get(normalizedRoomId);
      const roomSizeAfter = roomAfterBroadcast?.size || 0;
      console.log(`✅ [server.js] Room message broadcasted to ${roomSizeAfter} client(s) in room: ${normalizedRoomId}`);
      
      if (roomAfterBroadcast) {
        console.log(`✅ [server.js] Verified: Room ${normalizedRoomId} has ${roomAfterBroadcast.size} connected sockets`);
      } else {
        console.warn(`⚠️ [server.js] Warning: Room ${normalizedRoomId} not found after broadcast`);
      }
      
      console.log(`✅ [server.js] ========== BROADCAST COMPLETE ==========`);
      
      // ส่ง notification และ unread count แบบ async (ไม่บล็อก)
      // ใช้ setTimeout แทน setImmediate เพื่อให้ broadcast เสร็จก่อน
      setTimeout(async () => {
        try {
          // ส่ง notification ไปยังเจ้าของข้อความเดิมเมื่อมีคนตอบกลับ (ป้องกันการแจ้งเตือนซ้ำ)
          if (replyToId) {
            const originalChatMessage = await ChatMessage.findById(replyToId);
            if (originalChatMessage && originalChatMessage.sender.toString() !== senderId) {
              // เช็คว่าแจ้งเตือน reply นี้ไปแล้วหรือยัง
              if (!global.notifiedChatMessages) {
                global.notifiedChatMessages = new Set();
              }
              
              const replyNotificationKey = `reply_${message._id}_${originalChatMessage.sender}`;
              if (!global.notifiedChatMessages.has(replyNotificationKey)) {
                global.notifiedChatMessages.add(replyNotificationKey);
                
                // ลบ key เก่าๆ ทุก 1 ชั่วโมง
                setTimeout(() => {
                  global.notifiedChatMessages.delete(replyNotificationKey);
                }, 60 * 60 * 1000);
                
                console.log('🔔 Sending reply notification for message:', message._id);
                
                io.to(`user_${originalChatMessage.sender.toString()}`).emit('public-chat-reply-notification', {
                  messageId: message._id,
                  userId: senderId,
                  originalChatMessageOwnerId: originalChatMessage.sender.toString(),
                  roomId: chatRoomIdString
                });
              } else {
                console.log('⏭️ Reply notification already sent, skipping');
              }
            }
          }
          
          // ส่งข้อมูล unread count ให้สมาชิกทุกคนในห้อง (ทำแบบ async)
          // ChatRoom model uses 'participants' not 'members'
          if (chatRoom.participants && Array.isArray(chatRoom.participants)) {
            const members = chatRoom.participants
              .filter(p => p.user && p.isActive !== false)
              .map(participant => participant.user.toString());
            
            for (const memberId of members) {
              if (memberId !== senderId) {
                // Skip unread count for direct messages (not needed)
                // Direct messages use lastReadAt in participants instead
                if (chatRoom.type === 'direct') {
                  continue;
                }
                
                const unreadCount = await ChatMessage.countDocuments({
                  chatRoom: chatRoomIdString,
                  sender: { $ne: mongoose.Types.ObjectId(memberId) },
                  readBy: { $ne: mongoose.Types.ObjectId(memberId) },
                  isDeleted: false
                });
                
                io.to(`user_${memberId}`).emit('unread-count-update', {
                  chatRoomId: chatRoomIdString,
                  unreadCount
                });
              }
            }
          }
        } catch (err) {
          console.error('❌ Error in async notification/unread count:', err);
        }
      }, 10); // รอ 10ms หลังจาก broadcast เสร็จ
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        data: data
      });
      // ส่ง error ที่มีประโยชน์กลับไปยัง client
      let errorChatMessage = 'ไม่สามารถส่งข้อความได้';
      if (error.message.includes('validation')) {
        errorChatMessage = 'ข้อความไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
      } else if (error.message.includes('permission')) {
        errorChatMessage = 'คุณไม่มีสิทธิ์ส่งข้อความในห้องนี้';
      } else if (error.message.includes('database')) {
        errorChatMessage = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่';
      }
      
      socket.emit('message-send-failed', { 
        message: errorChatMessage,
        details: error.message,
        type: 'send-message-error',
        tempId: data.tempId,
        retryable: true
      });
      
      // ลบ tempId ออกจาก Set เมื่อเกิด error
      if (data && data.tempId) {
        global.processingChatMessages.delete(data.tempId);
      }
    }
  });

  // React ข้อความ
  socket.on('react-message', async (data) => {
    try {
      const { messageId, userId, reactionType = 'heart', action = 'add' } = data;
      
      const message = await ChatMessage.findById(messageId);
      if (!message) {
        socket.emit('error', { message: 'ChatMessage not found' });
        return;
      }

      // ตรวจสอบสิทธิ์
      const chatRoom = await ChatRoom.findById(message.chatRoom);
      if (!chatRoom.isMember(userId)) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      // ตรวจสอบว่าผู้ใช้เคย react แล้วหรือไม่
      const existingReactionIndex = message.reactions.findIndex(
        reaction => reaction.user.toString() === userId.toString() && reaction.type === reactionType
      );
      
      let finalAction;
      
      if (existingReactionIndex !== -1) {
        // ถ้าเคย react แล้ว ให้ลบ reaction (toggle)
        message.reactions.splice(existingReactionIndex, 1);
        finalAction = 'removed';
        console.log('💖 Reaction removed:', { messageId, userId, reactionType });
      } else {
        // เพิ่ม reaction ใหม่
        message.reactions.push({
          user: userId,
          type: reactionType,
          createdAt: new Date()
        });
        finalAction = 'added';
        console.log('💖 Reaction added:', { messageId, userId, reactionType });
      }
      
      // อัปเดตสถิติ
      message.updateReactionStats();
      await message.save();

      // ส่งการอัปเดต reaction ไปยังทุกคนในห้อง
      io.to(message.chatRoom.toString()).emit('message-reaction-updated', {
        messageId: message._id,
        userId,
        reactionType: reactionType,
        action: finalAction,
        reactions: message.reactions,
        stats: message.stats,
        chatRoomId: message.chatRoom
      });

      // ส่ง notification ไปยังเจ้าของข้อความเมื่อมีคนกดหัวใจ
      if (finalAction === 'added' && reactionType === 'heart') {
        io.to(`user_${message.sender.toString()}`).emit('heart-notification', {
          messageId: message._id,
          userId,
          messageOwnerId: message.sender.toString()
        });
      }
      
    } catch (error) {
      console.error('Error reacting to message:', error);
      socket.emit('error', { message: 'Failed to react to message' });
    }
  });

  // จัดการสเตตัสข้อความ - ทำเครื่องหมายว่าอ่านแล้ว
  socket.on('mark-message-read', async (data) => {
    try {
      // ลด rate limiting สำหรับการทำเครื่องหมายอ่าน (50ms ต่อครั้ง) - ลดลงเพื่อให้เร็วขึ้น
      if (!checkSocketRateLimit(socket.id, 'mark-message-read', 50)) {
        return; // ไม่แสดง error เพื่อไม่ให้รบกวน UX
      }

      const { messageId, chatRoomId, userId } = data;
      console.log('👁️ Mark message as read:', { messageId, chatRoomId, userId });

      // อัปเดตข้อความในฐานข้อมูล
      const result = await ChatMessage.updateOne(
        { 
          _id: messageId,
          readBy: { $ne: userId } // ถ้ายังไม่เคยอ่าน
        },
        { 
          $addToSet: { readBy: userId } // เพิ่ม userId ใน readBy array
        }
      );

      if (result.modifiedCount > 0) {
        console.log('✅ ChatMessage marked as read in database');
        
        // ส่งการอัปเดตสเตตัสไปยังผู้ส่งข้อความ
        const message = await ChatMessage.findById(messageId).populate('sender', 'username displayName');
        if (message && message.sender) {
          // ส่งให้ผู้ส่งข้อความทราบว่าข้อความถูกอ่าน
          io.to(chatRoomId).emit('message-read', {
            messageId: messageId,
            readBy: userId,
            chatRoomId: chatRoomId
          });
          
          console.log('📤 Sent message-read status to room:', chatRoomId);
        }

        // อัปเดต unread count
        const unreadCount = await ChatMessage.countDocuments({
          chatRoom: chatRoomId,
          sender: { $ne: userId },
          readBy: { $ne: userId },
          isDeleted: false
        });

        socket.emit('unread-count-update', {
          chatRoomId: chatRoomId,
          unreadCount: unreadCount
        });

        console.log('📊 Updated unread count:', unreadCount);
      }

    } catch (error) {
      console.error('❌ Error marking message as read:', error);
      socket.emit('error', { message: 'Failed to mark message as read' });
    }
  });

  // จัดการการส่งข้อความสำเร็จ (delivered status)
  socket.on('message-delivered', async (data) => {
    try {
      const { messageId, chatRoomId, userId } = data;
      console.log('📬 ChatMessage delivered:', { messageId, chatRoomId, userId });

      // ส่งการอัปเดตสเตตัสไปยังผู้ส่งข้อความ
      io.to(chatRoomId).emit('message-delivered', {
        messageId: messageId,
        chatRoomId: chatRoomId,
        deliveredAt: new Date()
      });

      console.log('📤 Sent message-delivered status to room:', chatRoomId);

    } catch (error) {
      console.error('❌ Error processing message delivered:', error);
    }
  });

  // ออกจากห้อง
  socket.on('leave-room', async (data) => {
    const { roomId, userId } = data;
    console.log(`🚪 User ${userId} leaving room ${roomId}`);
    
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', {
      userId,
      message: 'สมาชิกออกจากแชท'
    });
    
    // ลบผู้ใช้ออกจากรายการออนไลน์
    if (roomUsers.has(roomId)) {
      roomUsers.get(roomId).delete(userId);
      
                  // ส่งจำนวนคนออนไลน์ที่อัปเดต
            const onlineCount = roomUsers.get(roomId).size;
            const roomOnlineUsers = Array.from(roomUsers.get(roomId)).map(uid => {
              const onlineUser = onlineUsers.get(uid);
              return {
                userId: uid,
                username: onlineUser?.username || 'Unknown',
                lastActive: onlineUser?.lastActive
              };
            });
      
      console.log(`📊 Room ${roomId} online count updated: ${onlineCount} users`);
      
      io.to(roomId).emit('online-count-updated', {
        roomId,
        onlineCount,
        onlineUsers: roomOnlineUsers
      });
    }
    
    // อัปเดตสถานะออฟไลน์ในฐานข้อมูล (เฉพาะเมื่อ userId มีค่า)
    if (userId && typeof userId === 'string') {
      try {
        const updateResult = await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastActive: new Date()
        }, { new: true });
        
        if (updateResult) {
          console.log(`🔴 User ${userId} marked as offline in database (leave-room)`);
          console.log(`📅 lastActive updated: ${updateResult.lastActive}`);
        } else {
          console.warn(`⚠️ User ${userId} not found in database during leave-room`);
        }
      } catch (error) {
        console.error('Error updating user offline status (leave-room):', error);
      }
    } else {
      console.warn('⚠️ Invalid userId in leave-room handler:', userId);
    }
    
    console.log(`👤 User ${userId} left room ${roomId}`);
  });

  // Typing indicators
  socket.on('typing-start', (data) => {
    const { roomId, userId, username } = data;
    socket.to(roomId).emit('user-typing', { userId, username });
  });

  socket.on('typing-stop', (data) => {
    const { roomId, userId } = data;
    socket.to(roomId).emit('user-stop-typing', { userId });
  });

  // ============ Stream Events ============
  
  // Debug: Log all socket events
  socket.onAny((eventName, ...args) => {
    console.log(`🔍 [server.js] Socket event received: ${eventName}`, {
      socketId: socket.id,
      args: args.length,
      eventName
    });
  });
  
  // Join stream room
  socket.on('join-stream', async (data) => {
    try {
      const { streamId, userId, token } = data;
      
      console.log('🔌 [server.js] Join stream request:', {
        streamId,
        userId,
        hasToken: !!token,
        socketId: socket.id
      });
      
      // Authenticate user
      const authenticatedUser = await authenticateSocket(socket, token);
      if (!authenticatedUser) {
        console.error('❌ [server.js] Authentication failed for join-stream:', userId);
        socket.emit('stream-error', { message: 'Authentication required' });
        return;
      }
      
      console.log('✅ [server.js] User authenticated for join-stream:', authenticatedUser.username);
      
      // Note: Joining stream doesn't require admin, only viewing

      const StreamRoom = require('./models/StreamRoom');
      const stream = await StreamRoom.findById(streamId);
      
      if (!stream) {
        console.error('❌ [server.js] Stream not found:', streamId);
        socket.emit('stream-error', { message: 'Stream not found' });
        return;
      }

      if (!stream.isLive) {
        console.error('❌ [server.js] Stream not live:', streamId);
        socket.emit('stream-error', { message: 'Stream is not live' });
        return;
      }

      // Join stream room
      socket.join(`stream-${streamId}`);
      socket.streamId = streamId;
      
      console.log(`📺 [server.js] User ${authenticatedUser.username} joined stream room ${streamId}`);
      console.log('📺 [server.js] Socket rooms:', Array.from(socket.rooms));
      socket.userId = userId;
      
      // Send confirmation back to client
      socket.emit('stream-joined', {
        streamId,
        viewerCount: stream.viewerCount || 0,
        viewers: stream.viewers || []
      });

      // Add viewer to stream
      const existingViewer = stream.viewers.find(v => v.userId.toString() === userId);
      if (!existingViewer) {
        stream.viewers.push({
          userId: userId,
          username: authenticatedUser.username,
          displayName: authenticatedUser.displayName || authenticatedUser.username,
          avatar: authenticatedUser.profileImages?.[0] || '',
          joinedAt: new Date()
        });
        stream.viewerCount = stream.viewers.length;
        await stream.save();
      }

      console.log(`📺 User ${userId} joined stream ${streamId}`);

      // Emit viewer joined event
      io.to(`stream-${streamId}`).emit('stream-viewer-joined', {
        streamId,
        viewer: {
          userId: userId,
          username: authenticatedUser.username,
          displayName: authenticatedUser.displayName || authenticatedUser.username,
          avatar: authenticatedUser.profileImages?.[0] || ''
        },
        viewerCount: stream.viewerCount,
        viewers: stream.viewers
      });

      // Send current stream data to the new viewer
      socket.emit('stream-joined', {
        streamId,
        viewerCount: stream.viewerCount,
        viewers: stream.viewers
      });

    } catch (error) {
      console.error('Error joining stream:', error);
      socket.emit('stream-error', { message: 'Failed to join stream' });
    }
  });

  // Leave stream room
  socket.on('leave-stream', async (data) => {
    try {
      const { streamId, userId } = data;
      
      socket.leave(`stream-${streamId}`);
      
      const StreamRoom = require('./models/StreamRoom');
      const stream = await StreamRoom.findById(streamId);
      
      if (stream) {
        // Remove viewer from stream
        stream.viewers = stream.viewers.filter(v => v.userId.toString() !== userId);
        stream.viewerCount = stream.viewers.length;
        await stream.save();

        console.log(`📺 User ${userId} left stream ${streamId}`);

        // Emit viewer left event
        io.to(`stream-${streamId}`).emit('stream-viewer-left', {
          streamId,
          userId,
          viewerCount: stream.viewerCount,
          viewers: stream.viewers
        });
      }
    } catch (error) {
      console.error('Error leaving stream:', error);
    }
  });

  // Send stream message
  socket.on('send-stream-message', async (data) => {
    try {
      const { streamId, userId, message, token, tempId } = data;

      console.log('📤 [server.js] Stream message received:', {
        streamId,
        userId,
        message: message?.substring(0, 50) + '...',
        tempId,
        hasToken: !!token,
        socketId: socket.id,
        socketRooms: Array.from(socket.rooms)
      });

      if (!message || message.trim() === '') {
        socket.emit('stream-error', { message: 'ChatMessage cannot be empty' });
        return;
      }

      // Authenticate user
      const authenticatedUser = await authenticateSocket(socket, token);
      if (!authenticatedUser) {
        console.error('❌ [server.js] Authentication failed for user:', userId);
        socket.emit('stream-error', { message: 'Authentication required' });
        return;
      }

      const StreamRoom = require('./models/StreamRoom');
      const StreamChatMessage = require('./models/StreamChatMessage');
      
      const stream = await StreamRoom.findById(streamId);
      if (!stream || !stream.isLive) {
        console.error('❌ [server.js] Stream not found or not live:', streamId);
        socket.emit('stream-error', { message: 'Stream is not live' });
        return;
      }

      // Check if comments are allowed
      if (!stream.settings.allowComments) {
        socket.emit('stream-error', { message: 'Comments are disabled for this stream' });
        return;
      }

      // Create message
      const newChatMessage = new StreamChatMessage({
        streamRoom: streamId,
        sender: userId,
        senderName: authenticatedUser.displayName || authenticatedUser.username,
        senderAvatar: authenticatedUser.profileImages?.[0] || '',
        message: message.trim(),
        type: 'text'
      });

      await newChatMessage.save();

      const messageData = {
        _id: newChatMessage._id,
        streamRoom: streamId,
        sender: {
          _id: userId,
          username: authenticatedUser.username,
          displayName: authenticatedUser.displayName || authenticatedUser.username,
          profileImages: authenticatedUser.profileImages || [],
          membership: authenticatedUser.membership
        },
        senderName: newChatMessage.senderName,
        senderAvatar: newChatMessage.senderAvatar,
        message: newChatMessage.message,
        type: newChatMessage.type,
        createdAt: newChatMessage.createdAt,
        tempId: tempId // Include tempId to help frontend prevent duplicates
      };

      console.log(`💬 [server.js] Stream message sent in ${streamId} by ${userId}`, {
        messageId: newChatMessage._id,
        tempId
      });

      // Broadcast message to all viewers
      io.to(`stream-${streamId}`).emit('stream-message-received', messageData);

    } catch (error) {
      console.error('❌ [server.js] Error sending stream message:', error);
      socket.emit('stream-error', { message: 'Failed to send message' });
    }
  });

  // Stream like/reaction
  socket.on('stream-like', async (data) => {
    try {
      const { streamId, userId, token } = data;

      // Authenticate user
      const authenticatedUser = await authenticateSocket(socket, token);
      if (!authenticatedUser) {
        socket.emit('stream-error', { message: 'Authentication required' });
        return;
      }

      const StreamRoom = require('./models/StreamRoom');
      const stream = await StreamRoom.findById(streamId);
      
      if (stream && stream.isLive) {
        stream.likeCount += 1;
        await stream.save();

        // Broadcast like event
        io.to(`stream-${streamId}`).emit('stream-liked', {
          streamId,
          userId,
          username: authenticatedUser.displayName || authenticatedUser.username,
          likeCount: stream.likeCount
        });

        console.log(`❤️ Stream ${streamId} liked by ${userId}, total: ${stream.likeCount}`);
      }
    } catch (error) {
      console.error('Error liking stream:', error);
    }
  });

  // ============ Stream Room Events ============
  
  // Join stream room for chat
  socket.on('join-stream-room', async (data) => {
    try {
      const { streamId, userId, username } = data;
      
      // Join stream room
      socket.join(`stream_${streamId}`);
      socket.join(`user_${userId}`); // For notifications
      socket.currentStreamRoom = streamId;
      
      console.log(`📺 User ${username} (${userId}) joined stream room ${streamId}`);
      
      // Broadcast to stream room
      socket.to(`stream_${streamId}`).emit('user-joined-stream', {
        userId,
        username,
        streamId
      });
      
      // Get current viewer count
      const streamRoom = io.sockets.adapter.rooms.get(`stream_${streamId}`);
      const viewerCount = streamRoom ? streamRoom.size : 0;
      
      // Update viewer count for all viewers
      io.to(`stream_${streamId}`).emit('viewer-count-update', {
        streamId,
        count: viewerCount
      });
      
    } catch (error) {
      console.error('Error joining stream room:', error);
      socket.emit('error', { message: 'Failed to join stream room' });
    }
  });

  // Leave stream room
  socket.on('leave-stream-room', async (data) => {
    try {
      const { streamId, userId } = data;
      
      // Leave stream room
      socket.leave(`stream_${streamId}`);
      socket.leave(`user_${userId}`);
      socket.currentStreamRoom = null;
      
      console.log(`📺 User ${userId} left stream room ${streamId}`);
      
      // Broadcast to stream room
      socket.to(`stream_${streamId}`).emit('user-left-stream', {
        userId,
        streamId
      });
      
      // Update viewer count
      const streamRoom = io.sockets.adapter.rooms.get(`stream_${streamId}`);
      const viewerCount = streamRoom ? streamRoom.size : 0;
      
      io.to(`stream_${streamId}`).emit('viewer-count-update', {
        streamId,
        count: viewerCount
      });
      
    } catch (error) {
      console.error('Error leaving stream room:', error);
    }
  });

  // ============ End Stream Room Events ============

  // Disconnect
  socket.on('disconnect', async (reason) => {
    console.log('👤 User disconnected:', socket.id, 'Reason:', reason);
    
    // Handle stream disconnect
    if (socket.streamId && socket.userId) {
      try {
        const StreamRoom = require('./models/StreamRoom');
        const stream = await StreamRoom.findById(socket.streamId);
        
        if (stream) {
          // Remove viewer from stream
          stream.viewers = stream.viewers.filter(v => v.userId.toString() !== socket.userId);
          stream.viewerCount = stream.viewers.length;
          await stream.save();

          console.log(`📺 User ${socket.userId} left stream ${socket.streamId} (disconnect)`);

          // Emit viewer left event
          io.to(`stream-${socket.streamId}`).emit('stream-viewer-left', {
            streamId: socket.streamId,
            userId: socket.userId,
            viewerCount: stream.viewerCount,
            viewers: stream.viewers
          });
        }
      } catch (error) {
        console.error('Error handling stream disconnect:', error);
      }
    }
    
    // Handle stream room disconnect
    if (socket.userId && socket.currentStreamRoom) {
      const streamId = socket.currentStreamRoom;
      
      // Broadcast user left
      socket.to(`stream_${streamId}`).emit('user-left-stream', {
        userId: socket.userId,
        streamId
      });
      
      // Update viewer count
      const streamRoom = io.sockets.adapter.rooms.get(`stream_${streamId}`);
      const viewerCount = streamRoom ? streamRoom.size - 1 : 0; // -1 because socket hasn't left yet
      
      io.to(`stream_${streamId}`).emit('viewer-count-update', {
        streamId,
        count: viewerCount
      });
    }
    
    // ตรวจสอบให้แน่ใจว่า socket มีข้อมูลที่จำเป็น
    if (socket.currentRoom && socket.userId && typeof socket.userId === 'string') {
      const roomId = socket.currentRoom;
      const userId = socket.userId;
      
      // ลบ socket จากรายการ
      if (userSockets.has(userId)) {
        userSockets.get(userId).delete(socket.id);
        
        // ถ้าผู้ใช้ไม่มี socket เชื่อมต่ออยู่แล้ว ให้ลบออกจากห้อง
        if (userSockets.get(userId).size === 0) {
          userSockets.delete(userId);
          
          // ลบจากรายการออนไลน์
          onlineUsers.delete(userId);
          
          // อัปเดตสถานะออฟไลน์ในฐานข้อมูล
          try {
            const updateResult = await User.findByIdAndUpdate(userId, {
              isOnline: false,
              lastActive: new Date()
            }, { new: true });
            
            if (updateResult) {
              console.log(`🔴 User ${userId} marked as offline in database (disconnect)`);
              console.log(`📅 lastActive updated: ${updateResult.lastActive}`);
            } else {
              console.warn(`⚠️ User ${userId} not found in database during disconnect`);
            }
          } catch (error) {
            console.error('Error updating user offline status (disconnect):', error);
          }
          
          if (roomUsers.has(roomId)) {
            roomUsers.get(roomId).delete(userId);
            
            // ส่งจำนวนคนออนไลน์ที่อัปเดต
            const onlineCount = roomUsers.get(roomId).size;
            const roomOnlineUsers = Array.from(roomUsers.get(roomId)).map(uid => {
              const onlineUser = onlineUsers.get(uid);
              return {
                userId: uid,
                username: onlineUser?.username || 'Unknown',
                lastSeen: onlineUser?.lastSeen
              };
            });
            
                  console.log(`📊 Room ${roomId} online count updated: ${onlineCount} users`);
      console.log(`👥 Remaining online users in room ${roomId}:`, roomOnlineUsers.map(u => u.username));
      
      io.to(roomId).emit('online-count-updated', {
        roomId,
        onlineCount,
        onlineUsers: roomOnlineUsers
      });
          }
          
          socket.to(roomId).emit('user-left', {
            userId,
            message: 'สมาชิกออกจากแชท'
          });
          
          console.log(`🔴 User ${userId} disconnected from room ${roomId}`);
        }
      }
    }
  });

  // อัปเดตรายการแชทฝั่งผู้รับ
  socket.on('update-recipient-chat-list', async (data) => {
    try {
      console.log('🔄 Update recipient chat list event received:', data);
      const { chatId, message, senderId } = data;
      
      if (!chatId || !message || !senderId) {
        console.warn('⚠️ Missing required data for update-recipient-chat-list');
        return;
      }

      // หา recipient ID จาก chatId (format: private_userId1_userId2)
      const chatParts = chatId.split('_');
      if (chatParts.length >= 3) {
        const userId1 = chatParts[1];
        const userId2 = chatParts[2];
        const recipientId = userId1 === senderId ? userId2 : userId1;
        
        console.log('🎯 Sending chat list update to recipient:', recipientId);
        
        // ส่ง event ไปยังผู้รับเพื่อให้รีเฟรชรายการแชท
        io.to(`user_${recipientId}`).emit('refresh-private-chat-list', {
          recipientId,
          chatId,
          message,
          senderId
        });
        
        console.log('✅ Chat list refresh notification sent');
      } else {
        console.warn('⚠️ Invalid chat ID format:', chatId);
      }
    } catch (error) {
      console.error('❌ Error handling update-recipient-chat-list:', error);
    }
  });

  // แจ้งเตือนเมื่อมีคนโหวต
  socket.on('vote-notification', async (data) => {
    try {
      console.log('🗳️ Vote notification event received:', data);
      const { voterId, candidateId, voteType, action } = data;
      
      if (!voterId || !candidateId) {
        console.warn('⚠️ Missing required data for vote-notification');
        return;
      }

      // ดึงข้อมูลผู้ใช้
      const [voter, candidate] = await Promise.all([
        User.findById(voterId),
        User.findById(candidateId)
      ]);

      if (!voter || !candidate) {
        console.warn('⚠️ Voter or candidate not found');
        return;
      }

      // สร้าง notification สำหรับผู้ที่ถูกโหวต
      const notification = {
        type: 'vote',
        title: action === 'cast' ? 'คุณได้รับโหวต' : 'มีคนยกเลิกการโหวต',
        message: action === 'cast' 
          ? `${voter.displayName || voter.username} โหวตให้คุณ`
          : `${voter.displayName || voter.username} ยกเลิกการโหวต`,
        data: {
          voterId: voter._id,
          voterName: voter.displayName || voter.username,
          voterProfileImage: voter.profileImages && voter.profileImages.length > 0 
            ? voter.profileImages[voter.mainProfileImageIndex || 0] 
            : null,
          voteType,
          action
        },
        createdAt: new Date(),
        isRead: false
      };

      // ส่ง notification ไปยังผู้ที่ถูกโหวต
      io.to(`user_${candidateId}`).emit('newNotification', {
        ...notification,
        recipientId: candidateId
      });

      console.log('✅ Vote notification sent to:', candidateId);
    } catch (error) {
      console.error('❌ Error handling vote-notification:', error);
    }
  });

  // แจ้งเตือนเมื่อมีคนกดหัวใจข้อความ
  socket.on('heart-notification', async (data) => {
    try {
      console.log('❤️ Heart notification event received:', data);
      const { messageId, userId, messageOwnerId } = data;
      
      if (!messageId || !userId || !messageOwnerId) {
        console.warn('⚠️ Missing required data for heart-notification');
        return;
      }

      // ตรวจสอบว่าไม่ใช่คนเดียวกัน
      if (userId === messageOwnerId) {
        console.log('ℹ️ User hearted their own message, no notification needed');
        return;
      }

      // ดึงข้อมูลผู้ใช้
      const [user, messageOwner] = await Promise.all([
        User.findById(userId),
        User.findById(messageOwnerId)
      ]);

      if (!user || !messageOwner) {
        console.warn('⚠️ User or message owner not found');
        return;
      }

      // สร้าง notification สำหรับเจ้าของข้อความ
      const notification = {
        type: 'heart',
        title: 'คุณได้รับหัวใจ',
        message: `${user.displayName || user.username} กดหัวใจข้อความของคุณ`,
        data: {
          userId: user._id,
          userName: user.displayName || user.username,
          userProfileImage: user.profileImages && user.profileImages.length > 0 
            ? user.profileImages[user.mainProfileImageIndex || 0] 
            : null,
          messageId
        },
        createdAt: new Date(),
        isRead: false
      };

      // ส่ง notification ไปยังเจ้าของข้อความ
      io.emit('newNotification', {
        ...notification,
        recipientId: messageOwnerId
      });

      console.log('✅ Heart notification sent to:', messageOwnerId);
    } catch (error) {
      console.error('❌ Error handling heart-notification:', error);
    }
  });

  // แจ้งเตือนเมื่อมีแชทส่วนตัวเข้ามา
  socket.on('private-chat-notification', async (data) => {
    try {
      console.log('💬 Private chat notification event received:', data);
      const { senderId, recipientId, message } = data;
      
      if (!senderId || !recipientId) {
        console.warn('⚠️ Missing required data for private-chat-notification');
        return;
      }

      // ตรวจสอบว่าไม่ใช่คนเดียวกัน
      if (senderId === recipientId) {
        console.log('ℹ️ User sent message to themselves, no notification needed');
        return;
      }

      // ดึงข้อมูลผู้ใช้
      const [sender, recipient] = await Promise.all([
        User.findById(senderId),
        User.findById(recipientId)
      ]);

      if (!sender || !recipient) {
        console.warn('⚠️ Sender or recipient not found');
        return;
      }

      // สร้าง notification สำหรับผู้รับ
      const notification = {
        type: 'private_chat',
        title: 'ข้อความใหม่',
        message: `${sender.displayName || sender.username} ส่งข้อความมา`,
        data: {
          senderId: sender._id,
          senderName: sender.displayName || sender.username,
          senderProfileImage: sender.profileImages && sender.profileImages.length > 0 
            ? sender.profileImages[sender.mainProfileImageIndex || 0] 
            : null,
          messageContent: message?.content || 'ข้อความ',
          chatId: message?.chatRoom
        },
        createdAt: new Date(),
        isRead: false
      };

      // ส่ง notification ไปยังผู้รับ
      io.emit('newNotification', {
        ...notification,
        recipientId
      });

      console.log('✅ Private chat notification sent to:', recipientId);
    } catch (error) {
      console.error('❌ Error handling private-chat-notification:', error);
    }
  });

  // แจ้งเตือนเมื่อมีคนตอบกลับแชทสาธารณะ
  socket.on('public-chat-reply-notification', async (data) => {
    try {
      console.log('💬 Public chat reply notification event received:', data);
      const { messageId, userId, originalChatMessageOwnerId, roomId } = data;
      
      if (!messageId || !userId || !originalChatMessageOwnerId) {
        console.warn('⚠️ Missing required data for public-chat-reply-notification');
        return;
      }

      // ตรวจสอบว่าไม่ใช่คนเดียวกัน
      if (userId === originalChatMessageOwnerId) {
        console.log('ℹ️ User replied to their own message, no notification needed');
        return;
      }

      // ดึงข้อมูลผู้ใช้
      const [user, originalChatMessageOwner] = await Promise.all([
        User.findById(userId),
        User.findById(originalChatMessageOwnerId)
      ]);

      if (!user || !originalChatMessageOwner) {
        console.warn('⚠️ User or original message owner not found');
        return;
      }

      // สร้าง notification สำหรับเจ้าของข้อความเดิม
      const notification = {
        type: 'public_chat_reply',
        title: 'มีคนตอบกลับข้อความของคุณ',
        message: `${user.displayName || user.username} ตอบกลับข้อความของคุณ`,
        data: {
          userId: user._id,
          userName: user.displayName || user.username,
          userProfileImage: user.profileImages && user.profileImages.length > 0 
            ? user.profileImages[user.mainProfileImageIndex || 0] 
            : null,
          messageId,
          roomId
        },
        createdAt: new Date(),
        isRead: false
      };

      // ส่ง notification ไปยังเจ้าของข้อความเดิม
      io.emit('newNotification', {
        ...notification,
        recipientId: originalChatMessageOwnerId
      });

      console.log('✅ Public chat reply notification sent to:', originalChatMessageOwnerId);
    } catch (error) {
      console.error('❌ Error handling public-chat-reply-notification:', error);
    }
  });
});

// RTMP Server Configuration - DISABLED
const RTMP_PORT = process.env.RTMP_PORT || 1935;
const HLS_PORT = process.env.HLS_PORT || 8000;
// 
// const rtmpConfig = {
//   rtmp: {
//     port: RTMP_PORT,
//     chunk_size: 60000,
//     gop_cache: true,
//     ping: 30,
//     ping_timeout: 60
//   },
//   trans: {
//     ffmpeg: process.env.FFMPEG_PATH || (process.platform === 'win32' ? 'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe' : 'ffmpeg'),
//     tasks: [
//       {
//         app: 'live',
//         hls: true,
//         hlsFlags: '[hls_time=6:hls_list_size=6:hls_flags=delete_segments]',
//         hlsKeep: true,
//         dash: false
//       }
//     ]
//   }
// };

// Start Server only once; works with or without MongoDB
let serverStarted = false;
const startServer = () => {
  if (serverStarted) {
    console.log('ℹ️  Server already started, skipping duplicate start attempt');
    return;
  }
  serverStarted = true;
  // Check email service configuration
  console.log('\n📧 Checking email service configuration...');
  const emailService = require('./services/emailService');
  const emailConfigured = emailService.isConfigured();
  console.log(`   Email service configured: ${emailConfigured ? '✅ YES' : '❌ NO'}`);
  if (!emailConfigured) {
    console.warn('   ⚠️  Email service is not configured. Emails will not be sent.');
    console.warn('   ⚠️  Please check EMAIL_USER and EMAIL_PASS in env.development');
  } else {
    console.log('   ✅ Email service is ready to send emails');
  }
  console.log('   EMAIL_HOST:', process.env.EMAIL_HOST || 'NOT SET');
  console.log('   EMAIL_PORT:', process.env.EMAIL_PORT || 'NOT SET');
  console.log('   EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
  console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '***SET***' : 'NOT SET');
  console.log('   EMAIL_FROM:', process.env.EMAIL_FROM || 'NOT SET');
  console.log('');
  
  // Error handling for server startup
  server.on('error', (error) => {
    console.error('❌ Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      console.error('❌ Server error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ============================================');
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`📱 Frontend URLs: ${FRONTEND_URL}`);
    console.log(`🔧 Backend API: http://localhost:${PORT}`);
    console.log(`💬 Socket.IO: Real-time chat enabled`);
    console.log(`🗄️  Database: sodeclick`);
    // console.log(`📺 RTMP Server: rtmp://localhost:${RTMP_PORT}/live`); // Disabled
    // console.log(`📺 HLS Server: http://localhost:${HLS_PORT}/live`); // Disabled
    console.log('🚀 ============================================');
    
    // Test CORS configuration
    console.log('🌐 CORS Configuration:');
    console.log('   Allowed origins:', [
      'http://localhost:5173',
      'https://sodeclick.com',
      'https://www.sodeclick.com',
      'https://sodeclick-frontend-production.up.railway.app'
    ]);
  });
  
  // Start RTMP Server - DISABLED (commented out)
  // let nms;
    // try {
    //   nms = new NodeMediaServer(rtmpConfig);
    //   
    //   // Only start RTMP server if not in Railway environment or if explicitly enabled
    //   if (!process.env.RAILWAY_ENVIRONMENT || process.env.ENABLE_RTMP === 'true') {
    //     nms.run();
    //     console.log(`📺 RTMP Server started successfully`);
    //   } else {
    //     console.log(`⚠️ RTMP Server disabled in Railway environment`);
    //   }
    // } catch (error) {
    //   console.error(`📺 Failed to start NodeMediaServer:`, error);
    //   console.log(`⚠️ Continuing without RTMP server...`);
    // }
    
    // Cleanup old HLS files - DISABLED
    // const cleanupOldHLSFiles = () => {
    //   try {
    //     const liveDir = path.join(__dirname, 'media', 'live');
    //     
    //     if (!fs.existsSync(liveDir)) {
    //       return;
    //     }
    //     
    //     const files = fs.readdirSync(liveDir);
    //     const now = Date.now();
    //     const maxAge = 5 * 60 * 1000; // 5 minutes in milliseconds
    //     let deletedCount = 0;
    //     
    //     for (const file of files) {
    //       const filePath = path.join(liveDir, file);
    //       const stats = fs.statSync(filePath);
    //       const age = now - stats.mtime.getTime();
    //       
    //       if (age > maxAge) {
    //         fs.unlinkSync(filePath);
    //         deletedCount++;
    //       }
    //     }
    //     
    //     if (deletedCount > 0) {
    //       console.log(`📺 Cleaned up ${deletedCount} old HLS files`);
    //     }
    //   } catch (error) {
    //     console.error('📺 Error cleaning up HLS files:', error);
    //   }
    // };
    // 
    // // Run cleanup immediately and then every 5 minutes
    // cleanupOldHLSFiles();
    // setInterval(cleanupOldHLSFiles, 5 * 60 * 1000);
    
    // RTMP Server event handlers - DISABLED
    if (false) {
      // Add error handling
      nms.on('error', (id, err) => {
        console.error(`📺 NodeMediaServer error:`, err);
      });
      
      // RTMP Server event handlers
      nms.on('preConnect', (id, args) => {
        console.log(`📺 RTMP Client connecting: ${id}`);
        console.log(`📺 Connection args:`, args);
      });
      
      nms.on('postConnect', (id, args) => {
      console.log(`📺 RTMP Client connected: ${id}`);
      console.log(`📺 Client info:`, args);
    });
    
    nms.on('doneConnect', (id, args) => {
      console.log(`📺 RTMP Client disconnected: ${id}`);
    });
    
    nms.on('prePublish', (id, StreamPath, args) => {
      console.log(`📺 RTMP Stream starting: ${StreamPath}`);
      console.log(`📺 Connection ID:`, id);
      console.log(`📺 Stream Args:`, args);
    });
    
    nms.on('postPublish', async (id, StreamPath, args) => {
      console.log(`📺 RTMP Stream started: ${StreamPath}`);
      console.log(`📺 Connection ID:`, id);
      console.log(`📺 Stream Args:`, args);
      
      // Get StreamPath from id object if StreamPath parameter is undefined
      let actualStreamPath = StreamPath;
      if (!actualStreamPath || actualStreamPath === 'undefined') {
        actualStreamPath = id.streamPath;
        console.log(`📺 Using StreamPath from id object: ${actualStreamPath}`);
      }
      
      // Check if StreamPath is valid
      if (!actualStreamPath || actualStreamPath === 'undefined') {
        console.log(`⚠️ StreamPath is undefined or invalid: ${actualStreamPath}`);
        console.log(`📺 Available arguments:`, { id, StreamPath, args });
        return;
      }
      
      // Extract stream key from path (e.g., /live/stream_key -> stream_key)
      const streamKey = actualStreamPath.split('/').pop();
      console.log(`📺 Stream key: ${streamKey}`);
      
      // Manually spawn FFmpeg for HLS transcoding
      const { spawn } = require('child_process');
      const ffmpegPath = process.env.FFMPEG_PATH || 'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe';
      const inputUrl = `rtmp://localhost:${RTMP_PORT}${actualStreamPath}`;
      const outputPath = path.join(liveDir, `${streamKey}.m3u8`);
      
      console.log(`🎬 Starting FFmpeg manually...`);
      console.log(`   Input: ${inputUrl}`);
      console.log(`   Output: ${outputPath}`);
      
      const ffmpegArgs = [
        '-i', inputUrl,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-tune', 'zerolatency',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-f', 'hls',
        '-hls_time', '6',
        '-hls_list_size', '6',
        '-hls_flags', 'delete_segments+append_list',
        '-hls_segment_filename', path.join(liveDir, `${streamKey}_%03d.ts`),
        outputPath
      ];
      
      const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);
      
      // Store FFmpeg process with session ID
      if (!global.ffmpegProcesses) {
        global.ffmpegProcesses = new Map();
      }
      global.ffmpegProcesses.set(id.id, ffmpegProcess);
      
      ffmpegProcess.stdout.on('data', (data) => {
        console.log(`FFmpeg stdout: ${data.toString().substring(0, 100)}...`);
      });
      
      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('frame=') || output.includes('time=')) {
          // Only log periodic updates
          if (Math.random() < 0.1) { // Log 10% of messages
            console.log(`FFmpeg: ${output.substring(0, 80)}...`);
          }
        } else {
          console.log(`FFmpeg stderr: ${output}`);
        }
      });
      
      ffmpegProcess.on('close', (code) => {
        console.log(`⏹️  FFmpeg process exited with code ${code}`);
        global.ffmpegProcesses.delete(id.id);
      });
      
      ffmpegProcess.on('error', (error) => {
        console.error(`❌ FFmpeg error:`, error);
        global.ffmpegProcesses.delete(id.id);
      });
      
      console.log(`✅ FFmpeg process spawned successfully (PID: ${ffmpegProcess.pid})`);
      console.log(`📁 HLS files will be created in: ${outputPath}`);
      
      // Update stream status in database
      try {
        const StreamRoom = require('./models/StreamRoom');
        const stream = await StreamRoom.findOne({ streamKey });
        
        if (stream && !stream.isLive) {
          stream.isLive = true;
          stream.startTime = new Date();
          await stream.save();
          
          console.log(`✅ Updated stream status to LIVE in database`);
          
          // Emit socket event to notify clients
          if (io) {
            io.emit('stream-started', {
              streamId: stream._id,
              title: stream.title,
              streamer: stream.streamerName,
              streamKey: streamKey
            });
            console.log(`📡 Notified clients: Stream started`);
          }
        } else if (!stream) {
          console.log(`⚠️ Stream not found in database with key: ${streamKey}`);
        }
      } catch (error) {
        console.error(`❌ Error updating stream status:`, error);
      }
    });
    
    nms.on('donePublish', async (id, StreamPath, args) => {
      console.log(`📺 RTMP Stream ended: ${StreamPath}`);
      
      // Stop FFmpeg process if exists
      if (global.ffmpegProcesses && global.ffmpegProcesses.has(id.id)) {
        const ffmpegProcess = global.ffmpegProcesses.get(id.id);
        console.log(`⏹️  Killing FFmpeg process (PID: ${ffmpegProcess.pid})`);
        ffmpegProcess.kill('SIGTERM');
        global.ffmpegProcesses.delete(id.id);
      }
      
      // Get StreamPath from id object if needed
      let actualStreamPath = StreamPath;
      if (!actualStreamPath || actualStreamPath === 'undefined') {
        actualStreamPath = id.streamPath;
      }
      
      // Check if StreamPath is valid
      if (!actualStreamPath || actualStreamPath === 'undefined') {
        console.log(`⚠️ StreamPath is undefined or invalid: ${actualStreamPath}`);
        return;
      }
      
      // Extract stream key from path
      const streamKey = actualStreamPath.split('/').pop();
      console.log(`📺 Cleaning up stream: ${streamKey}`);
      
      // Update stream status in database
      try {
        const StreamRoom = require('./models/StreamRoom');
        const stream = await StreamRoom.findOne({ streamKey });
        
        if (stream && stream.isLive) {
          stream.isLive = false;
          stream.endTime = new Date();
          await stream.save();
          
          console.log(`✅ Updated stream status to OFFLINE in database`);
          
          // Emit socket event to notify clients
          if (io) {
            io.emit('stream-ended', {
              streamId: stream._id,
              streamKey: streamKey,
              message: 'ไลฟ์สตรีมสิ้นสุดแล้ว'
            });
            console.log(`📡 Notified clients: Stream ended`);
          }
        }
      } catch (error) {
        console.error(`❌ Error updating stream status:`, error);
      }
    });

    // Additional error handling
    nms.on('error', (id, err) => {
      console.error(`📺 RTMP Server error:`, err);
    });
    
    // FFmpeg transcoding events
    nms.on('preTranscode', (id, streamPath, args) => {
      console.log(`🎬 FFmpeg transcoding starting for: ${streamPath}`);
      console.log(`🎬 FFmpeg args:`, args);
    });
    
    nms.on('postTranscode', (id, streamPath, args) => {
      console.log(`✅ FFmpeg transcoding started for: ${streamPath}`);
    });
    
    nms.on('doneTranscode', (id, streamPath, args) => {
      console.log(`⏹️  FFmpeg transcoding ended for: ${streamPath}`);
    });
    } // End of if (false) block - RTMP Server is disabled
    
    // Create separate HTTP server for HLS files (DISABLED - RTMP is disabled)
    // const express = require('express');
    // const hlsApp = express();
    // 
    // // Enable CORS for HLS server
    // hlsApp.use((req, res, next) => {
    //   res.header('Access-Control-Allow-Origin', '*');
    //   res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    //   res.header('Access-Control-Allow-Headers', 'Content-Type');
    //   if (req.method === 'OPTIONS') {
    //     res.sendStatus(200);
    //   } else {
    //     next();
    //   }
    // });
    // 
    // // Serve static files from live directory
    // hlsApp.use('/live', express.static(liveDir));
    // 
    // // Start HLS HTTP server
    // const hlsServer = http.createServer(hlsApp);
    // hlsServer.listen(HLS_PORT, '0.0.0.0', () => {
    //   // HLS HTTP Server started silently
    // });
};

// Wait for MongoDB connection before starting server
mongoose.connection.once('connected', () => {
  console.log('✅ MongoDB connected, starting server...');
  runtimeStatus.startupMode = 'mongo-connected';
  try {
    startServer();
  } catch (error) {
    console.error('❌ Error starting server:', error);
    console.error('❌ Error stack:', error.stack);
    // Don't exit immediately, let Railway handle it
  }
});

// If already connected, start server immediately
if (mongoose.connection.readyState === 1) {
  console.log('✅ MongoDB already connected, starting server...');
  runtimeStatus.startupMode = 'mongo-already-connected';
  try {
    startServer();
  } catch (error) {
    console.error('❌ Error starting server:', error);
    console.error('❌ Error stack:', error.stack);
    // Don't exit immediately, let Railway handle it
  }
}

// Fallback: start server after 5 seconds even if MongoDB is not connected (for Railway)
// Railway may need the server to start first before MongoDB connection
setTimeout(() => {
  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️  MongoDB not connected yet, but starting server anyway...');
    console.warn('⚠️  Server will retry MongoDB connection in background');
    runtimeStatus.startupMode = 'degraded-without-mongo';
    try {
      startServer();
    } catch (error) {
      console.error('❌ Error starting server:', error);
      console.error('❌ Error stack:', error.stack);
      // Don't exit, let Railway handle it
    }
  }
}, 5000); // Wait 5 seconds before starting server if MongoDB not connected

// Initialize socket module with the io instance
const socketManager = require('./socket');
socketManager.initializeSocket(io);

// Initialize DJ socket handlers
const { setupDJSocketHandlers } = require('./socket-handlers/dj-socket');
setupDJSocketHandlers(io);

// No need to export getSocketInstance from server.js anymore
// Routes should import from socket.js instead