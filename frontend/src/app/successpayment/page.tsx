"use client"

import CustomModal from '@/components/common/CustomModal';
import PrevPage from '@/components/common/PrevPage';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BiInfoCircle } from 'react-icons/bi';

function Page() {
    const [time, setTime] = useState({
        hours: 23,
        minutes: 59,
        seconds: 27,
        milliseconds: 2
    });
    const [isModalOpen, setIsModalOpen] = useState(false); // State for the payment details modal
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false); // State for Info Modal
    const [infoMessage, setInfoMessage] = useState("این اطلاعات بیشتر در مورد محصول است."); // Message for the modal

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
  const [paymentDetails, setPaymentDetails] = useState({
        amount: 134000, // Example amount
        method: 'کارت به کارت', // Example payment method
        transactionId: '123456789', // Example transaction ID
        date: '1402/01/01' // Example date
    });
    // Convert numbers to Persian digits
    const toPersianNumber = (num: number) => {
        return num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
    };

    return (
        <div className="min-h-screen bg-white ">
            {/* Back Button */}
            <PrevPage title='' className='pt-0' />

            <div className="flex flex-col items-center mt-5">
                <div className='border-b-2 flex w-full items-center justify-center'>
                    {/* Product Image */}
                    <div className="bg-gray-200 size-20 rounded-lg mb-6 flex items-center justify-center">
                        <img src="https://funtura.in/tvm/wp-content/themes/funtura/assets/images/success.svg" alt="" />
                    </div>

                    {/* Success Message */}
                    <div className="text-center mb-6">
                        <h1 className="text-xs font-bold mb-2">
                            <span className="px-2 py-1 rounded ">سفارش شما با موفقیت ثبت شد</span>
                        </h1>
                        <Link href="#" className="text-gray-600 underline text-xs" onClick={() => setIsModalOpen(true)}>
                            جزئیات پرداخت&gt;
                        </Link>
                    </div>
                </div>

                {/* Group Info */}
                <div className="w-full  p-4 rounded-lg mb-6 mt-3 space-y-8">
                    <div className="text-green-600 font-medium text-center text-xs  mt-4">
                        <p>                        گروه جدید تشکیل بده و کل پرداختیت رو پس بگیر!
                        </p>
                        <p className="text-gray-800  text-xs mt-3 text-left " onClick={() => setIsInfoModalOpen(true)}>
                            اطلاعات بیشتر
                        </p>
                    </div>


                    {/* Timer */}
                    <div className="flex justify-center gap-2 items-center text-xs mb-4">
                        <span className="text-gray-600">زمان باقیمانده:</span>
                        <div className="flex gap-1 items-center">
                            <div className="bg-white px-2 py-1 rounded min-w-[28px] text-center">
                                {toPersianNumber(time.milliseconds)}
                            </div>
                            <span>:</span>
                            <div className="bg-white px-2 py-1 rounded min-w-[28px] text-center">

                                {toPersianNumber(time.seconds)}
                            </div>
                            <span>:</span>
                            <div className="bg-white px-2 py-1 rounded min-w-[28px] text-center">
                                {toPersianNumber(time.minutes)}
                            </div>
                            <span>:</span>
                            <div className="bg-white px-2 py-1 rounded min-w-[28px] text-center">
                                {toPersianNumber(time.hours)}
                            </div>
                        </div>
                    </div>

                    {/* Invite Button */}
                    <button className="w-full bg-yellow-300 text-black text-xs py-3 rounded-lg flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
                        </svg>
                        دعوت دوستان
                    </button>
                </div>

                {/* Edit Order Button */}
                <button className="w-full fixed bottom-0 bg-[#CE4032] text-white py-3 h-[50px] font-medium">
                    ویرایش و پیگیری سفارش
                </button>


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



            <CustomModal
                    isOpen={isInfoModalOpen}
                    onClose={() => setIsInfoModalOpen(false)}
                    title="اطلاعات بیشتر"
                >
                    <p>{infoMessage}</p>
                </CustomModal>
            </div>
        </div>
    )
}

export default Page
