import React, { useState, useEffect } from 'react';
import CustomModal from '../common/CustomModal';
import OrderItem from './OrderItem';
import PreparingOrderItem from './PreparingOrderItem';
import {
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

type OrdersModalProps = {
    isOpen: boolean;
    onClose: () => void;
}

type ActiveGroupOrder = {
    id: number;
    imageUrl: string;
    endTime: Date;
    leaderName: string;
};

export default function OrdersModal({ isOpen, onClose }: OrdersModalProps) {
    const [activeTab, setActiveTab] = useState('activeGroup');
    const [activeGroupOrders, setActiveGroupOrders] = useState<ActiveGroupOrder[]>([]);
    const [loading, setLoading] = useState(false);

    const tabs = [
        { id: 'activeGroup', label: 'گروه های فعال', count: activeGroupOrders.length },
        { id: 'preparing', label: 'در حال آماده سازی', count: orderCounts.preparing },
        { id: 'sent', label: 'ارسال شده', count: orderCounts.sent },
        { id: 'delivered', label: 'تحویل داده شده', count: orderCounts.delivered },
        { id: 'returned', label: 'مرجوع شده', count: orderCounts.returned },
        { id: 'cancelled', label: 'لغو شده', count: orderCounts.cancelled },
    ];

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
    };

    const fetchActiveGroupOrders = async () => {
        try {
            setLoading(true);
            // Get user phone from localStorage
            // First try the user object, then fallback to direct keys
            let userPhone: string | null = null;

            try {
                const userData = localStorage.getItem('user');
                if (userData) {
                    const user = JSON.parse(userData);
                    userPhone = user.phone_number || user.phone || null;
                }
            } catch (e) {
                console.warn('Error parsing user data from localStorage:', e);
            }

            // Fallback to direct keys
            if (!userPhone) {
                userPhone = localStorage.getItem('userPhone') ||
                           localStorage.getItem('user_phone') ||
                           localStorage.getItem('phone');
            }

            if (!userPhone) {
                console.warn('No user phone found for fetching groups. Available localStorage keys:', Object.keys(localStorage));
                console.warn('Available localStorage values:', Object.keys(localStorage).map(key => ({ key, value: localStorage.getItem(key) })));
                return;
            }

            // Clean the phone number
            userPhone = userPhone.replace(/\D/g, '');

            const response = await fetch(`/api/user/my-groups?phone=${encodeURIComponent(userPhone)}`);
            if (response.ok) {
                const groupIds: string[] = await response.json();

                // For each group ID, fetch group details
                const groupPromises = groupIds.map(async (groupId) => {
                    try {
                        const groupResponse = await fetch(`/api/groups/${groupId}`);
                        if (groupResponse.ok) {
                            const groupData = await groupResponse.json();
                            // Only include groups where user is leader and status is ongoing
                            if (groupData.status === 'ongoing') {
                                return {
                                    id: groupData.id,
                                    imageUrl: "https://atticbv.com/media/products/images/None/photo_5765121115679737611_y_1.jpg", // Default image
                                    endTime: new Date(groupData.expiresAt),
                                    leaderName: groupData.leader?.phone_number || 'ناشناس'
                                };
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching group ${groupId}:`, error);
                    }
                    return null;
                });

                const groups = (await Promise.all(groupPromises)).filter(Boolean) as ActiveGroupOrder[];
                setActiveGroupOrders(groups);
            }
        } catch (error) {
            console.error('Error fetching active group orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchActiveGroupOrders();
        }
    }, [isOpen]);

    const renderContent = () => {
        switch (activeTab) {
            case 'activeGroup':
                if (loading) {
                    return (
                        <div className="text-center text-gray-500 py-8">
                            در حال بارگذاری...
                        </div>
                    );
                }
                return activeGroupOrders.length > 0 ? (
                    <div className="space-y-4">
                        {activeGroupOrders.map((order) => (
                            <OrderItem
                                key={order.id}
                                imageUrl={order.imageUrl}
                                endTime={order.endTime}
                                leaderName={order.leaderName}
                                groupId={order.id}
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