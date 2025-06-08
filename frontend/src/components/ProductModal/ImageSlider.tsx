'use client';
import { useRef, useEffect, useState } from 'react';
import { toFa } from '@/utils/format';
import { useLightbox } from './Lightbox';
import styles from './styles.module.css';

export default function ImageSlider({ seeds }: { seeds: number[] }) {
  const rail     = useRef<HTMLDivElement>(null);
  const [idx, sI] = useState(0);
  const { open } = useLightbox();

  /* شماره اسلاید */
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const cb = () => sI(Math.round(el.scrollLeft / el.offsetWidth));
    el.addEventListener('scroll', cb, { passive:true });
    return () => el.removeEventListener('scroll', cb);
  }, []);

  /* ── درگ موس/اشاره‌گر برای دسکتاپ ── */
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    let isDown = false, startX = 0, startScroll = 0;

    const down = (e: PointerEvent) => {
      isDown = true;
      el.classList.add(styles.dragging);
      startX      = e.clientX;
      startScroll = el.scrollLeft;
    };
    const move = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = startX - e.clientX;
      el.scrollLeft = startScroll + dx;
    };
    const up = () => {
      isDown = false;
      el.classList.remove(styles.dragging);
    };

    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup',   up);
    window.addEventListener('pointerleave',up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup',   up);
      window.removeEventListener('pointerleave',up);
    };
  }, []);

  /* جلوگیری از دوبل-کلیک زوم */
  useEffect(() => {
    const el = rail.current;
    const dbl = (e: MouseEvent) => e.preventDefault();
    el?.addEventListener('dblclick', dbl, { passive:false });
    return () => el?.removeEventListener('dblclick', dbl);
  }, []);

  const bigImgs = seeds.map(s => `https://picsum.photos/seed/${s}/1200/900`);

  return (
    <div className={styles.galleryWrap}>
      <div ref={rail} className={styles.slider}>
        {seeds.map((s, i) => (
          <div key={s} className={styles.slide}>
            <img
              src={`https://picsum.photos/seed/${s}/800/600`}
              draggable={false}
              onClick={() => open(bigImgs, i)}
            />
          </div>
        ))}
      </div>

      <div className={styles.slideIdx}>
        {toFa(idx + 1)}/{toFa(seeds.length)}
      </div>
    </div>
  );
}
