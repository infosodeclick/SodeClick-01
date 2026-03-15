const Gift = require('../models/Gift');

const gifts = [
  // Flower Category
  {
    name: 'Rose',
    description: 'A beautiful red rose symbolizing love',
    icon: '🌹',
    animation: 'float-up',
    price: { coins: 100, money: 0, votePoints: 0 },
    value: 100,
    category: 'flower',
    rarity: 'common'
  },
  {
    name: 'Tulip',
    description: 'Elegant tulip for someone special',
    icon: '🌷',
    animation: 'float-up',
    price: { coins: 200, money: 0, votePoints: 0 },
    value: 200,
    category: 'flower',
    rarity: 'common'
  },
  {
    name: 'Bouquet',
    description: 'A stunning bouquet of mixed flowers',
    icon: '💐',
    animation: 'sparkle',
    price: { coins: 500, money: 0, votePoints: 0 },
    value: 500,
    category: 'flower',
    rarity: 'rare'
  },

  // Jewelry Category
  {
    name: 'Ring',
    description: 'A precious ring to show your commitment',
    icon: '💍',
    animation: 'shine',
    price: { coins: 1000, money: 0, votePoints: 0 },
    value: 1000,
    category: 'jewelry',
    rarity: 'rare'
  },
  {
    name: 'Diamond',
    description: 'A sparkling diamond, the ultimate symbol of love',
    icon: '💎',
    animation: 'sparkle-rainbow',
    price: { coins: 5000, money: 0, votePoints: 0 },
    value: 5000,
    category: 'jewelry',
    rarity: 'epic'
  },
  {
    name: 'Crown',
    description: 'A royal crown for the queen/king of your heart',
    icon: '👑',
    animation: 'golden-glow',
    price: { coins: 10000, money: 0, votePoints: 0 },
    value: 10000,
    category: 'jewelry',
    rarity: 'legendary'
  },

  // Food Category
  {
    name: 'Chocolate',
    description: 'Sweet chocolate to make their day',
    icon: '🍫',
    animation: 'bounce',
    price: { coins: 150, money: 0, votePoints: 0 },
    value: 150,
    category: 'food',
    rarity: 'common'
  },
  {
    name: 'Cake',
    description: 'Delicious cake for celebration',
    icon: '🎂',
    animation: 'party',
    price: { coins: 300, money: 0, votePoints: 0 },
    value: 300,
    category: 'food',
    rarity: 'common'
  },
  {
    name: 'Candy',
    description: 'Sweet candy to brighten their mood',
    icon: '🍭',
    animation: 'spin',
    price: { coins: 80, money: 0, votePoints: 0 },
    value: 80,
    category: 'food',
    rarity: 'common'
  },

  // Drink Category
  {
    name: 'Coffee',
    description: 'A warm cup of coffee to start the day',
    icon: '☕',
    animation: 'steam',
    price: { coins: 120, money: 0, votePoints: 0 },
    value: 120,
    category: 'drink',
    rarity: 'common'
  },
  {
    name: 'Wine',
    description: 'Fine wine for romantic moments',
    icon: '🍷',
    animation: 'elegant-pour',
    price: { coins: 800, money: 0, votePoints: 0 },
    value: 800,
    category: 'drink',
    rarity: 'rare'
  },
  {
    name: 'Champagne',
    description: 'Premium champagne for special celebrations',
    icon: '🍾',
    animation: 'pop-celebration',
    price: { coins: 2000, money: 0, votePoints: 0 },
    value: 2000,
    category: 'drink',
    rarity: 'epic'
  },

  // Luxury Category
  {
    name: 'Sports Car',
    description: 'A luxury sports car for the ultimate gift',
    icon: '🏎️',
    animation: 'speed-lines',
    price: { coins: 50000, money: 0, votePoints: 0 },
    value: 50000,
    category: 'luxury',
    rarity: 'legendary'
  },
  {
    name: 'Yacht',
    description: 'Private yacht for exclusive adventures',
    icon: '🛥️',
    animation: 'ocean-waves',
    price: { coins: 100000, money: 0, votePoints: 0 },
    value: 100000,
    category: 'luxury',
    rarity: 'legendary'
  },
  {
    name: 'Private Jet',
    description: 'The ultimate luxury - a private jet',
    icon: '✈️',
    animation: 'fly-through',
    price: { coins: 500000, money: 0, votePoints: 0 },
    value: 500000,
    category: 'luxury',
    rarity: 'legendary'
  },

  // Special Category
  {
    name: 'Heart',
    description: 'A loving heart to express your feelings',
    icon: '❤️',
    animation: 'heartbeat',
    price: { coins: 50, money: 0, votePoints: 0 },
    value: 50,
    category: 'special',
    rarity: 'common'
  },
  {
    name: 'Kiss',
    description: 'A sweet kiss to show affection',
    icon: '💋',
    animation: 'float-kiss',
    price: { coins: 200, money: 0, votePoints: 0 },
    value: 200,
    category: 'special',
    rarity: 'common'
  },
  {
    name: 'Love Letter',
    description: 'A romantic love letter',
    icon: '💌',
    animation: 'envelope-open',
    price: { coins: 300, money: 0, votePoints: 0 },
    value: 300,
    category: 'special',
    rarity: 'rare'
  },
  {
    name: 'Shooting Star',
    description: 'Make a wish upon this shooting star',
    icon: '🌠',
    animation: 'shooting-star',
    price: { coins: 1500, money: 0, votePoints: 0 },
    value: 1500,
    category: 'special',
    rarity: 'epic'
  },
  {
    name: 'Rainbow',
    description: 'A magical rainbow bringing joy and hope',
    icon: '🌈',
    animation: 'rainbow-arc',
    price: { coins: 3000, money: 0, votePoints: 0 },
    value: 3000,
    category: 'special',
    rarity: 'epic'
  }
];

async function seedGifts() {
  try {
    // ลบข้อมูลเก่า
    await Gift.deleteMany({});
    
    // เพิ่มข้อมูลใหม่
    await Gift.insertMany(gifts);
    
    console.log('✅ Gifts seeded successfully');
    console.log(`📊 Created ${gifts.length} gifts`);
    
    return gifts;
  } catch (error) {
    console.error('❌ Error seeding gifts:', error);
    throw error;
  }
}

module.exports = { seedGifts, gifts };
