"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@heroui/react';
import PrevPage from '@/components/common/PrevPage';
import { useRouter } from 'next/navigation';
import CustomModal from '@/components/common/CustomModal'; // Import CustomModal

export default function Page() {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false); // State for the confirmation modal

    // Timer state
    const [timeLeft, setTimeLeft] = useState({ hours: 22, minutes: 13, seconds: 24 });

    useEffect(() => {
        // Set up the timer
        const timer = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime.hours === 0 && prevTime.minutes === 0 && prevTime.seconds === 0) {
                    clearInterval(timer); // Clear timer when it reaches zero
                    return prevTime; // Return the same time to avoid negative values
                }

                // Calculate new time
                let newHours = prevTime.hours;
                let newMinutes = prevTime.minutes;
                let newSeconds = prevTime.seconds - 1;

                if (newSeconds < 0) {
                    newSeconds = 59;
                    newMinutes -= 1;
                }
                if (newMinutes < 0) {
                    newMinutes = 59;
                    newHours -= 1;
                }

                return { hours: newHours, minutes: newMinutes, seconds: newSeconds };
            });
        }, 1000);

        return () => clearInterval(timer); // Cleanup on unmount
    }, []);

    const handleCompleteGroup = () => {
        setIsModalOpen(true); // Open the confirmation modal
    };

    const handleConfirm = () => {
        setIsModalOpen(false); // Close the modal
        router.push('/three-lead-checkout'); // Navigate to the next page
    };

    const handleShare = async () => {
        const shareData = {
            title: 'دعوت به گروه',
            text: 'به گروه ما بپیوندید!',
            url: window.location.href, // Current page URL
        };

        try {
            await navigator.share(shareData);
            console.log('Shared successfully');
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[#CE4032] p-4">
            {/* Back Button */}
            <PrevPage title='' className='!bg-transparent pt-0 !mb-0 !pr-0' />

            {/* Product Title */}
            <div className="flex gap-10 items-center mb-10 border-b pb-5 border-black">
                <div className="bg-gray-200 w-20 h-20 rounded-lg">
                    <Image
                        src="/placeholder-image.jpg"
                        alt="Product"
                        width={80}
                        height={80}
                        className="rounded-lg"
                    />
                </div>
                <h1 className="text-white text-xl font-medium">بسته یک کیلویی ممتاز</h1>
            </div>

            {/* Price Info */}
            <div className="text-white mb-8">
                <p className="text-sm mb-4">قیمت از ۲۰۰ هزار تومان به ۱۳۴ هزار تومان کاهش یافت!</p>
                
                {/* Group Info */}
                <div className="flex justify-between mb-2 text-sm">
                    <span>  2 نفر درگروه</span>
                    <span>4 نفر درگروه</span>
                </div>

                {/* Progress Bar */}
                <div className="relative h-6 bg-white/20 rounded-full mb-2">
                    <div className="absolute right-0 top-0 h-full w-[60%] bg-yellow-300 rounded-full"></div>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs bg-green-500 px-2 rounded">
                        رایگان
                    </div>
                </div>
            </div>

            {/* Timer */}
            <p className="text-white text-sm text-center mb-8">
                زمان باقیمانده برای تشکیل گروه: {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
            </p>

            {/* Group Members */}
            <div className="mb-6">
                <h2 className="text-white mb-4">لیست اعضای گروه</h2>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full"></div>
                        <p className="text-white">@ali221</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full"></div>
                        <p className="text-white">@saeed_a2</p>
                    </div>
                </div>
            </div>

            {/* Complete Group Button */}
            <button className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-medium" onClick={handleCompleteGroup}>
                اعلام تکمیل گروه
            </button>

            {/* Confirmation Modal */}
            <CustomModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="تأیید ایجاد گروه"
                submitLabel="تأیید"
                onSubmit={handleConfirm}
            >
                <p>آیا مطمئن هستید که می‌خواهید گروه را ایجاد کنید؟</p>
            </CustomModal>
        </div>
    );
}