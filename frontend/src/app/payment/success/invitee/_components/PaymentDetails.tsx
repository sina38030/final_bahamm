"use client";

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
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-4 py-4 bg-gray-50 text-right">
        <div className="text-pink-600 text-sm font-medium mb-3">جزئیات پرداخت</div>
        <div className="space-y-3">
          {/* Amount Paid */}
          <div className="flex flex-row-reverse justify-between items-center">
            <span className="text-emerald-700 font-bold">
              {formatCurrency(order.totalPaid)}
            </span>
            <span className="text-gray-600">
              مبلغ پرداخت شده:
            </span>
          </div>

          {/* Bank Reference */}
          {order.payment.bankRef && (
            <div className="flex flex-row-reverse justify-between items-center">
              <span className="text-gray-700 font-mono text-right" dir="ltr">
                {toPersianDigits(order.payment.bankRef)}
              </span>
              <span className="text-gray-600">
                شناسه بانکی:
              </span>
            </div>
          )}

          {/* Payment Date */}
          {order.paidAt && (
            <div className="flex flex-row-reverse justify-between items-center">
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
    </div>
  );
}