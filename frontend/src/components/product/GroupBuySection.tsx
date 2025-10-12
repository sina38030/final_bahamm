import { useState } from "react";
import CustomModal from "../common/CustomModal";
import { BiArrowBack } from "react-icons/bi";
import { Slider } from "@heroui/react";

interface GroupBuySectionProps {
  currentOption: number;
  setCurrentOption: (value: number) => void;
  groupBuyOptions?: {
    twoPersonPrice: number;
    fourPersonPrice: number;
  };
  basePrice?: number;
}

export default function GroupBuySection({
  currentOption,
  setCurrentOption,
  groupBuyOptions,
  basePrice = 300000,
}: GroupBuySectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Define marks for the slider with line breaks
  const marks = [
    { value: 3, label: <>خرید به <br /> تنهایی</> },
    { value: 2, label: <>خرید با <span className={currentOption === 2 ? "text-red-500" : ""}>2</span><br />دوست</> },
    { value: 1, label: <>خرید با <span className={currentOption === 1 ? "text-red-500" : ""}>1</span><br />دوست</> },
    { value: 0, label: <>خرید با <span className={currentOption === 0 ? "text-red-500" : ""}>3</span><br />دوست</> },
  ];

  // Calculate prices according to requested rule:
  // 1 friend => half price, 2 friends => quarter price, 3 friends => free
  const oneFriendPrice = Math.floor(basePrice / 2);
  const twoFriendsPrice = Math.floor(basePrice / 4);
  const fourPersonPrice = 0; // Free for 4 people
  
  // Price values for each option
  const prices = [
    { price: "رایگان", color: currentOption === 0 ? "text-[#008000]" : "text-[#D62B1A]" },
    { price: oneFriendPrice.toLocaleString('fa-IR'), color: currentOption === 1 ? "text-[#008000]" : "text-gray-400" },
    { price: twoFriendsPrice.toLocaleString('fa-IR'), color: currentOption === 2 ? "text-[#008000]" : "text-gray-400" },
    { price: basePrice.toLocaleString('fa-IR'), color: currentOption === 3 ? "text-[#008000]" : "text-gray-400" },
  ];

  return (
    <>
      <div className="mx-2 bg-white shadow-sm border border-[#D62B1A]">
        <div className="bg-[#D62B1A] px-3 py-1">
          <p
            className="text-white text-center text-xs cursor-pointer flex items-center justify-center gap-5"
            onClick={() => setIsModalOpen(true)}
          >
            با ۳ نفر از دوستانت خرید کن و قیمت رو رایگان کن!
            <BiArrowBack />
          </p>
        </div>

        <div className="p-1">
          <p className="text-xs text-black mt-2 !mb-10">قیمت برای تو:</p>

          {/* Display marks above the slider */}
          <div className="flex justify-between mb-2">
            {marks.map((mark) => (
              <span
                key={mark.value}
                className={`text-xs text-center ${currentOption === mark.value ? "text-[#008000]" : "text-gray-400"}`}
              >
                {mark.label}
              </span>
            ))}
          </div>

          {/* Slider */}
          <div className="relative mb-4" dir="rtl">
            <Slider
              dir="rtl"
              className="max-w-full"
              value={currentOption}
              onChange={(value) => setCurrentOption(value as number)}
              minValue={0}
              maxValue={3}
              step={1}
              showTooltip={false}
              formatOptions={{ style: "decimal" }}

              classNames={{ thumb: 'size-5 :before:bg-red-500 before:h-fit befor:w-fit ', filler: "bg-red-600 rounded-full" }}
            />
          </div>

          {/* Display prices */}
          <div className="flex justify-between items-center text-center ">
            <div>
              <p className={`text-xs font-bold ${prices[3].color}`}>
                {prices[3].price}
              </p>
              {currentOption !== 0 && (
                <p className="text-[10px] text-gray-500">تومان</p>
              )}
            </div>
            <div>
              <p className={`text-xs font-bold ${prices[2].color}`}>
                {prices[2].price}
              </p>
              <p className="text-[10px] text-gray-500">تومان</p>
            </div>
            <div>
              <p className={`text-xs font-bold ${prices[1].color}`}>
                {prices[1].price}
              </p>
              <p className="text-[10px] text-gray-500">تومان</p>
            </div>
            <div>
              <p className={`text-xs font-bold ${prices[0].color}`}>
                {prices[0].price}
              </p>
            </div>
          </div>

          <p className="text-xs text-right text-black mt-5">
            قیمت برای دوستانت:{" "}
            <span className="text-[#008000] pr-3">{oneFriendPrice.toLocaleString('fa-IR')}</span> تومان با ۱ دوست، {" "}
            <span className="text-[#008000] pr-3">{twoFriendsPrice.toLocaleString('fa-IR')}</span> تومان با ۲ دوست
          </p>
        </div>
      </div>

      {/* Modal for more information */}
      <CustomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="خرید گروهی"
      >
        <p>
          شما می‌توانید با خرید گروهی، قیمت را کاهش دهید و از تخفیف‌های ویژه
          بهره‌مند شوید!
        </p>
      </CustomModal>
    </>
  );
}