"use client";

import BottomActions from "@/components/product/BottomActions";
import GroupBuySection from "@/components/product/GroupBuySection";
import ImageSlider from "@/components/product/ImageSlider";
import ProductInfo from "@/components/product/ProductInfo";
import { Button, Link } from "@heroui/react";
import { useState, useEffect } from "react";
import CustomModal from "@/components/common/CustomModal";
import CommentsModal from "@/components/comments/CommentsModal";
import { useParams } from "next/navigation";
import { API_BASE_URL } from "@/utils/api";

// Type definitions
type ProductImage = {
  id: number;
  image_url: string;
  is_main: boolean;
};

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

type Review = {
  id: number;
  user_id: number;
  product_id: number;
  rating: number;
  comment: string;
  display_name?: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
};

export default function ProductPage() {
  const params = useParams();
  const productId = params.id as string;
  
  // States
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentOption, setCurrentOption] = useState(1);
  const [response, setResponse] = useState("");
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);
  const [commitmentText, setCommitmentText] = useState("");
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  
  // Product and reviews data states
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch product data
  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        
        // Fetch product details
        const productResponse = await fetch(`${API_BASE_URL}/product/${productId}`);
        
        if (!productResponse.ok) {
          throw new Error(`Failed to fetch product: ${productResponse.status}`);
        }
        
        const productData = await productResponse.json();
        setProduct(productData);
        
        // Fetch product reviews
        const reviewsResponse = await fetch(`${API_BASE_URL}/product/${productId}/reviews`);
        
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          setReviews(reviewsData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching product data:', error);
        setError('Failed to load product data. Please try again later.');
        setLoading(false);
      }
    };
    
    if (productId) {
      fetchProductData();
    }
  }, [productId]);

  // Format product images for the ImageSlider component
  const productImages = product?.images.map((imgUrl, index) => ({
    id: index + 1,
    img: imgUrl
  })) || [];

  const handleResponseSubmit = () => {
    // Logic to handle response submission
    console.log("Response submitted:", response);
    setResponse("");
  };

  const commitments = [
    { id: 1, text: "تعهد 1: توضیحات مربوط به تعهد 1" },
    { id: 2, text: "تعهد 2: توضیحات مربوط به تعهد 2" },
  ];

  const handleCommitmentClick = (text: string) => {
    setCommitmentText(text);
    setIsCommitmentModalOpen(true);
  };

  // Helper function to get user display name
  const getUserDisplayName = (review: Review): string => {
    if (review.display_name && review.display_name.trim()) return review.display_name.trim();
    if (review.first_name && review.last_name) return `${review.first_name} ${review.last_name}`;
    if (review.first_name) return review.first_name;
    if (review.last_name) return review.last_name;
    return "کاربر";
  };

  // Display loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">در حال بارگذاری محصول...</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (error || !product) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error || 'محصول یافت نشد'}</p>
          <button 
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
            onClick={() => window.location.reload()}
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  // Calculate average rating
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  // Rating distribution (counts for each star rating)
  const ratingCounts = [0, 0, 0, 0, 0]; // 1-5 stars
  reviews.forEach(review => {
    if (review.rating >= 1 && review.rating <= 5) {
      ratingCounts[review.rating - 1]++;
    }
  });

  // Calculate percentage for rating bars
  const ratingPercentages = ratingCounts.map(count => 
    reviews.length > 0 ? (count / reviews.length) * 100 : 0
  );

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <ImageSlider
        currentSlide={currentSlide}
        setCurrentSlide={setCurrentSlide}
        productImages={productImages}
      />
      <ProductInfo 
        product={product}
      />
      <GroupBuySection
        currentOption={currentOption}
        setCurrentOption={setCurrentOption}
        groupBuyOptions={product.group_buy_options}
        basePrice={product.base_price}
      />
      <div className="px-6 py-4 space-y-6 bg-white rounded-lg shadow-sm">
        {/* Shipping Information */}
        <div className="space-y-3">
          <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex items-center justify-between">
            <p className="font-semibold text-xs text-green-800 ">ارسال به مشهد:</p>
            <p className="text-green-700 text-xs flex items-center">
              <span className="ml-2 ">•</span>
              {product.shipping_cost === 0 ? 'رایگان' : `${product.shipping_cost.toLocaleString('fa-IR')} تومان`} - زمان ارسال: ۱ روز کاری
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <p className="font-semibold text-xs text-gray-800 mb-2">
              ارسال به سایر نقاط:
            </p>
            <div className="space-y-1.5 text-gray-700 text-xs">
              <p className="flex items-center">
                <span className="ml-2">•</span>{Math.max(49000, product.shipping_cost).toLocaleString('fa-IR')} تومان
              </p>
              <p className="flex items-center">
                <span className="ml-2">•</span>رایگان با خرید حداقل ۲۰۰,۰۰۰
                تومان
              </p>
              <p className="flex items-center">
                <span className="ml-2">•</span>زمان ارسال: ۳ الی ۷ روز کاری
              </p>
            </div>
          </div>
        </div>

        {/* Consolidation Badge */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4 text-blue-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-blue-700 font-medium text-xs">
              امکان تجمیع سفارش و کاهش هزینه ارسال
            </span>
          </div>
          <div>
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className="text-[10px] text-blue-600 hover:text-blue-700"
            >
              اطلاعات بیشتر
            </button>
          </div>
        </div>

        {/* Commitments Section */}
        <div>
          <h3 className="font-semibold text-xs text-gray-800 mb-3">تعهدات باهم</h3>
          <div className="grid grid-cols-2 gap-3">
            {commitments.map((commitment) => (
              <div
                key={commitment.id}
                className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => handleCommitmentClick(commitment.text)} // Open modal on click
              >
                <div className="text-center text-gray-700 text-xs">{commitment.text.split(':')[0]}</div>
              </div>
            ))}
          </div>
        </div>


        <CustomModal
          isOpen={isCommitmentModalOpen}
          onClose={() => setIsCommitmentModalOpen(false)}
          title="تعهدات باهم"
        >
          <p>{commitmentText}</p>
        </CustomModal>

        {/* Return Policy */}
        <div
          className="bg-blue-50 p-3 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setIsReturnModalOpen(true)}
        >
          <h3 className="font-semibold text-blue-700 text-xs flex items-center">
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3"
              />
            </svg>
            مرجوعی رایگان - راهنمای مرجوع کردن کالا
          </h3>
        </div>

        {/* Reviews Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-xs text-gray-800">نظرات کاربران</h3>
              <span className="text-xs text-gray-500">({reviews.length} نظر)</span>
            </div>
            <Button onClick={() => setIsCommentsModalOpen(true)} className="text-blue-600 bg-transparent p-0 text-xs">
              مشاهده همه
            </Button>
          </div>
          <CommentsModal
            isOpen={isCommentsModalOpen}
            onClose={() => setIsCommentsModalOpen(false)}
            comments={reviews.map(review => ({
              id: review.id,
              user: getUserDisplayName(review),
              text: review.comment,
              rating: review.rating,
            }))}
          />
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">{averageRating}</div>
              <div className="flex items-center justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-4 h-4 ${star <= parseFloat(averageRating) ? "text-yellow-400" : "text-gray-300"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <div className="text-xs text-gray-500">از {reviews.length} نظر</div>
            </div>

            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((rating, index) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">{rating}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-yellow-400 rounded-full"
                      style={{
                        width: `${ratingPercentages[4 - index]}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comments Display */}
          <div className="mt-6 space-y-4">
            <h4 className="font-semibold text-gray-800 text-lg mb-4">
              نظرات ثبت شده
            </h4>
            {reviews.map((review) => (
              <div
                key={review.id}
                className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img
                        src="/default-avatar.png"
                        alt={`${getUserDisplayName(review)}'s avatar`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-xs text-gray-800">
                        {getUserDisplayName(review)}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, index) => (
                          <svg
                            key={index}
                            className={`w-4 h-4 ${index < review.rating ? "text-yellow-400" : "text-gray-300"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(review.created_at).toLocaleDateString("fa-IR")}
                  </span>
                </div>
                <p className="text-gray-600 leading-relaxed">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomActions 
        showGroupBuy={false}
        product={product}
      />

      {/* Return Policy Modal */}
      <CustomModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="راهنمای مرجوع کردن کالا"
        submitLabel="متوجه شدم"
        cancelLabel=""
        onSubmit={() => setIsReturnModalOpen(false)}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">شرایط مرجوع کردن کالا</h3>
            <ul className="space-y-3 text-blue-700 text-xs">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>کالا باید در بسته‌بندی اصلی و بدون استفاده باشد</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>درخواست مرجوعی باید ظرف ۷ روز از تاریخ دریافت کالا ثبت شود</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>هزینه ارسال مرجوعی برای کالاهای با قیمت بالای ۵۰۰,۰۰۰ تومان رایگان است</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">مراحل مرجوع کردن کالا</h3>
            <ol className="space-y-3 text-gray-700 text-xs list-decimal list-inside">
              <li>ورود به پنل کاربری و انتخاب کالای مورد نظر</li>
              <li>تکمیل فرم درخواست مرجوعی و ذکر دلیل مرجوعی</li>
              <li>انتظار برای تایید درخواست توسط کارشناسان</li>
              <li>دریافت کد پیگیری و برچسب مرجوعی</li>
              <li>ارسال کالا به آدرس مرکز مرجوعی</li>
              <li>بررسی کالا و پرداخت مبلغ در صورت تایید</li>
            </ol>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">نکات مهم</h3>
            <ul className="space-y-2 text-yellow-700 text-xs">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <span>لطفاً از ارسال کالای آسیب دیده خودداری کنید</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <span>برچسب مرجوعی را به درستی روی بسته نصب کنید</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <span>از ارسال کالا با پست سفارشی اطمینان حاصل کنید</span>
              </li>
            </ul>
          </div>
        </div>
      </CustomModal>

      {/* Existing Info Modal */}
      <CustomModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        title="تجمیع سفارش"
        submitLabel="متوجه شدم"
        cancelLabel=""
        onSubmit={() => setIsInfoModalOpen(false)}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">چگونه سفارش‌های خود را تجمیع کنیم؟</h3>
            <p className="text-blue-700 text-xs leading-relaxed">
              با تجمیع سفارش‌های خود می‌توانید هزینه ارسال را کاهش دهید. برای این کار:
            </p>
            <ul className="mt-3 space-y-2 text-blue-700 text-xs">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>سفارش‌های خود را در سبد خرید نگه دارید</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>زمانی که مبلغ سفارش به ۲۰۰,۰۰۰ تومان برسد، هزینه ارسال رایگان خواهد شد</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>در صورت تجمیع سفارش، هزینه ارسال به صورت یک‌پارچه محاسبه می‌شود</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">مزایای تجمیع سفارش</h3>
            <ul className="space-y-2 text-gray-700 text-xs">
              <li className="flex items-start gap-2">
                <span className="text-gray-600">•</span>
                <span>کاهش هزینه ارسال</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-600">•</span>
                <span>ارسال یک‌پارچه سفارش‌ها</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-600">•</span>
                <span>مدیریت آسان‌تر سفارش‌ها</span>
              </li>
            </ul>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}
