'use client';
import { useEffect, useState } from 'react';
import { useSheet } from './BottomSheet';
import styles from '../styles.module.css';

export default function ShareSheet() {
  const { close } = useSheet();

  /* آدرس فعلی صفحه را فقط روی کلاینت می‌خوانیم */
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    /* window و location فقط در مرورگر هستند */
    setUrl(window.location.href);
  }, []);

  /* تا زمانی که url آماده نشده، چیزی رندر نمی‌کنیم */
  if (!url) return null;

  const enc = encodeURIComponent(url);

  return (
    <div className={styles.shareSheet}>
      <button className={styles.shareClose} onClick={close}>
        &times;
      </button>

      <a
        className={styles.shareItem}
        href={`https://t.me/share/url?url=${enc}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <i className="fa-brands fa-telegram" /> تلگرام
      </a>

      <a
        className={styles.shareItem}
        href={`https://wa.me/?text=${enc}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <i className="fa-brands fa-whatsapp" /> واتساپ
      </a>

      <a
        className={styles.shareItem}
        href={`https://www.instagram.com/?url=${enc}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <i className="fa-brands fa-instagram" /> اینستاگرام
      </a>
    </div>
  );
}
