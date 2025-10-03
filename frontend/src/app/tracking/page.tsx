"use client";

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function TrackingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Redirect legacy /tracking to canonical /track/[groupId]
        // Prefer explicit id from query, else last_invite_code from localStorage
        const id = searchParams.get('id') || searchParams.get('invite');
        if (id) {
            router.replace(`/track/${encodeURIComponent(id)}`);
            return;
        }
        try {
            const last = localStorage.getItem('last_invite_code');
            if (last) {
                router.replace(`/track/${encodeURIComponent(last)}`);
                return;
            }
        } catch {}
        // Fallback: go home
        router.replace('/');
    }, [router, searchParams]);

    return null;
}

export default function Page() {
    return (
        <Suspense fallback={<div>در حال بارگذاری...</div>}>
            <TrackingContent />
        </Suspense>
    );
}