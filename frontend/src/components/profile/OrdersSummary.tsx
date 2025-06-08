import React, { useState } from 'react';
import { FaBan, FaCheckCircle, FaTools, FaTruck, FaUndo, FaUsers } from 'react-icons/fa';
import OrdersModal from './OrdersModal';
import { orderCounts, deliveredOrders } from '../../data/orders';
import DeliveredOrderItem from './DeliveredOrderItem';

type OrderStatusItemProps = {
    icon: React.ReactNode;
    label: string;
    count?: number;
    onClick?: () => void;
}

function OrderStatusItem({ icon, label, count, onClick }: OrderStatusItemProps) {
    return (
        <div className="flex flex-col items-center min-w-fit cursor-pointer" onClick={onClick}>
            <div className="w-11 h-11 bg-gray-300 rounded-md flex items-center justify-center">
                {icon}
            </div>
            <span className="text-xs mt-2">{label} {count !== undefined ? `(${count})` : ''}</span>
        </div>
    );
}

export default function OrdersSummary() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const orderStatuses = [
        { icon: <FaUsers size={20} />, label: "گروه های فعال", count: orderCounts.activeGroup },
        { icon: <FaTools size={20} />, label: "در حال آماده سازی", count: orderCounts.preparing },
        { icon: <FaTruck size={20} />, label: "ارسال شده", count: orderCounts.sent },
        { icon: <FaCheckCircle size={20} />, label: "تحویل داده شده", count: orderCounts.delivered },
        { icon: <FaUndo size={20} />, label: "مرجوع شده", count: orderCounts.returned },
        { icon: <FaBan size={20} />, label: "لغو شده", count: orderCounts.cancelled },
    ];

    const handleDeliveredOrdersClick = () => {
        setIsModalOpen(true);
    };

    return (
        <>
            <div className='mb-4 bg-white shadow-sm rounded-lg'>
                <div className="flex items-center justify-between p-2">
                    <h2 className="text-lg font-bold cursor-pointer" onClick={() => setIsModalOpen(true)}>
                        سفارش های من
                    </h2>
                    <button
                        className="text-sm text-gray-500 flex items-center gap-1"
                        onClick={() => setIsModalOpen(true)}
                    >
                        مشاهده همه
                        <FaTruck className="rotate-180" size={14} />
                    </button>
                </div>
                <div className="flex overflow-x-auto gap-4 p-2">
                    {orderStatuses.map((status, index) => (
                        <OrderStatusItem
                            key={index}
                            icon={status.icon}
                            label={status.label}
                            count={status.count}
                            onClick={handleDeliveredOrdersClick}
                        />
                    ))}
                </div>
            </div>

            <OrdersModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
} 