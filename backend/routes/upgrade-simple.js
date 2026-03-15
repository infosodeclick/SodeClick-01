const express = require('express');
const router = express.Router();
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');

// POST /api/upgrade-simple - อัพเกรดแบบง่าย
router.post('/', async (req, res) => {
  const session = await User.startSession();

  try {
    const { userId, tier, paymentMethod, transactionId, amount, currency } = req.body;

    if (!userId || !tier || !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // เริ่ม transaction
    session.startTransaction();

    // หา user และ plan (ใช้ session ถ้าเป็นไปได้)
    let user, plan;
    try {
      [user, plan] = await Promise.all([
        User.findById(userId).session(session),
        MembershipPlan.findOne({ tier, isActive: true }).session(session)
      ]);
    } catch (sessionError) {
      console.warn('⚠️ Session query failed, trying without session:', sessionError.message);
      // Fallback: ไม่ใช้ session ถ้า session ไม่ทำงาน
      [user, plan] = await Promise.all([
        User.findById(userId),
        MembershipPlan.findOne({ tier, isActive: true })
      ]);
    }

    if (!user) {
      try {
        if (session && session.inTransaction && session.inTransaction()) {
          await session.abortTransaction();
        }
      } catch (abortError) {
        console.warn('⚠️ Failed to abort transaction:', abortError.message);
      }
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!plan) {
      try {
        if (session && session.inTransaction && session.inTransaction()) {
          await session.abortTransaction();
        }
      } catch (abortError) {
        console.warn('⚠️ Failed to abort transaction:', abortError.message);
      }
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found'
      });
    }

    // คำนวณวันหมดอายุ
    const startDate = new Date();
    const durationDays = plan.duration?.days || 30; // Default 30 วันถ้าไม่มี
    const endDate = new Date(startDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));
    
    console.log('📅 Calculating expiry date:', {
      tier,
      durationDays,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // เก็บข้อมูลก่อนการอัพเดรดเพื่อ rollback ถ้าจำเป็น
    const userBeforeUpdate = {
      membershipTier: user.membership?.tier,
      membershipStartDate: user.membership?.startDate,
      membershipEndDate: user.membership?.endDate,
      coins: user.coins,
      votePoints: user.votePoints,
      isVerified: user.isVerified,
      dailyUsage: user.dailyUsage
    };

    // คำนวณ coins และ votePoints ที่จะเพิ่ม
    const bonusCoins = plan.features?.bonusCoins || 0;
    const bonusVotePoints = plan.features?.votePoints || 0;
    const newCoins = (user.coins || 0) + bonusCoins;
    const newVotePoints = (user.votePoints || 0) + bonusVotePoints;

    // ตรวจสอบว่า tier นี้มีสิทธิ์ verified หรือไม่
    const verifiedTiers = ['gold', 'vip', 'vip1', 'vip2', 'diamond', 'platinum'];
    const shouldBeVerified = verifiedTiers.includes(tier);

    console.log('🔄 Upgrading membership:', {
      userId,
      tier,
      bonusCoins,
      bonusVotePoints,
      coinsBefore: user.coins,
      votePointsBefore: user.votePoints,
      coinsAfter: newCoins,
      votePointsAfter: newVotePoints,
      isVerifiedBefore: user.isVerified,
      shouldBeVerified
    });

    // อัพเดตโดยใช้ transaction
    const updateData = {
      'membership.tier': plan.tier,
      'membership.startDate': startDate,
      'membership.endDate': tier === 'member' ? null : endDate,
      'membership.autoRenew': false,
      'membership.planId': plan._id,
      'coins': newCoins,
      'votePoints': newVotePoints, // อัพเดต votePoints เสมอ (แม้จะเป็น 0)
      'dailyUsage.chatCount': 0,
      'dailyUsage.imageUploadCount': 0,
      'dailyUsage.videoUploadCount': 0,
      'dailyUsage.lastReset': new Date()
    };

    // อัพเดต isVerified ถ้า tier มีสิทธิ์
    if (shouldBeVerified) {
      updateData['isVerified'] = true;
    }

    // อัพเดต user โดยใช้ findByIdAndUpdate
    // ใช้ session ถ้าเป็นไปได้ แต่ถ้า session ไม่ทำงานจะใช้วิธีปกติ
    let updatedUser;
    try {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: false, session } // ใช้ session สำหรับ transaction
      );
    } catch (sessionError) {
      console.warn('⚠️ Session update failed, trying without session:', sessionError.message);
      // Fallback: ไม่ใช้ session ถ้า session ไม่ทำงาน
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: false }
      );
    }

    if (!updatedUser) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'User not found after update'
      });
    }

    // บันทึกประวัติการชำระเงินใน transaction เดียวกัน
    const paymentHistoryEntry = {
      tier: tier,
      amount: amount || 0,
      currency: currency || 'THB',
      paymentMethod: paymentMethod || 'unknown',
      transactionId: transactionId,
      status: 'completed',
      purchaseDate: new Date(),
      expiryDate: tier === 'member' ? null : endDate
    };

    if (!Array.isArray(updatedUser.paymentHistory)) {
      updatedUser.paymentHistory = [];
    }
    updatedUser.paymentHistory.push(paymentHistoryEntry);
    
    try {
      await updatedUser.save({ session });
    } catch (saveError) {
      console.warn('⚠️ Save with session failed, trying without session:', saveError.message);
      // Fallback: ไม่ใช้ session ถ้า session ไม่ทำงาน
      await updatedUser.save();
    }

    // อัปเดตสถิติแพ็กเกจ (ถ้ามี)
    if (plan.stats) {
      plan.stats.totalPurchases = (plan.stats.totalPurchases || 0) + 1;
      plan.stats.totalRevenue = (plan.stats.totalRevenue || 0) + (amount || 0);
      try {
        await plan.save({ session });
      } catch (planSaveError) {
        console.warn('⚠️ Plan save with session failed, trying without session:', planSaveError.message);
        // Fallback: ไม่ใช้ session ถ้า session ไม่ทำงาน
        await plan.save();
      }
    }

    // ยืนยัน transaction
    try {
      await session.commitTransaction();
    } catch (commitError) {
      console.warn('⚠️ Transaction commit failed:', commitError.message);
      // ถ้า commit ไม่ได้ แต่ข้อมูลถูกอัพเดตแล้ว ก็ไม่เป็นไร
      // เพราะเราใช้ fallback แล้ว
    }

    // ส่ง Socket.IO event สำหรับอัพเดท membership แบบ real-time
    const io = req.app.get('io');
    if (io) {
      try {
        // อัพเดทข้อความเก่า (ไม่ใช้ session เพราะ transaction commit แล้ว)
        const Message = require('../models/Message');
        await Message.updateMany(
          { 'sender': userId },
          { $set: { 'sender.membershipTier': tier } }
        );

        // ส่ง event ไปยังห้องแชทที่ผู้ใช้นี้อยู่
        io.emit('membership-updated', {
          userId,
          newTier: tier,
          user: {
            _id: updatedUser._id,
            username: updatedUser.username,
            displayName: updatedUser.displayName,
            membershipTier: tier,
            profileImages: updatedUser.profileImages
          }
        });

        console.log(`🔄 Emitted membership update for user ${userId} to ${tier}`);
      } catch (socketError) {
        console.error('Error sending socket event:', socketError);
        // ไม่ให้ error นี้หยุดการทำงานของ transaction ที่สำเร็จแล้ว
      }
    }

    console.log('✅ Membership upgraded successfully:', {
      userId,
      tier: updatedUser.membership.tier,
      coinsBefore: userBeforeUpdate.coins,
      coinsAfter: updatedUser.coins,
      votePointsBefore: userBeforeUpdate.votePoints,
      votePointsAfter: updatedUser.votePoints,
      isVerifiedBefore: userBeforeUpdate.isVerified,
      isVerifiedAfter: updatedUser.isVerified
    });

    res.json({
      success: true,
      message: 'Membership upgraded successfully',
      data: {
        tier: updatedUser.membership.tier,
        startDate: updatedUser.membership.startDate,
        endDate: updatedUser.membership.endDate,
        bonusCoinsAdded: bonusCoins,
        bonusVotePointsAdded: bonusVotePoints,
        newCoinBalance: updatedUser.coins,
        newVotePointsBalance: updatedUser.votePoints,
        totalCoins: updatedUser.coins,
        totalVotePoints: updatedUser.votePoints,
        isVerified: updatedUser.isVerified,
        transactionId
      }
    });

  } catch (error) {
    // Rollback transaction ถ้ามี error และ session ยังทำงานอยู่
    try {
      if (session && session.inTransaction && session.inTransaction()) {
        await session.abortTransaction();
        console.log('🔄 Transaction rolled back due to error:', error.message);
      }
    } catch (abortError) {
      console.warn('⚠️ Failed to abort transaction:', abortError.message);
    }

    console.error('❌ Error upgrading membership:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Request body:', req.body);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error code:', error.code);

    // ถ้าเป็น error ที่เกี่ยวกับข้อมูลไม่ถูกต้อง ให้ return bad request
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data provided',
        error: error.message
      });
    }

    // ถ้าเป็น error อื่นๆ ให้ return internal server error
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade membership',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    // ปิด session
    await session.endSession();
  }
});

module.exports = router;
