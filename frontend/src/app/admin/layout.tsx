"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            // Check if user is authenticated
            if (!isAuthenticated) {
                router.push('/auth/login');
                return;
            }

            // Check if user has admin phone number
            const adminPhoneNumber = '+989155106656';
            const userPhone = user?.phone_number?.startsWith('+') 
                ? user.phone_number 
                : user?.phone_number ? '+' + user.phone_number : '';

            if (userPhone !== adminPhoneNumber) {
                // Not authorized - redirect to home
                router.push('/');
            }
        }
    }, [user, isAuthenticated, loading, router]);

    // Show loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Don't render anything if not authorized (will redirect)
    if (!isAuthenticated || !user) {
        return null;
    }

    const userPhone = user.phone_number?.startsWith('+') 
        ? user.phone_number 
        : user.phone_number ? '+' + user.phone_number : '';

    if (userPhone !== '+989155106656') {
        return null;
    }

    return <>{children}</>;
} 