import Image from 'next/image';
import React from 'react';
import { FaChevronLeft } from 'react-icons/fa';
import useCountdown from '@/hooks/useCountdown';
import { useRouter } from 'next/navigation';

type OrderItemProps = {
    imageUrl: string;
    endTime: Date;
    leaderName: string;
}

export default function OrderItem({ imageUrl, endTime, leaderName }: OrderItemProps) {
    const router = useRouter(); // Initialize useRouter
    const timeLeft = useCountdown(endTime);

    const formatTime = (time: number) => time.toString().padStart(2, '0');

    const handleClick = () => {
        // Navigate to the tracking page
        router.push('/tracking'); // Adjust the path as necessary
    };

    return (
        <div
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
            onClick={handleClick} // Use the click handler
        >
            <div className="flex flex-col gap-2">
                <div>
                    <Image 
                        width={56} 
                        height={36} 
                        className='w-14 h-9 object-cover rounded-sm' 
                        src={imageUrl} 
                        alt="تصویر محصول" 
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">زمان باقیمانده:</span>
                    <span className="text-sm text-gray-600 font-mono">
                        {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">سرگروه:</span>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">{leaderName}@</span>
                </div>
            </div>
            <FaChevronLeft className="text-gray-400" />
        </div>
    );
}