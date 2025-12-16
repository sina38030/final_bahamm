"use client";

import { useEffect, useState } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import { toFa } from "@/utils/toFa";

const ADMIN_API_BASE_URL = "/backend/api";

async function fetchJSON<T>(url: string, options?: RequestInit, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    ...options,
    signal,
    headers: {
      Accept: "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

function isAbort(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "AbortError" || err.message.includes("aborted"))
  );
}

export default function SettlementsContent() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
                  const data = await fetchJSON<any[]>(
            `${ADMIN_API_BASE_URL}/admin/settlements?limit=1000`,
            undefined,
            ctrl.signal
          );
        if (!alive) return;
        setSettlements(data);
        // Load refunds queue in parallel
        try {
          const refundsData = await fetchJSON<any[]>(
            `${ADMIN_API_BASE_URL}/admin/refunds?limit=1000`,
            undefined,
            ctrl.signal
          );
          if (alive) setRefunds(refundsData);
        } catch (e) {
          // ignore
        }
      } catch (err: any) {
        if (!isAbort(err)) {
          console.error("Settlements error:", err);
          if (alive) setError(err?.message ?? "خطای ناشناخته");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">در حال بارگذاری...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        خطا: {error}
      </div>
    );
  }

  // Sort settlements descending by id for newest first
  const sorted = [...settlements].sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0));
  const latestId = sorted.length > 0 ? sorted[0].id : null;

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">تسویه‌های گروهی</h2>
        <p className="text-gray-600">
          {latestId ? <>آخرین شماره ردیف: <span className="font-semibold">#{toFa(latestId)}</span></> : null}
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {settlements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            هیچ گروهی نیاز به تسویه ندارد
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    شناسه گروه
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    رهبر گروه
                  </th>
                                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      دوستان (انتظار/واقعی)
                    </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مبلغ تسویه
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    پرداخت رهبر
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    انتظار/واقعی
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    اختلاف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاریخ ایجاد
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وضعیت
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sorted.map((settlement) => (
                  <tr key={settlement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaExclamationTriangle className="text-yellow-500 ml-2" />
                        #{settlement.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {settlement.leader_username || settlement.leader_name || 'نامشخص'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {settlement.leader_phone ? `***${settlement.leader_phone.slice(-4)}` : '****'}
                        </div>
                      </div>
                    </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{toFa(settlement.expected_friends)} / {toFa(settlement.actual_friends || 0)}</div>
                        <div className="text-xs text-gray-500">
                          {settlement.leader_order_id && (
                            <>سفارش رهبر #{settlement.leader_order_id}</>
                          )}
                        </div>
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-red-600">
                        {toFa(settlement.settlement_amount)} تومان
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {toFa(settlement.leader_initial_payment || 0)} تومان
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{toFa(settlement.expected_total || 0)} / {toFa(settlement.actual_total || 0)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={(settlement.difference || 0) > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                        {toFa(Math.abs(settlement.difference || 0))} تومان { (settlement.difference || 0) > 0 ? 'بدهکار' : (settlement.difference || 0) < 0 ? 'بستانکار' : '' }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(settlement.created_at).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {settlement.settlement_paid ? (
                        <div>
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            تسویه شده ✓
                          </span>
                          {settlement.settlement_paid_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              پرداخت: {new Date(settlement.settlement_paid_at).toLocaleDateString("fa-IR")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            در انتظار پرداخت تسویه
                          </span>
                          {settlement.expires_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              انقضا: {new Date(settlement.expires_at).toLocaleDateString("fa-IR")}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-bold text-gray-800">بازپرداخت به رهبر (واریزی)</h2>
        <div className="mt-1 text-sm text-gray-600">
          {(() => {
            const sortedRefunds = [...refunds].sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0));
            const latestRefundId = sortedRefunds.length > 0 ? sortedRefunds[0].id : null;
            return latestRefundId ? (
              <span>آخرین شماره ردیف: <span className="font-semibold">#{toFa(latestRefundId)}</span></span>
            ) : null;
          })()}
        </div>
        <div className="mt-4 bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">گروه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رهبر</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مبلغ بازگشت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کارت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">درخواست شده</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعیت</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...refunds].sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0)).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">#{r.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{r.leader_username || r.leader_name || 'نامشخص'}</div>
                    <div className="text-sm text-gray-500">{r.leader_phone ? `***${r.leader_phone.slice(-4)}` : '****'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-lg font-bold text-blue-600">{toFa(r.refund_amount)} تومان</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.card_number || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.requested_at ? new Date(r.requested_at).toLocaleDateString('fa-IR') : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {r.refund_paid_at ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">پرداخت شده ✓</span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">در انتظار پرداخت</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {!r.refund_paid_at && (
                      <button
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                        onClick={async () => {
                          try {
                            await fetchJSON(`${ADMIN_API_BASE_URL}/admin/refunds/${r.id}/mark-paid`, { method: 'POST' });
                            alert('به عنوان پرداخت‌شده علامت‌گذاری شد');
                            // refresh and preserve row (will show as paid)
                            const newRefunds = await fetchJSON<any[]>(`${ADMIN_API_BASE_URL}/admin/refunds?limit=1000`);
                            setRefunds(newRefunds);
                          } catch (e: any) {
                            alert(e?.message || 'خطا');
                          }
                        }}
                      >
                        علامت‌گذاری پرداخت شد
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {refunds.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-center text-gray-500" colSpan={7}>موردی برای بازپرداخت وجود ندارد</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {settlements.length > 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <FaExclamationTriangle className="text-yellow-400 ml-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                توجه: سفارشات این گروه‌ها تا پرداخت تسویه در صفحه سفارشات نمایش داده نمی‌شوند
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                رهبران این گروه‌ها باید تفاوت قیمت را پرداخت کنند تا سفارشات نهایی شوند.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
