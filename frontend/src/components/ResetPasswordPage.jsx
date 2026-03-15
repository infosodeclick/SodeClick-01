import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from './ui/toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const ResetPasswordPage = () => {
  console.log('🔍 [ResetPasswordPage] Component rendered');
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (resetToken) {
      setToken(resetToken);
      verifyToken(resetToken);
    } else {
      setError('ไม่พบ Token สำหรับรีเซ็ตรหัสผ่าน');
      showErrorToast('ไม่พบ Token สำหรับรีเซ็ตรหัสผ่าน');
      setLoading(false);
    }
  }, [searchParams]);

  const verifyToken = async (resetToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password/verify/${resetToken}`);
      const data = await response.json();

      if (data.success) {
        setIsTokenValid(true);
      } else {
        setError(data.message || 'Token ไม่ถูกต้องหรือหมดอายุแล้ว');
        showErrorToast(data.message || 'Token ไม่ถูกต้องหรือหมดอายุแล้ว');
      }
    } catch (err) {
      console.error('Verify token error:', err);
      setError('เกิดข้อผิดพลาดในการตรวจสอบ Token');
      showErrorToast('เกิดข้อผิดพลาดในการตรวจสอบ Token');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (newPassword.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return false;
    }
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const isEnglishOnly = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      setError('รหัสผ่านต้องมีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข');
      return false;
    }
    if (!isEnglishOnly) {
      setError('รหัสผ่านต้องเป็นภาษาอังกฤษเท่านั้น');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setResetSuccess(true);
        showSuccessToast('เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/?login=true');
        }, 2000);
      } else {
        const errorMessage = data.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน';
        setError(errorMessage);
        showErrorToast(errorMessage);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      const errorMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง';
      setError(errorMessage);
      showErrorToast(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/?login=true');
  };

  console.log('🔍 [ResetPasswordPage] Rendering UI, loading:', loading, 'error:', error, 'isTokenValid:', isTokenValid, 'resetSuccess:', resetSuccess);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-6 border border-gray-200">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">รีเซ็ตรหัสผ่าน</h2>
          <p className="text-gray-600">ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-10 w-10 text-pink-500 animate-spin mb-4" />
            <p className="text-gray-600">กำลังตรวจสอบลิงก์...</p>
          </div>
        ) : error && !isTokenValid ? (
          <div className="text-center space-y-4 py-6">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
            <h3 className="text-xl font-semibold text-red-700">เกิดข้อผิดพลาด</h3>
            <p className="text-gray-600">{error}</p>
            <Button
              onClick={handleBackToLogin}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              กลับไปหน้าเข้าสู่ระบบ
            </Button>
          </div>
        ) : resetSuccess ? (
          <div className="text-center space-y-4 py-6">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h3 className="text-xl font-semibold text-green-700">เปลี่ยนรหัสผ่านสำเร็จ!</h3>
            <p className="text-gray-600">คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว</p>
            <Button
              onClick={handleBackToLogin}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              ไปที่หน้าเข้าสู่ระบบ
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="กรอกรหัสผ่านใหม่"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError('');
                  }}
                  className="pl-10 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="ยืนยันรหัสผ่านใหม่"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  className="pl-10 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังเปลี่ยนรหัสผ่าน...
                </>
              ) : (
                'เปลี่ยนรหัสผ่าน'
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;

