"use client";
import { Button } from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';



function TwoLeadCheckoutPage() {


    const router = useRouter(); // Initialize useRouter



    const handleTrackOrderClick = () => {
        router.push('/order-details'); // Navigate to the order-details page
    };

    return (
        <div className='min-h-screen bg-white  pb-9 '>
            <div className=" bg-white px-3 py-5 rounded-lg  w-full">
                <div className="flex justify-between items-center pb-4 ">
                    <p className="text-xs font-bold text-gray-800">خلاصه سفارش</p>
                </div>

                <div className='border-b-black/30 border-b-3 pb-2 space-y-4'>
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
                <div className='border-b-black/30 border-b-3 py-2  '>
                    <div className="flex justify-between items-center text-xs">
                        {/* اگه 1 ککالا بود بزنه کالا و اگه چند تا بود بنویسه کالاها */}
                        <p className="text-gray-600">  هزینه ارسال: </p>
                        <p className="font-medium ">۲۰۰,۰۰۰ تومان</p>
                    </div>
                </div>
                <div className='border-b-black/30 border-b-3 py-2 space-y-2 '>
                    <div className="flex justify-between items-center text-xs">
                        {/* اگه 1 ککالا بود بزنه کالا و اگه چند تا بود بنویسه کالاها */}
                        <p className="text-gray-600"> جایزه تجمیع سفارشات: </p>
                        <p className="font-medium text-red-600">۲۰۰,۰۰۰ تومان</p>
                    </div>
                   
                </div>
                <div className='border-b-black/30 border-b-3 py-2 space-y-2 '>
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
        </div>
    );
}

export default TwoLeadCheckoutPage;