import React, { useState } from 'react'
import { Wrench, Lock, Eye, EyeOff, CheckCircle, XCircle, Server, Shield } from 'lucide-react'

interface MaintenanceModeProps {
  onDevAccess: (code: string) => void
  hasDevAccess?: boolean
}

const MaintenanceMode: React.FC<MaintenanceModeProps> = ({ onDevAccess, hasDevAccess = false }) => {
  const [devCode, setDevCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // ตรวจสอบรหัส dev
      if (devCode === 'DEV2025LOVE') {
        onDevAccess(devCode)
      } else {
        setError('รหัสเข้าถึงไม่ถูกต้อง')
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเข้าถึง')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-60 h-60 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse"></div>
      </div>

      {/* Floating Icons */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 text-4xl opacity-10 animate-bounce">🔧</div>
        <div className="absolute top-1/3 right-1/4 text-5xl opacity-15 animate-bounce delay-1000">⚙️</div>
        <div className="absolute bottom-1/3 left-1/3 text-6xl opacity-10 animate-bounce delay-2000">🛠️</div>
        <div className="absolute bottom-1/4 right-1/3 text-3xl opacity-20 animate-bounce delay-3000">🔨</div>
        <div className="absolute top-1/2 left-1/6 text-4xl opacity-15 animate-bounce delay-4000">⚡</div>
        <div className="absolute top-3/4 right-1/6 text-5xl opacity-10 animate-bounce delay-5000">🌟</div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4 animate-pulse">
              <Wrench className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              กำลังบำรุงรักษา
            </h1>
            <p className="text-gray-300 text-sm leading-relaxed">
              ระบบกำลังอยู่ในโหมดบำรุงรักษา<br />
              {hasDevAccess ? (
                <>
                  <span className="text-green-400 font-medium">คุณมีสิทธิ์เข้าถึงระบบแล้ว</span><br />
                  หน้า Maintenance Mode จะยังคงแสดงอยู่จนกว่า Admin จะปิดระบบ
                </>
              ) : (
                'กรุณารอสักครู่ เราจะกลับมาเร็วๆ นี้'
              )}
            </p>
          </div>

          {/* Status Indicators */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-2 bg-orange-500/20 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-orange-300 text-sm font-medium">
                  ระบบปิดใช้งานชั่วคราว
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 bg-green-500/20 rounded-lg px-3 py-2">
                <Server className="w-4 h-4 text-green-400" />
                <span className="text-green-300 text-xs">Server Online</span>
              </div>
              <div className="flex items-center space-x-2 bg-blue-500/20 rounded-lg px-3 py-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-blue-300 text-xs">Security Active</span>
              </div>
            </div>
          </div>

          {/* Dev Access Section */}
          <div className="bg-black/20 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center space-x-2 mb-4">
              <Lock className="w-5 h-5 text-purple-400" />
              <h3 className="text-white font-semibold">เข้าถึงสำหรับ Developer</h3>
            </div>
            
            {hasDevAccess && (
              <div className="mb-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="flex items-center space-x-2 text-green-400 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">คุณมีสิทธิ์เข้าถึงระบบแล้ว</span>
                </div>
                <p className="text-green-300 text-xs mb-3">
                  หน้า Maintenance Mode ยังคงแสดงอยู่จนกว่า Admin จะปิดระบบ
                </p>
                <button
                  onClick={() => {
                    // Clear dev access and set flag to bypass maintenance check
                    localStorage.removeItem('devAccess');
                    localStorage.setItem('bypassMaintenance', 'true');
                    window.location.href = '/';
                  }}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                >
                  เข้าสู่ระบบปกติ
                </button>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={devCode}
                  onChange={(e) => setDevCode(e.target.value)}
                  placeholder="กรอกรหัสเข้าถึง"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-400 text-sm">
                  <XCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !devCode || hasDevAccess}
                className={`w-full font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                  hasDevAccess 
                    ? 'bg-green-500/50 text-green-200 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 text-white'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>กำลังเข้าถึง...</span>
                  </>
                ) : hasDevAccess ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>เข้าถึงแล้ว</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>เข้าถึงระบบ</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

        {/* Additional Info Card */}
        <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="text-center">
            <h4 className="text-white font-semibold mb-2">ข้อมูลการบำรุงรักษา</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-white/10 rounded-lg p-2">
                <div className="text-gray-300">เริ่มวันที่</div>
                <div className="text-white font-medium">09/2025</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2">
                <div className="text-gray-300">คาดการณ์เสร็จ</div>
                <div className="text-white font-medium">30/09/2025</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MaintenanceMode