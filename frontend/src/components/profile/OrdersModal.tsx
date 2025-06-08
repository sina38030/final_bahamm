import React, { useState } from 'react';
import CustomModal from '../common/CustomModal';
import OrderItem from './OrderItem';
import PreparingOrderItem from './PreparingOrderItem';
import {
    activeGroupOrders,
    preparingOrders,
    sentOrders,
    deliveredOrders,
    returnedOrders,
    cancelledOrders,
    orderCounts
} from '@/data/orders';
import DeliveredOrderItem from './DeliveredOrderItem';

type Tab = {
    id: string;
    label: string;
    count: number;
}

const tabs: Tab[] = [
    { id: 'activeGroup', label: 'گروه های فعال', count: orderCounts.activeGroup },
    { id: 'preparing', label: 'در حال آماده سازی', count: orderCounts.preparing },
    { id: 'sent', label: 'ارسال شده', count: orderCounts.sent },
    { id: 'delivered', label: 'تحویل داده شده', count: orderCounts.delivered },
    { id: 'returned', label: 'مرجوع شده', count: orderCounts.returned },
    { id: 'cancelled', label: 'لغو شده', count: orderCounts.cancelled },
];

type OrdersModalProps = {
    isOpen: boolean;
    onClose: () => void;
}

export default function OrdersModal({ isOpen, onClose }: OrdersModalProps) {
    const [activeTab, setActiveTab] = useState('activeGroup');

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'activeGroup':
                return activeGroupOrders.length > 0 ? (
                    <div className="space-y-4">
                        {activeGroupOrders.map((order) => (
                            <OrderItem
                                key={order.id}
                                imageUrl={order.imageUrl}
                                endTime={order.endTime}
                                leaderName={order.leaderName}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8">
                        هنوز سفارش گروهی فعالی ندارید
                    </div>
                );
            case 'preparing':
                return preparingOrders.length > 0 ? (
                    <div className="space-y-4">
                        {preparingOrders.map((order) => (
                            <PreparingOrderItem
                                key={order.id}
                                orderCode={order.orderCode}
                                date={order.date}
                                status={order.status}
                                items={order.items}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8">
                        سفارشی در حال آماده سازی نیست
                    </div>
                );
            case 'delivered':
                return deliveredOrders.length > 0 ? (
                    <div className="space-y-4">
                        {deliveredOrders.map((order) => (
                            <DeliveredOrderItem
                                key={order.id}
                                orderCode={order.orderCode}
                                date={order.date}
                                status={order.status}
                                items={order.items}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8">
                        هنوز سفارشی ندارید
                    </div>
                );
            case 'sent':
                return sentOrders.length > 0 ? (
                    <div className="space-y-4">
                        {/* نمایش سفارشات ارسال شده */}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8">
                        هنوز سفارشی ارسال نشده است
                    </div>
                );
            case 'returned':
                return returnedOrders.length > 0 ? (
                    <div className="space-y-4">
                        {/* نمایش سفارشات مرجوع شده */}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8">
                        هنوز سفارشی مرجوع نشده است
                    </div>
                );
            case 'cancelled':
                return cancelledOrders.length > 0 ? (
                    <div className="space-y-4">
                        {/* نمایش سفارشات لغو شده */}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8">
                        هنوز سفارشی لغو نشده است
                    </div>
                );
            default:
                return (
                    <div className="text-center text-gray-500 py-8">
                        هنوز سفارشی ندارید
                    </div>
                );
        }
    };

    return (
        <CustomModal
            isOpen={isOpen}
            onClose={onClose}
            title="سفارش های من"
            hideFooter
            fullScreen
        >
            <div className="flex flex-col h-[80vh]">
                <div className="flex-none">
                    <div className="flex border-b gap-3 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`flex-1 py-2 text-sm font-medium relative min-w-max ${activeTab === tab.id
                                        ? 'text-red-600'
                                        : 'text-gray-500'
                                    }`}
                                onClick={() => handleTabChange(tab.id)}
                            >
                                <span>{tab.label}</span>
                                <span className="mr-1">({tab.count})</span>
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto mt-4 px-1">
                    {renderContent()}
                </div>
            </div>
        </CustomModal>
    );
} 