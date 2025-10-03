"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GroupBuyResultContent from '@/components/groupbuy/GroupBuyResultContent';

type GroupStatus = 'ongoing' | 'success' | 'failed';

interface ApiGroup {
  id: string;
  status: GroupStatus;
  pricing: { originalTotal: number; currentTotal: number };
  shippingCost?: number;
  rewardCredit?: number;
  amountPaid?: number;
  initialPayment?: number;
  finalLeaderPrice?: number;
  participants?: Array<{ id: string; isLeader: boolean }>;
}

export default function GroupResultPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiGroup | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/groups/${groupId}`);
        if (!res.ok) throw new Error(await res.text());
        const j: ApiGroup = await res.json();
        setData(j);
      } catch (e) {
        setError('خطا در دریافت اطلاعات گروه');
      } finally {
        setLoading(false);
      }
    };
    if (groupId) void load();
  }, [groupId]);

  const orderSummary = useMemo(() => {
    if (!data) return null;
    
    const shipping = data.shippingCost || 0;
    const reward = data.rewardCredit || 0;
    const paid = data.amountPaid ?? data.initialPayment ?? 0;
    
    // API حالا دقیقاً مانند cart محاسبه می‌کند:
    // originalTotal = alone (قیمت تنها خریدن)
    // currentTotal = leaderPrice (قیمت لیدر با دوستان واقعی)
    const original = Number(data.pricing?.originalTotal || 0);
    const current = Number(data.pricing?.currentTotal || 0);
    const actualDiscount = Math.max(0, original - current);
    
    return {
      originalPrice: original,
      groupDiscount: actualDiscount,
      finalItemsPrice: current,
      shippingCost: shipping,
      rewardCredit: reward,
      grandTotal: current + shipping - reward,
      amountPaid: paid,
    };
  }, [data]);

  const delta = useMemo(() => {
    if (!data) return 0;
    const initial = data.initialPayment ?? 0;
    const finalPrice = data.finalLeaderPrice ?? 0;
    return finalPrice - initial;
  }, [data]);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center">در حال بارگذاری...</div>
    );
  }

  if (error || !data) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center text-red-600">
        {error || 'خطای نامشخص'}
      </div>
    );
  }

  const settlement = (() => {
    if (delta === 0) {
      return {
        title: 'تسویه انجام شد',
        message: 'تسویه انجام شد. پرداخت اضافه‌ای نیاز نیست.',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      };
    }
    if (delta > 0) {
      return {
        title: 'باقی‌مانده پرداخت',
        message: `باقی‌مانده پرداخت: ${Math.abs(delta).toLocaleString('fa-IR')} تومان`,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
      };
    }
    return {
      title: 'مبلغ قابل بازگشت',
      message: `مبلغ قابل بازگشت: ${Math.abs(delta).toLocaleString('fa-IR')} تومان`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    };
  })();

  const handlePayRemainder = () => {
    // TODO: Integrate payment flow (redirect to payment page)
    console.log('Paying remainder: ', delta);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">نتیجه خرید گروهی</h1>
        <button
          className="text-sm text-gray-600"
          onClick={() => router.push('/')}
        >
          بازگشت
        </button>
      </div>

      <div className="max-w-md mx-auto">
        <GroupBuyResultContent
          settlementTitle={settlement.title}
          settlementMessage={settlement.message}
          settlementColorClass={settlement.color}
          settlementBgClass={settlement.bgColor}
          settlementBorderClass={settlement.borderColor}
          orderSummary={orderSummary!}
          onPayRemainder={delta > 0 ? handlePayRemainder : undefined}
          remainderAmount={delta > 0 ? delta : undefined}
        />

        {/* Footer actions, same as modal */}
        <div className="p-4 border-t bg-white sticky bottom-0">
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/track/${groupId}`)}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              پیگیری سفارش
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              بازگشت به باهم
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


