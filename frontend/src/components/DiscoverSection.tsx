import React from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import { ProfileCard } from './ProfileCard'
import { getMainProfileImage } from '../utils/profileImageUtils'
import type { PublicUser } from '../types'

interface DiscoverSectionProps {
  allUsers: PublicUser[]
  isLoadingAllUsers: boolean
  visibleCount: number
  user: any
  likedProfiles: Set<string>
  onRefresh: () => void
  onProfileLike: (profileId: string) => void
  onViewProfile: (profileData: any) => void
  onStartChat: (profile: any) => void
}

export const DiscoverSection: React.FC<DiscoverSectionProps> = ({
  allUsers,
  isLoadingAllUsers,
  visibleCount,
  user,
  likedProfiles,
  onRefresh,
  onProfileLike,
  onViewProfile,
  onStartChat
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 mt-8 sm:mt-12 gap-4">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text mb-1 sm:mb-2">
            Discover Amazing People ✨
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Find your perfect match from verified member singles 
            {!isLoadingAllUsers && allUsers.length > 0 && (
              <span className="ml-1 sm:ml-2 text-pink-600 font-semibold text-xs sm:text-sm">
                (สุ่มแสดง {allUsers.length} คน)
              </span>
            )}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onRefresh}
          disabled={isLoadingAllUsers}
          className="flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2"
        >
          <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isLoadingAllUsers ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      {/* User Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
        {isLoadingAllUsers ? (
          // Loading skeleton
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="modern-card rounded-2xl overflow-hidden shadow-xl animate-pulse">
              <div className="h-72 bg-gray-200"></div>
              <div className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-14"></div>
                </div>
              </div>
            </div>
          ))
        ) : allUsers.length > 0 ? (
          allUsers
            .filter(u => {
              // Filter out current user
              const currentUserId = user?._id || user?.id;
              const userId = u._id || (u as any)?.id;
              return currentUserId !== userId;
            })
            .slice(0, visibleCount)
            .map(user => {
              const profileImage = getMainProfileImage(
                user?.profileImages || [], 
                (user as any)?.mainProfileImageIndex, 
                user._id || (user as any)?.id
              )
              
              const displayName = user.nickname || `${user.firstName || ''} ${user.lastName || ''}`.trim() || (user as any).username || 'Unknown'
              const age = user.age || 'N/A'
              const location = user.location || 'Unknown'
              const bio = user.bio || 'No bio available'
              const interests = user.interests?.map(i => i.category || i) || []
              
              return (
                <ProfileCard
                  key={user._id}
                  profile={user}
                  isLiked={likedProfiles.has(user._id || '')}
                  onLike={onProfileLike}
                  onViewProfile={onViewProfile}
                  onStartChat={onStartChat}
                  showOnlineStatus={true}
                />
              )
            })
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-500 text-lg">ไม่พบผู้ใช้</div>
            <p className="text-gray-400 text-sm mt-2">ลองรีเฟรชหรือเปลี่ยนตัวกรอง</p>
          </div>
        )}
      </div>
    </div>
  )
}
