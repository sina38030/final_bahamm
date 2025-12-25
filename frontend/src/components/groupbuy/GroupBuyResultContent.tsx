"use client";

import React from 'react';
import { HiCheckCircle, HiShoppingBag, HiReceiptPercent, HiTruck, HiGift, HiBanknotes, HiCreditCard, HiArrowPath } from 'react-icons/hi2';

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
  // Determine status type for styling
  const isRefund = typeof remainderAmount === 'number' && remainderAmount < 0;
  const isSettlement = typeof remainderAmount === 'number' && remainderAmount > 0;
  const isBalanced = typeof remainderAmount === 'number' && remainderAmount === 0;

  return (
    <div className="p-5 space-y-4" dir="rtl">
      {/* Settlement Status Card with Animation */}
      <div 
        className={`relative overflow-hidden rounded-2xl p-4 ${settlementBgClass} ${settlementBorderClass} border-2 shadow-sm animate-fadeIn`}
        style={{ animationDuration: '0.5s' }}
      >
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
        
        <div className="relative flex items-start gap-3">
          {/* Status Icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
            isRefund ? 'bg-emerald-100' : isSettlement ? 'bg-amber-100' : 'bg-blue-100'
          }`}>
            {isRefund ? (
              <HiArrowPath className="w-5 h-5 text-emerald-600" />
            ) : isSettlement ? (
              <HiCreditCard className="w-5 h-5 text-amber-600" />
            ) : (
              <HiCheckCircle className="w-5 h-5 text-blue-600" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className={`text-base font-bold ${settlementColorClass}`}>
              {settlementTitle}
            </h3>
            <p className="text-sm mt-1.5 text-gray-700 leading-7">
              {settlementMessage}
            </p>
          </div>
        </div>

        {/* Pay Remainder Button */}
        {typeof remainderAmount === 'number' && remainderAmount > 0 && onPayRemainder && (
          <button
            onClick={onPayRemainder}
            className="relative mt-4 w-full bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 px-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
          >
            <HiBanknotes className="w-5 h-5" />
            <span>پرداخت مبلغ باقیمانده</span>
          </button>
        )}
      </div>

      {/* Order Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-gray-50 to-gray-100/50 px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <HiShoppingBag className="w-4 h-4 text-rose-600" />
            </div>
            <h4 className="text-sm font-bold text-gray-800">خلاصه سفارش</h4>
          </div>
        </div>

        {/* Summary Items */}
        <div className="p-4 space-y-3">
          {/* Original Price */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600">قیمت اصلی کالاها</span>
            <span className="text-sm font-medium text-gray-800">
              {orderSummary.originalPrice.toLocaleString('fa-IR')} تومان
            </span>
          </div>

          {/* Group Discount */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5">
              <HiReceiptPercent className="w-4 h-4 text-rose-500" />
              <span className="text-sm text-gray-700">تخفیف خرید گروهی</span>
            </div>
            <span className="text-sm font-semibold text-rose-600">
              {orderSummary.groupDiscount > 0 ? '−' : ''}
              {Math.abs(orderSummary.groupDiscount).toLocaleString('fa-IR')} تومان
            </span>
          </div>

          {/* Final Items Price */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600">قیمت نهایی کالا(ها)</span>
            <span className="text-sm font-medium text-gray-800">
              {orderSummary.finalItemsPrice.toLocaleString('fa-IR')} تومان
            </span>
          </div>

          {/* Shipping Cost */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5">
              <HiTruck className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">هزینه ارسال</span>
            </div>
            <span className={`text-sm font-medium ${orderSummary.shippingCost === 0 ? 'text-emerald-600' : 'text-gray-800'}`}>
              {orderSummary.shippingCost === 0 ? (
                <span className="flex items-center gap-1">
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">رایگان</span>
                </span>
              ) : (
                `${orderSummary.shippingCost.toLocaleString('fa-IR')} تومان`
              )}
            </span>
          </div>

          {/* Reward Credit */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5">
              <HiGift className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-600">جایزه تجمیع سفارشات</span>
            </div>
            <span className="text-sm font-semibold text-purple-600">
              {orderSummary.rewardCredit > 0 ? '−' : ''}
              {Math.abs(orderSummary.rewardCredit).toLocaleString('fa-IR')} تومان
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-200 my-2" />

          {/* Grand Total */}
          <div className="flex items-center justify-between py-2 bg-gray-50 -mx-4 px-4 rounded-lg">
            <span className="text-sm font-bold text-gray-800">جمع کل</span>
            <span className="text-base font-bold text-gray-900">
              {orderSummary.grandTotal.toLocaleString('fa-IR')} تومان
            </span>
          </div>

          {/* Amount Paid */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5">
              <HiCreditCard className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">مبلغ پرداخت شده</span>
            </div>
            <span className="text-sm font-medium text-blue-600">
              {orderSummary.amountPaid.toLocaleString('fa-IR')} تومان
            </span>
          </div>

          {/* Remainder Amount */}
          {typeof remainderAmount === 'number' && remainderAmount !== 0 && (
            <div className={`flex items-center justify-between py-3 px-4 -mx-4 rounded-xl mt-2 ${
              remainderAmount > 0 
                ? 'bg-gradient-to-l from-amber-50 to-orange-50 border border-amber-200' 
                : 'bg-gradient-to-l from-emerald-50 to-teal-50 border border-emerald-200'
            }`}>
              <div className="flex items-center gap-2">
                {remainderAmount > 0 ? (
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                    <HiBanknotes className="w-4 h-4 text-amber-600" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                    <HiArrowPath className="w-4 h-4 text-emerald-600" />
                  </div>
                )}
                <span className={`text-sm font-semibold ${
                  remainderAmount > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}>
                  {remainderAmount > 0 ? 'مبلغ باقیمانده' : 'مبلغ قابل بازگشت'}
                </span>
              </div>
              <span className={`text-base font-bold ${
                remainderAmount > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {Math.abs(remainderAmount).toLocaleString('fa-IR')} تومان
              </span>
            </div>
          )}

          {/* Balanced State */}
          {typeof remainderAmount === 'number' && remainderAmount === 0 && (
            <div className="flex items-center justify-center gap-2 py-3 px-4 -mx-4 rounded-xl mt-2 bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200">
              <HiCheckCircle className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">تسویه کامل</span>
            </div>
          )}
        </div>
      </div>

      {/* Styles for animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
