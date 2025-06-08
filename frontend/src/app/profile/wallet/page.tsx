'use client';

import PrevPage from '@/components/common/PrevPage';
import React, { useState } from 'react';
import { FaWallet, FaPlus } from 'react-icons/fa';

export default function WalletPage() {
    const [balance, setBalance] = useState(0);
    const [amount, setAmount] = useState('');
    const [displayAmount, setDisplayAmount] = useState('');

    const formatNumber = (num: string | number) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^\d]/g, ''); // فقط اعداد را نگه می‌دارد
        setAmount(value);
        setDisplayAmount(value ? formatNumber(value) : '');
    };

    const handlePredefinedAmount = (value: number) => {
        setAmount(value.toString());
        setDisplayAmount(formatNumber(value));
    };

    const handleAddFunds = () => {
        console.log('Adding funds:', amount);
    };

    const predefinedAmounts = [
        { value: 1000000, label: '۱ میلیون' },
        { value: 2000000, label: '۲ میلیون' },
        { value: 5000000, label: '۵ میلیون' },
        { value: 10000000, label: '۱۰ میلیون' },
    ];

    return (
        <div className="min-h-screen mx-auto">
            <PrevPage title="کیف پول من" />
            
            {/* نمایش موجودی */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">موجودی فعلی</span>
                    <FaWallet size={24} className="text-primary" />
                </div>
                <div className="text-2xl font-bold flex items-baseline gap-2">
                    {formatNumber(balance)}
                    <span className="text-sm text-gray-600">تومان</span>
                </div>
            </div>

            {/* بخش افزایش موجودی */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">افزایش موجودی</h2>
                
                {/* مبالغ از پیش تعیین شده */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {predefinedAmounts.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => handlePredefinedAmount(item.value)}
                            className={`p-3 rounded-lg text-center border transition-all ${
                                amount === item.value.toString()
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-gray-200 hover:border-primary'
                            }`}
                        >
                            {item.label}
                            <span className="text-sm text-gray-600 block">تومان</span>
                        </button>
                    ))}
                </div>

                {/* ورود مبلغ دلخواه */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-600 mb-2">
                        یا مبلغ مورد نظر خود را وارد کنید
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={displayAmount}
                            onChange={handleAmountChange}
                            className="w-full p-3 border border-gray-200 rounded-lg text-right"
                            placeholder="0"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
                            تومان
                        </span>
                    </div>
                </div>

                {/* دکمه پرداخت */}
                <button
                    onClick={handleAddFunds}
                    disabled={!amount || parseInt(amount) <= 0}
                    className="w-full bg-primary text-white p-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    پرداخت و افزایش موجودی
                    <FaPlus size={16} />
                </button>
            </div>
        </div>
    );
} 