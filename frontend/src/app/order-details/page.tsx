"use client";

import CustomModal from "@/components/common/CustomModal";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FaArrowRight } from "react-icons/fa";
import { CgClose } from "react-icons/cg";

const OrderDetails: React.FC = () => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const products = ["محصول 1", "محصول 2", "محصول 3"];
	const router = useRouter();

	const handleCancelSubmit = () => {
		// Logic for handling cancellation submission
		console.log("Cancellation submitted");
		setIsModalOpen(false); // Close the modal after submission
	};

	return (
		<div className="min-h-screen bg-white p-4">
		{/* هدر */}
		<div className="sticky top-0 bg-white z-50 mb-4">
				<div className="relative flex items-center justify-between py-2">
					<h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold">جزئیات سفارش</h1>
                    <button onClick={() => router.back()} className="ml-auto p-2 hover:bg-gray-100 rounded-full" aria-label="بازگشت">
                        <FaArrowRight size={15} />
					</button>
				</div>
			</div>

			{/* اطلاعات سفارش */}
			<div className="space-y-4">
				{/* وضعیت سفارش */}
				<div>
					<div className="flex items-center justify-between text-xs py-6">
						<p className="block text-sm text-gray-600 ">وضعیت سفارش</p>
						<p className="flex items-center gap-1 text-red-600 " onClick={() => setIsModalOpen(true)}>
							لغو دریافت مرسوله <CgClose />
						</p>
					</div>
					<div className="bg-green-100 p-4 rounded-lg">
						<p className="text-green-600 text-xs pb-1">تامین توسط فروشنده</p>
						<div className="w-full bg-gray-200 rounded-full h-2.5">
							<div className="bg-green-600 h-2.5 rounded-full" style={{ width: "50%" }}></div>
						</div>
						<div className="flex mt-2">
							<span className="text-xs text-gray-500">مرحله بعد:</span>
							<span className="text-xs text-green-600">آماده سازی سفارش</span>
						</div>
					</div>
				</div>

				{/* زمان تحویل */}
				<div className="flex items-center justify-between text-xs py-6">
					<p className="block text-sm text-gray-600 ">زمان تحویل:</p>
					<p className="flex items-center gap-1 ">۱۲ تا ۱۵ دی</p>
				</div>

				{/* آدرس */}
				<div>
					<label className="block text-sm text-gray-600 mb-2">آدرس:</label>
					<p className="text-sm text-gray-900">
						مشهد، بلوار سجاد، کلاهدوز، کلاهدوز ۴
					</p>
					<span className="text-left block text-xs">ویرایش آدرس</span>
				</div>

				{/* رهگیری مراحل */}
				<div className="border-t pt-4">
					<h3 className="text-xs font-bold mb-3">رهگیری مراحل</h3>
					<div className="space-y-3 text-xs">
						<div className="flex items-center justify-between">
							<span className="text-gray-700">ثبت سفارش</span>
							<span className="text-green-600">انجام شد</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-700">در حال پردازش</span>
							<span className="text-green-600">در حال انجام</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-700">آماده ارسال</span>
							<span className="text-gray-500">به زودی</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-700">تحویل شده</span>
							<span className="text-gray-500">پس از ارسال</span>
						</div>
					</div>
				</div>

				{/* خلاصه سفارش - مشابه checkout */}
				<div className="bg-white px-3 py-5 rounded-lg  w-full">
					<div className="flex justify-between items-center pb-4 ">
						<p className="text-xs font-bold text-gray-800">خلاصه سفارش</p>
					</div>

					<div className='border-b-black/30 border-b-3 pb-2 space-y-4'>
						<div className="flex justify-between items-center text-xs">
							<p className="text-gray-600">قیمت اصلی کالا(ها): </p>
							<p className="font-medium">۲۰۰,۰۰۰ تومان</p>
						</div>

						<div className="flex justify-between items-center text-xs">
							<p className="text-gray-600">تخفیف خرید گروهی: </p>
							<p className="font-medium text-red-600">۲۰۰,۰۰۰ تومان</p>
						</div>
						<div className="flex justify-between items-center text-xs">
							<p className="text-gray-600">قیمت نهایی کالا(ها): </p>
							<p className="font-medium ">۲۰۰,۰۰۰ تومان</p>
						</div>
					</div>
					<div className='py-2 space-y-2 '>
						<div className="flex justify-between items-center text-xs">
							<p className="text-gray-600">هزینه ارسال: </p>
							<p className="font-medium text-green-600">رایگان</p>
						</div>
						<div className="flex justify-between items-center text-xs">
							<p className="text-gray-800 font-medium">مبلغ کل: </p>
							<p className="font-bold">۲۰۰,۰۰۰ تومان</p>
						</div>
					</div>
				</div>

				{/* سایر اطلاعات سفارش */}
				<div className="space-y-3 border-t pt-4">
					<div className="flex items-center justify-between gap-4">
						<label className="block text-sm text-gray-600 mb-2">کد سفارش</label>
						<p className="text-sm text-gray-900">AROAPVR</p>
					</div>
					<div className="flex items-center justify-between gap-4">
						<label className="block text-sm text-gray-600 mb-2">تاریخ ثبت سفارش</label>
						<p className="text-sm text-gray-900">۱۴۰۳/۰۱/۱۲</p>
					</div>
					<div className="flex items-center justify-between gap-4">
						<label className="block text-sm text-gray-600 mb-2">تحویل‌گیرنده :</label>
						<p className="text-sm text-gray-900">علت حسینی</p>
					</div>
					<div className="flex items-center justify-between gap-4">
						<label className="block text-sm text-gray-600 mb-2">شماره تماس :</label>
						<p className="text-sm text-gray-900">09180060181</p>
					</div>
				</div>

				{/* استفاده از CustomModal */}
				<CustomModal
					title="درخواست لغو مرسوله"
					isOpen={isModalOpen}
					cancelLabel="انصراف"
					submitLabel="لغو سفارش" // Ensure this is provided
					onClose={() => setIsModalOpen(false)}
					onSubmit={handleCancelSubmit} // Pass the onSubmit function
				>
					<p className="text-xs leading-8 py-5 font-bold">در صورت لغو این کالاها مبلغ مرجوعی تا حداکثر طی ۴۸ ساعت به حساب کارت بانکی که با آن پرداخت کرده اید واریز خواهد شد</p>
					<p className="mt-2">محصولات خریداری شده:</p>
					<div className="flex items-center gap-4 bg-white p-3">
						<img
							src="https://avaneed.com/wp-content/uploads/2024/03/nothing-phone-1-black.webp"
							alt="Product"
							className="w-20 h-20"
						/>
						<div className="text-xs flex flex-col gap-9">
							<p>اسم محصول</p>
							<p>  ۱۳۳ هزار تومان</p>
						</div>
					</div>
					<label className="block mt-4">علت لغو:</label>
					<textarea className="border rounded w-full p-2" rows={3} />
				</CustomModal>
			</div>
		</div>
	);
};

export default OrderDetails;