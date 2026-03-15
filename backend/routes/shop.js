const express = require('express');
const router = express.Router();
const CoinPackage = require('../models/CoinPackage');
const User = require('../models/User');
const VoteTransaction = require('../models/VoteTransaction');

async function ensureMiniStarterPack() {
  try {
    await CoinPackage.updateOne(
      { name: 'Mini Starter Pack' },
      {
        $set: {
          description: '1,000 เหรียญ + 100 คะแนนโหวต',
          price: 1,
          currency: 'THB',
          isActive: true,
          order: 0,
          isPopular: false,
          isBestValue: false,
          'rewards.coins': 1000,
          'rewards.votePoints': 100,
          'rewards.bonusPercentage': 0
        },
        $setOnInsert: {
          'stats.totalPurchases': 0,
          'stats.totalRevenue': 0
        }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error ensuring Mini Starter Pack:', error);
  }
}

// GET /api/shop/packages - ดูแพ็กเกจเหรียญ
router.get('/packages', async (req, res) => {
  try {
    await ensureMiniStarterPack();

    const packages = await CoinPackage.find({
      isActive: true,
      name: { $ne: 'Test Package' } // กรอง Test Package ออก
    })
      .sort({ order: 1, price: 1 });

    res.json({
      success: true,
      data: {
        packages: packages.map(pkg => ({
          id: pkg._id,
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          currency: pkg.currency,
          rewards: {
            coins: pkg.rewards.coins,
            votePoints: pkg.rewards.votePoints,
            bonusPercentage: pkg.rewards.bonusPercentage,
            bonusCoins: pkg.bonusCoins,
            totalCoins: pkg.totalCoins
          },
          badges: {
            isPopular: pkg.isPopular,
            isBestValue: pkg.isBestValue
          },
          stats: pkg.stats
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching coin packages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coin packages',
      error: error.message
    });
  }
});

// POST /api/shop/purchase - ซื้อแพ็กเกจเหรียญ
router.post('/purchase', async (req, res) => {
  try {
    const { userId, packageId, paymentMethod = 'credit_card' } = req.body;

    if (!userId || !packageId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Package ID are required'
      });
    }

    const [user, coinPackage] = await Promise.all([
      User.findById(userId),
      CoinPackage.findById(packageId)
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!coinPackage || !coinPackage.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Package not found or not available'
      });
    }

    // คำนวณโบนัสตามจำนวนเงิน
    let extraBonus = 0;
    if (coinPackage.price >= 1000) {
      extraBonus = 0.30; // 30%
    } else if (coinPackage.price >= 500) {
      extraBonus = 0.20; // 20%
    } else if (coinPackage.price >= 300) {
      extraBonus = 0.10; // 10%
    } else if (coinPackage.price >= 150) {
      extraBonus = 0.05; // 5%
    }

    // คำนวณเหรียญที่ได้รับ
    const baseCoins = coinPackage.rewards.coins;
    const packageBonus = Math.floor(baseCoins * (coinPackage.rewards.bonusPercentage / 100));
    const extraBonusCoins = Math.floor(baseCoins * extraBonus);
    const totalCoins = baseCoins + packageBonus + extraBonusCoins;
    const totalVotePoints = coinPackage.rewards.votePoints;

    // เพิ่มเหรียญและคะแนนโหวต
    user.coins += totalCoins;
    user.votePoints += totalVotePoints;

    // บันทึกประวัติการชำระเงิน
    if (!Array.isArray(user.paymentHistory)) {
      user.paymentHistory = [];
    }
    user.paymentHistory.push({
      tier: 'coin_package',
      amount: coinPackage.price,
      currency: coinPackage.currency,
      paymentMethod,
      transactionId: `coin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed',
      purchaseDate: new Date(),
      expiryDate: null // เหรียญไม่หมดอายุ
    });

    // อัปเดตสถิติแพ็กเกจ
    coinPackage.stats.totalPurchases += 1;
    coinPackage.stats.totalRevenue += coinPackage.price;

    const operations = [
      user.save(),
      coinPackage.save()
    ];

    if (totalVotePoints > 0) {
      operations.push(VoteTransaction.create({
        voter: user._id,
        candidate: user._id,
        votePoints: totalVotePoints,
        voteType: 'popularity_combined',
        message: `Purchased via coin package: ${coinPackage.name}`,
        status: 'active',
        context: { type: 'ranking', contextId: coinPackage._id.toString() },
        votedAt: new Date()
      }));
    }

    await Promise.all(operations);

    res.json({
      success: true,
      message: `Successfully purchased ${coinPackage.name}`,
      data: {
        package: {
          name: coinPackage.name,
          price: coinPackage.price,
          currency: coinPackage.currency
        },
        rewards: {
          baseCoins,
          packageBonus,
          extraBonusCoins,
          totalCoins,
          votePoints: totalVotePoints,
          bonusDetails: {
            packageBonusPercentage: coinPackage.rewards.bonusPercentage,
            extraBonusPercentage: Math.round(extraBonus * 100),
            totalBonusPercentage: coinPackage.rewards.bonusPercentage + Math.round(extraBonus * 100)
          }
        },
        user: {
          totalCoins: user.coins,
          totalVotePoints: user.votePoints
        },
        transaction: {
          id: user.paymentHistory[user.paymentHistory.length - 1]?.transactionId,
          paymentMethod,
          purchaseDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Error purchasing coin package:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase package',
      error: error.message
    });
  }
});

// GET /api/shop/purchase-history/:userId - ดูประวัติการซื้อ
router.get('/purchase-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const user = await User.findById(userId).select('paymentHistory');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // กรองเฉพาะการซื้อแพ็กเกจเหรียญ
    const paymentHistory = Array.isArray(user.paymentHistory) ? user.paymentHistory : [];
    const coinPurchases = paymentHistory.filter(
      payment => payment.tier === 'coin_package'
    );

    // จัดเรียงและแบ่งหน้า
    const sortedPurchases = coinPurchases
      .sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))
      .slice((pageNum - 1) * limitNum, pageNum * limitNum);

    // คำนวณสถิติ
    const stats = coinPurchases.reduce((acc, purchase) => {
      if (purchase.status === 'completed') {
        acc.totalSpent += purchase.amount;
        acc.totalPurchases += 1;
      }
      return acc;
    }, { totalSpent: 0, totalPurchases: 0 });

    res.json({
      success: true,
      data: {
        purchases: sortedPurchases.map(purchase => ({
          id: purchase.transactionId,
          amount: purchase.amount,
          currency: purchase.currency,
          paymentMethod: purchase.paymentMethod,
          status: purchase.status,
          purchaseDate: purchase.purchaseDate
        })),
        stats,
        pagination: {
          current: pageNum,
          total: Math.ceil(coinPurchases.length / limitNum),
          totalItems: coinPurchases.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching purchase history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase history',
      error: error.message
    });
  }
});

// GET /api/shop/stats - สถิติร้านค้า
router.get('/stats', async (req, res) => {
  try {
    const [packageStats, userStats] = await Promise.all([
      CoinPackage.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalPackages: { $sum: 1 },
            totalRevenue: { $sum: '$stats.totalRevenue' },
            totalPurchases: { $sum: '$stats.totalPurchases' },
            averagePackagePrice: { $avg: '$price' }
          }
        }
      ]),
      User.aggregate([
        { $unwind: '$paymentHistory' },
        { $match: { 'paymentHistory.tier': 'coin_package', 'paymentHistory.status': 'completed' } },
        {
          $group: {
            _id: null,
            uniqueBuyers: { $addToSet: '$_id' },
            totalTransactions: { $sum: 1 },
            totalRevenue: { $sum: '$paymentHistory.amount' },
            averageTransaction: { $avg: '$paymentHistory.amount' }
          }
        }
      ])
    ]);

    const topPackages = await CoinPackage.find({ isActive: true })
      .sort({ 'stats.totalPurchases': -1 })
      .limit(5)
      .select('name stats price');

    res.json({
      success: true,
      data: {
        overview: {
          totalPackages: packageStats[0]?.totalPackages || 0,
          totalRevenue: userStats[0]?.totalRevenue || 0,
          totalPurchases: userStats[0]?.totalTransactions || 0,
          uniqueBuyers: userStats[0]?.uniqueBuyers?.length || 0,
          averageTransaction: userStats[0]?.averageTransaction || 0
        },
        topPackages: topPackages.map(pkg => ({
          name: pkg.name,
          price: pkg.price,
          purchases: pkg.stats.totalPurchases,
          revenue: pkg.stats.totalRevenue
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching shop stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shop stats',
      error: error.message
    });
  }
});

module.exports = router;
