import React from 'react';
import CustomModal from '@/components/common/CustomModal';

type ShippingInfoModalProps = {
    isOpen: boolean;
    onClose: () => void;
}

export default function ShippingInfoModal({ isOpen, onClose }: ShippingInfoModalProps) {
    return (
        <CustomModal
            isOpen={isOpen}
            onClose={onClose}
            title="اطلاعات ارسال"
            submitLabel="متوجه شدم"
            cancelLabel=""
            onSubmit={onClose}
        >
            <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">روش‌های ارسال</h3>
                    <ul className="space-y-3 text-green-700 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-green-600">•</span>
                            <span>ارسال با پست پیشتاز (2-3 روز کاری)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-600">•</span>
                            <span>ارسال با پست سفارشی (3-5 روز کاری)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-600">•</span>
                            <span>ارسال با تیپاکس (1-2 روز کاری)</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-800 mb-2">هزینه‌های ارسال</h3>
                    <ul className="space-y-2 text-purple-700 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-purple-600">•</span>
                            <span>ارسال رایگان برای سفارش‌های بالای ۵۰۰,۰۰۰ تومان</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-purple-600">•</span>
                            <span>هزینه ارسال پیشتاز: ۳۵,۰۰۰ تومان</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-purple-600">•</span>
                            <span>هزینه ارسال سفارشی: ۲۵,۰۰۰ تومان</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-purple-600">•</span>
                            <span>هزینه ارسال تیپاکس: ۴۵,۰۰۰ تومان</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-orange-800 mb-2">نکات مهم</h3>
                    <ul className="space-y-2 text-orange-700 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-orange-600">•</span>
                            <span>زمان ارسال از ۲۴ ساعت پس از ثبت سفارش آغاز می‌شود</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-orange-600">•</span>
                            <span>در صورت عدم حضور در آدرس، کالا به اداره پست منتقل می‌شود</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-orange-600">•</span>
                            <span>لطفاً آدرس دقیق و شماره تماس معتبر وارد کنید</span>
                        </li>
                    </ul>
                </div>
            </div>
        </CustomModal>
    );
} 