const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Gift = require('../models/Gift');
const GiftTransaction = require('../models/GiftTransaction');
const User = require('../models/User');

// GET /api/gift/shop - ดูร้านของขวัญ
router.get('/shop', async (req, res) => {
  try {
    const { category, rarity, sortBy = 'value', page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = { isActive: true };
    
    if (category) {
      query.category = category;
    }
    
    if (rarity) {
      query.rarity = rarity;
    }

    // เช็คของขวัญที่มี limited time
    const now = new Date();
    query.$or = [
      { availableUntil: null },
      { availableUntil: { $gte: now } }
    ];
    query.availableFrom = { $lte: now };

    let sortOptions = {};
    switch (sortBy) {
      case 'price_low':
        sortOptions = { 'price.coins': 1 };
        break;
      case 'price_high':
        sortOptions = { 'price.coins': -1 };
        break;
      case 'popular':
        sortOptions = { 'stats.totalSent': -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      default:
        sortOptions = { value: -1 };
    }

    const [gifts, total, categories] = await Promise.all([
      Gift.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Gift.countDocuments(query),
      Gift.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        gifts: gifts.map(gift => ({
          id: gift._id,
          name: gift.name,
          description: gift.description,
          icon: gift.icon,
          animation: gift.animation,
          price: gift.price,
          value: gift.value,
          category: gift.category,
          rarity: gift.rarity,
          isLimited: gift.isLimited,
          limitedQuantity: gift.limitedQuantity,
          availableUntil: gift.availableUntil,
          stats: gift.stats
        })),
        categories: categories.map(cat => ({
          name: cat._id,
          count: cat.count
        })),
        pagination: {
          current: pageNum,
          total: Math.ceil(total / limitNum),
          totalItems: total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching gift shop:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gift shop',
      error: error.message
    });
  }
});

// POST /api/gift/send - ส่งของขวัญ
router.post('/send', async (req, res) => {
  try {
    const { 
      senderId, 
      receiverId, 
      giftId, 
      quantity = 1, 
      message,
      context 
    } = req.body;

    if (!senderId || !receiverId || !giftId) {
      return res.status(400).json({
        success: false,
        message: 'Sender ID, Receiver ID, and Gift ID are required'
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const [sender, receiver, gift] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId),
      Gift.findById(giftId)
    ]);

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    if (!gift || !gift.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Gift not found or not available'
      });
    }

    // ตรวจสอบว่าไม่ใช่คนเดียวกัน
    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send gift to yourself'
      });
    }

    // ตรวจสอบเวลา
    const now = new Date();
    if (gift.availableFrom > now || (gift.availableUntil && gift.availableUntil < now)) {
      return res.status(400).json({
        success: false,
        message: 'Gift is not currently available'
      });
    }

    // คำนวณราคารวม
    const totalCost = {
      coins: gift.price.coins * quantity,
      money: gift.price.money * quantity,
      votePoints: gift.price.votePoints * quantity
    };

    const totalValue = gift.value * quantity;

    // ตรวจสอบยอดเงิน/เหรียญ/คะแนน
    if (totalCost.coins > 0 && sender.coins < totalCost.coins) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins',
        required: totalCost.coins,
        current: sender.coins
      });
    }

    if (totalCost.votePoints > 0 && sender.votePoints < totalCost.votePoints) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient vote points',
        required: totalCost.votePoints,
        current: sender.votePoints
      });
    }

    // หักเงิน/เหรียญ/คะแนน
    if (totalCost.coins > 0) {
      sender.coins -= totalCost.coins;
    }
    
    if (totalCost.votePoints > 0) {
      sender.votePoints -= totalCost.votePoints;
    }

    // สร้างธุรกรรม
    const transaction = new GiftTransaction({
      sender: senderId,
      receiver: receiverId,
      gift: giftId,
      quantity,
      totalCost,
      totalValue,
      message: message?.trim(),
      context: {
        type: context?.type || 'profile',
        contextId: context?.contextId || null
      },
      status: 'completed'
    });

    // อัปเดตสถิติ
    gift.stats.totalSent += quantity;
    gift.stats.totalValue += totalValue;

    // บันทึกทุกอย่าง
    await Promise.all([
      sender.save(),
      transaction.save(),
      gift.save()
    ]);

    // ส่งกลับข้อมูล
    res.json({
      success: true,
      message: `Successfully sent ${quantity}x ${gift.name} to ${receiver.displayName}`,
      data: {
        transaction: {
          id: transaction._id,
          gift: {
            name: gift.name,
            icon: gift.icon,
            animation: gift.animation
          },
          quantity,
          totalCost,
          totalValue,
          message: transaction.message
        },
        sender: {
          remainingCoins: sender.coins,
          remainingVotePoints: sender.votePoints
        },
        receiver: {
          username: receiver.username,
          displayName: receiver.displayName
        }
      }
    });

  } catch (error) {
    console.error('Error sending gift:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send gift',
      error: error.message
    });
  }
});

// GET /api/gift/received/:userId - ดูของขวัญที่ได้รับ
router.get('/received/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, groupBy = 'none' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let pipeline = [
      { $match: { receiver: mongoose.Types.ObjectId(userId), status: 'completed' } },
      { $sort: { sentAt: -1 } }
    ];

    if (groupBy === 'gift') {
      // จัดกลุ่มตามประเภทของขวัญ
      pipeline = [
        { $match: { receiver: mongoose.Types.ObjectId(userId), status: 'completed' } },
        {
          $group: {
            _id: '$gift',
            totalQuantity: { $sum: '$quantity' },
            totalValue: { $sum: '$totalValue' },
            lastReceived: { $max: '$sentAt' },
            senders: { $addToSet: '$sender' }
          }
        },
        { $sort: { totalValue: -1 } },
        {
          $lookup: {
            from: 'gifts',
            localField: '_id',
            foreignField: '_id',
            as: 'giftInfo'
          }
        },
        { $unwind: '$giftInfo' },
        {
          $lookup: {
            from: 'users',
            localField: 'senders',
            foreignField: '_id',
            as: 'senderInfo'
          }
        }
      ];
    } else {
      // รายการธุรกรรมปกติ
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limitNum });
      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'senderInfo'
        }
      });
      pipeline.push({ $unwind: '$senderInfo' });
      pipeline.push({
        $lookup: {
          from: 'gifts',
          localField: 'gift',
          foreignField: '_id',
          as: 'giftInfo'
        }
      });
      pipeline.push({ $unwind: '$giftInfo' });
    }

    const [results, totalStats] = await Promise.all([
      GiftTransaction.aggregate(pipeline),
      GiftTransaction.aggregate([
        { $match: { receiver: mongoose.Types.ObjectId(userId), status: 'completed' } },
        {
          $group: {
            _id: null,
            totalGifts: { $sum: '$quantity' },
            totalValue: { $sum: '$totalValue' },
            uniqueGifts: { $addToSet: '$gift' },
            uniqueSenders: { $addToSet: '$sender' }
          }
        }
      ])
    ]);

    // คำนวณ "ความฮอต" จากมูลค่าของขวัญ
    const stats = totalStats[0] || {
      totalGifts: 0,
      totalValue: 0,
      uniqueGifts: [],
      uniqueSenders: []
    };

    const hotness = Math.min(Math.floor(stats.totalValue / 1000), 100); // คะแนนความฮอต 0-100

    res.json({
      success: true,
      data: {
        gifts: results.map(item => {
          if (groupBy === 'gift') {
            return {
              gift: {
                id: item.giftInfo._id,
                name: item.giftInfo.name,
                icon: item.giftInfo.icon,
                animation: item.giftInfo.animation,
                category: item.giftInfo.category,
                rarity: item.giftInfo.rarity
              },
              totalQuantity: item.totalQuantity,
              totalValue: item.totalValue,
              lastReceived: item.lastReceived,
              senderCount: item.senders.length,
              senders: item.senderInfo.map(s => ({
                id: s._id,
                username: s.username,
                displayName: s.displayName
              }))
            };
          } else {
            return {
              id: item._id,
              sender: {
                id: item.senderInfo._id,
                username: item.senderInfo.username,
                displayName: item.senderInfo.displayName,
                membershipTier: item.senderInfo.membershipTier
              },
              gift: {
                id: item.giftInfo._id,
                name: item.giftInfo.name,
                icon: item.giftInfo.icon,
                animation: item.giftInfo.animation,
                category: item.giftInfo.category,
                rarity: item.giftInfo.rarity
              },
              quantity: item.quantity,
              totalValue: item.totalValue,
              message: item.message,
              sentAt: item.sentAt
            };
          }
        }),
        stats: {
          totalGifts: stats.totalGifts,
          totalValue: stats.totalValue,
          uniqueGifts: stats.uniqueGifts.length,
          uniqueSenders: stats.uniqueSenders.length,
          hotness: hotness,
          hotnessLevel: hotness >= 80 ? 'legendary' : 
                       hotness >= 60 ? 'epic' : 
                       hotness >= 40 ? 'rare' : 'common'
        },
        pagination: groupBy === 'none' ? {
          current: pageNum,
          total: Math.ceil(stats.totalGifts / limitNum),
          totalItems: stats.totalGifts
        } : null
      }
    });

  } catch (error) {
    console.error('Error fetching received gifts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch received gifts',
      error: error.message
    });
  }
});

// GET /api/gift/sent/:userId - ดูของขวัญที่ส่ง
router.get('/sent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total, stats] = await Promise.all([
      GiftTransaction.find({ sender: userId, status: 'completed' })
        .populate('receiver', 'username displayName membershipTier')
        .populate('gift', 'name icon animation category rarity')
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limitNum),
      GiftTransaction.countDocuments({ sender: userId, status: 'completed' }),
      GiftTransaction.aggregate([
        { $match: { sender: mongoose.Types.ObjectId(userId), status: 'completed' } },
        {
          $group: {
            _id: null,
            totalGifts: { $sum: '$quantity' },
            totalSpent: { $sum: '$totalCost.coins' },
            totalVotePointsSpent: { $sum: '$totalCost.votePoints' },
            uniqueReceivers: { $addToSet: '$receiver' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          id: t._id,
          receiver: {
            id: t.receiver._id,
            username: t.receiver.username,
            displayName: t.receiver.displayName,
            membershipTier: t.receiver.membershipTier
          },
          gift: {
            id: t.gift._id,
            name: t.gift.name,
            icon: t.gift.icon,
            animation: t.gift.animation,
            category: t.gift.category,
            rarity: t.gift.rarity
          },
          quantity: t.quantity,
          totalCost: t.totalCost,
          totalValue: t.totalValue,
          message: t.message,
          sentAt: t.sentAt
        })),
        stats: stats[0] || {
          totalGifts: 0,
          totalSpent: 0,
          totalVotePointsSpent: 0,
          uniqueReceivers: []
        },
        pagination: {
          current: pageNum,
          total: Math.ceil(total / limitNum),
          totalItems: total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching sent gifts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sent gifts',
      error: error.message
    });
  }
});

// GET /api/gift/ranking - ดูอันดับผู้ได้รับของขวัญ
router.get('/ranking', async (req, res) => {
  try {
    const { type = 'all', gender, limit = 50 } = req.query;
    const limitNum = parseInt(limit);

    let matchStage = { status: 'completed' };
    
    // กรองตามช่วงเวลา
    const now = new Date();
    if (type === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchStage.sentAt = { $gte: weekAgo };
    } else if (type === 'monthly') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchStage.sentAt = { $gte: monthAgo };
    }

    let pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$receiver',
          totalValue: { $sum: '$totalValue' },
          totalGifts: { $sum: '$quantity' },
          uniqueGifts: { $addToSet: '$gift' },
          uniqueSenders: { $addToSet: '$sender' }
        }
      },
      { $sort: { totalValue: -1 } },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ];

    // กรองตามเพศ
    if (gender) {
      pipeline.push({
        $match: { 'user.gender': gender }
      });
    }

    const ranking = await GiftTransaction.aggregate(pipeline);

    res.json({
      success: true,
      data: {
        ranking: ranking.map((item, index) => ({
          rank: index + 1,
          user: {
            id: item.user._id,
            username: item.user.username,
            displayName: item.user.displayName,
            gender: item.user.gender,
            membershipTier: item.user.membershipTier,
            verificationBadge: item.user.verificationBadge
          },
          stats: {
            totalValue: item.totalValue,
            totalGifts: item.totalGifts,
            uniqueGifts: item.uniqueGifts.length,
            uniqueSenders: item.uniqueSenders.length,
            hotness: Math.min(Math.floor(item.totalValue / 1000), 100)
          }
        })),
        metadata: {
          type,
          gender: gender || 'all',
          totalRanked: ranking.length,
          generatedAt: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Error fetching gift ranking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gift ranking',
      error: error.message
    });
  }
});

module.exports = router;
