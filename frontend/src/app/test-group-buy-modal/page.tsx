"use client";

import React, { useState } from 'react';
import GroupBuyResultModal from '@/components/modals/GroupBuyResultModal';

const TestGroupBuyModalPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [scenario, setScenario] = useState<'settled' | 'leader_owes' | 'refund_due'>('settled');

  const scenarios = {
    settled: {
      actualMembers: 3,
      requiredMembers: 2, // Leader chose "with 2 friends", got exactly 2 friends
      initialPaid: 45000,
      finalLeaderPrice: 45000, // Same as initial = no payment needed
      orderSummary: {
        originalPrice: 150000,
        groupDiscount: 30000,
        finalItemsPrice: 120000,
        shippingCost: 15000,
        rewardCredit: 0,
        grandTotal: 135000,
        amountPaid: 45000,
      }
    },
    leader_owes: {
      actualMembers: 2,
      requiredMembers: 2, // Leader chose "with 2 friends", got only 1 friend
      initialPaid: 40000,
      finalLeaderPrice: 50000, // Less discount achieved = leader owes more
      orderSummary: {
        originalPrice: 150000,
        groupDiscount: 15000,
        finalItemsPrice: 135000,
        shippingCost: 15000,
        rewardCredit: 0,
        grandTotal: 150000,
        amountPaid: 40000,
      }
    },
    refund_due: {
      actualMembers: 5,
      requiredMembers: 2, // Leader chose "with 2 friends", got 4 friends
      initialPaid: 45000,
      finalLeaderPrice: 35000, // Better discount achieved = refund due
      orderSummary: {
        originalPrice: 150000,
        groupDiscount: 50000,
        finalItemsPrice: 100000,
        shippingCost: 15000,
        rewardCredit: 5000,
        grandTotal: 110000,
        amountPaid: 45000,
      }
    }
  };

  const currentScenario = scenarios[scenario];

  const openModal = (selectedScenario: typeof scenario) => {
    setScenario(selectedScenario);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">تست مودال نتیجه خرید گروهی</h1>
        
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 shadow">
            <h2 className="text-lg font-semibold mb-4">سناریوهای مختلف:</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => openModal('settled')}
                className="w-full p-3 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg text-right transition-colors"
              >
                <div className="font-medium">تسویه انجام شد</div>
                <div className="text-sm">لیدر انتخاب کرده "با ۲ دوست"، دقیقاً ۲ دوست پیوسته</div>
              </button>
              
              <button
                onClick={() => openModal('leader_owes')}
                className="w-full p-3 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg text-right transition-colors"
              >
                <div className="font-medium">لیدر باید پرداخت کند</div>
                <div className="text-sm">لیدر انتخاب کرده "با ۲ دوست"، فقط ۱ دوست پیوسته</div>
              </button>
              
              <button
                onClick={() => openModal('refund_due')}
                className="w-full p-3 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-right transition-colors"
              >
                <div className="font-medium">بازگشت وجه به لیدر</div>
                <div className="text-sm">لیدر انتخاب کرده "با ۲ دوست"، ۴ دوست پیوسته</div>
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-medium mb-2">اطلاعات سناریو فعلی:</h3>
            <div className="text-sm space-y-1 text-gray-600">
              <div>تعداد اعضا واقعی: {currentScenario.actualMembers}</div>
              <div>تعداد مورد نیاز: {currentScenario.requiredMembers + 1} (شامل لیدر)</div>
              <div>پرداخت اولیه: {currentScenario.initialPaid.toLocaleString('fa-IR')} تومان</div>
              <div>قیمت نهایی لیدر: {currentScenario.finalLeaderPrice.toLocaleString('fa-IR')} تومان</div>
              <div>تفاوت: {(currentScenario.finalLeaderPrice - currentScenario.initialPaid).toLocaleString('fa-IR')} تومان</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <GroupBuyResultModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        groupId="test-group-123"
        actualMembers={currentScenario.actualMembers}
        requiredMembers={currentScenario.requiredMembers}
        initialPaid={currentScenario.initialPaid}
        finalLeaderPrice={currentScenario.finalLeaderPrice}
        orderSummary={currentScenario.orderSummary}
        shareUrl="/test-share-url"
      />
    </div>
  );
};

export default TestGroupBuyModalPage;
