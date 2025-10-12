"use client";

import PrevPage from "@/components/common/PrevPage";
import { Suspense, useEffect, useState } from "react";
import { FaGift } from "react-icons/fa"; // آیکون‌ها
import { IoIosStar } from "react-icons/io"; // آیکون ستاره
import CustomModal from '@/components/common/CustomModal'; // Import CustomModal
import { useSearchParams } from 'next/navigation'; // Import useSearchParams

function SuccessBuyContent() {
    const searchParams = useSearchParams();
    // TODO: Get the actual groupBuyInviteCode, perhaps from router query params or state after group buy creation
    const groupBuyInviteCode = searchParams.get('inviteCode') || "DEFAULT_INVITE_CODE";
    

    const [time, setTime] = useState({
        hours: 23,
        minutes: 59,
        seconds: 27,
        milliseconds: 2
    });
    const [isModalOpen, setIsModalOpen] = useState(false); // State for the payment details modal
    const [paymentDetails, setPaymentDetails] = useState({
        amount: 134000, // Example amount
        method: 'کارت به کارت', // Example payment method
        transactionId: '123456789', // Example transaction ID
        date: '1402/01/01' // Example date
    });

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(prevTime => {
                const newTime = { ...prevTime };

                if (newTime.milliseconds > 0) {
                    newTime.milliseconds--;
                } else {
                    newTime.milliseconds = 9;
                    if (newTime.seconds > 0) {
                        newTime.seconds--;
                    } else {
                        newTime.seconds = 59;
                        if (newTime.minutes > 0) {
                            newTime.minutes--;
                        } else {
                            newTime.minutes = 59;
                            if (newTime.hours > 0) {
                                newTime.hours--;
                            } else {
                                // Timer completed
                                clearInterval(timer);
                            }
                        }
                    }
                }

                return newTime;
            });
        }, 100);

        return () => clearInterval(timer);
    }, []);


    // Convert numbers to Persian digits
    const toPersianNumber = (num: number) => {
        return num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
    };

    const handleInviteClick = () => {
        if (groupBuyInviteCode && groupBuyInviteCode !== "DEFAULT_INVITE_CODE") {
            const inviteLink = `${window.location.origin}/landingM?ref=${groupBuyInviteCode}`;
            navigator.clipboard.writeText(inviteLink)
                .then(() => {
                    alert("لینک دعوت کپی شد!"); // Replace with a proper toast notification
                })
                .catch(err => {
                    console.error('Failed to copy invite link: ', err);
                    alert("خطا در کپی کردن لینک.");
                });
        } else {
            alert("کد دعوت یافت نشد. لطفا مطمئن شوید خرید گروهی با موفقیت ایجاد شده است.");
            // Potentially fetch it if not available or guide user
        }
    };

    return (
        <div className="min-h-screen bg-[#D62B1A] p-4">
            {/* هدر */}
            <PrevPage title="" className="!bg-transparent" />
            <div className=" mb-6 w-full border-b-2 border-black/30">
                <div className="text-center">
                    <h1 className="text-white text-xs font-medium">
                        خرید گروهی با موفقیت انجام شد
                    </h1>
                    <p className="text-white text-left text-xs" onClick={() => setIsModalOpen(true)}>جزئیات پرداخت</p> {/* Open modal on click */}
                </div>
                {/* Timer */}
                <div className="flex justify-center gap-2 items-center text-xs my-6">
                    <span className=" text-white text-xs">زمان باقیمانده:</span>
                    <div className="flex gap-1 items-center">
                        <div className="bg-white px-2 py-1 rounded min-w-[28px] text-center font-bold">
                            {toPersianNumber(time.milliseconds)}
                        </div>
                        <span>:</span>
                        <div className="bg-white px-2 py-1 rounded min-w-[28px] text-center font-bold">
                            {toPersianNumber(time.seconds)}
                        </div>
                        <span>:</span>
                        <div className="bg-white px-2 py-1 rounded min-w-[28px] text-center font-bold">
                            {toPersianNumber(time.minutes)}
                        </div>
                        <span>:</span>
                        <div className="bg-white px-2 py-1 rounded min-w-[28px] text-center font-bold">
                            {toPersianNumber(time.hours)}
                        </div>
                    </div>
                </div>
                <div className="w-5"></div> {/* برای بالانس کردن layout */}
            </div>

            {/* بخش توضیحات */}
            <div className="text-center mb-6">
                <p className="text-white text-xs leading-6">
                    تا وقت تموم نشده دوستات رو دعوت کن و قیمت رو حتی به صفر برسون!
                </p>
                {/* Invite Button */}
                <button 
                    onClick={handleInviteClick}
                    className="w-full bg-yellow-300 mt-4 font-bold text-red-600 text-xs py-3 rounded-lg flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
                    </svg>
                    دعوت دوستان
                </button>
            </div>

            {/* کارت‌های تخفیف */}
            <div className="space-y-4">
                {/* کارت اول */}
                <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-3">
                    <div className="text-gray-400">
                        <FaGift size={24} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-base  text-gray-900 font-semibold">
                            تیکت اقتصادی (خرید گروهی با ۱ دوست)
                        </h2>
                        <p className="text-xs text-gray-600 mt-1">
                            ۱۱۱ تومان به ازای هر نفر و دوست شما
                        </p>
                    </div>
                </div>

                {/* کارت دوم */}
                <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-3">
                    <div className="text-gray-400">
                        <FaGift size={24} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-sm  text-gray-900 font-semibold">
                            تیکت اقتصادی (خرید گروهی با ۳ دوست)
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            ۱۱۱ تومان + ۹۹ تومان برای هر دوست
                        </p>
                    </div>
                </div>

                {/* بخش اضافی */}
                <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-2">
                    <div className="text-yellow-400">
                        <IoIosStar size={24} />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs  text-gray-900 font-semibold">
                            دوستانت هم بعد از خریدشون ۲۴ ساعت مهلت دارن تا بقیه رو دعوت کنند و بخشی یا همه ی پرداختیشون رو پس بگیرند!
                        </p>
                    </div>
                </div>
            </div>

            {/* Payment Details Modal */}
            <CustomModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="جزئیات پرداخت"
                submitLabel="بستن"
                hideFooter={true} // Hide footer if not needed
            >
                <p><strong>مقدار:</strong> {paymentDetails.amount} تومان</p>
                <p><strong>روش پرداخت:</strong> {paymentDetails.method}</p>
                <p><strong>شناسه تراکنش:</strong> {paymentDetails.transactionId}</p>
                <p><strong>تاریخ:</strong> {paymentDetails.date}</p>
            </CustomModal>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">در حال بارگذاری…</p></div>}>
            <SuccessBuyContent />
        </Suspense>
    );
}