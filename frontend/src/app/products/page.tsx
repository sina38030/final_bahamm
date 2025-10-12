'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ProductsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const category = searchParams.get('category');

    useEffect(() => {
        // If category is provided in the URL, redirect to the category page
        if (category) {
            router.push(`/products/${category}`);
        } else {
            // Default to home category if none specified
            router.push('/products/home');
        }
    }, [category, router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <p className="text-gray-500">در حال انتقال...</p>
            </div>
        </div>
    );
} 

export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">در حال بارگذاری…</p></div>}>
            <ProductsContent />
        </Suspense>
    );
}