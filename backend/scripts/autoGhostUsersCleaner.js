const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');

// Load environment variables - try .env.production first, then env.production
const envPath = path.resolve(__dirname, '../.env.production');
const envPath2 = path.resolve(__dirname, '../env.production');
const fs = require('fs');

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else if (fs.existsSync(envPath2)) {
  require('dotenv').config({ path: envPath2 });
} else {
  console.warn('⚠️ No production environment file found, using default .env');
  require('dotenv').config();
}

/**
 * Script อัตโนมัติสำหรับเคลียร์ ghost users
 * รันทุก 5 นาที เพื่อเคลียร์ users ที่ติด online แต่ไม่ได้ใช้งานมากกว่า 10 นาที
 * ใช้สำหรับรันใน production เพื่อให้ระบบ online/offline แม่นยำ
 */

let isConnected = false;
let isRunning = false;

async function connectDB() {
  if (isConnected) {
    return;
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    isConnected = true;
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

async function clearGhostUsers() {
  if (isRunning) {
    console.log('⏳ Previous cleanup still running, skipping this cycle');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    await connectDB();

    // หา ghost users: users ที่ isOnline = true แต่ lastActive เก่ากว่า 10 นาที
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const result = await User.updateMany(
      {
        isOnline: true,
        lastActive: { $lt: tenMinutesAgo }
      },
      {
        $set: {
          isOnline: false,
          lastActive: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`🧹 [${new Date().toISOString()}] Cleared ${result.modifiedCount} ghost users (took ${Date.now() - startTime}ms)`);
    } else {
      console.log(`✅ [${new Date().toISOString()}] No ghost users found (took ${Date.now() - startTime}ms)`);
    }

  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Error clearing ghost users:`, error.message);
  } finally {
    isRunning = false;
  }
}

async function startAutoCleanup() {
  console.log('🚀 Ghost Users Auto-Cleaner Started');
  console.log('⏰ Running cleanup every 5 minutes');
  console.log('📊 Threshold: 10 minutes of inactivity');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // รันครั้งแรกทันที
  await clearGhostUsers();

  // รันทุก 5 นาที
  setInterval(async () => {
    await clearGhostUsers();
  }, 5 * 60 * 1000); // 5 minutes
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Ghost Users Auto-Cleaner...');
  if (isConnected) {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down Ghost Users Auto-Cleaner...');
  if (isConnected) {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
  process.exit(0);
});

// Start the auto cleanup
startAutoCleanup().catch((error) => {
  console.error('❌ Failed to start auto cleanup:', error);
  process.exit(1);
});

