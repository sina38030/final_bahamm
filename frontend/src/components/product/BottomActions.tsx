import { Button } from "@heroui/react";
import { AiOutlineHeart, AiFillHeart, AiOutlineComment, AiOutlineShop } from "react-icons/ai";
import { useState, useEffect } from "react";
import CustomModal from "@/components/common/CustomModal";
import { useRouter } from "next/navigation";
import BasketModal from "../modals/BasketModal";

// Product type definition matching the API response
type ProductDetail = {
  id: number;
  name: string;
  description: string;
  base_price: number;
  discount_price: number | null;
  discount: number | null;
  shipping_cost: number;
  category: string;
  category_slug: string | null;
  subcategory: string | null;
  subcategory_slug: string | null;
  image: string;
  images: string[];
  in_stock: boolean;
  group_buy_options: {
    twoPersonPrice: number;
    fourPersonPrice: number;
  };
  store_id: number;
  store_name: string;
};

interface BottomActionsProps {
  showGroupBuy?: boolean; // Control the display of group buy button and timer
  product?: ProductDetail; // Product data from API
}

export default function BottomActions({ showGroupBuy, product }: BottomActionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBasketModalOpen, setIsBasketModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 30, seconds: 0 });
  const router = useRouter();

  // Calculate prices
  const regularPrice = product?.base_price || 300000;
  const discountPrice = product?.discount_price || Math.floor(regularPrice * 0.9);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        const newSeconds = prevTime.seconds > 0 ? prevTime.seconds - 1 : 59;
        const newMinutes = newSeconds === 59 
          ? (prevTime.minutes > 0 ? prevTime.minutes - 1 : 59) 
          : prevTime.minutes;
        const newHours = newMinutes === 59 && newSeconds === 59
          ? (prevTime.hours > 0 ? prevTime.hours - 1 : 23)
          : prevTime.hours;
        
        return { hours: newHours, minutes: newMinutes, seconds: newSeconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleStorePage = () => {
    if (product?.store_id) {
      router.push(`/store/${product.store_id}`);
    } else {
      router.push("/store");
    }
  };

  return (
    <div className="sticky bottom-0 bg-white border-t w-full flex items-center h-[63px]">
      <div className="flex h-full w-full">
        {showGroupBuy ? (
          <>
            <div className="flex flex-col bg-red-600 flex-1 w-full">
              <Button
                className="px-4 py-2 bg-transparent text-white text-[13px] h-full min-w-max font-bold rounded-none"
                onClick={() => setIsBasketModalOpen(true)}
              >
                پیوستن به خرید گروهی
              </Button>
              <div className="flex items-center justify-center bg-yellow-200 px-3 w-2/3 mx-auto rounded-md py-1 mb-1 text-red-600">
                <p className="text-xs">زمان باقی‌مانده: {timeLeft.hours}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full">
            <Button
              className="px-4 flex flex-col items-center gap-0 justify-between py-2 bg-red-600 text-white text-[13px] h-full min-w-max rounded-none"
              onClick={() => setIsBasketModalOpen(true)}
            >
              شروع خرید گروهی
              <p className="text-[11px]">{discountPrice.toLocaleString('fa-IR')} تومان</p>
            </Button>
            <Button onClick={() => setIsBasketModalOpen(true)} className="px-4 flex flex-col items-center gap-0 justify-between py-2 bg-[#E08181] text-white text-[13px] h-full min-w-max rounded-none">
              خرید به تنهایی
              <p className="text-[11px]">{regularPrice.toLocaleString('fa-IR')} تومان</p>
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="px-4 flex flex-col items-center py-2 justify-between bg-white text-gray-600 text-[13px] h-full min-w-max rounded-none border-l border-t-0 border-b-0 border-r-0"
        >
          <AiOutlineComment size={18} />
          <p className="text-[9px]">گفتگو</p>
        </Button>
        <Button 
          onClick={handleStorePage}
          className="px-4 flex flex-col items-center justify-between py-2 bg-white text-gray-600 text-[13px] h-full min-w-max rounded-none border-l border-r-0 border-t-0 border-b-0"
        >
          <AiOutlineShop size={18} />
          <p className="text-[9px]">فروشگاه</p>
        </Button>
      </div>

      <BasketModal
        isOpen={isBasketModalOpen}
        onClose={() => setIsBasketModalOpen(false)}
        onConfirm={() => console.log("تایید سبد خرید")}
        productName={product?.name || "محصول"}
        productPrice={regularPrice.toLocaleString('fa-IR')}
        discountPrice={discountPrice.toLocaleString('fa-IR')}
        productImage={product?.image || ""}
      />

      <CustomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="گفتگو با فروشنده"
      >
        <p>این بخش برای گفتگو با فروشنده است.</p>
        {product?.store_name && (
          <p className="mt-2 text-sm text-gray-600">
            فروشنده: {product.store_name}
          </p>
        )}
      </CustomModal>
    </div>
  );
}