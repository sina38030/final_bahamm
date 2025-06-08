import React from 'react';
import CustomModal from '@/components/common/CustomModal';

type ConsolidationInfoModalProps = {
    isOpen: boolean;
    onClose: () => void;
}

export default function ConsolidationInfoModal({ isOpen, onClose }: ConsolidationInfoModalProps) {
    return (
        <CustomModal
            isOpen={isOpen}
            onClose={onClose}
            title="تجمیع سفارش"
            submitLabel="متوجه شدم"
            cancelLabel=""
            onSubmit={onClose}
        >
            <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">چگونه سفارش‌های خود را تجمیع کنیم؟</h3>
                    <p className="text-blue-700 text-sm leading-relaxed">
                        با تجمیع سفارش‌های خود می‌توانید هزینه ارسال را کاهش دهید. برای این کار:
                    </p>
                    <ul className="mt-3 space-y-2 text-blue-700 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600">•</span>
                            <span>سفارش‌های خود را در سبد خرید نگه دارید</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600">•</span>
                            <span>زمانی که مبلغ سفارش به ۲۰۰,۰۰۰ تومان برسد، هزینه ارسال رایگان خواهد شد</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600">•</span>
                            <span>در صورت تجمیع سفارش، هزینه ارسال به صورت یک‌پارچه محاسبه می‌شود</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">مزایای تجمیع سفارش</h3>
                    <ul className="space-y-2 text-gray-700 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-gray-600">•</span>
                            <span>کاهش هزینه ارسال</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-gray-600">•</span>
                            <span>ارسال یک‌پارچه سفارش‌ها</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-gray-600">•</span>
                            <span>مدیریت آسان‌تر سفارش‌ها</span>
                        </li>
                    </ul>
                </div>
            </div>
        </CustomModal>
    );
} 