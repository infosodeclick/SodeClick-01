const express = require('express');
const router = express.Router();
const User = require('../models/User');
const VoteTransaction = require('../models/VoteTransaction');
const AdminActionLog = require('../models/AdminActionLog');
const { requireSuperAdmin } = require('../middleware/adminAuth');

// POST /api/superadmin/vote - SuperAdmin โหวตให้ใครก็ได้ไม่จำกัด
router.post('/vote', requireSuperAdmin, async (req, res) => {
  try {
    const { targetUserId, voteType, points = 1 } = req.body;
    const adminId = req.user.id;

    if (!targetUserId || !voteType) {
      return res.status(400).json({
        success: false,
        message: 'Target User ID and Vote Type are required'
      });
    }

    // ตรวจสอบประเภทการโหวต
    const validVoteTypes = ['popularity_male', 'popularity_female', 'popularity_combined', 'gift_ranking'];
    if (!validVoteTypes.includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type',
        validTypes: validVoteTypes
      });
    }

    // ตรวจสอบผู้ใช้เป้าหมาย
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }

    // SuperAdmin ไม่ต้องใช้ votePoints
    // สร้างธุรกรรมการโหวต
    const voteTransaction = new VoteTransaction({
      voter: adminId,
      candidate: targetUserId,
      votePoints: points,
      voteType,
      context: {
        type: 'ranking',
        contextId: 'superadmin_vote'
      },
      status: 'active'
    });

    await voteTransaction.save();

    // อัปเดตสถิติผู้ใช้เป้าหมาย
    if (voteType === 'popularity_male' || voteType === 'popularity_female') {
      targetUser.voteStats = targetUser.voteStats || {};
      targetUser.voteStats[voteType] = (targetUser.voteStats[voteType] || 0) + points;
    } else if (voteType === 'gift_ranking') {
      targetUser.giftStats = targetUser.giftStats || {};
      targetUser.giftStats.totalVotes = (targetUser.giftStats.totalVotes || 0) + points;
    }

    await targetUser.save();

    // บันทึก log
    await AdminActionLog.createLog({
      adminId: adminId,
      actionType: 'superadmin_vote',
      description: `SuperAdmin โหวตให้ ${targetUser.displayName || targetUser.username} (${targetUser._id})`,
      targetUserId: targetUserId,
      metadata: {
        voteType,
        points,
        targetUsername: targetUser.username,
        targetDisplayName: targetUser.displayName
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: `SuperAdmin โหวตให้ ${targetUser.displayName || targetUser.username} สำเร็จ`,
      data: {
        targetUser: {
          id: targetUser._id,
          username: targetUser.username,
          displayName: targetUser.displayName
        },
        voteType,
        points,
        adminId
      }
    });

  } catch (error) {
    console.error('SuperAdmin vote error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการโหวต',
      error: error.message
    });
  }
});

// POST /api/superadmin/add-coins - SuperAdmin เพิ่มเหรียญให้ใครก็ได้ไม่จำกัด
router.post('/add-coins', requireSuperAdmin, async (req, res) => {
  try {
    const { targetUserId, amount, reason = 'SuperAdmin Grant' } = req.body;
    const adminId = req.user.id;

    if (!targetUserId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Target User ID and valid amount are required'
      });
    }

    // ตรวจสอบผู้ใช้เป้าหมาย
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }

    // เพิ่มเหรียญ
    const oldCoins = targetUser.coins;
    targetUser.coins += amount;
    await targetUser.save();

    // บันทึก log
    await AdminActionLog.createLog({
      adminId: adminId,
      actionType: 'superadmin_add_coins',
      description: `SuperAdmin เพิ่มเหรียญ ${amount} เหรียญให้ ${targetUser.displayName || targetUser.username} (${targetUser._id})`,
      targetUserId: targetUserId,
      metadata: {
        amount,
        oldCoins,
        newCoins: targetUser.coins,
        reason,
        targetUsername: targetUser.username,
        targetDisplayName: targetUser.displayName
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: `SuperAdmin เพิ่มเหรียญให้ ${targetUser.displayName || targetUser.username} สำเร็จ`,
      data: {
        targetUser: {
          id: targetUser._id,
          username: targetUser.username,
          displayName: targetUser.displayName
        },
        oldCoins,
        newCoins: targetUser.coins,
        amountAdded: amount,
        reason,
        adminId
      }
    });

  } catch (error) {
    console.error('SuperAdmin add coins error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มเหรียญ',
      error: error.message
    });
  }
});

// POST /api/superadmin/add-vote-points - SuperAdmin เพิ่มคะแนนโหวตให้ใครก็ได้ไม่จำกัด
router.post('/add-vote-points', requireSuperAdmin, async (req, res) => {
  try {
    const { targetUserId, amount, reason = 'SuperAdmin Grant' } = req.body;
    const adminId = req.user.id;

    if (!targetUserId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Target User ID and valid amount are required'
      });
    }

    // ตรวจสอบผู้ใช้เป้าหมาย
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }

    // เพิ่มคะแนนโหวต
    const oldVotePoints = targetUser.votePoints;
    targetUser.votePoints += amount;
    await targetUser.save();

    // บันทึก log
    await AdminActionLog.createLog({
      adminId: adminId,
      actionType: 'superadmin_add_vote_points',
      description: `SuperAdmin เพิ่มคะแนนโหวต ${amount} คะแนนให้ ${targetUser.displayName || targetUser.username} (${targetUser._id})`,
      targetUserId: targetUserId,
      metadata: {
        amount,
        oldVotePoints,
        newVotePoints: targetUser.votePoints,
        reason,
        targetUsername: targetUser.username,
        targetDisplayName: targetUser.displayName
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: `SuperAdmin เพิ่มคะแนนโหวตให้ ${targetUser.displayName || targetUser.username} สำเร็จ`,
      data: {
        targetUser: {
          id: targetUser._id,
          username: targetUser.username,
          displayName: targetUser.displayName
        },
        oldVotePoints,
        newVotePoints: targetUser.votePoints,
        amountAdded: amount,
        reason,
        adminId
      }
    });

  } catch (error) {
    console.error('SuperAdmin add vote points error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มคะแนนโหวต',
      error: error.message
    });
  }
});

// GET /api/superadmin/user-stats/:userId - ดูสถิติผู้ใช้
router.get('/user-stats/:userId', requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password -phoneVerificationCode -phoneVerificationExpires -coordinates');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ดึงสถิติการโหวต
    const voteStats = await VoteTransaction.aggregate([
      {
        $match: { target: user._id }
      },
      {
        $group: {
          _id: '$voteType',
          totalVotes: { $sum: '$points' },
          totalTransactions: { $sum: 1 }
        }
      }
    ]);

    // ดึงสถิติการได้รับของขวัญ
    const giftStats = await VoteTransaction.aggregate([
      {
        $match: { 
          target: user._id,
          voteType: 'gift_ranking'
        }
      },
      {
        $group: {
          _id: null,
          totalGiftVotes: { $sum: '$points' },
          totalGiftTransactions: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          membership: user.membership,
          coins: user.coins,
          votePoints: user.votePoints,
          isActive: user.isActive,
          isBanned: user.isBanned,
          createdAt: user.createdAt,
          lastActive: user.lastActive
        },
        voteStats,
        giftStats: giftStats[0] || { totalGiftVotes: 0, totalGiftTransactions: 0 }
      }
    });

  } catch (error) {
    console.error('SuperAdmin get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติผู้ใช้',
      error: error.message
    });
  }
});

// GET /api/superadmin/admin-actions - ดูประวัติการกระทำของ Admin/SuperAdmin
router.get('/admin-actions', requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, actionType, adminId } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    // Filter by admin (if specified, otherwise show all)
    if (adminId) {
      query.adminId = adminId;
    }
    
    // Filter by action type (if specified)
    if (actionType) {
      query.actionType = actionType;
    }

    // ดึงประวัติการกระทำทั้งหมด
    const actions = await AdminActionLog.find(query)
      .populate('adminId', 'username firstName lastName email role')
      .populate('targetUserId', 'username firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalActions = await AdminActionLog.countDocuments(query);

    res.json({
      success: true,
      data: {
        actions: actions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalActions,
          pages: Math.ceil(totalActions / limit)
        }
      }
    });

  } catch (error) {
    console.error('SuperAdmin get admin actions error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการกระทำ',
      error: error.message
    });
  }
});

module.exports = router;
