import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaChevronLeft, FaComment, FaEnvelope, FaHeart, FaList, FaMapMarkerAlt, FaQuestionCircle, FaSignOutAlt, FaUsers } from 'react-icons/fa';
import { MdReceiptLong } from 'react-icons/md';
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
        <li className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={handleClick}>
            <span className="flex items-center gap-2">
                <span className="mr-2">{icon}</span>
                {label}
            </span>
            <FaChevronLeft />
        </li>
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
        { icon: <FaUsers size={20} />, label: "گروه و سفارش‌های من", path: "/groups-orders" },
        { icon: <FaQuestionCircle size={20} />, label: "پشتیبانی و سوالات متداول", path: "/profile/faq" },
        // { icon: <FaEnvelope size={20} />, label: "پیام های من", path: "/profile/notification" },
        { icon: <MdReceiptLong size={20} />, label: "تراکنش‌ها", path: "/profile/transactions" },
        // { icon: <FaMapMarkerAlt size={20} />, label: "آدرس های من", path: "/profile/addresses" },
        { icon: <FaComment size={20} />, label: "نظرات من", path: "/profile/comments" },
        ...(isTelegram ? [] : [{ icon: <FaSignOutAlt size={20} />, label: "خروج", path: "/profile/logout", onClick: () => setIsLogoutModalOpen(true) }]),
    ];

    return (
        <>
            <div className='shadow-sm rounded-lg bg-white'>
                <ul className="divide-y divide-gray-200">
                    {menuItems.map((item, index) => (
                        <MenuItem key={index} {...item} />
                    ))}
                </ul>
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
                    <div className="bg-red-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-red-800 mb-2">آیا از خروج از حساب کاربری خود مطمئن هستید؟</h3>
                        <p className="text-red-700 text-sm">
                            با خروج از حساب کاربری، دسترسی به تمامی امکانات پنل کاربری شما محدود خواهد شد.
                        </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-800 mb-2">نکات مهم</h3>
                        <ul className="space-y-2 text-gray-700 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-gray-600">•</span>
                                <span>سفارش‌های در حال پردازش شما همچنان قابل پیگیری خواهند بود</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-gray-600">•</span>
                                <span>اطلاعات حساب شما برای ورود مجدد حفظ خواهد شد</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-gray-600">•</span>
                                <span>می‌توانید در هر زمان با اطلاعات قبلی خود مجدداً وارد شوید</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </CustomModal>
        </>
    );
} 