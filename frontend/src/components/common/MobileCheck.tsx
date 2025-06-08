 'use client'

import { useEffect, useState } from 'react'

export default function MobileCheck({ children }: { children: React.ReactNode }) {
    const [isMobile, setIsMobile] = useState(false)
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)

        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    if (!isClient) return null // Prevent hydration mismatch

    if (!isMobile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">دسترسی محدود</h1>
                    <p className="text-gray-700">
                        لطفا برای مشاهده این صفحه از موبایل استفاده کنید
                    </p>
                </div>
            </div>
        )
    }

    return children
}