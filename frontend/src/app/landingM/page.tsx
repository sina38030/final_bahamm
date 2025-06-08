"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface Product {
  name: string;
  category: string;
  weight: string;
  sales: string;
  stars: string;
  oldPrice: string;
  newPrice: string;
  img: string;
  priceValue: number;
}

export default function LandingMPage() {
  const [rotatingTextIndex, setRotatingTextIndex] = useState(0);
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0, cs: 0 });
  const [activeTab, setActiveTab] = useState('all');
  const [userCart, setUserCart] = useState<Record<string, number>>({});
  const [totalItems, setTotalItems] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetContent, setSheetContent] = useState({ title: '', body: '' });
  const [loadedProducts, setLoadedProducts] = useState(10);

  const targetAmount = 150000;
  const rotatingMessages = ["مستقیم از مزرعه", "تازه و با کیفیت", "با هم بخریم، ارزان بخریم"];
  
  // Reference order items - this would come from the group order API
  const referenceOrderItems = [
    { productId: 0, quantity: 1 },
    { productId: 0, quantity: 2 },
    { productId: 1, quantity: 1 },
    { productId: 2, quantity: 1 },
    { productId: 3, quantity: 1 }
  ];
  
  // Sample products data - in real app this would come from API
  const products: Product[] = [
    {
      name: "پرتقال تامسون",
      category: "fruit",
      weight: "۱ کیلوگرم ± ۱۰۰ گرم",
      sales: "+۲۵۰",
      stars: "★★★★★",
      oldPrice: "۵۵٬۰۰۰",
      newPrice: "۲۸٬۲۵۰",
      img: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=300&q=60",
      priceValue: 28250
    },
    {
      name: "سیب قرمز",
      category: "fruit",
      weight: "۱ کیلوگرم ± ۵۰ گرم",
      sales: "+۳۰۰",
      stars: "★★★★☆",
      oldPrice: "۴۵٬۰۰۰",
      newPrice: "۲۳٬۰۰۰",
      img: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=300&q=60",
      priceValue: 23000
    },
    {
      name: "گوجه فرنگی",
      category: "veggie",
      weight: "۱ کیلوگرم",
      sales: "+۱۸۰",
      stars: "★★★★★",
      oldPrice: "۳۰٬۰۰۰",
      newPrice: "۱۵٬۵۰۰",
      img: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=300&q=60",
      priceValue: 15500
    },
    {
      name: "خیار",
      category: "summer",
      weight: "۱ کیلوگرم",
      sales: "+۲۲۰",
      stars: "★★★★☆",
      oldPrice: "۲۵٬۰۰۰",
      newPrice: "۱۲٬۰۰۰",
      img: "https://images.unsplash.com/photo-1568584711271-6c929fb49b60?auto=format&fit=crop&w=300&q=60",
      priceValue: 12000
    },
    {
      name: "موز",
      category: "fruit",
      weight: "۱ کیلوگرم",
      sales: "+۴۵۰",
      stars: "★★★★★",
      oldPrice: "۶۵٬۰۰۰",
      newPrice: "۳۵٬۰۰۰",
      img: "https://images.unsplash.com/photo-1543218024-57a70143c369?auto=format&fit=crop&w=300&q=60",
      priceValue: 35000
    },
    {
      name: "انار",
      category: "seasonal",
      weight: "۱ کیلوگرم",
      sales: "+۳۲۰",
      stars: "★★★★★",
      oldPrice: "۸۰٬۰۰۰",
      newPrice: "۴۵٬۰۰۰",
      img: "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?auto=format&fit=crop&w=300&q=60",
      priceValue: 45000
    }
  ];

  // Persian number converter functions
  const toFaDigits = (s: string) => s.replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);
  const toEnDigits = (s: string) => s.replace(/[۰-۹]/g, d => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);
  const faPrice = (n: number) => n.toLocaleString("fa-IR");

  // Rotating text effect
  useEffect(() => {
    const interval = setInterval(() => {
      setRotatingTextIndex((prev) => (prev + 1) % rotatingMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const end = Date.now() + 86400000; // 24 hours
    const timer = setInterval(() => {
      let ms = end - Date.now();
      if (ms <= 0) {
        clearInterval(timer);
        ms = 0;
      }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor(ms % 3600000 / 60000);
      const s = Math.floor(ms % 60000 / 1000);
      const cs = Math.floor(ms % 1000 / 10);
      setCountdown({ h, m, s, cs });
    }, 10);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => ("0" + n).slice(-2);

  // Update cart calculations
  useEffect(() => {
    const items = Object.values(userCart).reduce((a, b) => a + b, 0);
    const amount = Object.entries(userCart).reduce((sum, [idx, qty]) => {
      return sum + (products[parseInt(idx)]?.priceValue || 0) * qty;
    }, 0);
    setTotalItems(items);
    setTotalAmount(amount);
  }, [userCart]);

  const handleAddToCart = (index: number) => {
    setUserCart(prev => ({ ...prev, [index]: 1 }));
  };

  const handleIncrement = (index: number) => {
    setUserCart(prev => ({ ...prev, [index]: (prev[index] || 0) + 1 }));
  };

  const handleDecrement = (index: number) => {
    setUserCart(prev => {
      const newCart = { ...prev };
      if (newCart[index] > 1) {
        newCart[index]--;
      } else {
        delete newCart[index];
      }
      return newCart;
    });
  };

  const openSheet = (title: string, body: string) => {
    setSheetContent({ title, body });
    setIsSheetOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    document.body.style.overflow = "";
  };

  const renderGroupBasket = () => {
    const body = referenceOrderItems.map((orderItem, idx) => {
      const product = products[orderItem.productId];
      if (!product) return '';
      
      return `
      <div class="sheet-item-group">
        <div class="right">
          <img src="${product.img}" alt="${product.name}">
          <div>
            <div class="title">${product.name}</div>
            <div class="weight">${product.weight}</div>
            <div style="margin-top:4px;font-weight:700;color:#c42121">تعداد: ${toFaDigits(orderItem.quantity.toString())}</div>
          </div>
        </div>
        <div class="prices">
          <div class="price-old">${product.oldPrice} تومان</div>
          <div class="price-new">${product.newPrice} تومان</div>
        </div>
      </div>
    `;
    }).join("");

    openSheet(`${toFaDigits(referenceOrderItems.length.toString())} کالا در سبد`, body);
  };

  const renderUserCart = () => {
    if (!Object.keys(userCart).length) {
      openSheet("سبد شما", '<p style="padding:24px;text-align:center">سبد شما خالی است ✨</p>');
      return;
    }

    const body = Object.entries(userCart).map(([idx, qty]) => {
      const p = products[parseInt(idx)];
      return `
        <div class="sheet-item">
          <img src="${p.img}" alt="${p.name}" style="width:64px;height:64px;border-radius:8px;background:#ddd">
          <div class="info" style="flex:1;margin-right:12px">
            <div class="title" style="font-weight:700">${p.name}</div>
            <div class="weight" style="color:#999;font-size:.75rem;margin:4px 0">${p.weight}</div>
            <div class="qty-controller" data-i="${idx}">
              <button class="minus">-</button>
              <span>${toFaDigits(qty.toString())}</span>
              <button class="plus">+</button>
            </div>
          </div>
          <div>
            <div class="price-old">${p.oldPrice} تومان</div>
            <div class="price-new">${p.newPrice} تومان</div>
          </div>
        </div>
      `;
    }).join("");

    openSheet(`${toFaDigits(totalItems.toString())} کالا در سبد`, body);

    // Add event listeners after sheet opens
    setTimeout(() => {
      document.querySelectorAll('.qty-controller').forEach(ctrl => {
        const i = parseInt(ctrl.getAttribute('data-i') || '0');
        const plusBtn = ctrl.querySelector('.plus');
        const minusBtn = ctrl.querySelector('.minus');
        
        if (plusBtn) {
          plusBtn.addEventListener('click', () => {
            handleIncrement(i);
            renderUserCart();
          });
        }
        
        if (minusBtn) {
          minusBtn.addEventListener('click', () => {
            handleDecrement(i);
            renderUserCart();
          });
        }
      });
    }, 100);
  };

  // Calculate reference order totals
  const referenceOrderTotal = referenceOrderItems.reduce((sum, item) => {
    const product = products[item.productId];
    return sum + (product ? product.priceValue * item.quantity : 0);
  }, 0);
  
  const referenceOrderOldTotal = referenceOrderItems.reduce((sum, item) => {
    const product = products[item.productId];
    if (!product) return sum;
    const oldPrice = parseInt(product.oldPrice.replace(/[٬,]/g, ''));
    return sum + (oldPrice * item.quantity);
  }, 0);

  const progressPercent = Math.min((totalAmount / targetAmount) * 100, 100);
  const remainingAmount = Math.max(targetAmount - totalAmount, 0);
  const isReady = totalAmount >= targetAmount;

  return (
    <>
      {/* Header */}
      <header>
        <button className="share-icon" aria-label="اشتراک‌گذاری" onClick={() => {
          const url = encodeURIComponent(location.href);
          openSheet("اشتراک‌گذاری", `
            <div class="share-grid">
              <a href="https://t.me/share/url?url=${url}" target="_blank"><img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/telegram.svg" alt="تلگرام"></a>
              <a href="whatsapp://send?text=${url}"><img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/whatsapp.svg" alt="واتساپ"></a>
              <a href="https://www.instagram.com/?url=${url}" target="_blank"><img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/instagram.svg" alt="اینستاگرام"></a>
            </div>
          `);
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2"/>
            <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M8.59 13.51L15.42 17.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M15.41 6.51L8.59 10.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div id="rotatingText" className={rotatingTextIndex !== 0 ? 'fade-up' : ''} onClick={() => openSheet("توضیحات", `<p style="line-height:1.9">با خرید گروهی مستقیماً از مزرعه، هزینهٔ هر نفر کاهش می‌یابد.</p>`)}>
          <span>{rotatingMessages[rotatingTextIndex]}</span>
        </div>
      </header>

      {/* View Full Basket Link */}
      <div className="basket-head">
        <a href="#" className="view-full" onClick={(e) => {
          e.preventDefault();
          renderGroupBasket();
        }}>مشاهده کامل سبد</a>
      </div>

      {/* Basket Carousel */}
      <section className="basket-carousel" id="basket">
        {referenceOrderItems.map((item, index) => {
          const product = products[item.productId];
          if (!product) return null;
          
          // Calculate discount percentage
          const oldPriceNum = parseInt(product.oldPrice.replace(/[٬,]/g, ''));
          const newPriceNum = parseInt(product.newPrice.replace(/[٬,]/g, ''));
          const discountPercent = Math.round(((oldPriceNum - newPriceNum) / oldPriceNum) * 100);
          
          return (
            <div key={index} className="basket-item">
              <img src={product.img} alt={product.name} />
              <span className="qty">{toFaDigits(item.quantity.toString())}</span>
              <span className="off">{toFaDigits(discountPercent.toString())}٪</span>
            </div>
          );
        })}
      </section>

      {/* Fixed Price and Timer */}
      <p className="discount-text">
        پرداخت <b>{faPrice(referenceOrderTotal)}</b><span className="currency">تومان</span> به‌جای
        <s>{faPrice(referenceOrderOldTotal)}</s><span className="currency">تومان</span> برای خرید این سبد
      </p>

      {/* Leader Circles */}
      <div className="leader-circles">
        <div className="circle question">?</div>
        <div className="circle leader">Sina</div>
      </div>

      <div className="countdown-wrapper">
        <span id="countdown">{toFaDigits(`${pad(countdown.h)}:${pad(countdown.m)}:${pad(countdown.s)}:${pad(countdown.cs)}`)}</span>
        تا پایان این خرید گروهی زمان باقیست
      </div>

      {/* CTA Button */}
      <button className="cta-btn">پیوستن به گروه با خریدِ سبدِ Sina38030</button>

      <hr className="divider" />

      {/* Green Box */}
      <div className="green-box" onClick={() => openSheet("اطلاعات بیشتر", `<p style="line-height:1.9">اگر سبد جدید تشکیل بدهی، همچنان عضو همین گروه می‌مانی و دو سبد در انتها تجمیع می‌شوند.</p>`)}>
        با تشکیل سبد خودت هم،میتونی عضو این گروه بشی!
      </div>

      {/* Main Content */}
      <main>
        {/* Tabs */}
        <nav className="tabs" id="tabs">
          <span className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')} data-category="all">همه کالاها</span>
          <span className={`tab ${activeTab === 'fruit' ? 'active' : ''}`} onClick={() => setActiveTab('fruit')} data-category="fruit">میوه</span>
          <span className={`tab ${activeTab === 'summer' ? 'active' : ''}`} onClick={() => setActiveTab('summer')} data-category="summer">صیفی‌جات</span>
          <span className={`tab ${activeTab === 'veggie' ? 'active' : ''}`} onClick={() => setActiveTab('veggie')} data-category="veggie">سبزیجات</span>
          <span className={`tab ${activeTab === 'seasonal' ? 'active' : ''}`} onClick={() => setActiveTab('seasonal')} data-category="seasonal">میوه‌های‌فصلی</span>
        </nav>

        {/* Product Grid */}
        <section className="product-grid" id="products">
          {products
            .filter(p => activeTab === 'all' || p.category === activeTab)
            .slice(0, loadedProducts)
            .map((product, index) => {
              const realIndex = products.indexOf(product);
              return (
                <article key={realIndex} className="product-card" data-category={product.category} data-index={realIndex}>
                  <div className="img-holder">
                    <img src={product.img} alt={product.name} />
                    {userCart[realIndex] ? (
                      <div className="quantity-controller">
                        <button className="minus" onClick={() => handleDecrement(realIndex)}>-</button>
                        <span className="q">{toFaDigits(userCart[realIndex].toString())}</span>
                        <button className="plus" onClick={() => handleIncrement(realIndex)}>+</button>
                      </div>
                    ) : (
                      <button className="add-btn" onClick={() => handleAddToCart(realIndex)}>+افزودن</button>
                    )}
                  </div>
                  <div className="details">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="weight">{product.weight}</p>
                    <div className="rating-container">
                      <span className="sales">{product.sales}</span>
                      <span className="rating">{product.stars}</span>
                    </div>
                    <div className="price-container">
                      <span className="old-price">{product.oldPrice}</span>
                      <span className="new-price">{product.newPrice}</span>
                    </div>
                  </div>
                </article>
              );
            })}
        </section>
      </main>

      {/* Progress Bar */}
      {totalAmount > 0 && (
        <div className={`progress-bar ${isReady ? 'ready' : ''}`} id="progressBar" style={{ display: 'block' }}>
          <div className="progress-header">
            <span className="item-count" id="itemCount">{toFaDigits(totalItems.toString())} کالا در سبد</span>
            <a href="#" className="view-cart" onClick={(e) => {
              e.preventDefault();
              renderUserCart();
            }}>مشاهده سبد</a>
          </div>

          {!isReady && (
            <>
              <div className="progress-info">
                <span className="target-amount" id="targetAmount">{faPrice(remainingAmount)} تومان باقی‌مانده</span>
                <span className="remaining-amount" id="remainingAmount">حداقل مبلغ برای این خرید گروهی : {faPrice(targetAmount)} تومان</span>
              </div>
              <div className="progress-container">
                <div className="progress-fill" id="progressFill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </>
          )}

          {isReady && (
            <div className="ready-footer" id="readyFooter" style={{ display: 'flex' }}>
              <div className="basket-total">
                <span className="label">مجموع سبد</span>
                <span className="price" id="summaryPrice">{faPrice(totalAmount)} تومان</span>
              </div>
              <button className="cta-ready" id="ctaReady" onClick={() => alert("در حال هدایت به درگاه پرداخت…")}>
                پیوستن به گروه با این سبد
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom Sheet + Overlay */}
      {isSheetOpen && (
        <>
          <div id="sheetOverlay" className="sheet-overlay visible" onClick={closeSheet}></div>
          <div id="bottomSheet" className="bottom-sheet open" role="dialog" aria-hidden="false">
            <div className="sheet-handle"></div>
            <div id="sheetContent" className="sheet-content">
              <div className="sheet-header">
                <span>{sheetContent.title}</span>
                <button className="close-btn" aria-label="بستن" onClick={closeSheet}>&times;</button>
              </div>
              <div dangerouslySetInnerHTML={{ __html: sheetContent.body }} />
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@latest/dist/font-face.css');

        :root{font-size:14px}
        *{box-sizing:border-box}
        body{margin:0;font-family:'Vazir',Tahoma,sans-serif;direction:rtl;background:#fff;padding-bottom:100px}

        /* ===== HEADER ===== */
        header{display:flex;justify-content:center;align-items:center;padding:16px 0;background:#fff;position:sticky;top:0;z-index:5;box-shadow:0 2px 4px rgba(0,0,0,.1)}
        .share-icon{position:absolute;left:12px;font-size:1.4rem;color:#888;background:none;border:none;cursor:pointer;padding:0}
        .share-icon svg{width:1.4rem;height:1.4rem}
        #rotatingText{transition:.5s;color:#2e8b57;font-weight:700;cursor:pointer}
        .fade-up{opacity:0;transform:translateY(-100%)}

        /* ===== لینک مشاهده سبد گروهی ===== */
        .basket-head{margin:20px 12px;text-align:right}
        .view-full{font-weight:700;color:#2e8b57;text-decoration:none;font-size:.9rem}

        /* ===== اسلایدر ===== */
        .basket-carousel{display:flex;overflow-x:auto;padding:0 32px 20px 16px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
        .basket-carousel::-webkit-scrollbar{display:none}
        .basket-item{min-width:90px;height:90px;margin-left:12px;position:relative;border-radius:6px;background:#ddd;scroll-snap-align:start}
        .basket-item:first-child{margin-right:12px}
        .basket-item img{width:100%;height:100%;object-fit:cover}
        .qty,.off{position:absolute;font-size:.7rem;font-weight:700;background:#fff;padding:2px 6px;border-radius:6px}
        .qty{top:-5px;right:2px;transform:translateX(50%)}
        .off{bottom:3px;left:3px;color:#e6005c}
        .off::before{content:"-";margin-left:2px}

        /* ===== قیمت ثابت و تایمر ===== */
        .discount-text{margin:24px 12px;text-align:center;font-size:16px;color:#333}
        .discount-text b{color:#e6005c;font-weight:900}
        .currency{font-size:7px;vertical-align:middle;color:#555}

        /* ===== لیدر ===== */
        .leader-circles{display:flex;justify-content:center;gap:12px;margin:20px 0;direction:ltr}
        .circle{direction:rtl;width:40px;height:40px;border-radius:50%;display:flex;justify-content:center;align-items:center;font-weight:700}
        .circle.question{border:2px dashed #888;color:#888}
        .circle.leader{background:#e6d6f5;color:#333}

        /* ===== تایمر ===== */
        .countdown-wrapper{text-align:center;font-size:14px;color:#333;margin:24px 0;white-space:nowrap}
        #countdown{color:#e6005c;font-weight:900;margin-left:5px;display:inline-block;direction:ltr;font-variant-numeric:tabular-nums;width:11ch;text-align:center}

        /* ===== CTA بالای صفحه ===== */
        .cta-btn{display:block;width:calc(100% - 24px);margin:24px auto;background:#e6005c;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:700;padding:14px 0;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.2)}

        /* ===== خط جداکننده ===== */
        .divider{border:0;height:10px;background:#e0e0e0;margin:0 0 20px}

        /* ===== بنر سبز ===== */
        .green-box{background:#d4f4d1;margin:0 12px 20px;border-radius:8px;padding:12px;text-align:center;font-size:14px;color:#2e8b57;font-weight:700;cursor:pointer}
        .green-box::before{content:"⬇";margin-left:5px;color:#2e8b57}

        /* ===== تب‌ها ===== */
        .tabs{display:flex;justify-content:space-around;margin:12px 0;font-size:.9rem;background:#fff;position:sticky;z-index:4;padding:8px 0;box-shadow:0 2px 4px rgba(0,0,0,.1)}
        .tab{cursor:pointer;padding:4px 8px;font-weight:700;color:#555}
        .tab.active{color:#e6005c;border-bottom:2px solid #e6005c}

        /* ===== گرید محصولات ===== */
        .product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:18px;padding:0 12px 40px}
        .product-card{background:#fff;border-radius:6px;overflow:visible}
        .img-holder{position:relative;height:100px;background:#eee}
        .img-holder img{width:100%;height:100%;object-fit:cover;border-radius:6px}
        .add-btn{position:absolute;bottom:-10px;left:-10px;border:1px solid #c42121;background:#fff;border-radius:6px;padding:4px 12px;font-size:15px;color:#c42121;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,.2)}
        .quantity-controller{position:absolute;bottom:-10px;left:-10px;display:flex;align-items:center;background:#fff;border:1px solid #c42121;border-radius:6px;box-shadow:0 2px 4px rgba(0,0,0,.2)}
        .quantity-controller button{background:none;border:none;font-size:15px;color:#c42121;padding:4px 8px;cursor:pointer}
        .quantity-controller span{font-size:15px;color:#c42121;padding:0 4px}
        .details{padding:8px 4px 12px;text-align:center}
        .product-name{margin:4px 0;font-size:16px;font-weight:500}
        .weight{margin:2px 0;font-size:12px;color:#555}
        .rating-container{display:flex;justify-content:center;font-size:12px;margin:2px 0}
        .sales{color:#555}.rating{color:#3d963b}
        .price-container{display:flex;flex-direction:column;align-items:center;margin-top:4px}
        .old-price{text-decoration:line-through;color:#888}
        .new-price{color:#c42121;font-weight:700}

        /* پیشوندهای قیمت (در همهٔ بخش‌ها) */
        .old-price::before,
        .sheet-item .price-old::before,
        .sheet-item-group .price-old::before{content:"تنها: ";font-size:.85rem;color:#888;text-decoration:none}
        .new-price::before,
        .sheet-item .price-new::before,
        .sheet-item-group .price-new::before{content:"با ۱ دوست: ";font-size:.85rem;color:#c42121}

        /* ===== نوار پیشرفت پایین ===== */
        .progress-bar{position:fixed;left:0;bottom:0;width:100%;background:#fff;padding:10px 12px;box-shadow:0 -2px 4px rgba(0,0,0,.1);z-index:20;display:none;direction:rtl}
        .progress-header{display:flex;justify-content:space-between;font-size:.8rem;font-weight:700;margin-bottom:8px}
        .item-count{color:#c42121}
        .view-cart{font-size:.9rem;color:#2e8b57;font-weight:700;text-decoration:none}
        .progress-info{display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:6px}
        .progress-container{height:8px;background:#f0f0f0;border-radius:4px}
        .progress-fill{height:100%;background:#c42121;border-radius:4px;width:0;transition:width .3s}
        .progress-bar.ready .progress-info,.progress-bar.ready .progress-container{display:none}
        .ready-footer{display:none;justify-content:space-between;align-items:center;margin-top:8px}
        .progress-bar.ready .ready-footer{display:flex}
        .basket-total .label{display:block;font-size:.75rem;color:#555}
        .basket-total .price{font-size:1.05rem;color:#c42121;font-weight:900}
        .cta-ready{background:#c42121;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:1rem;font-weight:900;cursor:pointer}

        /* ===== Bottom-Sheet ===== */
        .sheet-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);opacity:0;pointer-events:none;transition:opacity .3s;z-index:30}
        .sheet-overlay.visible{opacity:1;pointer-events:auto}
        .bottom-sheet{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top-left-radius:16px;border-top-right-radius:16px;max-height:80vh;overflow-y:auto;transform:translateY(100%);transition:transform .3s;z-index:35}
        .bottom-sheet.open{transform:translateY(0)}
        .sheet-handle{width:40px;height:4px;background:#ccc;border-radius:3px;margin:8px auto}
        .sheet-content{padding:0 16px 32px}
        .sheet-header{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #eee;font-weight:700}
        .sheet-header .close-btn{background:none;border:none;font-size:1.6rem;color:#888;font-weight:900;cursor:pointer}

        /* ===== آیتم‌های سبد گروهی ===== */
        .sheet-item-group{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 0;border-bottom:1px solid #eee;font-size:.9rem}
        .sheet-item-group:last-child{border-bottom:none}
        .sheet-item-group .right{display:flex;gap:8px;align-items:flex-start}
        .sheet-item-group img{width:64px;height:64px;object-fit:cover;border-radius:8px;background:#ddd}
        .sheet-item-group .title{font-weight:700;margin-bottom:2px}
        .sheet-item-group .qty-inc{display:flex;align-items:center;gap:4px;margin-top:4px;font-weight:700;color:#c42121}
        .sheet-item-group .qty-inc button{width:24px;height:24px;border:1px solid #c42121;border-radius:6px;background:#fff;font-size:18px;line-height:20px;color:#c42121;cursor:pointer;padding:0}
        .sheet-item-group .prices{display:flex;flex-direction:column;align-items:flex-end}
        .sheet-item-group .price-old{text-decoration:line-through;color:#888}
        .sheet-item-group .price-new{color:#e6005c;font-weight:900;margin-top:4px}

        /* ===== آیتم‌های سبد شخصی ===== */
        .sheet-item{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 0;border-bottom:1px solid #eee;font-size:.9rem}
        .sheet-item:last-child{border-bottom:none}
        .qty-controller{display:flex;align-items:center;font-size:1rem;border:1px solid #ccc;border-radius:6px;overflow:hidden;margin-top:6px}
        .qty-controller button{background:none;border:none;font-size:1rem;padding:4px 10px;color:#c42121;cursor:pointer;font-weight:700}
        .qty-controller span{padding:0 8px;color:#c42121;font-weight:700}

        /* ===== لینک‌های اشتراک‌گذاری ===== */
        .share-grid{display:flex;justify-content:space-around;margin:24px 0}
        .share-grid a{width:56px;height:56px;border-radius:50%;display:flex;justify-content:center;align-items:center;background:#f5f5f5;box-shadow:0 1px 3px rgba(0,0,0,.15)}
        .share-grid img{width:34px;height:34px}
      `}</style>
    </>
  );
}
