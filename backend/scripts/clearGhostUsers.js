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
 * Script สำหรับเคลียร์ ghost users
 * Ghost users คือ users ที่ติด online status แต่จริงๆ ไม่ได้อยู่ในระบบ
 * เกิดจากการปิด browser กะทันหันหรือ socket disconnect ไม่ถูกต้อง
 */

async function clearGhostUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // หา ghost users: users ที่ isOnline = true แต่ lastActive เก่ากว่า 10 นาที
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    console.log('🔍 Searching for ghost users...');
    console.log(`🔍 Criteria: isOnline = true AND lastActive < ${tenMinutesAgo.toISOString()}`);
    
    const ghostUsers = await User.find({
      isOnline: true,
      lastActive: { $lt: tenMinutesAgo }
    }).select('_id username displayName email isOnline lastActive');

    if (ghostUsers.length === 0) {
      console.log('✅ No ghost users found!');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n👻 Found ${ghostUsers.length} ghost users:`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    ghostUsers.forEach((user, index) => {
      const timeDiff = Math.floor((Date.now() - user.lastActive.getTime()) / 1000 / 60);
      console.log(`${index + 1}. ${user.displayName || user.username} (${user.email})`);
      console.log(`   Last Active: ${user.lastActive.toISOString()} (${timeDiff} minutes ago)`);
      console.log(`   Status: ${user.isOnline ? '🟢 Online' : '🔴 Offline'}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ถาม confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      readline.question('❓ Do you want to clear these ghost users? (yes/no): ', resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('❌ Operation cancelled');
      await mongoose.disconnect();
      return;
    }

    // อัพเดท ghost users เป็น offline
    console.log('\n🔄 Clearing ghost users...');
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

    console.log(`✅ Successfully cleared ${result.modifiedCount} ghost users`);
    console.log(`📊 Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

    // แสดง summary หลังเคลียร์
    const stillOnline = await User.countDocuments({ isOnline: true });
    console.log(`\n📊 Current online users: ${stillOnline}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error clearing ghost users:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Run the script
clearGhostUsers();

