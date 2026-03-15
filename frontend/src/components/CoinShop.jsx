import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useToast } from './ui/toast';
import { shopAPI, shopHelpers } from '../services/shopAPI';
import { paymentAPI } from '../services/paymentAPI';
import { 
  Coins, 
  Vote, 
  ShoppingCart, 
  Star, 
  TrendingUp, 
  Gift, 
  RefreshCw,
  Crown,
  Sparkles,
  Zap,
  Award,
  CheckCircle
} from 'lucide-react';

const CoinShop = ({ userId, onNavigateToPayment }) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [error, setError] = useState(null);
  const { success, error: showError } = useToast();

  // ดึงแพ็กเกจเหรียญ
  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await shopAPI.getCoinPackages();
      setPackages(response.data.data.packages);
      setError(null);
    } catch (err) {
      console.error('Error fetching coin packages:', err);
      setError(err.response?.data?.message || 'ไม่สามารถดึงข้อมูลแพ็กเกจได้');
    } finally {
      setLoading(false);
    }
  };

  // ซื้อแพ็กเกจเหรียญ
  const handlePurchase = async (packageData) => {
    if (!userId) {
      showError('กรุณาเข้าสู่ระบบก่อนซื้อแพ็กเกจ');
      return;
    }

    try {
      setPurchasing(packageData.id);
      
      // เรียกใช้ระบบ payment ที่มีอยู่แล้ว
      if (onNavigateToPayment) {
        // สร้าง plan object ที่เข้ากันได้กับระบบ payment
        const plan = {
          id: packageData.id,
          _id: packageData.id,
          name: packageData.name,
          tier: 'coin_package',
          price: packageData.price,
          currency: packageData.currency,
          description: packageData.description,
          rewards: packageData.rewards
        };
        
        console.log('🛒 Navigating to payment with plan:', plan);
        onNavigateToPayment(plan);
      } else {
        // Fallback: ใช้ API โดยตรง (สำหรับการทดสอบ)
        const response = await shopAPI.purchaseCoinPackage({
          userId,
          packageId: packageData.id,
          paymentMethod: 'credit_card'
        });
        
        success(`ซื้อ ${packageData.name} สำเร็จ! ได้รับ ${response.data.data.rewards.totalCoins} เหรียญ`);
      }
    } catch (err) {
      console.error('Error purchasing package:', err);
      showError(err.response?.data?.message || 'ไม่สามารถซื้อแพ็กเกจได้');
    } finally {
      setPurchasing(null);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 text-pink-500 animate-spin mb-4" />
        <span className="text-lg text-slate-600">กำลังโหลดแพ็กเกจเหรียญ...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={fetchPackages} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-2xl mr-4">
            🛒
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">ร้านค้าของขวัญ</h1>
            <p className="text-slate-600 mt-1">ซื้อสินค้า ซื้อด้วยเงิน / คอยน์ / โหวต</p>
          </div>
        </div>
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {packages
          .filter(pkg => pkg.name !== 'Test Package' && pkg.name !== 'Mini Starter Pack') // กรอง Test Package และ Mini Starter Pack ออก
          .map((pkg) => {
          const totalCoins = shopHelpers.calculateTotalCoins(pkg.rewards.coins, pkg.rewards.bonusPercentage);
          const bonusCoins = shopHelpers.calculateBonus(pkg.rewards.coins, pkg.rewards.bonusPercentage);
          const isPopular = shopHelpers.isPopularPackage(pkg);
          const isBestValue = shopHelpers.isBestValuePackage(pkg);
          const packageColor = shopHelpers.getPackageColor(pkg.price);
          const packageIcon = shopHelpers.getPackageIcon(pkg.price);

          return (
            <Card 
              key={pkg.id} 
              className={`relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                isPopular ? 'ring-2 ring-pink-500 shadow-lg' : ''
              } ${isBestValue ? 'ring-2 ring-yellow-500 shadow-lg' : ''}`}
            >
              {/* Badge */}
              {(isPopular || isBestValue) && (
                <div className="absolute top-3 right-3 z-10">
                  {isPopular && (
                    <Badge className="bg-pink-500 text-white text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      ยอดนิยม
                    </Badge>
                  )}
                  {isBestValue && (
                    <Badge className="bg-yellow-500 text-white text-xs ml-1">
                      <Award className="h-3 w-3 mr-1" />
                      คุ้มสุด
                    </Badge>
                  )}
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-2xl mr-2">{packageIcon}</div>
                    <CardTitle className="text-lg font-bold text-slate-800">
                      {pkg.name}
                    </CardTitle>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-1">{pkg.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Price */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-800">
                    {shopHelpers.formatPrice(pkg.price, pkg.currency)}
                  </div>
                </div>

                {/* Rewards */}
                <div className="space-y-3">
                  {/* Coins */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Coins className="h-5 w-5 text-amber-600 mr-2" />
                        <span className="font-medium text-slate-700">เหรียญ</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-amber-600">
                          {shopHelpers.formatCoins(totalCoins)}
                        </div>
                        {bonusCoins > 0 && (
                          <div className="text-xs text-green-600">
                            +{shopHelpers.formatCoins(bonusCoins)} โบนัส
                          </div>
                        )}
                      </div>
                    </div>
                    {pkg.rewards.bonusPercentage > 0 && (
                      <div className="mt-2 text-xs text-slate-500">
                        โบนัส {pkg.rewards.bonusPercentage}% จาก {shopHelpers.formatCoins(pkg.rewards.coins)} เหรียญ
                      </div>
                    )}
                  </div>

                  {/* Vote Points */}
                  {pkg.rewards.votePoints > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Vote className="h-5 w-5 text-purple-600 mr-2" />
                          <span className="font-medium text-slate-700">คะแนนโหวต</span>
                        </div>
                        <div className="text-lg font-bold text-purple-600">
                          {shopHelpers.formatVotePoints(pkg.rewards.votePoints)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Purchase Button */}
                <Button
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasing === pkg.id}
                  className={`w-full bg-gradient-to-r ${packageColor} hover:opacity-90 text-white font-semibold py-3`}
                >
                  {purchasing === pkg.id ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      กำลังซื้อ...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      ซื้อแพ็กเกจ
                    </>
                  )}
                </Button>

                {/* Value Info */}
                <div className="text-center text-xs text-slate-500">
                  มูลค่า {shopHelpers.formatPrice(shopHelpers.calculateValuePerCoin(pkg.price, totalCoins))} ต่อ 1,000 เหรียญ
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl mr-4 flex-shrink-0">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">ข้อมูลเพิ่มเติม</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                เหรียญและคะแนนโหวตจะได้รับทันทีหลังการชำระเงิน
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                เหรียญไม่หมดอายุ สามารถใช้ได้ตลอดไป
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                คะแนนโหวตใช้สำหรับโหวตในระบบ
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                แพ็กเกจที่มีโบนัสจะได้รับเหรียญเพิ่มเติม
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinShop;
