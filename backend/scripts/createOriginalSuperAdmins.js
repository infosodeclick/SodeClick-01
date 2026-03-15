const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { DEFAULT_AVATAR_BASE64 } = require('../config/defaultAvatar');
require('dotenv').config({ path: './env.development' });

const createOriginalSuperAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // สร้าง SuperAdmin kao
    const kaoPassword = 'kao123';
    const kaoHashedPassword = await bcrypt.hash(kaoPassword, 12);
    
    const kaoData = {
      username: 'kao',
      email: 'kao@loveapp.com',
      password: kaoHashedPassword,
      firstName: 'Kao',
      lastName: 'Admin',
      displayName: 'Kao Admin',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'other',
      lookingFor: 'both',
      location: 'Thailand',
      role: 'superadmin',
      profileImages: [DEFAULT_AVATAR_BASE64], // เพิ่มรูปโปรไฟล์เริ่มต้น
      membership: {
        tier: 'platinum',
        startDate: new Date(),
        endDate: null
      },
      isActive: true,
      isVerified: true,
      isBanned: false,
      dailyUsage: {
        chatCount: 0,
        imageUploadCount: 0,
        videoUploadCount: 0,
        lastReset: new Date()
      },
      gpsLocation: {
        lat: 13.7563,
        lng: 100.5018
      },
      coordinates: {
        type: 'Point',
        coordinates: [100.5018, 13.7563]
      },
      lastActive: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // สร้าง SuperAdmin priktai
    const priktaiPassword = 'priktai123';
    const priktaiHashedPassword = await bcrypt.hash(priktaiPassword, 12);
    
    const priktaiData = {
      username: 'priktai',
      email: 'priktai@loveapp.com',
      password: priktaiHashedPassword,
      firstName: 'Prik',
      lastName: 'Tai',
      displayName: 'Prik Tai Admin',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'other',
      lookingFor: 'both',
      location: 'Thailand',
      role: 'superadmin',
      profileImages: [DEFAULT_AVATAR_BASE64], // เพิ่มรูปโปรไฟล์เริ่มต้น
      membership: {
        tier: 'platinum',
        startDate: new Date(),
        endDate: null
      },
      isActive: true,
      isVerified: true,
      isBanned: false,
      dailyUsage: {
        chatCount: 0,
        imageUploadCount: 0,
        videoUploadCount: 0,
        lastReset: new Date()
      },
      gpsLocation: {
        lat: 13.7563,
        lng: 100.5018
      },
      coordinates: {
        type: 'Point',
        coordinates: [100.5018, 13.7563]
      },
      lastActive: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // บันทึก SuperAdmin ทั้งสองโดยตรงในฐานข้อมูล
    const kaoResult = await mongoose.connection.db.collection('users').insertOne(kaoData);
    const priktaiResult = await mongoose.connection.db.collection('users').insertOne(priktaiData);

    console.log('✅ Created SuperAdmin kao:');
    console.log('  ID:', kaoResult.insertedId);
    console.log('  Username: kao');
    console.log('  Email: kao@loveapp.com');
    console.log('  Password:', kaoPassword);
    console.log('  Role: superadmin');

    console.log('\n✅ Created SuperAdmin priktai:');
    console.log('  ID:', priktaiResult.insertedId);
    console.log('  Username: priktai');
    console.log('  Email: priktai@loveapp.com');
    console.log('  Password:', priktaiPassword);
    console.log('  Role: superadmin');

    // ทดสอบ login ทั้งสอง
    console.log('\n🔑 Testing login...');
    
    const savedKao = await mongoose.connection.db.collection('users').findOne({ username: 'kao' });
    const kaoValid = await bcrypt.compare(kaoPassword, savedKao.password);
    console.log('  kao login:', kaoValid ? '✅' : '❌');

    const savedPriktai = await mongoose.connection.db.collection('users').findOne({ username: 'priktai' });
    const priktaiValid = await bcrypt.compare(priktaiPassword, savedPriktai.password);
    console.log('  priktai login:', priktaiValid ? '✅' : '❌');

    console.log('\n📋 Summary of SuperAdmin accounts:');
    console.log('  1. superadmin@loveapp.com / admin123');
    console.log('  2. kao@loveapp.com / kao123');
    console.log('  3. priktai@loveapp.com / priktai123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Disconnected');
  }
};

createOriginalSuperAdmins();
