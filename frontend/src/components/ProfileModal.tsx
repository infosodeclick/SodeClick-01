import React from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { Badge } from './ui/badge'
import { getProfileImageUrl } from '../utils/profileImageUtils'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: any
  onLike: (profileId: string) => void
  onChat: (profileId: string) => void
  onPayment: (targetUserId: string, imageId: string) => void
  isLiked: boolean
  canChat: boolean
  user: any
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onLike,
  onChat,
  onPayment,
  isLiked,
  canChat,
  user
}) => {
  if (!profile) return null

  const mainImage = getProfileImageUrl(profile.profileImages?.[0], profile._id)
  const isBlurred = profile.isBlurred && user?.membership?.tier === 'member'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogTitle className="text-xl font-bold text-center">
          {profile.displayName || profile.username}
        </DialogTitle>
        
        <div className="space-y-4">
          {/* Profile Image */}
          <div className="relative">
            <Avatar className="w-32 h-32 mx-auto">
              <AvatarImage 
                src={mainImage} 
                alt={profile.displayName || profile.username}
                className={isBlurred ? 'blur-sm' : ''}
              />
              <AvatarFallback>
                {profile.displayName?.[0] || profile.username?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            
            {isBlurred && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  onClick={() => onPayment(profile._id, profile.profileImages?.[0])}
                  className="bg-pink-500 hover:bg-pink-600"
                >
                  Unlock Profile
                </Button>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">
              {profile.displayName || profile.username}
            </h3>
            
            {profile.age && (
              <p className="text-gray-600">{profile.age} years old</p>
            )}
            
            {profile.location && (
              <p className="text-gray-600">{profile.location}</p>
            )}
            
            {profile.membership?.tier && (
              <Badge variant="secondary">
                {profile.membership.tier.toUpperCase()}
              </Badge>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="text-center">
              <p className="text-gray-700">{profile.bio}</p>
            </div>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Interests:</h4>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest: string, index: number) => (
                  <Badge key={index} variant="outline">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => onLike(profile._id)}
              variant={isLiked ? "default" : "outline"}
              className="flex-1"
            >
              {isLiked ? '❤️ Liked' : '🤍 Like'}
            </Button>
            
            {canChat && (
              <Button
                onClick={() => onChat(profile._id)}
                className="flex-1"
              >
                💬 Chat
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
