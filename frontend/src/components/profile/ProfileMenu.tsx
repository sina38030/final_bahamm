import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaChevronLeft, FaComment, FaEnvelope, FaHeart, FaList, FaMapMarkerAlt, FaQuestionCircle, FaSignOutAlt, FaUsers, FaWallet } from 'react-icons/fa';
import CustomModal from '@/components/common/CustomModal';
import { useAuth } from '@/contexts/AuthContext';

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
    const { logout } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        console.log('Logging out user...');
        logout();
        setIsLogoutModalOpen(false);
    };

    const menuItems: MenuItem[] = [
        { icon: <FaQuestionCircle size={20} />, label: "پشتیبانی و سوالات متداول", path: "/profile/faq" },
        { icon: <FaEnvelope size={20} />, label: "پیام های من", path: "/profile/notification" },
        { icon: <FaWallet size={20} />, label: "کیف پول من", path: "/profile/wallet" },
        { icon: <FaHeart size={20} />, label: "علاقه مندی های من", path: "/favorites" },
        { icon: <FaMapMarkerAlt size={20} />, label: "آدرس های من", path: "/profile/addresses" },
        { icon: <FaComment size={20} />, label: "نظرات من", path: "/profile/comments" },
        { icon: <FaSignOutAlt size={20} />, label: "خروج", path: "/profile/logout", onClick: () => setIsLogoutModalOpen(true) },
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