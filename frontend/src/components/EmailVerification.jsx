import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from './ui/toast';
import { Mail, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

const EmailVerification = ({ isOpen, onClose, email, onVerified }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15 * 60); // 15 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const { success, error: showError } = useToast();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeRemaining <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeRemaining]);

  // Reset timer when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeRemaining(15 * 60);
      setCanResend(false);
      setCode('');
    }
  }, [isOpen]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!code || code.length !== 6) {
      showError('กรุณากรอกรหัสยืนยัน 6 หลัก');
      return;
    }

    console.log('🔐 Verifying email code');
    console.log('📧 Email:', email);
    console.log('🔐 Code entered:', code);

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();
      console.log('📥 Verify response:', data);

      if (data.success) {
        success('ยืนยันอีเมลสำเร็จ!');
        
        // Save token and user data
        if (data.data.token) {
          localStorage.setItem('token', data.data.token);
        }
        if (data.data.user) {
          localStorage.setItem('user', JSON.stringify(data.data.user));
        }

        // Call onVerified callback
        if (onVerified) {
          onVerified(data.data);
        }

        onClose();
      } else {
        showError(data.message || 'รหัสยืนยันไม่ถูกต้อง');
        
        // If expired, allow resend
        if (data.expired) {
          setCanResend(true);
          setTimeRemaining(0);
        }
      }
    } catch (error) {
      console.error('Verify email error:', error);
      showError('เกิดข้อผิดพลาดในการยืนยันอีเมล');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) {
      return;
    }

    setResendLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        success('ส่งรหัสยืนยันใหม่ไปที่อีเมลของคุณแล้ว');
        setTimeRemaining(15 * 60);
        setCanResend(false);
        setCode('');
      } else {
        if (data.retryAfter) {
          showError(`กรุณารอ ${data.retryAfter} วินาที ก่อนขอรหัสใหม่`);
          setTimeRemaining(data.retryAfter);
          setCanResend(false);
        } else {
          showError(data.message || 'ไม่สามารถส่งรหัสยืนยันได้');
        }
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      showError('เกิดข้อผิดพลาดในการส่งรหัสยืนยัน');
    } finally {
      setResendLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            ยืนยันอีเมลของคุณ
          </DialogTitle>
          <DialogDescription className="text-center mt-2">
            เราได้ส่งรหัสยืนยันไปที่
            <br />
            <span className="font-semibold text-gray-900">{email}</span>
            <br />
            กรุณากรอกรหัสยืนยัน 6 หลัก
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รหัสยืนยัน
            </label>
            <Input
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl font-mono tracking-widest h-14 text-lg"
              autoFocus
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-2 text-center">
              กรุณากรอกรหัส 6 หลักที่ได้รับจากอีเมล
            </p>
          </div>

          {/* Timer */}
          {!canResend && timeRemaining > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>รหัสยืนยันจะหมดอายุใน {formatTime(timeRemaining)}</span>
            </div>
          )}

          {/* Resend button */}
          {canResend && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                ไม่ได้รับรหัสยืนยัน?
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={resendLoading}
                className="w-full"
              >
                {resendLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    กำลังส่ง...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    ส่งรหัสใหม่
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Verify button */}
          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                กำลังยืนยัน...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                ยืนยันอีเมล
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            ปิดหน้าต่างนี้
          </button>
          <p className="text-xs text-gray-400 mt-2">
            (แนะนำให้ยืนยันอีเมลก่อนเพื่อเข้าสู่ระบบ)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailVerification;

