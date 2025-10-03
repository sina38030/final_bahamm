'use client';

import PrevPage from '@/components/common/PrevPage';
import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/utils/apiClient';
import { useAuth } from '@/contexts/AuthContext';

type TransactionItem = {
  id: string;
  type: 'PAYMENT' | 'SETTLEMENT' | 'REFUND_PAYOUT' | 'COINS_EARNED';
  direction: 'IN' | 'OUT';
  amount: number;
  currency?: 'TOMAN' | 'COIN' | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  timestamp: string;
  order_id?: number | null;
  group_order_id?: number | null;
  payment_ref_id?: string | null;
};

type TransactionsResponse = {
  items: TransactionItem[];
  total: number;
  page: number;
  page_size: number;
};

export default function TransactionsPage() {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<TransactionsResponse>({ items: [], total: 0, page: 1, page_size: 20 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/users/transactions?page=${page}&page_size=20`);
      if (res.ok) {
        const json = (await res.json()) as TransactionsResponse;
        setData(json);
      } else {
        setError('خطا در دریافت تراکنش‌ها');
      }
    } catch (e) {
      setError('خطای شبکه');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void fetchTransactions(1);
    }
  }, [isAuthenticated]);

  const formatAmount = (amount: number) => amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const badge = (item: TransactionItem) => {
    const base = 'px-2 py-1 rounded text-xs font-medium';
    if (item.currency === 'COIN') return <span className={`${base} bg-yellow-50 text-yellow-700`}>سکه</span>;
    if (item.direction === 'IN') return <span className={`${base} bg-green-50 text-green-700`}>واریز</span>;
    return <span className={`${base} bg-red-50 text-red-700`}>برداشت</span>;
  };

  const typeLabel: Record<TransactionItem['type'], string> = useMemo(() => ({
    PAYMENT: 'پرداخت سفارش',
    SETTLEMENT: 'تسویه گروه',
    REFUND_PAYOUT: 'بازگشت وجه',
    COINS_EARNED: 'سکه‌های دریافتی',
  }), []);

  return (
    <div className="min-h-screen pb-16">
      <PrevPage title="تراکنش‌ها" />

      <div className="bg-white rounded-lg shadow-sm divide-y">
        {loading && (
          <div className="p-4 text-center text-gray-500">در حال بارگذاری...</div>
        )}
        {error && (
          <div className="p-4 text-center text-red-600">{error}</div>
        )}
        {!loading && !error && data.items.length === 0 && (
          <div className="p-6 text-center text-gray-600">هیچ تراکنشی یافت نشد</div>
        )}

        {!loading && !error && data.items.map((item) => (
          <div key={item.id} className="p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{item.title || typeLabel[item.type]}</span>
                {badge(item)}
              </div>
              {item.description && (
                <span className="text-xs text-gray-500">{item.description}</span>
              )}
              <span className="text-[11px] text-gray-400">{new Date(item.timestamp).toLocaleString('fa-IR')}</span>
            </div>
            <div className="text-left">
              {item.currency === 'COIN' ? (
                <span className={`font-bold ${item.direction === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                  {item.direction === 'IN' ? '+' : '-'}{formatAmount(item.amount)} <span className="text-xs text-gray-500">سکه</span>
                </span>
              ) : (
                <span className={`font-bold ${item.direction === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                  {item.direction === 'IN' ? '+' : '-'}{formatAmount(item.amount)} <span className="text-xs text-gray-500">تومان</span>
                </span>
              )}
              {item.payment_ref_id && (
                <div className="text-[11px] text-gray-400">کد پیگیری: {item.payment_ref_id}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Simple pagination */}
      {data.total > data.page_size && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
            disabled={data.page <= 1 || loading}
            onClick={() => fetchTransactions(data.page - 1)}
          >
            قبلی
          </button>
          <span className="text-sm text-gray-600">صفحه {data.page}</span>
          <button
            className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
            disabled={data.page * data.page_size >= data.total || loading}
            onClick={() => fetchTransactions(data.page + 1)}
          >
            بعدی
          </button>
        </div>
      )}

      
    </div>
  );
}


