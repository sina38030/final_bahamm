"use client";

import React from 'react';

interface OrderSummary {
  originalPrice: number;
  groupDiscount: number;
  finalItemsPrice: number;
  shippingCost: number;
  rewardCredit: number;
  grandTotal: number;
  amountPaid: number;
}

export default function GroupBuyResultContent({
  settlementTitle,
  settlementMessage,
  settlementColorClass,
  settlementBgClass,
  settlementBorderClass,
  orderSummary,
  onPayRemainder,
  remainderAmount,
}: {
  settlementTitle: string;
  settlementMessage: string;
  settlementColorClass: string;
  settlementBgClass: string;
  settlementBorderClass: string;
  orderSummary: OrderSummary;
  onPayRemainder?: () => void;
  remainderAmount?: number;
}) {
  return (
    <div className="p-4 space-y-3" dir="rtl">
      <div className={`border rounded-lg p-3 ${settlementBgClass} ${settlementBorderClass}`}>
        <div className={`text-sm font-semibold ${settlementColorClass}`}>{settlementTitle}</div>
        <div className="text-sm mt-1 text-gray-700 leading-6">{settlementMessage}</div>
        {typeof remainderAmount === 'number' && remainderAmount > 0 && onPayRemainder && (
          <button
            onClick={onPayRemainder}
            className="mt-3 w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 px-4 rounded-lg"
          >
            پرداخت
          </button>
        )}
      </div>

      <div className="border rounded-lg p-3">
        <div className="text-sm font-semibold text-gray-900 mb-2">خلاصه سفارش</div>
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between"><span>قیمت اصلی کالاها</span><span>{orderSummary.originalPrice.toLocaleString('fa-IR')} تومان</span></div>
          <div className="flex justify-between"><span className="text-gray-700">تخفیف خرید گروهی</span><span className="text-red-600">{orderSummary.groupDiscount > 0 ? '-' : ''}{Math.abs(orderSummary.groupDiscount).toLocaleString('fa-IR')} تومان</span></div>
          <div className="flex justify-between"><span>قیمت نهایی کالا(ها)</span><span>{orderSummary.finalItemsPrice.toLocaleString('fa-IR')} تومان</span></div>
          <div className="flex justify-between"><span>هزینه ارسال</span><span className={orderSummary.shippingCost === 0 ? 'text-green-600' : ''}>{orderSummary.shippingCost === 0 ? 'رایگان' : `${orderSummary.shippingCost.toLocaleString('fa-IR')} تومان`}</span></div>
          <div className="flex justify-between"><span>جایزه تجمیع سفارشات</span><span className="text-red-600">{orderSummary.rewardCredit > 0 ? '-' : ''}{Math.abs(orderSummary.rewardCredit).toLocaleString('fa-IR')} تومان</span></div>
          <div className="flex justify-between font-medium text-gray-900 pt-1 border-t mt-2"><span>جمع کل</span><span>{orderSummary.grandTotal.toLocaleString('fa-IR')} تومان</span></div>
          <div className="flex justify-between"><span>مبلغ پرداخت شده</span><span>{orderSummary.amountPaid.toLocaleString('fa-IR')} تومان</span></div>
          {typeof remainderAmount === 'number' && (
            <div className={`flex justify-between ${remainderAmount > 0 ? 'text-orange-600' : remainderAmount < 0 ? 'text-blue-600' : ''}`}>
              <span>{remainderAmount > 0 ? 'مبلغ باقیمانده' : remainderAmount < 0 ? 'مبلغ قابل بازگشت' : 'تسویه'}</span>
              <span>{Math.abs(remainderAmount).toLocaleString('fa-IR')} تومان</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

