'use client'
 import OrdersSummary from '@/components/profile/OrdersSummary'
import ProfileMenu from '@/components/profile/ProfileMenu'
import UserHeader from '@/components/profile/UserHeader'
import React from 'react'

export default function ProfilePage() {
    return (
        <div>
            <div className="">
                <UserHeader />
                <div className="mt-4 min-h-screen">
                    <OrdersSummary />
                    <ProfileMenu />
                </div>
            </div>
        </div>
    )
}
