import React from 'react'
import { Heart, Settings, LogIn, Bell } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell } from '@fortawesome/free-solid-svg-icons'
import { Button } from './ui/button'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { NotificationDropdown } from './NotificationDropdown'

interface HeaderProps {
  user: any
  isAuthenticated: boolean
  avatarUrl: string | null
  unreadCount: number
  notifications: any[]
  showProfileDropdown: boolean
  showNotificationDropdown: boolean
  onGoToHome: () => void
  onLogin: () => void
  onLogout: () => void
  onToggleProfileDropdown: () => void
  onToggleNotificationDropdown: () => void
  onClearAllNotifications: () => void
  onNotificationClick: (notification: any) => void
  onFetchNotifications: () => void
  isLoadingNotifications: boolean
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isAuthenticated,
  avatarUrl,
  unreadCount,
  notifications,
  showProfileDropdown,
  showNotificationDropdown,
  onGoToHome,
  onLogin,
  onLogout,
  onToggleProfileDropdown,
  onToggleNotificationDropdown,
  onClearAllNotifications,
  onNotificationClick,
  onFetchNotifications,
  isLoadingNotifications
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-lg">
      <div className="px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-12 sm:h-16">
          {/* Logo */}
          <button 
            onClick={onGoToHome}
            className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-pink-500 via-rose-500 to-violet-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg heart-beat">
              <Heart className="h-4 w-4 sm:h-6 sm:w-6 text-white" fill="white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl sm:text-2xl font-bold gradient-text">sodeclick</span>
              <div className="text-xs text-gray-600 -mt-1">Find Your Love ✨</div>
            </div>
            <div className="sm:hidden">
              <span className="text-lg font-bold gradient-text">sodeclick</span>
            </div>
          </button>
          
          {/* User Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {!isAuthenticated ? (
              <>
                {/* Mobile Login Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onLogin}
                  className="md:hidden border-pink-300 text-pink-600 hover:bg-pink-50 hover:border-pink-400 transition-colors"
                >
                  เข้าสู่ระบบ
                </Button>
                
                {/* Desktop Login Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onLogin}
                  className="hidden md:flex border-pink-300 text-pink-600 hover:bg-pink-50 hover:border-pink-400 transition-colors"
                >
                  เข้าสู่ระบบ
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Desktop: Show full user info */}
                <div className="hidden sm:flex items-center space-x-1 sm:space-x-2">
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                    <AvatarImage src={avatarUrl || undefined} alt="profile" />
                    <AvatarFallback className="text-xs sm:text-sm">{user?.firstName?.[0] || user?.username?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-700">สวัสดี, {user?.displayName || user?.firstName}</span>
                </div>
                
                {/* Mobile: Show profile icon with user info and dropdown */}
                <div className="sm:hidden relative profile-dropdown-container">
                  <Button 
                    variant="ghost" 
                    className="flex items-center space-x-2 px-2 py-1 rounded-lg hover:bg-gray-50"
                    onClick={onToggleProfileDropdown}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl || undefined} alt="profile" />
                      <AvatarFallback className="text-xs">{user?.firstName?.[0] || user?.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-900">{user?.firstName}</span>
                  </Button>
                  
                  {/* Dropdown Menu */}
                  {showProfileDropdown && (
                    <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px] z-50">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.displayName || user?.firstName}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      
                      {(user?.role === 'admin' || user?.role === 'superadmin') && (
                        <button
                          onClick={() => {
                            window.location.href = '/admin'
                            onToggleProfileDropdown()
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Admin
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          onLogout()
                          onToggleProfileDropdown()
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        ออกจากระบบ
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Desktop: Show admin and logout buttons */}
                <div className="flex items-center space-x-2">
                  {/* Desktop Notification Bell Button */}
                  <div className="relative notification-dropdown-container">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={onToggleNotificationDropdown}
                      className="relative p-2 hover:bg-gray-50 transition-colors"
                    >
                      <FontAwesomeIcon 
                        icon={faBell} 
                        className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 hover:text-pink-600 transition-colors" 
                      />
                      {/* Notification Badge */}
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                    
                    {/* Desktop Notification Dropdown */}
                    <NotificationDropdown
                      notifications={notifications}
                      unreadCount={unreadCount}
                      isOpen={showNotificationDropdown}
                      onClose={onToggleNotificationDropdown}
                      onClearAll={onClearAllNotifications}
                      onNotificationClick={onNotificationClick}
                    />
                  </div>
                  
                  {(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.location.href = '/admin'}
                      className="hidden sm:flex border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onLogout}
                    className="hidden sm:flex border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    ออกจากระบบ
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
