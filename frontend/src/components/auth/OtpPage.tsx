"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const OtpPage: React.FC = () => {
    const [otp, setOtp] = useState(['', '', '', '', '']);
    const [timeLeft, setTimeLeft] = useState(120); // 2 minutes countdown
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { verifyOtp, phoneNumber, login } = useAuth();

    // Timer countdown effect
    useEffect(() => {
        if (timeLeft <= 0) return;
        
        const timer = setTimeout(() => {
            setTimeLeft(timeLeft - 1);
        }, 1000);
        
        return () => clearTimeout(timer);
    }, [timeLeft]);

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleChange = (index: number, value: string) => {
        // Update OTP input
        const newOtp = [...otp];
        newOtp[index] = value.replace(/\D/g, ''); // Only allow digits
        setOtp(newOtp);

        // Auto-focus to next input
        if (value && index < otp.length - 1) {
            const nextInput = document.getElementById(`otp-input-${index + 1}`);
            if (nextInput) {
                nextInput.focus();
            }
        }
    };

    const handleResendCode = async () => {
        if (!phoneNumber) {
            setError('شماره موبایل نامعتبر است. لطفا بازگردید و دوباره تلاش کنید.');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            
            // Call login again to request a new code
            const success = await login(phoneNumber, 'CUSTOMER');
            
            if (success) {
                // Reset OTP inputs and timer
                setOtp(['', '', '', '', '']);
                setTimeLeft(120);
                setError(null);
            } else {
                setError('خطا در ارسال مجدد کد. لطفا دوباره تلاش کنید.');
            }
        } catch (error) {
            console.error('Error resending code:', error);
            setError('خطایی رخ داد. لطفا دوباره تلاش کنید.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        const otpCode = otp.join('');
        
        if (otpCode.length !== 5) {
            setError('لطفا کد 5 رقمی را کامل وارد کنید.');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            
            // Verify OTP with auth context
            const success = await verifyOtp(otpCode);
            
            if (success) {
                router.push('/');
            } else {
                setError('کد وارد شده اشتباه است یا منقضی شده است.');
                setOtp(['', '', '', '', '']);
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            setError('خطایی رخ داد. لطفا دوباره تلاش کنید.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <h1 className="text-2xl font-bold mb-4">کد تایید</h1>
            <p className="text-sm text-gray-600 mb-6">
                کد تایید به شماره {phoneNumber} ارسال شد.
            </p>

            {error && (
                <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}
            
            <div className="flex w-full gap-2 justify-center mb-6" dir='ltr'>
                {otp.map((value, index) => (
                    <input
                        key={index}
                        id={`otp-input-${index}`}
                        type="text"
                        placeholder="0"
                        value={value}
                        onChange={(e) => handleChange(index, e.target.value)}
                        className="border rounded w-12 h-12 text-center"
                        maxLength={1}
                        disabled={isLoading}
                    />
                ))}
            </div>

            <div className="mb-8 text-center">
                <p className="text-sm text-gray-500 mb-2">
                    {timeLeft > 0 ? (
                        <>زمان باقیمانده: {formatTime(timeLeft)}</>
                    ) : (
                        <>کد منقضی شده است.</>
                    )}
                </p>
                <button
                    onClick={handleResendCode}
                    disabled={timeLeft > 0 || isLoading}
                    className={`text-blue-600 text-sm ${
                        (timeLeft > 0 || isLoading) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    ارسال مجدد کد
                </button>
            </div>
            
            <button
                onClick={handleSubmit}
                className={`bg-red-600 text-white p-3 fixed bottom-0 right-0 w-full ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isLoading}
            >
                {isLoading ? 'در حال بررسی...' : 'تأیید'}
            </button>
        </div>
    );
};

export default OtpPage;