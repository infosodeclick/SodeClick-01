import React from 'react'
import { Heart, MessageCircle, MapPin, Star, Crown } from 'lucide-react'
import { getMainProfileImage, getProfileImageUrl } from '../utils/profileImageUtils'
import { showWebappNotification } from '../utils'
import type { PublicUser, FeaturedProfile } from '../types'

interface ProfileCardProps {
  profile: PublicUser | FeaturedProfile
  isLiked?: boolean
  onLike?: (profileId: string) => void
  onViewProfile?: (profileData: any) => void
  onStartChat?: (profile: any) => void
  showOnlineStatus?: boolean
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  isLiked = false,
  onLike,
  onViewProfile,
  onStartChat,
  showOnlineStatus = true
}) => {
  const profileImage = getMainProfileImage(
    profile?.profileImages || [], 
    (profile as any)?.mainProfileImageIndex, 
    profile._id || (profile as any)?.id
  )
  
  const displayName = profile.nickname || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || (profile as any).username || 'Unknown'
  const age = profile.age || 'N/A'
  const location = profile.location || 'Unknown'
  const bio = profile.bio || 'No bio available'
  const interests = profile.interests?.map(i => i.category || i) || []
  const membershipTier = profile.membership?.tier || (profile as any).membershipTier || 'member'
  const isOnline = (profile as any).isOnline || false
  const lastActive = (profile as any).lastActive
  const isVerified = (profile as any).isVerified || false

  const handleCardClick = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
      return
    }
    
    const profileData = {
      id: profile._id,
      name: displayName,
      age: parseInt(String(age)) || 0,
      location: location,
      bio: bio,
      interests: interests,
      images: profile.profileImages && profile.profileImages.length > 0
        ? profile.profileImages.filter(img => 
            typeof img === 'string' && !img.startsWith('data:image/svg+xml')
          ).map(img => 
            getProfileImageUrl(img, profile._id || (profile as any).id)
          )
        : [],
      verified: isVerified,
      online: isOnline,
      lastActive: lastActive,
      membershipTier: membershipTier
    };
    
    onViewProfile?.(profileData);
  }

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLike && profile._id) {
      onLike(profile._id);
    }
  }

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStartChat) {
      onStartChat(profile);
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return <Crown className="h-3 w-3 text-purple-600" />
      case 'diamond':
        return <Star className="h-3 w-3 text-blue-600" />
      case 'vip':
      case 'vip1':
      case 'vip2':
        return <Star className="h-3 w-3 text-yellow-600" />
      default:
        return null
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'bg-purple-100 text-purple-800'
      case 'diamond':
        return 'bg-blue-100 text-blue-800'
      case 'vip':
      case 'vip1':
      case 'vip2':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div 
      className="modern-card rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-pink-100/50 transition-all duration-500 hover:-translate-y-2 cursor-pointer group floating-hearts"
      onClick={handleCardClick}
    >
      <div className="h-48 sm:h-60 md:h-72 overflow-hidden relative">
        {profileImage && !profileImage.startsWith('data:image/svg+xml') ? (
          <img 
            src={profileImage} 
            alt={displayName} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const fallbackElement = (e.target as HTMLImageElement).nextElementSibling;
              if (fallbackElement) {
                fallbackElement.classList.remove('hidden');
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-200 flex items-center justify-center">
            <div className="text-6xl text-white/60">👤</div>
          </div>
        )}
        
        {/* Fallback gradient background */}
        <div className="hidden w-full h-full bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-200 flex items-center justify-center">
          <div className="text-6xl text-white/60">👤</div>
        </div>

        {/* Online Status */}
        {showOnlineStatus && isOnline && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            ออนไลน์
          </div>
        )}

        {/* Membership Tier Badge */}
        {membershipTier !== 'member' && (
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getTierColor(membershipTier)}`}>
            {getTierIcon(membershipTier)}
            {membershipTier.toUpperCase()}
          </div>
        )}

        {/* Verified Badge */}
        {isVerified && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Star className="h-3 w-3" />
            ตรวจสอบแล้ว
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute bottom-2 right-2 flex gap-2">
          {onLike && (
            <button
              onClick={handleLikeClick}
              className="bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors shadow-lg"
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
            </button>
          )}
          {onStartChat && (
            <button
              onClick={handleChatClick}
              className="bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors shadow-lg"
            >
              <MessageCircle className="h-4 w-4 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {displayName}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{age} ปี</span>
              {location && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{location}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {bio && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {bio}
          </p>
        )}

        {interests.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {interests.slice(0, 3).map((interest, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full"
              >
                {interest}
              </span>
            ))}
            {interests.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{interests.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Last Active */}
        {!isOnline && lastActive && (
          <p className="text-xs text-gray-400">
            ใช้งานล่าสุด: {new Date(lastActive).toLocaleDateString('th-TH')}
          </p>
        )}
      </div>
    </div>
  )
}
