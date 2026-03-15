import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { Heart, Search, MessageCircle, User, Crown, Trophy } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faSearch, 
  faHeart, 
  faComments, 
  faUser, 
  faGem,
  faHeadphones
} from '@fortawesome/free-solid-svg-icons'
import type { TabType } from '../types'

interface TabNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  unreadCount: number
  isAuthenticated: boolean
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  unreadCount,
  isAuthenticated
}) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-5 sm:grid-cols-7 lg:grid-cols-8 h-12 sm:h-14 bg-white/90 backdrop-blur-md border border-gray-200/50 shadow-lg rounded-xl sm:rounded-2xl mx-2 sm:mx-4 mb-4 sm:mb-6">
        {/* Discover Tab */}
        <TabsTrigger 
          value="discover" 
          className="flex flex-col items-center justify-center space-y-1 px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-300 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 data-[state=active]:shadow-md hover:bg-pink-50 hover:text-pink-600 rounded-lg"
        >
          <FontAwesomeIcon 
            icon={faSearch} 
            className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 ${activeTab === 'discover' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
          />
          <span className="hidden sm:block">ค้นหา</span>
        </TabsTrigger>

        {/* Matches Tab */}
        <TabsTrigger 
          value="matches" 
          className="flex flex-col items-center justify-center space-y-1 px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-300 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 data-[state=active]:shadow-md hover:bg-pink-50 hover:text-pink-600 rounded-lg"
        >
          <Heart 
            className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 ${activeTab === 'matches' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
          />
          <span className="hidden sm:block">แมทช์</span>
        </TabsTrigger>

        {/* Messages Tab */}
        <TabsTrigger 
          value="messages" 
          className="flex flex-col items-center justify-center space-y-1 px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-300 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 data-[state=active]:shadow-md hover:bg-pink-50 hover:text-pink-600 rounded-lg relative"
        >
          <div className="relative">
            <FontAwesomeIcon 
              icon={faComments} 
              className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 ${activeTab === 'messages' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
            />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="hidden sm:block">ข้อความ</span>
        </TabsTrigger>

        {/* Stream Tab */}
        <TabsTrigger 
          value="stream" 
          className="flex flex-col items-center justify-center space-y-1 px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-300 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 data-[state=active]:shadow-md hover:bg-pink-50 hover:text-pink-600 rounded-lg"
        >
          <FontAwesomeIcon 
            icon={faHeadphones} 
            className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 ${activeTab === 'stream' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
          />
          <span className="hidden sm:block">สตรีม</span>
        </TabsTrigger>

        {/* Ranking Tab */}
        <TabsTrigger 
          value="ranking" 
          className="flex flex-col items-center justify-center space-y-1 px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-300 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 data-[state=active]:shadow-md hover:bg-pink-50 hover:text-pink-600 rounded-lg"
        >
          <Trophy 
            className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 ${activeTab === 'ranking' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
          />
          <span className="hidden sm:block">อันดับ</span>
        </TabsTrigger>

        {/* Membership Tab */}
        <TabsTrigger 
          value="membership" 
          className="flex flex-col items-center justify-center space-y-1 px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-300 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 data-[state=active]:shadow-md hover:bg-pink-50 hover:text-pink-600 rounded-lg"
        >
          <Crown 
            className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 ${activeTab === 'membership' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
          />
          <span className="hidden sm:block">สมาชิก</span>
        </TabsTrigger>

        {/* Profile Tab */}
        <TabsTrigger 
          value="profile" 
          className="flex flex-col items-center justify-center space-y-1 px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-300 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 data-[state=active]:shadow-md hover:bg-pink-50 hover:text-pink-600 rounded-lg"
        >
          <User 
            className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 ${activeTab === 'profile' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
          />
          <span className="hidden sm:block">โปรไฟล์</span>
        </TabsTrigger>

        {/* Payment Tab - Only show for authenticated users */}
        {isAuthenticated && (
          <TabsTrigger 
            value="payment" 
            className="flex flex-col items-center justify-center space-y-1 px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-300 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 data-[state=active]:shadow-md hover:bg-pink-50 hover:text-pink-600 rounded-lg"
          >
            <FontAwesomeIcon 
              icon={faGem} 
              className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 ${activeTab === 'payment' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
            />
            <span className="hidden sm:block">ชำระเงิน</span>
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  )
}
