'use client'
import ProfileMenu from '@/components/profile/ProfileMenu'
import UserHeader from '@/components/profile/UserHeader'
import { PageErrorBoundary } from '@/components/common/PageErrorBoundary'
import React from 'react'

function ProfilePageContent() {
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

export default function ProfilePage() {
    return (
        <PageErrorBoundary fallbackTitle="خطا در بارگذاری پروفایل">
            <ProfilePageContent />
        </PageErrorBoundary>
    )
}
