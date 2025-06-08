'use client';

import { FaHome, FaComments, FaList, FaUser } from 'react-icons/fa';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNavigation() {
    const pathname = usePathname();

    // Don't show navigation on certain pages including the cart page
    if (pathname.startsWith('/product/') || 
        pathname.startsWith('/checkout') || 
        pathname.startsWith('/success') || 
        pathname.startsWith('/landingM') || 
        pathname.startsWith('/auth/login') || 
        pathname.startsWith('/auth/otp') || 
        pathname.startsWith('/success-buy') || 
        pathname.startsWith('/three-lead-checkout') || 
        pathname.startsWith('/two-lead-checkout') || 
        pathname.startsWith('/orderinfo') || 
        pathname.startsWith('/successpayment') || 
        pathname.startsWith('/tracking') ||
        pathname === '/cart') {
        return null;
    }

    // For debugging the current path
    console.log('Current pathname:', pathname);

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center h-16 z-40">
            <Link href="/" className="flex flex-col items-center gap-2">
                <FaHome size={20} className={pathname === '/' ? 'text-primary' : 'text-gray-500'} />
                <span className="text-xs">خانه</span>
            </Link>
            <Link href="/chat" className="flex flex-col items-center gap-2">
                <FaComments size={20} className={pathname === '/chat' ? 'text-primary' : 'text-gray-500'} />
                <span className="text-xs">گفتگو</span>
            </Link>
            <Link href="/categories" className="flex flex-col items-center gap-2">
                <FaList size={20} className={pathname === '/categories' ? 'text-primary' : 'text-gray-500'} />
                <span className="text-xs">دسته بندی</span>
            </Link>
            <Link href="/profile" className="flex flex-col items-center gap-2">
                <FaUser size={20} className={pathname.startsWith('/profile') ? 'text-primary' : 'text-gray-500'} />
                <span className="text-xs">حساب کاربری</span>
            </Link>
        </div>
    );
} 