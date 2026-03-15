const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const BlurTransaction = require('../models/BlurTransaction');
const { auth: authenticateToken } = require('../middleware/auth');

// GET /api/blur/user/:userId - ดูรูปที่เบลอของผู้ใช้
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { viewerId } = req.query; // ผู้ที่ต้องการดูรูป

    const user = await User.findById(userId).select('profileImages username displayName');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // กรองรูปที่เบลอ
    const blurredImages = user.profileImages.filter(img => {
      return typeof img === 'object' && img !== null && img.isBlurred === true;
    });

    // ถ้ามี viewerId ให้เช็คว่าซื้อรูปไหนไปแล้วบ้าง
    let purchasedImages = [];
    if (viewerId) {
      const transactions = await BlurTransaction.find({
        buyer: viewerId,
        imageOwner: userId,
        status: 'completed'
      }).select('imageId');
      
      purchasedImages = transactions.map(t => t.imageId);
    }

    // เตรียมข้อมูลรูป
    const imageData = blurredImages.map(img => {
      const imageId = img._id ? img._id.toString() : `image_${Date.now()}_${Math.random()}`;
      const isPurchased = purchasedImages.includes(imageId);
      
      return {
        id: imageId,
        url: img.url || '',
        isBlurred: true,
        isPurchased: isPurchased,
        cost: 10000 // ราคาคงที่ 10,000 เหรียญ
      };
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName
        },
        images: imageData,
        totalBlurredImages: blurredImages.length
      }
    });

  } catch (error) {
    console.error('Error fetching blurred images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blurred images',
      error: error.message
    });
  }
});

// POST /api/blur/purchase - ซื้อรูปที่เบลอ
router.post('/purchase', async (req, res) => {
  try {
    const { buyerId, imageOwnerId, imageId } = req.body;

    if (!buyerId || !imageOwnerId || !imageId) {
      return res.status(400).json({
        success: false,
        message: 'Buyer ID, Image Owner ID, and Image ID are required'
      });
    }

    // ตรวจสอบว่าซื้อแล้วหรือยัง
    const existingTransaction = await BlurTransaction.findOne({
      buyer: buyerId,
      imageOwner: imageOwnerId,
      imageId: imageId,
      status: 'completed'
    });

    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: 'Image already purchased'
      });
    }

    // ดึงข้อมูลผู้ซื้อและเจ้าของรูป
    const [buyer, imageOwner] = await Promise.all([
      User.findById(buyerId),
      User.findById(imageOwnerId)
    ]);

    if (!buyer || !imageOwner) {
      return res.status(404).json({
        success: false,
        message: 'Buyer or image owner not found'
      });
    }

    // ตรวจสอบว่าไม่ใช่คนเดียวกัน
    if (buyerId === imageOwnerId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot purchase your own image'
      });
    }

    // ค้นหารูปที่ต้องการซื้อ
    const targetImage = imageOwner.profileImages.find(
      img => img._id.toString() === imageId && img.isBlurred
    );

    if (!targetImage) {
      return res.status(404).json({
        success: false,
        message: 'Blurred image not found'
      });
    }

    const cost = 10000;
    const ownerShare = 5000;
    const systemShare = 5000;

    // ตรวจสอบยอดเหรียญ
    if (buyer.coins < cost) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins',
        required: cost,
        current: buyer.coins
      });
    }

    // ทำธุรกรรม
    buyer.coins -= cost;
    imageOwner.coins += ownerShare;

    // บันทึกธุรกรรม
    const transaction = new BlurTransaction({
      buyer: buyerId,
      imageOwner: imageOwnerId,
      imageId: imageId,
      imageUrl: targetImage.url,
      cost: cost,
      ownerShare: ownerShare,
      systemShare: systemShare,
      status: 'completed',
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    // บันทึกทุกอย่าง
    await Promise.all([
      buyer.save(),
      imageOwner.save(),
      transaction.save()
    ]);

    res.json({
      success: true,
      message: 'Image purchased successfully',
      data: {
        transaction: {
          id: transaction._id,
          cost: cost,
          ownerShare: ownerShare,
          systemShare: systemShare
        },
        buyer: {
          remainingCoins: buyer.coins
        },
        imageOwner: {
          earnedCoins: ownerShare,
          totalCoins: imageOwner.coins
        },
        image: {
          id: imageId,
          url: targetImage.url
        }
      }
    });

  } catch (error) {
    console.error('Error purchasing blurred image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase image',
      error: error.message
    });
  }
});

// GET /api/blur/transactions/:userId - ดูประวัติการซื้อ/ขาย (แบบง่าย)
router.get('/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'all' } = req.query;

    console.log('🔍 Blur Transactions API (Simple):', { userId, type });

    // ใช้ query แบบง่าย
    let query = {};
    if (type === 'purchases') {
      query.buyer = userId;
    } else if (type === 'sales') {
      query.imageOwner = userId;
    } else {
      query = {
        $or: [
          { buyer: userId },
          { imageOwner: userId }
        ]
      };
    }

    // ดึงข้อมูล transactions แบบง่าย (ไม่ populate)
    const transactions = await BlurTransaction.find(query)
      .sort({ purchasedAt: -1 })
      .limit(50); // จำกัดที่ 50 รายการ

    console.log('🔍 Found transactions:', transactions.length);

    // สรุปสถิติ
    let stats = {
      totalTransactions: transactions.length,
      totalSpent: 0,
      totalEarned: 0
    };
    
    // คำนวณสถิติ
    transactions.forEach(t => {
      if (t.buyer && t.buyer.toString() === userId) {
        stats.totalSpent += t.cost || 0;
      }
      if (t.imageOwner && t.imageOwner.toString() === userId) {
        stats.totalEarned += t.ownerShare || 0;
      }
    });

    res.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          id: t._id,
          type: t.buyer.toString() === userId ? 'purchase' : 'sale',
          buyer: t.buyer,
          imageOwner: t.imageOwner,
          imageId: t.imageId,
          cost: t.cost,
          ownerShare: t.ownerShare,
          imageUrl: t.imageUrl,
          purchasedAt: t.purchasedAt,
          status: t.status
        })),
        stats: stats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching blur transactions:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
});

// GET /api/blur/stats - สถิติรวมของระบบ
router.get('/stats', async (req, res) => {
  try {
    const stats = await BlurTransaction.aggregate([
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalRevenue: { $sum: '$systemShare' },
          totalCoinsCirculated: { $sum: '$cost' },
          averageTransaction: { $avg: '$cost' }
        }
      }
    ]);

    const topBuyers = await BlurTransaction.aggregate([
      {
        $group: {
          _id: '$buyer',
          totalSpent: { $sum: '$cost' },
          totalPurchases: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          username: '$user.username',
          displayName: '$user.displayName',
          totalSpent: 1,
          totalPurchases: 1
        }
      }
    ]);

    const topSellers = await BlurTransaction.aggregate([
      {
        $group: {
          _id: '$imageOwner',
          totalEarned: { $sum: '$ownerShare' },
          totalSales: { $sum: 1 }
        }
      },
      { $sort: { totalEarned: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          username: '$user.username',
          displayName: '$user.displayName',
          totalEarned: 1,
          totalSales: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalTransactions: 0,
          totalRevenue: 0,
          totalCoinsCirculated: 0,
          averageTransaction: 0
        },
        topBuyers,
        topSellers
      }
    });

  } catch (error) {
    console.error('Error fetching blur stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

// POST /api/blur/pay - จ่ายเหรียญเพื่อดูรูปเบลอ (สำหรับการ์ดโปรไฟล์)
router.post('/pay', authenticateToken, async (req, res) => {
  try {
    const { targetUserId, imageId, amount } = req.body;
    const payerId = req.user.id;

    console.log('💰 Blur payment request:', {
      payerId,
      targetUserId,
      imageId,
      amount,
      timestamp: new Date().toISOString(),
      targetUserIdType: typeof targetUserId,
      targetUserIdLength: targetUserId ? targetUserId.length : 0,
      fullRequestBody: req.body
    });

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!targetUserId || !imageId || !amount) {
      console.log('❌ Missing required data:', { targetUserId, imageId, amount });
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ targetUserId, imageId, และ amount)'
      });
    }
    
    // ตรวจสอบรูปแบบข้อมูล
    if (typeof targetUserId !== 'string' || targetUserId.trim() === '') {
      console.log('❌ Invalid targetUserId format:', { targetUserId, type: typeof targetUserId });
      return res.status(400).json({
        success: false,
        message: 'รูปแบบ ID ของผู้ใช้ไม่ถูกต้อง'
      });
    }
    
    if (typeof imageId !== 'string' || imageId.trim() === '') {
      console.log('❌ Invalid imageId format:', { imageId, type: typeof imageId });
      return res.status(400).json({
        success: false,
        message: 'รูปแบบ ID ของรูปภาพไม่ถูกต้อง'
      });
    }
    
    console.log('✅ Data validation passed');

    // ตรวจสอบจำนวนเหรียญ
    if (amount !== 10000) {
      console.log('❌ Invalid amount:', { amount, expected: 10000 });
      return res.status(400).json({
        success: false,
        message: 'จำนวนเหรียญไม่ถูกต้อง ต้องเป็น 10,000 เหรียญ'
      });
    }
    console.log('✅ Amount validation passed');

    // ตรวจสอบว่าไม่ใช่การจ่ายให้ตัวเอง
    if (payerId === targetUserId) {
      console.log('❌ Self payment attempt:', { payerId, targetUserId });
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถจ่ายเหรียญให้ตัวเองได้'
      });
    }
    console.log('✅ Self payment check passed');

    // ดึงข้อมูลผู้จ่าย
    const payer = await User.findById(payerId);
    if (!payer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    console.log('💰 Checking payer coins:', {
      payerId,
      payerCoins: payer.coins,
      requiredAmount: amount,
      hasEnoughCoins: (payer.coins || 0) >= amount
    });

    // ตรวจสอบยอดเหรียญ
    if ((payer.coins || 0) < amount) {
      console.log('❌ Insufficient coins:', {
        currentCoins: payer.coins || 0,
        required: amount,
        difference: amount - (payer.coins || 0)
      });
      
      return res.status(400).json({
        success: false,
        message: 'เหรียญไม่เพียงพอ',
        data: {
          currentCoins: payer.coins || 0,
          required: amount
        }
      });
    }

    // ตรวจสอบ ObjectId format
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      console.log('❌ Invalid targetUserId format:', { targetUserId, type: typeof targetUserId });
      return res.status(400).json({
        success: false,
        message: 'รูปแบบ ID ของผู้ใช้ไม่ถูกต้อง'
      });
    }

    // ดึงข้อมูลผู้รับ
    const target = await User.findById(targetUserId);
    if (!target) {
      console.log('❌ Target user not found:', { targetUserId });
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้ที่ต้องการจ่าย'
      });
    }
    
    console.log('✅ Target user found:', {
      id: target._id,
      username: target.username,
      profileImagesCount: target.profileImages ? target.profileImages.length : 0
    });

    // ตรวจสอบว่ารูปนี้มีอยู่จริงและเป็นรูปเบลอ
    let targetImage;
    
    console.log('🔍 Searching for target image:', {
      imageId,
      imageIdType: typeof imageId,
      profileImagesCount: target.profileImages.length,
      profileImages: target.profileImages.map((img, index) => ({
        index,
        type: typeof img,
        hasId: typeof img === 'object' ? !!img._id : false,
        id: typeof img === 'object' ? img._id?.toString() : 'N/A',
        isBlurred: typeof img === 'object' ? img.isBlurred : false,
        url: typeof img === 'object' ? img.url : img
      }))
    });
    
    if (imageId === 'individual_image_purchase') {
      // สำหรับการซื้อรูปเฉพาะ (legacy support) ให้ใช้รูปแรกที่เบลอ
      targetImage = target.profileImages.find(img => 
        typeof img === 'object' && img.isBlurred
      );
      
      console.log('🔍 Debug targetImage search (legacy):', {
        profileImagesCount: target.profileImages.length,
        profileImages: target.profileImages.map((img, index) => ({
          index,
          type: typeof img,
          isBlurred: typeof img === 'object' ? img.isBlurred : false,
          hasId: typeof img === 'object' ? !!img._id : false
        })),
        foundTargetImage: !!targetImage
      });
      
      if (!targetImage) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบรูปเบลอในโปรไฟล์นี้'
        });
      }
      
      // สร้าง _id ถ้าไม่มี
      if (!targetImage._id) {
        targetImage._id = new mongoose.Types.ObjectId();
      }
    } else {
      // สำหรับการซื้อรูปเฉพาะ - ค้นหารูปด้วย imageId ที่แท้จริง
      targetImage = target.profileImages.find(
        img => typeof img === 'object' && img._id && img._id.toString() === imageId && img.isBlurred
      );
      
      // ถ้าไม่พบด้วย _id ให้ลองหาโดยใช้ index (สำหรับ image_${index} format)
      if (!targetImage && imageId.startsWith('image_')) {
        const imageIndex = parseInt(imageId.replace('image_', ''));
        if (!isNaN(imageIndex) && target.profileImages[imageIndex]) {
          const indexedImage = target.profileImages[imageIndex];
          if (typeof indexedImage === 'object' && indexedImage.isBlurred) {
            targetImage = indexedImage;
            // สร้าง _id ถ้าไม่มี
            if (!targetImage._id) {
              targetImage._id = new mongoose.Types.ObjectId();
            }
          }
        }
      }
      
      if (!targetImage) {
        console.log('❌ Target image not found:', {
          imageId,
          profileImagesCount: target.profileImages.length,
          profileImages: target.profileImages.map((img, index) => ({
            index,
            type: typeof img,
            hasId: typeof img === 'object' ? !!img._id : false,
            id: typeof img === 'object' ? img._id?.toString() : 'N/A',
            isBlurred: typeof img === 'object' ? img.isBlurred : false
          }))
        });
        return res.status(404).json({
          success: false,
          message: 'ไม่พบรูปเบลอที่ต้องการซื้อ'
        });
      }
    }

    // ตรวจสอบว่าซื้อรูปนี้แล้วหรือยัง
    let existingTransaction;
    
    if (imageId === 'individual_image_purchase') {
      // สำหรับการซื้อรูปเฉพาะ (legacy) ให้ตรวจสอบว่าซื้อรูปนี้แล้วหรือยัง
      existingTransaction = await BlurTransaction.findOne({
        buyer: payerId,
        imageOwner: targetUserId,
        imageId: targetImage._id ? targetImage._id.toString() : null,
        status: 'completed'
      });
    } else {
      // สำหรับการซื้อรูปเฉพาะ - ตรวจสอบด้วย imageId ที่แท้จริง
      existingTransaction = await BlurTransaction.findOne({
        buyer: payerId,
        imageOwner: targetUserId,
        imageId: imageId,
        status: 'completed'
      });
    }
    
    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: 'คุณได้ซื้อรูปนี้แล้ว'
      });
    }

    // ดึงข้อมูล admin - ลองหาหลายแบบ
    let admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      // ถ้าไม่พบ admin ให้ลองหา admin อื่น ๆ
      admin = await User.findOne({ 
        $or: [
          { username: 'admin' },
          { email: { $regex: /admin/i } },
          { isAdmin: true }
        ]
      });
      console.log('👑 Admin search fallback:', {
        adminFound: !!admin,
        criteria: 'username/email/isAdmin'
      });
    }
    
    if (!admin) {
      // ถ้ายังไม่พบ ให้สร้าง default admin account
      console.log('🔧 Creating default admin account...');
      admin = new User({
        username: 'system_admin',
        email: 'admin@system.local',
        role: 'admin',
        coins: 0,
        firstName: 'System',
        lastName: 'Admin',
        password: 'temp_password_' + Date.now() // temporary password
      });
      await admin.save();
      console.log('✅ Created default admin:', admin._id);
    }
    
    console.log('👑 Final admin user:', {
      adminFound: !!admin,
      adminId: admin?._id,
      adminCoins: admin?.coins,
      adminRole: admin?.role
    });

    // คำนวณการแบ่งเหรียญ
    const targetShare = 5000; // 50% ไปให้เจ้าของโปรไฟล์
    const adminShare = 5000;  // 50% ไปให้ admin

    console.log('💰 Payment calculation:', {
      totalAmount: amount,
      targetShare,
      adminShare,
      payerCurrentCoins: payer.coins,
      targetCurrentCoins: target.coins,
      adminCurrentCoins: admin.coins
    });

    // อัพเดทข้อมูลผู้จ่าย
    const updatedPayer = await User.findByIdAndUpdate(
      payerId,
      {
        $inc: { coins: -amount }
      },
      { new: true }
    );

    // อัพเดทข้อมูลผู้รับ
    const updatedTarget = await User.findByIdAndUpdate(
      targetUserId,
      {
        $inc: { coins: targetShare }
      },
      { new: true }
    );

    // อัพเดทข้อมูล admin
    const updatedAdmin = await User.findByIdAndUpdate(
      admin._id,
      {
        $inc: { coins: adminShare }
      },
      { new: true }
    );

    console.log('💰 Coin updates completed:', {
      payer: {
        id: payerId,
        coinsBefore: payer.coins,
        coinsAfter: updatedPayer.coins,
        difference: updatedPayer.coins - payer.coins
      },
      target: {
        id: targetUserId,
        coinsBefore: target.coins,
        coinsAfter: updatedTarget.coins,
        difference: updatedTarget.coins - target.coins
      },
      admin: {
        id: admin._id,
        coinsBefore: admin.coins,
        coinsAfter: updatedAdmin.coins,
        difference: updatedAdmin.coins - admin.coins
      }
    });

    console.log('✅ Payment completed successfully:', {
      payerId,
      targetUserId,
      imageId,
      amount,
      targetShare,
      adminShare,
      payerRemainingCoins: updatedPayer.coins
    });

    // บันทึกประวัติการทำธุรกรรม
    try {
      const transaction = new BlurTransaction({
        buyer: payerId,
        imageOwner: targetUserId,
        imageId: imageId, // ใช้ imageId ที่ส่งมาจาก frontend
        imageUrl: targetImage.url, // ใช้ URL ของรูปจริง
        cost: amount,
        ownerShare: targetShare,
        systemShare: adminShare,
        status: 'completed',
        metadata: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          type: imageId === 'individual_image_purchase' ? 'legacy_purchase' : 'specific_image_purchase' // ระบุประเภทการซื้อ
        }
      });
      
      await transaction.save();
      console.log('📝 Transaction record saved:', transaction._id);
    } catch (transactionError) {
      console.error('❌ Failed to save transaction record:', transactionError);
      console.error('❌ Transaction error details:', transactionError.message);
      // ไม่ return error เพื่อไม่ให้กระทบกับการทำธุรกรรมหลัก
    }

    res.json({
      success: true,
      message: 'ซื้อรูปสำเร็จ',
      data: {
        remainingCoins: updatedPayer.coins,
        paidAmount: amount,
        targetUserId: targetUserId,
        targetUserName: target.firstName || target.username || 'ไม่ระบุชื่อ',
        imageId: imageId,
        imageUrl: targetImage.url,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in blur payment:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      error: error.message
    });
  }
});

// GET /api/blur/purchases - ดูรายการที่จ่ายแล้ว
router.get('/purchases', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate('blurImagePurchases', 'firstName lastName username profileImages')
      .select('blurImagePurchases');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    res.json({
      success: true,
      data: {
        purchases: user.blurImagePurchases || []
      }
    });

  } catch (error) {
    console.error('❌ Error getting blur purchases:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      error: error.message
    });
  }
});

module.exports = router;
