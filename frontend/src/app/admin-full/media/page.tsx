'use client';

import dynamic from 'next/dynamic';

const MediaUploader = dynamic(() => import('@/components/MediaUploader'), { ssr: false });

export default function MediaPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">مدیریت رسانه</h1>
        <p className="text-sm text-gray-600 mt-1">تصاویر را اینجا آپلود کنید و لینک نهایی را در محصولات استفاده کنید.</p>
      </div>
      <div className="max-w-3xl mx-auto mt-4">
        <MediaUploader />
      </div>
    </div>
  );
}


