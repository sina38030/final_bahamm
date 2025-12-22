"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heroui/react';
import { FaHeadphones, FaArrowRight } from "react-icons/fa6";
import EditProfileModal from './EditProfileModal';
import Link from 'next/link';
import CustomModal from '../common/CustomModal';
import { FaComments, FaPhone, FaQuestionCircle } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import PhoneAuthModal from '@/components/auth/PhoneAuthModal';

export default function UserHeader() {
    // Use standard useState instead of useDisclosure to avoid type issues
    const [editIsOpen, setEditIsOpen] = useState(false);
    const [linksIsOpen, setLinksIsOpen] = useState(false);
    const [showPhoneAuth, setShowPhoneAuth] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

    const { user, isAuthenticated, refreshCoins } = useAuth();
    const router = useRouter();

    // Handle navigation after modal closes
    useEffect(() => {
        if (!linksIsOpen && pendingNavigation) {
            router.push(pendingNavigation);
            setPendingNavigation(null);
        }
    }, [linksIsOpen, pendingNavigation, router]);

    // Helper function to get the display name
    const getDisplayName = () => {
        if (!user) return '';
        
        if (user.first_name && user.last_name) {
            return `${user.first_name} ${user.last_name}`;
        } else if (user.first_name) {
            return user.first_name;
        } else if (user.last_name) {
            return user.last_name;
        } else if (user.username) {
            return user.username;
        } else {
            return user.phone_number || '';
        }
    };

    // Helper function to get the user identifier (phone or username)
    const getUserIdentifier = () => {
        if (!user) return '';
        
        if (user.phone_number) {
            return user.phone_number;
        } else if (user.username) {
            return `@${user.username}`;
        } else if (user.telegram_id) {
            return `Telegram ID: ${user.telegram_id}`;
        }
        return '';
    };

    return (
        <>
            <div className='relative mb-20'>
                {/* Background Header */}
                <div className="bg-[#E31C5F] h-32 rounded-b-[2.5rem] shadow-md p-4 relative overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>
                    
                    <div className="relative flex items-center justify-between z-10 text-white">
                        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold">پروفایل</h1>
                        <button onClick={() => router.back()} className="ml-auto p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all" aria-label="بازگشت">
                            <FaArrowRight size={18} />
                        </button>
                         <div className="flex items-center gap-3">
                            <Button 
                                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-2 min-w-max flex items-center justify-center rounded-full text-white border-none h-10 w-10"
                                onClick={() => setLinksIsOpen(true)}
                            >
                                <FaHeadphones size={18} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* User Info Card */}
                <div className="absolute left-4 right-4 -bottom-16">
                     <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-4">
                        <div className="relative" onClick={() => setEditIsOpen(true)}>
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border-4 border-white shadow-md overflow-hidden cursor-pointer group">
                                <span className="text-4xl group-hover:scale-110 transition-transform">👤</span>
                                {/* Edit Overlay */}
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs">ویرایش</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-hidden">
                            {isAuthenticated ? (
                                <div className="flex flex-col">
                                    <p className="text-lg font-extrabold text-gray-800 truncate">{getDisplayName()}</p>
                                    <p className="text-sm text-gray-500 truncate mb-1" dir="ltr">{getUserIdentifier()}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                         <div className="bg-[#E31C5F]/10 text-[#E31C5F] px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                            <span>💰</span>
                                            <span>{user?.coins?.toLocaleString('fa-IR') || '۰'} تومان</span>
                                         </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    className="text-[#E31C5F] font-bold text-lg hover:underline flex items-center gap-2"
                                    onClick={(e) => { e.stopPropagation(); setShowPhoneAuth(true); }}
                                >
                                    <span>ورود / ثبت نام</span>
                                    <span className="text-sm">👈</span>
                                </button>
                            )}
                        </div>
                     </div>
                </div>
            </div>

            {isAuthenticated && (
                <script suppressHydrationWarning>
                    {''}
                </script>
            )}
            
            {isAuthenticated && (
                <EditProfileModal 
                    isOpen={editIsOpen}
                    onClose={() => setEditIsOpen(false)}
                    initialData={{
                        first_name: user?.first_name || null,
                        last_name: user?.last_name || null,
                        email: user?.email || '',
                        phone_number: user?.phone_number || '',
                    }}
                />
            )}

            {/* Support Links Modal */}
            <CustomModal
                isOpen={linksIsOpen}
                onClose={() => setLinksIsOpen(false)}
                title="پشتیبانی"
            >
                <div className="space-y-4">
                    <button
                        className="w-full flex items-center gap-3 bg-blue-50 p-3 rounded-lg hover:bg-blue-100 transition-colors"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPendingNavigation('/chat');
                            setLinksIsOpen(false);
                        }}
                    >
                        <FaComments className="text-blue-600" size={20} />
                        <span className="font-medium">گفتگو با پشتیبانی</span>
                    </button>

                    <button className="w-full flex items-center gap-3 bg-green-50 p-3 rounded-lg">
                        <FaPhone className="text-green-600" size={20} />
                        <span className="font-medium">تماس با پشتیبانی</span>
                    </button>

                    <button
                        className="w-full flex items-center gap-3 bg-yellow-50 p-3 rounded-lg hover:bg-yellow-100 transition-colors"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPendingNavigation('/profile/faq');
                            setLinksIsOpen(false);
                        }}
                    >
                        <FaQuestionCircle className="text-yellow-600" size={20} />
                        <span className="font-medium">سوالات متداول</span>
                    </button>
                </div>
            </CustomModal>

            {/* Bottom-sheet phone authentication for unauthenticated users */}
            <PhoneAuthModal
                isOpen={showPhoneAuth}
                onClose={() => setShowPhoneAuth(false)}
                onSuccess={() => {
                    setShowPhoneAuth(false);
                    // After successful login, UI will re-render due to auth state change
                    // Optionally, force a refresh if needed: router.refresh();
                }}
            />
        </>
    );
}