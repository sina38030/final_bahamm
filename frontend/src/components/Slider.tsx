'use client';
import { useEffect, useRef, useState } from 'react';
import Popup from './Popup';

const BANNERS = [
  { id: '1', img: 'https://picsum.photos/800/400?random=11', title: 'پیشنهاد ویژهٔ ۱', desc: 'اینجا توضیحات بنر اول را بنویسید…' },
  { id: '2', img: 'https://picsum.photos/800/400?random=12', title: 'پیشنهاد ویژهٔ ۲', desc: 'اینجا توضیحات بنر دوم را بنویسید…' },
  { id: '3', img: 'https://picsum.photos/800/400?random=13', title: 'پیشنهاد ویژهٔ ۳', desc: 'اینجا توضیحات بنر سوم را بنویسید…' },
];

export default function Slider() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const int = setInterval(() => setIdx(i => (i + 1) % BANNERS.length), 5000);
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    const el = trackRef.current?.children[idx] as HTMLElement | undefined;
    if (!el || !trackRef.current) return;
    const offset = el.offsetLeft - (trackRef.current.offsetWidth - el.offsetWidth) / 2;
    trackRef.current.scrollTo({ left: offset, behavior: 'smooth' });
  }, [idx]);

  return (
    <>
      <section className="slider">
        <div id="sliderTrack" className="slides-scroll" ref={trackRef}>
          {BANNERS.map(b => (
            <div key={b.id} className="slide" onClick={() => setOpen(b.id)}>
              <img src={b.img} alt="" />
              <button className="slide-cta" onClick={e => { e.stopPropagation(); setOpen(b.id); }}>
                اطلاعات بیشتر
              </button>
            </div>
          ))}
        </div>
      </section>

      {BANNERS.map(b => (
        <Popup key={b.id} show={open === b.id} onClose={() => setOpen(null)}>
          <h2>{b.title}</h2>
          <p>{b.desc}</p>
        </Popup>
      ))}
    </>
  );
}
