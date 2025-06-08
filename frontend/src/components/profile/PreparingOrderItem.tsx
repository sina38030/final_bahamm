import React from 'react';
import Image from 'next/image';

type PreparingOrderItemProps = {
    orderCode: string;
    date: string;
    status: string;
    items: Array<{
        id: number;
        imageUrl: string;
        price: number;
    }>;
}

export default function PreparingOrderItem({ orderCode, date, status, items }: PreparingOrderItemProps) {
    return (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-start">
                <div className="flex flex-col items-start gap-4">
                    <div className="px-2 py-1 bg-gray-200 rounded-full text-xs">
                        {status}
                    </div>
                    <span className="text-sm text-gray-500">کد سفارش: {orderCode}</span>
                    <span className="text-sm text-gray-500">{date}</span>
                </div>
                {/* Left Side: Product Image and Price */}
                <div className="flex items-center justify-end flex-col gap-4">
                    <div className="w-14 h-14 mr-auto bg-gray-200 rounded-md overflow-hidden">
                        <Image
                            src={items[0]?.imageUrl || '/images/placeholder.jpg'}
                            alt="تصویر محصول"
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="text-sm ">
                        {items[0]?.price.toLocaleString('fa-IR')} تومان
                    </div>
                </div>
                {/* Right Side: Status, Order Code, and Date */}

            </div>

            {/* Second Product (if exists) */}
            {items.length > 1 && (
                <div className="flex justify-start items-end flex-col-reverse gap-4">
                    <div className="text-sm">
                        {items[1].price.toLocaleString('fa-IR')} تومان
                    </div>
                    <div className="w-14 h-14 bg-gray-200 rounded-md overflow-hidden">
                        <Image
                            src={items[1].imageUrl}
                            alt="تصویر محصول"
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            )}
        </div>
    );
} 