'use client'
import ProfileMenu from '@/components/profile/ProfileMenu'
import UserHeader from '@/components/profile/UserHeader'
import React from 'react'

export default function ProfilePage() {
    return (
        <div className="pb-16">
            <div className="">
                <UserHeader />
                <div className="mt-4 min-h-screen">
                    <ProfileMenu />
                </div>
            </div>
            
        </div>
    )
}
