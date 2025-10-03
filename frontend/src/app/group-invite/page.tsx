'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function GroupInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const inviteCode = searchParams.get('code');
    
    if (!inviteCode) {
      // No invite code, redirect to home
      router.push('/');
      return;
    }

    // Redirect to landingM page with the invite code
    router.push(`/landingM?invite=${inviteCode}`);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-center">
        <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-4"></div>
        <p>در حال پردازش دعوت گروهی...</p>
      </div>
    </div>
  );
}

export default function GroupInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    }>
      <GroupInviteContent />
    </Suspense>
  );
} 