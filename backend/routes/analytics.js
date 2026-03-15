// Analytics and User Satisfaction Monitoring
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// User Satisfaction Tracking Model (in-memory for now)
let satisfactionMetrics = {
  totalMatches: 0,
  totalLikes: 0,
  totalMessages: 0,
  averageCompatibilityScore: 0,
  userSatisfaction: {
    verySatisfied: 0,
    satisfied: 0,
    neutral: 0,
    dissatisfied: 0,
    veryDissatisfied: 0
  },
  dailyStats: {},
  weeklyStats: {},
  monthlyStats: {}
};

// Helper function to get current date key
function getDateKey() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Helper function to get current week key
function getWeekKey() {
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  return startOfWeek.toISOString().split('T')[0];
}

// Helper function to get current month key
function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Track match interaction
function trackMatchInteraction(type, compatibilityScore = 0) {
  satisfactionMetrics.totalMatches++;
  
  if (type === 'like') {
    satisfactionMetrics.totalLikes++;
  } else if (type === 'message') {
    satisfactionMetrics.totalMessages++;
  }
  
  // Update average compatibility score
  const currentTotal = satisfactionMetrics.averageCompatibilityScore * (satisfactionMetrics.totalMatches - 1);
  satisfactionMetrics.averageCompatibilityScore = (currentTotal + compatibilityScore) / satisfactionMetrics.totalMatches;
  
  // Update daily stats
  const dateKey = getDateKey();
  if (!satisfactionMetrics.dailyStats[dateKey]) {
    satisfactionMetrics.dailyStats[dateKey] = {
      matches: 0,
      likes: 0,
      messages: 0,
      avgScore: 0,
      totalScore: 0
    };
  }
  
  satisfactionMetrics.dailyStats[dateKey].matches++;
  if (type === 'like') satisfactionMetrics.dailyStats[dateKey].likes++;
  if (type === 'message') satisfactionMetrics.dailyStats[dateKey].messages++;
  
  satisfactionMetrics.dailyStats[dateKey].totalScore += compatibilityScore;
  satisfactionMetrics.dailyStats[dateKey].avgScore = 
    satisfactionMetrics.dailyStats[dateKey].totalScore / satisfactionMetrics.dailyStats[dateKey].matches;
}

// POST /api/analytics/track-match - Track match interaction
router.post('/track-match', auth, async (req, res) => {
  try {
    const { type, matchId, compatibilityScore } = req.body;
    
    if (!type || !matchId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ type และ matchId'
      });
    }
    
    if (!['like', 'message', 'view'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'type ต้องเป็น like, message หรือ view'
      });
    }
    
    // Track the interaction
    trackMatchInteraction(type, compatibilityScore || 0);
    
    res.json({
      success: true,
      message: 'บันทึกข้อมูลเรียบร้อยแล้ว'
    });
    
  } catch (error) {
    console.error('Error tracking match interaction:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    });
  }
});

// POST /api/analytics/satisfaction-feedback - Record user satisfaction
router.post('/satisfaction-feedback', auth, async (req, res) => {
  try {
    const { rating, feedback, matchId } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'rating ต้องเป็น 1-5'
      });
    }
    
    // Update satisfaction metrics
    const satisfactionLevels = ['veryDissatisfied', 'dissatisfied', 'neutral', 'satisfied', 'verySatisfied'];
    const level = satisfactionLevels[rating - 1];
    satisfactionMetrics.userSatisfaction[level]++;
    
    // Store feedback (in a real system, this would be saved to database)
    console.log(`User satisfaction feedback: ${rating}/5 - ${feedback || 'No comment'} (Match: ${matchId || 'N/A'})`);
    
    res.json({
      success: true,
      message: 'ขอบคุณสำหรับการให้คะแนน'
    });
    
  } catch (error) {
    console.error('Error recording satisfaction feedback:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    });
  }
});

// GET /api/analytics/metrics - Get analytics metrics
router.get('/metrics', auth, async (req, res) => {
  try {
    // Check if user is admin or superadmin
    const user = await User.findById(req.user.id);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
      });
    }
    
    // Calculate satisfaction percentage
    const totalSatisfaction = Object.values(satisfactionMetrics.userSatisfaction).reduce((sum, val) => sum + val, 0);
    const satisfactionPercentage = totalSatisfaction > 0 
      ? ((satisfactionMetrics.userSatisfaction.satisfied + satisfactionMetrics.userSatisfaction.verySatisfied) / totalSatisfaction) * 100
      : 0;
    
    // Calculate conversion rates
    const likeRate = satisfactionMetrics.totalMatches > 0 
      ? (satisfactionMetrics.totalLikes / satisfactionMetrics.totalMatches) * 100 
      : 0;
    
    const messageRate = satisfactionMetrics.totalMatches > 0 
      ? (satisfactionMetrics.totalMessages / satisfactionMetrics.totalMatches) * 100 
      : 0;
    
    res.json({
      success: true,
      data: {
        overview: {
          totalMatches: satisfactionMetrics.totalMatches,
          totalLikes: satisfactionMetrics.totalLikes,
          totalMessages: satisfactionMetrics.totalMessages,
          averageCompatibilityScore: Math.round(satisfactionMetrics.averageCompatibilityScore * 100) / 100,
          satisfactionPercentage: Math.round(satisfactionPercentage * 100) / 100
        },
        conversionRates: {
          likeRate: Math.round(likeRate * 100) / 100,
          messageRate: Math.round(messageRate * 100) / 100,
          overallEngagement: Math.round(((likeRate + messageRate) / 2) * 100) / 100
        },
        satisfactionBreakdown: satisfactionMetrics.userSatisfaction,
        dailyStats: satisfactionMetrics.dailyStats,
        weeklyStats: satisfactionMetrics.weeklyStats,
        monthlyStats: satisfactionMetrics.monthlyStats
      }
    });
    
  } catch (error) {
    console.error('Error fetching analytics metrics:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});

// GET /api/analytics/health-check - System health check
router.get('/health-check', auth, async (req, res) => {
  try {
    // Check database connection
    const userCount = await User.countDocuments();
    
    // Check recent activity
    const recentUsers = await User.find({ 
      lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
    }).countDocuments();
    
    // System health indicators
    const health = {
      database: 'healthy',
      userCount: userCount,
      activeUsers24h: recentUsers,
      systemUptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: health
    });
    
  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({
      success: false,
      message: 'System health check failed',
      error: error.message
    });
  }
});

// GET /api/analytics/recommendations - Get improvement recommendations
router.get('/recommendations', auth, async (req, res) => {
  try {
    // Check if user is admin or superadmin
    const user = await User.findById(req.user.id);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
      });
    }
    
    const recommendations = [];
    
    // Analyze metrics and provide recommendations
    const totalSatisfaction = Object.values(satisfactionMetrics.userSatisfaction).reduce((sum, val) => sum + val, 0);
    
    if (totalSatisfaction > 0) {
      const satisfactionPercentage = ((satisfactionMetrics.userSatisfaction.satisfied + satisfactionMetrics.userSatisfaction.verySatisfied) / totalSatisfaction) * 100;
      
      if (satisfactionPercentage < 70) {
        recommendations.push({
          type: 'satisfaction',
          priority: 'high',
          title: 'ปรับปรุงความพึงพอใจของผู้ใช้',
          description: 'คะแนนความพึงพอใจต่ำกว่า 70% ควรปรับปรุงอัลกอริทึมการแมท',
          action: 'วิเคราะห์ปัจจัยที่มีผลต่อความพึงพอใจและปรับปรุงระบบ'
        });
      }
    }
    
    if (satisfactionMetrics.averageCompatibilityScore < 60) {
      recommendations.push({
        type: 'algorithm',
        priority: 'medium',
        title: 'ปรับปรุงอัลกอริทึมการแมท',
        description: 'คะแนนความเข้ากันได้เฉลี่ยต่ำกว่า 60',
        action: 'ปรับปรุงน้ำหนักของปัจจัยต่างๆ ในระบบการแมท'
      });
    }
    
    const likeRate = satisfactionMetrics.totalMatches > 0 
      ? (satisfactionMetrics.totalLikes / satisfactionMetrics.totalMatches) * 100 
      : 0;
    
    if (likeRate < 20) {
      recommendations.push({
        type: 'engagement',
        priority: 'medium',
        title: 'เพิ่มอัตราการไลค์',
        description: 'อัตราการไลค์ต่ำกว่า 20%',
        action: 'ปรับปรุงคุณภาพของการแมทและเพิ่มฟีเจอร์ที่น่าสนใจ'
      });
    }
    
    const messageRate = satisfactionMetrics.totalMatches > 0 
      ? (satisfactionMetrics.totalMessages / satisfactionMetrics.totalMatches) * 100 
      : 0;
    
    if (messageRate < 10) {
      recommendations.push({
        type: 'engagement',
        priority: 'high',
        title: 'เพิ่มอัตราการส่งข้อความ',
        description: 'อัตราการส่งข้อความต่ำกว่า 10%',
        action: 'เพิ่มฟีเจอร์การเริ่มบทสนทนาและปรับปรุงระบบแชท'
      });
    }
    
    // Default recommendations if no specific issues found
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'general',
        priority: 'low',
        title: 'ระบบทำงานได้ดี',
        description: 'ไม่มีปัญหาที่ต้องแก้ไขเร่งด่วน',
        action: 'ติดตามและตรวจสอบอย่างต่อเนื่อง'
      });
    }
    
    res.json({
      success: true,
      data: {
        recommendations: recommendations,
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างคำแนะนำ'
    });
  }
});

module.exports = router;
