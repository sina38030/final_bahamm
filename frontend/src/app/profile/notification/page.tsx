"use client"

import PrevPage from '@/components/common/PrevPage';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { useState } from 'react';

const notifications = [
    { store: 'فروشگاه ٓX', message: '[متن آخرین پیام]', pic: '' },
    { store: 'فروشگاه ٓX', message: '[متن آخرین پیام]', pic: '' },
    { store: 'فروشگاه ٓX', message: '[متن آخرین پیام]', pic: '' },
    // Add more notifications as needed
];

const news = [
    { store: 'فروشگاه ٓX', message: '[متن آخرین پیام]', pic: '' },
    // Add more news items as needed
];

function Page() {
    const [showNews, setShowNews] = useState(false);

    return (
        <div className='min-h-screen bg-white pb-16'>
            <PrevPage title='پیام های من' />

            {notifications.map((notification, index) => (
                <div key={index} className='flex items-center gap-6 p-4'>
                    <div className='bg-gray-400 size-16 rounded-full'>
                        <img src={notification.pic} alt="pic" />
                    </div>
                    <div>
                        <div className='flex flex-col gap-3 text-xs'>
                            <p>{notification.store}</p>
                            <p>{notification.message}</p>
                        </div>
                    </div>
                </div>
            ))}

            <div className='p-4 border-t-2 border-b-2'>
                <div className='flex items-center justify-between text-xs ' onClick={() => setShowNews(prev => !prev)}>
                    <h6 className='cursor-pointer'>خبرها</h6>
                    <p>
                        {showNews ? <FaArrowDown /> : <FaArrowUp />}
                    </p>
                </div>
                {showNews && (
                    <div className='mt-2'>
                        {news.map((notification, index) => (
                            <div key={index} className='flex items-center gap-6 p-4'>
                                <div className='bg-gray-400 size-16 rounded-full'>
                                    <img src={notification.pic} alt="pic" />
                                </div>
                                <div>
                                    <div className='flex flex-col gap-3 text-xs'>
                                        <p>{notification.store}</p>
                                        <p>{notification.message}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            
        </div>
    )
}

export default Page;
