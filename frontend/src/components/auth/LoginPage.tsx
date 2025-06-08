"use client";

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Checkbox } from '@heroui/react';
import CustomModal from '@/components/common/CustomModal';
import { useAuth } from '@/contexts/AuthContext';

const LoginPage: React.FC = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isChecked, setIsChecked] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { login, setPhoneNumber: setAuthPhoneNumber } = useAuth();

    const handleNext = async () => {
        if (!phoneNumber) {
            setError('لطفاً شماره موبایل خود را وارد کنید.');
            return;
        }

        if (!isChecked) {
            setError('لطفاً شرایط و قوانین را بپذیرید.');
            return;
        }

        // Format phone number if needed (e.g., add country code)
        const formattedPhoneNumber = phoneNumber.startsWith('+') 
            ? phoneNumber 
            : (phoneNumber.startsWith('0') ? '+98' + phoneNumber.substring(1) : '+98' + phoneNumber);

        try {
            setIsLoading(true);
            setError(null);
            
            // Call the login function from auth context
            const success = await login(formattedPhoneNumber, 'CUSTOMER');
            
            if (success) {
                // Store phone number in auth context for OTP verification
                setAuthPhoneNumber(formattedPhoneNumber);
                router.push('/auth/otp');
            } else {
                setError('خطا در ارسال کد تایید. لطفا دوباره تلاش کنید.');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('خطایی رخ داد. لطفا دوباره تلاش کنید.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <h1 className="text-2xl font-bold mb-4">ورود به حساب کاربری</h1>
            <p className='text-black text-xs py-3'>لطفا شماره موبایل خود را وارد کنید</p>
            
            {error && (
                <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}
            
            <input
                type="tel"
                placeholder="شماره موبایل"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="border rounded w-full p-2 mb-4 text-right"
                required
            />
            <div className="flex items-start pb-5">
                <Checkbox
                    id="terms"
                    className="text-primary"
                    checked={isChecked}
                    onChange={() => setIsChecked(!isChecked)}
                />
                <label htmlFor="terms" className="text-gray-700 text-xs">
                    ورود شما به منزله پذیرفتن <span className='text-blue-600 cursor-pointer' onClick={() => setIsTermsModalOpen(true)}>شرایط و قوانین</span> است
                </label>
            </div>
            <button
                onClick={handleNext}
                className={`bg-red-600 text-white p-3 fixed bottom-0 right-0 w-full ${
                    !isChecked || isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={!isChecked || isLoading}
            >
                {isLoading ? 'در حال ارسال کد...' : 'ادامه'}
            </button>

            {/* Terms and Conditions Modal */}
            <CustomModal
                isOpen={isTermsModalOpen}
                onClose={() => setIsTermsModalOpen(false)}
                title="شرایط و قوانین"
                submitLabel='قبول دارم'
                onSubmit={() => {
                    setIsChecked(true);
                    setIsTermsModalOpen(false);
                }}
            >
                <div className="space-y-4 text-sm">
                    <p>به باهم خوش آمدید. استفاده از خدمات این سایت به معنی موافقت با شرایط زیر است:</p>
                    
                    <h3 className="font-bold">قوانین استفاده</h3>
                    <p>کاربران ملزم به رعایت قوانین و مقررات جمهوری اسلامی ایران هستند.</p>
                    <p>هرگونه استفاده غیرمجاز از سایت ممنوع بوده و پیگرد قانونی دارد.</p>
                    
                    <h3 className="font-bold">حریم خصوصی</h3>
                    <p>اطلاعات شخصی شما با رعایت اصول امنیتی نگهداری می‌شود.</p>
                    <p>باهم متعهد به حفظ حریم خصوصی کاربران خود است.</p>
                    
                    <h3 className="font-bold">خرید و پرداخت</h3>
                    <p>کلیه تراکنش‌های مالی به صورت امن و از طریق درگاه‌های بانکی معتبر انجام می‌شود.</p>
                    <p>در صورت انصراف از خرید، مبلغ پرداختی مطابق قوانین کشور به حساب شما بازگردانده می‌شود.</p>
                </div>
            </CustomModal>
        </div>
    );
};

export default LoginPage;