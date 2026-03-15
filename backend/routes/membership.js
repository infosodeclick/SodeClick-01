const express = require('express');
const router = express.Router();
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');

// GET /api/membership/plans - ดึงแพ็กเกจสมาชิกทั้งหมด
router.get('/plans', async (req, res) => {
  try {
    const plans = await MembershipPlan.find({
      isActive: true,
      tier: { $ne: 'test' } // กรอง test tier ออก
    }).sort({ order: 1 });
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching membership plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch membership plans',
      error: error.message
    });
  }
});

// GET /api/membership/user/:userId - ดึงข้อมูลสมาชิกของผู้ใช้
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select(
      'membership coins votePoints dailyUsage isVerified'
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ตรวจสอบการหมดอายุและจัดการ
    const wasExpired = await user.checkAndHandleExpiration();
    
    // รีเซ็ตการใช้งานรายวันถ้าจำเป็น
    user.resetDailyUsage();
    await user.save();
    
         // Debug: แสดงข้อมูลการตรวจสอบ (เฉพาะเมื่อต้องการ debug)
     // console.log('🔍 Debug Membership Check:', { userId: user._id, tier: user.membership.tier, endDate: user.membership.endDate?.toISOString(), isActive: user.isMembershipActive, wasExpired });

    const limits = user.getMembershipLimits();
    let isActive = user.isMembershipActive;

    // ดึงข้อมูล features จาก MembershipPlan
    let features = null;
    if (user.membership.planId) {
      try {
        const MembershipPlan = require('../models/MembershipPlan');
        const plan = await MembershipPlan.findById(user.membership.planId);
        features = plan ? plan.features : null;
        console.log(`📋 Loaded features for user ${userId}, tier: ${user.membership.tier}, blurredImages: ${features?.blurredImages || 0}`);
      } catch (error) {
        console.error('Error loading membership plan features:', error);
      }
    }

    // ตรวจสอบสถานะ daily bonus และ spin wheel
    const canClaimDailyBonus = user.canClaimDailyBonus();
    const canSpinWheel = user.canSpinWheel();
    const timeUntilNextDailyBonus = user.getTimeUntilNextDailyBonus();
    const timeUntilNextSpinWheel = user.getTimeUntilNextSpinWheel();

    // คำนวณคะแนนโหวตจากวงล้อ
    const VoteTransaction = require('../models/VoteTransaction');
    const spinWheelVotePoints = await VoteTransaction.aggregate([
      {
        $match: {
          candidate: user._id,
          source: 'spin_wheel',
          status: 'active'
        }
      },
      {
        $group: {
          _id: null,
          totalSpinWheelVotePoints: { $sum: '$votePoints' }
        }
      }
    ]);
    
    const totalSpinWheelVotePoints = spinWheelVotePoints.length > 0 ? spinWheelVotePoints[0].totalSpinWheelVotePoints : 0;

    // ตรวจสอบและจัดการกรณีที่ไม่มี endDate
    let membershipExpiry = user.membership.endDate;
    
    // ถ้าเป็น premium member แต่ไม่มี endDate หรือ endDate ไม่ตรงกับ tier ให้สร้างใหม่
    if (user.membership.tier !== 'member') {
      // กำหนดระยะเวลาตาม tier จากไฟล์ membership
      let durationDays = 30; // default
      
      switch (user.membership.tier) {
        case 'silver':
          durationDays = 7;
          break;
        case 'gold':
          durationDays = 15;
          break;
        case 'vip':
        case 'vip1':
        case 'vip2':
        case 'diamond':
        case 'platinum':
          durationDays = 30;
          break;
        default:
          durationDays = 30;
      }
      
      // ตรวจสอบว่าต้องสร้าง endDate ใหม่หรือไม่
      let needNewEndDate = false;
      
      if (!user.membership.endDate) {
        console.log(`⚠️  พบ Premium Member (${user.membership.tier}) ที่ไม่มี endDate - สร้างใหม่`);
        needNewEndDate = true;
      } else {
        // ตรวจสอบว่า endDate ปัจจุบันถูกต้องหรือไม่
        const startDate = user.membership.startDate;
        const endDate = user.membership.endDate;
        
        if (startDate && endDate) {
          // คำนวณระยะเวลาจริงจาก startDate ถึง endDate
          const actualDuration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
          
          // ถ้าระยะเวลาไม่ตรงกับที่กำหนด ให้สร้างใหม่
          if (actualDuration !== durationDays) {
            console.log(`⚠️  พบ Premium Member (${user.membership.tier}) ที่มีระยะเวลาไม่ตรงกับที่กำหนด (${actualDuration} วัน vs ${durationDays} วัน) - สร้างใหม่`);
            needNewEndDate = true;
          }
        } else {
          // ถ้าไม่มี startDate หรือ endDate ให้สร้างใหม่
          console.log(`⚠️  พบ Premium Member (${user.membership.tier}) ที่ไม่มี startDate หรือ endDate - สร้างใหม่`);
          needNewEndDate = true;
        }
      }
      
      if (needNewEndDate) {
        // สร้าง endDate ใหม่จาก startDate ที่ถูกต้อง
        const startDate = user.membership.startDate || new Date();
        const newEndDate = new Date(startDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));
        
        user.membership.endDate = newEndDate;
        await user.save();
        
        membershipExpiry = newEndDate;
        isActive = true;
        
        console.log(`✅ สร้าง endDate ใหม่จาก startDate: ${startDate.toISOString()} -> ${newEndDate.toISOString()} (${durationDays} วัน)`);
      }
    }
    
         // Debug: แสดงข้อมูล role ที่ส่งไป
     // console.log('🔍 Backend Debug - User Role:', user.role);
     // console.log('🔍 Backend Debug - User ID:', user._id);
    
    res.json({
      success: true,
      data: {
        membershipTier: user.membership.tier,
        membershipExpiry: membershipExpiry,
        membershipStartDate: user.membership.startDate,
        isActive,
        coins: user.coins,
        votePoints: user.votePoints,
        dailyUsage: user.dailyUsage,
        limits,
        features, // เพิ่มข้อมูล features จาก MembershipPlan
        isVerified: user.isVerified,
        canClaimDailyBonus,
        canSpinWheel,
        timeUntilNextDailyBonus,
        timeUntilNextSpinWheel,
        totalSpinWheelVotePoints, // เพิ่มคะแนนโหวตจากวงล้อ
        role: user.role // เพิ่มข้อมูล role
      }
    });
  } catch (error) {
    console.error('Error fetching user membership:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user membership',
      error: error.message
    });
  }
});

// POST /api/membership/upgrade - อัพเกรดสมาชิก
router.post('/upgrade', async (req, res) => {
  try {
    const { userId, tier, paymentMethod, transactionId } = req.body;

    if (!userId || !tier) {
      return res.status(400).json({
        success: false,
        message: 'User ID and tier are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const plan = await MembershipPlan.findOne({ tier, isActive: true });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found'
      });
    }

    // คำนวณวันหมดอายุ
    const startDate = new Date();
    const expiryDate = new Date(startDate.getTime() + (plan.duration.days * 24 * 60 * 60 * 1000));

    // อัพเดตข้อมูลสมาชิก
    user.membership.tier = tier;
    user.membership.startDate = startDate;
    user.membership.endDate = tier === 'member' ? null : expiryDate;
    user.membership.planId = plan._id;
    
    // เพิ่มเหรียญโบนัส (สำหรับ Diamond และ Platinum)
    if (plan.features.bonusCoins > 0) {
      user.coins += plan.features.bonusCoins;
    }

    // เพิ่มคะแนนโหวต
    if (plan.features.votePoints > 0) {
      user.votePoints += plan.features.votePoints;
    }

    // อัพเดต verification badge
    if (['gold', 'vip', 'vip1', 'vip2', 'diamond', 'platinum'].includes(tier)) {
      user.isVerified = true;
    }

    // บันทึกประวัติการชำระเงิน
    user.paymentHistory.push({
      tier,
      amount: plan.price.amount,
      currency: plan.price.currency,
      paymentMethod: paymentMethod || 'unknown',
      transactionId: transactionId || `tx_${Date.now()}`,
      status: 'completed',
      purchaseDate: startDate,
      expiryDate
    });

    await user.save();

    // ส่ง Socket.IO event สำหรับอัพเดท membership แบบ real-time
    const io = req.app.get('io');
    if (io) {
      // อัพเดทข้อความเก่า
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
          _id: user._id,
          username: user.username,
          displayName: user.displayName,
          membershipTier: tier,
          profileImages: user.profileImages
        }
      });
      
      console.log(`🔄 Emitted membership update for user ${userId} to ${tier}`);
    }

    res.json({
      success: true,
      message: `Successfully upgraded to ${plan.name}`,
      data: {
        membershipTier: user.membership.tier,
        membershipExpiry: user.membership.endDate,
        coins: user.coins,
        votePoints: user.votePoints,
        bonusCoinsAdded: plan.features.bonusCoins || 0
      }
    });

  } catch (error) {
    console.error('Error upgrading membership:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade membership',
      error: error.message
    });
  }
});

// POST /api/membership/daily-bonus - รับโบนัสรายวัน
router.post('/daily-bonus', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ตรวจสอบการหมดอายุและจัดการ - แก้ไข: เพิ่มการตรวจสอบเพื่อให้โบนัสอัพเดทตาม tier ที่ถูกต้อง
    const wasExpired = await user.checkAndHandleExpiration();

    // รีเซ็ตการใช้งานรายวันถ้าจำเป็น - แก้ไข: เพิ่มการรีเซ็ตเพื่อให้สามารถรับโบนัสได้ในวันใหม่
    user.resetDailyUsage();
    await user.save();

    console.log(`🔍 Daily Bonus Check - User: ${user.username}, Tier: ${user.membership.tier}, Bonus: ${user.getMembershipLimits().dailyBonus}, Expired: ${wasExpired}`);

    // ตรวจสอบว่าสามารถรับโบนัสได้หรือไม่
    if (!user.canClaimDailyBonus()) {
      const timeRemaining = user.getTimeUntilNextDailyBonus();
      const nextAvailableTime = new Date(Date.now() + timeRemaining);

      return res.status(400).json({
        success: false,
        message: 'Daily bonus not available yet',
        nextAvailableTime: nextAvailableTime,
        timeRemaining: timeRemaining
      });
    }

    const limits = user.getMembershipLimits();
    const bonusAmount = limits.dailyBonus || 0;

    // Validation: ตรวจสอบว่า bonusAmount เป็นตัวเลขที่ถูกต้อง
    if (typeof bonusAmount !== 'number' || bonusAmount < 0 || isNaN(bonusAmount)) {
      console.error('❌ Invalid bonusAmount:', bonusAmount, 'for tier:', user.membership.tier);
      return res.status(500).json({
        success: false,
        message: 'Invalid bonus amount configuration',
        error: `Daily bonus amount is invalid: ${bonusAmount}`
      });
    }

    // เพิ่มเหรียญและอัพเดตสถานะ
    const oldCoins = user.coins || 0;
    const newCoins = (oldCoins || 0) + bonusAmount;
    
    // Validation: ตรวจสอบว่าผลลัพธ์ถูกต้อง
    if (isNaN(newCoins) || newCoins < 0) {
      console.error('❌ Invalid coins calculation:', {
        oldCoins,
        bonusAmount,
        newCoins,
        userCoins: user.coins
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate coins',
        error: 'Invalid coins calculation'
      });
    }

    user.coins = newCoins;
    user.dailyUsage.lastDailyBonusClaim = new Date();

    await user.save();

    console.log(`✅ Daily Bonus Success - User: ${user.username}, Added: ${bonusAmount}, Before: ${oldCoins}, After: ${user.coins}`);

    res.json({
      success: true,
      message: `Received daily bonus of ${bonusAmount} coins`,
      data: {
        bonusAmount,
        totalCoins: user.coins,
        nextBonusAvailable: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

  } catch (error) {
    console.error('Error claiming daily bonus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim daily bonus',
      error: error.message
    });
  }
});

// POST /api/membership/spin-wheel - หมุนวงล้อของขวัญ
router.post('/spin-wheel', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ตรวจสอบว่าสามารถหมุนได้หรือไม่
    if (!user.canSpinWheel()) {
      const timeRemaining = user.getTimeUntilNextSpinWheel();
      const nextAvailableTime = new Date(Date.now() + timeRemaining);
      
      return res.status(400).json({
        success: false,
        message: 'Spin wheel not available yet',
        nextAvailableTime: nextAvailableTime,
        timeRemaining: timeRemaining
      });
    }

    // สุ่มรางวัล - ใช้ระบบน้ำหนักการสุ่ม
    const prizes = [
      { type: 'coins', amount: 50, weight: 60 },
      { type: 'coins', amount: 100, weight: 50 },
      { type: 'coins', amount: 200, weight: 30 },
      { type: 'coins', amount: 500, weight: 10 },
      { type: 'votePoints', amount: 50, weight: 20 },
      { type: 'votePoints', amount: 100, weight: 10 },
      { type: 'votePoints', amount: 300, weight: 5 },
      { type: 'grand', coins: 500, votePoints: 500, weight: 3 }
    ];

    // คำนวณน้ำหนักรวม
    const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);
    
    // สุ่มตัวเลขระหว่าง 0 ถึง totalWeight
    const random = Math.random() * totalWeight;
    let cumulativeWeight = 0;
    let selectedPrize = prizes[0];

    for (const prize of prizes) {
      cumulativeWeight += prize.weight;
      if (random <= cumulativeWeight) {
        selectedPrize = prize;
        break;
      }
    }

    // เพิ่มรางวัลให้ผู้ใช้
    if (selectedPrize.type === 'coins') {
      user.coins += selectedPrize.amount;
    } else if (selectedPrize.type === 'votePoints') {
      // เพิ่ม votePoints ให้ผู้ใช้
      user.votePoints += selectedPrize.amount;
      
      // สร้าง VoteTransaction สำหรับรางวัลโหวตจากวงล้อ
      const VoteTransaction = require('../models/VoteTransaction');
      const voteTransaction = new VoteTransaction({
        voter: userId, // ผู้ที่หมุนวงล้อ
        candidate: userId, // ผู้ที่ได้รับรางวัล (ตัวเอง)
        voteType: 'popularity_combined',
        votePoints: selectedPrize.amount,
        message: `รางวัลจากวงล้อหมุน: ${selectedPrize.amount} คะแนน`,
        status: 'active',
        source: 'spin_wheel'
      });
      await voteTransaction.save();
    } else if (selectedPrize.type === 'grand') {
      // รางวัลใหญ่ - ได้ทั้งเหรียญและโหวต
      user.coins += selectedPrize.coins;
      user.votePoints += selectedPrize.votePoints;
      
      // สร้าง VoteTransaction สำหรับรางวัลโหวตจากวงล้อ
      const VoteTransaction = require('../models/VoteTransaction');
      const voteTransaction = new VoteTransaction({
        voter: userId, // ผู้ที่หมุนวงล้อ
        candidate: userId, // ผู้ที่ได้รับรางวัล (ตัวเอง)
        voteType: 'popularity_combined',
        votePoints: selectedPrize.votePoints,
        message: `รางวัลใหญ่จากวงล้อหมุน: ${selectedPrize.votePoints} คะแนน`,
        status: 'active',
        source: 'spin_wheel'
      });
      await voteTransaction.save();
    }

    // อัพเดตเวลาหมุนล่าสุด
    user.dailyUsage.lastSpinWheelTime = new Date();

    await user.save();

    const limits = user.getMembershipLimits();
    const nextSpinTime = new Date(Date.now() + limits.spinInterval);

    res.json({
      success: true,
      message: 'Spin wheel successful',
      data: {
        prize: selectedPrize,
        totalCoins: user.coins,
        totalVotePoints: user.votePoints,
        nextSpinTime
      }
    });

  } catch (error) {
    console.error('Error spinning wheel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to spin wheel',
      error: error.message
    });
  }
});

// POST /api/membership/transfer-coins - โอนเหรียญ (เฉพาะสมาชิก Diamond และ Platinum)
router.post('/transfer-coins', async (req, res) => {
  try {
    const { fromUserId, toUserId, amount } = req.body;

    if (!fromUserId || !toUserId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid user IDs and amount are required'
      });
    }

    const [fromUser, toUser] = await Promise.all([
      User.findById(fromUserId),
      User.findById(toUserId)
    ]);

    if (!fromUser || !toUser) {
      return res.status(404).json({
        success: false,
        message: 'One or both users not found'
      });
    }

    // ตรวจสอบสิทธิ์การโอนเหรียญ
    const limits = fromUser.getMembershipLimits();
    if (!limits.canTransferCoins) {
      return res.status(403).json({
        success: false,
        message: 'Coin transfer not available for your membership tier'
      });
    }

    // ตรวจสอบยอดเหรียญเพียงพอ
    if (fromUser.coins < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins'
      });
    }

    // โอนเหรียญ
    fromUser.coins -= amount;
    toUser.coins += amount;

    await Promise.all([fromUser.save(), toUser.save()]);

    res.json({
      success: true,
      message: `Successfully transferred ${amount} coins`,
      data: {
        fromUserCoins: fromUser.coins,
        toUserCoins: toUser.coins,
        transferAmount: amount
      }
    });

  } catch (error) {
    console.error('Error transferring coins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transfer coins',
      error: error.message
    });
  }
});

// GET /api/membership/check-action/:userId/:action - ตรวจสอบว่าสามารถทำ action ได้หรือไม่
router.get('/check-action/:userId/:action', async (req, res) => {
  try {
    const { userId, action } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.resetDailyUsage();
    const canPerform = user.canPerformAction(action);
    const limits = user.getMembershipLimits();

    let usage = 0;
    let limit = 0;

    switch (action) {
      case 'chat':
        usage = user.dailyUsage.chatCount;
        limit = limits.dailyChats;
        break;
      case 'uploadImage':
        usage = user.dailyUsage.imageUploadCount;
        limit = limits.dailyImages;
        break;
      case 'uploadVideo':
        usage = user.dailyUsage.videoUploadCount;
        limit = limits.dailyVideos;
        break;
    }

    res.json({
      success: true,
      data: {
        canPerform,
        usage,
        limit: limit === -1 ? 'unlimited' : limit,
        remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - usage)
      }
    });

  } catch (error) {
    console.error('Error checking action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check action',
      error: error.message
    });
  }
});

// POST /api/membership/upgrade - อัพเกรดสมาชิก
router.post('/upgrade', async (req, res) => {
  try {
    const { userId, tier, paymentMethod, transactionId, amount, currency } = req.body;
    
    if (!userId || !tier || !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // หา user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // หา membership plan
    const plan = await MembershipPlan.findOne({ tier, isActive: true });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found'
      });
    }

    // คำนวณวันหมดอายุ
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration.days);

    // อัพเดต membership ของ user
    user.membership = {
      tier: plan.tier,
      startDate: startDate,
      endDate: tier === 'member' ? null : endDate, // Member ไม่มีวันหมดอายุ
      autoRenew: false,
      planId: plan._id
    };

    // เพิ่มเหรียญโบนัส (ถ้ามี)
    if (plan.features.bonusCoins > 0) {
      user.coins = (user.coins || 0) + plan.features.bonusCoins;
    }

    // รีเซ็ต daily usage เพื่อให้ใช้ limit ใหม่ได้ทันที
    if (!user.dailyUsage) {
      user.dailyUsage = {
        chatCount: 0,
        imageUploadCount: 0,
        videoUploadCount: 0,
        lastReset: new Date()
      };
    } else {
      user.dailyUsage.chatCount = 0;
      user.dailyUsage.imageUploadCount = 0;
      user.dailyUsage.videoUploadCount = 0;
      user.dailyUsage.lastReset = new Date();
    }

    // ใช้ findByIdAndUpdate แทน save() เพื่อหลีกเลี่ยง pre-save hooks
    const updateData = {
      membership: user.membership,
      coins: user.coins,
      dailyUsage: user.dailyUsage
    };

    await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true });

    // บันทึก transaction log (สำหรับอนาคต)
    // await TransactionLog.create({
    //   userId,
    //   type: 'membership_upgrade',
    //   tier,
    //   amount,
    //   currency,
    //   paymentMethod,
    //   transactionId,
    //   status: 'completed'
    // });

    res.json({
      success: true,
      message: 'Membership upgraded successfully',
      data: {
        tier: user.membership.tier,
        startDate: user.membership.startDate,
        endDate: user.membership.endDate,
        bonusCoinsAdded: plan.features.bonusCoins,
        newCoinBalance: user.coins,
        transactionId
      }
    });

  } catch (error) {
    console.error('Error upgrading membership:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade membership',
      error: error.message
    });
  }
});

module.exports = router;
