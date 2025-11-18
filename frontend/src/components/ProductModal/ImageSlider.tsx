'use client';
import { useRef, useEffect, useState, useMemo } from 'react';
import { toFa } from '@/utils/format';
import { useLightbox } from './Lightbox';
import styles from './styles.module.css';

type Props = {
  seeds: number[];
  productImages?: string[]; // admin-uploaded images
};

export default function ImageSlider({ seeds, productImages = [] }: Props) {
  const rail     = useRef<HTMLDivElement>(null);
  const [idx, sI] = useState(0);
  const { open } = useLightbox();

  // Use admin images if available; otherwise use legacy picsum seeds
  const galleryImages = useMemo<string[]>(() => {
    if (Array.isArray(productImages) && productImages.length > 0) {
      return productImages.filter(Boolean);
    }
    // No admin images; show nothing
    return [];
  }, [productImages]);

  /* شماره اسلاید */
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const cb = () => sI(Math.round(el.scrollLeft / el.offsetWidth));
    el.addEventListener('scroll', cb, { passive:true });
    return () => el.removeEventListener('scroll', cb);
  }, [galleryImages.length]);

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

  const bigImgs = useMemo<string[]>(() => galleryImages, [galleryImages]);

  return (
    <div className={styles.galleryWrap}>
      <div ref={rail} className={styles.slider}>
        {galleryImages.map((src, i) => (
          <div key={`${src}-${i}`} className={styles.slide}>
            <img
              src={src}
              draggable={false}
              onClick={() => open(bigImgs, i)}
              style={{border: 'none', outline: 'none', margin: 0, padding: 0}}
            />
          </div>
        ))}
      </div>

      <div className={styles.slideIdx}>
        {galleryImages.length > 0 ? `${toFa(idx + 1)}/${toFa(galleryImages.length)}` : ''}
      </div>
    </div>
  );
}
