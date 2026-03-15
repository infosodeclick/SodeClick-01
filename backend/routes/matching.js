const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// GPS และระยะทางถูกลบออกจากระบบแล้ว

// ฟังก์ชันคำนวณความเข้ากันได้ด้วย AI (ปรับปรุงใหม่ - ไม่ใช้ GPS)
const calculateCompatibilityScore = (user, match) => {
  let score = 0;
  const factors = [];

  // 1. อายุ (30%) - ปรับปรุงการคำนวณอายุให้แม่นยำ
  if (user.dateOfBirth && match.dateOfBirth) {
    const calculateAge = (dateOfBirth) => {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    };
    
    const userAge = calculateAge(user.dateOfBirth);
    const matchAge = calculateAge(match.dateOfBirth);
    const ageDiff = Math.abs(userAge - matchAge);
    
    // ปรับปรุงสูตรการคำนวณคะแนนอายุ
    let ageScore;
    if (ageDiff === 0) {
      ageScore = 30; // อายุเท่ากัน
    } else if (ageDiff <= 2) {
      ageScore = 28; // ต่างกัน 1-2 ปี
    } else if (ageDiff <= 5) {
      ageScore = 25; // ต่างกัน 3-5 ปี
    } else if (ageDiff <= 8) {
      ageScore = 20; // ต่างกัน 6-8 ปี
    } else if (ageDiff <= 12) {
      ageScore = 15; // ต่างกัน 9-12 ปี
    } else if (ageDiff <= 18) {
      ageScore = 10; // ต่างกัน 13-18 ปี
    } else {
      ageScore = Math.max(0, 15 - (ageDiff - 18) * 0.5); // ต่างกันมากกว่า 18 ปี
    }
    
    score += ageScore;
    factors.push({ 
      factor: 'อายุ', 
      score: Math.round(ageScore), 
      detail: `${userAge} ปี ↔ ${matchAge} ปี (ต่างกัน ${ageDiff} ปี)` 
    });
  } else {
    // ถ้าไม่มีข้อมูลอายุ ให้คะแนนกลาง
    score += 15;
    factors.push({ 
      factor: 'อายุ', 
      score: 15, 
      detail: 'ไม่ระบุอายุ' 
    });
  }

  // 2. ความสนใจ (30%) - เพิ่มน้ำหนัก
  if (user.interests && match.interests && user.interests.length > 0 && match.interests.length > 0) {
    const userInterestItems = user.interests.flatMap(interest => interest.items || []);
    const matchInterestItems = match.interests.flatMap(interest => interest.items || []);
    const commonInterests = userInterestItems.filter(interest => 
      matchInterestItems.some(matchInterest => 
        matchInterest.toLowerCase().trim() === interest.toLowerCase().trim()
      )
    );
    const interestScore = (commonInterests.length / Math.max(userInterestItems.length, matchInterestItems.length)) * 30;
    score += interestScore;
    factors.push({ 
      factor: 'ความสนใจ', 
      score: Math.round(interestScore), 
      detail: `${commonInterests.length} รายการร่วมกัน` 
    });
  } else {
    score += 15;
    factors.push({ 
      factor: 'ความสนใจ', 
      score: 15, 
      detail: 'ไม่ระบุความสนใจ' 
    });
  }

  // 3. ไลฟ์สไตล์ (25%)
  if (user.lifestyle && match.lifestyle) {
    const lifestyleMatches = Object.keys(user.lifestyle).filter(key => 
      user.lifestyle[key] && 
      match.lifestyle[key] && 
      user.lifestyle[key] === match.lifestyle[key]
    );
    const totalLifestyleFields = Object.keys(user.lifestyle).length;
    const lifestyleScore = totalLifestyleFields > 0 ? (lifestyleMatches.length / totalLifestyleFields) * 25 : 0;
    score += lifestyleScore;
    factors.push({ 
      factor: 'ไลฟ์สไตล์', 
      score: Math.round(lifestyleScore), 
      detail: `${lifestyleMatches.length} ด้านตรงกัน` 
    });
  } else {
    score += 12.5;
    factors.push({ 
      factor: 'ไลฟ์สไตล์', 
      score: 12, 
      detail: 'ไม่ระบุไลฟ์สไตล์' 
    });
  }

  // 4. ระดับสมาชิก (15%) - ปรับปรุงให้ทำงาน
  const membershipTierPriority = {
    'platinum': 7,
    'diamond': 6,
    'vip2': 5,
    'vip1': 4,
    'vip': 3,
    'gold': 2,
    'silver': 1,
    'member': 0
  };
  
  const userTier = membershipTierPriority[user.membership?.tier] || 0;
  const matchTier = membershipTierPriority[match.membership?.tier] || 0;
  
  // คำนวณคะแนนตามความใกล้เคียงของระดับสมาชิก
  const tierDiff = Math.abs(userTier - matchTier);
  const tierScore = Math.max(0, 15 - tierDiff * 2);
  score += tierScore;
  
  factors.push({ 
    factor: 'ระดับสมาชิก', 
    score: Math.round(tierScore), 
    detail: `${user.membership?.tier || 'member'} ↔ ${match.membership?.tier || 'member'}` 
  });

  return { score: Math.round(score), factors };
};

// ฟังก์ชันตรวจสอบสถานะออนไลน์ของ user (ไม่ตรวจสอบ lastActive)
const isUserOnline = (user) => {
  // ตรวจสอบเฉพาะ isOnline field เท่านั้น - ไม่ตรวจสอบ lastActive
  // ให้ online คงอยู่จนกว่าจะ logout หรือออกจากแอป
  return user.isOnline === true;
};

// GET /api/matching/ai-matches - ดึง AI matches
router.get('/ai-matches', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      minAge = 18,
      maxAge = 60,
      interests = [],
      lifestyle = [],
      refreshMode = false,
      onlineOnly = false
    } = req.query;

    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // กำหนดลำดับความสำคัญของ membership tier
    const membershipTierPriority = {
      'platinum': 7,
      'diamond': 6,
      'vip2': 5,
      'vip1': 4,
      'vip': 3,
      'gold': 2,
      'silver': 1,
      'member': 0
    };

    // ฟังก์ชันสุ่มตำแหน่งอาร์เรย์
    const shuffleArray = (array) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // ดึงข้อมูลผู้ใช้ทั้งหมดในระบบ (ยกเว้นตัวเอง, admin และ superadmin)
    const allUsers = await User.find({ 
      _id: { $ne: userId },
      role: { $nin: ['admin', 'superadmin'] }
    })
      .select('_id firstName lastName displayName dateOfBirth gender profileImages mainProfileImageIndex interests lifestyle membership bio lastActive isOnline role')
      .lean();
    
    console.log('Found users:', allUsers.length);

    // กรองผู้ใช้ตามเกณฑ์พื้นฐาน
    let filteredUsers = allUsers.filter(match => {
      // กรองตามอายุ
      if (match.dateOfBirth) {
        const age = Math.floor((new Date() - new Date(match.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
        // เพิ่มฟิลด์ age ลงใน match object
        match.age = age;
        if (age < parseInt(minAge) || age > parseInt(maxAge)) {
          return false;
        }
      } else {
        match.age = null;
      }

      // กรองตามเพศ (ถ้ามีการตั้งค่า)
      if (user.lookingFor && user.lookingFor !== 'both') {
        if (match.gender && match.gender !== user.lookingFor) {
          return false;
        }
      }

      // กรองตามความสนใจ (ถ้ามีการตั้งค่า)
      if (interests && interests.length > 0) {
        const matchInterests = match.interests?.flatMap(interest => interest.items || []) || [];
        const hasMatchingInterest = interests.some(interest => 
          matchInterests.some(matchInterest => 
            matchInterest.toLowerCase().includes(interest.toLowerCase())
          )
        );
        if (!hasMatchingInterest) return false;
      }

      return true;
    });

    // กรองตาม membership tier (ถ้ามีการตั้งค่า)
    if (req.query.membershipTier && req.query.membershipTier !== 'all') {
      const requestedTier = req.query.membershipTier;
      filteredUsers = filteredUsers.filter(match => {
        const matchTier = match.membership?.tier || 'member';
        return matchTier === requestedTier;
      });
    }

    // กรองตาม gender (ถ้ามีการตั้งค่า)
    if (req.query.gender && req.query.gender !== 'all') {
      const requestedGender = req.query.gender;
      filteredUsers = filteredUsers.filter(match => {
        return match.gender === requestedGender;
      });
    }

    // กรองตาม lookingFor (ถ้ามีการตั้งค่า)
    if (req.query.lookingFor && req.query.lookingFor !== 'all') {
      const requestedLookingFor = req.query.lookingFor;
      filteredUsers = filteredUsers.filter(match => {
        return match.lookingFor === requestedLookingFor || match.lookingFor === 'both';
      });
    }

    // กรองตาม hasPhoto (ถ้ามีการตั้งค่า)
    if (req.query.hasPhoto === 'true') {
      filteredUsers = filteredUsers.filter(match => {
        return match.profileImages && match.profileImages.length > 0;
      });
    }

    // ถ้าเปิดใช้ onlineOnly ให้แสดงเฉพาะผู้ใช้ออนไลน์
    if (onlineOnly === 'true' || onlineOnly === true) {
      filteredUsers = filteredUsers.filter(match => isUserOnline(match));
    }

    // เรียงลำดับตาม membership tier และ lastActive
    const tierOrder = ['platinum', 'diamond', 'vip2', 'vip1', 'vip', 'gold', 'silver', 'member'];
    
    filteredUsers.sort((a, b) => {
      const aTier = a.membership?.tier || 'member';
      const bTier = b.membership?.tier || 'member';
      const aTierIndex = tierOrder.indexOf(aTier);
      const bTierIndex = tierOrder.indexOf(bTier);
      
      if (aTierIndex !== bTierIndex) {
        return aTierIndex - bTierIndex; // เรียงตาม tier
      }
      
      return new Date(b.lastActive) - new Date(a.lastActive); // เรียงตาม lastActive
    });

    // สุ่มตำแหน่งผู้ใช้ในแต่ละ tier
    const selectedUsers = [];
    const tierGroups = {};
    
    filteredUsers.forEach(user => {
      const tier = user.membership?.tier || 'member';
      if (!tierGroups[tier]) {
        tierGroups[tier] = [];
      }
      tierGroups[tier].push(user);
    });

    // สุ่มผู้ใช้จากแต่ละ tier
    Object.keys(tierGroups).forEach(tier => {
      const shuffledUsers = shuffleArray(tierGroups[tier]);
      selectedUsers.push(...shuffledUsers);
    });

    // คำนวณความเข้ากันได้
    const usersWithScore = selectedUsers.map(match => {
      const compatibility = calculateCompatibilityScore(user, match);
      
      // คำนวณอายุ (ใช้ฟังก์ชันเดียวกันกับ compatibility score)
      const calculateAge = (dateOfBirth) => {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        return age;
      };
      
      const age = match.dateOfBirth ? calculateAge(match.dateOfBirth) : 25;

      return {
        ...match,
        name: match.displayName || `${match.firstName || ''} ${match.lastName || ''}`.trim() || 'ผู้ใช้',
        age: age,
        compatibilityScore: compatibility.score,
        compatibilityFactors: compatibility.factors,
        distance: 0, // ไม่มีระยะทางแล้ว
        distanceText: 'ไม่ระบุระยะทาง', // ไม่มีระยะทางแล้ว
        membershipTier: match.membership?.tier || 'member',
        likeCount: 0, // ตั้งค่าเริ่มต้นเป็น 0
        // ถ้าผู้ใช้ซ่อนสถานะออนไลน์ ให้แสดงเป็นออฟไลน์
        isOnline: (match.canHideOnlineStatus === true) ? false : (match.isOnline || false), // ใช้ isOnline จาก database แต่ซ่อนถ้า canHideOnlineStatus = true
        isActive: (match.canHideOnlineStatus === true) ? false : isUserOnline(match), // ตรวจสอบสถานะออนไลน์จริง แต่ซ่อนถ้า canHideOnlineStatus = true
        lastActive: match.lastActive
      };
    });

    // เรียงลำดับตามความเข้ากันได้
    const finalFilteredUsers = usersWithScore
      .sort((a, b) => {
        // เรียงตามความเข้ากันได้ (สูงที่สุดก่อน)
        return (b.compatibilityScore || 0) - (a.compatibilityScore || 0);
      })
      .slice(0, parseInt(limit));

    // นับจำนวนทั้งหมด
    const totalCount = selectedUsers.length;
    
    console.log('Filtered users:', finalFilteredUsers.length);
    console.log('Sample user:', finalFilteredUsers[0]);
    
    // 🔍 Debug: ตรวจสอบ profileImages ที่จะส่งไปให้ Frontend
    console.log('🖼️ Sending profileImages to frontend:', finalFilteredUsers.slice(0, 3).map(u => ({
      id: u._id,
      name: u.displayName || u.firstName,
      profileImages: u.profileImages,
      imageCount: u.profileImages?.length || 0,
      firstImage: u.profileImages?.[0]
    })));

    res.json({
      success: true,
      data: {
        matches: finalFilteredUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          hasMore: finalFilteredUsers.length < totalCount
        },
        stats: {
          totalMatches: totalCount,
          averageScore: finalFilteredUsers.length > 0 
            ? Math.round(finalFilteredUsers.reduce((sum, match) => sum + match.compatibilityScore, 0) / finalFilteredUsers.length)
            : 0,
          onlineUsers: finalFilteredUsers.filter(m => m.isOnline).length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching AI matches:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล matches'
    });
  }
});

// POST /api/matching/like - กดไลค์/ยกเลิกไลค์ match
router.post('/like', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ userId'
      });
    }

    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถไลค์ตัวเองได้'
      });
    }

    // หาผู้ใช้ที่ถูกไลค์
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // หาผู้ใช้ปัจจุบัน
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้ปัจจุบัน'
      });
    }

    // ตรวจสอบว่าเคยไลค์แล้วหรือไม่
    const isLiked = currentUser.likes.includes(userId);

    if (isLiked) {
      // ยกเลิกไลค์
      currentUser.likes = currentUser.likes.filter(id => id.toString() !== userId);
      await currentUser.save();

      res.json({
        success: true,
        message: 'ยกเลิกไลค์เรียบร้อยแล้ว',
        data: {
          isLiked: false,
          likeCount: currentUser.likes.length
        }
      });
    } else {
      // ไลค์
      currentUser.likes.push(userId);
      await currentUser.save();

      res.json({
        success: true,
        message: 'ส่งไลค์เรียบร้อยแล้ว',
        data: {
          isLiked: true,
          likeCount: currentUser.likes.length
        }
      });
    }

  } catch (error) {
    console.error('Error liking user:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการไลค์'
    });
  }
});

// GET /api/matching/liked-users - ดึงรายการผู้ใช้ที่ไลค์แล้ว
router.get('/liked-users', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('likes');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    res.json({
      success: true,
      data: user.likes.map(id => id.toString())
    });

  } catch (error) {
    console.error('Error fetching liked users:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});

module.exports = router;
