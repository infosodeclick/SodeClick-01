import React from 'react';
import { Trophy, TrendingUp, Users, Heart } from 'lucide-react';
import VoteRanking from './VoteRanking';

const VoteRankingPage = ({ onUserProfileClick = null }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 rounded-full">
              <Trophy className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🏆 อันดับความนิยม
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            ค้นพบและโหวตให้กับสมาชิกที่คุณชื่นชอบ ❤️ แต่ละคนสามารถโหวตได้เพียง 1 ครั้งเท่านั้น
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-pink-100">
            <div className="flex items-center space-x-4">
              <div className="bg-pink-100 p-3 rounded-full">
                <Heart className="h-8 w-8 text-pink-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">การโหวต</h3>
                <p className="text-gray-600">1 คน = 1 โหวต</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">อันดับ</h3>
                <p className="text-gray-600">อัพเดทแบบเรียลไทม์</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-indigo-100">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-100 p-3 rounded-full">
                <Users className="h-8 w-8 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">ประเภท</h3>
                <p className="text-gray-600">ชาย + หญิง รวมกัน</p>
              </div>
            </div>
          </div>
        </div>

        {/* Combined Ranking Section */}
        <div className="grid grid-cols-1 gap-8">
          
          {/* Combined Ranking */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gradient-to-r from-blue-100 to-pink-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-gradient-to-r from-blue-100 to-pink-100 p-2 rounded-full">
                <Trophy className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-purple-900">
                🏆 อันดับความนิยมรวม (ชาย + หญิง)
              </h2>
            </div>
            <VoteRanking
              voteType="popularity_combined"
              period="all"
              limit={20}
              showFilters={true}
              className="space-y-3"
              onUserProfileClick={onUserProfileClick}
            />
          </div>
        </div>

        {/* How to Vote Section */}
        <div className="mt-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-8 text-white">
          <div className="text-center">
            <Heart className="h-16 w-16 mx-auto mb-6 text-pink-200" />
            <h2 className="text-3xl font-bold mb-4">วิธีการโหวต</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="bg-white bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">เข้าชมโปรไฟล์</h3>
                <p className="text-pink-100">เยี่ยมชมโปรไฟล์ของสมาชิกที่คุณชื่นชอบ</p>
              </div>
              <div className="text-center">
                <div className="bg-white bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">กดหัวใจ</h3>
                <p className="text-pink-100">คลิกที่ไอคอนหัวใจเพื่อโหวต (1 คน 1 โหวต)</p>
              </div>
              <div className="text-center">
                <div className="bg-white bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">ดูอันดับ</h3>
                <p className="text-pink-100">ติดตามอันดับความนิยมแบบเรียลไทม์</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VoteRankingPage;
