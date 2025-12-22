import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiOutlineUsers, HiOutlineQuestionMarkCircle, HiOutlineChatBubbleLeft, HiOutlineArrowRightOnRectangle, HiOutlineChevronLeft } from 'react-icons/hi2';
import CustomModal from '@/components/common/CustomModal';
import { useAuth } from '@/contexts/AuthContext';
import { isTelegramMiniApp } from '@/utils/linkGenerator';

type MenuItem = {
    icon: React.ReactElement;
    label: string;
    path: string;
    onClick?: () => void;
}

function MenuItem({ icon, label, path, onClick }: MenuItem) {
    const router = useRouter();
    
    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            router.push(path);
        }
    };

    return (
        <div 
            className="group flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.99] border border-gray-50" 
            onClick={handleClick}
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-600 group-hover:bg-[#E31C5F]/10 group-hover:text-[#E31C5F] flex items-center justify-center transition-colors">
                    {icon}
                </div>
                <span className="font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
            </div>
            <div className="text-gray-300 group-hover:text-[#E31C5F] group-hover:-translate-x-1 transition-all">
                <HiOutlineChevronLeft size={16} />
            </div>
        </div>
    );
}

export default function ProfileMenu() {
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isTelegram, setIsTelegram] = useState(() => typeof window !== 'undefined' && isTelegramMiniApp());
    const { logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Double check on mount in case window.Telegram wasn't ready during initial state calc
        const telegramDetected = isTelegramMiniApp();
        if (telegramDetected !== isTelegram) {
            console.log('ProfileMenu: isTelegramMiniApp updated detection:', telegramDetected);
            setIsTelegram(telegramDetected);
        }
        console.log('ProfileMenu: Initial isTelegramMiniApp detected:', telegramDetected, 'window.Telegram:', !!window.Telegram, 'WebApp:', !!window.Telegram?.WebApp, 'initData:', !!window.Telegram?.WebApp?.initData);
    }, [isTelegram]);

    const handleLogout = () => {
        console.log('Logging out user...');
        logout();
        setIsLogoutModalOpen(false);
    };

    const menuItems: MenuItem[] = [
        { icon: <HiOutlineUsers size={24} />, label: "گروه و سفارش‌های من", path: "/groups-orders" },
        { icon: <HiOutlineQuestionMarkCircle size={24} />, label: "پشتیبانی و سوالات متداول", path: "/profile/faq" },
        // { icon: <HiOutlineEnvelope size={24} />, label: "پیام های من", path: "/profile/notification" },
        // { icon: <HiOutlineReceiptRefund size={24} />, label: "تراکنش‌ها", path: "/profile/transactions" },
        // { icon: <HiOutlineMapPin size={24} />, label: "آدرس های من", path: "/profile/addresses" },
        { icon: <HiOutlineChatBubbleLeft size={24} />, label: "نظرات من", path: "/profile/comments" },
        ...(isTelegram ? [] : [{ icon: <HiOutlineArrowRightOnRectangle size={24} />, label: "خروج", path: "/profile/logout", onClick: () => setIsLogoutModalOpen(true) }]),
    ];

    return (
        <>
            <div className='px-4 space-y-3 pb-8'>
                {menuItems.map((item, index) => (
                    <MenuItem key={index} {...item} />
                ))}
            </div>

            <CustomModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                title="خروج از حساب کاربری"
                submitLabel="خروج"
                cancelLabel="انصراف"
                onSubmit={handleLogout}
            >
                <div className="space-y-4">
                    <p className="text-gray-700 text-center text-lg font-medium py-4">
                        آیا برای خروج مطمئن هستید؟
                    </p>
                </div>
            </CustomModal>
        </>
    );
} 