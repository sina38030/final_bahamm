'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function PaymentCallbackContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('');
  const [verifying, setVerifying] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const authority = searchParams.get('Authority');
    const status = searchParams.get('Status');
    const amount = searchParams.get('amount'); // Optional amount parameter

    const processPayment = async () => {
      if (status === 'OK' && authority) {
        try {
          setMessage('در حال تایید پرداخت...');
          setVerifying(true);
          
          // Verify payment with backend (using public endpoint)
          const response = await fetch('/api/payment', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              authority: authority,
              amount: amount ? parseInt(amount) : undefined, // Include amount if available
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            setStatus('success');
            setMessage('پرداخت با موفقیت انجام شد و سفارش شما ثبت گردید');
            
            // Redirect to invite page immediately
            router.push(`/invite?authority=${authority}&ref_id=${data.ref_id || ''}`);
          } else {
            setStatus('failed');
            // Handle different error formats
            let errorMessage = 'تایید پرداخت ناموفق بود';
            
            if (data.error) {
              errorMessage = data.error;
            } else if (data.detail) {
              // Handle FastAPI validation errors
              if (Array.isArray(data.detail)) {
                errorMessage = data.detail.map((err: any) => err.msg || err.message || 'خطای validation').join(', ');
              } else {
                errorMessage = data.detail;
              }
            }
            
            setMessage(errorMessage);
            
            // Redirect to checkout page after 3 seconds
            setTimeout(() => {
              router.push('/checkout');
            }, 3000);
          }
        } catch (error) {
          console.error('Payment verification error:', error);
          setStatus('failed');
          setMessage('خطا در تایید پرداخت');
          
          setTimeout(() => {
            router.push('/checkout');
          }, 3000);
        } finally {
          setVerifying(false);
        }
      } else {
        // Payment failed or cancelled
        setStatus('failed');
        setMessage('پرداخت ناموفق یا لغو شده');
        
        // Redirect to checkout page after 3 seconds
        setTimeout(() => {
          router.push('/checkout');
        }, 3000);
      }
    };

    processPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{message || 'در حال پردازش پرداخت...'}</p>
            {verifying && (
              <p className="text-sm text-gray-500 mt-2">لطفاً صبر کنید...</p>
            )}
          </div>
        )}
        
        {status === 'success' && (
          <div>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">پرداخت موفق</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">در حال انتقال به صفحه موفقیت...</p>
          </div>
        )}
        
        {status === 'failed' && (
          <div>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">پرداخت ناموفق</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">در حال انتقال به صفحه پرداخت...</p>
          </div>
        )}
      </div>
    </div>
  );
} 

export default function PaymentCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}