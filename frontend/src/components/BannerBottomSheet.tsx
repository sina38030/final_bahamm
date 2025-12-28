'use client';
import { useEffect, useRef, useState } from 'react';

type BannerSheetProps = {
  show: boolean;
  onClose: () => void;
  imageUrl?: string;
  title: string;
  description: string;
};

export default function BannerBottomSheet({
  show,
  onClose,
  imageUrl,
  title,
  description,
}: BannerSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  // Track if component is mounted to prevent flash of unstyled content
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (show) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [show]);

  // Keyboard & focus trap
  useEffect(() => {
    if (!show) return;
    const prevFocused = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    const container = sheetRef.current;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Tab' && container) {
        const nodes = container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    setTimeout(() => (closeBtnRef.current || container)?.focus?.(), 0);

    return () => {
      document.removeEventListener('keydown', onKey);
      prevFocused?.focus?.();
    };
  }, [show, onClose]);

  // Don't render anything until mounted to prevent flash of unstyled content
  if (!mounted) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`banner-sheet-overlay ${show ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden={!show}
      />

      {/* Bottom Sheet */}
      <div
        className={`banner-sheet ${show ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!show}
        ref={sheetRef}
        tabIndex={-1}
      >
        {/* Close Button */}
        <button
          className="banner-sheet-close"
          aria-label="بستن"
          onClick={onClose}
          ref={closeBtnRef}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Handle */}
        <div className="banner-sheet-handle" />

        {/* Content */}
        <div className="banner-sheet-content">
          {/* Title */}
          <h2 className="banner-sheet-title">{title}</h2>

          {/* Description */}
          <p className="banner-sheet-desc">{description}</p>

          {/* Button */}
          <button className="banner-sheet-btn" onClick={onClose}>
            متوجه شدم
          </button>
        </div>
      </div>

      <style jsx>{`
        .banner-sheet-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          visibility: hidden;
          opacity: 0;
          transition: visibility 0.3s ease, opacity 0.3s ease;
          z-index: 10000;
        }
        .banner-sheet-overlay.visible {
          visibility: visible;
          opacity: 1;
        }

        .banner-sheet {
          position: fixed;
          right: 0;
          left: 0;
          bottom: 0;
          max-height: 85vh;
          background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
          border-radius: 24px 24px 0 0;
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
          transform: translateY(100%);
          transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
          z-index: 10001;
          overflow: hidden;
        }
        .banner-sheet.open {
          transform: translateY(0);
        }

        .banner-sheet-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.06);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          color: #666;
          transition: all 0.2s ease;
          z-index: 10;
        }
        .banner-sheet-close:hover {
          background: rgba(227, 28, 95, 0.1);
          color: #e31c5f;
          transform: scale(1.05);
        }

        .banner-sheet-handle {
          width: 40px;
          height: 4px;
          background: #ddd;
          border-radius: 2px;
          margin: 12px auto 8px;
        }

        .banner-sheet-content {
          padding: 20px 20px 32px;
          overflow-y: auto;
          max-height: calc(85vh - 24px);
        }

        .banner-sheet-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 12px;
          text-align: center;
          line-height: 1.5;
        }

        .banner-sheet-desc {
          font-size: 0.95rem;
          color: #555;
          line-height: 1.9;
          text-align: center;
          margin-bottom: 24px;
          padding: 0 8px;
        }

        .banner-sheet-btn {
          display: block;
          width: 100%;
          max-width: 300px;
          margin: 0 auto;
          padding: 14px 32px;
          background: linear-gradient(135deg, #e31c5f 0%, #c91854 100%);
          color: #fff;
          border: none;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(227, 28, 95, 0.35);
        }
        .banner-sheet-btn:hover {
          background: linear-gradient(135deg, #c91854 0%, #a81447 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(227, 28, 95, 0.45);
        }
        .banner-sheet-btn:active {
          transform: translateY(0);
        }

        @media (min-width: 640px) {
          .banner-sheet {
            max-width: 500px;
            right: auto;
            left: 50%;
            transform: translateX(-50%) translateY(100%);
            border-radius: 24px 24px 0 0;
          }
          .banner-sheet.open {
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </>
  );
}

