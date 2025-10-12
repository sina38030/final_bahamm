"use client";

import CustomModal from "@/components/common/CustomModal";
import PrevPage from "@/components/common/PrevPage";
import { Button } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Import useRouter for navigation in Next.js
import { useState } from "react";
import dynamic from "next/dynamic";
import { BiPlus } from "react-icons/bi";
import { IoCheckboxSharp } from "react-icons/io5";

export default function OrderInfoPage() {
    const [selectedAddress, setSelectedAddress] = useState("");
    const [addresses, setAddresses] = useState<string[]>([]);
    const router = useRouter();
    const [mustSpin, setMustSpin] = useState(false);
    const [showSpinner, setShowSpinner] = useState(false);
    const [spinnerSpinned, setSpinnerSpinned] = useState(false);
    const [isAgreed, setIsAgreed] = useState(false); // State for agreement button
    const [modalMessage, setModalMessage] = useState(""); // State for modal message
    const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility

    const handleItemClick = (message: string) => {
        setModalMessage(message);
        setIsModalOpen(true); // Open the modal with the message
    };



    return (
        <div className="min-h-screen bg-white">
            {/* PrevPage Component */}
            <PrevPage title="اطلاعات سفارش" />

            {/* Address Section */}
            <div className="px-3 flex items-center gap-4 bg-white py-1 my-1 border-b-5 mb-2">
                {addresses.length === 0 ? (
                    <Button
                        className="bg-transparent text-black font-semibold text-xs px-1"
                        onClick={() => {
                            router.push("/profile/addresses"); // Navigate to address page
                        }}
                    >
                        <BiPlus />
                        افزودن آدرس
                    </Button>
                ) : (
                    <div className="space-y-2">
                        {addresses.map((address) => (
                            <div
                                key={address}
                                className="flex items-center gap-2"
                            >
                                <input
                                    type="radio"
                                    name="address"
                                    value={address}
                                    checked={selectedAddress === address}
                                    onChange={() => setSelectedAddress(address)}
                                />
                                <span>{address}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Product Details Section */}
            <div className="px-3">
                <h3 className="font-medium text-xs">اسم فروشگاه</h3>
            </div>
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

            {/* Shipping Cost Section */}
            <div className="flex flex-col gap-3 py-3 border-t-5 bg-white px-3 border-b-2 ">
                <div className="flex items-start justify-between text-xs">
                    <p className="font-bold">هزینه ارسال:</p>
                    <p>345435 تومان</p>
                </div>
                <div className="flex items-start justify-between text-xs">
                    <p className="font-bold">تخمین زمان ارسال:</p>
                    <p>بین 3 الی 7 روز</p>
                </div>
            </div>

            {/* Agreement Section */}
            <div className="border-b-5 p-3 rounded-lg bg-white">
                <p className="font-semibold text-xs">
                    با این روش ها هزینه ی ارسالت رو کاهش بده:
                </p>
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center justify-between w-full">
                        <p className="text-xs"> 1- موافقت با ارسال سفارش به ali221@</p>
                        {isAgreed ? ( // Conditional rendering based on isAgreed state
                            <span className="text-red-600 rounded-md" onClick={() => setIsAgreed(false)}> {/* Clickable checkmark */}
                                <IoCheckboxSharp size={30} className="" />
                            </span>
                        ) : (
                            <Button
                                className="border-red-600 border bg-transparent text-xs text-red-600 mr-2"
                                onClick={() => setIsAgreed(true)} // Set isAgreed to true on click
                            >
                                باشه موافقم
                            </Button>
                        )}
                    </div>
                </div>
                <span className="text-green-600 cursor-pointer text-xs" onClick={() => handleItemClick("این یک پیام اطلاعات بیشتر است.")}> 
                    اطلاعات بیشتر
                </span>
                <div className="flex items-center justify-between mt-4 ">
                    <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-center justify-between">
                            <p className="text-xs">
                                2- با خرید ۳۵۰۰۰ تومان دیگه از این فروشگاه ارسالت
                                رایگان میشه
                            </p>
                            <Link
                                href="/store"
                                className="text-white bg-green-600 p-0 w-fit min-w-10 rounded-md text-center shrink-0"
                            >
                                +
                            </Link>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div

                                className="bg-green-600 h-2.5 rounded-full"
                                style={{ width: "65%" }}
                                title="پیشرفت تا ارسال رایگان"
                            />
                        </div>
                        <div className="flex justify-end text-xs text-gray-500">
                            <span>۳۵۰,۰۰۰ تومان</span>
                        </div>
                    </div>
                </div>
                <span className="text-green-600 cursor-pointer text-xs" onClick={() => handleItemClick("این یک پیام اطلاعات بیشتر است.")}>
                    اطلاعات بیشتر
                </span>
            </div>

            {/* Commitments Section */}
            <div className="grid grid-cols-4 gap-4 bg-white p-6">
                {[
                    {
                        title: "روش های امن",
                        imgSrc: "path/to/safe-methods-icon.png",
                        message: "این روش ها برای امنیت شما طراحی شده‌اند.",
                    },
                    {
                        title: "برداشت وجه",
                        imgSrc: "path/to/withdrawal-icon.png",
                        message: "شما می‌توانید وجه خود را به راحتی برداشت کنید.",
                    },
                    {
                        title: "پرداخت",
                        imgSrc: "path/to/payment-icon.png",
                        message: "روش‌های مختلف پرداخت در دسترس شماست."
                    },
                    {
                        title: "ارسال",
                        imgSrc: "path/to/shipping-icon.png",
                        message: "ارسال سریع و مطمئن برای شما فراهم شده است."
                    },
                ].map(({ title, imgSrc, message }) => (
                    <div
                        key={title}
                        className="flex flex-col items-center gap-2 cursor-pointer" // Add cursor pointer
                        onClick={() => handleItemClick(message)} // Handle click
                    >
                        <img src={imgSrc} alt={title} className="w-12 h-12" />
                        <span className="text-xs">{title}</span>
                    </div>
                ))}
            </div>



            <CustomModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="اطلاعات"
            >
                <p>{modalMessage}</p>
            </CustomModal>

            {/* Confirm Button */}
            {spinnerSpinned ? (
                <Link
                    href="/checkout"
                    className="w-full bg-red-600 text-white block text-center py-2"
                >
                    تایید و ادامه
                </Link>
            ) : (
                <Button
                    className="w-full bg-red-600 text-white block text-center text-xl font-bold py-2 h-[50px] rounded-none fixed bottom-0"
                    onPress={() => setShowSpinner(true)}
                >
                    تایید و ادامه
                </Button>
            )}

            <CustomModal
                headerClass="text-xs"
                isOpen={showSpinner}
                onClose={() => setShowSpinner(false)}
                title="قبل از پرداخت شانست رو برای جایزه ی نقدی امتحان کن!"
                submitLabel="بچرخون"
                cancelLabel=""
                onSubmit={() => setMustSpin(true)}
            >
                <Wheel
                    mustStartSpinning={mustSpin}
                    prizeNumber={2}
                    data={data}
                    onStopSpinning={() => {
                        setMustSpin(false)
                        setSpinnerSpinned(true)
                        setShowSpinner(false)
                    }}
                />
            </CustomModal>
        </div>
    );
}
// Avoid SSR for roulette which references window under the hood
const Wheel = dynamic(() => import("react-custom-roulette").then(m => m.Wheel), { ssr: false });
const data = [
    { option: "6", style: { backgroundColor: "pink", textColor: "darkblue" } },
    { option: "7", style: { backgroundColor: "purple", textColor: "gold" } },
    { option: "8", style: { backgroundColor: "cyan", textColor: "navy" } },
    { option: "9", style: { backgroundColor: "lime", textColor: "maroon" } },
];