"use client";

import { Order } from "@/types/order";
import Image from "next/image";

interface SuccessCardProps {
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

export default function SuccessCard({ order }: SuccessCardProps) {
  // Get the first item's image or use a placeholder
  const firstItem = order.items?.[0];
  const productImage = firstItem?.image || '/images/404.png';
  const totalItems = order.items?.length || 0;

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
      {/* Success Icon and Title */}
      <div className="bg-white px-6 py-6 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-6 h-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-base font-bold text-gray-900 mb-2">
          سفارش شما با موفقیت ثبت شد
        </h1>
        <p className="text-gray-600 text-sm">
          شماره سفارش: {toPersianDigits(order.id.toString())}
        </p>
      </div>

      {/* Product Preview */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          {/* Product Image */}
          <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 ring-1 ring-gray-200">
            <Image
              src={productImage}
              alt={firstItem?.name || 'محصول'}
              fill
              className="object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/images/404.png';
              }}
            />
          </div>

          {/* Product Info */}
          <div className="flex-1 text-right">
            <h3 className="font-semibold text-gray-900 text-sm">
              {firstItem?.name || 'محصول'}
            </h3>
            {totalItems > 1 && (
              <p className="text-gray-500 text-xs mt-1">
                و {toPersianDigits((totalItems - 1).toString())} محصول دیگر
              </p>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-emerald-700 font-bold">
                {formatCurrency(order.totalPaid)}
              </span>
              <span className="text-gray-500 text-xs">
                تعداد: {toPersianDigits(order.items.reduce((sum, item) => sum + item.qty, 0).toString())}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="px-6 py-4">
        <div className="space-y-2 text-sm">
          {/* Items List (first 3) */}
          {order.items.slice(0, 3).map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-gray-600">
                {toPersianDigits(item.qty.toString())} × {formatCurrency(item.unitPrice)}
              </span>
              <span className="text-gray-900 truncate max-w-[200px]">
                {item.name}
              </span>
            </div>
          ))}
          
          {/* Show remaining items count */}
          {totalItems > 3 && (
            <div className="text-center text-gray-500 text-xs py-2">
              و {toPersianDigits((totalItems - 3).toString())} محصول دیگر...
            </div>
          )}
        </div>

        {/* Total */}
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="text-emerald-700 font-extrabold text-lg">
              {formatCurrency(order.totalPaid)}
            </span>
            <span className="text-gray-700 font-semibold">
              مجموع پرداخت:
            </span>
          </div>
          
          {/* Show discount if applicable */}
          {order.totalOriginal > order.totalPaid && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-rose-500 text-sm">
                -{formatCurrency(order.totalOriginal - order.totalPaid)}
              </span>
              <span className="text-gray-500 text-sm">
                تخفیف گروهی:
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}