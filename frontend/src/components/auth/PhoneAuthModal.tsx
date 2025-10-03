'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PhoneAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PhoneAuthModal({ isOpen, onClose, onSuccess }: PhoneAuthModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone'); // Track current step
  const [countdown, setCountdown] = useState(0);
  const { setAuthData } = useAuth();

  // Send verification code
  const sendVerificationCode = async () => {
    if (!phoneNumber.trim()) {
      setError('لطفا شماره تلفن خود را وارد کنید');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError('شماره تلفن باید با 09 شروع شده و 11 رقم باشد');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/api/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          user_type: 'CUSTOMER'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Verification code sent:', data);
        
        // Check if we're in fallback mode (SMS failed)
        if (data.fallback_mode && data.test_code) {
          setError(`${data.message}\nکد تایید: ${data.test_code}`);
          console.log('SMS failed, fallback code provided:', data.test_code);
        } else {
          setError(''); // Clear any previous errors
        }
        
        setStep('code');
        setCountdown(120); // 2 minutes countdown
        startCountdown();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'خطا در ارسال کد تایید');
      }
    } catch (error) {
      console.error('Send verification error:', error);
      setError('خطا در اتصال به سرور');
    } finally {
      setLoading(false);
    }
  };

  // Verify code and complete authentication
  const verifyCode = async () => {
    if (!verificationCode.trim()) {
      setError('لطفا کد تایید را وارد کنید');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          verification_code: verificationCode
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Use the AuthContext method to set authentication data
        setAuthData(data.access_token, { phone_number: phoneNumber });
        
        onSuccess();
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'کد تایید اشتباه است');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError('خطا در اتصال به سرور');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 'phone') {
      await sendVerificationCode();
    } else {
      await verifyCode();
    }
  };

  // Countdown timer
  const startCountdown = () => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle modal close
  const handleClose = () => {
    setStep('phone');
    setPhoneNumber('');
    setVerificationCode('');
    setError('');
    setCountdown(0);
    onClose();
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Limit to 11 digits
    const limited = digits.slice(0, 11);
    
    // Format as 09XX XXX XXXX
    if (limited.length > 7) {
      return `${limited.slice(0, 4)} ${limited.slice(4, 7)} ${limited.slice(7)}`;
    } else if (limited.length > 4) {
      return `${limited.slice(0, 4)} ${limited.slice(4)}`;
    }
    return limited;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhoneNumber(digitsOnly);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-20 z-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="p-6">
          {/* Handle bar */}
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>
          
          {step === 'phone' ? (
            <>
              <h2 className="text-xl font-bold text-center mb-2">ورود با شماره تلفن</h2>
              <p className="text-gray-600 text-center mb-6">
                برای ادامه خرید، لطفا شماره تلفن خود را وارد کنید
              </p>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    شماره تلفن
                  </label>
                  <input
                    type="tel"
                    placeholder="09XX XXX XXXX"
                    value={formatPhoneNumber(phoneNumber)}
                    onChange={handlePhoneChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-center text-lg"
                    disabled={loading}
                    maxLength={13} // With spaces: 09XX XXX XXXX
                    dir="ltr"
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-red-700 text-sm text-center">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    disabled={loading}
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors disabled:opacity-50"
                    disabled={loading || !phoneNumber.trim()}
                  >
                    {loading ? 'در حال ارسال...' : 'ارسال کد'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-center mb-2">کد تایید</h2>
              <p className="text-gray-600 text-center mb-6">
                کد تایید به شماره {phoneNumber} ارسال شد
              </p>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    کد تایید
                  </label>
                  <input
                    type="text"
                    placeholder="کد 5 رقمی"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-center text-lg tracking-widest"
                    disabled={loading}
                    maxLength={5}
                    dir="ltr"
                  />
                </div>

                {countdown > 0 && (
                  <p className="text-sm text-gray-500 text-center mb-4">
                    ارسال مجدد کد تا {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')} دقیقه
                  </p>
                )}

                {countdown === 0 && (
                  <button
                    type="button"
                    onClick={sendVerificationCode}
                    className="w-full text-pink-500 text-sm mb-4 hover:text-pink-600"
                    disabled={loading}
                  >
                    ارسال مجدد کد
                  </button>
                )}

                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-red-700 text-sm text-center">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    disabled={loading}
                  >
                    بازگشت
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors disabled:opacity-50"
                    disabled={loading || verificationCode.length !== 5}
                  >
                    {loading ? 'در حال تایید...' : 'تایید'}
                  </button>
                </div>
              </form>
            </>
          )}

          <p className="text-xs text-gray-500 text-center mt-4">
            با ادامه، شما با قوانین و مقررات موافقت می‌کنید
          </p>
        </div>
      </div>
    </>
  );
} 