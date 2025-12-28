'use client';
import { useEffect, useRef, useState, memo, useMemo } from 'react';
import Image from 'next/image';
import BannerBottomSheet from './BannerBottomSheet';

type Banner = {
  id: number | string;
  image_url: string;
  title?: string | null;
  description?: string | null;
};

// Default content for banners (used when backend doesn't provide content)
const defaultBannerContent: Record<number, { title: string; description: string }> = {
  0: {
    title: '🎁 خرید گروهی، تخفیف بیشتر!',
    description: 'با دوستانت خرید کن و تا ۵۰٪ تخفیف بگیر! هرچه تعداد اعضای گروه بیشتر باشه، قیمت برای همه کمتر میشه. مستقیم از مزرعه، تازه و با کیفیت.',
  },
  1: {
    title: '🚚 ارسال رایگان و سریع',
    description: 'سفارش‌های بالای ۲۰۰ هزار تومان با ارسال رایگان! محصولات تازه رو همون روز درب منزل تحویل بگیر. بسته‌بندی بهداشتی و حرفه‌ای.',
  },
  2: {
    title: '🌿 محصولات ارگانیک و تازه',
    description: 'میوه و سبزیجات تازه مستقیم از باغ‌های شمال! بدون واسطه، با قیمت مناسب و کیفیت عالی. هر روز محصولات جدید با بهترین کیفیت.',
  },
};

const ADMIN_API_BASE_URL = '/backend/api';

const Slider = memo(function Slider({ initialBanners = [] as Banner[] }: { initialBanners?: Banner[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState<string | number | null>(null);
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  // Track if component is mounted to prevent flash of unstyled content
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialBanners && initialBanners.length) return; // داده سروری داریم
    // fetch active banners from backend public route
    fetch(`${ADMIN_API_BASE_URL}/banners`)
      .then(r => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length && data[0].image_url) {
          setBanners(data as Banner[]);
          return;
        }
      })
      .catch(() => {})
      .finally(() => {
        // Fallback to legacy hardcoded if none
        setBanners((prev) => prev.length ? prev : [
          { id: '1', image_url: 'https://picsum.photos/800/400?random=11', title: 'خرید گروهی، تخفیف بیشتر!', description: 'با دوستانت خرید کن و تا ۵۰٪ تخفیف بگیر!' },
          { id: '2', image_url: 'https://picsum.photos/800/400?random=12', title: 'ارسال رایگان و سریع', description: 'سفارش‌های بالای ۲۰۰ هزار تومان با ارسال رایگان!' },
          { id: '3', image_url: 'https://picsum.photos/800/400?random=13', title: 'محصولات ارگانیک و تازه', description: 'میوه و سبزیجات تازه مستقیم از باغ!' },
        ]);
      });
  }, [initialBanners]);

  useEffect(() => {
    if (!banners.length) return;
    const int = setInterval(() => setIdx(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(int);
  }, [banners.length]);

  useEffect(() => {
    const el = trackRef.current?.children[idx] as HTMLElement | undefined;
    if (!el || !trackRef.current) return;
    const offset = el.offsetLeft - (trackRef.current.offsetWidth - el.offsetWidth) / 2;
    trackRef.current.scrollTo({ left: offset, behavior: 'smooth' });
  }, [idx]);

  // Get content for a banner (use backend data if available, otherwise use defaults)
  const getBannerContent = (banner: Banner, index: number) => {
    const defaultContent = defaultBannerContent[index % 3] || defaultBannerContent[0];
    return {
      title: banner.title || defaultContent.title,
      description: banner.description || defaultContent.description,
    };
  };

  // Don't render anything until mounted to prevent flash of unstyled content
  if (!mounted || !banners.length) return null;

  return (
    <>
      <section className="slider" style={{ contain: 'layout paint', minHeight: 185 }}>
        <div id="sliderTrack" className="slides-scroll" ref={trackRef}>
          {banners.map((b, index) => (
            <div key={b.id} className="slide" onClick={() => setOpen(b.id)} style={{ position: 'relative', height: 185, minWidth: '95%' }}>
              <Image 
                src={b.image_url} 
                alt={getBannerContent(b, index).title} 
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: 'cover', objectPosition: 'center center' }}
                priority={index === 0}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            </div>
          ))}
        </div>
      </section>

      {banners.map((b, index) => {
        const content = getBannerContent(b, index);
        return (
          <BannerBottomSheet
            key={b.id}
            show={open === b.id}
            onClose={() => setOpen(null)}
            imageUrl={b.image_url}
            title={content.title}
            description={content.description}
          />
        );
      })}
    </>
  );
});

export default Slider;
