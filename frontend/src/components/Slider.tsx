'use client';
import { useEffect, useRef, useState, memo } from 'react';
import Image from 'next/image';
import Popup from './Popup';

type Banner = {
  id: number | string;
  image_url: string;
  title?: string | null;
  description?: string | null;
};

const ADMIN_API_BASE_URL = '/api';

const Slider = memo(function Slider({ initialBanners = [] as Banner[] }: { initialBanners?: Banner[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState<string | number | null>(null);
  const [banners, setBanners] = useState<Banner[]>(initialBanners);

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
          { id: '1', image_url: 'https://picsum.photos/800/400?random=11', title: 'پیشنهاد ویژه‌ی ۱', description: 'اینجا توضیحات بنر اول را بنویسید…' },
          { id: '2', image_url: 'https://picsum.photos/800/400?random=12', title: 'پیشنهاد ویژه‌ی ۲', description: 'اینجا توضیحات دوم را بنویسید…' },
          { id: '3', image_url: 'https://picsum.photos/800/400?random=13', title: 'پیشنهاد ویژه‌ی ۳', description: 'اینجا توضیحات سوم را بنویسید…' },
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

  if (!banners.length) return null;

  return (
    <>
      <section className="slider">
        <div id="sliderTrack" className="slides-scroll" ref={trackRef}>
          {banners.map(b => (
            <div key={b.id} className="slide" onClick={() => setOpen(b.id)} style={{ position: 'relative', minHeight: '150px' }}>
              <Image 
                src={b.image_url} 
                alt={b.title || 'Banner'} 
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: 'cover' }}
                priority={idx === 0}
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
              {(b.title || b.description) && (
                <button className="slide-cta" onClick={e => { e.stopPropagation(); setOpen(b.id); }}>
                  اطلاعات بیشتر
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {banners.map(b => (
        <Popup key={b.id} show={open === b.id} onClose={() => setOpen(null)}>
          {b.title ? <h2>{b.title}</h2> : null}
          {b.description ? <p>{b.description}</p> : null}
        </Popup>
      ))}
    </>
  );
});

export default Slider;
