const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const VoteTransaction = require('../models/VoteTransaction');
const User = require('../models/User');

// Import socket.io instance
const { getSocketInstance } = require('../socket');

// POST /api/vote/cast - โหวตให้ผู้ใช้ (1 user 1 vote)
router.post('/cast', async (req, res) => {
  try {
    const { voterId, candidateId, voteType, message } = req.body;

    if (!voterId || !candidateId || !voteType) {
      return res.status(400).json({
        success: false,
        message: 'Voter ID, Candidate ID, and Vote Type are required'
      });
    }

    // ตรวจสอบว่าโหวตแล้วหรือยัง (1 user 1 vote)
    const existingVote = await VoteTransaction.findOne({
      voter: voterId,
      candidate: candidateId,
      voteType,
      status: 'active'
    });

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted for this user',
        canUnvote: true
      });
    }

    // ใช้คะแนนโหวตเป็น 1 คะแนนเสมอ
    const votePoints = 1;

    const validVoteTypes = ['popularity_male', 'popularity_female', 'popularity_combined', 'gift_ranking'];
    if (!validVoteTypes.includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type'
      });
    }

    const [voter, candidate] = await Promise.all([
      User.findById(voterId),
      User.findById(candidateId)
    ]);

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // ตรวจสอบว่าไม่ใช่คนเดียวกัน
    if (voterId === candidateId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot vote for yourself'
      });
    }

    // ระบบโหวตใหม่: โหวตได้ทุกคน ไม่จำกัดเพศ
    console.log('🗳️ Vote validation (no gender restriction):', {
      voteType,
      candidateGender: candidate.gender,
      candidateId: candidate._id,
      candidateName: candidate.displayName || candidate.username
    });

    // สำหรับระบบ heart vote ไม่ต้องหักคะแนน (ฟรี)
    // แต่ยังคงเก็บ votePoints ไว้เป็น 1 เพื่อการนับ

    // สร้างธุรกรรมโหวต
    const voteTransaction = new VoteTransaction({
      voter: voterId,
      candidate: candidateId,
      votePoints,
      voteType,
      message: message?.trim(),
      context: {
        type: 'ranking'
      },
      status: 'active'
    });

    // บันทึกธุรกรรมโหวต (ไม่ต้องบันทึก voter เพราะไม่ได้แก้ไข)
    await voteTransaction.save();

    // อัปเดต lastActive ของผู้โหวต
    await User.findByIdAndUpdate(voterId, {
      lastActive: new Date()
    });

    // ส่ง real-time update ผ่าน Socket.IO
    try {
      const io = getSocketInstance();
      if (io) {
        // คำนวณคะแนนโหวตใหม่
        const newVoteStats = await VoteTransaction.aggregate([
          {
            $match: {
              candidate: new mongoose.Types.ObjectId(candidateId),
              status: 'active'
            }
          },
          {
            $group: {
              _id: '$voteType',
              totalVotes: { $sum: '$votePoints' },
              uniqueVoters: { $addToSet: '$voter' }
            }
          }
        ]);

        const voteData = {};
        newVoteStats.forEach(stat => {
          voteData[stat._id] = {
            totalVotes: stat.totalVotes,
            uniqueVoters: stat.uniqueVoters.length
          };
        });

        // ส่ง event ไปยังทุก client
        io.emit('vote-updated', {
          candidateId,
          voteType,
          voteStats: voteData,
          action: 'cast',
          voter: {
            id: voterId,
            username: voter.username,
            displayName: voter.displayName
          },
          candidate: {
            id: candidateId,
            username: candidate.username,
            displayName: candidate.displayName
          }
        });

        // ส่ง notification ไปยังผู้ที่ถูกโหวต
        io.emit('vote-notification', {
          voterId,
          candidateId,
          voteType,
          action: 'cast'
        });

        console.log('📡 Sent vote-updated event:', {
          candidateId,
          voteType,
          voteStats: voteData
        });
      }
    } catch (socketError) {
      console.error('Error sending socket update:', socketError);
      // ไม่ให้ socket error รบกวนการตอบกลับ API
    }

    res.json({
      success: true,
      message: `Successfully voted ${votePoints} points for ${candidate.displayName}`,
      data: {
        transaction: {
          id: voteTransaction._id,
          votePoints,
          voteType,
          message: voteTransaction.message
        },
        voter: {
          remainingVotePoints: voter.votePoints
        },
        candidate: {
          username: candidate.username,
          displayName: candidate.displayName,
          gender: candidate.gender
        }
      }
    });

  } catch (error) {
    console.error('Error casting vote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cast vote',
      error: error.message
    });
  }
});

// POST /api/vote/uncast - ยกเลิกการโหวต
router.post('/uncast', async (req, res) => {
  try {
    const { voterId, candidateId, voteType } = req.body;

    if (!voterId || !candidateId || !voteType) {
      return res.status(400).json({
        success: false,
        message: 'Voter ID, Candidate ID, and Vote Type are required'
      });
    }

    // ค้นหาการโหวตที่มีอยู่
    const existingVote = await VoteTransaction.findOne({
      voter: voterId,
      candidate: candidateId,
      voteType,
      status: 'active'
    });

    if (!existingVote) {
      return res.status(404).json({
        success: false,
        message: 'No active vote found to remove'
      });
    }

    // เปลี่ยนสถานะเป็น expired แทนการลบ
    existingVote.status = 'expired';
    await existingVote.save();

    const candidate = await User.findById(candidateId);

    // ส่ง real-time update ผ่าน Socket.IO
    try {
      const io = getSocketInstance();
      if (io) {
        // คำนวณคะแนนโหวตใหม่
        const newVoteStats = await VoteTransaction.aggregate([
          {
            $match: {
              candidate: new mongoose.Types.ObjectId(candidateId),
              status: 'active'
            }
          },
          {
            $group: {
              _id: '$voteType',
              totalVotes: { $sum: '$votePoints' },
              uniqueVoters: { $addToSet: '$voter' }
            }
          }
        ]);

        const voteData = {};
        newVoteStats.forEach(stat => {
          voteData[stat._id] = {
            totalVotes: stat.totalVotes,
            uniqueVoters: stat.uniqueVoters.length
          };
        });

        // ส่ง event ไปยังทุก client
        io.emit('vote-updated', {
          candidateId,
          voteType,
          voteStats: voteData,
          action: 'uncast',
          voter: {
            id: voterId,
            username: existingVote.voter?.username || 'Unknown',
            displayName: existingVote.voter?.displayName || 'Unknown'
          },
          candidate: {
            id: candidateId,
            username: candidate.username,
            displayName: candidate.displayName
          }
        });

        // ส่ง notification ไปยังผู้ที่ถูกยกเลิกการโหวต
        io.emit('vote-notification', {
          voterId,
          candidateId,
          voteType,
          action: 'uncast'
        });

        console.log('📡 Sent vote-updated event (uncast):', {
          candidateId,
          voteType,
          voteStats: voteData
        });
      }
    } catch (socketError) {
      console.error('Error sending socket update:', socketError);
      // ไม่ให้ socket error รบกวนการตอบกลับ API
    }

    res.json({
      success: true,
      message: `Successfully removed vote for ${candidate.displayName}`,
      data: {
        removedVote: {
          id: existingVote._id,
          votePoints: existingVote.votePoints,
          voteType: existingVote.voteType
        },
        candidate: {
          username: candidate.username,
          displayName: candidate.displayName
        }
      }
    });

  } catch (error) {
    console.error('Error removing vote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove vote',
      error: error.message
    });
  }
});

// POST /api/vote/buy-points - ซื้อคะแนนโหวต
router.post('/buy-points', async (req, res) => {
  try {
    const { userId, packageType } = req.body;

    if (!userId || !packageType) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Package Type are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // แพ็กเกจคะแนนโหวต
    const votePackages = {
      'coins_100': { coins: 1000, votePoints: 100, name: '100 Vote Points' },
      'money_100': { money: 10, votePoints: 100, name: '100 Vote Points (Money)' }
    };

    const selectedPackage = votePackages[packageType];
    if (!selectedPackage) {
      return res.status(400).json({
        success: false,
        message: 'Invalid package type',
        availablePackages: Object.keys(votePackages)
      });
    }

    // ตรวจสอบยอดเงิน/เหรียญ
    if (selectedPackage.coins && user.coins < selectedPackage.coins) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins',
        required: selectedPackage.coins,
        current: user.coins
      });
    }

    // หักเงิน/เหรียญและเพิ่มคะแนนโหวต
    if (selectedPackage.coins) {
      user.coins -= selectedPackage.coins;
    }
    user.votePoints += selectedPackage.votePoints;

    await user.save();

    res.json({
      success: true,
      message: `Successfully purchased ${selectedPackage.votePoints} vote points`,
      data: {
        package: {
          name: selectedPackage.name,
          cost: selectedPackage.coins ? `${selectedPackage.coins} coins` : `${selectedPackage.money} THB`,
          votePoints: selectedPackage.votePoints
        },
        user: {
          remainingCoins: user.coins,
          totalVotePoints: user.votePoints
        }
      }
    });

  } catch (error) {
    console.error('Error buying vote points:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to buy vote points',
      error: error.message
    });
  }
});

// Clear-all endpoint removed for security

// Route เก่าถูกลบออกแล้ว - ใช้ route ใหม่ด้านล่างแทน

// GET /api/vote/status/:candidateId - ตรวจสอบสถานะการโหวตและคะแนน
router.get('/status/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { voterId, voteType = 'popularity_combined' } = req.query;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        message: 'Candidate ID is required'
      });
    }

    // ดึงข้อมูลผู้ใช้
    const candidate = await User.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // นับคะแนนโหวตทั้งหมดของผู้ใช้ - แก้ไขให้สอดคล้องกับ Ranking API
    const matchStage = {
      candidate: new mongoose.Types.ObjectId(candidateId),
      status: 'active'
    };

    // จัดการ voteType สำหรับ popularity_combined (เหมือนกับ Ranking API)
    if (voteType === 'popularity_combined') {
      matchStage.voteType = { $in: ['popularity_male', 'popularity_female', 'popularity_combined'] };
    } else {
      matchStage.voteType = voteType;
    }

    // คำนวณคะแนนแบบเดียวกับ Vote Ranking API - ใช้ votePoints และ filter user ที่มีอยู่ในระบบ
    const voteStats = await VoteTransaction.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: '$candidate',
          totalVotes: { $sum: '$votePoints' }, // ใช้ votePoints เหมือน Ranking API
          uniqueVoters: { $addToSet: '$voter' },
          voteTypes: { $addToSet: '$voteType' }
        }
      },
      {
        $match: {
          totalVotes: { $gte: 1 } // แสดงเฉพาะ user ที่มีคะแนนตั้งแต่ 1 คะแนนขึ้นไป (เหมือน Ranking API)
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo' // กรองเฉพาะ user ที่มีอยู่ในระบบ (เหมือน Ranking API)
      }
    ]);

    // แปลงข้อมูลให้อ่านง่าย - ใช้คะแนนรวมทั้งหมดเหมือน Vote Ranking API
    const voteData = {};
    if (voteStats.length > 0) {
      const stat = voteStats[0];
      voteData[voteType] = {
        totalVotes: stat.totalVotes,
        uniqueVoters: stat.uniqueVoters.length
      };
    } else {
      voteData[voteType] = {
        totalVotes: 0,
        uniqueVoters: 0
      };
    }

    // ตรวจสอบว่า voterId โหวตแล้วหรือยัง (ถ้ามี voterId) - แก้ไขให้สอดคล้องกับ voteType
    let hasVoted = false;
    if (voterId) {
      let voteQuery = {
        voter: voterId,
        candidate: candidateId,
        status: 'active'
      };

      // จัดการ voteType สำหรับ popularity_combined
      if (voteType === 'popularity_combined') {
        voteQuery.voteType = { $in: ['popularity_male', 'popularity_female', 'popularity_combined'] };
      } else {
        voteQuery.voteType = voteType;
      }

      const userVote = await VoteTransaction.findOne(voteQuery);
      hasVoted = !!userVote;
    }

    res.json({
      success: true,
      data: {
        candidate: {
          id: candidate._id,
          username: candidate.username,
          displayName: candidate.displayName,
          gender: candidate.gender
        },
        voteStats: voteData,
        hasVoted,
        requestedVoteType: voteType
      }
    });

  } catch (error) {
    console.error('Error getting vote status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vote status',
      error: error.message
    });
  }
});

// GET /api/vote/ranking - ดึงรายการคะแนนโหวตเรียงลำดับ
router.get('/ranking', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      voteType = 'popularity_combined',
      sortBy = 'totalVotes', // totalVotes หรือ uniqueVoters
      search = '' // ค้นหาด้วยชื่อหรือ email
    } = req.query;

    console.log('🔍 Vote ranking request:', { page, limit, voteType, sortBy, search });

    // ตรวจสอบ voteType
    if (!voteType) {
      return res.status(400).json({
        success: false,
        message: 'Vote type is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ดึงข้อมูลคะแนนโหวตเรียงลำดับ
    const matchStage = {
      status: 'active'
    };

    // จัดการ voteType สำหรับ popularity_combined
    if (voteType === 'popularity_combined') {
      matchStage.voteType = { $in: ['popularity_male', 'popularity_female', 'popularity_combined'] };
    } else {
      matchStage.voteType = voteType;
    }

    const voteRankings = await VoteTransaction.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: '$candidate',
          totalVotes: { $sum: '$votePoints' },
          uniqueVoters: { $addToSet: '$voter' },
          lastVotedAt: { $max: '$createdAt' }
        }
      },
      {
        $addFields: {
          uniqueVoterCount: { $size: '$uniqueVoters' }
        }
      },
      {
        $match: {
          totalVotes: { $gte: 1 } // แสดงเฉพาะ user ที่มีคะแนนตั้งแต่ 1 คะแนนขึ้นไป
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          _id: '$_id',
          candidateId: '$_id',
          username: '$userInfo.username',
          displayName: '$userInfo.displayName',
          firstName: '$userInfo.firstName',
          lastName: '$userInfo.lastName',
          email: '$userInfo.email',
          profileImages: '$userInfo.profileImages',
          mainProfileImageIndex: '$userInfo.mainProfileImageIndex',
          membership: '$userInfo.membership',
          gender: '$userInfo.gender',
          totalVotes: 1,
          uniqueVoterCount: 1,
          lastVotedAt: 1,
          isOnline: '$userInfo.isOnline',
          lastActive: '$userInfo.lastActive'
        }
      },
      // เพิ่มการค้นหาหากมี search query
      ...(search ? [{
        $addFields: {
          searchDebug: { $literal: `Searching for: ${search}` }
        }
      }, {
        $match: {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { displayName: { $regex: search, $options: 'i' } },
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      }] : []),
      {
        $sort: sortBy === 'uniqueVoters' 
          ? { uniqueVoterCount: -1, totalVotes: -1 }
          : { totalVotes: -1, uniqueVoterCount: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    console.log('📊 Vote rankings found:', voteRankings.length, 'items');

    // นับจำนวนทั้งหมด (เฉพาะ user ที่มีคะแนนตั้งแต่ 1 คะแนนขึ้นไป)
    const totalCountPipeline = [
      {
        $match: matchStage
      },
      {
        $group: {
          _id: '$candidate',
          totalVotes: { $sum: '$votePoints' }
        }
      },
      {
        $match: {
          totalVotes: { $gte: 1 } // นับเฉพาะ user ที่มีคะแนนตั้งแต่ 1 คะแนนขึ้นไป
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          _id: '$_id',
          username: '$userInfo.username',
          displayName: '$userInfo.displayName',
          firstName: '$userInfo.firstName',
          lastName: '$userInfo.lastName',
          email: '$userInfo.email',
          totalVotes: 1
        }
      }
    ];

    // เพิ่มการค้นหาหากมี search query
    if (search) {
      totalCountPipeline.push({
        $match: {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { displayName: { $regex: search, $options: 'i' } },
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    totalCountPipeline.push({ $count: 'total' });

    const totalCount = await VoteTransaction.aggregate(totalCountPipeline);

    const total = totalCount.length > 0 ? totalCount[0].total : 0;

    console.log('📊 Total count:', total, 'for search:', search);

    // เพิ่ม ranking position และปรับโครงสร้างข้อมูล
    const rankingsWithPosition = voteRankings.map((user, index) => ({
      _id: user._id,
      candidateId: user.candidateId,
      username: user.username,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImages: user.profileImages,
      membership: user.membership,
      gender: user.gender,
      totalVotes: user.totalVotes,
      uniqueVoterCount: user.uniqueVoterCount,
      lastVotedAt: user.lastVotedAt,
      isOnline: user.isOnline,
      lastActive: user.lastActive,
      rank: skip + index + 1
    }));

    const response = {
      success: true,
      data: {
        rankings: rankingsWithPosition,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / parseInt(limit)),
          hasMore: skip + parseInt(limit) < total
        },
        stats: {
          totalUsers: total,
          voteType: voteType,
          sortBy: sortBy
        }
      }
    };

    console.log('📤 Sending response:', {
      rankingsCount: rankingsWithPosition.length,
      total: total,
      search: search,
      hasMore: response.data.pagination.hasMore
    });

    res.json(response);

  } catch (error) {
    console.error('Error getting vote rankings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vote rankings',
      error: error.message
    });
  }
});

// GET /api/vote/history/:userId - ดูประวัติการโหวต
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'cast', page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    if (type === 'cast') {
      query.voter = userId;
    } else if (type === 'received') {
      query.candidate = userId;
    } else {
      query = {
        $or: [
          { voter: userId },
          { candidate: userId }
        ]
      };
    }

    query.status = 'active';

    const [votes, total] = await Promise.all([
      VoteTransaction.find(query)
        .populate('voter', 'username displayName membershipTier')
        .populate('candidate', 'username displayName membershipTier gender')
        .sort({ votedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      VoteTransaction.countDocuments(query)
    ]);

    // สถิติ
    const stats = await VoteTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalVotesCast: {
            $sum: {
              $cond: [{ $eq: ['$voter', mongoose.Types.ObjectId(userId)] }, '$votePoints', 0]
            }
          },
          totalVotesReceived: {
            $sum: {
              $cond: [{ $eq: ['$candidate', mongoose.Types.ObjectId(userId)] }, '$votePoints', 0]
            }
          },
          uniqueCandidates: {
            $addToSet: {
              $cond: [{ $eq: ['$voter', mongoose.Types.ObjectId(userId)] }, '$candidate', null]
            }
          },
          uniqueVoters: {
            $addToSet: {
              $cond: [{ $eq: ['$candidate', mongoose.Types.ObjectId(userId)] }, '$voter', null]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        votes: votes.map(vote => ({
          id: vote._id,
          type: vote.voter._id.toString() === userId ? 'cast' : 'received',
          voter: {
            id: vote.voter._id,
            username: vote.voter.username,
            displayName: vote.voter.displayName,
            membershipTier: vote.voter.membershipTier
          },
          candidate: {
            id: vote.candidate._id,
            username: vote.candidate.username,
            displayName: vote.candidate.displayName,
            membershipTier: vote.candidate.membershipTier,
            gender: vote.candidate.gender
          },
          votePoints: vote.votePoints,
          voteType: vote.voteType,
          message: vote.message,
          votedAt: vote.votedAt
        })),
        stats: stats[0] || {
          totalVotesCast: 0,
          totalVotesReceived: 0,
          uniqueCandidates: [],
          uniqueVoters: []
        },
        pagination: {
          current: pageNum,
          total: Math.ceil(total / limitNum),
          totalItems: total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching vote history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vote history',
      error: error.message
    });
  }
});

module.exports = router;
