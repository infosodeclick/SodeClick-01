const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('../models/User');
const { DEFAULT_AVATAR_BASE64 } = require('../config/defaultAvatar');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick';

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@loveapp.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('Email:', existingAdmin.email);
      console.log('Username:', existingAdmin.username);
      console.log('Role:', existingAdmin.role);
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminUser = new User({
      username: 'admin',
      email: 'admin@loveapp.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      lookingFor: 'both',
      location: 'Bangkok, Thailand',
      role: 'admin',
      isActive: true,
      isVerified: true,
      profileImages: [DEFAULT_AVATAR_BASE64], // เพิ่มรูปโปรไฟล์เริ่มต้น
      membership: {
        tier: 'platinum',
        startDate: new Date(),
        updatedAt: new Date()
      },
      coordinates: {
        type: 'Point',
        coordinates: [100.5018, 13.7563] // Bangkok coordinates
      },
      displayName: 'Admin User',
      coins: 10000,
      votePoints: 1000
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@loveapp.com');
    console.log('Password: admin123');
    console.log('Username: admin');
    console.log('Role: admin');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run the script
createAdminUser();
