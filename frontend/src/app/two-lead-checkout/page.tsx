"use client";
import CustomModal from '@/components/common/CustomModal';
import { Button } from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Wheel } from 'react-custom-roulette';
import { CiGift } from 'react-icons/ci';

const data = [
    { option: "6", style: { backgroundColor: "pink", textColor: "darkblue" } },
    { option: "7", style: { backgroundColor: "purple", textColor: "gold" } },
    { option: "8", style: { backgroundColor: "cyan", textColor: "navy" } },
    { option: "9", style: { backgroundColor: "lime", textColor: "maroon" } },
];

function TwoLeadCheckoutPage() {
    const [mustSpin, setMustSpin] = useState(false);
    const [spinnerSpinned, setSpinnerSpinned] = useState(false);
    const [showSpinner, setShowSpinner] = useState(false);
    const [prizeMessage, setPrizeMessage] = useState(""); // State for prize message
    const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false); // State for prize modal
    const router = useRouter(); // Initialize useRouter

    const handleSpinClick = () => {
        setMustSpin(true);
        setShowSpinner(true);
    };

    const handlePrizeModalClose = () => {
        setIsPrizeModalOpen(false);
    };

    const handleTrackOrderClick = () => {
        router.push('/order-details'); // Navigate to the order-details page
    };

    return (
        <div className='min-h-screen bg-white  pb-9 '>
            <div className='flex flex-col items-center border-b-5 p-4'>
                <h1 className="text-[10px] font-semibold mb-4 flex items-center gap-3">   <CiGift />  گردونه رو بچرخون و شانست رو برای بردن جوایز نقدی امتحان کن!</h1>

                <Wheel
                    mustStartSpinning={mustSpin}
                    prizeNumber={2}
                    data={data}
                    onStopSpinning={() => {
                        setMustSpin(false);
                        setSpinnerSpinned(true);
                        setShowSpinner(false);
                        // Set the prize message based on the result
                        const prizeIndex = Math.floor(Math.random() * data.length); // Randomly select a prize
                        setPrizeMessage(`شما جایزه ${data[prizeIndex].option} را بردید!`); // Set the prize message
                        setIsPrizeModalOpen(true); // Open the prize modal
                    }}
                />

                <Button onClick={handleSpinClick} className="mb-4 bg-red-600 text-white mx-auto flex">
                    چرخاندن گردونه
                </Button>
            </div>
            <div className=" bg-white px-3 py-5 rounded-lg  w-full">
                <div className="flex justify-between items-center pb-4 ">
                    <p className="text-xs font-bold text-gray-800">خلاصه سفارش</p>
                    {/* <Link href="/" className="text-primary text-xs hover:text-primary-dark">مشاهده کالا</Link> */}
                </div>

                <div className='border-b-black/30 border-b-1 pb-2 space-y-4'>
                    <div className="flex justify-between items-center text-xs">
                        {/* اگه 1 ککالا بود بزنه کالا و اگه چند تا بود بنویسه کالاها */}
                        <p className="text-gray-600">قیمت اصلی کالا(ها): </p>
                        <p className="font-medium">۲۰۰,۰۰۰ تومان</p>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                        {/* اگه 1 ککالا بود بزنه کالا و اگه چند تا بود بنویسه کالاها */}
                        <p className="text-gray-600">تخفیف خرید گروهی: </p>
                        <p className="font-medium text-red-600">۲۰۰,۰۰۰ تومان</p>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        {/* اگه 1 ککالا بود بزنه کالا و اگه چند تا بود بنویسه کالاها */}
                        <p className="text-gray-600"> قیمت نهایی کالا(ها): </p>
                        <p className="font-medium ">۲۰۰,۰۰۰ تومان</p>
                    </div>
                </div>
                <div className='border-b-black/30 border-b-1 py-2  '>
                    <div className="flex justify-between items-center text-xs">
                        {/* اگه 1 ککالا بود بزنه کالا و اگه چند تا بود بنویسه کالاها */}
                        <p className="text-gray-600">  هزینه ارسال: </p>
                        <p className="font-medium ">۲۰۰,۰۰۰ تومان</p>
                    </div>
                </div>
                <div className='border-b-black/30 border-b-1 py-2 space-y-2 '>
                    <div className="flex justify-between items-center text-xs">
                        {/* اگه 1 ککالا بود بزنه کالا و اگه چند تا بود بنویسه کالاها */}
                        <p className="text-gray-600"> جایزه تجمیع سفارشات: </p>
                        <p className="font-medium text-red-600">۲۰۰,۰۰۰ تومان</p>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        {/* اگه 1 ککالا بود بزنه کالا و اگه چند تا بود بنویسه کالاها */}
                        <p className="text-gray-600">جایزه چرخ گردون: </p>
                        <p className="font-medium text-red-600">۲۰۰,۰۰۰ تومان</p>
                    </div>
                </div>
                <div className='border-b-black/30 border-b-1 py-2 space-y-2 '>
                    <div className="flex justify-between items-center text-xs">
                        {/* اگه 1 ککالا بود بزنه کالا و اگه چند تا بود بنویسه کالاها */}
                        <p className="text-gray-600"> جمع کل: </p>
                        <p className="font-medium ">۲۰۰,۰۰۰ تومان</p>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        {/* اگه 1 ککالا بود بزنه کالا و اگه چند تا بود بنویسه کالاها */}
                        <p className="text-gray-600">مبلغ پرداخت شده:: </p>
                        <p className="font-medium text-green-600">۲۰۰,۰۰۰ تومان</p>
                    </div>
                </div>
                <div className=' py-4 '>
                    <div className="flex justify-between items-center text-xs">
                        {/* اگه 1 ککالا بود بزنه کالا و اگه چند تا بود بنویسه کالاها */}
                        <p className="text-green-600 font-bold">  مبلغی که به شما عودت داده خواهد شد: </p>
                        <p className="text-green-600 font-bold ">۲۰۰,۰۰۰ تومان</p>
                    </div>
                </div>

            </div>
            <Button
                className="w-full bg-red-600 text-white block text-center text-xl font-bold py-2 h-[50px] rounded-none fixed right-0 bottom-0"
                onClick={handleTrackOrderClick} // Update the onClick handler
            >
                پیگیری سفارش
            </Button>




            <CustomModal
                isOpen={isPrizeModalOpen}
                onClose={handlePrizeModalClose}
                title="تبریک!"
            >
                <p>{prizeMessage}</p>
            </CustomModal>
        </div>

        
    );
}

export default TwoLeadCheckoutPage;