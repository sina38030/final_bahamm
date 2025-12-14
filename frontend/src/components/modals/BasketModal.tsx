import React, { useState } from 'react';
import CustomModal from '../common/CustomModal';
import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface BasketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    productName?: string;
    productPrice?: string;
    discountPrice?: string;
    productImage?: string;
}

const BasketModal: React.FC<BasketModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm,
    productName = "کفش چرم با استقامت و کیفیت عالی",
    productPrice = "۱۳۳ هزار تومان",
    discountPrice,
    productImage
}) => {
    const [selectedColor, setSelectedColor] = useState("");
    const [selectedSize, setSelectedSize] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [errorMessage, setErrorMessage] = useState(""); // State for error message
    const router = useRouter();
    const [isSizeGuideModalOpen, setIsSizeGuideModalOpen] = useState(false); // State for size guide modal

    const handleColorSelect = (color: string) => {
        setSelectedColor(color);
        setErrorMessage(""); // Clear error message when a color is selected
    };

    const handleSizeSelect = (size: string) => {
        setSelectedSize(size);
        setErrorMessage(""); // Clear error message when a size is selected
    };

    const handleQuantityChange = (change: number) => {
        setQuantity((prevQuantity) => Math.max(1, prevQuantity + change));
    };

    const handleConfirm = () => {
        if (!selectedColor || !selectedSize) {
            setErrorMessage("لطفاً رنگ و سایز را انتخاب کنید."); // Set error message if selections are not made
            return;
        }
        
        // Call onConfirm if provided
        if (onConfirm) {
            onConfirm();
        } else {
            router.push("/orderinfo"); // Navigate to OrderInfoPage
        }
    };

    return (
        <>
            <CustomModal
                isOpen={isOpen} // Use the isOpen prop
                onClose={onClose} // Use the onClose prop
                title=" خرید گروهی"
                hideFooter={true}
            >
                <div className="p-4 flex flex-col gap-4">
                    <h3 className="font-semibold text-gray-800">
                        {productName}
                    </h3>
                    <div className="flex items-center justify-between">
                        <div className="w-20 h-20 bg-gray-200 flex items-center justify-center">
                            {productImage ? (
                                <Image
                                    src={productImage}
                                    alt={productName}
                                    width={80}
                                    height={80}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span>عکس</span>
                            )}
                        </div>
                        <div>
                            {discountPrice ? (
                                <div>
                                    <p className="text-sm line-through text-gray-500">{productPrice} تومان</p>
                                    <p className="text-lg font-bold text-red-600">{discountPrice} تومان</p>
                                </div>
                            ) : (
                                <p className="text-lg font-bold">{productPrice} تومان</p>
                            )}
                        </div>
                    </div>
                    <div className="mt-4">
                        <h4 className="font-semibold">رنگ</h4>
                        <div className="flex gap-2 pt-2">
                            {["مشکی", "نارنجی", "زرد"].map((color) => (
                                <div
                                    key={color}
                                    className={`w-12 h-12 rounded-md flex items-center justify-center text-sm text-white cursor-pointer ${selectedColor === color ? "border-2 border-black" : ""}`}
                                    style={{
                                        backgroundColor:
                                            color === "مشکی"
                                                ? "black"
                                                : color === "نارنجی"
                                                    ? "orange"
                                                    : "yellow",
                                    }}
                                    onClick={() => handleColorSelect(color)}
                                >
                                    {color}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="flex items-center justify-between pb-3 text-xs">
                            <h4 className="font-semibold">سایز بندی</h4>
                            <p className="text-blue-600 cursor-pointer" onClick={() => setIsSizeGuideModalOpen(true)}>راهنمای انتخاب سایز</p> {/* Open size guide modal */}
                        </div>
                        <div className="flex gap-2 pt-2">
                            {["XL", "L", "M", "S"].map((size) => (
                                <div
                                    key={size}
                                    className={`w-12 h-12 border rounded-md flex items-center justify-center cursor-pointer ${selectedSize === size ? "border-2 border-black" : ""}`}
                                    onClick={() => handleSizeSelect(size)}
                                >
                                    {size}
                                </div>
                            ))}
                        </div>
                    </div>
                    {errorMessage && <p className="text-red-600">{errorMessage}</p>} {/* Display error message */}
                    <div className="mt-4 flex items-center">
                        <span className="font-semibold">تعداد</span>
                        <div className="flex items-center ml-2">
                            <button
                                className="px-2 border"
                                onClick={() => handleQuantityChange(-1)}
                            >
                                -
                            </button>
                            <span className="px-4">{quantity}</span>
                            <button
                                className="px-2 border"
                                onClick={() => handleQuantityChange(1)}
                            >
                                +
                            </button>
                        </div>
                    </div>
                    <Button className="mt-4 w-full bg-red-600 text-white" onClick={handleConfirm}>
                        تایید
                    </Button>
                </div>
            </CustomModal>

            {/* Size Guide Modal */}
            <CustomModal
                isOpen={isSizeGuideModalOpen}
                onClose={() => setIsSizeGuideModalOpen(false)}
                title="راهنمای انتخاب سایز"
            >
                <div className="p-4">
                    <h3 className="font-semibold text-gray-800">راهنمای انتخاب سایز</h3>
                    <p className="text-gray-600">لطفاً برای انتخاب سایز مناسب، به جدول زیر توجه کنید:</p>
                    <ul className="list-disc list-inside text-gray-600">
                        <li>سایز S: مناسب برای دور سینه 90-95 سانتی‌متر</li>
                        <li>سایز M: مناسب برای دور سینه 95-100 سانتی‌متر</li>
                        <li>سایز L: مناسب برای دور سینه 100-105 سانتی‌متر</li>
                        <li>سایز XL: مناسب برای دور سینه 105-110 سانتی‌متر</li>
                    </ul>
                </div>
            </CustomModal>
        </>
    );
};

export default BasketModal;