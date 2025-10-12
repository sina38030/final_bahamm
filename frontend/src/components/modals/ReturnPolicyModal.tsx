import React from 'react';
import CustomModal from '@/components/common/CustomModal';

type ReturnPolicyModalProps = {
    isOpen: boolean;
    onClose: () => void;
}

export default function ReturnPolicyModal({ isOpen, onClose }: ReturnPolicyModalProps) {
    return (
        <CustomModal
            isOpen={isOpen}
            onClose={onClose}
            title="راهنمای مرجوع کردن کالا"
            submitLabel="متوجه شدم"
            cancelLabel=""
            onSubmit={onClose}
        >
            <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">شرایط مرجوع کردن کالا</h3>
                    <ul className="space-y-3 text-blue-700 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600">•</span>
                            <span>کالا باید در بسته‌بندی اصلی و بدون استفاده باشد</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600">•</span>
                            <span>درخواست مرجوعی باید ظرف ۷ روز از تاریخ دریافت کالا ثبت شود</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600">•</span>
                            <span>هزینه ارسال مرجوعی برای کالاهای با قیمت بالای ۵۰۰,۰۰۰ تومان رایگان است</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">مراحل مرجوع کردن کالا</h3>
                    <ol className="space-y-3 text-gray-700 text-sm list-decimal list-inside">
                        <li>ورود به پنل کاربری و انتخاب کالای مورد نظر</li>
                        <li>تکمیل فرم درخواست مرجوعی و ذکر دلیل مرجوعی</li>
                        <li>انتظار برای تایید درخواست توسط کارشناسان</li>
                        <li>دریافت کد پیگیری و برچسب مرجوعی</li>
                        <li>ارسال کالا به آدرس مرکز مرجوعی</li>
                        <li>بررسی کالا و پرداخت مبلغ در صورت تایید</li>
                    </ol>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-yellow-800 mb-2">نکات مهم</h3>
                    <ul className="space-y-2 text-yellow-700 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-600">•</span>
                            <span>لطفاً از ارسال کالای آسیب دیده خودداری کنید</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-600">•</span>
                            <span>برچسب مرجوعی را به درستی روی بسته نصب کنید</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-600">•</span>
                            <span>از ارسال کالا با پست سفارشی اطمینان حاصل کنید</span>
                        </li>
                    </ul>
                </div>
            </div>
        </CustomModal>
    );
} 