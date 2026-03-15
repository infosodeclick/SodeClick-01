import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from './ui/toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userNotFound, setUserNotFound] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!emailOrPhone) {
      setError('กรุณากรอกอีเมลหรือเบอร์โทรศัพท์');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{9,10}$/;
    const cleanPhone = emailOrPhone.replace(/[-\s]/g, '');
    
    if (!emailRegex.test(emailOrPhone) && !phoneRegex.test(cleanPhone)) {
      setError('กรุณากรอกอีเมลหรือเบอร์โทรศัพท์ที่ถูกต้อง');
      return;
    }

    setLoading(true);
    setError('');
    setUserNotFound(false);

    try {
      console.log('📧 [FRONTEND] Calling forgot-password API...');
      console.log('   URL:', `${API_BASE_URL}/api/auth/forgot-password`);
      console.log('   emailOrPhone:', emailOrPhone);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emailOrPhone })
      });

      console.log('📧 [FRONTEND] Response status:', response.status);
      const data = await response.json();
      console.log('📧 [FRONTEND] Response data:', data);

      if (data.success) {
        setSuccess(true);
        setEmailOrPhone('');
        showSuccessToast('ส่งลิงก์รีเซ็ตรหัสผ่านสำเร็จ กรุณาตรวจสอบอีเมลของคุณ');
      } else {
        if (response.status === 404) {
          const errorMessage = data.message || 'ไม่พบอีเมลหรือเบอร์โทรศัพท์นี้ในระบบ';
          setError(errorMessage);
          setUserNotFound(true);
          showErrorToast(errorMessage);
        } else {
          const errorMessage = data.message || 'เกิดข้อผิดพลาดในการส่งอีเมล กรุณาลองใหม่อีกครั้ง';
          setError(errorMessage);
          setUserNotFound(false);
          showErrorToast(errorMessage);
        }
      }
    } catch (err) {
      console.error('📧 [FRONTEND] Error:', err);
      const errorMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง';
      setError(errorMessage);
      showErrorToast(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmailOrPhone('');
    setError('');
    setSuccess(false);
    setUserNotFound(false);
    onClose();
  };

  const handleBackToLogin = () => {
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold text-gray-900">
            ลืมรหัสผ่าน
          </DialogTitle>
          <DialogDescription className="text-center">
            กรุณากรอกอีเมลหรือเบอร์โทรศัพท์ที่ใช้ในการลงทะเบียนเพื่อรีเซ็ตรหัสผ่าน
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <>
            {userNotFound ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-4 rounded-md border border-red-200">
                  <XCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
                <Button
                  type="button"
                  onClick={handleClose}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  ปิด
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emailOrPhone" className="text-sm font-medium text-gray-700">
                    อีเมลหรือเบอร์โทรศัพท์
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="emailOrPhone"
                      type="text"
                      placeholder="example@email.com หรือ 0812345678"
                      value={emailOrPhone}
                      onChange={(e) => {
                        setEmailOrPhone(e.target.value);
                        setError('');
                      }}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลของคุณ
                  </p>
                </div>

                {error && !userNotFound && (
                  <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {!error && (
                  <>
                    <Button
                      type="submit"
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          กำลังส่งอีเมล...
                        </>
                      ) : (
                        'ส่งลิงก์รีเซ็ตรหัสผ่าน'
                      )}
                    </Button>

                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={handleBackToLogin}
                        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-700 transition-colors"
                      >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        กลับไปหน้าเข้าสู่ระบบ
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                ส่งอีเมลเรียบร้อยแล้ว
              </h3>
              <p className="text-sm text-gray-600">
                เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลของคุณแล้ว<br />
                กรุณาตรวจสอบกล่องจดหมายและคลิกลิงก์ในอีเมลเพื่อรีเซ็ตรหัสผ่าน
              </p>
              <p className="text-xs text-gray-500 mt-2">
                ⚠️ ห้ามไปหน้าเปลี่ยนรหัสผ่านก่อนได้รับอีเมล กรุณาตรวจสอบอีเมลของคุณก่อน
              </p>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleClose}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                เข้าใจแล้ว
              </Button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-sm text-gray-600 hover:text-gray-700 transition-colors"
              >
                กลับไปหน้าเข้าสู่ระบบ
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordModal;
