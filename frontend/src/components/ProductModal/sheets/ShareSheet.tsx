'use client';
import { useEffect, useState } from 'react';
import { useSheet } from './BottomSheet';
import styles from '../styles.module.css';
import { generateInviteLink, generateShareUrl, extractInviteCode } from '@/utils/linkGenerator';

export default function ShareSheet() {
  const { close } = useSheet();

  /* آدرس فعلی صفحه را فقط روی کلاینت می‌خوانیم */
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    /* window و location فقط در مرورگر هستند */
    let shareUrl = window.location.href;
    
    // Check if there's an invite code in the URL and regenerate based on environment
    const inviteCode = extractInviteCode(shareUrl);
    if (inviteCode) {
      shareUrl = generateInviteLink(inviteCode);
    }
    
    setUrl(shareUrl);
  }, []);

  /* تا زمانی که url آماده نشده، چیزی رندر نمی‌کنیم */
  if (!url) return null;

  const shareMessage = 'بیا با هم سبد رو بخریم تا رایگان بگیریم!';

  return (
    <div className={styles.shareSheet}>
      <button className={styles.shareClose} onClick={close}>
        &times;
      </button>

      <a
        className={styles.shareItem}
        href={generateShareUrl('telegram', url, shareMessage)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <i className="fa-brands fa-telegram" /> تلگرام
      </a>

      <a
        className={styles.shareItem}
        href={generateShareUrl('whatsapp', url, shareMessage)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <i className="fa-brands fa-whatsapp" /> واتساپ
      </a>

      <a
        className={styles.shareItem}
        href={generateShareUrl('instagram', url)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <i className="fa-brands fa-instagram" /> اینستاگرام
      </a>
    </div>
  );
}
