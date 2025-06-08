"use client";

import { Radio, RadioGroup } from "@heroui/react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from "@/utils/api";

interface Product {
  id: string;
  name: string;
  weight: string;
  price: number;
  discountPrice: number;
  imgSrc: string;
  quantity: number;
  option_id?: string;
}

const initialProductsData: Product[] = [
  { id: '1', name: 'پپرونی کلاسیک', weight: '۱۲۰ گرم', price: 90000, discountPrice: 70000, imgSrc: 'https://via.placeholder.com/56', quantity: 1, option_id: '1' },
  { id: '2', name: 'ماست موسیر', weight: '۹۰۰ گرم', price: 80000, discountPrice: 60000, imgSrc: 'https://via.placeholder.com/56', quantity: 1, option_id: '2' },
  { id: '3', name: 'سیب زرد', weight: '۱ کیلوگرم', price: 110000, discountPrice: 90000, imgSrc: 'https://via.placeholder.com/56', quantity: 1, option_id: '3' },
];

const GREEN_DISCOUNT_AMOUNT = 10000;

function Page() {
  const [paymentMethod, setPaymentMethod] = useState<"online" | "wallet">("online");
  const [agreed, setAgreed] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [products, setProducts] = useState<Product[]>(initialProductsData);
  const [isSummaryPopupOpen, setIsSummaryPopupOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const router = useRouter();

  const tickerMessages = [
    "هزینهٔ ارسال خرید بالای ۳۰۰٬۰۰۰ تومان رایگان است",
    "با دعوت دوست تا ۴۰٪ تخفیف بگیرید",
    "پیشنهاد شگفت‌انگیز امروز را از دست ندهید!"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [tickerMessages.length]);

  const handleEditAddress = () => {
    router.push("/profile/addresses");
  };

  const toFa = (val: string | number) => val.toString().replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
  const formatPrice = (n: number, showCurrency = true) => {
    const formattedNumber = n.toLocaleString("en-US");
    return toFa(formattedNumber) + (showCurrency ? " تومان" : "");
  };

  const handleQuantityChange = (productId: string, change: number) => {
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId
          ? { ...p, quantity: Math.max(1, p.quantity + change) }
          : p
      )
    );
  };

  const { originalPrice, groupPrice, totalSavings, finalPrice, productCount } = useMemo(() => {
    let orig = 0;
    let group = 0;
    let count = 0;
    products.forEach(p => {
      orig += p.price * p.quantity;
      group += p.discountPrice * p.quantity;
      count += p.quantity;
    });

    const greenDiscount = agreed ? GREEN_DISCOUNT_AMOUNT : 0;
    const savings = (orig - group) + greenDiscount;
    const total = group - greenDiscount;

    return {
      originalPrice: orig,
      groupPrice: group,
      totalSavings: savings,
      finalPrice: total,
      productCount: count,
    };
  }, [products, agreed]);

  const shippingCost = 0; // As per new design, shipping is free

  const handlePayment = async () => {
    if (!products || products.length === 0) {
      alert("سبد خرید شما خالی است.");
      return;
    }
    setIsProcessingPayment(true);

    // For this flow, we assume the first product in the cart initiates the group buy.
    // You will need to adjust this logic if multiple products can be part of the group buy
    // or if any product can initiate it.
    const primaryProduct = products[0];

    if (!primaryProduct.option_id) {
        alert("خطا: شناسه گزینه محصول برای محصول اصلی انتخاب نشده است. لطفا صفحه را رفرش کرده و دوباره تلاش کنید.");
        setIsProcessingPayment(false);
        return;
    }

    const purchasePayload = {
      product_id: parseInt(primaryProduct.id), // Ensure product.id is a number if your backend expects int
      option_id: parseInt(primaryProduct.option_id || '1'), // Convert to int, default to 1 if missing
      quantity: primaryProduct.quantity,
      is_group_purchase: true, // This checkout leads to a group buy
      // TODO: Add other necessary fields like address, payment_method from checkout state
      // The current backend /orders/purchase doesn't seem to take these directly.
      // It creates a basic order and expects further processing or payment confirmation.
    };

    try {
      // TODO: Replace with your actual API endpoint and method
      const response = await fetch(`${API_BASE_URL}/orders/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add Authorization header if needed
          // 'Authorization': `Bearer ${YOUR_AUTH_TOKEN}`
        },
        body: JSON.stringify(purchasePayload),
      });

      if (!response.ok) {
        let errorDetail = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || JSON.stringify(errorData) || errorDetail;
        } catch (jsonError) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            errorDetail = errorText || errorDetail;
          } catch (textError) {
            // Keep the original status error if text also fails
          }
        }
        console.error("Backend error details:", errorDetail, "Status:", response.status, "Payload sent:", purchasePayload);
        throw new Error(errorDetail);
      }

      const result = await response.json(); // Expects GroupBuyResponse like { message, order_id, group_buy_id, invite_code }

      if (result.invite_code) {
        // Navigate to success page with invite_code
        router.push(`/success-buy?inviteCode=${result.invite_code}&orderId=${result.order_id}`);
      } else {
        // Handle cases where it's a regular purchase or invite_code is missing
        // For now, still go to success-buy, but without invite code.
        // This might indicate an issue or a different flow.
        console.warn("Invite code not found in response, but order might be created.", result);
        router.push(`/success-buy?orderId=${result.order_id}`);
      }

    } catch (error) {
      console.error("Failed to process group buy purchase:", error);
      alert(`خطا در ایجاد خرید گروهی: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const OrderSummaryContent = () => (
    <>
      <h3 className="text-[0.95rem] font-medium text-[#666] mb-4">خلاصه سفارش</h3>
      <ul className="space-y-2 mb-4 text-[0.85rem]">
        <li className="flex justify-between">
          <span>قیمت اصلی کالاها</span>
          <span>{formatPrice(originalPrice)}</span>
        </li>
        <li className="flex justify-between">
          <span>قیمت کالاها با خرید گروهی</span>
          <span>{formatPrice(groupPrice)}</span>
        </li>
        <li className="flex justify-between">
          <span>هزینه ارسال</span>
          <span className="text-[#00c853] font-bold">{shippingCost === 0 ? "رایگان" : formatPrice(shippingCost)}</span>
        </li>
        {agreed && (
          <li className="flex justify-between text-[#00c853]">
            <span>تخفیف ارسال سبز</span>
            <span>-{formatPrice(GREEN_DISCOUNT_AMOUNT)}</span>
          </li>
        )}
        <li className="flex justify-between text-[#00c853]">
          <span>سود شما از این خرید</span>
          <span>{formatPrice(totalSavings)}</span>
        </li>
      </ul>
      <div className="flex justify-between font-bold text-[0.85rem]">
        <span>جمع کل</span>
        <span>{formatPrice(finalPrice)}</span>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#fafafa] pb-24"> {/* Added padding-bottom for bottom bar overlap */}
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#e0e0e0] px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-xl">&#x2192;</button>
        <div className="flex-1 overflow-hidden h-6 relative text-sm font-medium">
          {tickerMessages.map((msg, index) => (
            <span
              key={index}
              className={`absolute w-full right-0 transition-transform duration-600 ease-in-out ${tickerIndex === index ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
            >
              {msg}
            </span>
          ))}
        </div>
      </header>

      {/* Address Section */}
      <section className="mx-3 my-3 bg-white rounded-[14px] p-4 flex justify-between items-center text-[0.85rem]">
        <p>خیابان طالقانی، کوچهٔ ۳ – پلاک ۱۲</p>
        <button onClick={handleEditAddress} className="text-[#ff006a] text-decoration-none">ویرایش آدرس</button>
      </section>

      {/* Basket Section */}
      <section className="bg-white mx-3 my-3 rounded-[14px] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <div className="px-4 pt-4 pb-1.5">
          <h2 className="text-[0.95rem] text-[#555]">محصولات سبد ({toFa(productCount)})</h2>
        </div>
        <div className="max-h-[260px] overflow-y-auto px-4 pb-4">
          {products.map(product => (
            <article key={product.id} className="flex justify-between gap-4 mt-4 items-start">
              <img className="w-14 h-14 rounded-xl object-cover" src={product.imgSrc} alt={product.name} />
              <div className="flex-1">
                <h3 className="text-[0.9rem] font-medium">{product.name}</h3>
                <span className="text-[0.78rem] text-[#666]">{product.weight}</span>
                <div className="mt-1 flex items-center">
                  <button 
                    onClick={() => handleQuantityChange(product.id, -1)}
                    className="w-5 h-5 border border-[#e0e0e0] rounded-lg bg-white font-bold text-base cursor-pointer leading-[20px] flex items-center justify-center"
                  >−</button>
                  <span className="min-w-[20px] text-center text-[0.85rem] px-1 tabular-nums">{toFa(product.quantity)}</span>
                  <button 
                    onClick={() => handleQuantityChange(product.id, 1)}
                    className="w-5 h-5 border border-[#e0e0e0] rounded-lg bg-white font-bold text-base cursor-pointer leading-[20px] flex items-center justify-center"
                  >+</button>
                </div>
              </div>
              <div className="text-left min-w-[86px]">
                <span className="block text-[0.8rem] text-[#aaa] line-through"><s>{formatPrice(product.price * product.quantity)}</s></span>
                <span className="block text-[0.8rem] font-bold text-[#ff006a]">{formatPrice(product.discountPrice * product.quantity)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      
      {/* Green Shipping Section */}
      <section className="mx-3 my-3 bg-white rounded-[14px] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <div className="p-4 border-b border-[#e0e0e0] text-[0.85rem]">
          <div className="flex items-center gap-2 mb-1.5">
            <span>هزینه ارسال:</span>
            <span className="text-[#00c853] font-bold">{shippingCost === 0 ? "رایگان" : formatPrice(shippingCost)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>زمان ارسال: امروز ۹–۱۲</span>
            <button className="text-[#ff006a] text-[0.8rem]">تغییر</button>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 text-[0.85rem]">
          <div className="text-2xl">&#x1F4B0;</div>
          <div className="flex-1">
            <p>{agreed ? "در طرح «ارسال سبز» شرکت کردید" : "با شرکت در طرح «ارسال سبز»"}</p>
            <p>{agreed ? formatPrice(GREEN_DISCOUNT_AMOUNT) + " تخفیف اعمال شد" : formatPrice(GREEN_DISCOUNT_AMOUNT) + " تخفیف بگیرید"}</p>
          </div>
          <button 
            onClick={() => setAgreed(!agreed)}
            className={`mr-auto border border-[#ff006a] rounded-[10px] px-3 py-1.5 text-[0.8rem] transition-colors duration-200 ${
              agreed ? "bg-[#ff006a] text-white" : "bg-white text-[#ff006a]"
            }`}
          >
            {agreed ? "✔" : "موافقم"}
          </button>
        </div>
      </section>

      {/* Payment Method Section */}
      <section className="mx-3 my-3 bg-white rounded-[14px] shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-4">
        <h2 className="text-[0.95rem] mb-3">روش پرداخت</h2>
        <RadioGroup
          value={paymentMethod}
          onValueChange={(value) => setPaymentMethod(value as "online" | "wallet")}
          className="flex flex-col gap-0"
        >
          <label className="flex items-center gap-2 py-[0.55rem] cursor-pointer text-[0.85rem]">
            <Radio value="online" name="payMethod" className="accent-[#ff006a] ml-1.5" />
            پرداخت اینترنتی (کارت بانکی)
          </label>
          <label className="flex items-center gap-2 py-[0.55rem] cursor-pointer text-[0.85rem]">
            <Radio value="wallet" name="payMethod" className="accent-[#ff006a] ml-1.5" />
            پرداخت از کیف پول
          </label>
        </RadioGroup>
      </section>

      {/* Order Summary Section */}
      <section className="mx-3 my-3 bg-white rounded-[14px] shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-4">
        <OrderSummaryContent />
      </section>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e0e0e0] px-4 py-3 flex justify-between items-center z-[9]">
        <div className="cursor-pointer" onClick={() => setIsSummaryPopupOpen(true)}>
          <div className="text-[0.75rem] text-[#666] flex items-center gap-1">
            مبلغ قابل پرداخت <span className="text-[0.65rem]">&#x25B2;</span>
          </div>
          <div className="font-bold text-[0.9rem] mt-0.5 tabular-nums">{formatPrice(finalPrice)}</div>
        </div>
        <button 
          onClick={handlePayment}
          disabled={isProcessingPayment}
          className="bg-[#ff006a] text-white border-none rounded-[14px] px-8 py-3 text-base cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isProcessingPayment ? "در حال پردازش..." : "پرداخت"}
        </button>
      </div>

      {/* Order Summary Popup */}
      {isSummaryPopupOpen && (
        <div 
          className="fixed inset-0 bg-black/45 flex items-end justify-center z-[11]"
          onClick={() => setIsSummaryPopupOpen(false)} // Close on overlay click
        >
          <div 
            className="bg-white w-full max-w-[420px] rounded-t-[20px] p-5 pt-7 relative transform transition-transform duration-300 ease-out translate-y-0"
            onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside popup
          >
            <button 
              onClick={() => setIsSummaryPopupOpen(false)} 
              className="absolute top-2.5 right-4 bg-transparent border-none text-2xl cursor-pointer"
            >×</button>
            <OrderSummaryContent />
          </div>
        </div>
      )}
    </div>
  );
}

export default Page;