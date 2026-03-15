const CoinPackage = require('../models/CoinPackage');

const coinPackages = [
  {
    name: 'Mini Starter Pack',
    description: '1,000 เหรียญ + 100 คะแนนโหวต',
    price: 1,
    currency: 'THB',
    rewards: {
      coins: 1000,
      votePoints: 100,
      bonusPercentage: 0
    },
    isActive: true,
    isPopular: false,
    isBestValue: false,
    order: 0
  },
  {
    name: 'Starter Pack',
    description: '10,000 เหรียญ + 1,000 คะแนนโหวต',
    price: 20,
    currency: 'THB',
    rewards: {
      coins: 10000,
      votePoints: 1000,
      bonusPercentage: 0
    },
    isActive: true,
    isPopular: false,
    isBestValue: false,
    order: 1
  },
  {
    name: 'Value Pack',
    description: '60,000 เหรียญ + 6,000 คะแนนโหวต',
    price: 50,
    currency: 'THB',
    rewards: {
      coins: 60000,
      votePoints: 6000,
      bonusPercentage: 0
    },
    isActive: true,
    isPopular: true,
    isBestValue: false,
    order: 2
  },
  {
    name: 'Popular Pack',
    description: '125,000 เหรียญ + 12,500 คะแนนโหวต',
    price: 100,
    currency: 'THB',
    rewards: {
      coins: 125000,
      votePoints: 12500,
      bonusPercentage: 0
    },
    isActive: true,
    isPopular: false,
    isBestValue: true,
    order: 3
  },
  {
    name: 'Premium Pack',
    description: '200,000 เหรียญ + 20,000 คะแนนโหวต + โบนัส 5%',
    price: 150,
    currency: 'THB',
    rewards: {
      coins: 200000,
      votePoints: 20000,
      bonusPercentage: 5
    },
    isActive: true,
    isPopular: false,
    isBestValue: false,
    order: 4
  },
  {
    name: 'Mega Pack',
    description: '450,000 เหรียญ + 45,000 คะแนนโหวต + โบนัส 10%',
    price: 300,
    currency: 'THB',
    rewards: {
      coins: 450000,
      votePoints: 45000,
      bonusPercentage: 10
    },
    isActive: true,
    isPopular: false,
    isBestValue: false,
    order: 5
  },
  {
    name: 'Super Pack',
    description: '800,000 เหรียญ + 80,000 คะแนนโหวต + โบนัส 20%',
    price: 500,
    currency: 'THB',
    rewards: {
      coins: 800000,
      votePoints: 80000,
      bonusPercentage: 20
    },
    isActive: true,
    isPopular: false,
    isBestValue: false,
    order: 6
  },
  {
    name: 'Ultimate Pack',
    description: '1,700,000 เหรียญ + 170,000 คะแนนโหวต + โบนัส 30%',
    price: 1000,
    currency: 'THB',
    rewards: {
      coins: 1700000,
      votePoints: 170000,
      bonusPercentage: 30
    },
    isActive: true,
    isPopular: false,
    isBestValue: false,
    order: 7
  }
];

async function seedCoinPackages() {
  try {
    // ลบข้อมูลเก่า
    await CoinPackage.deleteMany({});
    
    // เพิ่มข้อมูลใหม่
    await CoinPackage.insertMany(coinPackages);
    
    console.log('✅ Coin packages seeded successfully');
    console.log(`📊 Created ${coinPackages.length} coin packages`);
    
    return coinPackages;
  } catch (error) {
    console.error('❌ Error seeding coin packages:', error);
    throw error;
  }
}

module.exports = { seedCoinPackages, coinPackages };
