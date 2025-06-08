"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { MdOutlineArrowRightAlt } from "react-icons/md";
import { CiShare2 } from "react-icons/ci";
import { useState } from "react";
import CustomModal from "@/components/common/CustomModal";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useRouter } from "next/navigation";

interface ImageSliderProps {
    currentSlide: number;
    setCurrentSlide: (index: number) => void;
    height?: string;
    productImages?: Array<{id: number, img: string}>;
}

// Default images if no product images are provided
const defaultImages = [
    {
        id: 1,
        img: "https://media.licdn.com/media/AAYABATPAAgAAQAAAAAAAKwYrfHUPkoBQGmwnaG71Ps_5Q.png",
    },
    {
        id: 2,
        img: "https://media.licdn.com/media/AAYABATPAAgAAQAAAAAAAKwYrfHUPkoBQGmwnaG71Ps_5Q.png",
    },
    {
        id: 3,
        img: "https://media.licdn.com/media/AAYABATPAAgAAQAAAAAAAKwYrfHUPkoBQGmwnaG71Ps_5Q.png",
    },
];

export default function ImageSlider({
    currentSlide,
    setCurrentSlide,
    height = "290px",
    productImages = defaultImages,
}: ImageSliderProps) {
    const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const router = useRouter();

    const handleImageClick = (index: number) => {
        setSelectedImageIndex(index);
        setIsFullScreenModalOpen(true);
    };

    // Use provided product images or default images
    const imagesToDisplay = productImages.length > 0 ? productImages : defaultImages;

    return (
        <div className="relative w-full bg-gray-200" style={{ height }}>
            <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={50}
                slidesPerView={1}
                navigation={{
                    prevEl: ".swiper-button-prev",
                    nextEl: ".swiper-button-next",
                }}
                pagination={{ clickable: true }}
                autoplay={{
                    delay: 5000,
                    disableOnInteraction: false,
                }}
                onSlideChange={(swiper) => setCurrentSlide(swiper.activeIndex)}
            >
                {imagesToDisplay.map((product, index) => (
                    <SwiperSlide key={product.id}>
                        <div
                            className="w-full relative flex items-center justify-center"
                            style={{ height }}
                        >
                            <img
                                src={product.img}
                                alt={`Product ${product.id}`}
                                className="object-fill w-full cursor-pointer"
                                style={{ height }}
                                onClick={() => handleImageClick(index)}
                            />
                            <div className="absolute bg-gray-200 left-2 top-2 rounded-full aspect-square p-1">
                                <CiShare2 color="gray" size={20} />
                            </div>
                            <div
                                onClick={() => router.back()}
                                className="absolute bg-gray-200 z-50 right-2 top-2 rounded-full aspect-square p-1"
                            >
                                <MdOutlineArrowRightAlt color="gray" size={20} />
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Full-Screen Modal for Image */}
            <CustomModal
                isOpen={isFullScreenModalOpen}
                onClose={() => setIsFullScreenModalOpen(false)}
                title=""
                hideFooter={true}
                fullScreen={true}
            >
                <div className="relative w-full h-[90vh] flex items-center justify-center">
                    <Swiper
                        modules={[Navigation, Pagination, Autoplay]}
                        spaceBetween={50}
                        slidesPerView={1}
                        navigation
                        autoplay={{
                            delay: 2000,
                            disableOnInteraction: false,
                        }}
                        initialSlide={selectedImageIndex}
                    >
                        {imagesToDisplay.map((product) => (
                            <SwiperSlide key={product.id}>
                                <img
                                    src={product.img}
                                    alt={`Product ${product.id}`}
                                    className="object-fill w-full h-full"
                                />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </CustomModal>
        </div>
    );
}