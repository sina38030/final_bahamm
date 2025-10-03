"use client";

import { useState } from "react";
import { Order } from "@/types/order";

interface PaymentDetailsProps {
  order: Order;
}

// Convert Western digits to Persian digits
const toPersianDigits = (str: string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
};

// Format currency with Persian digits
const formatCurrency = (amount: number): string => {
  return toPersianDigits(amount.toLocaleString('fa-IR')) + ' تومان';
};

// Format date to Persian
const formatPersianDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    
    const persianDate = date.toLocaleDateString('fa-IR', options);
    return toPersianDigits(persianDate);
  } catch (error) {
    return toPersianDigits(dateStr);
  }
};

export default function PaymentDetails({ order }: PaymentDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <button
        onClick={toggleExpanded}
        className="w-full px-4 py-3 flex items-center justify-between text-right hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
        <div className="text-pink-600 text-sm font-medium">جزئیات پرداخت</div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
          <div className="space-y-3 pt-3">
            {/* Amount Paid */}
            <div className="flex justify-between items-center">
              <span className="text-emerald-700 font-bold">
                {formatCurrency(order.totalPaid)}
              </span>
              <span className="text-gray-600">
                مبلغ پرداخت شده:
              </span>
            </div>

            {/* Original Amount (if different) */}
            {order.totalOriginal !== order.totalPaid && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400 line-through">
                  {formatCurrency(order.totalOriginal)}
                </span>
                <span className="text-gray-600">
                  قیمت اصلی:
                </span>
              </div>
            )}

            {/* Masked Card */}
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-mono text-left" dir="ltr">
                {order.payment.maskedCard || '****-****-****-****'}
              </span>
              <span className="text-gray-600">
                کارت:
              </span>
            </div>

            {/* Bank Reference */}
            {order.payment.bankRef && (
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-mono text-left" dir="ltr">
                  {toPersianDigits(order.payment.bankRef)}
                </span>
                <span className="text-gray-600">
                  شناسه بانکی:
                </span>
              </div>
            )}

            {/* Payment Date */}
            {order.paidAt && (
              <div className="flex justify-between items-center">
                <span className="text-gray-700">
                  {formatPersianDate(order.paidAt)}
                </span>
                <span className="text-gray-600">
                  تاریخ پرداخت:
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}