import { useState } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { membershipHelpers } from '../services/membershipAPI'
import { 
  Crown, 
  Star, 
  Zap, 
  MessageCircle, 
  Image, 
  Video, 
  Gift, 
  Coins, 
  Vote,
  Pin,
  Eye,
  Users,
  EyeOff,
  Send,
  Sparkles,
  Check,
  Clock,
  TrendingUp,
  Shield,
  Info
} from 'lucide-react'

const MembershipCard = ({ plan, isCurrentTier = false, onUpgrade, isLoading = false }) => {
  const [showFeatures, setShowFeatures] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  


  const getFeatureIcon = (featureName) => {
    const icons = {
      dailyChats: <MessageCircle className="h-4 w-4" />,
      dailyImages: <Image className="h-4 w-4" />,
      dailyVideos: <Video className="h-4 w-4" />,
      spinInterval: <Gift className="h-4 w-4" />,
      dailyBonus: <Coins className="h-4 w-4" />,
      votePoints: <Vote className="h-4 w-4" />,
      profileVideo: <Video className="h-4 w-4" />,
      verificationBadge: <Check className="h-4 w-4" />,
      specialFrame: <Crown className="h-4 w-4" />,
      pinPosts: <Pin className="h-4 w-4" />,
      blurImages: <Eye className="h-4 w-4" />,
      createChatRooms: <Users className="h-4 w-4" />,
      hideOnlineStatus: <EyeOff className="h-4 w-4" />,
      transferCoins: <Send className="h-4 w-4" />,
      unlimitedMedia: <Sparkles className="h-4 w-4" />
    }
    return icons[featureName] || <Star className="h-4 w-4" />
  }

  const formatLimit = (value) => {
    if (value === -1) return 'ไม่จำกัด'
    return value.toLocaleString()
  }

  const formatInterval = (minutes) => {
    if (minutes >= 1440) return `${minutes / 1440} วัน`
    if (minutes >= 60) return `${minutes / 60} ชั่วโมง`
    return `${minutes} นาที`
  }

  return (
    <>
      <div className={`group relative bg-white/95 backdrop-blur-xl rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        isCurrentTier 
          ? 'border-pink-300 shadow-lg ring-2 ring-pink-200/30' 
          : plan.tier === 'diamond'
            ? 'border-amber-200 hover:border-amber-300 ring-2 ring-amber-100/50 shadow-amber-200/20'
          : plan.tier === 'platinum'
            ? 'border-purple-200 hover:border-purple-300 ring-2 ring-purple-100/50 shadow-purple-200/20'
          : plan.tier === 'gold'
            ? 'border-yellow-200 hover:border-yellow-300 ring-2 ring-yellow-100/50 shadow-yellow-200/20'
            : 'border-gray-200 hover:border-pink-200'
      } ${
        plan.tier === 'diamond' ? 'shadow-2xl shadow-amber-200/30' :
        plan.tier === 'platinum' ? 'shadow-2xl shadow-purple-200/30' :
        plan.tier === 'gold' ? 'shadow-2xl shadow-yellow-200/30' : ''
      } overflow-hidden h-[320px] sm:h-[420px] flex flex-col`}>
      

      
      {/* Current Plan Indicator */}
      {isCurrentTier && (
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-green-500 text-white p-1.5 rounded-full shadow-lg">
            <Check className="h-3 w-3" />
          </div>
        </div>
      )}

      {/* Recommended Badge for VIP Member */}
      {plan.tier === 'vip' && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-gradient-to-r from-pink-500 to-violet-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            แนะนำ
          </div>
        </div>
      )}

      {/* Header - Compact */}
      <div className="text-center p-2.5 sm:p-4 pb-2">
        <div className={`w-9 h-9 sm:w-12 sm:h-12 mx-auto mb-1.5 sm:mb-3 rounded-xl bg-gradient-to-br ${membershipHelpers.getTierGradient(plan.tier)} flex items-center justify-center text-sm sm:text-lg shadow-lg`}>
          {membershipHelpers.getTierIcon(plan.tier)}
        </div>
        <h3 className="text-sm sm:text-lg font-bold text-gray-800 mb-0.5 sm:mb-1">
          {membershipHelpers.getTierName(plan.tier)}
        </h3>
        <div className="text-sm sm:text-xl font-bold bg-gradient-to-r from-pink-600 to-violet-600 bg-clip-text text-transparent mb-0.5 sm:mb-1">
          {membershipHelpers.formatPrice(plan.price.amount, plan.price.currency)}
        </div>
        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 sm:py-1 rounded-full inline-block">
          {plan.duration.description}
        </div>
      </div>

      {/* Key Features - Compact */}
      <div className="px-2.5 sm:px-4 flex-1 flex flex-col">
        <div className="space-y-0.5 sm:space-y-1.5 flex-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center">
              <MessageCircle className="h-3 w-3 mr-1.5 text-pink-500" />
              <span>Daily Chats</span>
            </div>
            <span className="font-semibold text-pink-600 text-xs">{formatLimit(plan.features.dailyChats)}</span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center">
              <Coins className="h-3 w-3 mr-1.5 text-yellow-500" />
              <span>Daily Bonus</span>
            </div>
            <span className="font-semibold text-yellow-600 text-xs">{membershipHelpers.formatCoins(plan.features.dailyBonus)}</span>
          </div>
          
          {plan.features.bonusCoins > 0 && (
            <div className="flex items-center justify-between text-xs bg-gradient-to-r from-amber-50 to-orange-50 p-1.5 rounded-md">
              <div className="flex items-center">
                <Sparkles className="h-3 w-3 mr-1.5 text-amber-500" />
                <span className="font-medium">Instant Bonus</span>
              </div>
              <span className="font-bold text-amber-600 text-xs">{membershipHelpers.formatCoins(plan.features.bonusCoins)}</span>
            </div>
          )}

          {/* Vote Points - แสดงถ้ามี */}
          {plan.features.votePoints > 0 && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <Vote className="h-3 w-3 mr-1.5 text-indigo-500" />
                <span>Vote Points</span>
              </div>
              <span className="font-semibold text-indigo-600 text-xs">{plan.features.votePoints.toLocaleString()}</span>
            </div>
          )}
        </div>
        
        {/* View Details Button - Compact */}
        <div className="mt-auto pt-1 sm:pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetailModal(true)}
            className="w-full text-xs text-gray-500 hover:text-pink-600 hover:bg-pink-50 transition-colors py-0 sm:py-1"
          >
            <Info className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">View All Features</span>
            <span className="sm:hidden">Details</span>
          </Button>
        </div>
      </div>

      {/* Action Button - Compact */}
      <div className="p-1.5 sm:p-3 pt-1 sm:pt-2 mt-auto">
        {isCurrentTier ? (
          <Button disabled className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold py-1 sm:py-2 rounded-lg shadow-lg text-xs sm:text-sm">
            <Check className="h-3 w-3 mr-1 sm:mr-1.5" />
            Current Plan
          </Button>
        ) : (
          <Button
            onClick={() => onUpgrade?.(plan)}
            disabled={isLoading}
            className={`w-full bg-gradient-to-r ${membershipHelpers.getTierGradient(plan.tier)} text-white font-semibold py-1 sm:py-2 rounded-lg text-xs sm:text-sm`}
          >
            <>
              <Zap className="h-3 w-3 mr-1 sm:mr-1.5" />
              Upgrade Now
            </>
          </Button>
        )}
      </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-2xl font-bold gradient-text">
              <div className={`w-8 h-8 mr-3 rounded-lg bg-gradient-to-br ${membershipHelpers.getTierGradient(plan.tier)} flex items-center justify-center text-lg`}>
                {membershipHelpers.getTierIcon(plan.tier)}
              </div>
              {membershipHelpers.getTierName(plan.tier)} Plan Details
            </DialogTitle>
            <DialogDescription>
              Complete feature breakdown and benefits for the {membershipHelpers.getTierName(plan.tier)} membership plan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Price & Duration */}
            <div className="text-center p-6 bg-gradient-to-r from-pink-50 to-violet-50 rounded-xl">
              <div className="text-3xl font-bold gradient-text mb-2">
                {membershipHelpers.formatPrice(plan.price.amount, plan.price.currency)}
              </div>
              <div className="text-gray-600">{plan.duration.description}</div>
            </div>

            {/* All Features */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-pink-500" />
                Daily Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                  <div className="flex items-center">
                    <MessageCircle className="h-5 w-5 mr-3 text-pink-500" />
                    <span className="font-medium">Daily Chats</span>
                  </div>
                  <span className="font-bold text-pink-600">{formatLimit(plan.features.dailyChats)} people</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <Image className="h-5 w-5 mr-3 text-blue-500" />
                    <span className="font-medium">Image Uploads</span>
                  </div>
                  <span className="font-bold text-blue-600">{formatLimit(plan.features.dailyImages)} images</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <Video className="h-5 w-5 mr-3 text-purple-500" />
                    <span className="font-medium">Video Uploads</span>
                  </div>
                  <span className="font-bold text-purple-600">{formatLimit(plan.features.dailyVideos)} videos</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <Gift className="h-5 w-5 mr-3 text-green-500" />
                    <span className="font-medium">Spin Wheel</span>
                  </div>
                  <span className="font-bold text-green-600">Every {formatInterval(plan.features.spinInterval.minutes)}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center">
                    <Coins className="h-5 w-5 mr-3 text-yellow-500" />
                    <span className="font-medium">Daily Bonus</span>
                  </div>
                  <span className="font-bold text-yellow-600">{membershipHelpers.formatCoins(plan.features.dailyBonus)} coins</span>
                </div>
              </div>
            </div>

            {/* Bonus Features */}
            {(plan.features.votePoints > 0 || plan.features.bonusCoins > 0) && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
                  Bonus Features
                </h3>
                <div className="space-y-3">
                  {plan.features.votePoints > 0 && (
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                      <div className="flex items-center">
                        <Vote className="h-5 w-5 mr-3 text-indigo-500" />
                        <span className="font-medium">Vote Points</span>
                      </div>
                      <span className="font-bold text-indigo-600">{plan.features.votePoints.toLocaleString()} points</span>
                    </div>
                  )}
                  {plan.features.bonusCoins > 0 && (
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center">
                        <Sparkles className="h-5 w-5 mr-3 text-amber-500" />
                        <span className="font-medium">🎁 Instant Bonus</span>
                      </div>
                      <span className="font-bold text-amber-600">{membershipHelpers.formatCoins(plan.features.bonusCoins)} coins</span>
          </div>
        )}
      </div>
    </div>
            )}

            {/* Special Features */}
            {plan.features.specialFeatures && plan.features.specialFeatures.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-500" />
                  Special Features
                </h3>
                <div className="grid gap-3">
                  {plan.features.specialFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start p-3 bg-green-50 rounded-lg">
                      <Check className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowDetailModal(false)}
                className="flex-1"
              >
                Close
              </Button>
              {!isCurrentTier && (
                <Button
                  onClick={() => {
                    
                    setShowDetailModal(false)
                    onUpgrade?.(plan)
                  }}
                  disabled={isLoading}
                  className={`flex-1 bg-gradient-to-r ${membershipHelpers.getTierGradient(plan.tier)} text-white font-semibold`}
                >
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Upgrade Now
                  </>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default MembershipCard
