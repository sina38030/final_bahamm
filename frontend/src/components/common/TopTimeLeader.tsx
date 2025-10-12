import React, { useState, useEffect } from 'react';
import PrevPage from './PrevPage';
import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation'; // Import useRouter

function TopTimeLeader() {
    const router = useRouter(); // Initialize useRouter
    const [timeLeft, setTimeLeft] = useState(24 * 60 * 60); // 24 hours in seconds

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 0) {
                    clearInterval(timer);
                    return 0; // Stop the timer at 0
                }
                return prevTime - 1; // Decrease time by 1 second
            });
        }, 1000); // Update every second

        return () => clearInterval(timer); // Cleanup on unmount
    }, []);

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const handleInviteFriends = () => {
        router.push('/tracking'); // Navigate to the tracking page
    };

    return (
        <div className='min-h-fit bg-white border p-2 border-black space-y-3 m-1 rounded-sm'>
            <div className='flex items-center justify-between text-xs font-bold' onClick={handleInviteFriends}>
                <p>زمان باقیمانده برای تشکیل گروه: </p>
                <p>{formatTime(timeLeft)}</p>
            </div>
            <Button 
                className='bg-red-600 text-white flex mx-auto text-xs'
                 // Attach the click handler
            >
                دعوت دوستان
            </Button>
        </div>
    );
}

export default TopTimeLeader;